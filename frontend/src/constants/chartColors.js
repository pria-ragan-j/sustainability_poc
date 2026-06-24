// Central color registry for all dashboard charts.
// Every category within a given dashboard has a unique color —
// no two categories share the same hex within the same view.
// Import from here; never define ad-hoc colors inside chart components.

// ─── Water (GRI 303) ─────────────────────────────────────────────────────────
export const WATER = {
  withdrawn:    '#2f8fe0', // blue        — total withdrawn
  discharged:   '#16a34a', // green       — total discharged
  groundwater:  '#6366f1', // indigo      — source: groundwater
  thirdParty:   '#f59e0b', // amber-light — source: third-party water
  municipalRainwater: '#a78bfa', // light violet — source: municipal rainwater (genuinely separate from third-party)
  surfaceIn:    '#0891b2', // cyan        — source: surface water (withdrawal)
  industrial:   '#d97706', // amber       — destination: industrial treatment
  sewage:       '#7c3aed', // violet      — destination: municipal sewage
  surfaceOut:   '#0ea5e9', // sky         — destination: surface water (discharge)
  recycled:     '#0d9488', // teal        — water recycled/reused %
  seawater:     '#1d4ed8', // dark blue   — source: seawater
  producedWater:'#9333ea', // purple      — source: produced water
  freshwater:   '#16a34a', // green       — TDS quality: fresh (<1000 TDS)
  otherQuality: '#e0383d', // red         — TDS quality: other (>=1000 TDS)
};

// ─── Waste (GRI 306) ─────────────────────────────────────────────────────────
export const WASTE = {
  generated: '#e0383d', // red    — total generated
  diverted:  '#16a34a', // green  — diverted from disposal
  disposed:  '#d97706', // amber  — directed to disposal

  // Disposal-method breakdown (GRI 306-4/306-5) — ordered best → worst outcome
  disposalMethods: {
    Reuse: '#16a34a',
    Recycling: '#0d9488',
    'Other': '#6366f1',
    'Incineration (with recovery)': '#f59e0b',
    Incineration: '#d97706',
    Landfill: '#e0383d',
  },
};

// ─── Energy (GRI 302) ────────────────────────────────────────────────────────
export const ENERGY = {
  oil:          '#b45309', // brown      — oil (non-production)
  gas:          '#6366f1', // indigo     — natural gas
  electricity:  '#2f8fe0', // blue       — electricity consumed
  steam:        '#f43f5e', // rose       — steam (distinct from nonRenewable red)
  tailGas:      '#f59e0b', // amber-light— tail gas
  compressedAir:'#0891b2', // cyan       — compressed air (distinct from renewable green)
  hotWater:     '#f472b6', // pink       — hot water
  renewable:    '#16a34a', // green      — renewable electricity trend
  nonRenewable: '#e0383d', // red        — non-renewable electricity trend
  intensity:    '#7c3aed', // violet     — energy intensity (distinct from gas indigo)
  total:        '#475569', // slate      — neutral "total" for plant comparison
  sold:         '#0891b2', // cyan       — energy sold
  netEnergy:    '#2f8fe0', // blue       — net energy (consumed - sold)
  upstream:     '#9333ea', // purple     — upstream (purchased goods) energy
  downstream:   '#f472b6', // pink       — downstream (sold products) energy
  upstreamIntensity:   '#a78bfa', // light violet — upstream energy intensity
  downstreamIntensity: '#fb7185', // light rose   — downstream energy intensity
};

// ─── Emissions / GHG (GRI 305) ───────────────────────────────────────────────
export const EMISSIONS = {
  scope1:    '#e0383d', // red         — Scope 1 direct GHG
  scope2:    '#d97706', // amber       — Scope 2 location-based
  scope3:    '#6366f1', // indigo      — Scope 3 value chain
  nox:       '#2f8fe0', // blue        — NOx air emissions
  sox:       '#0891b2', // cyan        — SOx (distinct from scope1 red)
  voc:       '#16a34a', // green       — VOC
  pm:        '#7c3aed', // violet      — PM (distinct from scope2 amber)
  intensity: '#f59e0b', // amber-light — emissions intensity (distinct from scope2/scope3)
  scope2Market: '#b45309', // brown    — Scope 2 market-based (vs location-based amber)
  intensity2:   '#fb7185', // light rose — Scope 2 intensity
  intensity3:   '#a78bfa', // light violet — Scope 3 intensity

  // Scope 1 fuel/process source breakdown — distinct palette
  scope1Source: ['#e0383d', '#7c2d12'], // [process, stationary combustion]
  scope1Fuel: ['#d97706', '#f59e0b', '#b45309', '#92400e'], // [tail gas, natural gas, fuel oil, other]

  // Scope 3 category breakdown (10 categories) — distinct palette
  scope3Category: ['#6366f1', '#0891b2', '#16a34a', '#f59e0b', '#7c3aed', '#ec4899', '#0ea5e9', '#84cc16', '#f43f5e', '#a78bfa'],
};

// ─── Safety (GRI 403) ────────────────────────────────────────────────────────
export const SAFETY = {
  ltifr: '#6366f1', // indigo — LTIFR rate line / bars
  trir:  '#2f8fe0', // blue   — TRIR rate line

  // Severity: ordered most-severe → least-severe (darkest → lightest)
  // Backend returns [Fatal, High Consequence, Recordable, First Aid]
  severity: ['#7c2d12', '#e0383d', '#d97706', '#16a34a'],

  // Injury type bars — palette fully distinct from ltifr/trir and severity colors
  injury: ['#0891b2', '#7c3aed', '#f59e0b', '#f472b6', '#b45309'],

  // Ill-health type bars — separate palette from injury types
  illHealth: ['#16a34a', '#0d9488', '#9333ea', '#f43f5e', '#84cc16'],

  // Safety pyramid (GRI 403-9/403-10), base → tip
  pyramid: { near_miss: '#16a34a', first_aid: '#84cc16', recordable: '#f59e0b', lost_time: '#d97706', fatal: '#7c2d12' },

  // Leading indicators (proactive safety metrics)
  leading: { observations: '#0891b2', toolbox_talks: '#6366f1', inspections: '#7c3aed', training_hours: '#2f8fe0' },

  // OHS / audit coverage doughnut
  coverage: ['#16a34a', '#0891b2', '#7c3aed'],
};

// ─── SASB RT-CH-150a — Hazardous Waste Management ───────────────────────────
export const SASB_HAZ = {
  hazardous:    '#dc2626', // red   — hazardous-classified waste
  nonHazardous: '#16a34a', // green — non-hazardous-classified waste
  disposalMethods: WASTE.disposalMethods,
};

// ─── SASB RT-CH-540a — Process Safety Management ────────────────────────────
export const SASB_PROCESS_SAFETY = {
  tier1: '#dc2626', // red    — Tier 1 (significant LOPC)
  tier2: '#f59e0b', // amber  — Tier 2 (lesser LOPC)
  pstir: '#2f8fe0', // blue   — Process Safety Total Incident Rate
  psisr: '#7c3aed', // violet — Process Safety Incident Severity Rate
};

// ─── Social Development (GRI 401 / 404, BRSR workforce+training reuse) ──────
export const DEVELOPMENT = {
  newHire:  '#16a34a', // green  — new hire rate
  turnover: '#e0383d', // red    — turnover rate
  maternity:'#ec4899', // pink   — maternity leave return rate
  paternity:'#3b82f6', // blue   — paternity leave return rate
  trainingHrs: '#f59e0b', // amber — avg training hours
  coverage: '#0d9488', // teal   — training coverage %
};
