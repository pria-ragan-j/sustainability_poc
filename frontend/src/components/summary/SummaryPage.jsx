import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplet, Trash2, Zap, Wind, Shield, Users, ArrowRight,
  ArrowUp, ArrowDown, Filter, GraduationCap, Heart, Scale,
} from 'lucide-react';
import { useAppContext, BRSR_FY_OPTIONS } from '../../context/AppContext.jsx';
import api from '../../api/client.js';
import { formatKpiValue } from '../../utils/formatNumber.js';
import {
  KPI_HIGHER_IS_BETTER, KPI_ICON_COLORS,
  SASB_HIGHER_IS_BETTER, SASB_ICON_COLORS,
  BRSR_HIGHER_IS_BETTER, BRSR_ICON_COLORS,
} from '../../constants/kpiGroups.js';
import FrameworkToggle from '../layout/FrameworkToggle.jsx';

// Each Environment/Social domain card's KPI id, per framework. null means
// that framework has no equivalent for this domain (e.g. SASB has no
// Workforce/Development tab) — the card shows an "N/A under <framework>"
// state instead of a value, same convention as the per-domain screens.
const PILLARS = [
  {
    pillar: 'environment',
    label: 'Environment',
    domains: [
      { id: 'water',  label: 'Water',  icon: Droplet, kpiId: { GRI: 'water-withdrawn',  SASB: 'sasb-water-withdrawn',   BRSR: 'brsr-water-withdrawn' } },
      { id: 'waste',  label: 'Waste',  icon: Trash2,  kpiId: { GRI: 'waste-generated',  SASB: 'sasb-hazardous-waste',   BRSR: 'brsr-waste-hazardous' } },
      { id: 'energy', label: 'Energy', icon: Zap,     kpiId: { GRI: 'energy-consumed',  SASB: 'sasb-energy-consumed',   BRSR: 'brsr-energy-consumed' } },
      { id: 'ghg',    label: 'GHG & Air Quality', icon: Wind, kpiId: { GRI: 'total-ghg', SASB: 'sasb-scope1-ghg',       BRSR: 'brsr-scope1-ghg' } },
    ],
  },
  {
    pillar: 'social',
    label: 'Social',
    domains: [
      { id: 'workforce',   label: 'Workforce',   icon: Users,         kpiId: { GRI: 'employees', SASB: null, BRSR: 'brsr-female-pct' } },
      { id: 'safety',      label: 'Safety',      icon: Shield,        kpiId: { GRI: 'ltifr',     SASB: 'sasb-trir-total', BRSR: 'brsr-ltifr' } },
      { id: 'development', label: 'Development', icon: GraduationCap, kpiId: { GRI: 'training-hours', SASB: null, BRSR: 'brsr-training-hours' } },
    ],
  },
];

const ICON_COLOR_MAP = { GRI: KPI_ICON_COLORS, SASB: SASB_ICON_COLORS, BRSR: BRSR_ICON_COLORS };
const HIGHER_IS_BETTER_MAP = { GRI: KPI_HIGHER_IS_BETTER, SASB: SASB_HIGHER_IS_BETTER, BRSR: BRSR_HIGHER_IS_BETTER };

const GOVERNANCE_DOMAINS = [
  { id: 'csr',        label: 'CSR (P8)',                icon: Heart, kpiId: 'brsr-csr-spend' },
  { id: 'compliance', label: 'Ethics & Compliance (P1)', icon: Scale, kpiId: 'brsr-complaint-resolution' },
];

function TrendChip({ trend, kpiId, higherIsBetterMap }) {
  if (trend === null || trend === undefined) return null;

  const higherIsBetter = higherIsBetterMap[kpiId];
  const isUp = trend > 0;
  let chipClass = 'neutral';

  if (higherIsBetter === null || higherIsBetter === undefined) {
    chipClass = 'neutral';
  } else if (higherIsBetter) {
    chipClass = isUp ? 'positive' : 'negative';
  } else {
    chipClass = isUp ? 'negative' : 'positive';
  }

  const Icon = isUp ? ArrowUp : ArrowDown;
  return (
    <span className={`trend-chip ${chipClass}`}>
      <Icon size={11} />
      <span>{Math.abs(trend)}%</span>
      <span className="trend-chip-label">(YoY)</span>
    </span>
  );
}

