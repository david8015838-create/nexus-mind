import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firestore } from '../db/firebase';

const PublicProfile = () => {
  const { uid } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      // 處理 UID，移除可能的前綴或空格
      const cleanUid = uid?.trim();
      if (!cleanUid) {
        setError('無效的連結');
        setLoading(false);
        return;
      }
      
      try {
        console.log("Fetching profile for UID:", cleanUid);
        // 使用 collection 查詢而不是直接 doc 引用，有助於排除某些 SDK 路徑解析問題
        const docRef = doc(firestore, 'public_profiles', cleanUid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log("Profile data found by ID:", data);
          setProfile(data);
        } else {
          // 備援方案：嘗試通過欄位 uid 查詢
          console.log("Document ID not found, trying query by field 'uid'...");
          const q = query(collection(firestore, 'public_profiles'), where('uid', '==', cleanUid));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            console.log("Profile data found by field query:", data);
            setProfile(data);
          } else {
            console.error("FIREBASE_DATA_MISSING: No document found for UID:", cleanUid);
            setError('找不到此個人檔案');
          }
        }
      } catch (err) {
        console.error("FIREBASE_FETCH_ERROR:", err);
        if (err.code === 'permission-denied') {
          setError('權限不足：請確保資料庫 Rules 已設為 allow read。');
        } else {
          setError('載入失敗：' + (err.message || '未知錯誤'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-white/10 mb-4">person_off</span>
        <h1 className="text-xl font-bold text-white mb-2">{error || '連結無效'}</h1>
        <p className="text-sm text-white/40 mb-6">此個人檔案可能已被移除或設定為不公開</p>
        
        {/* 除錯資訊區塊 */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-left max-w-md w-full overflow-hidden">
          <p className="text-[10px] font-mono text-white/30 uppercase mb-2">Diagnostic Tools</p>
          <div className="space-y-1 text-[11px] font-mono text-white/50 break-all">
            <p><span className="text-primary/60">UID:</span> {uid || 'None'}</p>
            <p><span className="text-primary/60">Project:</span> {firestore?.app?.options?.projectId || 'Unknown'}</p>
            <p><span className="text-primary/60">Auth Domain:</span> {firestore?.app?.options?.authDomain || 'Unknown'}</p>
            <p><span className="text-primary/60">Path:</span> {window.location.hash}</p>
            <p><span className="text-primary/60">Status:</span> {error || 'No Error'}</p>
            <p><span className="text-primary/60">Build Time:</span> 2026-01-28 23:30</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button 
              onClick={() => window.location.reload()}
              className="py-2 bg-primary/20 text-primary text-[10px] font-bold rounded-lg hover:bg-primary/30 transition-all"
            >
              重新整理
            </button>
            <button 
              onClick={() => window.location.href = '#/'}
              className="py-2 bg-white/5 text-white/60 text-[10px] font-bold rounded-lg hover:bg-white/10 transition-all"
            >
              回首頁
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary/30">
      {/* Background Mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-50">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

      <main className="relative z-10 max-w-2xl mx-auto px-6 pt-24 pb-32">
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full group-hover:bg-primary/40 transition-all duration-700 scale-110"></div>
            {profile.avatar ? (
              <img 
                src={profile.avatar} 
                className="relative size-32 rounded-full object-cover border-4 border-white/10 shadow-2xl"
                alt={profile.name}
              />
            ) : (
              <div className="relative size-32 rounded-full bg-gradient-to-br from-white/10 to-white/5 border-4 border-white/10 flex items-center justify-center shadow-2xl">
                <span className="material-symbols-outlined text-5xl text-white/20">person</span>
              </div>
            )}
          </div>

          <h1 className="text-4xl font-black tracking-tight mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
            {profile.name}
          </h1>
          
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {/* 移除分類顯示 */}
          </div>

          <p className="text-lg text-white/60 leading-relaxed font-medium max-w-md italic whitespace-pre-wrap">
            {profile.bio}
          </p>
        </div>

        {/* Links Section */}
        {profile.links && profile.links.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] text-center mb-8">社交與連結</h2>
            {profile.links.map((link, idx) => (
              <a 
                key={idx}
                href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-primary/50 transition-all duration-500 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="size-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <span className="material-symbols-outlined text-white/40 group-hover:text-primary transition-colors">
                      {link.label.toLowerCase().includes('ig') || link.label.toLowerCase().includes('instagram') ? 'camera' : 
                       link.label.toLowerCase().includes('fb') || link.label.toLowerCase().includes('facebook') ? 'facebook' : 'link'}
                    </span>
                  </div>
                  <span className="font-bold text-lg text-white/80 group-hover:text-white transition-colors">{link.label}</span>
                </div>
                <span className="material-symbols-outlined text-white/20 group-hover:text-primary group-hover:translate-x-1 transition-all relative z-10">
                  arrow_forward
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-24 flex flex-col items-center gap-6 animate-in fade-in duration-1000 delay-500">
          <div className="h-px w-12 bg-white/10 mb-2"></div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-white/90 mb-2">歡迎使用 Nexus Mind</h3>
            <p className="text-sm text-white/40 mb-6">打造您的專屬社交情報網絡，珍藏每一份記憶。</p>
            <a 
              href={window.location.origin + '/nexus-mind/'}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all duration-300 font-bold text-sm shadow-lg shadow-primary/5"
            >
              <span className="material-symbols-outlined text-lg">explore</span>
              探索此網站
            </a>
          </div>
          
          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Powered by</span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Nexus Mind</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default PublicProfile;
