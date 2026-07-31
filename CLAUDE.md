# GetKexy Web Portal

Angular 19 brand portal. This root file documents cross-cutting conventions and
the subsystems worked on outside the email editor. The **email editor**
(`<kexy-custom-rich-editor>`) is a self-contained component with its OWN source
of truth — see `src/app/components/kexy-custom-rich-editor/CLAUDE.md` and read it
before touching anything in that folder.

---

## Drip campaign email delays

A drip campaign is an ordered list of `DripEmail`s. Each email carries a
`delayBetweenPreviousEmail` (`EmailDelay = { days, hours, minutes }`) describing
how long after the previous email it should go out.

### The delay defaults live in ONE place

`src/app/models/DripEmail.ts` — do NOT re-introduce inline `{ days, hours, minutes }`
literals anywhere else; reference these factories instead:

- `EmailDelay.default()` → `{ days: 3, hours: 0, minutes: 0 }` — applied to every
  email **after** the first.
- `EmailDelay.firstEmail()` → `{ days: 0, hours: 0, minutes: 1 }` — the **first**
  email in a campaign goes out almost immediately.

Both return a **fresh object per call** on purpose: a single shared object would
let an edit to one email's delay mutate every other email pointing at the same
reference. Keep that property if you refactor.

### Where delays get assigned

All email-creation paths live in `src/app/services/sse.service.ts`. The first
email in a sequence must always use `EmailDelay.firstEmail()`; the rest use the
default. This rule is applied in every creation path:

- `dripBulkEmailContentStream` (the live AI stream — called from
  `generate-drip-campaign.component.ts`): mid-stream finalize + stream-end.
- `setupEmptyDripEmailTemplate` (live — builds N empty emails): first is `i === 0`.
- `dripBulkEmailContentStreamOld` (currently **unreferenced**, kept consistent so
  it's correct if ever revived).

The "first email" is identified by `emailSequence === 1` (or index `0` in the
template builder). If you add another path that creates `DripEmail`s, apply the
same rule.

### Persistence shape

`delayBetweenPreviousEmail` is stored/transmitted as a **JSON string**, not an
object: API payloads do `JSON.stringify(delayBetweenPreviousEmail)` and read it
back with `JSON.parse(...)` (see `DripCampaign.ts` and
`generate-drip-campaign.component.ts`). Keep that round-trip intact.

### Editing a delay (`delay-details-content` offcanvas)

`delay-details-content.component.ts` edits a single email's delay. Validation
clamps: `days >= 0`, `0 <= hours <= 24`, `0 <= minutes <= 60`; submit is rejected
if all three are `0`. (These clamps are restated to the user as a `.field-hint`
under the inputs — keep the two in sync.) It uses the shared drawer design; see
"Shared drawer look" above. On submit it updates local state and, when the email has an
`id`, calls `dripCampaignService.updateDripCampaignEmail(...)`, then
`sseService.updateDripBulkEmail(...)` to sync the in-memory list.

### Paused campaign warning

`generate-drip-campaign` shows an amber `.campaign-paused-warning` banner at the
top of the view when `dripCampaign?.status === constants.PAUSE` (`'pause'`),
noting that scheduled emails won't send until the campaign is resumed. The banner
has a yellow **Resume** `<app-kexy-button>` (`fa-play-circle-o`) →
`resumeDripCampaign()`, which mirrors the pause/resume flow in
`brand-list-of-drip-campaigns`: confirm, then re-save the campaign via
`dripCampaignService.createOrUpdateDripCampaign(...)` with `status: ACTIVE` and
set the local status so the banner hides.

---

## Email-verification progress (contact lists)

A list's contacts can be email-verified. `contact-list-card` shows a blue
`.list-verification-progress` banner (spinner + live %) while verification is
running. State lives in a **card-local `validationStatus`** (the single source of
truth for `isValidationProgress()` — `pending`/`inprogress`/`in_queue`), NOT in
`listInfo` directly: on list pages it's seeded from `listInfo.validationStatus`
in `ngOnChanges` and mirrored back via `setValidationStatus()` (so siblings
sharing the same `listObj`, e.g. `prospecting-common-card`'s badge, stay in
sync); on the **`brand-contacts` page there is NO `listInfo`**, so it tracks a
selected-contacts run on its own.

- **Verify all vs. selected vs. select-all:** `validateList()` POSTs
  `lists/validate` with **exactly one** of `{ listId }` or
  `{ contactIds: number[] }` (the API rejects sending both — `400 "Provide
  exactly one of listId or contactIds"`). It computes
  `useWholeList = (selectAllContacts && listInfo.id) || no contacts checked`:
  - **checked subset** → `{ contactIds }` (only those verified);
  - **nothing checked** → `{ listId }` (whole list);
  - **"Select all N records" active** → `{ listId }` too — a cross-page selection
    can only carry the loaded page's ids, so we verify the whole list instead.
  Guard: if `useWholeList` but there's no `listInfo.id` (brand-contacts), it
  alerts "No contacts selected" and bails.
- **Where the button lives:** on `brand-list-contacts` the button is inside the
  card (`showActionBtns`); label = `Validate Emails (totalContactsCount)` when
  select-all is on, else `Validate Emails (getSelectedItemCount())`, else
  `Validate List Emails`. On `brand-contacts` the card has NO `showActionBtns`, so
  the page renders its OWN `Validate Emails (N)` button in `.top-btns` (via a
  `#contactCard` template ref → `contactCard.validateList()`), shown only when
  contacts are checked and **disabled under `selectAllContacts`** (no list to fall
  back to). (Label copy is "Validate Emails", not "Verify …", so it's clear the
  action validates email addresses.)
- **Live progress** comes from the backend `GET lists/:id/validation-status`
  (`prospectingService.getValidationStatus(listId)`). Response body (under the
  standard `{ success, data }` wrapper): `data.validationStatus`, `data.progress`
  (0–100, real-time), `data.total`, `data.breakdown { verified, invalid,
  catch-all, unverified }`. The card reads `res.data ?? res` to tolerate either.
  When a **subset** was verified (checked contacts), polling instead reads
  `GET lists/contacts/validation-status?contactIds=1,2,3`
  (`getContactsValidationStatus(ids)`, **same response shape** —
  `validationStatus`/`progress`/`total`/`breakdown`, plus `contactIds`) — the
  card remembers the submitted ids in `validatingContactIds` (set in
  `validateList`, cleared in `stopValidationPolling`) and just picks the endpoint;
  the poll logic (status/progress/completion) is identical for both.
- The card **polls every 5s** (`startValidationPolling`) and drives the banner
  `%` + bar from `data.progress`. Polling starts in `ngOnChanges` (list already
  mid-run on load) and after `validateList()`; cleared in `ngOnDestroy`.
- **Backend quirk:** `progress` climbs to 99 max while running and only hits 100
  when `validationStatus === 'complete'` — that's also when `breakdown` becomes
  populated (the job writes all contacts in one bulk update at the end). So show
  the live `%` during the run, and the `breakdown.verified of total` summary only
  on completion. Don't try to show a per-contact count mid-run; it stays ~0.
- **Terminal states stop polling:** `complete` → success alert with the verified
  breakdown + banner auto-hides; `not_validated` → failed (progress frozen),
  error alert; the existing "Verify Email(s)" button is the retry.
- **Auto-refresh on completion:** on `complete` the card emits `@Output()
  refreshContacts`; both `brand-list-contacts` and `brand-contacts` bind it to
  `getContacts(true)` so the updated email statuses load without a manual refresh.
- **Verified badge:** `prospecting-common-card` shows a green ✓ "Verified on
  {validationTime | date}" in the Creator / Total Contact(s) row when
  `listInfo.validationStatus === 'complete'` (the validated state; `not_validated`
  = never/failed) AND `listInfo.contactListCount` is truthy.
- **Empty list:** the "Verify Email(s)" button (`*ngIf="contacts.length"`) and the
  verified badge are both hidden when the list has no contacts.

---

## CSV contact import (async) + results

CSV import is **asynchronous**. `POST contacts` (`prospectingService.addContacts`,
resolves `res.data`) now returns immediately (HTTP 202) with
`{ importId, status, total }` — NOT the final result. The frontend polls
`GET contacts/import/:id` (`prospectingService.getImportStatus(importId)`) until
`status` is `complete` or `failed`. Poll body (under `{ success, data }`):
`{ importId, status (in_queue → inprogress → complete | failed), progress (0–100,
capped at 99 until committed), total, importedCount, skippedCount, skipped[],
error }`. On `complete`, `importedCount`/`skippedCount`/`skipped` hold what the
POST used to return synchronously.

- **Polling lives in `contact-list-card`** (shared by both pages), mirroring the
  verification flow: `startImportPolling(importId)` polls every **2s**
  (`IMPORT_POLL_MS`, faster than the 5s validation poll), shows a second
  `.list-verification-progress` banner ("Importing contacts… N%" + progress bar
  from `importProgress`), and on `complete` emits `@Output() importCompleted`
  with the final body; `failed` shows an error alert. Cleaned up in `ngOnDestroy`.
- **Page flow:** the upload modal's `(parsedFileData)` now opens the **preview
  modal** first (see below) via `showImportPreview`, NOT a direct import. When the
  user confirms in the preview, it calls `getImportedFileData(cleaned)` which calls
  `addContacts`, stashes the submitted rows in `importedContactsSubmitted`, then
  `contactCard.startImportPolling(res.importId)` (each page has a `#contactCard`
  `@ViewChild`). `(importCompleted)="handleImportCompleted($event)"` then reloads
  contacts (list page also `getLists`) and either opens the results modal (if
  `skipped.length`) or shows an "Import complete" success alert. (Modal lifecycle
  is handled by `showImportPreview`, so `getImportedFileData` no longer closes any
  modal itself.)
- `ImportResultsModalContentComponent` (`components/import-results-modal-content`)
  is a reusable standalone modal: a summary (imported / skipped pills) + a table
  of skipped rows (Name, Email, Company, Job Title, Location, Errors).
- `showImportResults(data, contacts)` maps each skipped item back to its full row
  and opens the modal (only when `skipped.length > 0`). Opened with `size: 'xl'`,
  `backdrop: 'static'`, `keyboard: false` — closes ONLY via Done / X. Each
  `skipped` item is `{ contact, email, errors[] }` where `contact` is the INDEX
  into the submitted `contacts` array.
- **Mapping gotcha:** the submitted `contacts` are flat `Contact.contactPostDto`
  objects (top-level `firstName`/`lastName`/`title`/`email`/`city`/`state`/
  `country`, company under `organization.name`) — NOT nested under `.details`.
  Map `skipped[i].contact` by index, falling back to an email match, then read
  those flat fields. `email`/`errors` come from the skipped entry (authoritative).

### Pre-import preview (EXPERIMENTAL)

`ImportPreviewModalContentComponent` (`components/import-preview-modal-content`) is
a spreadsheet-style review step shown BEFORE the import runs. Both pages route the
upload modal's parsed data into it via `showImportPreview(data)` (opens `xl`,
`backdrop: 'static'`, `keyboard: false`), whose `startImport` callback closes the
preview and hands `{ ...parsedData, data: keptRows }` to `getImportedFileData`.
It closes ONLY via the header X (no Cancel button; backdrop/Esc disabled).

