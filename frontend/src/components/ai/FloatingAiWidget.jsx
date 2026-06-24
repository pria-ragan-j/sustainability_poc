import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext.jsx';
import AiAssistantPanel from './AiAssistantPanel.jsx';

// Floating overlay version of the AI assistant — sits above all dashboard
// screens (except /chats, which has its own full-page chat UI instead).
// Runs in mode="assistant": it reads currentPage from AppContext (set by
// DomainsPage on mount) so it always knows which domain the user is viewing
// and scopes its system prompt accordingly, passing the active filters.
export default function FloatingAiWidget() {
  const { aiPanelOpen, toggleAiPanel } = useAppContext();

  if (!aiPanelOpen) {
    return (
      <button className="ai-fab" onClick={toggleAiPanel} title="Open AI Assistant">
        <Sparkles size={22} />
      </button>
    );
  }

  return (
    <div className="ai-floating-panel">
      <AiAssistantPanel mode="assistant" onCollapse={toggleAiPanel} />
    </div>
  );
}
