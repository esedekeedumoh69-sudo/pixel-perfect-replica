import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Bike,
  CheckCheck,
  ClipboardCheck,
  ExternalLink,
  MapPin,
  PackageX,
  Pencil,
  Printer,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import {
  ApprovalBadge,
  AssignmentStatusBadge,
  AvailabilityBadge,
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/office/StatusBadge";
import { ItemProcurementDialog } from "@/components/office/actions/ItemProcurementDialog";
import { OrderStatusDialog } from "@/components/office/actions/OrderStatusDialog";
import { CashPaymentDialog } from "@/components/office/actions/CashPaymentDialog";
import { AssignRunnerDialog } from "@/components/office/actions/AssignRunnerDialog";
import { ReportIssueDialog } from "@/components/office/actions/ReportIssueDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/hooks/use-access";
import { useAction } from "@/hooks/use-action";
import { type OrderDetail, orderDeliveryQuery, orderDetailQuery, orderPaymentsQuery, settingsQuery } from "@/lib/queries";
import { formatDateTime, formatNaira, formatQty } from "@/lib/format";
import { ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/lib/status";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/_shell/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order — LightGrab Office" }] }),
  component: OrderPage,
});

const PROCUREMENT_OPEN = ["new", "awaiting_confirmation", "awaiting_procurement", "processing"];

function OrderPage() {
  const { can } = useAccess();
  if (!can("orders.view")) return <PermissionDenied what="orders" />;
  return <OrderBody />;
}

