import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FileText, FileStack } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="reports-page">
      <div className="content-header">
        <h2 className="content-title">
          <FileText size={18} />
          Reports
        </h2>
      </div>

      <div className="reports-tabs">
        <NavLink to="/reports/generate" className={({ isActive }) => `reports-tab ${isActive ? 'active' : ''}`}>
          <FileText size={14} />
          Generate Report
        </NavLink>
        <NavLink to="/reports/library" className={({ isActive }) => `reports-tab ${isActive ? 'active' : ''}`}>
          <FileStack size={14} />
          Report Library
        </NavLink>
      </div>

      <Outlet />
    </div>
  );
}
