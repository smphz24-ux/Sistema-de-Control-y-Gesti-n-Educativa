import React, { useState } from 'react';
import { Student, ExamType, Grade, GradeLevel } from '../types';
import { Search, X, User, Save } from 'lucide-react';

interface FichaOpticaProps {
  students: Student[];
  examTypes: ExamType[];
  gradeLevels: GradeLevel[];
  onSaveGrade: (grade: Grade) => void;
  gradeToEdit?: Grade | null;
  onCancelEdit?: () => void;
}

const FichaOptica: React.FC<FichaOpticaProps> = ({ students, examTypes, gradeLevels, onSaveGrade, gradeToEdit, onCancelEdit }) => {
  const [dni, setDni] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    if (gradeToEdit) {
      return students.find(s => s.id === gradeToEdit.studentId) || null;
    }
    return null;
  });
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(() => {
    if (gradeToEdit) {
      // Intentar buscar por ID primero (usado en registros de alumnos) y luego por nombre (usado en registros manuales)
      return examTypes.find(et => et.id === gradeToEdit.examType || et.name === gradeToEdit.examType) || null;
    }
    return null;
  });
  const [answers, setAnswers] = useState<Record<number, string>>(() => {
    if (gradeToEdit && gradeToEdit.studentAnswers) {
      const initialAnswers: Record<number, string> = {};
      gradeToEdit.studentAnswers.forEach((ans, idx) => {
        initialAnswers[idx + 1] = ans;
      });
      return initialAnswers;
    }
    return {};
  });

  const [isManualMode, setIsManualMode] = useState(() => {
    return !!(gradeToEdit && (!gradeToEdit.studentAnswers || gradeToEdit.studentAnswers.length === 0));
  });

  const [manualCounts, setManualCounts] = useState(() => ({
    buenas: gradeToEdit?.buenas || 0,
    malas: gradeToEdit?.malas || 0,
    blancas: gradeToEdit?.blancas || 0
  }));

  const filteredStudents = students.filter(s => s.rol !== 'Docente' && s.nivel !== 'Docente' && (s.dni.includes(dni) || `${s.nombre} ${s.apellido}`.toLowerCase().includes(dni.toLowerCase())));

  const handleMarkAnswer = (qIdx: number, answer: string) => {
    setAnswers(prev => ({ 
      ...prev, 
      [qIdx]: prev[qIdx] === answer ? '' : answer 
    }));
  };

  const handleSave = () => {
    if (!selectedStudent || !selectedExam) return;
    
    let buenas = 0;
    let malas = 0;
    let blancas = 0;
    
    if (isManualMode) {
      buenas = manualCounts.buenas;
      malas = manualCounts.malas;
      blancas = manualCounts.blancas;
    } else {
      if (!selectedExam.answerKey) return;
      for(let i = 1; i <= selectedExam.numQuestions; i++) {
          if (!answers[i]) blancas++;
          else if (answers[i] === (selectedExam.answerKey?.[i-1] || '')) buenas++;
          else malas++;
      }
    }

    const rawScore = (buenas * selectedExam.pointsPerGood) + (malas * selectedExam.pointsPerBad) + (blancas * selectedExam.pointsPerBlank);
    const nota = selectedExam.divisor && selectedExam.divisor > 0 ? rawScore / selectedExam.divisor : rawScore;

    const grade: Grade = {
      id: gradeToEdit?.id || Math.random().toString(36).substr(2, 9),
      ownerId: selectedStudent.ownerId,
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.nombre} ${selectedStudent.apellido}`,
      materia: gradeToEdit?.materia || ('Examen de ' + selectedExam.name),
      examType: selectedExam.name,
      nota: nota,
      fecha: gradeToEdit?.fecha || new Date().toISOString().split('T')[0],
      buenas,
      malas,
      blancas,
      numQuestions: selectedExam.numQuestions,
      pointsPerGood: selectedExam.pointsPerGood,
      pointsPerBad: selectedExam.pointsPerBad,
      pointsPerBlank: selectedExam.pointsPerBlank,
      divisor: selectedExam.divisor || 1,
      rawScore: rawScore,
      studentAnswers: isManualMode ? [] : Array.from({ length: selectedExam.numQuestions }).map((_, i) => answers[i + 1] || ''),
      isOpticalSheet: true,
      isFromPublicConsultas: gradeToEdit?.isFromPublicConsultas || false
    };
    onSaveGrade(grade);
    // Reset
    if (!gradeToEdit) {
      setSelectedStudent(null);
      setAnswers({});
      setIsManualMode(false);
      setManualCounts({ buenas: 0, malas: 0, blancas: 0 });
    }
  };

  return (
    <div className="bg-white rounded-3xl md:rounded-[2.5rem] p-5 sm:p-10 shadow-2xl border-t-8 border-t-indigo-600 w-full max-w-4xl mx-auto overflow-visible">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">
            {gradeToEdit ? 'Corregir Ficha' : 'Ficha Examen'}
          </h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">
            {gradeToEdit ? 'Revisión y ajustes de alternativas' : 'Registro de resultados manuales'}
          </p>
        </div>
        {gradeToEdit && (
          <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Modo Edición</p>
          </div>
        )}
      </div>
      
      {!gradeToEdit && (
        <div className="space-y-4 mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text" 
                value={dni} 
                onChange={(e) => setDni(e.target.value)}
                placeholder="Buscar alumno por DNI o Nombre..." 
                className="w-full pl-12 pr-4 py-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-slate-800 transition-all focus:border-indigo-500 focus:bg-white outline-none" 
              />
            </div>
            {dni.length >= 3 && filteredStudents.length > 0 && (
              <div className="bg-white border-2 border-slate-100 rounded-2xl shadow-xl overflow-hidden animate-fade-in divide-y divide-slate-50">
                {filteredStudents.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStudent(s); setDni(""); }} className="w-full p-4 hover:bg-slate-50 flex items-center gap-4 transition-colors">
                      {s.foto ? (
                        <img src={s.foto} alt={s.nombre} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={20} />
                        </div>
                      )}
                      <div className="text-left">
                        <p className="font-black text-slate-800 uppercase text-xs">{s.nombre} {s.apellido}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DNI: {s.dni} • {s.grado} {s.seccion}</p>
                      </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      {selectedStudent && (
        <div className="space-y-8 animate-fade-in">
          <div className="bg-slate-50 p-6 sm:p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col md:flex-row items-center gap-6 sm:gap-8 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16" />
            
            {selectedStudent.foto ? (
              <img src={selectedStudent.foto} alt={selectedStudent.nombre} className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] object-cover shadow-2xl border-4 border-white relative z-10" />
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-white shadow-xl flex items-center justify-center text-slate-300 relative z-10 border-4 border-white">
                <User size={48} />
              </div>
            )}
            
            <div className="flex-grow space-y-2 text-center md:text-left relative z-10">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 uppercase tracking-tight">{selectedStudent.nombre} {selectedStudent.apellido}</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-1">
                <span className="px-4 py-1.5 bg-white rounded-xl text-[10px] sm:text-xs font-black text-slate-500 border border-slate-200 uppercase tracking-widest shadow-sm">DNI: {selectedStudent.dni}</span>
                <span className="px-4 py-1.5 bg-indigo-600 rounded-xl text-[10px] sm:text-xs font-black text-white uppercase tracking-widest shadow-lg shadow-indigo-200">{selectedStudent.nivel}</span>
                <span className="px-4 py-1.5 bg-white rounded-xl text-[10px] sm:text-xs font-black text-slate-500 border border-slate-200 uppercase tracking-widest shadow-sm">{selectedStudent.grado} "{selectedStudent.seccion}"</span>
              </div>
            </div>

            {/* Stats Box Enhanced */}
            {selectedExam && (
              <div className="bg-white p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 border-2 border-indigo-100 w-full md:w-56 shadow-xl shadow-indigo-500/5 relative group transition-all hover:scale-105">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Puntaje Total</p>
                  <p className="text-4xl sm:text-5xl font-black text-indigo-600 tabular-nums">
                    {(() => {
                      if (isManualMode) {
                        const raw = (manualCounts.buenas * selectedExam.pointsPerGood) + 
                                    (manualCounts.malas * selectedExam.pointsPerBad) + 
                                    (manualCounts.blancas * selectedExam.pointsPerBlank);
                        return (selectedExam.divisor && selectedExam.divisor > 0 ? raw / selectedExam.divisor : raw).toFixed(1);
                      }
                      const b = Object.entries(answers).filter(([q, a]) => a && a === selectedExam.answerKey?.[parseInt(q) - 1]).length;
                      const m = Object.entries(answers).filter(([q, a]) => a && a !== selectedExam.answerKey?.[parseInt(q) - 1]).length;
                      const bl = selectedExam.numQuestions - Object.entries(answers).filter(([q, a]) => a).length;
                      return ((b * selectedExam.pointsPerGood) + (m * selectedExam.pointsPerBad) + (bl * selectedExam.pointsPerBlank)).toFixed(1);
                    })()}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Buenas</span>
                    <span className="text-sm font-black text-emerald-600">
                      {isManualMode ? manualCounts.buenas : Object.entries(answers).filter(([q, a]) => a && a === selectedExam.answerKey?.[parseInt(q) - 1]).length}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Malas</span>
                    <span className="text-sm font-black text-rose-600">
                      {isManualMode ? manualCounts.malas : Object.entries(answers).filter(([q, a]) => a && a !== selectedExam.answerKey?.[parseInt(q) - 1]).length}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Blancas</span>
                    <span className="text-sm font-black text-slate-500">
                      {isManualMode ? manualCounts.blancas : selectedExam.numQuestions - Object.entries(answers).filter(([q, a]) => a).length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!gradeToEdit && (
            <div className="flex justify-center mb-4">
              <div className="bg-slate-100 p-1 rounded-2xl flex">
                <button
                  onClick={() => setIsManualMode(false)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isManualMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Ficha Óptica
                </button>
                <button
                  onClick={() => setIsManualMode(true)}
                  className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isManualMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                >
                  Conteo Manual
                </button>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Selección de Examen</label>
              <select 
                value={selectedExam?.id || ''}
                disabled={!!gradeToEdit} // En edición no se puede cambiar el tipo de examen de la ficha
                onChange={(e) => {setSelectedExam(examTypes.find(t => t.id === e.target.value) || null); setAnswers({});}} 
                className={`w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold text-slate-800 transition-all focus:border-indigo-500 focus:bg-white outline-none cursor-pointer ${gradeToEdit ? 'opacity-70 bg-slate-100' : ''}`}
              >
                <option value="">Seleccione tipo de examen...</option>
                {examTypes.filter(et => et.hasOpticalSheet).filter(et => {
                  if (!et.classrooms || et.classrooms.length === 0) return true;
                  if (!selectedStudent) return true;
                  const studentGradeLevelId = gradeLevels.find(gl => gl.nombre === selectedStudent.grado && gl.seccion === selectedStudent.seccion)?.id;
                  return studentGradeLevelId && et.classrooms.includes(studentGradeLevelId);
                }).map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
              </select>
          </div>

          {selectedExam && isManualMode && (
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 animate-fade-in">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 text-center">Ingreso Manual de Resultados</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Buenas', key: 'buenas', color: 'emerald' },
                  { label: 'Malas', key: 'malas', color: 'rose' },
                  { label: 'Blancas', key: 'blancas', color: 'slate' }
                ].map((field) => (
                  <div key={field.label} className="bg-white p-6 rounded-[2rem] border-2 border-slate-50 shadow-sm transition-all hover:border-slate-200">
                    <label className={`text-[11px] font-black text-${field.color}-500 uppercase tracking-widest block mb-3 text-center`}>
                      {field.label}
                    </label>
                    <input
                      type="number"
                      value={manualCounts[field.key as keyof typeof manualCounts]}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setManualCounts(prev => ({ ...prev, [field.key]: val }));
                      }}
                      className={`w-full p-4 rounded-2xl bg-${field.color}-50 border-none font-black text-${field.color}-700 text-center text-2xl outline-none focus:ring-4 focus:ring-${field.color}-500 transition-all`}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 bg-indigo-600 rounded-3xl text-white flex items-center justify-between shadow-xl">
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-2">Nota Final</p>
                    <p className="text-4xl font-black">
                      {(() => {
                        const raw = (manualCounts.buenas * selectedExam.pointsPerGood) + 
                                    (manualCounts.malas * selectedExam.pointsPerBad) + 
                                    (manualCounts.blancas * selectedExam.pointsPerBlank);
                        return (selectedExam.divisor && selectedExam.divisor > 0 ? raw / selectedExam.divisor : raw).toFixed(1);
                      })()}
                    </p>
                 </div>
                 <div className="h-10 w-px bg-white/20"></div>
                 <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-2">Máx Preguntas</p>
                    <p className="text-2xl font-black">{selectedExam.numQuestions}</p>
                 </div>
              </div>
            </div>
          )}

          {selectedExam && !isManualMode && (
            <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border-2 border-slate-50">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, colIndex) => {
                  const questionsPerCol = Math.ceil(selectedExam.numQuestions / 4);
                  const startIndex = colIndex * questionsPerCol;
                  const endIndex = Math.min(startIndex + questionsPerCol, selectedExam.numQuestions);
                  const columnQuestions = Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i);
                  
                  if (columnQuestions.length === 0) return null;

                  return (
                    <div key={colIndex} className="flex flex-col gap-3">
                      {columnQuestions.map((qIdx) => {
                        const correctAns = selectedExam.answerKey?.[qIdx];
                        const studentAns = answers[qIdx + 1];
                        const isCorrect = studentAns === correctAns;
                        const isIncorrect = studentAns && !isCorrect;

                        return (
                          <div key={qIdx} className={`flex flex-col gap-2 p-3 rounded-2xl border-2 transition-all ${gradeToEdit ? (isCorrect ? 'bg-emerald-50 border-emerald-100 shadow-sm' : isIncorrect ? 'bg-rose-50 border-rose-100 shadow-sm' : 'bg-white border-slate-100 shadow-sm') : 'bg-white border-slate-100 shadow-sm'}`}>
                            <div className="flex justify-between items-center px-1">
                              <span className="font-black text-[10px] text-slate-400 uppercase tracking-widest">Pregunta {qIdx + 1}</span>
                              {gradeToEdit && studentAns && (
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                                  {isCorrect ? 'Correcta' : 'Incorrecta'}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 justify-between px-1">
                              {['A', 'B', 'C', 'D', 'E'].map(opt => {
                                const isThisCorrect = opt === correctAns;
                                const isThisStudentChoice = opt === studentAns;

                                return (
                                  <button 
                                    key={opt}
                                    onClick={() => handleMarkAnswer(qIdx + 1, opt)}
                                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-xs transition-all relative
                                      ${isThisStudentChoice 
                                        ? 'bg-slate-800 text-white border-slate-800 scale-110 shadow-lg shadow-slate-200' 
                                        : (gradeToEdit && isThisCorrect ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-300 hover:border-slate-400 text-slate-400 hover:text-slate-600')
                                      }
                                    `}
                                  >
                                    {opt}
                                    {gradeToEdit && isThisCorrect && !isThisStudentChoice && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
                                    )}
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
          
          {selectedExam && (
            <div className="flex gap-4 pt-4">
              {gradeToEdit && onCancelEdit && (
                <button onClick={onCancelEdit} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-sm">
                  Cancelar
                </button>
              )}
              <button 
                onClick={handleSave} 
                className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-200 flex items-center justify-center gap-3"
              >
                  <Save size={18} /> {gradeToEdit ? 'Actualizar Nota / Corregir' : 'Registrar Nota Final'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FichaOptica;
