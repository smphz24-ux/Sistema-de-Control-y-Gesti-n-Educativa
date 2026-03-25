import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Award, 
  AlertCircle, 
  BarChart3, 
  Database, 
  Settings, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { User, AppConfig } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentUser: User | null;
  activeConfig: AppConfig;
  onLogout: () => void;
  navItems: { id: string, icon: any, label: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentUser,
  activeConfig,
  onLogout,
  navItems
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-full flex flex-col">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-2xl flex items-center justify-center overflow-hidden">
              {activeConfig.logo ? <img src={activeConfig.logo} className="w-8 h-8 object-contain" /> : <GraduationCap size={24} className="text-slate-900" style={{ color: 'var(--primary-color)' }} />}
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter uppercase leading-none">{activeConfig.siteName}</h1>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activeConfig.slogan || "Gestión Inteligente"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group ${activeTab === item.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon size={20} className={activeTab === item.id ? '' : 'group-hover:text-white'} style={activeTab === item.id ? { color: 'var(--primary-color)' } : {}} />
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="bg-white/5 rounded-3xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm" style={{ backgroundColor: 'var(--primary-color)' }}>
                {currentUser?.username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black uppercase truncate">{currentUser?.fullName || currentUser?.username}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{currentUser?.role}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
