import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  GraduationCap,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Bell
} from 'lucide-react';
import { User, AppConfig, Student } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentUser: User | null;
  activeConfig: AppConfig;
  onLogout: () => void;
  navItems: { id: string, icon: any, label: string }[];
  originalUser?: User | null;
  onBackToOriginal?: () => void;
  students?: Student[];
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  currentUser,
  activeConfig,
  onLogout,
  navItems,
  originalUser,
  onBackToOriginal,
  students = []
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isPinned, setIsPinned] = useState(false); 
  const [isHovered, setIsHovered] = useState(false);
  const collapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const birthdayNotification = useMemo(() => {
    if (!students || students.length === 0) return null;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    let monthCount = 0;
    let weekCount = 0;
    let hasTomorrow = false;
    let hasToday = false;
    
    students.forEach(s => {
      if (!s.fechaNacimiento) return;
      
      // Date format is YYYY-MM-DD
      const [_, monthStr, dayStr] = s.fechaNacimiento.split('-');
      const bMonth = parseInt(monthStr) - 1;
      const bDay = parseInt(dayStr);
      
      const bDateThisYear = new Date(today.getFullYear(), bMonth, bDay);
      
      // Month check
      if (bMonth === today.getMonth()) {
        monthCount++;
        
        // Week check
        if (bDateThisYear >= startOfWeek && bDateThisYear <= endOfWeek) {
          weekCount++;
        }
        
        // Day check
        if (bMonth === today.getMonth() && bDay === today.getDate()) {
          hasToday = true;
        } else if (bMonth === tomorrow.getMonth() && bDay === tomorrow.getDate()) {
          hasTomorrow = true;
        }
      }
    });
    
    if (monthCount === 0) return null;
    
    return {
      monthCount,
      weekCount,
      hasTomorrow,
      hasToday
    };
  }, [students]);

  const startCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (!isPinned) {
      collapseTimerRef.current = setTimeout(() => {
        setIsCollapsed(true);
      }, 5000); // Collapse after 5 seconds of inactivity if not pinned
    }
  }, [isPinned]);

  const resetCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (!isPinned) {
      setIsCollapsed(false);
      startCollapseTimer();
    }
  }, [isPinned, startCollapseTimer]);

  useEffect(() => {
    if (!isPinned) {
      startCollapseTimer();
    } else {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      setIsCollapsed(false);
    }
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, [isPinned, startCollapseTimer]);

  // Expand when hovered if collapsed
  const handleMouseEnter = () => {
    setIsHovered(true);
    if (isCollapsed) {
      setIsCollapsed(false);
    }
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isPinned) {
      startCollapseTimer();
    }
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
  };

  const toggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCollapsed(!isCollapsed);
    if (isCollapsed) {
      // If we are expanding manually, we pin it automatically as per user intent "abrimos manualmente se quede fijo"
      setIsPinned(true);
    } else {
      setIsPinned(false);
    }
  };

  const showFull = isMobileMenuOpen || !isCollapsed || isHovered;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ 
          backgroundColor: 'var(--sidebar-bg, #0f172a)', 
          color: '#ffffff',
          width: showFull ? '288px' : '96px'
        }}
      >
      <div className="h-full flex flex-col relative">
        {/* Toggle Button (Desktop) */}
        <button 
          onClick={toggleCollapse}
          className="absolute -right-3 top-24 w-6 h-6 bg-blue-600 rounded-full hidden lg:flex items-center justify-center text-white shadow-lg z-[60] hover:scale-110 transition-transform"
        >
          {showFull ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className={`p-8 border-b border-white/5 transition-all duration-300 ${showFull ? '' : 'px-4 flex justify-center'}`}>
          <div className={`flex items-center gap-4 ${showFull ? 'mb-6' : 'mb-0'}`}>
            <div className={`rounded-2xl bg-white shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 ${showFull ? 'w-12 h-12' : 'w-10 h-10'}`}>
              {activeConfig.logo ? <img src={activeConfig.logo} className="w-8 h-8 object-contain" /> : <GraduationCap size={24} className="text-slate-900" style={{ color: 'var(--primary-color)' }} />}
            </div>
            {showFull && (
              <div className="flex-1 overflow-hidden">
                <h1 className="text-lg font-black tracking-tighter uppercase leading-none truncate">{activeConfig.siteName}</h1>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1 truncate">{activeConfig.slogan || "Gestión Inteligente"}</p>
              </div>
            )}
            {showFull && (
              <button 
                onClick={togglePin}
                className={`p-2 rounded-lg transition-colors ${isPinned ? 'text-blue-400 bg-blue-400/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                title={isPinned ? "Desanclar menú" : "Anclar menú"}
              >
                {isPinned ? <Pin size={14} fill="currentColor" /> : <Pin size={14} />}
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { 
                setActiveTab(item.id); 
                setIsMobileMenuOpen(false);
                resetCollapseTimer(); 
              }}
              className={`w-full flex items-center transition-all group relative ${showFull ? 'gap-4 px-6 py-4 rounded-2xl' : 'justify-center p-4 rounded-xl'} ${activeTab === item.id ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              title={item.label}
            >
              <item.icon size={20} className={`shrink-0 ${activeTab === item.id ? '' : 'group-hover:text-white'}`} style={activeTab === item.id ? { color: 'var(--primary-color)' } : {}} />
              {showFull && <span className="text-[11px] font-black uppercase tracking-widest truncate">{item.label}</span>}
              
              {/* Birthday Notification Bell for Dashboard */}
              {item.id === 'dashboard' && birthdayNotification && (
                <div className={`
                  ${showFull ? 'ml-auto translate-x-1' : 'absolute top-0 right-0 -translate-x-1 translate-y-1'} 
                  flex items-center justify-center pointer-events-none z-20
                `}>
                  <motion.div
                    animate={birthdayNotification.hasToday ? {
                      rotate: [0, -15, 15, -15, 15, 0],
                      scale: [1, 1.15, 1],
                    } : {}}
                    transition={birthdayNotification.hasToday ? {
                      duration: 0.5,
                      repeat: Infinity,
                      repeatDelay: 0.2
                    } : {}}
                    className={`
                      relative flex items-center justify-center
                      ${birthdayNotification.hasToday ? 'text-emerald-400' : ''}
                      ${!birthdayNotification.hasToday && birthdayNotification.hasTomorrow ? 'text-red-500' : ''}
                      ${!birthdayNotification.hasToday && !birthdayNotification.hasTomorrow && birthdayNotification.weekCount > 0 ? 'text-orange-500' : ''}
                      ${!birthdayNotification.hasToday && !birthdayNotification.hasTomorrow && birthdayNotification.weekCount === 0 && birthdayNotification.monthCount > 0 ? 'text-emerald-600/50' : ''}
                    `}
                  >
                    <Bell 
                      size={showFull ? 24 : 20} 
                      fill="currentColor" 
                      className={`
                        ${birthdayNotification.hasToday ? "text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" : ""}
                        ${!birthdayNotification.hasToday && birthdayNotification.hasTomorrow ? "drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" : ""}
                        ${!birthdayNotification.hasToday && !birthdayNotification.hasTomorrow && birthdayNotification.weekCount > 0 ? "drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]" : ""}
                        ${!birthdayNotification.hasToday && !birthdayNotification.hasTomorrow && birthdayNotification.weekCount === 0 && birthdayNotification.monthCount > 0 ? "drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]" : ""}
                      `} 
                    />
                    
                    {birthdayNotification.weekCount > 0 && (
                      <span className={`
                        absolute inset-0 flex items-center justify-center font-black leading-none
                        ${showFull ? 'text-[11px] pb-[6px]' : 'text-[9px] pb-[5px]'}
                        ${birthdayNotification.hasToday ? 'text-green-950' : 'text-white'}
                        drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]
                      `}>
                        {birthdayNotification.weekCount}
                      </span>
                    )}
                  </motion.div>
                </div>
              )}

              {!showFull && activeTab === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className={`p-6 border-t border-white/5 transition-all duration-300 ${showFull ? '' : 'px-2 flex flex-col items-center'}`}>
          {originalUser && (
            <button 
              onClick={onBackToOriginal}
              className={`flex items-center justify-center transition-all bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-widest mb-2 ${showFull ? 'w-full gap-3 px-6 py-4 rounded-2xl text-[10px]' : 'w-10 h-10 rounded-xl'}`}
              title="Volver a mi cuenta"
            >
              <ArrowLeft size={16} />
              {showFull && <span>Volver</span>}
            </button>
          )}
          
          <div className={`bg-white/5 rounded-3xl transition-all duration-300 mb-4 ${showFull ? 'p-4' : 'p-2'}`}>
            <div className={`flex items-center transition-all ${showFull ? 'gap-3' : 'justify-center'}`}>
              <div className={`rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-all ${showFull ? 'w-10 h-10' : 'w-8 h-8 text-xs'}`} style={{ backgroundColor: 'var(--primary-color)' }}>
                {currentUser?.username.charAt(0).toUpperCase()}
              </div>
              {showFull && (
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs font-black uppercase truncate">{currentUser?.fullName || currentUser?.username}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{currentUser?.role}</p>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={onLogout}
            className={`flex items-center justify-center transition-all bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white font-black uppercase tracking-widest ${showFull ? 'w-full gap-3 px-6 py-4 rounded-2xl text-[10px]' : 'w-12 h-12 rounded-xl'}`}
            title="Cerrar Sesión"
          >
            <LogOut size={16} />
            {showFull && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </div>
    </aside>
  </>
  );
};

export default Sidebar;
