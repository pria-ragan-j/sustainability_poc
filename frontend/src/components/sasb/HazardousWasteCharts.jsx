import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { SASB_HAZ as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#ffffff', bodyColor: '#ffffff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// RT-CH-150a Hazardous Waste Management — new framing of the existing GRI 306
// waste dataset's HazardousFlag column (already used internally by
// pdf_report.py's pivot_haz() for the GRI 306-4/306-5 hazardous-split tables,
// but never charted on its own before). Uses the shared sasbFilters object,
// the same one Summary's SASB filter and every other SASB sub-tab use.
export default function HazardousWasteCharts() {
  const { sasbFilters, setSasbChartFilter, viewMode } = useAppContext();
  const filters = sasbFilters;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    api.getHazardousWasteChart({ ...filters, view: viewMode === 'yearly' ? 'yearly' : undefined })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filters.year, filters.plant, filters.region, viewMode]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlantClick = useCallback((_, elements) => {
    if (!elements || elements.length === 0 || !data) return;
    const plant = data.plants[elements[0].index];
    if (plant && plant !== filters.plant) setSasbChartFilter('plant', plant);
  }, [data, filters.plant, setSasbChartFilter]);

  const tTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('t') };

  return (
    <div className="chart-grid">
      <ChartCard id="sasb-hazardous-trend" agg="sum" title={data?.view === 'yearly' ? 'Yearly Hazardous vs Non-Hazardous Waste (tonnes)' : 'Monthly Hazardous vs Non-Hazardous Waste (tonnes)'}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Hazardous (t)',     data: data.hazardous,    borderColor: C.hazardous,    backgroundColor: C.hazardous,    tension: 0.3 },
                  { label: 'Non-Hazardous (t)', data: data.nonHazardous, borderColor: C.nonHazardous, backgroundColor: C.nonHazardous, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('Waste (tonnes)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: tTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-hazardous-stack" agg="sum" title="Hazardous vs Non-Hazardous (stacked, tonnes)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Hazardous (t)',     data: data.hazardous,    backgroundColor: C.hazardous,    stack: 's' },
                  { label: 'Non-Hazardous (t)', data: data.nonHazardous, backgroundColor: C.nonHazardous, stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Waste (tonnes)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: tTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-hazardous-by-plant" agg="sum" title="Hazardous Waste by Plant (tonnes) — click bar to filter">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [
                  { label: 'Hazardous (t)',     data: data.hazardous_by_plant,    backgroundColor: C.hazardous },
                  { label: 'Non-Hazardous (t)', data: data.nonhazardous_by_plant, backgroundColor: C.nonHazardous },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Plant') },
                  y: { title: axisTitle('Waste (tonnes)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: tTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-hazardous-breakdown" agg="sum" title={`Hazardous Waste Recycled — ${data?.hazardous_recycled_pct ?? 0}%`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Doughnut
              data={{
                labels: ['Hazardous', 'Non-Hazardous'],
                datasets: [{ data: [data.total_hazardous, data.total_nonhazardous], backgroundColor: [C.hazardous, C.nonHazardous] }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: legendBase,
                  tooltip: {
                    ...tooltipBase,
                    callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtVal(ctx.raw)} t` },
                  },
                },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      {data?.hazardous_disposal_methods && (
        <ChartCard id="sasb-hazardous-disposal-methods" agg="sum" title="Hazardous Waste — Disposal & Recovery Methods (tonnes)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: Object.keys(data.hazardous_disposal_methods),
                datasets: [{
                  label: 'Hazardous Waste (t)',
                  data: Object.values(data.hazardous_disposal_methods),
                  backgroundColor: Object.keys(data.hazardous_disposal_methods).map((m) => C.disposalMethods[m] ?? '#94a3b8'),
                }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { title: axisTitle('Waste (tonnes)'), ticks: { callback: fmtVal } } },
                plugins: { legend: { display: false }, tooltip: tTooltip },
              }}
            />
          </ChartState>
        </ChartCard>
      )}
    </div>
  );
}
