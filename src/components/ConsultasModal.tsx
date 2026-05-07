
import React, { useState, useRef, useCallback } from 'react';
import { X, User, Download, Calendar, FileText, ShieldCheck, Award, Info, Printer, Layers, AlertCircle, CalendarCheck } from 'lucide-react';
import { Student, UserConfig, Attendance, Course, Schedule, TimeSlot, ConsultationLog, ConductAction, Grade, ExamType } from '../types';
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
  examTypes: ExamType[];
  schoolDays?: string[];
  gradeLevels?: any[];
  students?: Student[];
  onSaveGrade?: (grade: Partial<Grade>) => void;
}

const ConsultasModal: React.FC<ConsultasModalProps> = ({ 
  consultasResult, globalConfig, activeConsultasTab, setActiveConsultasTab, 
  onClose, attendance, courses, schedules, timeSlots, pub, conductActions, grades,
  examTypes, schoolDays, gradeLevels, students, onSaveGrade
}) => {
  const safePub = { 
    attendance: true, 
    alerts: true, 
    schedule: true, 
    grades: true, 
    exams: true, 
    opticalSheetEnabled: false,
    ...pub 
  };
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedExamForSheet, setSelectedExamForSheet] = useState<ExamType | null>(null);
  const [studentAnswersForSheet, setStudentAnswersForSheet] = useState<Record<number, string>>({});
  const [examResult, setExamResult] = useState<{ buenas: number; malas: number; blancas: number; total: number } | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);

  // Auto-select first available tab if current one is disabled
  React.useEffect(() => {
    const isTabEnabled = (tab: string) => {
      switch (tab) {
        case 'asistencia': return !!safePub.attendance;
        case 'alerta': return !!safePub.alerts;
        case 'horario': return !!safePub.schedule;
        case 'notas': return !!safePub.grades;
        case 'examenes': return safePub.exams !== false; // Default true
        case 'ficha_optica': return !!safePub.opticalSheetEnabled;
        default: return true;
      }
    };

    if (!isTabEnabled(activeConsultasTab)) {
      if (safePub.attendance) setActiveConsultasTab('asistencia');
      else if (safePub.alerts) setActiveConsultasTab('alerta');
      else if (safePub.schedule) setActiveConsultasTab('horario');
      else if (safePub.grades) setActiveConsultasTab('notas');
      else if (safePub.exams !== false) setActiveConsultasTab('examenes');
      else if (safePub.opticalSheetEnabled) setActiveConsultasTab('ficha_optica');
    }
  }, [safePub, activeConsultasTab, setActiveConsultasTab]);

  // Reset selectedGradeId when course changes
  const handleCourseSelect = (courseId: string | null) => {
    setSelectedCourseId(courseId);
    setSelectedGradeId(null);
  };

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
  
  const handleSubmit = useCallback(() => {
    if (!selectedExamForSheet || examResult) return;
    
    const examQuestions = selectedExamForSheet.numQuestions || 0;
    const buenas = examQuestions ? Array.from({ length: examQuestions }).filter((_, i) => studentAnswersForSheet[i+1] === selectedExamForSheet.answerKey?.[i]).length : 0;
    const malas = examQuestions ? Array.from({ length: examQuestions }).filter((_, i) => studentAnswersForSheet[i+1] && studentAnswersForSheet[i+1] !== '-' && studentAnswersForSheet[i+1] !== selectedExamForSheet.answerKey?.[i]).length : 0;
    const blancas = examQuestions - buenas - malas;
    const total = (buenas * (selectedExamForSheet.pointsPerGood || 1)) - (malas * (selectedExamForSheet.pointsPerBad || 0));
    
    const result = { buenas, malas, blancas, total };
    setExamResult(result);
    setJustSubmitted(true);
    setIsTimerActive(false);
    
    if (onSaveGrade) {
      const answersArray = Array.from({ length: selectedExamForSheet.numQuestions || 0 }).map((_, i) => studentAnswersForSheet[i + 1] || '-');
      
      onSaveGrade({
        materia: selectedExamForSheet.name,
        examType: selectedExamForSheet.id,
        nota: total,
        buenas,
        malas,
        blancas,
        maxScore: selectedExamForSheet.maxScore,
        pointsPerGood: selectedExamForSheet.pointsPerGood,
        pointsPerBad: selectedExamForSheet.pointsPerBad,
        numQuestions: selectedExamForSheet.numQuestions,
        isOpticalSheet: true,
        studentId: consultasResult.id,
        studentName: `${consultasResult.nombre} ${consultasResult.apellido}`,
        studentAnswers: answersArray,
        submittedAt: new Date().toISOString(),
      });
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedExamForSheet, examResult, studentAnswersForSheet, onSaveGrade, consultasResult]);

  React.useEffect(() => {
    let interval: any;
    if (isTimerActive && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && isTimerActive) {
      handleSubmit();
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timeLeft, handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
    c.name !== "Examen" && (
      studentSchedules.some(s => s.materia === c.name) || 
      studentGrades.some(g => g.materia !== "Examen" && g.materia.startsWith(c.name))
    )
  );

  // Add virtual courses for each unique examType found in grades with materia "Examen" or isOpticalSheet
  const examTypesInGrades = Array.from(new Set(
    studentGrades
      .filter(g => g.materia === "Examen" || g.isOpticalSheet)
      .map(g => g.examType)
  )).filter(Boolean);

  const examCourses = examTypesInGrades.map(type => ({
    id: `exam-${type}`,
    name: type,
    color: '#6366f1', // Indigo for exams
    isExam: true
  }));

  const relevantCourses = activeConsultasTab === 'examenes' 
    ? examCourses 
    : activeConsultasTab === 'notas' 
      ? baseRelevantCourses 
      : [...baseRelevantCourses, ...examCourses];
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
            <div className="p-6 md:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${consultasResult.primaryColor || globalConfig.theme?.primaryColor || '#1e3a8a'} 0%, ${consultasResult.secondaryColor || globalConfig.theme?.secondaryColor || '#3b82f6'} 100%)` }}>
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
                  {safePub.schedule && safePub.hideTeacherSchedule && (
                    <button 
                      onClick={() => setActiveConsultasTab('horario')}
                      className={`flex-1 md:flex-none px-3 md:px-6 py-2 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeConsultasTab === 'horario' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Horario del Docente</button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 md:flex bg-white/10 p-1 rounded-lg border border-white/10 relative z-10 w-full md:w-auto justify-center shadow-xl gap-1">
                  {safePub.attendance && (
                    <button 
                      onClick={() => setActiveConsultasTab('asistencia')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'asistencia' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Asistencia</button>
                  )}
                  {safePub.alerts && (
                    <button 
                      onClick={() => setActiveConsultasTab('alerta')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'alerta' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Alertas</button>
                  )}
                  {safePub.schedule && (
                    <button 
                      onClick={() => setActiveConsultasTab('horario')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'horario' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Horario</button>
                  )}
                  {safePub.grades && (
                    <button 
                      onClick={() => setActiveConsultasTab('notas')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'notas' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Notas</button>
                  )}
                  {safePub.opticalSheetEnabled && (
                    <button 
                      onClick={() => setActiveConsultasTab('ficha_optica')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'ficha_optica' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Ficha Examen</button>
                  )}
                  {(safePub.exams ?? true) && (
                    <button 
                      onClick={() => setActiveConsultasTab('examenes')}
                      className={`px-2 md:px-6 py-3 md:py-4 rounded-md md:rounded-xl font-black text-[8px] md:text-[10px] uppercase tracking-widest transition-all ${activeConsultasTab === 'examenes' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-white/60 hover:text-white'}`}
                    >Exámenes</button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Modal Content */}
          <div className={`${isFullScreen ? 'p-0 h-full' : 'p-6 md:p-12'}`}>
            {activeConsultasTab === 'asistencia' && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Historial de Asistencia</h3>
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Día / Fecha</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entrada</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salida</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.filter(a => a.studentId === consultasResult.id).length > 0 ? (
                          attendance.filter(a => a.studentId === consultasResult.id)
                            .sort((a, b) => {
                              // Sort by date descending (newest first)
                              const dateA = a.fecha.split('/').reverse().join('-');
                              const dateB = b.fecha.split('/').reverse().join('-');
                              return new Date(dateB).getTime() - new Date(dateA).getTime();
                            })
                            .map(a => {
                              // Calculate day of week
                              const dateParts = a.fecha.split('/'); // Assuming DD/MM/YYYY
                              let dateObj;
                              if (dateParts.length === 3) {
                                dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                              } else {
                                dateObj = new Date(a.fecha);
                              }
                              const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
                              
                              return (
                                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <td className="p-4">
                                    <p className="text-xs font-bold text-slate-700 capitalize">{dayName}</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{a.fecha}</p>
                                  </td>
                                  <td className="p-4 font-bold text-slate-600">{a.horaEntrada || '-'}</td>
                                  <td className="p-4 font-bold text-slate-600">{a.horaSalida || '-'}</td>
                                  <td className="p-4">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                      a.estado === 'entrada' ? 'bg-emerald-100 text-emerald-600' :
                                      a.estado === 'tardanza' ? 'bg-amber-100 text-amber-600' :
                                      a.estado === 'permiso' ? 'bg-blue-100 text-blue-600' :
                                      'bg-rose-100 text-rose-600'
                                    }`}>{a.estado === 'entrada' ? 'Presente' : a.estado}</span>
                                  </td>
                                </tr>
                              );
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                              No hay registros de asistencia
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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

            {(activeConsultasTab === 'notas' || activeConsultasTab === 'examenes') && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{activeConsultasTab === 'examenes' ? 'Exámenes' : 'Registro de Calificaciones'}</h3>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {activeConsultasTab !== 'examenes' && (
                      <button 
                        onClick={() => setSelectedCourseId(null)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!selectedCourseId ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
                      >Todos</button>
                    )}
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
                        ? studentGrades.filter(g => g.examType === course.name && (g.materia === "Examen" || g.isOpticalSheet))
                        : studentGrades.filter(g => g.materia !== "Examen" && !g.materia.startsWith("Examen de") && !g.isOpticalSheet && g.materia.startsWith(course.name));
                      
                      return (
                          <React.Fragment key={course.id}>
                            <button onClick={() => setSelectedCourseId(course.id)} className={`w-full bg-white p-6 rounded-3xl border ${selectedCourseId === course.id ? 'border-indigo-300 shadow-lg' : 'border-slate-100 shadow-sm'} flex justify-between items-center group hover:border-indigo-200 transition-all`}>
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                  <Award size={20} className="text-indigo-600" />
                                </div>
                                <div className="text-left">
                                  <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{course.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{courseGrades.length} registro(s)</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-black uppercase tracking-widest ${selectedCourseId === course.id ? 'text-indigo-600' : 'text-slate-300'}`}>Ver Detalles →</span>
                            </button>
                            {selectedCourseId === course.id && courseGrades.length > 0 && (
                              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-slide-up">
                                {selectedGradeId ? (
                                  <>
                                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                      <button onClick={() => setSelectedGradeId(null)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest underline">« Volver a listas</button>
                                    </div>
                                    {courseGrades.filter(g => g.id === selectedGradeId).map(g => (
                                      <div key={g.id} className="p-6 space-y-5 bg-white last:rounded-b-2xl">
                                        <div className="flex justify-between items-start">
                                          <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                              <FileText size={20} />
                                            </div>
                                            <div className="flex flex-col">
                                              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{g.examType || 'Nota'}</p>
                                              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{g.fecha}</p>
                                            </div>
                                          </div>
                                          <div className="px-5 py-2.5 bg-indigo-50 rounded-2xl text-center">
                                              <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Nota</p>
                                              <span className={`font-black text-2xl ${g.nota >= 11 ? 'text-blue-600' : 'text-rose-600'}`}>{g.nota.toFixed(1)}</span>
                                          </div>
                                        </div>
                                        {(course as any).isExam && g.isOpticalSheet && (
                                          <div className="rounded-[2rem] md:rounded-3xl border border-slate-100 p-4 md:p-8 bg-slate-50 shadow-inner">
                                            {/* Extra Highlighted Total Points */}
                                            <div className="flex flex-col items-center justify-center mb-6 md:mb-8 bg-indigo-600 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                                                <span className="font-black text-[9px] md:text-[10px] uppercase opacity-80 tracking-[0.2em] mb-2 text-center">Puntaje Total Obtenido</span>
                                                <span className="font-black text-5xl sm:text-6xl md:text-7xl drop-shadow-lg">{g.nota.toFixed(1)}</span>
                                            </div>
                                            
                                            {/* Improved Stats Grid - Responsive Layout */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8">
                                                <div className="bg-white border border-emerald-100 p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex sm:flex-col items-center justify-between sm:justify-center shadow-sm">
                                                    <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                                                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                      </div>
                                                      <p className="text-[9px] md:text-[10px] font-black text-emerald-600 uppercase tracking-widest">Buenas</p>
                                                    </div>
                                                    <p className="text-xl md:text-2xl font-black text-slate-800">{g.buenas}</p>
                                                </div>
                                                <div className="bg-white border border-rose-100 p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex sm:flex-col items-center justify-between sm:justify-center shadow-sm">
                                                    <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                                                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                                      </div>
                                                      <p className="text-[9px] md:text-[10px] font-black text-rose-600 uppercase tracking-widest">Malas</p>
                                                    </div>
                                                    <p className="text-xl md:text-2xl font-black text-slate-800">{g.malas}</p>
                                                </div>
                                                <div className="bg-white border border-slate-200 p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex sm:flex-col items-center justify-between sm:justify-center shadow-sm">
                                                    <div className="flex items-center gap-3 sm:flex-col sm:gap-2">
                                                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                                      </div>
                                                      <p className="text-[9px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest">Blancas</p>
                                                    </div>
                                                    <p className="text-xl md:text-2xl font-black text-slate-800">{g.blancas}</p>
                                                </div>
                                            </div>
                                            
                                            {/* Answer Comparison Grid - Optimized for all screens */}
                                            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                                              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-4 tracking-[0.2em] text-center">Desglose de Respuestas</p>
                                              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
                                                {(() => {
                                                  const examDef = examTypes?.find(et => et.name === g.examType);
                                                  if (!examDef || !examDef.numQuestions) return null;
                                                  
                                                  return Array.from({ length: examDef.numQuestions }).map((_, i) => {
                                                    const correct = examDef.answerKey?.[i] || '-';
                                                    const studentAnswer = (g.studentAnswers && (g.studentAnswers[i] || (g.studentAnswers as any)[i+1])) || '-';
                                                    const isCorrect = studentAnswer === correct && correct !== '-';
                                                    return (
                                                      <div key={i} className={`flex flex-col items-center p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all ${
                                                        isCorrect 
                                                          ? 'bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-50' 
                                                          : studentAnswer === '-' 
                                                            ? 'bg-slate-50 border-slate-100' 
                                                            : 'bg-rose-50 border-rose-100 shadow-sm shadow-rose-50'
                                                      }`}>
                                                        <span className={`text-[8px] md:text-[9px] font-black mb-1 md:mb-2 ${!isCorrect && studentAnswer !== '-' ? 'text-rose-600' : 'text-slate-400'}`}>{i+1}</span>
                                                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-black mb-1 ${
                                                          isCorrect 
                                                            ? 'bg-emerald-500 text-white' 
                                                            : studentAnswer === '-' 
                                                              ? 'bg-slate-200 text-slate-500' 
                                                              : 'bg-rose-500 text-white'
                                                        }`}>
                                                          {studentAnswer}
                                                        </div>
                                                        <div className="mt-1 flex flex-col items-center gap-0.5">
                                                          <span className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase tracking-tighter">Clave:</span>
                                                          <span className="text-[9px] md:text-[10px] font-black text-indigo-600">{correct}</span>
                                                        </div>
                                                      </div>
                                                    );
                                                  });
                                                })()}
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="divide-y divide-slate-100">
                                    {courseGrades.map(g => (
                                      <button 
                                        key={g.id} 
                                        onClick={() => setSelectedGradeId(g.id)}
                                        className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-b-0"
                                      >
                                        <div className="flex flex-col">
                                          <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{g.examType || 'Nota'}</p>
                                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">{g.fecha}</p>
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Ver Detalles →</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    
                    {!selectedCourseId && activeConsultasTab === 'notas' && (
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
              )}
              {activeConsultasTab === 'ficha_optica' && (
                <div className="space-y-8 animate-fade-in">
                  {!selectedExamForSheet ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-3xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: globalConfig.theme?.primaryColor || '#7c3aed' }}>
                          <Layers size={24} />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Ficha Examen Digital</h3>
                          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Seleccione un examen para comenzar</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(examTypes || [])
                          .filter(e => safePub.authorizedExams?.includes(e.id) && e.hasOpticalSheet)
                          .map(exam => {
                            const isReady = exam.answerKey && exam.answerKey.some(k => k !== '');
                            const existingGrade = studentGrades.find(g => g.examType === exam.id && g.isOpticalSheet);
                            const isCompleted = !!existingGrade;

                            return (
                              <button
                                key={exam.id}
                                onClick={() => {
                                  if (!isReady) return;
                                  setSelectedExamForSheet(exam);
                                  
                                  if (isCompleted) {
                                    setExamResult({
                                      buenas: existingGrade.buenas || 0,
                                      malas: existingGrade.malas || 0,
                                      blancas: existingGrade.blancas || 0,
                                      total: existingGrade.nota || 0
                                    });
                                    setStudentAnswersForSheet({});
                                    setJustSubmitted(false);
                                    setIsTimerActive(false);
                                    setTimeLeft(null);
                                  } else {
                                    setStudentAnswersForSheet({});
                                    setExamResult(null);
                                    setJustSubmitted(false);
                                    if (exam.hasTimer && exam.timerMinutes) {
                                      setTimeLeft(exam.timerMinutes * 60);
                                      setIsTimerActive(true);
                                    } else {
                                      setTimeLeft(null);
                                      setIsTimerActive(false);
                                    }
                                  }
                                }}
                                disabled={!isReady}
                                className={`bg-white p-6 rounded-[2rem] border-2 transition-all group text-left flex items-center justify-between ${!isReady ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                                style={{ 
                                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                  borderColor: isReady ? '#f1f5f9' : '#f1f5f9'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isReady) return;
                                  e.currentTarget.style.borderColor = globalConfig.theme?.primaryColor || '#7c3aed';
                                  e.currentTarget.style.boxShadow = '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)';
                                }}
                                onMouseLeave={(e) => {
                                  if (!isReady) return;
                                  e.currentTarget.style.borderColor = '#f1f5f9';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <div className="flex items-center gap-5">
                                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 transition-all group-hover:bg-opacity-10" style={{ color: isCompleted ? '#10b981' : (globalConfig.theme?.primaryColor || '#7c3aed') }}>
                                    {isCompleted ? <ShieldCheck size={28} /> : <FileText size={28} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-black text-slate-800 uppercase tracking-tight text-lg transition-all group-hover:text-primary" style={{ color: 'inherit' }}>
                                        {exam.name}
                                      </p>
                                      {isCompleted && (
                                        <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">Completado</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      {exam.numQuestions} Preguntas {!isReady && "(Configurar Clave)"}
                                    </p>
                                  </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 transition-all group-hover:text-white" 
                                  style={{ backgroundColor: isCompleted ? '#10b981' : (isReady ? 'var(--tw-bg-slate-50)' : '#f8fafc'), color: isCompleted ? 'white' : 'inherit' }}
                                  onMouseEnter={(e) => { if (isReady && !isCompleted) e.currentTarget.style.backgroundColor = globalConfig.theme?.primaryColor || '#7c3aed'; }}
                                  onMouseLeave={(e) => { if (isReady && !isCompleted) e.currentTarget.style.backgroundColor = isCompleted ? '#10b981' : '#f8fafc'; }}
                                >
                                  <Award size={20} />
                                </div>
                              </button>
                            );
                          })}
                        
                        {(examTypes || []).filter(e => safePub.authorizedExams?.includes(e.id) && e.hasOpticalSheet).length === 0 && (
                          <div className="col-span-full py-16 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                             <Info className="mx-auto text-slate-300 mb-4" size={48} />
                             <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No hay exámenes autorizados disponibles</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 pb-12">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-xl">
                        <div className="flex items-center gap-5">
                          <button 
                            onClick={() => {
                              if (examResult || confirm('¿Desea salir del examen actual? Los cambios no se guardarán.')) {
                                setSelectedExamForSheet(null);
                                setExamResult(null);
                              }
                            }}
                            className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all"
                          >
                            <X size={20} />
                          </button>
                          <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedExamForSheet.name}</h3>
                            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{selectedExamForSheet.numQuestions} Preguntas</p>
                          </div>
                        </div>

                        {isTimerActive && timeLeft !== null && !examResult && (
                          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all ${timeLeft < 60 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                            <AlertCircle size={20} />
                            <div className="text-center">
                              <p className="text-[8px] font-black uppercase tracking-widest leading-none mb-1">Tiempo Restante</p>
                              <p className="text-xl font-black tabular-nums">{formatTime(timeLeft)}</p>
                            </div>
                          </div>
                        )}

                        {!examResult && (
                          <button
                            onClick={handleSubmit}
                            className="w-full md:w-auto px-10 py-5 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-all shadow-2xl"
                            style={{ backgroundColor: globalConfig.theme?.primaryColor || '#7c3aed', boxShadow: `0 20px 25px -5px ${globalConfig.theme?.primaryColor}44` }}
                          >
                            Finalizar y Calificar
                          </button>
                        )}
                      </div>

                      {examResult && (
                        <div className="flex flex-col items-center gap-6 animate-slide-up">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                            <div className="p-8 rounded-[2.5rem] text-white flex flex-col items-center justify-center shadow-2xl transition-all"
                                 style={{ backgroundColor: globalConfig.theme?.primaryColor || '#7c3aed', boxShadow: `0 20px 25px -5px ${globalConfig.theme?.primaryColor}44` }}>
                               <p className="text-[10px] font-black uppercase opacity-60 mb-2 tracking-widest">Puntaje Total</p>
                               <p className="text-5xl font-black">{examResult.total.toFixed(1)}</p>
                               {!justSubmitted && (
                                 <div className="mt-4 px-4 py-2 bg-white/20 rounded-full flex items-center gap-2">
                                   <ShieldCheck size={14} />
                                   <span className="text-[10px] font-black uppercase tracking-widest">Examen Completado</span>
                                 </div>
                               )}
                            </div>
                            
                            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex flex-col items-center justify-center">
                               <p className="text-[10px] font-black text-emerald-600 uppercase mb-2 tracking-widest">Correctas</p>
                               <p className="text-3xl font-black text-emerald-700">{examResult.buenas}</p>
                            </div>
                            <div className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex flex-col items-center justify-center">
                               <p className="text-[10px] font-black text-rose-600 uppercase mb-2 tracking-widest">Incorrectas</p>
                               <p className="text-3xl font-black text-rose-700">{examResult.malas}</p>
                            </div>
                            <div className="bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] flex flex-col items-center justify-center">
                               <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Blancas</p>
                               <p className="text-3xl font-black text-slate-500">{examResult.blancas}</p>
                            </div>
                          </div>

                          {!justSubmitted && (
                            <div className="bg-white px-8 py-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                              <CalendarCheck size={18} className="text-indigo-600" />
                              <div className="text-left">
                                <p className="text-slate-400 font-bold uppercase text-[8px] tracking-widest leading-none">Entregado el</p>
                                <p className="text-slate-700 font-black text-xs">
                                  {(() => {
                                    const grade = studentGrades.find(g => g.examType === selectedExamForSheet.id && g.isOpticalSheet);
                                    return grade?.submittedAt ? new Date(grade.submittedAt).toLocaleString('es-PE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : 'Fecha no registrada';
                                  })()}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {(!studentGrades.find(g => g.examType === selectedExamForSheet.id && g.isOpticalSheet) || justSubmitted) && (
                        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
                          <div className="absolute inset-0 pointer-events-none opacity-[0.03] flex items-center justify-center">
                             <img src={globalConfig.logo} className="w-1/2" />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {Array.from({ length: 3 }).map((_, colIndex) => {
                              const totalQuestions = selectedExamForSheet.numQuestions || 0;
                              const questionsPerCol = Math.ceil(totalQuestions / 3);
                              const startIndex = colIndex * questionsPerCol;
                              const endIndex = Math.min(startIndex + questionsPerCol, totalQuestions);
                              const columnQuestions = Array.from(
                                { length: endIndex - startIndex },
                                (_, i) => startIndex + i
                              );

                              if (columnQuestions.length === 0) return null;

                              return (
                                <div key={colIndex} className="flex flex-col gap-3">
                                  {columnQuestions.map((i) => {
                                    const questionNum = i + 1;
                                    const currentAnswer = studentAnswersForSheet[questionNum];
                                    const correctAnswer = selectedExamForSheet.answerKey?.[i];
                                    const isCorrect = examResult && currentAnswer === correctAnswer;
                                    const isIncorrect = examResult && currentAnswer && currentAnswer !== '-' && currentAnswer !== correctAnswer;

                                    return (
                                      <div 
                                        key={questionNum} 
                                        className={`flex items-center gap-4 p-3 rounded-2xl transition-all border shadow-sm ${
                                          examResult 
                                            ? (isCorrect ? 'bg-emerald-50 border-emerald-100' : isIncorrect ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100') 
                                            : (questionNum % 2 === 0 ? 'bg-slate-50/80 border-slate-100' : 'bg-white border-slate-100')
                                        }`}
                                      >
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm ${
                                          examResult && isCorrect ? 'bg-emerald-600 text-white' : 
                                          examResult && isIncorrect ? 'bg-rose-600 text-white' : 
                                          'bg-slate-900 text-white'
                                        }`}>
                                          {questionNum}
                                        </span>
                                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                                          {['A', 'B', 'C', 'D', 'E'].map(option => {
                                            const isSelected = currentAnswer === option;
                                            const isRight = examResult && option === correctAnswer;
                                            
                                            return (
                                              <button
                                                key={option}
                                                disabled={!!examResult}
                                                onClick={() => {
                                                  setStudentAnswersForSheet(prev => ({
                                                    ...prev,
                                                    [questionNum]: isSelected ? '-' : option
                                                  }));
                                                }}
                                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all ${
                                                  isSelected 
                                                    ? 'text-white shadow-md scale-105' 
                                                    : isRight 
                                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md'
                                                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                }`}
                                                style={{ 
                                                  backgroundColor: isSelected ? (examResult && !isRight ? '#ef4444' : (globalConfig.theme?.primaryColor || '#7c3aed')) : (isRight ? '#10b981' : 'white'),
                                                  borderColor: isSelected ? (examResult && !isRight ? '#ef4444' : (globalConfig.theme?.primaryColor || '#7c3aed')) : (isRight ? '#10b981' : '#e2e8f0')
                                                }}
                                              >
                                                {option}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Removal of redundant completion message as stats are now always visible */}
                    </div>
                  )}
                </div>
              )}
              {/* Modal Content End */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConsultasModal;
