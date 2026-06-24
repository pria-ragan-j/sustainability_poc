import React from 'react';

// Shared GRI / SASB / BRSR pill toggle for the content area. `available`
// lets a caller disable an option for domains a framework doesn't cover
// (e.g. SASB has no Workforce/Development equivalent) instead of hiding it,
// so users can see the option exists but isn't applicable here.
export default function FrameworkToggle({ value, onChange, available = { GRI: true, SASB: true, BRSR: true } }) {
  return (
    <div className="framework-toggle">
      <button
        className={`framework-option ${value === 'GRI' ? 'active' : ''}`}
        onClick={() => available.GRI && onChange('GRI')}
        disabled={!available.GRI}
        title={available.GRI ? 'GRI Standards' : 'Not covered by GRI'}
      >
        GRI
      </button>
      <button
        className={`framework-option ${value === 'SASB' ? 'active' : ''}`}
        onClick={() => available.SASB && onChange('SASB')}
        disabled={!available.SASB}
        title={available.SASB ? 'SASB RT-CH (Chemicals)' : 'Not covered by SASB'}
      >
        SASB
      </button>
      <button
        className={`framework-option brsr ${value === 'BRSR' ? 'active' : ''}`}
        onClick={() => available.BRSR && onChange('BRSR')}
        disabled={!available.BRSR}
        title={available.BRSR ? 'BRSR Essential Indicators' : 'Not covered by BRSR'}
      >
        BRSR
      </button>
    </div>
  );
}
