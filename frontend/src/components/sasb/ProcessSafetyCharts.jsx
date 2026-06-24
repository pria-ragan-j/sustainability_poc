import React, { useEffect, useState, useCallback } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useAppContext } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import ChartCard from '../charts/ChartCard.jsx';
import ChartState from '../shared/ChartState.jsx';
import { SASB_PROCESS_SAFETY as C } from '../../constants/chartColors.js';
import { fmtVal, axisTitle, tooltipWithUnit } from '../../utils/chartHelpers.js';

const tooltipBase = { backgroundColor: '#1e2d4a', titleColor: '#ffffff', bodyColor: '#ffffff', cornerRadius: 6 };
const legendBase  = { position: 'bottom', labels: { font: { size: 10 }, color: '#475569' } };

// RT-CH-540a Process Safety — backed by the synthetic GRI_RTCH540a_ProcessSafety
// dataset (generate_process_safety_dataset.py) since no real process-safety
// incident data exists for this demo. Uses the shared sasbFilters object, the
// same one Summary's SASB filter and every other SASB sub-tab use.
export default function ProcessSafetyCharts() {
  const { sasbFilters, setSasbChartFilter, viewMode } = useAppContext();
  const filters = sasbFilters;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    api.getProcessSafetyChart({ ...filters, view: viewMode === 'yearly' ? 'yearly' : undefined })
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

  const countTooltip = { ...tooltipBase, callbacks: tooltipWithUnit('incidents') };
  const rateTooltip  = { ...tooltipBase, callbacks: tooltipWithUnit('per 200k hrs') };

  return (
    <div className="chart-grid">
      <ChartCard id="sasb-process-safety-incidents-chart" agg="sum" title={data?.view === 'yearly' ? 'Tier 1/2 Process Safety Incidents by Year' : `Tier 1/2 Process Safety Incidents — ${data?.year ?? ''}`}>
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'Tier 1 (Significant LOPC)', data: data.tier1, backgroundColor: C.tier1, stack: 's' },
                  { label: 'Tier 2 (Lesser LOPC)',       data: data.tier2, backgroundColor: C.tier2, stack: 's' },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { stacked: true, title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { stacked: true, title: axisTitle('Incidents'), ticks: { callback: fmtVal } },
                },
                plugins: { legend: legendBase, tooltip: countTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-pstir-chart" agg="rate" title="Process Safety Total Incident Rate — PSTIR (per 200k hrs)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'PSTIR', data: data.pstir, borderColor: C.pstir, backgroundColor: C.pstir, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('PSTIR (per 200k hrs)') },
                },
                plugins: { legend: { display: false }, tooltip: rateTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-psisr-chart" agg="rate" title="Process Safety Incident Severity Rate — PSISR (per 200k hrs)">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Line
              data={{
                labels: data.labels ?? data.months,
                datasets: [
                  { label: 'PSISR', data: data.psisr, borderColor: C.psisr, backgroundColor: C.psisr, tension: 0.3 },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle(data.view === 'yearly' ? 'Year' : 'Month') },
                  y: { title: axisTitle('PSISR (per 200k hrs)') },
                },
                plugins: { legend: { display: false }, tooltip: rateTooltip },
              }}
            />
          )}
        </ChartState>
      </ChartCard>

      <ChartCard id="sasb-process-safety-by-plant" agg="rate" title="PSTIR / PSISR by Plant — click bar to filter">
        <ChartState loading={loading} error={error} onRetry={fetchData}>
          {data && (
            <Bar
              data={{
                labels: data.plants,
                datasets: [
                  { label: 'PSTIR', data: data.pstir_by_plant, backgroundColor: C.pstir },
                  { label: 'PSISR', data: data.psisr_by_plant, backgroundColor: C.psisr },
                ],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: { title: axisTitle('Rate (per 200k hrs)') },
                  y: { title: axisTitle('Plant') },
                },
                plugins: { legend: legendBase, tooltip: rateTooltip },
                onClick: handlePlantClick,
              }}
            />
          )}
        </ChartState>
      </ChartCard>
    </div>
  );
}
