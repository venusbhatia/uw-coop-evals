# Employee Evals

Thoughtful University of Waterloo co-op performance evaluations for 8090 supervisors — section-by-section UW SPE forms, optional multi-supervisor reconciliation, internal HR/VP review, then WaterlooWorks export.

Built with Next.js and Convex.

## Evaluation workflow

1. **Supervisor** completes the full UW form (`/student/[id]/form`) — save draft anytime.
2. Optional: second supervisor draft → **reconcile** conflicting ratings.
3. **Submit for HR review** when the form is complete.
4. **8090 HR** approves or returns with comments (`/reviews`).
5. **8090 VP** gives final approval.
6. **Finalized** evaluations unlock JSON/PDF export and the Chrome extension.

AI chat (`/chat/new`) is optional — it creates a supervisor draft, then sends you to the full form for review.

## Local development

```bash
npm install
node scripts/generate-jwt-keys.mjs   # prints JWT_PRIVATE_KEY and JWKS for .env.local
npm run dev
```

Open [http://localhost:8090](http://localhost:8090).

Copy variables from [`.env.example`](.env.example) into `.env.local`. Required:

- `NEXT_PUBLIC_CONVEX_URL`
- `JWT_PRIVATE_KEY` and `JWKS` (matching pair)
- `SESSION_ISSUER` (e.g. `http://localhost:8090` in dev)
- `XAI_API_KEY` (optional AI assistant)
- `ALLOW_SEED_DEMO=true` (to use “Reload demo” / demo sign-in)
- `HR_REVIEWER_EMAILS` / `VP_REVIEWER_EMAILS` (comma-separated; also set on **Convex** env)

Run Convex in another terminal:

```bash
npx convex dev
```

Set the same `HR_REVIEWER_EMAILS`, `VP_REVIEWER_EMAILS`, `ALLOW_SEED_DEMO`, and `SESSION_ISSUER` on your Convex dev deployment.

## Roles

| Role | Config |
|------|--------|
| Supervisor | Any `@8090.inc` email (default) |
| HR | Listed in `HR_REVIEWER_EMAILS` |
| VP | Listed in `VP_REVIEWER_EMAILS` |

## Chrome extension

See [extension/README.md](extension/README.md). Test against `http://localhost:8090` only until deployment is approved.

## Deployment

**Do not deploy to Vercel until explicitly approved.** Use local dev + Convex dev for QA.

When ready, sync env vars on Vercel and Convex (`SESSION_ISSUER`, JWT keys, role emails, `EXTENSION_API_KEY`, `ALLOW_SEED_DEMO=false` in production).

## Auth troubleshooting

- **401 on session routes**: Sign in again at `/onboarding`. Verify `JWT_PRIVATE_KEY` / `JWKS` match.
- **Convex "Unauthenticated"**: `SESSION_ISSUER` must match on Next.js and Convex; `/.well-known/jwks.json` must be reachable.
- **Seed disabled**: Set `ALLOW_SEED_DEMO=true` in `.env.local` and Convex.
- **Export 403**: Evaluation must be **finalized** (VP approved) before JSON/PDF/extension.
