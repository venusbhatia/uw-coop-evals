# Employee Evals

Guided co-op performance evaluations for 8090 supervisors, built with Next.js and Convex.

## Local development

```bash
npm install
node scripts/generate-jwt-keys.mjs   # prints JWT_PRIVATE_KEY and JWKS for .env.local
npm run dev
```

Open [http://localhost:8090](http://localhost:8090) (or the port shown in the terminal).

Copy variables from [`.env.example`](.env.example) into `.env.local`. Required for auth and evaluations:

- `NEXT_PUBLIC_CONVEX_URL`
- `JWT_PRIVATE_KEY` and `JWKS` (matching pair from the script above)
- `SESSION_ISSUER` (e.g. `http://localhost:8090` in dev)
- `XAI_API_KEY` (AI compiles the evaluation on Finish)

Run Convex in another terminal: `npx convex dev`.

## Production deployment (Vercel + Convex)

Set these on **Vercel** (production environment):

| Variable | Requirement |
|----------|-------------|
| `JWT_PRIVATE_KEY` | RS256 private key; must match `JWKS` |
| `JWKS` | Public JWKS JSON from the same keypair |
| `SESSION_ISSUER` | Exact app URL, e.g. `https://employee-evals.vercel.app` (no trailing spaces) |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL |
| `XAI_API_KEY` | Required for the evaluation wizard Finish step |

Set on **Convex** for the same deployment:

| Variable | Requirement |
|----------|-------------|
| `SESSION_ISSUER` | Same value as Vercel (`convex/auth.config.ts` uses this as OIDC issuer) |

If session cookies were signed with old keys, users must sign in again at `/onboarding`.

## Auth troubleshooting

- **401 on `/api/auth/session` or `/api/auth/convex-token`**: Sign in again at `/onboarding`. Verify `JWT_PRIVATE_KEY` and `JWKS` are a matching pair.
- **Finish spins then stops**: Session may have expired mid-eval; use the sign-in link on the error banner (`/onboarding?returnTo=...` returns you to the eval).
- **Convex "Unauthenticated"**: Ensure `SESSION_ISSUER` matches on Vercel and Convex, and that `/.well-known/jwks.json` is reachable on your app URL.
