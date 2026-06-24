import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopBar from '../components/layout/TopBar.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import FloatingAiWidget from '../components/ai/FloatingAiWidget.jsx';

export default function Dashboard() {
  const location = useLocation();
  // The AI assistant is a floating widget on every screen except the
  // dedicated Chats page, where the full conversation surface replaces it.
  const hideAiWidget = location.pathname.startsWith('/chats');

  return (
    <div className="dashboard">
      <TopBar />
      <div className="dashboard-shell">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      {!hideAiWidget && <FloatingAiWidget />}
    </div>
  );
}
