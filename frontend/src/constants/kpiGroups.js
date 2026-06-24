import {
  Droplet, Droplets, Waves, AlertTriangle, Trash2, Recycle, Archive, Leaf,
  Zap, Sun, Flame, Gauge,
  Cloud, Factory, Truck, Wind,
  Users, UserCheck, Shield, UserPlus, UserMinus, BookOpen,
  HeartPulse, Stethoscope, Activity,
  FlaskConical, Beaker, CloudFog, Percent,
  AlertOctagon, User, HardHat, ShieldAlert, Siren, AlertCircle,
  Scale, Heart, GraduationCap, Building2,
} from 'lucide-react';

// Maps each sub-tab to the KPI card ids returned by /api/environment/kpis
// and /api/social/kpis that belong to it.
export const ENV_KPI_GROUPS = {
  water:     ['water-withdrawn', 'water-discharged', 'water-consumed', 'water-stress'],
  waste:     ['waste-generated', 'waste-diverted', 'waste-disposed', 'waste-diversion'],
  energy:    ['energy-consumed', 'renewable-energy', 'non-renewable-energy', 'energy-intensity'],
  emissions: ['total-ghg', 'scope1-ghg', 'scope2-ghg', 'scope3-ghg'],
};

export const SOCIAL_KPI_GROUPS = {
  workforce:   ['employees', 'female-pct'],
  safety:      ['work-injuries', 'ill-health', 'ltifr', 'trir'],
  development: ['new-hire-rate', 'turnover-rate', 'training-hours'],
};

// Lucide icon components keyed by KPI id.
export const KPI_ICONS = {
  // Water
  'water-withdrawn':      Droplet,
  'water-discharged':     Waves,
  'water-consumed':       Droplets,
  'water-stress':         AlertTriangle,
  // Waste
  'waste-generated':      Trash2,
  'waste-diverted':       Recycle,
  'waste-disposed':       Archive,
  'waste-diversion':      Leaf,
  // Energy
  'energy-consumed':      Zap,
  'renewable-energy':     Sun,
  'non-renewable-energy': Flame,
  'energy-intensity':     Gauge,
  // Emissions
  'total-ghg':            Cloud,
  'scope1-ghg':           Wind,
  'scope2-ghg':           Factory,
  'scope3-ghg':           Truck,
  // Workforce
  'employees':            Users,
  'female-pct':           UserCheck,
  // Safety
  'work-injuries':        HeartPulse,
  'ill-health':           Stethoscope,
  'ltifr':                Shield,
  'trir':                 Activity,
  // Development
  'new-hire-rate':        UserPlus,
  'turnover-rate':        UserMinus,
  'training-hours':       BookOpen,
};

// Contextual color for trend direction.
// true  = higher is good (green ↑, red ↓)
// false = lower is good  (red ↑, green ↓)   — ESG default for most metrics
// null  = neutral (always gray regardless of direction)
export const KPI_HIGHER_IS_BETTER = {
  'water-withdrawn':      false,
  'water-discharged':     null,
  'water-consumed':       false,
  'water-stress':         false,
  'waste-generated':      false,
  'waste-diverted':       true,
  'waste-disposed':       false,
  'waste-diversion':      true,
  'energy-consumed':      false,
  'renewable-energy':     true,
  'non-renewable-energy': false,
  'energy-intensity':     false,
  'total-ghg':            false,
  'scope1-ghg':           false,
  'scope2-ghg':           false,
  'scope3-ghg':           false,
  'work-injuries':        false,
  'ill-health':           false,
  'ltifr':                false,
  'trir':                 false,
  'employees':            null,
  'female-pct':           null,
  'new-hire-rate':        null,
  'turnover-rate':        null,
  'training-hours':       null,
};

