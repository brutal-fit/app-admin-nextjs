# AdminOps: everything the internal team does from the panel

Owner (2026-10-19): "All the operations that our internal team is supposed to do.
Everything that an internal admin panel needs." This is the plan; status lives in
`backlog.md`. Every state change goes through a Postgres function gated by a permission key
(`private.has_permission`) and is written to `private.admin_audit_log`; the panel renders
what the function returns.

## What exists (2026-10-19)

Sign-in gated on an admin role; dashboard with live tiles; roles and permissions (create on
the fly, assign, revoke, `is_admin` panel access); users list, detail, role grants, trainer
app access; applications list and detail with document review, decisions and platform
prices; audit feed on the dashboard; command palette and shortcuts. Backend admin functions:
`admin_list_users`, `admin_get_user`, `admin_list_audit`, the role and permission functions,
`review_document`, `review_application`.

## Modules

| # | Module | What the team does | Needs on the backend |
|---|---|---|---|
| 1 | Support desk | Queue of support cases and reports (status: open, triaged, waiting for user, investigating, resolved, closed, escalated; categories: person, booking, message, review, safety, other); open a case with the linked user, booking, message or review; assign to an admin; add internal notes; reply to the user (shows in the app's case screen); change status; safety cases pinned to the top | `admin_list_support_cases`, `admin_get_support_case`, `admin_update_support_case` (status, assignee, internal note, reply); `support_case_events` table for notes and replies; app reads replies |
| 2 | Users and accounts | Search and open any user; suspend and reinstate with a reason (the app already honours `account_status`); see roles, bookings, cases, reviews on one page; create a user; reset a password (sends the reset email); process data-export and account-deletion requests from `privacy_requests` | `admin_set_account_status`, `admin_process_privacy_request`; `admin_get_user` extended with bookings, cases, reviews counts; password reset through the service-role route that exists for user creation |
| 3 | Trainers | Everything in applications today, plus after approval: edit headline, bio, years, services and platform prices, areas, languages, specialties; toggle listing visibility; request new documents; view documents through signed URLs; re-verify | `admin_update_trainer_profile`, `admin_set_services` (services and prices), `admin_request_documents` (sets status needs information with a message), `trainer_profiles.listed` flag |
| 4 | Bookings | List every booking with filters (status, mode, date, trainer, client); open one (session address visible only with `bookings.address`); cancel on behalf with a reason; resolve a no-show dispute; see the price snapshot and payment status | admin read policy on `bookings`, `booking_locations` (separate permission for the address), `admin_cancel_booking`, `admin_resolve_dispute` (completed, no-show, cancelled, with note) |
| 5 | Reviews | Queue of reported reviews; hide and restore a review (the app stops showing it and recomputes the rating); see the booking it belongs to | `reviews.hidden_at`, `reviews.hidden_reason`; `admin_moderate_review`; the trainer listing view excludes hidden reviews |
| 6 | Catalogue | Manage the specialties and categories the app offers, the cities and areas list, booking policy copy, platform defaults (session durations, cancellation window) | `catalogue_items` table (kind, key, label, sort, active) and `platform_settings` (key, value jsonb); the app reads both instead of constants |
| 7 | Announcements | Send an in-app notification to a segment (all clients, all trainers, one user, trainers in a city) with title, body and route; history | `admin_send_notification` writing `notifications` rows in batches; `announcements` table for the history |
| 8 | Audit | Full audit log page: filter by actor, action, target, date; export CSV | `admin_list_audit` with filters (extend) |
| 9 | Analytics | Daily and weekly: sign-ups by role, applications by status, bookings by status and mode, completion and cancellation rates, active trainers, top cities; later revenue and payouts | SQL views under `private` exposed through `admin_metrics(range)` |
| 10 | Payments (later) | Payouts, refunds, invoices once Razorpay is live | blocked on D-03 and the payments table shape |
| 11 | Roles and permissions | Already built; new permission keys below land in the seed and the registry together | new keys: `support.assign`, `users.suspend`, `privacy.process`, `trainers.edit`, `bookings.address`, `bookings.cancel`, `reviews.moderate` (exists), `catalogue.manage`, `announcements.send`, `audit.export`, `metrics.read` |

## Order

Backend first (one migration per approved group, pgTAP), then the panel in packages:
support desk, users and accounts, trainers, bookings, reviews, catalogue and settings,
announcements, audit and analytics. Each admin package names the functions it calls and adds
its permission keys to the registry test.
