import React, { useEffect, useState, useCallback } from 'react';
import { Gauge } from 'lucide-react';
import api from '../api/client.js';
import { formatKpiValue } from '../utils/formatNumber.js';
import {
  ENV_KPI_GROUPS, SOCIAL_KPI_GROUPS, SASB_KPI_GROUPS, BRSR_KPI_GROUPS,
} from '../constants/kpiGroups.js';

// Same per-domain grouping the dashboard tabs use, just flattened into one
// page instead of split across routes - keeps the Limits list in the exact
// same domain/order a user already expects from the dashboard nav.
const FRAMEWORK_GROUPS = {
  GRI: {
    groups: { ...ENV_KPI_GROUPS, ...SOCIAL_KPI_GROUPS },
    labels: {
      water: 'Water', waste: 'Waste', energy: 'Energy', emissions: 'GHG & Air Quality',
      workforce: 'Workforce', safety: 'Safety', development: 'Development',
    },
  },
  SASB: {
    groups: SASB_KPI_GROUPS,
    labels: {
      sasb_ghg_air: 'GHG & Air Quality', sasb_energy: 'Energy', sasb_water: 'Water',
      sasb_waste: 'Waste', sasb_safety: 'Safety', sasb_process_safety: 'Process Safety',
    },
  },
  BRSR: {
    groups: BRSR_KPI_GROUPS,
    labels: {
      brsr_energy: 'Energy', brsr_water: 'Water', brsr_ghg_air: 'GHG & Air Quality',
      brsr_waste: 'Waste', brsr_workforce: 'Workforce', brsr_training: 'Training',
      brsr_safety: 'Safety', brsr_csr: 'CSR (P8)', brsr_compliance: 'Ethics & Compliance (P1)',
    },
  },
};

function LimitRow({ kpi, editValue, onChange, onReset }) {
  if (!kpi) return null;
  const { label, unit, baseline_default, is_override } = kpi;
  return (
    <div className="limits-row">
      <span className="limits-row-label">{label}</span>
      <span className="limits-baseline-hint">
        Avg: {baseline_default !== null && baseline_default !== undefined ? formatKpiValue(baseline_default) : '—'} {unit || ''}
      </span>
      <input
        type="number"
        step="any"
        className="threshold-input"
        value={editValue}
        placeholder="Not set"
        onChange={(e) => onChange(e.target.value)}
      />
      {is_override ? (
        <button className="limits-reset-btn" onClick={onReset}>Reset</button>
      ) : <span />}
    </div>
  );
}

export default function LimitsPage() {
  const [framework, setFramework] = useState('GRI');
  const [kpiMap, setKpiMap] = useState({});
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchLimits = useCallback(() => {
    setLoading(true);
    api.getLimits()
      .then((data) => {
        const byId = {};
        (data.kpis || []).forEach((k) => { byId[k.id] = k; });
        setKpiMap(byId);
        setEdits({});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const setEdit = (id, value) => setEdits((prev) => ({ ...prev, [id]: value }));

  const resetOne = async (id) => {
    await api.updateLimits({ [id]: null });
    fetchLimits();
  };

  const save = async () => {
    const updates = {};
    Object.entries(edits).forEach(([id, raw]) => {
      if (raw === '' || raw === null || raw === undefined) return;
      const num = parseFloat(raw);
      if (!Number.isNaN(num)) updates[id] = num;
    });
    if (Object.keys(updates).length === 0) return;
    setSaving(true);
    setSaveMsg('');
    try {
      await api.updateLimits(updates);
      setSaveMsg('Saved!');
      fetchLimits();
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const { groups, labels } = FRAMEWORK_GROUPS[framework];
  const hasEdits = Object.values(edits).some((v) => v !== '' && v !== undefined);

  return (
    <div className="limits-page">
      <div className="content-header">
        <h2 className="content-title">
          <Gauge size={18} />
          Limits
        </h2>
        <div className="alerts-header-actions">
          <div className="threshold-domain-tabs">
            {Object.keys(FRAMEWORK_GROUPS).map((fw) => (
              <button
                key={fw}
                className={`threshold-domain-tab ${framework === fw ? 'active' : ''}`}
                onClick={() => setFramework(fw)}
              >
                {fw}
              </button>
            ))}
          </div>
          <button className="alerts-threshold-btn" onClick={save} disabled={saving || !hasEdits}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <p className="limits-disclaimer">
        Each KPI's default threshold is the average of its value across every reporting year/FY already
        in the data. Override any threshold below - cards compare their current value against it to show
        a Within Limit / Exceeds Limit badge.
      </p>

      {saveMsg && <p className="threshold-save-msg">{saveMsg}</p>}

      {loading ? (
        <div className="summary-loading">Computing baselines…</div>
      ) : (
        Object.entries(groups).map(([subTabId, kpiIds]) => (
          <section key={subTabId} className="limits-domain-section">
            <h3 className="limits-domain-heading">{labels[subTabId] || subTabId}</h3>
            {kpiIds.map((id) => (
              <LimitRow
                key={id}
                kpi={kpiMap[id]}
                editValue={edits[id] !== undefined ? edits[id] : (kpiMap[id]?.threshold ?? '')}
                onChange={(v) => setEdit(id, v)}
                onReset={() => resetOne(id)}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
