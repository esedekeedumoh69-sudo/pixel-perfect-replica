import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/deliveries")({
  head: () => ({ meta: [{ title: "Deliveries — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Deliveries" description="Delivery progress and issues." />,
});