function OrderBody() {
  const { orderId } = Route.useParams();
  const { can } = useAccess();
  const detail = useQuery(orderDetailQuery(orderId));

  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (detail.isPending) return <div className="h-64 animate-pulse rounded-xl bg-card/70" />;
  if (!detail.data)
    return (
      <EmptyState
        icon={PackageX}
        title="Order not found"
        body="It may have been removed, or the link is wrong."
        action={
          <Button asChild variant="outline">
            <Link to="/orders">Back to orders</Link>
          </Button>
        }
      />
    );

  const { order, items, events } = detail.data;
  const closed = order.status === "completed" || order.status === "cancelled";
  const procurementOpen = PROCUREMENT_OPEN.includes(order.status);
  const canRecord = can("procurement.record") && procurementOpen;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/orders" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy">
            <ArrowLeft className="size-4" /> Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-3xl font-bold text-navy">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.payment_status} />
            {order.is_test && <Badge variant="outline">Test order</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed {formatDateTime(order.created_at)} · {order.payment_method === "cash" ? "Cash on delivery" : "Paystack"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrintMenu orderId={order.id} />
          {can("orders.update_status") && !closed && (
            <OrderStatusDialog orderId={order.id} current={order.status} paymentStatus={order.payment_status}>
              <Button>
                <RefreshCw /> Change status
              </Button>
            </OrderStatusDialog>
          )}
        </div>
      </div>

      {order.status === "cancelled" && order.cancel_reason && (
        <div className="rounded-xl border border-destructive/30 bg-danger-soft p-4 text-sm text-navy">
          <span className="font-semibold">Cancelled:</span> {order.cancel_reason}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ShoppingList order={order} items={items} canRecord={canRecord} />
          <Totals order={order} />
          <Notes order={order} />
          <History events={events} />
        </div>
        <div className="space-y-6">
          <CustomerCard order={order} />
          <DeliveryCard order={order} />
          <ProcurementCard order={order} items={items} />
          {can("payments.view") && <PaymentCard order={order} />}
          {(can("deliveries.view") || can("couriers.view")) && <CourierCard order={order} />}
        </div>
      </div>
    </div>
  );
}

type OrderRow = OrderDetail["order"];

function PrintMenu({ orderId }: { orderId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Printer /> Print
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Print documents</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/print/order/$orderId" params={{ orderId }} search={{ doc: "summary", size: "a4" }} target="_blank">
            Order summary (A4)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/print/market" search={{ ids: orderId }} target="_blank">
            Market list for runner (A4)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/print/order/$orderId" params={{ orderId }} search={{ doc: "receipt", size: "80mm" }} target="_blank">
            Customer receipt (80mm printer)
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/print/order/$orderId" params={{ orderId }} search={{ doc: "receipt", size: "a4" }} target="_blank">
            Customer receipt (A4)
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="font-display text-lg font-semibold text-navy">{children}</h2>
      {action}
    </div>
  );
}

function ShoppingList({ order, items, canRecord }: { order: OrderRow; items: Tables<"order_items">[]; canRecord: boolean }) {
  const done = items.filter((i) => i.availability !== "pending").length;
  return (
    <Card className="p-5">
      <SectionTitle
        action={
          <span className="text-sm text-muted-foreground tabular">
            {done}/{items.length} recorded
          </span>
        }
      >
        Shopping list
      </SectionTitle>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">This order has no items.</p>
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Guide</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead>Status</TableHead>
                {canRecord && <TableHead className="pr-5" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="pl-5">
                    <span className={i.availability === "unavailable" ? "text-muted-foreground line-through" : "font-medium"}>
                      {i.name}
                    </span>
                    {i.availability === "substituted" && i.substitute_name && (
                      <span className="block text-xs text-warning">→ {i.substitute_name}</span>
                    )}
                    {i.procurement_note && <span className="block text-xs text-muted-foreground">{i.procurement_note}</span>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular">
                    {formatQty(i.quantity)} {i.unit}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground tabular">{formatNaira(i.target_price_kobo)}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNaira(lineCharge(i))}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <AvailabilityBadge status={i.availability} />
                      <ApprovalBadge status={i.approval_status} />
                    </div>
                    {i.approval_status === "pending" && <SubstitutionAnswer item={i} />}
                  </TableCell>
                  {canRecord && (
                    <TableCell className="pr-5 text-right">
                      <ItemProcurementDialog item={i}>
                        <Button size="sm" variant="outline" aria-label={`Record ${i.name}`}>
                          <Pencil /> Record
                        </Button>
                      </ItemProcurementDialog>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {order.customer_instructions && (
        <div className="mt-4 rounded-lg bg-accent p-3 text-sm">
          <span className="font-semibold text-navy">Customer instructions: </span>
          {order.customer_instructions}
        </div>
      )}
    </Card>
  );
}


/** Mirrors the backend's item_line_kobo for display only. */
function lineCharge(i: Tables<"order_items">): number {
  if (i.availability === "found") return i.actual_price_kobo ?? 0;
  if (i.availability === "substituted") return i.approval_status === "rejected" || i.approval_status === "pending" ? 0 : (i.substitute_price_kobo ?? 0);
  if (i.availability === "pending") return i.target_price_kobo ?? 0;
  return 0;
}

function SubstitutionAnswer({ item }: { item: Tables<"order_items"> }) {
  const answer = useAction(
    (approval: "approved" | "rejected") =>
      supabase.rpc("set_substitution_approval", { _item_id: item.id, _approval: approval, _note: "" }),
    { success: "Customer's answer recorded" },
  );
  return (
    <div className="mt-1.5 flex gap-1">
      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={answer.isPending} onClick={() => answer.mutate("approved")}>
        Customer approved
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" disabled={answer.isPending} onClick={() => answer.mutate("rejected")}>
        Rejected
      </Button>
    </div>
  );
}

function Totals({ order }: { order: OrderRow }) {
  const rows: [string, number, string?][] = [
    ["Goods subtotal", order.goods_subtotal_kobo],
    [`Service fee (${order.service_fee_bps / 100}%)`, order.service_fee_kobo],
    ["Courier fee", order.courier_fee_kobo],
  ];
  if (order.discount_kobo > 0) rows.push(["Discount", -order.discount_kobo]);
  return (
    <Card className="p-5">
      <SectionTitle>Totals</SectionTitle>
      <dl className="space-y-1.5 text-sm">
        {rows.map(([label, v]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular">{v < 0 ? "−" + formatNaira(-v) : formatNaira(v)}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t pt-2 text-base font-bold text-navy">
          <dt>Total</dt>
          <dd className="tabular">{formatNaira(order.total_kobo)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Calculated by the LightGrab backend from recorded prices.</p>
    </Card>
  );
}

function Notes({ order }: { order: OrderRow }) {
  const { can } = useAccess();
  const canInternal = can("orders.edit_notes");
  const canProc = can("procurement.record");
  const [internal, setInternal] = useState(order.internal_notes ?? "");
  const [proc, setProc] = useState(order.procurement_notes ?? "");
  const save = useAction(
    () => supabase.rpc("update_order_notes", { _order_id: order.id, _internal_notes: internal, _procurement_notes: proc }),
    { success: "Notes saved" },
  );
  const dirty = internal !== (order.internal_notes ?? "") || proc !== (order.procurement_notes ?? "");
  return (
    <Card className="p-5">
      <SectionTitle
        action={
          (canInternal || canProc) && (
            <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)}>
              {save.isPending ? "Saving…" : "Save notes"}
            </Button>
          )
        }
      >
        Internal notes
      </SectionTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="internal">Office notes</Label>
          <Textarea id="internal" rows={4} value={internal} onChange={(e) => setInternal(e.target.value)} disabled={!canInternal} maxLength={4000} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proc">Procurement notes</Label>
          <Textarea id="proc" rows={4} value={proc} onChange={(e) => setProc(e.target.value)} disabled={!canProc} maxLength={4000} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Staff only — never shown to the customer.</p>
    </Card>
  );
}

const EVENT_LABELS: Record<string, string> = {
  created: "Order received",
  status_changed: "Status changed",
  notes_updated: "Notes updated",
  item_found: "Item bought",
  item_unavailable: "Item unavailable",
  item_substituted: "Substitution proposed",
  item_pending: "Item reset",
  substitution_approved: "Customer approved substitution",
  substitution_rejected: "Customer rejected substitution",
  procurement_assigned: "Procurement assigned",
  procurement_in_progress: "Procurement in progress",
  procurement_done: "Procurement complete",
  courier_assigned: "Courier assigned",
  courier_unassigned: "Courier unassigned",
  cash_received: "Cash received",
};

function History({ events }: { events: Tables<"order_events">[] }) {
  return (
    <Card className="p-5">
      <SectionTitle>History</SectionTitle>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-primary" />
              <p className="text-sm font-medium text-navy">
                {EVENT_LABELS[e.event_type] ?? e.event_type.replace(/_/g, " ")}
                {e.to_status && e.event_type === "status_changed" && <> → {ORDER_STATUS_META[e.to_status].label}</>}
              </p>
              {e.message && <p className="text-sm text-muted-foreground">{e.message}</p>}
              <p className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</p>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function CustomerCard({ order }: { order: OrderRow }) {
  const { can } = useAccess();
  return (
    <Card className="p-5">
      <SectionTitle>Customer</SectionTitle>
      {!can("customers.view") ? (
        <p className="text-sm text-muted-foreground">Customer contact details are hidden for your role.</p>
      ) : order.customer ? (
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
            <UserRound className="size-5" />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-navy">{order.customer.full_name}</p>
            {order.customer.phone && (
              <a href={`tel:${order.customer.phone}`} className="block text-primary hover:underline">
                {order.customer.phone}
              </a>
            )}
            {order.customer.email && <p className="text-muted-foreground">{order.customer.email}</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No customer linked.</p>
      )}
    </Card>
  );
}

function DeliveryCard({ order }: { order: OrderRow }) {
  const hasPin = order.delivery_lat !== null && order.delivery_lng !== null;
  const lat = order.delivery_lat ?? 0;
  const lng = order.delivery_lng ?? 0;
  const d = 0.004;
  return (
    <Card className="overflow-hidden p-0">
      {hasPin && (
        <iframe
          title="Delivery location"
          className="h-44 w-full border-0"
          loading="lazy"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d},${lat - d},${lng + d},${lat + d}&layer=mapnik&marker=${lat},${lng}`}
        />
      )}
      <div className="p-5">
        <SectionTitle>Delivery</SectionTitle>
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {order.delivery_address || "No address given"}
            {order.delivery_landmark && <span className="block text-muted-foreground">Landmark: {order.delivery_landmark}</span>}
          </span>
        </p>
        {hasPin ? (
          <a
            href={`https://www.google.com/maps?q=${lat},${lng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open map pin <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">The customer didn't drop a map pin.</p>
        )}
      </div>
    </Card>
  );
}

function ProcurementCard({ order, items }: { order: OrderRow; items: Tables<"order_items">[] }) {
  const { can } = useAccess();
  const p = order.procurement;
  const open = PROCUREMENT_OPEN.includes(order.status);
  const pending = items.filter((i) => i.availability === "pending").length;
  const subs = items.filter((i) => i.approval_status === "pending").length;
  const complete = useAction(() => supabase.rpc("complete_procurement", { _order_id: order.id }), {
    success: "Procurement complete — order is now waiting for a courier",
  });
  return (
    <Card className="p-5">
      <SectionTitle
        action={
          can("procurement.assign") &&
          open && (
            <AssignRunnerDialog orderId={order.id} orderNumber={order.order_number} current={p}>
              <Button size="sm" variant="outline">
                {p ? "Reassign" : "Assign"}
              </Button>
            </AssignRunnerDialog>
          )
        }
      >
        Procurement
      </SectionTitle>
      {p ? (
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium capitalize">{p.status.replace("_", " ")}</dd>
          </div>
          {p.runner_name && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Runner</dt>
              <dd>{p.runner_name}</dd>
            </div>
          )}
          {p.instructions && <p className="pt-1 text-muted-foreground">{p.instructions}</p>}
        </dl>
      ) : (
        <p className="text-sm text-muted-foreground">Not assigned yet.</p>
      )}
      {open && can("procurement.record") && (
        <div className="mt-4 border-t pt-4">
          {pending > 0 || subs > 0 ? (
            <p className="text-xs text-muted-foreground">
              {pending > 0 && `${pending} item(s) not yet recorded. `}
              {subs > 0 && `${subs} substitution(s) waiting for the customer.`}
            </p>
          ) : null}
          <Button
            className="mt-2 w-full"
            disabled={pending > 0 || subs > 0 || items.length === 0 || complete.isPending}
            onClick={() => complete.mutate(undefined)}
          >
            <ClipboardCheck /> {complete.isPending ? "Saving…" : "Procurement complete"}
          </Button>
        </div>
      )}
    </Card>
  );
}

function PaymentCard({ order }: { order: OrderRow }) {
  const { can } = useAccess();
  const payments = useQuery(orderPaymentsQuery(order.id));
  const settings = useQuery(settingsQuery());
  const showCash =
    can("payments.record_cash") &&
    order.payment_method === "cash" &&
    order.payment_status !== "paid" &&
    order.status !== "cancelled" &&
    settings.data?.cash_enabled;
  return (
    <Card className="p-5">
      <SectionTitle>Payment</SectionTitle>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{order.payment_method === "cash" ? "Cash on delivery" : "Paystack"}</span>
        <PaymentStatusBadge status={order.payment_status} />
      </div>
      {order.payment_method === "paystack" && order.payment_status !== "paid" && (
        <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Marked paid only after Paystack confirms the payment. Paystack confirmation is not connected yet.
        </p>
      )}
      {payments.data && payments.data.length > 0 && (
        <ul className="mt-3 space-y-2">
          {payments.data.map((p) => (
            <li key={p.id} className="rounded-lg border p-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="truncate font-mono">{p.reference}</span>
                <span className="font-semibold tabular">{formatNaira(p.amount_kobo)}</span>
              </div>
              <div className="mt-0.5 flex justify-between text-muted-foreground">
                <span>{PAYMENT_STATUS_META[p.status].label}</span>
                <span>{formatDateTime(p.verified_at ?? p.created_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {showCash && (
        <CashPaymentDialog orderId={order.id} orderNumber={order.order_number} totalKobo={order.total_kobo}>
          <Button className="mt-3 w-full" variant="outline">
            <Banknote /> Record cash received
          </Button>
        </CashPaymentDialog>
      )}
    </Card>
  );
}

function CourierCard({ order }: { order: OrderRow }) {
  const { can } = useAccess();
  const delivery = useQuery({ ...orderDeliveryQuery(order.id), enabled: can("deliveries.view") });
  const current = delivery.data?.assignments.find((a) => ["assigned", "accepted", "picked_up"].includes(a.status));
  return (
    <Card className="p-5">
      <SectionTitle
        action={
          can("deliveries.update") &&
          !["completed", "cancelled"].includes(order.status) && (
            <ReportIssueDialog orderId={order.id} orderNumber={order.order_number}>
              <Button size="sm" variant="ghost">
                Report issue
              </Button>
            </ReportIssueDialog>
          )
        }
      >
        Courier
      </SectionTitle>
      {order.courier ? (
        <div className="flex items-start gap-3 text-sm">
          <div className="grid size-10 place-items-center rounded-full bg-navy text-navy-foreground">
            <Bike className="size-5" />
          </div>
          <div>
            <p className="font-semibold text-navy">{order.courier.full_name}</p>
            {order.courier.phone && (
              <a href={`tel:${order.courier.phone}`} className="block text-primary hover:underline">
                {order.courier.phone}
              </a>
            )}
            {current && (
              <div className="mt-1">
                <AssignmentStatusBadge status={current.status} />
              </div>
            )}
          </div>
        </div>
      ) : order.status === "awaiting_courier" && can("couriers.assign") ? (
        <Button asChild variant="outline" className="w-full">
          <Link to="/couriers">
            <CheckCheck /> Assign on the Couriers page
          </Link>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No courier assigned.</p>
      )}
      {delivery.data && delivery.data.events.length > 0 && (
        <ul className="mt-4 space-y-2 border-t pt-3">
          {delivery.data.events.slice(0, 6).map((e) => (
            <li key={e.id} className={e.is_issue ? "rounded-md bg-danger-soft p-2 text-xs" : "text-xs"}>
              <span className="font-medium text-navy">{e.event_type.replace(/_/g, " ")}</span>
              {e.message && <span className="text-muted-foreground"> — {e.message}</span>}
              <span className="block text-muted-foreground">{formatDateTime(e.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
