import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import logo from "@/assets/lightgrab-logo.png";
import { PrintToolbar } from "@/components/office/PrintToolbar";
import { ErrorState, PermissionDenied } from "@/components/office/States";
import { useAccess } from "@/hooks/use-access";
import { marketListQuery } from "@/lib/queries";
import { formatDateTime, formatQty } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/print/market")({
  validateSearch: z.object({ ids: z.string().default("") }),
  head: () => ({ meta: [{ title: "Market list — LightGrab Office" }] }),
  component: MarketList,
});

/** Runner sheet: order number, items, quantities, units and instructions — no customer personal details. */
function MarketList() {
  const { can } = useAccess();
  const { ids } = Route.useSearch();
  const list = ids.split(",").filter(Boolean).slice(0, 50);
  const q = useQuery({ ...marketListQuery(list), enabled: list.length > 0 });
  if (!can("orders.view")) return <PermissionDenied what="orders" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  if (list.length === 0) return <p className="p-8 text-sm text-muted-foreground">No orders selected.</p>;
  if (!q.data) return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="min-h-screen bg-muted/40">
      <PrintToolbar title={`Market list · ${q.data.length} order(s)`} />
      <div className="print-doc mx-auto my-6 max-w-3xl bg-card p-6 text-sm shadow-card">
        <div className="mb-4 flex items-center gap-3 border-b pb-3">
          <img src={logo} alt="LightGrab" className="h-12" />
          <div className="ml-auto text-right"><p className="text-lg font-bold">Market list</p><p className="text-muted-foreground">Printed {formatDateTime(new Date().toISOString())}</p></div>
        </div>
        {q.data.map((o) => (
          <section key={o.id} className="mb-6 break-inside-avoid">
            <h2 className="mb-1 font-mono text-base font-bold">{o.order_number}{o.procurement?.runner_name && <span className="ml-2 font-sans text-sm font-normal">Runner: {o.procurement.runner_name}</span>}</h2>
            <table className="w-full border-collapse">
              <thead><tr className="border-b text-left"><th className="w-8 py-1">✓</th><th className="py-1">Item</th><th className="py-1 text-right">Qty</th><th className="py-1">Unit</th><th className="w-28 py-1">Price paid</th></tr></thead>
              <tbody>
                {[...o.order_items].sort((a, b) => a.position - b.position).filter((i) => i.availability !== "unavailable").map((i) => (
                  <tr key={i.id} className="border-b border-dashed"><td className="py-1.5">☐</td><td className="py-1.5">{i.name}</td><td className="py-1.5 text-right">{formatQty(i.quantity)}</td><td className="py-1.5">{i.unit}</td><td className="py-1.5">______</td></tr>
                ))}
              </tbody>
            </table>
            {(o.customer_instructions || o.procurement?.instructions || o.procurement_notes) && (
              <p className="mt-1 text-xs"><b>Instructions:</b> {[o.customer_instructions, o.procurement?.instructions, o.procurement_notes].filter(Boolean).join(" · ")}</p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
