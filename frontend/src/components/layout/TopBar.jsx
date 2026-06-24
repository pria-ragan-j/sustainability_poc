import React from 'react';
import { Leaf, LogOut } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';

export default function TopBar() {
  const { logout } = useAppContext();
  return (
    <header className="topbar">
      <div className="topbar-title">
        <Leaf size={20} color="var(--env-color)" />
        <span>ESG Sustainability Dashboard</span>
      </div>
      <button className="topbar-logout-btn" onClick={logout} title="Log out">
        <LogOut size={14} />
        Logout
      </button>
    </header>
  );
}
