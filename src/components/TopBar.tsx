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
    <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl">
          <Menu size={24} />
        </button>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeTab}</h2>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Gestión Escolar / {activeTab}</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sistema Online</span>
        </div>
        <button className="p-3 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all relative">
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
};

export default TopBar;
