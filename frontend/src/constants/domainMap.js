import {
  Droplet, Trash2, Zap, Wind, Users, Shield, BookOpen,
  Cloud, AlertOctagon, Siren, GraduationCap, Heart, Scale,
} from 'lucide-react';
import WaterCharts from '../components/environment/WaterCharts.jsx';
import WasteCharts from '../components/environment/WasteCharts.jsx';
import EnergyCharts from '../components/environment/EnergyCharts.jsx';
import EmissionsCharts from '../components/environment/EmissionsCharts.jsx';
import WorkforceCharts from '../components/social/WorkforceCharts.jsx';
import SafetyCharts from '../components/social/SafetyCharts.jsx';
import DevelopmentCharts from '../components/social/DevelopmentCharts.jsx';
import HazardousWasteCharts from '../components/sasb/HazardousWasteCharts.jsx';
import ProcessSafetyCharts from '../components/sasb/ProcessSafetyCharts.jsx';
import BrsrWorkforceCharts from '../components/brsr/BrsrWorkforceCharts.jsx';
import BrsrTrainingCharts from '../components/brsr/BrsrTrainingCharts.jsx';
import BrsrCsrCharts from '../components/brsr/BrsrCsrCharts.jsx';
import BrsrComplianceCards from '../components/brsr/BrsrComplianceCards.jsx';

// Domain-first navigation tree. Each pillar lists the domains shown in the
// Sidebar; each domain resolves (per framework) to the subTab id that the
// existing chart components/FilterBar/kpiGroups maps already key off of -
// reusing that id-prefix convention (sasb_*/brsr_*) means none of the chart
// components needed to change for this restructure.
export const NAV_TREE = {
  environment: {
    label: 'Environment',
    domains: [
      { id: 'water', label: 'Water', icon: Droplet },
      { id: 'waste', label: 'Waste', icon: Trash2 },
      { id: 'energy', label: 'Energy', icon: Zap },
      { id: 'ghg', label: 'GHG & Air Quality', icon: Wind },
    ],
  },
  social: {
    label: 'Social',
    domains: [
      { id: 'workforce', label: 'Workforce', icon: Users },
      { id: 'safety', label: 'Safety', icon: Shield },
      { id: 'development', label: 'Development', icon: BookOpen },
    ],
  },
  governance: {
    label: 'Governance',
    domains: [
      { id: 'csr', label: 'CSR (P8)', icon: Heart },
      { id: 'compliance', label: 'Ethics & Compliance (P1)', icon: Scale },
    ],
  },
};

// pillar -> domain -> { GRI, SASB, BRSR } standard/disclosure code shown next
// to the domain label in the Sidebar nav (e.g. "Water (GRI-303)"). null means
// that framework has no equivalent disclosure for this domain, so the nav
// item falls back to the plain label with no code. Sourced from the same
// codes already used in chartColors.js comments and backend/main.py's KPI
// "sasb"/"principle" fields and REPORT_TEMPLATES. Governance domains are
// intentionally excluded — they're BRSR-only and already carry their NGRBC
// principle code in NAV_TREE's label (e.g. "CSR (P8)").
export const DOMAIN_STANDARD_CODE = {
  environment: {
    water:  { GRI: 'GRI-303', SASB: 'RT-CH-140a', BRSR: 'P6' },
    waste:  { GRI: 'GRI-306', SASB: 'RT-CH-150a', BRSR: 'P6' },
    energy: { GRI: 'GRI-302', SASB: 'RT-CH-130a', BRSR: 'P6' },
    ghg:    { GRI: 'GRI-305', SASB: 'RT-CH-110a', BRSR: 'P6' },
  },
  social: {
    workforce:   { GRI: 'GRI-401', SASB: null,          BRSR: 'P3' },
    safety:      { GRI: 'GRI-403', SASB: 'RT-CH-320a',  BRSR: 'P3' },
    development: { GRI: 'GRI-404', SASB: null,          BRSR: 'P3' },
  },
};

