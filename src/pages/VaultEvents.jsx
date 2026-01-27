import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';

const VaultEvents = () => {
  const navigate = useNavigate();
  const { contacts, schedules, addSchedule, deleteSchedule } = useNexus();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ title: '', date: '', contactIds: [] });
  const [participantSearch, setParticipantSearch] = useState('');

  const filteredParticipants = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => 
      c.name.toLowerCase().includes(participantSearch.toLowerCase()) ||
      c.tags?.some(tag => tag.toLowerCase().includes(participantSearch.toLowerCase()))
    );
  }, [contacts, participantSearch]);

  const allEvents = useMemo(() => {
    if (!contacts) return [];
    
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 處理安排的行程 (Schedules)
    if (schedules) {
      schedules.forEach(schedule => {
        const schedDate = new Date(schedule.date);
        schedDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((schedDate - today) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `schedule-${schedule.id}`,
          date: schedDate,
          title: schedule.title,
          description: `預約行程: ${schedule.contactIds.map(id => contacts.find(c => c.id === id)?.name).filter(Boolean).join(', ')}`,
          type: 'schedule',
          diffDays,
          isUpcoming: diffDays <= 30 && diffDays >= 0,
          contactIds: schedule.contactIds,
          scheduleId: schedule.id
        });
      });
    }

    // 日期提取正則表達式 (支援 YYYY-MM-DD, YYYY/MM/DD, MM/DD 等)
    const dateRegex = /(\d{4}[-/])?(\d{1,2})[-/](\d{1,2})/g;

    contacts.forEach(contact => {
      // 1. 處理生日 (每年重複)
      if (contact.birthday) {
        const [year, month, day] = contact.birthday.split('-').map(Number);
        const birthDate = new Date(today.getFullYear(), month - 1, day);
        if (birthDate < today) birthDate.setFullYear(today.getFullYear() + 1);
        const diffDays = Math.ceil((birthDate - today) / (1000 * 60 * 60 * 24));
        
        events.push({
          id: `birthday-${contact.id}`,
          contactId: contact.id,
          contactName: contact.name,
          date: birthDate,
          title: '生日提醒',
          description: `${contact.name} 的生日`,
          type: 'birthday',
          diffDays,
          isUpcoming: diffDays <= 30 && diffDays >= 0
        });
      }

      // 2. 處理明確的事件 (events 陣列)
      if (contact.events) {
        contact.events.forEach((event, idx) => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
          
          events.push({
            id: `event-${contact.id}-${idx}`,
            contactId: contact.id,
            contactName: contact.name,
            date: eventDate,
            title: event.title,
            description: `預定事項`,
            type: event.type || 'event',
            diffDays,
            isUpcoming: diffDays <= 30 && diffDays >= 0
          });
        });
      }

      // 3. 處理記憶碎片中的日期 (memories)
      if (contact.memories) {
        contact.memories.forEach((memory, idx) => {
          const memDate = new Date(memory.date);
          memDate.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((memDate - today) / (1000 * 60 * 60 * 24));

          events.push({
            id: `memory-${contact.id}-${idx}`,
            contactId: contact.id,
            contactName: contact.name,
            date: memDate,
            title: '記憶記錄',
            description: memory.content.substring(0, 20) + (memory.content.length > 20 ? '...' : ''),
            type: 'memory',
            diffDays,
            isUpcoming: diffDays <= 30 && diffDays >= 0
          });

          // 4. 從記憶文字中提取日期
          let match;
          while ((match = dateRegex.exec(memory.content)) !== null) {
            const [full, y, m, d] = match;
            const year = y ? parseInt(y.replace(/[-/]/, '')) : today.getFullYear();
            const extractedDate = new Date(year, parseInt(m) - 1, parseInt(d));
            extractedDate.setHours(0, 0, 0, 0);
            
            if (!isNaN(extractedDate.getTime())) {
              const dDays = Math.ceil((extractedDate - today) / (1000 * 60 * 60 * 24));
              events.push({
                id: `extracted-mem-${contact.id}-${idx}-${match.index}`,
                contactId: contact.id,
                contactName: contact.name,
                date: extractedDate,
                title: '內容提及日期',
                description: `文字提及: ${full}`,
                type: 'extracted',
                diffDays: dDays,
                isUpcoming: dDays <= 30 && dDays >= 0
              });
            }
          }
        });
      }

      // 5. 從 OCR 文字中提取日期
      if (contact.ocrText) {
        let match;
        while ((match = dateRegex.exec(contact.ocrText)) !== null) {
          const [full, y, m, d] = match;
          const year = y ? parseInt(y.replace(/[-/]/, '')) : today.getFullYear();
          const extractedDate = new Date(year, parseInt(m) - 1, parseInt(d));
          extractedDate.setHours(0, 0, 0, 0);

          if (!isNaN(extractedDate.getTime())) {
            const dDays = Math.ceil((extractedDate - today) / (1000 * 60 * 60 * 24));
            events.push({
              id: `extracted-ocr-${contact.id}-${match.index}`,
              contactId: contact.id,
              contactName: contact.name,
              date: extractedDate,
              title: '名片/文件日期',
              description: `掃描提取: ${full}`,
              type: 'extracted',
              diffDays: dDays,
              isUpcoming: dDays <= 30 && dDays >= 0
            });
          }
        }
      }
    });

    return events.sort((a, b) => b.date - a.date); // 依照日期降序排列 (新的在前)
  }, [contacts]);

  const upcomingEvents = allEvents.filter(e => e.isUpcoming);
  const otherEvents = allEvents.filter(e => !e.isUpcoming);

  return (
    <div className="pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 -mx-4 px-6 pt-8 pb-4 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/80 to-transparent pointer-events-none -z-10"></div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">關係情報</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Important Schedules</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="size-11 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary hover:text-white transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-[24px]">add</span>
          </button>
        </div>
      </header>

      <main className="p-4 space-y-8">
        {/* 近期提醒 */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary">近期 30 天內</h2>
          <div className="space-y-3">
            {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
              <div 
                key={event.id} 
                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 items-start hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => navigate(`/profile/${event.contactId}`)}
              >
                <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${
                  event.type === 'birthday' ? 'bg-pink-500/20 text-pink-500' : 
                  event.type === 'memory' ? 'bg-blue-500/20 text-blue-500' :
                  event.type === 'extracted' ? 'bg-amber-500/20 text-amber-500' :
                  event.type === 'schedule' ? 'bg-emerald-500/20 text-emerald-500' :
                  'bg-primary/20 text-primary'
                }`}>
                  <span className="material-symbols-outlined">
                    {event.type === 'birthday' ? 'cake' : 
                     event.type === 'memory' ? 'history' :
                     event.type === 'extracted' ? 'find_in_page' :
                     event.type === 'schedule' ? 'calendar_today' :
                     'event_available'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white/90 truncate">{event.title}</h3>
                      <p className="text-[10px] text-white/40 mt-0.5 truncate">{event.contactName || '多位參與者'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white/80">{event.date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</p>
                      <p className={`text-[10px] font-bold ${event.diffDays === 0 ? 'text-red-500' : 'text-primary'}`}>
                        {event.diffDays === 0 ? '今天' : `${event.diffDays} 天後`}
                      </p>
                      {event.type === 'schedule' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('確定要刪除此行程嗎？')) {
                              deleteSchedule(event.scheduleId);
                            }
                          }}
                          className="mt-1 text-red-500/40 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mt-2 line-clamp-1">{event.description}</p>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-white/20 italic">近期無重要日程</p>
              </div>
            )}
          </div>
        </section>

        {/* 其他日期記錄 */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white/30">所有日期記錄</h2>
          <div className="space-y-3">
            {otherEvents.map(event => (
              <div 
                key={event.id} 
                className="bg-white/5 border border-white/5 rounded-2xl p-4 flex gap-4 items-center hover:bg-white/[0.07] transition-all cursor-pointer"
                onClick={() => navigate(`/profile/${event.contactId}`)}
              >
                <div className="text-center min-w-[50px]">
                  <p className="text-[10px] font-bold text-white/40 uppercase">{event.date.getFullYear()}</p>
                  <p className="text-sm font-black text-white/80">{event.date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</p>
                </div>
                <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-sm text-white/40">
                    {event.type === 'birthday' ? 'cake' : 
                     event.type === 'memory' ? 'history' :
                     event.type === 'extracted' ? 'find_in_page' :
                     event.type === 'schedule' ? 'calendar_today' :
                     'event_available'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white/70 truncate">{event.title} · {event.contactName || '多位參與者'}</h3>
                  <p className="text-[10px] text-white/30 truncate mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-[480px] bg-[#1a1a1a] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-white">規劃社交日程</h3>
              <button onClick={() => setShowAddModal(false)} className="material-symbols-outlined text-white/40">close</button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">行程名稱</label>
                <input 
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium outline-none focus:ring-1 ring-primary transition-all"
                  placeholder="例如：與朋友聚餐..."
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] ml-1">日期</label>
                <input 
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-[15px] font-medium outline-none focus:ring-1 ring-primary transition-all color-scheme-dark"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">選擇參與人</label>
                  {newSchedule.contactIds.length > 0 && (
                    <span className="text-[10px] font-bold text-primary/60">已選 {newSchedule.contactIds.length} 人</span>
                  )}
                </div>
                
                {/* Participant Search */}
                <div className="relative mb-3">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-[18px]">search</span>
                  <input 
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-xs font-medium outline-none focus:ring-1 ring-primary/50 transition-all"
                    placeholder="搜尋姓名或標籤..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                  />
                  {participantSearch && (
                    <button 
                      onClick={() => setParticipantSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center text-white/20 hover:text-white/40"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map(contact => (
                      <button 
                        key={contact.id}
                        onClick={() => {
                          const ids = newSchedule.contactIds.includes(contact.id)
                            ? newSchedule.contactIds.filter(id => id !== contact.id)
                            : [...newSchedule.contactIds, contact.id];
                          setNewSchedule({...newSchedule, contactIds: ids});
                        }}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                          newSchedule.contactIds.includes(contact.id)
                            ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                            : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                        }`}
                      >
                        {contact.name}
                      </button>
                    ))
                  ) : (
                    <div className="w-full py-4 text-center text-[10px] text-white/20 italic">
                      未找到符合的聯絡人
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-sm font-bold text-white/40 hover:bg-white/10 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={async () => {
                    if (!newSchedule.title || !newSchedule.date) return;
                    await addSchedule(newSchedule);
                    setShowAddModal(false);
                    setNewSchedule({ title: '', date: '', contactIds: [] });
                  }}
                  disabled={!newSchedule.title || !newSchedule.date}
                  className="flex-1 py-4 rounded-2xl bg-primary text-sm font-bold text-white hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none"
                >
                  確認安排
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultEvents;
