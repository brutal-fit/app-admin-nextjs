# Backlog (admin app)

Prioritised. Status: todo, in progress, done (with date and handoff dir or commit).

| ID | Item | Status |
|---|---|---|
| AD-01 | Scaffold: Next.js 16.4, TypeScript, Tailwind v4, Zustand, Supabase auth, layout, permission registry, roles and users pages, dev server on 3100; shadcn/ui and react-feather | done 2026-10-19 (tasks 04, 10, 11) |
| AD-02 | Sign-in verified against the hosted project on 2026-10-19 (`my_access` returns super_admin for the first admin); role management still to be exercised in the browser; generated database types via `npx supabase gen types` | in progress |
| AD-03 | Applications and documents review (signed URLs, platform price), using `review_document` and `review_application` | in progress, task-18: pages, actions and data layer landed 2026-10-19; Vitest render and action tests with the assistant |
| AD-04 | Support cases and reports | todo |
| AD-05 | Audit log viewer (`private.admin_audit_log` through a function) | todo |
| AD-06 | Vitest: registry matches the seeded permissions; `can()` helpers; error mapping; render tests for the five screens; form limits and group fix | in progress, task-12 |
| AD-08 | Create a `dev` branch to match the other repos (owner's call; work sits on `main`) | todo, owner |
| AD-07 | Deployment target (Vercel or similar) and the production env | todo, owner decision |
