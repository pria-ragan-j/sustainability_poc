import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, TrendingUp, TrendingDown, Filter, Settings, X,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext.jsx';
import api from '../api/client.js';

const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

const OUTLIER_DOMAIN_LABEL = {
  water: 'Water', waste: 'Waste', energy: 'Energy', emissions: 'GHG & Air Quality', safety: 'Safety',
};

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All Domains' },
  { value: 'water', label: 'Water' },
  { value: 'waste', label: 'Waste' },
  { value: 'energy', label: 'Energy' },
  { value: 'emissions', label: 'GHG & Air Quality' },
  { value: 'safety', label: 'Safety' },
];

function severityTooltip(anomaly) {
  const label = SEVERITY_LABEL[anomaly.severity] || anomaly.severity;
  return `This change: ${anomaly.change_pct}% YoY → ${label}\nHigh range = 50% or more\nMedium range = 25% to 49%\nLow range = 12% to 24%\n(changes under 12% aren't flagged)`;
}

function AnomalyCard({ anomaly }) {
  const up    = anomaly.direction === 'up';
  const Icon  = up ? TrendingUp : TrendingDown;
  const parts = anomaly.description.split(/\*\*(.*?)\*\*/g);

  return (
    <div className={`alert-card ${anomaly.severity}`}>
      <span
        className={`outlier-severity-dot ${anomaly.severity}`}
        data-tooltip={severityTooltip(anomaly)}
      />
      <Icon size={16} className={`outlier-trend-icon ${up ? 'up' : 'down'}`} />
      <span className="alert-card-body">
        <span className="alert-card-domain">{OUTLIER_DOMAIN_LABEL[anomaly.domain] || anomaly.domain}</span>
        <span className="alert-card-desc">
          {parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))}
        </span>
      </span>
      <span
        className={`outlier-badge ${anomaly.severity} tooltip-align-right`}
        data-tooltip={severityTooltip(anomaly)}
      >
        {SEVERITY_LABEL[anomaly.severity] || anomaly.severity}
      </span>
    </div>
  );
}

// ─── Threshold config panel ───────────────────────────────────────────────────

const ALL_DOMAINS = ['water', 'waste', 'energy', 'emissions', 'safety'];

function ThresholdPanel({ onClose }) {
  const [config, setConfig]             = useState(null);
  const [editDomain, setEditDomain]     = useState('water');
  const [low, setLow]                   = useState(12);
  const [medium, setMedium]             = useState(25);
  const [high, setHigh]                 = useState(50);
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState('');

  useEffect(() => {
    api.getAlertConfig().then((cfg) => {
      setConfig(cfg);
      loadDomain('water', cfg);
    }).catch(() => {});
  }, []);

  const loadDomain = (d, cfg = config) => {
    if (!cfg) return;
    const t = cfg.domains[d] || cfg.defaults;
    setEditDomain(d);
    setLow(t.low);
    setMedium(t.medium);
    setHigh(t.high);
  };

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateAlertConfig(editDomain, parseFloat(low), parseFloat(medium), parseFloat(high));
      setSaveMsg('Saved!');
      const updated = await api.getAlertConfig();
      setConfig(updated);
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await api.resetAlertConfig(editDomain);
      setSaveMsg('Reset to defaults');
      const updated = await api.getAlertConfig();
      setConfig(updated);
      loadDomain(editDomain, updated);
    } catch {
      setSaveMsg('Reset failed');
    } finally {
      setSaving(false);
    }
  };

  const isCustom = config?.domains?.[editDomain] != null;
  const def = config?.defaults || { low: 12, medium: 25, high: 50 };
  const validOrder = parseFloat(low) > 0 && parseFloat(low) < parseFloat(medium) && parseFloat(medium) < parseFloat(high);

  return (
    <div className="threshold-panel">
      <div className="threshold-panel-header">
        <Settings size={15} />
        <span>Anomaly Thresholds</span>
        <button className="threshold-close-btn" onClick={onClose}><X size={14} /></button>
      </div>
      <p className="threshold-hint">
        YoY % change thresholds. Default: Low ≥{def.low}%, Medium ≥{def.medium}%, High ≥{def.high}%.
      </p>
      <div className="threshold-domain-tabs">
        {ALL_DOMAINS.map((d) => (
          <button
            key={d}
            className={`threshold-domain-tab ${editDomain === d ? 'active' : ''} ${config?.domains?.[d] ? 'custom' : ''}`}
            onClick={() => loadDomain(d)}
          >
            {OUTLIER_DOMAIN_LABEL[d]}
            {config?.domains?.[d] ? ' *' : ''}
          </button>
        ))}
      </div>
      <div className="threshold-fields">
        <label>
          <span>Low severity ≥</span>
          <input type="number" min="1" max="99" value={low} onChange={(e) => setLow(e.target.value)} className="threshold-input" />
          <span>%</span>
        </label>
        <label>
          <span>Medium severity ≥</span>
          <input type="number" min="1" max="99" value={medium} onChange={(e) => setMedium(e.target.value)} className="threshold-input" />
          <span>%</span>
        </label>
        <label>
          <span>High severity ≥</span>
          <input type="number" min="1" max="200" value={high} onChange={(e) => setHigh(e.target.value)} className="threshold-input" />
          <span>%</span>
        </label>
      </div>
      {!validOrder && <p className="threshold-error">Thresholds must be in order: Low &lt; Medium &lt; High</p>}
      <div className="threshold-actions">
        {isCustom && <button className="threshold-btn reset" onClick={reset} disabled={saving}>Reset to default</button>}
        <button className="threshold-btn save" onClick={save} disabled={saving || !validOrder}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {saveMsg && <p className="threshold-save-msg">{saveMsg}</p>}
    </div>
  );
}

