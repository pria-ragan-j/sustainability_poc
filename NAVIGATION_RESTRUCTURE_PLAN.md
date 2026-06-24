# Navigation & Layout Restructuring — Implementation Plan

Status: **Analysis only — no code changed.** This document is the implementation plan for restructuring the ESG Dashboard's navigation and layout per the proposed design. It is based on a full read of the current frontend (`frontend/src`) and backend (`backend/main.py` + report/dataset modules) and on answers to four architectural questions (recorded in "Decisions Confirmed" below).

---

## 1. Current Architecture (as-is)

### 1.1 Shell & routing
- No router (`react-router` etc.) exists anywhere in the app. `App.jsx` renders either `LoginPage` or `Dashboard` based on `isAuthenticated` (in-memory only, lost on refresh).
- `Dashboard.jsx` renders a fixed 3-column flex shell: `TopBar` (full width) → `Sidebar` | `MainContent` | `AiSidePanel`.
- All "navigation" is React state in `AppContext.jsx`, not URL-based: `activeNav` (`'summary' | 'subtab' | 'report'`), `activeMainTab`, `activeSubTab`. There are no deep links — refreshing the page always returns to Summary.

### 1.2 Three parallel frameworks
The app currently implements **three fully separate dashboard trees** selected by a `framework` toggle (`GRI` / `SASB` / `BRSR`) at the top of the `Sidebar`:

| Framework | Environment sub-tabs | Social sub-tabs | Governance sub-tabs |
|---|---|---|---|
| GRI | water, waste, energy, emissions | workforce, safety, development | — (none) |
| SASB (RT‑CH Chemicals) | sasb_ghg_air, sasb_energy, sasb_water, sasb_waste (hazardous only) | sasb_safety, sasb_process_safety | — (none) |
| BRSR (Indian BRSR, Essential indicators) | brsr_energy, brsr_water, brsr_ghg_air, brsr_waste | brsr_workforce, brsr_training, brsr_safety | brsr_csr, brsr_compliance |

Switching the toggle re-renders the entire `Sidebar` nav tree and resets the view to Summary. Each framework keeps **independent filter state** (`griFilters`, `sasbFilters`, `brsrFilters`) and independent KPI state (`environmentKpis`/`socialKpis`, `sasbKpis`, `brsrKpis`).

Most chart components are shared across frameworks via a `subTab` prop convention: `WaterCharts`, `WasteCharts`, `EnergyCharts`, `EmissionsCharts`, `SafetyCharts` each derive `isSasb`/`isBrsr` from the `subTab` id prefix and switch which filter object / chart-click handler they read from. A few components are framework-exclusive: `HazardousWasteCharts` and `ProcessSafetyCharts` (SASB-only), `DevelopmentCharts` (GRI-only), `BrsrWorkforceCharts`/`BrsrTrainingCharts`/`BrsrCsrCharts`/`BrsrComplianceCards` (BRSR-only).

`MainContent.jsx` keeps every visited sub-tab mounted in the DOM (`display:none` toggling) so re-visiting a tab doesn't re-fetch — this "mount once, hide/show" pattern must be preserved by any nav rewrite, since several sub-tabs (e.g. Safety, Water, Energy) are physically the same component instantiated multiple times with different `subTab` ids.

### 1.3 Reporting
- `Sidebar` has a single "Report Generator" nav item → `activeNav = 'report'` → renders `ReportGeneratorPanel`.
- `ReportGeneratorPanel` lets the user pick framework (GRI/SASB/BRSR), templates, year/FY, plant, and output format (CSV/Excel/PDF), then calls `POST /api/reports/generate` (GRI/SASB) or `POST /api/brsr/reports/generate` (BRSR).
- **The backend has zero persistence anywhere** (no DB, no files written) — confirmed by inspecting `backend/main.py` and all sibling `.py` modules. Reports are generated synchronously in-request and streamed straight to the browser as a download (`StreamingResponse`/`Response` with `Content-Disposition: attachment`). Nothing about a past report (filename, filters, timestamp) is retained server-side. **There is no "Report Library" today.**

