# LightGrab Office — Architecture & Build Plan

## What we are building

A private desktop operations app for LightGrab office staff in Oron. Staff sign in on any authorised laptop, manage orders, buy goods at the market, assign couriers by hand, track deliveries and check payments. This project also becomes the **central LightGrab backend** (on Lovable Cloud). The Admin dashboard, the Customer app and the Courier app connect to it later.

## Who can do what

- **No public sign-up.** The first Office Manager account is created by me during setup; after that, accounts are created only by an admin.
- **Admin-only actions** (create/invite staff, assign roles, suspend, reactivate, reset passwords, end sessions) are offered as secure web addresses (endpoints) that the Admin dashboard calls. Until the Admin dashboard is connected, a small locked "Staff Accounts" page here, visible only to admins, does the same job. It is not a full admin system.
- **Roles are editable, not fixed.** We start with Office Manager, Order Manager, Procurement Staff, Courier Coordinator, Finance Staff and Read-only Operations. Each role is a set of permissions (for example "assign couriers" or "verify payments"). The backend checks every action, not just the screen.

## Sign-in and sessions

1. The app opens on the sign-in screen: logo, email, password with show/hide, and clear error messages.
2. After a correct password, the backend checks that the account is **active** and has a role. Suspended or role-less accounts are refused with a clear message.
3. Each sign-in is recorded with: the user, a device ID unique to that laptop install, the time and the status.
4. **Session storage:** on the desktop the session is encrypted with Windows' secure credential storage, so staff stay signed in between launches. Passwords are never stored.
5. **Revoke / suspend:** if an admin ends a session or suspends an account, the app finds out instantly and returns to sign-in with an explanation.
6. **Offline:** without internet, nothing is cached or bypassed. A "No connection" screen appears and the app retries.

## Screens (left sidebar)

- **Dashboard:** live counts (new, awaiting confirmation, awaiting procurement, processing, awaiting courier, out for delivery, completed, cancelled), a payment summary and alerts.
- **Orders:** search, filters by status and payment, sorting, status badges. The order detail shows the customer, shopping list, delivery address with map pin, instructions, payment, history and notes.
- **Procurement:** per-item actual price, unavailable, substitution (with customer approval request), progress, goods subtotal and internal notes. Print a market list for runners: order number, items, quantities, units and instructions, with no customer personal details.
- **Couriers:** approved and active couriers with availability and current load. Staff pick a courier, select one or many orders and confirm. Never automatic.
- **Deliveries:** assignments, status timeline, location updates only when the courier app reports them, and issues.
- **Payments:** Paystack references, verification status, history and reconciliation. A payment is only marked paid after Paystack confirms it. Cash on delivery can be switched on or off.
- **Profile:** your own details. You can only edit permitted fields, and you can change your password.
- **Printing:** order summary, procurement list and customer receipt (A4 and 80mm receipt-printer layouts).
- **Notifications:** a toast and a bell list for new orders, changes, assignments, delivery and payment updates.

Empty, error and permission-denied states are designed for every screen. No made-up numbers: until the Customer app sends real orders, screens show empty states. Test orders will be added only if you ask, clearly labelled and removable.

## Fees

Courier fee ₦1,500 and service fee 15% of goods subtotal are stored as **settings**, not in code. The backend calculates every total (goods subtotal, service fee, courier fee, discount, final amount), so all apps show the same figures.

## Brand

Warm Cream background (#F2E8CF), Midnight Navy headings (#14213D), Forest Green buttons (#386641), Leaf Green highlights (#A7C957), White cards. A clean, dense operations layout. Your uploaded LightGrab logo will be used on sign-in, the sidebar, printouts and the app icon.

## Desktop delivery

- I build and test the app here in the preview, then package a **Windows app (zip)** you can download and run.
- A full **.exe installer** cannot be generated here. I will include a ready installer config and step-by-step instructions to produce it in VS Code with one command.
- The source includes setup docs, a `.env.example` template without secrets, and build and testing instructions.

## Build order (each step is a separate round)

1. Backend foundation: tables, roles and permissions, security rules, settings, audit log and first Office Manager account.
2. Sign-in, sessions, device tracking, revoke/suspend handling and the app shell with sidebar.
3. Dashboard and Orders.
4. Procurement and printing.
5. Courier assignment and Deliveries.
6. Payments (Paystack — I will ask for your Paystack secret key at this step).
7. Notifications and real-time updates.
8. Admin endpoints and the temporary Staff Accounts page, plus security tests.
9. Electron desktop packaging (Windows zip, installer config) and documentation.

---

## Technical details

**Backend authority.** Business rules live in Postgres: RLS on every table plus `SECURITY DEFINER` RPCs (`assign_courier`, `record_procurement`, `compute_order_totals`, `request_substitution_approval`, …). Each RPC calls `has_permission(auth.uid(), '<perm>')`, which also returns false for suspended staff or revoked devices. The desktop client is then a static SPA using only the publishable key. Server routes on the hosted app are used only where secrets are needed:

- `/api/public/paystack/webhook`: signature verified, then marks the payment verified.
- `/api/public/admin/*`: the bearer JWT is verified and the caller must have `staff.manage`. It uses the service role server-side for auth user create/invite/ban and refresh-token revocation.

**Tables (public schema, all with GRANTs + RLS):**
`staff_profiles` (user_id, full_name, phone, status active|suspended), `roles`, `permissions`, `role_permissions`, `staff_roles`, `device_sessions` (user_id, device_id, device_name, signed_in_at, last_seen_at, status active|revoked|signed_out), `audit_logs`, `app_settings` (courier_fee_kobo, service_fee_bps, cash_enabled), `customers`, `orders` (order_number, status enum, payment_method, payment_status, address, lat/lng, instructions, procurement_notes, totals), `order_items` (name, qty, unit, target_price, actual_price, availability, substitution, approval_status), `order_events`, `procurement_assignments`, `couriers` (approval_status, is_active, availability), `courier_assignments`, `delivery_events`, `payments` (provider, reference, amount, status, verified_at, raw), `notifications`.
Money is stored in kobo (integers).

**Realtime:** `orders`, `order_items`, `courier_assignments`, `delivery_events`, `payments`, `device_sessions` (for instant revocation of the current device) and `notifications`.

**Desktop:** Electron `main.cjs` + `preload.cjs` with `contextIsolation`, no node integration. A custom Supabase auth storage adapter goes through IPC to `safeStorage` (DPAPI on Windows), falling back to in-memory storage in the web preview. The device ID is generated once per install and stored in `userData`. The Electron build uses a client-only SPA output with hash history so it runs under `file://`. Packaging uses `@electron/packager --platform=win32`, and an `electron-builder` NSIS config is included for VS Code.

**Docs shipped:** `docs/ARCHITECTURE.md`, `AUTH.md`, `DATABASE.md` (tables, relations, roles, permissions, RPC contracts, realtime events, migrations), `BUILD-WINDOWS.md`, `TESTING.md` and `.env.example`.

**Not claimed until tested:** Paystack verification, the Customer/Courier app integration and the Admin dashboard integration are labelled "pending" in docs and UI until they are connected and exercised.