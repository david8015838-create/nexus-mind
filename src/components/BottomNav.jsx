import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'feed', icon: 'auto_awesome_motion', label: '時光軸', path: '/' },
    { id: 'search', icon: 'search', label: '查找', path: '/search' },
    { id: 'vault', icon: 'calendar_month', label: '重要日', path: '/vault' },
    { id: 'settings', icon: 'settings', label: '設定', path: '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[100] px-6 pb-8 pointer-events-none">
      <div className="bg-[#16181d]/80 backdrop-blur-3xl border border-white/10 rounded-[32px] h-20 flex items-center justify-around px-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                if (navigator.vibrate) navigator.vibrate(5);
              }}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 relative group w-16 ${
                isActive ? 'text-primary' : 'text-white/30 hover:text-white/60'
              }`}
            >
              {isActive && (
                <div className="absolute -top-4 w-1 h-1 rounded-full bg-primary shadow-[0_0_12px_rgba(43,108,238,0.8)] animate-pulse"></div>
              )}
              <div className={`relative flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse"></div>
                )}
                <span className={`material-symbols-outlined text-[28px] relative z-10 ${isActive ? 'fill-current' : ''}`}>
                  {item.icon}
                </span>
              </div>
              <span className={`text-[10px] font-bold tracking-[0.1em] transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-1'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
