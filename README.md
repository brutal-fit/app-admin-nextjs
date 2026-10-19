# BRUTAL admin app

Internal admin panel for BRUTAL (Next.js, TypeScript, Tailwind v4, Zustand, Supabase). Staff
review trainer applications and documents, set platform prices, handle support, manage users
and manage roles and permissions. It uses the same Supabase project as the Flutter app
(`../app-be-supabase` holds the schema).

## Run

```bash
source ~/.zshrc            # nvm's Node
npm install
cp .env.example .env.local # then fill SUPABASE_SERVICE_ROLE_KEY if you need user creation
npm run dev                # http://localhost:3100
```

Sign in with an admin account (one that has at least one role in `user_roles`). Clients and
trainers cannot sign in here; admins without a platform role cannot sign in to the app.

## Deploy (Vercel)

Vercel project `app-admin-nextjs` in team `purvikbrutal`, linked to the GitHub repo, Node
24.x, framework Next.js. Environments:

| URL | Builds from | Target |
|---|---|---|
| https://admin.brutal.fit | `main` | production |
| https://admin-dev.brutal.fit | `dev` | preview, pinned to the `dev` branch; behind Vercel login while SSO protection is on |
| `*.vercel.app` URLs | each push | behind Vercel login (SSO protection) |

A push of `main` deploys production and a push of `dev` deploys the dev host; nothing else is
needed. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for
Production and Preview (the public values from `.env.example`). `SUPABASE_SERVICE_ROLE_KEY` is
not set on Vercel; user creation stays disabled until the owner adds it as a sensitive
Production variable. DNS for `brutal.fit`: CNAME `admin` and `admin-dev` to
`cname.vercel-dns.com`, TXT `_vercel` with Vercel's verification values (owner's registrar).
A build fails when the public variables are missing, because the roles page prerenders a
session check at build time; that is the only Vercel-specific failure seen so far.

## Repos

| Repo | Holds |
|---|---|
| [`app-fe-flutter`](../app-fe-flutter) | The Flutter app for clients and trainers. |
| [`app-be-supabase`](../app-be-supabase) | Migrations, policies, functions, pgTAP, seed. |
| `app-admin-nextjs` (this one) | The admin panel. |
| [`brutal-fit.github.io`](../brutal-fit.github.io) | The marketing site. |
| [`memory`](../memory) | Shared running memory and the workspace `.claude/`. |

Rules for working here: `.claude/CLAUDE.md`. Architecture and backlog: `docs/`.