- **Input** is the raw Papa-parse result (`{ data, meta.fields, errors }`).
  Columns come from `meta.fields`, reordered to `First Name, Last Name, Email,
  Website, Linkedin`, then the rest (case-insensitive match via `orderColumns`).
- **Validation** (`isCellInvalid`): the `Email` column must match a basic email
  regex (required); URL columns (matched by `/linkedin|website|url/i`) must be
  well-formed **only if non-empty** (empty is fine — the importer fills defaults).
  Kept lenient on purpose to mirror what `parseCsvDataToContact` tolerates. Each
  row is precomputed into a `PreviewItem { row, invalidCols[], invalid }`.
- **UI:** a status banner (green "all good" / amber "N need attention") with count
  chips + a valid/invalid health bar; **Google-Sheets-style grid** — gridlines on
  every cell, gray sticky header + sticky `#` row-number gutter, sticky remove
  column, per-column invalid count badges, red-highlighted invalid cells (⚠ +
  tooltip reason), a row pulse, and a blue selection outline on the editing cell.
- **Find/fix:** "Next issue" steps through invalid rows (scroll + pulse, cycles);
  "Only invalid" filters the grid (`displayed`); per-row remove + "Remove N".
  **Inline edit:** DOUBLE-click a cell → input (`[(ngModel)]="item.row[col]"`,
  focus without select); Enter/blur commits and re-validates that row
  (`revalidate` + `recompute`), Esc cancels. Edits mutate the row objects in place,
  so they flow straight into the import. Banner action buttons + Import are
  `<app-kexy-button>`.
- **Performance (important):** the component is `ChangeDetectionStrategy.OnPush`.
  All summary values are **precomputed fields** (`validCount`, `invalidCount`,
  `invalidEmailCount`, `invalidUrlCount`, `validPct`, `invalidPct`,
  `colInvalidCount`, `displayed`) refreshed ONLY by `recompute()` on data/filter
  change — do NOT reintroduce template getters that iterate `items` (they ran every
  CD cycle and made editing laggy on large files). Each row carries an
  `invalidSet: Set<string>` for O(1) per-cell checks in the template. Off-event
  state changes call `cdr.markForCheck()`.
- **Loaders:** initial validation/first render is deferred behind a spinner
  (`loading`); filter/remove re-renders run behind a `.ip-table-busy` overlay via
  `runTableUpdate()` (flip `tableBusy` + `markForCheck`, defer the work a tick so
  the spinner paints, `recompute`, then hide). `trackByItem` keeps the `*ngFor`
  cheap.

---

## Contact selection & cross-page "select all"

Contact pages (`brand-contacts`, `brand-list-contacts`) let the user check rows
(`Contact.isSelected`, mirrored into `selectedContacts`) OR click **"Select all N
records"** (`selectAllContacts` flag + `prospectingService.selectedAllContacts`),
which means *every contact across all pages*, not just the loaded ones.

- **Bulk-action payloads:** when `selectAllContacts` is on, bulk actions send the
  whole **filtered set** to the backend instead of the loaded ids: set
  `selectedAllContacts: true` (boolean, **camelCase**), `selectedAllContactsPayload:
  <the page's getContacts filter payload>` and `contacts: []`. This applies to
  `deleteContacts` (both pages) AND `deleteContactsFromList` (list page). Use the
  **camelCase** keys — the API's DTO whitelist **rejects** the old snake_case
  `selected_all_contacts` / `selected_all_contacts_payload` (`"property … should not
  exist"`). On `brand-list-contacts` the payload comes from `getContactApiPostData()`
  (scoped to the list via `listIds: [listId]`), so select-all stays list-scoped.
- **Button counts:** the card's `Delete (N)` / `Remove From List (N)` and the
  `Validate Emails (N)` labels all show `N = selectAllContacts ? totalContactsCount
  : getSelectedItemCount()`.
- **Reset on reload (gotcha):** `setContactSubscription` clears BOTH
  `selectedContacts` and `selectAllContacts` on every data emission. Without the
  `selectAllContacts` reset, the flag survived a reload (e.g. after a CSV import)
  and the buttons kept showing the full `totalContactsCount` even though the fresh
  rows weren't selected. Pagination handlers also reset it explicitly.

---

## Contact add/edit offcanvas (`prospecting-contacts`)

The slide-over form for creating/editing a contact (opened from `brand-contacts`
and `brand-list-contacts` with `panelClass: 'contact-slide-content …'`, 800px wide
per `styles.scss`). Handles three modes off the same `primaryForm`: **create**,
**edit single**, **edit multiple** (`isMultipleContactsSelected` — only the
Classification section shows; per-contact fields are hidden).

- **Modern drawer layout (Tailwind-UI/Headless-UI pattern):**
  `.canvas-content-wrap` is a **flex column** (`height:100vh; overflow:hidden`)
  holding `.head-area` (`flex-shrink:0`), a `<form class="canvas-form">`
  (`flex:1; min-height:0`), and inside it `.canvas-body` (`flex:1; min-height:0;
  overflow-y:auto` — **the only scroll region**) plus a `.buttons` footer
  (`flex-shrink:0`). The footer stays docked at the bottom (no sticky/negative-
  margin hacks) so Save/Cancel are always reachable. **The footer is a sibling of
  `.canvas-body` but still inside the `<form>`** so `type="submit"` works — don't
  move it out of the form. Actions are right-aligned, **Cancel then Save**
  (primary on the right).
- **Fields** are grouped into `.form-section` cards (Classification / Contact
  details / Location / Drip Campaigns / Notes), each with a gradient icon chip +
  title, laid out in a 2-col `.fields-grid` (`.field.full` spans both; collapses
  to 1 col < 640px). Soft-filled inputs + brand-blue focus ring; SCSS has a token
  block at the top (`$kx-primary #12a5f4` → `$kx-primary-deep #095dd1`). The
  `kexy-select-dropdown`s (Marketing Status, Lists, Country, State) render their
  OWN labels — don't add a `.field-label` for those.
- **Email verification badge:** the Email field surfaces the contact's stored
  verification result (`contact.emailStatus` / `contact.details.emailStatus`,
  values `verified`/`invalid`/`catch-all`/`unverified`, same as
  `EMAIL_STATUS_OPTIONS`) as a pill beside the label + an affix icon inside the
  input + a status-tinted border + a hint line. Computed by `computeEmailStatus()`
  into the **`emailStatusInfo` field** (NOT a template getter — keeps CD cheap),
  refreshed in `setPrimaryForm` and on `(input)="onEmailInput()"`. It **only shows
  while the typed email still matches the saved one** (editing the address hides
  the badge, since the old result no longer applies). Green = valid, red =
  invalid, amber = catch-all/unverified.

### Shared drawer look: `lead-magnet-form`

`lead-magnet-form` (the add/edit Lead Magnet offcanvas, opened from `lead-magnets`
at the same 800px `contact-slide-content` width) reuses this exact drawer design —
flex-column `.canvas-content-wrap` (header / scrollable `.canvas-body` / docked
`.buttons` footer, with `.canvas-form` wrapping body+footer so the footer stays
pinned), the round `.close-btn`, a `.form-section` card (gradient `.section-icon` +
title), soft-filled `.field`/`.form-control` inputs, and plain `.blue-button` /
`.blue-border-white-bg-button` footer buttons (Cancel then Save, Save shows an
inline spinner). Its SCSS duplicates the tokens/layout locally. If you restyle the
drawer, update both this and `prospecting-contacts`.

**`company-description-canvas`** (add/edit Company Description, 900px
`email-time-settings-slider` panel) and **`add-suppression`** (add users to the
suppression list, wide `email-content` panel) now reuse the SAME drawer design,
each duplicating the tokens/layout locally. `add-suppression` is a **repeatable-row**
variant: each user is a `.user-row` grid (First / Last / Email + a bordered
`.row-remove` icon button, disabled at one row), labels shown only on row 0, plus a
dashed **`.add-row-btn`** ghost button; it collapses to a single column under 720px.

**`send-email-details-content`** (Email Details, opened from
`generate-drip-campaign` on the wide `email-content` panel) also reuses this
design, with one structural difference forced by the rich editor: it is the only
copy whose `.canvas-body` is itself a **flex column** (`gap: 18px`) rather than a
plain scroll box, because the `.form-section.editor-section` must GROW to absorb
the leftover height so `<kexy-custom-rich-editor [fillHeight]="true">` can stretch
into it and scroll its Design canvas internally. `overflow-y: auto` on
`.canvas-body` is therefore only the short-viewport fallback: once the editor hits
its floor the drawer scrolls instead. Keep that flex chain
(`.canvas-body` → `.editor-section` → `.ckeditor-wrap` → editor) intact if you
restyle it, and note the **height rule, which has exactly one correct shape**:

- **Everything from `.ckeditor-wrap` down stays `min-height: 0`,** including the
  editor host (this deliberately overrides the editor package's own
  `.fill-height { min-height: 420px }`). `min-height: 0` is what makes the editor
  height-BOUNDED, which is what makes it scroll its Design canvas internally and
  keep the toolbar + subject pinned. Give any wrapper a content-based minimum
  (i.e. drop the `min-height: 0`) and the editor grows with the email instead —
  the toolbar then scrolls off the top and is unreachable while editing the
  bottom of a long email.
- **`.editor-section` is `flex: 0 0 auto; height: 100%`** — exactly one visible
  `.canvas-body` height, so the editor always takes the FULL height the drawer has
  available. This produces the **scroll handoff**, and it is pure geometry with no
  JS: scrollable content is `settings card + gap + one viewport of editor`, so the
  parent's max scroll equals the settings card's height. Scrolling the drawer
  scrolls the settings card away and then **runs out exactly as the editor's
  toolbar reaches the top** — from there, further wheel/trackpad input goes to the
  editor's own canvas and scrolls the email. The toolbar is never carried off the
  top, so no sticky positioning is needed anywhere. `flex: 0 0 auto` is
  load-bearing: let the card flex-shrink and it gets squeezed to fit, nothing
  overflows, and nothing ever scrolls. `.canvas-body`'s height must stay definite
  (`flex: 1; min-height: 0`) since `height: 100%` resolves against it.
