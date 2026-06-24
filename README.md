# ESGVision — Executive ESG Dashboard

A full-stack executive dashboard for ESG (Environmental, Social & Governance) reporting aligned with GRI Standards 303, 306, and 403.

## Features

- **Water Dashboard (GRI 303)** — Withdrawal, discharge, consumption, water stress analysis
- **Waste Dashboard (GRI 306)** — Generated, diverted, disposed, diversion rate tracking
- **Safety Dashboard (GRI 403)** — LTIFR, TRIR, injury types, severity, incident causes
- **AI Assistant** — Powered by Mistral AI for data insights, GRI narratives, anomaly alerts
- **Multi-plant, multi-year** filtering with trend analysis

## Project Structure

```
esg-dashboard/
├── backend/
│   ├── main.py           # FastAPI application (all endpoints)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.js                        # Root app with routing
│   │   ├── index.css                     # Global dark theme styles
│   │   ├── utils/api.js                  # Axios API client
│   │   ├── components/
│   │   │   ├── UI.js                     # Shared UI components
│   │   │   ├── Sidebar.js                # Navigation sidebar
│   │   │   └── AIAssistant.js            # Mistral AI chat widget
│   │   └── pages/
│   │       ├── Overview.js               # Landing / summary page
│   │       ├── WaterDashboard.js         # GRI 303 dashboard
│   │       ├── WasteDashboard.js         # GRI 306 dashboard
│   │       └── SafetyDashboard.js        # GRI 403 dashboard
│   └── package.json
├── data/
│   ├── water_dataset_.xlsx
│   ├── waste_dataset_.csv
│   └── safety_dataset_-_safety_dataset.csv
└── start.sh              # One-command startup script
```

## Setup

### 1. Get Your Mistral API Key
Sign up at https://console.mistral.ai and create an API key.

### 2. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Set Your API Key
```bash
export MISTRAL_API_KEY=your_mistral_api_key_here
```

### 5. Start the Application
```bash
# From the esg-dashboard root:
chmod +x start.sh
./start.sh
```

Or start manually:
```bash
# Terminal 1 — Backend
cd backend
MISTRAL_API_KEY=your_key uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend
npm start
```

### 6. Open Dashboard
- **Dashboard:** http://localhost:3000
- **API Docs:** http://localhost:8000/docs

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/water/kpis` | Water KPIs (filtered by year/plant) |
| `GET /api/water/trends` | Annual water trends |
| `GET /api/water/monthly` | Monthly breakdown |
| `GET /api/water/by-source` | By withdrawal source |
| `GET /api/water/by-plant` | By plant |
| `GET /api/waste/kpis` | Waste KPIs |
| `GET /api/waste/trends` | Annual waste trends |
| `GET /api/waste/monthly` | Monthly breakdown |
| `GET /api/waste/by-plant` | Diversion rate by plant |
| `GET /api/safety/kpis` | Safety KPIs (LTIFR, TRIR, etc.) |
| `GET /api/safety/trends` | Safety rate trends |
| `GET /api/safety/injury-types` | Injury type breakdown |
| `GET /api/safety/severity` | Severity distribution |
| `GET /api/safety/causes` | Top incident causes |
| `POST /api/chat` | AI chat (Mistral) |

## KPIs Covered

### Water (GRI 303)
- Total water withdrawal (m³) by source: groundwater, surface water, municipal/rainwater
- Total water discharge (m³)
- Net water consumption (m³)
- Water from high-stress areas (m³) & percentage

### Waste (GRI 306)
- Total waste generated (tons)
- Waste diverted from disposal (tons)
- Waste directed to disposal (tons)
- Diversion rate (%) by plant

### Safety (GRI 403)
- LTIFR — Lost Time Injury Frequency Rate
- TRIR — Total Recordable Injury Rate
- Fatal incidents count
- Work-related injuries total
- Work-related ill health cases
- Injury type breakdown (Slips/Trips, Cuts/Burns, Machinery, Ergonomic, etc.)
- Severity distribution (Minor, Moderate, Severe, Fatal)
- Top incident causes

## Adding More Data

To extend with more years (2018–2025 as planned):
1. Add new rows to the CSV/Excel files following the same column structure
2. Restart the backend — data is read fresh on each request
3. Filters update automatically

## AI Assistant Capabilities

Ask the AI assistant:
- "What are the water consumption trends across plants?"
- "Generate a GRI 303 disclosure narrative for this year's data"
- "Which plant has the highest LTIFR and what's causing it?"
- "Are there any anomalies in waste diversion rates?"
- "What recommendations do you have to improve our safety performance?"
