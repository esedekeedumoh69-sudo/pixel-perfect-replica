import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Bike, CircleDollarSign, Inbox, PackageCheck, Replace } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/office/StatusBadge";
import { Card } from "@/components/ui/card";
import { useAccess } from "@/hooks/use-access";
import { dashboardQuery, ordersQuery } from "@/lib/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import type { OrderStatus } from "@/lib/status";
import { officeHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/_shell/dashboard")({
  head: () => officeHead("Dashboard", "Live LightGrab order, payment, procurement and delivery operations at a glance."),
  component: DashboardPage,
});

const PIPELINE: { key: OrderStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "awaiting_confirmation", label: "Awaiting confirmation" },
  { key: "awaiting_procurement", label: "Awaiting procurement" },
  { key: "processing", label: "Being processed" },
  { key: "awaiting_courier", label: "Awaiting courier" },
  { key: "courier_assigned", label: "Courier assigned" },
  { key: "out_for_delivery", label: "Active deliveries" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

function DashboardPage() {
  const { access, can } = useAccess();
  if (!can("dashboard.view")) return <PermissionDenied what="the dashboard" />;
  const firstName = (access.full_name || "").split(" ")[0];
  return (
    <>
      <PageHeader
        title={firstName ? `Good day, ${firstName}` : "Dashboard"}
        description="Live view of LightGrab operations. Figures update as orders change."
      />
      <DashboardBody />
    </>
  );
}

function DashboardBody() {
  const { can } = useAccess();
  const summary = useQuery(dashboardQuery());
  if (summary.isError) return <ErrorState error={summary.error} onRetry={() => summary.refetch()} />;
  if (!summary.data) return <DashboardSkeleton />;
  const s = summary.data;

  const alerts: { icon: typeof AlertTriangle; text: string; to: "/procurement" | "/deliveries" | "/payments" | "/couriers" }[] = [];
  if (s.pending_substitutions > 0)
    alerts.push({ icon: Replace, text: `${s.pending_substitutions} substitution(s) waiting for customer approval`, to: "/procurement" });
  if (s.open_issues > 0) alerts.push({ icon: AlertTriangle, text: `${s.open_issues} delivery issue(s) in the last 48 hours`, to: "/deliveries" });
  if (s.failed_payments > 0) alerts.push({ icon: CircleDollarSign, text: `${s.failed_payments} order(s) with failed payment`, to: "/payments" });
  if (s.awaiting_courier > 0 && s.available_couriers === 0)
    alerts.push({ icon: Bike, text: `${s.awaiting_courier} order(s) waiting but no courier is marked available`, to: "/couriers" });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden bg-gradient-brand p-6 text-navy-foreground md:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-leaf">Total orders</p>
          <p className="mt-2 font-display text-5xl font-bold tabular">{s.total}</p>
          <p className="mt-2 text-sm text-navy-foreground/70">
            {s.new} new · {s.out_for_delivery} out for delivery
          </p>
          <PackageCheck className="absolute -right-4 -bottom-4 size-28 text-navy-foreground/10" />
        </Card>
        {can("payments.view") && (
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verified payments</p>
            <p className="mt-2 font-display text-3xl font-bold text-forest tabular">{formatNaira(s.paid_total_kobo)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.paid_count} paid order(s)</p>
          </Card>
        )}
        {can("payments.view") && (
          <Card className="p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Awaiting payment</p>
            <p className="mt-2 font-display text-3xl font-bold text-navy tabular">{formatNaira(s.unpaid_total_kobo)}</p>
            <p className="mt-1 text-sm text-muted-foreground">Open orders not yet verified as paid</p>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {PIPELINE.map((p) => (
          <Link
            key={p.key}
            to="/orders"
            search={{ status: p.key }}
            className="group rounded-xl border bg-card p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
          >
            <p className="text-xs font-medium text-muted-foreground">{p.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-navy tabular">{s[p.key]}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentOrders />
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-navy">Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.text}>
                  <Link
                    to={a.to}
                    className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-navy hover:border-warning"
                  >
                    <a.icon className="mt-0.5 size-4 shrink-0 text-warning" />
                    <span className="flex-1">{a.text}</span>
                    <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function RecentOrders() {
  const { data } = useSuspenseQuery(ordersQuery({}));
  const recent = data.slice(0, 8);
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-navy">Latest orders</h2>
        <Link to="/orders" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </div>
      {recent.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No orders yet"
          body="Orders placed in the LightGrab Customer app will appear here instantly."
        />
      ) : (
        <ul className="divide-y">
          {recent.map((o) => (
            <li key={o.id}>
              <Link
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="flex items-center gap-4 py-3 hover:bg-muted/50"
              >
                <span className="w-24 font-mono text-sm font-semibold text-navy">{o.order_number}</span>
                <span className="flex-1 truncate text-sm">{o.customer?.full_name ?? "Customer"}</span>
                <OrderStatusBadge status={o.status} />
                <PaymentStatusBadge status={o.payment_status} />
                <span className="hidden w-28 text-right text-xs text-muted-foreground md:block">
                  {formatDateTime(o.created_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-xl bg-card/70" />
      ))}
    </div>
  );
}
