import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { useAppContext, BRSR_FY_OPTIONS } from '../../context/AppContext.jsx';
import api, { generateReport } from '../../api/client.js';

const BRSR_FY_OPTIONS_LIST = BRSR_FY_OPTIONS;

export default function ReportGeneratorPanel() {
  const { filterOptionsByDomain, isGeneratingReport, setIsGeneratingReport, brsrFilters } = useAppContext();
  const [framework, setFramework] = useState('GRI');
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState([]);
  const [year, setYear] = useState('all');
  const [fy, setFy] = useState(brsrFilters?.fy || 'FY2024-25');
  const [plant, setPlant] = useState('all');
  const [format, setFormat] = useState('csv');
  const [error, setError] = useState('');

  const isBrsr = framework === 'BRSR';

  useEffect(() => {
    setSelected([]);
    api.getReportTemplates(framework).then(setTemplates).catch(() => {});
  }, [framework]);

  const allSelected = templates.length > 0 && templates.every((t) => selected.includes(t.id));
  const toggleSelectAll = () => setSelected(allSelected ? [] : templates.map((t) => t.id));

  const years = [...new Set(Object.values(filterOptionsByDomain).flatMap((d) => d.years || []))].sort((a, b) => b - a);
  const plants = [...new Set(Object.values(filterOptionsByDomain).flatMap((d) => d.plants || []))].sort();

  const toggleTemplate = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    if (selected.length === 0) {
      setError(`Select at least one ${framework === 'SASB' ? 'SASB topic' : framework === 'BRSR' ? 'BRSR principle' : 'GRI standard'}.`);
      return;
    }
    setError('');
    setIsGeneratingReport(true);
    try {
      const { blob, filename } = await generateReport({
        templates: selected,
        year: year === 'all' ? null : Number(year),
        plant,
        format,
        framework,
        fy,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Failed to generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="report-panel">
      <div className="report-header">
        <FileText size={16} color="var(--accent)" />
        Report Generator
      </div>

      <div>
        <div className="report-section-label">Framework</div>
        <div className="format-toggle">
          <button className={`format-option ${framework === 'GRI' ? 'active' : ''}`} onClick={() => setFramework('GRI')}>GRI</button>
          <button className={`format-option ${framework === 'SASB' ? 'active' : ''}`} onClick={() => setFramework('SASB')}>SASB</button>
          <button className={`format-option ${isBrsr ? 'active' : ''}`} onClick={() => setFramework('BRSR')}>BRSR</button>
        </div>
      </div>

      <div>
        <div className="report-section-label-row">
          <div className="report-section-label">
            {framework === 'SASB' ? 'SASB Topic' : framework === 'BRSR' ? 'BRSR Principle' : 'GRI Standard'}
          </div>
          {templates.length > 0 && (
            <button type="button" className="report-select-all-btn" onClick={toggleSelectAll}>
              {allSelected ? 'Clear All' : 'Select All'}
            </button>
          )}
        </div>
        <div className="report-template-list">
          {templates.map((t) => (
            <label key={t.id} className={`report-template-item ${t.hasData ? '' : 'no-data'}`}>
              <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleTemplate(t.id)} />
              {t.name}
              {!t.hasData && <span className="no-data-tag">No data — placeholder only</span>}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="report-section-label">Reporting Period</div>
        {isBrsr ? (
          <select className="report-select fy-selector" value={fy} onChange={(e) => setFy(e.target.value)}>
            {BRSR_FY_OPTIONS_LIST.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        ) : (
          <select className="report-select" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        )}
      </div>

      <div>
        <div className="report-section-label">Scope</div>
        <select className="report-select" value={plant} onChange={(e) => setPlant(e.target.value)}>
          <option value="all">All Plants</option>
          {plants.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div>
        <div className="report-section-label">Output Format</div>
        <div className="format-toggle">
          {!isBrsr && <button className={`format-option ${format === 'csv' ? 'active' : ''}`} onClick={() => setFormat('csv')}>CSV</button>}
          <button className={`format-option ${format === 'excel' ? 'active' : ''}`} onClick={() => setFormat('excel')}>Excel</button>
          <button className={`format-option ${format === 'pdf' ? 'active' : ''}`} onClick={() => setFormat('pdf')}>PDF</button>
        </div>
      </div>

      {error && <div className="report-error">{error}</div>}

      <button className="generate-btn" onClick={handleGenerate} disabled={isGeneratingReport}>
        {isGeneratingReport ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
        {isGeneratingReport ? 'Generating...' : 'Generate Report'}
      </button>
    </div>
  );
}
