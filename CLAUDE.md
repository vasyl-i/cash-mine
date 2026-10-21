# CashMine — Payback app (home assessment)

2-hour take-home (2026-10-21, 16:00–18:00 UTC). Expo React Native app, shipped as a **web build** opened on a phone (~390 px wide).
Scope, in priority order: **Balances (Home)** → **Claim flow** → **Unit tests for amount logic** → Activity (if time allows).
Money is real: **correctness > polish**. Fewer things done correctly beats everything done halfway.

Submission needs: public GitHub repo with full (unsquashed) history, live Vercel link, `NOTES.md` (~1 page: Decisions / Working with AI / Not done), `README.md` (live link, run locally, what works), `ai-logs/`.

## Hard rules

- **Never read, write, cat/head/less/grep or otherwise access `.env*` files** (only `.env.example` is allowed). The user manages them. Enforced by `.claude/settings.json` deny rules + `.claude/hooks/guard-env.mjs`. When searching recursively, scope to `src/ app/` or exclude dotfiles.
- **Never put API URL/token values in code, commits, logs or chat.** Read them only via `src/config/env.ts`.
- Commit at least every ~30 min, never squash. Commit only when the user asks.
- No push/redeploy after 18:00 UTC.
- Ask the AI for ≥2 approaches before choosing the balance-after-claim behaviour (graded; must be visible in `ai-logs/`).
- Run `npm run check` (typecheck + lint + format + tests) before declaring a task done.

## Stack

| Concern       | Choice                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| Framework     | Expo SDK 58, React 19.3, RN 0.88, react-native-web, React Compiler on            |
| Routing       | Expo Router — routes in root `app/` (typed routes on), web output `single` (SPA) |
| Server state  | `@tanstack/react-query` v5 (mutations `retry: 0` — never auto-retry money moves) |
| Client state  | `zustand` v5 (+ `persist` with AsyncStorage if pending claims must survive reload) |
| Validation    | `zod` v4 — parse API responses at the boundary                                   |
| IDs           | `expo-crypto` (`randomUUID`) — e.g. idempotency keys for claims                  |
| Tests         | Jest 30 + `jest-expo` preset + `@testing-library/react-native` v14               |
| Lint / format | ESLint 9 flat config (`eslint-config-expo/flat`) + Prettier via `eslint-plugin-prettier/recommended` |
| Deploy        | Vercel static (`vercel.json`: `expo export --platform web` → `dist/`, SPA rewrite) |

Open decision (to plan): amount representation — decimal library (`bignumber.js`/`decimal.js`) vs `bigint` minor units vs string-decimal. Never use JS `number` floats for money math.

Expo changes fast — check versioned docs `https://docs.expo.dev/versions/v58.0.0/` (or `https://docs.expo.dev/llms.txt`) rather than memory. Install with `npx expo install <pkg>` (dev: `npx expo install -- --save-dev <pkg>`).

## Commands

```bash
npm run web          # dev server (browser) — design at 390px width
npm run build        # expo export --platform web → dist/
npm run typecheck    # tsc --noEmit (strict + noUncheckedIndexedAccess)
npm run lint         # expo lint (ESLint + prettier rule); lint:fix to autofix
npm run format       # prettier --write
npm test             # jest
npm run check        # all of the above (CI-style)
npx expo-doctor      # dependency/config sanity
```

## Env

`.env.example` → user creates `.env.local` with `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_TOKEN`. Accessed only via `src/config/env.ts` (`env.apiUrl`, `env.apiToken`, `isEnvConfigured()`).
`EXPO_PUBLIC_*` vars are **inlined into the public JS bundle** — the token is visible to anyone who opens the web build. Acceptable for this assessment; note it in NOTES.md. On Vercel, set both vars in Project → Settings → Environment Variables (build-time).

## Architecture

```
app/                     # Expo Router routes ONLY — thin: compose feature screens, no logic
src/
  components/
    atoms/               # Button, Text, Amount, Spinner… (no data fetching)
    molecules/           # AmountInput, BalanceRow, ErrorState…
    organisms/           # BalanceList, ClaimForm, ClaimStatusCard…
    templates/           # ScreenContainer (phone-width centered layout)
  features/<feature>/    # feature slices when a domain grows: components/, hooks/, api/, model/
  hooks/                 # shared hooks (business logic lives in hooks, not components)
  api/                   # HTTP client, endpoints, zod schemas, query keys
  store/                 # zustand stores
  utils/                 # pure functions (money parsing/formatting/fees) — unit-tested
  constants/  config/  providers/  types/
```

Conventions:

- Components ≤ ~150–200 lines (ESLint `max-lines` warns at 200). Split early.
- Business logic in hooks / pure utils; components render state.
- Path alias `@/*` → `src/*`. Files kebab-case, components PascalCase named exports (route files use default export).
- Tests next to code in `__tests__/` (`*.test.ts(x)`). Pure money logic must have unit tests.
- Every async screen handles: loading, error + retry, empty, refresh (pull-to-refresh), stale indicator.
- Mobile-first: `ScreenContainer` caps width at 430 px on web.

## AI logs

`.claude/hooks/export-transcript.mjs` runs on **Stop** and **SessionEnd**: converts the session JSONL to `ai-logs/<date>_<session8>.md` (overwrites per session, so always complete). It strips `<system-reminder>` blocks, truncates long tool I/O, and redacts every value found in local `.env*` files plus bearer tokens/e-mail. Do not hand-edit logs (brief: "do not tidy them up"); do review them for secrets before pushing.

## Testing notes

- Preset `jest-expo` (native renderer) — `jest-expo/web` renders DOM nodes and breaks RNTL.
- `jest.setup.ts` mocks AsyncStorage and `react-native-safe-area-context`.
- RNTL v14: `render` is async — `await render(...)`.
