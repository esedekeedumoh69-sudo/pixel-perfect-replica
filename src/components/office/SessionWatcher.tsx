import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";
import { useSignOut } from "@/hooks/use-sign-out";
import type { DenyReason } from "@/lib/access";

const HEARTBEAT_MS = 60_000;

/**
 * Keeps the session honest: listens for admin revocation / suspension in real time, sends a heartbeat,
 * and blocks the screen while offline (no offline bypass).
 */
export function SessionWatcher() {
  const { access } = useAccess();
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(typeof navigator !== "undefined" ? !navigator.onLine : false);
  const ending = useRef(false);

  const force = (reason: DenyReason) => {
    if (ending.current) return;
    ending.current = true;
    void signOut({ reason, endSession: false });
  };

  useEffect(() => {
    const channel = supabase
      .channel(`session-watch-${access.deviceSessionId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "device_sessions", filter: `id=eq.${access.deviceSessionId}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status === "revoked") force("revoked");
          else if (status === "signed_out") force("signed_out");
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "staff_profiles", filter: `user_id=eq.${access.user_id}` },
        (payload) => {
          const status = (payload.new as { status?: string }).status;
          if (status === "suspended") force("suspended");
          else void queryClient.invalidateQueries({ queryKey: ["access"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.deviceSessionId, access.user_id]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const beat = async () => {
      if (!navigator.onLine) return;
      const { data, error } = await supabase.rpc("touch_device_session");
      if (error) return; // transient; offline overlay handles connectivity
      if (data === "active") return;
      if (data === "suspended") force("suspended");
      else if (data === "revoked") force("revoked");
      else if (data === "not_staff") force("not_staff");
      else force("signed_out");
    };
    timer = setInterval(beat, HEARTBEAT_MS);
    void beat();
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const on = () => {
      setOffline(false);
      void queryClient.invalidateQueries();
    };
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [queryClient]);

  if (!offline) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/70 px-6 backdrop-blur-sm no-print">
      <div className="max-w-sm rounded-2xl bg-card p-8 text-center shadow-raised">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-destructive">
          <WifiOff className="size-6" />
        </div>
        <h2 className="font-display text-xl font-bold text-navy">You're offline</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          LightGrab Office needs internet to show live orders. We'll reconnect automatically.
        </p>
      </div>
    </div>
  );
}