// pillar -> domain -> { GRI, SASB, BRSR } subTab id (null = framework has no
// data for this domain). Governance only ever renders BRSR.
export const DOMAIN_FRAMEWORK_MAP = {
  environment: {
    water:  { GRI: 'water',     SASB: 'sasb_water',  BRSR: 'brsr_water' },
    waste:  { GRI: 'waste',     SASB: 'sasb_waste',  BRSR: 'brsr_waste' },
    energy: { GRI: 'energy',    SASB: 'sasb_energy', BRSR: 'brsr_energy' },
    ghg:    { GRI: 'emissions', SASB: 'sasb_ghg_air', BRSR: 'brsr_ghg_air' },
  },
  social: {
    workforce:   { GRI: 'workforce',   SASB: null,          BRSR: 'brsr_workforce' },
    safety:      { GRI: 'safety',      SASB: 'sasb_safety', BRSR: 'brsr_safety' },
    development: { GRI: 'development', SASB: null,          BRSR: 'brsr_training' },
  },
  governance: {
    csr:        { GRI: null, SASB: null, BRSR: 'brsr_csr' },
    compliance: { GRI: null, SASB: null, BRSR: 'brsr_compliance' },
  },
};

// Every subTab id this dashboard can mount, with its label/icon/chart
// component/legacy mainTab grouping (mainTab values are kept only because
// kpiGroups.js's *_KPI_GROUPS maps are still keyed by them upstream).
export const SUBTAB_META = {
  water:       { label: 'Water',       icon: Droplet,  Component: WaterCharts,       mainTab: 'environment' },
  waste:       { label: 'Waste',       icon: Trash2,   Component: WasteCharts,       mainTab: 'environment' },
  energy:      { label: 'Energy',      icon: Zap,      Component: EnergyCharts,      mainTab: 'environment' },
  emissions:   { label: 'Emissions',   icon: Wind,     Component: EmissionsCharts,   mainTab: 'environment' },
  workforce:   { label: 'Workforce',   icon: Users,    Component: WorkforceCharts,   mainTab: 'social' },
  safety:      { label: 'Safety',      icon: Shield,   Component: SafetyCharts,      mainTab: 'social' },
  development: { label: 'Development', icon: BookOpen, Component: DevelopmentCharts, mainTab: 'social' },
  sasb_ghg_air:        { label: 'GHG & Air Quality',  icon: Cloud,        Component: EmissionsCharts,      mainTab: 'sasb_environment' },
  sasb_energy:         { label: 'Energy Management',  icon: Zap,          Component: EnergyCharts,         mainTab: 'sasb_environment' },
  sasb_water:          { label: 'Water Management',   icon: Droplet,      Component: WaterCharts,          mainTab: 'sasb_environment' },
  sasb_waste:          { label: 'Hazardous Waste',     icon: AlertOctagon, Component: HazardousWasteCharts, mainTab: 'sasb_environment' },
  sasb_safety:         { label: 'Workforce Safety',    icon: Shield,       Component: SafetyCharts,         mainTab: 'sasb_social' },
  sasb_process_safety: { label: 'Process Safety',      icon: Siren,        Component: ProcessSafetyCharts,  mainTab: 'sasb_social' },
  brsr_energy:     { label: 'Energy (P6)',              icon: Zap,           Component: EnergyCharts,        mainTab: 'brsr_environment' },
  brsr_water:      { label: 'Water (P6)',               icon: Droplet,       Component: WaterCharts,         mainTab: 'brsr_environment' },
  brsr_ghg_air:    { label: 'GHG & Air (P6)',           icon: Cloud,         Component: EmissionsCharts,     mainTab: 'brsr_environment' },
  brsr_waste:      { label: 'Waste (P6)',               icon: Trash2,        Component: WasteCharts,         mainTab: 'brsr_environment' },
  brsr_workforce:  { label: 'Workforce (P3)',           icon: Users,         Component: BrsrWorkforceCharts, mainTab: 'brsr_social' },
  brsr_training:   { label: 'Training (P3)',            icon: GraduationCap, Component: BrsrTrainingCharts,  mainTab: 'brsr_social' },
  brsr_safety:     { label: 'Safety (P3)',              icon: Shield,        Component: SafetyCharts,        mainTab: 'brsr_social' },
  brsr_csr:        { label: 'CSR (P8)',                 icon: Heart,         Component: BrsrCsrCharts,       mainTab: 'brsr_governance' },
  brsr_compliance: { label: 'Ethics & Compliance (P1)', icon: Scale,         Component: BrsrComplianceCards, mainTab: 'brsr_governance' },
};
