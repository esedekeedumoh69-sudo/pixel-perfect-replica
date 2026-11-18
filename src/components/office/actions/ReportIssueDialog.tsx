import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAction } from "@/hooks/use-action";

export function ReportIssueDialog({ orderId, orderNumber, children }: { orderId: string; orderNumber: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const save = useAction(() => supabase.rpc("report_delivery_issue", { _order_id: orderId, _message: message.trim() }), {
    success: "Issue recorded",
    invalidate: ["deliveries", "dashboard"],
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a delivery issue</DialogTitle>
          <DialogDescription>Order {orderNumber}. Staff who monitor deliveries are notified.</DialogDescription>
        </DialogHeader>
        <Textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          placeholder="e.g. Customer not answering phone at the gate"
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={message.trim().length < 3 || save.isPending}
            onClick={() =>
              save.mutate(undefined, {
                onSuccess: () => {
                  setOpen(false);
                  setMessage("");
                },
              })
            }
          >
            {save.isPending ? "Saving…" : "Report issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
