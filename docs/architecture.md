# Admin app architecture

Written with the scaffold on 2026-10-19 (AD-01, handoff
`../memory/.claude/handoffs/2026-10-19-e2e-and-admin/task-04.md`). The code is the source of
truth; whoever adds, renames or removes a route, feature, store, permission or data-layer
function fixes the matching row in the same change.

## Stack and versions

| Piece | Version / setting |
|---|---|
| Next.js | 16.4.2 (App Router, `src/`, Turbopack), from `create-next-app` 16.4.2 |
| React | 19.3.0 |
| TypeScript | 5.9, `strict` |
| Tailwind CSS | 4.3 through `@tailwindcss/turbopack` (configured in `next.config.ts`, no PostCSS file) |
| Cache Components | on (`cacheComponents: true`, `partialPrefetching: true`, scaffold default) |
| Supabase | `@supabase/supabase-js` 2.118, `@supabase/ssr` 0.12 |
| State, validation | Zustand 5, Zod 4 |
| Tests | Vitest 5 + jsdom + Testing Library, `vitest.config.mts`, `passWithNoTests` until AD-06 |
| UI primitives | shadcn/ui CLI 4.22 (`components.json`: style `new-york`, Radix base, base colour neutral, CSS variables, `rsc`); `radix-ui`, `class-variance-authority`, `cn` (shadcn's class merger, replaces clsx + tailwind-merge), `tw-animate-css`, `sonner`, `next-themes` (pulled in by the generated `sonner`, no provider mounted), `lucide-react` (generated files only) |
| Icons | `react-feather` 2.0, imported only through `src/components/icons.ts` |
| Motion, palette | `motion` 14.3 (`motion/react`: page fade, stagger, count-up, status pulse, sidebar indicator), `cmdk` 1.1 (behind the generated shadcn `command`); task 19 |
| Dev server | `npm run dev` on port 3100 |

## Request flow

1. `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`) runs on every page and API
   request: refreshes the Supabase session cookie, sets the `x-admin-pathname` request header
   for the layout, and sends signed-out visitors to `/login` (API routes get a 401 JSON).
2. `src/app/(admin)/layout.tsx` wraps `AdminShell` in `<Suspense>` (Cache Components require
   request data behind a boundary). `AdminShell` resolves the session with
   `getSessionAccess()`, redirects (`/login`, `/login?reason=no-access`, `/forbidden`), applies
   `routePermission` to the current path, and renders the sidebar and header.
3. Every `(admin)` page calls `requireRoutePermission('<its pattern>')` too, because layouts
   do not re-render on client navigation. `src/app/(admin)/template.tsx` wraps each page in
   `FadeIn` (a template remounts per navigation, so every page fades in).
4. Mutations: client component -> server action -> Zod -> `requirePermission` ->
   `src/lib/db/rbac.ts` -> `rpc()` -> `refresh()`; errors come back as `ActionResult` and show
   as toasts. No optimistic state.

## Routes

