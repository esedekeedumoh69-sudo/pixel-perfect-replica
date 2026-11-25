import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { KeyRound, Laptop, ShieldCheck, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/office/PageHeader";
import { EmptyState, ErrorState, PermissionDenied } from "@/components/office/States";
import { DeviceSessionList } from "@/components/office/DeviceSessionList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAccess } from "@/hooks/use-access";
import { useAction } from "@/hooks/use-action";
import { auditQuery, permissionsQuery, rolesQuery, settingsQuery, staffListQuery, staffSessionsQuery } from "@/lib/queries";
import { formatDateTime, formatNaira, koboToInput, parseNairaToKobo } from "@/lib/format";
import { friendlyError } from "@/lib/errors";
import { createStaffAccount, resetStaffPassword } from "@/lib/staff-admin.functions";
import { cn } from "@/lib/utils";
import { officeHead } from "@/lib/head";

export const Route = createFileRoute("/_authenticated/_shell/admin")({
  head: () => officeHead("Staff & settings", "Manage LightGrab staff accounts, roles, fees, cash payments and audit history."),
  component: AdminPage,
});

function AdminPage() {
  const { can, canAny } = useAccess();
  if (!canAny("staff.manage", "settings.manage", "audit.view")) return <PermissionDenied what="staff and settings" />;
  const first = can("staff.manage") ? "staff" : can("settings.manage") ? "settings" : "audit";
  return (
    <>
      <PageHeader title="Staff & settings" description="Staff accounts, roles, fees and the audit log. Every change is recorded." />
      <Tabs defaultValue={first}>
        <TabsList className="mb-4">
          {can("staff.manage") && <TabsTrigger value="staff">Staff</TabsTrigger>}
          {can("staff.manage") && <TabsTrigger value="roles">Roles</TabsTrigger>}
          {can("settings.manage") && <TabsTrigger value="settings">Fees & payments</TabsTrigger>}
          {can("audit.view") && <TabsTrigger value="audit">Audit log</TabsTrigger>}
        </TabsList>
        {can("staff.manage") && (
          <TabsContent value="staff">
            <StaffTab />
          </TabsContent>
        )}
        {can("staff.manage") && (
          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>
        )}
        {can("settings.manage") && (
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        )}
        {can("audit.view") && (
          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

/* ---------------- Staff ---------------- */

type StaffRow = NonNullable<ReturnType<typeof useStaff>["data"]>[number];
function useStaff() {
  return useQuery(staffListQuery());
}

function StaffTab() {
  const { access } = useAccess();
  const staff = useStaff();
  if (staff.isError) return <ErrorState error={staff.error} onRetry={() => staff.refetch()} />;
  if (!staff.data) return <div className="h-40 animate-pulse rounded-xl bg-card/70" />;
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <p className="text-sm text-muted-foreground">{staff.data.length} staff account(s). Only administrators can create accounts.</p>
        <AddStaffDialog>
          <Button>
            <UserPlus /> Add staff
          </Button>
        </AddStaffDialog>
      </div>
      {staff.data.length === 0 ? (
        <EmptyState icon={Users} title="No staff yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.data.map((s) => {
              const self = s.user_id === access.user_id;
              return (
                <TableRow key={s.user_id}>
                  <TableCell>
                    <p className="font-medium text-navy">
                      {s.full_name || "—"} {self && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.staff_roles.length === 0 ? (
                        <Badge variant="warning">No role</Badge>
                      ) : (
                        s.staff_roles.map((r) => r.role && <Badge key={r.role.id} variant="neutral">{r.role.name}</Badge>)
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "success" : "danger"} className="capitalize">
                      {s.status}
                    </Badge>
                    {s.suspended_reason && <p className="mt-1 max-w-48 text-xs text-muted-foreground">{s.suspended_reason}</p>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      <EditRolesDialog staff={s}>
                        <Button size="sm" variant="ghost">
                          <ShieldCheck /> Roles
                        </Button>
                      </EditRolesDialog>
                      <SessionsDialog staff={s}>
                        <Button size="sm" variant="ghost">
                          <Laptop /> Devices
                        </Button>
                      </SessionsDialog>
                      {!self && (
                        <ResetPasswordDialog staff={s}>
                          <Button size="sm" variant="ghost">
                            <KeyRound /> Password
                          </Button>
                        </ResetPasswordDialog>
                      )}
                      {!self && <StatusDialog staff={s} />}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function RolePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const roles = useQuery(rolesQuery());
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(roles.data ?? []).map((r) => (
        <label key={r.id} className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-sm", value.includes(r.id) && "border-primary bg-accent")}>
          <Checkbox
            checked={value.includes(r.id)}
            onCheckedChange={(c) => onChange(c ? [...value, r.id] : value.filter((x) => x !== r.id))}
            className="mt-0.5"
          />
          <span>
            <span className="block font-medium text-navy">{r.name}</span>
            {r.description && <span className="block text-xs text-muted-foreground">{r.description}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

function AddStaffDialog({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const create = useServerFn(createStaffAccount);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const m = useMutation({
    mutationFn: () => create({ data: { ...f, phone: f.phone || undefined, role_ids: roleIds } }),
    onSuccess: () => {
      toast.success(`Account created for ${f.full_name}. Give them their email and temporary password.`);
      void qc.invalidateQueries({ queryKey: ["staff"] });
      setOpen(false);
      setF({ full_name: "", email: "", phone: "", password: "" });
      setRoleIds([]);
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const valid = f.full_name.trim().length >= 2 && /\S+@\S+\.\S+/.test(f.email) && f.password.length >= 8 && roleIds.length > 0;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a staff account</DialogTitle>
          <DialogDescription>The person signs in with this email and temporary password, then changes it in My profile.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" id="n" value={f.full_name} onChange={(v) => setF({ ...f, full_name: v })} />
          <Field label="Phone (optional)" id="p" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
          <Field label="Work email" id="e" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
          <Field label="Temporary password (8+ characters)" id="pw" type="text" value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        </div>
        <div className="space-y-1.5">
          <Label>Roles</Label>
          <RolePicker value={roleIds} onChange={setRoleIds} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, id, value, onChange, type = "text" }: { label: string; id: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" />
    </div>
  );
}

function EditRolesDialog({ staff, children }: { staff: StaffRow; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const initial = staff.staff_roles.map((r) => r.role?.id).filter(Boolean) as string[];
  const [roleIds, setRoleIds] = useState(initial);
  useEffect(() => {
    if (open) setRoleIds(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const save = useAction(() => supabase.rpc("set_staff_roles", { _user_id: staff.user_id, _role_ids: roleIds }), {
    success: "Roles updated. Changes apply the next time they open LightGrab Office.",
    invalidate: ["staff"],
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Roles for {staff.full_name || staff.email}</DialogTitle>
          <DialogDescription>Someone with no role can't use LightGrab Office.</DialogDescription>
        </DialogHeader>
        <RolePicker value={roleIds} onChange={setRoleIds} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => setOpen(false) })}>
            {save.isPending ? "Saving…" : "Save roles"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ staff }: { staff: StaffRow }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const suspend = staff.status === "active";
  const save = useAction(
    () =>
      supabase.rpc("set_staff_status", {
        _user_id: staff.user_id,
        _status: suspend ? "suspended" : "active",
        _reason: reason.trim(),
      }),
    { success: suspend ? "Account suspended and signed out everywhere" : "Account reactivated", invalidate: ["staff", "sessions"] },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className={suspend ? "text-destructive" : "text-primary"}>
          {suspend ? "Suspend" : "Reactivate"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspend ? "Suspend" : "Reactivate"} {staff.full_name || staff.email}
          </DialogTitle>
          <DialogDescription>
            {suspend
              ? "They are signed out on every device immediately and can't sign in until reactivated."
              : "They can sign in again with their existing password."}
          </DialogDescription>
        </DialogHeader>
        {suspend && <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, shown to them)" maxLength={300} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={suspend ? "destructive" : "default"}
            disabled={save.isPending || (suspend && reason.trim().length < 3)}
            onClick={() => save.mutate(undefined, { onSuccess: () => setOpen(false) })}
          >
            {suspend ? "Suspend account" : "Reactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({ staff, children }: { staff: StaffRow; children: ReactNode }) {
  const reset = useServerFn(resetStaffPassword);
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const m = useMutation({
    mutationFn: () => reset({ data: { user_id: staff.user_id, password: pw } }),
    onSuccess: () => {
      toast.success("Password reset. They've been signed out on all devices.");
      setOpen(false);
      setPw("");
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {staff.full_name || staff.email}</DialogTitle>
          <DialogDescription>Give them the new temporary password in person or by phone. All their devices are signed out.</DialogDescription>
        </DialogHeader>
        <Field label="New temporary password (8+ characters)" id="rpw" value={pw} onChange={setPw} />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={pw.length < 8 || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Resetting…" : "Reset password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SessionsDialog({ staff, children }: { staff: StaffRow; children: ReactNode }) {
  const { access } = useAccess();
  const [open, setOpen] = useState(false);
  const sessions = useQuery({ ...staffSessionsQuery(staff.user_id), enabled: open });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Devices — {staff.full_name || staff.email}</DialogTitle>
          <DialogDescription>Signing out a device ends that login immediately.</DialogDescription>
        </DialogHeader>
        {sessions.isError ? (
          <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
        ) : !sessions.data ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <DeviceSessionList sessions={sessions.data} currentId={access.deviceSessionId} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Roles ---------------- */

function RolesTab() {
  const roles = useQuery(rolesQuery());
  const perms = useQuery(permissionsQuery());
  const [roleId, setRoleId] = useState<string | null>(null);
  const role = roles.data?.find((r) => r.id === roleId) ?? roles.data?.[0];
  const [keys, setKeys] = useState<string[]>([]);
  useEffect(() => {
    if (role) setKeys(role.role_permissions.map((p) => p.permission_key));
  }, [role]);
  const save = useAction(() => supabase.rpc("set_role_permissions", { _role_id: role!.id, _permission_keys: keys }), {
    success: "Role permissions saved. Staff see the change next time they open the app.",
    invalidate: ["staff"],
  });
  if (roles.isError || perms.isError) return <ErrorState error={roles.error ?? perms.error} onRetry={() => void roles.refetch()} />;
  if (!roles.data || !perms.data || !role) return <div className="h-40 animate-pulse rounded-xl bg-card/70" />;
  const categories = [...new Set(perms.data.map((p) => p.category))];
  const dirty = [...keys].sort().join() !== role.role_permissions.map((p) => p.permission_key).sort().join();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <Card className="min-w-0 p-3">
        <ul className="space-y-1">
          {roles.data.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setRoleId(r.id)}
                className={cn("w-full rounded-lg px-3 py-2 text-left text-sm", r.id === role.id ? "bg-accent font-semibold text-navy" : "hover:bg-muted")}
              >
                {r.name}
                <span className="block text-xs font-normal text-muted-foreground">{r.role_permissions.length} permissions</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="min-w-0 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">{role.name}</h2>
            {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
          </div>
          {role.is_system ? (
            <Badge variant="neutral">Locked</Badge>
          ) : (
            <Button disabled={!dirty || save.isPending} onClick={() => save.mutate(undefined)}>
              {save.isPending ? "Saving…" : "Save permissions"}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {categories.map((c) => (
            <div key={c}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{c}</p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {perms.data
                  .filter((p) => p.category === c)
                  .map((p) => (
                    <label key={p.key} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        disabled={role.is_system}
                        checked={keys.includes(p.key)}
                        onCheckedChange={(v) => setKeys((k) => (v ? [...k, p.key] : k.filter((x) => x !== p.key)))}
                        className="mt-0.5"
                      />
                      {p.description}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsTab() {
  const settings = useQuery(settingsQuery());
  const [courier, setCourier] = useState("");
  const [service, setService] = useState("");
  const [cash, setCash] = useState(true);
  useEffect(() => {
    if (settings.data) {
      setCourier(koboToInput(settings.data.courier_fee_kobo));
      setService(String(settings.data.service_fee_bps / 100));
      setCash(settings.data.cash_enabled);
    }
  }, [settings.data]);
  const courierKobo = parseNairaToKobo(courier);
  const pct = Number(service);
  const bps = Number.isFinite(pct) && service.trim() !== "" ? Math.round(pct * 100) : null;
  const save = useAction(
    () => supabase.rpc("update_app_settings", { _courier_fee_kobo: courierKobo!, _service_fee_bps: bps!, _cash_enabled: cash }),
    { success: "Settings saved. New fees apply to orders placed from now on.", invalidate: ["settings"] },
  );
  if (settings.isError) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;
  if (!settings.data) return <div className="h-40 animate-pulse rounded-xl bg-card/70" />;
  return (
    <Card className="max-w-xl p-5">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="cf">Courier fee per order (₦)</Label>
          <Input id="cf" inputMode="decimal" value={courier} onChange={(e) => setCourier(e.target.value)} />
          <p className="text-xs text-muted-foreground">Currently {formatNaira(settings.data.courier_fee_kobo)}.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sf">Service fee (% of goods subtotal)</Label>
          <Input id="sf" inputMode="decimal" value={service} onChange={(e) => setService(e.target.value)} />
          <p className="text-xs text-muted-foreground">Currently {settings.data.service_fee_bps / 100}%.</p>
        </div>
        <label className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <span>
            <span className="block text-sm font-medium text-navy">Cash on delivery</span>
            <span className="block text-xs text-muted-foreground">When off, customers must pay with Paystack and staff can't record cash.</span>
          </span>
          <Switch checked={cash} onCheckedChange={setCash} />
        </label>
        <p className="text-xs text-muted-foreground">Existing orders keep the fees they were placed with.</p>
        <Button
          disabled={courierKobo === null || bps === null || bps < 0 || bps > 5000 || save.isPending}
          onClick={() => save.mutate(undefined)}
        >
          {save.isPending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </Card>
  );
}

/* ---------------- Audit ---------------- */

function AuditTab() {
  const { can } = useAccess();
  const audit = useQuery(auditQuery());
  const staff = useQuery({ ...staffListQuery(), enabled: can("staff.manage") });
  const names = new Map((staff.data ?? []).map((s) => [s.user_id, s.full_name || s.email]));
  if (audit.isError) return <ErrorState error={audit.error} onRetry={() => audit.refetch()} />;
  if (!audit.data) return <div className="h-40 animate-pulse rounded-xl bg-card/70" />;
  if (audit.data.length === 0) return <EmptyState icon={ShieldCheck} title="No activity recorded yet" />;
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Who</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audit.data.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-xs whitespace-nowrap text-muted-foreground">{formatDateTime(a.created_at)}</TableCell>
              <TableCell className="text-sm">{a.actor_id ? (names.get(a.actor_id) ?? a.actor_id.slice(0, 8)) : "System"}</TableCell>
              <TableCell className="font-mono text-xs">{a.action}</TableCell>
              <TableCell className="max-w-80 truncate font-mono text-xs text-muted-foreground" title={JSON.stringify(a.details)}>
                {JSON.stringify(a.details)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
