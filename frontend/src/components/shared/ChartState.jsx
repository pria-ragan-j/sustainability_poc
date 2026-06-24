import React from 'react';

export default function ChartState({ loading, error, onRetry, children }) {
  if (loading) return <div className="loading-skeleton" />;
  if (error) {
    return (
      <div className="error-state">
        <span>Failed to load data</span>
        <button className="retry-btn" onClick={onRetry}>Retry</button>
      </div>
    );
  }
  return children;
}
