import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Users, TrendingUp, Heart, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';

const AMBER = '#f59e0b';
const AMBER_LIGHT = '#fbbf24';
const BLUE = '#3b82f6';
const PINK = '#ec4899';
const SLATE = '#64748b';

export default function BrsrWorkforceCharts({ subTab }) {
  const { brsrFilters } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getBrsrWorkforceChart({ fy: brsrFilters.fy, plant: brsrFilters.plant, region: brsrFilters.region })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [brsrFilters.fy, brsrFilters.plant, brsrFilters.region]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <div className="chart-loading">Loading workforce data…</div>;
  if (error)   return <div className="chart-error"><AlertCircle size={16}/> {error}</div>;
  if (!data)   return null;

  const fys   = data.fys || [];
  const short = fys.map((f) => f.replace('FY', '').replace('-', '/'));

  // Chart 1 — Stacked bar: headcount by gender per FY
  const headcountChart = {
    labels: short,
    datasets: [
      { label: 'Male',   data: data.headcount_male,   backgroundColor: BLUE,        stack: 'a' },
      { label: 'Female', data: data.headcount_female, backgroundColor: PINK,        stack: 'a' },
      { label: 'Other',  data: data.headcount_other,  backgroundColor: SLATE, stack: 'a' },
    ],
  };

  // Chart 2 — Line: Female % trend
  const femPctChart = {
    labels: short,
    datasets: [
      { label: 'Female %', data: data.female_pct, borderColor: PINK, backgroundColor: PINK + '33',
        tension: 0.3, fill: true, pointRadius: 4 },
    ],
  };

  // Chart 3 — Bar: Differently-abled count per FY
  const daChart = {
    labels: short,
    datasets: [
      { label: 'Differently-Abled', data: data.differently_abled,
        backgroundColor: AMBER_LIGHT, borderColor: AMBER, borderWidth: 1, borderRadius: 4 },
    ],
  };

  // Chart 4 — Line: Wage gap % (male - female) over FY
  const wageGapChart = {
    labels: short,
    datasets: [
      { label: 'Wage Gap %', data: data.wage_gap_pct, borderColor: AMBER, backgroundColor: AMBER + '33',
        tension: 0.3, fill: true, pointRadius: 4 },
    ],
  };

  // Benefits Doughnut (latest FY)
  const bene = data.benefits || {};
  const beneLabels = ['Health Ins. (Perm)', 'Health Ins. (Contract)', 'Maternity', 'Paternity', 'PF'];
  const beneValues = [
    bene.health_insurance_perm || 0,
    bene.health_insurance_contract || 0,
    bene.maternity_leave || 0,
    bene.paternity_leave || 0,
    bene.pf_covered || 0,
  ];
  const beneColors = [AMBER, AMBER_LIGHT, PINK, BLUE, '#10b981'];
  const beneChart = {
    labels: beneLabels,
    datasets: [{ data: beneValues, backgroundColor: beneColors, borderWidth: 2 }],
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + '%' } } },
  };
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } };
  const stackedOpts = { ...barOpts, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } };

  return (
    <div className="chart-grid">
      {/* KPI tiles row */}
      <div className="kpi-card" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <KpiTile icon={<Users size={20} color={AMBER}/>} label="Female %" value={`${data.female_pct?.at(-1) ?? '—'}%`} />
        <KpiTile icon={<Heart size={20} color={PINK}/>}  label="Differently-Abled" value={data.differently_abled?.at(-1) ?? '—'} />
        <KpiTile icon={<TrendingUp size={20} color={BLUE}/>} label="Wage Gap" value={`${data.wage_gap_pct?.at(-1) ?? '—'}%`} />
        <KpiTile icon={<Users size={20} color={SLATE}/>} label="Current FY" value={data.current_fy} />
      </div>

      {/* Chart 1 — Headcount by gender */}
      <div className="chart-card">
        <div className="chart-card-title">Headcount by Gender</div>
        <div className="chart-card-subtitle">Permanent + Contractual workers per FY</div>
        <div style={{ height: 220 }}>
          <Bar data={headcountChart} options={stackedOpts} />
        </div>
      </div>

      {/* Chart 2 — Female % trend */}
      <div className="chart-card">
        <div className="chart-card-title">Female Employee % Trend</div>
        <div className="chart-card-subtitle">% of all workers across FY periods</div>
        <div style={{ height: 220 }}>
          <Line data={femPctChart} options={lineOpts} />
        </div>
      </div>

      {/* Chart 3 — Differently-abled */}
      <div className="chart-card">
        <div className="chart-card-title">Differently-Abled Employees</div>
        <div className="chart-card-subtitle">Permanent + Contractual DA count</div>
        <div style={{ height: 220 }}>
          <Bar data={daChart} options={barOpts} />
        </div>
      </div>

      {/* Chart 4 — Wage gap */}
      <div className="chart-card">
        <div className="chart-card-title">Wage Gap Trend (M–F)</div>
        <div className="chart-card-subtitle">% gap between male and female permanent wages</div>
        <div style={{ height: 220 }}>
          <Line data={wageGapChart} options={lineOpts} />
        </div>
      </div>

      {/* Chart 5 — Benefits coverage */}
      <div className="chart-card">
        <div className="chart-card-title">Benefits Coverage ({data.current_fy})</div>
        <div className="chart-card-subtitle">% of eligible employees covered</div>
        <div style={{ height: 220 }}>
          <Doughnut data={beneChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
        </div>
      </div>

      {/* By-plant table */}
      {data.plants && data.plants.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-title">Female % by Plant ({data.current_fy})</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-secondary)' }}>Plant</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-secondary)' }}>Female %</th>
              </tr>
            </thead>
            <tbody>
              {data.plants.map((p, i) => (
                <tr key={p} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '4px 8px' }}>{p}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: PINK }}>
                    {data.female_pct_by_plant?.[i] ?? '—'}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiTile({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 140, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
      {icon}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
