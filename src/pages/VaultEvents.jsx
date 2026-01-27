import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';

const VaultEvents = () => {
  const navigate = useNavigate();
  const { contacts } = useNexus();

  const allEvents = useMemo(() => {
    if (!contacts) return [];
    
    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

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
    <div className="max-w-[480px] mx-auto min-h-screen bg-background-dark text-white pb-24">
      <header className="sticky top-0 z-40 bg-background-dark/80 backdrop-blur-md pt-12 pb-4 px-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="material-symbols-outlined">arrow_back_ios_new</button>
          <h1 className="text-xl font-extrabold tracking-tight">保險箱：重要日期</h1>
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
                  'bg-primary/20 text-primary'
                }`}>
                  <span className="material-symbols-outlined">
                    {event.type === 'birthday' ? 'cake' : 
                     event.type === 'memory' ? 'history' :
                     event.type === 'extracted' ? 'find_in_page' :
                     'event_available'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-white/90">{event.title}</h3>
                      <p className="text-[10px] text-white/40 mt-0.5">{event.contactName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white/80">{event.date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</p>
                      <p className={`text-[10px] font-bold ${event.diffDays === 0 ? 'text-red-500' : 'text-primary'}`}>
                        {event.diffDays === 0 ? '今天' : `${event.diffDays} 天後`}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mt-2 line-clamp-1">{event.description}</p>
                </div>
              </div>
            )) : (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-xs text-white/20 italic">近期無重要日期</p>
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
                     'event_available'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-white/70 truncate">{event.title} · {event.contactName}</h3>
                  <p className="text-[10px] text-white/30 truncate mt-0.5">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default VaultEvents;
