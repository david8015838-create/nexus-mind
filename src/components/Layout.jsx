import React from 'react';
import BottomNav from './BottomNav';

const Layout = ({ children }) => {
  return (
    <div className="bg-background-dark min-h-screen text-white font-sans selection:bg-primary/30">
      <div className="max-w-[480px] mx-auto min-h-screen flex flex-col relative pb-24">
        {children}
      </div>
      <BottomNav />
    </div>
  );
};

export default Layout;
