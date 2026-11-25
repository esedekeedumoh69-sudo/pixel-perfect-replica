# LightGrab Office

Private operations app for LightGrab staff in Oron, Akwa Ibom. It covers orders, market procurement, manual courier assignment, deliveries, cash payments, staff roles, device sessions, notifications, printing and audit history.

## Access and security

- There is no public staff sign-up. An administrator creates each staff account.
- Staff sign in with their work email and password; password resets are handled by an administrator.
- Every login is tied to a registered device session. Suspension, password resets and device revocation take effect in the backend.
- Business changes use permission-checked backend functions. Money is stored as integer kobo, and order totals are calculated by the backend.
- Cash on delivery can be switched off in Staff & settings. Paystack online charging is not connected yet; Payments currently supports manual and cash records only.

## Development

This is a TanStack Start + React project using Lovable Cloud.

```sh
bun install
bun run dev
```

Useful checks:

```sh
bunx vitest run
bunx tsgo -b --noEmit
```

## Windows app

The Windows wrapper must load the **published** LightGrab Office address. A bundled offline copy is not suitable because protected staff administration uses server-only credentials, which must never be included in a downloadable desktop app.

Publish the app before packaging. The desktop app requires an internet connection and uses the same staff accounts, permissions and device-session controls as the web app.