// Domain-specific icon colors per KPI id.
export const KPI_ICON_COLORS = {
  // Water — sky blue
  'water-withdrawn':      '#0ea5e9',
  'water-discharged':     '#0ea5e9',
  'water-consumed':       '#0ea5e9',
  'water-stress':         '#f59e0b',
  // Waste — green
  'waste-generated':      '#16a34a',
  'waste-diverted':       '#16a34a',
  'waste-disposed':       '#16a34a',
  'waste-diversion':      '#16a34a',
  // Energy — amber
  'energy-consumed':      '#f59e0b',
  'renewable-energy':     '#f59e0b',
  'non-renewable-energy': '#f59e0b',
  'energy-intensity':     '#f59e0b',
  // Emissions — indigo
  'total-ghg':            '#6366f1',
  'scope1-ghg':           '#6366f1',
  'scope2-ghg':           '#6366f1',
  'scope3-ghg':           '#6366f1',
  // Safety — violet
  'work-injuries':        '#8b5cf6',
  'ill-health':           '#8b5cf6',
  'ltifr':                '#8b5cf6',
  'trir':                 '#8b5cf6',
  // Workforce / Development — blue
  'employees':            '#2f8fe0',
  'female-pct':           '#2f8fe0',
  'new-hire-rate':        '#2f8fe0',
  'turnover-rate':        '#2f8fe0',
  'training-hours':       '#2f8fe0',
};

// ─── SASB (RT-CH — Chemicals) ────────────────────────────────────────────────
// Separate dashboard tree (confirmed decision — SASB_INTEGRATION_PLAN.md
// Section 6, Option 1). Sub-tab ids are prefixed "sasb_" so they never
// collide with the GRI sub-tab ids above, and so SASB_SUBTAB_DOMAIN in
// AppContext.jsx can map each one back to the same underlying GRI domain
// (water/waste/energy/emissions/safety) the chart/filter/insights/outliers
// endpoints already serve - SASB reuses that data, it doesn't duplicate it.

export const SASB_SUB_TABS = {
  sasb_environment: ['sasb_ghg_air', 'sasb_energy', 'sasb_water', 'sasb_waste'],
  sasb_social: ['sasb_safety', 'sasb_process_safety'],
};

export const SASB_KPI_GROUPS = {
  sasb_ghg_air:        ['sasb-scope1-ghg', 'sasb-nox', 'sasb-sox', 'sasb-voc', 'sasb-pm'],
  sasb_energy:         ['sasb-energy-consumed', 'sasb-renewable-energy', 'sasb-non-renewable-energy', 'sasb-renewable-pct'],
  sasb_water:          ['sasb-water-withdrawn', 'sasb-water-consumed', 'sasb-water-stress-pct'],
  sasb_waste:          ['sasb-hazardous-waste', 'sasb-nonhazardous-waste', 'sasb-hazardous-recycled-pct'],
  sasb_safety:         ['sasb-trir-total', 'sasb-trir-employee', 'sasb-trir-contractor', 'sasb-fatality-rate'],
  sasb_process_safety: ['sasb-process-safety-incidents', 'sasb-pstir', 'sasb-psisr'],
};

export const SASB_KPI_ICONS = {
  'sasb-scope1-ghg':              Cloud,
  'sasb-nox':                     Wind,
  'sasb-sox':                     FlaskConical,
  'sasb-voc':                     Beaker,
  'sasb-pm':                      CloudFog,
  'sasb-energy-consumed':         Zap,
  'sasb-renewable-energy':        Sun,
  'sasb-non-renewable-energy':    Flame,
  'sasb-renewable-pct':           Percent,
  'sasb-water-withdrawn':         Droplet,
  'sasb-water-consumed':          Droplets,
  'sasb-water-stress-pct':        AlertTriangle,
  'sasb-hazardous-waste':         AlertOctagon,
  'sasb-nonhazardous-waste':      Trash2,
  'sasb-hazardous-recycled-pct':  Recycle,
  'sasb-trir-total':              Activity,
  'sasb-trir-employee':           User,
  'sasb-trir-contractor':         HardHat,
  'sasb-fatality-rate':           ShieldAlert,
  'sasb-process-safety-incidents':Siren,
  'sasb-pstir':                   Gauge,
  'sasb-psisr':                   AlertCircle,
};

