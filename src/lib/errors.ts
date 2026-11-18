/** Turn backend error codes raised by our database actions into plain sentences for staff. */
const MESSAGES: Record<string, string> = {
  permission_denied: "You don't have permission to do this. Ask an administrator if you need access.",
  order_not_found: "This order no longer exists.",
  order_closed: "This order is already completed or cancelled.",
  order_locked: "This order can no longer be changed.",
  cancel_reason_required: "Please give a reason for cancelling.",
  payment_not_verified: "An order can only be completed after its payment is verified.",
  use_courier_assignment: "Use the Couriers page to assign a courier.",
  actual_price_required: "Enter the actual price paid.",
  substitute_details_required: "Enter the substitute item name and its price.",
  not_a_substitution: "This item is not a substitution.",
  staff_not_active: "That staff member is not active.",
  no_orders_selected: "Select at least one order.",
  too_many_orders: "You can assign at most 50 orders at once.",
  courier_not_found: "Courier not found.",
  courier_not_eligible: "Only approved, active couriers can receive orders.",
  order_not_ready: "One of the selected orders is not waiting for a courier any more.",
  assignment_not_cancellable: "This assignment can't be cancelled at this stage.",
  reason_required: "Please give a reason.",
  message_required: "Please describe the issue.",
  cash_disabled: "Cash payments are currently switched off.",
  not_cash_order: "This order is not a cash order.",
  already_paid: "This order is already marked as paid.",
  amount_mismatch: "The amount must equal the order total.",
  invalid_name: "Enter your full name (at least 2 characters).",
  invalid_phone: "Phone number is too long.",
  notes_too_long: "Notes are too long.",
  order_not_in_procurement: "This order is not in procurement any more.",
  order_has_no_items: "This order has no items.",
  items_still_pending: "Some items are still marked \"Not yet bought\". Record every item first.",
  substitutions_pending: "A substitution is still waiting for the customer's answer.",
  item_not_found: "This item no longer exists.",
  invalid_approval: "Choose approved or rejected.",
};

export function friendlyError(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
  if (/Failed to fetch|NetworkError|network/i.test(raw)) {
    return "Can't reach the LightGrab server. Check your internet connection and try again.";
  }
  for (const [code, msg] of Object.entries(MESSAGES)) {
    if (raw.startsWith(code) || raw.includes(code)) return msg;
  }
  return "Something went wrong. Please try again.";
}
