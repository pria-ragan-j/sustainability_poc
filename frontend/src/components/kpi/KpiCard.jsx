import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { formatKpiValue } from '../../utils/formatNumber.js';

// limit: this card's own entry from /api/limits (passed by DomainsPage.jsx,
// looked up by KPI id) - { threshold, baseline_default }. higherIsBetter
// flips the breach direction: for "higher is better" KPIs (renewable %,
// diversion rate, etc.) breaching means falling BELOW the threshold instead
// of going above it.
function LimitBadge({ value, limit, higherIsBetter, unit, tooltipAlign }) {
  if (!limit || value === null || value === undefined) return null;
  const { threshold, baseline_default } = limit;
  if (threshold === null || threshold === undefined) return null;

  const isMinimum = higherIsBetter === true;
  const breached  = isMinimum ? value < threshold : value > threshold;
  const text      = breached ? (isMinimum ? 'Below Minimum' : 'Exceeds Limit') : 'Within Limit';
  const alignClass = tooltipAlign ? ` tooltip-align-${tooltipAlign}` : '';
  const tooltip = `Threshold: ${formatKpiValue(threshold)}${unit ? ` ${unit}` : ''}\nBaseline avg (all years): ${formatKpiValue(baseline_default)}${unit ? ` ${unit}` : ''}`;

  return (
    <Link
      to="/limits"
      className={`kpi-limit-chip ${breached ? 'kpi-limit-chip--breach' : 'kpi-limit-chip--ok'}${alignClass}`}
      data-tooltip={tooltip}
    >
      {text}
    </Link>
  );
}

export default function KpiCard({ id, label, value, unit, trend, status, Icon, iconColor, higherIsBetter, limit, hideTrend, tooltipAlign, gri, sasb, principle }) {
  const isPlaceholder = status === 'placeholder';
  const standardCode = gri || sasb || (principle ? `BRSR ${principle}` : null);
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

  return (
    <div className={`kpi-card ${isPlaceholder ? 'placeholder' : ''}`}>
      {standardCode && <span className="kpi-standard-badge">{standardCode}</span>}
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

      {!isPlaceholder && !hideTrend && (
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

      {!isPlaceholder && !hideTrend && (
        <LimitBadge value={value} limit={limit} higherIsBetter={higherIsBetter} unit={unit} tooltipAlign={tooltipAlign} />
      )}
    </div>
  );
}
