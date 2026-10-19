# Backlog (admin app)

Prioritised. Status: todo, in progress, done (with date and handoff dir or commit).

| ID | Item | Status |
|---|---|---|
| AD-01 | Scaffold: Next.js 16.4, TypeScript, Tailwind v4, Zustand, Supabase auth, layout, permission registry, roles and users pages, dev server on 3100; shadcn/ui and react-feather | done 2026-10-19 (tasks 04, 10, 11) |
| AD-02 | Sign-in verified against the hosted project on 2026-10-19 (`my_access` returns super_admin for the first admin); role management still to be exercised in the browser; generated database types via `npx supabase gen types` | in progress |
| AD-03 | Applications and documents review (signed URLs, platform price), using `review_document` and `review_application` | in progress, task-18: pages, actions and data layer landed 2026-10-19; Vitest render and action tests with the assistant |
| AD-04 | Support cases and reports | todo |
| AD-05 | Audit log viewer (`private.admin_audit_log` through a function) | todo |
| AD-06 | Vitest suite: 133 tests in 23 files (registry, helpers, errors, screens, dashboard, palette, shortcuts) | done 2026-10-19 |
| AD-08 | `dev` branch created and tracked | done 2026-10-19 |
| AD-10 | Follow-ups from the panel upgrade note (`../memory/notes/admin-panel-polish.md`): user count capped by `admin_list_users` limit (needs a count function), bookings tile depends on an admin read policy on `bookings`, empty "Documents" permission group card, `PGRST303` not mapped | todo |
| AD-09 | Panel polish (task 19): "needs me now" dashboard, command palette, shortcuts, motion, fitness backdrop, sortable keyboard tables, application timeline | done 2026-10-19, `f154c4c` |
| AD-07 | Deployment on Vercel (team `purvikbrutal`): production from `main` at https://admin.brutal.fit, dev from `dev` at https://admin-dev.brutal.fit, public env set for Production and Preview, first failed build fixed (env only on Development); README "Deploy". Left: `SUPABASE_SERVICE_ROLE_KEY` as a sensitive Production variable (owner) | done 2026-10-19, service role key pending |
