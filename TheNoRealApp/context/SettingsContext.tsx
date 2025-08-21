import React, { createContext, useContext, useState, ReactNode } from 'react';

export type SettingsContextType = {
  tokenCount: number;
  setTokenCount: (count: number) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [tokenCount, setTokenCount] = useState(0);

  return (
    <SettingsContext.Provider value={{ tokenCount, setTokenCount }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