- **The card also carries a floor**, DERIVED (not typed literally) from
  `$kx-editor-min-h` (the height the editor itself is guaranteed, currently 720px)
  + `$kx-editor-card-chrome` (85px — this card's `.section-head` + padding). So the
  editor is `max(full available height, $kx-editor-min-h)` and never collapses to
  an unreadably short box on a small screen. To retune, edit `$kx-editor-min-h`
  only — the card floor follows.
- **Known trade-off between those two rules** (deliberate, product decision): the
  handoff is exact only while the card FITS the drawer. The visible body area is
  roughly `100vh - 200px`, so under about a **`$kx-editor-min-h + 285px`**
  viewport (~1005px at the current 720px floor) the card is taller than the visible
  area, the parent gains scroll range BEYOND the handoff point (enough to reach the
  card's bottom edge), and spending it carries the toolbar above the top of the
  view. It only bites when scrolling to the very bottom of the editor box — the
  email itself is fully reachable without that, since the canvas scrolls
  internally. Two ways out if it becomes a problem: lower `$kx-editor-min-h` so the
  card fits, or re-add the sticky `.editor-head` in the editor component (see
  below) so the toolbar survives the extra scroll. Note the ceiling neither can
  beat: visible content can never exceed the viewport, so a floor above the drawer
  height buys reachable-by-scrolling height, not more content on screen at once.
- Any floor put on the editor HOST (rather than the card) must be scoped
  `:not(.fullscreen)`, since a rule that specific beats the editor's fullscreen
  `min-height: 0` + `height: 100vh` reset.
- The shared `kexy-custom-rich-editor` component is **untouched** by this drawer —
  all of the above lives in the drawer's own SCSS. An earlier attempt made the
  editor's toolbar `position: sticky`, which required relaxing the editor's
  `.editor-modal > section { overflow: hidden }` and wrapping the toolbar + tab row
  in an `.editor-head` div; that was reverted in favour of the handoff. Prefer
  fixing scroll behaviour here over reaching into the editor.

The editor card uses tighter padding than its siblings
(`16px 18px 18px`, slimmer `.section-head`) since the editor draws its own bordered
card inside and the usual padding reads as a card-in-a-card. Its two sections are
Email settings (a 3-col `.settings-grid` of tone/length/style — the dropdowns
render their own labels, so no `.field-label`; the `?` help tooltip sits beside
Email Style; **Generate Email** is a right-aligned `.section-action` in the
section head) and Email content. Unlike the other copies it keeps
`<app-kexy-button>` in the footer instead of plain `.blue-button` markup, because
Save/Generate depend on its spinner + `disabled`/`title` tooltip inputs — the
footer sizes the host (`min-width: 130px`) to match the shared look.

**`email-time-settings-content`** (campaign Settings, 900px
`email-time-settings-slider` panel, opened from `generate-drip-campaign`) is the
**two-tab variant**. `kexy-tab` switches between `constants.ENROLLMENT_TRIGGERS`
and `constants.TIMING`, and each tab is its **own `<form class="canvas-form">`**
because they submit to different handlers (`handleSubmitEnrollmentTriggers` /
`handleSubmitTiming`) — only one is in the DOM at a time via `*ngIf`, so the
`.canvas-body` + `.buttons` pair is duplicated per tab rather than shared. The
**`.tab-strip` sits OUTSIDE both forms** (a pinned flex-column sibling between
`.head-area` and the form) so it stays visible while the body scrolls. `kexy-tab`
is a shared component whose internals can't be reached from a parent stylesheet
without `::ng-deep`, so its palette is passed through its own
`tabBgColor`/`tabItemColor`/`tabItemActiveColor` inputs instead of being restyled.
Beyond the standard `.form-section` cards it adds a few local patterns: a
`.toggle-row` (label + `kexy-toggle-switch` in a soft-filled bar), a `.subpanel`
for content revealed by a toggle/radio, `.radio-row`/`.radio-option` (native
inputs + `accent-color`), `.chip-row`/`.list-chip` for the active-list pills (their
colors come from inline `[style.*]` bindings, so the class sets only shape), and an
`.analytics-row` grid whose labels live in ONE `.analytics-head` row rather than
being repeated per row. It reuses `add-suppression`'s repeatable-row vocabulary
(`.repeat-row` + `.row-remove` + dashed `.add-row-btn`) for the day/time schedule,
the skip-dates list and the analytics recipients; `.repeat-row` uses
`align-items: end` so the remove button lines up with the bottom of controls
whether or not they render their own labels.

**`delay-details-content`** (Delay Details — edit one email's wait time) is the
**smallest** copy: a single `.form-section` card ("Wait time") holding a 3-column
`.fields-grid` of Days / Hours / Minutes number inputs, a `.section-note`, a
`.field-hint` restating the clamps the component applies, and the
`error-message-card` in a `.section-error`. It replaced a Bootstrap
`.row`/`.col-md-4` grid. Note it is opened WITHOUT a panel class
(`__createRightSideSlide(DelayDetailsContentComponent)`), so it inherits that
helper's default `email-time-settings-slider` — 900px, same as the Settings
drawer, which is why 3 columns fit.

**`email-insights-content`** (per-email Insights, wide `email-insights` panel) is the
**read-only variant**: nothing is edited, so it has **no `<form>` and no docked
`.buttons` footer**. Its one action (Export) sits in a `.head-actions` row in the
header beside the close button. Body = a `.summary-section` card (Email #N eyebrow +
subject + the view's single **hero figure**, `Sent to N` at 48px) → a 3-up `.kpi-row`
of rate tiles → a 2-up `.insights-grid`. Bootstrap `.row`/`.col-4` was replaced with
CSS grid.

Its two child cards, **`insights-statistics-card`** and
**`insights-contacts-or-links`**, are consumed ONLY by this drawer, so they were
restyled directly rather than via `::ng-deep` — check that before reusing them
elsewhere. They draw their own card chrome, so the drawer does NOT wrap them in a
`.form-section` (that would read as a card-in-a-card). Notes on those two:
- The stat tile is `label → value → meter`; the value moved out of a small span
  beside the title. The value wears **ink, not the accent hue** (the meter carries
  the color) and uses proportional figures, while the counts column in the list card
  uses `tabular-nums` so digits align. All three rate tiles share ONE treatment on
  purpose — a hue per tile would imply a categorical identity that isn't there.
- The meter's track is a **lighter step of the same blue ramp** (`#dceafb` under
  `$kx-primary`), not gray, so the bar reads as one scale. `::ng-deep .progress-bar`
  is still needed to reach the ng-bootstrap fill.
- Row separators in the list card now come from `.data-row + .data-row` in CSS; they
  used to be an inline `style="border-top: …"` repeated on every row.
- The subject line was brand-blue with `cursor: pointer` but had **no click
  handler** — it now renders as plain ink text rather than a link that does nothing.

**`preview-drip-email-content`** (Preview Email) adopts the shared design for its
**header only** — title + subtitle, a `.head-actions` row with "Spin Another
Version", a `.head-divider`, then the round `.close-btn` (which replaced a
`Close` `<app-kexy-button>`). Everything below the header is deliberately NOT
restyled, and that is the point of the component:

- The `.reading-pane` **simulates a real inbox**, so it wears a mail-client palette
  (`#202124` / `#5f6368` / `#f1f3f4`) instead of the drawer tokens, and it is
  full-bleed white rather than cards on `#f4f6fb`. Don't "fix" it to match the
  other drawers — it would stop looking like an inbox. There is no `.canvas-body`
  card stack and no docked `.buttons` footer here.
- **The preview itself is an `<iframe>` filled via `srcdoc`** from
  `__renderPreview()`, found through `@ViewChild('previewFrame')`. Two things must
  survive any edit: the `#previewFrame` ref on the `<iframe>`, and the height chain
  `.preview-stage { position: relative; flex: 1 1 auto; min-height: 420px }` with
  `iframe { position: absolute; inset: 0; height: 100% }`. The iframe is positioned
  absolutely ON PURPOSE — an iframe can't be content-height, so an unresolved
  `height: 100%` collapses to 0 and the preview renders blank white.
- The template imports `DatePipe` + `KexyButtonComponent` but **NOT `CommonModule`**,
  so `*ngIf`/`*ngFor` are unavailable — the empty-subject case uses
  `{{ emailSubject || '(no subject)' }}` rather than a conditional.
- The star / reply / ellipsis icons in `.mail-actions` are decorative set dressing
  with no handlers (they carry `cursor: pointer` for realism). Intentional here,
  unlike the insights subject line that was fixed.

**`dashboard-layout-drawer`** (Customize dashboard, 520px `dashboard-layout-slider`
panel, opened from `brand-dashboard`) is the **narrowest** copy and the only one with
**no `<form>`** — it edits no fields, so `.canvas-form` is a plain `div` kept purely to
wrap body + footer and keep the footer docked. Body is one `.form-section` holding a
CDK `cdkDropList` of uniform `.wl-row`s (grip / position number / title / eye, with a
segmented width control beneath), plus a `.reset-btn` deliberately placed OUTSIDE the
section card since it undoes everything inside it. Footer is Cancel / Save with Save
disabled until `isDirty`. See "Brand dashboard — customisable card layout" below.

So there are now ten copies of this drawer — restyle them together.

---

## Table cards

The list/table cards — `label-list-card`, `contact-list-card`,
`list-of-drip-campaign-table`, `list-of-landing-page-table`,
`suppression-list-card`, `kexy-scrollable-table`,
`drip-campaign-promotions-table`, and the `lead-magnets` page — share a markup
shape: `.new-table-wrapper` › `.list-wrapper` (gets `[style.width]="tableWidth"`)
› `table.n-table` with a `tr.n-header` row of `td.n-header-name` cells, then
`tr.n-product` body rows. Columns carry an explicit `width` so header and body
cells stay aligned.

- **Width (avoid the first-render flash).** `calcWidth()` sets `tableWidth` from
  the component's OWN `.new-table-wrapper` `clientWidth` (already laid out beside
  the sidebar), falling back to `window.innerWidth − #main-sidebar width − 48`
  (guarded with `|| 0`) only before the view exists. The old viewport-minus-
  sidebar math depended on `#main-sidebar`, which isn't measurable for ~1-2s after
  load → `tableWidth` fell back to the narrow column-sum, then snapped to full
  width once the sidebar appeared. Reading the wrapper needs an injected
  `ElementRef` (named `host`). `active-contacts-table` is intentionally exempt (it
  uses a fixed `tableWidth`, no sidebar math).
- **Sticky header + vertical scroll** (on `list-of-drip-campaign-table` and
  `contact-list-card`): the header CELLS (`tr.n-header td`, NOT the `<tr>` — sticky
  doesn't work on table rows) get `position: sticky; top: 0` + an opaque background
  so body rows don't show through. The scroll container just needs a bounded height
  + `overflow`: `list-of-drip-campaign-table` puts `max-height` + `overflow: auto`
  on `.new-table-wrapper`; `contact-list-card` instead scrolls vertically inside
  `.list-wrapper` (bounded height set inline in the template, `overflow: scroll`)
  while `.new-table-wrapper` owns the horizontal scroll — sticky pins relative to
  whichever ancestor scrolls vertically. On `contact-list-card` the header cells
  also carry an inline `[style.background-color]="tableHeaderBg"` /
  `[style.color]="tableHeaderColor"` that override the SCSS fallback — the parents
  now pass the **light** header palette (`#f8fafc` bg / `#64748b` muted text, part
  of the modern redesign below), not the old solid-blue `#0047CC`/white. To roll
  the sticky behaviour out to the other cards, apply the same sticky-cell rule and
  give the body a bounded, scrollable container.

### `contact-list-card` modern redesign

The contacts data-table (`brand-contacts` + `brand-list-contacts`) was restyled
toward a Linear/Stripe/Airtable look. Behavior/bindings/`@Input()`s and the
`#contactCard` methods are unchanged unless noted; most of this is presentation.

- **Light header** (see above), comfortable 54px rows, subtle `#f1f5f9` row
  separators, `#f8fafc` hover, and a selected-row tint (`#eff6ff`) with a brand
  **left-accent bar** (`box-shadow: inset 3px 0 0`). Rows use `white-space: nowrap`
  so **every row is the same height** (long values overflow into horizontal scroll
  instead of wrapping). No CSS transitions on row bg / checkbox — a select-all
  flips many at once and animating them together stutters.
- **Gradient initial avatars** on the Name cell — `getContactInitials()` (2 letters)
  + `getAvatarClass()` (stable `av-0..av-5`). Both **memoized on the contact**
  (`__initials`/`__avatarClass`) because they run per-row on every CD pass. Name
  column widened to 220px in `getListViewData()`; **Company Name + Job Title were
  reordered to sit next to Marketing Status**, and **Lists sits immediately after
  Email Status** (a targeting fact, so it belongs beside deliverability rather than
  out past the location columns). Column order lives ONLY in `getListViewData()` —
  header and body both `*ngFor` over `columnList`, so reordering that array is the
  whole change, and it applies to BOTH `brand-contacts` and `brand-list-contacts`
  since they share this card.
- **Status pills with a leading dot**: Email Status (`.email-status`
  green/red/amber + `.status-muted` "Not checked" when `emailStatus` empty) and
  Marketing Status (`.ms-green/-red/-amber`, `pending` → amber).
- **Checkboxes are Font Awesome icons, Gmail-styled** (`.checkbox-icon`):
  `fa-square-o` (empty) / `fa-check-square-o` (checked) / `fa-minus-square-o`
  (header indeterminate). Grey outline `#80868b`, **dark-grey `#3c4043` mark when
  checked — NOT blue** (matches Gmail; the user explicitly rejected a blue fill).
  First column has doubled left padding (`padding-left: 28px; padding-right: 4px`)
  and is widened to 58px.
- **LinkedIn** = rounded icon button; **list label** = rounded tag +
  `.see-more-label-text`; proper **empty / loading states** (`.table-state`).
- Card uses `overflow: hidden` for clean corners — safe because `app-kexy-button`
  tooltips are `ngbTooltip` (body-level portal, not clipped).

**Selection UX (Gmail model).** Header shows a live **`.selection-info`**
("`X of N selected`", reflects `selectAllContacts`). When the whole visible page is
checked AND `totalPage > 1` (or `selectAllContacts`), a **`.selection-banner`** is
rendered as a full-width row **inside the table, directly under the sticky column
header** (a `<tbody>` with a `colspan` cell) so showing/hiding it never jumps the
header. The banner is `position: sticky; left: 0` and its inner width is pinned to
`browserWidthForTable` so the message stays **centered in the visible area** even
when the wide table is scrolled horizontally. It escalates to / clears
`toggleSelectAllContactSelection()`. The parents' `handleContactSelect` was
rewritten from **O(n²) → O(n)** (Set-based membership) so select-all is instant on
big pages.

**Frozen checkbox column.** The first column (header + body) is
`position: sticky; left: 0` with opaque backgrounds that track row hover/selection,
a 1px right divider, and a **scroll-aware right shadow**: `(scroll)` on
`.list-wrapper` sets `scrolledX` (only flips on the 0↔scrolled boundary), and
`.list-wrapper.scrolled-x` fades in a pseudo-element shadow on the frozen cells.
z-index: body first cell `2`, sticky header cells `3`, frozen header corner `6`.
**Specificity gotcha:** the header corner's `z-index` MUST be declared inside the
`tr.n-header` block (as `td:first-child`) so it out-specifies the sibling
`tr.n-header td { z-index: 3 }` rule. A separate `.n-header-name:first-child` rule
loses on specificity → every header cell stays at `z-index 3` and, on horizontal
scroll, the later cells paint OVER the select-all cell. (Body has no competing
z-index, which is why only the header was affected.)

**Column widths (contacts).** `table-layout: auto` (never overlaps — columns grow
to fit content), and the **Name column is `flex: true` → rendered `width: 100%`**,
the one-greedy-column trick: it soaks up ALL leftover width so the checkbox + other
columns keep their natural widths (no ballooning, no load-time flicker). Do NOT use
`table-layout: fixed` here — with long emails/company names it clips/overlaps.
`calcWidth` sums the exact column widths (no buffer), else the extra inflates the
flex column. The checkbox column width is enforced with **`min-width`** on the
first cell (a plain `width` is ignored — the greedy `width:100%` column overrides
it). Contacts has enough columns that the table exceeds the viewport and scrolls,
so the flex column rarely grows.

**Pagination** (both header + footer pagers, identical markup). First / Prev /
`Page X of Y` / Next / Last as `.pager-btn` icon buttons, disabled at the bounds
via `isFirstPage()`/`isLastPage()`; `goToFirstPage()`/`goToLastPage()` call
`navigateSpecificPage(1 | totalPage)`. The old "Jump to Page" toggle is now an
always-visible clean **`Go to [ # ] →`** (`.pager-jump`). On submit,
`handleNavigate()` sets **`jumping`** → the Go button shows a spinner + disables
(and the input disables); `ngOnChanges` clears `jumping` when `isLoading` falls, so
the feedback is on the button rather than the far-off page counter.

**Perf (important).** `getCellValue` used to `JSON.parse(row.details)` per cell on
every CD pass — a single checkbox click re-parsed hundreds of times and lagged.
`getRowDetails` now **caches the parsed object** on the row (re-parses only if the
source string changes). Combined with the memoized avatar helpers and
`trackBy: trackByContact`, per-click work is minimal.

### `brand-contacts` active-filter chips

The old single "N filters applied" pill is now **individual removable filter
tokens** (LinkedIn/Airtable style) in `.active-filters`. `getActiveFilterChips()`
builds one `{ key, label, value }` per active field from
`prospectingService.searchContactFilterData` (email-status/marketing values
prettified); each chip's ✕ calls `removeFilter(key)` which drops that field, re-runs
the search, and fully resets when it was the last one. A **Clear all** button calls
`resetSearchData()`.

### `label-list-card` (manage-list "Lists" table) — same redesign

The Lists table on `manage-list` got the same treatment as `contact-list-card`:
light header (parent passes `#f8fafc`/`#64748b`), 56px rows, sticky header, **frozen
first (checkbox) column with the scroll-aware right shadow** (`scrolledX` +
`.scrolled-x`, same z-index/specificity fix — header corner `z-index: 6` inside the
`tr.n-header` block), Gmail-style FA checkboxes (`.checkbox-icon`), empty/loading
`.table-state`, and restyled pagination. List-specific bits: the Name cell keeps
its **fixed colored `.label-tag`** (each list's `bgColor`/`textColor` — do NOT
swap this for an avatar/other style), List Size is a `.size-badge`, and "Used In"
is a `.used-in-chip`. `manage-list.component.scss` **dropped `overflow-x: scroll`** on
`.content-area` so the card's `.list-wrapper` owns horizontal scroll (needed for the
sticky/frozen behavior). Pagination here is prev/next only — the page provides no
`navigateSpecificPage` and its paging logic is fragile, so no first/last/jump.

**Column widths (lists) differ from contacts.** The Lists table has few columns, so
the contacts' single-flex-column model made one column absurdly wide. It uses
**`table-layout: auto; width: 100%; min-width: 700px`** with the `columnList` widths as
**unit-string preferences** (`'58px'`, `'auto'`, `'22%'`, …) bound straight to
`[style.width]`; `calcWidth` only computes `browserWidthForTable` (the table is
`width:100%`, not a px sum). Non-checkbox cells get `overflow:hidden;
text-overflow:ellipsis` by default.

**The Name column is exempt from that ellipsis and sizes to content** — list names are
user-chosen, and under the previous `table-layout: fixed` + `32%` they truncated however
much room the row had spare. Same two-class arrangement as
`list-of-drip-campaign-table`, applied via `getCellClasses` (mirrored onto the HEADER
cell too, or the header caps the column narrower than the body wants):
- **`.name-cell`** opts out of BOTH ellipsis rules (the generic `> span` one and the
  `.label-tag` one). That opt-out is what widens the column — while the pill could
  ellipsise, auto layout saw the content as fitting at any size.
- **`.creator-cell`** keeps its ellipsis with `max-width: 180px`, so it can't take the
  slack and squeeze Name back. Auto layout only behaves with exactly ONE uncapped column.
The frozen checkbox column uses **`min-width: 58px`, not `width`** — under auto layout a
plain `width` is only a preference and content sizing can override it.

NOTE: the checkbox column is `58px` on Lists but `87px` on Contacts — intentional per
the user's edits, not yet unified. `lead-magnets` and `suppression-list-card` still use
the fixed percentage model.

### `lead-magnets` page — same redesign

The Lead Magnets table (`app-lead-magnets`, its own inline table — not a shared
card) got the full contacts treatment: light header (`#f8fafc`/`#64748b`) with a
**"Lead Magnets" title + count chip**, 54px rows, sticky header, **frozen checkbox
column + scroll shadow** (`scrolledX`/`onTableScroll`), Gmail-style FA checkboxes,
`.table-state` empty/loading, and the **percentage fill-width model** (checkbox
`58px`, URL/Title/Summary `28/22/50%`, `table-layout:fixed; width:100%;
min-width:640px`). All the table CSS lives in `lead-magnets.component.scss` (tokens
duplicated locally).

**Pagination** here uses the shared **`app-pagination`** component (top + footer) —
which was upgraded to the contacts-style pager: First/Prev/`Page X of Y`/Next/Last
(disabled at bounds) + a "Go to [#]" jump, via new `@Output()`s `first`/`last`/
`navigate` (page handlers `paginationFirstClick`/`paginationLastClick`/
`navigateToPage`). `app-pagination` is only used by lead-magnets. **Gotcha:** its
`:host` is `inline-flex` (NOT `width:100%`) — a full-width host squeezed the card
title onto two lines in the flex header.

### `list-of-drip-campaign-table` — same redesign

The Drip Campaigns table (`brand-list-of-drip-campaigns`) got the full contacts
treatment: light header (parent passes `#f8fafc`/`#64748b`), 54px rows, sticky
header, **frozen checkbox column + scroll shadow** (`scrolledX`/`onTableScroll`;
here the scroll container is **`.new-table-wrapper`**, so the shadow keys off
`.new-table-wrapper.scrolled-x`), Gmail-style checkboxes (`getCheckboxIcon()`
returns `checkbox-icon selected` for checked/indeterminate), **status pills**
(`.status-pill` — Active=green, Pause=amber, Draft=muted), label tag + "+N more",
`.table-state` empty/loading, and the **cross-page select-all banner** under
the header. (The empty trailing `edit` column was removed.)

**Column widths: `table-layout: auto` + one uncapped column.** Earlier revisions used
`flex:true`/`width:100%` (ballooned while loading) and then `table-layout: fixed` with
percentages (stable, but it forced user-chosen **list names to ellipsise no matter how
much spare width the row had**). Now: `auto` layout, `width: 100%` + `min-width: 900px`,
and the `columnList` widths act as PREFERENCES so spare width can land where it's
needed. Two `<td>` classes carry the opposite treatments and are load-bearing together:
- **`.lists-cell`** (`key === 'label'`, `width: 'auto'`) opts OUT of the shared
  `td.n-cell > span` / `.label-tag` ellipsis rules. That opt-out is what actually
  widens the column — while the pill was allowed to ellipsise, auto layout saw the
  content as "fitting" at any size and never asked for more room.
- **`.title-cell`** keeps its ellipsis plus a hard `max-width: 340px`. This is
  required, not cosmetic: campaign titles are AI-generated and long, and an uncapped
  title would take the spare width for itself and push Lists back out of view. Auto
  layout only behaves with exactly ONE uncapped column.
`.new-table-wrapper`'s `overflow: auto` scrolls when a row genuinely needs more than
the viewport. Note this table therefore differs from `label-list-card` /
`suppression-list-card` / `lead-magnets`, which still use the fixed percentage model. The full contacts-style pager (First/Prev/Next/Last + "Go to [#]",
in BOTH header and footer) uses new table `@Input()`s
`paginationFirstClick`/`paginationLastClick`/`navigateSpecificPage`, wired to page
handlers of the same name. (This is the change committed as "Fix".)

### `suppression-list-card` — same redesign

The Suppression List table got the full treatment (mirrored from `label-list-card`,
its closest analog — few columns, prev/next-only pager): light sticky header (page
now passes `#f8fafc`/`#64748b`, was solid `#0047CC`/white), **frozen checkbox column
+ scroll shadow** (`scrolledX`/`onTableScroll`, `.scrolled-x`), Gmail-style FA
checkboxes, `.table-state` empty (`fa-ban`)/loading, the **percentage fill-width
model** (`table-layout: fixed; width: 100%`; checkbox `58px`, First/Last/Email
`22/22/56%`), and the contacts-style `.pager` (First/Prev/`Page X of Y`/Next/Last is
prev/next only here — `isFirstPage()`/`isLastPage()` added — in BOTH header and
footer). Kept the select-all header checkbox + "Select all N records" link. The page
dropped `overflow-x: scroll` on `.content-area` so the card's `.list-wrapper` owns
horizontal scroll.

### Footer pager stays on screen — cards flex-fill a bounded area

`contact-list-card` and `suppression-list-card` no longer set a fixed
`calc(100vh - Npx)` scroll height (that pushed the footer pager below the fold on
some pages). Instead the card **flex-fills** its page's bounded content area:
`:host` + `.kexy-table-card` are flex columns (`flex: 1; min-height: 0`), header +
footer are `flex-shrink: 0` (pinned), and `.new-table-wrapper` is `flex: 1;
min-height: 0` so only the table body scrolls. The host pages make this work by being
bounded flex columns with `overflow: hidden`: `brand-list-contacts` (`height: calc(100vh
- 70px)`, the info card `flex-shrink: 0`, the card `<section>` `flex: 1`);
`brand-contacts` (`.content-area` flex column, `.active-filters` pinned);
`suppression-list` (`.content-area` flex column). Use `flex: 1` (not `height: 100%`)
on the host so the card fills *remaining* space when a page has siblings above it
(e.g. `brand-contacts`' filter chips).

**Height is CAPPED, never forced — every table card.** A card must grow with its rows
and only scroll once they exceed the room available. Forcing the height (`height: 100%`,
`flex: 1`, or an inline `[style.height]`) stretched a 3-row table down the whole viewport
with a blank area under the last row. Two shapes of the same bug were fixed:

- **`contact-list-card` / `suppression-list-card`** filled via flex/`height: 100%`. Now
  the whole chain is `flex: 0 1 auto; min-height: 0` with `max-height: 100%` on `:host`.
  Both parts matter: an `auto` basis so each level contributes its CONTENT height (a
  `flex: 1` basis of `0%` contributes nothing and collapses the table area once nothing
  forces the card tall), and `min-height: 0` so flex-shrink may go below content height
  when the cap bites — which is what hands the overflow to `.list-wrapper` to scroll.
  `suppression-list-card`'s `:host` also became a flex column (was `display: block`), or
  the card underneath has no flex parent to be shrunk by.
- **`label-list-card` (Manage List) / `lead-magnets`** did it via an inline
  `[style.height]="…length ? 'calc(100vh - Npx)' : 'auto'"` on `.list-wrapper` — which
  handled *zero* rows but forced full height from the first row onward. Those bindings
  are gone; the value is now `max-height` in the SCSS (`260px` / `330px` offsets kept),
  so height is a ceiling rather than a floor and the template has one less expression
  running per CD pass.

Header + footer stay `flex-shrink: 0` throughout, so the footer pager remains pinned when
the body does scroll. Note `suppression-list`'s `.content-area` comment claims it is a
"flex column" — it is not, there is no `display: flex`; the card sizes against its
definite height instead.

### Header count + selected indicators are currently HIDDEN

The `.count-chip` (total) and `.selection-info` ("X of N selected") in the card
headers are **commented out for now** in `contact-list-card`,
`list-of-drip-campaign-table`, and `lead-magnets` (per user request — felt like too
much). The markup is left in place (commented) to restore easily. Keep the hidden
`getSelectedItemCount()` refresher span — the cross-page **select-all banner** still
depends on `selectedItemCount`.

---

## Company / Product description screens

The two Company Details screens were modernized to a shared card language (own token
block per file: primary `#12a5f4`, slate text `#1e293b`/`#64748b`, borders
`#e8ecf3`/`#eef1f6`, surface `#f8fafc`; rounded 16px cards, light headers, rounded
icon buttons, `.pc-empty`/`.pc-loading` states). They do NOT use the shared `.n-table`
cards — they're their own `.pc-*` markup.

- **`category-product-list-card`** (Product/Service Desc.) — accordion list: each
  product is a `.pc-row` (index badge + name + edit/delete `.pc-icon-btn`s + a
  circular `.pc-chevron` toggle) that expands to a `.pc-panel` of **multiple
  descriptions** (each a `.pc-desc`: label + textarea + delete), an "Add Description"
  button, and a "Save changes" button while editing. Behavior unchanged, but the
  descriptions `@for` now uses **`track $index`** (the old `track description`
  crashed on two empty descriptions — trivial to hit when adding several).
- **`prospecting-company-description`** (Company Desc.) — a flat CSS-grid table
  (`.pc-thead`/`.pc-row`, columns `56px 220px 1fr 108px`): index badge, company name,
  truncated description, and edit/delete icon buttons; edit opens
  `company-description-canvas`.

## Campaign builder — two paths, one component

`brand-drip-campaign` is a two-step wizard (campaign content → generate emails) that is
both the CREATE and the EDIT surface for a drip campaign. It is reachable on **two
routes that load the same component**:

| Path | When | Sidebar |
|---|---|---|
| `brand/drip-campaign/create` | new campaign, **and duplicating** (`?id=&action=duplicate`) | "Create Campaign" lit |
| `brand/drip-campaign/edit?id=` | opening an existing campaign | nothing lit |

The split exists because everything used to run through `…/create`, so editing campaign
#5 showed `create?id=5` in the address bar and lit up "Create Campaign" in the sidebar —
`routerLinkActive` **ignores query params by default**, so `create?id=5` matched the
create link. Don't "simplify" this back to one route.

- **Duplicating stays on CREATE** — it makes a NEW campaign out of the one named by
  `id`, so `create?id=5&action=duplicate` is accurate and the create highlight is
  correct. `brand-list-of-drip-campaigns.redirectToEditPage(duplicate)` picks the path.
- **Four `redirectToEditPage` call sites** go to EDIT: `list-of-drip-campaign-table`,
  `list-of-landing-page-table`, `prospecting-contacts`, and the non-duplicate branch of
  `brand-list-of-drip-campaigns`.
- **`…/create?id=` still works** — the component reads `id` on either path, so older
  bookmarks and any link built before the split still load the campaign.
- **`basePath` is load-bearing.** The wizard re-navigates to ITSELF when advancing a
  step, so it must target the path it is already on; a hardcoded CREATE would throw an
  edit session back to `…/create` mid-edit. Two things depend on getting this right:
  - `shouldReuseRoute` is overridden to always return falsy, so **the component is
    destroyed and rebuilt even on that self-navigation**.
  - `ngOnDestroy` therefore bails out when the next URL is still this screen, or it
    would wipe the in-progress campaign. **Both paths must be listed in that guard** —
    a miss clears the campaign right before step 2 renders it.
- **Header is a breadcrumb**, not a static title — see the Breadcrumbs section above.

## Brand dashboard — customisable card layout

`brand-dashboard` lets the user reorder, resize and hide its cards. Order and width
are **data, not markup**.

- **One canvas, not five row grids.** The page used to hold `.perf-grid` (`3fr 2fr`),
  `.duo-grid`, `.lower-grid`, `.engaged-row` and `.mini-row`, so a card's width came
  from the ROW it sat in — moving a card silently resized it, which is what made the
  layout un-customisable. There is now a single `.dash-canvas` at
  `repeat(6, minmax(0, 1fr))`, and each `.dash-widget` carries a `dw-span-{2,3,4,6}`
  class. Six columns expresses thirds/halves/two-thirds in whole numbers; 4+2 IS the
  old 60/40. `.mid-grid`/`.mini-row` survive **only for the loading skeleton**, which
  is not a widget.
- **Spans are CLASSES, not an inline `grid-column`** — deliberately. The responsive
  rules (`≤1200px` thirds→halves, `≤900px` everything full width) override the saved
  preference by out-specifying `.dw-span-*` on element count; against an inline style
  they would each need `!important`.
- **Card markup lives in `ng-template`s** (`#tplMetrics`, `#tplReach`, …) at the ROOT
  of the template, rendered through `@switch` + `ngTemplateOutlet` in the canvas loop.
  They are outside the `*ngIf="stats"` so the loop can reach them by name, but only
  ever instantiated inside it, so bindings still run with data loaded. **No card sets
  its own width or outer margin** — that is the canvas's job.
- **The model is `models/DashboardLayout.ts`.** `DASHBOARD_WIDGETS` array order IS the
  default order. `reconcileDashboardLayout()` is the whole compatibility story and is
  why shipping a new card needs no migration: unknown ids dropped, missing ids spliced
  in at their **catalog index** (not appended), spans clamped to `minSpan`, anything
  structurally wrong falls back to defaults instead of throwing.
- **`showSecondaryPanels` is gone.** Funnel / Top links / Deliverability / Send
  windows are now `defaultHidden: true` widgets a user can switch on — no longer a
  constant only a developer can flip. Their numbers are still computed while hidden:
  the insight strip's "best send window" line reads the heatmap.
- **Persistence is server-first with a localStorage cache** — `DashboardLayoutService`
  over `UserPreferenceService` (`users/preferences/dashboard.layout.v1`). `readCache()`
  is **synchronous and called in `ngOnInit`** because the page must paint in the user's
  arrangement on the first frame; rendering defaults and reshuffling after a round trip
  reads as a bug every load. The server copy follows and wins. Writes cache immediately
  and debounce the PUT 800ms (customising is a burst of small edits); `flush()` runs on
  leaving customise mode and in `ngOnDestroy`. Every failure path degrades to a working
  dashboard — a card arrangement is never worth an error banner. Cache key includes the
  user id so two people on one browser don't inherit each other's layout.
- **The page itself has NO drag and no customise mode.** Arranging happens entirely in
  `components/dashboard-layout-drawer` (see the drawer section above); `brand-dashboard`
  only renders `renderedWidgets` and opens the drawer. An earlier revision dragged the
  panels in place, which required a page-wide mode that switched off every sortable
  header, campaign checkbox and clickable row inside them, plus per-card tool bars that
  moved the layout while you were judging it. Dragging different-sized cards around a
  reflowing grid is also the awkward case — the drop target you want is usually under
  the card you are holding. **Don't reintroduce it.** A list of uniform rows reorders in
  one dimension, reaches the hidden cards too, and leaves the dashboard usable
  throughout.
- **The drawer edits a DRAFT** (`cloneDashboardLayout`) and resolves with it on Save;
  dismiss means cancel. That is what makes "Reset to default" safe to offer inline — it
  is an edit to the draft, undone by cancelling, not an immediate destructive write.
  The opener must pass a **rejection handler** to `ref.result`: a dismissal is the
  normal Cancel path and otherwise logs an unhandled promise rejection.
- **Keyboard reorder is hand-rolled** (arrow keys on the `.wl-grip` button) because the
  CDK has no keyboard drag; changes are announced through an `aria-live` `.sr-only`
  line, since neither a mouse drag nor a keyboard move emits anything on its own. The
  visible position number on each row exists for the same reason.

## Page background

App page background is unified to **`#f4f6fb`**: it's the `brand-layout`
`@Input() mainBgColor` default, and the old `#e7f6fe` page-shell / `.content-area`
backgrounds (and explicit `mainBgColor="#e7f6fe"` overrides) were replaced with it.
NOT changed: component `bgColor="…"` inputs (table-card header props etc.), the
public-facing `public-landing-page`, and small inner accents (the CSV drag-drop zone).

---

## Auth pages (login / onboarding wizard)

All unauthenticated pages render inside `<login-layout>`
(`src/app/layouts/login-layout`): a full-height split view with an animated blue
**brand panel** on the left (KEXY logo, aurora gradient, floating blobs) and the
page content (`<ng-content>`) on the right. Pages using it: `login`,
`forgot-password`, `reset-password`, `email-confirmation` (0% "Create an
Account"), `register` (50%), `brand-create` (75%), `brand-welcome`, `brand-subscription-selection`, and
`brand-list` (post-login business selector).

### Shared form styling lives in ONE partial

`src/app/pages/_auth-form.scss` is the single source of truth for the modern auth
form look — white **card** (`.login-container`, ~550px, rounded, soft shadow, a
gradient top-accent via `::before`), centered `h4` + `.auth-subtitle`, **soft-
filled rounded fields** (`#f7f9fc`, 1.5px border, 12px radius, 54px tall) with a
leading icon (`.input-icon-wrap` › `.input-lead-icon`) and a blue focus ring,
custom-caret `<select>`, a gradient **primary button** (`button.kx-create-btn` /
`button#submit`), password reveal (`.pw-toggle`), checkboxes (`.checkbox-wrapper`),
signup **progress bar**, phone field (`.phonefields` › `.phonecode` + `input.phoneNumber`),
and `.auth-footer-text` link row. Each page's component SCSS is just
`@use "../auth-form";` (+ tiny page-specific extras). **The `login` page keeps its
OWN copy** of these styles in `login.component.scss` — it does NOT use the partial,
so a visual change wanted everywhere must be made in BOTH the partial and
`login.component.scss`.

- Selectors replicate the full `.login-container .login-wrapper .login-left …`
  chain on purpose, to out-specify the global `.login-*` rules in `styles.scss`
  without `!important`.
- **`has-progress` modifier:** wizard cards (`email-confirmation`, `register`,
  `brand-create`) add `class="login-container has-progress"`, which hides the card's
  gradient top-accent (`::before`) so it doesn't stack a second blue bar above the
  blue progress bar.
- **Checkbox gotcha:** Bootstrap's `.form-check-input` negative `margin-left` +
  `.form-check`/`.ms-*` padding pull the box outside the card; `.checkbox-wrapper`
  neutralises them (`float: none`, `margin: 1px 0 0 0 !important`, `gap: 10px`).
- `register` and `brand-create` NO LONGER have the profile-photo / company-logo
  upload (removed from markup; the `openFileDialog`/`fileSelected`/`imageUrl`
  members remain unused in the TS).
- **`brand-welcome`** is the final wizard step (100%). It has no form, so instead
  of fields it shows a clickable **`.video-poster`** hero (brand-gradient 16:9 panel
  with a white `.play-badge` play button + `.poster-label`, keyboard-accessible via
  `role="button"`/`tabindex`/`keyup.enter`) wired to `openVideoDialog()`, plus a
  muted `.skip-link` calling `autoLogin()`. Still uses the card + `has-progress` +
  `@use "../auth-form"`.
- **`brand-list`** (post-login "Select a business") was moved OFF its old bespoke
  `#page-container` + image-background sidebar ONTO `<login-layout>` for visual
  consistency. It does NOT use `.login-container`/the partial — it has its own wider
  `.business-card` (max 620px, same rounded/shadow/top-accent look) holding a
  `.business-list` of selectable `.business-item` rows (logo/initial avatar, name,
  job title, hover-sliding chevron; keyboard-accessible), plus a `.business-empty`
  state. `selectCompany()` unchanged.

### Layout scroll + centering (don't reintroduce the clip)

`login-layout.component.scss` centers short cards but must scroll tall ones
(register/brand-create) with the top reachable. The working recipe:

- `#page-container` → `height: 100vh; overflow: hidden` (fixed viewport; scrolling
  happens inside).
- `#content-wrapper` (a flex **column**) → `overflow-y: auto`, `min-height: 0`, and
  `justify-content: flex-start !important` — this OVERRIDES the inline
  `[style.justify-content]` binding; `justify-content: center` there clips the top
  of tall cards and blocks scrolling to it.
- `#main-content` (`.main-warp` + `.kx-custom-box-login-signup`) → `min-height: 100%`
  (short card fills → centers via its own flex) **and** `flex-shrink: 0` (without it,
  the column shrinks the box back to 100vh and the tall card overflows *inside* it,
  clipped and unscrollable).

### Compact brand panel (per-page)

`@Input() compactBrandPanel` on `LoginLayoutComponent` toggles
`.brand-panel--compact`, which ~halves the left panel (`flex 0 0 19%`,
`max-width: 240px`, scaled-down logo/glow/blobs) so wide content gets more room.
Currently set only on `brand-subscription-selection` (`[compactBrandPanel]="true"`)
for the pricing grid. The normal panel is `flex 0 0 38%` / `max-width: 480px`.

---

## Authenticated sidebar (`brand-layout`)

`src/app/layouts/brand-layout` is the shell for logged-in brand pages: a gradient
`#main-sidebar` (built from `nav-item` + `nav-item-dropdown` components, with
`app-org-info` at the top) beside `#content-wrapper`.

### Post-login landing = the Dashboard

Two places decide where an authenticated brand user lands, and BOTH point at
`BRAND.DASHBOARD` (they used to point at Create Campaign):
- **`AuthService.loggedUserRedirectToProperDashboard()`** — the shared "already logged
  in, send them into the app" helper, called from every unauthenticated page (login,
  register, forgot/reset password, the signup wizard). This is the one that matters;
  change it here and all of those follow.
- **`brand-list.selectCompany()`** — the business-selector landing. It honours a stored
  `returnUrl` FIRST (a deep-link that bounced through login) and only falls back to the
  dashboard, so don't "simplify" that branch away.

Other `CREATE_DRIP_CAMPAIGN` navigations in the codebase all pass `queryParams` — those
are edit-an-existing-campaign links, not landings.

### Page title in the header

The header shows the page name as an `<h1 class="page-title">` immediately after the
sidebar toggle (and the back button, when shown). It comes from **`data.title` on the
route** in `app.routes.ts`, resolved by `brand-layout`'s `__resolveRouteTitle()` and
exposed as `pageTitle`.

- **Route data, not 24 `@Input()`s.** `headline` already existed but only ONE of 25
  pages ever set it, so the header was blank almost everywhere. Putting the title on
  the route keeps it next to the thing it names, and a new page gets one by declaring
  it there — nothing to wire in the page's own template.
- **`[headline]` still wins** where the title must be DYNAMIC (`brand-list-contacts`
  passes the list's name). `pageTitle` is `headline || routeTitle`.
- Resolved **once in the constructor**, and it walks to the deepest activated child
  before reading `data` (a title on a child route would be missed otherwise). No
  router subscription: this layout is re-created on every navigation — the same fact
  that forces `.sidebar`'s width transition to be gated after first paint — so there
  is no stale-title case.
- It's an `<h1>` because the pages don't render one; before this the document had no
  h1 at all. Long titles ellipsise rather than pushing the account menu off-screen.
- **Being an `<h1>` means fighting the global heading reset** in `styles.scss`, which
  sets `padding-bottom: 10px; line-height: 1em; font-size: 30px; color: #333` on every
  `h1`-`h6`. The `padding-bottom` is what knocked the title off centre beside the
  toggle: it made the box 10px taller at the BOTTOM, so the header row's
  `align-items: center` centred that box and left the text sitting visibly high. So
  `.page-title` needs `padding: 0` as well as `margin: 0`, plus `line-height: 36px` to
  match the toggle's box — don't drop either thinking the other covers it.

**Breadcrumbs** — a page that is a CHILD of another passes
`[breadcrumbs]="[{label, link?}, …]"` instead of a title, and the header renders the
trail. The last entry is the current page and becomes the `<h1>`; earlier entries with a
`link` are router links. Two pages use it:

- `brand-list-contacts` — `Manage Lists › <list name>`, where a bare "Contacts" gave no
  clue where you'd come from.
- `brand-drip-campaign` — `Manage Campaigns › <campaign name>`. This page is BOTH the
  create and the edit surface for a campaign (`list-of-drip-campaign-table` and
  `prospecting-contacts` route here with an `id`), so its old static "Create Campaign"
  title was wrong half the time and could never say WHICH campaign was open. Leaf is
  `New Campaign` when there's no `id` **or** when duplicating — a duplicate starts a new
  campaign, so the source's name would label a campaign the page isn't editing.

Neither page sets `[showBackButton]` — the parent crumb IS the way back, and showing
both would be the same action twice. `brand-price` is now the only page using the back
button. The trail is passed WHOLE rather than per-crumb because the page owns the data
(it knows the record's name; the layout doesn't), and it's a FIELD rebuilt by
`__setBreadcrumbs()` — a getter would allocate a new array every CD pass and re-render
the `*ngFor`.

**Whether a leaf crumb exists while the name loads differs between the two, on purpose.**
`brand-list-contacts` omits it (a blank crumb is worse than briefly showing just the
parent). `brand-drip-campaign` always renders one, falling back to `Campaign Builder`,
because with a single crumb the layout would make "Manage Campaigns" the `<h1>` — which
reads as being on the list page rather than inside a campaign. Both routes keep a
`data.title` as the no-breadcrumb fallback.

**Full-height divider.** A 1px `.header-divider` sits between the toggle and the page
identity. `align-self: stretch` alone only reaches the 36px control row (that row IS the
flex container), so an equal **negative vertical margin** takes it out through the
header's own padding to meet the top edge and the bottom border. That padding is the
`$kx-header-pad-y` variable, used by `.main-warp` at both breakpoints AND by the
divider's cancelling margin — retune it in one place or the rule stops reaching the
edges. Its horizontal margins are asymmetric (6px left / 14px right) to absorb the
toggle's existing 8px `margin-right`, so the gaps either side look equal.

Those margins are written as **longhand, not the four-value shorthand**, and that is not
style preference: in a space-separated Sass list `14px -$kx-header-pad-y` parses as
SUBTRACTION (`14px - 15px = -1px`), so `margin: -$pad 14px -$pad 6px` silently compiled
to `margin: -15px -1px 6px` — three values, no negative bottom margin, and the rule
stopped short of the header's bottom edge with no build error. Any negative-`$variable`
margin/padding shorthand in this repo is exposed to the same trap.

**Alignment gotcha (bitten twice).** Everything on that header row shares a **36px line
box** to match the toggle, and each piece needed a framework default stripped to get
there: the `<h1>` needed `padding: 0` (global heading reset), and `app-back-button`
needed Bootstrap's **`mb-2` removed** plus `.btn`'s padding zeroed. In both cases the
extra bottom spacing made the element's box taller at the BOTTOM, so the row's
`align-items: center` centred the box and left the visible text sitting high. If
something in this row looks a few px off, check for inherited margin/padding before
touching the flex properties. `app-back-button` is used ONLY here, so changing it is safe.

### The toggle lives in the header (not a floating arrow)

`.hideSidebarArrow` is now an in-flow icon button at the **far left of `#main-header`**
(the white top bar), before the back-button/headline — the modern app placement, not
a floating arrow over the sidebar. It renders an inline **SVG panel-left glyph**
(rounded square + offset vertical divider; FA 4.7 has no equivalent icon) that stays
static — it does NOT flip direction. Dark slate on white (`#475569`, hover `#0f172a`
on a `#f1f5f9` wash). Its click still calls `toggleSidebar()` → flips
`sidebarCollapsed` (persisted in `localStorage['kxSidebarCollapsed']`), NOT full-hide.
(The header's left col is `align-items: center` so the icon, back-button, and headline
line up.)

**Width-transition gate (avoid the navigation flash).** `brand-layout` is re-created
on every navigation, so the `.sidebar` `transition: width` used to replay on each page
load (rail flashed open then snapped collapsed). The transition now lives on
`.sidebar.animate-width`, and `[class.animate-width]="sidebarAnimate"` is only enabled
in `ngAfterViewInit` (`setTimeout`) — so the rail renders at its final width instantly
on mount, and only user toggles animate. Same "gate the transition after first paint"
trick the nav dropdowns use.

### Nav highlighting — `nav-item` computes `active` itself

`nav-item` does **NOT** use `routerLinkActive`. It sets `[class.active]` from an
`active` signal recomputed on `NavigationEnd`, using `router.isActive(url,
NAV_ACTIVE_MATCH)` where `NAV_ACTIVE_MATCH` spells out exactly what the directive's
default `{ exact: false }` applies (`paths: 'subset'`, `queryParams: 'subset'`, matrix
and fragment ignored). Keep that constant in step with the directive's default if you
touch it — every sidebar item's highlighting rides on it.

The reason is **`@Input() alsoActiveFor: string[]`**: extra routes that should light an
item up. Detail pages here live at SIBLING paths, not under their section, so subset
matching can never reach them:

| Item | `navigateTo` | `alsoActiveFor` |
|---|---|---|
| Manage Lists | `…/contacts/manage-list` | `…/contacts/list-contacts` |
| Manage Campaigns | `…/drip-campaign/list` | `…/drip-campaign/edit` |

Without it, opening a list's contacts or editing a campaign left the sidebar with
nothing lit. The section that OWNS the record stays lit while you are inside one of its
records, which is also what the header's breadcrumb trail says.

**Do not combine `[class.active]` with `routerLinkActive`** — both own the same class
and would fight over it. Campaign EDIT is listed, not CREATE: a new or duplicated
campaign sits on `…/create`, where "Create Campaign" is the item that should be lit.

### Nav = static section groups (NOT accordions)

`nav-item-dropdown` is a **static section**, not a collapsible accordion: a small
uppercase `.nav-section-label` header (translucent-white) with its `nav-item`s always
visible and uniformly aligned beneath it (`ng-content`). No chevron, no toggle, no
flyout, no open/close animation. The component keeps `label`/`icon`/`expand`/
`collapsed` `@Input()`s only for **binding compatibility** — `expand` (still set from
the URL by `showHideDropdowns()` in the layout) and `icon` are now inert; the section
header shows no icon. All items align identically: `nav-item`'s `.nav-dropdown`
variant no longer indents/dims sub-items (the section header conveys grouping). Row
spacing is deliberately tight — item `padding: 8px 14px` + `margin: 1px 12px`, and
`.nav-section-items` has **no flex `gap`** (item margins alone space them; adding a gap
double-stacked the spacing).

### Desktop collapsed = icon rail (`--kx-sidebar-collapsed-w` = 76px)

A single `<ul id="main-sidebar">` always renders (all sizes) and gets
`[class.collapsed]`. Collapsed:

- Item labels (`.nav-label`) hidden; each item is a fixed **44×44 square centred with
  `margin: 1px auto`** (tight vertical gap), active = a centred pill fill (no left
  accent bar).
- **Every item** (including those inside section groups) shows a CSS hover **tooltip**
  from `[attr.data-label]` (also `title`) — a plain dark bubble, **no caret arrow**
  (it looked off), offset far enough (`left: calc(100% + 26px)`) to clear the blue rail
  edge instead of hugging it. There are no flyouts anymore — the whole nav is a flat
  scroll of icons.
- **Section headers collapse to a short centred divider** (`.nav-section-label` →
  `height: 0; font-size: 0; border-top` + `width: 28px`) between icon groups.
- `app-org-info` becomes a compact header: small logo + tiny truncated org name.
- The rail sets `overflow: visible` + `z-index: 20` so tooltips paint above
  `#content-wrapper` (`z-index: 0`). Cross-component bits (org-info, nav items) are
  styled via `::ng-deep #main-sidebar.collapsed …`.

### `app-org-info` (brand header)

A **compact horizontal row**: a small (40px) rounded white **logo chip on the left**
+ the **company name only** beside it (`orgName`, left-aligned, single line,
ellipsis; the person name `.c-name` was removed). `.sidebar-top` is
`position: sticky; top: 0` with an opaque `#1a5be0` background (the sidebar's top
gradient stop) so the brand header **stays pinned while the nav list scrolls** on
short viewports — mirroring the sticky `.sidebar-footer`. For sticky to engage, the
host is neutralised with `app-org-info { display: contents }` (set in the layout
SCSS) so `.sidebar-top` becomes a direct flex child of the scrolling sidebar. In the
**collapsed rail** the row stacks back to a centred logo (46px) over a tiny truncated
name (`flex-direction: column`, via the `::ng-deep #main-sidebar.collapsed` override).

### Footer

`.sidebar-footer` is `position: sticky; bottom: 0` (opaque `#0b389f`, the bottom
gradient stop) — pinned like the header. It's a single **"Help & support"** button
(`.kx-support-nav`, `fa-headphones` → `support()`); collapsed shows just the icon with
a "Help & support" tooltip (`data-label`).

### Icons

Section headers are text-only now (no icon), so the icons that matter are the
**leaf `nav-item` icons**, chosen to be distinct + name-matching (the old set had
several list-lookalikes):

- Dashboard `fa-th-large` — the first item, ungrouped (above every section header)

- Company Desc. `fa-building-o` · Product/Service Desc. `fa-cube`
- Manage Lists `fa-table` (an Excel-like table of contacts) · Manage Contacts
  `fa-address-book-o` · Find Leads `fa-search` · Lead Magnets `fa-magnet`
- Create Campaign `fa-bullhorn` (same "megaphone" as the manage-list "used in N
  campaigns" chip) · Manage Campaigns `fa-tasks`
- Messages → Inbox `fa-inbox`, Sent `fa-paper-plane-o`
- Settings → Invite `fa-briefcase`, Slack `fa-slack`, SMTP `fa-envelope-o`,
  Suppression List `fa-user-times` (`fa-ban` is taken by Negative Prompts) ·
  Tutorials `fa-leanpub`

### Small screens (`< 992px`)

There is now ONE sidebar for all sizes (the old duplicate `.navbar-nav-mobile-layout`
drawer + `#menu-toggle` hamburger were removed). Small screens **default to the
collapsed icon rail** (`ngOnInit`/`onWindowResize` force `sidebarCollapsed = true`
below `mobileScreenSize` = 992). The rail stays **in-flow** (beside the content);
tapping the header toggle **expands it as a fixed overlay**
(`#main-sidebar:not(.collapsed)`) with a `.sidebar-backdrop` (shown via
`*ngIf="isMobileScreen && !sidebarCollapsed"`, click closes). `railCollapsed` just
returns `sidebarCollapsed`. `showSidebar` was removed.

---

## Invite-people page (`brand-invite-people`)

The team/users management page (users table + invite form + two NgbModals),
redesigned into a modern card layout. All styling is self-contained in the
component SCSS with a small token block at the top (`$kx-primary` `#12a5f4` →
`$kx-primary-deep` `#095dd1`, matching the app's brand blue); no shared partial.

- **Layout:** a centered `.invite-people-page` (max 1080px) holding a
  `.page-header` (title + subtitle + a live **seat-usage** indicator: `X / Y seats`
  with a gradient `.seat-bar-fill` whose width = `cleanUserList.length /
  subscription.total_seats`, gated on `*ngIf="subscription"`) and stacked
  `.surface-card`s (rounded, soft-shadowed) — one for the users table, one for the
  invite form (`*ngIf="isAdmin"`).
- **Users table** keeps the `datatable` directive + `*ngFor` (unchanged behavior —
  no `dtOptions`/`dtTrigger`). Restyled: gradient **initial avatars** (`.user-avatar`,
  first char of email via `(...).charAt(0) | uppercase`), `.role-badge`
  (`.role-admin` highlighted), `.status-badge` (green `status-accepted`, amber
  `status-sent`), `.link-action` (Resend), and round `.icon-btn` (`.edit`/`.danger`)
  for the pencil/trash. Column count is 3 → state rows use `colspan="3"`.
- **Invite form:** unchanged `formArray` (`peoplesList`) bindings/validation;
  restyled as `.invite-row` flex rows with soft-filled `.input-wrap` fields (leading
  `.input-icon`, blue focus ring, `.error` class on invalid), custom-caret
  `.select-wrap`, and labels shown only on the first row (`*ngIf="i === 0"`). The
  submit still uses `<app-kexy-button>`.
- **Modals** (`employeeRoleChangeModal`, `userDeleteModal`) are rendered via
  `NgbModal`, which relocates the `ng-template` content to the body — but Angular's
  emulated-encapsulation attributes persist, so the component SCSS (`.kx-modal` +
  `.btn-primary`/`.btn-danger`/`.btn-ghost`) **does** style them. New `.kx-modal-head`/
  `-body`/`-footer` structure replaced the old inline-styled buttons + `close.png`
  image. Modal logic (role change, transfer-then-delete) is unchanged.

---

## SMTP accounts page (`brand-email-account-settings`)

Manages the company's sending accounts (list + add/edit/delete). A company can
have **multiple** SMTP accounts. All SMTP calls live in `drip-campaign.service.ts`
(`smtp*` methods) and go under `res.data` (global response wrapper).

- **List:** `getSmtpList({ companyId, page, limit })` → `GET /smtp?...` returns
  `{ smtps, total, smtpOAuth }` (passwords blanked). `normalizeSmtpList` tolerates
  the array shape, `smtpList`, and the legacy single-object `{ smtp, smtpPort }`.
- **Add vs. edit share ONE modal + form** (`addSmtpForm`), switched by
  `editingSmtpId` (null = add). `openEditSmtpModal(content, smtp)` prefills every
  field and **clears the `smtpPassword` validator** — the list API never returns
  the password, so on edit it's optional (blank = keep the stored credentials).
  Template copy (title, submit label `Test & Update`/`Test & Save`, password
  placeholder + required `*`) all key off `editingSmtpId`. The password field
  has an **eye toggle** (`showSmtpPassword`, reset to `false` on every open) that
  flips `type` between `password`/`text` (`.pw-toggle` button).
- **Free/consumer email providers are blocked, shown INLINE (not a popup).** The
  domain after `@` of the **From email** / **username** is matched against a
  `FREE_EMAIL_DOMAINS` set (gmail/googlemail, yahoo + regional, proton/pm.me,
  outlook/hotmail/live/msn, icloud/me/mac, aol, gmx, mail.com, yandex, zohomail,
  a few others). `freeEmailDomainDetected()` (first offending domain from From
  email / username) drives a reactive full-width amber **`.smtp-block-bar`**
  notification strip pinned ABOVE the modal footer (per keystroke, only once a
  full free domain is typed); `hasFreeEmailAccount()` disables the Test &
  Save/Update button while either field is a free provider. `handleSubmit` still calls
  `blockedFreeEmailDomain(formValue)` and returns early as a **safety net** (paste
  + Enter) — but there is NO `Swal` popup; the inline message + disabled button
  are the UX. Intentionally checks the EMAIL DOMAIN, not the SMTP host — so
  `you@yourcompany.com` on Google Workspace / Microsoft 365 (host
  `smtp.gmail.com`/`smtp.office365.com`) is still allowed; only consumer addresses
  like `someone@gmail.com` are rejected. Extend the set to block more. (Template
  gotcha: literal `@` in the message text must be `&#64;` — Angular parses a bare
  `@` as a control-flow block.)
  - **Create:** `testSmtpConnection(postData)` → `POST /smtp` (tests then saves).
    Sends `companyId` + all fields; `smtpPort` coerced to a number.
  - **Edit:** `updateSmtp(id, patchData)` → `PATCH /smtp/:id`. Send **only the
    provided fields**; omit `smtpPassword` when blank so the backend keeps the
    stored token. `companyId` is ignored server-side (an SMTP can't be reparented).
    The backend re-verifies by sending a test email and only persists when a
    `messageId` comes back — a bad update returns 400 and leaves the row unchanged.

### Delete is gated on drip-campaign usage

`deleteSmtp(item)` first calls `getSmtpConnectedDripCampaigns(id)` →
`GET /smtp/:id/drip-campaigns` (`{ connected, dripCampaigns[] }`, each drip = same
shape as `GET /drip-campaigns/:id`). Two paths:

- **Not connected** → the original Swal confirm + `deleteSmtp` service call
  (`confirmAndDeleteSmtp`).
- **Connected** → opens the `#connectedDripsModal` (a `@ViewChild` template) listing
  each campaign (name from `details.title.title`, status badge). Each row's "Remove
  from campaign" (`removeSmtpFromDrip`) detaches the SMTP by PATCHing that drip's
  `smtp_account` setting to `{ smtpId: null }` via `updateSettings` (reusing the
  exact settings payload shape from `email-time-settings-content`, preserving the
  setting `id`), then drops the row. The red **Delete SMTP Account** button
  (`deleteSmtpAfterDetach`) is **disabled until `connectedDrips` is empty** — so the
  SMTP can only be deleted once removed from every campaign. Detaching leaves those
  campaigns with no send-from account (`smtpId: null`); reassignment is not offered.

The per-drip SMTP selection itself is set on the drip settings screen
(`email-time-settings-content`) as the `smtp_account` setting
(`settingsValue: [{ smtpId }]`, single-select).

## Conventions

- **Standalone components** (no NgModules), Angular signals, `@if`/`@for` control
  flow. Components live under `src/app/components`, routed pages under
  `src/app/pages`, services under `src/app/services`, models under
  `src/app/models`.
- **Environments**: `src/environments/environment.ts`. `baseUrl` →
  `https://apiv3.getkexy.com/v2/`; uploaded images/posters are hosted on the CDN
  `imageUrl` → `https://cdn2.getkexy.com/` (S3 behind CloudFront; **CORS is not
  enabled** there — relevant when reading CDN images into a `<canvas>`).
- **Global styles** (`src/styles.scss`) include an aggressive reset that sets
  `font-family: "Lato" !important` on a broad element list and
  `a { text-decoration: none !important }`. These **leak into child components** —
  watch for global `!important` rules overriding component styles.
- **Build / validate**: `npm run build` (or `npx ng build --configuration
  development`) before committing. `npm start` serves on `0.0.0.0`.

---

## Commits

Work happens on feature branches (e.g. `kexy-custom-rich-editor`), not directly on
`main`. Only commit/push when asked.
