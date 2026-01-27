import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNexus } from '../context/NexusContext';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unsavedChanges, setUnsavedChanges } = useNexus();

  const navItems = [
    { id: 'feed', icon: 'auto_awesome_motion', label: '情報', path: '/' },
    { id: 'search', icon: 'search', label: '搜尋', path: '/search' },
    { id: 'graph', icon: 'hub', label: '圖譜', path: '/graph' },
    { id: 'vault', icon: 'calendar_month', label: '日程', path: '/vault' },
    { id: 'settings', icon: 'settings', label: '設定', path: '/settings' },
  ];

  const handleNavClick = (path) => {
    if (location.pathname === path) return;
    
    if (unsavedChanges) {
      if (window.confirm('您有尚未儲存的變更，確定要離開嗎？')) {
        setUnsavedChanges(false);
        navigate(path);
        if (navigator.vibrate) navigator.vibrate(5);
      }
    } else {
      navigate(path);
      if (navigator.vibrate) navigator.vibrate(5);
    }
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[100] px-4 pb-6 pointer-events-none">
      <div className="glass-panel rounded-[28px] h-20 flex items-center justify-around px-2 pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.path)}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-500 relative group w-16 ${
                isActive ? 'text-primary' : 'text-white/20 hover:text-white/40'
              }`}
            >
              <div className={`relative flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150"></div>
                )}
                <span className={`material-symbols-outlined text-[26px] relative z-10 ${isActive ? 'font-black' : ''}`}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary shadow-[0_0_10px_rgba(var(--primary-color-rgb),0.8)]"></div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
