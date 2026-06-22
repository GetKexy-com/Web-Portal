import { Injectable, signal } from '@angular/core';

export interface MergeTag {
  key: string;           // e.g. "receiver_first_name"
  label: string;         // e.g. "First Name"
  fallback: string;      // e.g. "there"
}

@Injectable({ providedIn: 'root' })
export class MergeTagService {
  /** All known merge tags with their current fallback values */
  private readonly tags = signal<MergeTag[]>([
    { key: 'receiver_first_name', label: 'First Name',     fallback: '' },
    { key: 'receiver_last_name',  label: 'Last Name',      fallback: '' },
    { key: 'receiver_phone',      label: 'Phone Number',   fallback: '' },
    { key: 'receiver_email',      label: 'E-Mail Address', fallback: '' },
    { key: 'website',             label: 'Website',        fallback: '' },
  ]);

  getAll(): MergeTag[] {
    return this.tags();
  }

  getTag(key: string): MergeTag | undefined {
    return this.tags().find(t => t.key === key);
  }

  /** Human label for a key, falling back to a Title-Cased version of the key. */
  labelFor(key: string): string {
    return this.getTag(key)?.label
      ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  /** Build a styled, non-editable chip element for a merge tag key. */
  createChip(key: string): HTMLElement {
    const chip = document.createElement('span');
    chip.className = 'merge-tag-chip';
    chip.contentEditable = 'false';
    chip.dataset['mergeKey'] = key;
    chip.textContent = this.labelFor(key);
    this.decorateChip(chip);
    return chip;
  }

  /**
   * Show or hide the "fallback set" marker on a chip based on the current
   * fallback for its key. Call after the fallback changes to keep chips in sync.
   */
  decorateChip(chip: HTMLElement): void {
    const key = chip.dataset['mergeKey'] || '';
    const fallback = this.getTag(key)?.fallback ?? '';
    const hasFallback = fallback.length > 0;
    chip.classList.toggle('has-fallback', hasFallback);

    let mark = chip.querySelector('.merge-tag-fallback-mark') as HTMLElement | null;
    if (hasFallback) {
      if (!mark) {
        mark = document.createElement('span');
        mark.className = 'merge-tag-fallback-mark';
        mark.contentEditable = 'false';
        mark.textContent = '↩';
        chip.appendChild(mark);
      }
      mark.title = `Fallback: ${fallback}`;
    } else if (mark) {
      mark.remove();
    }
  }

  setFallback(key: string, fallback: string): void {
    this.tags.update(list =>
      list.map(t => t.key === key ? { ...t, fallback } : t)
    );
  }

  /**
   * Regex that matches [snake_case_tag] with an optional fallback, e.g.
   *   [receiver_first_name]
   *   [receiver_first_name fallback=there]
   * Group 1 = key, group 2 = fallback text (undefined when absent).
   */
  static readonly TAG_REGEX = /\[([a-z][a-z0-9_]*)(?:\s+fallback=([^\]]*))?]/g;

  /** Serialize a tag back to raw text, only emitting fallback when set. */
  static buildRawTag(key: string, fallback: string): string {
    return fallback ? `[${key} fallback=${fallback}]` : `[${key}]`;
  }

  /**
   * Replace raw [tag] text nodes in the canvas with styled chip spans.
   * Only operates on text nodes inside the contenteditable, so HTML structure
   * is never corrupted.
   */
  renderChipsInElement(root: HTMLElement): void {
    this.walkTextNodes(root, (textNode) => {
      const text = textNode.nodeValue || '';
      if (!MergeTagService.TAG_REGEX.test(text)) return;
      MergeTagService.TAG_REGEX.lastIndex = 0;

      const parent = textNode.parentNode!;
      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      MergeTagService.TAG_REGEX.lastIndex = 0;
      while ((match = MergeTagService.TAG_REGEX.exec(text)) !== null) {
        // Text before the tag
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        // The chip span
        const key = match[1];
        const rawFallback = match[2];
        // Seed the per-key fallback from the text when one is present
        if (rawFallback !== undefined) {
          this.setFallback(key, rawFallback);
        }
        const chip = this.createChip(key);
        frag.appendChild(chip);
        lastIndex = match.index + match[0].length;
      }
      // Remaining text
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      parent.replaceChild(frag, textNode);
    });
  }

  /**
   * Reverse: replace chip spans back to raw [tag] text for HTML export
   * and source editing. Operates on a clone so the live canvas is unchanged.
   */
  stripChipsToRaw(root: HTMLElement): void {
    root.querySelectorAll('.merge-tag-chip').forEach(chip => {
      const key = (chip as HTMLElement).dataset['mergeKey'] || '';
      const tag = this.getTag(key);
      const raw = MergeTagService.buildRawTag(key, tag?.fallback ?? '');
      chip.replaceWith(document.createTextNode(raw));
    });
  }

  private walkTextNodes(root: HTMLElement, cb: (node: Text) => void): void {
    // Collect first, then process, to avoid live NodeList issues
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip text inside existing chips or non-editable blocks
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.merge-tag-chip')) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.media-block')) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.resize-handle')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      textNodes.push(node);
    }
    textNodes.forEach(cb);
  }
}