### 1.4 Anomaly detection ("Alerts")
- `OutlierPanel.jsx` ("Anomaly Detection") is rendered **inline, per sub-tab**, at the top of every GRI/SASB-domain sub-tab's content (`MainContent.jsx` renders it next to `InsightsPanel` whenever `SUBTAB_DOMAIN[id]` resolves). It calls `GET /api/outliers/{domain}` for one domain at a time (`water`, `waste`, `safety`, `energy`, `emissions` only — SASB/BRSR domains are **not** covered by `_OUTLIER_CONFIG`).
- There is **no consolidated, cross-domain Alerts page** today — anomalies are only visible by visiting each sub-tab individually, and only for GRI domains.

### 1.5 Chat / AI Assistant
- `AiSidePanel.jsx` is a permanent flex sibling in `Dashboard.jsx`'s shell (380px wide when open, 44px collapsed rail when closed) — it is **not floating**, and it is visible on every screen including Summary and Report Generator, because it lives outside `MainContent` in the shell itself.
- `AiAssistantPanel.jsx` holds **one single conversation thread** in `chatHistory` (`AppContext` state) — lost on refresh or logout, no way to start a second concurrent thread, no list of past conversations.
- Backend `POST /api/ai/chat` is a stateless SSE stream: it accepts `chat_history` (last 6 messages) from the request body and replies token-by-token; it persists nothing server-side. **There is no "Chats / Conversations" screen and no backend chat storage today.**

### 1.6 Backend route inventory (all in `backend/main.py`)
Domain data/chart endpoints: `/api/environment/{water,waste,energy,ghg}`, `/api/social/{safety,development}`, `/api/sasb/{kpis,hazardous-waste,process-safety}`, `/api/brsr/{kpis,workforce,training,csr,config}`, plus legacy `/api/{water,waste,safety,energy,ghg}/*`.
Cross-cutting: `/api/filters`, `/api/insights/{domain}`, `/api/outliers/{domain}`, `/api/admin/cache-status`, `/api/health`.
Reports: `/api/reports/templates`, `/api/reports/generate`, `/api/brsr/reports/generate`.
Chat: `/api/chat` (legacy, non-streaming), `/api/ai/chat` (SSE streaming).

No authentication on the backend at all — `AUTH_CREDENTIALS` is a hardcoded frontend-only check (`config/auth.js`); the backend trusts every request. This matters for the new Chats/Conversations and Report Library features below, since "whose history is this" has no real identity concept today.

---

## 2. Decisions Confirmed (answered by stakeholder before this plan was finalized)

1. **Framework toggle vs. unified nav** → **Domain-first nav.** The left nav becomes one flat list per pillar (Environment: Water, Waste, Energy, GHG & Air Quality; Social: Workforce, Safety, Development; Governance: CSR, Ethics & Compliance) instead of three parallel trees. A GRI/SASB/BRSR toggle moves from the Sidebar into the content area (replacing/extending the current `FilterBar`) and changes which framework's calculation set is shown **for the currently selected domain**, without changing the nav structure itself.
2. **Governance scope** → Governance always renders the existing BRSR governance charts (`BrsrCsrCharts`, `BrsrComplianceCards`) regardless of the in-content framework toggle, since BRSR is the only framework with real governance data today. The framework toggle is hidden/disabled on the Governance screen (nothing to switch to).
3. **Chat persistence** → Backend-persisted, multi-thread. Add a lightweight backend store (SQLite) so conversations survive refresh/logout, support multiple named threads, and back a ChatGPT-style history list.
4. **Report Library** → Server-side file storage + metadata. Every generated report is saved to disk on the backend with a metadata record (timestamp, framework, templates, filters, format, filename); the Library lists and re-serves the actual stored file.

---

## 3. Domain Reconciliation (nav design detail)

