import React, { useEffect, useState } from 'react';
import { Scale, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const STATUS_ICON = {
  adopted:     { Icon: CheckCircle, color: '#22c55e', label: 'Adopted' },
  'in-progress': { Icon: AlertCircle, color: '#f59e0b', label: 'In Progress' },
  'not-adopted': { Icon: XCircle,    color: '#ef4444', label: 'Not Adopted' },
};

function PolicyCard({ principle, title, status, committee, coverage }) {
  const meta = STATUS_ICON[status] || STATUS_ICON['not-adopted'];
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span className="brsr-principle-badge">{principle}</span>
        <meta.Icon size={16} color={meta.color} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
        {committee && <> · Committee: {committee}</>}
        {coverage !== undefined && <> · Board coverage: {coverage}%</>}
      </div>
    </div>
  );
}

export default function BrsrComplianceCards({ subTab }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/brsr/config')
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => {});
  }, []);

  if (!config) {
    return (
      <div className="chart-grid">
        <div className="brsr-pending-card" style={{ gridColumn: '1 / -1' }}>
          <Scale size={32} className="brsr-pending-icon" />
          <div className="brsr-pending-title">Ethics &amp; Compliance Configuration Pending (P1)</div>
          <div className="brsr-pending-desc">
            Policy adoption status and committee details are stored in{' '}
            <code>backend/data/brsr_config.json</code>. The file does not yet exist or
            could not be loaded. Fill in the template after collecting the following:
          </div>
          <ul className="brsr-pending-items">
            <li>Business ethics / anti-corruption policy adoption status</li>
            <li>Responsible advocacy / lobbying policy</li>
            <li>Whistleblower mechanism — channel and governing committee</li>
            <li>Number of complaints on bribery/conflict of interest received and resolved</li>
            <li>Anti-competitive conduct legal actions pending / resolved</li>
          </ul>
          <div className="brsr-principle-badge">P1 — Ethics, Transparency &amp; Accountability</div>
        </div>
      </div>
    );
  }

  const principles = config.principles || {};
  return (
    <div className="chart-grid">
      {Object.entries(principles).map(([key, p]) => (
        <PolicyCard
          key={key}
          principle={key.toUpperCase()}
          title={p.policy_title || key}
          status={p.policy_status || 'not-adopted'}
          committee={p.committee}
          coverage={p.board_coverage_pct}
        />
      ))}
      {Object.keys(principles).length === 0 && (
        <div className="brsr-pending-card" style={{ gridColumn: '1 / -1' }}>
          <Scale size={32} className="brsr-pending-icon" />
          <div className="brsr-pending-title">No principles configured</div>
          <div className="brsr-pending-desc">
            Add principle entries to <code>backend/data/brsr_config.json</code> to populate this view.
          </div>
        </div>
      )}
    </div>
  );
}
