import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/couriers")({
  head: () => ({ meta: [{ title: "Couriers — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Couriers" description="Manual courier assignment." />,
});
