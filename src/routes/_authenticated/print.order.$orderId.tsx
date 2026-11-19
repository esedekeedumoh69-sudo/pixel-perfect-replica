import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import logo from "@/assets/lightgrab-logo.png";
import { PrintToolbar } from "@/components/office/PrintToolbar";
import { ErrorState, PermissionDenied } from "@/components/office/States";
import { useAccess } from "@/hooks/use-access";
import { orderDetailQuery } from "@/lib/queries";
import { formatDateTime, formatNaira, formatQty } from "@/lib/format";
import { AVAILABILITY_META, ORDER_STATUS_META, PAYMENT_STATUS_META } from "@/lib/status";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/print/order/$orderId")({
  validateSearch: z.object({ doc: z.enum(["summary", "receipt"]).default("summary"), size: z.enum(["a4", "80mm"]).default("a4") }),
  head: () => ({ meta: [{ title: "Print — LightGrab Office" }] }),
  component: PrintOrder,
});

function PrintOrder() {
  const { can } = useAccess();
  const { orderId } = Route.useParams();
  const { doc, size } = Route.useSearch();
  const q = useQuery(orderDetailQuery(orderId));
  if (!can("orders.view")) return <PermissionDenied what="orders" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (!q.data) return <p className="p-8 text-sm text-muted-foreground">{q.isPending ? "Loading…" : "Order not found."}</p>;
  const { order, items } = q.data;
  const receipt = doc === "receipt";
  const small = size === "80mm";
  const charged = (i: (typeof items)[number]) =>
    i.availability === "found" ? i.actual_price_kobo : i.availability === "substituted" && i.approval_status === "approved" ? i.substitute_price_kobo : i.availability === "pending" ? i.target_price_kobo : 0;
  return (
    <div className="min-h-screen bg-muted/40">
      <PrintToolbar title={`${receipt ? "Customer receipt" : "Order summary"} · ${order.order_number}`} />
      <div className={cn("print-doc mx-auto my-6 bg-card p-6 text-sm text-foreground shadow-card", small ? "print-receipt w-[80mm] p-3 text-xs" : "max-w-3xl")}>
        <div className={cn("mb-4 flex items-center gap-3 border-b pb-3", small && "flex-col text-center")}>
          <img src={logo} alt="LightGrab" className={small ? "h-10" : "h-12"} />
          <div className={small ? "" : "ml-auto text-right"}>
            <p className="font-mono text-lg font-bold">{order.order_number}</p>
            <p className="text-muted-foreground">{formatDateTime(order.created_at)}</p>
          </div>
        </div>
        <div className={cn("mb-4 grid gap-2", !small && "grid-cols-2")}>
          {order.customer && (
            <div><p className="font-semibold">Customer</p><p>{order.customer.full_name}</p>{order.customer.phone && <p>{order.customer.phone}</p>}</div>
          )}
          <div><p className="font-semibold">Deliver to</p><p>{order.delivery_address || "—"}</p>{order.delivery_landmark && <p>Landmark: {order.delivery_landmark}</p>}</div>
        </div>
        {!receipt && (
          <p className="mb-3">Status: <b>{ORDER_STATUS_META[order.status].label}</b> · Payment: <b>{PAYMENT_STATUS_META[order.payment_status].label}</b></p>
        )}
        <table className="w-full border-collapse">
          <thead><tr className="border-b text-left"><th className="py-1">Item</th><th className="py-1 text-right">Qty</th>{!receipt && !small && <th className="py-1">Status</th>}<th className="py-1 text-right">Amount</th></tr></thead>
          <tbody>
            {items.filter((i) => !receipt || i.availability !== "unavailable").map((i) => (
              <tr key={i.id} className="border-b border-dashed">
                <td className="py-1">{i.availability === "substituted" && i.substitute_name ? `${i.substitute_name} (for ${i.name})` : i.name}</td>
                <td className="py-1 text-right whitespace-nowrap">{formatQty(i.quantity)} {i.unit}</td>
                {!receipt && !small && <td className="py-1">{AVAILABILITY_META[i.availability].label}</td>}
                <td className="py-1 text-right tabular">{formatNaira(charged(i))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-0.5">
          <Row label="Goods subtotal" v={order.goods_subtotal_kobo} />
          <Row label={`Service fee (${order.service_fee_bps / 100}%)`} v={order.service_fee_kobo} />
          <Row label="Courier fee" v={order.courier_fee_kobo} />
          {order.discount_kobo > 0 && <Row label="Discount" v={-order.discount_kobo} />}
          <div className="flex justify-between border-t pt-1 text-base font-bold"><dt>Total</dt><dd className="tabular">{formatNaira(order.total_kobo)}</dd></div>
        </dl>
        {receipt && <p className="mt-3 text-center">Payment: <b>{PAYMENT_STATUS_META[order.payment_status].label}</b> ({order.payment_method === "cash" ? "cash" : "Paystack"})</p>}
        {!receipt && order.customer_instructions && <p className="mt-3"><b>Instructions:</b> {order.customer_instructions}</p>}
        <p className="mt-4 text-center text-muted-foreground">Thank you for shopping with LightGrab · Oron</p>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return <div className="flex justify-between"><dt>{label}</dt><dd className="tabular">{v < 0 ? "−" + formatNaira(-v) : formatNaira(v)}</dd></div>;
}
