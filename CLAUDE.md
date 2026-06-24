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

---

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
