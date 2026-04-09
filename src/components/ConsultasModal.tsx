
import React, { useState, useRef, useCallback } from 'react';
import { X, User, Download, Calendar, FileText, ShieldCheck, Award, Info, Printer } from 'lucide-react';
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
  schoolDays?: string[];
  gradeLevels?: any[];
  students?: Student[];
}

const ConsultasModal: React.FC<ConsultasModalProps> = ({ 
  consultasResult, globalConfig, activeConsultasTab, setActiveConsultasTab, 
  onClose, attendance, courses, schedules, timeSlots, pub, conductActions, grades,
  schoolDays, gradeLevels, students
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  const downloadSchedule = useCallback(async () => {
    if (scheduleRef.current) {
      try {
        const node = scheduleRef.current;
        
        // Calculate dimensions to ensure no cropping
        // We use a minimum width of 1200px to accommodate all days comfortably
        const captureWidth = Math.max(node.scrollWidth, 1200);
        const captureHeight = node.scrollHeight;

        const dataUrl = await htmlToImage.toJpeg(node, { 
          quality: 1.0, 
          backgroundColor: '#ffffff',
          pixelRatio: 2, // High resolution
          width: captureWidth,
          height: captureHeight,
          style: {
            borderRadius: '0',
            padding: '40px',
            margin: '0',
            width: `${captureWidth}px`,
            height: `${captureHeight}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'none'
          }
        });
        const link = document.createElement('a');
        link.download = `horario-${consultasResult.nombre}-${consultasResult.apellido}.jpg`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Error downloading schedule:', err);
      }
    }
  }, [consultasResult]);

  const printSchedule = () => {
    const printContent = scheduleRef.current;
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Horario - ${consultasResult.nombre} ${consultasResult.apellido}</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            @media print {
              @page { size: landscape; margin: 1cm; }
              body { -webkit-print-color-adjust: exact; }
            }
            body { font-family: sans-serif; padding: 20px; display: flex; justify-content: center; }
            .print-container { width: 100%; max-width: 1200px; }
            table { width: 100%; border-collapse: collapse; margin: 0 auto; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; }
            .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
            .rounded-xl { border-radius: 0.75rem; }
            .text-center { text-align: center !important; }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Derive days from schoolDays or schedules
  const availableDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  // Find the GradeLevel ID for the student to match schedules correctly
  const studentGradeLevel = gradeLevels?.find(gl => gl.nombre === consultasResult.grado && gl.seccion === consultasResult.seccion);
  
  const studentSchedules = (schedules || []).filter(s => {
    if (consultasResult.rol === 'Docente') {
      const course = courses.find(c => c.name === s.materia || c.id === (s as any).courseId);
      return course?.teacherId === consultasResult.id;
    }
    return (
      s.targetId === studentGradeLevel?.id || 
      s.targetId === (consultasResult as any).gradoId || 
      ((s as any).gradeId === consultasResult.grado && (s as any).section === consultasResult.seccion)
    );
  });
  
  // Use schoolDays if provided, otherwise fallback to Mon-Fri + any day with a schedule
  const activeDays = schoolDays && schoolDays.length > 0 
    ? schoolDays 
    : availableDays.filter(day => 
        ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].includes(day) || 
        studentSchedules.some(s => (s.dia || (s as any).day) === day)
      );

  const studentConductActions = conductActions.filter(a => a.studentId === consultasResult.id);
  const studentGrades = grades.filter(g => g.studentId === consultasResult.id);

  // Filter courses to only those relevant to the student's grade or those they have grades for
  const baseRelevantCourses = courses.filter(c => 
    studentSchedules.some(s => s.materia === c.name) || 
    studentGrades.some(g => g.materia.startsWith(c.name))
  );

  // Add virtual courses for each unique examType found in grades with materia "Examen"
  const examTypesInGrades = Array.from(new Set(
    studentGrades
      .filter(g => g.materia === "Examen")
      .map(g => g.examType)
  )).filter(Boolean);

  const relevantCourses = [
    ...baseRelevantCourses,
    ...examTypesInGrades.map(type => ({
      id: `exam-${type}`,
      name: type,
      color: '#6366f1', // Indigo for exams
      isExam: true
    }))
  ];
  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-10 bg-slate-950/90 backdrop-blur-xl animate-fade-in ${isFullScreen ? 'z-[200]' : ''}`}>
      <div className={`bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-slide-up relative ${isFullScreen ? 'max-w-full max-h-full rounded-none' : ''}`}>
        {/* Fixed Close Button */}
        <button 
          onClick={isFullScreen ? () => setIsFullScreen(false) : onClose} 
          className="absolute top-4 right-4 md:top-6 md:right-6 z-[110] bg-black/20 hover:bg-black/40 text-white p-2 md:p-3 rounded-full transition-all shadow-lg"
        >
          <X size={20} />
        </button>

        {/* Scrollable Container */}
        <div className={`flex-1 overflow-y-auto no-scrollbar bg-slate-50 ${isFullScreen ? 'overflow-hidden' : ''}`}>
          {/* Modal Header */}
          {!isFullScreen && (
            <div className="p-6 md:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${consultasResult.primaryColor || globalConfig.theme.primaryColor} 0%, ${consultasResult.secondaryColor || globalConfig.theme.secondaryColor} 100%)` }}>
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
              <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto text-center sm:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl md:rounded-3xl bg-white/10 p-1 border border-white/20 mx-auto sm:mx-0 shadow-2xl">
                  <div className="w-full h-full rounded-xl md:rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden">
                    {consultasResult.foto ? (
                      <img src={consultasResult.foto} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={32} className="text-slate-500" />
                    )}
                  </div>
                </div>
                <div>
                  <h2 className="text-xl md:text-4xl font-black uppercase tracking-tight leading-tight mb-2">{consultasResult.nombre} {consultasResult.apellido}</h2>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 md:gap-3">
                    <span className="bg-white/20 px-2 md:px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10">DNI: {consultasResult.dni}</span>
                    <span className="bg-white/20 px-2 md:px-3 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest border border-white/10">{consultasResult.grado} "{consultasResult.seccion}"</span>
                  </div>
                </div>
              </div>
              {consultasResult?.rol === 'Docente' ? (
                <div className="flex bg-white/10 p-1 rounded-lg border border-white/10 overflow-x-auto no-scrollbar relative z-10 w-full md:w-auto justify-start md:justify-center shadow-xl gap-1">
                  {pub.schedule && pub.hideTeacherSchedule && (
                    <button 
                      onClick={() => setActiveConsultasTab('horario')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'horario' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Horario del Docente</button>
                  )}
                </div>
              ) : (
                <div className="flex bg-white/10 p-1 rounded-lg border border-white/10 overflow-x-auto no-scrollbar relative z-10 w-full md:w-auto justify-start md:justify-center shadow-xl gap-1">
                  {pub.attendance && (
                    <button 
                      onClick={() => setActiveConsultasTab('asistencia')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'asistencia' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Asistencia</button>
                  )}
                  {pub.alerts && (
                    <button 
                      onClick={() => setActiveConsultasTab('alerta')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'alerta' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Alertas</button>
                  )}
                  {pub.schedule && (
                    <button 
                      onClick={() => setActiveConsultasTab('horario')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'horario' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Horario</button>
                  )}
                  {pub.grades && (
                    <button 
                      onClick={() => setActiveConsultasTab('notas')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'notas' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Notas</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Content */}
          <div className={`${isFullScreen ? 'p-0 h-full' : 'p-6 md:p-12'}`}>
            {activeConsultasTab === 'asistencia' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro de Asistencia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attendance.filter(a => a.studentId === consultasResult.id).length > 0 ? (
                    attendance.filter(a => a.studentId === consultasResult.id).map(a => (
                      <div key={a.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{a.fecha}</p>
                          <p className="font-bold text-slate-700">{a.hora}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          a.estado === 'entrada' ? 'bg-emerald-100 text-emerald-600' :
                          a.estado === 'tardanza' ? 'bg-amber-100 text-amber-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>{a.estado}</span>
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
                  <div className="bg-white p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8">
                    <div className="flex-1 w-full">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntaje de Conducta</span>
                        <div className="text-right">
                          <span className="text-xl md:text-2xl font-black text-slate-900 uppercase">{(consultasResult.conductPoints || 100) / 5} / 20</span>
                          <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest mt-1 ${
                            (consultasResult.conductPoints || 100) > 70 ? 'text-emerald-600' : 
                            (consultasResult.conductPoints || 100) > 40 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {(consultasResult.conductPoints || 100) > 70 ? 'Excelente' : 
                             (consultasResult.conductPoints || 100) > 40 ? 'Regular' : 'Crítico'}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-3 md:h-4 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full transition-all duration-1000 ease-out" 
                          style={{ 
                            width: `${consultasResult.conductPoints || 100}%`,
                            backgroundColor: (consultasResult.conductPoints || 100) > 70 ? '#10b981' : (consultasResult.conductPoints || 100) > 40 ? '#f59e0b' : '#ef4444'
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 text-center min-w-[120px] md:min-w-[140px] w-full md:w-auto">
                      <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                      <p className={`text-xs md:text-sm font-black uppercase ${(consultasResult.conductPoints || 100) > 70 ? 'text-emerald-600' : (consultasResult.conductPoints || 100) > 40 ? 'text-amber-600' : 'text-rose-600'}`}>
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
              <div className={`space-y-6 ${isFullScreen ? 'h-full flex flex-col' : ''}`}>
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">Horario de Clases</h3>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => setIsFullScreen(!isFullScreen)}
                      className="flex-1 md:flex-none bg-blue-600 text-white px-4 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg"
                    >
                      <Calendar size={14} /> {isFullScreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}
                    </button>
                    <button 
                      onClick={printSchedule}
                      className="flex-1 md:flex-none bg-slate-100 text-slate-600 px-4 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm"
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button 
                      onClick={downloadSchedule}
                      className="flex-1 md:flex-none bg-slate-900 text-white px-4 py-3 md:py-2 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg"
                    >
                      <Download size={14} /> Descargar JPG
                    </button>
                  </div>
                </div>
                <div className={`relative ${isFullScreen ? 'flex-1 overflow-hidden' : ''}`}>
                  <div className={`overflow-x-auto custom-scrollbar pb-4 ${isFullScreen ? 'h-full overflow-y-auto' : ''}`}>
                    <div className={`min-w-[900px] bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center ${isFullScreen ? 'min-w-full' : ''}`} ref={scheduleRef}>
                      <div className="mb-6 border-b border-slate-100 pb-4 w-full text-center">
                        <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{consultasResult.nombre} {consultasResult.apellido}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{consultasResult.grado} "{consultasResult.seccion}" - Horario Escolar</p>
                      </div>
                      <table className="w-full border-separate border-spacing-2 mx-auto">
                        <thead>
                          <tr>
                            <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center bg-slate-50 rounded-xl">Hora</th>
                            {activeDays.map(day => (
                              <th key={day} className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center bg-slate-50 rounded-xl">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {timeSlots.map(slot => (
                            <tr key={slot.id}>
                              <td className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center shadow-md">
                                <span className="text-[10px] font-black text-white whitespace-nowrap">{slot.start} - {slot.end}</span>
                              </td>
                              {activeDays.map(day => {
                                const isDocente = consultasResult.rol === 'Docente';
                                const schedule = (schedules || []).find(s => {
                                  if (isDocente) {
                                    const course = courses.find(c => c.name === s.materia || c.id === (s as any).courseId);
                                    return course?.teacherId === consultasResult.id && 
                                           (s.dia === day || (s as any).day === day) && 
                                           (s.inicio === slot.start || (s as any).timeSlotId === slot.id);
                                  } else {
                                    return (s.targetId === studentGradeLevel?.id || s.targetId === (consultasResult as any).gradoId || ((s as any).gradeId === consultasResult.grado && (s as any).section === consultasResult.seccion)) && 
                                           (s.dia === day || (s as any).day === day) && 
                                           (s.inicio === slot.start || (s as any).timeSlotId === slot.id);
                                  }
                                });
                                  const course = schedule ? courses.find(c => c.name === schedule.materia || c.id === (schedule as any).courseId) : null;
                                  const gradeLevel = isDocente && schedule ? gradeLevels.find(gl => gl.id === schedule.targetId) : null;
                                  const teacher = !isDocente && course && students ? students.find(s => s.id === course.teacherId) : null;

                                  return (
                                    <td key={day} className="p-1">
                                      {course ? (
                                        <div className="p-4 rounded-xl text-white text-center shadow-md h-full flex flex-col justify-center min-h-[60px]" style={{ backgroundColor: course.color || '#3b82f6' }}>
                                          <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{course.name}</p>
                                          {isDocente && gradeLevel && (
                                            <p className="text-[7px] font-bold opacity-80 mt-1 uppercase">{gradeLevel.nombre} "{gradeLevel.seccion}"</p>
                                          )}
                                          {!isDocente && teacher && (
                                            <p className="text-[7px] font-bold opacity-80 mt-1 uppercase">{teacher.nombre} {teacher.apellido}</p>
                                          )}
                                        </div>
                                    ) : (
                                      <div className="h-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center">
                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                      </div>
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
                  {/* Scroll Indicator for Mobile */}
                  <div className="absolute top-2 right-4 animate-pulse pointer-events-none md:hidden z-10">
                    <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur-sm">
                      <span className="text-[8px] font-black uppercase tracking-widest">Desliza para ver más →</span>
                    </div>
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
                    {relevantCourses.map(course => (
                      <button 
                        key={course.id}
                        onClick={() => setSelectedCourseId(course.id)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedCourseId === course.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                      >{course.name}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relevantCourses
                    .filter(c => !selectedCourseId || c.id === selectedCourseId)
                    .map(course => {
                      const courseGrades = (course as any).isExam 
                        ? studentGrades.filter(g => g.materia === "Examen" && g.examType === course.name)
                        : studentGrades.filter(g => g.materia.startsWith(course.name));
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
                                      <div className="flex flex-col">
                                        <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{g.examType || 'Nota'}</p>
                                        <div className="flex gap-2">
                                          <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">B: {g.buenas || 0}</span>
                                          <span className="text-[7px] font-black text-rose-600 uppercase tracking-widest">M: {g.malas || 0}</span>
                                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Bl: {g.blancas || 0}</span>
                                          <span className="text-[7px] font-black text-blue-500 uppercase tracking-widest ml-1">Pts: {g.rawScore?.toFixed(1) || '-'}</span>
                                        </div>
                                      </div>
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
