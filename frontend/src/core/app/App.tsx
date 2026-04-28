import React, { useState } from 'react';
import { AppModeProvider } from './AppModeContext';
import { VaultIdentityProvider } from './VaultIdentityContext';
import { RadarIdentityProvider } from './RadarIdentityContext';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { usePrivateChats } from '../shared/hooks/usePrivateChats';
import { useRadarRooms } from '../shared/hooks/useRadarRooms';
import { ChatRoom } from '../../features/chat/components/ChatRoom';
import { AuthScreen } from '../../features/auth/components/AuthScreen';
import './AppLayout.css';
import './App.css';

// Using Lucide-React icons for better UI
import { MessageSquare, Radio, Settings, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../shared/config/firebase';

const WhatsAppShell = () => {
  const { currentUser } = useAuth();
  const { chats, loading: chatsLoading } = usePrivateChats();
  const { rooms: radarRooms, loading: radarLoading } = useRadarRooms();
  const [activeTab, setActiveTab] = useState<'chats' | 'radar'>('chats');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Reset chat selection when switching tabs
  React.useEffect(() => {
    setActiveChatId(null);
  }, [activeTab]);

  const currentList = activeTab === 'chats' ? chats : radarRooms;
  const activeChat = [...chats, ...radarRooms].find(c => c.id === activeChatId);
  const isLoading = activeTab === 'chats' ? chatsLoading : radarLoading;

  const handleLogout = () => {
    signOut(auth);
    window.location.reload();
  };


  return (
    <div className="whatsapp-master-layout">
      {/* PANE 1: Left Navigation Hub */}
      <aside className="left-hub-pane">
        <header className="hub-header">
          <div className="hub-avatar" title={currentUser?.displayName || 'User'}>
            {currentUser?.photoURL ? (
              <img src={currentUser.photoURL} alt="User" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
            ) : (
              currentUser?.displayName?.charAt(0) || 'U'
            )}
          </div>
          <div className="hub-actions">
            <span 
              className={`action-icon ${activeTab === 'chats' ? 'active' : ''}`} 
              onClick={() => setActiveTab('chats')}
              title="Chats"
            >
              <MessageSquare size={20} />
            </span>
            <span 
              className={`action-icon ${activeTab === 'radar' ? 'active' : ''}`} 
              onClick={() => setActiveTab('radar')}
              title="Radar"
            >
              <Radio size={20} />
            </span>
            <span className="action-icon" onClick={handleLogout} title="Logout">
              <LogOut size={20} />
            </span>
          </div>
        </header>

        <div className="search-container">
          <div className="search-pill">
            <input type="text" placeholder="Search or start new chat" />
          </div>
        </div>

        <div className="chat-list">
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#667781' }}>
              {activeTab === 'chats' ? 'Decrypting chats...' : 'Scanning nearby hubs...'}
            </div>
          ) : (
            currentList.map((item: any) => (
              <div 
                key={item.id} 
                className={`contact-row ${activeChatId === item.id ? 'selected' : ''}`}
                onClick={() => setActiveChatId(item.id)}
              >
                <div className="row-avatar">
                  {item.photoURL ? (
                    <img src={item.photoURL} alt={item.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                  ) : (
                    item.name?.charAt(0) || '?'
                  )}
                </div>
                <div className="row-content">
                  <div className="row-top">
                    <span className="contact-name">{item.name}</span>
                    <span className="row-time">
                      {activeTab === 'radar' 
                        ? item.distance || 'Nearby'
                        : item.lastMessageTimestamp?.seconds 
                          ? new Date(item.lastMessageTimestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : item.time || ''}
                    </span>
                  </div>
                  <span className="row-snippet">
                    {activeTab === 'radar' 
                      ? `${item.participantCount || 0} active drifters`
                      : item.lastMessage || 'No messages yet'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

      </aside>

      {/* PANE 2: The Active Chat Interface */}
      <main className="main-chat-pane">
        {activeChatId ? (
          <ChatRoom roomId={activeChatId} chatType={activeTab} />
        ) : (

          <div className="empty-chat-canvas">
            <div className="empty-state-icon" style={{ fontSize: '100px', marginBottom: '20px' }}>📱</div>
            <h2>WhatsApp Web</h2>
            <p>Send and receive messages without keeping your phone online.<br/>Use WhatsApp on up to 4 linked devices and 1 phone at the same time.</p>
          </div>
        )}
      </main>
    </div>
  );
};

const Gateway = () => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div className="loading-screen">FlameChat Initializing...</div>;

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={() => window.location.reload()} />;
  }

  return (
    <AppModeProvider>
      <VaultIdentityProvider>
        <RadarIdentityProvider>
          <WhatsAppShell />
        </RadarIdentityProvider>
      </VaultIdentityProvider>
    </AppModeProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <Gateway />
    </AuthProvider>
  );
}

export default App;
