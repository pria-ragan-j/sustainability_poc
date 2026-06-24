import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';

const AGG_LABELS = {
  sum: 'Σ Total',
  avg: 'x̄ Average',
  rate: 'Rate',
  weighted: '⚖ Weighted',
};

export default function ChartCard({ id, title, agg, children }) {
  const { expandedChart, setExpandedChart } = useAppContext();
  const isExpanded = expandedChart === id;

  return (
    <div className={`chart-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="chart-card-header">
        <div className="chart-card-title-group">
          <span className="chart-card-title">{title}</span>
          {agg && <span className="chart-agg-badge">{AGG_LABELS[agg] || agg}</span>}
        </div>
        <button
          className="chart-card-expand-btn"
          onClick={() => setExpandedChart(isExpanded ? null : id)}
          aria-label={isExpanded ? 'Collapse chart' : 'Expand chart'}
        >
          {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}
