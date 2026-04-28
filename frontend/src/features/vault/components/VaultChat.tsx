import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useVaultMessages } from '../hooks/useVaultMessages';
import { translateMessage, catchMeUp, CatchMeUpResult } from '../../../core/shared/api/geminiService';
import { Smile, Plus, Send, Sparkles, Languages, X } from 'lucide-react';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: any;
  status?: 'sending' | 'sent' | 'error';
  translatedText?: string;
}

export const VaultChat: React.FC<{ contactId: string }> = ({ contactId }) => {
  const { currentUser } = useAuth();
  const { messages, sendMessage, loading } = useVaultMessages(contactId);
  const [inputValue, setInputValue] = useState('');
  const [summary, setSummary] = useState<CatchMeUpResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || !currentUser) return;
    const text = inputValue;
    setInputValue('');
    await sendMessage(text, currentUser.uid, currentUser.displayName || 'User');
  };

  const handleCatchUp = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const last20 = messages.slice(-20).map(m => ({
        displayName: m.senderName,
        text: m.text,
        createdAt: new Date(m.timestamp?.seconds * 1000 || Date.now())
      }));
      const result = await catchMeUp(last20);
      setSummary(result);
    } catch (error) {
      console.error('AI Catch-up failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleTranslate = async (msgId: string, text: string) => {
    setTranslatingId(msgId);
    try {
      const locale = navigator.language || 'en';
      const translated = await translateMessage(text, locale);
      setTranslations(prev => ({ ...prev, [msgId]: translated }));
    } catch (error) {
      console.error('Translation failed:', error);
    } finally {
      setTranslatingId(null);
    }
  };

  return (
    <div className="vault-chat" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <header className="chat-header">
        <div className="chat-header-avatar">{contactId.charAt(0).toUpperCase()}</div>
        <div className="chat-header-info">
          <strong>Room: {contactId.slice(0, 8)}</strong>
          <span>online</span>
        </div>
        <div className="chat-header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button 
            className={`ai-sparkle-btn ${isSummarizing ? 'loading' : ''}`}
            onClick={handleCatchUp}
            title="AI Catch-up"
            style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <Sparkles size={20} />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className="message-list" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        
        {/* AI Summary Card */}
        {summary && (
          <div className="ai-summary-card" style={{ 
            background: '#e8f0fe', 
            borderRadius: '8px', 
            padding: '12px', 
            margin: '10px', 
            border: '1px solid #d1e3fa',
            position: 'sticky',
            top: '0',
            zIndex: '5'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: '#1967d2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> AI Summary
              </strong>
              <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#3c4043' }}>{summary.summary}</p>
            {summary.keyFacts.length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#5f6368' }}>
                {summary.keyFacts.map((fact, i) => <li key={i}>{fact}</li>)}
              </ul>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>Decrypting messages...</div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.senderId === currentUser?.uid;
            const translation = translations[msg.id];
            
            return (
              <div 
                key={msg.id} 
                className={`bubble ${isOutgoing ? 'bubble-outgoing' : 'bubble-incoming'}`}
                style={{ position: 'relative' }}
              >
                {!isOutgoing && (
                  <button 
                    className="inline-translate-btn"
                    onClick={() => handleTranslate(msg.id, msg.text)}
                    disabled={translatingId === msg.id}
                    title="Translate"
                    style={{
                      position: 'absolute',
                      right: '-30px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#8696a0',
                      cursor: 'pointer',
                      opacity: '0',
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Languages size={16} className={translatingId === msg.id ? 'spin' : ''} />
                  </button>
                )}
                
                <div className="message-text">{msg.text}</div>
                
                {translation && (
                  <div className="message-translation" style={{ 
                    marginTop: '6px', 
                    paddingTop: '6px', 
                    borderTop: '1px solid rgba(0,0,0,0.05)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    color: 'rgba(0,0,0,0.6)'
                  }}>
                    {translation}
                  </div>
                )}

                <div style={{ fontSize: '10px', textAlign: 'right', marginTop: '4px', opacity: 0.6 }}>
                  {msg.timestamp?.seconds 
                    ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '...'}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <footer className="chat-input-area">
        <div style={{ display: 'flex', gap: '16px', color: '#54656f' }}>
          <Smile size={24} style={{ cursor: 'pointer' }} />
          <Plus size={24} style={{ cursor: 'pointer' }} />
        </div>
        <div className="chat-input-pill">
          <input 
            type="text" 
            placeholder="Type a message" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button className="send-btn" onClick={handleSend} style={{ background: 'none', border: 'none' }}>
          <Send size={20} />
        </button>
      </footer>

      <style>{`
        .bubble-incoming:hover .inline-translate-btn {
          opacity: 1 !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
};
