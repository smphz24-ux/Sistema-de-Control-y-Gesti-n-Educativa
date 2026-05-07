import React from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  BarChart3, 
  Calendar,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Attendance, Incidence, AppConfig } from '../types';

interface DashboardProps {
  students: Student[];
  attendance: Attendance[];
  incidences: Incidence[];
  activeConfig: AppConfig;
  isAiLoading: boolean;
  aiReport: string;
  generateAiReport: () => void;
  currentUser?: any;
}

const Dashboard: React.FC<DashboardProps> = ({
  students = [],
  attendance = [],
  isAiLoading,
  aiReport,
  generateAiReport,
  currentUser
}) => {
  const todayName = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  const todayDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Refined Statistics
  const totalPeopleCount = (students || []).length;
  const studentCount = (students || []).filter(s => s.rol === 'Estudiante').length;
  const teacherCount = (students || []).filter(s => s.rol === 'Docente').length;
  const attendanceToday = (attendance || []).filter(a => a.fecha === new Date().toLocaleDateString()).length;
  const attendanceRate = totalPeopleCount > 0 ? Math.max(0, Math.min(100, Math.round((attendanceToday / totalPeopleCount) * 100))) : 0;

  // Chart Data
  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString();
    return {
      day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
      count: (attendance || []).filter(a => a.fecha === dateStr).length,
      fullDate: dateStr
    };
  });

  const recentActivity = [...(attendance || [])]
    .sort((a, b) => b.hora.localeCompare(a.hora))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10 min-h-screen bg-slate-50/50">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <TrendingUp size={16} className="animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Resumen Ejecutivo</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Dashboard</h1>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
            <span className="capitalize">{todayName}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>{todayDate}</span>
          </p>
        </div>
        
        {currentUser && (
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 pr-4 py-1 pl-2">
              <div className="flex gap-2 items-center">
                 <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.username || currentUser.id}`} alt="user" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 </div>
                 <div className="text-left hidden sm:block">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentUser.role || 'Usuario'}</p>
                   <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{currentUser.fullName || currentUser.username}</p>
                 </div>
              </div>
              <div className="border-l border-slate-100 pl-4 flex flex-col items-end justify-center h-full">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estado</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                   <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                   <p className="text-xs font-bold text-emerald-600">En línea</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Quick Stats */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estudiantes</p>
              <h4 className="text-4xl font-black text-slate-900">{studentCount}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                <TrendingUp size={12} />
                <span>+12% este mes</span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Profesores</p>
              <h4 className="text-4xl font-black text-slate-900">{teacherCount}</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <Users size={12} />
                <span>Personal activo</span>
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asistencia Hoy</p>
              <h4 className="text-4xl font-black text-slate-900">{attendanceRate}%</h4>
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-amber-600">
                <Clock size={12} />
                <span>{attendanceToday} presencias</span>
              </div>
            </motion.div>
          </div>

          {/* Large Chart Card */}
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Actividad Semanal</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparativa de asistencia histórica</p>
              </div>
              <BarChart3 className="text-slate-300" size={24} />
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={last7Days}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-white/10">
                            <p className="text-[8px] font-black uppercase text-indigo-400 mb-1">{payload[0].payload.fullDate}</p>
                            <p className="text-lg font-black">{payload[0].value} <span className="text-[10px] font-normal opacity-50 uppercase">Marcaciones</span></p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 10, 10]} barSize={40}>
                    {last7Days.map((entry, index) => (
                      <Cell key={index} fill={entry.count > 0 ? "url(#barGradient)" : "#f1f5f9"} />
                    ))}
                  </Bar>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={15} />
                  <YAxis hide />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: AI & Activity */}
        <div className="md:col-span-4 space-y-8">
          
          {/* AI Sensei Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group h-fit"
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Sparkles className="text-amber-300" size={20} />
                  </div>
                  <div>
                    <h5 className="font-black text-sm uppercase tracking-tight">AI Assistant</h5>
                    <p className="text-[8px] font-bold text-white/50 uppercase tracking-widest">Análisis Predictivo</p>
                  </div>
                </div>
                <button 
                  onClick={generateAiReport}
                  disabled={isAiLoading}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCw size={18} className={isAiLoading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="min-h-[100px] flex flex-col justify-center">
                {isAiLoading ? (
                  <div className="space-y-3">
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ x: "-100%" }}
                        animate={{ x: "100%" }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        className="h-full bg-white"
                      />
                    </div>
                    <p className="text-[9px] font-bold text-white/40 uppercase text-center animate-pulse">Sincronizando datos...</p>
                  </div>
                ) : (
                  <p className="text-sm font-medium leading-relaxed opacity-90 italic">
                    {aiReport || "Haz clic en el icono para generar un análisis inteligente de la jornada actual."}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Activity List Card */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm grow">
            <div className="flex items-center gap-3 mb-8">
              <Clock className="text-slate-400" size={20} />
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Actividad Reciente</h3>
            </div>

            <div className="space-y-6">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 group">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${item.estado === 'entrada' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-800 uppercase truncate">{item.studentName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-bold text-slate-400">{item.hora}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className={`text-[9px] font-black uppercase tracking-widest ${item.estado === 'entrada' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-3 opacity-30">
                  <Clock size={32} className="mx-auto text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin actividad hoy</p>
                </div>
              )}
            </div>

            {recentActivity.length > 0 && (
              <button className="w-full mt-8 py-4 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 transition-all">
                Ver Historial Completo
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default Dashboard;

