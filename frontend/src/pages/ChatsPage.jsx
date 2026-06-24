import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, History, Check } from 'lucide-react';
import api from '../api/client.js';
import AiAssistantPanel from '../components/ai/AiAssistantPanel.jsx';

function formatTimestamp(unixSeconds) {
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ChatsPage() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const confirmTimeoutRef = useRef(null);

  const refreshThreads = useCallback(() => {
    setLoading(true);
    api.listChatThreads().then(setThreads).catch(() => setThreads([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { refreshThreads(); }, [refreshThreads]);

  // Re-fetch the thread list whenever the active thread changes, since
  // sending a message updates that thread's title/updated_at server-side.
  useEffect(() => { refreshThreads(); }, [threadId, refreshThreads]);

  useEffect(() => () => { if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current); }, []);

  const handleNewChat = () => navigate('/chats');

  const handleThreadCreated = (newId) => navigate(`/chats/${newId}`);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await api.deleteChatThread(id).catch(() => {});
    if (id === threadId) navigate('/chats');
    refreshThreads();
  };

  // Two-step confirm: first click arms it (auto-disarms after 4s), second
  // click within that window actually clears every thread.
  const handleClearHistory = async () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      confirmTimeoutRef.current = setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    clearTimeout(confirmTimeoutRef.current);
    setConfirmingClear(false);
    await api.clearChatThreads().catch(() => {});
    navigate('/chats');
    refreshThreads();
  };

  return (
    <div className="chats-page">
      <aside className="chats-thread-list">
        <div className="chats-list-actions">
          <button className="chats-new-btn" onClick={handleNewChat}>
            <Plus size={15} />
            New chat
          </button>
          {threads.length > 0 && (
            <button
              className={`chats-clear-btn ${confirmingClear ? 'confirming' : ''}`}
              onClick={handleClearHistory}
              title={confirmingClear ? 'Click again to confirm' : 'Clear all conversations'}
            >
              {confirmingClear ? <Check size={14} /> : <History size={14} />}
              {confirmingClear ? 'Confirm clear?' : 'Clear history'}
            </button>
          )}
        </div>
        {loading ? (
          <div className="chats-loading">Loading…</div>
        ) : threads.length === 0 ? (
          <div className="chats-empty">No conversations yet.</div>
        ) : (
          <ul className="chats-thread-items">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  className={`chats-thread-item ${t.id === threadId ? 'active' : ''}`}
                  onClick={() => navigate(`/chats/${t.id}`)}
                >
                  <MessageSquare size={14} />
                  <span className="chats-thread-title">{t.title}</span>
                  <span className="chats-thread-date">{formatTimestamp(t.updated_at)}</span>
                  <span
                    className="chats-thread-delete"
                    onClick={(e) => handleDelete(e, t.id)}
                    title="Delete conversation"
                  >
                    <Trash2 size={13} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="chats-active-panel">
        {/* No `key` here: remounting on the /chats -> /chats/:id navigation
            (triggered by the first message creating a thread) used to wipe
            the in-flight streamed reply. AiAssistantPanel's justCreatedRef
            now handles thread-switch reloading internally instead. */}
        <AiAssistantPanel
          mode="chat"
          threadId={threadId || null}
          onThreadCreated={handleThreadCreated}
        />
      </div>
    </div>
  );
}