// ─── Main AlertsPage ──────────────────────────────────────────────────────────

export default function AlertsPage() {
  const [searchParams] = useSearchParams();
  const { griFilters, updateGriFilter } = useAppContext();

  const [filterOptions, setFilterOptions] = useState({ years: [], plants: [], regions: [] });
  const [anomalies, setAnomalies]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [showThresholds, setShowThresholds] = useState(false);

  // Filter state
  const [domainFilter, setDomainFilter]     = useState(searchParams.get('domain') || 'all');
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    api.getFilters('water').then(setFilterOptions).catch(() => {});
  }, []);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    api.getAlerts({
      domain:   domainFilter !== 'all' ? domainFilter : undefined,
      year:     griFilters.year   !== 'all' ? griFilters.year   : undefined,
      plant:    griFilters.plant  !== 'all' ? griFilters.plant  : undefined,
      region:   griFilters.region !== 'all' ? griFilters.region : undefined,
    })
      .then((d) => setAnomalies(d.anomalies || []))
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, [domainFilter, griFilters.year, griFilters.plant, griFilters.region]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // Client-side severity filter applied to the already-domain-filtered data
  const visible = anomalies.filter((a) => severityFilter === 'all' || a.severity === severityFilter);

  return (
    <div className="alerts-page">
      {showThresholds && (
        <div className="threshold-overlay" onClick={() => setShowThresholds(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ThresholdPanel onClose={() => setShowThresholds(false)} />
          </div>
        </div>
      )}

      <div className="content-header">
        <h2 className="content-title">
          <AlertTriangle size={18} />
          Alerts / Anomaly Detection
        </h2>
        <div className="alerts-header-actions">
          <div className="summary-filter-bar">
            <span className="summary-filter-icon"><Filter size={13} /></span>
            <select
              className="filter-select"
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
            >
              {DOMAIN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="filter-select" value={griFilters.year} onChange={(e) => updateGriFilter('year', e.target.value)}>
              <option value="all">All Years</option>
              {filterOptions.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="filter-select" value={griFilters.plant} onChange={(e) => updateGriFilter('plant', e.target.value)}>
              <option value="all">All Plants</option>
              {filterOptions.plants.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button className="alerts-threshold-btn" onClick={() => setShowThresholds(true)} title="Configure thresholds">
            <Settings size={14} />
            Thresholds
          </button>
        </div>
      </div>

      {/* Severity filter tabs */}
      <div className="alerts-severity-tabs">
        {['all', 'high', 'medium', 'low'].map((s) => (
          <button
            key={s}
            className={`alerts-severity-tab ${severityFilter === s ? 'active' : ''}`}
            onClick={() => setSeverityFilter(s)}
          >
            {s === 'all' ? 'All Severities' : SEVERITY_LABEL[s]}
            <span className="alerts-severity-count">
              {s === 'all' ? anomalies.length : anomalies.filter((a) => a.severity === s).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="summary-loading">Scanning for anomalies…</div>
      ) : visible.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={36} className="placeholder-icon" />
          <p className="placeholder-title">No anomalies in the current filter window.</p>
        </div>
      ) : (
        <div className="alert-card-list">
          {visible.map((a, i) => (
            <AnomalyCard key={`${a.alert_id}-${i}`} anomaly={a} />
          ))}
        </div>
      )}
    </div>
  );
}
