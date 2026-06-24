import React, { useEffect, useState, useCallback } from 'react';
import { Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../../api/client.js';

const INLINE_MARKDOWN = { p: 'span' };

// filters is passed by DomainsPage.jsx as whichever of griFilters/sasbFilters/
// brsrFilters the calling sub-tab belongs to - this component no longer reads
// filter state from context directly.
export default function InsightsPanel({ domain, filters }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(() => {
    setLoading(true);
    api.getInsights(domain, filters)
      .then((d) => setInsights(d.insights || []))
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, [domain, filters.year, filters.plant, filters.region]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  if (!loading && insights.length === 0) return null;

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <Lightbulb size={15} />
        Key Insights
      </div>
      {loading ? (
        <div className="loading-skeleton" style={{ height: 56 }} />
      ) : (
        <ul className="insights-list">
          {insights.map((text, i) => (
            <li key={i}><ReactMarkdown components={INLINE_MARKDOWN}>{text}</ReactMarkdown></li>
          ))}
        </ul>
      )}
    </div>
  );
}
