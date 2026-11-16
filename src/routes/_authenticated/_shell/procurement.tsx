import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/procurement")({
  head: () => ({ meta: [{ title: "Procurement — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Procurement" description="Market buying, prices, substitutions and printed runner lists." />,
});
