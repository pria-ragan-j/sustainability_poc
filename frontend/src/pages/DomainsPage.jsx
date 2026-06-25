import React, { useEffect, useRef, useState } from 'react';
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
import KpiCard from '../components/kpi/KpiCard.jsx';
import FilterBar from '../components/layout/FilterBar.jsx';
import FrameworkToggle from '../components/layout/FrameworkToggle.jsx';
import InsightsPanel from '../components/shared/InsightsPanel.jsx';
import OutlierPanel from '../components/shared/OutlierPanel.jsx';
import ProcessSafetyCharts from '../components/sasb/ProcessSafetyCharts.jsx';

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
  // limits: { [kpi_id]: { threshold, baseline_default, is_override } } from
  // /api/limits - a single global per-KPI config, not filtered, so it's
  // fetched once on mount rather than re-fetched per filter change.
  const [limits, setLimits] = useState({});

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

  useEffect(() => {
    api.getLimits().then((data) => {
      const byId = {};
      (data.kpis || []).forEach((k) => { byId[k.id] = k; });
      setLimits(byId);
    }).catch(() => {});
  }, []);

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
            <div className="kpi-row">
              {filteredKpis.map((kpi, index) => (
                <KpiCard
                  key={kpi.id}
                  {...kpi}
                  Icon={icons[kpi.id]}
                  iconColor={iconColors[kpi.id]}
                  higherIsBetter={higherBetter[kpi.id]}
                  hideTrend={!isBrsrTab && panelFilters.year === 'all'}
                  tooltipAlign={index === 0 ? 'left' : index === filteredKpis.length - 1 ? 'right' : undefined}
                  limit={limits[kpi.id]}
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

            {panelDomain && <OutlierPanel domain={panelDomain} filters={panelFilters} />}
          </div>
        );
      })}
    </div>
  );
}
