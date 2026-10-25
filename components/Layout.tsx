import React from 'react';
import { ViewState } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onFabClick?: () => void;
  onShareClick?: () => void;
  isReadOnly?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  onChangeView, 
  onFabClick, 
  onShareClick,
  isReadOnly 
}) => {

  // Logic for the central action button
  const handleActionClick = () => {
    if (onFabClick) {
        onFabClick();
    } else {
        onChangeView('add');
    }
  };

  return (
    <div 
        className="min-h-screen bg-[#050505] text-cinema-accent selection:bg-white selection:text-black font-serif relative overflow-x-hidden"
    >
      {/* TOP HEADER - Logo & Share Button - Hidden in details view to prevent overlap */}
      <header className={`fixed top-0 left-0 w-full z-50 px-8 py-6 flex items-center justify-between bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none transition-opacity duration-300 ${currentView === 'details' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          
          {/* Logo (Top Left) */}
          <div className="flex items-center gap-3">
            <div 
              className="pointer-events-auto text-2xl font-heading font-bold tracking-tighter text-white cursor-pointer flex items-center gap-2"
              onClick={() => onChangeView('library')}
            >
              CINE<span className="italic font-serif text-neutral-500">LOG</span>
            </div>
            {isReadOnly && (
              <span className="pointer-events-auto text-[9px] font-mono uppercase tracking-[0.2em] px-2 py-0.5 rounded border border-white/20 text-neutral-400 bg-white/5 backdrop-blur-md">
                Read-Only
              </span>
            )}
          </div>

          {/* Share Button (Top Right) */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={onShareClick}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/15 hover:border-white text-xs font-mono uppercase tracking-widest text-neutral-300 hover:text-white bg-black/60 backdrop-blur-xl transition-all duration-300"
              title="分享观影主页（只读保护链接）"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="group-hover:scale-110 transition-transform">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              <span>Share</span>
            </button>
          </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full min-h-screen pt-24 pb-32">
        {children}
      </main>

      {/* BOTTOM FLOATING NAVIGATION */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full px-6 md:px-0 flex justify-center">
          <nav className="flex items-center gap-8 bg-[#0a0a0a]/90 backdrop-blur-xl border border-white/10 px-10 py-4 rounded-full shadow-2xl">
                
                {/* Library (Film Strip) */}
                <NavButton 
                    isActive={currentView === 'library' || currentView === 'details'} 
                    onClick={() => onChangeView('library')}
                    label="Library"
                    icon={(
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                        <line x1="7" y1="2" x2="7" y2="22"></line>
                        <line x1="17" y1="2" x2="17" y2="22"></line>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <line x1="2" y1="7" x2="7" y2="7"></line>
                        <line x1="2" y1="17" x2="7" y2="17"></line>
                        <line x1="17" y1="17" x2="22" y2="17"></line>
                        <line x1="17" y1="7" x2="22" y2="7"></line>
                    </svg>
                    )}
                />

                {/* CENTRAL ADD/SAVE BUTTON (Always Plus) */}
                <div className="mx-2">
                    <button 
                        onClick={handleActionClick}
                        className={`w-16 h-16 flex items-center justify-center rounded-full shadow-lg group hover:scale-105 bg-neutral-800 text-white border border-white/10 transition-all duration-500 ${currentView === 'add' ? 'bg-white text-black rotate-90' : 'rotate-0'}`}
                        title={currentView === 'add' ? "Complete" : "New Log"}
                    >
                        {/* Always Plus Icon */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>

                {/* Profile (Simple User) */}
                <NavButton 
                    isActive={currentView === 'profile'} 
                    onClick={() => onChangeView('profile')}
                    label="Profile"
                    icon={(
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                         <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    )}
                />
          </nav>
      </div>

    </div>
  );
};

const NavButton: React.FC<{ isActive: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ isActive, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`relative p-3 rounded-full transition-all duration-500 flex items-center justify-center group ${
        isActive ? 'text-white' : 'text-neutral-600 hover:text-neutral-300'
    }`}
    aria-label={label}
  >
    {icon}
  </button>
);

export default Layout;