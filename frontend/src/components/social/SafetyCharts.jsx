import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { SAFETY as C } from '../../constants/chartColors.js';
import { axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#ffffff', bodyColor: '#ffffff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// subTab defaults to the GRI Safety tab - see EmissionsCharts.jsx for the
// reuse pattern shared by all four SASB-reused chart components.
export default function SafetyCharts({ subTab = 'safety' }) {
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
    api.getSafetyChart({ year: filters.year, plant: filters.plant, region: filters.region, view })
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

  const rateTooltip  = { ...tooltipBase, callbacks: tooltipWithUnit('per 200k hrs') };
  const countTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('cases') };

  return (
    <div className="chart-grid">
      <ChartCard id="safety-ltifr-by-plant" agg="rate" title="LTIFR by Plant (per 200k hrs) — click bar to filter">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [{ label: 'LTIFR', data: data.ltifr_by_plant, backgroundColor: C.ltifr }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('LTIFR (per 200k hrs)') },
                  y: { title: axisTitle('Plant') },
                },
                plugins: { legend: { display: false }, tooltip: rateTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="safety-trir-trend" agg="rate" title="TRIR & LTIFR Trend (per 200k hrs)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.years,
                datasets: [
                  { label: 'TRIR',  data: data.trir_trend,  borderColor: C.trir,  backgroundColor: C.trir,  tension: 0.3 },
                  { label: 'LTIFR', data: data.ltifr_trend, borderColor: C.ltifr, backgroundColor: C.ltifr, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Year') },
                  y: { title: axisTitle('Rate (per 200k hrs)') },
                },
                plugins: { legend: legendBase, tooltip: rateTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="safety-incident-types" agg="sum" title="Safety Incidents by Type (cases)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.injury_types.map((i) => i.type),
                datasets: [{ label: 'Cases', data: data.injury_types.map((i) => i.value), backgroundColor: C.injury }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Injury Type') },
                  y: { title: axisTitle('Cases') },
                },
                plugins: { legend: { display: false }, tooltip: countTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="safety-severity" agg="sum" title="Severity Distribution (cases)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Doughnut
              data={{
                labels: data.severity.map((s) => s.severity),
                datasets: [{
                  // Backend order: [Fatal, High Consequence, Recordable, First Aid]
                  // C.severity order: [dark-maroon, red, amber, green] — most→least severe
                  data: data.severity.map((s) => s.value),
                  backgroundColor: C.severity,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: legendBase,
                  tooltip: {
                    ...tooltipBase,
                    callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} cases` },
                  },
                },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      {data?.ill_health_types?.length > 0 && (
        <ChartCard id="safety-ill-health-types" agg="sum" title="Work-Related Ill Health by Type (cases)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: data.ill_health_types.map((i) => i.type),
                datasets: [{ label: 'Cases', data: data.ill_health_types.map((i) => i.value), backgroundColor: C.illHealth }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { title: axisTitle('Ill Health Type') }, y: { title: axisTitle('Cases') } },
                plugins: { legend: { display: false }, tooltip: countTooltip },
              }}
            />
          </ChartState>
        </ChartCard>
      )}

      {data?.safety_pyramid && (
        <ChartCard id="safety-pyramid" agg="sum" title="Safety Pyramid: Near Miss → Fatality (cases)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: ['Near Miss', 'First Aid', 'Recordable', 'Lost Time', 'Fatal'],
                datasets: [{
                  label: 'Cases',
                  data: [data.safety_pyramid.near_miss, data.safety_pyramid.first_aid, data.safety_pyramid.recordable, data.safety_pyramid.lost_time, data.safety_pyramid.fatal],
                  backgroundColor: [C.pyramid.near_miss, C.pyramid.first_aid, C.pyramid.recordable, C.pyramid.lost_time, C.pyramid.fatal],
                }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { title: axisTitle('Cases') } },
                plugins: { legend: { display: false }, tooltip: countTooltip },
              }}
            />
          </ChartState>
        </ChartCard>
      )}

      {data?.leading_trend && (
        <ChartCard id="safety-leading-indicators" agg="sum" title="Leading Indicators Trend (Proactive Safety Activity)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Line
              data={{
                labels: data.leading_trend_years,
                datasets: [
                  { label: 'Safety Observations',  data: data.leading_trend.observations,  borderColor: C.leading.observations,  backgroundColor: C.leading.observations,  tension: 0.3 },
                  { label: 'Toolbox Talks',         data: data.leading_trend.toolbox_talks, borderColor: C.leading.toolbox_talks, backgroundColor: C.leading.toolbox_talks, tension: 0.3 },
                  { label: 'Safety Inspections',    data: data.leading_trend.inspections,   borderColor: C.leading.inspections,   backgroundColor: C.leading.inspections,   tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { title: axisTitle('Year') }, y: { title: axisTitle('Count') } },
                plugins: { legend: legendBase, tooltip: countTooltip },
              }}
            />
          </ChartState>
        </ChartCard>
      )}

      {data?.ohs_coverage && (
        <ChartCard id="safety-ohs-coverage" title="OHS Management System & Audit Coverage (% of Workforce)">
          <ChartState loading={loading} error={error} onRetry={fetchData}>
            <Bar
              data={{
                labels: ['OHS Management System', 'Internal Audit', 'External Audit'],
                datasets: [{
                  label: 'Coverage (%)',
                  data: [data.ohs_coverage.ohs_pct, data.ohs_coverage.internal_audit_pct, data.ohs_coverage.external_audit_pct],
                  backgroundColor: C.coverage,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { title: axisTitle('% of Workforce'), ticks: { callback: (v) => v + '%' } } },
                plugins: { legend: { display: false }, tooltip: { ...tooltipBase, callbacks: tooltipWithUnit('%') } },
              }}
            />
          </ChartState>
        </ChartCard>
      )}
    </div>
  );
}
