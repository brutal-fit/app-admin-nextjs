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

## Repos

| Repo | Holds |
|---|---|
| [`app-fe-flutter`](../app-fe-flutter) | The Flutter app for clients and trainers. |
| [`app-be-supabase`](../app-be-supabase) | Migrations, policies, functions, pgTAP, seed. |
| `app-admin-nextjs` (this one) | The admin panel. |
| [`brutal-fit.github.io`](../brutal-fit.github.io) | The marketing site. |
| [`memory`](../memory) | Shared running memory and the workspace `.claude/`. |

Rules for working here: `.claude/CLAUDE.md`. Architecture and backlog: `docs/`.
