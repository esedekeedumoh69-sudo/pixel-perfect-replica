import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Inbox, Search, SearchX } from "lucide-react";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/office/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAccess } from "@/hooks/use-access";
import { ordersQuery } from "@/lib/queries";
import { formatDateTime, formatNaira } from "@/lib/format";
import { ORDER_STATUSES, ORDER_STATUS_META, PAYMENT_STATUS_META, type OrderStatus, type PaymentStatus } from "@/lib/status";
import { officeHead } from "@/lib/head";

const PAYMENT_KEYS = Object.keys(PAYMENT_STATUS_META) as PaymentStatus[];

export const Route = createFileRoute("/_authenticated/_shell/orders/")({
  validateSearch: z.object({
    status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]).optional(),
    payment: z.enum(PAYMENT_KEYS as [PaymentStatus, ...PaymentStatus[]]).optional(),
  }),
  head: () => officeHead("Orders", "Search, filter and manage every LightGrab customer order."),
  component: OrdersPage,
});

type Sort = "newest" | "oldest" | "total_desc" | "total_asc";

function OrdersPage() {
  const { can } = useAccess();
  if (!can("orders.view")) return <PermissionDenied what="orders" />;
  return <OrdersBody />;
}

function OrdersBody() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/orders/" });
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const orders = useQuery(
    ordersQuery({ statuses: search.status ? [search.status] : undefined, payment: search.payment ?? "all" }),
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = orders.data ?? [];
    if (term) {
      list = list.filter((o) =>
        [o.order_number, o.customer?.full_name, o.customer?.phone, o.delivery_address]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term)),
      );
    }
    const sorted = [...list];
    if (sort === "oldest") sorted.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sort === "total_desc") sorted.sort((a, b) => b.total_kobo - a.total_kobo);
    if (sort === "total_asc") sorted.sort((a, b) => a.total_kobo - b.total_kobo);
    return sorted;
  }, [orders.data, q, sort]);

  const filtered = !!(search.status || search.payment || q.trim());

  return (
    <>
      <PageHeader title="Orders" description="Every customer order, newest first. Updates live." />
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order number, customer, phone or address"
            className="pl-9"
            aria-label="Search orders"
          />
        </div>
        <Select
          value={search.status ?? "all"}
          onValueChange={(v) =>
            navigate({ search: (s) => ({ ...s, status: v === "all" ? undefined : (v as OrderStatus) }), replace: true })
          }
        >
          <SelectTrigger className="w-52" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={search.payment ?? "all"}
          onValueChange={(v) =>
            navigate({ search: (s) => ({ ...s, payment: v === "all" ? undefined : (v as PaymentStatus) }), replace: true })
          }
        >
          <SelectTrigger className="w-48" aria-label="Filter by payment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {PAYMENT_KEYS.map((s) => (
              <SelectItem key={s} value={s}>
                {PAYMENT_STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="w-40" aria-label="Sort orders">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="total_desc">Highest total</SelectItem>
            <SelectItem value="total_asc">Lowest total</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      {orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => orders.refetch()} />
      ) : !orders.data ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-card/70" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState icon={SearchX} title="No orders match" body="Try a different search or clear the filters." />
        ) : (
          <EmptyState icon={Inbox} title="No orders yet" body="Orders placed in the LightGrab Customer app will appear here instantly." />
        )
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Delivery address</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="hidden xl:table-cell">Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => navigate({ to: "/orders/$orderId", params: { orderId: o.id } })}>
                  <TableCell>
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: o.id }}
                      className="font-mono text-sm font-semibold text-navy hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {o.order_number}
                    </Link>
                    {o.is_test && (
                      <Badge variant="outline" className="ml-2">
                        Test
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="block text-sm">{o.customer?.full_name ?? "—"}</span>
                    {o.customer?.phone && <span className="block text-xs text-muted-foreground">{o.customer.phone}</span>}
                  </TableCell>
                  <TableCell className="hidden max-w-64 truncate text-sm text-muted-foreground lg:table-cell">
                    {o.delivery_address || "—"}
                  </TableCell>
                  <TableCell className="text-right tabular">{o.order_items?.[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{formatNaira(o.total_kobo)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={o.payment_status} />
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">{formatDateTime(o.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {rows.length} order{rows.length === 1 ? "" : "s"}
            {(orders.data?.length ?? 0) >= 500 && " (latest 500 — narrow the filters to see older orders)"}
          </p>
        </Card>
      )}
    </>
  );
}
