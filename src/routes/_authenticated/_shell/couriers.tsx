import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bike, Inbox, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { PaymentStatusBadge } from "@/components/office/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/hooks/use-access";
import { useAction } from "@/hooks/use-action";
import { awaitingCourierQuery, couriersQuery } from "@/lib/queries";
import { formatNaira, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_shell/couriers")({
  head: () => ({ meta: [{ title: "Couriers — LightGrab Office" }] }),
  component: CouriersPage,
});

const ACTIVE = ["assigned", "accepted", "picked_up"];
const AVAIL_TONE = { available: "success", busy: "warning", offline: "neutral" } as const;

function CouriersPage() {
  const { can } = useAccess();
  if (!can("couriers.view")) return <PermissionDenied what="couriers" />;
  return <CouriersBody />;
}

function CouriersBody() {
  const { can } = useAccess();
  const canAssign = can("couriers.assign");
  const orders = useQuery({ ...awaitingCourierQuery(), enabled: can("orders.view") });
  const couriers = useQuery(couriersQuery());
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [courierId, setCourierId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  const list = useMemo(
    () =>
      (couriers.data ?? []).map((c) => ({
        ...c,
        load: (c.courier_assignments ?? []).filter((a) => ACTIVE.includes(a.status)).length,
        eligible: c.approval_status === "approved" && c.is_active,
      })),
    [couriers.data],
  );
  const eligible = list.filter((c) => c.eligible);
  const others = list.filter((c) => !c.eligible);
  const chosen = eligible.find((c) => c.id === courierId);
  const ids = Object.keys(selected);

  const assign = useAction(
    () =>
      supabase.rpc("assign_courier", {
        _courier_id: courierId!,
        _order_ids: ids,
        _package_counts: ids.map((id) => selected[id] ?? 1),
        _notes: notes.trim(),
      }),
    {
      success: (n) => `${n ?? ids.length} order(s) assigned to ${chosen?.full_name ?? "courier"}`,
      invalidate: ["orders", "couriers", "deliveries", "dashboard"],
    },
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = { ...s };
      if (id in n) delete n[id];
      else n[id] = 1;
      return n;
    });

  return (
    <>
      <PageHeader title="Couriers" description="Pick the orders, pick a courier, confirm. Couriers are never assigned automatically." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card className="min-w-0 p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-navy">Waiting for a courier</h2>
          {!can("orders.view") ? (
            <p className="text-sm text-muted-foreground">Your role can't see orders.</p>
          ) : orders.isError ? (
            <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
          ) : !orders.data ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : orders.data.length === 0 ? (
            <EmptyState icon={Inbox} title="No orders waiting" body="Orders appear here when procurement is complete." />
          ) : (
            <ul className="divide-y">
              {orders.data.map((o) => {
                const on = o.id in selected;
                return (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-3">
                    {canAssign && <Checkbox checked={on} onCheckedChange={() => toggle(o.id)} aria-label={`Select ${o.order_number}`} />}
                    <div className="min-w-0 flex-1">
                      <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono font-semibold text-navy hover:underline">
                        {o.order_number}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">
                        {o.delivery_address}
                        {o.delivery_landmark && ` · ${o.delivery_landmark}`}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold tabular">{formatNaira(o.total_kobo)}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</p>
                    </div>
                    <PaymentStatusBadge status={o.payment_status} />
                    {on && (
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Packages
                        <Input
                          type="number"
                          min={1}
                          max={50}
                          value={selected[o.id]}
                          onChange={(e) => setSelected((s) => ({ ...s, [o.id]: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))}
                          className="h-8 w-16"
                          aria-label={`Packages for ${o.order_number}`}
                        />
                      </label>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-navy">Approved couriers</h2>
            {couriers.isError ? (
              <ErrorState error={couriers.error} onRetry={() => couriers.refetch()} />
            ) : !couriers.data ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : eligible.length === 0 ? (
              <EmptyState
                icon={Bike}
                title="No approved couriers yet"
                body="Couriers sign up in the LightGrab Courier app and are approved in the Admin dashboard."
              />
            ) : (
              <ul className="space-y-2">
                {eligible.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={!canAssign}
                      onClick={() => setCourierId(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition",
                        courierId === c.id ? "border-primary bg-accent ring-2 ring-primary/30" : "hover:border-primary/40",
                      )}
                    >
                      <div className="grid size-9 place-items-center rounded-full bg-navy text-navy-foreground">
                        <Bike className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-navy">{c.full_name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          {c.phone && (
                            <>
                              <Phone className="size-3" /> {c.phone} ·
                            </>
                          )}{" "}
                          {c.vehicle ?? "Vehicle not set"}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={AVAIL_TONE[c.availability]} className="capitalize">
                          {c.availability}
                        </Badge>
                        <p className="mt-1 text-xs text-muted-foreground">{c.load} active</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {canAssign && (
              <Button className="mt-4 w-full" disabled={!chosen || ids.length === 0} onClick={() => setConfirm(true)}>
                {chosen && ids.length
                  ? `Assign ${ids.length} order(s) to ${chosen.full_name}`
                  : "Select orders and a courier"}
              </Button>
            )}
          </Card>

          {others.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-display text-base font-semibold text-navy">Not available for assignment</h2>
              <ul className="space-y-1.5 text-sm">
                {others.map((c) => (
                  <li key={c.id} className="flex justify-between gap-2">
                    <span>{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.approval_status !== "approved" ? `Approval ${c.approval_status}` : "Deactivated"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm courier assignment</DialogTitle>
            <DialogDescription>
              {ids.length} order(s) → {chosen?.full_name}. The courier sees them in the Courier app.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-40 space-y-1 overflow-auto text-sm">
            {(orders.data ?? [])
              .filter((o) => o.id in selected)
              .map((o) => (
                <li key={o.id} className="flex justify-between">
                  <span className="font-mono">{o.order_number}</span>
                  <span className="text-muted-foreground">{selected[o.id]} package(s)</span>
                </li>
              ))}
          </ul>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Notes for the courier (optional)" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Back
            </Button>
            <Button
              disabled={assign.isPending}
              onClick={() =>
                assign.mutate(undefined, {
                  onSuccess: () => {
                    setConfirm(false);
                    setSelected({});
                    setNotes("");
                  },
                })
              }
            >
              {assign.isPending ? "Assigning…" : "Confirm assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
