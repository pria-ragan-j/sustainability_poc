import React from 'react';
import { X } from 'lucide-react';
import { useAppContext, SUBTAB_DOMAIN, BRSR_FY_OPTIONS } from '../../context/AppContext.jsx';
import { SASB_SUBTAB_DOMAIN, BRSR_SUBTAB_DOMAIN } from '../../constants/kpiGroups.js';

const EMPTY_OPTIONS = { years: [], plants: [], regions: [] };

export default function FilterBar({ subTab, icon: Icon, label }) {
  const {
    griFilters, updateGriFilter, griChartFilter, clearChartFilters,
    sasbFilters, updateSasbFilter, sasbChartFilter, clearSasbChartFilter,
    brsrFilters, updateBrsrFilter, brsrChartFilter, clearBrsrChartFilter,
    filterOptionsByDomain, viewMode, setViewMode,
  } = useAppContext();

  const isSasb = subTab.startsWith('sasb_');
  const isBrsr = subTab.startsWith('brsr_');

  const filters      = isBrsr ? brsrFilters : isSasb ? sasbFilters : griFilters;
  const updateFilter = isBrsr ? updateBrsrFilter : isSasb ? updateSasbFilter : updateGriFilter;
  const clearFilters = isBrsr ? clearBrsrChartFilter : isSasb ? clearSasbChartFilter : clearChartFilters;
  const activeChartFilter = isBrsr ? brsrChartFilter : isSasb ? sasbChartFilter : griChartFilter;

  const panelDomain = SUBTAB_DOMAIN[subTab] || SASB_SUBTAB_DOMAIN[subTab] || BRSR_SUBTAB_DOMAIN[subTab];
  const hasLiveData = Boolean(panelDomain);
  const filterOptions = (panelDomain && filterOptionsByDomain[panelDomain]) || EMPTY_OPTIONS;

  return (
    <div className="content-header">
      <div className="content-title">
        <Icon size={18} />
        {label}
      </div>

      <div className="filter-bar">
        {activeChartFilter && (
          <span className="cross-filter-chip">
            <span className="cross-filter-chip-label">
              Plant: {filters.plant}
            </span>
            <button
              className="cross-filter-chip-dismiss"
              onClick={() => clearFilters()}
              title="Clear chart filter"
            >
              <X size={11} />
            </button>
          </span>
        )}

        {/* Monthly/Yearly toggle hidden for BRSR (FY is the primary time unit) */}
        {hasLiveData && !isBrsr && (
          <div className="view-toggle">
            <button
              className={`view-option${viewMode === 'monthly' ? ' active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >Monthly</button>
            <button
              className={`view-option${viewMode === 'yearly' ? ' active' : ''}`}
              onClick={() => setViewMode('yearly')}
            >Yearly</button>
          </div>
        )}

        {/* BRSR: FY selector replaces calendar-year selector */}
        {isBrsr ? (
          <select
            className="filter-select fy-selector"
            value={filters.fy}
            disabled={!hasLiveData}
            onChange={(e) => updateFilter('fy', e.target.value)}
          >
            {BRSR_FY_OPTIONS.map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
        ) : (
          <select
            className="filter-select"
            value={filters.year}
            disabled={!hasLiveData || viewMode === 'yearly'}
            title={viewMode === 'yearly' ? 'Year filter is disabled in Yearly view' : undefined}
            onChange={(e) => updateFilter('year', e.target.value)}
          >
            <option value="all">All Years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        <select
          className="filter-select"
          value={filters.plant}
          disabled={!hasLiveData}
          onChange={(e) => updateFilter('plant', e.target.value)}
        >
          <option value="all">All Plants</option>
          {filterOptions.plants.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={filters.region}
          disabled={!hasLiveData || filterOptions.regions.length === 0}
          onChange={(e) => updateFilter('region', e.target.value)}
        >
          <option value="all">All Regions</option>
          {filterOptions.regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
