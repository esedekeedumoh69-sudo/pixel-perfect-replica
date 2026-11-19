import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PackageSearch, Printer } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { OrderStatusBadge } from "@/components/office/StatusBadge";
import { AssignRunnerDialog } from "@/components/office/actions/AssignRunnerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/hooks/use-access";
import { procurementQueueQuery } from "@/lib/queries";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/procurement")({
  head: () => ({ meta: [{ title: "Procurement — LightGrab Office" }] }),
  component: ProcurementPage,
});

function ProcurementPage() {
  const { canAny, can } = useAccess();
  const q = useQuery(procurementQueueQuery());
  const [sel, setSel] = useState<string[]>([]);
  if (!canAny("procurement.record", "procurement.assign")) return <PermissionDenied what="procurement" />;
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <>
      <PageHeader
        title="Procurement"
        description="Orders waiting to be bought at the market. Open an order to record prices and substitutions."
        actions={
          <Button asChild variant="outline" disabled={sel.length === 0}>
            <Link to="/print/market" search={{ ids: sel.join(",") }} target="_blank" aria-disabled={sel.length === 0} className={sel.length === 0 ? "pointer-events-none opacity-50" : ""}>
              <Printer /> Print market list{sel.length ? ` (${sel.length})` : ""}
            </Link>
          </Button>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <div className="h-40 animate-pulse rounded-xl bg-card/70" />
      ) : q.data.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Nothing to buy right now" body="New orders appear here as soon as customers place them." />
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Runner</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.map((o) => {
                const items = o.order_items ?? [];
                const done = items.filter((i) => i.availability !== "pending").length;
                const subs = items.filter((i) => i.approval_status === "pending").length;
                return (
                  <TableRow key={o.id}>
                    <TableCell><Checkbox checked={sel.includes(o.id)} onCheckedChange={() => toggle(o.id)} aria-label={`Select ${o.order_number}`} /></TableCell>
                    <TableCell><Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono font-semibold text-navy hover:underline">{o.order_number}</Link></TableCell>
                    <TableCell><OrderStatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-sm tabular">
                      {done}/{items.length} recorded {subs > 0 && <Badge variant="warning" className="ml-1">{subs} awaiting customer</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">{o.procurement?.runner_name ?? (o.procurement ? "Assigned" : <span className="text-muted-foreground">—</span>)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeAgo(o.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {can("procurement.assign") && (
                          <AssignRunnerDialog orderId={o.id} orderNumber={o.order_number} current={o.procurement}>
                            <Button size="sm" variant="ghost">{o.procurement ? "Reassign" : "Assign"}</Button>
                          </AssignRunnerDialog>
                        )}
                        <Button asChild size="sm" variant="outline"><Link to="/orders/$orderId" params={{ orderId: o.id }}>Open</Link></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
