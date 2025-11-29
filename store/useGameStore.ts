import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Session, Character, Campaign, Language } from '../types';
import { translateText } from '../services/geminiService';

const STORAGE_KEY_CAMPAIGNS = 'dnd_chronicles_campaigns';
const STORAGE_KEY_ACTIVE_ID = 'dnd_chronicles_active_id';
const STORAGE_KEY_LANGUAGE = 'dnd_chronicles_language';

// Legacy keys for migration
const LEGACY_KEY_SESSIONS = 'dnd_chronicles_sessions';
const LEGACY_KEY_CHARACTERS = 'dnd_chronicles_characters';

interface GameContextType {
  campaigns: Campaign[];
  activeCampaignId: string | null;
  activeCampaign: Campaign | undefined;
  sessions: Session[];
  characters: Character[];
  addCampaign: (name: string, description: string) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  switchCampaign: (id: string) => void;
  addSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  translateSession: (sessionId: string, targetLang: Language) => Promise<void>;
  addCharacter: (character: Character) => void;
  updateCharacter: (updated: Character) => void;
  deleteCharacter: (id: string) => void;
  getCharacterById: (id: string) => Character | undefined;
  loading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');

  // Initialize Data
  useEffect(() => {
    const loadedCampaignsStr = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
    let loadedCampaigns: Campaign[] = loadedCampaignsStr ? JSON.parse(loadedCampaignsStr) : [];
    let activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    const storedLang = localStorage.getItem(STORAGE_KEY_LANGUAGE) as Language;

    if (storedLang) setLanguage(storedLang);

    // Migration or Initialization
    if (loadedCampaigns.length === 0) {
      const defaultId = 'default-chronicle';
      const defaultCampaign: Campaign = { 
        id: defaultId, 
        name: 'The First Tale', 
        description: 'Your first adventure begins here.', 
        createdAt: new Date().toISOString() 
      };
      loadedCampaigns = [defaultCampaign];
      activeId = defaultId;

      // Migrate legacy data if exists
      const oldSessions = localStorage.getItem(LEGACY_KEY_SESSIONS);
      const oldChars = localStorage.getItem(LEGACY_KEY_CHARACTERS);
      
      if (oldSessions) localStorage.setItem(`dnd_sessions_${defaultId}`, oldSessions);
      if (oldChars) localStorage.setItem(`dnd_characters_${defaultId}`, oldChars);
    }

    setCampaigns(loadedCampaigns);
    setActiveCampaignId(activeId || loadedCampaigns[0].id);
    setLoading(false);
  }, []);

  // Persist Language
  const setLanguageAndSave = useCallback((lang: Language) => {
    setLanguage(lang);
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);
  }, []);

  // Load Campaign Data when Active ID changes
  useEffect(() => {
    if (!activeCampaignId) return;

    const s = localStorage.getItem(`dnd_sessions_${activeCampaignId}`);
    const c = localStorage.getItem(`dnd_characters_${activeCampaignId}`);

    setSessions(s ? JSON.parse(s) : []);
    setCharacters(c ? JSON.parse(c) : []);
    
    localStorage.setItem(STORAGE_KEY_ACTIVE_ID, activeCampaignId);
  }, [activeCampaignId]);

  // Persist Data changes
  useEffect(() => {
    if (!activeCampaignId || loading) return;
    localStorage.setItem(`dnd_sessions_${activeCampaignId}`, JSON.stringify(sessions));
  }, [sessions, activeCampaignId, loading]);

  useEffect(() => {
    if (!activeCampaignId || loading) return;
    localStorage.setItem(`dnd_characters_${activeCampaignId}`, JSON.stringify(characters));
  }, [characters, activeCampaignId, loading]);

  // Persist Campaign List changes
  useEffect(() => {
    if (loading) return;
    localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(campaigns));
  }, [campaigns, loading]);


  // Campaign Actions
  const addCampaign = useCallback((name: string, description: string) => {
    const newCampaign: Campaign = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    setCampaigns(prev => [...prev, newCampaign]);
    setActiveCampaignId(newCampaign.id);
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setCampaigns(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one
        const fallback: Campaign = { id: Date.now().toString(), name: 'New Chronicle', description: '', createdAt: new Date().toISOString() };
        setActiveCampaignId(fallback.id);
        return [fallback];
      }
      if (activeCampaignId === id) {
        setActiveCampaignId(filtered[0].id);
      }
      return filtered;
    });
    
    // Cleanup storage
    localStorage.removeItem(`dnd_sessions_${id}`);
    localStorage.removeItem(`dnd_characters_${id}`);
  }, [activeCampaignId]);

  const switchCampaign = useCallback((id: string) => {
    setActiveCampaignId(id);
  }, []);

  // Session Actions
  const addSession = useCallback((session: Session) => {
    setSessions(prev => [session, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const updateSession = useCallback((updated: Session) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const translateSession = useCallback(async (sessionId: string, targetLang: Language) => {
    // Find session in current state
    const session = sessions.find(s => s.id === sessionId);
    if (!session || !session.story) return;

    // Return if already translated
    if (session.translations && session.translations[targetLang]) return;

    const translatedText = await translateText(session.story, targetLang);
    
    // Don't save if the translation failed or is identical to source (and source was reasonable length)
    if (translatedText === session.story && session.story.length > 20) return;

    // Use a functional update to ensure we are working with the absolute latest state
    setSessions(currentSessions => currentSessions.map(s => {
        if (s.id === sessionId) {
            return {
                ...s,
                translations: {
                    ...(s.translations || {}),
                    [targetLang]: translatedText
                }
            };
        }
        return s;
    }));
  }, [sessions]); // Dependencies

  // Character Actions
  const addCharacter = useCallback((character: Character) => {
    setCharacters(prev => [...prev, character]);
  }, []);

  const updateCharacter = useCallback((updated: Character) => {
    setCharacters(prev => prev.map(c => c.id === updated.id ? updated : c));
  }, []);

  const deleteCharacter = useCallback((id: string) => {
    setCharacters(prev => prev.filter(c => c.id !== id));
  }, []);

  const getCharacterById = useCallback((id: string) => {
    return characters.find(c => c.id === id);
  }, [characters]);

  const value = {
    campaigns,
    activeCampaignId,
    activeCampaign: campaigns.find(c => c.id === activeCampaignId),
    sessions,
    characters,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    switchCampaign,
    addSession,
    updateSession,
    deleteSession,
    translateSession,
    addCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacterById,
    loading,
    language,
    setLanguage: setLanguageAndSave
  };

  // Fixed: Replaced JSX with React.createElement to avoid "Cannot find namespace 'GameContext'" and JSX parsing errors in .ts file
  return React.createElement(GameContext.Provider, { value }, children);
};

export const useGameStore = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameStore must be used within a GameProvider');
  }
  return context;
};