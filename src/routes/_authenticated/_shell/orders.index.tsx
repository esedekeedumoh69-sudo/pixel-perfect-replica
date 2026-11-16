import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";
import { ORDER_STATUSES } from "@/lib/status";

export const Route = createFileRoute("/_authenticated/_shell/orders/")({
  validateSearch: z.object({ status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional() }),
  head: () => ({ meta: [{ title: "Orders — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Orders" description="Search, filter and open customer orders." />,
});
