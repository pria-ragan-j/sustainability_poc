// Shared Chart.js utility helpers.
// Import into any chart component to get consistent axis labels,
// tooltip formatting, and K/M number abbreviation.

/**
 * Smart number formatter for Chart.js tick callbacks and tooltip labels.
 * Abbreviates large values: ≥1M → "1.2M", ≥1K → "1.2K", else raw value.
 * Pass directly as `ticks: { callback: fmtVal }`.
 */
export function fmtVal(v) {
  if (v === null || v === undefined || v === '') return v;
  const n = Number(v);
  if (isNaN(n)) return v;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  // Keep up to 2 decimal places; strip trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}

/**
 * Returns a Chart.js axis title configuration object.
 * Usage: scales: { x: { title: axisTitle('Month') }, y: { title: axisTitle('Volume (ML)') } }
 */
export function axisTitle(text) {
  return {
    display: true,
    text,
    color: '#475569',
    font: { size: 11, weight: '500' },
    padding: { top: 4, bottom: 4 },
  };
}

/**
 * Returns a Chart.js tooltip callbacks object that appends a unit suffix
 * to each label and formats the value using fmtVal.
 * Usage: tooltip: { ...tooltipBase, callbacks: tooltipWithUnit('ML') }
 */
export function tooltipWithUnit(unit) {
  return {
    label(ctx) {
      const label  = ctx.dataset.label || ctx.label || '';
      const raw    = ctx.parsed?.y ?? ctx.parsed?.x ?? ctx.raw;
      const formatted = fmtVal(raw);
      // If the dataset label already contains the unit, don't double-append
      const unitSuffix = label.includes(unit) ? '' : ` ${unit}`;
      return ` ${label}: ${formatted}${unitSuffix}`;
    },
  };
}
