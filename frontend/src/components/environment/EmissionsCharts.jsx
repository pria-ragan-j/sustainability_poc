import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { EMISSIONS as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#fff', bodyColor: '#fff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// subTab defaults to the GRI Emissions tab so existing callers (DomainsPage.jsx
// rendering <EmissionsCharts /> with no props) are unaffected. The SASB GHG &
// Air Quality sub-tab passes subTab="sasb_ghg_air" to reuse this exact same
// chart UI against the same GHG dataset, while keeping its own independent
// filter/cross-filter state (SASB_INTEGRATION_PLAN.md Section 6 — confirmed
// separate dashboards, so a filter set here must never leak into the GRI tab).
export default function EmissionsCharts({ subTab = 'emissions' }) {
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
    api.getGhgChart({ year: filters.year, plant: filters.plant, region: filters.region, view })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [filters.year, filters.plant, filters.region, viewMode, isBrsr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePlantClick = useCallback((_, elements) => {
    if (!elements || elements.length === 0 || !data) return;
    const plant = (data.plants || [])[elements[0].index];
    if (plant && plant !== filters.plant) updateChartFilter('plant', plant);
  }, [data, filters.plant, updateChartFilter]);

  const co2Tooltip  = { ...tooltipBase, callbacks: tooltipWithUnit('tCO₂e') };
  const tTooltip    = { ...tooltipBase, callbacks: tooltipWithUnit('t') };
  const intTooltip  = { ...tooltipBase, callbacks: tooltipWithUnit('tCO₂e/t') };

  return (
    <div className="chart-grid">
      <ChartCard id="emissions-scope-breakdown" agg="sum" title={`Scope 1/2/3 Breakdown (tCO₂e) — ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')}`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Doughnut
              data={{
                labels: ['Scope 1', 'Scope 2', 'Scope 3'],
                datasets: [{
                  data: [data.scope1, data.scope2, data.scope3],
                  backgroundColor: [C.scope1, C.scope2, C.scope3],
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: legendBase,
                  tooltip: {
                    ...tooltipBase,
                    callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtVal(ctx.raw)} tCO₂e` },
                  },
                },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-ghg-trend" agg="sum" title="GHG Trend by Year (tCO₂e)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Scope 1 (tCO₂e)', data: data.scope1Trend, borderColor: C.scope1, backgroundColor: C.scope1, tension: 0.3 },
                  { label: 'Scope 2 — Location-Based (tCO₂e)', data: data.scope2Trend, borderColor: C.scope2, backgroundColor: C.scope2, tension: 0.3 },
                  { label: 'Scope 3 (tCO₂e)', data: data.scope3Trend, borderColor: C.scope3, backgroundColor: C.scope3, tension: 0.3 },
                  // Market-based Scope 2 reporting hasn't started yet for this org (column is
                  // entirely unreported in the source data) - omit the series rather than
                  // plot a misleading flat-zero line when nothing has been disclosed.
                  ...(data.scope2MarketTrend?.some((v) => v > 0)
                    ? [{ label: 'Scope 2 — Market-Based (tCO₂e)', data: data.scope2MarketTrend, borderColor: C.scope2Market, backgroundColor: C.scope2Market, borderDash: [6, 3], tension: 0.3 }]
                    : []),
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Emissions (tCO₂e)'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: co2Tooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-air" agg="sum" title="Air Emissions: NOx / SOx / VOC / PM (tonnes)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'NOx (t)', data: data.nox, backgroundColor: C.nox },
                  { label: 'SOx (t)', data: data.sox, backgroundColor: C.sox },
                  { label: 'VOC (t)', data: data.voc, backgroundColor: C.voc },
                  { label: 'PM (t)',  data: data.pm,  backgroundColor: C.pm  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('Emissions (tonnes)') },
                },
                plugins: { legend: legendBase, tooltip: tTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-intensity" agg="weighted" title="Emissions Intensity by Scope (tCO₂e/t)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.trendYears,
                datasets: [
                  { label: 'Scope 1 Intensity (tCO₂e/t)', data: data.intensityTrend, borderColor: C.intensity, backgroundColor: C.intensity, tension: 0.3, fill: false },
                  { label: 'Scope 2 Intensity (tCO₂e/t)', data: data.intensity2Trend, borderColor: C.intensity2, backgroundColor: C.intensity2, tension: 0.3, fill: false },
                  { label: 'Scope 3 Intensity (tCO₂e/t)', data: data.intensity3Trend, borderColor: C.intensity3, backgroundColor: C.intensity3, tension: 0.3, fill: false },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Intensity (tCO₂e/t)') },
                },
                plugins: { legend: legendBase, tooltip: intTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-scope1-source" agg="sum" title={`Scope 1 by Emission Source (tCO₂e) — ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')}`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data?.scope1_source && (
            <Doughnut
              data={{
                labels: ['Process Emissions', 'Stationary Combustion'],
                datasets: [{
                  data: [data.scope1_source.process, data.scope1_source.stationary],
                  backgroundColor: C.scope1Source,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: legendBase, tooltip: co2Tooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-scope1-fuel" agg="sum" title={`Scope 1 Stationary Combustion by Fuel (tCO₂e) — ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')}`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data?.scope1_fuel && (
            <Bar
              data={{
                labels: Object.keys(data.scope1_fuel),
                datasets: [{ label: 'Scope 1 Fuel (tCO₂e)', data: Object.values(data.scope1_fuel), backgroundColor: C.scope1Fuel }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { title: axisTitle('Emissions (tCO₂e)'), ticks: { callback: fmtVal } } },
                plugins: { legend: { display: false }, tooltip: co2Tooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="emissions-scope3-category" agg="sum" title={`Scope 3 by GHG Protocol Category (tCO₂e) — ${data?.view === 'yearly' ? 'All Years' : (data?.year ?? '')}`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data?.scope3_category && (
            <Bar
              data={{
                labels: Object.keys(data.scope3_category),
                datasets: [{ label: 'Scope 3 (tCO₂e)', data: Object.values(data.scope3_category), backgroundColor: C.scope3Category }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { title: axisTitle('Emissions (tCO₂e)'), ticks: { callback: fmtVal } } },
                plugins: { legend: { display: false }, tooltip: co2Tooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      {data && data.plants && data.plants.length > 0 && (
        <ChartCard id="emissions-by-plant" agg="sum" title={`GHG Emissions by Plant ${data.view === 'yearly' ? 'All Years' : (data.year ?? '')} (tCO₂e) — click bar to filter`}>
          <Bar
            data={{
              labels: data.plants,
              datasets: [
                { label: 'Scope 1 (tCO₂e)', data: data.scope1_by_plant, backgroundColor: C.scope1 },
                { label: 'Scope 2 (tCO₂e)', data: data.scope2_by_plant, backgroundColor: C.scope2 },
              ],
            }}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { title: axisTitle('Emissions (tCO₂e)'), ticks: { callback: fmtVal } },
                y: { title: axisTitle('Plant') },
              },
              plugins: { legend: legendBase, tooltip: co2Tooltip },
              onClick: handlePlantClick,
            }}
          />
        </ChartCard>
      )}
    </div>
  );
}
