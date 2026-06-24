import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, ChevronsRight, RotateCcw, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAppContext } from '../../context/AppContext.jsx';
import api, { streamAiChat } from '../../api/client.js';

// Shown in place of an empty assistant bubble while waiting on the first
// token (or while a thread's history is loading), so the user always sees
// that the request is being processed instead of a blank/frozen bubble.
function ThinkingDots() {
  return (
    <span className="ai-thinking-dots" aria-label="Thinking">
      <span /><span /><span />
    </span>
  );
}

// Domain-aware quick prompts for assistant mode (floating widget on a dashboard).
const QUICK_PROMPTS = {
  environment: [
    'Which plant generates the most waste?',
    'How has water withdrawal changed since 2019?',
    'What is our water stress risk?',
    'Compare waste diversion across plants',
  ],
  social: [
    'Which region has the highest LTIFR?',
    'How is our training hours trend?',
    'What are our key social KPIs?',
    'Explain GRI 403 requirements',
  ],
  governance: [
    'How is our CSR spend trending?',
    'What are our key governance disclosures?',
  ],
};

// Generic prompts for chat mode (ChatsPage — no domain context).
const GENERIC_PROMPTS = [
  'Summarise our overall ESG performance',
  'What are our top environmental risks?',
  'How does our safety performance compare year-on-year?',
  'Explain the difference between GRI and SASB',
];

const PILLAR_LABEL = { environment: 'Environment', social: 'Social', governance: 'Governance' };
const DOMAIN_LABEL = {
  water: 'Water', waste: 'Waste', energy: 'Energy', ghg: 'GHG & Air Quality',
  workforce: 'Workforce', safety: 'Safety', development: 'Development',
  csr: 'CSR', compliance: 'Ethics & Compliance',
};

const STREAM_TIMEOUT_MS = 15000;

