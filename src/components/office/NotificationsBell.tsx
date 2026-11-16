import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notificationsQuery } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const queryClient = useQueryClient();
  const { data = [], isError } = useQuery(notificationsQuery());
  const unread = data.filter((n) => !n.read_at).length;

  const markAll = async () => {
    await supabase.rpc("mark_notifications_read", { _ids: data.filter((n) => !n.read_at).map((n) => n.id) });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unread} unread)`}>
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-display font-semibold text-navy">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {isError ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Couldn't load notifications.</p>
          ) : data.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            <ul className="divide-y">
              {data.map((n) => (
                <li key={n.id} className={cn("px-4 py-3 text-sm", !n.read_at && "bg-accent/40")}>
                  {n.entity_type === "order" && n.entity_id ? (
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: n.entity_id }}
                      className="font-semibold text-navy hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="font-semibold text-navy">{n.title}</p>
                  )}
                  {n.body && <p className="text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
