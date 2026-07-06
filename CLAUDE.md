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
`.list-verification-progress` banner (spinner + live %) while a list's
`validationStatus` is `pending`/`inprogress`/`in_queue` (`isValidationProgress()`).

- **Verify all vs. selected:** `validateList()` POSTs `lists/validate` with
  **exactly one** of `{ listId }` or `{ contactIds: number[] }` (the API rejects
  sending both — `400 "Provide exactly one of listId or contactIds"`). If the
  user has **checked** any contacts (`contact.isSelected`), it sends only their
  `Contact.id`s as `contactIds` so ONLY those are verified; with none checked it
  sends only `listId` to verify the whole list. The button label reflects this —
  `Verify Selected (N)` when N contacts are checked, else `Verify Email(s)`
  (`getSelectedItemCount()` drives both).
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

## CSV contact import results

After a CSV import, the contact pages show which rows were skipped. The
`POST contacts` response (`prospectingService.addContacts`, which resolves the
`data` object) is `{ importedCount, imported[], skippedCount, skipped[] }`, where
each `skipped` item is `{ contact, email, errors[] }` and `contact` is the INDEX
into the submitted `contacts` array.

- `ImportResultsModalContentComponent` (`components/import-results-modal-content`)
  is a reusable standalone modal: a summary (imported / skipped pills) + a table
  of skipped rows (Name, Email, Company, Job Title, Location, Errors).
- Both `brand-list-contacts` and `brand-contacts` capture the response in
  `getImportedFileData` and call `showImportResults(res, contacts)`, which maps
  each skipped item back to its full row and opens the modal (only when
  `skipped.length > 0`). Opened with `size: 'xl'`, `backdrop: 'static'`,
  `keyboard: false` — closes ONLY via Done / X.
- **Mapping gotcha:** the submitted `contacts` are flat `Contact.contactPostDto`
  objects (top-level `firstName`/`lastName`/`title`/`email`/`city`/`state`/
  `country`, company under `organization.name`) — NOT nested under `.details`.
  Map `skipped[i].contact` by index, falling back to an email match, then read
  those flat fields. `email`/`errors` come from the skipped entry (authoritative).

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
- **Sticky header + vertical scroll** (currently only on
  `list-of-drip-campaign-table`): `.new-table-wrapper` gets a `max-height` +
  `overflow: auto`; the header CELLS (`tr.n-header td`, NOT the `<tr>` — sticky
  doesn't work on table rows) get `position: sticky; top: 0` + an opaque
  background so body rows don't show through. To roll this out to the other cards,
  apply the same two rules.

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
