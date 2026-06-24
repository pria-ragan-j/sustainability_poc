# ESG Dashboard — Implementation Plan

**Date**: 2026-06-23  
**Status**: Draft — pending review and clarification responses  
**Scope**: Four enhancement tracks across the existing ESG Dashboard application  
**Author note**: This document is analysis-only. No code changes have been made.

---

## Table of Contents

1. [Current State Snapshot](#1-current-state-snapshot)
2. [Feature 1 — Correlation & Multivariate Analysis](#2-feature-1--correlation--multivariate-analysis)
3. [Feature 2 — Centralized Alerts & Anomaly Management](#3-feature-2--centralized-alerts--anomaly-management)
4. [Feature 3 — AI Assistant Investigation & Fix Plan](#4-feature-3--ai-assistant-investigation--fix-plan)
5. [Feature 4 — Separated Chat vs Context-Aware AI Assistant](#5-feature-4--separated-chat-vs-context-aware-ai-assistant)
6. [Cross-Feature Dependencies & Sequencing](#6-cross-feature-dependencies--sequencing)
7. [Open Questions & Clarifications Required](#7-open-questions--clarifications-required)
8. [Risk Register](#8-risk-register)
9. [Effort Estimates](#9-effort-estimates)

---

## 1. Current State Snapshot

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)  http://localhost:3000                 │
│                                                                 │
│  AppContext (global state)                                      │
│  ├── framework: GRI | SASB | BRSR                              │
│  ├── griFilters / sasbFilters / brsrFilters                    │
│  ├── activeThreadId, aiPanelOpen                               │
│  └── environmentKpis, socialKpis, sasbKpis                    │
│                                                                 │
│  Pages                                                          │
│  ├── SummaryPage      → KPI overview + framework toggle        │
│  ├── DomainsPage      → charts + OutlierPanel per domain       │
│  ├── AlertsPage       → global anomaly feed (read-only)        │
│  ├── ChatsPage        → thread list + AiAssistantPanel         │
│  └── ReportsPage      → report builder                         │
│                                                                 │
│  Components                                                     │
│  ├── OutlierPanel     → per-domain anomalies (embedded)        │
│  ├── AiAssistantPanel → chat UI (used in both Chats + FAB)    │
│  └── FloatingAiWidget → FAB overlay (same AiAssistantPanel)   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP / SSE
┌────────────────────────────▼────────────────────────────────────┐
│  Backend (FastAPI + Python)  http://localhost:8000              │
│                                                                 │
│  Data Layer                                                     │
│  ├── Excel files  (9 datasets, 2019–2025, in-memory cached)   │
│  └── SQLite  (reports.db → chat threads, report library)      │
│                                                                 │
│  Key Endpoints                                                  │
│  ├── /api/{domain}/kpis, /api/{domain}/{metric}               │
│  ├── /api/outliers, /api/outliers/{domain}                    │
│  ├── /api/ai/chat  (SSE streaming, Mistral large)             │
│  ├── /api/chats  (CRUD for chat threads)                      │
│  └── /api/reports/*  (generate, library, download)            │
└─────────────────────────────────────────────────────────────────┘
```

### Key Technical Facts (referenced throughout this plan)

| Item | Current Value | File / Line |
|------|--------------|-------------|
| Anomaly threshold (low) | ≥ 12% YoY | `main.py:2660` |
| Anomaly threshold (medium) | ≥ 25% YoY | `main.py:2662` |
| Anomaly threshold (high) | ≥ 50% YoY | `main.py:2662` |
| Detection window | 5 most-recent years | `main.py:2645` |
| Anomalies returned | Top 6 per domain | `main.py` |
| LLM Model | `mistral-large-latest` | `main.py:2997` |
| LLM Temperature | `0.3` | `main.py:2997` |
| LLM Max tokens | `1024` | `main.py:2997` |
| LLM API base URL | `https://api.mistral.ai/v1/chat/completions` | `main.py:41` |
| API key source | `backend/.env → MISTRAL_API_KEY` | `main.py:40` |
| Chat persistence | SQLite (`reports.db`) | `storage.py` |
| Chart library | Recharts (primary) | `package.json` |
| Data source | Excel files (9 datasets) | `backend/data/` |
| Correlation analysis | **None** | — |
| Anomaly acknowledgement | **None** | — |
| Threshold configuration UI | **None** | — |

---

## 2. Feature 1 — Correlation & Multivariate Analysis

### 2.1 Current State

There is **no correlation or multivariate analysis anywhere** in the current codebase — no scatter plots, no heatmaps, no cross-metric regression, and no backend correlation endpoint. Anomaly detection is purely univariate (single-metric YoY % change).

The data foundation is strong: all five GRI environmental domains (Water, Waste, Energy, GHG, Safety) are backed by complete 2019–2025 datasets, all indexed by the same `Year` and `Plant` dimensions. This makes cross-domain correlation feasible without any new data collection.

### 2.2 Recommended Analysis Types (Priority Order)

#### Tier 1 — High business value, straightforward to implement

| Analysis | Metric A | Metric B | Business Question |
|----------|----------|----------|-------------------|
| Water–Energy nexus | Water Withdrawn (ML) | Total Energy Consumed (GJ) | Does water-intensive processing drive energy spikes? |
| Energy–Emissions coupling | Energy Consumed (GJ) | Scope 1 GHG (tCO₂e) | Is GHG proportional to energy, or is there decoupling? |
| Safety–Training effectiveness | Recordable Injuries (count) | Training Hours (h) | Does more training correlate with fewer incidents? |
| Waste–Production loading | Waste Generated (tonnes) | Energy Consumed (GJ) as production proxy | Does higher throughput proportionally increase waste? |
| Water–Waste intensity | Water Consumed (ML) | Waste Generated (tonnes) | Do water-heavy processes also generate more waste? |

#### Tier 2 — Higher implementation complexity, higher insight value

| Analysis | Type | Description |
|----------|------|-------------|
| Multi-metric anomaly scoring | Multivariate outlier | Flag a plant-year where two or more correlated metrics spike together — stronger evidence of operational event than a single-metric anomaly |
| Plant clustering | K-means (k=3–5) | Group plants by environmental performance profile across 5 KPIs; identify "high performer" vs "needs improvement" clusters |
| Scope 1 decomposition | Multiple regression | Scope 1 = f(energy mix, process emissions, plant size) — which factor drives GHG most per plant? |
| Leading indicator analysis | Time-lagged correlation | Do safety observation counts in Year N predict injury rates in Year N+1? (12-month lag check) |

#### Tier 3 — Exploratory, data-permitting

| Analysis | Description |
|----------|-------------|
| Seasonal pattern detection | Identify months where specific plants consistently spike on water or waste |
| Benchmark deviation | Compare each plant's performance against the company average for all 5 KPIs simultaneously |

### 2.3 Architecture Impact

#### 2.3.1 Backend Changes Required

**New endpoint: `/api/correlate`**

```
GET /api/correlate
Query params:
  domain_x   : water | waste | energy | emissions | safety
  metric_x   : <kpi_id within that domain>
  domain_y   : water | waste | energy | emissions | safety
  metric_y   : <kpi_id within that domain>
  level      : plant | year  (aggregate or time-series view)
  plant      : all | <plant_name>
  year_from  : int
  year_to    : int

Response:
  {
    "points": [
      {"label": "Plant A / 2023", "x": 1234.5, "y": 456.7},
      ...
    ],
    "pearson_r": 0.87,
    "pearson_p": 0.003,
    "spearman_r": 0.81,
    "regression": {"slope": 0.42, "intercept": 12.3, "r_squared": 0.76},
    "interpretation": "Strong positive correlation..."
  }
```

**New endpoint: `/api/correlate/matrix`**

```
GET /api/correlate/matrix
Query params:
  domains    : comma-separated list (e.g., "water,energy,emissions,waste,safety")
  plant      : all | <plant_name>
  year_from  : int
  year_to    : int

Response:
  {
    "metrics": ["Water Withdrawn", "Energy Consumed", "Scope 1 GHG", ...],
    "matrix": [[1.0, 0.87, 0.91, ...], [0.87, 1.0, 0.95, ...], ...],
    "p_values": [[0.0, 0.003, 0.001, ...], ...],
    "sample_size": 42
  }
```

**New endpoint: `/api/cluster/plants`**

```
GET /api/cluster/plants
Query params:
  metrics    : comma-separated KPI IDs
  k          : int (number of clusters, default 3)
  year       : int | "all"

Response:
  {
    "clusters": [
      {"id": 0, "label": "High Efficiency", "plants": ["Plant A", "Plant C"], "centroid": {...}},
      {"id": 1, "label": "Mid Tier", "plants": ["Plant B", "Plant E"], "centroid": {...}},
      ...
    ],
    "pca_points": [
      {"plant": "Plant A", "cluster": 0, "pc1": 1.23, "pc2": -0.45},
      ...
    ]
  }
```

**New Python libraries needed (backend):**

```
scipy        # Pearson/Spearman correlation, p-values
scikit-learn # K-means clustering, PCA
```

Both are compatible with the existing FastAPI/pandas/numpy stack.

#### 2.3.2 Frontend Changes Required

**New component: `CorrelationScatterChart.jsx`**

- Recharts `<ScatterChart>` (already available in Recharts — no new library needed)
- X-axis: Metric A, Y-axis: Metric B
- Dot label: plant name or year
- Color-coded by cluster assignment (Tier 2) or by plant (Tier 1)
- Regression trend line overlay (computed from backend `regression` field)
- Tooltip: exact X/Y values + label

**New component: `CorrelationHeatmap.jsx`**

- CSS Grid or SVG-based heatmap (Recharts has no native heatmap)
- Color scale: red (strong negative) → white → green (strong positive)
- Cell value: Pearson r displayed as number
- Cell tooltip: r value + p-value + sample size
- Click a cell → opens the scatter plot for that metric pair

**New component: `CorrelationPanel.jsx`**

- Collapsible panel (same pattern as `OutlierPanel`)
- Contains: metric selector dropdowns, chart area, interpretation text
- Placed below `OutlierPanel` in each domain page
- Mode toggle: "Scatter" vs "Correlation Matrix"

**New page or tab: Insights (optional)**

- Standalone route `/dashboards/insights` showing the full cross-domain correlation matrix
- Plant clustering visualization (PCA 2D scatter + cluster legend)

### 2.4 Impacted Existing Files

| File | Change Type | Reason |
|------|-------------|--------|
| `backend/main.py` | Add 3 new endpoints | `/api/correlate`, `/api/correlate/matrix`, `/api/cluster/plants` |
| `frontend/src/api/client.js` | Add 3 new API calls | `getCorrelation()`, `getCorrelationMatrix()`, `getPlantClusters()` |
| `frontend/src/pages/DomainsPage.jsx` | Add `<CorrelationPanel>` | Render below `<OutlierPanel>` for each domain |
| `frontend/src/constants/domainMap.js` | Add `CORRELATION_METRICS` map | List of correlatable KPIs per domain for the picker dropdowns |
| `backend/requirements.txt` | Add scipy, scikit-learn | New Python dependencies |

**New files to create:**

```
frontend/src/components/shared/CorrelationPanel.jsx
frontend/src/components/shared/CorrelationScatterChart.jsx
frontend/src/components/shared/CorrelationHeatmap.jsx
frontend/src/pages/InsightsPage.jsx  (optional Tier 2)
```

### 2.5 UI/UX Considerations

- **Discovery**: The CorrelationPanel should be collapsed by default (same as OutlierPanel) so it doesn't overwhelm users who haven't opted in to deeper analysis.
- **Context-awareness**: When opened from the Water domain, one metric picker pre-selects "Water Withdrawn" and the other offers related domains as defaults — user doesn't have to start from scratch.
- **Interpretation text**: The backend response's `interpretation` field gives a plain-English summary (e.g., "Strong positive correlation: r=0.87, p<0.01 — Water withdrawal and energy consumption move together across plants and years"). This text renders below the chart so non-technical users gain value without reading the statistics.
- **Statistical significance**: Correlations with p > 0.05 should show a visual warning ("Weak evidence — not statistically significant with this dataset size") to avoid misleading decision-makers.
- **Minimum data guard**: When fewer than 10 data points are available (e.g., single plant + short year range), disable correlation analysis with an explanation tooltip.

### 2.6 Implementation Phases

**Phase 1 — Backend correlation engine (no UI)**
- `/api/correlate` endpoint (Pearson + Spearman, regression line)
- Data stitching logic: join water + energy DataFrames on Plant × Year
- Unit tests for correlation math

**Phase 2 — Scatter chart in Water domain**
- `CorrelationScatterChart` component
- `CorrelationPanel` (single pair picker, Water dashboard only)
- Wire to Water × Energy correlation as the first use case

**Phase 3 — Generalize to all domains**
- Parameterize `CorrelationPanel` for all 5 domains
- Dynamic metric picker driven by `CORRELATION_METRICS` map

**Phase 4 — Correlation matrix (optional)**
- `/api/correlate/matrix` endpoint
- `CorrelationHeatmap` component
- Full insights page

**Phase 5 — Plant clustering (optional Tier 2)**
- `/api/cluster/plants` endpoint with K-means + PCA
- 2D scatter visualization

---

## 3. Feature 2 — Centralized Alerts & Anomaly Management

### 3.1 Current State

**What exists:**
- `OutlierPanel.jsx` — embedded collapsible panel inside each domain page (`DomainsPage.jsx`). Shows top 6 anomalies for that domain.
- `AlertsPage.jsx` — standalone `/alerts` route. Aggregates anomalies across all 5 GRI domains, with severity filter tabs (All / High / Medium / Low).
- Backend: `GET /api/outliers/{domain}` and `GET /api/outliers` — compute univariate YoY % change, return anomalies with severity, metric, plant, year, value, prev_value, description.

**What does NOT exist:**
- No threshold configuration UI (all thresholds hardcoded in `main.py:2660-2662`)
- No acknowledgement / dismiss / resolve workflow
- No filtering by metric name or by plant in AlertsPage (only severity filter exists)
- No historical tracking — each page load recomputes from raw data (no stored anomaly history)
- No alert notification system (no email, webhook, or in-app badge)
- No SASB or BRSR anomaly detection — only the 5 GRI domains are covered
- OutlierPanel is **embedded per domain** rather than feeding into the centralized Alerts page

### 3.2 Centralization Design

The core UX goal: **AlertsPage becomes the single place for all anomaly-related activity.** The per-domain `OutlierPanel` remains on domain pages as a "preview" (collapsed by default, showing count only), with a "View all alerts" link to AlertsPage filtered to that domain.

```
Current flow:
  Each domain page → OutlierPanel (6 anomalies, isolated)
  AlertsPage       → all anomalies, read-only

Target flow:
  Each domain page → OutlierPanel "preview" (count badge + top 1-2, collapsed)
                     → "View in Alerts" link (navigates to AlertsPage filtered to domain)
  AlertsPage       → ALL anomaly management:
                     - Multi-filter: domain, metric, plant, severity, status
                     - Acknowledge / resolve workflow
                     - Threshold config panel
                     - Historical log
```

### 3.3 Threshold Configuration

#### Current Hard-coded Values (from `main.py:2660-2662`):

```python
if abs(chg) < 12:
    continue                  # LOW threshold — below this, not flagged at all
severity = "high"  if abs(chg) >= 50 else \
           "medium" if abs(chg) >= 25 else \
           "low"
```

| Severity Level | Current Threshold | Configurable per domain? |
|----------------|-----------------|--------------------------|
| Low | ≥ 12% | No |
| Medium | ≥ 25% | No |
| High | ≥ 50% | No |
| Not flagged | < 12% | No |

#### Recommended Threshold Configuration Architecture

**Option A — Global thresholds (simpler):** Single set of thresholds applies to all domains and metrics. Stored in a small SQLite config table. UI: settings panel in AlertsPage.

**Option B — Per-domain thresholds (more granular):** Each domain (water, waste, energy, emissions, safety) has its own low/medium/high thresholds. Rationale: a 15% spike in fatality-related safety metrics warrants "high" severity; a 15% change in water withdrawal may be seasonal and only warrant "low". This is the preferred option.

**New backend endpoint for threshold config:**

```
GET  /api/alerts/config
Response: {
  "global": { "low": 12, "medium": 25, "high": 50 },
  "domains": {
    "water":     { "low": 10, "medium": 20, "high": 40 },
    "waste":     { "low": 12, "medium": 25, "high": 50 },
    "safety":    { "low": 8,  "medium": 15, "high": 30 },
    "energy":    { "low": 12, "medium": 25, "high": 50 },
    "emissions": { "low": 12, "medium": 25, "high": 50 }
  }
}

PUT  /api/alerts/config
Body: same shape as GET response
```

Stored in SQLite (`reports.db`) — a new `alert_config` table (one row per domain).

**Backend impact:** `_OUTLIER_CONFIG` and the severity logic in `main.py:2660-2662` need to read from the database config table instead of being hardcoded. Thresholds are loaded on each request (or cached with a short TTL, e.g., 60s).

### 3.4 Acknowledgement Workflow

**New concept: Alert Status**

Each anomaly will carry a status. Because anomalies are computed from live data (not pre-stored), status is tracked separately as an override table:

```
Table: alert_acks
  id          : TEXT  (primary key — composite of domain+metric+plant+year)
  status      : TEXT  (acknowledged | resolved | ignored)
  note        : TEXT  (optional user comment)
  user        : TEXT  (username if multi-user in future)
  updated_at  : REAL  (Unix timestamp)
```

The anomaly ID is deterministic: `"water:water-withdrawn:PlantA:2024"` — so when the same data point is flagged again in the future, the same ack record applies.

**New backend endpoints:**

```
GET  /api/alerts                       → all anomalies across all domains (with status from ack table)
GET  /api/alerts?domain=water          → filtered to domain
GET  /api/alerts?severity=high         → filtered to severity
GET  /api/alerts?status=open           → unacknowledged only

POST /api/alerts/{alertId}/acknowledge
Body: { "note": "Planned maintenance — not an incident" }

POST /api/alerts/{alertId}/resolve
Body: { "note": "Root cause identified and fixed" }

POST /api/alerts/{alertId}/ignore
Body: { "note": "Seasonal variation — expected" }

DELETE /api/alerts/{alertId}/ack       → reset to open
```

### 3.5 Historical Tracking

**Problem:** Current anomaly detection is purely on-demand — it re-computes from raw Excel data every time the API is called. There is no concept of "an anomaly that existed last month but doesn't this month."

**Option A — Snapshot on demand (lightweight):** Each time `/api/alerts` is called, the computed anomalies are stored in a new `alert_snapshots` table with a timestamp. AlertsPage can show a "History" view comparing today's anomalies vs those from 7/14/30 days ago. No background jobs needed.

**Option B — Scheduled snapshots (richer, more complex):** A background task (APScheduler or cron) runs nightly, stores the full anomaly set with timestamp. This enables proper historical trending even if the user never opened AlertsPage.

**Recommendation:** Start with Option A (snapshot on demand) since it requires no background jobs and the data refreshes when users actually use the tool. Option B can be added later.

**New SQLite table:**

```
Table: alert_history
  id          : TEXT  (UUID)
  alert_id    : TEXT  (same deterministic key as ack table)
  domain      : TEXT
  metric      : TEXT
  plant       : TEXT
  year        : INT
  severity    : TEXT
  change_pct  : REAL
  captured_at : REAL  (Unix timestamp — when this snapshot was taken)
```

### 3.6 AlertsPage Enhanced Layout

```
┌─────────────────────────────────────────────────────┐
│  Alerts & Anomaly Management                        │
│                                                     │
│  [Filter: Domain ▼] [Metric ▼] [Plant ▼]           │
│  [Severity: All | High | Medium | Low]              │
│  [Status: All | Open | Acknowledged | Resolved]     │
│                          [⚙ Threshold Config]       │
├─────────────────────────────────────────────────────┤
│  OPEN  (14)  │  ACKNOWLEDGED  (6)  │  RESOLVED  (3) │
├─────────────────────────────────────────────────────┤
│  ● HIGH   Water Withdrawn — Plant A — 2024          │
│            +52.3% YoY  (1,100 ML → 1,672 ML)       │
│            [View Dashboard] [Acknowledge] [Ignore]  │
│                                                     │
│  ● HIGH   Scope 1 GHG — Plant B — 2024             │
│            +61.1% YoY  (8,450 → 13,614 tCO₂e)     │
│            [View Dashboard] [Acknowledge] [Ignore]  │
│                                                     │
│  ● MED    Waste Generated — Plant C — 2024          │
│            +27.8% YoY  (234 → 299 tonnes)          │
│            [View Dashboard] [Acknowledge] [Ignore]  │
└─────────────────────────────────────────────────────┘

Threshold Configuration Panel (slide-out or modal):
┌──────────────────────────────────────┐
│  Anomaly Thresholds                  │
│                                      │
│  Domain: [Water       ▼]             │
│                                      │
│  Low severity    ≥ [ 10 ]%           │
│  Medium severity ≥ [ 20 ]%           │
│  High severity   ≥ [ 40 ]%           │
│                                      │
│  [Reset to defaults] [Save]          │
└──────────────────────────────────────┘
```

### 3.7 OutlierPanel (Per-Domain) — Revised Role

The existing `OutlierPanel.jsx` changes from a full view to a "summary badge":

- Shows only a count ("3 anomalies detected") and severity distribution bar
- Collapsed by default
- "View all → Alerts" link navigates to AlertsPage pre-filtered to this domain
- No inline acknowledge/resolve actions (those stay in AlertsPage)

This change keeps domain pages focused on charts and KPIs, while giving anomaly management a proper home.

### 3.8 Impacted Files

| File | Change Type | Reason |
|------|-------------|--------|
| `backend/main.py` | Modify + add endpoints | Threshold config read from DB, new `/api/alerts/*` endpoints |
| `backend/storage.py` | Add 3 new tables | `alert_config`, `alert_acks`, `alert_history` |
| `frontend/src/pages/AlertsPage.jsx` | Major rewrite | Add filters, status tabs, ack buttons, threshold panel |
| `frontend/src/components/shared/OutlierPanel.jsx` | Simplify | Convert from full list to count badge + link |
| `frontend/src/api/client.js` | Add new calls | `getAlerts()`, `ackAlert()`, `resolveAlert()`, `getAlertConfig()`, `updateAlertConfig()` |

---

## 4. Feature 3 — AI Assistant Investigation & Fix Plan

### 4.1 Root Cause Analysis

The AI assistant infrastructure is fully implemented in code. The failure is almost certainly one of the following causes, ordered by probability:

#### Cause 1 — Missing or invalid `MISTRAL_API_KEY` (Highest probability)

**Evidence:** `backend/main.py` line 2964:
```python
if not MISTRAL_API_KEY:
    yield _sse({"token": "AI Assistant is not configured. Please set MISTRAL_API_KEY."})
    return
```

If the `.env` file at `backend/.env` is missing, empty, or contains an expired/revoked key, the user sees "AI Assistant is not configured" — which looks like the assistant "is not functioning."

**Verification steps:**
1. Check `backend/.env` — does `MISTRAL_API_KEY=...` exist and have a non-empty value?
2. Test the key directly: `curl https://api.mistral.ai/v1/models -H "Authorization: Bearer <key>"`
3. If the key returns 401: key is expired or incorrect.
4. If the key returns 200: key is valid — the problem is elsewhere.

**Fix:** Obtain a valid Mistral API key from https://console.mistral.ai, set it in `backend/.env`:
```
MISTRAL_API_KEY=<new_key_here>
```
Restart the backend (`uvicorn main:app --reload`).

#### Cause 2 — Backend server not running or wrong port

**Evidence:** The frontend `api/client.js` calls `http://localhost:8000`. If the backend isn't running, all API calls fail silently or show a generic network error.

**Verification:** `curl http://localhost:8000/api/health` — should return `{"status": "ok"}`.

**Fix:** Start the backend: `cd backend && uvicorn main:app --reload --port 8000`

#### Cause 3 — SSE streaming silently failing in browser

**Evidence:** The `/api/ai/chat` endpoint returns `text/event-stream`. Some browser configurations, proxies, or fetch wrappers break SSE.

**Verification:**
1. Open browser DevTools → Network tab
2. Send a chat message
3. Inspect the `/api/ai/chat` request:
   - Does it reach the backend? (check backend terminal logs)
   - Does the response type show `text/event-stream`?
   - Are individual `data: {...}` events appearing in the EventStream tab?

**Fix options:**
- If the request never reaches the backend: CORS issue (check `backend/main.py` CORS config)
- If streaming works but UI doesn't update: bug in `AiAssistantPanel.jsx`'s stream reader

#### Cause 4 — CORS misconfiguration

**Evidence:** If the backend's `CORSMiddleware` configuration excludes `http://localhost:3000`, the browser blocks the SSE connection.

**Verification:** Check `main.py` CORS setup — look for `allow_origins` configuration. It should include `["*"]` or explicitly list `http://localhost:3000`.

**Fix:** Add `http://localhost:3000` to the allowed origins list.

#### Cause 5 — Mistral API quota exhausted

**Evidence:** Mistral free/trial plans have token and request rate limits. If the quota is exhausted, the API returns 429 or 402, which the backend currently handles by propagating the error as an SSE token.

**Verification:** Check `https://console.mistral.ai` dashboard for quota usage.

**Fix:** Upgrade plan, or switch to a different model (`mistral-small-latest` uses fewer tokens).

#### Cause 6 — AiAssistantPanel context detection failure

**Evidence:** `AiAssistantPanel.jsx` uses a `useDashboardContext` hook that parses the URL to detect the current domain. If this hook throws an error or returns bad state, the panel may fail to render.

**Verification:** Open browser DevTools → Console. Check for React component errors when opening the AI panel.

### 4.2 Diagnostic Checklist

Before any code changes, run through this checklist in order:

```
□ 1. Is backend running?
      curl http://localhost:8000/api/health

□ 2. Is MISTRAL_API_KEY set?
      type backend\.env   (Windows) or cat backend/.env (Linux/Mac)

□ 3. Is the key valid?
      curl https://api.mistral.ai/v1/models \
        -H "Authorization: Bearer <key_from_env>"

□ 4. Can the frontend reach the backend?
      In browser: fetch("http://localhost:8000/api/health")
                     .then(r=>r.json()).then(console.log)

□ 5. Does the /api/ai/chat endpoint respond?
      curl -X POST http://localhost:8000/api/ai/chat \
        -H "Content-Type: application/json" \
        -d '{"message":"hello","tab":"environment"}'
      → should return streaming SSE data

□ 6. Any browser console errors when opening AI panel?
      DevTools → Console → filter by "Error"

□ 7. Does the SSE stream appear in DevTools?
      DevTools → Network → filter "ai/chat" → EventStream tab
```

### 4.3 Non-Blocking Issues (Fix After Core Works)

These don't stop the assistant from working but degrade the experience:

| Issue | Severity | Description |
|-------|----------|-------------|
| Max tokens too low | Medium | 1024 tokens caps the response. For detailed domain analysis the assistant gets cut off mid-sentence. Recommend 2048–4096. |
| Model hardcoded | Low | `mistral-large-latest` is hardcoded. Should be configurable via `.env` so it can be swapped without code changes. |
| Temperature hardcoded | Low | `0.3` is good for factual responses but cannot be adjusted without a code change. Move to `.env` or config. |
| No streaming error recovery | Medium | If the SSE stream drops mid-response, the UI hangs with a partial message. No retry or timeout mechanism exists. |
| Chat history not persisted mid-stream | Low | Messages are saved to SQLite only after a complete round-trip. If the browser is closed during streaming, the partial response is lost. |
| No token usage tracking | Low | No visibility into how many tokens are consumed per message. API costs are invisible until Mistral sends a bill. |
| Quick prompts hardcoded in component | Low | `QUICK_PROMPTS` in `AiAssistantPanel.jsx` are static strings. Should be driven by the active domain. |

### 4.4 Fix Plan (After Diagnostics Confirm Root Cause)

**Minimal fix (Cause 1 or 2 — API key / server not running):**

No code changes needed. Set the API key and start the server.

**If SSE streaming is broken (Cause 3):**

- Add error handling in `AiAssistantPanel.jsx` for stream failures
- Add a visible error state ("Connection lost — please retry") instead of silently hanging
- Add timeout: if no token arrives within 10 seconds, show error and offer retry button

**If CORS is the issue (Cause 4):**

- Update `main.py` CORS config to include the frontend dev-server URL
- For production, update to the actual deployed frontend URL

**Recommended improvements alongside the fix:**

```
backend/.env (new/updated variables):
  MISTRAL_API_KEY=<key>
  MISTRAL_MODEL=mistral-large-latest
  MISTRAL_TEMPERATURE=0.3
  MISTRAL_MAX_TOKENS=2048
```

In `main.py`, read these values from environment instead of hardcoding.

### 4.5 Impacted Files

| File | Change Type | Reason |
|------|-------------|--------|
| `backend/.env` | Configure | Add valid `MISTRAL_API_KEY` (and optional model/temp overrides) |
| `backend/main.py` | Minor edits | Read model/temp/max_tokens from env vars |
| `frontend/src/components/ai/AiAssistantPanel.jsx` | Add error handling | Timeout + retry for dropped SSE streams |
| `frontend/src/api/client.js` | Add error handling | Propagate stream errors to UI |

---

## 5. Feature 4 — Separated Chat vs Context-Aware AI Assistant

### 5.1 Current State

**Both experiences currently use the same component:**

```
ChatsPage.jsx
  └── <AiAssistantPanel threadId={selectedThread} />   ← same component

FloatingAiWidget.jsx
  └── <AiAssistantPanel threadId={activeThreadId} />   ← same component
```

`AiAssistantPanel` derives its dashboard context from the URL (`useDashboardContext` hook), meaning:
- On `/dashboards/water`, both the page and the floating widget know the domain is "water"
- On `/chats`, the URL contains no domain — so the assistant defaults to "environment" tab (general mode)
- This happens implicitly, not by design — the two experiences are not intentionally differentiated

### 5.2 Intended Differentiation (User's Requirement)

| | Left-side Chat (ChatsPage) | Floating AI Assistant |
|---|--------------------------|----------------------|
| **Purpose** | Generic conversation / history | Context-aware help for the active dashboard |
| **Domain context** | None — user picks any topic | Always knows current domain/page/filters |
| **Persistence** | Full thread history, visible in sidebar | Ephemeral per session, or linked to active domain thread |
| **Access** | `/chats` route, sidebar nav link | FAB button, visible on all dashboard pages |
| **Thread type** | User-created threads, renameable, deleteable | Auto-created thread per domain (or one global assistant thread) |
| **Quick prompts** | Generic / none | Dynamic — based on active domain |
| **Filter context** | None passed | Passes current year/plant/region to backend |
| **System prompt behavior** | Broad ESG assistant, no domain scope | Narrow scope to active domain metrics |

### 5.3 Recommended Architecture

The key change is to **inject different context props into `AiAssistantPanel`** rather than relying on URL parsing.

```
ChatsPage.jsx
  └── <AiAssistantPanel
        mode="chat"           ← NEW prop
        threadId={selectedThread}
        context={null}        ← no domain context
      />

FloatingAiWidget.jsx
  └── <AiAssistantPanel
        mode="assistant"      ← NEW prop
        threadId={domainThread}
        context={{
          tab: currentPillar,       ← from AppContext or URL
          sub_tab: currentDomain,
          filters: activeFilters,
          domain_hint: domainHint,
        }}
      />
```

`AiAssistantPanel` uses the `mode` prop to:
- In `"chat"` mode: hide the domain quick prompts, show thread management UI, use a broader system prompt
- In `"assistant"` mode: show domain-specific quick prompts, display "Currently viewing: Water (GRI-303)", pass filters to backend

### 5.4 Context Detection for Floating Assistant

The floating assistant needs to know which page the user is on. Currently this is done via URL parsing inside the component. A cleaner approach:

**Option A — Continue URL parsing** (no change to AppContext): The `FloatingAiWidget` reads `window.location.pathname` and maps `/dashboards/environment/water` → `{tab: "environment", sub_tab: "water"}`. Simple but fragile if routes change.

**Option B — Add `currentPage` to AppContext** (recommended): `DomainsPage` and `SummaryPage` update a `currentPage: { pillar, domain }` value in context whenever they mount. `FloatingAiWidget` reads this from context. More robust and testable.

```javascript
// AppContext additions:
const [currentPage, setCurrentPage] = useState({ pillar: null, domain: null });

// DomainsPage sets this on mount:
useEffect(() => {
  setCurrentPage({ pillar, domain });
  return () => setCurrentPage({ pillar: null, domain: null });
}, [pillar, domain, setCurrentPage]);

// FloatingAiWidget reads it:
const { currentPage, activeFilters } = useAppContext();
```

### 5.5 Thread Management Strategy for Floating Assistant

Two sub-options:

**Sub-option A — Domain-pinned threads:** Each domain gets one persistent assistant thread. "Water (GRI-303) Assistant" thread is reused across sessions. Sidebar in ChatsPage shows both user chat threads and assistant threads (distinguished by icon). Pro: continuity across sessions. Con: conversation history may be confusing (mixed sessions).

**Sub-option B — Ephemeral session threads:** The floating assistant starts a new thread each session. When the assistant panel is closed, the thread is auto-saved but not shown prominently. User can find it in the Chats page under "Archived" if needed. Pro: clean slate each session, simpler. Con: no continuity.

**Recommendation:** Sub-option B for launch, Sub-option A as an optional setting later.

### 5.6 Impacted Files

| File | Change Type | Reason |
|------|-------------|--------|
| `frontend/src/components/ai/AiAssistantPanel.jsx` | Add `mode` prop | Differentiate chat vs assistant behavior |
| `frontend/src/components/ai/FloatingAiWidget.jsx` | Read context from AppContext | Replace URL parsing with explicit context prop |
| `frontend/src/pages/ChatsPage.jsx` | Pass `mode="chat"` | Explicit mode for generic chat |
| `frontend/src/context/AppContext.jsx` | Add `currentPage` state | Share active domain with floating assistant |
| `frontend/src/pages/DomainsPage.jsx` | Set `currentPage` on mount | Inform AppContext of active domain |
| `frontend/src/pages/SummaryPage.jsx` | Set `currentPage` on mount | Summary page = no domain context |

### 5.7 UX Considerations

- **Visual distinction**: ChatsPage uses a full-width conversation layout. FloatingWidget uses a compact panel (max 420px wide). Consider different header text: "Conversations" vs "ESG Assistant — Water".
- **"Currently viewing" chip**: The floating assistant header should display a small chip showing the active domain (e.g., "📍 Water / GRI-303"). This clarifies to the user that this assistant knows their current context.
- **Filter inheritance**: If the user has filtered to "Plant A, 2024" in the Water dashboard, the floating assistant should automatically say "I see you're looking at Plant A data for 2024 — would you like me to analyze water trends for that plant?" — this passes `filters` from `DomainsPage` via context.
- **Navigation from chat**: A "Go to Water dashboard" button in a Chats thread may be useful if a user wants to navigate to the relevant page after asking a question in the generic chat. Optional enhancement.

---

## 6. Cross-Feature Dependencies & Sequencing

```
Feature 3 (AI Fix)     ── should be done FIRST (unblocks testing of Feature 4)
Feature 2 (Alerts)     ── independent, can be done in parallel with Feature 3
Feature 4 (Chat sep.)  ── depends on Feature 3 (AI must work to test separation)
Feature 1 (Correlation)── independent, no dependencies on others
```

**Recommended implementation order:**

```
Sprint 1:  Feature 3 (diagnose + fix AI) + Feature 2 Phase 1 (centralize + ack)
Sprint 2:  Feature 4 (chat/assistant separation) + Feature 2 Phase 2 (threshold config)
Sprint 3:  Feature 1 Phase 1+2 (correlation scatter, Water domain)
Sprint 4:  Feature 1 Phase 3+4 (generalize + matrix)
Sprint 5:  Feature 1 Phase 5 (plant clustering, optional)
```

---

## 7. Open Questions & Clarifications Required

The following questions affect the design decisions above. Answers before implementation begins will prevent rework.

### Q1 — Anomaly Detection Scope

> Should SASB and BRSR domains also have anomaly detection, or only the 5 GRI domains (water, waste, energy, emissions, safety) as currently?

**Impact:** If SASB/BRSR anomalies are required, the backend `_OUTLIER_CONFIG` and `AlertsPage` both need to be extended with SASB/BRSR metric names. The data structure is the same (Excel + YoY % change), but the metric column names differ.

### Q2 — Threshold Configuration Access

> Should threshold configuration be accessible to all users, or only to administrators?

**Impact:** If admin-only, a role system needs to be designed (currently there is one hardcoded username/password with no roles). If all users can configure thresholds, it is simpler.

### Q3 — Alert Acknowledgement Attribution

> Should acknowledgements record who acknowledged them (username), or is it sufficient to record that it was acknowledged (no username)?

**Impact:** With the current single hardcoded login (`admin/admin123`), username attribution is trivially "admin" for everyone. If multi-user access is planned, a proper user model is needed.

### Q4 — AI Assistant Model

> Should the AI assistant remain on Mistral, or would you like the option to switch to a different provider (OpenAI GPT-4o, Anthropic Claude, etc.)?

**Impact:** The backend is wired specifically to the Mistral API format. Switching providers requires changing the request/response structure in `main.py`. If flexibility is desired, an LLM abstraction layer should be introduced.

### Q5 — Chat Experience — Floating Assistant Thread Lifecycle

> When the user closes the floating AI assistant panel, should the conversation be:
> (a) Saved and accessible next time they open the panel (continuity), or
> (b) Discarded / archived without showing in the main thread list (clean slate)?

**Impact:** This determines whether the floating assistant and the Chats page share a thread list or maintain separate storage.

### Q6 — Correlation Analysis — Available Data Alignment

> The Water and Energy datasets are both keyed by `Plant` and `Year`, but the Safety dataset uses different granularity (injury records vs annual totals). Should Safety-related correlations use annual totals only, or monthly where available?

**Impact:** If monthly data is used for Water/Energy correlations but annual for Safety, the scatter charts will have different data point counts and the user needs to understand why.

### Q7 — Correlation Analysis — Which Pairs Are Priority?

> From the Tier 1 correlation pairs listed above (Water–Energy, Energy–GHG, Safety–Training, Waste–Production, Water–Waste), which are most important to build first?

**Impact:** Determines which domain page gets the CorrelationPanel first.

### Q8 — Alerts Historical Tracking

> For historical anomaly tracking, is "snapshot when user opens AlertsPage" (Option A) sufficient, or is a nightly background snapshot (Option B) required?

**Impact:** Option B requires adding a background scheduler (APScheduler) to the backend, which increases complexity.

---

## 8. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Mistral API key unavailable / unrenewable | Medium | High | Decouple LLM provider — make the model/endpoint configurable so it can switch to OpenAI or a local LLM (Ollama) if Mistral is unavailable |
| Correlation analysis produces misleading results due to small sample size | High | Medium | Add statistical significance checks (p-value guard) in backend; display warnings in UI when n < 10 |
| Performance: correlation matrix across all 5 domains × all plants takes too long | Low | Medium | Pre-compute and cache the correlation matrix on data load; return cached result immediately |
| AlertsPage acknowledgement data diverges from live anomaly recomputation | Medium | Low | Use deterministic anomaly IDs (composite key) so ack records survive data updates |
| Chat/assistant separation confuses users (two entry points, unclear purpose) | Low | Medium | Clear labeling: "Conversations" for generic chat, "ESG Assistant" for context-aware widget; onboarding tooltip |
| Excel data joins fail for correlation (Plant name mismatches across datasets) | Low | High | Normalize plant names in backend before joining; add a plant name reconciliation step |
| BRSR FY indexing vs GRI calendar year indexing prevents cross-domain correlation | Medium | Medium | Exclude BRSR-only KPIs from correlation; clearly state correlation is GRI/SASB only in UI |

---

## 9. Effort Estimates

These are rough order-of-magnitude estimates. They assume one developer with working knowledge of the codebase.

| Feature | Sub-task | Effort |
|---------|----------|--------|
| **Feature 3 — AI Fix** | Diagnose + fix API key issue | 0.5 days |
| | Add env-var config for model/temp | 0.5 days |
| | Add stream error handling in frontend | 1 day |
| **Feature 2 — Alerts** | Backend threshold config endpoint + SQLite table | 1 day |
| | Backend acknowledgement endpoint + SQLite table | 1 day |
| | AlertsPage UI rewrite (filters + ack buttons) | 2 days |
| | OutlierPanel simplification (count badge + link) | 0.5 days |
| | Threshold config panel UI (slide-out) | 1 day |
| | Historical snapshot endpoint + table | 1 day |
| **Feature 4 — Chat Sep.** | AppContext `currentPage` state + setter in pages | 0.5 days |
| | AiAssistantPanel `mode` prop + conditional behavior | 1 day |
| | FloatingAiWidget context injection | 1 day |
| | ChatsPage explicit `mode="chat"` | 0.5 days |
| **Feature 1 — Correlation** | Backend `/api/correlate` endpoint | 2 days |
| | `CorrelationScatterChart` component | 2 days |
| | `CorrelationPanel` for Water domain | 1 day |
| | Generalize to all 5 domains | 1.5 days |
| | Backend `/api/correlate/matrix` endpoint | 1 day |
| | `CorrelationHeatmap` component | 2 days |
| | Plant clustering (Tier 2 optional) | 3 days |

**Total (core features, excluding Tier 2 optional):** ~21 developer-days  
**Total (including Tier 2 optional items):** ~27 developer-days

---

*End of implementation plan. Awaiting responses to Open Questions (Section 7) before finalizing design decisions and beginning implementation.*
