import logoUrl from "@/assets/lightgrab-logo.png";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return <img src={logoUrl} alt="LightGrab" className={cn("object-contain", className)} draggable={false} />;
}

export function LogoLockup({ className, subtitle = "Office" }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="grid size-11 place-items-center rounded-xl bg-cream p-1.5">
        <LogoMark className="h-full w-full" />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold tracking-tight">LightGrab</span>
        <span className="block text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{subtitle}</span>
      </span>
    </div>
  );
}
