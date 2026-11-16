import { Badge } from "@/components/ui/badge";
import {
  APPROVAL_META,
  ASSIGNMENT_STATUS_META,
  AVAILABILITY_META,
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  type ApprovalStatus,
  type AssignmentStatus,
  type ItemAvailability,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/status";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = ORDER_STATUS_META[status];
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_STATUS_META[status];
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
export function AvailabilityBadge({ status }: { status: ItemAvailability }) {
  const m = AVAILABILITY_META[status];
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  if (status === "not_required") return null;
  const m = APPROVAL_META[status];
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
export function AssignmentStatusBadge({ status }: { status: AssignmentStatus }) {
  const m = ASSIGNMENT_STATUS_META[status];
  return <Badge variant={m.tone}>{m.label}</Badge>;
}