// Same ESG-contextual color rule as KPI_HIGHER_IS_BETTER above.
export const SASB_HIGHER_IS_BETTER = {
  'sasb-scope1-ghg':              false,
  'sasb-nox':                     false,
  'sasb-sox':                     false,
  'sasb-voc':                     false,
  'sasb-pm':                      false,
  'sasb-energy-consumed':         false,
  'sasb-renewable-energy':        true,
  'sasb-non-renewable-energy':    false,
  'sasb-renewable-pct':           true,
  'sasb-water-withdrawn':         false,
  'sasb-water-consumed':          false,
  'sasb-water-stress-pct':        false,
  'sasb-hazardous-waste':         false,
  'sasb-nonhazardous-waste':      false,
  'sasb-hazardous-recycled-pct':  true,
  'sasb-trir-total':              false,
  'sasb-trir-employee':           false,
  'sasb-trir-contractor':         false,
  'sasb-fatality-rate':           false,
  'sasb-process-safety-incidents':false,
  'sasb-pstir':                   false,
  'sasb-psisr':                   false,
};

export const SASB_ICON_COLORS = {
  // GHG & Air Quality — indigo (matches GRI emissions)
  'sasb-scope1-ghg':              '#6366f1',
  'sasb-nox':                     '#6366f1',
  'sasb-sox':                     '#6366f1',
  'sasb-voc':                     '#6366f1',
  'sasb-pm':                      '#6366f1',
  // Energy — amber (matches GRI energy)
  'sasb-energy-consumed':         '#f59e0b',
  'sasb-renewable-energy':        '#f59e0b',
  'sasb-non-renewable-energy':    '#f59e0b',
  'sasb-renewable-pct':           '#f59e0b',
  // Water — sky blue (matches GRI water)
  'sasb-water-withdrawn':         '#0ea5e9',
  'sasb-water-consumed':          '#0ea5e9',
  'sasb-water-stress-pct':        '#0ea5e9',
  // Hazardous Waste — red, distinct from GRI waste's green to flag risk
  'sasb-hazardous-waste':         '#dc2626',
  'sasb-nonhazardous-waste':      '#16a34a',
  'sasb-hazardous-recycled-pct':  '#16a34a',
  // Workforce Safety / Process Safety — violet (matches GRI safety)
  'sasb-trir-total':              '#8b5cf6',
  'sasb-trir-employee':           '#8b5cf6',
  'sasb-trir-contractor':         '#8b5cf6',
  'sasb-fatality-rate':           '#8b5cf6',
  'sasb-process-safety-incidents':'#8b5cf6',
  'sasb-pstir':                   '#8b5cf6',
  'sasb-psisr':                   '#8b5cf6',
};

// SASB sub-tab id -> the GRI domain string the existing filter/insights/
// outliers endpoints already key on. sasb_process_safety has no live domain
// (no dataset exists yet - see SASB_INTEGRATION_PLAN.md Section 9), exactly
// like GRI's workforce/development placeholders today.
export const SASB_SUBTAB_DOMAIN = {
  sasb_ghg_air: 'emissions',
  sasb_energy: 'energy',
  sasb_water: 'water',
  sasb_waste: 'waste',
  sasb_safety: 'safety',
};

// ─── BRSR (Business Responsibility and Sustainability Reporting) ──────────────
// Third framework alongside GRI and SASB. Essential indicators only (Phase 1
// scope). P6 Environment sub-tabs reuse GRI chart components and datasets.
// P3 Social sub-tabs partially live (safety from GRI403) + placeholders for
// workforce/training (pending data collection — BRSR_INTEGRATION_PLAN.md).
// P8 CSR and P1 Governance sub-tabs are fully placeholder until new datasets
// are collected from HR/Finance/EHS/Legal teams.

export const BRSR_SUB_TABS = {
  brsr_environment: ['brsr_energy', 'brsr_water', 'brsr_ghg_air', 'brsr_waste'],
  brsr_social:      ['brsr_workforce', 'brsr_training', 'brsr_safety'],
  brsr_governance:  ['brsr_csr', 'brsr_compliance'],
};

