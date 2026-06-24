import React from 'react';

export default function PlaceholderState({ icon: Icon, title, source, gri }) {
  return (
    <div className="placeholder-state">
      <Icon size={28} className="placeholder-icon" />
      <p className="placeholder-title">{title}</p>
      <p className="placeholder-source">Source: {source}</p>
      <span className="gri-badge">{gri}</span>
    </div>
  );
}
