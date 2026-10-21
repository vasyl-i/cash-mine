# Notes

## Decisions

- **Money = `bigint` minor units** (scale = the asset's `decimals`), parsed from and formatted back to the API's
  strict decimal strings in `src/utils/money.ts`. Exact for 18-decimal assets, no dependency, never a JS float.
  Amounts we send are re-formatted to canonical form (`"0.50"` → `"0.5"`). USD values are display-only: computed at
  1e-12 USD, summed, then rounded once to cents (half-up).
- **API boundary:** every response is parsed with zod; amounts are regex-checked strings. Errors become a typed
  `ApiError` (server code, `field`, `retryAfterMs`, plus client `NETWORK` / `INVALID_RESPONSE`).
- **Retries:** reads retry network / 429 / 5xx up to 3× (honouring `retryAfterMs`); writes **never** auto-retry.
- **Claim idempotency:** one Idempotency-Key per logical claim (same body ⇒ same key, changed body ⇒ new key).
  The attempt is written to storage with an *awaited* write before the request leaves (zustand `persist` writes
  fire-and-forget, so it is stored separately), and restored on reload. An unknown outcome (network error, 5xx,
  504, unparseable 2xx) locks the form to that body and offers "Retry safely" — the server replays the original
  claim instead of creating a second. A definite 4xx discards the attempt.
- **Balance after claim** (compared 3 approaches with AI — see ai-logs): **hybrid**. Balance numbers always show
  the server snapshot; our own claims created after the snapshot's `asOf` (both server clocks, so no client-clock
  skew) are subtracted from the claimable amount / Max and noted on the form. Failed claims are not subtracted
  (funds return to available). Rejected: optimistic overlay (client-computed money shown as truth, risk of
  double-subtracting) and server-only (allows a predictable 400 for ~15 s).
- **Stale data:** "as of" time from `asOf`; a warning when a refresh fails while showing cached data or the
  snapshot was already > 60 s old when received.
- **Token:** not in code, repo or the deployed build. Entered in-app and kept in localStorage (via AsyncStorage's
  web implementation). A dev-only `.env` token exists for local work and is stripped from production builds
  (verified by building with a sentinel value). Trade-off: any script on the origin can read localStorage (XSS
  risk) — inherent to "keep it in the browser" without a backend. On native it would go to `expo-secure-store`.

## Working with AI

Claude Code (Opus) in the terminal, with project rules in `CLAUDE.md` and hooks: a guard that blocks any access
to `.env*` files, a PostToolUse hook that runs Prettier + ESLint + `tsc` on every edited file (it caught a
React-purity violation and missing routes immediately), and a transcript exporter that writes `ai-logs/`.
I planned the steps with the AI, made the decisions (amount representation, balance-after-claim option C), and
reviewed each step. Things I pushed back on / it got wrong and fixed after review or testing:
- Idempotency key was persisted fire-and-forget (safe on web only by accident) → made the write awaited + tests.
- After a definite 400 the form re-locked as "unconfirmed" → discard attempt on definite 4xx.
- Token gate cleared the query cache on mount, leaving Home stuck loading → found in a browser smoke test.

## Not done / next

- **Activity** screen (paginated history with `nextCursor`) — skipped for time.
- No component/integration tests for screens (only pure logic + store); no MSW-style API mocks.
- Claim status polling has no backoff on repeated errors; 429 on polling relies on query retry.
- `localStorage` token (see above); no token validation before saving (a 401 sends you back to the form).
- Native: SecureStore for the token, MMKV for claim state; RefreshControl is a no-op on web (Refresh button covers it).
