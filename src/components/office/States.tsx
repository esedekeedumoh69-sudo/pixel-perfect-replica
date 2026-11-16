import type { ComponentType, ReactNode } from "react";
import { AlertTriangle, Lock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { friendlyError } from "@/lib/errors";

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </div>
      <p className="font-display text-lg font-semibold text-navy">{title}</p>
      {body && <p className="mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-destructive/30 bg-danger-soft px-6 py-10 text-center">
      <AlertTriangle className="mb-2 size-7 text-destructive" />
      <p className="font-semibold text-navy">This couldn't be loaded</p>
      <p className="mt-1 text-sm text-muted-foreground">{friendlyError(error)}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function PermissionDenied({ what }: { what?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-14 text-center shadow-card">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Lock className="size-6" />
      </div>
      <p className="font-display text-lg font-semibold text-navy">You don't have access{what ? ` to ${what}` : ""}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Your role doesn't include this area. Ask an administrator if you need it.
      </p>
    </div>
  );
}
