import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderStatus, PaymentStatus } from "@/lib/status";

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export interface DashboardSummary {
  total: number;
  new: number;
  awaiting_confirmation: number;
  awaiting_procurement: number;
  processing: number;
  awaiting_courier: number;
  courier_assigned: number;
  out_for_delivery: number;
  completed: number;
  cancelled: number;
  paid_total_kobo: number;
  unpaid_total_kobo: number;
  paid_count: number;
  failed_payments: number;
  pending_substitutions: number;
  open_issues: number;
  available_couriers: number;
}

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ["dashboard"],
    queryFn: async () => (await unwrap(supabase.rpc("dashboard_summary"))) as unknown as DashboardSummary,
  });

export const settingsQuery = () =>
  queryOptions({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("*").eq("id", 1).single();
      if (error) throw new Error(error.message);
      return data;
    },
  });

const ORDER_LIST_SELECT =
  "id, order_number, status, payment_method, payment_status, total_kobo, goods_subtotal_kobo, delivery_address, created_at, updated_at, assigned_courier_id, is_test, customer:customers(full_name, phone), order_items(count)";

export interface OrderFilters {
  statuses?: OrderStatus[] | undefined;
  payment?: PaymentStatus | "all" | undefined;
}

export const ordersQuery = (filters: OrderFilters = {}) =>
  queryOptions({
    queryKey: ["orders", "list", filters],
    queryFn: () => {
      let q = supabase.from("orders").select(ORDER_LIST_SELECT).order("created_at", { ascending: false }).limit(500);
      if (filters.statuses && filters.statuses.length) q = q.in("status", filters.statuses);
      if (filters.payment && filters.payment !== "all") q = q.eq("payment_status", filters.payment);
      return unwrap(q);
    },
  });

export async function fetchOrderDetail(orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "*, customer:customers(id, full_name, phone, email), courier:couriers(id, full_name, phone, vehicle), procurement:procurement_assignments(*)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return null;
  const [items, events] = await Promise.all([
    unwrap(supabase.from("order_items").select("*").eq("order_id", orderId).order("position").order("name")),
    unwrap(supabase.from("order_events").select("*").eq("order_id", orderId).order("created_at", { ascending: false })),
  ]);
  return { order, items, events };
}
export type OrderDetail = NonNullable<Awaited<ReturnType<typeof fetchOrderDetail>>>;

export const orderDetailQuery = (orderId: string) =>
  queryOptions({ queryKey: ["orders", "detail", orderId], queryFn: () => fetchOrderDetail(orderId) });

export const marketListQuery = (ids: string[]) =>
  queryOptions({
    queryKey: ["orders", "market", ids],
    queryFn: () =>
      unwrap(
        supabase
          .from("orders")
          .select("id, order_number, customer_instructions, procurement_notes, procurement:procurement_assignments(runner_name, instructions), order_items(id, name, quantity, unit, position, availability)")
          .in("id", ids)
          .order("created_at"),
      ),
  });

export const orderPaymentsQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["payments", "order", orderId],
    queryFn: () =>
      unwrap(supabase.from("payments").select("*").eq("order_id", orderId).order("created_at", { ascending: false })),
  });

export const orderDeliveryQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["deliveries", "order", orderId],
    queryFn: async () => {
      const [assignments, events] = await Promise.all([
        unwrap(
          supabase
            .from("courier_assignments")
            .select("*, courier:couriers(full_name, phone)")
            .eq("order_id", orderId)
            .order("assigned_at", { ascending: false }),
        ),
        unwrap(
          supabase.from("delivery_events").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
        ),
      ]);
      return { assignments, events };
    },
  });

export const procurementQueueQuery = () =>
  queryOptions({
    queryKey: ["orders", "procurement-queue"],
    queryFn: () =>
      unwrap(
        supabase
          .from("orders")
          .select(
            "id, order_number, status, created_at, customer_instructions, procurement:procurement_assignments(runner_name, status, assigned_to, instructions), order_items(id, availability, approval_status)",
          )
          .in("status", ["new", "awaiting_confirmation", "awaiting_procurement", "processing"])
          .order("created_at", { ascending: true })
          .limit(300),
      ),
  });

export const couriersQuery = () =>
  queryOptions({
    queryKey: ["couriers"],
    queryFn: () =>
      unwrap(
        supabase
          .from("couriers")
          .select("*, courier_assignments(id, status)")
          .order("full_name"),
      ),
  });

export const awaitingCourierQuery = () =>
  queryOptions({
    queryKey: ["orders", "awaiting-courier"],
    queryFn: () =>
      unwrap(
        supabase
          .from("orders")
          .select("id, order_number, delivery_address, delivery_landmark, total_kobo, payment_status, created_at, order_items(count)")
          .eq("status", "awaiting_courier")
          .order("created_at", { ascending: true }),
      ),
  });

export const activeDeliveriesQuery = () =>
  queryOptions({
    queryKey: ["deliveries", "active"],
    queryFn: () =>
      unwrap(
        supabase
          .from("courier_assignments")
          .select(
            "*, courier:couriers(id, full_name, phone, availability, last_lat, last_lng, last_location_at), order:orders(id, order_number, status, delivery_address, delivery_landmark, delivery_lat, delivery_lng, payment_status, total_kobo)",
          )
          .in("status", ["assigned", "accepted", "picked_up"])
          .order("assigned_at", { ascending: true }),
      ),
  });

export const recentDeliveryEventsQuery = () =>
  queryOptions({
    queryKey: ["deliveries", "events"],
    queryFn: () =>
      unwrap(
        supabase
          .from("delivery_events")
          .select("*, order:orders(order_number), courier:couriers(full_name)")
          .order("created_at", { ascending: false })
          .limit(50),
      ),
  });

export const paymentsQuery = () =>
  queryOptions({
    queryKey: ["payments", "list"],
    queryFn: () =>
      unwrap(
        supabase
          .from("payments")
          .select("*, order:orders(order_number, total_kobo, payment_method)")
          .order("created_at", { ascending: false })
          .limit(500),
      ),
  });

export const unpaidOrdersQuery = () =>
  queryOptions({
    queryKey: ["orders", "unpaid"],
    queryFn: () =>
      unwrap(
        supabase
          .from("orders")
          .select("id, order_number, status, payment_method, payment_status, total_kobo, created_at")
          .neq("payment_status", "paid")
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(300),
      ),
  });

export const notificationsQuery = () =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: () =>
      unwrap(supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(40)),
  });

export const mySessionsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["sessions", "mine", userId],
    queryFn: () =>
      unwrap(
        supabase
          .from("device_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("signed_in_at", { ascending: false })
          .limit(20),
      ),
  });

export const activeStaffQuery = () =>
  queryOptions({
    queryKey: ["staff", "active"],
    queryFn: () =>
      unwrap(supabase.from("staff_profiles").select("user_id, full_name, email").eq("status", "active").order("full_name")),
  });