| Route | File | Gate | Notes |
|---|---|---|---|
| `/` | `src/app/page.tsx` | none | Redirects to `homeHref(permissions)` (`/my-gym` for a gym-only session, else `/dashboard`) or `/login` from the session. |
| `/login` | `src/app/(auth)/login/page.tsx` | public | Email + password; after sign-in `bind_gym_invites()` runs best effort (binds a gym invite for the account's phone, granting `gym_manager` to a manager); the action then lands on `homeHref`; sign-in is refused (signed out, "This account has no admin role.") unless `hasPanelAccess`; `?reason=no-access` shows the same message. |
| `/dashboard` | `src/app/(admin)/dashboard/page.tsx` | open (any admin) | A gym-only session (`isGymOnlySession`) is redirected to `/my-gym`. "Needs me now": eight tiles, plus a "Safety cases open" tile first when that count is above zero (links `/support?category=safety`) (applications awaiting review `applications.read`, documents to review `documents.review`, open support cases `support.read` linking `/support?status=open`, privacy requests pending `privacy.process` linking `/privacy?status=pending` (`admin_list_privacy_requests` total), bookings today and booking requests pending `bookings.read` linking `/bookings?from=&to=` today and `/bookings?status=requested`, reported reviews `reviews.moderate` linking `/reviews?reported=yes` (shown as "200+" at the function's cap), new users last 7 days `users.read`, active users today `analytics.read` from `admin_usage_overview(today, today)` linking `/analytics?tab=usage` only with `metrics.read`, else a note naming it), each streamed in its own Suspense; a tile without its permission says which one it needs. Below: review queue (oldest five awaiting, `applications.read`) and activity (`admin_list_audit`, `audit.read`) with a "Full audit log" link to `/audit`. |
| `/forbidden` | `src/app/(admin)/forbidden/page.tsx` | open (any admin) | Target of every failed route check. |
| `/roles` | `src/app/(admin)/roles/page.tsx` | `rbac.manage` | Table (Type badge, "Admin" panel-access badge for `is_admin`, toggle chips System / Custom / Grants panel access) and "New role" dialog; `?new=role` opens it (command palette). |
| `/roles/[id]` | `src/app/(admin)/roles/[id]/page.tsx` | `rbac.manage` | Details form (name, description, "Grants admin panel access"), permission grid, delete; all locked for system roles with the reason. |
| `/users` | `src/app/(admin)/users/page.tsx` | `users.read` | Debounced search ("Name, email or phone"; the server matches digits against the phone's last ten), a Phone column from `admin_list_user_phones` for the rows shown (masked to the last four digits without `users.manage`, full with it; "No phone" or "Not loaded" otherwise), toggle chips over the loaded rows (joined last 7 days, trainers, clients, suspended, has admin roles); `?joined=week` pre-applies the first and loads 200 rows; "New user" (`users.manage`, needs the service role key), `?new=user` opens it. |
| `/users/[id]` | `src/app/(admin)/users/[id]/page.tsx` | `users.read` | User 360 from one `admin_get_user_detail` call (plus the role grants and roles list for the roles panel): header (name, phone in full, email, username, app role, status pill, joined); Account: suspend and reinstate behind a dialog with a required reason (`users.suspend`; disabled with the server's reason for the session's own account and for super admins); no password reset (phone identity, 2026-10-21); bookings by status, open cases reported, reviews written and received (links to `/bookings?client=` or `?trainer=`, `/support?q=<name>`, `/reviews?trainer=` only when that page exists and the session may open it); roles assign/revoke and "Grant trainer app access" (`users.manage`); privacy requests with complete and reject dialogs (`privacy.process`); programmes from `admin_list_enrolments` (plan, stage as stored, length, enrolled, started, exercises ticked, payment; no trainer or assessment since programmes became self-guided (2026-10-22); an older row where the user was the trainer is marked "As trainer" and links its client; read on its own, so a failure shows only in that section); the five latest audit entries with a link to `/audit?target=<id>` (shown with `audit.read`). |
| `/privacy` | `src/app/(admin)/privacy/page.tsx` | `privacy.process` | Queue from `admin_list_privacy_requests`: waiting requests first, oldest first; status chips (all, `?status=pending|completed|rejected`) and kind chips (`?kind=data_export|account_deletion`), `page` in the URL, 50 a page with the server's `total_count`; kind and status pill, user (linked with `users.read`) and email, requested time and how long it has waited, reason, Mark completed and Reject dialogs (`privacy-request-dialog`, `processPrivacyRequestAction`, note optional). |
| `/applications` | `src/app/(admin)/applications/page.tsx` | `applications.read` | Status chips (`?status=`, all = every non-draft), quick filters `?status=awaiting_review` (submitted + under review, oldest first) and `?documents=unreviewed` (trainers with an uploaded document; needs `documents.review`, else ignored with a note), clear all; sortable name, @username (needs `users.read`, else "Hidden"), city, modes, submitted, status; 200 rows max with a note. |
| `/support` | `src/app/(admin)/support/page.tsx` | `support.read` | Queue from `admin_list_support_cases`: server order (safety first, then open before resolved, then newest change); status and category chips, search (`q`) and assignee select, every filter in the URL (`status`, `category`, `assignee`, `q`, `page`); 50 a page with previous and next (asks for 51 to know). Assignee options are every user holding an `is_admin` role from `admin_list_team` (needs `support.read` or `users.read`, said under the select when missing). Reporter links need `users.read`. |
| `/support/[id]` | `src/app/(admin)/support/[id]/page.tsx` | `support.read` | Header (subject, status pill, priority, category, reporter link, assignee, created, last change, the report text), target card by kind (booking, user, review, message; links only to pages the session may open), event thread (notes muted and dashed, replies in accent, status and assignment as timeline rows), action bar: status, note, reply (`support.manage`), assignee (`support.assign` plus `support.manage`); without `support.manage` the bar names the missing key. |
| `/trainers` | `src/app/(admin)/trainers/page.tsx` | `trainers.read` | Approved trainers (the list reads approved applications, so it also needs `applications.read` and names the key without it) (the first 200 approved applications, said when hit) with listed state, rating (hidden reviews excluded), bookings count (`bookings.read`, else the column says the key is needed; counted from at most 1000 bookings, said when hit), city and platform prices; chips `?listed=listed|unlisted`. |
| `/trainers/[id]` | `src/app/(admin)/trainers/[id]/page.tsx` | `trainers.read` | Header (listed pill, city, rating, last note to the trainer; links to application, bookings, reviews and user when permitted). Listing toggle (`trainers.edit`; listing needs an approved application). Profile summary and form (`trainers.edit`; headline 80, bio 600, years 0 to 60, service area 120, specialties and languages picked from the active catalogue (`catalogue(p_kind)`), values outside it kept and marked; comma-separated free text when the catalogue list is empty or unreadable). Services editor (`trainers.edit`; title, mode, duration 15 to 240, price, active; add and deactivate, one service per mode as the table requires; the server recomputes the approved rates). Documents (`documents.review`): "Request documents" dialog (kinds and message, `admin_request_documents`) and the signed-URL document list from applications. Each part without its key names it. |
| `/gyms` | `src/app/(admin)/gyms/page.tsx` | `gyms.read` | `admin_list_gyms` (submitted first, then latest change; 200 max with "Showing N of M"): status chips (`?status=`) and a name, area or city search (`?q=`) in the URL; columns gym (link), status, area and city, rating, bookings, prices to set (active services without a platform price), staff. "Create gym" (`gyms.manage`, `create-gym-dialog`: name, tagline, address, area, city, first manager's ten-digit mobile; opens the new gym). |
| `/gyms/[id]` | `src/app/(admin)/gyms/[id]/page.tsx` | `gyms.read` | One `admin_get_gym` call: header (status, area, rating, bookings count); verification and listing (status hint, submitted and verified times and by whom, last note; `gyms.manage`: the decisions `allowedDecisions(status)` allows (submitted: Verify or Send back; verified or listed: Suspend; suspended: Verify), note required to send back or suspend; List or Unlist for verified and listed gyms); profile card and photos (public `gym-photos` URLs); services with mode, duration, the gym's ask and the platform price or "Price pending", "Set platform price" per service (`gyms.manage`, with Withdraw price); opening hours; staff (name once bound, phone, role, status; user link with `users.read`); latest 50 bookings (booking link with `bookings.read`; "Not allotted" until the gym allots); latest 50 reviews. |
| `/my-gym` | `src/app/(admin)/my-gym/page.tsx` | `gym.self` + an active manager row | The gym from `?gym=` (one of the session's gyms, else the first; when there are several, chips and "Showing <gym name>", and the sidebar keeps `?gym=`) read with `get_gym`: status and hint, note from BRUTAL, "Send for review" for a draft (`gym_submit_for_review`); profile form (`gym_update_profile`: name, tagline, description, address, area, city, map pin latitude and longitude, facilities comma-separated, phone); photos (browser upload to `gym-photos/<gym id>/`, then `addGymPhotoAction`; remove; 12 max, JPEG, PNG or WebP under 5 MB); services (`gym_set_service` per row and a new-service row: title, at the gym or online, minutes 15 to 240, the gym's price, offered; the platform price read-only or "Awaiting BRUTAL approval"); opening hours (`gym_set_hours`, the whole week). Without a manager row: "No gym to manage". |
| `/my-gym/requests` | `src/app/(admin)/my-gym/requests/page.tsx` | `gym.self` + an active manager row | `gym_list_requests`: slot, service, mode, price and client first name; "Allot and confirm" from the gym's active trainers only (`allotCandidates` over `gym_list_staff`, labelled by name with the phone beside it; `gym_allot_trainer`) or Decline with a reason (`gym_decline_request`); reschedule requests show the asked time with "Accept new time" or "Keep original" (`respond_to_reschedule`, manager of the booking's gym only). "Confirmed, not started" from `booking_details` with Reassign (`gym_reassign_trainer`). |
| `/my-gym/staff` | `src/app/(admin)/my-gym/staff/page.tsx` | `gym.self` + an active manager row | `gym_list_staff` (active and invited rows: name once the invite binds, else "Joins on sign-in", phone, role, status, invited, joined); "Invite by phone" (`gym_invite_staff`, trainer or manager); Remove (`gym_remove_staff`; the server keeps one active manager). |
| `/my-gym/bookings` | `src/app/(admin)/my-gym/bookings/page.tsx` | `gym.self` + an active manager row | `booking_details` for the gym: upcoming soonest first and past latest first, 100 each; client first name, trainer or "Not allotted", status, price. |
| `/bookings` | `src/app/(admin)/bookings/page.tsx` | `bookings.read` | `admin_list_bookings` newest session first; filters in the URL (`status`, `mode`, `from`, `to` as India dates, `trainer`, `client` ids, `page`; 50 a page, asks for 51 to know about a next page); party links need `users.read` (client) and `applications.read` (trainer, falling back to the user page). A gym booking without a trainer reads "Awaiting gym allotment" with the gym name (`listBookingGyms`, best effort). |
| `/bookings/[id]` | `src/app/(admin)/bookings/[id]/page.tsx` | `bookings.read` | One `admin_get_booking` call: header (service, status pill, India time range), parties with links (a gym booking adds a Gym row: name linked with `gyms.read`, address, and "Awaiting gym allotment" with no Trainer row until the gym allots), service and price snapshot, payment status, who cancelled (the server's `cancelled_by`); timeline from its `timeline` (requested, confirmed, reschedule requested, accepted or declined, cancelled, completed, no show, dispute resolved, each with who; an open dispute closes it), plus "Trainer arrived" placed by time from `booking.arrived_at` when set; dispute card (state, note, who resolved it and when, case link with `support.read`); Payment card (`booking-payment-card`, `loadBookingPayment`): the live payment, else the latest, with state, amount and an "Open payment" link; "No payment (legacy booking)" when none; without `payments.read` the card names the key instead; address card from the reply's `address` key, present only for `bookings.address` (null reads "No address yet"; without the key a line names it and says whether one is on record from `has_address`; online sessions say no address); actions (`bookings.cancel`): Cancel on behalf (reason required, from requested, confirmed, reschedule requested) and Resolve dispute (outcome and note required, from completed or no show, once). |
| `/payments` | `src/app/(admin)/payments/page.tsx` | `payments.read` | `payments` newest first, 50 a page (asks for 51); columns date (opens the payment), booking (session time from `booking_details`, linked with `bookings.read`), client, trainer or gym (both need `bookings.read`, else "Hidden" and one line naming the key), amount, state badge with "Needs attention", order id with a copy button, payment id. Filters in the URL: state chips (`?state=`, seven states), "Needs attention" chip (`?attention=yes`: every `refund_failed` plus `refund_pending` last changed over an hour ago; replaces the state), `from`/`to` India dates on `created_at`, `q` (a uuid matches the booking id or the payment id; `order_...` the order id; `pay_...` the payment id; other ids either; 4 to 12 phone digits find the client's bookings through `admin_list_users` and `bookings`, needing `users.read` and `bookings.read`), `page`. Without dates the list reads the last 30 days; a search or Needs attention reads every date. |
| `/payments/[id]` | `src/app/(admin)/payments/[id]/page.tsx` | `payments.read` | Every column (state, amount, provider, order, payment and refund ids with copy buttons, signature checked, last event, refund amount, reason and failed calls, times), the booking summary (session linked with `bookings.read`, service, status, client, gym, trainer; without `bookings.read` the card names the key), the stored Razorpay event behind a disclosure. Actions: "Refund INR N" (`payments.manage`, `refund-payment-dialog`): reason 10 to 200 characters, then a confirm step with the amount, then the state the `refund` Edge Function returned (Razorpay refusing shows the state it reported); disabled with the reason unless the state is `paid` or `refund_failed`; without the key a line names it. |
| `/reviews` | `src/app/(admin)/reviews/page.tsx` | `reviews.moderate` | Reported reviews first (open support cases on the review; up to 200, said when hit), then the rest 50 a page; filters `reported=yes|no`, `hidden=yes|no`, `trainer`, `page` in the URL. Hide and restore with a reason (`admin_moderate_review`); hidden rows show the reason, who hid them and when. Links to the booking (`bookings.read`) and the open cases (`support.read`). |
| `/catalogue` | `src/app/(admin)/catalogue/page.tsx` | `catalogue.manage` | Link chips per list (`?kind=specialty|category|goal|city|area|language`, default specialty) with counts; each list in the app's order with up and down (writes `sort_order` for the whole list, 10 apart, through `admin_upsert_catalogue_item`), add, edit (key fixed once created), activate or deactivate, delete (the server's `BRVAL` "in use" text, then "Deactivate instead"). Areas are grouped under their city, each city with its own "Add area". A "Programmes" chip (`?view=programmes`) swaps the list for the programme plans from `admin_list_programme_plans` (title and slug, length, level, weekly price, default trainer, day and item counts, open enrolments, active and popular): "New plan" and Edit open `programme-plan-sheet` (`admin_upsert_programme_plan`; same limits as the function; default trainer picked from listed online trainers in `trainer_listings`, left out of the payload when unchanged; a new plan starts inactive and opens its days), Activate or Deactivate (`admin_set_plan_active`), Days (`&plan=<id>`) lists the authored days with their target minutes ("Rest" at 0) and "Add day N", and `&day=<n>` opens `programme-day-editor`, the workout editor (title, built by, target minutes (empty: the server's estimate, shown, a rep counting 3 seconds), up to 20 exercises picked from the active library (an item's inactive exercise stays pickable), each with sets 1 to 20, reps 1 to 200 for a reps exercise or a hold of 5 to 3600 seconds for a timed one, rest 0 to 600 seconds and an optional tempo; reorder, add, remove; no exercises is a rest day; items written before the library must get an exercise or be removed; whole day saved through `admin_upsert_programme_day`; the library is read with `admin_list_exercises` only while a day is open). An "Exercises" chip (`?view=exercises`) shows the exercise library from `admin_list_exercises` (name and key, muscle group, kind, equipment, video set or not, workout items using it, active; "N of M have no video yet"): "New exercise" and Edit open `exercise-sheet` (`admin_upsert_exercise`: name, key fixed once created, muscle group, equipment, 2 to 4 cues, kind locked while workout items use it, https video link or empty for the app's placeholder, figure from the fixed set, sort order, active), Activate or Deactivate (`admin_set_exercise_active`). |
| `/settings` | `src/app/(admin)/settings/page.tsx` | `catalogue.manage` | One form per known key (`booking.cancellation_window_hours`, `booking.session_durations`, `booking.policy_copy`, `trainer.max_rate_inr`, `support.emergency_number`, `coach.model`, and the switches `push.enabled` "Push notifications" and `payments.enabled` "Payments", off when missing or not a boolean as the server reads them) with its description, rule and last change (name with `users.read`); saved per key through `admin_set_setting`; the panel checks the same ranges as the function and shows the server's text when it refuses. A key without a row says the app uses its built-in default. |
| `/audit` | `src/app/(admin)/audit/page.tsx` | `audit.read` | `admin_list_audit` newest first, 50 a page with the server's `total_count` ("N entries match"); filters in the URL (`actor`, `action` exact, `target`, `from`, `to` as India dates, `q`, `page`): actor select from the admin team (`admin_list_team`: `support.read` or `users.read`, else filter from a row), action select of the 21 known actions, search, target id and dates applied together; actor names and a filter icon by each target narrow the log; target linked to the user, role, application, trainer, case, booking, the trainer's reviews, catalogue kind, settings or announcements page when the session may open it; detail as indented JSON behind a disclosure. "Export CSV" only with `audit.export` (the file holds the newest 50,000, said when more match). `/users/[id]` links here with `?target=`. |
| `/analytics` | `src/app/(admin)/analytics/page.tsx` | `metrics.read` | One `admin_metrics` call per range: presets 7, 30 (default), 90 days (`?days=`) or `?from=&to=` (refused here above 366 days or inverted). Eight tiles (CountUp for whole numbers), sign-ups per day by role and bookings per day by status (stacked SVG bars, statuses folded into four groups, hover readout), application funnel, completion and cancellation rates, top cities (SVG bar lists), support resolution time; each chart has a "Show data table" toggle; empty sections and an empty range say so. Tabs "Business" and "Usage" (`?tab=usage`, `AnalyticsTabs`) only for sessions with `analytics.read`; without it there is no tab bar and `?tab=usage` falls back to Business. Range picker and tabs keep each other's state. Usage: the five `admin_usage_*` calls in parallel for the same range: eight tiles (active today, active in range, sessions, median session m:ss with p90, new, returning, monthly active for the last month touched, share on the latest version), daily active users new/returning (rollup-only days as "Not split"), weekly retention grid (W+1..W+6 shaded by share), screens (sortable, top 20 then "Show all"), booking funnel per role and mode with step conversion, events by name and per day for a chosen event, versions by platform; empty sections say "No usage data in this range yet." |
| `/announcements` | `src/app/(admin)/announcements/page.tsx` | `announcements.send` | Composer: audience (everyone, clients, trainers with an optional catalogue city, one person searched with `listUsersAction`, `users.read`), title 120, message 1000, "Opens" picker from the app's signed-in routes for that audience or none; "Who receives this" exact count from `admin_count_recipients` (`estimateRecipientsAction`, read-only); zero disables Send with "No one matches this audience"; confirmation dialog with the count; after sending the server's count. A push line from `push.enabled` read when the page loads: "Also delivered as a push notification to phones." when the value is exactly `true`, "Push is off in Settings." otherwise (a missing row is off, as the dispatcher reads it), the read error when it fails; no per-announcement choice. History: newest 50 with sent at, title and excerpt, audience, screen, sender (name with `users.read`), recipients. |
| `/applications/[trainerId]` | `src/app/(admin)/applications/[trainerId]/page.tsx` | `applications.read` | Status timeline (draft, submitted, under review, needs information, decision; times from `created_at`, `submitted_at`, `updated_at`), answers (profile, experience, services and expected rates, availability, documents). Documents section needs `documents.review`; decision form needs `applications.review`; each says why when missing. |
| `POST /api/users/create` | `src/app/api/users/create/route.ts` | `users.manage` | Body `{ phone, fullName, email?, roleIds }` (`createUserSchema`: a ten-digit Indian mobile, sent as `+91XXXXXXXXXX`; email optional). 503 "Service role key not configured" without the key; creates a confirmed auth user by phone (`phone_confirm: true`; `phone_exists` reads "An account with this phone number already exists."). With an email it also sets the email (confirmed) and a 16-character temporary password from `node:crypto`, returned once as `temporaryPassword` (also on the roles-failed 500, since the account exists) with `Cache-Control: no-store`, never stored or logged; the dialog shows it once. The profile trigger binds a gym invite for the phone, so a gym manager created this way gets `gym_manager`. Then assigns roles with the caller's session. |
| `GET /api/audit/export` | `src/app/api/audit/export/route.ts` | `audit.read` + `audit.export` | Same query as `/audit`. First `admin_list_audit` call before the response so refusals are status codes (403, 400); then streams `text/csv` (`id, created_at, actor_id, actor_name, action, target_id, details`; formula-looking cells prefixed with `'`) in calls of 10,000 up to 50,000 rows, end pinned at the export's start; `Content-Disposition: audit-<from or start>-<to or today>.csv`, `X-Total-Count`. A later failure aborts the stream. Nothing logged. |
| loading state | `src/app/(admin)/loading.tsx` | - | Page-level Suspense fallback. |
| page transition | `src/app/(admin)/template.tsx` | - | `FadeIn` around every page (fade and 8px rise, 180 ms). |

## Permission registry (`src/lib/rbac/`)

| File | Exports |
|---|---|
| `permissions.ts` | `PERMISSION_GROUPS`, `PERMISSIONS` (`{ key, group, name, routes, apis, components }`), `PermissionKey`, `isPermissionKey`, `OPEN_ADMIN_ROUTES`, `routePermission(pathname)` (`{kind:'open'}`, `{kind:'permission', key}` or `null` for unknown paths, treated as forbidden), `apiPermission`, `navItems` (items carry `section` "My gym" for `gym.self` routes), `GYM_AREA_PERMISSION`, `isGymOnlySession(permissions)` (holds `gym.self` and nothing else), `homeHref(permissions)`, `sessionNavItems(permissions, { managesGym })` (what the sidebar, topbar, palette and "g" shortcuts show: held keys only, the gym area only with a manager row, no dashboard for a gym-only session), `permissionsInGroup`. The only list of permission keys in `src/`. |
| `can.ts` | `can(permissions, key)`; `hasPanelAccess(access)`: `admin_access` true and at least one permission (the fallback). Used by sign-in and `getSessionAccess`. |
| `session.ts` | `getSessionAccess()` (React `cache`, once per request): `anonymous`, `no-access` (fails `hasPanelAccess`), `error` or `ok` with `SessionAccess` from `my_access()` (`adminAccess`, `roles[{id, key, name, isAdmin}]`, `permissions`). |
| `gym-scope.ts` | `getGymScope()` (React `cache`): for a session holding `gym.self`, the gyms it manages now (`gym_staff` own rows, role manager, active, joined to `gyms` names): `none`, `ok` with `gyms`, or `error`. The shell decides `managesGym` from it; the my-gym pages resolve their gym from it. |
| `require-permission.ts` | `ForbiddenError`, `requirePermission(key)` (throws; actions and route handlers), `requireRoutePermission(pattern)` (redirects; pages). |

| Key | Group | Routes | APIs | Components |
|---|---|---|---|---|
| `rbac.manage` | rbac | `/roles`, `/roles/[id]` | | create-role-dialog, role-form, permission-grid, delete-role-button |
| `users.read` | users | `/users`, `/users/[id]` | | user-search, user-enrolments |
| `users.manage` | users | | `/api/users/create` | user-roles-panel, grant-trainer-access, create-user-dialog |
| `users.suspend` | users | | | account-status-control (`setAccountStatusAction`) |
| `privacy.process` | users | `/privacy` | | privacy-filters, privacy-queue-table, privacy-request-dialog (`processPrivacyRequestAction`) |
| `applications.read` | applications | `/applications`, `/applications/[trainerId]` | | application-table, application-detail |
| `applications.review` | applications | | | decision-form (`reviewApplicationAction`) |
| `documents.review` | applications | | | document-list, document-verdict-dialog (`openDocumentAction`, `reviewDocumentAction`), request-documents-dialog (`requestDocumentsAction`) |
| `trainers.edit` | applications | | | trainer-profile-form (`updateTrainerProfileAction`), services-editor (`setServicesAction`), listing-toggle (`setTrainerListedAction`) |
| `trainers.read` | applications | `/trainers`, `/trainers/[id]` | | trainer-table, trainer-summary |
| `gyms.read` | applications | `/gyms`, `/gyms/[id]` | | gym-table, gym-filters, gym-profile-card, gym-hours-list, gym-staff-table, gym-booking-list |
| `gyms.manage` | applications | | | create-gym-dialog (`createGymAction`), gym-verify-dialog (`verifyGymAction`), gym-listing-toggle (`setGymListedAction`), gym-service-price-dialog (`setGymServicePriceAction`) |
| `gym.self` | applications | `/my-gym`, `/my-gym/requests`, `/my-gym/staff`, `/my-gym/bookings` | | Marker for the gym manager area (role `gym_manager`; super_admin holds it too); the pages also need an active `gym_staff` manager row, and the gym functions check that row, not the key: gym-switcher, my-gym-profile-form, my-gym-photos, my-gym-services-editor, my-gym-hours-editor, submit-gym-button, request-list, reschedule-answer, allot-trainer-form, decline-request-dialog, staff-list, invite-staff-dialog, remove-staff-button, my-gym-booking-list |
| `support.read` | support | `/support`, `/support/[id]` | | support-queue-table, support-filters, case-header, case-target-card, case-thread |
| `support.manage` | support | | | case-action-bar (`changeSupportStatusAction`, `addSupportNoteAction`, `replySupportCaseAction`) |
| `support.assign` | support | | | case-action-bar (`assignSupportCaseAction`; also checks `support.manage`, as the function does) |
| `bookings.read` | bookings | `/bookings`, `/bookings/[id]` | | booking-table, booking-filters, booking-detail, booking-timeline, booking-dispute-card |
| `bookings.address` | bookings | | | booking-address-card |
| `bookings.cancel` | bookings | | | cancel-booking-dialog (`cancelBookingAction`), resolve-dispute-dialog (`resolveDisputeAction`) |
| `payments.read` | bookings | `/payments`, `/payments/[id]` | | payment-table, payment-filters, payment-detail, booking-payment-card (on `/bookings/[id]`) |
| `payments.manage` | bookings | | | refund-payment-dialog (`refundPaymentAction`; the `refund` Edge Function checks the key again through `my_access`) |
| `reviews.moderate` | reviews | `/reviews` | | review-list, review-filters, moderate-review-dialog (`moderateReviewAction`) |
| `catalogue.manage` | settings | `/catalogue`, `/settings` | | catalogue-list (`reorderCatalogueAction`, `setCatalogueItemActiveAction`), catalogue-item-dialog (`saveCatalogueItemAction`), delete-catalogue-item-dialog (`deleteCatalogueItemAction`), setting-form (`setSettingAction`), programmes-section, programme-plan-list (`setPlanActiveAction`), programme-plan-sheet (`savePlanAction`), programme-day-list, programme-day-editor (`saveDayAction`), exercises-section, exercise-list (`setExerciseActiveAction`), exercise-sheet (`saveExerciseAction`) |
| `announcements.send` | settings | `/announcements` | | announcement-composer (`estimateRecipientsAction`, `sendAnnouncementAction`), announcement-history |
| `audit.read` | audit | `/audit` | | audit-filters, audit-table |
| `audit.export` | audit | | `/api/audit/export` | audit-export-link |
| `metrics.read` | audit | `/analytics` | | range-picker, metric-tiles, chart-card |
| `analytics.read` | audit | | | usage-report, retention-grid, funnel-chart, screens-table, versions-table, event-day-chart (the Usage tab on `/analytics`; dashboard "Active users today") |

## Data layer (`src/lib/db/`)

`rbac.ts`, `applications.ts`, `dashboard.ts`, `support.ts`, `users.ts`, `trainers.ts`, `bookings.ts`, `reviews.ts`, `catalogue.ts`, `settings.ts`, `announcements.ts`, `audit.ts`, `metrics.ts`, `usage.ts`, `avatars.ts`, `phones.ts`, `programmes.ts`, `gyms-admin.ts`, `gyms-manager.ts` and `payments.ts` are the only files that spell table, bucket or function names (the hand-written types in
`src/types/database.ts` name them as types). Built against the task 05 contract (approved 2026-10-19),
which is not applied yet; every call fails today with `NOT_INSTALLED`.

| Wrapper | Calls |
|---|---|
| `getMyAccess` | `rpc('my_access')`, validated with Zod; a missing `admin_access` or `roles[].is_admin` reads as false |
| `listRoles`, `countRoles`, `getRole` | `roles`, `role_permissions` selects |
| `createRole`, `updateRole`, `deleteRole`, `setRolePermissions` | `admin_create_role(p_key, p_name, p_description, p_is_admin)`, `admin_update_role(p_id, p_name, p_description, p_is_admin)`, `admin_delete_role`, `admin_set_role_permissions` |
| `listUsers`, `countUsers`, `getUser` | `admin_list_users` (count uses `p_limit => null`), `admin_get_user` |
| `listUserRoleGrants` | `user_roles` select |
| `assignRole`, `revokeRole`, `setPlatformRole` | `admin_assign_role`, `admin_revoke_role`, `admin_set_platform_role` |

`applications.ts` (reads run through RLS: `applications.read` for applications, `documents.review` for documents and the bucket):

| Wrapper | Calls |
|---|---|
| `listApplications`, `getApplication`, `getApplicationModes` | `trainer_applications` selects (drafts never listed); `listApplications({ statuses, trainerIds, limit, oldestFirst })` |
| `countApplications`, `listApplicantNames` | `trainer_applications` head count by statuses; names by trainer ids (activity feed) |
| `countUnreviewedDocuments`, `listTrainerIdsWithUnreviewedDocuments` | `trainer_documents` with `status = 'uploaded'` (head count; distinct trainer ids, scan capped at 1000) |
| `listDocuments` | `trainer_documents` select without `storage_path` (the path never reaches the client) |
| `listAvailability` | `availability_windows` select |
| `createDocumentSignedUrl` | path looked up by document id, then `storage.from('trainer-documents').createSignedUrl(path, 300)` with the admin's session |
| `reviewApplication` | `review_application(p_trainer, p_status, p_note, p_home_rate_inr, p_online_rate_inr, p_verified_checks, p_availability_tags => null)` |
| `reviewDocument` | `review_document(p_document, p_status, p_note)` |

`dashboard.ts` (reads with the admin's session):

| Wrapper | Calls |
|---|---|
| `countOpenSafetyCases` | `support_cases` head count, `priority = 'safety'` and an open status (RLS: `support.read`) |
| `countOpenSupportCases` | `support_cases` head count, status open / triaged / waiting_for_user / investigating / escalated (RLS: `support.read`) |
| `countBookingsStarting`, `countPendingBookingRequests` | `bookings` head counts: start in a range and not cancelled; status `requested` (RLS `bookings_select_admin`: `bookings.read`) |
| `listAudit` | `admin_list_audit(p_limit, p_offset)` (`audit.read`; named arguments, which the 20261019000700 signature needs) |

`support.ts` (functions from `20261019000400_adminops_support_accounts.sql`, `admin_list_team` from `20261019000800`, run with the admin's session):

| Wrapper | Calls |
|---|---|
| `listSupportCases` | `admin_list_support_cases(p_status, p_category, p_assignee, p_search, p_limit, p_offset)` (`support.read`) |
| `getSupportCase` | `admin_get_support_case(p_id)` (`support.read`); the jsonb (case, reporter, assignee, target with `detail` by kind, events) is validated with Zod as `SupportCaseDetail` |
| `listTeam` | `admin_list_team()` (`support.read` or `users.read`): every user with an `is_admin` role, `{id, name, email, roles}` by name |
| `updateSupportCase(client, id, change)` | `admin_update_support_case(p_id, p_status, p_assignee, p_note, p_reply, p_unassign)` with one change per call (`status`, `assign`, `unassign`, `note`, `reply`); `support.manage`, assigning also `support.assign`; `BRVAL` and `BRNTF` messages shown as the server words them |

`users.ts` (functions from `20261019000400_adminops_support_accounts.sql` and, for the privacy list, `20261019000800_adminops_round2.sql`, run with the admin's session; `admin_get_user` stays in `rbac.ts` for its callers):

| Wrapper | Calls |
|---|---|
| `getUserDetail` | `admin_get_user_detail(p_id)` (`users.read`); the jsonb (profile with the full `phone` since `20261021171917`, role keys, `counts.bookings` per status, `open_cases`, `reviews_written`, `reviews_received`, `recent_audit` five, `privacy_requests`) is validated with Zod as `UserDetail` |
| `setAccountStatus` | `admin_set_account_status(p_user, p_status, p_reason)` (`users.suspend`; reason required; refuses own account and super admins with `BRPRM`) |
| `processPrivacyRequest` | `admin_process_privacy_request(p_id, p_outcome, p_note)` (`privacy.process`; completed or rejected, note optional) |
| `listPrivacyRequests`, `countPendingPrivacyRequests` | `admin_list_privacy_requests(p_status, p_kind, p_limit, p_offset)` (`privacy.process`; status `pending` = not completed or rejected; waiting first, oldest first; 200-row cap `PRIVACY_LIST_MAX`); returns `{ rows, total }` from `total_count`; the count asks for one pending row and reads the total |

`trainers.ts` (reads with the admin's session; functions from `20261019000500_adminops_trainers_bookings_reviews.sql`):

| Wrapper | Calls |
|---|---|
| `listTrainerProfiles`, `getTrainerProfile`, `listServices`, `listRatingSummaries` | `trainer_profiles` (without `search_text`), `services` (inactive included), `trainer_rating_summaries` selects |
| `updateTrainerProfile` | `admin_update_trainer_profile(p_trainer, p_fields)` with only the changed keys (`published` for the listing toggle); `trainers.edit` |
| `setServices` | `admin_set_services(p_trainer, p_services)` with the whole list (`{id, title, mode, duration_minutes, price_inr, active}`); `trainers.edit` |
| `requestDocuments` | `admin_request_documents(p_trainer, p_message, p_kinds)`; `documents.review` |

`bookings.ts`:

| Wrapper | Calls |
|---|---|
| `listBookings` | `admin_list_bookings(p_status, p_mode, p_from, p_to, p_trainer, p_client, p_limit, p_offset)` (`bookings.read`, 200-row cap); the `dispute` jsonb is checked with Zod |
| `getBookingDetail` | `admin_get_booking(p_id)` (`bookings.read`): the jsonb (booking row with `arrived_at`, null before arrival or from a pre-live-location reply, client and trainer, `cancelled_by`, `timeline`, `dispute`, `has_address`, `address` only with `bookings.address`) validated with Zod as `BookingDetail`; `address` is `{ visible: false }` when the key is missing from the reply |
| `countBookingsByTrainer` | `bookings.trainer_id` scan, capped at 1000 rows (`capped` when hit) |
| `listBookingGyms` | `booking_details` (`id, gym_id, gym_name, gym_address_text`) for the given booking ids that have a gym (`bookings_select_admin` through the security-invoker view); `BookingDetail.gymId` comes from the reply's booking row, and `trainer_id` is null on a gym booking until allotment |
| `cancelBooking`, `resolveDispute` | `admin_cancel_booking(p_id, p_reason)`, `admin_resolve_dispute(p_id, p_outcome, p_note)` (`bookings.cancel`) |

`reviews.ts`:

| Wrapper | Calls |
|---|---|
| `listReviews`, `countReportedReviews` | `admin_list_reviews(p_hidden, p_trainer, p_reported, p_limit, p_offset)` (`reviews.moderate`, 200-row cap; `open_reports` bigint read as a number) |
| `listOpenReportCases` | `support_cases` with `target_type = 'review'` and an open status (RLS `support.read`) |
| `moderateReview` | `admin_moderate_review(p_id, p_hidden, p_reason)` (`reviews.moderate`) |

`avatars.ts` (function from `20261021104634_avatar_presets.sql`; the detail readers `admin_get_user_detail`, `admin_get_booking` and `admin_get_support_case` carry `avatar_path` and `avatar_preset` per person themselves, optional in their Zod schemas):

| Wrapper | Calls |
|---|---|
| `listUserAvatars` | `admin_user_avatars(p_user_ids)` (`users.read`; BRVAL above 200 ids): deduplicates and splits into batches of `AVATAR_BATCH_MAX` 200; returns `UserAvatarMap` (user id to `{ path, preset }`) |
| `listUserAvatarsOrEmpty` | The list-page variant: `{}` without `users.read` or on any failure, so the list renders with initials. Called once per page by the users, trainers, bookings, support and reviews loaders with the ids shown |

`phones.ts` (function from `20261021171917_phone_admin_reads.sql`; the user 360 reads the full phone from `admin_get_user_detail`):

| Wrapper | Calls |
|---|---|
| `listUserPhones` | `admin_list_user_phones(p_user_ids)` (`users.read`; BRVAL above 200 ids): deduplicates and splits into batches of `PHONE_BATCH_MAX` 200; returns `UserPhoneMap` (user id to the phone as sent, masked to the last four digits without `users.manage`, or null) |
| `listUserPhonesOrEmpty` | The list-page variant: `{}` without `users.read` or on any failure, so rows say "Not loaded". Called once per page by the users loader with the ids shown |

`catalogue.ts` (functions from `20261019000600_adminops_catalogue_announcements.sql`; reads with the admin's session, every row with `catalogue.manage`):

| Wrapper | Calls |
|---|---|
| `listCatalogueItems`, `getCatalogueItem`, `findCatalogueItem` | `catalogue_items` selects (by kind, id, or kind and key), ordered by kind, sort order, label |
| `listActiveCatalogue` | `catalogue(p_kind)`: active rows as the app reads them (trainer pickers, announcement cities) |
| `upsertCatalogueItem` | `admin_upsert_catalogue_item(p_kind, p_key, p_label, p_parent_key, p_sort_order, p_active)` with the whole item (`catalogue.manage`) |
| `deleteCatalogueItem` | `admin_delete_catalogue_item(p_id)`; `BRVAL` while in use (`catalogue.manage`) |

`programmes.ts` (functions from `20261021124448_programmes.sql` and `20261022021036_programme_library.sql`, run with the admin's session; every jsonb reply validated with Zod):

| Wrapper | Calls |
|---|---|
| `listProgrammePlans` | `admin_list_programme_plans()` (`catalogue.manage`): every plan with `active`, `default_trainer_id` and name, `day_count`, `item_count`, `open_enrolments` (`adminProgrammePlanListSchema`) |
| `upsertProgrammePlan`, `setProgrammePlanActive` | `admin_upsert_programme_plan(p)` (no id creates; absent keys keep their value; unknown keys refused), `admin_set_plan_active(p_plan, p_active)`; both return the stored row (`programmePlanRowSchema`); `catalogue.manage`, audited |
| `upsertProgrammeDay` | `admin_upsert_programme_day(p)`: `{plan_id, day_number, title, built_by, target_minutes (null: estimated), items [{id?, exercise_id, sets, reps or duration_s by the exercise's kind, rest_s, tempo}]}` in order; items with an id are updated, items left out are deleted with their ticks; no items is a rest day (`programmeDayReplySchema`); `catalogue.manage`, audited |
| `listExercises` | `admin_list_exercises()` (`catalogue.manage`): every exercise, inactive included, with `item_count` (`adminExerciseListSchema`) |
| `upsertExercise`, `setExerciseActive` | `admin_upsert_exercise(p)` (no id creates; absent keys keep their value; unknown keys refused; a used exercise cannot change kind), `admin_set_exercise_active(p_exercise, p_active)`; both return the stored row (`exerciseRowSchema`); `catalogue.manage`, audited |
| `listProgrammeDays`, `listProgrammeItems` | `programme_days` by plan (with `target_minutes`), `programme_items` by day with `exercise_id`, `sets`, `reps`, `duration_s`, `rest_s`, `tempo` (readable by every signed-in account) |
| `listOnlineTrainers` | `trainer_listings` with `online` in `modes`: the trainers the plan function accepts as default trainer |
| `listEnrolments` | `admin_list_enrolments(p_user)` (`users.read`, unchanged by the library): enrolments where the user is client or trainer, newest first (`adminEnrolmentListSchema`) |

`gyms-admin.ts` (the `admin_*` gym functions) and `gyms-manager.ts` (the gym manager functions, `gym_staff`, `gyms`, `booking_details` reads, the `gym-photos` bucket, and the shared gym schemas and `parseGymReply`), from `20261022035524_gyms.sql` and `20261022050347_gyms_followups.sql`; every call with the caller's own session; jsonb replies validated with Zod:

| Wrapper | Calls |
|---|---|
| `listGyms` | `admin_list_gyms(p_status, p_search, p_limit, p_offset)` (`gyms.read`; `ADMIN_GYM_LIST_MAX` 200); `{ rows, total }` from `total_count` |
| `getAdminGym` | `admin_get_gym(p_gym)` (`gyms.read`) as `AdminGymDetail` (`adminGymDetailSchema`: gym, `verified_by_name`, services with asks, hours, staff, rating, counts, latest 50 bookings and reviews) |
| `createGym`, `verifyGym`, `setGymListed`, `setGymServicePrice` | `admin_create_gym(p)` (returns the new id), `admin_verify_gym(p_gym, p_decision, p_note)`, `admin_set_gym_listed(p_gym, p_listed)`, `admin_set_gym_service_price(p_service, p_price_inr)` (null withdraws); `gyms.manage`, audited |
| `bindGymInvites` | `bind_gym_invites()` (sign-in, best effort) |
| `listManagedGyms` | `gym_staff` own active manager rows, then `gyms` (id, name, status) by id (`gym_staff_select_own`, `gyms_select_staff`) |
| `getManagedGym` | `get_gym(p_id)` in manage mode as `ManagedGym` (asks, every service, `awaiting_price`) |
| `listGymStaff` | `gym_list_staff(p_gym)`: active and invited rows with names (`private.gym_staff_json`), manager of the gym or `gyms.manage` |
| `listGymRequests` | `gym_list_requests(p_gym)` |
| `listGymBookings` | `booking_details` by `gym_id`, upcoming (start at or after now, ascending) or past (descending), optional statuses, `GYM_BOOKINGS_MAX` 100 (`bookings_select_gym_manager`) |
| `allotTrainer`, `reassignTrainer`, `declineRequest` | `gym_allot_trainer(p_booking, p_trainer_user)`, `gym_reassign_trainer(...)`, `gym_decline_request(p_booking, p_reason)` |
| `respondToReschedule` | `respond_to_reschedule(p_id, p_accept)`; on a gym booking only a manager of that gym (BRPRM otherwise), BRSLT when the asked time is gone |
| `updateGymProfile`, `setGymService`, `setGymHours`, `submitGymForReview` | `gym_update_profile(p)` (`{id, ...fields}`), `gym_set_service(p)`, `gym_set_hours(p)` (whole week), `gym_submit_for_review(p_gym)` |
| `inviteGymStaff`, `removeGymStaff` | `gym_invite_staff(p_gym, p_phone, p_role)`, `gym_remove_staff(p_staff)` |
| `uploadGymPhoto`, `removeGymPhotoFiles`, `gymPhotoUrl` | `storage.from('gym-photos')` upload to `<gym id>/<uuid>.<ext>` (from the browser client), remove; the public URL from `NEXT_PUBLIC_SUPABASE_URL` |

`payments.ts` (`payments` and `booking_details` from `20261022151245_payments.sql`, the `refund` Edge Function; reads with the admin's session, `payments_select_admin` needs `payments.read`):

| Wrapper | Calls |
|---|---|
| `listPayments` | `payments` (every column but `raw`) newest first with `range`; `state` eq, or Needs attention as one `or` (`refund_failed`, or `refund_pending` with `updated_at` before the cut-off); `created_at` from and to; search: uuid (`booking_id` or `id`), `order_id`, `payment_id`, either, or `booking_id` in the ids a phone search found (none: no call) |
| `getPayment` | `payments` by id with `raw`; `BRNTF` "This payment does not exist." when no row |
| `getBookingPayment` | `payments` by `booking_id`, newest 20: the live one (created, paid, refund pending or requested), else the latest, else null |
| `listPaymentBookings` | `booking_details` (`id, service_title, mode, start_at, end_at, status, client_id, client_name, trainer_id, trainer_name, gym_id, gym_name`) for the given booking ids (`bookings.read`) |
| `listBookingIdsForClients` | `bookings.id` by `client_id`, `PHONE_SEARCH_BOOKINGS_MAX` 500 (`bookings.read`) |
| `refundPayment` | `functions.invoke('refund', { body: { payment_id, reason } })` with the session JWT: 200 is `{ outcome: 'requested', state, refundId }`; 502 `provider_error` is `{ outcome: 'provider_error', state }` with the function's reported state; any other reply throws through `functionErrorToAppError`. The function reads only `payment_id` today: the reason is not stored and nothing is audited. |

`settings.ts`:

| Wrapper | Calls |
|---|---|
| `listSettings` | `platform_settings` select (everyone may read) |
| `getSettingValue` | one key's `value` from `platform_settings`, null without a row or for a key the select policy hides (the announcements page reads `push.enabled`) |
| `setSetting` | `admin_set_setting(p_key, p_value)` (`catalogue.manage`; `BRVAL` on an unknown key or a value failing the key's check) |

`announcements.ts` (`admin_count_recipients` from `20261019000800_adminops_round2.sql`):

| Wrapper | Calls |
|---|---|
| `listAnnouncements` | `announcements` newest first (RLS `announcements.send`) |
| `sendAnnouncement` | `admin_send_notification(p_segment, p_title, p_body, p_route)` (`announcements.send`); the returned row is checked with Zod for `recipient_count` |
| `countRecipients` | `admin_count_recipients(p_segment)` (`announcements.send`): active accounts the segment reaches now, by the send's own audience rule; no empty or 10,000 check |

`audit.ts` and `metrics.ts` (functions from `20261019000700_adminops_audit_metrics.sql`, run with the admin's session):

| Wrapper | Calls |
|---|---|
| `listAuditLog` | `admin_list_audit(p_actor, p_action, p_target, p_from, p_to, p_search, p_limit, p_offset)` with named arguments; returns `{ rows, total }` (`total_count`, 0 for an empty page). `AUDIT_PAGE_MAX` 1000 (`audit.read`), `AUDIT_CALL_MAX` 10000 (needs `audit.export`) |
| `getMetrics` | `admin_metrics(p_from, p_to)` (`metrics.read`, India dates, 366 days max); the jsonb is validated with Zod as `PlatformMetrics` (`metricsSchema`) |

`usage.ts` (functions from `20261020120904_usage_analytics.sql`, run with the admin's session; each `analytics.read`, India dates both included, 366 days max, jsonb validated with Zod; `FUNNEL_STEPS`, `FUNNEL_MODES`):

| Wrapper | Calls |
|---|---|
| `getUsageOverview` | `admin_usage_overview(p_from, p_to)` as `UsageOverview` (`usageOverviewSchema`: totals, daily with `source` raw or daily and null new/returning on rollup days, monthly, session length median and p90 ms, retention cohorts) |
| `getUsageScreens` | `admin_usage_screens(p_from, p_to)` as `UsageScreens` (sessions; per route views, unique users, median time on screen ms, session share) |
| `getUsageFunnel` | `admin_usage_funnel(p_from, p_to)` as `UsageFunnel` (per role and mode `all`/`home`/`online`, four steps with users and conversion) |
| `getUsageEvents` | `admin_usage_events(p_from, p_to)` as `UsageEvents` (`by_day` totals and counts per name, `by_name` events and unique users) |
| `getUsageVersions` | `admin_usage_versions(p_from, p_to)` as `UsageVersions` (latest version, users on it and share, rows by version and platform) |

## Supabase and errors (`src/lib/supabase/`, `src/server/`)

| File | Role |
|---|---|
| `env.ts` | `readSupabasePublicEnv()`: the two `NEXT_PUBLIC_` values or null. |
| `client.ts` | `createSupabaseBrowserClient()` (not used yet; sign-in runs server-side). |
| `server.ts` | `createSupabaseServerClient()` (cookies), `AppSupabaseClient` type. |
| `errors.ts` | `AppError`, `toAppError`, `errorPayload`: `BRVAL`, `BRPRM`, `BRNTF`, `BRSLT` from `private.fail`; `NOT_INSTALLED` (PGRST202, PGRST205, 42P01, 42883); Auth `over_email_send_rate_limit` as `BRVAL` and `user_not_found` as `BRNTF`; `AUTH`, `CONFIG`, `SERVICE_ROLE_MISSING`, `NETWORK`, `UNKNOWN`; `functionErrorToAppError(status, body)` for Edge Function replies (BR codes as above, `unauthenticated`, `config_missing`, `provider_error`, `store_error`, `bad_request`, then the HTTP status). Messages live here only. |
| `src/server/service-client.ts` | `isServiceRoleConfigured()`, `createServiceClient()`, `ServiceRoleMissingError`. Only reader of `SUPABASE_SERVICE_ROLE_KEY`. |
| `src/server/run-action.ts` | `runAction(schema, input, permission, run)`: the path every server action takes. |

## Features

| Feature | Files |
|---|---|
| auth | `src/features/auth/{actions.ts (signInAction, signOutAction), schemas.ts, components/login-form.tsx}` |
| roles | `src/features/roles/{actions.ts, schemas.ts, components/{create-role-dialog, role-table, role-form, permission-grid, delete-role-button}.tsx}` |
| users | `src/features/users/{actions.ts (listUsersAction, userAvatarsAction (users.read; avatars for the rows a search returned), userPhonesAction (users.read; phones for the rows a search returned), assignRoleAction, revokeRoleAction, grantTrainerAccessAction, setAccountStatusAction, processPrivacyRequestAction; each write refresh()es the page), schemas.ts (USER_PAGE_SIZE 50, USER_MAX_PAGE 200, USER_FILTERS, parseUserFilters, ACCOUNT_REASON_MAX 500, PRIVACY_NOTE_MAX 1000, setAccountStatusSchema, processPrivacyRequestSchema, userPhonesSchema, indianMobileDigits, createUserSchema), format.ts (booking status order and labels, privacy kind and status labels and tones, accountStatusTone, missingPermissionMessage, suspendBlockedReason, describeUserAuditEntry, describePhone (full "+91 90000 00001", masked kept as sent and announced by its last four)), components/{user-search (search + toggle chips), user-table (client, DataTable), user-roles-panel, grant-trainer-access, create-user-dialog (phone, name, optional panel email, roles; shows the temporary password once), account-status-control (client), user-overview, user-privacy-requests, privacy-request-dialog (client), user-audit-list, user-enrolments}.tsx}` |
| dashboard | `src/features/dashboard/{api.ts (loadDashboardTiles (safety tile only when its count is above zero or failed; privacy pending with privacy.process), loadReviewQueue, loadActivity: server loaders, each settles on its own), format.ts (describeAuditEntry: audit row to verb and target link, gated by permission), components/{stat-tiles, review-queue, activity-feed, section-skeleton}.tsx}` |
| support | `src/features/support/{api.ts (loadSupportQueue, loadSupportCase, loadTeam: TeamState ok from admin_list_team / hidden without support.read and users.read / error), actions.ts (changeSupportStatusAction, assignSupportCaseAction, addSupportNoteAction, replySupportCaseAction; each refresh()es the page, no local state), schemas.ts (statuses, categories, labels, SUPPORT_PAGE_SIZE 50, SUPPORT_TEXT_MAX 2000, parseSupportFilters, supportListHref, action schemas), format.ts (status and priority tones, excerpt, permittedHref), components/{support-queue-table (client, DataTable), support-filters (client), support-pagination, support-status-badge, support-priority-badge, case-header, case-target-card, case-thread, case-action-bar (client)}.tsx}` |
| applications | `src/features/applications/{api.ts (loadApplicationList with the documents filter state, loadApplicationDetail: server loaders, usernames via admin_get_user only with users.read), actions.ts (reviewApplicationAction, reviewDocumentAction, openDocumentAction), schemas.ts (status filters, quick filter awaiting_review, filterStatuses, parseDocumentsFilter, applicationListHref, decisions, verified checks, labels, missingPriceMessage), format.ts (INR, bytes, times, status tones), components/{application-table (client, DataTable), application-detail, status-timeline, document-list, document-verdict-dialog, decision-form}.tsx}`. Approval needs a platform price for every offered mode: checked in the form and again in the action against the modes read from the database. |
| trainers | `src/features/trainers/{api.ts (loadTrainerList, loadTrainerDetail with the specialty and language catalogue options), actions.ts (updateTrainerProfileAction, setTrainerListedAction, setServicesAction, requestDocumentsAction; each refresh()es the page), schemas.ts (TRAINER_LIST_LIMIT 200, field limits, LISTED_FILTERS, parseListedFilter, trainerListHref, CatalogueOptions, parseTextList, trainerProfileFieldsSchema, setServicesSchema, requestDocumentsSchema), format.ts (listed label and tone, formatRating, joinList), components/{trainer-table (client, DataTable), trainer-summary, trainer-profile-form (client), catalogue-picker (client: checkboxes from the catalogue, values outside it kept and marked, free text without items), services-editor (client), listing-toggle (client), request-documents-dialog (client)}.tsx}` |
| bookings | `src/features/bookings/{api.ts (loadBookingList(client, access, filters) with the page's client and trainer avatars and gymNames for rows without a trainer (best effort), loadBookingDetail: one admin_get_booking call plus the gym of a gym booking, address state ok / none / hidden from the reply's address key), actions.ts (cancelBookingAction, resolveDisputeAction), schemas.ts (BOOKING_PAGE_SIZE 50, CANCEL_REASON_MAX 300, DISPUTE_NOTE_MAX 1000, CANCELLABLE_STATUSES, DISPUTE_STATUSES, DISPUTE_OUTCOMES, labels, isCancellable, canResolveDispute, parseBookingFilters, bookingListHref, EMPTY_BOOKING_FILTERS, invalidDateRange, action schemas), format.ts (status and payment tones, formatSessionRange), components/{booking-table (client, DataTable), booking-filters (client), booking-detail, booking-timeline (from the server timeline), booking-dispute-card, booking-address-card, booking-status-badge, payment-status-badge, cancel-booking-dialog (client), resolve-dispute-dialog (client)}.tsx}` |
| payments | `src/features/payments/{api.ts (loadPaymentList(client, access, filters, now): the page, hasNext, the bookings behind it (ok, hidden without bookings.read, or error) and the dates read; a phone search resolved through listUsers and listBookingIdsForClients; loadPaymentDetail: the payment and its booking; loadBookingPayment for the booking page: ok, none, hidden without payments.read, error), actions.ts (refundPaymentAction: payments.manage, refundPayment, refresh(); a Razorpay refusal is an outcome with the state, not an error), schemas.ts (PAYMENT_PAGE_SIZE 50, DEFAULT_RANGE_DAYS 30, ATTENTION_AGE_MS one hour, REFUND_REASON_MIN 10 and MAX 200, PAYMENT_SEARCH_MAX 64, PAYMENT_STATES and labels, REFUNDABLE_STATES paid and refund_failed, isRefundable, refundBlockedReason, needsAttention, parsePaymentFilters, paymentListHref, hasPaymentFilters, effectiveDateRange, invalidPaymentRange, parsePaymentSearch, SEARCH_HINT, paymentIdSchema, refundReasonSchema, refundPaymentSchema), format.ts (paymentStateTone, shortId, formatRawEvent), components/{payment-table (client, DataTable), payment-filters (client), payment-state-badge, copy-id-button (client), payment-detail, refund-payment-dialog (client: reason, confirm, result), booking-payment-card}.tsx}` |
| catalogue | `src/features/catalogue/{api.ts (loadCatalogue: items by kind and areas grouped under cities, groupAreas), actions.ts (saveCatalogueItemAction: create refuses an existing key, edit keeps the stored sort order; setCatalogueItemActiveAction; deleteCatalogueItemAction; reorderCatalogueAction: the ids must match the list as stored, writes only moved items; each refresh()es the page), schemas.ts (CATALOGUE_KINDS, labels and hints, key pattern, label 80, sort 0 to 10000, step 10, parseCatalogueKind, catalogueHref, suggestCatalogueKey, nextSortOrder, sortOrdersFor, moveItem, action schemas), components/{catalogue-list (client), catalogue-item-dialog (client), delete-catalogue-item-dialog (client), area-lists}.tsx}` |
| programmes | `src/features/programmes/{api.ts (loadProgrammes: plans, online trainer options and the plan and day chosen in the URL (with the exercise library while a day is open), each settling on its own; loadEnrolments), actions.ts (savePlanAction returns the plan id, setPlanActiveAction, saveDayAction; each refresh()es the page), schemas.ts (plan, day and workout item limits from the functions, PROGRAMME_LEVELS, PROGRAMME_FIGURE_KEYS and labels (the set in private.programme_figure_keys()), isProgrammesView, parseProgrammeSelection, programmesHref, suggestPlanSlug, savePlanSchema, toPlanPayload, setPlanActiveSchema, workoutItemSchema (reps or duration by the exercise's kind), saveDaySchema, toDayPayload (sends only the field the kind uses), estimateWorkoutMinutes (the server's estimate), firstIssueMessage), format.ts (stage labels and tones, paymentStatusLabel, formatWeeklyPrice, formatWeeks, formatIsoDate, formatEquipment), components/{programmes-section, programme-plan-list (client), programme-plan-sheet (client), programme-day-list, programme-day-editor (client, the workout editor)}.tsx}`; the user 360 list is `users/components/user-enrolments` |
| exercises | `src/features/exercises/{api.ts (loadExercises), actions.ts (saveExerciseAction returns the id, setExerciseActiveAction; each refresh()es the page), schemas.ts (limits from admin_upsert_exercise, EXERCISE_KINDS and labels, isExercisesView, exercisesHref, suggestExerciseKey, nextExerciseSortOrder, saveExerciseSchema, toExercisePayload, setExerciseActiveSchema), components/{exercises-section, exercise-list (client), exercise-sheet (client)}.tsx}` |
| settings | `src/features/settings/{api.ts (loadSettings: every known key, set or not), actions.ts (setSettingAction), schemas.ts (SETTING_KEYS, SETTING_DEFINITIONS with label, input kind, description and rule; SETTING_VALUE_SCHEMAS with the function's ranges: window 0 to 168 hours, 1 to 6 distinct durations of 15 to 240, policy copy home, online and cancellation each 1 to 1000, max rate 1 to 100000, emergency number pattern, coach model one of COACH_MODELS (Haiku, Sonnet, Opus 5.5, shown as a select with the note "Haiku for testing and development; Sonnet for launch"), push.enabled and payments.enabled booleans (input kind boolean, BOOLEAN_SETTING_KEYS, isBooleanSettingKey; shown as a Switch, saved with Save); setSettingSchema, parseIntegerText, parseIntegerListText, storedSettingValue), components/setting-form.tsx (client)}` |
| announcements | `src/features/announcements/{api.ts (loadAnnouncementsPage: history, names with users.read, catalogue cities, push status from push.enabled (PushStatus, pushEnabledFromSetting); estimateRecipients: the exact count from admin_count_recipients), actions.ts (estimateRecipientsAction read-only, sendAnnouncementAction refresh()es), schemas.ts (limits, AUDIENCES, APP_ROUTES from the app's AppRoutes, routesForAudience, appRouteLabel, segmentSchema, sendAnnouncementSchema, RecipientEstimate `{ count }`, peopleCount), format.ts (describeSegment), components/{announcement-composer (client; pushInfoText), announcement-history}.tsx}` |
| audit | `src/features/audit/{api.ts (loadAuditPage: page, total, hasNext, actor name, team via support's loadTeam), schemas.ts (AUDIT_PAGE_SIZE 50, AUDIT_EXPORT_MAX 50000, AUDIT_SEARCH_MAX 200, AUDIT_ACTIONS and labels, parseAuditFilters, auditListHref, auditExportHref, hasAuditFilters, invalidAuditRange, auditExportFileName, isUuid), format.ts (auditTarget: label and permitted link by action, formatAuditDetails, hasAuditDetails, csvCell, auditCsvHeader, auditCsvRow), components/{audit-filters (client), audit-table, audit-export-link}.tsx}` |
| analytics | `src/features/analytics/{api.ts (loadMetrics), schemas.ts (RANGE_PRESETS 7/30/90, DEFAULT_PRESET 30, RANGE_MAX_DAYS 366, parseAnalyticsRange, presetRange, rangeProblem, rangeDays, shiftDate, analyticsHref), format.ts (chart slots and slotColor, SIGNUP_SERIES, BOOKING_STATUS_GROUPS and BOOKING_SERIES, applicationFunnel, applicationStatusRows, rateBars, cityBars, isEmptyRange, countAxis, number, percent, day, hour formatting), components/{analytics-report, metric-tiles, chart-card (client: data table toggle), chart-legend, stacked-day-chart (client: hover readout), bar-list-chart, metric-table, range-picker (client: keeps the tab), analytics-tabs (Business and Usage links keeping the range)}.tsx}`; `schemas.ts` also has `ANALYTICS_TABS`, `DEFAULT_TAB`, `ANALYTICS_TAB_LABELS`, `analyticsTabs(canReadUsage)`, `parseAnalyticsTab(params, canReadUsage)`, `rangeHrefInput`, and `analyticsHref(range, tab)`; `format.ts` also has `formatShare` (one decimal) and `formatDuration` (m:ss). Usage tab: `src/features/analytics/usage/{api.ts (loadUsage: the five readers in parallel, all or nothing), format.ts (USAGE_EMPTY, SCREENS_TOP 20, ACTIVE_USER_SERIES, todayActiveUsers, latestMonth, formatMonth, isEmptyUsage, funnel step and mode labels, roleLabel, stepConversion, funnelBars, overallConversion, funnelByRole, RETENTION_OFFSETS, retentionShade (chart-1 mixed 12 to 70 percent by share, 0 for none, null for a week not begun), retentionCell, eventLabel, eventBars, activeEventNames, ALL_EVENTS, eventDays, platformLabel, cohortLabel), components/{usage-report, retention-grid, funnel-chart, screens-table (client, DataTable), versions-table, event-day-chart (client: event select)}.tsx}`. Charts are inline SVG or HTML bars; no chart dependency. |
| privacy | `src/features/privacy/{api.ts (loadPrivacyQueue: one page with total, hasNext and how long each waiting request has waited), schemas.ts (PRIVACY_PAGE_SIZE 50, status filters pending, completed, rejected and labels, PRIVACY_KINDS, parsePrivacyFilters, privacyListHref, EMPTY_PRIVACY_FILTERS, hasPrivacyFilters), components/{privacy-filters, privacy-queue-table}.tsx}`; the process dialog is `users/components/privacy-request-dialog` |
| gyms | `src/features/gyms/{api.ts (loadGymList, loadGymDetail), actions.ts (createGymAction returns the gym id, verifyGymAction, setGymListedAction, setGymServicePriceAction; each gyms.manage, each write refresh()es), schemas.ts (GYM_LIST_LIMIT 200, field limits from private.gym_patch, GYM_STATUS_FILTERS, parseGymFilters, gymListHref, EMPTY_GYM_FILTERS, GYM_DECISION_LABELS, allowedDecisions, decisionNeedsNote, verifyGymSchema, setGymListedSchema, setGymServicePriceSchema, indianMobileSchema, createGymSchema), format.ts (GYM_STATUS_LABELS, gymStatusTone, gymStatusHint, STAFF_ROLE_LABELS, STAFF_STATUS_LABELS, staffStatusTone, WEEKDAY_LABELS, formatMinute, parseMinute, summariseHours, firstName), components/{gym-table (client, DataTable), gym-filters, gym-status-badge, gym-profile-card, gym-photo-grid, gym-hours-list, gym-staff-table, gym-booking-list, create-gym-dialog (client), gym-verify-dialog (client), gym-listing-toggle (client), gym-service-price-dialog (client)}.tsx}` |
| my-gym | `src/features/my-gym/{api.ts (resolveMyGym(?gym) from getGymScope, loadMyGym, loadRequestsPage (requests, confirmed upcoming, staff with names), loadStaffPage (gym_list_staff), loadBookingsPage), actions.ts (updateGymProfileAction, addGymPhotoAction (reads the gym, appends the uploaded path), removeGymPhotoAction (then deletes the file, best effort), saveGymServiceAction, setGymHoursAction, submitGymAction, allotTrainerAction (allot or reassign), declineRequestAction, respondToRescheduleAction (accept or keep the original), inviteStaffAction, removeStaffAction; each gym.self, each refresh()es), schemas.ts (limits from the gym functions, pickGymId, myGymHref, updateGymProfileSchema and toProfileFields, addGymPhotoSchema, removeGymPhotoSchema, gymServiceFormSchema, setGymHoursSchema, submitGymSchema, allotTrainerSchema, respondToRescheduleSchema, declineRequestSchema, inviteStaffSchema, removeStaffSchema), format.ts (allotCandidates: active, bound trainer staff only, labelled by name with the phone as detail; staffDisplayName; requestedEndIso; hoursProblem; platformPriceText), components/{gym-switcher, my-gym-unavailable, my-gym-profile-form (client), my-gym-photos (client), my-gym-services-editor (client), my-gym-hours-editor (client), submit-gym-button (client), request-list, reschedule-answer (client), reassign-list, allot-trainer-form (client), decline-request-dialog (client), staff-list, invite-staff-dialog (client), remove-staff-button (client), my-gym-booking-list}.tsx}` |
| reviews | `src/features/reviews/{api.ts (loadReviews: reported list, the rest paged, report cases with support.read), actions.ts (moderateReviewAction), schemas.ts (REVIEW_PAGE_SIZE 50, MODERATION_REASON_MAX 500, parseReviewFilters, reviewListHref, EMPTY_REVIEW_FILTERS, toBoolean, moderateReviewSchema), components/{review-list, review-filters, moderate-review-dialog (client)}.tsx}` |

## Stores (`src/stores/`)

| Store | Holds |
|---|---|
| `session-store.ts` + `session-store-provider.tsx` | `access`, `setAccess`, `clear`. One store per request tree via context (a module singleton would share one admin's access across server renders). Read with `useSessionStore`. |
| `command-store.ts` | `paletteOpen`, `shortcutsOpen` and setters (opening one closes the other). A module store: UI state only, changed only by browser events. |
| `toast-store.ts` | Not a store any more: `showToast(tone, message)` is a thin wrapper over sonner's `toast`, kept so features never import sonner directly. |

## Shared components

| Path | Components |
|---|---|
| `src/components/ui/` | CLI-generated shadcn/ui, not edited by hand: `button`, `input`, `label`, `select` (Radix), `checkbox` (Radix; renders a hidden input inside a form), `badge`, `table`, `dialog` (Radix), `dropdown-menu`, `textarea`, `sonner` (`Toaster`, mounted in the root layout with `theme="dark"`), `skeleton`, `separator`, `card`, `command` (cmdk), `sheet`, `kbd` (task 19), `switch` (Radix; settings toggles). The one hand-written file is `empty-state` (a dashed `Card`; shadcn has none). Status badges are `variant="outline"` plus `border-success text-success`, `border-warning text-warning`, `border-destructive text-destructive` or `text-muted-foreground`. |
| `src/components/icons.ts` | Named re-exports of the `react-feather` icons we place (size 16 or 18, stroke 2; `Lock` and `Send` mark notes and replies on support cases; `List`, `Settings`, `Bell` for the catalogue, settings and announcements pages, `Activity` and `BarChart2` for the audit and analytics pages, `Archive` for the privacy queue (sidebar, palette, dashboard tile), `ArrowUp`, `ArrowDown`, `Edit2` in catalogue rows; `Home` for gyms and the gym area, `Upload` for gym photos). Nothing outside `src/components/ui` imports `lucide-react`. |
| `src/lib/utils.ts` | `cn` (CLI-generated; re-exports the `cn` package). Replaces the old `src/lib/utils/cn.ts`. |
| `src/components/rbac/can.tsx` | `<Can permission fallback>` (client) |
| `src/components/layout/` | `admin-shell` (server: sidebar, backdrop, topbar, palette, sheet, shortcuts; nav from `sessionNavItems` with `managesGym` from `getGymScope`; the logo links `homeHref`), `sidebar-nav` (motion `layoutId` active indicator on the longest matching href, "g x" hints, items with a `section` grouped under its heading ("My gym"); the horizontal nav prefixes the section; with `keepGym` (the shell sets it for a manager of more than one gym) the my-gym links carry the current `?gym=`, `navHref`), `topbar` (breadcrumbs, palette trigger, "?" button, name and roles, sign out; mobile nav), `breadcrumbs` (from the path; the my-gym sub-pages by name), `command-palette` (cmdk: permitted pages from `sessionNavItems` (prop `managesGym`; sectioned pages read "My gym: Requests"), quick filters, debounced `listUsersAction` user search with `users.read`, Open support queue and Safety cases `support.read`, New role `rbac.manage`, Invite user `users.manage` disabled with the reason without the service role key, quick filter "Catalogue: cities and areas" `catalogue.manage`, Send an announcement `announcements.send`, quick filter "Analytics: last 7 days" `metrics.read`, quick filter "Privacy: pending requests" `privacy.process`; "Trainers: not listed" needs `trainers.read`), `shortcut-sheet`, `global-shortcuts` (the one window key listener), `page-header` (back link, eyebrow, h1, status, description, actions), `sign-out-button`, `use-apple-platform` |
| `src/components/data-table/` | `data-table` (client: sticky header, in-memory sort with `aria-sort`, result count, hover quick actions, j/k or arrows and Enter on rows, skeleton rows, empty state, first-paint stagger), `filter-chips` (link or toggle chips, clear all), `page-links` (previous and next links for URL-paged lists; bookings, reviews) |
| `src/components/motion/` | `fade-in`, `stagger-list` (`StaggerList`, `StaggerItem`; 40 ms, first paint only), `count-up` (600 ms ease-out; markup always holds the real value), `status-pulse` (one ring when the value changes after a server response), `use-reduced-motion` (live `matchMedia`, so tests can toggle it). Every one renders the final state under `prefers-reduced-motion`; animated elements carry `data-motion` so the CSS override in `globals.css` applies before scripts run. |
| `src/components/art/` | `silhouettes` (runner, boxer, kettlebell swing, plank, dumbbell, jump rope as single-stroke `<g>` glyphs on a 64 grid, `currentColor`; `Silhouette` for standalone use), `backdrop` (one SVG pattern of the glyphs with rotation and scale variance at `BACKDROP_OPACITY` 0.045 plus the accent glow top-left; `aria-hidden`, `pointer-events: none`, behind the content column; contrast worked in the file comment, darkest text 5.7:1 at the lightest spot) |
| `src/lib/shortcuts.ts` | `SHORTCUTS`, `SHORTCUT_GROUPS`, `GO_TO_TARGETS` (g then d/a/u/r), `matchShortcut(input, state, now, typing)` (pure; Mod+K, "/", "?", "g" sequence within `SEQUENCE_TIMEOUT_MS`, j/k), `isTypingTarget`, `keyLabel` |
| `src/components/avatar/avatar.tsx` | `Avatar` (client, decorative, sizes sm 24 / md 32 / lg 56): photo, then preset, then initials; a source that fails to load falls through to the next. Presets render as a plain `<img>` with the relative `/avatars/<key>.svg` (next/image made it absolute from the request origin, http behind the preview proxy, so https pages showed mixed content); photos keep `next/image` `unoptimized`. Hand-written: shadcn's Avatar shows one image and only after the browser loaded it. Used in the users, trainers, bookings and support tables, review cards, the user 360 header, booking parties and the support case header and target card |
| `src/lib/utils/avatar.ts` | `AVATAR_PRESET_KEYS` (the twelve server keys), `AvatarRef`, `toAvatarRef`, `avatarPhotoUrl` (public `avatars` bucket URL from `NEXT_PUBLIC_SUPABASE_URL`), `avatarPresetUrl`, `avatarSources`, `avatarInitials` (pure) |
| `public/avatars/<key>.svg` | The twelve preset discs, copied from `../app-fe-flutter/assets/avatars/`; change both together |
| `src/lib/utils/time.ts` | `currentTime`, `daysAgoIso`, `istDayRange`, `istDateString`, `isIsoDate`, `istDatesToRange` (India dates to a UTC range, end exclusive), `istHour`, `formatRelativeTime`, `formatWaiting` (India time; the clock is read here, not in components) |

## Theme

`src/app/globals.css` defines the shadcn variables once, in `:root`, with the brand values; dark
is the only theme (`<html class="dark">` turns on the generated components' `dark:` variants;
there is no light set and no `.dark` block). `background #161616`, `foreground`, `card`
(surface), `popover` (raised surface), `primary #FF5656` with `primary-foreground #161616`
(4.5:1; primary actions and the active nav item only), `secondary`, `muted`, `accent` (in
shadcn this is the neutral hover surface, not the brand accent), `muted-foreground`,
`destructive`, `border`, `input` (stronger border), `ring #FF5656`, plus `success` and
`warning`; `--radius 0.5rem`. Task 19 adds `surface-raised` (hovered rows and tiles), `shadow-tile`
and `shadow-tile-hover`, `glow` (accent at 14%, used by the `glow-radial` utility), the
`focus-ring` utility (2px `ring` outline, 2px offset), dialogs entering from scale 0.98, and a
`prefers-reduced-motion` block that ends every animation at once and shows `[data-motion]`
elements in their final state. `@theme inline` maps them to utilities; the default Tailwind
palette is cleared except `white` and `black`, which the generated overlay and destructive
styles use. Montserrat through `next/font/google` as `--font-sans`. Charts (adminops task 09) use `chart-1` to `chart-4` (`#3987e5`, `#d95926`, `#199e70`, `#c98500`, in that fixed order, validated as a set on the card surface: colour-blind neighbour separation 8.4, all 3:1) and `chart-grid` for hairlines; text in charts stays in `foreground` and `muted-foreground`.

## Environment

`.env.example` (committed, un-ignored in `.gitignore`): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY=` (server only).
`.env.local` holds the same with the public values filled; gitignored.

Hosted: Vercel project `app-admin-nextjs` (team `purvikbrutal`), `main` to
https://admin.brutal.fit (production), `dev` to https://admin-dev.brutal.fit (preview pinned
to the branch). The two public variables are set for Production and Preview; the service role
key is not set. With `cacheComponents` on, `/roles/[id]` runs its session gate during the build
prerender, so a missing public variable fails the build instead of the request (see README,
Deploy).

Headers (`next.config.ts` `headers()`, every path `/(.*)`): `Content-Security-Policy:
upgrade-insecure-requests` and `X-Content-Type-Options: nosniff`; no CSP allowlists yet.
Asserted by `test/next-config.test.ts`.
