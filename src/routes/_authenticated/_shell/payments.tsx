import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CreditCard, Info } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/office/StatusBadge";
import { CashPaymentDialog } from "@/components/office/actions/CashPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccess } from "@/hooks/use-access";
import { paymentsQuery, settingsQuery, unpaidOrdersQuery } from "@/lib/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { officeHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/_shell/payments")({
  head: () => officeHead("Payments", "Review LightGrab payment records, unpaid orders and manually recorded cash payments."),
  component: PaymentsPage,
});

function PaymentsPage() {
  const { can } = useAccess();
  if (!can("payments.view")) return <PermissionDenied what="payments" />;
  return <PaymentsBody />;
}

function PaymentsBody() {
  const { can } = useAccess();
  const payments = useQuery(paymentsQuery());
  const unpaid = useQuery({ ...unpaidOrdersQuery(), enabled: can("orders.view") });
  const settings = useQuery(settingsQuery());
  const paidTotal = (payments.data ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_kobo, 0);
  return (
    <>
      <PageHeader title="Payments" description="Payment records, verification status and orders still waiting for payment." />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified (latest 500 records)</p>
          <p className="mt-1 font-display text-2xl font-bold text-forest tabular">{formatNaira(paidTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cash on delivery</p>
          <p className="mt-1">
            {settings.data ? (
              <Badge variant={settings.data.cash_enabled ? "success" : "neutral"}>{settings.data.cash_enabled ? "Switched on" : "Switched off"}</Badge>
            ) : (
              "—"
            )}
          </p>
        </Card>
        <Card className="flex items-start gap-2 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          Paystack orders are marked paid only after Paystack confirms them. Paystack confirmation is not connected yet.
        </Card>
      </div>
      <Tabs defaultValue="records">
        <TabsList>
          <TabsTrigger value="records">Payment records</TabsTrigger>
          {can("orders.view") && <TabsTrigger value="unpaid">Awaiting payment</TabsTrigger>}
        </TabsList>
        <TabsContent value="records">
          {payments.isError ? (
            <ErrorState error={payments.error} onRetry={() => payments.refetch()} />
          ) : !payments.data ? (
            <div className="h-40 animate-pulse rounded-xl bg-card/70" />
          ) : payments.data.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet" body="Paystack and cash payments appear here once recorded." />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.data.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-56 truncate font-mono text-xs">{p.reference}</TableCell>
                      <TableCell>
                        <Link to="/orders/$orderId" params={{ orderId: p.order_id }} className="font-mono text-sm font-semibold text-navy hover:underline">
                          {p.order?.order_number ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm capitalize">{p.provider}</TableCell>
                      <TableCell className="text-right font-semibold tabular">
                        {formatNaira(p.amount_kobo)}
                        {p.order && p.status === "paid" && p.amount_kobo !== p.order.total_kobo && (
                          <span className="block text-xs font-normal text-warning">Order total {formatNaira(p.order.total_kobo)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={p.status} />
                        {p.failure_reason && <span className="block text-xs text-destructive">{p.failure_reason}</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.verified_at ? formatDateTime(p.verified_at) : "—"}
                        {p.verified_via && <span className="block">{p.verified_via.replace(/_/g, " ")}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="unpaid">
          {unpaid.isError ? (
            <ErrorState error={unpaid.error} onRetry={() => unpaid.refetch()} />
          ) : !unpaid.data ? (
            <div className="h-40 animate-pulse rounded-xl bg-card/70" />
          ) : unpaid.data.length === 0 ? (
            <EmptyState icon={Banknote} title="Nothing waiting for payment" body="Every open order is paid." />
          ) : (
            <Card className="overflow-hidden p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Order status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaid.data.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>
                        <Link to="/orders/$orderId" params={{ orderId: o.id }} className="font-mono text-sm font-semibold text-navy hover:underline">
                          {o.order_number}
                        </Link>
                        <span className="block text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
                      </TableCell>
                      <TableCell className="text-sm">{o.payment_method === "cash" ? "Cash" : "Paystack"}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatNaira(o.total_kobo)}</TableCell>
                      <TableCell>
                        <OrderStatusBadge status={o.status} />
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={o.payment_status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {o.payment_method === "cash" && can("payments.record_cash") && settings.data?.cash_enabled && (
                          <CashPaymentDialog orderId={o.id} orderNumber={o.order_number} totalKobo={o.total_kobo}>
                            <Button size="sm" variant="outline">
                              <Banknote /> Cash received
                            </Button>
                          </CashPaymentDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
