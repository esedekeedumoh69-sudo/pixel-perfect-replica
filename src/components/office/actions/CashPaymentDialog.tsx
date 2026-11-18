import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAction } from "@/hooks/use-action";
import { formatNaira } from "@/lib/format";

export function CashPaymentDialog({
  orderId,
  orderNumber,
  totalKobo,
  children,
}: {
  orderId: string;
  orderNumber: string;
  totalKobo: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const save = useAction(
    () => supabase.rpc("record_cash_payment", { _order_id: orderId, _amount_kobo: totalKobo, _note: note.trim() || "" }),
    { success: "Cash payment recorded", invalidate: ["orders", "payments", "dashboard"] },
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setConfirmed(false);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record cash received</DialogTitle>
          <DialogDescription>Order {orderNumber}</DialogDescription>
        </DialogHeader>
        <div className="rounded-xl bg-accent p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount due</p>
          <p className="font-display text-3xl font-bold text-navy tabular">{formatNaira(totalKobo)}</p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(v === true)} className="mt-0.5" />
          <span>I confirm LightGrab has received exactly {formatNaira(totalKobo)} in cash for this order.</span>
        </label>
        <div className="space-y-1.5">
          <Label htmlFor="cash-note">Note (who collected it, optional)</Label>
          <Textarea id="cash-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!confirmed || save.isPending} onClick={() => save.mutate(undefined, { onSuccess: () => setOpen(false) })}>
            {save.isPending ? "Saving…" : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
