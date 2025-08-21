import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Chapter {
  texto: string;
  imageUrl: string | null;
}

export interface HistoryEntry {
  chapters: Chapter[];
  options: string[];
  currentChapter: number;
  choices: string[];
}

interface StoryContextType {
  chapters: Chapter[];
  setChapters: React.Dispatch<React.SetStateAction<Chapter[]>>;
  choices: string[];
  setChoices: React.Dispatch<React.SetStateAction<string[]>>;
  history: HistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: ReactNode }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  return (
    <StoryContext.Provider value={{ chapters, setChapters, choices, setChoices, history, setHistory }}>
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return context;
}

export default StoryContext;
