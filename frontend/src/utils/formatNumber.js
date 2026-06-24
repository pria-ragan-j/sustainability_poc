// Indian-style digit grouping (lakhs/crores): 1250000 -> "12,50,000".
// Intl's 'en-IN' locale implements this grouping natively - no custom
// digit-grouping algorithm needed. Values under 1,000 are unaffected.
export function formatKpiValue(value, { maxDecimals = 2 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return value;
  if (typeof value !== 'number') return value;

  // No minimumFractionDigits: Intl rounds to maxDecimals but trims trailing
  // zeros on its own, so whole numbers stay whole (933,275 not 933,275.00)
  // while real decimals like LTIFR's 18.19 are preserved.
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: maxDecimals }).format(value);
}