function DomainCard({ domainMeta, kpiId, kpi, framework, iconColorMap, higherIsBetterMap, onClick }) {
  const Icon  = domainMeta.icon;
  const value = kpi ? kpi.value : null;
  const unit  = kpi ? kpi.unit  : '';
  const trend = kpi ? kpi.trend : null;
  const iconColor = (kpiId && iconColorMap[kpiId]) || 'var(--accent)';
  const notAvailable = !kpiId;

  return (
    <button className="summary-domain-card" onClick={onClick}>
      <ArrowRight size={13} className="summary-card-arrow" />
      <div className="summary-card-icon-wrap" style={{ '--kpi-icon-color': iconColor }}>
        <Icon size={26} style={{ color: iconColor }} />
      </div>
      <span className="summary-card-label">{domainMeta.label}</span>
      <div className="summary-card-value">
        {notAvailable ? (
          <span className="summary-kpi-unavailable">Not available under {framework}</span>
        ) : value !== null && value !== undefined ? (
          <>
            <span className="summary-kpi-value">
              {typeof value === 'number' ? formatKpiValue(value) : value}
            </span>
            {unit && <span className="summary-kpi-unit">{unit}</span>}
          </>
        ) : (
          <span className="summary-kpi-na">—</span>
        )}
      </div>
      {kpi && <TrendChip trend={trend} kpiId={kpiId} higherIsBetterMap={higherIsBetterMap} />}
      {kpi && <div className="summary-kpi-label">{kpi.label}</div>}
    </button>
  );
}

