import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { ENERGY as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// subTab defaults to the GRI Energy tab - see EmissionsCharts.jsx for the
// reuse pattern shared by all four SASB-reused chart components.
export default function EnergyCharts({ subTab = 'energy' }) {
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
    const view = isBrsr ? 'yearly' : viewMode === 'yearly' ? 'yearly' : undefined;
    api.getEnergyChart({ year: filters.year, plant: filters.plant, region: filters.region, view })
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


  const gjTooltip    = { ...tooltipBase, callbacks: tooltipWithUnit('GJ') };
  const gjTTooltip   = { ...tooltipBase, callbacks: tooltipWithUnit('GJ/t') };

  return (
    <div className="chart-grid">
      <ChartCard id="energy-by-source" agg="sum" title="Energy Consumption by Source (GJ)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Oil (GJ)',           data: data.oil,          backgroundColor: C.oil,          stack: 's' },
                  { label: 'Natural Gas (GJ)',    data: data.naturalGas,   backgroundColor: C.gas,          stack: 's' },
                  { label: 'Electricity (GJ)',    data: data.electricity,  backgroundColor: C.electricity,  stack: 's' },
                  { label: 'Steam (GJ)',          data: data.steam,        backgroundColor: C.steam,        stack: 's' },
                  { label: 'Tail Gas (GJ)',       data: data.tailGas,      backgroundColor: C.tailGas,      stack: 's' },
                  { label: 'Compressed Air (GJ)', data: data.compressedAir,backgroundColor: C.compressedAir,stack: 's' },
                  { label: 'Hot Water (GJ)',      data: data.hotWater,     backgroundColor: C.hotWater,     stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Energy (GJ)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: gjTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-renewable-trend" agg="sum" title="Renewable vs Non-Renewable Trend (GJ)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Renewable (GJ)',     data: data.renewableTrend,    borderColor: C.renewable,    backgroundColor: C.renewable,    tension: 0.3 },
                  { label: 'Non-Renewable (GJ)', data: data.nonRenewableTrend, borderColor: C.nonRenewable, backgroundColor: C.nonRenewable, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Energy (GJ)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: gjTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-intensity" agg="weighted" title="Energy Intensity (GJ/t)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Intensity (GJ/t)', data: data.intensityTrend, borderColor: C.intensity, backgroundColor: C.intensity, tension: 0.3, fill: false },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Intensity (GJ/t)') },
                },
                plugins: { legend: { display: false }, tooltip: gjTTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-by-plant" agg="sum" title={`Plant-level Energy Comparison ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')} (GJ) — click bar to filter`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [{ label: 'Total Consumed (GJ)', data: data.consumed_by_plant, backgroundColor: C.total }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Energy (GJ)'), ticks: { callback: fmtVal } },
                  y: { title: axisTitle('Plant') },
                },
                plugins: { legend: { display: false }, tooltip: gjTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-net-balance" agg="sum" title="Net Energy Balance: Consumed vs Sold (GJ)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Sold (GJ)',       data: data.soldTrend,      backgroundColor: C.sold },
                  { label: 'Net Energy (GJ)', data: data.netEnergyTrend, backgroundColor: C.netEnergy },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Energy (GJ)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: gjTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-upstream-downstream" agg="sum" title="Upstream vs Downstream Energy (GJ)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Upstream (GJ)',   data: data.upstreamTrend,   borderColor: C.upstream,   backgroundColor: C.upstream,   tension: 0.3 },
                  { label: 'Downstream (GJ)', data: data.downstreamTrend, borderColor: C.downstream, backgroundColor: C.downstream, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Energy (GJ)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: gjTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="energy-upstream-downstream-intensity" agg="weighted" title="Upstream / Downstream Energy Intensity (GJ/t)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Upstream Intensity (GJ/t)',   data: data.upstreamIntensityTrend,   borderColor: C.upstreamIntensity,   backgroundColor: C.upstreamIntensity,   tension: 0.3, fill: false },
                  { label: 'Downstream Intensity (GJ/t)', data: data.downstreamIntensityTrend, borderColor: C.downstreamIntensity, backgroundColor: C.downstreamIntensity, tension: 0.3, fill: false },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Intensity (GJ/t)') },
                },
                plugins: { legend: legendBase, tooltip: gjTTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>
    </div>
  );
}
