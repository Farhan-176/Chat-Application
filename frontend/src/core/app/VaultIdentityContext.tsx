import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppMode } from './AppModeContext';

interface VaultIdentity {
  realName: string;
  phoneNumber: string;
  email: string;
  privateContacts: any[]; // Replace with proper type when available
}

interface VaultIdentityContextType extends VaultIdentity {
  setIdentity: (identity: Partial<VaultIdentity>) => void;
  clearIdentity: () => void;
}

const VaultIdentityContext = createContext<VaultIdentityContextType | undefined>(undefined);

const initialState: VaultIdentity = {
  realName: '',
  phoneNumber: '',
  email: '',
  privateContacts: [],
};

export const VaultIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useAppMode();
  const [identity, setIdentityState] = useState<VaultIdentity>(initialState);

  const setIdentity = (updates: Partial<VaultIdentity>) => {
    setIdentityState((prev) => ({ ...prev, ...updates }));
  };

  const clearIdentity = () => {
    setIdentityState(initialState);
  };

  // Memory Wipe: Clear state when not in VAULT mode
  useEffect(() => {
    if (mode !== 'VAULT') {
      console.log('[Vault] Memory Wipe Triggered');
      clearIdentity();
    }
  }, [mode]);

  return (
    <VaultIdentityContext.Provider value={{ ...identity, setIdentity, clearIdentity }}>
      {children}
    </VaultIdentityContext.Provider>
  );
};

export const useVaultIdentity = () => {
  const context = useContext(VaultIdentityContext);
  if (!context) {
    throw new Error('useVaultIdentity must be used within a VaultIdentityProvider');
  }
  return context;
};