export const BRSR_KPI_GROUPS = {
  brsr_energy:      ['brsr-energy-consumed', 'brsr-renewable-pct'],
  brsr_water:       ['brsr-water-withdrawn', 'brsr-water-consumed'],
  brsr_ghg_air:     ['brsr-scope1-ghg', 'brsr-scope2-ghg'],
  brsr_waste:       ['brsr-waste-hazardous', 'brsr-waste-nonhazardous'],
  brsr_workforce:   ['brsr-female-pct', 'brsr-differently-abled'],
  brsr_training:    ['brsr-training-hours', 'brsr-training-coverage'],
  brsr_safety:      ['brsr-ltifr', 'brsr-trir', 'brsr-fatalities'],
  brsr_csr:         ['brsr-csr-spend'],
  brsr_compliance:  ['brsr-complaint-resolution'],
};

export const BRSR_KPI_ICONS = {
  // P6 Environment — same icon pattern as GRI equivalents
  'brsr-energy-consumed':      Zap,
  'brsr-renewable-pct':        Sun,
  'brsr-water-withdrawn':      Droplet,
  'brsr-water-consumed':       Droplets,
  'brsr-scope1-ghg':           Cloud,
  'brsr-scope2-ghg':           Wind,
  'brsr-waste-hazardous':      AlertOctagon,
  'brsr-waste-nonhazardous':   Trash2,
  // P3 Social
  'brsr-female-pct':           UserCheck,
  'brsr-differently-abled':    Users,
  'brsr-training-hours':       GraduationCap,
  'brsr-training-coverage':    BookOpen,
  'brsr-ltifr':                Shield,
  'brsr-trir':                 Activity,
  'brsr-fatalities':           HeartPulse,
  // P8 CSR
  'brsr-csr-spend':            Heart,
  // P1 Governance
  'brsr-complaint-resolution': Scale,
};

export const BRSR_HIGHER_IS_BETTER = {
  'brsr-energy-consumed':      false,
  'brsr-renewable-pct':        true,
  'brsr-water-withdrawn':      false,
  'brsr-water-consumed':       false,
  'brsr-scope1-ghg':           false,
  'brsr-scope2-ghg':           false,
  'brsr-waste-hazardous':      false,
  'brsr-waste-nonhazardous':   false,
  'brsr-female-pct':           null,
  'brsr-differently-abled':    null,
  'brsr-training-hours':       null,
  'brsr-training-coverage':    true,
  'brsr-ltifr':                false,
  'brsr-trir':                 false,
  'brsr-fatalities':           false,
  'brsr-csr-spend':            null,
  'brsr-complaint-resolution': true,
};

// BRSR uses amber (#f59e0b) as its framework color — distinct from GRI teal and SASB blue.
export const BRSR_ICON_COLORS = {
  'brsr-energy-consumed':      '#f59e0b',
  'brsr-renewable-pct':        '#f59e0b',
  'brsr-water-withdrawn':      '#0ea5e9',
  'brsr-water-consumed':       '#0ea5e9',
  'brsr-scope1-ghg':           '#6366f1',
  'brsr-scope2-ghg':           '#6366f1',
  'brsr-waste-hazardous':      '#dc2626',
  'brsr-waste-nonhazardous':   '#16a34a',
  'brsr-female-pct':           '#d97706',
  'brsr-differently-abled':    '#d97706',
  'brsr-training-hours':       '#d97706',
  'brsr-training-coverage':    '#d97706',
  'brsr-ltifr':                '#8b5cf6',
  'brsr-trir':                 '#8b5cf6',
  'brsr-fatalities':           '#8b5cf6',
  'brsr-csr-spend':            '#d97706',
  'brsr-complaint-resolution': '#d97706',
};

// BRSR P6 sub-tabs resolve to same GRI domains so chart/filter/insights
// endpoints are reused. P3 safety shares 'safety'. Workforce/training/
// governance/CSR have no live domain until new datasets are collected.
export const BRSR_SUBTAB_DOMAIN = {
  brsr_energy:     'energy',
  brsr_water:      'water',
  brsr_ghg_air:    'emissions',
  brsr_waste:      'waste',
  brsr_safety:     'safety',
};
