import type { Database } from "@/integrations/supabase/types";

export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];
export type ItemAvailability = Database["public"]["Enums"]["item_availability"];
export type ApprovalStatus = Database["public"]["Enums"]["approval_status"];
export type AssignmentStatus = Database["public"]["Enums"]["assignment_status"];

type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "leaf" | "navy";

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "awaiting_confirmation",
  "awaiting_procurement",
  "processing",
  "awaiting_courier",
  "courier_assigned",
  "out_for_delivery",
  "completed",
  "cancelled",
];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "leaf" },
  awaiting_confirmation: { label: "Awaiting confirmation", tone: "warning" },
  awaiting_procurement: { label: "Awaiting procurement", tone: "warning" },
  processing: { label: "Procurement in progress", tone: "info" },
  awaiting_courier: { label: "Awaiting courier", tone: "warning" },
  courier_assigned: { label: "Courier assigned", tone: "info" },
  out_for_delivery: { label: "Out for delivery", tone: "navy" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; tone: Tone }> = {
  pending: { label: "Unpaid", tone: "neutral" },
  awaiting_verification: { label: "Awaiting verification", tone: "warning" },
  paid: { label: "Paid (verified)", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  refunded: { label: "Refunded", tone: "info" },
};

export const AVAILABILITY_META: Record<ItemAvailability, { label: string; tone: Tone }> = {
  pending: { label: "Not yet bought", tone: "neutral" },
  found: { label: "Bought", tone: "success" },
  unavailable: { label: "Unavailable", tone: "danger" },
  substituted: { label: "Substituted", tone: "warning" },
};

export const APPROVAL_META: Record<ApprovalStatus, { label: string; tone: Tone }> = {
  not_required: { label: "—", tone: "neutral" },
  pending: { label: "Awaiting customer", tone: "warning" },
  approved: { label: "Customer approved", tone: "success" },
  rejected: { label: "Customer rejected", tone: "danger" },
};

export const ASSIGNMENT_STATUS_META: Record<AssignmentStatus, { label: string; tone: Tone }> = {
  assigned: { label: "Assigned", tone: "info" },
  accepted: { label: "Accepted by courier", tone: "info" },
  picked_up: { label: "Picked up", tone: "navy" },
  delivered: { label: "Delivered", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Statuses staff may set manually (courier_assigned is set only by the assignment action). */
export const MANUAL_STATUS_TARGETS: OrderStatus[] = [
  "awaiting_confirmation",
  "awaiting_procurement",
  "processing",
  "awaiting_courier",
  "out_for_delivery",
  "completed",
  "cancelled",
];
