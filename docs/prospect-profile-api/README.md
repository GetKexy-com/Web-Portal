# Prospect profile — API contract

The prospect profile page (opened from **View Profile/Score** in a drip email's
Insights drawer → Prospects) reads two endpoints. Until they exist, the portal
serves the `*.example.json` payloads in this folder as mock data.

| Endpoint | Schema | Example | Feeds |
|---|---|---|---|
| `GET /v2/drip-campaigns/:campaignId/prospects/score?email=<email>` | `prospect-score.schema.json` | `prospect-score.example.json` | Lead strength card: score, ring, bars |
| `GET /v2/drip-campaigns/:campaignId/prospects/insights?email=<email>` | `prospect-insights.schema.json` | `prospect-insights.example.json` | Why we chose this lead, How we picked the opening topic, What happened so far, signal safety checks |

Who the prospect is — name, company, job title, location, LinkedIn, phone and email
validation — is **not** part of either API, and neither is whether they replied to,
opened or clicked the email. The portal already has both: the send-progress list returns
the prospect's stored details and their per-email reply/open/click times. The "Replied"
pill and the reply box in Lead strength come from there, so the score API must not try
to say it.

## Rules

- The schemas describe `data` only. Keep the usual `ResponseSuccessInterceptor`
  envelope: `{ success, statusCode, path, data, timestamp }`.
- `email` is URL-encoded in the query string. The prospect is identified by
  campaign + email (the drawer row has no contact id). Return **404** when the
  prospect is not enrolled in that campaign.
- Scope to the caller's company, like every other drip-campaign route.
- Every key in the schema is **required**. Send `null` (or `[]`) for unknown
  values instead of leaving the key out. No extra keys (`additionalProperties: false`).
- All text is shown to the user verbatim. Write it for the brand user.
- Dates are ISO 8601 in UTC (`2026-09-19T15:42:00.000Z`). The UI formats them.

## Invariants the schema cannot express

Score:
- `score` = sum of `components[].points`, and `maxScore` = sum of `components[].maxPoints`.
- `points <= maxPoints` for every component.

Insights:
- `signals` is ordered by `confidence`, highest first. The UI shows the first two.
- `openerSelection.candidates` is ordered by `score`, highest first, and
  `winnerKey` is one of the candidate keys.
- `timeline` is ordered oldest first.

## Validate a response

```bash
npx -y ajv-cli@5 validate --spec=draft2020 --validate-formats=false \
  -s prospect-score.schema.json -d response.json
```

`--validate-formats=false` skips the `email` / `uri` / `date-time` format checks
(the CLI cannot load the formats plugin through npx). Everything else is checked.
