// v2.0.2 - Security hardened & OCR optimized
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useNexus } from '../context/NexusContext';

const MemoryFeed = () => {
  const navigate = useNavigate();
  const { contacts, addContact, updateContact, addMemory, userProfile, updateProfile, customPrompt, schedules, currentUser, login } = useNexus();
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = useMemo(() => {
    if (!currentUser) return null;
    // 使用 HashRouter 風格，確保 GitHub Pages 掃描後不會 404
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/$/, '');
    return `${baseUrl}/#/p/${currentUser.uid}`;
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
  const [lastScanAt, setLastScanAt] = useState(0);
  const [activeCategory, setActiveCategory] = useState('全部');

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
    let result = contacts || [];

    // 1. Filter by Category
    if (activeCategory !== '全部') {
      result = result.filter(c => c.tags?.includes(activeCategory));
    }

    // 2. Filter by Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.company?.toLowerCase().includes(query) ||
        c.tags?.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  }, [contacts, searchQuery, activeCategory]);

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

    if (!currentUser) {
      alert('請先登入以使用名片掃描功能。');
      return;
    }

    const now = Date.now();
    if (now - lastScanAt < 15_000) {
      const remain = Math.ceil((15_000 - (now - lastScanAt)) / 1000);
      alert(`操作過於頻繁，請在 ${remain} 秒後再試。`);
      return;
    }

    setIsScanning(true);
    setScanningStatus('正在壓縮圖片...');
    let keyStatus = "未初始化";
    let base64String = "";

    try {
      const compressImage = (file, maxSize = 900, quality = 0.6) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = maxSize;
              const MAX_HEIGHT = maxSize;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("圖片載入失敗，請嘗試其他檔案。"));
          };
          reader.onerror = () => reject(new Error("檔案讀取失敗。"));
        });
      };

      base64String = await compressImage(file, 900, 0.7);
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, "");
      setScanningStatus('正在呼叫 AI 分析名片...');

      const apiKey = (userProfile?.aiKey || localStorage.getItem('GEMINI_API_KEY') || "").trim();
      
      if (!apiKey) {
        throw new Error("找不到 AI 金鑰。請到「設定」頁貼上金鑰或於此裝置的瀏覽器 LocalStorage 設定 GEMINI_API_KEY。");
      }

      const ocrPrompt = `你是一個專業的名片辨識系統。請嚴格按照以下規範提取資訊並回傳 JSON：
規範：
1. 【絕對禁止】添加名片上沒有的字：禁止添加英文姓名（如 KaneChen）、禁止添加英文頭銜（如 Vice President）、禁止添加任何背景介紹。
2. 【僅限原始中文】：除了 Email 和網址外，所有欄位必須使用名片上的原始中文。
3. summary 欄位必須精確為「[姓名] 是 [公司] 的 [職稱]」。必須使用提取到的【完整原始中文內容】，嚴禁縮寫或截斷公司名稱（例如：不可將「合迪股份有限公司」縮寫為「合迪股份」）。
4. 排除所有標籤字眼（如 "call", "mail", "business"）。
5. 僅回傳純 JSON，不含 Markdown 標籤。
JSON 格式範例：{"name":"陳志鑫","phone":"0913-889-333","email":"KaneChen@chailease.com.tw","company":"合迪股份有限公司","title":"分處副總經理","address":"806616 高雄市前鎮區民權二路8號11樓","website":"www.finatrade.com.tw","summary":"陳志鑫是合迪股份有限公司的分處副總經理"}`;
      
      const genAI = new GoogleGenerativeAI(apiKey);
      const parseJson = (t) => {
        const s = t.replace(/```json|```/g, '').trim();
        try { return JSON.parse(s); } catch (_) {}
        const i = s.indexOf('{');
        const j = s.lastIndexOf('}');
        if (i !== -1 && j !== -1 && j > i) {
          const sub = s.slice(i, j + 1);
          return JSON.parse(sub);
        }
        throw new Error("JSON Parse Error");
      };
      const tryModel = async (modelId, data64, attempt = '') => {
        setScanningStatus(`正在透過 ${modelId} 分析名片${attempt}...`);
        const model = genAI.getGenerativeModel({ model: modelId });
        const rp = model.generateContent([ocrPrompt, { inlineData: { data: data64, mimeType: 'image/jpeg' } }]);
        const tp = new Promise((_, reject) => setTimeout(() => reject(new Error("Request Timeout")), 40000));
        const r = await Promise.race([rp, tp]);
        const resp = await r.response;
        if (!resp) throw new Error("Empty Response");
        const cs = resp.candidates || [];
        if (cs.length === 0) {
          const fb = resp.promptFeedback;
          if (fb && fb.blockReason) throw new Error(`Security Block: ${fb.blockReason}`);
          throw new Error("No Result");
        }
        const text = resp.text();
        return parseJson(text);
      };
      // Model 輪換策略：依序嘗試，確保一定成功
      // lite 優先（約 1-2s），失敗才換 flash（約 5s），確保速度又有品質保底
      const modelQueue = [
        { id: 'models/gemini-2.5-flash-lite', data: base64Data,  label: '第1次' },
        { id: 'models/gemini-2.5-flash',      data: base64Data,  label: '第2次（高品質模型）' },
        { id: 'models/gemini-2.5-flash-lite', data: null,        label: '第3次（縮圖重試）', compress: true },
        { id: 'models/gemini-2.5-flash',      data: null,        label: '第4次（縮圖+高品質）', compress: true },
      ];
      let data = null;
      let lastError = null;
      for (const step of modelQueue) {
        try {
          let imgData = step.data;
          if (step.compress) {
            setScanningStatus(`${step.label}：重新壓縮圖片...`);
            const small = await compressImage(file, 640, 0.5);
            imgData = small.replace(/^data:image\/\w+;base64,/, "");
            base64String = small;
          }
          data = await tryModel(step.id, imgData, step.label);
          break; // 成功即跳出
        } catch (e) {
          lastError = e;
          console.warn(`[${step.label}] ${step.id} 失敗:`, e.message);
          // 若是 API Key 錯誤或 JSON 格式錯誤，不繼續輪換
          if (e.message.includes('API_KEY_INVALID') || e.message.includes('403') || e.message.includes('PERMISSION_DENIED')) break;
        }
      }
      if (!data) throw lastError || new Error("所有模型均辨識失敗");

      const existingContact = contacts?.find(c => 
        (data.phone && c.phone === data.phone) ||
        (data.name && c.name && c.name === data.name)
      );

      let targetContactId;
      if (existingContact) {
        const confirmMerge = window.confirm(`偵測到重複聯絡人：${existingContact.name}${existingContact.phone ? ` (${existingContact.phone})` : ''}\n\n是否要將名片資訊合併至現有檔案？\n(這將更新其公司、職稱與名片圖片)`);
        if (confirmMerge) {
          targetContactId = existingContact.id;
          await updateContact(targetContactId, {
            company: data.company || existingContact.company,
            title: data.title || existingContact.title,
            email: data.email || existingContact.email,
            address: data.address || existingContact.address,
            website: data.website || existingContact.website,
            cardImage: base64String || existingContact.cardImage,
            lastUpdated: new Date().toISOString()
          });
        } else {
          targetContactId = await addContact({
            name: data.name || '新聯絡人',
            phone: data.phone || '',
            email: data.email || '',
            company: data.company || '',
            title: data.title || '', 
            address: data.address || '',
            website: data.website || '',
            bio: '',
            cardImage: base64String,
            ocrText: '',
            tags: ['AI 掃描 (重複)'],
            memories: [],
            importance: 50,
          });
        }
      } else {
        targetContactId = await addContact({
          name: data.name || '新聯絡人',
          phone: data.phone || '',
          email: data.email || '',
          company: data.company || '',
          title: data.title || '', 
          address: data.address || '',
          website: data.website || '',
          bio: '',
          cardImage: base64String,
          ocrText: '',
          tags: ['AI 掃描'],
          memories: [],
          importance: 50,
        });
      }
      if (navigator.vibrate) navigator.vibrate(50);
      navigate(`/profile/${targetContactId}`);
    } catch (error) {
      console.error('Gemini OCR Detailed Error:', error);
      
      // 提取更深層的錯誤訊息
      const errorStatus = error.status || (error.message?.match(/\d{3}/) ? error.message.match(/\d{3}/)[0] : 'Unknown');
      let errorReason = error.message || '無詳細訊息';

      // 針對常見錯誤進行友善化處理
      if (errorReason.includes('403') || errorReason.includes('PERMISSION_DENIED')) {
        errorReason = "API 權限遭拒。請檢查：\n1. Google Cloud Console 是否正確設定「網頁來源限制 (Referrer Restrictions)」\n2. API 限制是否已勾選 Generative Language API\n3. 您的所在地區是否支援 (若在中國/港澳需開啟海外 VPN)";
      } else if (errorReason.includes('429') || errorReason.includes('RESOURCE_EXHAUSTED')) {
        errorReason = "請求太頻繁，請稍等一分鐘後再試。";
      } else if (errorReason.includes('404')) {
        errorReason = "找不到指定的 AI 模型，可能該版本已停用。請確認 API Key 有效。";
      } else if (errorReason.includes('Request Timeout')) {
        errorReason = "網路請求逾時，請確認網路連線穩定後再試。";
      } else if (errorReason.includes('JSON Parse Error')) {
        errorReason = "AI 無法辨識此名片格式，請確保圖片清晰、光線充足後重試。";
      } else if (errorReason.includes('Security Block')) {
        errorReason = "名片圖片被 AI 安全機制封鎖，請嘗試其他圖片。";
      }

      alert(`【辨識失敗】${errorReason}`);
    } finally {
      setLastScanAt(Date.now());
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
          {['全部', ...categories].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveCategory(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                activeCategory === tab 
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
            <span className="mt-4 text-sm font-medium text-white/40 animate-pulse">{scanningStatus || '正在透過神經網路分析名片...'}</span>
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

        {filteredContacts.length === 0 && contacts?.length > 0 && !isScanning && (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <span className="material-symbols-outlined text-3xl mb-2">search_off</span>
            <p className="text-xs">沒有找到符合條件的聯絡人</p>
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
              {currentUser ? (
                <label className="flex items-center justify-end gap-3 cursor-pointer group">
                  <span className="bg-[#1c1f27] border border-white/10 px-4 py-2 rounded-2xl text-xs font-bold text-white/80 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">掃描名片</span>
                  <div className="size-14 bg-[#1c1f27] border border-white/10 rounded-[22px] flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all shadow-2xl">
                    <span className="material-symbols-outlined text-2xl">contact_page</span>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <button 
                  className="flex items-center justify-end gap-3 group"
                  onClick={login}
                >
                  <span className="bg-[#1c1f27] border border-white/10 px-4 py-2 rounded-2xl text-xs font-bold text-white/80 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity">登入後使用掃描</span>
                  <div className="size-14 bg-[#1c1f27] border border-white/10 rounded-[22px] flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 transition-all shadow-2xl">
                    <span className="material-symbols-outlined text-2xl">login</span>
                  </div>
                </button>
              )}
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
