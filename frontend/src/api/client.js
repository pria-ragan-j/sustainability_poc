const BASE_URL = 'http://localhost:8000';

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
  );
  return new URLSearchParams(clean).toString();
}

function get(path, params) {
  return fetch(`${BASE_URL}${path}?${qs(params)}`).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });
}

function post(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });
}

function patch(path, body) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });
}

function del(path) {
  return fetch(`${BASE_URL}${path}`, { method: 'DELETE' }).then((r) => {
    if (!r.ok) throw new Error(`Request failed: ${r.status}`);
    return r.json();
  });
}

export const api = {
  getFilters: (domain) => get('/api/filters', { domain }),
  // Alert management — centralized feed, acknowledgement, threshold config
  getAlerts: (params) => get('/api/alerts', params),
  ackAlert: (alertId, status, note = '') => post('/api/alerts/ack', { alert_id: alertId, status, note }),
  unackAlert: (alertId) => post('/api/alerts/unack', { alert_id: alertId }),
  getAlertConfig: () => get('/api/alerts/config'),
  updateAlertConfig: (domain, low, medium, high) => fetch(`${BASE_URL}/api/alerts/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, low, medium, high }),
  }).then((r) => { if (!r.ok) throw new Error(`Failed: ${r.status}`); return r.json(); }),
  resetAlertConfig: (domain) => del(`/api/alerts/config/${domain}`),
  // Correlation analysis — KPI card chips + scatter/matrix endpoints
  getKpiCorrelations: (kpiId, params) => get(`/api/kpi-correlations/${kpiId}`, params),
  getCorrelation: (params) => get('/api/correlate', params),
  getCorrelationMatrix: (params) => get('/api/correlate/matrix', params),
  getEnvKpis: (params) => get('/api/environment/kpis', params),
  getWaterChart: (params) => get('/api/environment/water', params),
  getWasteChart: (params) => get('/api/environment/waste', params),
  getEnergyChart: (params) => get('/api/environment/energy', params),
  getGhgChart: (params) => get('/api/environment/ghg', params),
  getSocialKpis: (params) => get('/api/social/kpis', params),
  getSafetyChart: (params) => get('/api/social/safety', params),
  getDevelopmentChart: (params) => get('/api/social/development', params),
  getReportTemplates: (framework) => get('/api/reports/templates', { framework }),
  getInsights: (domain, params) => get(`/api/insights/${domain}`, params),
  getOutliers: (domain, params) => get(`/api/outliers/${domain}`, params),
  // Aggregate anomaly feed across all 5 GRI domains, for the Alerts screen.
  getAllOutliers: (params) => get('/api/outliers', params),
  // SASB (RT-CH — Chemicals) — separate dashboard, own aggregate KPI endpoint.
  getSasbKpis: (params) => get('/api/sasb/kpis', params),
  getHazardousWasteChart: (params) => get('/api/sasb/hazardous-waste', params),
  getProcessSafetyChart: (params) => get('/api/sasb/process-safety', params),
  // BRSR (Business Responsibility & Sustainability Reporting) endpoints.
  // Essential indicators only; P6 env data comes from GRI datasets with FY filter.
  getBrsrKpis: (params) => get('/api/brsr/kpis', params),
  getBrsrWorkforceChart: (params) => get('/api/brsr/workforce', params),
  getBrsrTrainingChart: (params) => get('/api/brsr/training', params),
  getBrsrCsrChart: (params) => get('/api/brsr/csr', params),
  // Chat threads (backend-persisted, multi-thread).
  listChatThreads: () => get('/api/chats'),
  createChatThread: () => post('/api/chats'),
  getChatThread: (threadId) => get(`/api/chats/${threadId}`),
  renameChatThread: (threadId, title) => patch(`/api/chats/${threadId}`, { title }),
  deleteChatThread: (threadId) => del(`/api/chats/${threadId}`),
  clearChatThreads: () => del('/api/chats'),
  // Report library (server-side generated-report storage).
  listReportLibrary: () => get('/api/reports/library'),
  downloadLibraryReportUrl: (reportId) => `${BASE_URL}/api/reports/library/${reportId}/download`,
  deleteLibraryReport: (reportId) => del(`/api/reports/library/${reportId}`),
};

export async function generateReport({ templates, year, plant, format, framework, fy }) {
  const endpoint = framework === 'BRSR' ? '/api/brsr/reports/generate' : '/api/reports/generate';
  const body = framework === 'BRSR'
    ? { fy, plant, format }
    : { templates, year, plant, format, framework };
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `Report generation failed: ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename=([^;]+)/);
  const ext = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
  const fallback = framework === 'BRSR' ? `esg_brsr_report_${fy || 'all'}.${ext}` : `esg_report.${ext}`;
  const filename = match ? match[1].trim() : fallback;
  return { blob, filename };
}

export async function streamAiChat({ message, tab, sub_tab, framework, filters, chat_history, domain_hint, thread_id }, { onToken, onDone, onError, onClarify, signal }) {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, tab, sub_tab, framework, filters, chat_history, domain_hint, thread_id }),
      signal,
    });
    if (!res.ok || !res.body) {
      onError(`AI request failed: ${res.status}`);
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        try {
          const data = JSON.parse(payload);
          if (data.token) onToken(data.token);
          if (data.error) onError(data.error);
          if (data.clarify && onClarify) onClarify(data.options || []);
          if (data.done) {
            onDone();
            return;
          }
        } catch {
          // ignore malformed chunk
        }
      }
    }
    onDone();
  } catch (e) {
    if (e.name === 'AbortError') return; // intentional cancel (timeout/unmount/thread switch) — no UI error
    onError(e.message || 'Connection error');
  }
}

export default api;
