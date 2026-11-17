import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
  Bike,
  ChevronDown,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PackageSearch,
  Settings2,
  ShoppingBasket,
  Truck,
  Menu,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { ComponentType } from "react";
import { useAccess } from "@/hooks/use-access";
import { useSignOut } from "@/hooks/use-sign-out";
import { LogoLockup } from "@/components/office/Logo";
import { NotificationsBell } from "@/components/office/NotificationsBell";
import { RealtimeSync } from "@/components/office/RealtimeSync";
import { SessionWatcher } from "@/components/office/SessionWatcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/_shell")({
  component: Shell,
});

type NavItem = {
  to: "/dashboard" | "/orders" | "/procurement" | "/couriers" | "/deliveries" | "/payments" | "/admin";
  label: string;
  icon: ComponentType<{ className?: string }>;
  perms: string[];
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perms: ["dashboard.view"] },
  { to: "/orders", label: "Orders", icon: ShoppingBasket, perms: ["orders.view"] },
  { to: "/procurement", label: "Procurement", icon: PackageSearch, perms: ["procurement.record", "procurement.assign"] },
  { to: "/couriers", label: "Couriers", icon: Bike, perms: ["couriers.view"] },
  { to: "/deliveries", label: "Deliveries", icon: Truck, perms: ["deliveries.view"] },
  { to: "/payments", label: "Payments", icon: CreditCard, perms: ["payments.view"] },
];

function Shell() {
  const { access } = useAccess();
  const signOut = useSignOut();
  const initials = (access.full_name || access.email)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen">
      <SessionWatcher />
      <RealtimeSync />
      <aside className="no-print sticky top-0 hidden h-screen w-60 md:flex shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="px-5 py-5 text-sidebar-accent-foreground">
          <LogoLockup />
        </div>
        <SideNav />
        <div className="border-t border-sidebar-border px-5 py-4 text-xs opacity-60">
          <p className="flex items-center gap-1.5">
            <ClipboardList className="size-3.5" /> Oron, Akwa Ibom
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-end gap-2 border-b bg-background/85 px-4 backdrop-blur md:px-6">
          <MobileNav />
          <span className="mr-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            Live
          </span>
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
              <span className="grid size-8 place-items-center rounded-full bg-navy text-xs font-bold text-navy-foreground">
                {initials}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold text-navy">{access.full_name || access.email}</span>
                <span className="block text-xs text-muted-foreground">{access.roles.map((r) => r.name).join(", ")}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                {access.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound /> My profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void signOut()} className="text-destructive focus:text-destructive">
                <LogOut /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { canAny } = useAccess();
  return (
    <nav className="flex-1 space-y-0.5 px-3 py-2">
          {NAV.filter((n) => canAny(...n.perms)).map((n) => (
            <Link
              onClick={onNavigate}
              key={n.to}
              to={n.to}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <n.icon className={isActive ? "size-4 text-sidebar-primary" : "size-4 opacity-70"} />
                  {n.label}
                </>
              )}
            </Link>
          ))}
          {canAny("staff.manage", "settings.manage", "audit.view") && (
            <>
              <p className="px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] opacity-50">Admin</p>
              <Link
              onClick={onNavigate}
                to="/admin"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
              >
                <Settings2 className="size-4 opacity-70" /> Staff &amp; settings
              </Link>
            </>
          )}
    </nav>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <div className="px-5 py-5 text-sidebar-accent-foreground">
          <LogoLockup />
        </div>
        <SideNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
