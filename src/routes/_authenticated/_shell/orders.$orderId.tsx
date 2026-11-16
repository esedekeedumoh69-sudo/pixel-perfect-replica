import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/orders/$orderId")({
  head: () => ({ meta: [{ title: "Order — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Order details" description="Full order, shopping list, totals and history." />,
});
