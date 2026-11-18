import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";

export function CancelAssignmentDialog({
  assignmentId,
  label,
  children,
}: {
  assignmentId: string;
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const save = useAction(() => supabase.rpc("cancel_courier_assignment", { _assignment_id: assignmentId, _reason: reason.trim() }), {
    success: "Courier unassigned — order is back in the courier queue",
    invalidate: ["deliveries", "couriers", "orders", "dashboard"],
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unassign courier</DialogTitle>
          <DialogDescription>{label}. The order goes back to "Awaiting courier".</DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Reason (required)" autoFocus />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep assignment
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3 || save.isPending}
            onClick={() => save.mutate(undefined, { onSuccess: () => setOpen(false) })}
          >
            {save.isPending ? "Saving…" : "Unassign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
