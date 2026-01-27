import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useNexus } from '../context/NexusContext';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { userProfile, updateProfile, publishProfile, customPrompt, currentUser, login, logout, syncToCloud, syncFromCloud, isSyncing, setUnsavedChanges } = useNexus();
  const [isEditing, setIsEditing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    avatar: '',
    themeColor: '',
    links: [],
    categories: []
  });

  // Dirty check logic
  const hasChanges = JSON.stringify(editForm) !== JSON.stringify({
    name: userProfile?.name || '',
    bio: userProfile?.bio || '',
    avatar: userProfile?.avatar || '',
    themeColor: userProfile?.themeColor || '#2b6cee',
    links: userProfile?.links || [],
    categories: userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要']
  });

  useEffect(() => {
    setUnsavedChanges(isEditing && hasChanges);
    return () => setUnsavedChanges(false);
  }, [isEditing, hasChanges, setUnsavedChanges]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditing && hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditing, hasChanges]);

  const handleBack = () => {
    if (isEditing && hasChanges) {
      if (window.confirm('您有尚未儲存的變更，確定要離開嗎？')) {
        setUnsavedChanges(false);
        navigate(-1);
      }
    } else {
      navigate(-1);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setEditForm({
        name: userProfile.name || '',
        bio: userProfile.bio || '',
        avatar: userProfile.avatar || '',
        themeColor: userProfile.themeColor || '#2b6cee',
        links: userProfile.links || [],
        categories: userProfile.categories || ['朋友', '同事', '家人', '交際', '重要']
      });
    }
  }, [userProfile]);

  const themeColors = [
    { name: 'Nexus Blue', value: '#2b6cee' },
    { name: 'Cyber Purple', value: '#8b5cf6' },
    { name: 'Neon Pink', value: '#ec4899' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Crimson', value: '#ef4444' },
    { name: 'Midnight', value: '#334155' },
  ];

  const handleSave = async () => {
    await updateProfile(editForm);
    setUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditForm(prev => ({...prev, avatar: reader.result}));
    };
    reader.readAsDataURL(file);
  };

  const handleSyncToCloud = async () => {
    try {
      await syncToCloud();
      alert('資料已成功鏡像同步至雲端！');
    } catch (error) {
      alert('同步失敗：' + error.message);
    }
  };

  const handleSyncFromCloud = async () => {
    if (window.confirm('下載雲端資料將會「覆蓋」目前裝置上的所有本地資料，確定要繼續嗎？')) {
      try {
        await syncFromCloud();
        alert('資料已成功從雲端還原！');
      } catch (error) {
        alert('還原失敗：' + error.message);
      }
    }
  };

  const handleAddCategory = async () => {
    const newCat = await customPrompt('新增分類', '輸入分類名稱...');
    if (newCat) {
      if (isEditing) {
        // 如果正在編輯，更新編輯表單狀態
        if (!editForm.categories.includes(newCat)) {
          setEditForm({...editForm, categories: [...editForm.categories, newCat]});
        }
      } else {
        // 如果不在編輯，直接更新資料庫
        const currentCats = userProfile.categories || ['朋友', '同事', '家人', '交際', '重要'];
        if (!currentCats.includes(newCat)) {
          await updateProfile({ ...userProfile, categories: [...currentCats, newCat] });
        }
      }
    }
  };

  const handleShare = async () => {
    if (!currentUser) {
      alert('請先登入 Google 帳號以生成分享連結');
      return;
    }
    
    setIsPublishing(true);
    try {
      const uid = await publishProfile();
      // 生成分享網址 (假設在當前網域下的 /p/:uid)
      const url = `${window.location.origin}/nexus-mind/p/${uid}`;
      setShareUrl(url);
      setShowShareModal(true);
    } catch (error) {
      console.error("Publish Error:", error);
      alert('發佈失敗，請檢查網路連線');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDirectThemeChange = async (color) => {
    if (isEditing) {
      setEditForm({ ...editForm, themeColor: color });
    } else {
      await updateProfile({ ...userProfile, themeColor: color });
    }
  };

  if (!userProfile) return null;

  return (
    <div className="text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 -mx-4 px-6 pt-8 pb-4 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#030303]/80 to-transparent pointer-events-none -z-10"></div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack} 
              className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back_ios_new</span>
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white">設定</h1>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">User Preferences</p>
            </div>
          </div>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs font-black text-primary px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white transition-all uppercase tracking-widest shadow-lg shadow-primary/10"
            >
              編輯個人檔案
            </button>
          ) : (
            <button 
              onClick={handleSave}
              className="text-xs font-black text-white px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-dark transition-all uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              儲存變更
            </button>
          )}
        </div>
      </div>

      <main className="px-6 pt-8 space-y-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="size-24 rounded-full overflow-hidden border-2 border-primary/30 p-1">
              {editForm.avatar ? (
                <img src={editForm.avatar} className="w-full h-full object-cover rounded-full" alt="avatar" />
              ) : (
                <div className="w-full h-full bg-white/5 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-white/20">person</span>
                </div>
              )}
            </div>
            {isEditing && (
              <>
                <button 
                  onClick={() => document.getElementById('avatar-input').click()}
                  className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-white">photo_camera</span>
                </button>
                <input 
                  id="avatar-input"
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>
          
          <div className="text-center space-y-1 w-full">
            {isEditing ? (
              <input 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xl font-bold text-white focus:ring-1 ring-primary outline-none"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                placeholder="輸入您的名字"
              />
            ) : (
              <h2 className="text-2xl font-bold tracking-tight">{userProfile.name}</h2>
            )}
          </div>
          
          {/* Share Profile Button */}
          {!isEditing && (
            <button 
              onClick={handleShare}
              disabled={isPublishing}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/10 transition-all group"
            >
              <span className={`material-symbols-outlined text-sm ${isPublishing ? 'animate-spin' : 'text-primary'}`}>
                {isPublishing ? 'sync' : 'share'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-primary transition-colors">
                分享個人檔案網站
              </span>
            </button>
          )}
        </div>

        {/* Bio Section */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">我的簡介</label>
          {isEditing ? (
            <textarea 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white/80 focus:ring-1 ring-primary outline-none min-h-[100px]"
              value={editForm.bio}
              onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
              placeholder="寫點關於您的事..."
            />
          ) : (
            <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-4 text-sm text-white/70 leading-relaxed italic whitespace-pre-wrap">
              {userProfile.bio || '尚未設定簡介'}
            </div>
          )}
        </div>

        {/* Links Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">我的連結</label>
            {isEditing && (
              <button 
                onClick={() => setEditForm({...editForm, links: [...editForm.links, { label: '', url: '' }]})}
                className="text-[10px] font-bold text-primary flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">add</span> 新增
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {(isEditing ? editForm.links : userProfile.links)?.map((link, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                {isEditing ? (
                  <>
                    <input 
                      className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      placeholder="標籤"
                      value={link.label}
                      onChange={(e) => {
                        const newLinks = [...editForm.links];
                        newLinks[idx].label = e.target.value;
                        setEditForm({...editForm, links: newLinks});
                      }}
                    />
                    <input 
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => {
                        const newLinks = [...editForm.links];
                        newLinks[idx].url = e.target.value;
                        setEditForm({...editForm, links: newLinks});
                      }}
                    />
                    <button 
                      onClick={() => setEditForm({...editForm, links: editForm.links.filter((_, i) => i !== idx)})}
                      className="text-white/20 hover:text-red-400 p-1"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </>
                ) : (
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between group transition-all"
                  >
                    <span className="text-sm font-medium text-white/80">{link.label}</span>
                    <span className="material-symbols-outlined text-white/20 group-hover:text-primary text-sm transition-colors">open_in_new</span>
                  </a>
                )}
              </div>
            ))}
            {!isEditing && userProfile.links?.length === 0 && (
              <div className="text-center py-4 text-white/20 text-xs italic">尚未設定連結</div>
            )}
          </div>
        </div>

        {/* System Settings */}
        {!isEditing && (
          <div className="pt-8 space-y-4">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">帳戶與同步</label>
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
              {!currentUser ? (
                <button 
                  onClick={login}
                  className="w-full px-4 py-5 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                >
                  <div className="size-10 rounded-full bg-white/5 flex items-center justify-center">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" className="size-5" alt="google" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">使用 Google 登入</p>
                    <p className="text-[10px] text-white/30">登入以啟用雲端同步功能</p>
                  </div>
                  <span className="material-symbols-outlined text-white/20">chevron_right</span>
                </button>
              ) : (
                <div className="divide-y divide-white/5">
                  <div className="px-4 py-4 flex items-center gap-4">
                    <img src={currentUser.photoURL} className="size-10 rounded-full border border-primary/20" alt="avatar" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{currentUser.displayName}</p>
                      <p className="text-[10px] text-white/30 truncate">{currentUser.email}</p>
                    </div>
                    <button 
                      onClick={logout}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 text-[10px] font-bold transition-all"
                    >
                      登出
                    </button>
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <button 
                      onClick={handleSyncToCloud}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>cloud_upload</span>
                      {isSyncing ? '同步中...' : '上傳雲端'}
                    </button>
                    <button 
                      onClick={handleSyncFromCloud}
                      disabled={isSyncing}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      <span className={`material-symbols-outlined text-lg ${isSyncing ? 'animate-spin' : ''}`}>cloud_download</span>
                      下載資料
                    </button>
                  </div>
                </div>
              )}
            </div>

            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1 pt-4 block">系統</label>
            <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors border-b border-white/5 text-left">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-white/40">lock</span>
                  <span className="text-sm">資料備份與還原</span>
                </div>
                <span className="material-symbols-outlined text-white/20">chevron_right</span>
              </button>
              <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-white/5 transition-colors text-left text-red-400">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">delete_forever</span>
                  <span className="text-sm">清除所有快取資料</span>
                </div>
              </button>
            </div>
            {/* Categories Section */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest">自定義分類</h3>
                <button 
                  onClick={handleAddCategory}
                  className="text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  新增分類
                </button>
              </div>
              
              <div className="bg-white/5 rounded-xl p-4 min-h-[100px]">
                <div className="flex flex-wrap gap-2">
                  {editForm.categories.map((cat, idx) => (
                    <div 
                      key={idx} 
                      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border border-transparent ${
                        isEditing 
                          ? 'bg-white/10 text-white hover:border-white/20' 
                          : 'bg-white/5 text-white/60'
                      }`}
                    >
                      <span>{cat}</span>
                      {isEditing && (
                        <button 
                          onClick={() => {
                            if (window.confirm(`確定要刪除分類「${cat}」嗎？`)) {
                              setEditForm({
                                ...editForm, 
                                categories: editForm.categories.filter((_, i) => i !== idx)
                              });
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all flex items-center"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                     <button 
                       onClick={handleAddCategory}
                       className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 border-dashed hover:bg-primary/20 transition-all flex items-center gap-1"
                     >
                       <span className="material-symbols-outlined text-[14px]">add</span>
                       新增
                     </button>
                   )}
                </div>
                {!isEditing && editForm.categories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-4 opacity-30">
                     <span className="material-symbols-outlined text-2xl mb-1">category</span>
                     <p className="text-[10px] italic">尚未設定分類</p>
                  </div>
                )}
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-[10px] text-white/20 font-medium tracking-widest uppercase">Nexus Mind v1.2.0</p>
            </div>
          </div>
        )}

        {/* Theme Color Section - Moved to Bottom and always accessible */}
        <div className="space-y-4 pt-8 border-t border-white/5">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1 block">主題配色 (隨時切換)</label>
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {themeColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleDirectThemeChange(color.value)}
                  className={`relative aspect-square rounded-xl transition-all duration-300 ${
                    (isEditing ? editForm.themeColor : userProfile.themeColor) === color.value 
                      ? 'scale-110 ring-2 ring-white ring-offset-4 ring-offset-[#030303]' 
                      : 'hover:scale-105 opacity-50'
                  } cursor-pointer`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {(isEditing ? editForm.themeColor : userProfile.themeColor) === color.value && (
                    <span className="material-symbols-outlined text-white text-sm absolute inset-0 flex items-center justify-center">
                      check
                    </span>
                  )}
                </button>
              ))}
              <div className="relative aspect-square rounded-xl bg-white/5 border border-dashed border-white/20 flex items-center justify-center group overflow-hidden">
                <input 
                  type="color" 
                  value={isEditing ? editForm.themeColor : userProfile.themeColor}
                  onChange={(e) => handleDirectThemeChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-white/40 group-hover:text-white transition-colors">palette</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowShareModal(false)}></div>
          <div className="relative w-full max-w-sm bg-[#1c1f27] border border-white/10 rounded-[32px] p-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-3xl">qr_code_2</span>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">分享個人檔案</h3>
                <p className="text-sm text-white/40">別人掃描此碼即可查看您的公開個人網站</p>
              </div>
              
              <div className="p-4 bg-white rounded-3xl">
                <QRCodeSVG value={shareUrl} size={180} level="H" includeMargin={true} />
              </div>

              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <span className="flex-1 text-[10px] text-white/40 truncate">{shareUrl}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert('連結已複製！');
                    }}
                    className="text-primary text-[10px] font-bold uppercase tracking-widest"
                  >
                    複製
                  </button>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
