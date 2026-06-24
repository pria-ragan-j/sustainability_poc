import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Heart, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';

const AMBER  = '#f59e0b';
const AMBER2 = '#d97706';
const TEAL   = '#14b8a6';
const BLUE   = '#3b82f6';
const GREEN  = '#10b981';
const PURPLE = '#8b5cf6';
const PINK   = '#ec4899';

const CAT_COLORS = [AMBER, TEAL, BLUE, GREEN, PINK, PURPLE];

export default function BrsrCsrCharts({ subTab }) {
  const { brsrFilters } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getBrsrCsrChart({ fy: brsrFilters.fy })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [brsrFilters.fy]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="chart-loading">Loading CSR data…</div>;
  if (error)   return <div className="chart-error"><AlertCircle size={16}/> {error}</div>;
  if (!data)   return null;

  const fys   = data.fys || [];
  const short = fys.map((f) => f.replace('FY', '').replace('-', '/'));
  const cur   = data.current_fy || {};

  const obVsSpend = {
    labels: short,
    datasets: [
      { label: 'Obligation (₹ Cr)', data: data.obligation_crore, backgroundColor: AMBER + '99', borderColor: AMBER2, borderWidth: 1, borderRadius: 4 },
      { label: 'Spent (₹ Cr)',      data: data.spent_crore,      backgroundColor: GREEN,        borderColor: GREEN,  borderWidth: 1, borderRadius: 4 },
    ],
  };

  const catChart = {
    labels: data.categories || [],
    datasets: [{ data: data.spent_by_category || [], backgroundColor: CAT_COLORS, borderWidth: 2 }],
  };

  const beneChart = {
    labels: short,
    datasets: [{ label: 'Beneficiaries', data: data.total_beneficiaries, backgroundColor: TEAL + 'cc', borderRadius: 4 }],
  };

  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };

  return (
    <div className="chart-grid">
      <div className="kpi-card" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <KpiTile icon={<Heart size={20} color={AMBER}/>}      label="CSR Obligation" value={`₹${cur.obligation ?? '—'} Cr`} />
        <KpiTile icon={<TrendingUp size={20} color={GREEN}/>} label="CSR Spent"      value={`₹${cur.spent ?? '—'} Cr`} />
        <KpiTile icon={<TrendingUp size={20} color={TEAL}/>}  label="Utilization"    value={`${cur.pct_spent ?? '—'}%`} />
        <KpiTile icon={<Users size={20} color={BLUE}/>}       label="Beneficiaries"  value={cur.total_beneficiaries?.toLocaleString?.() ?? cur.total_beneficiaries ?? '—'} />
      </div>

      {cur.unspent > 0 && (
        <div className="kpi-card" style={{ gridColumn: '1 / -1', background: '#fef3c7', border: '1px solid #f59e0b' }}>
          <span style={{ fontSize: 13, color: '#92400e' }}>
            Unspent CSR amount: <strong>₹{cur.unspent} Cr</strong> — to be transferred to designated fund (Companies Act §135).
          </span>
        </div>
      )}

      <div className="chart-card" style={{ gridColumn: 'span 2' }}>
        <div className="chart-card-title">CSR Obligation vs Expenditure</div>
        <div className="chart-card-subtitle">₹ Crore per FY — 2% of 3-yr avg net profit (§135)</div>
        <div style={{ height: 220 }}><Bar data={obVsSpend} options={barOpts} /></div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">CSR Spend by Category</div>
        <div className="chart-card-subtitle">{data.selected_fy} — ₹ Crore</div>
        <div style={{ height: 220 }}>
          <Doughnut data={catChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } } }} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Total Beneficiaries per FY</div>
        <div className="chart-card-subtitle">Direct beneficiaries across all projects</div>
        <div style={{ height: 220 }}><Bar data={beneChart} options={{ ...barOpts, plugins: { legend: { display: false } } }} /></div>
      </div>

      {data.categories && data.categories.length > 0 && (
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-card-title">Project Category Breakdown — {data.selected_fy}</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-secondary)' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>Spent (₹ Cr)</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>Beneficiaries</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-secondary)' }}>% Share</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat, i) => {
                const total = (data.spent_by_category || []).reduce((a, b) => a + (b || 0), 0) || 1;
                const pct   = Math.round(((data.spent_by_category?.[i] || 0) / total) * 1000) / 10;
                return (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], display: 'inline-block', flexShrink: 0 }}/>
                      {cat}
                    </td>
                    <td style={{ textAlign: 'right', padding: '5px 8px', fontWeight: 600, color: AMBER }}>{data.spent_by_category?.[i] ?? '—'}</td>
                    <td style={{ textAlign: 'right', padding: '5px 8px', color: TEAL }}>{data.beneficiaries_by_category?.[i]?.toLocaleString?.() ?? '—'}</td>
                    <td style={{ textAlign: 'right', padding: '5px 8px', color: 'var(--text-secondary)' }}>{pct}%</td>
                  </tr>
                );
              })}
              <tr style={{ borderTop: '2px solid var(--border)', fontWeight: 700 }}>
                <td style={{ padding: '5px 8px' }}>Total</td>
                <td style={{ textAlign: 'right', padding: '5px 8px', color: AMBER }}>₹{cur.spent} Cr</td>
                <td style={{ textAlign: 'right', padding: '5px 8px', color: TEAL }}>{cur.total_beneficiaries?.toLocaleString?.() ?? ''}</td>
                <td style={{ textAlign: 'right', padding: '5px 8px' }}>100%</td>
              </tr>
            </tbody>
          </table>
          {cur.states && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>States covered: {cur.states}</div>}
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
      {icon}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
