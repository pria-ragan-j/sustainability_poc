import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoginPage from './components/auth/LoginPage.jsx';
import SummaryPage from './components/summary/SummaryPage.jsx';
import DomainsPage from './pages/DomainsPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportGeneratorPanel from './components/reports/ReportGeneratorPanel.jsx';
import ReportLibraryPage from './components/reports/ReportLibraryPage.jsx';
import ChatsPage from './pages/ChatsPage.jsx';

// Single gate point: the entire Dashboard tree (and every route nested under
// it) only renders once isAuthenticated is true. There is no other entry
// point into Dashboard, so this one check protects all dashboard routes.
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function LoginRoute() {
  const { isAuthenticated } = useAppContext();
  return isAuthenticated ? <Navigate to="/dashboards/summary" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            path="/"
            element={(
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            )}
          >
            <Route index element={<Navigate to="/dashboards/summary" replace />} />
            <Route path="dashboards/summary" element={<SummaryPage />} />
            {/* One Route (and therefore one DomainsPage instance) covers every
                pillar/domain combination, so switching between Environment,
                Social, and Governance never remounts the component — the
                mount-once chart cache inside it survives the whole session. */}
            <Route path="dashboards/:pillar/:domain" element={<DomainsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="reports" element={<ReportsPage />}>
              <Route index element={<Navigate to="/reports/generate" replace />} />
              <Route path="generate" element={<ReportGeneratorPanel />} />
              <Route path="library" element={<ReportLibraryPage />} />
            </Route>
            <Route path="chats" element={<ChatsPage />} />
            <Route path="chats/:threadId" element={<ChatsPage />} />
            <Route path="*" element={<Navigate to="/dashboards/summary" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
