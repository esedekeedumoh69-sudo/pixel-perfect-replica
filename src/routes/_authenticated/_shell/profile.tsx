import { createFileRoute } from "@tanstack/react-router";
import { NotBuiltYet } from "@/components/office/NotBuiltYet";

export const Route = createFileRoute("/_authenticated/_shell/profile")({
  head: () => ({ meta: [{ title: "My profile — LightGrab Office" }] }),
  component: () => <NotBuiltYet title="My profile" description="Your details, password and signed-in devices." />,
});
