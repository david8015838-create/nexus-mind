import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tesseract from 'tesseract.js';
import { QRCodeSVG } from 'qrcode.react';
import { useNexus } from '../context/NexusContext';

const MemoryFeed = () => {
  const navigate = useNavigate();
  const { contacts, addContact, updateContact, addMemory, userProfile, updateProfile, customPrompt, schedules, currentUser } = useNexus();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = useMemo(() => {
    if (!currentUser) return null;
    return `${window.location.origin}/nexus-mind/p/${currentUser.uid}`;
  }, [currentUser]);

  // Guide Steps Data
  const guideSteps = [
    {
      icon: 'auto_awesome_motion',
      title: '社交情報鏈',
      desc: '這是您的核心社交中樞。系統會按時間順序排列所有聯絡動態，並在最上方提醒即將到來的行程。',
      color: 'text-primary'
    },
    {
      icon: 'qr_code_2',
      title: '智慧名片分享',
      desc: '點擊左上角 QR 圖標。登入後可產生個人專屬名片 QR Code，讓他人掃描後直接查看您的公開檔案。',
      color: 'text-amber-400'
    },
    {
      icon: 'hub',
      title: '關係圖譜視覺化',
      desc: '在底部導航點擊圖譜圖標。一眼看出哪些人屬於同一個社交圈，幫助您快速複習圈子背景資訊。',
      color: 'text-indigo-400'
    },
    {
      icon: 'search',
      title: '聯覺搜尋',
      desc: '不只是搜姓名。您可以透過標籤、電話，甚至是名片上的文字或記憶碎片快速找到目標人物。',
      color: 'text-purple-400'
    },
    {
      icon: 'calendar_month',
      title: '社交冷卻與日程',
      desc: '在「日程」分頁，您可以安排行程，系統會根據互動頻率提示「社交冷卻」名單，提醒您主動聯絡。',
      color: 'text-emerald-400'
    },
    {
      icon: 'cloud_sync',
      title: '100% 雲端同步',
      desc: '前往「設定」登入 Google。支援分批鏡像備份與新設備自動還原，更換手機資料也絕不遺失。',
      color: 'text-blue-400'
    }
  ];

  const reminders = useMemo(() => {
    if (!schedules || !contacts) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return schedules.filter(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 3;
    }).map(s => ({
      ...s,
      diffDays: Math.ceil((new Date(s.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    }));
  }, [schedules, contacts]);
  
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
  const [syncStatus, setSyncStatus] = useState('synced'); // 'syncing', 'synced', 'offline'
  const [isRecording, setIsRecording] = useState(false);

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
      c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()) || [];
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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const base64String = await base64Promise;

      // 使用繁體中文與英文進行辨識
      const result = await Tesseract.recognize(file, 'chi_tra+eng', {
        logger: m => console.log(m)
      });
      
      const ocrText = result.data.text;
      const lines = ocrText.split('\n').map(l => l.trim()).filter(Boolean);
      
      // --- 進階解析邏輯 (名片實例深度優化版) ---
      // 1. 預處理：清理字元與行分割
      const allText = ocrText.replace(/\r/g, '');
      const rawLines = allText.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
      
      // 移除干擾字元但保留關鍵符號
      const cleanLines = rawLines.filter(line => {
        const noSymbols = line.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
        return noSymbols.length >= 2;
      });

      let extractedName = '';
      let extractedPhone = '';
      let extractedEmail = '';
      let extractedCompany = '';
      let extractedTitle = '';

      // 2. 提取 Email (最準確，優先)
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = allText.match(emailRegex);
      if (emailMatch) extractedEmail = emailMatch[0].toLowerCase();

      // 3. 提取電話 (深度優化台灣格式)
      // 策略：先匹配帶關鍵字的行，再匹配純數字格式
      const phoneKeywords = ['行動', '手機', 'TEL', 'Mobile', '行動電話', 'M', 'T', 'Cell', 'Phone'];
      const phoneLine = rawLines.find(l => {
        const upper = l.toUpperCase();
        return phoneKeywords.some(k => upper.includes(k.toUpperCase())) && /\d/.test(l);
      });
      
      if (phoneLine) {
        // 從帶關鍵字的行中提取數字與 + 號
        let cleaned = phoneLine.replace(/[^\d+]/g, '');
        if (cleaned.length >= 9) {
          if (cleaned.startsWith('886')) cleaned = '0' + cleaned.slice(3);
          if (cleaned.startsWith('+886')) cleaned = '0' + cleaned.slice(4);
          extractedPhone = cleaned;
        }
      }

      if (!extractedPhone) {
        // 如果沒找到關鍵字行，則全域匹配
        const phonePatterns = [
          /(?:\+?886|0)9\d{2}[-\s]?\d{3}[-\s]?\d{3}/, // 手機 0912-345-678
          /(?:\+?886|0)\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/, // 市話 02-1234-5678
          /886[-\s]?9\d{2}[-\s]?\d{3}[-\s]?\d{3}/,
          /09\d{8}/ // 緊湊手機號
        ];

        for (const pattern of phonePatterns) {
          const match = allText.match(pattern);
          if (match) {
            let cleaned = match[0].replace(/[^\d+]/g, '');
            if (cleaned.startsWith('886')) cleaned = '0' + cleaned.slice(3);
            if (cleaned.startsWith('+886')) cleaned = '0' + cleaned.slice(4);
            // 排除過短的號碼
            if (cleaned.length >= 9) {
              extractedPhone = cleaned;
              break;
            }
          }
        }
      }

      // 4. 定義關鍵字庫
      const companyKeywords = ['公司', '有限公司', '集團', '行', 'Co.', 'Ltd.', 'Inc.', 'Corp.', '工作室', '協會', '大學', '科技', '法律', '事務所', '中心', '部門', '部', '廠', '醫院', '診所', '銀行', '控股', '分處', '顧問', '工業'];
      const titleKeywords = ['經理', '總裁', '執行長', '副總', '特助', '總監', '主任', '老師', '律師', '醫師', '處長', '組長', '專員', 'Manager', 'Director', 'CEO', 'Founder', '創辦人', '顧問', '教授', '工程師', 'Team Lead', 'Lead', 'Developer', 'Associate', 'Partner', '合夥人'];
      const excludeKeywords = ['路', '街', '巷', '弄', '號', '樓', '室', '區', '市', '縣', 'Address', '地址', '統編', '傳真', 'FAX', 'www', 'http', '郵遞區號', 'Tel', 'Email', '網址', 'Website', 'Zip'];

      // 5. 提取公司與職稱
      const companyCandidates = cleanLines.filter(line => 
        companyKeywords.some(keyword => line.includes(keyword)) && 
        !excludeKeywords.some(ex => line.includes(ex)) &&
        !/^\d{3,6}/.test(line) &&
        line.length > 3
      );
      
      if (companyCandidates.length > 0) {
        // 優先選擇包含「股份有限公司」或「有限公司」的行
        const priorityCompany = companyCandidates.find(c => c.includes('股份有限公司') || c.includes('有限公司'));
        extractedCompany = priorityCompany || companyCandidates.sort((a, b) => b.length - a.length)[0];
        
        // 特殊處理：移除公司名稱中可能的雜質（如 OCR 誤認的字元）
        extractedCompany = extractedCompany.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s()]/g, '').trim();
      }

      const titleCandidates = cleanLines.filter(line => 
        titleKeywords.some(keyword => line.toUpperCase().includes(keyword.toUpperCase())) &&
        line.length < 40 && !line.includes('@') && !line.includes('.')
      );
      if (titleCandidates.length > 0) {
        // 優先找不包含公司名稱的行作為職稱，且長度較短的
        extractedTitle = titleCandidates.find(t => !companyKeywords.some(ck => t.includes(ck))) || titleCandidates[0];
        // 移除可能的雜質
        extractedTitle = extractedTitle.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '').trim();
      }

      // 6. 提取姓名 (最具挑戰性的部分)
      // 策略：排除已知類別後的短行，優先找中英並列
      const nameCandidates = cleanLines.filter(line => {
        if (line.includes('@') || line.match(/\d{8,}/) || excludeKeywords.some(k => line.includes(k))) return false;
        // 排除明顯是公司名稱的行
        if (companyKeywords.some(k => line.includes(k)) && line.length > 8) return false;
        // 排除明顯是地址的行
        if (line.includes('區') || line.includes('市') || line.includes('縣') || line.includes('路') || line.includes('號')) return false;
        // 排除傳真、電話等關鍵字行
        if (line.includes('傳真') || line.includes('FAX') || line.includes('電話') || line.includes('TEL') || line.includes('行動')) return false;
        if (line.length > 20 || line.length < 2) return false;
        return true;
      });

      // 優先尋找：[中文姓名] [英文名] (如：柯岱均 Danny) 或 [英文名] [中文姓名]
      const mixedName = nameCandidates.find(l => 
        (/^[\u4e00-\u9fa5]{2,4}[\s/|]+[a-zA-Z\s]+$/.test(l)) || 
        (/^[a-zA-Z\s]+[\s/|]+[\u4e00-\u9fa5]{2,4}$/.test(l))
      );
      // 尋找：純中文姓名 (2-4字)，優先排除包含職稱關鍵字的
      const chineseName = nameCandidates.find(l => /^[\u4e00-\u9fa5]{2,3}$/.test(l) && !titleKeywords.some(tk => l.includes(tk)));
      // 尋找：First Last 格式
      const englishName = nameCandidates.find(l => /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)+$/.test(l));

      if (mixedName) extractedName = mixedName;
      else if (chineseName) extractedName = chineseName;
      else if (englishName) extractedName = englishName;
      
      // 如果還是沒找到姓名，嘗試從 Email 前綴提取
      if (!extractedName && extractedEmail) {
        const prefix = extractedEmail.split('@')[0];
        // 如果前綴包含點或底線，通常是姓名
        if (prefix.includes('.') || prefix.includes('_') || prefix.length > 3) {
          extractedName = prefix.split(/[._]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        }
      }

      // 如果還是沒找到，從剩餘候選中找最短且看起來像名字的
      if (!extractedName && nameCandidates.length > 0) {
        extractedName = nameCandidates.sort((a, b) => a.length - b.length)[0];
      }

      // 7. 清理姓名：移除標點符號，保留中英文
      extractedName = (extractedName || '新掃描聯絡人')
        .replace(/[|/\\_-]/g, ' ') // 移除常見分隔符
        .replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, '')
        .trim();
      
      // 針對「陳志鑫」的特殊處理：如果包含 OCR 誤認的字元，嘗試清理
      if (extractedName.length > 5 && /[\u4e00-\u9fa5]/.test(extractedName)) {
        // 如果是中文名字但太長，可能混入了雜質，取前 3 個字
        const chineseOnly = extractedName.match(/[\u4e00-\u9fa5]+/g);
        if (chineseOnly && chineseOnly[0].length >= 2 && chineseOnly[0].length <= 4) {
          extractedName = chineseOnly[0];
        }
      }

      // 8. 公司名稱二次清理
      if (extractedCompany) {
        // 如果公司名稱中包含電話，截斷它
        if (extractedCompany.includes('行動') || extractedCompany.includes('09')) {
          extractedCompany = extractedCompany.split(/行動|09/)[0].trim();
        }
      }

      const newContactId = await addContact({
        name: extractedName,
        phone: extractedPhone,
        email: extractedEmail,
        company: extractedCompany,
        bio: extractedTitle ? `職稱：${extractedTitle}` : '',
        cardImage: base64String,
        ocrText,
        tags: ['OCR 掃描'],
        memories: [{ 
          date: new Date(), 
          content: `名片掃描新增：${extractedName} (${extractedCompany || '未知公司'})`, 
          location: '名片掃描' 
        }],
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
    <div className="w-full h-full">
      {/* Header with improved styling */}
      <header className="sticky top-0 z-40 -mx-4 px-6 pt-8 pb-4 mb-2 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/80 to-transparent pointer-events-none -z-10"></div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowQR(true)}
              className="size-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/20 transition-all active:scale-90 group"
            >
              <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">qr_code_2</span>
            </button>
            <div 
              className="relative group cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 p-0.5 shadow-lg shadow-primary/20 relative z-10">
                <div className="w-full h-full rounded-[14px] bg-[#0a0a0c] flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar ? (
                    <img 
                      src={userProfile.avatar} 
                      className="w-full h-full object-cover" 
                      alt="avatar" 
                    />
                  ) : (
                    <span className="material-symbols-outlined text-white/20 text-2xl">person</span>
                  )}
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white bg-clip-text">社交情報鏈</h1>
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                <p className="text-[10px] font-black text-white/30 tracking-[0.2em] uppercase">Nexus Core Active</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setShowGuide(true)}
            className="size-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 hover:border-primary/20 transition-all active:scale-90 group"
          >
            <span className="material-symbols-outlined text-[22px] group-hover:rotate-12 transition-transform">help_outline</span>
          </button>
        </div>
        
        {/* Horizontal Search inside Header */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-white/20 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input 
            type="text" 
            placeholder="搜尋記憶、標籤或姓名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
          />
        </div>
      </header>

      {/* Reminders Section */}
      {reminders.length > 0 && (
        <div className="px-6 py-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-primary/10 border border-primary/20 rounded-[28px] p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary text-[20px]">notification_important</span>
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest">近期社交日程</h2>
            </div>
            <div className="space-y-4">
              {reminders.map(rem => (
                <div key={rem.id} className="flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white mb-0.5 truncate">{rem.title}</h3>
                    <div className="flex gap-2">
                      {rem.contactIds.slice(0, 3).map(cid => (
                        <button 
                          key={cid}
                          onClick={() => navigate(`/profile/${cid}`)}
                          className="text-[10px] text-primary/80 font-bold hover:text-primary transition-colors underline decoration-primary/30 underline-offset-2"
                        >
                          {contacts.find(c => c.id === cid)?.name}
                        </button>
                      ))}
                      {rem.contactIds.length > 3 && <span className="text-[10px] text-white/30">...</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-[10px] font-black text-primary uppercase">
                      {rem.diffDays === 0 ? '今天' : `${rem.diffDays} 天後`}
                    </p>
                    <button 
                      onClick={() => navigate('/vault')}
                      className="text-[10px] font-bold text-white/30 hover:text-white transition-colors flex items-center gap-1 mt-1"
                    >
                      查看
                      <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-8 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {['全部', '地點', '名片', '重要'].map((tab, i) => (
            <button 
              key={tab}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                i === 0 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 pb-32">
        {isScanning && (
          <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-3xl border border-white/5 border-dashed">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl animate-pulse"></div>
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent relative z-10"></div>
            </div>
            <span className="mt-4 text-sm font-medium text-white/40 animate-pulse">正在透過神經網路分析名片...</span>
          </div>
        )}
        
        {contacts?.length === 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-24 text-white/20">
            <div className="size-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl">database_off</span>
            </div>
            <p className="text-sm font-medium">數據庫空空如也，開始記錄你的第一份記憶</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4">
           {filteredContacts.map(contact => (
             <div 
               key={contact.id} 
               onClick={() => navigate(`/profile/${contact.id}`)}
               className="glass-card-modern group p-5 rounded-[24px] cursor-pointer"
             >
               <div className="flex items-center gap-5">
                 <div className="relative">
                   <div className="size-16 rounded-2xl overflow-hidden bg-black/40 border border-white/10 group-hover:border-primary/40 transition-all duration-500">
                     {contact.cardImage ? (
                       <img src={contact.cardImage} alt={contact.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-700" />
                     ) : (
                       <div className="size-full flex items-center justify-center text-white/10 text-2xl font-black bg-gradient-to-br from-white/5 to-transparent">
                         {contact.name[0]}
                       </div>
                     )}
                   </div>
                   {contact.importance > 80 && (
                     <div className="absolute -top-1.5 -right-1.5 size-5 bg-primary rounded-full border-2 border-[#030303] flex items-center justify-center shadow-lg shadow-primary/40">
                       <span className="material-symbols-outlined text-[10px] text-white font-black">priority_high</span>
                     </div>
                   )}
                 </div>
                 
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1.5">
                     <h3 className="text-[17px] font-bold text-white group-hover:text-primary transition-colors truncate">{contact.name}</h3>
                     <span className="text-[10px] font-medium text-white/20 tracking-wider uppercase">{new Date(contact.lastUpdated).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })}</span>
                   </div>
                   <div className="flex items-center gap-3">
                     <span className="text-[10px] font-black text-primary px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20 uppercase tracking-widest">
                       {contact.tags?.[0] || '一般'}
                     </span>
                     <p className="text-[13px] text-white/40 truncate italic font-medium">
                       {contact.memories?.[0]?.content || '尚無詳細備註...'}
                     </p>
                   </div>
                 </div>
                 
                 <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                   <span className="material-symbols-outlined text-white/40 group-hover:text-primary text-xl">chevron_right</span>
                 </div>
               </div>
             </div>
           ))}
         </div>
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

      {/* Onboarding Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="px-8 pt-10 pb-6 text-center border-b border-white/5 bg-gradient-to-b from-primary/10 to-transparent">
              <div className="size-16 rounded-3xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[32px]">auto_awesome</span>
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">操作指南</h3>
              <p className="text-[10px] font-bold text-primary/60 uppercase tracking-[0.2em] mt-1">Nexus Mind Guide</p>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto no-scrollbar space-y-6">
              {guideSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className={`size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors`}>
                    <span className={`material-symbols-outlined text-[20px] ${step.color}`}>{step.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-white/90">{step.title}</h4>
                    <p className="text-[10px] leading-relaxed text-white/40 font-medium">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 bg-white/5">
              <button 
                onClick={() => setShowGuide(false)}
                className="w-full py-4 rounded-2xl bg-primary text-sm font-bold text-white hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
              >
                我了解了，開始體驗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Share Drawer */}
      {showQR && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center px-4 pb-8">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowQR(false)}></div>
          <div className="w-full max-w-[440px] bg-gradient-to-b from-[#1a1c22] to-[#0a0a0c] border border-white/10 rounded-[40px] p-8 relative z-10 animate-in slide-in-from-bottom-full duration-500 shadow-2xl">
            <div className="w-16 h-1.5 bg-white/10 rounded-full mx-auto mb-10"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="size-20 rounded-[28px] bg-amber-400/10 flex items-center justify-center mb-6 ring-1 ring-amber-400/20">
                <span className="material-symbols-outlined text-amber-400 text-4xl">qr_code_2</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-2">智慧名片分享</h2>
              
              {!currentUser ? (
                <div className="space-y-6">
                  <p className="text-white/40 text-sm leading-relaxed max-w-[280px]">
                    請先登入以產生您的個人專屬名片 QR Code。
                  </p>
                  <button 
                    onClick={login}
                    className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-black text-sm hover:bg-white/90 transition-all active:scale-95 shadow-xl"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="size-5" alt="google" />
                    使用 Google 登入
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-white/40 text-sm mb-10 leading-relaxed max-w-[280px]">
                    讓他人掃描下方 QR Code，即可直接在瀏覽器查看您的公開社交檔案。
                  </p>

                  <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="p-6 bg-white rounded-[32px] shadow-2xl relative z-10">
                      <QRCodeSVG 
                        value={shareUrl} 
                        size={240}
                        level="H"
                        includeMargin={true}
                        imageSettings={{
                          src: userProfile?.avatar || "/pwa-192x192.png",
                          x: undefined,
                          y: undefined,
                          height: 48,
                          width: 48,
                          excavate: true,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-10 w-full p-5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-white/10 transition-all"
                      onClick={() => {
                        navigator.clipboard.writeText(shareUrl);
                        alert('連結已複製到剪貼簿！');
                      }}>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">您的專屬連結</span>
                      <span className="text-xs text-primary font-bold truncate max-w-[200px]">{shareUrl}</span>
                    </div>
                    <span className="material-symbols-outlined text-white/20 group-hover:text-primary transition-colors">content_copy</span>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setShowQR(false)}
              className="w-full h-16 bg-white/5 hover:bg-white/10 text-white font-bold rounded-3xl mt-8 transition-all border border-white/5 active:scale-95"
            >
              關閉
            </button>
          </div>
        </div>
      )}

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

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-base">event</span>
                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">發生日期</label>
                  </div>
                  <input 
                    type="date"
                    className="w-1/2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-[13px] focus:ring-1 ring-primary outline-none transition-all color-scheme-dark"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-base">call</span>
                    <label className="text-[11px] font-bold text-white/40 uppercase tracking-widest">聯絡電話</label>
                  </div>
                  <input 
                    type="tel"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-[14px] focus:ring-1 ring-primary outline-none transition-all placeholder:text-white/20"
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
