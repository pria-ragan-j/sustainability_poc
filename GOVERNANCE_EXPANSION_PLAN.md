# ESG Dashboard — Governance Expansion & Framework Completion Plan

**Document type:** Implementation Roadmap  
**Date:** 2026-06-24  
**Scope:** Expand all three frameworks (GRI, SASB, BRSR) to 4 Environment + 3 Social + 3 Governance sections each  
**Status:** Pre-implementation (analysis only — no code has been changed)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis](#2-gap-analysis)
3. [Recommended Target Structure](#3-recommended-target-structure)
4. [Open Decisions & Clarifying Questions](#4-open-decisions--clarifying-questions)
5. [Detailed Implementation Plan — Phase by Phase](#5-detailed-implementation-plan)
6. [Technical Specifications](#6-technical-specifications)
7. [Data Requirements](#7-data-requirements)
8. [Reuse vs. New Component Matrix](#8-reuse-vs-new-component-matrix)
9. [AI, Alerts & Reports Integration](#9-ai-alerts--reports-integration)
10. [Risks, Assumptions & Dependencies](#10-risks-assumptions--dependencies)
11. [Cross-Framework Consistency Guidelines](#11-cross-framework-consistency-guidelines)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Current State Analysis

### 1.1 Architecture Overview

```
esg-dashboard/
├── backend/
│   ├── main.py               # FastAPI app — all endpoints, data loading, AI, outlier detection
│   ├── storage.py            # SQLite — chats, reports, alert thresholds, ack records
│   ├── pdf_report.py         # GRI PDF report generator (ReportLab)
│   ├── sasb_report.py        # SASB RT-CH report generator
│   ├── brsr_report.py        # BRSR report generator (reuses pdf_report.py layout helpers)
│   ├── gri_requirements.json # GRI disclosure status reference (GRI 302/303/305/306/403)
│   ├── sasb_requirements.json# SASB RT-CH disclosure status reference
│   ├── generate_brsr_datasets.py      # Synthetic BRSR Excel dataset generator
│   ├── generate_process_safety_dataset.py # Synthetic SASB process safety generator
│   └── data/
│       ├── brsr_config.json           # BRSR qualitative policy config (P1-P9 principles)
│       └── [Excel datasets — loaded via _load_sheet() → in-memory _CACHE]
└── frontend/src/
    ├── context/AppContext.jsx         # Global state: framework, filters, thread, page
    ├── constants/
    │   ├── domainMap.js               # NAV_TREE, DOMAIN_STANDARD_CODE, DOMAIN_FRAMEWORK_MAP, SUBTAB_META
    │   └── kpiGroups.js               # KPI group definitions, icons, colors for GRI/SASB/BRSR
    ├── components/
    │   ├── layout/Sidebar.jsx         # Framework-aware sidebar navigation
    │   ├── summary/SummaryPage.jsx    # Framework-aware summary with 3-pillar card grid
    │   ├── environment/               # GRI/SASB/BRSR environment chart components (shared)
    │   ├── social/                    # GRI social chart components
    │   ├── sasb/                      # SASB-specific chart components
    │   ├── brsr/                      # BRSR-specific chart components
    │   └── shared/                    # PlaceholderState, ChartState, InsightsPanel, OutlierPanel
    └── pages/DomainsPage.jsx          # Route /dashboards/:pillar/:domain — mounts chart component
```

### 1.2 Data Layer

The backend loads all Excel datasets once at startup into an in-memory cache (`_CACHE`). There are currently **8 Excel datasets**:

| Dataset File | Loader | Framework(s) | Granularity |
|---|---|---|---|
| GRI_Water_Dataset | `load_water_data()` | GRI + SASB (RT-CH-140a) + BRSR (P6) | Monthly × Plant |
| GRI_Waste_Dataset | `load_waste_data()` | GRI + SASB (RT-CH-150a) + BRSR (P6) | Monthly × Plant × Category |
| GRI_Energy_Dataset | `load_energy_data()` | GRI + SASB (RT-CH-130a) + BRSR (P6) | Monthly × Plant |
| GRI_GHG_Dataset | `load_ghg_data()` | GRI + SASB (RT-CH-110a/120a) + BRSR (P6) | Monthly × Plant |
| GRI_Safety_Dataset | `load_safety_data()` | GRI + SASB (RT-CH-320a) + BRSR (P3) | Monthly × Plant × WorkerType |
| BRSR_Workforce_Dataset | `load_workforce_data()` | BRSR (P3) | Annual × Plant (`FY` column) |
| BRSR_Training_Dataset | `load_training_data()` | BRSR (P3) | Annual × Plant |
| BRSR_CSR_Dataset | `load_csr_data()` | BRSR (P8) | Annual (FY-level) × Category |
| GRI_RTCH540a_ProcessSafety | (in main.py) | SASB (RT-CH-540a) | Monthly × Plant |

**Key insight:** The first 5 GRI datasets are shared across all three frameworks. BRSR P6 uses GRI environmental data filtered by Indian Financial Year (Apr–Mar) windows. SASB reframes the same GRI data with different metric calculations.

### 1.3 Frontend Architecture — How a Domain Page Works

```
Route: /dashboards/:pillar/:domain
  └── DomainsPage.jsx
        ├── Reads pillar + domain from URL params
        ├── Looks up subTab from DOMAIN_FRAMEWORK_MAP[pillar][domain][framework]
        ├── Gets chart Component from SUBTAB_META[subTab].Component
        ├── Gets KPI ids from BRSR_KPI_GROUPS / SASB_KPI_GROUPS / ENV_KPI_GROUPS
        ├── Renders FilterBar (BRSR uses FY selector; GRI/SASB use calendar year + Monthly/Yearly toggle)
        ├── Renders KpiCard grid (fetches /api/environment/kpis, /api/social/kpis, /api/sasb/kpis, or /api/brsr/kpis)
        ├── Renders chart Component (fetches domain-specific chart endpoint)
        ├── Renders OutlierPanel (fetches /api/outliers/:domain for live-data domains)
        └── Renders InsightsPanel + AiAssistantPanel (floating, context-aware)
```

When `DOMAIN_FRAMEWORK_MAP[pillar][domain][framework]` is `null`, the page renders a `PlaceholderState` indicating no data for this framework/domain combination.

### 1.4 Current Coverage Map

#### What's Implemented, Partial, or Placeholder

| Pillar | Domain | GRI | SASB | BRSR |
|---|---|---|---|---|
| **Environment** | Water | ✅ Live (GRI-303) | ✅ Live (RT-CH-140a) | ✅ Live (P6) |
| **Environment** | Waste | ✅ Live (GRI-306) | ✅ Live (RT-CH-150a) | ✅ Live (P6) |
| **Environment** | Energy | ✅ Live (GRI-302) | ✅ Live (RT-CH-130a) | ✅ Live (P6) |
| **Environment** | GHG & Air Quality | ✅ Live (GRI-305) | ✅ Live (RT-CH-110a/120a) | ✅ Live (P6) |
| **Social** | Workforce | ✅ Live (GRI-401) | ❌ No mapping in NAV_TREE | ✅ Live (P3, BRSR dataset) |
| **Social** | Safety | ✅ Live (GRI-403) | ✅ Live (RT-CH-320a) | ✅ Live (P3) |
| **Social** | Development / Training | ✅ Live (GRI-404) | ❌ No mapping in NAV_TREE | ✅ Live (P3, BRSR dataset) |
| **Social** | Process Safety | ❌ Not in NAV_TREE | ⚠️ Built but hidden¹ | ❌ Not applicable |
| **Social** | Community Relations | ❌ Not a GRI 400-series | ❌ Not in NAV_TREE | ❌ Not in BRSR dashboard |
| **Governance** | CSR / Economic Impact | ❌ Not mapped | ❌ Not mapped | ✅ Live (P8, BRSR dataset) |
| **Governance** | Ethics & Compliance | ❌ Not mapped | ❌ Not mapped | ✅ Config-driven (P1, all 9 Principles) |
| **Governance** | *(3rd section)* | ❌ Not mapped | ❌ Not mapped | ❌ Not mapped |

**¹ Important finding:** `sasb_process_safety` is fully defined in `kpiGroups.js` (`SASB_KPI_GROUPS`, `SASB_SUB_TABS`) and `SUBTAB_META` in `domainMap.js`, and has a working chart component (`ProcessSafetyCharts.jsx`) with a real synthetic dataset (`GRI_RTCH540a_ProcessSafety`) — but it is **not registered in `NAV_TREE.social.domains`** and has `null` in `DOMAIN_FRAMEWORK_MAP.social.safety`. It is completely invisible to users despite being built. This is the highest-value quick win in the entire plan.

### 1.5 Report Templates — Current Coverage

| Framework | Reports Available |
|---|---|
| GRI | GRI 302 Energy, GRI 303 Water, GRI 305 Emissions, GRI 306 Waste, GRI 403 Safety |
| SASB | RT-CH-110/120 GHG & Air, RT-CH-130 Energy, RT-CH-140 Water, RT-CH-150 Hazardous Waste, RT-CH-320 Workforce Safety, RT-CH-540 Process Safety (marked `hasData: false`) |
| BRSR | Single comprehensive BRSR report (Section A + all 9 Principles, PDF + Excel) |

**No governance-domain report templates exist for GRI or SASB.** BRSR's report already covers all 9 Principles.

### 1.6 Alert/Anomaly Detection — Current Coverage

The outlier detection engine (`_OUTLIER_CONFIG`) covers **5 GRI domains** only: water, waste, energy, emissions, safety.

```python
_OUTLIER_CONFIG = {
    "water":     [Total Water Withdrawn, Water Consumed],
    "waste":     [Waste Generated],
    "safety":    [Recordable Injuries, Lost Time Injuries],
    "energy":    [Energy Consumed, Energy Intensity],
    "emissions": [Scope 1 GHG, NOx Emissions],
}
```

No outlier detection for BRSR-specific datasets (workforce, training, CSR) or any governance metrics.

### 1.7 AI System Prompt — Current Coverage

`build_system_prompt()` injects data summaries for:
- GRI environmental domains (water, waste, energy, emissions) — from the 4 GRI datasets
- GRI Safety (GRI-403) — from safety dataset
- SASB RT-CH summary (hazardous waste, TRIR by worker type, fatality rate) — computed from GRI datasets
- BRSR summary (P3 workforce/training/safety, P8 CSR, P1 complaint resolution) — from BRSR datasets

**Not yet in AI context:** Any governance data for GRI or SASB; process safety data.

---

## 2. Gap Analysis

### 2.1 SASB Social: 1 → 3 sections

**Current:** 1 section (Workforce Safety, RT-CH-320a)  
**Target:** 3 sections  

| # | Section | Standard | Status |
|---|---|---|---|
| 1 | Workforce Safety | RT-CH-320a | ✅ Exists |
| 2 | **Process Safety** | RT-CH-540a | ⚠️ **Built but hidden** — all code exists, just missing from `NAV_TREE` and `DOMAIN_FRAMEWORK_MAP` |
| 3 | **Community Relations** | RT-CH-210a | ❌ **New** — qualitative only (no quantitative dataset possible from SASB standard; purely narrative disclosure) |

**Gap 2 effort:** ~1 hour — add `process_safety` entry to `NAV_TREE.social.domains` and `DOMAIN_FRAMEWORK_MAP.social`.  
**Gap 3 effort:** Medium — new qualitative card component similar to `BrsrComplianceCards.jsx`, backed by a `sasb_config.json` file.

### 2.2 GRI Governance: 0 → 3 sections

**Current:** No governance sections  
**Target:** 3 sections  

GRI standards that map naturally to Governance for a chemicals company:

| # | Proposed Section | GRI Standard | Data Availability | Effort |
|---|---|---|---|---|
| 1 | **Anti-Corruption & Ethics** | GRI 205 | Config-driven (qualitative) — policies, awareness programs, complaints received/resolved | Low (extends `gri_governance_config.json`) |
| 2 | **Economic Performance** | GRI 201 | Requires new financial dataset: EVG&D, CapEx, taxes paid, wages | High (new dataset + new endpoint + new component) |
| 3 | **Tax** | GRI 207 | Config-driven (qualitative) + minimal financial figures | Medium (config + 1-2 KPI tiles) |

**Alternative simpler option for GRI Governance:**
| # | Section | Approach |
|---|---|---|
| 1 | Anti-Corruption (GRI 205) | Qualitative config cards |
| 2 | Anti-Competitive Behavior (GRI 206) | Qualitative config cards |
| 3 | Political Contributions (GRI 415) | Qualitative config cards |

This option requires no new datasets but all three sections are purely qualitative. It is implementable quickly but adds limited analytical value versus the Economic Performance option which introduces actual financial KPIs.

### 2.3 SASB Governance: 0 → 3 sections

SASB RT-CH has two governance-adjacent topic areas:

| # | Proposed Section | SASB Standard | Data Availability | Effort |
|---|---|---|---|---|
| 1 | **Product Safety & Chemical Stewardship** | RT-CH-410 (410a + 410b) | Qualitative + new chemical inventory data (if available) | Medium-High |
| 2 | **Legal & Regulatory Environment** | RT-CH-530a | Qualitative config-driven | Low |
| 3 | **Business Ethics & Conduct** | (SASB General Issue — not a RT-CH specific code, but common governance topic in SASB reports) | Qualitative config-driven | Low |

**Note:** SASB does not have a formal "Governance" category like GRI or BRSR. RT-CH's governance-proximate topics (product stewardship RT-CH-410, legal environment RT-CH-530a) are typically classified under SASB's **Social Capital** and **Business Model & Innovation** categories respectively. The decision to label them "Governance" in the dashboard navigation is a structural choice for consistency across frameworks — see Open Decision #1.

### 2.4 BRSR Governance: 2 → 3 sections

**Current:** CSR (P8) and Ethics & Compliance (P1 — actually shows all 9 Principles as policy adoption cards)  
**Target:** 3 sections  

**Key observation:** The existing "Ethics & Compliance" section (`BrsrComplianceCards.jsx`) already renders all 9 NGRBC Principles (P1–P9) as policy adoption status cards from `brsr_config.json`. This means governance data for P4 (Stakeholder), P5 (Human Rights), P7 (Policy Advocacy), P9 (Consumer Responsibility) is already displayed — it's just bundled into a catch-all card with no dedicated section.

Options for 3rd Governance section:
| Option | Section | Approach | Notes |
|---|---|---|---|
| A | **Stakeholder & Human Rights (P4 + P5)** | Qualitative cards from `brsr_config.json` p4/p5 keys | Low effort — data already in config; just expose dedicated view |
| B | **Consumer Responsibility (P9)** | Config-driven + new consumer complaint dataset | Medium effort — needs data collection |
| C | **Policy Advocacy (P7)** | Config-driven qualitative | Very low effort but limited value |
| D | **Supply Chain & Sustainable Products (P2)** | Config-driven + new supplier dataset | High effort |

**Recommendation:** Option A — Stakeholder & Human Rights (P4 + P5). This can be rendered from existing `brsr_config.json` data. The existing "Ethics & Compliance" section should be renamed to focus on **P1 — Business Ethics** only (the way the section name implies), and the new P4/P5 section covers the remaining social governance principles.

### 2.5 Summary of All Gaps

| Framework | Pillar | Gap | Effort |
|---|---|---|---|
| **SASB** | Social | Add Process Safety to NAV_TREE (already built) | **XS** |
| **SASB** | Social | Add Community Relations (RT-CH-210a) | M |
| **GRI** | Governance | Anti-Corruption & Ethics (GRI 205) | M |
| **GRI** | Governance | Economic Performance (GRI 201) | **XL** |
| **GRI** | Governance | Tax (GRI 207) | M |
| **SASB** | Governance | Product Safety (RT-CH-410) | L |
| **SASB** | Governance | Legal & Regulatory (RT-CH-530a) | S |
| **SASB** | Governance | Business Ethics | S |
| **BRSR** | Governance | Stakeholder & Human Rights (P4+P5) | S |
| **All** | — | Report templates for new sections | M per section |
| **All** | — | AI system prompt updates | M |
| **All** | — | Alert/Outlier detection for governance metrics | M-L |

Effort scale: XS=hours, S=1-2 days, M=3-5 days, L=1 week, XL=2+ weeks

---

## 3. Recommended Target Structure

### 3.1 Proposed 3×3×3 Framework Table

| Pillar | Section | GRI | SASB RT-CH | BRSR (NGRBC) |
|---|---|---|---|---|
| **Environment** | Water | GRI-303 | RT-CH-140a | P6 |
| **Environment** | Waste | GRI-306 | RT-CH-150a | P6 |
| **Environment** | Energy | GRI-302 | RT-CH-130a | P6 |
| **Environment** | GHG & Air Quality | GRI-305 | RT-CH-110a/120a | P6 |
| **Social** | Workforce | GRI-401 | *(not applicable — see §3.2)* | P3 |
| **Social** | Safety | GRI-403 | RT-CH-320a | P3 |
| **Social** | Development / Training | GRI-404 | *(not applicable)* | P3 |
| **Social** | Process Safety | *(not a GRI topic)* | RT-CH-540a | *(not applicable)* |
| **Social** | Community Relations | *(GRI 413 placeholder)* | RT-CH-210a | *(not applicable)* |
| **Governance** | Ethics & Anti-Corruption | GRI-205 | Business Ethics (qualitative) | P1 — Ethics & Compliance |
| **Governance** | Economic Impact / CSR | GRI-201 | *(financial impact qualitative)* | P8 — CSR |
| **Governance** | Stakeholder, Product & Legal | GRI-207 or GRI-206 | RT-CH-410 + RT-CH-530a | P4+P5 — Stakeholder & Human Rights |

### 3.2 Important Structural Observation: SASB Social is Asymmetric

SASB RT-CH does not have Social disclosures for Workforce (GRI-401 equivalent) or Development (GRI-404 equivalent). The SASB standard for this industry group covers:
- RT-CH-320a: Workforce Health & Safety (maps to "Safety")
- RT-CH-540a: Process Safety (no GRI/BRSR analog)
- RT-CH-210a: Community Relations (no direct GRI/BRSR analog)

This means SASB Social cannot use the same 3-domain structure as GRI and BRSR. The navigation must remain framework-aware — SASB Social has 3 sections but they are **different** domains from GRI Social's 3 sections.

This is already architecturally supported by `DOMAIN_FRAMEWORK_MAP` (which maps `null` for SASB Workforce and Development, and would need new entries for Process Safety and Community Relations).

**Recommendation:** Add Process Safety and Community Relations as new domains in `NAV_TREE.social` with `DOMAIN_FRAMEWORK_MAP` entries that are `null` for GRI and BRSR, and live values for SASB only. The sidebar's existing filter (`visibleDomains`) will automatically hide them for GRI and BRSR.

### 3.3 Recommended Final NAV_TREE Structure

```
Environment (4 sections — identical across all frameworks):
  ├── water
  ├── waste  
  ├── energy
  └── ghg

Social (3 sections per framework, different domains for SASB):
  GRI  → workforce, safety, development       (current, unchanged)
  SASB → process_safety, safety, community    (process_safety revealed, community new)
  BRSR → workforce, safety, development       (current, unchanged — maps to brsr_* sub-tabs)

Governance (3 sections per framework, framework-specific):
  GRI  → ethics_anticorruption, economic_performance, tax_policy
  SASB → chemical_safety, legal_regulatory, business_ethics
  BRSR → csr (existing), ethics_compliance (existing, P1 focused), stakeholder_human_rights (new P4+P5)
```

---

## 4. Open Decisions & Clarifying Questions

Before finalizing implementation, the following questions should be resolved. Recommendations are provided for each.

### Decision 1 — Should Governance be thematically aligned or framework-specific?

**Option A (Aligned themes):** Force each framework's 3 governance sections to cover the same three concepts: *Ethics*, *Economic/CSR*, *Product & Stakeholder*. This is cleaner for cross-framework comparison on the Summary page.

**Option B (Framework-native):** Each framework's governance sections follow that standard's own governance topic structure — GRI 205/201/207, SASB 410/530a/business-ethics, BRSR P1/P8/P4+P5. This is more standards-accurate but makes governance sections incomparable across frameworks.

**Recommendation:** Option B (framework-native). The three frameworks serve different reporting audiences (global investors for GRI, SASB; SEBI/Indian regulators for BRSR). Forcing theme alignment would require misrepresenting the standards. The Summary page can show all three governance sections per active framework, which is already how Environment and Social work.

---

### Decision 2 — Should GRI Economic Performance (GRI 201) be built as a quantitative section, or qualitative-only?

GRI 201 requires:
- Direct economic value generated and distributed (EVG&D) — revenue, operating costs, wages, taxes, community investment, retained earnings
- Financial implications of climate change (GRI 201-2)
- Pension plan obligations (GRI 201-3)
- Government financial assistance (GRI 201-4)

This is **financial data**, not operational ESG data. It would require a new dataset type (annual financial summary per entity) that is fundamentally different from the existing plant-level operational datasets.

**Option A:** Implement GRI 201 as a quantitative section with a new `GRI_Economic_Dataset_FY2020_FY2025.xlsx` containing EVG&D figures.  
**Option B:** Implement all three GRI Governance sections as qualitative-only (policy cards and narrative disclosures), similar to the BRSR BrsrComplianceCards pattern.  
**Option C:** Implement GRI 205 (Anti-Corruption) and GRI 207 (Tax) as qualitative, and GRI 201 (Economic Performance) as quantitative in a later phase.

**Recommendation:** Option B initially (qualitative config-driven for all three), with Option C as Phase 2 when financial data is available. This gets governance sections live quickly without waiting for financial data collection.

---

### Decision 3 — Should SASB Governance sections be labeled "Governance" in the UI?

SASB's own taxonomy does not use the word "Governance" for RT-CH-410 (Chemical Safety) or RT-CH-530a (Legal & Regulatory). These fall under SASB's **"Business Model & Innovation"** and **"Social Capital"** dimensions respectively.

**Option A:** Label the pillar "Governance" for consistency with GRI and BRSR.  
**Option B:** Label the SASB pillar something more accurate, e.g., "Governance & Conduct" or "Product & Legal".

**Recommendation:** Keep "Governance" as the pillar label for all frameworks for navigation consistency. Add the actual SASB topic code (e.g., RT-CH-410) as the section badge, just as environment/social sections show their standard codes.

---

### Decision 4 — Should the BRSR "Ethics & Compliance" section be refocused to P1 only?

Currently `BrsrComplianceCards.jsx` renders **all 9 NGRBC Principles** as policy cards under the "Ethics & Compliance (P1)" section header. If a new "Stakeholder & Human Rights (P4+P5)" section is added, P4 and P5 would appear twice — once in the all-principles card and once in the dedicated section.

**Option A:** Refocus existing section to P1 only (remove P2-P9 cards from it), and spread P2-P9 across the new dedicated sections.  
**Option B:** Keep the all-principles card as-is and add the dedicated P4+P5 section, accepting the overlap.  
**Option C:** Rename the existing section "Policy Overview (All Principles)" and keep it as a governance summary dashboard, add targeted sections alongside it.

**Recommendation:** Option A. Refocus the existing section to P1 only. Add the dedicated P4+P5 section. This gives users specific navigation and avoids redundancy. P2, P7, P9 (Sustainable Products, Policy Advocacy, Consumer Responsibility) can be shown as supplementary cards within whichever governance section is most relevant, or deferred to Phase 2.

---

### Decision 5 — Alert/Anomaly Detection for Governance Metrics

The current outlier engine is quantitative and statistical (YoY % change detection). Most governance metrics are:
- Qualitative (policy adoption status) — not amenable to statistical outlier detection
- Financial (CSR spend) — could support YoY change detection
- Complaints-based (P1 complaint count) — small absolute numbers, YoY % change may be noisy

**Option A:** Extend `_OUTLIER_CONFIG` only for quantitative governance metrics (CSR spend YoY, complaint count YoY, economic value YoY if collected).  
**Option B:** Add a separate "Governance Flags" section to the Alerts page — rule-based (e.g., policy status changed from Adopted to In-Progress, CSR underspend > 10% of obligation).  
**Option C:** Leave the Alerts page covering only operational (environmental + safety) domains for now.

**Recommendation:** Option A for CSR spend (straightforward extension). Option C for all others until quantitative governance data exists.

---

## 5. Detailed Implementation Plan

### Phase 0 — Quick Win: Reveal Hidden SASB Process Safety (est. 1–2 hours)

**What:** `sasb_process_safety` is fully implemented (dataset, backend endpoint `/api/sasb/process-safety`, chart component `ProcessSafetyCharts.jsx`, KPI group `SASB_KPI_GROUPS.sasb_process_safety`, report template) but is completely invisible because it's missing from `NAV_TREE` and `DOMAIN_FRAMEWORK_MAP`.

**Files to change:**

1. `frontend/src/constants/domainMap.js`
   - Add to `NAV_TREE.social.domains`:
     ```js
     { id: 'process_safety', label: 'Process Safety', icon: Siren }
     ```
   - Add to `DOMAIN_FRAMEWORK_MAP.social`:
     ```js
     process_safety: { GRI: null, SASB: 'sasb_process_safety', BRSR: null }
     ```
   - Note: `DOMAIN_STANDARD_CODE.social` already omits `process_safety` (no GRI/BRSR code), which is correct.
   - `SUBTAB_META.sasb_process_safety` already exists.

2. No backend changes needed.  
3. No new components needed.  
4. Summary page: `PILLARS.social.domains` doesn't include `process_safety` — add it with `kpiId: { GRI: null, SASB: 'sasb-process-safety-incidents', BRSR: null }`.

**Validation:** Navigate to SASB → Social → Process Safety and confirm the Tier 1/2 incident charts render.

---

### Phase 1 — BRSR Governance: 3rd Section (est. 3–4 days)

**What:** Add "Stakeholder & Human Rights (P4 + P5)" as BRSR's 3rd governance section.  
**Approach:** Config-driven, extends existing `brsr_config.json` which already has P4 and P5 keys. Refocus existing "Ethics & Compliance" to P1 only.

**Files to change:**

1. `frontend/src/constants/domainMap.js`
   - Add to `NAV_TREE.governance.domains`:
     ```js
     { id: 'stakeholder', label: 'Stakeholder & Human Rights', icon: HandshakeIcon }
     ```
   - Add to `DOMAIN_FRAMEWORK_MAP.governance`:
     ```js
     stakeholder: { GRI: null, SASB: null, BRSR: 'brsr_stakeholder' }
     ```

2. `frontend/src/constants/kpiGroups.js`
   - Add to `BRSR_KPI_GROUPS`:
     ```js
     brsr_stakeholder: ['brsr-p4-status', 'brsr-p5-status']
     ```
   - Add to `BRSR_SUB_TABS.brsr_governance`:
     ```js
     'brsr_stakeholder'
     ```
   - Add KPI icon + color entries for `brsr-p4-status`, `brsr-p5-status`.

3. `frontend/src/components/brsr/BrsrStakeholderCards.jsx` — **New file**
   - Similar pattern to `BrsrComplianceCards.jsx`.
   - Fetches `/api/brsr/config`.
   - Renders P4 (Stakeholder Responsiveness) and P5 (Human Rights) cards with policy status, committee, any configured narrative.
   - Shows a `PlaceholderState` variant if P4/P5 are not in the config.

4. `frontend/src/components/brsr/BrsrComplianceCards.jsx` — **Modify**
   - Filter to render only `p1` key from `config.principles`, not all 9.
   - Rename the empty-state description to be P1-specific.

5. `frontend/src/components/summary/SummaryPage.jsx`
   - Add `stakeholder` to `GOVERNANCE_DOMAINS` with `kpiId: 'brsr-p4-status'` (or a summary indicator).

6. `backend/main.py`
   - No new endpoint needed — `/api/brsr/config` already returns all 9 principles.
   - Optionally add a `GET /api/brsr/governance` endpoint that returns a governance-summary object derived from `brsr_config.json` (P1, P4, P5 status + KPI tiles).

7. `domainMap.js` — `SUBTAB_META`
   - Add:
     ```js
     brsr_stakeholder: { label: 'Stakeholder & Human Rights (P4+P5)', icon: HandshakeIcon, Component: BrsrStakeholderCards, mainTab: 'brsr_governance' }
     ```

**Validation:**
- BRSR sidebar shows 3 governance sections: CSR (P8), Ethics & Compliance (P1), Stakeholder & Human Rights (P4+P5).
- Ethics & Compliance now shows only P1 policy cards.
- Stakeholder & Human Rights shows P4 and P5 policy cards from `brsr_config.json`.
- Summary page BRSR Governance card grid shows 3 cards.

---

### Phase 2 — SASB Social: Community Relations (est. 3–5 days)

**What:** Add RT-CH-210a Community Relations as SASB's 3rd Social section.  
**Approach:** Qualitative-only, config-driven via a new `sasb_config.json`. Similar pattern to `BrsrComplianceCards.jsx`.

**Files to change:**

1. `backend/data/sasb_config.json` — **New file**
   ```json
   {
     "community_relations": {
       "rt_ch_210a": {
         "topic": "Community Relations",
         "disclosure": "RT-CH-210a.1",
         "engagement_process_adopted": "in-progress",
         "stakeholder_mapping_completed": false,
         "community_grievance_mechanism": "not-adopted",
         "notes": "Community engagement framework under development."
       }
     }
   }
   ```

2. `backend/main.py`
   - Add `GET /api/sasb/config` endpoint:
     ```python
     @app.get("/api/sasb/config")
     def get_sasb_config():
         # Load sasb_config.json from data/
         ...
     ```

3. `frontend/src/constants/domainMap.js`
   - Add to `NAV_TREE.social.domains`:
     ```js
     { id: 'community', label: 'Community Relations', icon: HeartHandshake }
     ```
   - Add to `DOMAIN_FRAMEWORK_MAP.social`:
     ```js
     community: { GRI: null, SASB: 'sasb_community', BRSR: null }
     ```
   - Add to `SUBTAB_META`:
     ```js
     sasb_community: { label: 'Community Relations', icon: HeartHandshake, Component: SasbCommunityCards, mainTab: 'sasb_social' }
     ```

4. `frontend/src/constants/kpiGroups.js`
   - Add `sasb_community: ['sasb-community-engagement-status']` to `SASB_KPI_GROUPS`.
   - Add to `SASB_SUB_TABS.sasb_social`.
   - Note: no quantitative KPI is available for RT-CH-210a — use a single qualitative status tile.

5. `frontend/src/components/sasb/SasbCommunityCards.jsx` — **New file**
   - Fetches `/api/sasb/config`.
   - Renders community engagement status card, grievance mechanism status, and any configured narrative text.
   - Shows the RT-CH-210a disclosure requirement as an info card.

6. `frontend/src/components/summary/SummaryPage.jsx`
   - Add `community` to the SASB Social domain list (PILLARS.social.domains) with `kpiId: { GRI: null, SASB: 'sasb-community-engagement-status', BRSR: null }`.

**Validation:**
- SASB sidebar Social now shows: Safety (RT-CH-320a), Process Safety (RT-CH-540a), Community Relations (RT-CH-210a).
- Summary SASB Social shows 3 cards.

---

### Phase 3 — GRI Governance: 3 New Sections (est. 2–3 weeks)

**What:** Add Anti-Corruption (GRI 205), Economic Performance (GRI 201, qualitative Phase 1), and Tax Policy (GRI 207) as GRI Governance sections.

#### 3a. Shared Infrastructure

1. `backend/data/gri_governance_config.json` — **New file**
   ```json
   {
     "gri_205": {
       "anti_bribery_policy_adopted": true,
       "conflict_of_interest_policy": "adopted",
       "whistleblower_mechanism": "adopted",
       "anti_corruption_training_coverage_pct": 85,
       "corruption_incidents_confirmed": 0,
       "complaints_received": 3,
       "complaints_resolved": 3,
       "legal_actions_pending": 0,
       "notes": ""
     },
     "gri_207": {
       "tax_strategy_disclosed": true,
       "tax_governance_body": "Audit Committee",
       "tax_policy_url": "",
       "country_by_country_reporting": false,
       "notes": ""
     },
     "gri_201": {
       "note": "Financial data requires structured dataset — see Phase 3b."
     }
   }
   ```

2. `backend/main.py` — Add `GET /api/gri/governance` endpoint returning config + any computable KPIs.

#### 3b. Three Domain Entries

**`frontend/src/constants/domainMap.js`** additions:

```js
// NAV_TREE.governance.domains additions:
{ id: 'ethics_anticorruption', label: 'Ethics & Anti-Corruption', icon: ShieldCheck },
{ id: 'economic_performance',  label: 'Economic Performance',     icon: TrendingUp  },
{ id: 'tax_policy',            label: 'Tax & Policy Advocacy',    icon: Receipt     },

// DOMAIN_FRAMEWORK_MAP.governance additions:
ethics_anticorruption: { GRI: 'gri_anticorruption', SASB: 'sasb_business_ethics', BRSR: 'brsr_compliance' },
economic_performance:  { GRI: 'gri_economic',       SASB: null,                   BRSR: 'brsr_csr'        },
tax_policy:            { GRI: 'gri_tax',            SASB: 'sasb_legal_regulatory', BRSR: null              },
```

> **Note on mapping design:** This table maps cross-framework equivalents to the same domain route (e.g., `/dashboards/governance/ethics_anticorruption` renders GRI 205, SASB Business Ethics, or BRSR P1 depending on the active framework). See Section 6.1 for the routing implications.

#### 3c. New Frontend Components

| Component | Maps to | Content Pattern |
|---|---|---|
| `GriAntiCorruptionCards.jsx` | GRI 205 | Policy status cards (adopted/in-progress/not-adopted) + KPI tiles (complaints, incidents) from `gri_governance_config.json` |
| `GriEconomicCards.jsx` | GRI 201 | Phase 1: qualitative placeholder with EVG&D table structure. Phase 2: populated from financial dataset |
| `GriTaxCards.jsx` | GRI 207 | Policy status cards + country-by-country reporting status from `gri_governance_config.json` |

All three follow the same rendering pattern as `BrsrComplianceCards.jsx`.

#### 3d. Backend KPI Endpoint Extension

`/api/gri/governance/kpis` (new) or extend existing governance response to return:
```json
[
  { "id": "gri-corruption-complaints", "label": "Anti-Corruption Complaints", "value": 3, "unit": "count", "trend": null, "status": "live" },
  { "id": "gri-corruption-incidents",  "label": "Confirmed Incidents",        "value": 0, "unit": "count", "trend": null, "status": "live" }
]
```

---

### Phase 4 — SASB Governance: 3 New Sections (est. 1.5–2 weeks)

Extends `sasb_config.json` from Phase 2 to add governance topics:

```json
{
  "community_relations": { ... },
  "chemical_safety": {
    "rt_ch_410b": {
      "hazardous_substances_screen_process": "in-progress",
      "products_with_hazardous_substances_pct": null,
      "safety_data_sheet_coverage_pct": null,
      "product_stewardship_policy": "adopted",
      "notes": "Chemical inventory register under development."
    }
  },
  "legal_regulatory": {
    "rt_ch_530a": {
      "policy_advocacy_register_exists": false,
      "trade_association_memberships": [],
      "political_contributions": 0,
      "notes": ""
    }
  },
  "business_ethics": {
    "code_of_conduct_adopted": true,
    "supplier_code_adopted": true,
    "whistleblower_channel": "adopted",
    "ethics_training_coverage_pct": null,
    "notes": ""
  }
}
```

New components: `SasbChemicalSafetyCards.jsx`, `SasbLegalRegulatoryCards.jsx`, `SasbBusinessEthicsCards.jsx`.

---

### Phase 5 — Report Templates for Governance (est. 1–2 weeks)

**GRI Governance Reports:**

In `REPORT_TEMPLATES` (main.py):
```python
{"id": "gri_205", "name": "GRI 205 — Anti-Corruption", "gri": "205", "hasData": False},
{"id": "gri_201", "name": "GRI 201 — Economic Performance", "gri": "201", "hasData": False},
{"id": "gri_207", "name": "GRI 207 — Tax",              "gri": "207", "hasData": False},
```

`hasData: False` initially means these render narrative placeholder tables in the PDF (same as GRI management approach disclosures today). When data exists, flip to `True`.

**SASB Governance Reports:**

```python
{"id": "sasb_chemical_safety",   "name": "RT-CH-410 — Chemical Safety",      "sasb": "RT-CH-410", "hasData": False},
{"id": "sasb_legal_regulatory",  "name": "RT-CH-530 — Legal & Regulatory",    "sasb": "RT-CH-530a","hasData": False},
```

**BRSR Report:** Already covers all 9 Principles including P4 and P5 — no new template needed. Update `_section_b_principles()` in `brsr_report.py` to render P4 and P5 with more detail when the new Stakeholder section data is available.

---

### Phase 6 — Alerts, AI & Consistency (est. 1 week)

#### 6a. Alert/Outlier Extension

Extend `_OUTLIER_CONFIG` with CSR spend monitoring:
```python
"csr": [("TotalSpentCrore", "CSR Spend", "₹ Cr", 1)]
```
- Uses `load_csr_data()` with FY as the year dimension.
- Add `csr` to `ALL_DOMAINS` in `AlertsPage.jsx` and `DOMAIN_OPTIONS` filter list.
- Threshold defaults: Low ≥ 10%, Medium ≥ 20%, High ≥ 40% (CSR spend is more stable than environmental metrics — use tighter thresholds).

#### 6b. AI System Prompt Updates

Extend `build_system_prompt()` in `main.py` to include:
- GRI governance awareness (anti-corruption complaints, incidents from config)
- SASB governance awareness (chemical safety status, legal/regulatory position)
- Domain scope routing for new governance domains (`DOMAIN_LABELS`, `LIVE_DOMAINS`, `PLACEHOLDER_DOMAINS`)

#### 6c. AI Quick Prompts

Add governance-aware quick prompts to `AiAssistantPanel.jsx`:
```js
const QUICK_PROMPTS = {
  ...
  governance: [
    'What is our CSR obligation vs actual spend?',
    'How many anti-corruption complaints were received this year?',
    'What is our Principle 4 stakeholder engagement status?',
    'Summarise our governance disclosures across GRI and BRSR',
  ],
};
```

---

## 6. Technical Specifications

### 6.1 Navigation Routing for Governance

The current route structure is `/dashboards/:pillar/:domain`. For governance, there are two viable routing strategies:

**Strategy A (same domain, framework-resolved):** A single domain slug (e.g., `ethics_anticorruption`) renders different content based on the active framework. This is how all current domains work. The `DOMAIN_FRAMEWORK_MAP` routes:
```
/dashboards/governance/ethics_anticorruption
  GRI  → subTab: 'gri_anticorruption'  → GriAntiCorruptionCards
  SASB → subTab: 'sasb_business_ethics' → SasbBusinessEthicsCards
  BRSR → subTab: 'brsr_compliance'     → BrsrComplianceCards (P1 focused)
```

**Strategy B (distinct domains per framework):** Each framework has its own domain slugs for governance. GRI shows `/dashboards/governance/anti_corruption`, SASB shows `/dashboards/governance/chemical_safety`. Sidebar must hide/show domains per framework (already supported by the `visibleDomains` filter added today).

**Recommendation:** Strategy B. The three frameworks' governance sections cover genuinely different topics (GRI 205 vs. RT-CH-410 vs. BRSR P1 are not equivalents). Forcing them to share a route slug would require artificial semantic mappings that misrepresent the standards. With the current sidebar visibility filter, SASB users never see GRI-only domains and vice versa.

Under Strategy B, the `DOMAIN_FRAMEWORK_MAP` would be:
```js
// Environment and Social: framework-converged domains (same slug, different sub-tab)
water: { GRI: 'water', SASB: 'sasb_water', BRSR: 'brsr_water' }

// Governance: framework-diverged domains (domain slug only visible in that framework)
// GRI governance domains:
gri_ethics:    { GRI: 'gri_anticorruption', SASB: null, BRSR: null }
gri_economic:  { GRI: 'gri_economic',       SASB: null, BRSR: null }
gri_tax:       { GRI: 'gri_tax',            SASB: null, BRSR: null }
// SASB governance domains:
sasb_chemical: { GRI: null, SASB: 'sasb_chemical_safety', BRSR: null }
sasb_legal:    { GRI: null, SASB: 'sasb_legal_regulatory', BRSR: null }
sasb_ethics:   { GRI: null, SASB: 'sasb_business_ethics',  BRSR: null }
// BRSR governance domains:
brsr_csr:         { GRI: null, SASB: null, BRSR: 'brsr_csr' }         // existing
brsr_compliance:  { GRI: null, SASB: null, BRSR: 'brsr_compliance' }  // existing (scope to P1)
brsr_stakeholder: { GRI: null, SASB: null, BRSR: 'brsr_stakeholder' } // new
```

### 6.2 Summary Page Governance Cards

Under Strategy B, `GOVERNANCE_DOMAINS` in `SummaryPage.jsx` can no longer be a single shared array. It must become framework-specific:
```js
const GOVERNANCE_DOMAINS_BY_FRAMEWORK = {
  GRI: [
    { id: 'gri_ethics',   label: 'Ethics & Anti-Corruption', icon: ShieldCheck, kpiId: 'gri-corruption-incidents' },
    { id: 'gri_economic', label: 'Economic Performance',     icon: TrendingUp,  kpiId: null },
    { id: 'gri_tax',      label: 'Tax & Policy',             icon: Receipt,     kpiId: null },
  ],
  SASB: [
    { id: 'sasb_chemical', label: 'Chemical Safety',         icon: FlaskConical, kpiId: null },
    { id: 'sasb_legal',    label: 'Legal & Regulatory',      icon: Scale,        kpiId: null },
    { id: 'sasb_ethics',   label: 'Business Ethics',         icon: ShieldCheck,  kpiId: null },
  ],
  BRSR: [
    { id: 'csr',         label: 'CSR (P8)',                   icon: Heart,  kpiId: 'brsr-csr-spend' },      // existing
    { id: 'compliance',  label: 'Ethics & Compliance (P1)',   icon: Scale,  kpiId: 'brsr-complaint-resolution' }, // existing
    { id: 'stakeholder', label: 'Stakeholder & Human Rights', icon: Users,  kpiId: 'brsr-p4-status' },      // new
  ],
};
```

And render with: `const govDomains = GOVERNANCE_DOMAINS_BY_FRAMEWORK[framework] || [];`

---

## 7. Data Requirements

### 7.1 New Datasets Required

| Dataset | Framework | Purpose | Priority | Complexity |
|---|---|---|---|---|
| `gri_governance_config.json` | GRI | Anti-corruption (GRI 205), Tax (GRI 207) qualitative data | High | Low — JSON config file |
| `sasb_config.json` (governance additions) | SASB | Chemical safety (RT-CH-410), legal/regulatory (RT-CH-530a), business ethics | High | Low — JSON config file |
| `GRI_Economic_Dataset_FY20XX_FY20XX.xlsx` | GRI | GRI 201 EVG&D figures (revenue, operating costs, wages, taxes, community investment, retained earnings) — annual, entity-level | Low (Phase 2) | High — requires Finance team data collection |
| `SASB_ChemicalInventory_Dataset.xlsx` | SASB | RT-CH-410b chemical substance registry (product name, CAS number, hazard classification flag) | Low (Phase 2) | Very High — requires Product Safety team |

### 7.2 Dataset Generator Scripts (new synthetic datasets)

If real data is unavailable for development/demo purposes, generators should be added following the existing pattern in `generate_brsr_datasets.py`:

- `generate_gri_economic_dataset.py` — Synthetic EVG&D figures consistent with existing plant revenue scale
- `generate_sasb_chemical_inventory.py` — Synthetic product list with hazard flags

These are development tools only and should not ship to production without real data.

### 7.3 brsr_config.json Extensions Required

Current P4 and P5 entries only have `policy_status` and `notes`. For the new Stakeholder section, add:
```json
"p4": {
  "policy_title": "Stakeholder Responsiveness",
  "policy_status": "in-progress",
  "committee": null,
  "stakeholder_groups_identified": ["Employees", "Communities", "Regulators", "Investors"],
  "engagement_mechanisms": ["Annual stakeholder survey", "Community meetings"],
  "grievances_received": 0,
  "grievances_resolved": 0,
  "notes": "Stakeholder engagement mapping in progress."
},
"p5": {
  "policy_title": "Human Rights",
  "policy_status": "in-progress",
  "committee": null,
  "due_diligence_conducted": false,
  "human_rights_training_coverage_pct": null,
  "grievances_received": 0,
  "grievances_resolved": 0,
  "notes": "Human rights due diligence framework under review."
}
```

---

## 8. Reuse vs. New Component Matrix

| New Section | Reuse Existing | Extend/Modify | New Required |
|---|---|---|---|
| SASB Process Safety (Phase 0) | `ProcessSafetyCharts.jsx` ✅ | `domainMap.js` (add 5 lines) | Nothing |
| BRSR Stakeholder & HR (P4+P5) | `BrsrComplianceCards.jsx` pattern | `BrsrComplianceCards.jsx` (scope to P1); `brsr_config.json` (add P4/P5 fields) | `BrsrStakeholderCards.jsx` |
| SASB Community Relations | `BrsrComplianceCards.jsx` pattern | `sasb_config.json` (new file) + `/api/sasb/config` endpoint | `SasbCommunityCards.jsx` |
| GRI Anti-Corruption (GRI 205) | `BrsrComplianceCards.jsx` pattern | `gri_governance_config.json` (new file) + `/api/gri/governance` endpoint | `GriAntiCorruptionCards.jsx` |
| GRI Economic Performance (GRI 201) | `PlaceholderState.jsx` initially | — | `GriEconomicCards.jsx` (Phase 2: full component) |
| GRI Tax (GRI 207) | `BrsrComplianceCards.jsx` pattern | `gri_governance_config.json` | `GriTaxCards.jsx` |
| SASB Chemical Safety (RT-CH-410) | `BrsrComplianceCards.jsx` pattern | `sasb_config.json` | `SasbChemicalSafetyCards.jsx` |
| SASB Legal & Regulatory (RT-CH-530a) | `BrsrComplianceCards.jsx` pattern | `sasb_config.json` | `SasbLegalRegulatoryCards.jsx` |
| SASB Business Ethics | `BrsrComplianceCards.jsx` pattern | `sasb_config.json` | `SasbBusinessEthicsCards.jsx` |
| Summary Page Governance Cards | `DomainCard` component ✅ | `SummaryPage.jsx` (framework-specific governance array) | Nothing |
| Sidebar Governance Visibility | Existing `visibleDomains` filter ✅ | `NAV_TREE` (add new domain entries) | Nothing |

**Key design principle:** All new governance sections follow the same "qualitative policy card" pattern established by `BrsrComplianceCards.jsx`. This reduces implementation variance and ensures visual consistency. The component can be made more generic by extracting a shared `PolicyStatusCard` component that all governance sections use.

---

## 9. AI, Alerts & Reports Integration

### 9.1 AI — `build_system_prompt()` Changes

For each new governance section, the system prompt needs to be aware of:
1. Whether data exists (live config vs. placeholder)
2. What the data means in ESG context
3. How to answer questions about GRI 205 / RT-CH-410 / P4 in the appropriate framework's terminology

Suggested additions to `build_system_prompt()`:

```python
# GRI Governance awareness (always included when gri_governance_config.json exists)
gri_gov_summary = ""
try:
    cfg = _load_gri_governance_config()
    g205 = cfg.get("gri_205", {})
    gri_gov_summary = f"""
GRI Governance data (qualitative, from config):
- Anti-Corruption (GRI 205): {g205.get('anti_bribery_policy_adopted', 'unknown')} policy; 
  {g205.get('complaints_received', 'unknown')} complaints received, 
  {g205.get('complaints_resolved', 'unknown')} resolved; 
  {g205.get('corruption_incidents_confirmed', 'unknown')} confirmed incidents.
"""
except Exception:
    pass
```

Similarly for SASB governance config. Inject into the `{focus_instruction}` section when `framework == "GRI"` and scope relates to governance.

### 9.2 Alert/Outlier Detection

For CSR spend monitoring (most viable governance outlier):
```python
# In _OUTLIER_CONFIG:
"csr": [("TotalSpentCrore", "CSR Spend", "₹ Cr", 1)]

# In _compute_outliers(), add loader:
"csr": (load_csr_data, "FY"),
```

Add to `AlertsPage.jsx`:
```js
const DOMAIN_OPTIONS = [
  ...
  { value: 'csr', label: 'CSR (BRSR P8)' },
];
const ALL_DOMAINS = ['water', 'waste', 'energy', 'emissions', 'safety', 'csr'];
```

### 9.3 Report Templates

New templates added to `REPORT_TEMPLATES` and `SASB_REPORT_TEMPLATES` in `main.py`. New PDF generation functions follow the patterns in `pdf_report.py` for GRI and `brsr_report.py` for BRSR.

For governance reports (initially qualitative):
- GRI 205 report: Anti-corruption policy table + complaints/incidents table
- GRI 207 report: Tax strategy narrative + qualitative disclosure table
- SASB RT-CH-410 report: Chemical safety status table + product stewardship narrative
- SASB RT-CH-530a report: Regulatory environment management narrative

---

## 10. Risks, Assumptions & Dependencies

### 10.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Financial data for GRI 201 (EVG&D) is not available from the client | High | Medium — GRI Economic section stays as qualitative placeholder | Design GriEconomicCards.jsx as a placeholder first; upgrade to quantitative when data arrives |
| Chemical inventory data for RT-CH-410b cannot be collected | High | Low — section remains qualitative (RT-CH-410a/narrative only) | Mark as data_gap in `sasb_requirements.json` (already done); dashboard shows qualitative status |
| brsr_config.json P4/P5 fields are empty/null | Medium | Low — section shows empty-state with data collection guidance | BrsrStakeholderCards handles null gracefully, same as BrsrComplianceCards |
| NAV_TREE grows too large for collapsed sidebar (icon-only mode) | Low | Low | Sidebar renders collapsed view as icon-only with tooltip; extra governance domains add icons but no width |
| DOMAIN_FRAMEWORK_MAP becomes very large and hard to maintain | Medium | Medium | Consider moving to a code-generated structure or table-driven config file as domains grow |
| Governance anomaly detection produces false-positive alerts on CSR spend (small absolute numbers) | Medium | Medium | Use tighter default thresholds (10/20/40%) for CSR vs. operational (12/25/50%) |

### 10.2 Assumptions

1. The three BRSR Governance sections remain: CSR (P8), Ethics & Compliance (P1), Stakeholder & Human Rights (P4+P5). P2, P7, P9 are shown as policy cards within existing sections or deferred.
2. SASB Governance sections are labeled "Governance" in UI navigation despite not being formally categorized as "Governance" in the SASB taxonomy.
3. All governance sections are qualitative (config-driven) in Phase 1 and Phase 2. Quantitative data (GRI 201, RT-CH-410b) is Phase 3+ and requires external data collection.
4. The `brsr_config.json` approach (JSON config edited manually by the reporting team) is acceptable for governance data collection. No admin UI for editing config is in scope.
5. The existing `PlaceholderState.jsx` component is adequate for sections where no data is configured yet.
6. `DomainsPage.jsx` does not need to change — it already handles `null` subTab gracefully.

### 10.3 Dependencies

```
Phase 0 (Process Safety reveal)
  └── No external dependencies — everything already built

Phase 1 (BRSR Stakeholder & HR)
  └── brsr_config.json must have p4/p5 fields added and filled in

Phase 2 (SASB Community Relations)
  └── sasb_config.json created with community_relations section

Phase 3 (GRI Governance)
  └── gri_governance_config.json created and filled in by reporting team

Phase 4 (SASB Governance)
  └── sasb_config.json extended with chemical_safety, legal_regulatory, business_ethics sections

Phase 5 (Reports)
  └── Phase 3 and 4 config data must exist for reports to contain real content
  └── ReportLab PDF generation functions follow existing pdf_report.py patterns

Phase 6 (AI, Alerts, Consistency)
  └── All Phase 1-4 sections must be live
  └── DOMAIN_LABELS in main.py must include all new governance domain IDs
```

---

## 11. Cross-Framework Consistency Guidelines

### 11.1 Visual Consistency Rules

These rules should be maintained across all new governance sections:

1. **Icon palette:** Use the existing framework color scheme (GRI: teal `#0d9488`, SASB: blue `#2563eb`, BRSR: amber `#f59e0b`) for icon accent colors in governance KPI tiles.
2. **Card pattern:** All governance sections use the `PolicyStatusCard` pattern (principle/standard code + title + adopted/in-progress/not-adopted badge + committee/coverage details). This is the established pattern from `BrsrComplianceCards.jsx`.
3. **KPI tiles:** Where quantitative metrics exist (e.g., complaints count, incidents count, CSR spend), render them as standard `KpiCard` components above the qualitative policy cards.
4. **PlaceholderState:** When a section has no data, use `PlaceholderState` with the standard/disclosure code as the `gri` badge prop (e.g., "GRI 201" or "RT-CH-410").
5. **"Not Available" suppression:** Following the sidebar visibility rule, governance sections are now **hidden** (not shown as "Not available") for frameworks that don't cover them. This was already implemented. Maintain this rule for all new governance domains.

### 11.2 Data Collection Consistency

For config-driven governance sections, the JSON config structure should be consistent:
```json
{
  "policy_title": "...",
  "policy_status": "adopted | in-progress | not-adopted",
  "committee": "Committee Name | null",
  "board_coverage_pct": 100 | null,
  "training_coverage_pct": null,
  "incidents_count": 0,
  "complaints_received": 0,
  "complaints_resolved": 0,
  "notes": "..."
}
```

This allows a single `PolicyStatusCard` component to render any governance section.

### 11.3 Avoiding Duplication

| Data Point | Shared By | How to Avoid Duplication |
|---|---|---|
| Complaint counts | BRSR P1 and potentially GRI 205 | Maintain separate configs (`brsr_config.json` vs `gri_governance_config.json`). The values may differ — GRI 205 complaints are broader (all ethics), BRSR P1 may be more specific. |
| Safety data | GRI 403, SASB RT-CH-320a, BRSR P3 | All three already read from same `GRI_Safety_Dataset` — no duplication. |
| Anti-corruption policies | GRI 205 and BRSR P1 | Similar content but different disclosure contexts. Keep separate. Share `PolicyStatusCard` component only. |
| CSR spend | BRSR P8 and potentially GRI 203 | BRSR P8 uses `BRSR_CSR_Dataset`. GRI 203 (Indirect Economic Impacts) does not require CSR spend specifically — no conflict. |

---

## 12. Implementation Roadmap

### Timeline Overview

```
Week 1    │ Phase 0: Reveal SASB Process Safety (1 day)
          │ Phase 1: BRSR Stakeholder & Human Rights (3–4 days)
──────────┼─────────────────────────────────────────────────
Week 2    │ Phase 2: SASB Community Relations (3–5 days)
──────────┼─────────────────────────────────────────────────
Weeks 3–4 │ Phase 3: GRI Governance — 3 sections
          │   Day 1:   gri_governance_config.json + /api/gri/governance endpoint
          │   Day 2:   GriAntiCorruptionCards.jsx (GRI 205)
          │   Day 3:   GriTaxCards.jsx (GRI 207)
          │   Day 4:   GriEconomicCards.jsx (qualitative placeholder, GRI 201)
          │   Day 5:   domainMap + kpiGroups + SummaryPage integration
          │   Day 6–7: Testing, validation, build check
──────────┼─────────────────────────────────────────────────
Weeks 5–6 │ Phase 4: SASB Governance — 3 sections
          │   Day 1:   sasb_config.json governance extensions + /api/sasb/config endpoint
          │   Day 2:   SasbChemicalSafetyCards.jsx (RT-CH-410)
          │   Day 3:   SasbLegalRegulatoryCards.jsx (RT-CH-530a)
          │   Day 4:   SasbBusinessEthicsCards.jsx
          │   Day 5:   domainMap + kpiGroups + SummaryPage integration
          │   Day 6–7: Testing, validation
──────────┼─────────────────────────────────────────────────
Week 7    │ Phase 5: Report Templates for new sections
──────────┼─────────────────────────────────────────────────
Week 8    │ Phase 6: AI, Alerts, final consistency pass
          │   CSR outlier detection
          │   AI system prompt updates for governance domains
          │   Quick prompts for governance AI assistant
          │   End-to-end validation of all 3×3×3 sections
```

### Priority Order (if time-constrained)

| Priority | Item | Value | Effort |
|---|---|---|---|
| P0 | Reveal SASB Process Safety | High — already built | Hours |
| P1 | BRSR Governance 3rd section (P4+P5) | Medium — completes BRSR | 3–4 days |
| P2 | GRI Anti-Corruption (GRI 205) | High — most-asked governance disclosure | 3–4 days |
| P3 | SASB Community Relations | Medium — completes SASB Social | 3–5 days |
| P4 | SASB Legal & Regulatory (RT-CH-530a) | Medium | 2–3 days |
| P5 | GRI Tax (GRI 207) | Medium | 2–3 days |
| P6 | SASB Business Ethics | Low-medium | 2 days |
| P7 | SASB Chemical Safety (RT-CH-410) | Low (no data available) | 2–3 days |
| P8 | GRI Economic Performance (GRI 201) | Low (no data available) | 2–3 days (placeholder); 2 weeks (quantitative) |
| P9 | Report templates for governance | Medium — needed for compliance output | 1–2 weeks |
| P10 | AI governance awareness updates | Medium | 3–5 days |
| P11 | CSR outlier detection | Low | 1–2 days |

### Milestone Checklist

- [ ] Phase 0 complete: SASB Social shows 3 visible sections (Process Safety revealed)
- [ ] Phase 1 complete: BRSR Governance shows 3 sections (CSR, Ethics P1, Stakeholder P4+P5)
- [ ] Phase 2 complete: SASB Social shows 3 sections (Safety, Process Safety, Community)
- [ ] Phase 3 complete: GRI Governance shows 3 sections (Ethics, Economic, Tax)
- [ ] Phase 4 complete: SASB Governance shows 3 sections (Chemical Safety, Legal, Ethics)
- [ ] Open Decision #1 resolved: Framework-specific vs. thematically-aligned governance
- [ ] Open Decision #4 resolved: BRSR Ethics & Compliance refocus approach
- [ ] All Summary pages show 3 governance cards for each active framework
- [ ] Sidebar hides governance domains correctly per active framework
- [ ] No `null` kpiId governance cards remain visible on Summary page
- [ ] `npm run build` passes with zero errors after all phases
- [ ] BRSR report includes P4/P5 content
- [ ] GRI 205 report template added (qualitative)
- [ ] SASB RT-CH-530a report template added (qualitative)
- [ ] AI correctly responds to governance questions for all three frameworks
- [ ] CSR spend included in anomaly detection

---

## Appendix A — File Change Summary

### Files Modified

| File | Changes |
|---|---|
| `frontend/src/constants/domainMap.js` | Add governance domains to `NAV_TREE`, `DOMAIN_FRAMEWORK_MAP`, `DOMAIN_STANDARD_CODE`, `SUBTAB_META` |
| `frontend/src/constants/kpiGroups.js` | Add governance KPI groups, icons, colors for GRI/SASB/BRSR |
| `frontend/src/components/layout/Sidebar.jsx` | No change needed — `visibleDomains` filter already handles new domains |
| `frontend/src/components/summary/SummaryPage.jsx` | Replace `GOVERNANCE_DOMAINS` with `GOVERNANCE_DOMAINS_BY_FRAMEWORK` lookup |
| `frontend/src/components/brsr/BrsrComplianceCards.jsx` | Scope to P1 only |
| `backend/main.py` | Add governance endpoints, extend `REPORT_TEMPLATES`, extend `build_system_prompt()`, extend `_OUTLIER_CONFIG` |
| `backend/data/brsr_config.json` | Extend P4/P5 with structured fields |
| `backend/gri_requirements.json` | Add GRI 201, 205, 207 disclosure entries |
| `backend/sasb_requirements.json` | Already has RT-CH-410, RT-CH-530a entries |

### New Files

| File | Purpose |
|---|---|
| `backend/data/gri_governance_config.json` | GRI 205, 207 qualitative disclosure config |
| `backend/data/sasb_config.json` | SASB community, chemical safety, legal, ethics config |
| `frontend/src/components/brsr/BrsrStakeholderCards.jsx` | BRSR P4+P5 governance section |
| `frontend/src/components/sasb/SasbCommunityCards.jsx` | SASB RT-CH-210a Social section |
| `frontend/src/components/sasb/SasbChemicalSafetyCards.jsx` | SASB RT-CH-410 Governance section |
| `frontend/src/components/sasb/SasbLegalRegulatoryCards.jsx` | SASB RT-CH-530a Governance section |
| `frontend/src/components/sasb/SasbBusinessEthicsCards.jsx` | SASB Business Ethics Governance section |
| `frontend/src/components/gri/GriAntiCorruptionCards.jsx` | GRI 205 Governance section |
| `frontend/src/components/gri/GriEconomicCards.jsx` | GRI 201 Governance section (Phase 1: placeholder) |
| `frontend/src/components/gri/GriTaxCards.jsx` | GRI 207 Governance section |
| `backend/generate_gri_economic_dataset.py` | Synthetic GRI 201 financial data generator (dev/demo only) |

### Total Estimated New Files: 10  
### Total Estimated Modified Files: 8

---

## Appendix B — Shared PolicyStatusCard Component

To reduce code duplication across the 9 new governance components, extract a shared component:

```jsx
// frontend/src/components/shared/PolicyStatusCard.jsx

const STATUS_META = {
  adopted:     { color: '#22c55e', label: 'Adopted' },
  'in-progress': { color: '#f59e0b', label: 'In Progress' },
  'not-adopted': { color: '#ef4444', label: 'Not Adopted' },
};

export function PolicyStatusCard({ code, title, status, committee, coverage, notes, dataItems = [] }) {
  const meta = STATUS_META[status] || STATUS_META['not-adopted'];
  return (
    <div className="kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span className="brsr-principle-badge">{code}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: meta.color }}>{meta.label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
      {committee && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Committee: {committee}</div>}
      {coverage !== undefined && coverage !== null && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Board coverage: {coverage}%</div>
      )}
      {dataItems.map(({ label, value, unit }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{value}{unit ? ` ${unit}` : ''}</span>
        </div>
      ))}
      {notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>{notes}</div>}
    </div>
  );
}
```

This component is usable by GRI, SASB, and BRSR governance sections alike, ensuring visual consistency without duplicating markup.

---

*End of Implementation Plan*
