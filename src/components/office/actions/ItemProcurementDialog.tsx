import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAction, nullable } from "@/hooks/use-action";
import { formatNaira, formatQty, koboToInput, parseNairaToKobo } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";
import type { ItemAvailability } from "@/lib/status";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ItemAvailability; label: string; hint: string }[] = [
  { value: "found", label: "Bought", hint: "Enter the price actually paid" },
  { value: "substituted", label: "Substitute", hint: "Customer must approve" },
  { value: "unavailable", label: "Unavailable", hint: "Not charged" },
  { value: "pending", label: "Not yet bought", hint: "Reset" },
];

export function ItemProcurementDialog({ item, children }: { item: Tables<"order_items">; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [availability, setAvailability] = useState<ItemAvailability>(item.availability === "pending" ? "found" : item.availability);
  const [price, setPrice] = useState(koboToInput(item.actual_price_kobo ?? item.target_price_kobo));
  const [subName, setSubName] = useState(item.substitute_name ?? "");
  const [subPrice, setSubPrice] = useState(koboToInput(item.substitute_price_kobo));
  const [note, setNote] = useState(item.procurement_note ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const save = useAction(
    (v: {
      _item_id: string;
      _availability: ItemAvailability;
      _actual_price_kobo: number | null;
      _substitute_name: string | null;
      _substitute_price_kobo: number | null;
      _note: string | null;
    }) =>
      supabase.rpc("record_item_procurement", {
        _item_id: v._item_id,
        _availability: v._availability,
        _actual_price_kobo: nullable(v._actual_price_kobo),
        _substitute_name: nullable(v._substitute_name),
        _substitute_price_kobo: nullable(v._substitute_price_kobo),
        _note: nullable(v._note),
      }),
    { success: `${item.name} updated` },
  );

  function submit() {
    setFormError(null);
    let actual: number | null = null;
    let sp: number | null = null;
    if (availability === "found") {
      actual = parseNairaToKobo(price);
      if (actual === null) return setFormError("Enter the price paid, e.g. 2500 or 2,500.");
    }
    if (availability === "substituted") {
      sp = parseNairaToKobo(subPrice);
      if (!subName.trim()) return setFormError("Enter the substitute item name.");
      if (sp === null) return setFormError("Enter the substitute price.");
    }
    save.mutate(
      {
        _item_id: item.id,
        _availability: availability,
        _actual_price_kobo: actual,
        _substitute_name: availability === "substituted" ? subName.trim() : null,
        _substitute_price_kobo: sp,
        _note: note.trim() || null,
      },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            {formatQty(item.quantity)} {item.unit}
            {item.target_price_kobo !== null && <> · customer's guide price {formatNaira(item.target_price_kobo)}</>}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setAvailability(o.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition",
                availability === o.value ? "border-primary bg-accent ring-2 ring-primary/30" : "hover:border-primary/40",
              )}
            >
              <span className="block text-sm font-semibold text-navy">{o.label}</span>
              <span className="block text-xs text-muted-foreground">{o.hint}</span>
            </button>
          ))}
        </div>
        {availability === "found" && (
          <div className="space-y-1.5">
            <Label htmlFor="price">Total price paid for this line (₦)</Label>
            <Input id="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} autoFocus />
          </div>
        )}
        {availability === "substituted" && (
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="sub">Substitute item</Label>
              <Input id="sub" value={subName} onChange={(e) => setSubName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subp">Price (₦)</Label>
              <Input id="subp" inputMode="decimal" value={subPrice} onChange={(e) => setSubPrice(e.target.value)} />
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="note">Internal note (optional)</Label>
          <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
