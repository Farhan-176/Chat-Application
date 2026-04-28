import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useRadarIdentity } from '../../../core/app/RadarIdentityContext';
import { useMessages } from '../../../core/shared/hooks/useMessages';
import { translateMessage, catchMeUp, CatchMeUpResult } from '../../../core/shared/api/geminiService';
import { Smile, Plus, Send, Sparkles, Languages, X } from 'lucide-react';

const RadarVoiceBar = lazy(() => import('../../../features/radar/components/RadarVoiceBar').then(m => ({ default: m.RadarVoiceBar })));

interface ChatRoomProps {
  roomId: string;
  chatType: 'chats' | 'radar';
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ roomId, chatType }) => {
  const { currentUser } = useAuth();
  const { anonymousAlias, avatarUrl } = useRadarIdentity();
  
  // Guard Clause: Prevent crash if user state is still loading
  if (!currentUser) {
    return (
      <div className="chat-room-loading" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0' }}>
        <div className="loading-spinner">Initializing chat frequencies...</div>
      </div>
    );
  }

  const { messages, sendMessage, loading } = useMessages(roomId, chatType, currentUser, anonymousAlias, avatarUrl);
  
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
    if (!inputValue.trim() || !currentUser?.uid) return;
    const text = inputValue;
    setInputValue('');
    await sendMessage(text);
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
    <div className={`chat-room-container ${chatType}-mode`} style={{ display: 'flex', flexDirection: 'column', height: '100%', background: chatType === 'radar' ? '#0b141a' : '#efeae2' }}>
      {/* Chat Header */}
      <header className="chat-header" style={{ height: '60px', background: chatType === 'radar' ? '#111b21' : '#f0f2f5', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
        <div className="header-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#d1d7db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          {roomId.charAt(0).toUpperCase()}
        </div>
        <div className="header-info" style={{ marginLeft: '12px' }}>
          <div style={{ fontWeight: '500', color: chatType === 'radar' ? '#e9edef' : '#111b21' }}>
            {chatType === 'radar' ? `Hub: ${roomId.slice(0, 8)}` : `Contact: ${roomId.slice(0, 8)}`}
          </div>
          <div style={{ fontSize: '12px', color: '#8696a0' }}>online</div>
        </div>
        <div className="header-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button 
            className={`ai-sparkle-btn ${isSummarizing ? 'loading' : ''}`}
            onClick={handleCatchUp}
            title="AI Catch-up"
            style={{ background: 'none', border: 'none', color: '#00a884', cursor: 'pointer' }}
          >
            <Sparkles size={20} />
          </button>
          {chatType === 'radar' && (
            <button 
              className={`voice-btn ${isVoiceConnected ? 'active' : ''}`}
              onClick={() => setIsVoiceConnected(!isVoiceConnected)}
              style={{ background: 'none', border: 'none', color: isVoiceConnected ? '#00a884' : '#8696a0', cursor: 'pointer' }}
            >
              Join Audio
            </button>
          )}
        </div>
      </header>

      {/* Voice Bar for Radar */}
      {chatType === 'radar' && (
        <Suspense fallback={null}>
          {isVoiceConnected && (
            <RadarVoiceBar isConnected={isVoiceConnected} onDisconnect={() => setIsVoiceConnected(false)} />
          )}
        </Suspense>
      )}

      {/* Message List */}
      <div className="message-list-canvas" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        
        {/* AI Summary Card */}
        {summary && (
          <div className="ai-summary-card" style={{ 
            background: chatType === 'radar' ? '#202c33' : '#e8f0fe', 
            borderRadius: '8px', 
            padding: '12px', 
            marginBottom: '16px',
            border: chatType === 'radar' ? '1px solid #00a884' : '1px solid #d1e3fa',
            position: 'sticky',
            top: '0',
            zIndex: '5'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <strong style={{ color: chatType === 'radar' ? '#00a884' : '#1967d2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> AI Summary
              </strong>
              <button onClick={() => setSummary(null)} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: chatType === 'radar' ? '#e9edef' : '#3c4043' }}>{summary.summary}</p>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#8696a0' }}>Syncing messages...</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.uid;
            const translation = translations[msg.id];
            
            return (
              <div 
                key={msg.id} 
                className={`message-bubble ${isMe ? 'outgoing' : 'incoming'}`}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '65%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: isMe ? (chatType === 'radar' ? '#005c4b' : '#d9fdd3') : (chatType === 'radar' ? '#202c33' : '#ffffff'),
                  color: chatType === 'radar' ? '#e9edef' : '#111b21',
                  position: 'relative',
                  borderTopRightRadius: isMe ? '0' : '8px',
                  borderTopLeftRadius: isMe ? '8px' : '0',
                }}
              >
                {/* Community context: show alias for others */}
                {chatType === 'radar' && !isMe && (
                  <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#00a884', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {msg.senderAvatar && <img src={msg.senderAvatar} alt="" style={{ width: '16px', height: '16px', borderRadius: '50%' }} />}
                    {msg.senderName}
                  </div>
                )}

                <div className="text-content">
                  {msg.text}
                  {!isMe && (
                    <button 
                      className="translate-icon-btn"
                      onClick={() => handleTranslate(msg.id, msg.text)}
                      style={{ background: 'none', border: 'none', color: '#8696a0', marginLeft: '8px', cursor: 'pointer', opacity: '0.4' }}
                    >
                      <Languages size={14} />
                    </button>
                  )}
                </div>

                {translation && (
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid rgba(0,0,0,0.05)', fontSize: '13px', fontStyle: 'italic', opacity: '0.8' }}>
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

      {/* Input Bar */}
      <footer className="chat-input-bar" style={{ height: '60px', background: chatType === 'radar' ? '#202c33' : '#f0f2f5', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', color: '#8696a0' }}>
          <Smile size={24} />
          <Plus size={24} />
        </div>
        <div className="input-pill" style={{ flex: 1, background: chatType === 'radar' ? '#2a3942' : '#ffffff', borderRadius: '24px', padding: '0 16px' }}>
          <input 
            type="text" 
            placeholder={chatType === 'radar' ? `Signal as ${anonymousAlias}...` : "Type a message"} 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            style={{ width: '100%', height: '40px', border: 'none', background: 'transparent', outline: 'none', color: chatType === 'radar' ? '#e9edef' : '#111b21' }}
          />
        </div>
        <button className="send-btn" onClick={handleSend} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer' }}>
          <Send size={24} />
        </button>
      </footer>
    </div>
  );
};
