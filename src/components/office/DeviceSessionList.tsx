import { Laptop } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

const REASONS: Record<string, string> = {
  revoked_by_admin: "Ended by an administrator",
  signed_out_by_self: "Signed out remotely",
  account_suspended: "Account suspended",
  password_reset: "Password was reset",
};

export function DeviceSessionList({ sessions, currentId }: { sessions: Tables<"device_sessions">[]; currentId?: string }) {
  const revoke = useAction((id: string) => supabase.rpc("revoke_device_session", { _session_id: id }), {
    success: "Device signed out",
    invalidate: ["sessions"],
  });
  if (sessions.length === 0) return <p className="text-sm text-muted-foreground">No sign-ins recorded.</p>;
  return (
    <ul className="divide-y">
      {sessions.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
          <Laptop className="size-5 text-muted-foreground" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium text-navy">
              {s.device_name || "Unknown device"}
              {s.id === currentId && <Badge variant="leaf" className="ml-2">This device</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">
              {s.platform ?? "—"} · signed in {formatDateTime(s.signed_in_at)} · last seen {timeAgo(s.last_seen_at)}
              {s.status !== "active" && s.ended_reason && ` · ${REASONS[s.ended_reason] ?? s.ended_reason.replace(/_/g, " ")}`}
            </p>
          </div>
          <Badge variant={s.status === "active" ? "success" : "neutral"} className="capitalize">
            {s.status.replace("_", " ")}
          </Badge>
          {s.status === "active" && s.id !== currentId && (
            <Button size="sm" variant="outline" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
              Sign out
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
