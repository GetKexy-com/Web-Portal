import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ProspectingService } from '../../services/prospecting.service';
import { KexyCustomRichEditorComponent } from '../kexy-custom-rich-editor/kexy-custom-rich-editor.component';

/** `kept`: the user's own text was left in place; the next click replaces it. */
type DraftState = 'idle' | 'drafting' | 'ready' | 'kept' | 'error' | 'unavailable';

/**
 * The AI-draft strip above the Inbox compose editor ("Reply to Sarah"). Shared by the
 * Inbox and Sent pages, which have the same compose modal.
 *
 * Nothing is drafted until the user clicks **Generate reply** (each draft is a paid call), then
 * **Regenerate**, optionally steered ("shorter", "suggest a call"). Hidden behind a note when the
 * prospect has not replied — there is nothing to answer. The draft goes into the editor through
 * its public `loadContent`; sending is unchanged, so the user always reads and edits it first.
 *
 * Never silently overwrites what the user typed: if the editor holds their own text, the first
 * click says so and keeps it, and a second click replaces it. A previous AI draft is replaced
 * straight away.
 */
@Component({
  selector: 'reply-draft-bar',
  imports: [CommonModule, FormsModule],
  templateUrl: './reply-draft-bar.component.html',
  styleUrl: './reply-draft-bar.component.scss',
})
export class ReplyDraftBarComponent implements OnDestroy {
  @Input({ required: true }) conversationId!: number;
  @Input({ required: true }) editor!: KexyCustomRichEditorComponent;
  /**
   * False when the prospect has not replied: there is nothing to answer, so no draft is
   * requested (and nothing paid for) — the strip just says so instead of vanishing.
   */
  @Input() enabled = true;
  /** For "Tanim hasn't replied yet". */
  @Input() prospectName = '';

  state: DraftState = 'idle';
  message = '';
  instructions = '';
  showInstructions = false;

  private destroyed = false;
  /** Bumped per request so a slow, superseded draft never lands over a newer one. */
  private seq = 0;

  constructor(private prospectingService: ProspectingService) {}

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  /** At least one draft has been made in this modal (button reads "Regenerate"). */
  hasDrafted = false;

  generate = (): void => {
    // Replace without asking when the editor is empty, holds our own draft, or the user
    // already saw the "kept your text" notice and clicked again.
    this.draft(this.state === 'ready' || this.state === 'kept');
  };

  startBlank = (): void => {
    this.seq++;
    this.pendingHtml = '';
    this.editor?.loadContent('<p></p>');
    this.state = 'idle';
    this.message = '';
  };

  private draft = async (replace: boolean): Promise<void> => {
    if (this.state === 'drafting' || this.destroyed) return;
    const seq = ++this.seq;
    this.state = 'drafting';
    this.message = '';
    try {
      const res = await this.prospectingService.draftReplySrv(this.conversationId, this.instructions);
      if (this.destroyed || seq !== this.seq) return;
      this.hasDrafted = true;
      if (replace || this.__editorIsEmpty()) {
        this.editor?.loadContent(res.html);
        this.state = 'ready';
      } else {
        // Their own words are in the editor: keep them, and replace only on a second click.
        this.pendingHtml = res.html;
        this.state = 'kept';
        this.message = 'Your text was kept. Click Replace to swap it for the AI draft.';
      }
    } catch (err: any) {
      if (this.destroyed || seq !== this.seq) return;
      const status = err?.statusCode ?? err?.status;
      if (status === 503 && /not set up/i.test(err?.message ?? '')) {
        this.state = 'unavailable';
        this.message = 'AI drafts are not set up yet.';
      } else if (status === 404) {
        this.state = 'unavailable';
        this.message = 'Nothing to answer yet — the prospect has not replied.';
      } else {
        this.state = 'error';
        this.message = err?.message || 'Could not draft a reply. Try again.';
      }
    }
  };

  /** The draft held back while the user's own text was kept (`kept`). */
  private pendingHtml = '';

  /** "Replace" in the `kept` state: use the draft already paid for, no new call. */
  useKeptDraft = (): void => {
    if (!this.pendingHtml) return;
    this.editor?.loadContent(this.pendingHtml);
    this.pendingHtml = '';
    this.state = 'ready';
    this.message = '';
  };

  private __editorIsEmpty(): boolean {
    const html = this.editor?.getBodyHtml?.() ?? '';
    return !html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '').trim();
  }
}
