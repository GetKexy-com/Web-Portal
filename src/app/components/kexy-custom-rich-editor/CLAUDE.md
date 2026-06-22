# Kexy Custom Rich Editor

A self-contained Angular rich **email** editor component (`<kexy-custom-rich-editor>`). It produces email-safe HTML, supports merge tags with fallbacks, inline image/video blocks, and a design / preview / HTML source view.

> This file is the source of truth for how the editor is built and why. Read it before changing anything in this folder.

---

## How to use it

```ts
import { KexyCustomRichEditorComponent } from './kexy-custom-rich-editor/kexy-custom-rich-editor.component';

@Component({
  standalone: true,
  imports: [KexyCustomRichEditorComponent],
  template: `<kexy-custom-rich-editor [content]="emailHtml"></kexy-custom-rich-editor>`,
})
export class HostComponent {
  emailHtml = '<p>Hi [receiver_first_name],</p>';
}
```

Push content / read it back at runtime via a `@ViewChild`:

```ts
@ViewChild(KexyCustomRichEditorComponent) editor!: KexyCustomRichEditorComponent;

this.editor.loadContent('<p>Hi [receiver_first_name],</p>'); // replace content
const html = this.editor.getHtml();                           // export-ready HTML
```

### Public API (`KexyCustomRichEditorComponent`)
- `@Input() content?: string` — initial email HTML. If omitted, a built-in sample loads.
- `loadContent(html: string)` — replace the editor content (renders chips, hydrates media blocks).
- `getHtml(): string` — current export-ready, inlined email HTML.
- `loadSample()`, `copyHtml()`, `downloadHtml()`, `switchMode('design'|'preview'|'html')`.

---

## Requirements / dependencies

- **Angular ≥ 17.3** — uses signals, the `output()` function, and `@if`/`@for` control flow.
- Only `@angular/core` and `@angular/forms`. No third-party libraries, no NgModule, no `provideAnimations`.
- **Self-contained**: design tokens, base font, and resets are defined in the component stylesheet **scoped to the `kexy-custom-rich-editor` host** (see `kexy-custom-rich-editor.component.css`). Copying this folder + importing the component is enough — **no external CSS required**.
- To fill available height, give the host's parent a height; otherwise the host falls back to `min-height: 100vh`.

NOTE: the `editor-test-host.component.ts` / `app.component.ts` in the parent project are just a demo harness — NOT part of this package. Don't copy them.

---

## Architecture

All standalone components. The main component composes the others.

```
kexy-custom-rich-editor.component.ts   Public component. Host element, ViewEncapsulation.None,
                                       styleUrl. Owns @Input content + public API.
kexy-custom-rich-editor.component.css  ALL editor styles + scoped design tokens/resets.
components/
  editor-toolbar.component.ts          Toolbar UI (selector app-editor-toolbar). Calls into the canvas.
  editor-canvas.component.ts           The contenteditable canvas + preview iframe + HTML source
                                       textarea (selector app-editor-canvas). Core editing logic.
  media-inspector.component.ts         Panel to edit a selected image/video block (app-media-inspector).
  fallback-popover.component.ts        Popover to set a merge-tag fallback (app-fallback-popover).
                                       Has its OWN inline scoped styles (hardcoded colors).
services/
  editor-state.service.ts              Signals: mode, sourceMode, selectedBlock, status, htmlOutput,
                                       subject, inspectorTick. providedIn:'root' (see caveat below).
  editor-utils.service.ts              SVG placeholders, file→dataURL, HTML/attr escaping, font-tag
                                       normalization, inline-styling + media-block transform for export.
  merge-tag.service.ts                 Merge-tag registry, chip creation/decoration, [tag] <-> chip render.
models/
  editor.models.ts                     EditorMode, InsertImageOptions, InsertVideoOptions.
```

Wiring: the host component (`ngAfterViewInit`) injects the `EditorCanvasComponent` reference into the toolbar and inspector (`toolbar.canvas = editorCanvas`, etc.).

---

## Key concepts & decisions

### Merge tags
- Syntax in HTML: `[snake_case_key]` with optional fallback `[key fallback=some value]`.
- In the design canvas they render as **blue pill chips** (label, e.g. "First Name"); on export they're stripped back to raw `[key]` / `[key fallback=…]`.
- Registry + per-key fallback live in `MergeTagService` (`getAll`, `getTag`, `setFallback`, `createChip`, `decorateChip`, `renderChipsInElement`, `stripChipsToRaw`, `TAG_REGEX`, `buildRawTag`).
- Fallback defaults are empty — `fallback=` is only emitted when a fallback is actually set.
- Clicking a chip opens the **fallback popover**; it shows an **undo (↺) icon** once you change the value (reverts to the value it opened with). When a fallback is set, the chip shows a small **↩ marker** (and `has-fallback` class) — color stays blue.
- The toolbar **`#` picker** (in the overflow menu) has a search box and inserts a chip at the caret.
- Chips are rendered on content load and when leaving Source view — NOT live while typing (would disrupt the caret). Typed `[tags]` become chips after a sample/source round-trip.

