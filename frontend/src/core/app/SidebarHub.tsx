import React from 'react';
import { useAppMode } from './AppModeContext';
import { useVaultIdentity } from './VaultIdentityContext';
import { useRadarIdentity } from './RadarIdentityContext';
import { VaultSidebar } from '../../features/vault/components/VaultSidebar';
import { RadarSidebar } from '../../features/radar/components/RadarSidebar';
import './SidebarHub.css';

// Using Lucide-React for WhatsApp-style icons
import { MessageSquare, Radio, Settings, User } from 'lucide-react';

interface SidebarHubProps {
  activeVaultId?: string;
  onSelectVault: (id: string) => void;
  activeRadarId: string | null;
  onSelectRadar: (id: string) => void;
}

export const SidebarHub: React.FC<SidebarHubProps> = ({ 
  activeVaultId, 
  onSelectVault, 
  activeRadarId, 
  onSelectRadar 
}) => {
  const { mode, toggleMode } = useAppMode();
  const { realName } = useVaultIdentity();
  const { anonymousAlias, avatarUrl } = useRadarIdentity();

  return (
    <div className="sidebar-hub">
      <header className="sidebar-header">
        <div className="user-avatar-container">
          <div className="avatar-circle">
            {mode === 'VAULT' ? (
              <div className="avatar-placeholder">{realName?.charAt(0) || 'U'}</div>
            ) : (
              <img src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${anonymousAlias}`} alt="avatar" />
            )}
          </div>
        </div>
        <div className="header-actions">
          <button 
            className={`action-tab ${mode === 'VAULT' ? 'active' : ''}`} 
            onClick={() => mode !== 'VAULT' && toggleMode()}
            title="Personal Chats"
          >
            <MessageSquare size={20} />
          </button>
          <button 
            className={`action-tab ${mode === 'RADAR' ? 'active' : ''}`} 
            onClick={() => mode !== 'RADAR' && toggleMode()}
            title="Geofenced Radar"
          >
            <Radio size={20} />
          </button>
          <button className="action-tab" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="sidebar-content">
        {mode === 'VAULT' ? (
          <VaultSidebar activeContactId={activeVaultId} onSelectContact={onSelectVault} />
        ) : (
          <RadarSidebar activeRoomId={activeRadarId} onSelectRoom={onSelectRadar} />
        )}
      </div>
    </div>
  );
};
