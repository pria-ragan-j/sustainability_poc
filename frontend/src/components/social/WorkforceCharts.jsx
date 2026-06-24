import React from 'react';
import { Users } from 'lucide-react';
import ChartCard from '../charts/ChartCard.jsx';
import PlaceholderState from '../shared/PlaceholderState.jsx';

const CHARTS = [
  { id: 'workforce-headcount-region', title: 'Headcount by Region', gri: 'GRI 2-7' },
  { id: 'workforce-gender-split', title: 'Gender Split', gri: 'GRI 2-7' },
  { id: 'workforce-employment-type', title: 'Employment Type Breakdown', gri: 'GRI 2-8' },
  { id: 'workforce-headcount-trend', title: 'Headcount Trend', gri: 'GRI 2-7' },
];

export default function WorkforceCharts() {
  return (
    <div className="chart-grid">
      {CHARTS.map((c) => (
        <ChartCard key={c.id} id={c.id} title={c.title}>
          <PlaceholderState icon={Users} title="Data Unavailable" source="HRIS / EHS" gri={c.gri} />
        </ChartCard>
      ))}
    </div>
  );
}
