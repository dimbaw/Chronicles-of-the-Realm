
import React, { useState } from 'react';
import { Session, Character, CampaignSettings } from '../types';
import { generateSessionStory, generateSessionImage } from '../services/geminiService';
import { translations } from '../utils/translations';
import { useGameStore } from '../store/useGameStore';
import { Plus, Sparkles, Calendar, BookOpen, User, ArrowRight, X, Pencil, Trash2, Save, Globe, RefreshCw } from 'lucide-react';

interface SessionTimelineProps {
  sessions: Session[];
  characters: Character[];
  addSession: (session: Session) => void;
  updateSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  campaignSettings?: CampaignSettings;
}

const SessionTimeline: React.FC<SessionTimelineProps> = ({ sessions, characters, addSession, updateSession, deleteSession, campaignSettings }) => {
  const { language, translateSession } = useGameStore();
  const t = translations[language];

  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Translation state: Set of session IDs currently requesting API translation
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  // Manual overrides: If a user explicitly wants to see original vs translated against default
  const [viewOverrides, setViewOverrides] = useState<Record<string, 'force_original' | 'force_translated'>>({});

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [story, setStory] = useState(''); // Allow editing generated story
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);

  const startCreate = () => {
    setMode('create');
    setEditingId(null);
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setStory('');
    setCurrentImageUrl(undefined);
    setSelectedCharIds([]);
  };

  const startEdit = (session: Session) => {
    setMode('edit');
    setEditingId(session.id);
    setTitle(session.title);
    setDate(session.date);
    setNotes(session.rawNotes);
    setStory(session.story);
    setCurrentImageUrl(session.imageUrl);
    setSelectedCharIds(session.charactersInvolved || []);
  };

  const closeForm = () => {
      setMode('view');
      setEditingId(null);
  };

  const handleSubmit = async () => {
    if (!title || !notes) return;
    setIsProcessing(true);

    let finalStory = story;
    let finalImageUrl = currentImageUrl;
    
    // Check if story changed during edit to invalidate translations
    const originalSession = sessions.find(s => s.id === editingId);
    const storyChanged = originalSession ? originalSession.story !== finalStory : true;

    // Only generate story if it's empty or we are in create mode (and it wasn't manually edited yet)
    if (!finalStory) {
        // Pass language to text generator
        finalStory = await generateSessionStory(notes, campaignSettings, language);
    }

    // Generate image if none exists
    if (!finalImageUrl) {
         const activeCharacters = characters.filter(c => selectedCharIds.includes(c.id));
         finalImageUrl = await generateSessionImage(finalStory, activeCharacters, campaignSettings);
    }

    const sessionData: Session = {
      id: editingId || Date.now().toString(),
      title,
      date,
      rawNotes: notes,
      story: finalStory,
      imageUrl: finalImageUrl,
      charactersInvolved: selectedCharIds,
      translations: storyChanged ? undefined : originalSession?.translations // Preserve if story didn't change
    };

    if (mode === 'create') {
        addSession(sessionData);
    } else {
        updateSession(sessionData);
    }
    
    setIsProcessing(false);
    closeForm();
  };

  const handleDelete = (id: string) => {
      if (confirm(t.deleteSessionConfirm)) {
          deleteSession(id);
      }
  };

  const handleTranslate = async (sessionId: string) => {
      // If we are in English, we want Russian. If in Russian, we want English. (Assuming source is usually English but handled by API)
      const targetLang = language; // We want to translate TO the current language
      
      setTranslatingIds(prev => new Set(prev).add(sessionId));
      await translateSession(sessionId, targetLang);
      setTranslatingIds(prev => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
      });
      
      // Clear force_original override if it existed, so we show the new translation
      setViewOverrides(prev => {
          const next = { ...prev };
          delete next[sessionId];
          return next;
      });
  };

  const toggleViewOverride = (sessionId: string, currentIsTranslated: boolean) => {
      setViewOverrides(prev => ({
          ...prev,
          [sessionId]: currentIsTranslated ? 'force_original' : 'force_translated'
      }));
  };

  const toggleCharSelection = (id: string) => {
    setSelectedCharIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-24">
      
      {/* Header Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 md:mb-16 gap-6">
         <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl text-white font-heading font-semibold tracking-tight">{t.sagaTitle}</h2>
            <p className="text-stone-400 font-medium text-sm">{t.sagaSubtitle}</p>
         </div>
         
         {mode === 'view' && (
            <button
                onClick={startCreate}
                className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-amber-600/10 hover:border-amber-500/50 hover:text-amber-100 text-stone-300 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-amber-900/20 w-full md:w-auto justify-center"
            >
                <div className="bg-amber-500/20 p-1 rounded-full group-hover:bg-amber-500/40 transition-colors">
                    <Plus size={16} className="text-amber-500" />
                </div>
                <span className="font-medium tracking-wide text-sm">{t.logSession}</span>
            </button>
         )}
      </div>

      {/* Modern Creation/Edit HUD */}
      {mode !== 'view' && (
        <div className="mb-20 glass-panel rounded-2xl overflow-hidden shadow-2xl animate-fadeIn ring-1 ring-white/10">
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl text-amber-100 font-heading flex items-center gap-3">
                    <BookOpen className="text-amber-500" size={20} /> 
                    {mode === 'create' ? t.newEntry : t.editEntry}
                </h3>
                <button onClick={closeForm} className="text-stone-500 hover:text-white transition-colors">
                    <X size={20} />
                </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.title}</label>
                        <input 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t.titlePlaceholder}
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.date}</label>
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-stone-300 focus:border-amber-500/50 outline-none transition-all [color-scheme:dark]"
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest">{t.rawNotes}</label>
                    </div>
                    <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t.notesPlaceholder}
                        className="w-full h-32 bg-black/40 border border-white/10 p-4 rounded-xl text-stone-300 focus:border-amber-500/50 outline-none transition-all resize-none leading-relaxed"
                    />
                </div>

                {mode === 'edit' && (
                    <div>
                         <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.storyGenerated}</label>
                         <textarea 
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            className="w-full h-32 bg-black/40 border border-white/10 p-4 rounded-xl text-amber-100/90 focus:border-amber-500/50 outline-none transition-all resize-none leading-relaxed italic font-story text-lg"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">{t.dramatisPersonae}</label>
                    <div className="flex flex-wrap gap-2">
                        {characters.map(char => (
                            <button
                                key={char.id}
                                onClick={() => toggleCharSelection(char.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 flex items-center gap-2 ${
                                    selectedCharIds.includes(char.id)
                                    ? 'bg-amber-600/20 border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                    : 'bg-black/40 border-white/5 text-stone-500 hover:border-white/10 hover:bg-white/5'
                                }`}
                            >
                                <div className={`w-2 h-2 rounded-full ${selectedCharIds.includes(char.id) ? 'bg-amber-500' : 'bg-stone-700'}`}></div>
                                {char.name}
                            </button>
                        ))}
                        {characters.length === 0 && <span className="text-stone-600 text-sm italic">{t.tagCharacters}</span>}
                    </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={closeForm}
                        className="px-6 py-3 rounded-full font-medium text-stone-400 hover:text-white transition-colors"
                    >
                        {t.cancel}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !title || !notes}
                        className="bg-white text-black hover:bg-amber-50 disabled:opacity-50 disabled:hover:bg-white px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
                    >
                        {isProcessing ? (
                            <>
                                <Sparkles className="animate-spin text-amber-600" size={18} />
                                <span>{t.weavingFate}</span>
                            </>
                        ) : (
                            <>
                                {mode === 'create' ? <ArrowRight size={18} /> : <Save size={18} />}
                                <span>{mode === 'create' ? t.recordChronicle : t.updateChronicle}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Timeline */}
      <div className={`relative space-y-12 md:space-y-16 pl-6 md:pl-0 ${mode !== 'view' ? 'opacity-50 pointer-events-none filter blur-sm transition-all' : ''}`}>
        <div className="hidden md:block absolute left-[50%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2"></div>
        {/* Mobile vertical line */}
        <div className="md:hidden absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
        
        {sessions.map((session, index) => {
             const isEven = index % 2 === 0;
             const isTranslating = translatingIds.has(session.id);
             
             // Translation Logic:
             // 1. Check if a translation for the CURRENT app language exists.
             const translationAvailable = session.translations && session.translations[language];
             // 2. Determine default view. If translation is available, show it.
             const defaultIsTranslated = !!translationAvailable;
             // 3. Apply user override.
             const override = viewOverrides[session.id]; // 'force_original' | 'force_translated'
             
             // Final decision on what to show
             let showTranslated = defaultIsTranslated;
             if (override === 'force_original') showTranslated = false;
             if (override === 'force_translated' && translationAvailable) showTranslated = true;
             
             // Content to display
             const displayStory = showTranslated && translationAvailable ? session.translations![language]! : session.story;

             return (
                <div key={session.id} className={`relative flex flex-col md:flex-row gap-8 md:gap-0 ${isEven ? 'md:flex-row-reverse' : ''} group`}>
                    
                    {/* Timeline Node */}
                    <div className="absolute left-[-24px] md:left-1/2 md:-translate-x-1/2 top-8 w-4 h-4 z-20">
                        <div className="w-full h-full rounded-full bg-[#050505] border-2 border-stone-700 group-hover:border-amber-500 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all duration-500"></div>
                    </div>

                    {/* Spacer for layout */}
                    <div className="md:w-1/2"></div>
                    
                    {/* Content Card */}
                    <div className={`md:w-1/2 ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
                        <div className="glass-panel rounded-2xl overflow-hidden hover:border-amber-500/20 transition-all duration-500 group-hover:translate-y-[-4px] relative">
                            {/* Action Buttons (visible on hover) */}
                            <div className="absolute top-4 right-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <button 
                                    onClick={() => startEdit(session)}
                                    className="p-2 bg-black/60 backdrop-blur-md text-stone-300 hover:text-white rounded-lg border border-white/10 hover:bg-black/80 transition-colors"
                                    title={t.editEntry}
                                >
                                    <Pencil size={14} />
                                </button>
                                <button 
                                    onClick={() => handleDelete(session.id)}
                                    className="p-2 bg-black/60 backdrop-blur-md text-red-400 hover:text-red-300 rounded-lg border border-white/10 hover:bg-black/80 transition-colors"
                                    title={t.deleteSessionConfirm}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            {session.imageUrl && (
                                <div className="h-48 md:h-56 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent z-10 opacity-80"></div>
                                    <img src={session.imageUrl} alt={session.title} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                    <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                                        <Calendar size={12} className="text-amber-500" />
                                        <span className="text-[10px] md:text-xs font-mono text-white/90">{session.date}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="p-5 md:p-8">
                                <h3 className="text-xl md:text-2xl text-white font-heading mb-3 md:mb-4 group-hover:text-amber-100 transition-colors">{session.title}</h3>
                                <div className="prose prose-invert prose-stone max-w-none mb-4">
                                    <p className="font-story text-base md:text-lg leading-relaxed text-stone-300 italic">
                                        "{displayStory}"
                                    </p>
                                </div>

                                {/* Translation Controls */}
                                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                                    {translationAvailable ? (
                                        <button 
                                            onClick={() => toggleViewOverride(session.id, showTranslated)}
                                            className="flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full border border-indigo-500/20"
                                        >
                                            <Globe size={12} />
                                            {showTranslated ? t.showOriginal : t.showTranslation}
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleTranslate(session.id)}
                                            disabled={isTranslating}
                                            className="flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-300 transition-colors px-1"
                                        >
                                            {isTranslating ? (
                                                <>
                                                    <RefreshCw size={12} className="animate-spin" />
                                                    {t.translating}
                                                </>
                                            ) : (
                                                <>
                                                    <Globe size={12} />
                                                    {t.translateTo.replace('{lang}', language.toUpperCase())}
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                                
                                {session.charactersInvolved && session.charactersInvolved.length > 0 && (
                                    <div className="mt-5 md:mt-6 pt-5 md:pt-6 border-t border-white/5 flex flex-wrap gap-2">
                                        {session.charactersInvolved.map(cid => {
                                            const char = characters.find(c => c.id === cid);
                                            if (!char) return null;
                                            return (
                                                <div key={cid} className="flex items-center gap-2 text-xs font-medium text-stone-500 bg-white/5 px-2 py-1 rounded-md">
                                                    <User size={12} />
                                                    {char.name}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
             );
        })}
        
        {sessions.length === 0 && mode === 'view' && (
            <div className="text-center py-20 opacity-50">
                <p className="font-heading text-2xl text-stone-500 mb-2">{t.historyUnwritten}</p>
                <p className="text-stone-600">{t.beginChronicles}</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SessionTimeline;
