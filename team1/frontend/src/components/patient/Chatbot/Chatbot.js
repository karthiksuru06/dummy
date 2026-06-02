import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../PatientHeader/Header';
import './Chatbot.css';
import { postChat, resetChat } from '../../../api/chatApi';

/* ------------------------------------------------------------------ */
/*  Action button definitions                                          */
/* ------------------------------------------------------------------ */
const ACTION_DEFS = {
  "Visit Doctor": { label: "Visit Doctor", route: "/patient/finddoctors" },
  "Book Online Appointment": { label: "Book Online Appointment", route: "/patient/finddoctors" },
  "Consult Pharmacist": { label: "Consult Pharmacist", route: null },
  "Monitor Symptoms": { label: "Monitor Symptoms", route: null },
  "Call Emergency Services": { label: "Call Emergency Services", tel: "112" },
  "Go to Nearest Hospital": { label: "Go to Nearest Hospital", route: "/patient/finddoctors" },
};

const WELCOME_TEXT = "Hi, I am MEDviz. Please tell me what you are facing.";

/* ---- Memoized single message to prevent full list re-render ---- */
const ChatMessage = memo(({ msg, severityClass, severityIcon, onAction }) => (
  <div className={`message message-${msg.type}`}>
    {msg.type === 'bot' && (
      <div className="msg-avatar bot-avatar" aria-hidden="true">{'\u{1F916}'}</div>
    )}

    <div className="msg-body">
      <div className={`msg-bubble ${msg.type === 'bot' ? 'bot-bubble' : 'user-bubble'}`}>
        <p className="msg-text">{msg.text}</p>
      </div>

      {msg.type === 'bot' && msg.actions && msg.actions.length > 0 && (
        <div className="msg-result">
          <div className={`severity-badge sev-${severityClass}`}>
            <span className="sev-icon">{severityIcon}</span>
            <span className="sev-label">{msg.severity || 'Neutral'}</span>
            {msg.certainty > 0 && (
              <span className="sev-certainty">
                {Math.round(msg.certainty * 100)}% certainty
              </span>
            )}
          </div>
          {msg.reasons && msg.reasons.length > 0 && (
            <div className="msg-reasons">
              <span className="reasons-label">Why: </span>
              {msg.reasons.join(', ')}
            </div>
          )}
          <div className="action-buttons">
            {msg.actions.map((action, i) => {
              const def = ACTION_DEFS[action] || { label: action };
              const isCritical = action.toLowerCase().includes('emergency') || action.toLowerCase().includes('hospital');
              return (
                <button
                  key={i}
                  className={`action-btn ${isCritical ? 'action-btn-critical' : 'action-btn-primary'}`}
                  onClick={() => onAction(action)}
                >
                  {def.label || action}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <span className="msg-time">
        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>

    {msg.type === 'user' && (
      <div className="msg-avatar user-avatar" aria-hidden="true">{'\u{1F464}'}</div>
    )}
  </div>
));

/* ================================================================== */
const Chatbot = () => {
  const navigate = useNavigate();

  const [messages, setMessages] = useState([
    { id: 0, type: 'bot', text: WELCOME_TEXT, severity: 'Neutral', actions: [], timestamp: new Date() },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversationEnded, setConversationEnded] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgCounter = useRef(1);

  /* ---- persistent userId ---- */
  useEffect(() => {
    if (!localStorage.getItem('medviz_userId')) {
      localStorage.setItem('medviz_userId', `user_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    }
  }, []);
  const getUserId = () => localStorage.getItem('medviz_userId');

  /* ---- auto-scroll ---- */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  /* ---- add a new bot message ---- */
  const addBotMessage = useCallback((text, severity = 'Neutral', actions = [], certainty = 0, score = 0, reasons = []) => {
    setMessages(prev => [...prev, {
      id: msgCounter.current++,
      type: 'bot',
      text,
      severity,
      actions,
      certainty,
      score,
      reasons,
      timestamp: new Date(),
    }]);
  }, []);

  /* ---- replace the LAST bot message (for repeat) ---- */
  const replaceLastBotMessage = useCallback((text) => {
    setMessages(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].type === 'bot') {
          copy[i] = { ...copy[i], text, timestamp: new Date() };
          break;
        }
      }
      return copy;
    });
  }, []);

  /* ================================================================ */
  /*  New Chat handler                                                 */
  /* ================================================================ */
  const handleNewChat = useCallback(async () => {
    try {
      await resetChat(getUserId());
    } catch (err) {
      console.error("Reset error:", err);
    }
    setMessages([
      { id: 0, type: 'bot', text: WELCOME_TEXT, severity: 'Neutral', actions: [], timestamp: new Date() },
    ]);
    msgCounter.current = 1;
    setConversationEnded(false);
    setInputMessage('');
    setIsTyping(false);
    setIsSending(false);
    inputRef.current?.focus();
  }, []);

  /* ================================================================ */
  /*  Main send handler                                               */
  /* ================================================================ */
  const handleSendMessage = useCallback(async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed || isSending || conversationEnded) return;

    // Add user bubble
    setMessages(prev => [...prev, {
      id: msgCounter.current++,
      type: 'user',
      text: trimmed,
      severity: 'Neutral',
      actions: [],
      timestamp: new Date(),
    }]);
    setInputMessage('');
    setIsTyping(true);
    setIsSending(true);

    try {
      const data = await postChat({ userId: getUserId(), message: trimmed });
      const reply = data?.reply;

      if (!reply) {
        addBotMessage("Sorry, I couldn't process that. Please try again.", 'Neutral', []);
        return;
      }

      const { type, text, severity, actions, isRepeat, certainty, score, reasons } = reply;

      if (type === 'repeat' || isRepeat) {
        replaceLastBotMessage(WELCOME_TEXT);
      } else {
        addBotMessage(text, severity || 'Neutral', actions || [], certainty, score, reasons);
      }

      if (type === 'final') {
        setConversationEnded(true);
      }

    } catch (err) {
      console.error("Chat error:", err);
      addBotMessage("Sorry, I'm having trouble responding right now. Please try again.", 'Neutral', []);
    } finally {
      setIsTyping(false);
      setIsSending(false);
      if (!conversationEnded) {
        inputRef.current?.focus();
      }
    }
  }, [inputMessage, isSending, conversationEnded, addBotMessage, replaceLastBotMessage]);

  /* ---- Enter key ---- */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /* ---- Action button click ---- */
  const handleAction = (action) => {
    const def = ACTION_DEFS[action];
    if (!def) return;
    if (def.tel) {
      window.location.href = `tel:${def.tel}`;
    } else if (def.route) {
      navigate(def.route);
    }
  };

  /* ---- severity helpers ---- */
  const severityClass = (sev) => {
    if (!sev) return 'neutral';
    return sev.toLowerCase();
  };

  const severityIcon = (sev) => {
    if (!sev) return '';
    switch (sev.toLowerCase()) {
      case 'critical': return '\u{1F6A8}';
      case 'moderate': return '\u{26A0}\u{FE0F}';
      default: return '\u{2705}';
    }
  };

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */
  return (
    <div className="patient-chatbot-page">
      <Header />
      <div className="chatbot-container">

        {/* ---- Header ---- */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar-wrap">
              <span className="chatbot-avatar-icon">{'\u{1F916}'}</span>
            </div>
            <div className="chatbot-header-info">
              <h1 className="chatbot-title">MEDviz Assistant</h1>
              <p className="chatbot-subtitle">AI-powered medical guidance</p>
            </div>
          </div>
          <div className="chatbot-header-right">
            <button
              className="new-chat-btn"
              onClick={handleNewChat}
              title="Start a new conversation"
            >
              + New Chat
            </button>
            <div className="chatbot-status">
              <span className="status-dot"></span>
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* ---- Messages ---- */}
        <div className="chatbot-messages" role="log" aria-live="polite">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              msg={msg}
              severityClass={severityClass(msg.severity)}
              severityIcon={severityIcon(msg.severity)}
              onAction={handleAction}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="message message-bot typing-row">
              <div className="msg-avatar bot-avatar">{'\u{1F916}'}</div>
              <div className="typing-msg-container">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <p className="typing-text-hint">
                  {messages.length < 3 ? "Analyzing symptoms..." : 
                   messages.length < 6 ? "Checking triage rules..." : 
                   "Finalizing assessment..."}
                </p>
              </div>
            </div>
          )}

          {/* Conversation ended — new chat prompt */}
          {conversationEnded && (
            <div className="conversation-ended">
              <div className="ended-divider">
                <span>Conversation Complete</span>
              </div>
              <button
                className="new-chat-btn-large"
                onClick={handleNewChat}
              >
                Start New Conversation
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ---- Input ---- */}
        <div className={`chatbot-input-area ${conversationEnded ? 'input-disabled' : ''}`}>
          <div className="chatbot-input-row">
            <textarea
              ref={inputRef}
              id="chatbot-textarea"
              className="chatbot-textarea"
              placeholder={conversationEnded ? "Conversation ended. Click 'New Chat' to start over." : "Describe your symptoms\u2026"}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              disabled={isSending || conversationEnded}
              aria-label="Describe your symptoms"
            />
            <button
              id="chatbot-send-btn"
              className="chatbot-send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isSending || conversationEnded}
              aria-label="Send message"
            >
              <span className="send-label">Send</span>
              <span className="send-icon" aria-hidden="true">{'\u{27A4}'}</span>
            </button>
          </div>
          <p className="chatbot-disclaimer">
            MEDviz is for guidance only. For emergencies, call emergency services immediately.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Chatbot;
