import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';

const StealthInput = () => {
  const navigate = useNavigate();
  const { contacts, updateContact, addMemory } = useNexus();
  const [isStealthOpen, setIsStealthOpen] = useState(false);
  const [stealthText, setStealthText] = useState('');
  const [importance, setImportance] = useState(65);
  const [urgency, setUrgency] = useState(40);
  const [activeContactId, setActiveContactId] = useState(null);

  useEffect(() => {
    if (contacts && contacts.length > 0 && !activeContactId) {
      setActiveContactId(contacts[0].id);
      setImportance(contacts[0].importance || 50);
    }
  }, [contacts]);

  const handleImportanceChange = (e) => {
    const value = parseInt(e.target.value);
    setImportance(value);
    if (activeContactId) {
      updateContact(activeContactId, { importance: value });
    }
  };

  const handleSaveMemory = async () => {
    if (!stealthText.trim() || !activeContactId) return;
    
    await addMemory(activeContactId, {
      content: stealthText,
      location: 'Stealth Input',
    });
    
    if (navigator.vibrate) navigator.vibrate(50);
    setStealthText('');
    setIsStealthOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveMemory();
    }
  };

  const currentContact = contacts?.find(c => c.id === activeContactId);

  return (
    <div className="bg-background-dark text-white min-h-screen overflow-hidden select-none relative">
      {/* Status Bar */}
      <div className="fixed top-0 w-full z-50 px-8 pt-4 pb-2 flex justify-between items-end">
        <div className="text-sm font-semibold tracking-tight" onClick={() => navigate(-1)}>9:41</div>
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px]">signal_cellular_4_bar</span>
          <span className="material-symbols-outlined text-[18px]">wifi</span>
          {/* Battery Trigger */}
          <button 
            className="flex items-center gap-1 group focus:outline-none" 
            onClick={() => setIsStealthOpen(true)}
          >
            <span className="text-[11px] font-bold text-white/80 group-active:text-primary transition-colors">100%</span>
            <span className="material-symbols-outlined text-[24px] text-white group-active:text-primary transition-colors">battery_full</span>
          </button>
        </div>
      </div>

      <main className="relative h-screen w-full flex flex-col justify-start pt-16 px-6 gap-6">
        {/* Connectivity Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="ios-platter p-4 rounded-3xl grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center gap-1" onClick={() => navigate('/')}>
              <div className="size-11 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[22px]">grid_view</span>
              </div>
              <span className="text-[10px] font-medium text-white/60">動態</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
              <div className="size-11 rounded-full bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[22px]">cell_tower</span>
              </div>
              <span className="text-[10px] font-medium text-white/60">今日會面</span>
            </div>
          </div>

          <div className="ios-platter p-4 rounded-3xl flex flex-col items-center justify-center gap-2">
            <div className="w-full flex justify-between items-center opacity-40">
              <span className="text-[10px] font-bold uppercase tracking-widest">目標人物</span>
              <span className="material-symbols-outlined text-[14px]">more_horiz</span>
            </div>
            <div className="text-center py-2">
              <div className="text-sm font-bold truncate w-28">{currentContact?.name || '無目標'}</div>
              <div className="text-xs text-white/50">{currentContact?.tags?.[0] || '閒置'}</div>
            </div>
          </div>
        </div>

        {/* Vertical Sliders */}
        <div className="grid grid-cols-2 gap-4 h-48">
          {/* Importance Slider */}
          <div className="ios-platter rounded-3xl relative overflow-hidden flex flex-col items-center justify-end">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={importance}
              onChange={handleImportanceChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' }}
            />
            <div className="absolute bottom-0 left-0 w-full bg-white/90 transition-all duration-200" style={{ height: `${importance}%` }}></div>
            <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none pb-4">
              <span className={`material-symbols-outlined text-[28px] ${importance > 50 ? 'text-black/40' : 'text-white/40'}`}>priority_high</span>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${importance > 50 ? 'text-black/40' : 'text-white/40'}`}>重要程度</span>
            </div>
          </div>

          {/* Urgency Slider */}
          <div className="ios-platter rounded-3xl relative overflow-hidden flex flex-col items-center justify-end">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={urgency}
              onChange={(e) => setUrgency(parseInt(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
              style={{ writingMode: 'bt-lr', appearance: 'slider-vertical' }}
            />
            <div className="absolute bottom-0 left-0 w-full bg-white/90 transition-all duration-200" style={{ height: `${urgency}%` }}></div>
            <div className="relative z-10 flex flex-col items-center gap-2 pointer-events-none pb-4">
              <span className={`material-symbols-outlined text-[28px] ${urgency > 50 ? 'text-black/40' : 'text-white/40'}`}>speed</span>
              <span className={`text-[10px] font-bold uppercase tracking-tighter ${urgency > 50 ? 'text-black/40' : 'text-white/40'}`}>緊急程度</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="ios-platter aspect-square rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined">flashlight_on</span>
          </div>
          <div className="ios-platter aspect-square rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div className="ios-platter aspect-square rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined">calculate</span>
          </div>
          <div className="ios-platter aspect-square rounded-2xl flex items-center justify-center" onClick={() => navigate('/search')}>
            <span className="material-symbols-outlined text-primary">location_on</span>
          </div>
        </div>

        <div className="mt-auto pb-10 flex flex-col items-center">
          <div className="w-32 h-1.5 bg-white/20 rounded-full mb-4"></div>
          <p className="text-[10px] text-white/30 font-medium tracking-wide">系統覆蓋中 SYSTEM OVERRIDE ACTIVE</p>
        </div>
      </main>

      {/* Stealth Input Layer */}
      {isStealthOpen && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-8 transition-opacity duration-300">
          <div className="w-full max-w-sm">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold text-white/40 tracking-[0.2em] uppercase">隱形輸入 Stealth Input</span>
              <button onClick={() => setIsStealthOpen(false)} className="text-[10px] text-primary bg-primary/20 px-2 py-0.5 rounded">關閉 CLOSE</button>
            </div>
            <textarea 
              autoFocus 
              className="w-full bg-transparent border-none text-white text-xl font-light placeholder-white/20 focus:ring-0 resize-none no-scrollbar h-64" 
              placeholder="在此輸入記憶內容..."
              value={stealthText}
              onChange={(e) => setStealthText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="mt-8 flex justify-between items-center border-t border-white/10 pt-4">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-white/40 text-[20px]">mic</span>
                <span className="material-symbols-outlined text-white/40 text-[20px]">image</span>
                <span className="material-symbols-outlined text-white/40 text-[20px]">add_location</span>
              </div>
              <button 
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-4 rounded-full transition-colors"
                onClick={handleSaveMemory}
              >
                儲存至保險箱 SAVE TO VAULT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#111318]">
        <div className="absolute top-[-10%] right-[-10%] size-96 bg-primary/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] size-96 bg-white/5 rounded-full blur-[120px]"></div>
      </div>
    </div>
  );
};

export default StealthInput;
