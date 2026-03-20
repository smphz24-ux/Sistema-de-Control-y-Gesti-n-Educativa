import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  CalendarCheck, 
  AlertCircle, 
  BarChart3, 
  Sparkles, 
  RefreshCw 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar 
} from 'recharts';
import { Student, Attendance, Incidence, AppConfig } from '../types';

interface DashboardProps {
  students: Student[];
  attendance: Attendance[];
  incidences: Incidence[];
  activeConfig: AppConfig;
  isAiLoading: boolean;
  aiReport: string;
  generateAiReport: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  students = [],
  attendance = [],
  incidences = [],
  activeConfig,
  isAiLoading,
  aiReport,
  generateAiReport
}) => {
  const stats = [
    { label: 'Estudiantes', value: (students || []).filter(s => s.rol === 'Estudiante').length, icon: Users, color: 'blue' },
    { label: 'Docentes', value: (students || []).filter(s => s.rol === 'Docente').length, icon: UserCheck, color: 'emerald' },
    { label: 'Asistencias Hoy', value: (attendance || []).filter(a => a.fecha === new Date().toLocaleDateString()).length, icon: CalendarCheck, color: 'amber' },
    { label: 'Alertas Activas', value: (incidences || []).filter(i => i.status !== 'resuelta').length, icon: AlertCircle, color: 'rose' },
  ];

  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toLocaleDateString();
    return {
      name: dateStr.split('/')[0],
      asistencias: (attendance || []).filter(a => a.fecha === dateStr).length
    };
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center gap-6 hover:shadow-xl transition-all group">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon size={32} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Asistencia Semanal</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Últimos 7 días de actividad</p>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                />
                <Bar dataKey="asistencias" fill={activeConfig.theme.primaryColor} radius={[10, 10, 10, 10]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* AI Sensei */}
          <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/10 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="text-amber-400" size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">AI Sensei</h3>
              </div>
              {isAiLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <RefreshCw className="animate-spin text-blue-400" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analizando datos...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                    "{aiReport || "Haz clic en el botón para generar un análisis inteligente de tu institución."}"
                  </p>
                  <button 
                    onClick={generateAiReport}
                    className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
                  >
                    Generar Reporte IA
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6">Actividad Reciente</h3>
            <div className="space-y-6">
              {attendance.slice(0, 5).map((att, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${att.estado === 'entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-800">{att.studentName}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{att.estado} • {att.hora}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
