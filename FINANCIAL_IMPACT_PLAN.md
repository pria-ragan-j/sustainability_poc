# ESG Dashboard — Financial & Production Impact Insights: Implementation Plan

**Date**: 2026-06-24
**Status**: Draft — pending review
**Scope**: Add financial/production impact estimation across all seven ESG domains (Energy, Safety, Water, Waste, GHG & Air Quality, Workforce, CSR)
**Author note**: This document is analysis and planning only. No code has been changed.

**Decisions locked in for this plan** (confirmed by stakeholder):
1. **Scope**: All seven domains in a single coordinated rollout (not a single-domain pilot).
2. **UI placement**: A new dedicated **Financial Impact** section/page, *plus* a short one-line estimated-impact teaser inside each domain's existing Insights panel.
3. **Rate configuration**: An **admin-configurable settings UI** (not a static config file) so Finance/Sustainability admins can update tariffs and assumptions without a code deploy.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Gap Analysis](#2-gap-analysis)
3. [Recommended Architecture & Design](#3-recommended-architecture--design)
4. [Impacted Components & Modules](#4-impacted-components--modules)
5. [Domain-by-Domain Calculation Design](#5-domain-by-domain-calculation-design)
6. [Data, Calculation & Reporting Considerations](#6-data-calculation--reporting-considerations)
7. [Dashboard & UX Considerations](#7-dashboard--ux-considerations)
8. [AI Assistant Integration](#8-ai-assistant-integration)
9. [Alerts Integration](#9-alerts-integration)
10. [Dependencies, Risks & Assumptions](#10-dependencies-risks--assumptions)
11. [Validation Approach](#11-validation-approach)
12. [Phased Implementation Roadmap](#12-phased-implementation-roadmap)
13. [Success Criteria & Expected Outcomes](#13-success-criteria--expected-outcomes)
14. [Priority Order](#14-priority-order)
15. [Output Result Summary](#15-output-result-summary)

---

## 1. Current State Assessment

This section restates only the facts established during prior analysis that this plan depends on — no re-analysis performed.

- **Production data already exists.** `CarbonBlackProductiont` is present in the energy and GHG datasets and is already used as the denominator in `weighted_ratio()` (`backend/main.py`) to compute intensity KPIs (`EnergyIntensityGJpert`, `Scope1IntensitytCO2epert`, etc., via the `INTENSITY_NUMERATOR` dict). Intensity is calculated but never translated into a cost figure.
- **No financial dataset exists.** There is no revenue, cost-rate, tariff, wage, or carbon-price data anywhere in the system. All seven domains operate on physical/operational units only (GJ, ML, tonnes, counts, hours, ₹ Cr for CSR only).
- **CSR is the one domain with native financial data.** `BRSR_CSR_Dataset` already contains `ObligationCrore` and `TotalSpentCrore` — the underspend gap is a complete, ready-to-use financial figure with a real legal consequence (Companies Act 2013, Section 135).
- **Insight engine is static and domain-siloed.** `/api/insights/{domain}` returns 3 hardcoded template bullets per domain, covering only the 5 GRI "live" domains (`water`, `waste`, `safety`, `energy`, `emissions`). No financial language anywhere in current insights.
- **Persistence pattern already established.** `backend/storage.py` uses a local SQLite DB (`data/app_state.db`) with small config tables — e.g. `alert_config` (domain, low_pct, medium_pct, high_pct) — exposed via `GET/PUT/DELETE /api/alerts/config`. This is the existing precedent for admin-editable settings and should be mirrored rather than introducing a new config mechanism (e.g. a JSON file).
- **Component reuse candidates.** `BrsrComplianceCards.jsx` is a config-driven card pattern already used for qualitative/structured disclosures — a good structural reference for a new Financial Impact card layout, though the new feature is quantitative, not qualitative.
- **Reports and AI are not in scope of today's data.** `build_system_prompt()` and the report template generator currently only assemble physical KPI data; neither has any concept of a cost rate or financial estimate to draw on.

---

## 2. Gap Analysis

| Gap | Detail | Consequence if unaddressed |
|---|---|---|
| No cost-rate data anywhere | Electricity tariff, water tariff, waste disposal rate, average wage, carbon price, recruitment cost — none exist in any dataset or config | Financial impact cannot be computed for any domain without this input |
| No admin UI for settings beyond alert thresholds | Only `alert_config` table/endpoint exists; no general "rates/assumptions" settings surface | Cannot let Finance/Sustainability maintain rates without a code change, defeating the chosen "admin-configurable" approach |
| Insight engine has no concept of derived/estimated values | All 3 bullets per domain are template strings built directly from raw aggregates | Cannot simply "add a line" — needs a new code path that is explicitly flagged as an estimate, separate from factual insights |
| No domain exists for Workforce/Development as a "live" computation in the same sense as the other 5 | `PLACEHOLDER_DOMAINS = {"workforce", "development"}` — these are GRI placeholders without the same live outlier/insight treatment | Financial impact for Workforce (recruitment cost from turnover) needs new computation, not just reuse of an existing pattern |
| No precedent for "estimated/assumption-based" values in the UI | Every existing KPI, chart, and insight is a verified figure straight from a dataset | Risk of estimated financial figures being visually indistinguishable from audited data unless a new visual/labeling convention is designed from scratch |
| No per-plant/region cost variation support in any existing config table | `alert_config` is keyed only by `domain` | If real-world tariffs differ by plant/region (likely, since electricity and water rates are state-specific in India), a domain-only rate table will produce an inaccurate blended estimate |
| AI system prompt has no access to financial assumptions | `build_system_prompt()` only injects BRSR/GRI/SASB operational data | The AI cannot answer "what does this cost us" unless the financial impact data is explicitly added to its context |

---

## 3. Recommended Architecture & Design

### 3.1 New backend module: `financial_impact.py`

A new sibling module to keep this logic out of the already-large `main.py`, following the existing pattern of separating concerns (`storage.py` for persistence, dedicated modules for outlier/insight logic where applicable).

Responsibilities:
- Pydantic models for the rate configuration (`FinancialRatesConfig`)
- Per-domain calculation functions (`compute_energy_impact`, `compute_safety_impact`, `compute_water_impact`, `compute_waste_impact`, `compute_ghg_impact`, `compute_workforce_impact`, `compute_csr_impact`)
- A rollup aggregator (`compute_financial_impact_summary`) for the dedicated Financial Impact page
- A short-form formatter (`format_insight_teaser(domain, impact)`) used by the existing insight endpoints

### 3.2 New persistence: `financial_rates` table

Mirrors the existing `alert_config` table pattern in `storage.py`:

```sql
CREATE TABLE IF NOT EXISTS financial_rates (
    id INTEGER PRIMARY KEY CHECK (id = 1),   -- single global row for Phase 1
    currency TEXT DEFAULT 'INR',
    energy_tariff_per_gj REAL,
    water_tariff_per_kl REAL,
    waste_disposal_hazardous_per_tonne REAL,
    waste_disposal_nonhazardous_per_tonne REAL,
    avg_daily_wage_inr REAL,
    avg_days_lost_per_lti REAL,
    shadow_carbon_price_per_tco2e REAL,
    avg_recruitment_cost_per_hire REAL,
    updated_by TEXT,
    updated_at TEXT
);
```

A single global row is intentionally chosen for Phase 1 (see Decision-pending item in §10) rather than per-plant rows — per-plant/region rate overrides are flagged as a Phase 2 enhancement once the single-rate model is validated.

New storage functions: `get_financial_rates()`, `save_financial_rates(rates, updated_by)` — same shape as `get_alert_config()` / `save_domain_thresholds()`.

### 3.3 New API endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/settings/financial-rates` | Fetch current rate configuration for the admin settings UI |
| `PUT` | `/api/settings/financial-rates` | Update one or more rates (partial update supported) |
| `GET` | `/api/financial-impact/{domain}` | Per-domain estimated impact breakdown + assumptions used (for the dedicated section's domain drill-down) |
| `GET` | `/api/financial-impact/summary` | Company-wide rollup across all 7 domains, for the Financial Impact landing page and AI context injection |

All four follow the existing query-param convention (`year`/`plant`/`region` or `fy`/`plant`/`region` for BRSR-sourced domains) already used by `getEnvKpis`, `getBrsrKpis`, etc.

### 3.4 Modified existing endpoints

`/api/insights/{domain}` (5 GRI domains) and the BRSR/SASB equivalents gain one **additional, clearly-flagged** bullet at the end of the existing list:

```json
{ "type": "estimated_impact", "text": "Estimated cost impact: ₹X.XX Cr", "label": "Estimated — based on configured rates" }
```

This is additive — the existing 3 factual bullets are untouched, preserving current behavior for any caller that doesn't render the new field.

### 3.5 Why a dedicated module instead of extending `main.py` in place

`main.py` is already large (per prior analysis: KPI endpoints, insights, outliers, reports, AI, alerts, BRSR/SASB logic all in one file). Given this feature touches all 7 domains plus a new settings surface, isolating it in `financial_impact.py` keeps the diff reviewable and the new logic independently testable, consistent with the project's incremental module-extraction precedent (`storage.py` already separated from `main.py`).

---

## 4. Impacted Components & Modules

### Backend
| File | Change |
|---|---|
| `backend/storage.py` | Add `financial_rates` table + `get_financial_rates()` / `save_financial_rates()` |
| `backend/financial_impact.py` *(new)* | Calculation functions, rollup, insight-teaser formatter |
| `backend/main.py` | New route registrations (4 endpoints above); inject estimated-impact teaser into the 5 existing `/api/insights/{domain}` handlers and BRSR CSR/Safety/Workforce equivalents; extend `build_system_prompt()` to optionally include financial-impact summary |

### Frontend
| File | Change |
|---|---|
| `frontend/src/api/client.js` | Add `getFinancialRates`, `updateFinancialRates`, `getFinancialImpact(domain, params)`, `getFinancialImpactSummary(params)` |
| `frontend/src/pages/FinancialImpactPage.jsx` *(new)* | Dedicated section — company-wide rollup + per-domain breakdown cards with assumptions shown inline |
| `frontend/src/components/settings/FinancialRatesSettings.jsx` *(new)* | Admin form for the 8 rate fields, calls `GET/PUT /api/settings/financial-rates` |
| `frontend/src/components/insights/InsightsPanel.jsx` *(existing — exact name to confirm)* | Render the new `estimated_impact` bullet with a distinct visual treatment (see §7.2) |
| `frontend/src/constants/domainMap.js` | Add `financial-impact` entry to `NAV_TREE` (top-level, not nested under a pillar — it spans all three pillars) |
| `frontend/src/App.jsx` / router config | New route `/financial-impact` and `/settings/financial-rates` (or nested under an existing Settings area if one exists — to confirm) |
| `frontend/src/components/ai/AiAssistantPanel.jsx` | Add financial-impact-aware quick prompts, e.g. *"What is the estimated financial impact of our safety performance?"* |

### Reports
| File | Change |
|---|---|
| Report template generator (`main.py` report section) | Optional new "Financial Impact Summary" template/section, off by default, selectable like other report templates |

---

## 5. Domain-by-Domain Calculation Design

All formulas below use only data confirmed to already exist in the corresponding dataset, plus exactly one new rate input from the `financial_rates` table per line. Every output must carry an `assumptions_used` array in the API response so the UI/AI can always show what rate(s) produced the figure.

| Domain | Formula | Existing data used | New rate input |
|---|---|---|---|
| **Energy** | `cost = TotalEnergyConsumedGJ × energy_tariff_per_gj`; `cost_per_tonne = cost / CarbonBlackProductiont` | `TotalEnergyConsumedGJ`, `CarbonBlackProductiont` | `energy_tariff_per_gj` |
| **Safety** | `lost_hours = LostTimeInjuries × avg_days_lost_per_lti × 8`; `cost = lost_hours × (avg_daily_wage_inr / 8)` | `LostTimeInjuries` | `avg_days_lost_per_lti`, `avg_daily_wage_inr` |
| **Water** | `cost = TotalWaterWithdrawn × water_tariff_per_kl`; `savings = WaterRecycledReused × water_tariff_per_kl` | `TotalWaterWithdrawn`, `WaterRecycledReused` | `water_tariff_per_kl` |
| **Waste** | `cost = (HazardousTonnes × waste_disposal_hazardous_per_tonne) + (NonHazardousTonnes × waste_disposal_nonhazardous_per_tonne)`; `avoided = DivertedTonnes × blended_rate` | `HazardousFlag`-split tonnage, diversion tonnage | `waste_disposal_hazardous_per_tonne`, `waste_disposal_nonhazardous_per_tonne` |
| **GHG & Air Quality** | `shadow_liability = Scope1TotaltCO2e × shadow_carbon_price_per_tco2e` | `Scope1TotaltCO2e` | `shadow_carbon_price_per_tco2e` |
| **Workforce** | `replacement_cost = turnover_count × avg_recruitment_cost_per_hire` | Workforce headcount fields (turnover requires year-over-year headcount delta — confirm exact turnover calculation already used in `SOCIAL_KPI_GROUPS`, do not re-derive) | `avg_recruitment_cost_per_hire` |
| **CSR** | `gap = ObligationCrore − TotalSpentCrore` (already in ₹ Cr, no rate needed) | `ObligationCrore`, `TotalSpentCrore` | *None — purely existing data* |

**Note on Workforce**: this is the one domain where the exact existing turnover-rate computation must be reused rather than reimplemented, to avoid producing a second, possibly inconsistent, turnover number. Confirm the existing formula location in `main.py` before implementation (flagged as a verification step in §11, not re-analyzed here per instruction).

---

## 6. Data, Calculation & Reporting Considerations

- **Every computed figure must be labeled "Estimated"** in both API payload (a `is_estimate: true` flag) and UI (visual treatment, see §7.2) — these are assumption-driven figures, not audited financials, and must never be presented with the same visual confidence as a verified KPI.
- **Rounding and currency display** should follow the existing `formatKpiValue()` convention already used across the dashboard (`frontend/src/utils/formatNumber.js`) for consistency — no new formatting utility needed.
- **Historical trend support**: financial impact figures should be computable for any year/plant/region filter combination already supported by each domain's existing filter bar, not just the current period — this falls out naturally if the calculation functions accept the same `df_slice` the existing KPI endpoints already produce.
- **Report integration is additive, not mandatory** — a new optional template, not a forced addition to existing BRSR/GRI/SASB report exports, since those are framework-defined disclosures and financial estimates are not part of any of the three frameworks' required content.
- **No retroactive rate changes should silently alter historical reports already generated** — once a report is generated and stored (`generated_reports` table in `storage.py`), it is a snapshot; only live dashboard views reflect the current rate configuration.

---

## 7. Dashboard & UX Considerations

### 7.1 Dedicated Financial Impact section

- New top-level nav entry (sits alongside, not nested under, Environment/Social/Governance — it spans all three).
- Landing view: company-wide rollup card grid (one card per domain, mirroring the existing `DomainCard` pattern in `SummaryPage.jsx` for visual consistency) showing the estimated ₹ impact figure, trend arrow, and a "View assumptions" affordance.
- Drill-down per domain: shows the formula, the exact rate(s) used, and a link to the settings page if the viewer has admin rights.

### 7.2 Visual distinction for estimated figures

Recommend a consistent convention across both the new section and the Insights-panel teaser line:
- A distinct badge/pill reading "Estimated" next to any computed financial figure (similar in weight to the existing `trend-chip` styling already used in `SummaryPage.jsx`, but a new visually distinct color — not reusing the green/red positive/negative trend colors, to avoid implying audited certainty).
- Hover/tap reveals the exact assumptions used (rate value + as-of date it was last updated).

### 7.3 Insights panel teaser line

One short line appended after the existing 3 factual bullets, e.g.:
> *Estimated cost impact: ₹4.2 Cr this year, based on configured energy tariff (₹850/GJ). [View details →]*

Links into the dedicated Financial Impact section's domain drill-down — avoids duplicating the full breakdown UI in two places.

### 7.4 Admin settings UI

- A form with the 8 rate fields, grouped by domain, with the currency fixed to INR for Phase 1 (multi-currency explicitly out of scope).
- Shows `updated_by` / `updated_at` for the last change (lightweight audit trail, no full history table in Phase 1).
- Access control: this plan assumes the existing app has no role-based access control today (no evidence of a roles/permissions system in the components reviewed so far) — if true, the settings page is open to anyone who can reach the URL, same as the current Alert Config screen. Flagged as an open question in §10.

---

## 8. AI Assistant Integration

- `build_system_prompt()` gains an optional block (only when financial rates are configured) summarizing the current financial-impact rollup, structured the same way the existing BRSR injection works.
- New quick prompts added to `AiAssistantPanel.jsx`'s `QUICK_PROMPTS` map, e.g. under `environment`: *"What is the estimated cost impact of our energy use?"*; under `social`: *"What does our safety performance cost us?"*
- The AI must be instructed (via the system prompt) to always qualify these figures as estimates based on configured assumptions, never as audited financial data — this instruction should be added explicitly to the prompt template, not left implicit.

---

## 9. Alerts Integration

Out of scope for Phase 1. The existing `_OUTLIER_CONFIG` / alert system is threshold-based on YoY % change of physical metrics (water withdrawn, TRIR, etc.). Extending alerting to financial-impact figures (e.g. "estimated cost impact exceeded ₹X Cr") is a reasonable Phase 2+ extension once the base feature is validated, but is **not** part of this rollout — adding it now would couple two unproven systems (new financial calc + an extension of the existing alert config schema) in one release.

---

## 10. Dependencies, Risks & Assumptions

### Dependencies
- Real-world tariff/wage/rate values must come from Finance/HR/EHS teams before the feature shows anything other than placeholder zeros. The admin UI ships empty by default; this plan does not assume any default illustrative values are pre-filled, since the earlier financial analysis flagged that illustrative defaults risk being mistaken for real figures if a config step is skipped.
- Workforce turnover calculation must be confirmed/reused from existing code, not reimplemented (see §5 note).

### Risks
| Risk | Mitigation |
|---|---|
| Estimated figures mistaken for audited financials | Consistent "Estimated" labeling + assumptions always visible (§7.2) |
| Stale rates after a real tariff change goes unnoticed | `updated_at` timestamp shown prominently; consider a periodic "review your rates" reminder in a later phase |
| All 7 domains shipped at once increases surface area for bugs vs. a single-domain pilot | Each domain's calculation function is independently unit-testable; recommend per-domain code review even within one rollout (see §12 phasing within the single release) |
| No access control on the new settings page | Same exposure as today's Alert Config screen — acceptable only if that is already an accepted risk in this deployment; flagged for explicit confirmation |
| Single global rate row doesn't reflect real per-plant tariff variation | Documented as a known Phase 1 simplification; per-plant override is the first candidate for Phase 2 |

### Assumptions
- The app has no existing roles/permissions system (based on no evidence found in components reviewed) — if one exists elsewhere in the codebase, the settings page should be gated behind it instead of being open to all users.
- INR is the only required currency for Phase 1.
- A single, company-wide rate set (no per-plant variation) is acceptable for the first release, per the simplification noted in §3.2.

---

## 11. Validation Approach

1. **Unit tests** for each of the 7 calculation functions in `financial_impact.py`, using fixed input data and fixed rates, asserting exact expected ₹ output — catches formula regressions independent of live data.
2. **Manual reconciliation**: for at least one historical period, manually compute the expected energy and CSR figures by hand from the raw dataset and confirm the API output matches, before trusting the other 5 domains' analogous logic.
3. **UI review with a non-technical stakeholder** (e.g. whoever currently owns the CSR/Finance relationship) to confirm the "Estimated" labeling reads as clearly non-audited before this ships to a board-facing context.
4. **Settings round-trip test**: confirm a rate change in the admin UI immediately reflects in both the dedicated Financial Impact section and the Insights-panel teaser line, with no caching staleness.

---

## 12. Phased Implementation Roadmap

Although all 7 domains ship together (per the locked-in scope decision), implementation within that single release is still sequenced to de-risk delivery:

**Phase A — Foundation**
- `financial_rates` table + storage functions
- `GET/PUT /api/settings/financial-rates`
- Admin settings UI (`FinancialRatesSettings.jsx`)
- No domain calculations yet — this phase is purely "can we store and edit rates."

**Phase B — Highest-confidence domains (Energy, CSR)**
- Implement and validate `compute_energy_impact` and `compute_csr_impact` first — these have the most reliable existing data (production tonnage; native ₹ Cr CSR data) and serve as the template for the rest.
- Build the dedicated Financial Impact page shell + first two domain cards.
- Insights-panel teaser line wired for these two domains only, to validate the UX pattern before replicating it five more times.

**Phase C — Remaining domains (Safety, Water, Waste, GHG, Workforce)**
- Implement the remaining 5 calculation functions following the validated Phase B pattern.
- Extend the Financial Impact page and Insights teaser to all domains.
- Workforce calculation explicitly reuses the existing turnover formula (verification step from §5/§11).

**Phase D — AI & polish**
- `build_system_prompt()` financial-impact block
- New quick prompts in `AiAssistantPanel.jsx`
- Optional report template
- Final UX pass on the "Estimated" visual convention across all surfaces

**Phase E — Validation & rollout**
- Full validation pass per §11
- Stakeholder review of figures before any board-facing usage

---

## 13. Success Criteria & Expected Outcomes

- All 7 domains expose a non-zero estimated financial/production impact figure once rates are configured, with assumptions visible on every figure.
- Zero instances of an estimated figure being visually indistinguishable from an audited KPI anywhere in the dashboard.
- Finance/Sustainability admins can update any rate without a code deployment, and the change is reflected live across the dedicated section, the Insights teaser, and AI responses.
- CSR underspend gap (already fully computable today) becomes the most-trusted figure in the feature, since it requires no new assumption — useful as the internal "this works" benchmark before trusting the assumption-driven domains.
- The AI assistant can answer a cost/financial-impact question for any domain, always qualifying it as an estimate.

---

## 14. Priority Order

| Priority | Item | Rationale |
|---|---|---|
| **High** | Phase A (rate storage + admin settings UI) | Nothing else in this feature can function without it |
| **High** | Phase B (Energy + CSR calculations and UI) | Highest-confidence, lowest-risk domains; validates the entire pattern before replicating 5 more times |
| **High** | "Estimated" labeling/visual convention (§7.2) | Must exist before *any* domain ships, to avoid the core risk identified in §10 |
| **Medium** | Phase C (remaining 5 domain calculations) | Mechanical replication of the validated Phase B pattern; lower risk once B is proven |
| **Medium** | AI quick prompts and system-prompt injection (Phase D) | High user value but depends on all domains being correct first |
| **Medium** | Insights-panel teaser line across all domains | UX nicety on top of the dedicated section, which carries the primary information |
| **Low** | Report template integration | Optional, no framework requires it, can follow after the core feature is stable |
| **Low** | Per-plant/region rate overrides | Explicitly deferred to Phase 2+, noted as a known simplification |
| **Low** | Alerts integration on financial-impact thresholds | Explicitly out of scope for this rollout (§9) |

---

## 15. Output Result Summary

This plan adds a new **Financial & Production Impact** capability spanning all seven existing ESG domains (Energy, Safety, Water, Waste, GHG & Air Quality, Workforce, CSR), translating physical/operational KPIs into estimated ₹ figures using an admin-configurable rate model. It introduces:

- 1 new backend module (`financial_impact.py`), 1 new SQLite table, 4 new API endpoints
- 1 new dedicated frontend section, 1 new admin settings page, 1 new visual "Estimated" convention reused across the section, the Insights panel, and AI responses
- No changes to any existing KPI, chart, or factual insight — purely additive
- CSR is the one domain requiring zero new assumptions, since its financial data already exists natively in `BRSR_CSR_Dataset` — making it the natural internal validation benchmark

No code has been written or modified as part of producing this plan. Implementation should begin with Phase A upon approval.
