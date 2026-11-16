import { createFileRoute, Outlet, redirect, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Loader2, RefreshCw, ServerCrash, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccessDenied, ConnectionProblem, accessQueryOptions } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/office/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    try {
      const access = await context.queryClient.ensureQueryData(accessQueryOptions);
      return { access };
    } catch (err) {
      if (err instanceof AccessDenied) {
        context.queryClient.removeQueries({ queryKey: ["access"] });
        await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
        throw redirect({
          to: "/auth",
          search: err.reason === "not_signed_in" ? {} : { reason: err.reason },
          replace: true,
        });
      }
      throw err;
    }
  },
  pendingComponent: GateLoading,
  errorComponent: GateError,
  component: () => <Outlet />,
});

function GateLoading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="h-16 w-auto" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Checking your account…
        </p>
      </div>
    </div>
  );
}

function GateError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const offline = error instanceof ConnectionProblem || (typeof navigator !== "undefined" && !navigator.onLine);
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-destructive">
          {offline ? <WifiOff className="size-6" /> : <ServerCrash className="size-6" />}
        </div>
        <h1 className="font-display text-2xl font-bold text-navy">
          {offline ? "No connection to LightGrab" : "LightGrab server unavailable"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {offline
            ? "LightGrab Office needs internet to check your account. Nothing is shown until you're back online."
            : "We couldn't reach the LightGrab backend. This is usually temporary."}
        </p>
        <Button
          className="mt-6"
          onClick={() => {
            reset();
            router.invalidate();
          }}
        >
          <RefreshCw /> Try again
        </Button>
      </div>
    </div>
  );
}
