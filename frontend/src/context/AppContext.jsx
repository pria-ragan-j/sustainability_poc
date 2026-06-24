import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/client.js';
import { AUTH_CREDENTIALS } from '../config/auth.js';
import { SASB_SUBTAB_DOMAIN, BRSR_SUBTAB_DOMAIN } from '../constants/kpiGroups.js';

const AppContext = createContext(null);

// Sub-tabs that have a live backend dataset behind them, keyed to the
// /api/filters?domain= value used to populate that sub-tab's dropdowns.
const SUBTAB_DOMAIN = {
  water: 'water',
  waste: 'waste',
  safety: 'safety',
  energy: 'energy',
  emissions: 'emissions',
};

const defaultFilters = { year: 'all', plant: 'all', region: 'all' };

export function AppProvider({ children }) {
  // Authentication gate: in-memory only, no persistence — refreshing the
  // browser or closing the tab requires signing in again, consistent with
  // the rest of the app's state (which is also plain React state).
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = useCallback((username, password) => {
    if (username === AUTH_CREDENTIALS.username && password === AUTH_CREDENTIALS.password) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => setIsAuthenticated(false), []);

  // Left sidebar: icon-only rail toggle + per-section accordion expand state.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ dashboards: true, reports: false });

  const [expandedChart, setExpandedChart] = useState(null);

  // Single global framework selection (GRI/SASB/BRSR), shared by the Summary
  // page toggle, each domain page's toggle, and the Sidebar nav (which shows
  // the standard code matching this framework next to each domain). One
  // shared state means switching frameworks anywhere is reflected everywhere.
  const [framework, setFramework] = useState('GRI');

  // Active dashboard page context — set by DomainsPage on mount/unmount so
  // the floating AI assistant can scope its system prompt to the current domain
  // without parsing the URL inside the AI component itself.
  const [currentPage, setCurrentPage] = useState({ pillar: null, domain: null });

  // One shared Year/Plant/Region filter per framework (confirmed decision) -
  // Summary's filter IS this same state, so changing it anywhere (Summary,
  // any sub-tab's FilterBar, or chart-click cross-filtering) updates it
  // everywhere within that framework. griChartFilter/sasbChartFilter just
  // record whether the current value came from a chart click, so FilterBar
  // can show the "clear cross-filter" chip.
  const [griFilters, setGriFilters] = useState({ ...defaultFilters });
  const [sasbFilters, setSasbFilters] = useState({ ...defaultFilters });
  // BRSR uses Indian FY (Apr–Mar) as the primary time axis.
  // 'fy' drives the report and KPI endpoints; 'year'/'plant'/'region' are still
  // passed to the reused GRI chart endpoints (P6 environment sub-tabs).
  const [brsrFilters, setBrsrFilters] = useState({ fy: 'FY2024-25', year: 'all', plant: 'all', region: 'all' });
  const [griChartFilter, setGriChartFilterFlag] = useState(null);
  const [sasbChartFilter, setSasbChartFilterFlag] = useState(null);
  const [brsrChartFilterFlag, setBrsrChartFilterFlag] = useState(null);
  const [filterOptionsByDomain, setFilterOptionsByDomain] = useState({});
  const [environmentKpis, setEnvironmentKpis] = useState([]);
  const [socialKpis, setSocialKpis] = useState([]);
  const [sasbKpis, setSasbKpis] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  // Global Monthly / Yearly toggle — persists across sub-tab navigation.
  const [viewMode, setViewMode] = useState('monthly');

  // AI floating widget open/closed state — persists across route navigation
  // (except on /chats, where the dedicated page replaces it entirely).
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // Currently open chat thread, shared between the Chats page and the
  // floating AI widget so opening a thread in one place is reflected in
  // the other if both are visible.
  const [activeThreadId, setActiveThreadId] = useState(null);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((v) => !v), []);
  const toggleAiPanel = useCallback(() => setAiPanelOpen((v) => !v), []);

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Cross-filter: clicking a plant/month bar in any GRI chart updates the
  // single shared griFilters object, so every GRI sub-tab AND the Summary
  // page (when its own GRI/SASB toggle is on GRI) re-fetch with the same value.
  const setChartFilter = useCallback((key, value) => {
    setGriFilters((prev) => ({ ...prev, [key]: value }));
    setGriChartFilterFlag({ [key]: value });
  }, []);

  const clearChartFilters = useCallback(() => {
    setGriFilters((prev) => ({ ...prev, plant: 'all' }));
    setGriChartFilterFlag(null);
  }, []);

  const updateGriFilter = useCallback((key, value) => {
    setGriFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // SASB equivalents of setChartFilter/clearChartFilters/updateGriFilter -
  // identical logic, separate shared state, so a SASB filter change never
  // touches griFilters (and vice versa) - confirmed decision, GRI and SASB
  // dashboards stay fully independent of each other.
  const setSasbChartFilter = useCallback((key, value) => {
    setSasbFilters((prev) => ({ ...prev, [key]: value }));
    setSasbChartFilterFlag({ [key]: value });
  }, []);

  const clearSasbChartFilter = useCallback(() => {
    setSasbFilters((prev) => ({ ...prev, plant: 'all' }));
    setSasbChartFilterFlag(null);
  }, []);

  const updateSasbFilter = useCallback((key, value) => {
    setSasbFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // BRSR equivalents — separate filter state so BRSR never leaks into GRI/SASB.
  // brsrFilters includes the 'fy' field (Indian FY) in addition to year/plant/region.
  const setBrsrChartFilter = useCallback((key, value) => {
    setBrsrFilters((prev) => ({ ...prev, [key]: value }));
    setBrsrChartFilterFlag({ [key]: value });
  }, []);

  const clearBrsrChartFilter = useCallback(() => {
    setBrsrFilters((prev) => ({ ...prev, plant: 'all' }));
    setBrsrChartFilterFlag(null);
  }, []);

  const updateBrsrFilter = useCallback((key, value) => {
    setBrsrFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Fetch filter options for the domain backing a given subTab id, once per
  // domain. Checks GRI, SASB, and BRSR domain maps - BRSR P6 sub-tabs resolve
  // to the same domain strings as GRI, so they share the cache. Called by
  // DomainsPage whenever the resolved subTab changes.
  const ensureFilterOptions = useCallback((subTabId) => {
    const domain = SUBTAB_DOMAIN[subTabId] || SASB_SUBTAB_DOMAIN[subTabId] || BRSR_SUBTAB_DOMAIN[subTabId];
    if (!domain) return;
    setFilterOptionsByDomain((prev) => {
      if (prev[domain]) return prev;
      api.getFilters(domain).then((data) => {
        setFilterOptionsByDomain((p) => ({ ...p, [domain]: data }));
      }).catch(() => {});
      return prev;
    });
  }, []);

  const value = {
    isAuthenticated,
    login,
    logout,
    sidebarCollapsed,
    toggleSidebar,
    expandedSections,
    toggleSection,
    expandedChart,
    setExpandedChart,
    framework,
    setFramework,
    currentPage,
    setCurrentPage,
    griFilters,
    updateGriFilter,
    griChartFilter,
    setChartFilter,
    clearChartFilters,
    sasbFilters,
    updateSasbFilter,
    sasbChartFilter,
    setSasbChartFilter,
    clearSasbChartFilter,
    brsrFilters,
    updateBrsrFilter,
    brsrChartFilter: brsrChartFilterFlag,
    setBrsrChartFilter,
    clearBrsrChartFilter,
    filterOptionsByDomain,
    ensureFilterOptions,
    environmentKpis,
    setEnvironmentKpis,
    socialKpis,
    setSocialKpis,
    sasbKpis,
    setSasbKpis,
    isGeneratingReport,
    setIsGeneratingReport,
    aiPanelOpen,
    toggleAiPanel,
    activeThreadId,
    setActiveThreadId,
    viewMode,
    setViewMode,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

// FY options for BRSR filter dropdowns (Indian Financial Year Apr–Mar)
export const BRSR_FY_OPTIONS = [
  'FY2019-20', 'FY2020-21', 'FY2021-22', 'FY2022-23', 'FY2023-24', 'FY2024-25',
];

export { SUBTAB_DOMAIN };