### Toolbar (`editor-toolbar.component.ts`)
- Single line, flat **inline-SVG icons**, grouped with `.tool-divider` separators.
- Order: Source(`</>`) │ lists (bullet/numbered/checklist) │ undo/redo │ image/link │ Paragraph select │ B I U S │ alignment dropdown │ (spacer) │ `⋮` overflow.
- The `⋮` **overflow menu** holds secondary tools: font family, font size, text/highlight color, table, remove-link, video, merge-tag `#` picker.
- Dropdowns (overflow, merge-tag, alignment) anchor with `right: 0` and close on outside-click via a single `document:click` HostListener. They MUST be right-anchored because `.editor-modal` has `overflow: hidden` — a left-anchored menu near the right edge gets clipped.

### Canvas / editing (`editor-canvas.component.ts`)
- Built on `document.execCommand` (deprecated but works in all current browsers). Bold/italic/lists/align/font/color/link all go through execCommand and are natively undoable.
- **Undo correctness**: anything inserted via direct DOM mutation is NOT on the browser undo stack. So table, merge-tag chips, images, and videos are inserted via `execCommand('insertHTML', …)` so Undo/Redo works. (Table also appends a `<p><br></p>` spacer.)
- **Resize handles use event delegation** (`onResizePointerDown` on the canvas), NOT per-element listeners — so media blocks inserted as HTML (insertHTML / undo-redo / source edit / paste) stay resizable. `createResizeHandle()` only creates the div.
- `insertImageBlock(opts, undoable=false)` / `insertVideoBlock(opts, undoable=false)`: toolbar passes `undoable:true` (uses `insertHTML` + `insertBlock` helper); programmatic sample loading uses `false` (direct append, no undo needed).
- Media blocks are `div.media-block[contenteditable=false]` with `data-*` (kind, width, height, ratio, lockAspect, align, src/poster/link, …). Resizable via the bottom-right `.resize-handle`. Real resizable images/videos need this structure — a bare `<img>` renders but isn't a resizable block.
- Three view modes share the area: design canvas, preview `<iframe>` (srcdoc), and HTML source `<textarea>`. Source view shows raw `[tags]`; chips re-render on return to design.
- Export (`generateEmailHtml`) clones the canvas, strips chips to raw tags, removes resize handles / contenteditable, normalizes font tags, inlines styles, and wraps in a table-based email shell.

### Layout / styling
- All editor styles live in `kexy-custom-rich-editor.component.css`, applied globally via `ViewEncapsulation.None` (REQUIRED — chips, media blocks and resize handles are created imperatively and never pass through an Angular template, so scoped styles wouldn't reach them).
- Full height via a flex chain: host (flex column) → `.page-shell` (flex:1) → `.editor-modal` (flex column) → `section` → `app-editor-canvas` → active `.mode-panel` → canvas (`flex:1; overflow-y:auto`).
- Focus highlight: `.editor-modal:focus-within` (the modal is the real bordered box; there is NO `.editor-card` element in the template even though the class exists in CSS).
- Border radii: boxes/controls/menus = **5px**; pill shapes (chips, status pill) = `999px`; true circles (the `#` badge in the picker, resize handle, fallback ↩ marker) = `50%`.

---

## Gotchas / caveats

- **`EditorStateService` is `providedIn: 'root'` (a singleton).** Two `<kexy-custom-rich-editor>` instances on one page would SHARE state (mode, selected block, output). For multiple independent editors, move `EditorStateService` (and likely the others) into the component's `providers: []`.
- `execCommand` is officially deprecated. Works everywhere today; a future rewrite would replace it with a Selection/Range-based command layer.
- Checklist (`insertChecklist`) renders checkbox markers via CSS `::before`; email HTML strips pseudo-elements, so exported checklists are plain `<ul>` lists.
- Beware invisible characters: the codebase previously had a stray non-breaking space (U+00A0) inside a string literal that broke exact-string edits. If a string edit mysteriously won't match, check for non-ASCII whitespace.
- After Undo removes a selected media block, `EditorStateService.selectedBlock` can briefly point at the detached node until you click elsewhere (which clears it).
