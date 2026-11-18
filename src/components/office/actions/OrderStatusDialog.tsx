import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";
import { MANUAL_STATUS_TARGETS, ORDER_STATUS_META, type OrderStatus, type PaymentStatus } from "@/lib/status";

export function OrderStatusDialog({
  orderId,
  current,
  paymentStatus,
  children,
}: {
  orderId: string;
  current: OrderStatus;
  paymentStatus: PaymentStatus;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const save = useAction(
    (v: { status: OrderStatus; note: string }) =>
      supabase.rpc("update_order_status", { _order_id: orderId, _status: v.status, _note: v.note || undefined }),
    { success: "Order status updated", invalidate: ["orders", "dashboard", "deliveries"] },
  );
  const targets = MANUAL_STATUS_TARGETS.filter((s) => s !== current);
  const needsReason = status === "cancelled";
  const blockedComplete = status === "completed" && paymentStatus !== "paid";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setStatus("");
          setNote("");
        }
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change order status</DialogTitle>
          <DialogDescription>Currently: {ORDER_STATUS_META[current].label}. Courier assignment is done on the Couriers page.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>New status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as OrderStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a status" />
            </SelectTrigger>
            <SelectContent>
              {targets.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status-note">{needsReason ? "Reason for cancelling (required)" : "Note (optional)"}</Label>
          <Textarea id="status-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        {blockedComplete && (
          <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
            An order can only be completed after its payment is verified.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant={status === "cancelled" ? "destructive" : "default"}
            disabled={!status || save.isPending || blockedComplete || (needsReason && note.trim().length < 3)}
            onClick={() => status && save.mutate({ status, note: note.trim() }, { onSuccess: () => setOpen(false) })}
          >
            {save.isPending ? "Saving…" : status === "cancelled" ? "Cancel order" : "Update status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
