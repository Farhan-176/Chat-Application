import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppMode } from './AppModeContext';

interface RadarIdentity {
  walletAddress: string;
  anonymousAlias: string;
  avatarUrl: string;
  activeGeofences: any[]; // Replace with proper type when available
}

interface RadarIdentityContextType extends RadarIdentity {
  setIdentity: (identity: Partial<RadarIdentity>) => void;
  clearIdentity: () => void;
}

const RadarIdentityContext = createContext<RadarIdentityContextType | undefined>(undefined);

const initialState: RadarIdentity = {
  walletAddress: '',
  anonymousAlias: '',
  avatarUrl: '',
  activeGeofences: [],
};

export const RadarIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useAppMode();
  const [identity, setIdentityState] = useState<RadarIdentity>(initialState);

  const setIdentity = (updates: Partial<RadarIdentity>) => {
    setIdentityState((prev) => ({ ...prev, ...updates }));
  };

  const clearIdentity = () => {
    setIdentityState(initialState);
  };

  // Memory Wipe: Clear state when not in RADAR mode
  useEffect(() => {
    if (mode !== 'RADAR') {
      console.log('[Radar] Memory Wipe Triggered');
      clearIdentity();
    }
  }, [mode]);

  return (
    <RadarIdentityContext.Provider value={{ ...identity, setIdentity, clearIdentity }}>
      {children}
    </RadarIdentityContext.Provider>
  );
};

export const useRadarIdentity = () => {
  const context = useContext(RadarIdentityContext);
  if (!context) {
    throw new Error('useRadarIdentity must be used within a RadarIdentityProvider');
  }
  return context;
};
