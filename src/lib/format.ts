/** Money is stored in kobo (integer). ₦1 = 100 kobo. */
export function formatNaira(kobo: number | null | undefined): string {
  if (kobo === null || kobo === undefined) return "—";
  const naira = Number(kobo) / 100;
  return "₦" + naira.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Parse a naira amount typed by staff ("1,500" or "1500.50") into kobo. Returns null when invalid. */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, "");
  if (cleaned === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatQty(q: number | string): string {
  const n = Number(q);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/** Same rule as the backend's recompute_order_totals — used only for previews; backend is authoritative. */
export function previewTotals(subtotalKobo: number, serviceFeeBps: number, courierFeeKobo: number, discountKobo: number) {
  const service = Math.round((subtotalKobo * serviceFeeBps) / 10000);
  return {
    subtotal: subtotalKobo,
    service,
    courier: courierFeeKobo,
    discount: discountKobo,
    total: Math.max(0, subtotalKobo + service + courierFeeKobo - discountKobo),
  };
}
