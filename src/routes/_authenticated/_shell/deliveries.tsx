import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, Truck } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { AssignmentStatusBadge } from "@/components/office/StatusBadge";
import { CancelAssignmentDialog } from "@/components/office/actions/CancelAssignmentDialog";
import { ReportIssueDialog } from "@/components/office/actions/ReportIssueDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/hooks/use-access";
import { activeDeliveriesQuery, recentDeliveryEventsQuery } from "@/lib/queries";
import { formatDateTime, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_shell/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — LightGrab Office" }] }),
  component: DeliveriesPage,
});

function DeliveriesPage() {
  const { can } = useAccess();
  if (!can("deliveries.view")) return <PermissionDenied what="deliveries" />;
  return <DeliveriesBody />;
}

function DeliveriesBody() {
  const { can } = useAccess();
  const active = useQuery(activeDeliveriesQuery());
  const events = useQuery(recentDeliveryEventsQuery());
  return (
    <>
      <PageHeader
        title="Deliveries"
        description="Orders with a courier right now. Locations appear only when the Courier app reports them."
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          {active.isError ? (
            <ErrorState error={active.error} onRetry={() => active.refetch()} />
          ) : !active.data ? (
            <div className="h-40 animate-pulse rounded-xl bg-card/70" />
          ) : active.data.length === 0 ? (
            <EmptyState icon={Truck} title="No active deliveries" body="Assign couriers on the Couriers page to start deliveries." />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Courier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last location</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.data.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        {a.order ? (
                          <Link to="/orders/$orderId" params={{ orderId: a.order.id }} className="font-mono font-semibold text-navy hover:underline">
                            {a.order.order_number}
                          </Link>
                        ) : (
                          "—"
                        )}
                        <span className="block max-w-56 truncate text-xs text-muted-foreground">{a.order?.delivery_address}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {a.courier?.full_name ?? "—"}
                        {a.courier?.phone && (
                          <a href={`tel:${a.courier.phone}`} className="block text-xs text-primary hover:underline">
                            {a.courier.phone}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        <AssignmentStatusBadge status={a.status} />
                        <span className="block text-xs text-muted-foreground">
                          {a.package_count} pkg · {timeAgo(a.assigned_at)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.courier?.last_lat != null && a.courier?.last_lng != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${a.courier.last_lat},${a.courier.last_lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {timeAgo(a.courier.last_location_at)} <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Not reported</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {can("deliveries.update") && a.order && (
                            <ReportIssueDialog orderId={a.order.id} orderNumber={a.order.order_number}>
                              <Button size="sm" variant="ghost">
                                Issue
                              </Button>
                            </ReportIssueDialog>
                          )}
                          {can("couriers.assign") && ["assigned", "accepted"].includes(a.status) && (
                            <CancelAssignmentDialog
                              assignmentId={a.id}
                              label={`${a.order?.order_number ?? "Order"} · ${a.courier?.full_name ?? "courier"}`}
                            >
                              <Button size="sm" variant="ghost" className="text-destructive">
                                Unassign
                              </Button>
                            </CancelAssignmentDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
        <Card className="min-w-0 p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-navy">Recent delivery updates</h2>
          {events.isError ? (
            <ErrorState error={events.error} onRetry={() => events.refetch()} />
          ) : !events.data ? (
            <div className="h-32 animate-pulse rounded-lg bg-muted" />
          ) : events.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No delivery updates yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.data.map((e) => (
                <li key={e.id} className={e.is_issue ? "rounded-lg border border-destructive/30 bg-danger-soft p-2.5 text-sm" : "border-b pb-2 text-sm"}>
                  <p className="flex items-center gap-1.5 font-medium text-navy">
                    {e.is_issue && <AlertTriangle className="size-3.5 text-destructive" />}
                    {e.order?.order_number} · {e.event_type.replace(/_/g, " ")}
                  </p>
                  {e.message && <p className="text-muted-foreground">{e.message}</p>}
                  <p className="text-xs text-muted-foreground">
                    {e.courier?.full_name ? `${e.courier.full_name} · ` : ""}
                    {formatDateTime(e.created_at)} · {e.source}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
