# CashMine — Payback (Expo web)

## Hey! Deployed on https://cash-mine-lovat.vercel.app/

## Text below is AI



**Live:** _TBD (Vercel)_ — on first open, paste your API token (stored only in this browser; "Change token" on the home screen).

## Run locally

```bash
npm ci
cp .env.example .env.local   # EXPO_PUBLIC_API_URL (+ optional dev-only EXPO_PUBLIC_API_TOKEN)
npm run web                  # open http://localhost:8081, use a ~390px viewport
```

The dev token is a convenience for `npm run web` only: it is stripped from production builds
(`__DEV__` is false), so the deployed app always asks for a token. On Vercel set **only** `EXPO_PUBLIC_API_URL`.

Other scripts: `npm test`, `npm run check` (typecheck + lint + format + tests), `npm run build` (static export to `dist/`).

## What works

- **Token gate** — asks for the token on first open, keeps it in the browser (localStorage), "Change token" action; a 401 returns to the token screen with a message.
- **Balances (Home)** — per-asset available / pending / claiming with exact decimals, USD value and total; loading, error + retry, empty, refresh (button + pull-to-refresh), "as of" time and a stale warning; auto-refresh every 15 s.
- **Claim flow** — amount with live validation (format, asset decimals, min, available, fee), Max, destination picker, "you receive" preview; Idempotency-Key saved **before** sending and reused on retry; unknown outcomes (network error, 5xx, 504) lock the form and offer "Retry safely" (verified against the real API: 504 → retry → 200 replay of the same claim); status polled until completed / failed (with reason).
- **Balance after claim** — server snapshot stays authoritative; own claims newer than the snapshot reduce what can be claimed and are noted on the form.
- **Tests** — 63 unit tests: bigint money parsing/formatting/USD/claim validation, claim reconciliation, idempotency-key durability.
- **Not done:** Activity screen (see NOTES.md).

See [NOTES.md](./NOTES.md) for decisions and known issues, and [ai-logs/](./ai-logs) for AI conversations.
