import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNexus } from '../context/NexusContext';

const TheProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateContact, deleteContact, userProfile, updateProfile, customPrompt, schedules } = useNexus();
  
  const contact = useLiveQuery(() => db.contacts.get(id), [id]);
  const contactSchedules = useMemo(() => {
    if (!schedules || !id) return [];
    return schedules.filter(s => s.contactIds.includes(id));
  }, [schedules, id]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [showShareToast, setShowShareToast] = useState(false);

  const handleFileChange = (e, target) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (target === 'gallery') {
        setEditForm(prev => ({...prev, gallery: [...prev.gallery, base64String]}));
      } else if (target === 'cardImage') {
        setEditForm(prev => ({...prev, cardImage: base64String}));
      }
    };
    reader.readAsDataURL(file);
  };

  if (!contact) return (
    <div className="min-h-screen flex items-center justify-center bg-background-dark">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const handleEditStart = () => {
    setEditForm({
      name: contact.name,
      birthday: contact.birthday || '',
      phone: contact.phone || '',
      tags: contact.tags?.join(', ') || '',
      ocrText: contact.ocrText || '',
      events: contact.events || [],
      bio: contact.bio || '',
      links: contact.links || [],
      gallery: contact.gallery || [],
      cardImage: contact.cardImage || ''
    });
    setIsEditing(true);
    setIsMenuOpen(false);
  };

  const handleSave = async () => {
    await updateContact(id, {
      name: editForm.name,
      birthday: editForm.birthday || null,
      phone: editForm.phone,
      tags: editForm.tags.split(',').map(t => t.trim()).filter(t => t),
      ocrText: editForm.ocrText,
      events: editForm.events,
      bio: editForm.bio,
      links: editForm.links,
      gallery: editForm.gallery,
      cardImage: editForm.cardImage
    });
    setIsEditing(false);
  };

  const handleCopyProfile = () => {
    const text = `
【Nexus Mind 聯絡人分享】
姓名：${contact.name}
${contact.phone ? `電話：${contact.phone}` : ''}
${contact.bio ? `簡介：${contact.bio}` : ''}
${contact.tags?.length ? `標籤：${contact.tags.join(', ')}` : ''}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2000);
    setIsMenuOpen(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`確定要刪除 ${contact.name} 的所有記憶檔案嗎？此動作無法復原。`)) {
      await deleteContact(id);
      navigate('/');
    }
  };

  const handleDeleteMemory = async (memoryIndex) => {
    if (window.confirm('確定要刪除這條記憶紀錄嗎？')) {
      const newMemories = [...contact.memories];
      newMemories.splice(memoryIndex, 1);
      await updateContact(id, { memories: newMemories });
    }
  };

  return (
    <div className="bg-nexus min-h-screen text-white pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 -mx-4 px-6 pt-8 pb-4 flex items-center justify-between transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/80 to-transparent pointer-events-none -z-10"></div>
        <div 
          onClick={() => navigate(-1)} 
          className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white tracking-tight">檔案詳情</h2>
          <p className="text-[10px] text-primary font-bold tracking-[0.2em] uppercase">Profile Analytics</p>
        </div>
        <div className="relative flex w-10 items-center justify-end">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]">more_vert</span>
          </button>

          {isMenuOpen && (
            <div className="absolute top-12 right-0 w-48 bg-[#1c1f27] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <button 
                onClick={handleEditStart}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 text-left transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary/80">edit</span>
                編輯檔案
              </button>
              <button 
                onClick={handleCopyProfile}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-white/10 text-left transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] text-primary/80">content_copy</span>
                複製分享
              </button>
              <div className="h-px bg-white/5 mx-4 my-1"></div>
              <button 
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 text-left transition-colors"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
                <span>刪除檔案</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="px-6 py-4">
        <div className="relative w-full aspect-[16/10] bg-[#1c1f27] rounded-[32px] overflow-hidden border border-white/5 group shadow-2xl">
          {contact.cardImage ? (
             <div className="absolute inset-0 bg-cover bg-center transition-all duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${contact.cardImage})` }}>
               <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/20 to-transparent opacity-60"></div>
             </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/5">
              <span className="material-symbols-outlined text-6xl text-white/5">image</span>
            </div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20 uppercase tracking-wider backdrop-blur-md">
                  {contact.tags?.[0] || '一般'}
                </span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight mb-1 drop-shadow-lg">{contact.name}</h1>
              {contact.phone && (
                <div className="flex items-center gap-2 text-white/60">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                  <span className="text-sm font-medium tracking-wide">{contact.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-2">
        {/* Upcoming Schedules */}
        {contactSchedules.length > 0 && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary ml-1">即將到來的日程</h2>
            <div className="space-y-3">
              {contactSchedules.map(schedule => {
                const diffDays = Math.ceil((new Date(schedule.date) - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                const isVerySoon = diffDays >= 0 && diffDays <= 3;
                
                return (
                  <div key={schedule.id} className={`p-4 rounded-2xl border transition-all ${
                    isVerySoon 
                      ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/5' 
                      : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-sm text-white">{schedule.title}</h3>
                        <p className="text-[10px] text-white/40 mt-1">
                          {new Date(schedule.date).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <div className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        isVerySoon ? 'bg-primary text-white' : 'bg-white/10 text-white/60'
                      }`}>
                        {diffDays === 0 ? '今天' : diffDays < 0 ? '已過期' : `${diffDays} 天後`}
                      </div>
                    </div>
                    {isVerySoon && (
                      <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        日程即將到來，建議複習對象資訊
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#1c1f27]/40 backdrop-blur-xl border border-white/5 rounded-[32px] p-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">個人封面照片</label>
              <div 
                onClick={() => document.getElementById('card-image-input').click()}
                className="relative w-full aspect-[16/10] bg-[#1c1f27] rounded-[32px] overflow-hidden border border-white/10 group cursor-pointer hover:border-primary/50 transition-all shadow-2xl"
              >
                {editForm.cardImage ? (
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${editForm.cardImage})` }}>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/20">
                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest">點擊上傳封面</span>
                  </div>
                )}
                <input 
                  id="card-image-input"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleFileChange(e, 'cardImage')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">姓名</label>
              <input 
                className="w-full bg-[#1c1f27] border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">電話</label>
              <input 
                type="tel"
                className="w-full bg-[#1c1f27] border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner"
                placeholder="09xx-xxx-xxx"
                value={editForm.phone}
                onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">生日 (YYYY-MM-DD)</label>
              <input 
                type="date"
                className="w-full bg-[#1c1f27] border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner color-scheme-dark"
                value={editForm.birthday}
                onChange={(e) => setEditForm({...editForm, birthday: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">所屬分類</label>
              <div className="bg-[#1c1f27] rounded-2xl p-4 border border-white/10 shadow-inner">
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar">
                  {(userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要']).map(cat => {
                    const currentTags = editForm.tags.split(',').map(t => t.trim()).filter(t => t);
                    const isSelected = currentTags.includes(cat);
                    return (
                      <button 
                        key={cat}
                        type="button"
                        onClick={() => {
                          let newTags;
                          if (isSelected) {
                            newTags = currentTags.filter(t => t !== cat);
                          } else {
                            newTags = [...currentTags, cat];
                          }
                          setEditForm({...editForm, tags: newTags.join(', ')});
                        }}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                          isSelected 
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                  <button 
                    type="button"
                    onClick={async () => {
                      const newCat = await customPrompt('新增分類', '輸入分類名稱...');
                      if (newCat) {
                        const currentCats = userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要'];
                        if (!currentCats.includes(newCat)) {
                          updateProfile({ ...userProfile, categories: [...currentCats, newCat] });
                          const currentTags = editForm.tags.split(',').map(t => t.trim()).filter(t => t);
                          setEditForm({...editForm, tags: [...currentTags, newCat].join(', ')});
                        }
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold bg-primary/10 border border-primary/20 border-dashed text-primary hover:bg-primary/20 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    新增分類
                  </button>
                  <button 
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white/5 border border-white/10 border-dashed text-white/30 hover:text-white/60 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">settings</span>
                    管理
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">個人簡介 (IG Style Bio)</label>
              <textarea 
                className="w-full bg-[#1c1f27] border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner h-28"
                placeholder="輸入簡短的自我介紹..."
                value={editForm.bio}
                onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">連結 / 社群網址</label>
                <button 
                  onClick={() => setEditForm({
                    ...editForm, 
                    links: [...editForm.links, { label: '', url: '' }]
                  })}
                  className="text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  新增連結
                </button>
              </div>
              <div className="space-y-2">
                {editForm.links.map((link, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-right-2 duration-300">
                    <input 
                      className="w-24 bg-[#1c1f27] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:ring-1 ring-primary/50 outline-none transition-all shrink-0"
                      placeholder="名稱 (IG)"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...editForm.links];
                        newLinks[idx].label = e.target.value;
                        setEditForm({...editForm, links: newLinks});
                      }}
                    />
                    <input 
                      className="flex-1 min-w-0 bg-[#1c1f27] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:ring-1 ring-primary/50 outline-none transition-all"
                      placeholder="網址 (https://...)"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...editForm.links];
                        newLinks[idx].url = e.target.value;
                        setEditForm({...editForm, links: newLinks});
                      }}
                    />
                    <button 
                      onClick={() => setEditForm({...editForm, links: editForm.links.filter((_, i) => i !== idx)})} 
                      className="size-10 rounded-xl bg-red-400/5 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">相簿 / 照片牆</label>
                <button 
                  onClick={() => document.getElementById('gallery-upload-input').click()}
                  className="text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">add_photo_alternate</span>
                  新增照片
                </button>
                <input 
                  id="gallery-upload-input"
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setEditForm(prev => ({...prev, gallery: [...prev.gallery, reader.result]}));
                      };
                      reader.readAsDataURL(file);
                    });
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {editForm.gallery.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group/img shadow-lg">
                    <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110" alt="" />
                    <button 
                      onClick={() => setEditForm({...editForm, gallery: editForm.gallery.filter((_, i) => i !== idx)})}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-white text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
                <button 
                  onClick={() => document.getElementById('gallery-upload-input').click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/10 hover:text-white/20 hover:border-white/10 transition-all"
                >
                  <span className="material-symbols-outlined text-2xl">add</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">背景資訊 / 備註</label>
              <textarea 
                className="w-full bg-[#1c1f27] border border-white/10 rounded-2xl px-5 py-4 text-white text-[13px] font-medium placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner h-28"
                placeholder="輸入職稱、公司、興趣或其他備註..."
                value={editForm.ocrText}
                onChange={(e) => setEditForm({...editForm, ocrText: e.target.value})}
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">重要事件</label>
                <button 
                  onClick={() => setEditForm({
                    ...editForm, 
                    events: [...editForm.events, { date: new Date().toISOString().split('T')[0], title: '', type: 'event' }]
                  })}
                  className="text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-80 transition-all"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  新增事件
                </button>
              </div>
              
              <div className="space-y-2">
                {editForm.events.map((ev, idx) => (
                  <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-right-2 duration-200">
                    <input 
                      type="date"
                      className="bg-[#1c1f27] border border-white/10 rounded-xl px-3 py-3 text-[13px] text-white focus:ring-1 ring-primary/50 outline-none transition-all color-scheme-dark w-32 shrink-0"
                      value={ev.date}
                      onChange={(e) => {
                        const newEvents = [...editForm.events];
                        newEvents[idx].date = e.target.value;
                        setEditForm({...editForm, events: newEvents});
                      }}
                    />
                    <input 
                      className="flex-1 min-w-0 bg-[#1c1f27] border border-white/10 rounded-xl px-4 py-3 text-[13px] text-white focus:ring-1 ring-primary/50 outline-none transition-all"
                      placeholder="事件名稱"
                      value={ev.title}
                      onChange={(e) => {
                        const newEvents = [...editForm.events];
                        newEvents[idx].title = e.target.value;
                        setEditForm({...editForm, events: newEvents});
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newEvents = [...editForm.events];
                        newEvents.splice(idx, 1);
                        setEditForm({...editForm, events: newEvents});
                      }}
                      className="size-11 rounded-xl bg-red-400/5 text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button 
                onClick={handleSave}
                className="flex-1 h-14 bg-primary text-white rounded-2xl font-bold text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all"
              >
                儲存變更
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-8 h-14 bg-white/5 text-white/60 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-white tracking-tight text-[32px] font-extrabold leading-tight">{contact.name}</h1>
            <p className="text-white/60 text-lg font-medium leading-normal mt-1">
              {contact.ocrText?.split('\n')[0] || '專業人士'}
            </p>

            {/* Contact Details */}
            {contact.phone && (
              <div className="flex items-center gap-2 mt-2 text-primary/80">
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span className="text-sm font-medium tracking-wide">{contact.phone}</span>
              </div>
            )}

            {/* Bio Section */}
            {contact.bio && (
              <p className="text-white/80 text-sm mt-3 leading-relaxed whitespace-pre-wrap">
                {contact.bio}
              </p>
            )}

            {/* Links Section */}
            {contact.links && contact.links.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {contact.links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-400 transition-all"
                  >
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    {link.label}
                  </a>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {contact.tags?.map((tag, index) => (
                <div key={index} className={`${index === 0 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-white/5 text-white/80 border-white/10'} px-3 py-1 rounded-full text-xs font-bold border`}>
                  #{tag}
                </div>
              ))}
              {contact.birthday && (
                <div className="bg-pink-500/10 text-pink-500 border-pink-500/20 px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">cake</span>
                  {new Date(contact.birthday).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="h-4"></div>

      {/* Gallery Section */}
      {contact.gallery && contact.gallery.length > 0 && (
        <div className="px-4 mb-6">
          <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mb-4">照片牆</h3>
          <div className="grid grid-cols-3 gap-2">
            {contact.gallery.map((img, idx) => (
              <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/5 cursor-pointer hover:opacity-90 transition-opacity">
                <img src={img} className="w-full h-full object-cover" alt={`gallery-${idx}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4">
        <h3 className="text-white/40 text-[11px] font-bold uppercase tracking-[0.2em] mb-6">互動時間軸</h3>
        <div className="space-y-8">
          {contact.memories?.map((memory, index) => (
            <div key={index} className={`relative ${index !== contact.memories.length - 1 ? 'timeline-line' : ''} pl-8 group/item`}>
              <div className={`absolute ${index === 0 ? 'left-0 size-[15px] bg-primary ring-4 ring-primary/20' : 'left-[3px] size-2 bg-white/20'} top-1.5 rounded-full`}></div>
              <div className="flex justify-between items-start">
                <div className="flex flex-col flex-1">
                  <span className="text-white font-semibold text-sm">{memory.content}</span>
                  <span className="text-white/40 text-xs mt-1">
                    {new Date(memory.date).toLocaleDateString('zh-TW')} • {memory.location}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteMemory(index)}
                  className="opacity-0 group-hover/item:opacity-100 p-2 text-white/20 hover:text-red-400 transition-all"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
          {!contact.memories?.length && (
            <p className="text-white/20 text-sm italic">尚無互動記錄。</p>
          )}
        </div>
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-primary text-white px-6 py-3 rounded-full shadow-2xl z-[100] animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="text-sm font-bold">已複製檔案資訊</span>
          </div>
        </div>
      )}

      {/* Bottom Navigation Removed (Use Layout's BottomNav instead) */}
    </div>
  );
};

export default TheProfile;
