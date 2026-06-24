import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { useAppContext, SUBTAB_DOMAIN } from '../context/AppContext.jsx';
import api from '../api/client.js';
import {
  ENV_KPI_GROUPS, SOCIAL_KPI_GROUPS, KPI_ICONS, KPI_HIGHER_IS_BETTER, KPI_ICON_COLORS,
  SASB_KPI_GROUPS, SASB_KPI_ICONS, SASB_HIGHER_IS_BETTER, SASB_ICON_COLORS, SASB_SUBTAB_DOMAIN,
  BRSR_KPI_GROUPS, BRSR_KPI_ICONS, BRSR_HIGHER_IS_BETTER, BRSR_ICON_COLORS, BRSR_SUBTAB_DOMAIN,
} from '../constants/kpiGroups.js';
import { DOMAIN_FRAMEWORK_MAP, NAV_TREE, SUBTAB_META } from '../constants/domainMap.js';
import KpiCard, { KPI_TO_CORR_METRIC } from '../components/kpi/KpiCard.jsx';
import FilterBar from '../components/layout/FilterBar.jsx';
import FrameworkToggle from '../components/layout/FrameworkToggle.jsx';
import InsightsPanel from '../components/shared/InsightsPanel.jsx';
import OutlierPanel from '../components/shared/OutlierPanel.jsx';
import ProcessSafetyCharts from '../components/sasb/ProcessSafetyCharts.jsx';

// Maps each GRI domain nav id → the correlation metric IDs whose top correlator
// should be prefetched for that domain's KPI cards. Only GRI mode fetches
// correlations (datasets are GRI-indexed); SASB/BRSR cards show no chip.
const DOMAIN_CORR_METRICS = {
  water:     ['water_withdrawn', 'water_consumed'],
  waste:     ['waste_generated'],
  energy:    ['energy_consumed'],
  ghg:       ['scope1_ghg'],
  safety:    ['safety_incidents'],
};

