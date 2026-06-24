import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { DEVELOPMENT as C } from '../../constants/chartColors.js';
import { axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#ffffff', bodyColor: '#ffffff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// GRI 401-1/401-3/404-1 — sourced from the same BRSR Workforce/Training
// annual datasets the BRSR tab's own charts use (see _fy_str()/
// _workforce_snapshot() in main.py), reframed here for the GRI Social tab's
// Development sub-tab. Keys off griFilters (year/plant/region), same as
// every other GRI Social chart - not brsrFilters.
export default function DevelopmentCharts() {
  const { griFilters, setChartFilter } = useAppContext();
  const filters = griFilters;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    api.getDevelopmentChart({ year: filters.year, plant: filters.plant, region: filters.region })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filters.year, filters.plant, filters.region]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlantClick = useCallback((_, elements) => {
    if (!elements || elements.length === 0 || !data) return;
    const plant = data.plants[elements[0].index];
    if (plant && plant !== filters.plant) setChartFilter('plant', plant);
  }, [data, filters.plant, setChartFilter]);

  const pctTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('%') };
  const hrsTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('hrs') };

  return (
    <div className="chart-grid">
      <ChartCard id="dev-hire-turnover" agg="rate" title="New Hire vs Turnover Rate (%)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.fys,
                datasets: [
                  { label: 'New Hire Rate (%)', data: data.new_hire_rate, borderColor: C.newHire,  backgroundColor: C.newHire,  tension: 0.3 },
                  { label: 'Turnover Rate (%)', data: data.turnover_rate, borderColor: C.turnover, backgroundColor: C.turnover, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Financial Year') },
                  y: { title: axisTitle('% of Workforce'), ticks: { callback: (v) => v + '%' } },
                },
                plugins: { legend: legendBase, tooltip: pctTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="dev-parental-leave" agg="rate" title="Parental Leave Return Rate (%)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.fys,
                datasets: [
                  { label: 'Maternity Leave Return (%)', data: data.maternity_pct, borderColor: C.maternity, backgroundColor: C.maternity, tension: 0.3 },
                  { label: 'Paternity Leave Return (%)', data: data.paternity_pct, borderColor: C.paternity, backgroundColor: C.paternity, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Financial Year') },
                  y: { title: axisTitle('Return Rate (%)'), ticks: { callback: (v) => v + '%' } },
                },
                plugins: { legend: legendBase, tooltip: pctTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="dev-training-hours" agg="avg" title="Training Hours per Employee & Coverage (%)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.training_fys,
                datasets: [
                  { label: 'Avg Training Hours / Employee', data: data.avg_training_hrs, borderColor: C.trainingHrs, backgroundColor: C.trainingHrs, tension: 0.3, yAxisID: 'hrs' },
                  { label: 'Training Coverage (%)', data: data.training_coverage_pct, borderColor: C.coverage, backgroundColor: C.coverage, tension: 0.3, yAxisID: 'pct' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Financial Year') },
                  hrs: { position: 'left',  title: axisTitle('Hours / Employee') },
                  pct: { position: 'right', title: axisTitle('Coverage (%)'), ticks: { callback: (v) => v + '%' }, grid: { drawOnChartArea: false } },
                },
                plugins: {
                  legend: legendBase,
                  tooltip: {
                    ...tooltipBase,
                    callbacks: {
                      label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}${ctx.dataset.yAxisID === 'pct' ? '%' : ' hrs'}`,
                    },
                  },
                },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="dev-training-by-dept" agg="rate" title={`New Hire / Turnover by Plant — ${data?.current_fy ?? ''} — click bar to filter`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [
                  { label: 'New Hire Rate (%)', data: data.hire_rate_by_plant,     backgroundColor: C.newHire },
                  { label: 'Turnover Rate (%)', data: data.turnover_rate_by_plant, backgroundColor: C.turnover },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Plant') },
                  y: { title: axisTitle('% of Workforce'), ticks: { callback: (v) => v + '%' } },
                },
                plugins: { legend: legendBase, tooltip: pctTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>
    </div>
  );
}
