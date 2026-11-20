import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/office/PageHeader";
import { ErrorState } from "@/components/office/States";
import { DeviceSessionList } from "@/components/office/DeviceSessionList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccess } from "@/hooks/use-access";
import { useAction } from "@/hooks/use-action";
import { mySessionsQuery } from "@/lib/queries";
import type { Access } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/_shell/profile")({
  head: () => ({ meta: [{ title: "My profile — LightGrab Office" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { access } = useAccess();
  const qc = useQueryClient();
  const [name, setName] = useState(access.full_name);
  const [phone, setPhone] = useState(access.phone ?? "");
  const sessions = useQuery(mySessionsQuery(access.user_id));
  const save = useAction(() => supabase.rpc("update_my_profile", { _full_name: name.trim(), _phone: phone.trim() }), {
    success: "Profile saved",
    invalidate: [],
  });

  return (
    <>
      <PageHeader title="My profile" description="Your details, password and the devices you're signed in on." />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-navy">Your details</h2>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={access.email} disabled />
              <p className="text-xs text-muted-foreground">Only an administrator can change your email or roles.</p>
            </div>
            <Button
              disabled={save.isPending || name.trim().length < 2 || (name === access.full_name && phone === (access.phone ?? ""))}
              onClick={() =>
                save.mutate(undefined, {
                  onSuccess: () =>
                    qc.setQueryData<Access>(["access"], (a) => (a ? { ...a, full_name: name.trim(), phone: phone.trim() || null } : a)),
                })
              }
            >
              {save.isPending ? "Saving…" : "Save details"}
            </Button>
          </div>
        </Card>
        <div className="min-w-0 space-y-6">
          <PasswordCard />
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-semibold text-navy">Your roles</h2>
            <div className="flex flex-wrap gap-2">
              {access.roles.map((r) => (
                <Badge key={r.key} variant="navy">
                  {r.name}
                </Badge>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{access.permissions.length} permissions from these roles.</p>
          </Card>
        </div>
      </div>
      <Card className="mt-6 p-5">
        <h2 className="mb-2 font-display text-lg font-semibold text-navy">Signed-in devices</h2>
        {sessions.isError ? (
          <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
        ) : !sessions.data ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <DeviceSessionList sessions={sessions.data} currentId={access.deviceSessionId} />
        )}
      </Card>
    </>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const mismatch = pw2.length > 0 && pw !== pw2;
  async function change() {
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      toast.error(/same|different/i.test(error.message) ? "Choose a password different from your current one." : "The password couldn't be changed. Please try again.");
      return;
    }
    setPw("");
    setPw2("");
    toast.success("Password changed");
  }
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-display text-lg font-semibold text-navy">Change password</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw2">Repeat new password</Label>
          <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          {mismatch && <p className="text-xs text-destructive">The passwords don't match.</p>}
        </div>
        <Button disabled={busy || pw.length < 8 || pw !== pw2} onClick={() => void change()}>
          {busy ? "Changing…" : "Change password"}
        </Button>
      </div>
    </Card>
  );
}
