<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## LightGrab Office rules
- Every staff login must call `register_device_session` before any data access; RLS (`is_active_staff`/`has_permission`) requires the JWT `session_id` to match an active `device_sessions` row. Why: per-device revocation and suspension are enforced in the database, not the UI.
- Business writes go through SECURITY DEFINER RPCs that call `require_permission`; tables only grant SELECT to `authenticated`. Why: the backend, not the client, authorises every operation.
- Money is stored as integer kobo; order totals are computed only by `recompute_order_totals`. Why: one source of truth across Office, Admin, Customer and Courier apps.
- The Windows wrapper loads the published app over HTTPS rather than bundling server code. Why: protected staff administration requires server-only credentials that must never ship in a desktop download.
