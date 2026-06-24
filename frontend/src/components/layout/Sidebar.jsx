import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Leaf, Users, Building2, FileText, ChevronRight, ChevronsLeft, ChevronsRight,
  LayoutDashboard, AlertTriangle, MessageSquare,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import { NAV_TREE, DOMAIN_STANDARD_CODE, DOMAIN_FRAMEWORK_MAP } from '../../constants/domainMap.js';

const PILLAR_ICON = { environment: Leaf, social: Users, governance: Building2 };

function PillarSection({ pillar }) {
  const { sidebarCollapsed, toggleSidebar, expandedSections, toggleSection, framework } = useAppContext();
  const { label, domains } = NAV_TREE[pillar];
  const Icon = PILLAR_ICON[pillar];
  const expanded = expandedSections[pillar] !== false;

  // Only show domains that have a real sub-tab for the active framework.
  const visibleDomains = domains.filter(
    (d) => DOMAIN_FRAMEWORK_MAP[pillar]?.[d.id]?.[framework] != null
  );

  // If no domains exist for this pillar under the current framework
  // (e.g. Governance under GRI/SASB), hide the entire section.
  if (visibleDomains.length === 0) return null;

  // Clicking a pillar header while the sidebar is collapsed re-expands the
  // sidebar and opens that section, mirroring the previous nav's behavior.
  const handleHeaderClick = () => {
    if (sidebarCollapsed) toggleSidebar();
    else toggleSection(pillar);
  };

  return (
    <div className="sidebar-section">
      <button
        className="sidebar-section-header"
        onClick={handleHeaderClick}
        title={label}
      >
        <Icon size={16} />
        {!sidebarCollapsed && <span className="sidebar-label">{label}</span>}
        {!sidebarCollapsed && (
          <ChevronRight size={14} className={`sidebar-chevron ${expanded ? 'expanded' : ''}`} />
        )}
      </button>

      {!sidebarCollapsed && expanded && (
        <div className="sidebar-subtab-list">
          {visibleDomains.map((d) => {
            const DomainIcon = d.icon;
            const code = DOMAIN_STANDARD_CODE[pillar]?.[d.id]?.[framework];
            const navLabel = code ? `${d.label} (${code})` : d.label;
            return (
              <NavLink
                key={d.id}
                to={`/dashboards/${pillar}/${d.id}`}
                className={({ isActive }) => `sidebar-subtab-item ${isActive ? 'active' : ''}`}
              >
                <DomainIcon size={14} />
                {navLabel}
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useAppContext();

  return (
    <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-collapse-btn" onClick={toggleSidebar} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
      </button>

      <nav className="sidebar-nav">
        <NavLink to="/dashboards/summary" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active-section' : ''}`} title="Summary">
          <LayoutDashboard size={16} />
          {!sidebarCollapsed && <span className="sidebar-label">Summary</span>}
        </NavLink>

        <PillarSection pillar="environment" />
        <PillarSection pillar="social" />
        <PillarSection pillar="governance" />

        <div className="sidebar-divider" />

        <NavLink to="/alerts" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active-section' : ''}`} title="Alerts / Anomaly Detection">
          <AlertTriangle size={16} />
          {!sidebarCollapsed && <span className="sidebar-label">Alerts</span>}
        </NavLink>

        <NavLink to="/reports" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active-section' : ''}`} title="Reports">
          <FileText size={16} />
          {!sidebarCollapsed && <span className="sidebar-label">Reports</span>}
        </NavLink>

        <NavLink to="/chats" className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active-section' : ''}`} title="Chats / Conversations">
          <MessageSquare size={16} />
          {!sidebarCollapsed && <span className="sidebar-label">Chats</span>}
        </NavLink>
      </nav>
    </aside>
  );
}