export default function SummaryPage() {
  const navigate = useNavigate();
  const {
    framework, setFramework,
    griFilters, updateGriFilter,
    sasbFilters, updateSasbFilter,
    brsrFilters, updateBrsrFilter,
    setCurrentPage,
  } = useAppContext();

  // Clear domain context when user is on the Summary page so the floating
  // AI assistant doesn't mistakenly scope to a previously visited domain.
  useEffect(() => {
    setCurrentPage({ pillar: null, domain: null });
  }, [setCurrentPage]);

  const [filterOptions, setFilterOptions] = useState({ years: [], plants: [], regions: [] });
  const [envKpis,  setEnvKpis]  = useState([]);
  const [soclKpis, setSoclKpis] = useState([]);
  const [sasbKpis, setSasbKpis] = useState([]);
  const [brsrKpis, setBrsrKpis] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    api.getFilters('water').then(setFilterOptions).catch(() => {});
  }, []);

  const fetchKpis = useCallback(() => {
    setLoading(true);
    const griParams = { year: griFilters.year, plant: griFilters.plant, region: griFilters.region };
    const sasbParams = { year: sasbFilters.year, plant: sasbFilters.plant, region: sasbFilters.region };
    Promise.all([
      api.getEnvKpis(griParams),
      api.getSocialKpis(griParams),
      api.getSasbKpis(sasbParams),
      api.getBrsrKpis({ fy: brsrFilters.fy, plant: brsrFilters.plant, region: brsrFilters.region }),
    ])
      .then(([env, soc, sasb, brsr]) => { setEnvKpis(env); setSoclKpis(soc); setSasbKpis(sasb); setBrsrKpis(brsr); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [
    griFilters.year, griFilters.plant, griFilters.region,
    sasbFilters.year, sasbFilters.plant, sasbFilters.region,
    brsrFilters.fy, brsrFilters.plant, brsrFilters.region,
  ]);

  useEffect(() => { fetchKpis(); }, [fetchKpis]);

  const kpiLookup = {};
  [...envKpis, ...soclKpis].forEach((k) => { kpiLookup[k.id] = k; });
  const sasbKpiLookup = {};
  sasbKpis.forEach((k) => { sasbKpiLookup[k.id] = k; });
  const brsrKpiLookup = {};
  brsrKpis.forEach((k) => { brsrKpiLookup[k.id] = k; });

  // Which KPI source + filter state the in-content framework toggle is
  // currently pointed at — Environment/Social cards read from this;
  // Governance stays BRSR-fixed regardless (Decision #2).
  const kpiLookupByFramework = { GRI: kpiLookup, SASB: sasbKpiLookup, BRSR: brsrKpiLookup };
  const activeFilters = framework === 'BRSR' ? brsrFilters : framework === 'SASB' ? sasbFilters : griFilters;
  const updateActiveFilter = framework === 'BRSR' ? updateBrsrFilter : framework === 'SASB' ? updateSasbFilter : updateGriFilter;

  return (
    <div className="summary-page">
      <div className="summary-hero">
        <div className="summary-hero-inner">
          <div className="summary-hero-text">
            <h1 className="summary-title">ESG Performance Overview</h1>
            <p className="summary-subtitle">
              Select any metric area below to explore detailed data, charts, and disclosures.
            </p>
          </div>

          <div className="summary-hero-controls">
            <FrameworkToggle value={framework} onChange={setFramework} />
            <div className="summary-filter-bar">
              <span className="summary-filter-icon"><Filter size={13} /></span>
              {framework === 'BRSR' ? (
                <select
                  className="filter-select fy-selector"
                  value={brsrFilters.fy}
                  onChange={(e) => updateBrsrFilter('fy', e.target.value)}
                >
                  {BRSR_FY_OPTIONS.map((fy) => (
                    <option key={fy} value={fy}>{fy}</option>
                  ))}
                </select>
              ) : (
                <select
                  className="filter-select"
                  value={activeFilters.year}
                  onChange={(e) => updateActiveFilter('year', e.target.value)}
                >
                  <option value="all">All Years</option>
                  {filterOptions.years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              )}
              <select
                className="filter-select"
                value={activeFilters.plant}
                onChange={(e) => updateActiveFilter('plant', e.target.value)}
              >
                <option value="all">All Plants</option>
                {filterOptions.plants.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {filterOptions.regions.length > 0 && (
                <select
                  className="filter-select"
                  value={activeFilters.region}
                  onChange={(e) => updateActiveFilter('region', e.target.value)}
                >
                  <option value="all">All Regions</option>
                  {filterOptions.regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="summary-loading">Loading KPIs…</div>}

      {PILLARS.map(({ pillar, label, domains }) => {
        // Only render domains that have a real KPI for the active framework.
        const visibleDomains = domains.filter((d) => d.kpiId[framework] != null);
        if (visibleDomains.length === 0) return null;
        return (
          <section key={pillar} className="summary-domain-section">
            <h2 className="summary-domain-heading">{label}</h2>
            <div className="summary-card-grid">
              {visibleDomains.map((d) => {
                const resolvedKpiId = d.kpiId[framework];
                const kpi = kpiLookupByFramework[framework][resolvedKpiId] || null;
                return (
                  <DomainCard
                    key={d.id}
                    domainMeta={d}
                    kpiId={resolvedKpiId}
                    kpi={kpi}
                    framework={framework}
                    iconColorMap={ICON_COLOR_MAP[framework]}
                    higherIsBetterMap={HIGHER_IS_BETTER_MAP[framework]}
                    onClick={() => navigate(`/dashboards/${pillar}/${d.id}`)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Governance section is BRSR-only — hide entirely under GRI/SASB since
          CSR (P8) and Ethics & Compliance (P1) have no GRI/SASB equivalent. */}
      {framework === 'BRSR' && (
        <section className="summary-domain-section">
          <h2 className="summary-domain-heading">Governance</h2>
          <div className="summary-card-grid">
            {GOVERNANCE_DOMAINS.map((d) => (
              <DomainCard
                key={d.id}
                domainMeta={d}
                kpiId={d.kpiId}
                kpi={brsrKpiLookup[d.kpiId] || null}
                framework={framework}
                iconColorMap={BRSR_ICON_COLORS}
                higherIsBetterMap={BRSR_HIGHER_IS_BETTER}
                onClick={() => navigate(`/dashboards/governance/${d.id}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
