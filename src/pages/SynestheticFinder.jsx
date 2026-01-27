import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';

const SynestheticFinder = () => {
  const navigate = useNavigate();
  const { contacts, userProfile } = useNexus();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('全部');

  const categories = useMemo(() => {
    const customCats = userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要'];
    return ['全部', ...customCats];
  }, [userProfile]);

  const displayResults = useMemo(() => {
    let filtered = contacts || [];

    // Filter by Category
    if (activeCategory !== '全部') {
      filtered = filtered.filter(c => c.tags?.includes(activeCategory));
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact => {
        const matchName = contact.name?.toLowerCase().includes(query);
        const matchPhone = contact.phone?.toLowerCase().includes(query);
        const matchTags = contact.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchOCR = contact.ocrText?.toLowerCase().includes(query);
        const matchMemories = contact.memories?.some(m => m.content.toLowerCase().includes(query));
        
        if (matchName || matchPhone || matchTags || matchOCR || matchMemories) {
          contact._matchReason = matchName ? '姓名匹配' : 
                                 matchPhone ? '電話匹配' :
                                 matchTags ? `標籤 #${query}` : 
                                 matchOCR ? '名片辨識' : '記憶內容';
          return true;
        }
        return false;
      });
    } else if (activeCategory === '全部') {
      filtered = filtered.slice(0, 5);
    }

    return filtered;
  }, [contacts, searchQuery, activeCategory]);

  return (
    <div className="bg-mesh pb-32 overflow-x-hidden">
      <header className="sticky top-0 z-50 -mx-4 px-6 pt-12 pb-6 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/80 to-transparent pointer-events-none -z-10"></div>
        <div className="flex items-center justify-between">
          <button 
            className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
            onClick={() => navigate(-1)}
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back_ios_new</span>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-white tracking-tight">聯覺搜尋</h1>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Synesthetic Search</p>
          </div>
          <div className="size-10"></div>
        </div>
      </header>

      <div className="px-6 py-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-white/20 text-[20px] group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input 
            className="block w-full h-12 pl-12 pr-10 bg-[#1c1f27]/60 backdrop-blur-md border border-white/5 rounded-2xl text-[14px] font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-xl" 
            placeholder="搜尋記憶、電話、標籤..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <div className="absolute inset-y-0 right-4 flex items-center">
              <button 
                className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-white/30 hover:text-white transition-colors"
                onClick={() => setSearchQuery('')}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-6 pb-6 overflow-x-auto no-scrollbar">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-xl px-5 transition-all duration-300 border ${
              activeCategory === cat 
                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                : 'bg-white/5 border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
            }`}
          >
            <span className="text-xs font-bold tracking-wider">{cat}</span>
          </button>
        ))}
      </div>

      <main className="px-6 space-y-4">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
            {searchQuery || activeCategory !== '全部' ? `篩選結果 (${displayResults.length})` : '最近的記憶'}
          </h3>
          <span className="text-[10px] font-bold text-primary/40 uppercase">Sort by Date</span>
        </div>
        
        <div className="grid gap-4">
          {displayResults.map(result => (
            <div 
              key={result.id} 
              className="group relative bg-[#1c1f27]/40 backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:border-primary/30 hover:bg-[#1c1f27]/60 active:scale-[0.98]"
              onClick={() => navigate(`/profile/${result.id}`)}
            >
              <div className="p-5 flex gap-4">
                <div className="size-20 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-primary/20 transition-colors shrink-0">
                  {result.cardImage ? (
                    <img className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" src={result.cardImage} alt={result.name} />
                  ) : (
                    <span className="material-symbols-outlined text-white/10 text-3xl">person</span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20 uppercase tracking-wider">
                      {result._matchReason || '最新互動'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors truncate">{result.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-white/30">
                    {result.phone && (
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">call</span>
                        <span className="text-[11px] font-medium">{result.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      <span className="text-[11px] font-medium">{new Date(result.lastUpdated).toLocaleDateString('zh-TW')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="material-symbols-outlined text-white/10 group-hover:text-primary/50 transition-colors">chevron_right</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {displayResults.length === 0 && (
          <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
            <div className="size-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-white/10">search_off</span>
            </div>
            <p className="text-white/20 text-sm font-bold tracking-widest uppercase">尚無相關記憶...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SynestheticFinder;
