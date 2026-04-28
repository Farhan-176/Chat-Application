import React, { createContext, useContext, useState, useCallback } from 'react';

type AppMode = 'VAULT' | 'RADAR';

interface AppModeContextType {
  mode: AppMode;
  toggleMode: () => void;
}

const AppModeContext = createContext<AppModeContextType | undefined>(undefined);

export const AppModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('VAULT');

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'VAULT' ? 'RADAR' : 'VAULT'));
  }, []);

  return (
    <AppModeContext.Provider value={{ mode, toggleMode }}>
      <div className={`app-mode-${mode.toLowerCase()}`}>
        {children}
      </div>
    </AppModeContext.Provider>
  );
};

export const useAppMode = () => {
  const context = useContext(AppModeContext);
  if (!context) {
    throw new Error('useAppMode must be used within an AppModeProvider');
  }
  return context;
};
