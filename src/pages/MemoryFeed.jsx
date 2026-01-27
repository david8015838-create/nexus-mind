import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';
import { ensureSeedData } from '../db/database';
import Tesseract from 'tesseract.js';

const MemoryFeed = () => {
  const navigate = useNavigate();
  const { contacts, addContact, updateContact, addMemory, userProfile, updateProfile, customPrompt } = useNexus();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  
  // Add Memory Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newContactName, setNewContactName] = useState('');
  const [newBirthday, setNewBirthday] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);

  const categories = useMemo(() => {
    return userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要'];
  }, [userProfile]);

  // Set initial category once categories are loaded
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return contacts?.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];
  }, [contacts, searchQuery]);

  const handleAddMemory = async () => {
    let contactId = selectedContactId;
    
    if (!contactId && newContactName.trim()) {
      // Create new contact if not selected
      contactId = await addContact({
        name: newContactName,
        phone: newPhone,
        tags: [selectedCategory, '手動新增'],
        importance: 50,
        birthday: newBirthday || null,
        memories: []
      });
    } else if (contactId && (newBirthday || newPhone)) {
      // 如果是現有聯絡人且填寫了生日或電話，則更新
      const updates = {};
      if (newBirthday) updates.birthday = newBirthday;
      if (newPhone) updates.phone = newPhone;
      await updateContact(contactId, updates);
    }

    if (contactId && newMemoryContent.trim()) {
      await addMemory(contactId, {
        content: newMemoryContent,
        location: '手動記錄',
        date: new Date(eventDate)
      });
      
      // Reset and Close
      setIsModalOpen(false);
      setSearchQuery('');
      setSelectedContactId(null);
      setNewMemoryContent('');
      setNewContactName('');
      setNewBirthday('');
      setNewPhone('');
      setSelectedCategory(categories[0] || '');
      setEventDate(new Date().toISOString().split('T')[0]);
      setIsFabOpen(false);
      
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleForceSeed = async () => {
    await ensureSeedData(true);
    window.location.reload();
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => console.log(m)
      });
      
      const ocrText = result.data.text;
      const newContactId = await addContact({
        name: 'New Contact (OCR)',
        cardImage: URL.createObjectURL(file), // In a real app, convert to base64 for IndexedDB
        ocrText,
        tags: ['OCR Scan'],
        memories: [{ date: new Date(), content: 'Scanned business card.', location: 'Unknown' }],
        importance: 50,
      });

      if (navigator.vibrate) navigator.vibrate(50);
      navigate(`/profile/${newContactId}`);
    } catch (error) {
      console.error('OCR failed:', error);
    } finally {
      setIsScanning(false);
      setIsFabOpen(false);
    }
  };

  return (
    <div className="w-full h-full bg-mesh">
      {/* Header with improved styling */}
      <header className="sticky top-0 z-40 bg-background-dark/80 backdrop-blur-xl pt-safe-top pb-4 px-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="size-11 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-0.5 shadow-lg shadow-primary/10">
              <div className="w-full h-full rounded-[14px] bg-background-dark flex items-center justify-center overflow-hidden relative">
                <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                <div className="w-full h-full bg-center bg-cover relative z-10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBJ4IyEmTKuuDd2LjWAC_c9c8tbn5UsDuZ85z0b0z_HBfvqJ4cQzftfEWYtbuMvNodNOqEw3h7fMRezfuyubNk2VnpKp61bj6d8qV-c7oSv3Ufa9_iTZrjQO-CALbBVBwf-W19vXdty89lNH0k570SZEfrd51IheZ36T4qnGOPlLtPHP0wxw0GmlB779orEW3f-PI_n3r9fryi_FUXsQ1ACzGzbpxj59uSIgA0dB0CHcN7fE45lIFTfnzWZMMuPaxKE4Edpjn64W4Q")' }}></div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white mb-0.5">記憶時光軸</h1>
              <p className="text-[11px] font-bold text-white/40 tracking-wider uppercase">Nexus Mind</p>
            </div>
          </div>
          <button className="size-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 active:scale-95 transition-all" onClick={handleForceSeed} title="重置測試資料">
            <span className="material-symbols-outlined text-[20px] text-white/60">database</span>
          </button>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
          <div className="glass-search flex items-center h-12 rounded-2xl px-4 relative z-10 transition-all border border-white/10 group-focus-within:border-primary/50 group-focus-within:bg-background-dark/90" onClick={() => navigate('/search')}>
            <span className="material-symbols-outlined text-white/40 text-[20px] group-focus-within:text-primary transition-colors">search</span>
            <input className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-white/30 font-medium ml-3 text-white" placeholder="搜尋記憶..." type="text" readOnly />
            <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-white/30 font-bold">CMD+K</div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="px-6 mb-2 sticky top-[136px] z-30 bg-background-dark/95 backdrop-blur-xl py-2 -mx-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 pb-2">
          {['全部', '地點', '名片', '重要'].map((tab, i) => (
            <button 
              key={tab}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                i === 0 
                  ? 'bg-white text-background-dark shadow-lg shadow-white/10' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 px-4 pb-32 space-y-4">
        {isScanning && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-sm text-[#9da6b9]">正在分析名片...</span>
          </div>
        )}
        
        {contacts?.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-20 text-[#9da6b9]">
            <span className="material-symbols-outlined text-64px opacity-20 mb-4">database_off</span>
            <p className="text-sm font-medium">尚無資料，請點擊右上角資料庫圖示初始化。</p>
          </div>
        )}
        
        {contacts?.map(contact => (
          <div key={contact.id} className="group relative bg-[#1c1f27]/40 backdrop-blur-md border border-white/5 rounded-[32px] overflow-hidden transition-all duration-500 hover:border-primary/30 hover:bg-[#1c1f27]/60 active:scale-[0.98]" onClick={() => navigate(`/profile/${contact.id}`)}>
            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-primary/20 transition-colors">
                    {contact.cardImage ? (
                      <img src={contact.cardImage} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={contact.name} />
                    ) : (
                      <span className="material-symbols-outlined text-white/10 text-2xl">person</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-white group-hover:text-primary transition-colors">{contact.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20 uppercase tracking-wider">
                        {contact.tags?.[0] || '一般'}
                      </span>
                      <span className="text-[10px] font-medium text-white/30 uppercase">
                        {new Date(contact.lastUpdated).toLocaleDateString('zh-TW')}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="size-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white/60 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/20 rounded-full"></div>
                <p className="pl-4 text-[14px] text-white/70 font-medium leading-relaxed line-clamp-2 italic">
                  "{contact.memories?.[0]?.content || contact.ocrText?.substring(0, 100) || '尚無詳細資訊。'}"
                </p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="material-symbols-outlined text-[14px] text-white/40">location_on</span>
                  <span className="text-[11px] font-bold text-white/40">{contact.memories?.[0]?.location || '未知地點'}</span>
                </div>
                {contact.memories?.length > 1 && (
                  <div className="text-[11px] font-bold text-primary/60">
                    +{contact.memories.length - 1} 則記憶
                  </div>
                )}
              </div>
            </div>
            
            {/* Decoration line */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        ))}
      </main>

      {/* FAB - Redesigned for mobile thumb access */}
      <div className="fixed bottom-28 right-6 z-50">
        <div className="relative">
          {isFabOpen && (
            <div className="absolute bottom-full right-0 mb-4 space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
              <label className="flex items-center justify-end gap-3 cursor-pointer group">
                <span className="bg-[#1c1f27] border border-white/10 px-4 py-2 rounded-2xl text-xs font-bold text-white/80 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">掃描名片</span>
                <div className="size-14 bg-[#1c1f27] border border-white/10 rounded-[22px] flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all shadow-2xl">
                  <span className="material-symbols-outlined text-2xl">contact_page</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <button 
                className="flex items-center justify-end gap-3 group"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="bg-[#1c1f27] border border-white/10 px-4 py-2 rounded-2xl text-xs font-bold text-white/80 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">快速筆記</span>
                <div className="size-14 bg-[#1c1f27] border border-white/10 rounded-[22px] flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all shadow-2xl">
                  <span className="material-symbols-outlined text-2xl">edit_note</span>
                </div>
              </button>
            </div>
          )}
          <button 
            className={`size-16 rounded-[24px] bg-primary flex items-center justify-center transition-all duration-500 shadow-xl shadow-primary/30 active:scale-90 ${isFabOpen ? 'rotate-[135deg] rounded-full' : 'rotate-0'}`}
            onClick={() => setIsFabOpen(!isFabOpen)}
          >
            <span className="material-symbols-outlined text-white text-3xl">add</span>
          </button>
        </div>
      </div>

      {/* Add Memory Modal - Improved Layout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-0">
          <div className="fixed inset-0 bg-background-dark/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-[480px] bg-[#16181d] border-t border-white/10 rounded-t-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full duration-500 ease-out">
            <div className="h-1.5 w-12 bg-white/10 rounded-full mx-auto mt-3 mb-2"></div>
            
            <div className="p-8 space-y-6 max-h-[90vh] overflow-y-auto no-scrollbar pb-12">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">新增記憶碎片</h2>
                  <p className="text-xs text-white/40 font-bold mt-1 uppercase tracking-widest">New Memory Fragment</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="size-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Contact Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-lg">person_add</span>
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">關聯對象</label>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-[20px] px-5 py-4 text-white text-[15px] focus:ring-1 ring-primary/50 outline-none transition-all placeholder:text-white/20"
                    placeholder="搜尋或輸入新姓名..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!selectedContactId) setNewContactName(e.target.value);
                    }}
                  />
                  {selectedContactId && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-primary/20 text-primary text-[10px] font-bold px-3 py-1.5 rounded-full border border-primary/20">
                      <span>已選取對象</span>
                      <button onClick={() => {
                        setSelectedContactId(null);
                        setSearchQuery(newContactName);
                      }} className="flex items-center">
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchQuery && !selectedContactId && (
                  <div className="bg-white/5 border border-white/10 rounded-[20px] overflow-hidden mt-2 max-h-48 overflow-y-auto no-scrollbar divide-y divide-white/5">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(c => (
                        <button 
                          key={c.id}
                          className="w-full text-left px-5 py-4 text-[14px] text-white/80 hover:bg-primary/10 transition-colors flex justify-between items-center group"
                          onClick={() => {
                            setSelectedContactId(c.id);
                            setSearchQuery(c.name);
                            setNewContactName(c.name);
                          }}
                        >
                          <span className="font-bold group-hover:text-primary transition-colors">{c.name}</span>
                          <span className="text-[10px] font-bold text-white/30 bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">{c.tags?.[0]}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-5 py-4 text-[13px] text-white/40 italic flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">info</span>
                        將為「{searchQuery}」建立新檔案
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Category Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-lg">label</span>
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">選擇分類</label>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2.5 rounded-[15px] text-[12px] font-bold transition-all border ${
                        selectedCategory === cat 
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button 
                    onClick={async () => {
                      const newCat = await customPrompt('新增分類', '輸入分類名稱...');
                      if (newCat) {
                        const currentCats = userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要'];
                        if (!currentCats.includes(newCat)) {
                          updateProfile({ ...userProfile, categories: [...currentCats, newCat] });
                          setSelectedCategory(newCat);
                        }
                      }
                    }}
                    className="px-4 py-2.5 rounded-[15px] text-[12px] font-bold bg-primary/10 border border-primary/20 border-dashed text-primary hover:bg-primary/20 transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    新增
                  </button>
                </div>
              </div>

              {/* Memory Content */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary text-lg">edit_note</span>
                  <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">記憶描述</label>
                </div>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-[24px] px-5 py-4 text-white text-[15px] focus:ring-1 ring-primary/50 outline-none transition-all h-32 resize-none no-scrollbar placeholder:text-white/20"
                  placeholder="那天發生了什麼事？有什麼特別的細節..."
                  value={newMemoryContent}
                  onChange={(e) => setNewMemoryContent(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">發生日期</label>
                  <input 
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:ring-1 ring-primary outline-none transition-all color-scheme-dark"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">聯絡電話</label>
                  <input 
                    type="tel"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white text-sm focus:ring-1 ring-primary outline-none transition-all placeholder:text-white/20"
                    placeholder="選填"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                  />
                </div>
              </div>

              <button 
                className={`w-full py-5 rounded-[24px] font-bold text-[16px] tracking-wide transition-all mt-4 ${
                  (selectedContactId || newContactName) && newMemoryContent 
                    ? 'bg-primary text-white shadow-xl shadow-primary/30 active:scale-95' 
                    : 'bg-white/5 text-white/10 cursor-not-allowed'
                }`}
                disabled={!( (selectedContactId || newContactName) && newMemoryContent )}
                onClick={handleAddMemory}
              >
                儲存記憶碎片
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Removed (Use Layout's BottomNav instead) */}
    </div>
  );
};

export default MemoryFeed;
