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
- The host element is **content-height** (`height: auto; min-height: 360px`): the editor grows with the email it holds and the **outer container scrolls** when content is long — the Design canvas does NOT scroll internally. Don't give the host a fixed/bounded height (that reintroduces internal scroll). The send-email offcanvas relies on its own `.canvas-content-wrap { overflow:auto }` to scroll the whole panel. (Preview iframe + Source/HTML textareas are the exception — they can't be content-height, so they get a fixed `min-height`/`height` and scroll internally.)

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
- Canonical keys (must match the approved build + the backend's send-time resolver): `receiver_first_name`, `receiver_last_name`, `receiver_phone_number`, `receiver_email_address`, `receiver_website`. (These were briefly wrong — `receiver_phone`/`receiver_email`/`website` — a post-integration regression; fixed back to canonical.)
- Syntax in HTML: `[snake_case_key]` with optional fallback `[key fallback=some value]` (canonical **space** syntax). Legacy **pipe** syntax `[key|fallback=…]` is *parsed* for back-compat (`TAG_REGEX` group 3) but **never emitted** — `buildRawTag` always writes the space form.
- In the design canvas they render as **blue pill chips** (label, e.g. "First Name"); on export they're stripped back to raw `[key]` / `[key fallback=…]`.
- **Fallback is stored PER CHIP** on `chip.dataset.mergeFallback` (NOT per-key) so two chips of the same tag can carry different fallbacks — matches the approved build. The `MergeTagService` registry holds only `key` + `label`. Relevant methods: `getAll`, `getTag`, `labelFor`, `createChip(key, fallback?)`, `decorateChip` (reads the chip's own dataset), `renderChipsInElement`, `stripChipsToRaw` (reads the chip's own dataset), `TAG_REGEX`, `buildRawTag`. The fallback popover writes straight to `currentChip.dataset.mergeFallback`.
- Fallback defaults are empty — `fallback=` is only emitted when a fallback is actually set.
- Clicking a chip opens the **fallback popover**; it shows an **undo (↺) icon** once you change the value (reverts to the value it opened with). When a fallback is set, the chip shows a small **↩ marker** (and `has-fallback` class) — color stays blue.
- The toolbar **`#` picker** (in the overflow menu) has a search box and inserts a chip at the caret.
- Chips are rendered on content load and when leaving Source view — NOT live while typing (would disrupt the caret). Typed `[tags]` become chips after a sample/source round-trip.

### Toolbar (`editor-toolbar.component.ts`)
- Single line, flat **inline-SVG icons**, grouped with `.tool-divider` separators.
- Order: Source(`</>`) │ lists (bullet/numbered/checklist) │ undo/redo │ image/link │ Paragraph select │ B I U S │ alignment dropdown │ (spacer) │ `⋮` overflow.
- The `⋮` **overflow menu** holds secondary tools: font family, font size, text/highlight color, table, remove-link, video, merge-tag `#` picker.
- **Font lists must match the approved build** (`fontFamilies`/`fontSizes` arrays on the toolbar component): 21 families (Arial…Comic Sans MS), each `<option>` previewing in its own face via `[style.font-family]`; 22 sizes (8–72px, 14 default). Don't truncate these (they regressed to 5/6 once).
- Opening the merge `#` picker first calls `canvas.captureMergeSelection()` so the caret (body OR subject) is saved before the picker's search input autofocuses and steals it.
- Dropdowns (overflow, merge-tag, alignment) anchor with `right: 0` and close on outside-click via a single `document:click` HostListener. They MUST be right-anchored because `.editor-modal` has `overflow: hidden` — a left-anchored menu near the right edge gets clipped.

### Subject line (chips, shared toolbar)
- The subject is a **contenteditable** rendered by the host editor component (`.email-meta .subject-input`, above the toolbar), NOT a host `<input>`. It supports the same merge-tag chips as the body — this matches the approved build (the standalone's `subjectInput`).
- Logic lives in `EditorCanvasComponent` (it already owns `MergeTagService` + the fallback popover). The host component registers the element via `editorCanvas.registerSubject(el)` in `ngAfterViewInit`.
- `mergeTagTarget: 'subject' | 'editor'` decides where the toolbar `#` picker inserts. It's derived from **where the caret actually is** — `saveSelection()` sets it to `'editor'` when the range is in the body, `saveSubjectSelection()` sets it to `'subject'` when in the subject (both run on every `selectionchange`).
- `insertMergeTagIntoSubject` restores the saved subject range, then `execCommand('insertHTML', chip+'&nbsp;')` (undoable). Public API on the host component: `@Input() subject`, `(subjectChanged)` output (emits serialized raw on input/blur), `getSubject()` (= `serializeSubjectRaw()`: clone → `stripChipsToRaw` → `textContent`, raw `[tokens]`), `setSubject(raw)` (= `setSubjectContent`: text → `renderChipsInElement`).
- Subject chips hydrate on **load** and on **blur** (NOT live while typing — same caret rule as the body). Clicking a subject chip opens the same fallback popover (`onSubjectClick`); `refreshChipIndicators` re-decorates chips in BOTH the body and the subject.
- Host wiring (`send-email-details-content`): `[subject]="emailSubject" (subjectChanged)="emailSubject = $event"`; `handleSubmit`/`generateEmailContent` read `editor.getSubject()`; the SSE subject push calls `editor.setSubject()`.

### Canvas / editing (`editor-canvas.component.ts`)
- Built on `document.execCommand` (deprecated but works in all current browsers). Bold/italic/lists/align/color/link go through execCommand and are natively undoable.
- **Font SIZE and FAMILY are NOT execCommand.** `execCommand('fontSize')` only does the legacy 1–7 scale (no arbitrary px) and `execCommand('fontName')` emits a `<font face>` attribute (weakest priority) that the host app's global `font-family: "Lato" !important` reset overrides — so picked fonts never showed. Instead `applyFontSize(px)` / `applyFontFamily(family)` → `applyInlineTextStyle({...})` wraps the selection in a `<span>` and writes the style with **`!important`** (`style.setProperty(prop, val, 'important')`). An inline `!important` outranks any selector `!important`, so the chosen font/size wins over host globals. `normalizeStyledSpans` collapses nested spans. Trade-off: these changes are NOT on the native undo stack (correctness over undo, as in the approved build). `applyInlineTextStyle` keys must be kebab-case CSS props (`'font-family'`, `'font-size'`).
- **Host-CSS-override defense:** the host's `src/styles.scss` sets `font-family: "Lato" !important` on a broad reset list, which leaks into the editor. The editor CSS re-asserts its base font on `.editor-canvas` / `.subject-input` and their children with higher-specificity `!important`; per-selection user fonts still win via the inline `!important` above. If fonts ever stop applying again, check for new host `!important` typography rules first.
- **Undo correctness**: anything inserted via direct DOM mutation is NOT on the browser undo stack. So table, images, and videos are inserted via `execCommand('insertHTML', …)` so Undo/Redo works. (Table also appends a `<p><br></p>` spacer.)
- **Merge-tag chips** (`insertChipUndoable`, used for body + subject) must be BOTH inline AND undoable. Plain `execCommand('insertHTML', chip)` promotes the chip to a NEW LINE when the caret is at the END of a paragraph (inserting a `contenteditable=false` element at a block boundary). Fix: `execCommand('insertText', ' ')` first — plain text never promotes, so it lands inline and forces the caret INSIDE a text node — then step the caret back one char (before the space) and `execCommand('insertHTML', chip)` there (now mid-text-node → inserts inline). Both steps are execCommand, so Undo/Redo work (undo removes the chip, then the space). Do NOT replace this with a raw `range.insertNode` — that fixes placement but breaks chip undo.
- **Resize handles use event delegation** (`onResizePointerDown` on the canvas), NOT per-element listeners — so media blocks inserted as HTML (insertHTML / undo-redo / source edit / paste) stay resizable. `createResizeHandle()` only creates the div.
- `insertImageBlock(opts, undoable=false)` / `insertVideoBlock(opts, undoable=false)`: toolbar passes `undoable:true` (uses `insertHTML` + `insertBlock` helper); programmatic sample loading uses `false` (direct append, no undo needed).
- Media blocks are `div.media-block[contenteditable=false]` with `data-*` (kind, width, height, ratio, lockAspect, align, src/poster/link, …). Resizable via the bottom-right `.resize-handle`. Real resizable images/videos need this structure — a bare `<img>` renders but isn't a resizable block.
- **Drag-to-reposition**: media blocks are `draggable="true"` (set on insert + in `hydrateEditorBlocks`) and moved via native HTML5 DnD delegated on the canvas (`dragstart`/`dragover`/`drop`/`dragend`). Placement is **caret-based**: `caretRangeFromPoint` (with a `caretPositionFromPoint` fallback) finds the exact caret under the cursor; `dragover` shows a thin insertion caret (a `position:fixed` div appended to `<body>`, created lazily, removed on destroy); `drop` does `range.insertNode(block)`. This lets a block land between `<br>` lines, between paragraphs, and inside table cells — anywhere a caret can go. The move runs through `execCommand` so it's UNDOABLE (direct DOM moves are not): `insertHTML` the block copy at the drop caret, then select+`delete` the original — so a full undo of a move takes two native steps (delete, then insert). `hoistOutOfParagraph` then moves the inserted copy OUT to a sibling if it landed at the very start/end of a `<p>`/heading (so we don't nest a block in a paragraph), while interior drops (between `<br>`s) stay put. Two guards: dragstart on the `.resize-handle` is suppressed so resizing isn't hijacked; `.dragging` sets `pointer-events:none` (applied on the NEXT tick — mutating the element synchronously in `dragstart` aborts the drag) so `caretRangeFromPoint` reads what's under the block. Export (`transformMediaBlocks`) and `getRawHtml` both query `.media-block` globally, so repositioned/nested blocks still export/round-trip.
- Three view modes share the area: design canvas, preview `<iframe>` (srcdoc), and HTML source `<textarea>`. Source view shows raw `[tags]`; chips re-render on return to design.
- Export (`generateEmailHtml`) clones the canvas, strips chips to raw tags, removes resize handles / contenteditable, normalizes font tags, inlines styles, and wraps in a table-based email shell.
- **Image upload**: the toolbar's `onImageFile` computes dimensions from the local file, then calls the optional `toolbar.uploadImage(file)` callback to get a hosted URL for the block `src` (so exported emails reference a hosted image, not base64). The host component (`KexyCustomRichEditorComponent`) wires this in `ngAfterViewInit` to its `sendFile()` → `{ default: url }` against `apiUrl` (`landing-pages/save-image`). If no uploader is wired, or upload fails, it falls back to an inline base64 data URL. NOTE: this makes the editor no longer fully self-contained — `sendFile`/`apiUrl` depend on `environment` + an auth token in localStorage.

### Layout / styling
- All editor styles live in `kexy-custom-rich-editor.component.css`, applied globally via `ViewEncapsulation.None` (REQUIRED — chips, media blocks and resize handles are created imperatively and never pass through an Angular template, so scoped styles wouldn't reach them).
- **Content-height layout** (NOT flex-fill): host → `.page-shell` → `.editor-modal` are plain flex columns with no forced height/`flex:1`/internal `overflow`. `.editor-modal > section` is the bordered card (children = `.email-meta` subject row [above the toolbar, flex:0 0 auto], toolbar, `.tab-row`, `app-editor-canvas`); it grows with the canvas. `.editor-canvas` has `min-height: 320px; overflow: visible` so it grows with content instead of scrolling. The `app-media-inspector` ("Selected media") is the last child of `.editor-modal` (`flex:0 0 auto`) and simply stacks below — since nothing is height-bounded, it never squeezes the editor and the outer container scrolls to reveal it.
- The bordered "card" is the inner `<section>` (border/background/radius/overflow + `:focus-within` highlight live there), NOT `.editor-modal` (which is just a layout column). This is deliberate: the `.email-meta` subject line sits ABOVE `<section>` and OUTSIDE its border, so it reads as a separate field. There is NO `.editor-card` element in the template even though the class exists in CSS.
- Border radii: boxes/controls/menus = **5px**; pill shapes (chips, status pill) = `999px`; true circles (the `#` badge in the picker, resize handle, fallback ↩ marker) = `50%`.

---

## Gotchas / caveats

- **`EditorStateService` is `providedIn: 'root'` (a singleton).** Two `<kexy-custom-rich-editor>` instances on one page would SHARE state (mode, selected block, output). For multiple independent editors, move `EditorStateService` (and likely the others) into the component's `providers: []`.
- `execCommand` is officially deprecated. Works everywhere today; a future rewrite would replace it with a Selection/Range-based command layer.
- Checklist (`insertChecklist`) renders checkbox markers via CSS `::before`; email HTML strips pseudo-elements, so exported checklists are plain `<ul>` lists.
- Beware invisible characters: the codebase previously had a stray non-breaking space (U+00A0) inside a string literal that broke exact-string edits. If a string edit mysteriously won't match, check for non-ASCII whitespace.
- After Undo removes a selected media block, `EditorStateService.selectedBlock` can briefly point at the detached node until you click elsewhere (which clears it).
