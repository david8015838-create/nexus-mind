import React from 'react';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
  return (
    <div className="bg-nexus min-h-screen text-white font-sans selection:bg-primary/30 overflow-x-hidden">
      <div className="max-w-[480px] mx-auto min-h-screen flex flex-col relative">
        <div className="flex-1 px-4 pt-6 pb-32">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
