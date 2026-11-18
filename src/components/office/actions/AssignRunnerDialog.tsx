import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction, nullable } from "@/hooks/use-action";
import { activeStaffQuery } from "@/lib/queries";

const NONE = "__none__";

export function AssignRunnerDialog({
  orderId,
  orderNumber,
  current,
  children,
}: {
  orderId: string;
  orderNumber: string;
  current?: { assigned_to: string | null; runner_name: string | null; instructions: string | null } | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState(current?.assigned_to ?? NONE);
  const [runner, setRunner] = useState(current?.runner_name ?? "");
  const [instructions, setInstructions] = useState(current?.instructions ?? "");
  const staffList = useQuery({ ...activeStaffQuery(), enabled: open });
  const save = useAction(
    () =>
      supabase.rpc("assign_procurement", {
        _order_id: orderId,
        _assigned_to: nullable(staff === NONE ? null : staff),
        _runner_name: nullable(runner.trim() || null),
        _instructions: nullable(instructions.trim() || null),
        _status: "assigned",
      }),
    { success: `Procurement assigned for ${orderNumber}` },
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign market buying</DialogTitle>
          <DialogDescription>Order {orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Responsible staff member</Label>
          <Select value={staff} onValueChange={setStaff}>
            <SelectTrigger>
              <SelectValue placeholder="Choose staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No staff member</SelectItem>
              {(staffList.data ?? []).map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.full_name || s.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="runner">Market runner name (optional)</Label>
          <Input id="runner" value={runner} onChange={(e) => setRunner(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="instr">Instructions for the runner</Label>
          <Textarea id="instr" rows={3} value={instructions} onChange={(e) => setInstructions(e.target.value)} maxLength={1000} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending || (staff === NONE && !runner.trim())}
            onClick={() => save.mutate(undefined, { onSuccess: () => setOpen(false) })}
          >
            {save.isPending ? "Saving…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
