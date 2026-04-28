import React, { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { useRadarIdentity } from '../../../core/app/RadarIdentityContext';
import { useAuth } from '../../../core/auth/AuthContext';
import { useRoomMessages } from '../../../core/shared/hooks/useRoomMessages';
import { translateMessage, catchMeUp, CatchMeUpResult } from '../../../core/shared/api/geminiService';
import { Smile, Plus, Send, Sparkles, Languages, X } from 'lucide-react';

const RadarVoiceBar = lazy(() => import('./RadarVoiceBar').then(m => ({ default: m.RadarVoiceBar })));

export const RadarRoomChat: React.FC<{ roomId: string }> = ({ roomId }) => {
  const { anonymousAlias, avatarUrl } = useRadarIdentity();
  const { currentUser } = useAuth();
  const { messages, sendMessage, loading } = useRoomMessages(roomId);
  const [inputValue, setInputValue] = useState('');
  const [summary, setSummary] = useState<CatchMeUpResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
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
    await sendMessage(text, currentUser.uid, anonymousAlias || 'Anonymous', avatarUrl);
  };

  const handleCatchUp = async () => {
    if (messages.length === 0) return;
    setIsSummarizing(true);
    try {
      const last20 = messages.slice(-20).map(m => ({
        displayName: m.senderAlias,
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
    <div className="radar-room" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="radar-room-header">
        <div className="header-meta">
          <h2>Hub: {roomId.slice(0, 8)}</h2>
          <span>Community Messaging Active</span>
        </div>
        
        <div className="radar-actions">
          <button 
            className={`radar-action-btn ai-btn ${isSummarizing ? 'loading' : ''}`}
            onClick={handleCatchUp}
            title="AI Catch-up"
          >
            <Sparkles size={16} /> {isSummarizing ? 'Analyzing...' : 'Catch-up'}
          </button>
          <button 
            className={`radar-action-btn voice-btn ${isVoiceConnected ? 'active' : ''}`}
            onClick={() => setIsVoiceConnected(!isVoiceConnected)}
          >
            {isVoiceConnected ? 'Connected' : 'Join Audio'}
          </button>
        </div>
      </header>

      <Suspense fallback={null}>
        {isVoiceConnected && (
          <RadarVoiceBar isConnected={isVoiceConnected} onDisconnect={() => setIsVoiceConnected(false)} />
        )}
      </Suspense>

      {summary && (
        <div className="radar-summary-alert" style={{ 
          margin: '10px', 
          padding: '12px', 
          background: '#202c33', 
          borderRadius: '8px', 
          borderLeft: '4px solid #00a884',
          position: 'relative'
        }}>
          <div className="summary-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <strong style={{ color: '#00a884', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} /> Room Digest
            </strong>
            <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <p style={{ color: '#e9edef', fontSize: '0.9rem', marginBottom: '8px' }}>{summary.summary}</p>
          <ul style={{ color: '#8696a0', fontSize: '0.8rem', paddingLeft: '16px', margin: 0 }}>
            {summary.keyFacts.slice(0, 3).map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
      )}

      <div className="radar-room-canvas" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#8696a0', marginTop: '20px' }}>Scanning room frequencies...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const translation = translations[msg.id];
            
            return (
              <div key={msg.id} className={`radar-msg ${isMe ? 'me' : ''}`} style={{ position: 'relative' }}>
                <div className="radar-msg-content">
                  {!isMe && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {msg.senderAvatar ? (
                          <img src={msg.senderAvatar} alt={msg.senderAlias} style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                        ) : (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#00a884', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {msg.senderAlias.charAt(0)}
                          </div>
                        )}
                        <span className="radar-alias" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00a884' }}>
                          {msg.senderAlias}
                        </span>
                      </div>
                      <button 
                        className="radar-translate-btn"
                        onClick={() => handleTranslate(msg.id, msg.text)}
                        disabled={translatingId === msg.id}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#8696a0',
                          cursor: 'pointer',
                          opacity: '0',
                          transition: 'opacity 0.2s'
                        }}
                      >
                        <Languages size={14} className={translatingId === msg.id ? 'spin' : ''} />
                      </button>
                    </div>
                  )}
                  
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  
                  {translation && (
                    <div className="radar-translation" style={{ 
                      marginTop: '6px', 
                      paddingTop: '6px', 
                      borderTop: '1px solid rgba(255,255,255,0.1)',
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      color: 'rgba(233,237,239,0.7)'
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
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="radar-input-container">
        <div className="input-actions" style={{ display: 'flex', gap: '12px', color: '#8696a0' }}>
          <Smile size={24} style={{ cursor: 'pointer' }} />
          <Plus size={24} style={{ cursor: 'pointer' }} />
        </div>
        <div className="radar-input-box">
          <input 
            type="text" 
            placeholder={`Signal as ${anonymousAlias || 'Anonymous'}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
        </div>
        <button className="radar-send-btn" onClick={handleSend}>
          <Send size={20} />
        </button>
      </footer>

      <style>{`
        .radar-msg:not(.me):hover .radar-translate-btn {
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