// mode="assistant" (default): context-aware, injects active domain/filters from AppContext.
// mode="chat": generic chat, no domain scoping, shows generic quick prompts.
export default function AiAssistantPanel({ mode = 'assistant', onCollapse, threadId: threadIdProp, onThreadCreated }) {
  const { activeThreadId, setActiveThreadId, framework, griFilters, brsrFilters, currentPage } = useAppContext();

  // In assistant mode, use currentPage from context (set by DomainsPage).
  // In chat mode, always treat domain/pillar as null.
  const pillar = mode === 'assistant' ? currentPage.pillar : null;
  const domain = mode === 'assistant' ? currentPage.domain : null;

  const threadId = threadIdProp !== undefined ? threadIdProp : activeThreadId;
  const setThreadId = threadIdProp !== undefined ? (onThreadCreated || (() => {})) : setActiveThreadId;

  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [pendingClarify, setPendingClarify] = useState(null);
  const messagesRef = useRef(null);
  const streamTimeoutRef = useRef(null);
  const abortRef = useRef(null);
  // Tracks a thread id we just lazily created ourselves (first message of a
  // brand-new conversation). When threadId flips from null to that id, the
  // local `messages` state is already authoritative — skip the reload below,
  // otherwise the in-flight streamed reply gets discarded the instant the
  // parent re-renders with the new thread id (e.g. after a route navigation).
  const justCreatedRef = useRef(null);

  const promptTab = PILLAR_LABEL[pillar] ? pillar : 'environment';
  // Use BRSR filters (FY-based) whenever the active framework is BRSR, or
  // when on a governance page (which is always BRSR-backed regardless of
  // the top-level framework toggle).
  const activeFilters = mode === 'assistant' && (framework === 'BRSR' || pillar === 'governance')
    ? brsrFilters
    : griFilters;

  useEffect(() => {
    if (justCreatedRef.current && justCreatedRef.current === threadId) {
      justCreatedRef.current = null;
      return;
    }
    // A real thread switch (or load) — cancel any in-flight stream from the
    // previous thread so its callbacks can't write into the new thread's view.
    abortRef.current?.abort();
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    setStreaming(false);
    setStreamError(null);
    setPendingClarify(null);
    if (!threadId) { setMessages([]); return; }
    setLoadingThread(true);
    api.getChatThread(threadId)
      .then((t) => setMessages(t.messages.map((m) => ({ role: m.role, content: m.content }))))
      .catch(() => setMessages([]))
      .finally(() => setLoadingThread(false));
  }, [threadId]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // Cancel any in-flight stream and pending timeout on unmount to avoid
  // setState-after-unmount and orphaned background requests.
  useEffect(() => () => {
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    abortRef.current?.abort();
  }, []);

  const updateLastMessage = (updater) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      next[next.length - 1] = updater(next[next.length - 1]);
      return next;
    });
  };

  const runStream = useCallback((message, domainHint, withThreadId, historySnapshot) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);
    setStreamError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    // Timeout guard: if no token arrives within 15s, abort the request (so
    // no stray tokens can land afterwards) and show a recoverable error.
    let firstToken = false;
    streamTimeoutRef.current = setTimeout(() => {
      if (!firstToken) {
        controller.abort();
        updateLastMessage((m) => ({
          ...m,
          content: m.content || 'The assistant is taking longer than expected. Please try again.',
        }));
        setStreaming(false);
        setStreamError('timeout');
      }
    }, STREAM_TIMEOUT_MS);

    streamAiChat(
      {
        message,
        tab: promptTab,
        sub_tab: domain,
        framework: mode === 'assistant' ? framework : 'GRI',
        // Only pass filters in assistant mode (where domain context is meaningful).
        filters: (mode === 'assistant' && domain) ? activeFilters : null,
        chat_history: historySnapshot,
        domain_hint: domainHint,
        thread_id: withThreadId,
      },
      {
        signal: controller.signal,
        onToken: (token) => {
          firstToken = true;
          clearTimeout(streamTimeoutRef.current);
          updateLastMessage((m) => ({ ...m, content: m.content + token }));
        },
        onClarify: (options) => {
          clearTimeout(streamTimeoutRef.current);
          setPendingClarify({ originalMessage: message, options });
        },
        onDone: () => {
          clearTimeout(streamTimeoutRef.current);
          setStreaming(false);
        },
        onError: (err) => {
          clearTimeout(streamTimeoutRef.current);
          updateLastMessage((m) => ({ ...m, content: m.content || `Error: ${err}` }));
          setStreaming(false);
          setStreamError(err);
        },
      }
    );
  }, [promptTab, domain, activeFilters, mode]);

  const ensureThread = async () => {
    if (threadId) return threadId;
    const t = await api.createChatThread();
    justCreatedRef.current = t.id;
    setThreadId(t.id);
    return t.id;
  };

  const send = async (message) => {
    if (!message.trim() || streaming) return;
    setInput('');
    setStreamError(null);
    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));
    const id = await ensureThread();

    if (pendingClarify) {
      const match = pendingClarify.options.find(
        (o) => message.toLowerCase().includes(o.label.toLowerCase()) || message.toLowerCase().includes(o.id)
      );
      const original = pendingClarify.originalMessage;
      setPendingClarify(null);
      if (match) {
        setMessages((prev) => [...prev, { role: 'user', content: message }]);
        runStream(original, match.id, id, historyForApi);
        return;
      }
    }

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    runStream(message, null, id, historyForApi);
  };

  const pickClarifyOption = async (option) => {
    if (!pendingClarify || streaming) return;
    const original = pendingClarify.originalMessage;
    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content }));
    setPendingClarify(null);
    const id = await ensureThread();
    setMessages((prev) => [...prev, { role: 'user', content: option.label }]);
    runStream(original, option.id, id, historyForApi);
  };

  const startNewChat = async () => {
    setPendingClarify(null);
    setStreamError(null);
    const t = await api.createChatThread();
    justCreatedRef.current = t.id;
    setThreadId(t.id);
    setMessages([]);
  };

  // Re-runs the last user question in place. Drops only the trailing
  // assistant message (the failed/partial reply) and calls runStream
  // directly — going through send() here would re-append a second copy of
  // the user's question, producing a visible duplicate bubble.
  const retryLast = () => {
    if (streaming) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    setStreamError(null);
    const trailingIsAssistant = messages[messages.length - 1]?.role === 'assistant';
    const historyBase = trailingIsAssistant ? messages.slice(0, -1) : messages;
    const historyForApi = historyBase.map((m) => ({ role: m.role, content: m.content }));
    if (trailingIsAssistant) setMessages(historyBase);
    runStream(lastUser.content, null, threadId, historyForApi);
  };

  // Context label differs by mode.
  const contextLabel = mode === 'chat'
    ? 'All ESG Data'
    : (pillar && domain)
      ? `${PILLAR_LABEL[pillar] || pillar} › ${DOMAIN_LABEL[domain] || domain}`
      : 'All ESG Data';

  const quickPrompts = mode === 'chat'
    ? GENERIC_PROMPTS
    : (QUICK_PROMPTS[promptTab] || QUICK_PROMPTS.environment);

  return (
    <div className="ai-panel">
      <div className="ai-header">
        <div className="ai-header-title">
          {mode === 'chat' ? <MessageSquare size={16} color="var(--accent)" /> : <Sparkles size={16} color="var(--accent)" />}
          {mode === 'chat' ? 'Chat' : 'AI Assistant'}
        </div>
        <span className="ai-context-badge">{contextLabel}</span>
        {messages.length > 0 && (
          <button className="ai-collapse-btn" onClick={startNewChat} disabled={streaming} title="Start a new chat">
            <RotateCcw size={15} />
          </button>
        )}
        {onCollapse && (
          <button className="ai-collapse-btn" onClick={onCollapse} title="Collapse">
            <ChevronsRight size={16} />
          </button>
        )}
      </div>

      <div className="ai-messages" ref={messagesRef}>
        {loadingThread && (
          <div className="msg-bubble msg-bot ai-thinking-bubble">
            <ThinkingDots />
          </div>
        )}
        {!loadingThread && messages.length === 0 && (
          <div className="msg-bubble msg-bot">
            {mode === 'chat'
              ? 'Welcome! Ask me anything about your ESG data, reports, or sustainability topics.'
              : 'Welcome! I\'m your ESG assistant. Ask me about your environment, social, or governance metrics, or pick a quick prompt below.'}
          </div>
        )}
        {!loadingThread && messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const isPendingAssistant = m.role === 'assistant' && isLast && streaming && m.content === '';
          return (
            <div key={i} className={`msg-bubble ${m.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
              {m.role === 'assistant' ? (
                isPendingAssistant ? (
                  <ThinkingDots />
                ) : (
                  <div className="markdown-content">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                    {isLast && streaming && <span className="msg-cursor">▋</span>}
                  </div>
                )
              ) : (
                m.content
              )}
            </div>
          );
        })}
      </div>

      {streamError && !streaming && (
        <div className="ai-stream-error">
          <span>Connection issue. </span>
          <button className="ai-retry-btn" onClick={retryLast}>Retry</button>
        </div>
      )}

      {pendingClarify ? (
        <div className="ai-quick-prompts">
          {pendingClarify.options.map((o) => (
            <button key={o.id} className="quick-prompt-chip" onClick={() => pickClarifyOption(o)} disabled={streaming}>
              {o.label}
            </button>
          ))}
        </div>
      ) : messages.length === 0 && (
        <div className="ai-quick-prompts">
          {quickPrompts.map((p) => (
            <button key={p} className="quick-prompt-chip" onClick={() => send(p)} disabled={streaming}>{p}</button>
          ))}
        </div>
      )}

      <div className="ai-input-row">
        <input
          className="ai-input"
          placeholder={pendingClarify ? 'Type an area, or pick one above...' : 'Type a question...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          disabled={streaming}
        />
        <button className="ai-send-btn" onClick={() => send(input)} disabled={streaming || !input.trim()}>
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}
