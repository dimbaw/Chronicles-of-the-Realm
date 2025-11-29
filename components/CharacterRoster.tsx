
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Character, CampaignSettings, Language } from '../types';
import { generateCharacterImage, generateBackstoryScenes } from '../services/geminiService';
import { translations } from '../utils/translations';
import { UserPlus, Sparkles, Save, X, User, Pencil, Trash2, RefreshCw, Maximize2, Image as ImageIcon, Film, AlertCircle } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface CharacterRosterProps {
  characters: Character[];
  addCharacter: (char: Character) => void;
  updateCharacter: (char: Character) => void;
  deleteCharacter: (id: string) => void;
  campaignSettings?: CampaignSettings;
}

const CharacterRoster: React.FC<CharacterRosterProps> = ({ characters, addCharacter, updateCharacter, deleteCharacter, campaignSettings }) => {
  const { language } = useGameStore();
  const t = translations[language];

  // Modal States
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<{ url: string, caption?: string } | null>(null);
  
  // View States
  const [profileViewMode, setProfileViewMode] = useState<'portrait' | 'story'>('portrait');
  
  // Processing States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Form Data
  const [formData, setFormData] = useState<Partial<Character>>({});
  const [regenerationPrompt, setRegenerationPrompt] = useState('');

  const resetForm = () => {
    setFormData({});
    setRegenerationPrompt('');
    setIsGenerating(false);
    setIsRegeneratingImage(false);
    setIsGeneratingStory(false);
  };

  const openCreate = () => {
    setModalMode('create');
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = (char: Character, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setModalMode('edit');
    setFormData({ ...char });
    setRegenerationPrompt('');
    setIsFormOpen(true);
    setIsProfileOpen(false); // Close profile if open
  };

  const openProfile = (char: Character) => {
    setSelectedCharId(char.id);
    setProfileViewMode('portrait');
    setIsProfileOpen(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(t.deleteCharConfirm)) {
      deleteCharacter(id);
      if (selectedCharId === id) setIsProfileOpen(false);
    }
  };

  const handleGenerateAndSave = async () => {
    if (!formData.name || !formData.description) return;
    setIsGenerating(true);

    const newId = formData.id || Date.now().toString();
    
    // Initial Generation (Create Mode)
    let imageUrl = formData.imageUrl;
    if (!imageUrl && modalMode === 'create') {
         // Create a temporary character object for generation
         const tempChar = { ...formData, id: newId } as Character;
         imageUrl = await generateCharacterImage(tempChar, campaignSettings);
    }

    const finalChar: Character = {
      id: newId,
      name: formData.name,
      race: formData.race || 'Unknown',
      class: formData.class || 'Commoner',
      description: formData.description,
      backgroundStory: formData.backgroundStory || '',
      imageUrl: imageUrl,
      visualStoryUrl: formData.visualStoryUrl,
      notes: formData.notes || ''
    };

    if (modalMode === 'create') {
      addCharacter(finalChar);
    } else {
      updateCharacter(finalChar);
    }

    setIsGenerating(false);
    setIsFormOpen(false);
  };

  const handleRegenerateImage = async () => {
      if (!formData.name || !formData.description) return;
      setIsRegeneratingImage(true);

      const tempChar = { ...formData } as Character;
      const newUrl = await generateCharacterImage(tempChar, campaignSettings, regenerationPrompt);
      
      if (newUrl) {
          setFormData(prev => ({ ...prev, imageUrl: newUrl }));
          setRegenerationPrompt(''); // Clear prompt after success
      }

      setIsRegeneratingImage(false);
  };

  const generateStoryboard = async () => {
      if (!activeChar || !activeChar.backgroundStory) return;
      setIsGeneratingStory(true);
      
      const storyboardUrl = await generateBackstoryScenes(activeChar, campaignSettings);
      
      if (storyboardUrl) {
          updateCharacter({ ...activeChar, visualStoryUrl: storyboardUrl });
      }
      
      setIsGeneratingStory(false);
  };
  
  const activeChar = characters.find(c => c.id === selectedCharId);

  return (
    <div className="w-full pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
         <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl text-white font-heading font-semibold tracking-tight">{t.rosterTitle}</h2>
            <p className="text-stone-400 font-medium text-sm">{t.rosterSubtitle}</p>
         </div>
         
         <button
            onClick={openCreate}
            className="group flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 hover:bg-indigo-600/10 hover:border-indigo-500/50 hover:text-indigo-100 text-stone-300 transition-all duration-300 backdrop-blur-sm shadow-lg hover:shadow-indigo-900/20"
         >
            <div className="bg-indigo-500/20 p-1 rounded-full group-hover:bg-indigo-500/40 transition-colors">
                <UserPlus size={16} className="text-indigo-400" />
            </div>
            <span className="font-medium tracking-wide text-sm">{t.summonCharacter}</span>
         </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {characters.map(char => (
          <div 
            key={char.id}
            onClick={() => openProfile(char)}
            className="group relative bg-[#0a0a0a] border border-white/5 rounded-xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)] cursor-pointer"
          >
            {/* Image Aspect Ratio Container */}
            <div className="aspect-[3/4] relative overflow-hidden bg-stone-900">
               {char.imageUrl ? (
                   <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
               ) : (
                   <div className="w-full h-full flex items-center justify-center text-stone-700">
                       <User size={48} strokeWidth={1} />
                   </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-90"></div>
               
               {/* Quick Actions Overlay */}
               <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                    <button 
                        onClick={(e) => openEdit(char, e)}
                        className="p-2 bg-black/60 backdrop-blur-md text-stone-300 hover:text-white rounded-full border border-white/10 hover:bg-indigo-600/80 transition-colors"
                        title="Edit Character"
                    >
                        <Pencil size={14} />
                    </button>
                    <button 
                        onClick={(e) => handleDelete(char.id, e)}
                        className="p-2 bg-black/60 backdrop-blur-md text-stone-300 hover:text-red-400 rounded-full border border-white/10 hover:bg-red-900/50 transition-colors"
                        title="Delete Character"
                    >
                        <Trash2 size={14} />
                    </button>
               </div>

               {/* Name Overlay */}
               <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <h3 className="text-2xl font-heading text-white mb-1 group-hover:text-indigo-200 transition-colors">{char.name}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-500/80">{char.race} • {char.class}</p>
               </div>
            </div>
          </div>
        ))}
        
        {characters.length === 0 && (
            <div className="col-span-full py-20 text-center opacity-50">
                <p className="font-heading text-2xl text-stone-500 mb-2">{t.rosterEmpty}</p>
                <p className="text-stone-600">{t.rosterEmptySub}</p>
            </div>
        )}
      </div>

      {/* CREATE / EDIT FORM MODAL */}
      {isFormOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl relative my-10">
                <div className="sticky top-0 z-10 bg-[#0f0f0f]/95 backdrop-blur border-b border-white/5 p-6 flex justify-between items-center rounded-t-2xl">
                    <h3 className="text-xl text-indigo-100 font-heading flex items-center gap-3">
                        <UserPlus className="text-indigo-500" size={20} /> 
                        {modalMode === 'create' ? t.summonNew : t.modifyCharacter}
                    </h3>
                    <button onClick={() => setIsFormOpen(false)} className="text-stone-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                             <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">Name</label>
                             <input 
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:border-indigo-500/50 outline-none transition-all"
                                placeholder={t.namePlaceholder}
                             />
                        </div>
                        <div>
                             <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.race}</label>
                             <input 
                                value={formData.race || ''}
                                onChange={(e) => setFormData({ ...formData, race: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-stone-300 focus:border-indigo-500/50 outline-none"
                                placeholder={t.racePlaceholder}
                             />
                        </div>
                        <div>
                             <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.class}</label>
                             <input 
                                value={formData.class || ''}
                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-stone-300 focus:border-indigo-500/50 outline-none"
                                placeholder={t.classPlaceholder}
                             />
                        </div>
                    </div>

                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.physicalAppearance}</label>
                        <textarea 
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full h-24 bg-black/50 border border-white/10 p-3 rounded-lg text-stone-300 focus:border-indigo-500/50 outline-none resize-none"
                            placeholder={t.appearancePlaceholder}
                        />
                    </div>

                    {/* Visual Evolution Section (Edit Mode Only) */}
                    {modalMode === 'edit' && (
                        <div className="grid grid-cols-1 gap-4">
                            {/* Portrait Generator */}
                            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles size={16} className="text-indigo-400" />
                                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">{t.portrait}</span>
                                </div>
                                
                                <div className="flex flex-col gap-3">
                                    {formData.imageUrl && (
                                        <div className="w-32 h-32 rounded-lg overflow-hidden border border-white/10 bg-black self-center">
                                            <img src={formData.imageUrl} alt="Current" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <input 
                                            value={regenerationPrompt}
                                            onChange={(e) => setRegenerationPrompt(e.target.value)}
                                            placeholder={t.instructionPlaceholder}
                                            className="flex-1 bg-black/40 border border-white/10 p-2 text-xs rounded-lg text-white focus:border-indigo-500/50 outline-none"
                                        />
                                        <button 
                                            onClick={handleRegenerateImage}
                                            disabled={isRegeneratingImage}
                                            className="text-xs bg-indigo-600 hover:bg-indigo-50 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                                        >
                                            <RefreshCw size={12} className={isRegeneratingImage ? "animate-spin" : ""} />
                                            {isRegeneratingImage ? t.reshape : t.update}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-stone-500 text-xs font-bold uppercase tracking-widest mb-2">{t.backgroundStory}</label>
                        <textarea 
                            value={formData.backgroundStory || ''}
                            onChange={(e) => setFormData({ ...formData, backgroundStory: e.target.value })}
                            className="w-full min-h-[200px] bg-black/50 border border-white/10 p-6 rounded-lg text-amber-100/90 focus:border-indigo-500/50 outline-none resize-y font-story text-lg leading-relaxed"
                            placeholder={t.backgroundStoryPlaceholder}
                        />
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="px-6 py-3 rounded-full font-medium text-stone-400 hover:text-white transition-colors"
                        >
                            {t.cancel}
                        </button>
                        <button
                            onClick={handleGenerateAndSave}
                            disabled={isGenerating || !formData.name}
                            className="bg-white text-black hover:bg-indigo-50 disabled:opacity-50 px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                        >
                            {isGenerating ? (
                                <>
                                    <Sparkles className="animate-spin text-indigo-600" size={18} />
                                    <span>{t.divining}</span>
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    <span>{modalMode === 'create' ? t.bindSoul : t.saveChanges}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* CHARACTER PROFILE MODAL */}
      {isProfileOpen && activeChar && createPortal(
        <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-fadeIn">
            <div className="bg-[#0f0f0f] border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden">
                <button 
                    onClick={() => setIsProfileOpen(false)}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/50 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                    <X size={24} />
                </button>

                {/* Left: Visual Content Area */}
                <div className="h-80 md:h-full md:w-5/12 relative group bg-stone-900 flex flex-col shrink-0">
                    {/* View Toggle */}
                    <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30 flex bg-black/80 backdrop-blur-md rounded-xl p-1 md:p-1.5 border border-white/20 shadow-xl scale-90 origin-top-left md:scale-100">
                         <button 
                            onClick={() => setProfileViewMode('portrait')}
                            className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition-all font-medium text-xs md:text-sm ${profileViewMode === 'portrait' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-400 hover:text-white hover:bg-white/10'}`}
                         >
                            <User size={16} className="md:w-5 md:h-5" />
                            <span>{t.viewPortrait}</span>
                         </button>
                         <button 
                            onClick={() => setProfileViewMode('story')}
                            className={`flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition-all font-medium text-xs md:text-sm ${profileViewMode === 'story' ? 'bg-indigo-600 text-white shadow-lg' : 'text-stone-400 hover:text-white hover:bg-white/10'}`}
                         >
                            <Film size={16} className="md:w-5 md:h-5" />
                            <span>{t.viewStoryboard}</span>
                         </button>
                    </div>

                    {profileViewMode === 'portrait' ? (
                        /* PORTRAIT VIEW */
                        <div 
                            className="relative w-full h-full cursor-pointer overflow-hidden" 
                            onClick={() => activeChar.imageUrl && setLightboxData({ url: activeChar.imageUrl, caption: activeChar.name + " - " + t.portrait })}
                        >
                            {activeChar.imageUrl ? (
                                <img src={activeChar.imageUrl} alt={activeChar.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-stone-800">
                                    <User size={100} strokeWidth={0.5} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent opacity-60 pointer-events-none"></div>
                            {activeChar.imageUrl && (
                                <div className="absolute bottom-4 right-4 p-2 bg-black/60 backdrop-blur text-white/70 rounded-lg flex items-center gap-2 text-xs font-medium pointer-events-none">
                                    <Maximize2 size={14} />
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">{t.expand}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* STORYBOARD VIEW */
                        <div className="w-full h-full bg-[#050505] relative flex items-center justify-center overflow-hidden">
                             
                             {/* Background Grid Pattern for empty space */}
                             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                             {isGeneratingStory && (
                                 <div className="absolute inset-0 z-40 bg-stone-950/80 backdrop-blur-md flex flex-col items-center justify-center gap-6 text-center p-8 animate-fadeIn transition-all duration-500">
                                     <div className="relative">
                                         <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full animate-pulse"></div>
                                         <Sparkles size={48} className="text-indigo-400 animate-spin duration-[3000ms] relative z-10" />
                                     </div>
                                     <div className="space-y-2 relative z-10">
                                         <h4 className="text-xl font-heading text-indigo-100 tracking-wide animate-pulse">{t.visualizingLegend}</h4>
                                         <p className="text-sm text-stone-400 max-w-xs mx-auto leading-relaxed">{t.visualizingSub}</p>
                                     </div>
                                 </div>
                             )}

                             {activeChar.visualStoryUrl ? (
                                <div 
                                    className="w-full h-full cursor-pointer overflow-hidden relative group/story"
                                    onClick={() => activeChar.visualStoryUrl && setLightboxData({ url: activeChar.visualStoryUrl, caption: activeChar.name + " - " + t.originStoryboard })}
                                >
                                    <img 
                                        key={activeChar.visualStoryUrl} // Force remount on URL change to ensure transitions fire
                                        src={activeChar.visualStoryUrl} 
                                        alt="Storyboard" 
                                        className="w-full h-full object-cover opacity-0 transition-opacity duration-1000 group-hover/story:scale-105" 
                                        onLoad={(e) => e.currentTarget.classList.remove('opacity-0')}
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
                                    <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                                        <span className="text-xs font-bold uppercase tracking-widest text-indigo-300/80">{t.originStoryboard}</span>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); generateStoryboard(); }}
                                            className="p-2 bg-black/60 backdrop-blur hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors"
                                            title={t.regenerate}
                                        >
                                            <RefreshCw size={16} />
                                        </button>
                                    </div>
                                </div>
                             ) : (
                                <div className="text-center p-8 max-w-sm relative z-10">
                                    <div className="w-16 h-16 bg-stone-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                                        <ImageIcon size={24} className="text-stone-600" />
                                    </div>
                                    <h4 className="text-lg font-heading text-stone-400 mb-2">{t.noStoryboard}</h4>
                                    <p className="text-stone-600 text-sm mb-6">{t.generateStoryboard.replace('{name}', activeChar.name)}</p>
                                    
                                    <button 
                                        onClick={generateStoryboard}
                                        disabled={isGeneratingStory || !activeChar.backgroundStory}
                                        className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 hover:text-white rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                                    >
                                        <Sparkles size={16} className="group-hover/btn:text-white" />
                                        <span className="font-bold text-sm">{t.visualizeOrigin}</span>
                                    </button>
                                    {!activeChar.backgroundStory && (
                                        <p className="text-xs text-red-400/50 mt-3 flex items-center justify-center gap-1">
                                            <AlertCircle size={10} />
                                            {t.backgroundRequired}
                                        </p>
                                    )}
                                </div>
                             )}
                        </div>
                    )}
                </div>

                {/* Right: Info */}
                <div className="md:w-7/12 h-full overflow-y-auto custom-scrollbar p-6 md:p-12">
                    <div className="mb-6 md:mb-8">
                        <h2 className="text-3xl md:text-5xl font-heading text-white mb-2 leading-tight">{activeChar.name}</h2>
                        <div className="flex items-center gap-3 text-indigo-400 font-bold tracking-widest uppercase text-xs md:text-sm">
                            <span>{activeChar.race}</span>
                            <span className="w-1 h-1 rounded-full bg-stone-600"></span>
                            <span>{activeChar.class}</span>
                        </div>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                        <div>
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 md:mb-3 border-b border-white/5 pb-2">{t.appearance}</h4>
                            <p className="text-stone-300 leading-relaxed text-sm md:text-base">{activeChar.description}</p>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2 md:mb-3 border-b border-white/5 pb-2">{t.theLegend}</h4>
                            <div className="prose prose-invert prose-lg max-w-none">
                                <p className="font-story text-amber-100/90 whitespace-pre-line leading-loose text-base md:text-lg">
                                    {activeChar.backgroundStory || t.noLegend}
                                </p>
                            </div>
                        </div>

                        <div className="pt-6 md:pt-8 mt-6 md:mt-8 border-t border-white/5 flex gap-4">
                            <button 
                                onClick={(e) => openEdit(activeChar, e)}
                                className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                                <Pencil size={16} />
                                {t.editProfile}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxData && createPortal(
          <div 
            className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
            onClick={() => setLightboxData(null)}
          >
              <div className="relative max-w-7xl max-h-screen flex flex-col items-center">
                  <img 
                    src={lightboxData.url} 
                    alt="Full View" 
                    className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm" 
                  />
                  {lightboxData.caption && (
                      <div className="mt-4 bg-black/50 backdrop-blur-md px-6 py-4 rounded-xl border border-white/10 max-w-3xl">
                          <p className="text-center text-stone-200 font-story text-lg italic leading-relaxed">
                              "{lightboxData.caption}"
                          </p>
                      </div>
                  )}
                  <p className="text-center text-stone-500 mt-4 font-heading tracking-widest text-[10px] uppercase">
                      {t.tapToClose}
                  </p>
              </div>
          </div>,
          document.body
      )}

    </div>
  );
};

export default CharacterRoster;
