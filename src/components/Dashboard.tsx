import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  Search, 
  BarChart3, 
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
  Clock,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Cake,
  User as UserIcon,
  ArrowRight
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
  const totalPeopleCount = useMemo(() => (students || []).length, [students]);
  const studentCount = useMemo(() => (students || []).filter(s => s.rol === 'Estudiante').length, [students]);
  const teacherCount = useMemo(() => (students || []).filter(s => s.rol === 'Docente').length, [students]);
  const attendanceToday = useMemo(() => (attendance || []).filter(a => a.fecha === new Date().toLocaleDateString()).length, [attendance]);
  const attendanceRate = useMemo(() => totalPeopleCount > 0 ? Math.max(0, Math.min(100, Math.round((attendanceToday / totalPeopleCount) * 100))) : 0, [totalPeopleCount, attendanceToday]);

  // Chart Data
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString();
      return {
        day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
        count: (attendance || []).filter(a => a.fecha === dateStr).length,
        fullDate: dateStr
      };
    });
  }, [attendance]);

  const recentActivity = useMemo(() => [...(attendance || [])]
    .sort((a, b) => b.hora.localeCompare(a.hora))
    .slice(0, 5), [attendance]);

  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedBirthdayDate, setSelectedBirthdayDate] = useState<string | null>(null);

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const studentsWithBirthdays = useMemo(() => {
    return students.filter(s => s.fechaNacimiento);
  }, [students]);

  const birthdayPeopleMap = useMemo(() => {
    const map: Record<string, Student[]> = {};
    studentsWithBirthdays.forEach(s => {
      if (s.fechaNacimiento && s.fechaNacimiento.includes('-')) {
        // Date format is YYYY-MM-DD
        const parts = s.fechaNacimiento.split('-');
        if (parts.length >= 3) {
          const month = parts[1];
          const day = parts[2];
          const dateKey = `${parseInt(day)}-${parseInt(month)}`; // day-month
          if (!map[dateKey]) map[dateKey] = [];
          map[dateKey].push(s);
        }
      }
    });
    return map;
  }, [studentsWithBirthdays]);

  const birthdayPeople = selectedBirthdayDate ? (birthdayPeopleMap[selectedBirthdayDate] || []) : [];

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1));
  };

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
        </div>        {/* Right Column: Calendar & Activity */}
        <div className="md:col-span-4 space-y-4 lg:space-y-6 flex flex-col h-full">
          
          {/* Birthday Calendar Card */}
          <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-fit">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-pink-50 rounded-lg">
                  <Cake className="text-pink-500" size={16} />
                </div>
                <h3 className="text-[10px] lg:text-xs font-black text-slate-800 uppercase tracking-tight">Cumpleaños</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 rounded-md transition-all">
                  <ChevronLeft size={14} className="text-slate-400" />
                </button>
                <button onClick={handleNextMonth} className="p-1 hover:bg-slate-50 rounded-md transition-all">
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-[8px] lg:text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 py-1.5 rounded-lg mb-1">
                {monthNames[currentCalendarDate.getMonth()]} {currentCalendarDate.getFullYear()}
              </p>

              <div className="grid grid-cols-7 border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-[7px] font-black text-slate-400 py-1.5 bg-slate-50 border-b border-slate-100 uppercase">{d}</div>
                ))}
                
                {Array.from({ length: firstDayOfMonth(currentCalendarDate) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-slate-50/20 border-b border-r border-slate-50 last:border-r-0" />
                ))}

                {Array.from({ length: daysInMonth(currentCalendarDate) }).map((_, i) => {
                  const day = i + 1;
                  const month = currentCalendarDate.getMonth() + 1;
                  const dateKey = `${day}-${month}`;
                  const hasBirthdays = !!birthdayPeopleMap[dateKey];
                  const isSelected = selectedBirthdayDate === dateKey;
                  const isToday = day === new Date().getDate() && month === (new Date().getMonth() + 1);
                  
                  const weekNum = Math.floor((day + firstDayOfMonth(currentCalendarDate) - 1) / 7);
                  const isEvenWeek = weekNum % 2 === 0;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedBirthdayDate(dateKey)}
                      className={`
                        aspect-square flex flex-col items-center justify-center text-[10px] transition-all relative border-b border-r border-slate-50 last:border-r-0
                        ${isEvenWeek ? 'bg-white' : 'bg-slate-50/20'}
                        ${hasBirthdays ? 'bg-rose-50 !font-black z-10 ring-1 ring-inset ring-rose-200 shadow-sm' : 'text-slate-600 font-medium'}
                        ${isSelected ? '!bg-indigo-600 !text-white shadow-xl scale-[1.15] z-20 rounded-lg !border-none ring-2 ring-white ring-offset-2 ring-offset-indigo-100' : ''}
                        ${isToday && !isSelected && !hasBirthdays ? 'bg-amber-100 text-amber-900 font-black ring-1 ring-amber-300 ring-inset' : ''}
                        ${!isSelected ? 'hover:bg-indigo-50 hover:text-indigo-600 hover:z-10' : ''}
                      `}
                    >
                      {hasBirthdays ? (
                        <div className="flex flex-col items-center justify-center leading-none pt-0.5">
                          <Cake size={16} className={`${isSelected ? 'text-white drop-shadow-sm' : 'text-rose-600'} mb-0.5`} />
                          <span className={`text-[12px] font-black tracking-tight ${isSelected ? 'text-white' : 'text-rose-800'}`}>{day}</span>
                        </div>
                      ) : (
                        <span className="relative z-10 font-bold">{day}</span>
                      )}
                      
                      {hasBirthdays && !isSelected && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full shadow-[0_0_4px_rgba(244,63,94,0.6)] animate-pulse z-20" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-50 min-h-[50px]">
                <AnimatePresence mode="wait">
                  {selectedBirthdayDate ? (
                    <motion.div
                      key={selectedBirthdayDate}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="space-y-2"
                    >
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                        {birthdayPeople.length > 0 ? birthdayPeople.map((p, idx) => (
                          <div 
                            key={idx} 
                            className={`
                              flex items-center gap-2 p-2 rounded-xl border transition-all
                              ${p.rol === 'Docente' 
                                ? 'bg-emerald-50/50 border-emerald-100' 
                                : 'bg-sky-50/50 border-sky-100'}
                            `}
                          >
                            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden border border-slate-100 shrink-0">
                              {p.foto ? <img src={p.foto} className="w-full h-full object-cover" /> : <UserIcon size={12} className="text-slate-300" />}
                            </div>
                            <div className="text-left overflow-hidden flex-1">
                              <p className={`text-[9px] font-black uppercase leading-tight truncate ${p.rol === 'Docente' ? 'text-emerald-700' : 'text-sky-700'}`}>
                                {p.nombre} {p.apellido}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[7px] font-bold text-slate-400 uppercase shrink-0">DNI: {p.dni}</span>
                                <span className="w-0.5 h-0.5 bg-slate-200 rounded-full" />
                                <span className={`text-[7px] font-black uppercase truncate ${p.rol === 'Docente' ? 'text-emerald-500/70' : 'text-sky-500/70'}`}>
                                  {p.rol === 'Docente' ? 'PROFE' : p.grado}
                                </span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="py-2 opacity-20">
                            <Cake size={16} className="mx-auto text-slate-300" />
                            <p className="text-[7px] font-black uppercase text-slate-400 mt-1">Nadie cumple hoy</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 space-y-1.5 opacity-30">
                      <CalendarIcon size={18} className="text-slate-300" />
                      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest text-center">Selecciona un día</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Activity List Card */}
          <div className="bg-white p-4 lg:p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-[250px]">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">
                <Clock size={16} />
              </div>
              <h3 className="text-[10px] lg:text-xs font-black text-slate-800 uppercase tracking-tight">Actividad</h3>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 group">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.estado === 'entrada' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] lg:text-[10px] font-black text-slate-700 uppercase truncate leading-none">{item.studentName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[7px] font-bold text-slate-400">{item.hora}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-slate-200" />
                        <span className={`text-[7px] font-black uppercase tracking-widest ${item.estado === 'entrada' ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {item.estado}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center space-y-2 opacity-20">
                  <Clock size={20} className="mx-auto text-slate-300" />
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sin movimientos</p>
                </div>
              )}
            </div>

            {recentActivity.length > 0 && (
              <button className="w-full mt-4 py-2.5 border border-dashed border-slate-200 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest hover:border-indigo-200 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2">
                Ver Historial <ArrowRight size={10} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

