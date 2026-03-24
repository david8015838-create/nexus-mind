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
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-[100] pointer-events-none">
      <div
        className="glass-panel rounded-t-3xl pointer-events-auto"
        style={{ borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }}
      >
        <div className="flex items-center justify-around px-2 h-[72px]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.path)}
                className="flex flex-col items-center justify-center gap-1 transition-all duration-300 relative w-16 h-full focus-visible:outline-none"
              >
                {/* Icon container */}
                <div
                  className={`relative flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'scale-[1.12] -translate-y-0.5' : 'scale-100'
                  }`}
                >
                  {isActive && (
                    <div
                      className="absolute inset-0 rounded-full blur-lg"
                      style={{ background: 'rgba(124, 109, 255, 0.25)', transform: 'scale(2)' }}
                    />
                  )}
                  <span
                    className="material-symbols-outlined text-[24px] relative z-10 transition-colors duration-300"
                    style={{ color: isActive ? '#7c6dff' : 'rgba(255,255,255,0.35)' }}
                  >
                    {item.icon}
                  </span>
                </div>

                {/* Label — always visible */}
                <span
                  className="text-[9px] font-black uppercase tracking-[0.12em] transition-all duration-300 leading-none"
                  style={{
                    color: isActive ? '#7c6dff' : 'rgba(255,255,255,0.3)',
                    fontWeight: isActive ? 900 : 700,
                  }}
                >
                  {item.label}
                </span>

                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute bottom-1.5 block rounded-full"
                    style={{
                      width: '20px',
                      height: '3px',
                      background: '#7c6dff',
                      boxShadow: '0 0 8px rgba(124,109,255,0.6)',
                      animation: 'navIndicator 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Safe area bottom padding */}
        <div style={{ height: 'env(safe-area-inset-bottom)' }} />
      </div>
    </nav>
  );
};

export default BottomNav;