// Single shared route component for /dashboards/:pillar/:domain.
export default function DomainsPage() {
  const { pillar, domain } = useParams();
  const {
    framework, setFramework,
    griFilters, environmentKpis, setEnvironmentKpis, socialKpis, setSocialKpis,
    sasbFilters, sasbKpis, setSasbKpis, brsrFilters, ensureFilterOptions,
    setCurrentPage,
  } = useAppContext();

  const [brsrKpis, setBrsrKpis] = useState([]);
  // correlations: { [corr_metric_id]: [{metric_id, label, r, direction, ...}, ...] }
  const [correlations, setCorrelations] = useState({});

  const isGovernance = pillar === 'governance';
  const effectiveFramework = isGovernance ? 'BRSR' : framework;

  const domainMeta = NAV_TREE[pillar]?.domains.find((d) => d.id === domain);
  const frameworkMap = DOMAIN_FRAMEWORK_MAP[pillar]?.[domain] || {};
  const subTabId = frameworkMap[effectiveFramework] || null;

  const mountedTabs = useRef(new Set());
  if (subTabId) mountedTabs.current.add(subTabId);

  // Register the active page in context so FloatingAiWidget can scope its
  // system prompt without parsing the URL itself.
  useEffect(() => {
    setCurrentPage({ pillar, domain });
    return () => setCurrentPage({ pillar: null, domain: null });
  }, [pillar, domain, setCurrentPage]);

  useEffect(() => {
    if (subTabId) ensureFilterOptions(subTabId);
  }, [subTabId, ensureFilterOptions]);

  // Fetch correlations for the current domain's GRI KPI cards once per domain
  // visit (only in GRI mode — SASB/BRSR datasets aren't in CORR_METRICS).
  const fetchCorrelations = useCallback(() => {
    if (effectiveFramework !== 'GRI' || isGovernance) return;
    const metricIds = DOMAIN_CORR_METRICS[domain] || [];
    if (!metricIds.length) return;
    const plant = griFilters.plant !== 'all' ? griFilters.plant : undefined;
    metricIds.forEach((mid) => {
      api.getKpiCorrelations(mid, plant ? { plant } : {})
        .then((data) => {
          setCorrelations((prev) => ({ ...prev, [mid]: data.correlations || [] }));
        })
        .catch(() => {});
    });
  }, [effectiveFramework, isGovernance, domain, griFilters.plant]);

  useEffect(() => { fetchCorrelations(); }, [fetchCorrelations]);

  // Clear correlations when switching framework away from GRI.
  useEffect(() => {
    if (effectiveFramework !== 'GRI') setCorrelations({});
  }, [effectiveFramework]);

  useEffect(() => {
    if (pillar !== 'environment' || effectiveFramework !== 'GRI') return;
    api.getEnvKpis({ year: griFilters.year, plant: griFilters.plant, region: griFilters.region })
      .then(setEnvironmentKpis)
      .catch(() => {});
  }, [pillar, effectiveFramework, griFilters.year, griFilters.plant, griFilters.region, setEnvironmentKpis]);

  useEffect(() => {
    if (pillar !== 'social' || effectiveFramework !== 'GRI') return;
    api.getSocialKpis({ year: griFilters.year, plant: griFilters.plant, region: griFilters.region })
      .then(setSocialKpis)
      .catch(() => {});
  }, [pillar, effectiveFramework, griFilters.year, griFilters.plant, griFilters.region, setSocialKpis]);

  useEffect(() => {
    if (effectiveFramework !== 'SASB') return;
    api.getSasbKpis({ year: sasbFilters.year, plant: sasbFilters.plant, region: sasbFilters.region })
      .then(setSasbKpis)
      .catch(() => {});
  }, [effectiveFramework, sasbFilters.year, sasbFilters.plant, sasbFilters.region, setSasbKpis]);

  useEffect(() => {
    if (effectiveFramework !== 'BRSR') return;
    api.getBrsrKpis({ fy: brsrFilters.fy, plant: brsrFilters.plant, region: brsrFilters.region })
      .then(setBrsrKpis)
      .catch(() => {});
  }, [effectiveFramework, brsrFilters.fy, brsrFilters.plant, brsrFilters.region]);

  const available = {
    GRI: !!frameworkMap.GRI,
    SASB: !!frameworkMap.SASB,
    BRSR: !!frameworkMap.BRSR,
  };

  if (!domainMeta) return <Navigate to="/dashboards/summary" replace />;

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <div className="content-header">
        <h2 className="content-title">
          {domainMeta?.icon && <domainMeta.icon size={18} />}
          {domainMeta?.label || domain}
        </h2>
        {!isGovernance && <FrameworkToggle value={framework} onChange={setFramework} available={available} />}
      </div>

      {!subTabId && (
        <div className="empty-state">
          <LayoutDashboard size={36} className="placeholder-icon" />
          <p className="placeholder-title">
            {effectiveFramework} does not cover {domainMeta?.label || domain} — switch frameworks above to view this domain&apos;s data.
          </p>
        </div>
      )}

      {[...mountedTabs.current].map((id) => {
        const meta = SUBTAB_META[id];
        if (!meta) return null;
        const { label, icon, Component, mainTab } = meta;
        const isSasbTab = mainTab === 'sasb_environment' || mainTab === 'sasb_social';
        const isBrsrTab = mainTab === 'brsr_environment' || mainTab === 'brsr_social' || mainTab === 'brsr_governance';
        const groupIds = isBrsrTab
          ? (BRSR_KPI_GROUPS[id] || [])
          : isSasbTab
            ? (SASB_KPI_GROUPS[id] || [])
            : ((mainTab === 'environment' ? ENV_KPI_GROUPS : SOCIAL_KPI_GROUPS)[id] || []);
        const kpiSource    = isBrsrTab ? brsrKpis : isSasbTab ? sasbKpis : (mainTab === 'environment' ? environmentKpis : socialKpis);
        const filteredKpis = kpiSource.filter((k) => groupIds.includes(k.id));
        const icons        = isBrsrTab ? BRSR_KPI_ICONS : isSasbTab ? SASB_KPI_ICONS : KPI_ICONS;
        const iconColors   = isBrsrTab ? BRSR_ICON_COLORS : isSasbTab ? SASB_ICON_COLORS : KPI_ICON_COLORS;
        const higherBetter = isBrsrTab ? BRSR_HIGHER_IS_BETTER : isSasbTab ? SASB_HIGHER_IS_BETTER : KPI_HIGHER_IS_BETTER;
        const panelDomain  = SUBTAB_DOMAIN[id] || SASB_SUBTAB_DOMAIN[id] || BRSR_SUBTAB_DOMAIN[id];
        const panelFilters = isBrsrTab ? brsrFilters : isSasbTab ? sasbFilters : griFilters;
        const isActive     = id === subTabId;

        return (
          <div key={id} style={{ display: isActive ? 'block' : 'none' }}>
            <FilterBar subTab={id} icon={icon} label={label} />
            {panelDomain && <InsightsPanel domain={panelDomain} filters={panelFilters} />}
            {panelDomain && <OutlierPanel domain={panelDomain} filters={panelFilters} />}
            <div className="kpi-row">
              {filteredKpis.map((kpi) => (
                <KpiCard
                  key={kpi.id}
                  {...kpi}
                  Icon={icons[kpi.id]}
                  iconColor={iconColors[kpi.id]}
                  higherIsBetter={higherBetter[kpi.id]}
                  correlations={(!isSasbTab && !isBrsrTab) ? correlations : undefined}
                />
              ))}
            </div>
            <Component subTab={id} />

            {id === 'sasb_safety' && (
              <>
                <h3 className="content-subheading">Process Safety (RT-CH-540a)</h3>
                <ProcessSafetyCharts />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
