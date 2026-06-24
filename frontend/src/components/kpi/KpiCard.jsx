import React from 'react';
import { ArrowUp, ArrowDown, Minus, GitBranch } from 'lucide-react';
import { formatKpiValue } from '../../utils/formatNumber.js';

// KPI metric ID → backend correlation metric ID mapping.
// Only GRI metrics that have matching backend CORR_METRICS entries are included.
// SASB/BRSR KPI IDs are intentionally omitted — correlation runs on GRI datasets only.
const KPI_TO_CORR_METRIC = {
  'water-withdrawn':   'water_withdrawn',
  'water-consumed':    'water_consumed',
  'energy-consumed':   'energy_consumed',
  'total-ghg':         'scope1_ghg',
  'scope1-ghg':        'scope1_ghg',
  'waste-generated':   'waste_generated',
  'work-injuries':     'safety_incidents',
  'ltifr':             'safety_incidents',
  'trir':              'safety_incidents',
};

// Abbreviate long metric labels for the compact chip.
function shortLabel(label) {
  return label
    .replace('Water Withdrawn', 'Water Withdrawn')
    .replace('Energy Consumed', 'Energy')
    .replace('Scope 1 GHG', 'GHG')
    .replace('Waste Generated', 'Waste')
    .replace('Recordable Injuries', 'Injuries')
    .replace('Water Consumed', 'Water Consumed')
    .replace(/\s*\(.*?\)/, ''); // strip parenthetical units for brevity
}

function CorrChip({ corr }) {
  if (!corr) return null;
  const rColor = Math.abs(corr.r) >= 0.7 ? 'var(--accent-green)' : Math.abs(corr.r) >= 0.4 ? 'var(--accent-amber)' : 'var(--text-muted)';
  const dirArrow = corr.direction === 'positive' ? '↑' : '↓';
  const tooltip = `${corr.strength} ${corr.direction} correlation with ${corr.label}\nr = ${corr.r} (n=${corr.n})${corr.significant ? ' ✓ significant' : ''}`;
  return (
    <span
      className="kpi-corr-chip"
      data-tooltip={tooltip}
      style={{ '--corr-color': rColor }}
    >
      <GitBranch size={9} />
      {shortLabel(corr.label)} r={corr.r} {dirArrow}
    </span>
  );
}

// correlations: array from /api/kpi-correlations/{kpi_id} for this card's metric.
// correlationsKey: the KPI id used to look up the correlation metric (e.g. 'water-withdrawn').
export default function KpiCard({ id, label, value, unit, trend, status, Icon, iconColor, higherIsBetter, correlations }) {
  const isPlaceholder = status === 'placeholder';
  const displayValue  = isPlaceholder || value === null || value === undefined
    ? '—'
    : formatKpiValue(value);

  let trendClass = 'neutral';
  let TrendIcon  = Minus;
  let trendAbs   = null;

  if (typeof trend === 'number') {
    const isUp = trend > 0;
    TrendIcon  = isUp ? ArrowUp : ArrowDown;
    trendAbs   = Math.abs(trend);

    if (higherIsBetter === null || higherIsBetter === undefined) {
      trendClass = 'neutral';
    } else if (higherIsBetter) {
      trendClass = isUp ? 'positive' : 'negative';
    } else {
      trendClass = isUp ? 'negative' : 'positive';
    }
  }

  const iconStyle = { color: iconColor || 'var(--accent)' };

  // Show the strongest significant correlation for this KPI, if available.
  const corrMetricId = id ? KPI_TO_CORR_METRIC[id] : null;
  const topCorr = correlations && corrMetricId
    ? (correlations[corrMetricId]?.[0] || null)
    : null;

  return (
    <div className={`kpi-card ${isPlaceholder ? 'placeholder' : ''}`}>
      {Icon && (
        <div className="kpi-icon-wrap" style={{ '--kpi-icon-color': iconColor || 'var(--accent)' }}>
          <Icon size={30} style={iconStyle} />
        </div>
      )}

      <span className="kpi-label">{label}</span>

      <div className="kpi-value-row">
        <span className="kpi-value" title={displayValue}>{displayValue}</span>
        {!isPlaceholder && unit && <span className="kpi-unit">{unit}</span>}
      </div>

      {isPlaceholder && <div className="kpi-awaiting">Awaiting data</div>}

      {!isPlaceholder && (
        <span className={`trend-chip ${trendClass}`}>
          {trendAbs !== null ? (
            <>
              <TrendIcon size={11} />
              <span>{trendAbs}%</span>
              <span className="trend-chip-label">(YoY Change)</span>
            </>
          ) : (
            'N/A'
          )}
        </span>
      )}

      {!isPlaceholder && topCorr && <CorrChip corr={topCorr} />}
    </div>
  );
}

export { KPI_TO_CORR_METRIC };
