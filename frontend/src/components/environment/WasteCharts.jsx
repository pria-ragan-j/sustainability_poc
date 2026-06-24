import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { WASTE as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = {
  backgroundColor: '#1e2d4a',
  titleColor: '#ffffff',
  bodyColor: '#ffffff',
  cornerRadius: 6,
};

const legendBase = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

export default function WasteCharts({ subTab = 'waste' }) {
  const { griFilters, sasbFilters, brsrFilters, setChartFilter, setSasbChartFilter, setBrsrChartFilter, viewMode } = useAppContext();
  const isSasb = subTab.startsWith('sasb_');
  const isBrsr = subTab.startsWith('brsr_');
  const filters = isBrsr ? brsrFilters : isSasb ? sasbFilters : griFilters;
  const updateChartFilter = isBrsr ? setBrsrChartFilter : isSasb ? setSasbChartFilter : setChartFilter;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    // BRSR P6 uses yearly view against same GRI dataset
    const view = isBrsr ? 'yearly' : viewMode === 'yearly' ? 'yearly' : undefined;
    api.getWasteChart({ year: filters.year, plant: filters.plant, region: filters.region, view })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filters.year, filters.plant, filters.region, viewMode, isBrsr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlantClick = useCallback((_, elements) => {
    if (!elements || elements.length === 0 || !data) return;
    const plant = data.plants[elements[0].index];
    if (plant && plant !== filters.plant) updateChartFilter('plant', plant);
  }, [data, filters.plant, updateChartFilter]);

  const tTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('t') };

  return (
    <div className="chart-grid">
      <ChartCard id="waste-trend" agg="sum" title={data?.view === 'yearly' ? 'Yearly Waste Trend (tonnes)' : 'Monthly Waste Trend (tonnes)'}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Generated (t)', data: data.generated, borderColor: C.generated, backgroundColor: C.generated, tension: 0.3 },
                  { label: 'Diverted (t)',  data: data.diverted,  borderColor: C.diverted,  backgroundColor: C.diverted,  tension: 0.3 },
                  { label: 'Disposed (t)',  data: data.disposed,  borderColor: C.disposed,  backgroundColor: C.disposed,  tension: 0.3 },
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

      <ChartCard id="waste-diversion-stack" agg="sum" title="Diversion vs Disposal (tonnes)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Diverted (t)', data: data.diverted, backgroundColor: C.diverted, stack: 's' },
                  { label: 'Disposed (t)', data: data.disposed, backgroundColor: C.disposed, stack: 's' },
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

      <ChartCard id="waste-by-plant" agg="sum" title="Waste by Plant (tonnes) — click bar to filter">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [
                  { label: 'Generated (t)', data: data.generated_by_plant, backgroundColor: C.generated },
                  { label: 'Diverted (t)',  data: data.diverted_by_plant,  backgroundColor: C.diverted },
                  { label: 'Disposed (t)',  data: data.disposed_by_plant,  backgroundColor: C.disposed },
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

      <ChartCard id="waste-breakdown" agg="sum" title="Waste Breakdown (full year)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Doughnut
              data={{
                labels: ['Diverted', 'Disposed'],
                datasets: [{ data: [data.total_diverted, data.total_disposed], backgroundColor: [C.diverted, C.disposed] }],
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

      {data?.disposal_methods && (
        <ChartCard id="waste-disposal-methods" agg="sum" title={`Disposal & Recovery Methods (t) — Recycling Rate ${data.recycling_rate ?? 0}%`}>
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: Object.keys(data.disposal_methods),
                datasets: [{
                  label: 'Waste (t)',
                  data: Object.values(data.disposal_methods),
                  backgroundColor: Object.keys(data.disposal_methods).map((m) => C.disposalMethods[m] ?? '#94a3b8'),
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
