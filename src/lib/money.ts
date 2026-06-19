/** INR formatting helpers — the API stores all amounts as paise-precise numbers. */

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const INR_DECIMAL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function rupees(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return INR.format(amount);
}

export function rupeesPrecise(amount: number | null | undefined): string {
  if (amount == null) return "—";
  return INR_DECIMAL.format(amount);
}

/** Short form: 1,25,000 → "1.25L", 12,50,000 → "12.5L", 1.5cr → "1.5Cr". */
export function rupeesShort(amount: number | null | undefined): string {
  if (amount == null) return "—";
  const a = Math.abs(amount);
  if (a >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
  if (a >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  if (a >= 1_000) return `₹${(amount / 1_000).toFixed(1)}K`;
  return INR.format(amount);
}
