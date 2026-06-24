import React, { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';

const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

// Domain nav id → underlying backend domain key (same map used by AlertsPage routing).
const NAV_TO_OUTLIER_DOMAIN = {
  water: 'water', waste: 'waste', energy: 'energy', ghg: 'emissions', safety: 'safety',
};

function SeverityBar({ anomalies }) {
  if (!anomalies.length) return null;
  const high   = anomalies.filter((a) => a.severity === 'high').length;
  const medium = anomalies.filter((a) => a.severity === 'medium').length;
  const low    = anomalies.filter((a) => a.severity === 'low').length;
  return (
    <span className="outlier-severity-bar">
      {high   > 0 && <span className="outlier-sbar-seg high"   title={`${high} High`}>{high}H</span>}
      {medium > 0 && <span className="outlier-sbar-seg medium" title={`${medium} Medium`}>{medium}M</span>}
      {low    > 0 && <span className="outlier-sbar-seg low"    title={`${low} Low`}>{low}L</span>}
    </span>
  );
}

function TrendSummaryItem({ trend }) {
  const up = trend.direction === 'up';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className="trend-summary-item">
      <Icon size={12} className={`outlier-trend-icon ${up ? 'up' : 'down'}`} />
      <span className="trend-summary-metric">{trend.metric}:</span>
      <span className="trend-summary-change">{trend.change_pct}%</span>
      <span className="trend-summary-metric">({trend.prev_year}→{trend.year})</span>
    </span>
  );
}

// domain: the outlier domain key (water, waste, energy, emissions, safety).
// filters: passed by DomainsPage from griFilters/sasbFilters/brsrFilters.
export default function OutlierPanel({ domain, filters }) {
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState([]);
  const [latestTrend, setLatestTrend] = useState([]);
  const [collapsed, setCollapsed] = useState(true); // collapsed by default
  const [loading, setLoading] = useState(false);

  const fetchOutliers = useCallback(() => {
    if (!domain) return;
    setLoading(true);
    api.getOutliers(domain, {
      year:   filters.year   !== 'all' ? filters.year   : undefined,
      plant:  filters.plant  !== 'all' ? filters.plant  : undefined,
      region: filters.region !== 'all' ? filters.region : undefined,
    })
      .then((d) => {
        setAnomalies(d.anomalies || []);
        setLatestTrend(d.latest_trend || []);
      })
      .catch(() => { setAnomalies([]); setLatestTrend([]); })
      .finally(() => setLoading(false));
  }, [domain, filters.year, filters.plant, filters.region]);

  useEffect(() => { fetchOutliers(); }, [fetchOutliers]);

  if (!loading && anomalies.length === 0 && latestTrend.length === 0) return null;

  const viewInAlerts = () => navigate(`/alerts?domain=${domain}`);

  return (
    <div className="outlier-panel">
      <button className="outlier-panel-header" onClick={() => setCollapsed((v) => !v)}>
        <AlertTriangle size={15} className="outlier-header-icon" />
        <span className="outlier-panel-title">
          Anomaly Detection
          {anomalies.length > 0 && (
            <span className="outlier-count-badge">{anomalies.length}</span>
          )}
        </span>
        {anomalies.length > 0 && <SeverityBar anomalies={anomalies} />}
        {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {!loading && latestTrend.length > 0 && (
        <div className="trend-summary">
          {latestTrend.map((t, i) => <TrendSummaryItem key={i} trend={t} />)}
        </div>
      )}

      {!collapsed && (
        <div className="outlier-panel-body">
          {loading ? (
            <div className="outlier-loading">Analysing trends…</div>
          ) : anomalies.length > 0 ? (
            <button className="outlier-view-all-btn" onClick={viewInAlerts}>
              <ExternalLink size={12} />
              View {anomalies.length} anomal{anomalies.length === 1 ? 'y' : 'ies'} in Alerts →
            </button>
          ) : (
            <div className="outlier-loading">No anomalies above the threshold in the recent reporting window.</div>
          )}
        </div>
      )}
    </div>
  );
}
