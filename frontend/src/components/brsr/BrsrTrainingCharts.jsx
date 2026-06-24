import React, { useEffect, useState, useCallback } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { GraduationCap, TrendingUp, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';

const AMBER  = '#f59e0b';
const AMBER2 = '#d97706';
const BLUE   = '#3b82f6';
const PINK   = '#ec4899';
const GREEN  = '#10b981';
const PURPLE = '#8b5cf6';

export default function BrsrTrainingCharts({ subTab }) {
  const { brsrFilters } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getBrsrTrainingChart({ fy: brsrFilters.fy, plant: brsrFilters.plant, region: brsrFilters.region })
      .then(setData)
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [brsrFilters.fy, brsrFilters.plant, brsrFilters.region]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="chart-loading">Loading training data…</div>;
  if (error)   return <div className="chart-error"><AlertCircle size={16}/> {error}</div>;
  if (!data)   return null;

  const fys   = data.fys || [];
  const short = fys.map((f) => f.replace('FY', '').replace('-', '/'));

  const hrsChart = {
    labels: short,
    datasets: [
      { label: 'All Employees', data: data.avg_training_hrs,       borderColor: AMBER,  backgroundColor: AMBER + '22',  tension: 0.3, fill: false, pointRadius: 4 },
      { label: 'Male',         data: data.avg_training_hrs_male,   borderColor: BLUE,   backgroundColor: 'transparent', tension: 0.3, fill: false, pointRadius: 3, borderDash: [4, 2] },
      { label: 'Female',       data: data.avg_training_hrs_female, borderColor: PINK,   backgroundColor: 'transparent', tension: 0.3, fill: false, pointRadius: 3 },
    ],
  };

  const coverageChart = {
    labels: short,
    datasets: [
      { label: 'Training Coverage %', data: data.training_coverage_pct, borderColor: GREEN,  backgroundColor: GREEN + '22',  tension: 0.3, fill: true,  pointRadius: 4 },
      { label: 'Skill Upgrade %',     data: data.skill_upgrade_pct,    borderColor: PURPLE, backgroundColor: 'transparent', tension: 0.3, fill: false, pointRadius: 3 },
    ],
  };

  const byPlantChart = {
    labels: data.plants || [],
    datasets: [{ label: 'Avg Training Hrs', data: data.avg_hrs_by_plant, backgroundColor: AMBER, borderRadius: 4 }],
  };

  const typeData   = data.training_type_breakdown || {};
  const typeLabels = Object.keys(typeData);
  const typeValues = Object.values(typeData);
  const typeColors = [AMBER, BLUE, PURPLE, GREEN, PINK];
  const typeChart = {
    labels: typeLabels,
    datasets: [{ data: typeValues, backgroundColor: typeColors.slice(0, typeLabels.length), borderWidth: 2 }],
  };

  const spendChart = {
    labels: short,
    datasets: [{
      label: 'Spend / Employee (₹)', data: data.training_spend_per_employee,
      borderColor: AMBER2, backgroundColor: AMBER + '22', tension: 0.3, fill: true, pointRadius: 4,
    }],
  };

  const lineOpts = (suffix = '') => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, ticks: { callback: (v) => v + suffix } } },
  });
  const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <div className="chart-grid">
      <div className="kpi-card" style={{ gridColumn: '1 / -1', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <KpiTile icon={<GraduationCap size={20} color={AMBER}/>} label="Avg Hrs / Employee" value={`${data.avg_training_hrs?.at(-1) ?? '—'} hrs`} />
        <KpiTile icon={<TrendingUp size={20} color={GREEN}/>}    label="Training Coverage"  value={`${data.training_coverage_pct?.at(-1) ?? '—'}%`} />
        <KpiTile icon={<TrendingUp size={20} color={PURPLE}/>}   label="Skill Upgrade"      value={`${data.skill_upgrade_pct?.at(-1) ?? '—'}%`} />
        <KpiTile icon={<GraduationCap size={20} color={BLUE}/>}  label="Current FY"         value={data.current_fy} />
      </div>

      <div className="chart-card" style={{ gridColumn: 'span 2' }}>
        <div className="chart-card-title">Avg Training Hours per Employee</div>
        <div className="chart-card-subtitle">Male vs Female vs All — FY trend</div>
        <div style={{ height: 220 }}><Line data={hrsChart} options={lineOpts(' hrs')} /></div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Training Coverage & Skill Upgrade %</div>
        <div className="chart-card-subtitle">% of employees trained per FY</div>
        <div style={{ height: 220 }}><Line data={coverageChart} options={lineOpts('%')} /></div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Avg Training Hrs by Plant</div>
        <div className="chart-card-subtitle">{data.current_fy} — hours per employee</div>
        <div style={{ height: 220 }}><Bar data={byPlantChart} options={barOpts} /></div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Training Type Breakdown</div>
        <div className="chart-card-subtitle">Hours per employee by category ({data.current_fy})</div>
        <div style={{ height: 220 }}>
          <Doughnut data={typeChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }} />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-card-title">Training Spend per Employee</div>
        <div className="chart-card-subtitle">₹ per employee per FY</div>
        <div style={{ height: 220 }}><Line data={spendChart} options={lineOpts('')} /></div>
      </div>

      {data.plants && data.plants.length > 0 && (
        <div className="chart-card">
          <div className="chart-card-title">Coverage by Plant ({data.current_fy})</div>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-secondary)' }}>Plant</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-secondary)' }}>Avg Hrs</th>
                <th style={{ textAlign: 'right', padding: '4px 8px', color: 'var(--text-secondary)' }}>Coverage %</th>
              </tr>
            </thead>
            <tbody>
              {data.plants.map((p, i) => (
                <tr key={p} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '4px 8px' }}>{p}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: AMBER }}>{data.avg_hrs_by_plant?.[i] ?? '—'}</td>
                  <td style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600, color: GREEN }}>{data.coverage_by_plant?.[i] ?? '—'}%</td>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, padding: '8px 12px', background: 'var(--surface-alt)', borderRadius: 8 }}>
      {icon}
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      </div>
    </div>
  );
}
