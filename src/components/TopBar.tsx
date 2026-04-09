import React from 'react';
import { Menu, Settings } from 'lucide-react';

interface TopBarProps {
  activeTab: string;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setIsMobileMenuOpen
}) => {
  return (
    <header 
      className="h-20 border-b border-white/10 flex items-center justify-between px-8 shrink-0"
      style={{ backgroundColor: 'var(--topbar-bg, #ffffff)', color: '#ffffff' }}
    >
      <div className="flex items-center gap-4">
        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-white/80 hover:bg-white/10 rounded-xl">
          <Menu size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">{activeTab}</h2>
          <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Gestión Escolar / {activeTab}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Sistema Online</span>
        </div>
        <button className="p-3 text-white/60 hover:bg-white/10 hover:text-white rounded-xl transition-all relative">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
