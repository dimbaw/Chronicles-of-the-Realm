
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore } from './store/useGameStore';
import SessionTimeline from './components/SessionTimeline';
import CharacterRoster from './components/CharacterRoster';
import { translations } from './utils/translations';
import { Tab } from './types';
import { Scroll, Users, Dna, Crown, ChevronDown, Plus, Settings, Trash2, X, Save, Globe } from 'lucide-react';

const App: React.FC = () => {
  const { 
    sessions, characters, campaigns, activeCampaign, activeCampaignId,
    addSession, updateSession, deleteSession,
    addCharacter, updateCharacter, deleteCharacter,
    addCampaign, switchCampaign, updateCampaign, deleteCampaign,
    language, setLanguage
  } = useGameStore();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<Tab>(Tab.TIMELINE);
  const [isCampaignMenuOpen, setIsCampaignMenuOpen] = useState(false);
  
  // Campaign Modal States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignModalMode, setCampaignModalMode] = useState<'create' | 'edit'>('create');
  const [campaignForm, setCampaignForm] = useState({ name: '', description: '' });

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ imageStyle: '', aiInstructions: '' });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsCampaignMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateCampaign = () => {
    setCampaignModalMode('create');
    setCampaignForm({ name: '', description: '' });
    setIsCampaignModalOpen(true);
    setIsCampaignMenuOpen(false);
  };

  const openEditCampaign = () => {
    if (!activeCampaign) return;
    setCampaignModalMode('edit');
    setCampaignForm({ name: activeCampaign.name, description: activeCampaign.description });
    setIsCampaignModalOpen(true);
    setIsCampaignMenuOpen(false);
  };

  const openSettings = () => {
    if (!activeCampaign) return;
    setSettingsForm({
        imageStyle: activeCampaign.settings?.imageStyle || '',
        aiInstructions: activeCampaign.settings?.aiInstructions || ''
    });
    setIsSettingsModalOpen(true);
  };

  const handleCampaignSubmit = () => {
    if (!campaignForm.name) return;

    if (campaignModalMode === 'create') {
        addCampaign(campaignForm.name, campaignForm.description);
    } else {
        if (activeCampaignId) updateCampaign(activeCampaignId, campaignForm);
    }
    setIsCampaignModalOpen(false);
  };

  const handleSettingsSubmit = () => {
      if (activeCampaignId) {
          updateCampaign(activeCampaignId, {
              settings: settingsForm
          });
      }
      setIsSettingsModalOpen(false);
  };

  const handleDeleteCampaign = () => {
      if (activeCampaignId && confirm(t.deleteConfirmCampaign)) {
          deleteCampaign(activeCampaignId);
          setIsCampaignModalOpen(false);
      }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-stone-200 selection:bg-amber-500/30 selection:text-amber-100 pb-20 relative overflow-x-hidden font-ui">
      
      {/* Modern Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-900/10 rounded-full blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[20%] right-[-5%] w-[30%] h-[30%] bg-indigo-900/10 rounded-full blur-[100px] mix-blend-screen"></div>
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-rose-900/5 rounded-full blur-[80px]"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Glassmorphic Header */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#050505]/60">
        <div className="max-w-7xl mx-auto px-6 min-h-[5rem] h-auto py-4 md:py-0 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
            {/* Campaign Selector */}
            <div className="relative w-full md:w-auto flex justify-center md:justify-start" ref={menuRef}>
                <button 
                    onClick={() => setIsCampaignMenuOpen(!isCampaignMenuOpen)}
                    className="flex items-center gap-4 group focus:outline-none max-w-full"
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/20 to-black border border-amber-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.1)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] transition-all shrink-0">
                        <Crown className="text-amber-500 w-5 h-5" />
                    </div>
                    <div className="text-left min-w-0">
                        <h1 className="text-lg md:text-xl font-bold tracking-wide text-white font-heading leading-none flex items-center gap-2">
                            <span className="truncate">{activeCampaign?.name || t.chronicles}</span>
                            <ChevronDown size={14} className={`text-stone-500 transition-transform ${isCampaignMenuOpen ? 'rotate-180' : ''} shrink-0`} />
                        </h1>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500 font-medium truncate max-w-[200px] md:max-w-xs">
                             {activeCampaign?.description || t.selectChronicle}
                        </p>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isCampaignMenuOpen && (
                    <div className="absolute top-full left-0 md:left-0 mt-4 w-72 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl overflow-hidden animate-fadeIn z-50">
                        <div className="p-2 max-h-64 overflow-y-auto scrollbar-thin">
                            <div className="text-[10px] uppercase tracking-widest text-stone-600 px-3 py-2 font-bold">{t.switchChronicle}</div>
                            {campaigns.map(camp => (
                                <button
                                    key={camp.id}
                                    onClick={() => { switchCampaign(camp.id); setIsCampaignMenuOpen(false); }}
                                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeCampaignId === camp.id ? 'bg-amber-600/10 text-amber-500' : 'text-stone-400 hover:bg-white/5 hover:text-stone-200'}`}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${activeCampaignId === camp.id ? 'bg-amber-500' : 'bg-stone-700'}`}></div>
                                    <span className="font-medium truncate">{camp.name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/5 bg-black/20 space-y-1">
                            <button 
                                onClick={openCreateCampaign}
                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-stone-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
                            >
                                <Plus size={16} /> {t.newChronicle}
                            </button>
                            <button 
                                onClick={openEditCampaign}
                                className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-stone-400 hover:bg-white/5 hover:text-white transition-colors text-sm"
                            >
                                <Settings size={16} /> {t.editCurrent}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-end">
                {/* Navigation */}
                <nav className="flex bg-white/5 p-1 rounded-full border border-white/5 backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab(Tab.TIMELINE)}
                        className={`flex items-center gap-2 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                            activeTab === Tab.TIMELINE 
                            ? 'bg-amber-600/20 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.1)] border border-amber-500/20' 
                            : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                        }`}
                    >
                        <Scroll size={14} className="md:w-4 md:h-4" />
                        <span>{t.chroniclesTab}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab(Tab.CHARACTERS)}
                        className={`flex items-center gap-2 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-300 ${
                            activeTab === Tab.CHARACTERS
                            ? 'bg-indigo-600/20 text-indigo-200 shadow-[0_0_10px_rgba(79,70,229,0.1)] border border-indigo-500/20' 
                            : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                        }`}
                    >
                        <Users size={14} className="md:w-4 md:h-4" />
                        <span>{t.charactersTab}</span>
                    </button>
                </nav>

                <div className="flex items-center gap-2">
                    {/* Language Switcher - Interactive Segmented Control */}
                    <div className="flex items-center p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                        <button
                            onClick={() => setLanguage('en')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${
                                language === 'en' 
                                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' 
                                : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                            }`}
                            title="English"
                        >
                            EN
                        </button>
                        <button
                            onClick={() => setLanguage('ru')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${
                                language === 'ru' 
                                ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/20' 
                                : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                            }`}
                            title="Русский"
                        >
                            RU
                        </button>
                    </div>

                    {/* Settings Button */}
                    <button
                        onClick={openSettings}
                        className="p-2.5 md:p-3 rounded-full bg-white/5 border border-white/5 text-stone-400 hover:bg-white/10 hover:text-white transition-all shadow-lg backdrop-blur-md"
                        title={t.campaignSettings}
                    >
                        <Settings size={18} className="md:w-5 md:h-5" />
                    </button>
                </div>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-6 md:pt-10 px-4 md:px-8 max-w-7xl mx-auto">
        {activeTab === Tab.TIMELINE ? (
            <SessionTimeline 
                sessions={sessions} 
                characters={characters} 
                addSession={addSession}
                updateSession={updateSession}
                deleteSession={deleteSession}
                campaignSettings={activeCampaign?.settings}
            />
        ) : (
            <CharacterRoster 
                characters={characters} 
                addCharacter={addCharacter} 
                updateCharacter={updateCharacter}
                deleteCharacter={deleteCharacter}
                campaignSettings={activeCampaign?.settings}
            />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-32 border-t border-white/5 py-10 text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-3 text-stone-500 text-xs uppercase tracking-widest">
            <Dna size={14} className="text-amber-700" />
            <span>{t.poweredBy}</span>
        </div>
        <p className="text-stone-600 text-sm font-medium">
          &copy; {new Date().getFullYear()} Chronicles of the Realm.
        </p>
      </footer>

      {/* Campaign Modal */}
      {isCampaignModalOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                <button 
                    onClick={() => setIsCampaignModalOpen(false)}
                    className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
                
                <h3 className="text-2xl text-white font-heading mb-6 flex items-center gap-3">
                    {campaignModalMode === 'create' ? t.startNewChronicle : t.editChronicle}
                </h3>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.campaignName}</label>
                        <input
                            type="text"
                            autoFocus
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-amber-500/50 outline-none transition-all"
                            value={campaignForm.name}
                            onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.campaignDesc}</label>
                        <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-amber-500/50 outline-none h-24 resize-none leading-relaxed text-sm"
                            value={campaignForm.description}
                            onChange={e => setCampaignForm({ ...campaignForm, description: e.target.value })}
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                         {campaignModalMode === 'edit' && campaigns.length > 1 && (
                            <button
                                onClick={handleDeleteCampaign}
                                className="px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg font-medium transition-colors border border-red-500/20"
                                title={t.deleteCampaign}
                            >
                                <Trash2 size={20} />
                            </button>
                         )}
                         <button
                            onClick={handleCampaignSubmit}
                            disabled={!campaignForm.name}
                            className="flex-1 bg-amber-600 text-white hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2"
                        >
                            <Save size={18} />
                            <span>{campaignModalMode === 'create' ? t.beginJourney : t.saveChanges}</span>
                        </button>
                    </div>
                </div>
            </div>
          </div>,
          document.body
      )}

      {/* Settings Modal */}
      {isSettingsModalOpen && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
                <button 
                    onClick={() => setIsSettingsModalOpen(false)}
                    className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
                
                <h3 className="text-2xl text-white font-heading mb-6 flex items-center gap-3">
                    <Settings className="text-white" size={24} />
                    {t.campaignSettings}
                </h3>
                
                <div className="space-y-6">
                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.artStyle}</label>
                        <input
                            type="text"
                            placeholder={t.artStylePlaceholder}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500/50 outline-none transition-all placeholder:text-stone-700"
                            value={settingsForm.imageStyle}
                            onChange={e => setSettingsForm({ ...settingsForm, imageStyle: e.target.value })}
                        />
                        <p className="text-[10px] text-stone-500 mt-2">
                            {t.artStyleHint}
                        </p>
                    </div>
                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.aiInstructions}</label>
                        <textarea
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500/50 outline-none h-32 resize-none leading-relaxed text-sm placeholder:text-stone-700"
                            placeholder={t.aiInstructionsPlaceholder}
                            value={settingsForm.aiInstructions}
                            onChange={e => setSettingsForm({ ...settingsForm, aiInstructions: e.target.value })}
                        />
                         <p className="text-[10px] text-stone-500 mt-2">
                            {t.aiInstructionsHint}
                        </p>
                    </div>
                    
                    <div className="pt-4 border-t border-white/5 flex gap-3">
                         <button
                            onClick={() => setIsSettingsModalOpen(false)}
                            className="px-6 py-3 rounded-lg font-medium text-stone-400 hover:text-white transition-colors"
                        >
                            {t.cancel}
                        </button>
                         <button
                            onClick={handleSettingsSubmit}
                            className="flex-1 bg-white text-black hover:bg-stone-200 py-3 rounded-lg font-bold transition-all flex justify-center items-center gap-2"
                        >
                            <Save size={18} />
                            <span>{t.saveConfig}</span>
                        </button>
                    </div>
                </div>
            </div>
          </div>,
          document.body
      )}

    </div>
  );
};

export default App;
