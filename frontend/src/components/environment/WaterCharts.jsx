import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { WATER as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = {
  backgroundColor: '#1e2d4a',
  titleColor: '#ffffff',
  bodyColor: '#ffffff',
  cornerRadius: 6,
};

const legendBase = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// Maps source chart dataset label → the data array key it represents
const SOURCE_KEY_MAP = {
  'Groundwater (ML)':          'groundwater',
  'Third-Party Water (ML)':    'third_party',
  'Municipal Rainwater (ML)':  'municipal_rainwater',
  'Surface Water (ML)':        'surface_withdrawn',
};

const STRESS_LABELS = {
  groundwater: 'Groundwater', surface: 'Surface', seawater: 'Seawater',
  produced: 'Produced Water', third_party: 'Third-Party',
};

// subTab defaults to the GRI Water tab - see EmissionsCharts.jsx for the
// reuse pattern shared by all four SASB-reused chart components.
export default function WaterCharts({ subTab = 'water' }) {
  const { griFilters, sasbFilters, brsrFilters, setChartFilter, setSasbChartFilter, setBrsrChartFilter, viewMode } = useAppContext();
  const isSasb = subTab.startsWith('sasb_');
  const isBrsr = subTab.startsWith('brsr_');
  const filters = isBrsr ? brsrFilters : isSasb ? sasbFilters : griFilters;
  const updateChartFilter = isBrsr ? setBrsrChartFilter : isSasb ? setSasbChartFilter : setChartFilter;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Track which source labels the user has toggled off
  const [hiddenSources, setHiddenSources] = useState(new Set());

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    setHiddenSources(new Set());
    const view = isBrsr ? 'yearly' : viewMode === 'yearly' ? 'yearly' : undefined;
    api.getWaterChart({ year: filters.year, plant: filters.plant, region: filters.region, view })
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

  // Custom legend click: toggle the series AND propagate to the trend chart
  const handleSourceLegendClick = useCallback((e, legendItem, legend) => {
    const chart = legend.chart;
    const label = legendItem.text;
    const idx   = legendItem.datasetIndex;
    const meta  = chart.getDatasetMeta(idx);
    // Toggle the dataset hidden state in the source chart itself
    meta.hidden = meta.hidden === null ? true : !meta.hidden;
    chart.update();
    // Mirror that toggle into our React state so the trend chart recomputes
    setHiddenSources((prev) => {
      const next = new Set(prev);
      if (meta.hidden) next.add(label);
      else             next.delete(label);
      return next;
    });
  }, []);

  const mlTooltip = {
    ...tooltipBase,
    callbacks: tooltipWithUnit('ML'),
  };

  // Recompute the "total withdrawn" trend line from only the active source arrays.
  // When nothing is hidden this equals data.withdrawn; when sources are toggled off
  // the line drops to reflect only the visible sources.
  const xLabels = data ? (data.labels ?? data.months) : [];
  const filteredWithdrawn = data
    ? xLabels.map((_, i) =>
        Object.entries(SOURCE_KEY_MAP).reduce((sum, [label, key]) => {
          if (hiddenSources.has(label)) return sum;
          return sum + (data[key]?.[i] ?? 0);
        }, 0)
      )
    : [];

  const sourceLegendOptions = {
    ...legendBase,
    onClick: handleSourceLegendClick,
  };

  return (
    <div className="chart-grid">
      <ChartCard id="water-trend" agg="sum" title={data?.view === 'yearly' ? 'Yearly Withdrawal vs Discharge (ML)' : 'Monthly Withdrawal vs Discharge (ML)'}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: xLabels,
                datasets: [
                  { label: 'Withdrawn (ML)', data: filteredWithdrawn, borderColor: C.withdrawn, backgroundColor: C.withdrawn, tension: 0.3 },
                  { label: 'Discharged (ML)', data: data.discharged, borderColor: C.discharged, backgroundColor: C.discharged, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('Volume (ML)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: mlTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="water-withdrawal-source" agg="sum" title="Withdrawal by Source (ML)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: xLabels,
                datasets: [
                  { label: 'Groundwater (ML)',         data: data.groundwater,           backgroundColor: C.groundwater,         stack: 's' },
                  { label: 'Third-Party Water (ML)',   data: data.third_party,            backgroundColor: C.thirdParty,           stack: 's' },
                  { label: 'Municipal Rainwater (ML)', data: data.municipal_rainwater,    backgroundColor: C.municipalRainwater,   stack: 's' },
                  { label: 'Surface Water (ML)',       data: data.surface_withdrawn,       backgroundColor: C.surfaceIn,            stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Volume (ML)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: sourceLegendOptions, tooltip: mlTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="water-discharge-dest" agg="sum" title="Discharge by Destination (ML)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: xLabels,
                datasets: [
                  { label: 'Industrial Treatment (ML)', data: data.industrial,        backgroundColor: C.industrial, stack: 's' },
                  { label: 'Municipal Sewage (ML)',      data: data.sewage,            backgroundColor: C.sewage,     stack: 's' },
                  { label: 'Surface Water (ML)',          data: data.surface_discharged, backgroundColor: C.surfaceOut, stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Volume (ML)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: mlTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="water-by-plant" agg="sum" title={`Water by Plant — ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')} (ML) — click bar to filter`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [{ label: 'Withdrawn (ML)', data: data.withdrawn_by_plant, backgroundColor: C.withdrawn }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Volume (ML)'), ticks: { callback: fmtVal } },
                  y: { title: axisTitle('Plant') },
                },
                plugins: { legend: { display: false }, tooltip: mlTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="water-recycled-pct" agg="avg" title="Water Recycled / Reused (%)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: xLabels,
                datasets: [
                  { label: 'Recycled/Reused %', data: data.recycled_pct, borderColor: C.recycled, backgroundColor: C.recycled + '33', tension: 0.3, fill: true },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('% of Withdrawn'), ticks: { callback: (v) => v + '%' } },
                },
                plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: tooltipWithUnit('%') } },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      {data?.stress_by_source && (
        <ChartCard id="water-stress-by-source" title="Withdrawal in Water-Stress Areas, by Source (%)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: Object.keys(data.stress_by_source).map((k) => STRESS_LABELS[k] ?? k),
                datasets: [{
                  label: 'In Stress Area (%)',
                  data: Object.values(data.stress_by_source),
                  backgroundColor: [C.groundwater, C.surfaceIn, C.seawater, C.producedWater, C.thirdParty],
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { title: axisTitle('% of Source Withdrawn'), ticks: { callback: (v) => v + '%' } } },
                plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: tooltipWithUnit('%') } },
              }}
            />
          </ChartState>
        </ChartCard>
      )}

      {data?.withdrawal_fresh !== undefined && (
        <ChartCard id="water-quality-split" agg="sum" title="Withdrawal by Water Quality (ML)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: xLabels,
                datasets: [
                  { label: 'Freshwater (<1000 mg/L TDS)', data: data.withdrawal_fresh, backgroundColor: C.freshwater, stack: 's' },
                  { label: 'Other Water (≥1000 mg/L TDS)', data: data.withdrawal_other, backgroundColor: C.otherQuality, stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Volume (ML)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: mlTooltip },
              }}
            />
          </ChartState>
        </ChartCard>
      )}
    </div>
  );
}
