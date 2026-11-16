import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/hooks/use-access";

/** One shared subscription that refreshes affected screens whenever operational data changes. */
export function RealtimeSync() {
  const queryClient = useQueryClient();
  const { access } = useAccess();

  useEffect(() => {
    const invalidate = (...keys: string[]) => {
      for (const k of keys) void queryClient.invalidateQueries({ queryKey: [k] });
    };
    const channel = supabase
      .channel(`ops-sync-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () =>
        invalidate("orders", "dashboard", "deliveries"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () =>
        invalidate("orders", "dashboard"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_assignments" }, () =>
        invalidate("deliveries", "couriers", "orders", "dashboard"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_events" }, () =>
        invalidate("deliveries", "dashboard"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () =>
        invalidate("payments", "orders", "dashboard"),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "couriers" }, () =>
        invalidate("couriers", "deliveries", "dashboard"),
      )
      .subscribe();

    const notif = supabase
      .channel(`notif-${access.user_id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${access.user_id}` },
        (payload) => {
          const n = payload.new as { title: string; body: string | null; kind: string };
          invalidate("notifications");
          if (n.kind === "delivery.issue" || n.kind === "payment.failed") toast.error(n.title, { description: n.body ?? undefined });
          else toast(n.title, { description: n.body ?? undefined });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(notif);
    };
  }, [queryClient, access.user_id]);

  return null;
}
