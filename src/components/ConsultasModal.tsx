
import React, { useState, useRef, useCallback } from 'react';
import { X, User, Download, Calendar, FileText, ShieldCheck, Award, Info } from 'lucide-react';
import { Student, UserConfig, Attendance, Course, Schedule, TimeSlot, ConsultationLog, ConductAction, Grade } from '../types';
import * as htmlToImage from 'html-to-image';

interface ConsultasModalProps {
  consultasResult: Student;
  globalConfig: UserConfig;
  activeConsultasTab: string;
  setActiveConsultasTab: (tab: string) => void;
  onClose: () => void;
  attendance: Attendance[];
  courses: any[];
  schedules: any[];
  timeSlots: any[];
  pub: any;
  conductActions: ConductAction[];
  grades: Grade[];
}

const ConsultasModal: React.FC<ConsultasModalProps> = ({ 
  consultasResult, globalConfig, activeConsultasTab, setActiveConsultasTab, 
  onClose, attendance, courses, schedules, timeSlots, pub, conductActions, grades
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const downloadSchedule = useCallback(async () => {
    if (scheduleRef.current) {
      try {
        const dataUrl = await htmlToImage.toJpeg(scheduleRef.current, { quality: 0.95, backgroundColor: '#ffffff' });
        const link = document.createElement('a');
        link.download = `horario-${consultasResult.nombre}-${consultasResult.apellido}.jpg`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error downloading schedule:', err);
      }
    }
  }, [consultasResult]);

  const studentConductActions = conductActions.filter(a => a.studentId === consultasResult.id);
  const studentGrades = grades.filter(g => g.studentId === consultasResult.id);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up relative">
        {/* Fixed Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-[110] bg-black/20 hover:bg-black/40 text-white p-3 rounded-full transition-all shadow-lg"
        >
          <X size={24} />
        </button>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50">
          {/* Modal Header */}
          <div className="p-8 md:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${consultasResult.primaryColor || globalConfig.theme.primaryColor} 0%, ${consultasResult.secondaryColor || globalConfig.theme.secondaryColor} 100%)` }}>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full md:w-auto text-center sm:text-left">
              <div className="w-24 h-24 rounded-3xl bg-white/10 p-1 border border-white/20 mx-auto sm:mx-0 shadow-2xl">
                <div className="w-full h-full rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden">
                  {consultasResult.foto ? (
                    <img src={consultasResult.foto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : consultasResult.logo ? (
                    <img src={consultasResult.logo} className="w-full h-full object-contain p-2 opacity-50" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={40} className="text-slate-500" />
                  )}
                </div>
              </div>
              <div>
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight leading-none mb-2">{consultasResult.nombre} {consultasResult.apellido}</h2>
                <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">DNI: {consultasResult.dni}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">{consultasResult.grado} "{consultasResult.seccion}"</span>
                  {consultasResult.siteName && <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/5">{consultasResult.siteName}</span>}
                </div>
              </div>
            </div>
            {consultasResult?.rol !== 'Docente' && (
              <div className="flex bg-white/10 p-2 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar relative z-10 w-full md:w-auto justify-center shadow-xl">
                {pub.attendance && (
                  <button 
                    onClick={() => setActiveConsultasTab('asistencia')}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'asistencia' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                  >Asistencia</button>
                )}
                {pub.alerts && (
                  <button 
                    onClick={() => setActiveConsultasTab('alerta')}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'alerta' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                  >Alertas</button>
                )}
                {pub.schedule && (
                  <button 
                    onClick={() => setActiveConsultasTab('horario')}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'horario' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                  >Horario</button>
                )}
                {pub.grades && (
                  <button 
                    onClick={() => setActiveConsultasTab('notas')}
                    className={`flex-1 md:flex-none px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'notas' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                  >Notas</button>
                )}
              </div>
            )}
          </div>

          {/* Modal Content */}
          <div className="p-8 md:p-12">
            {activeConsultasTab === 'asistencia' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro de Asistencia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attendance.filter(a => a.studentId === consultasResult.id).length > 0 ? (
                    attendance.filter(a => a.studentId === consultasResult.id).map(a => (
                      <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{a.date}</p>
                          <p className="font-bold text-slate-700">{a.time}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          a.status === 'entrada' ? 'bg-emerald-100 text-emerald-600' :
                          a.status === 'tardanza' ? 'bg-amber-100 text-amber-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>{a.status}</span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay registros de asistencia</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeConsultasTab === 'alerta' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Alertas e Incidencias</h3>
                  <div className="bg-slate-900 px-4 py-2 rounded-xl text-white flex items-center gap-3 shadow-lg">
                    <ShieldCheck size={18} className="text-amber-400" />
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest opacity-50 leading-none">Puntaje Conducta</p>
                      <p className="text-sm font-black">{(consultasResult.conductPoints || 100) / 5} / 20</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntaje de Conducta</span>
                        <div className="text-right">
                          <span className="text-2xl font-black text-slate-900 uppercase">{(consultasResult.conductPoints || 100) / 5} / 20</span>
                          <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${
                            (consultasResult.conductPoints || 100) > 70 ? 'text-emerald-600' : 
                            (consultasResult.conductPoints || 100) > 40 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {(consultasResult.conductPoints || 100) > 70 ? 'Excelente' : 
                             (consultasResult.conductPoints || 100) > 40 ? 'Regular' : 'Crítico'}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full transition-all duration-1000 ease-out" 
                          style={{ 
                            width: `${consultasResult.conductPoints || 100}%`,
                            backgroundColor: (consultasResult.conductPoints || 100) > 70 ? '#10b981' : (consultasResult.conductPoints || 100) > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 text-center min-w-[140px]">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                      <p className={`text-sm font-black uppercase ${(consultasResult.conductPoints || 100) > 70 ? 'text-emerald-600' : (consultasResult.conductPoints || 100) > 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {(consultasResult.conductPoints || 100) > 70 ? 'Excelente' : (consultasResult.conductPoints || 100) > 40 ? 'Regular' : 'Crítico'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historial de Méritos y Deméritos</h4>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {studentConductActions.length > 0 ? (
                        studentConductActions.map(action => (
                          <div key={action.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.type === 'merit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {action.type === 'merit' ? <Award size={20} /> : <Info size={20} />}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{action.categoryName}</p>
                                <p className="text-[9px] font-bold text-slate-400">{action.date}</p>
                                {action.description && <p className="text-[10px] text-slate-500 mt-1 italic">"{action.description}"</p>}
                              </div>
                            </div>
                            <span className={`font-black text-sm ${action.type === 'merit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {action.type === 'merit' ? '+' : ''}{action.points}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 text-center">
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay registros de conducta</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeConsultasTab === 'horario' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Horario de Clases</h3>
                  <button 
                    onClick={downloadSchedule}
                    className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                  >
                    <Download size={14} /> Descargar Horario
                  </button>
                </div>
                <div className="overflow-x-auto no-scrollbar" ref={scheduleRef}>
                  <div className="min-w-[800px] bg-white p-4 rounded-3xl">
                    <table className="w-full border-separate border-spacing-2">
                      <thead>
                        <tr>
                          <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hora</th>
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(day => (
                            <th key={day} className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {timeSlots.map(slot => (
                          <tr key={slot.id}>
                            <td className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                              <span className="text-[10px] font-black text-slate-700">{slot.start} - {slot.end}</span>
                            </td>
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(day => {
                              const schedule = (schedules || []).find(s => 
                                s.gradeId === consultasResult.grado && 
                                s.section === consultasResult.seccion && 
                                s.day === day && 
                                s.timeSlotId === slot.id
                              );
                              const course = schedule ? courses.find(c => c.id === schedule.courseId) : null;
                              return (
                                <td key={day} className="p-1">
                                  {course ? (
                                    <div className="p-3 rounded-xl text-white text-center shadow-sm" style={{ backgroundColor: course.color }}>
                                      <p className="text-[9px] font-black uppercase tracking-tight leading-tight">{course.name}</p>
                                    </div>
                                  ) : (
                                    <div className="h-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-100"></div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeConsultasTab === 'notas' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro de Calificaciones</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button 
                      onClick={() => setSelectedCourseId(null)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!selectedCourseId ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                    >Todos</button>
                    {courses.map(course => (
                      <button 
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCourseId === course.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                      >{course.name}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses
                    .filter(c => !selectedCourseId || c.id === selectedCourseId)
                    .map(course => {
                      const courseGrades = studentGrades.filter(g => g.materia.startsWith(course.name));
                      const avg = courseGrades.length > 0 ? courseGrades.reduce((a, b) => a + b.nota, 0) / courseGrades.length : 0;
                      
                      return (
                        <div key={course.id} className="space-y-3">
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-3 h-12 rounded-full" style={{ backgroundColor: course.color }}></div>
                              <div>
                                <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{course.name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Promedio Actual</p>
                              </div>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                              avg >= 11 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {avg > 0 ? avg.toFixed(1) : '-'}
                            </div>
                          </div>
                          
                          {selectedCourseId === course.id && courseGrades.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
                              <div className="p-3 bg-slate-50 border-b border-slate-100">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Detalle de Notas</p>
                              </div>
                              <div className="divide-y divide-slate-50">
                                {courseGrades.map(g => (
                                  <div key={g.id} className="p-3 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <FileText size={14} className="text-slate-300" />
                                      <p className="text-[10px] font-bold text-slate-600 uppercase">{g.materia.split('(')[1]?.replace(')', '') || 'Nota'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <p className="text-[9px] font-bold text-slate-400">{g.fecha}</p>
                                      <span className={`font-black text-xs ${g.nota >= 11 ? 'text-blue-600' : 'text-rose-600'}`}>{g.nota.toString().padStart(2, '0')}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  
                  {!selectedCourseId && (
                    <div className="bg-slate-900 p-6 rounded-3xl shadow-xl flex justify-between items-center col-span-full">
                      <div className="flex items-center gap-4">
                        <div className="w-3 h-12 rounded-full bg-amber-500"></div>
                        <div>
                          <p className="font-black text-white uppercase tracking-tight text-sm">Conducta / Comportamiento</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Evaluación de Actitudes</p>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl text-amber-400 shadow-inner">
                        {Math.round((consultasResult.conductPoints || 100) / 5)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultasModal;
