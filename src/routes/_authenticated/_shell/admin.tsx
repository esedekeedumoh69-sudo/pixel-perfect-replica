import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/admin")({
  head: () => ({ meta: [{ title: "Staff & settings — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="Staff & settings" description="Staff accounts, roles, fees and audit log." />,
});
