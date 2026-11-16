import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/payments")({
  head: () => ({ meta: [{ title: "Payments — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Payments" description="Payment verification and reconciliation." />,
});