This section resolves the asymmetry between frameworks now that the nav is domain-first rather than framework-first.

### Environment — 4 domains, all 3 frameworks map cleanly
| Nav item | GRI subTab | SASB subTab | BRSR subTab |
|---|---|---|---|
| Water | `water` | `sasb_water` | `brsr_water` |
| Waste | `waste` | `sasb_waste` *(hazardous-only — label clarifies "RT-CH-150 Hazardous Waste" when SASB selected)* | `brsr_waste` |
| Energy | `energy` | `sasb_energy` | `brsr_energy` |
| GHG & Air Quality | `emissions` | `sasb_ghg_air` | `brsr_ghg_air` |

### Social — 3 domains, one asymmetric case
| Nav item | GRI subTab | SASB subTab | BRSR subTab |
|---|---|---|---|
| Workforce | `workforce` | *(none — SASB has no workforce-demographics tab)* | `brsr_workforce` |
| Safety | `safety` | `sasb_safety` **+ an extra "Process Safety" block** (RT-CH-540a, today's `sasb_process_safety`) rendered only when the in-content toggle is set to SASB | `brsr_safety` |
| Development / Training | `development` | *(none)* | `brsr_training` |

Design call: rather than inventing a 4th Social nav item just for SASB's Process Safety (which has no GRI/BRSR counterpart), Process Safety becomes an **additional section inside the Safety screen**, shown only when the framework toggle = SASB. This keeps the nav flat and matches the existing component boundary (`ProcessSafetyCharts` stays a separate component, just conditionally mounted inside the Safety screen instead of getting its own sub-tab id). When Workforce or Development is opened with the toggle set to SASB (which has no data for either), the screen shows a clear "Not available under SASB — switch framework" empty state rather than blank charts.

### Governance — BRSR-only, per Decision #2
| Nav item | Source |
|---|---|
| CSR (P8) | `BrsrCsrCharts` (`brsr_csr`) |
| Ethics & Compliance (P1) | `BrsrComplianceCards` (`brsr_compliance`) |

---

## 4. Target Architecture

### 4.1 Left Navigation (new `Sidebar.jsx`)
```
[Logo / collapse toggle]

▸ Dashboards
   • Summary                  (default landing page)
   ▾ Environment
       Water · Waste · Energy · GHG & Air Quality
   ▾ Social
       Workforce · Safety · Development
   ▾ Governance
       CSR · Ethics & Compliance

• Alerts / Anomaly Detection

▸ Reports
   • Generate Report
   • Report Library

▸ Chats / Conversations
```
The GRI/SASB/BRSR toggle is **removed from the Sidebar**. "AI Assistant" is **not** a Sidebar item — it becomes a floating widget rendered at the `Dashboard.jsx` shell level (see 4.5), present on every screen except the Chats/Conversations screen.

### 4.2 Routing
Introduce `react-router-dom` (currently absent) so each top-level destination is a real URL, enabling deep links, browser back/forward, and a clean place to hide the floating AI widget by route match instead of by prop-threading:
```
/                          → redirect to /dashboards/summary
/dashboards/summary
/dashboards/environment/:domain   (water|waste|energy|ghg)
/dashboards/social/:domain        (workforce|safety|development)
/dashboards/governance/:domain    (csr|compliance)
/alerts
/reports                   → redirect to /reports/generate
/reports/generate
/reports/library
/chats                     → conversation list
/chats/:threadId           → open thread
/login                     (replaces the isAuthenticated boolean gate)
```
This is the single largest structural change in this plan — see Section 6, Phase 1 and the Risks section for why it's sequenced first and isolated.

### 4.3 Content-area framework toggle
Each Environment/Social domain screen renders a small `FrameworkToggle` (GRI/SASB/BRSR pill group) above its `FilterBar`, replacing the Sidebar's old toggle. Changing it updates which of `griFilters`/`sasbFilters`/`brsrFilters` the screen's chart component reads — i.e. the exact same `isSasb`/`isBrsr` branching that already exists inside `WaterCharts.jsx`/`EnergyCharts.jsx`/etc. today, just driven by a new piece of per-screen state instead of a `subTab` prefix.

### 4.4 Alerts / Anomaly Detection (new page)
A new top-level `AlertsPage.jsx` consolidates anomaly detection across **all** domains into one screen (grouped by Environment/Social, each domain a collapsible section reusing `OutlierPanel`'s row rendering). Two backend gaps must close first:
- `_OUTLIER_CONFIG` / `/api/outliers/{domain}` only covers GRI domains today — extend it (or add parallel SASB/BRSR configs) so the consolidated page isn't GRI-only.
- Add `GET /api/outliers` (no domain segment) that loops the existing per-domain logic across every domain and returns a combined, severity-sorted list, so the new page makes one call instead of 9.
`OutlierPanel` keeps existing inline on each domain screen too (still useful as in-context detail) — it is not removed, just supplemented by the consolidated view.

### 4.5 Reports
- `ReportGeneratorPanel.jsx` moves under `/reports/generate`, otherwise unchanged.
- New `ReportLibraryPage.jsx` lists past reports (date, framework, templates, format, filters) with a Download action per row and a Delete action (admin hygiene). Backed by new endpoints (Section 5).
- `/api/reports/generate` and `/api/brsr/reports/generate` change from "stream directly to client" to "generate → save to disk → record metadata → stream the same bytes back" (the user's current download experience is unchanged; the save is additive).

### 4.6 Chats / Conversations
- New `ChatsPage.jsx`: left column = thread list (new thread, rename, delete, search), right column = the existing message view (`AiAssistantPanel`'s message rendering is reused, not rewritten).
- `AppContext`'s single `chatHistory`/`addChatMessage`/`updateLastChatMessage`/`clearChatHistory` are replaced by thread-aware equivalents backed by the new chat API (Section 5) — this is a breaking change to the context shape, so every current consumer (`AiAssistantPanel.jsx`) must be updated in the same pass.

### 4.7 Floating AI Assistant
- `AiSidePanel.jsx` stops being a `Dashboard.jsx` flex sibling and becomes a fixed-position overlay (bottom-right FAB that expands to a panel), rendered once at the `Dashboard` (or `App`) level so it persists across route changes — except it must not render at all on `/chats/*` (the dedicated chat screen), per the explicit requirement.
- Floating panel and the Chats screen should be able to share the **same active thread** concept (opening the floating widget continues whatever thread was last active, rather than starting a disconnected conversation) — this needs the thread-aware context from 4.6 already in place, which is why Chat persistence (Phase 2) must land before the floating-widget rework (Phase 4).

---

## 5. Backend Changes Required

All new endpoints live in `backend/main.py` alongside the existing ones, following the existing pattern (no separate service layer exists today, so introducing one would be inconsistent with the codebase's current style).

### 5.1 Persistence layer (new)
- Add SQLite (via stdlib `sqlite3` or lightweight `sqlmodel`/`SQLAlchemy` — recommend stdlib `sqlite3` directly, to match the codebase's current zero-extra-framework style) — one new `backend/storage.db`, created on startup if absent.
- Two new tables: `chat_threads(id, title, created_at, updated_at)` + `chat_messages(id, thread_id, role, content, created_at)`; `generated_reports(id, created_at, framework, templates_json, year, fy, plant, format, filename, filepath)`.
- New `backend/reports_storage/` directory for saved report files (gitignored), analogous to how `data/` already holds source datasets.

### 5.2 Chat endpoints (new)
- `GET /api/chats` → list threads (id, title, updated_at, last message preview).
- `POST /api/chats` → create thread, returns id.
- `GET /api/chats/{id}` → full message history for a thread.
- `PATCH /api/chats/{id}` → rename.
- `DELETE /api/chats/{id}`.
- `POST /api/chats/{id}/messages` → append a user message, then stream the assistant reply via SSE (same Mistral-streaming logic as today's `/api/ai/chat`, but it now also persists both the user message and the streamed assistant message to `chat_messages` once the stream completes).
- `/api/ai/chat` (legacy stateless) can stay as-is for backward compatibility or be retired once the floating widget is migrated — recommend retiring it in the same PR that migrates the floating widget, to avoid maintaining two chat code paths.

### 5.3 Report Library endpoints (new)
- Modify `/api/reports/generate` and `/api/brsr/reports/generate`: after building the file buffer, write it to `reports_storage/`, insert a `generated_reports` row, then return the same `StreamingResponse` as today.
- `GET /api/reports/library` → list metadata rows, newest first.
- `GET /api/reports/library/{id}/download` → re-serve the stored file.
- `DELETE /api/reports/library/{id}` → remove row + file.

### 5.4 Alerts endpoints (extend existing)
- Extend `_OUTLIER_CONFIG` with SASB/BRSR domain entries (reusing the same loader functions already imported for those frameworks' chart endpoints).
- `GET /api/outliers` (new, no path param) → aggregate across every configured domain.

### 5.5 No changes needed
- All existing domain/chart/KPI/insights endpoints are untouched — this restructuring is navigation/shell-level, not a data-model change. (This is consistent with the user's instruction that this plan covers UI/UX and navigation only, not the chart/calculation logic already completed in prior work.)

---

## 6. Frontend File/Module Impact

### New files
- `frontend/src/router.jsx` (or inline in `App.jsx`) — route table per Section 4.2.
- `frontend/src/components/layout/FrameworkToggle.jsx` — extracted pill toggle, used inside each domain screen.
- `frontend/src/pages/AlertsPage.jsx`
- `frontend/src/pages/ReportsLayout.jsx` (tab shell for Generate/Library) — or fold into existing `ReportGeneratorPanel` wrapper.
- `frontend/src/components/reports/ReportLibraryPage.jsx`
- `frontend/src/pages/ChatsPage.jsx`
- `frontend/src/components/ai/ChatThreadList.jsx`
- `frontend/src/components/ai/FloatingAiWidget.jsx` (replaces `AiSidePanel.jsx`'s shell role)
- `frontend/src/api/chatsClient.js` / extend `api/client.js` with `getChatThreads`, `createChatThread`, `getChatThread`, `renameChatThread`, `deleteChatThread`, `streamChatMessage`, `getReportLibrary`, `downloadLibraryReport`, `deleteLibraryReport`, `getAllOutliers`.

### Modified files
- `App.jsx` — gains the router; auth gate becomes a route guard (`/login` route + redirect) instead of a top-level boolean branch.
- `pages/Dashboard.jsx` — becomes the router's layout route (`TopBar` + `Sidebar` + `<Outlet/>` + `FloatingAiWidget`), no longer hardcodes `MainContent`/`AiSidePanel`.
- `components/layout/Sidebar.jsx` — full rewrite of the nav tree per Section 4.1; framework toggle removed; "Alerts", "Reports" (2 children), "Chats" added; section metadata collapses GRI/SASB/BRSR maps into one domain-first map.
- `components/layout/MainContent.jsx` — logic splits across the new route components; the "keep every visited sub-tab mounted" pattern needs to be reproduced per domain screen (e.g. via the router's own component instances, or kept as an internal cache inside each domain page) — **this is the trickiest single piece of the migration**, flagged again in Risks.
- `context/AppContext.jsx` — remove `framework`/`setFramework` (replaced by per-screen `FrameworkToggle` local/URL state), remove `activeNav`/`activeMainTab`/`activeSubTab`/`selectSubTab`/`selectSummary`/`selectReport` (replaced by router state), replace `chatHistory` + 3 chat callbacks with thread-aware equivalents, keep `griFilters`/`sasbFilters`/`brsrFilters` and all cross-filter logic as-is (orthogonal to navigation).
- `components/ai/AiSidePanel.jsx` → becomes `FloatingAiWidget.jsx` (fixed positioning, hidden on `/chats/*`).
- `components/ai/AiAssistantPanel.jsx` — message-list/input rendering reused by both the floating widget and `ChatsPage`; needs a `threadId` prop instead of relying solely on global `chatHistory`.
- `components/reports/ReportGeneratorPanel.jsx` — drop the page-wrapper assumption (`report-page-wrapper` div currently added by `MainContent.jsx`), becomes a route component directly.
- `components/summary/SummaryPage.jsx` — its per-card "click → open sub-tab" navigation (`selectSubTab` calls) becomes `navigate('/dashboards/environment/water')`-style router calls; otherwise unchanged.
- Every chart component currently branching on `subTab.startsWith('sasb_'/'brsr_')` (`WaterCharts`, `WasteCharts`, `EnergyCharts`, `EmissionsCharts`, `SafetyCharts`) — branching condition changes from a `subTab` prefix to the new `FrameworkToggle` value, passed down as a `framework` prop instead of `subTab`.
- `globals.css` — remove `.ai-side-panel` flex-sibling rules, add floating-widget (`position: fixed`, FAB + expand animation) rules; `.dashboard-shell` no longer needs to reserve AI-panel width.
- `package.json` — add `react-router-dom` dependency.

### Unaffected
- All chart-internals (datasets, colors, ChartCard usage), KPI cards, FilterBar's filter-dropdown logic, InsightsPanel, OutlierPanel's row rendering (reused, not rewritten), every backend domain/chart endpoint, all dataset generators.

---

## 7. Phasing

**Phase 0 — Routing foundation** *(prerequisite for everything else)*
Add `react-router-dom`, introduce the route table, convert `App.jsx`/`Dashboard.jsx` to router-driven layout, migrate `activeNav`/`activeMainTab`/`activeSubTab` state to URL params with no visible behavior change yet (old Sidebar still works, just navigates via routes instead of state). Validation: every existing sub-tab reachable, refresh-and-still-on-same-screen now works (it didn't before), browser back/forward works.

**Phase 1 — Sidebar & domain-first nav**
Rewrite `Sidebar.jsx` per Section 4.1, build `FrameworkToggle.jsx`, thread it into the 5 shared chart components, fold SASB/BRSR-exclusive sub-tab handling per Section 3 (Process Safety nested in Safety, Workforce/Development empty-states for SASB). Validation: every domain/framework combination from the old 3-tree structure is still reachable and shows the same data as before, just through the new nav.

**Phase 2 — Chat persistence backend**
Add SQLite storage, the 6 new `/api/chats*` endpoints, migrate `/api/ai/chat`'s streaming logic to persist messages. No frontend change yet — verify via direct API calls (curl/Postman) that threads/messages round-trip correctly.

**Phase 3 — Chats / Conversations page + AppContext migration**
Build `ChatsPage.jsx` + `ChatThreadList.jsx`, migrate `AppContext` chat state to thread-aware, update `AiAssistantPanel.jsx` to take a `threadId`. Validation: create/rename/delete threads, switch between threads, history survives a refresh.

**Phase 4 — Floating AI widget**
Convert `AiSidePanel.jsx` → `FloatingAiWidget.jsx`, wire it to share the active thread with Phase 3's context, hide it on `/chats/*`. Validation: widget appears on Summary/Environment/Social/Governance/Alerts/Reports, disappears only on Chats, continuing a conversation in the widget and then opening Chats shows the same thread.

**Phase 5 — Alerts page**
Extend `_OUTLIER_CONFIG` for SASB/BRSR, add `GET /api/outliers`, build `AlertsPage.jsx`. Validation: counts/severities on the consolidated page match the sum of what each domain's existing inline `OutlierPanel` shows.

**Phase 6 — Report Library**
Add `generated_reports` table + `reports_storage/`, modify both generate endpoints to persist, add the 3 library endpoints, build `ReportLibraryPage.jsx`. Validation: generate a report, confirm it appears in the Library, confirm re-download from the Library byte-matches the original download.

**Phase 7 — Governance section + cleanup**
Wire `/dashboards/governance/{csr,compliance}` to the existing BRSR components per Decision #2, remove now-dead `AppContext` fields (`framework`, `selectSubTab`, etc.) and dead CSS, full regression pass across all phases together.

### Dependencies between phases
Phase 1 depends on Phase 0. Phase 3 depends on Phase 2. Phase 4 depends on Phase 3 (shared-thread requirement). Phases 5 and 6 are independent of each other and of 2–4, and could run in parallel with Phase 1 if resourced separately. Phase 7 depends on everything before it (final cleanup pass).

---

## 8. Risks & Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| Loss of "mount once, keep alive" tab behavior | `MainContent.jsx`'s current pattern avoids re-fetching when switching back to a previously visited sub-tab; naive router migration (unmount/remount per route) would reintroduce a refetch-on-every-click regression | Each domain page component keeps its own "visited sub-states" cache the same way `MainContent.jsx` does today (per-domain, not global), or evaluate `react-router`'s `<Outlet/>` persistence patterns / keep-alive libraries before committing |
| `AppContext` breaking change is large and crosses many files | `framework`, `activeNav`/`activeMainTab`/`activeSubTab`, and all chat state are read by most chart/nav/AI components | Sequence as separate phases (0–1 for nav, 2–4 for chat) rather than one big-bang change; keep `griFilters`/`sasbFilters`/`brsrFilters` untouched throughout to shrink the diff surface |
| No backend auth/identity | New chat threads and report history have no real "user" concept — today's login is a shared hardcoded credential, not a per-user account | Out of scope for this plan per the user's framing (UI/UX + nav only); flag explicitly that "Conversations" and "Report Library" will be **shared across anyone who logs in** until real auth exists — acceptable for a single-tenant demo, not for multi-user production |
| SQLite file as new backend state | The backend has been purely stateless/computed-on-read until now; this introduces the project's first piece of mutable server state needing backup/migration thinking | Keep the DB file inside a gitignored path, document it as ephemeral/demo-grade explicitly, no migration framework needed at this scale (manual `CREATE TABLE IF NOT EXISTS` at startup is sufficient) |
| Extending `_OUTLIER_CONFIG` to SASB/BRSR may surface very noisy or meaningless anomalies | SASB/BRSR domains reuse GRI's underlying datasets in some cases (e.g. BRSR P6 reuses GRI water/energy/waste data) — running outlier detection on the same data twice under two domain labels could produce duplicate-looking alerts | When extending configs, audit which SASB/BRSR domains are genuinely distinct datasets (e.g. SASB hazardous waste, BRSR P3 workforce) vs. reused GRI data, and dedupe the consolidated Alerts page accordingly rather than naively unioning all configs |
| `react-router-dom` is a brand-new dependency | Zero routing exists today; this is the single biggest "new concept" introduced | Pin to the current stable major version, keep route definitions flat/shallow (no nested layouts beyond Dashboard → page), and treat Phase 0 as its own reviewable PR before any nav-visible change ships |

---

## 9. Validation Approach (per phase, summarized)
- **Manual click-through parity check** after Phase 1: every sub-tab combination reachable today (3 frameworks × their sub-tabs) must still be reachable and show identical chart output through the new nav — this is the most important regression gate since it's a full nav rewrite of working functionality.
- **API-level testing** for new persistence endpoints (Phase 2, 6) via direct HTTP calls before any frontend wiring, since there's no existing test suite to extend (confirmed: no `tests/` directory in either `frontend/` or `backend/`).
- **Build check**: `npm run build` (frontend) after every phase, consistent with how validation was done for the prior chart-wiring work in this codebase.
- **Cross-browser refresh test**: since Phase 0 changes refresh behavior (URL-addressable state vs. always-reset-to-Summary), explicitly test refreshing mid-navigation on each new route.
