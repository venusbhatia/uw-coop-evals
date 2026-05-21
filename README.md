# Evals.com

Thoughtful co-op and work-term performance evaluations — section-by-section SPE forms, optional multi-supervisor reconciliation, internal HR/VP review, then official form export.

Built with Next.js and Convex.

## Evaluation workflow

1. **Supervisor** completes the full evaluation form (`/student/[id]/form`) — save draft anytime.
2. Optional: second supervisor draft → **reconcile** conflicting ratings.
3. **Submit for HR review** when the form is complete.
4. **HR** approves or returns with comments (`/reviews`).
5. **VP** gives final approval.
6. **Finalized** evaluations unlock JSON/PDF export.

AI chat (`/chat/new`) is optional — it creates a supervisor draft, then sends you to the full form for review.

## Local development

```bash
npm install
node scripts/generate-jwt-keys.mjs   # prints JWT_PRIVATE_KEY and JWKS for .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy variables from [`.env.example`](.env.example) into `.env.local`. Required:

- `NEXT_PUBLIC_CONVEX_URL`
- `JWT_PRIVATE_KEY` and `JWKS` (matching pair)
- `SESSION_ISSUER` (e.g. `http://localhost:3000` in dev)
- `XAI_API_KEY` (optional AI assistant)
- `ALLOW_SEED_DEMO=true` (to use “Reload demo” / demo sign-in)
- `HR_REVIEWER_EMAILS` / `VP_REVIEWER_EMAILS` (comma-separated; also set on **Convex** env)

Run Convex in another terminal:

```bash
npx convex dev
```

Set the same `HR_REVIEWER_EMAILS`, `VP_REVIEWER_EMAILS`, `ALLOW_SEED_DEMO`, and `SESSION_ISSUER` on your Convex dev deployment.

## Sign-in

Any valid email address is accepted (work, Gmail, etc.). Sign in at `/onboarding`.

## Roles

| Role | Config |
|------|--------|
| Supervisor | Default for all signed-in users |
| HR | Listed in `HR_REVIEWER_EMAILS` |
| VP | Listed in `VP_REVIEWER_EMAILS` |

## Deployment (Vercel + Convex)

Production URL: `https://employee-evals.vercel.app`

Set on **Vercel** (Production env):

- `SESSION_ISSUER` — your app URL (e.g. `https://employee-evals.vercel.app`)
- `JWT_PRIVATE_KEY` / `JWKS` — matching pair
- `NEXT_PUBLIC_CONVEX_URL` — Convex prod URL
- `ALLOW_SEED_DEMO=true` — required for “See demo” / “Reload demo”
- `XAI_API_KEY`, `DEEPGRAM_API_KEY`, `EXTENSION_API_KEY` as needed

Set on **Convex** (production deployment):

- `SESSION_ISSUER` — same as Vercel
- `ALLOW_SEED_DEMO=true`
- `HR_REVIEWER_EMAILS=demo-hr@evals.com` (comma-separated)
- `VP_REVIEWER_EMAILS=demo-vp@evals.com`

Redeploy Vercel after changing env vars.

## Auth troubleshooting

- **401 on session routes**: Sign in again at `/onboarding`. Verify `JWT_PRIVATE_KEY` / `JWKS` match and `SESSION_ISSUER` is identical on Next.js and Convex.
- **Convex "Unauthenticated"**: `/.well-known/jwks.json` must be reachable at your app URL.
- **Seed disabled**: Set `ALLOW_SEED_DEMO=true` in `.env.local` and Convex.
- **Export 403**: Evaluation must be **finalized** (VP approved).

**Note:** Changing `SESSION_APPLICATION_ID` or the session cookie name logs existing users out once — sign in again after pulling this branch.
