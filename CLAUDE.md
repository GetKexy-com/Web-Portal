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
if all three are `0`. On submit it updates local state and, when the email has an
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
  reordered to sit next to Marketing Status**.
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
the contacts' single-flex-column model made one column absurdly wide. Instead it
uses **`table-layout: fixed; width: 100%; min-width: 700px`** with **percentage
column widths** (checkbox a fixed `58px`, the rest `%` summing to 100) so the columns
**proportionally fill** the width; `min-width` lets it scroll on narrow screens.
`columnList` widths are **unit strings** here (`'58px'`, `'26%'`, …) bound straight
to `[style.width]`, and `calcWidth` only computes `browserWidthForTable` (the table
is `width:100%`, not a px sum). Non-checkbox cells get `overflow:hidden;
text-overflow:ellipsis`. NOTE: the checkbox column is `58px` on Lists but `87px` on
Contacts — intentional per the user's edits, not yet unified.

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
`.table-state` empty/loading, the **flex fill-width model** (Title column
`flex:true` → `width:100%`, checkbox `min-width:58px`, no `+300` buffer; removed
the empty trailing `edit` column), and the **cross-page select-all banner** under
the header. The full contacts-style pager (First/Prev/Next/Last + "Go to [#]",
in BOTH header and footer) uses new table `@Input()`s
`paginationFirstClick`/`paginationLastClick`/`navigateSpecificPage`, wired to page
handlers of the same name. (This is the change committed as "Fix".)

### Header count + selected indicators are currently HIDDEN

The `.count-chip` (total) and `.selection-info` ("X of N selected") in the card
headers are **commented out for now** in `contact-list-card`,
`list-of-drip-campaign-table`, and `lead-magnets` (per user request — felt like too
much). The markup is left in place (commented) to restore easily. Keep the hidden
`getSelectedItemCount()` refresher span — the cross-page **select-all banner** still
depends on `selectedItemCount`.

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
`app-org-info` at the top) beside `#content-wrapper`. The top-left arrow
(`.hideSidebarArrow`) toggles it.

### Desktop = collapsible icon rail (not hide)

The arrow toggles `sidebarCollapsed` (persisted in `localStorage['kxSidebarCollapsed']`),
NOT full-hide. A single `<ul id="main-sidebar">` always renders (all screen sizes) and
gets `[class.collapsed]`. Collapsed = a **76px icon rail** (`--kx-sidebar-collapsed-w`):

- Labels/chevrons hidden; each item is a fixed **48×48 square centred with
  `margin: auto`** (so active/inactive icons sit identically dead-centre — active is
  a centred pill fill, NOT the expanded-mode `inset 3px 0 0` left accent bar).
- `app-org-info` becomes a compact header: small logo + tiny truncated org name
  (person name hidden).
- **Leaf items** show a CSS hover **tooltip** from `[attr.data-label]` (also `title`),
  with a `::before` caret whose base is flush to the tooltip and tip points at the icon.
- **Dropdown sections** open a **flyout submenu to the right** — on hover, or
  click-pinned via `flyoutOpen` (closed on outside `document:click`). The submenu
  (`.sub-nav-item-wrap.flyout`) has a `.flyout-title` header + full-label child rows,
  a `::before` caret protruding from the panel edge pointing at the icon (same idea as
  the tooltip — keep the caret OUTSIDE the panel, not inset), and an invisible
  `::after` hover-bridge across the gap. The section's own tooltip is suppressed.
- Sub-item label text uses `--kx-nav-sub-fg` (near-white, `rgba(255,255,255,0.9)`) in
  both the expanded accordion and the flyout (they share `nav-item` styling).
- The rail sets `overflow: visible` + `z-index: 20` (and the arrow `z-index: 30`) so
  tooltips/flyouts paint above `#content-wrapper` (`z-index: 0`) and the arrow stays
  on top. Cross-component bits (org-info, nav items) are styled via `::ng-deep
  #main-sidebar.collapsed …`.
- `nav-item-dropdown` takes `[collapsed]="railCollapsed"` (a getter returning
  `sidebarCollapsed`); when collapsed its click toggles the flyout. The submenu is
  ALWAYS in the DOM (no `@if`) so both the flyout and the expanded-mode animation
  can run. In collapsed, the active section's parent icon gets the same pill via
  `.section-active` (bound to the dropdown's `expand` flag, which the layout already
  sets from the URL) so you can tell which section you're in.

### Expanded accordion (both modes)

The submenu (`.sub-nav-item-wrap`) animates open/closed with the CSS
`grid-template-rows: 0fr → 1fr` trick + opacity fade (inner `.sub-nav-inner` has
`overflow: hidden; min-height: 0`); the `.open` class (= `isOpen()`) toggles it. The
chevron is a single `.chevron` icon that rotates 180° via `.rotated`. The collapsed
flyout cancels this grid (`display: block; grid-template-rows: none`) since it's a
static panel, and the animation is gated with `.open:not(.flyout)` so an active
section's `isOpen` can't reveal the flyout without hover/click.

### Icons

Section icons: Messages = `fa-envelope-o`(open), Drip Campaign = `fa-bullhorn`
(the paper-plane is reserved for the Messages → Sent sub-item).

### Small screens (`< 992px`)

There is now ONE sidebar for all sizes (the old duplicate `.navbar-nav-mobile-layout`
drawer + `#menu-toggle` hamburger were removed). Small screens **default to the
collapsed icon rail** (`ngOnInit`/`onWindowResize` force `sidebarCollapsed = true`
below `mobileScreenSize` = 992). The rail stays **in-flow** (beside the content);
tapping the arrow **expands it as a fixed overlay** (`#main-sidebar:not(.collapsed)`)
with a `.sidebar-backdrop` (shown via `*ngIf="isMobileScreen && !sidebarCollapsed"`,
click closes). `railCollapsed` just returns `sidebarCollapsed` now, so flyouts work at
every size. `showSidebar` was removed.

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
  placeholder + required `*`) all key off `editingSmtpId`.
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
