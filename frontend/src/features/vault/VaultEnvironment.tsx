import React from 'react';
import { VaultChat } from './components/VaultChat';
import './VaultEnvironment.css';

interface VaultEnvironmentProps {
  activeContactId?: string;
}

export const VaultEnvironment: React.FC<VaultEnvironmentProps> = ({ activeContactId }) => {
  return (
    <div className="vault-main-fill">
      {activeContactId ? (
        <div className="vault-chat-container">
          <VaultChat contactId={activeContactId} />
        </div>
      ) : (
        <div className="vault-empty-state">
          <h2>Select a contact to start messaging</h2>
          <p>Your conversations are end-to-end encrypted.</p>
        </div>
      )}
    </div>
  );
};
