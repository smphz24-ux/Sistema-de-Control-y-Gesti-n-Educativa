
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { 
  Users, 
  User,
  GraduationCap, 
  CalendarCheck, 
  BarChart3, 
  LogOut, 
  LayoutDashboard, 
  Search, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Award,
  Sparkles,
  Camera,
  Download,
  Printer,
  ChevronRight,
  Edit,
  Upload,
  UserCheck,
  IdCard,
  AlertCircle,
  X,
  Calendar,
  Image as ImageIcon,
  Clock,
  LogOut as LogOutIcon,
  RefreshCw,
  FileText,
  Scan,
  Filter,
  Save,
  Maximize,
  Keyboard,
  Database,
  Phone,
  Mail,
  Settings,
  Shield,
  Palette,
  Type,
  Globe,
  Lock,
  Menu
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

// Declaration for jsQR which is loaded via CDN in index.html
declare var jsQR: any;
declare var jspdf: any;

const PREDEFINED_THEMES = [
  { name: 'Océano Profundo', primary: '#1e3a8a', secondary: '#3b82f6' },
  { name: 'Esmeralda Vital', primary: '#064e3b', secondary: '#10b981' },
  { name: 'Atardecer Cálido', primary: '#7c2d12', secondary: '#f97316' },
  { name: 'Amatista Real', primary: '#4c1d95', secondary: '#8b5cf6' },
  { name: 'Medianoche', primary: '#0f172a', secondary: '#64748b' },
  { name: 'Bosque', primary: '#14532d', secondary: '#22c55e' },
  { name: 'Carmesí', primary: '#7f1d1d', secondary: '#ef4444' },
  { name: 'Oro', primary: '#713f12', secondary: '#eab308' },
];

// --- Types ---
interface UserConfig {
  siteName: string;
  slogan?: string;
  logo?: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
  };
  publicModules?: {
    attendance: boolean;
    alerts: boolean;
    schedule: boolean;
  };
  footerText?: string;
}

interface AppUser {
  id: string;
  username: string;
  password: string;
  fullName?: string;
  whatsapp?: string;
  email?: string;
  role: 'admin' | 'staff';
  permissions: string[];
  config?: UserConfig;
}

interface Student {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  nivel: 'Inicial' | 'Primaria' | 'Secundaria' | 'Docente';
  grado: string;
  seccion: string;
  turno?: 'Mañana' | 'Tarde' | 'Noche' | string;
  rol: 'Estudiante' | 'Docente';
  celularApoderado?: string;
  email?: string;
  foto?: string; // base64 image
  siteName?: string;
  slogan?: string;
  logo?: string; // base64 logo override
  primaryColor?: string;
  secondaryColor?: string;
}

interface ConsultationLog {
  id: string;
  studentDni: string;
  nivel: string;
  grado: string;
  seccion: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

type AttendanceStatus = 'entrada' | 'tardanza' | 'ausente' | 'salida' | 'permiso';

interface Attendance {
  id: string;
  studentDni: string;
  studentId: string;
  studentName: string;
  studentRol: 'Estudiante' | 'Docente';
  estado: AttendanceStatus;
  fecha: string;
  hora: string; // Keep for compatibility, will represent last update
  horaEntrada?: string;
  horaSalida?: string;
}

interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  materia: string;
  nota: number;
  fecha: string;
}

interface Level {
  id: string;
  nombre: string;
}

interface GradeLevel {
  id: string;
  nombre: string;
  nivelId: string;
  seccion: string;
}

interface Shift {
  id: string;
  nombre: string;
  entradaMañana: string;
  salidaMañana: string;
  entradaTarde: string;
  salidaTarde: string;
}

interface Schedule {
  id: string;
  targetId: string; // GradeLevel ID or Teacher ID
  type: 'clase' | 'laboral';
  dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  inicio: string;
  fin: string;
  materia?: string;
}

type IncidenceSeverity = 'leve' | 'moderado' | 'grave';
type IncidenceStatus = 'registrada' | 'en evaluación' | 'en seguimiento' | 'resuelta' | 'escalada a un caso mayor';

interface Incidence {
  id: string;
  studentId: string;
  studentName: string;
  studentDni: string;
  studentGrade: string;
  type: string;
  description: string;
  severity: IncidenceSeverity;
  status: IncidenceStatus;
  date: string;
  registeredBy: string;
}

interface IncidenceType {
  id: string;
  name: string;
}

interface AppNotification {
  id: string;
  userId: string;
  username: string;
  message: string;
  date: string;
  type: 'report' | 'system';
}

const App = () => {
  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [globalConfig, setGlobalConfig] = useState<UserConfig>(() => {
    const saved = localStorage.getItem('stnj_config_v10');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing globalConfig", e);
      }
    }
    return {
      siteName: 'Sistema de Control y Gestión',
      slogan: 'Educación con Valores y Tecnología',
      logo: 'https://picsum.photos/seed/stnj/200',
      theme: {
        primaryColor: '#1e3a8a',
        secondaryColor: '#3b82f6',
        fontFamily: 'Poppins'
      },
      publicModules: {
        attendance: true,
        alerts: true,
        schedule: true
      },
      footerText: 'Control y Gestión 2026 © 2024'
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'estudiantes' | 'asistencia' | 'calificaciones' | 'reportes' | 'alerta' | 'mi-panel' | 'config'>('dashboard');
  const [activeConfigSubTab, setActiveConfigSubTab] = useState<'usuarios' | 'sistema'>('usuarios');
  const [activeReportSubTab, setActiveReportSubTab] = useState<'global' | 'personalizado'>('global');
  const [activeAlertaSubTab, setActiveAlertaSubTab] = useState<'registro' | 'historial'>('registro');
  const [activePanelSubTab, setActivePanelSubTab] = useState<'perfil' | 'grados' | 'horarios' | 'alerta' | 'profesores'>('perfil');
  const [activeGradosSubTab, setActiveGradosSubTab] = useState<'niveles' | 'grados'>('niveles');
  const [activeHorariosSubTab, setActiveHorariosSubTab] = useState<'clases' | 'turnos' | 'config' | 'creador' | 'materias'>('clases');
  const [panelModalType, setPanelModalType] = useState<'level' | 'grade' | 'shift' | 'schedule' | 'profile' | 'report' | 'siteConfig' | null>(null);
  
  // New States for Grades and Schedules
  const [courses, setCourses] = useState<{id: string, name: string, color: string, teacherId?: string, grades?: string[]}[]>([]);
  const [gradeTypes, setGradeTypes] = useState<{id: string, name: string}[]>([
    {id: '1', name: 'Tarea'},
    {id: '2', name: 'Examen'},
    {id: '3', name: 'Medición'},
    {id: '4', name: 'Participación'}
  ]);
  const [timeSlots, setTimeSlots] = useState<{id: string, start: string, end: string}[]>(
    Array.from({ length: 10 }).map((_, i) => ({
      id: i.toString(),
      start: `${(7 + i).toString().padStart(2, '0')}:00`,
      end: `${(8 + i).toString().padStart(2, '0')}:00`
    }))
  );
  const [calificacionesSearch, setCalificacionesSearch] = useState("");
  const [calificacionesGradeFilter, setCalificacionesGradeFilter] = useState("");
  const [calificacionesLevelFilter, setCalificacionesLevelFilter] = useState("");
  const [calificacionesSectionFilter, setCalificacionesSectionFilter] = useState("");
  const [selectedGradeType, setSelectedGradeType] = useState("");
  const [editingCourse, setEditingCourse] = useState<{id: string, name: string, color: string, teacherId?: string} | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<{id: string, start: string, end: string} | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [draggedCourse, setDraggedCourse] = useState<any>(null);
  const [configTargetUser, setConfigTargetUser] = useState<AppUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [levels, setLevels] = useState<Level[]>([
    { id: '1', nombre: 'Inicial' },
    { id: '2', nombre: 'Primaria' },
    { id: '3', nombre: 'Secundaria' }
  ]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [incidenceTypes, setIncidencesTypes] = useState<IncidenceType[]>([
    { id: '1', name: 'Acumulación de tardanzas' },
    { id: '2', name: 'Incumplimiento de tareas' },
    { id: '3', name: 'Faltas repetidas' },
    { id: '4', name: 'Celular en clases' },
    { id: '5', name: 'Conducta inapropiada en la institución' }
  ]);
  const [editingIncidence, setEditingIncidence] = useState<Incidence | null>(null);
  const [editingIncidenceType, setEditingIncidenceType] = useState<IncidenceType | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const activeConfig = useMemo(() => {
    const config = currentUser?.config || globalConfig;
    return {
      ...globalConfig,
      ...config,
      theme: {
        ...globalConfig.theme,
        ...(config.theme || {})
      }
    };
  }, [currentUser, globalConfig]);

  // Search & Filters (Global/Students)
  const [searchTerm, setSearchTerm] = useState("");

  // Report Filters
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [reportClassFilter, setReportClassFilter] = useState("");
  const [reportDateFilter, setReportDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [reportRoleFilter, setReportRoleFilter] = useState<string>("todos");

  // Personal Report State
  const [personalSearchTerm, setPersonalSearchTerm] = useState("");
  const [selectedPersonalStudent, setSelectedPersonalStudent] = useState<Student | null>(null);

  // Attendance Filters
  const [attSearch, setAttSearch] = useState("");
  const [attStatusFilter, setAttStatusFilter] = useState<AttendanceStatus | 'todos'>('todos');
  const [attRoleFilter, setAttRoleFilter] = useState<'Estudiante' | 'Docente' | 'todos'>('todos');
  
  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isFotocheckOpen, setIsFotocheckOpen] = useState(false);
  const [selectedStudentForId, setSelectedStudentForId] = useState<Student | null>(null);
  const [selectedQuickStatus, setSelectedQuickStatus] = useState<AttendanceStatus>('entrada');
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [currentQRCode, setCurrentQRCode] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // Terminal Modals
  const [isDniModalOpen, setIsDniModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [personalizingUser, setPersonalizingUser] = useState<AppUser | null>(null);
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] = useState(false);
  const [isGlobalThemeModalOpen, setIsGlobalThemeModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminLoginPassword, setAdminLoginPassword] = useState("");
  const [consultasSearchDni, setConsultasSearchDni] = useState("");
  const [consultasResult, setConsultasResult] = useState<Student | null>(null);
  const [consultationLogs, setConsultationLogs] = useState<ConsultationLog[]>([]);
  const [activeConsultasTab, setActiveConsultasTab] = useState<'asistencia' | 'alerta' | 'horario'>('asistencia');
  const [isConsultasModalOpen, setIsConsultasModalOpen] = useState(false);
  const [isDniInputModalOpen, setIsDniInputModalOpen] = useState(false);

  // QR Scanner State
  const [lastDetectedPerson, setLastDetectedPerson] = useState<Student | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);

  // Audio/Haptic Feedback
  const playChime = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
      
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    } catch (e) {
      console.error("Error playing chime:", e);
    }
  }, []);

  // Hidden refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const markingInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Persistence ---
  // Load shared data (users, config) on mount
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const sharedData = {
      users: JSON.parse(localStorage.getItem('stnj_users_v10') || '[]'),
      globalConfig: JSON.parse(localStorage.getItem('stnj_config_v10') || 'null'),
      notifications: JSON.parse(localStorage.getItem('stnj_notifications_v10') || '[]'),
      incidenceTypes: JSON.parse(localStorage.getItem('stnj_incidence_types_v10') || 'null'),
    };
    
    if (sharedData.users.length === 0) {
      const defaultAdmin: AppUser = {
        id: 'admin-1',
        username: 'admin',
        password: '1234',
        role: 'admin',
        permissions: ['dashboard', 'estudiantes', 'asistencia', 'reportes', 'alerta', 'calificaciones', 'mi-panel', 'config', 'horarios']
      };
      setUsers([defaultAdmin]);
    } else {
      // Migration: Ensure admins have 'reportes' and 'mi-panel' permission if they have others
      const migratedUsers = sharedData.users.map((u: AppUser) => {
        if (u.role === 'admin') {
          const newPermissions = [...u.permissions];
          if (!newPermissions.includes('reportes')) newPermissions.push('reportes');
          if (!newPermissions.includes('mi-panel')) newPermissions.push('mi-panel');
          if (!newPermissions.includes('horarios')) newPermissions.push('horarios');
          if (!newPermissions.includes('alerta')) newPermissions.push('alerta');
          return { ...u, permissions: Array.from(new Set(newPermissions)) };
        }
        return u;
      });
      setUsers(migratedUsers);
    }

    if (sharedData.globalConfig) {
      setGlobalConfig(sharedData.globalConfig);
    }
    if (sharedData.notifications) {
      setNotifications(sharedData.notifications);
    }
    if (sharedData.incidenceTypes) {
      setIncidencesTypes(sharedData.incidenceTypes);
    }

    const savedLogs = localStorage.getItem('stnj_consultation_logs');
    if (savedLogs) setConsultationLogs(JSON.parse(savedLogs));
  }, []);

  useEffect(() => {
    localStorage.setItem('stnj_consultation_logs', JSON.stringify(consultationLogs));
  }, [consultationLogs]);

  // Load user-specific data when currentUser changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const userData = JSON.parse(localStorage.getItem(`stnj_userdata_${currentUser.id}`) || 'null');
      if (userData) {
        setStudents(userData.students || []);
        setAttendance(userData.attendance || []);
        setGrades(userData.grades || []);
        setIncidences(userData.incidences || []);
      } else {
        // New user or no data yet
        setStudents([]);
        setAttendance([]);
        setGrades([]);
        setIncidences([]);
      }
    } else {
      // Public view (Landing Page)
      // Aggregate data from all admins to allow public searches across institutions
      const admins = users.filter(u => u.role === 'admin');
      let allStudents: Student[] = [];
      let allAttendance: Attendance[] = [];
      let allIncidences: Incidence[] = [];
      let allGrades: Grade[] = [];

      admins.forEach(admin => {
        const userData = JSON.parse(localStorage.getItem(`stnj_userdata_${admin.id}`) || 'null');
        const adminConfig = admin.config || globalConfig;
        
        if (userData) {
          if (userData.students) {
            const taggedStudents = userData.students.map((s: Student) => ({
              ...s,
              siteName: adminConfig.siteName,
              logo: adminConfig.logo,
              slogan: adminConfig.slogan,
              primaryColor: adminConfig.theme.primaryColor,
              secondaryColor: adminConfig.theme.secondaryColor
            }));
            allStudents = [...allStudents, ...taggedStudents];
          }
          if (userData.attendance) allAttendance = [...allAttendance, ...userData.attendance];
          if (userData.incidences) allIncidences = [...allIncidences, ...userData.incidences];
          if (userData.grades) allGrades = [...allGrades, ...userData.grades];
        }
      });

      setStudents(allStudents);
      setAttendance(allAttendance);
      setIncidences(allIncidences);
      setGrades(allGrades);
    }
  }, [isAuthenticated, currentUser, users]);

  // Save shared data
  useEffect(() => {
    localStorage.setItem('stnj_users_v10', JSON.stringify(users));
    localStorage.setItem('stnj_config_v10', JSON.stringify(globalConfig));
    localStorage.setItem('stnj_notifications_v10', JSON.stringify(notifications));
    localStorage.setItem('stnj_incidence_types_v10', JSON.stringify(incidenceTypes));
  }, [users, globalConfig, notifications, incidenceTypes]);

  // Save user-specific data
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const dataToSave = { students, attendance, grades, incidences };
      localStorage.setItem(`stnj_userdata_${currentUser.id}`, JSON.stringify(dataToSave));
    }
  }, [students, attendance, grades, incidences, isAuthenticated, currentUser]);

  // --- Dynamic Theme Application ---
  useEffect(() => {
    document.title = activeConfig.siteName;
  }, [activeConfig.siteName]);

  useEffect(() => {
    const config = currentUser?.config || globalConfig;
    document.documentElement.style.setProperty('--primary-color', config.theme.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', config.theme.secondaryColor);
    document.documentElement.style.setProperty('--font-family', config.theme.fontFamily);
  }, [currentUser, globalConfig]);

  // --- Gemini AI Logic ---
  const generateAiReport = async () => {
    setIsAiLoading(true);
    try {
      // Corrected: Initializing GoogleGenAI according to guidelines using process.env.GEMINI_API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analiza los siguientes datos escolares y genera un resumen ejecutivo breve (máximo 150 palabras) sobre el estado actual del colegio.
      Estudiantes: ${students.filter(s => s.rol === 'Estudiante').length}
      Docentes: ${students.filter(s => s.rol === 'Docente').length}
      Asistencias hoy: ${attendance.filter(a => a.fecha === new Date().toLocaleDateString()).length}
      Promedio General: ${(grades.reduce((acc, curr) => acc + curr.nota, 0) / (grades.length || 1)).toFixed(2)}
      
      Brinda 3 consejos estratégicos para mejorar el rendimiento escolar.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      // Corrected: Accessing response.text directly as a property
      setAiReport(response.text || "No se pudo generar el reporte.");
    } catch (error) {
      console.error(error);
      setAiReport("Error al conectar con la sabiduría del Sensei.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Actions ---
  const markAttendance = useCallback((dni: string, status: AttendanceStatus) => {
    if (!dni) return;
    const person = students.find(s => s.dni === dni);
    if (!person) {
      setToast({ message: `Identificación no encontrada en el sistema ${activeConfig.siteName}.`, type: 'error' });
      return;
    }

    const today = new Date().toLocaleDateString();
    const now = new Date().toLocaleTimeString();
    
    // Check if there's already a record for this person today
    const existingIndex = attendance.findIndex(a => 
      a.studentDni === dni && 
      a.fecha === today
    );

    if (existingIndex !== -1) {
      const existing = attendance[existingIndex];
      
      if (status === 'entrada' || status === 'tardanza') {
        if (existing.horaEntrada) {
          setToast({ message: `Ya se registró el ingreso para ${person.nombre} hoy a las ${existing.horaEntrada}`, type: 'error' });
          if (markingInputRef.current) markingInputRef.current.value = '';
          setIsDniModalOpen(false);
          return;
        }
        // Update entry in existing record
        const newAttendance = [...attendance];
        newAttendance[existingIndex] = { ...existing, estado: status, horaEntrada: now, hora: now };
        setAttendance(newAttendance);
        setToast({ message: `Ingreso registrado: ${person.nombre}`, type: 'success' });
      } 
      else if (status === 'salida') {
        if (existing.horaSalida) {
          setToast({ message: `Ya se registró la salida para ${person.nombre} hoy a las ${existing.horaSalida}`, type: 'error' });
          if (markingInputRef.current) markingInputRef.current.value = '';
          setIsDniModalOpen(false);
          return;
        }
        if (!existing.horaEntrada) {
          setToast({ message: `Debe registrar un ingreso antes de marcar la salida`, type: 'error' });
          if (markingInputRef.current) markingInputRef.current.value = '';
          setIsDniModalOpen(false);
          return;
        }
        const newAttendance = [...attendance];
        newAttendance[existingIndex] = { ...existing, estado: status, horaSalida: now, hora: now };
        setAttendance(newAttendance);
        setToast({ message: `Salida registrada: ${person.nombre}`, type: 'success' });
      }
      else {
        // Permiso or other
        const newAttendance = [...attendance];
        newAttendance[existingIndex] = { ...existing, estado: status, hora: now };
        setAttendance(newAttendance);
        setToast({ message: `${status.toUpperCase()} registrada: ${person.nombre}`, type: 'success' });
      }
    } else {
      // No record today
      if (status === 'salida') {
        setToast({ message: `Debe registrar un ingreso antes de marcar la salida`, type: 'error' });
        if (markingInputRef.current) markingInputRef.current.value = '';
        setIsDniModalOpen(false);
        return;
      }

      const newEntry: Attendance = {
        id: Date.now().toString(),
        studentDni: person.dni,
        studentId: person.id,
        studentName: `${person.nombre} ${person.apellido}`,
        studentRol: person.rol,
        estado: status,
        fecha: today,
        hora: now,
        horaEntrada: (status === 'entrada' || status === 'tardanza') ? now : undefined,
        horaSalida: undefined, // status === 'salida' is handled above and returns
      };
      setAttendance([newEntry, ...attendance]);
      setToast({ message: `${status.toUpperCase()} registrada: ${person.nombre}`, type: 'success' });
    }

    if (markingInputRef.current) markingInputRef.current.value = '';
    if (isDniModalOpen) setIsDniModalOpen(false);
  }, [students, attendance, isDniModalOpen]);

  // --- QR Scanner Logic ---
  const stopScanner = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScannerModalOpen(false);
  }, []);

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStudentModalOpen(false);
        setIsFotocheckOpen(false);
        setIsUserModalOpen(false);
        setIsDniModalOpen(false);
        setPanelModalType(null);
        if (isScannerModalOpen) {
          stopScanner();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScannerModalOpen, stopScanner]);

  const scanFrame = useCallback(() => {
    if (!isScannerModalOpen || !videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        if (code && !scanCooldown) {
          const dni = code.data.trim();
          const person = students.find(s => s.dni === dni);
          if (person) {
            markAttendance(dni, selectedQuickStatus);
            setLastDetectedPerson(person);
            playChime();
            setScanCooldown(true);
            setTimeout(() => {
              setScanCooldown(false);
              setLastDetectedPerson(null);
            }, 3000); 
          } else {
            // Optional: feedback for unknown QR
            console.log("QR detected but no person found:", dni);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(scanFrame);
  }, [isScannerModalOpen, scanCooldown, students, selectedQuickStatus, markAttendance, playChime]);

  const startScanner = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Su navegador no soporta el acceso a la cámara o no está en un entorno seguro (HTTPS).");
      return;
    }

    try {
      let stream;
      try {
        // Intentar primero con la cámara trasera (móviles)
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: { ideal: "environment" } } 
        });
      } catch (e) {
        console.warn("No se pudo acceder a la cámara trasera, intentando cualquier cámara...", e);
        // Fallback a cualquier cámara disponible (desktop/otros)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setIsScannerModalOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(e => console.error("Error al reproducir video:", e));
          requestRef.current = requestAnimationFrame(scanFrame);
        }
      }, 300); // Un poco más de tiempo para asegurar que el modal esté listo
    } catch (err: any) {
      console.error("No se pudo acceder a la cámara:", err);
      let errorMsg = "Error al acceder a la cámara.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Permiso denegado. Por favor, habilite el acceso a la cámara en la configuración de su navegador para este sitio.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = "No se encontró ninguna cámara conectada.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = "La cámara está siendo usada por otra aplicación.";
      }
      
      alert(`${errorMsg}\n\nDetalle: ${err.message || 'Desconocido'}`);
    }
  }, [scanFrame]);

  // --- Actions ---
  const deleteAttendance = (id: string) => {
    setAttendance(attendance.filter(a => a.id !== id));
    setToast({ message: "Registro de asistencia eliminado", type: 'success' });
  };

  const clearAttendanceHistory = () => {
    setAttendance([]);
    setToast({ message: "Historial de asistencia vaciado", type: 'success' });
  };

  const handleSaveUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userData: AppUser = {
      id: editingUser ? editingUser.id : Date.now().toString(),
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      fullName: formData.get('fullName') as string,
      whatsapp: formData.get('whatsapp') as string,
      email: formData.get('email') as string,
      role: (formData.get('role') as any) || 'staff',
      permissions: editingUser ? editingUser.permissions : ['dashboard', 'estudiantes', 'asistencia'],
      config: editingUser?.config
    };

    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? userData : u));
      if (currentUser?.id === editingUser.id) {
        setCurrentUser(userData);
      }
    } else {
      setUsers([userData, ...users]);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleUpdateAttendance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAttendance) return;
    const formData = new FormData(e.currentTarget);
    const updated: Attendance = {
      ...editingAttendance,
      estado: formData.get('estado') as AttendanceStatus,
      horaEntrada: formData.get('horaEntrada') as string || undefined,
      horaSalida: formData.get('horaSalida') as string || undefined,
      fecha: formData.get('fecha') as string,
      hora: new Date().toLocaleTimeString() // Update last modified
    };
    setAttendance(attendance.map(a => a.id === updated.id ? updated : a));
    setEditingAttendance(null);
  };

  useEffect(() => {
    if (selectedStudentForId) {
      QRCode.toDataURL(selectedStudentForId.dni, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).then(url => {
        setCurrentQRCode(url);
      }).catch(err => {
        console.error("Error generating QR code:", err);
      });
    }
  }, [selectedStudentForId]);

  const handleSaveStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData: Student = {
      id: editingStudent ? editingStudent.id : Date.now().toString(),
      nombre: formData.get('nombre') as string,
      apellido: formData.get('apellido') as string,
      dni: formData.get('dni') as string,
      nivel: formData.get('nivel') as any,
      grado: formData.get('grado') as string,
      seccion: formData.get('seccion') as string,
      turno: (formData.get('turno') as string) || 'Sin asignar',
      rol: formData.get('rol') as any,
      celularApoderado: formData.get('celularApoderado') as string,
      email: formData.get('email') as string,
      foto: editingStudent?.foto,
      siteName: formData.get('siteName') as string,
      slogan: formData.get('slogan') as string,
      logo: editingStudent?.logo
    };

    if (editingStudent) {
      setStudents(students.map(s => s.id === editingStudent.id ? studentData : s));
    } else {
      setStudents([studentData, ...students]);
    }
    setIsStudentModalOpen(false);
    setEditingStudent(null);
  };

  const deleteStudent = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    setAttendance(attendance.filter(a => a.studentId !== id));
    setGrades(grades.filter(g => g.studentId !== id));
    setToast({ message: "Estudiante eliminado de la base de datos", type: 'success' });
  };

  const deleteAllStudents = () => {
    setStudents([]);
    setAttendance([]);
    setGrades([]);
    setToast({ message: "Base de datos vaciada completamente", type: 'success' });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudentForId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSelectedStudentForId(prev => prev ? { ...prev, foto: base64 } : null);
      setHasChanges(true);
    };
    reader.readAsDataURL(file);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').slice(1);
      // Fixed: Explicitly type the return of the map function as Student | null to satisfy the type predicate in filter
      const newEntries: Student[] = rows.map((row): Student | null => {
        const parts = row.split(',');
        if (parts.length < 3) return null;
        const [nombre, apellido, dni, nivel, grado, seccion, turno, rol, celular, email] = parts;
        return {
          id: Math.random().toString(36).substr(2, 9),
          nombre: nombre?.trim() || 'Sin Nombre',
          apellido: apellido?.trim() || '',
          dni: dni?.trim() || '0',
          nivel: (nivel?.trim() as any) || 'Primaria',
          grado: grado?.trim() || '1° Grado',
          seccion: seccion?.trim() || 'A',
          turno: turno?.trim() || 'Mañana',
          rol: (rol?.trim() as any) || 'Estudiante',
          celularApoderado: celular?.trim() || '',
          email: email?.trim() || ''
        };
      }).filter((s): s is Student => s !== null);
      setStudents([...newEntries, ...students]);
      alert(`${newEntries.length} registros importados.`);
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = "Nombre,Apellido,DNI,Grado,Seccion,Turno,Rol,Celular,Email\n";
    const csvContent = students.map(s => `${s.nombre},${s.apellido},${s.dni},${s.grado},${s.seccion},${s.turno},${s.rol},${s.celularApoderado || ''},${s.email || ''}`).join("\n");
    const blob = new Blob([headers + csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_stnj_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleCloseFotocheck = () => {
    if (hasChanges && selectedStudentForId) {
      setStudents(prev => prev.map(s => s.id === selectedStudentForId.id ? selectedStudentForId : s));
      setToast({ message: "Foto y cambios guardados automáticamente", type: 'success' });
    }
    setIsFotocheckOpen(false);
    setSelectedStudentForId(null);
    setHasChanges(false);
  };

  const downloadAllFotochecks = async () => {
    if (students.length === 0) return;
    
    setIsDownloadingAll(true);
    setDownloadProgress(0);
    const zip = new JSZip();
    const folder = zip.folder("credenciales_stnj");

    // We need a hidden container to render each card for capture
    const hiddenContainer = document.createElement('div');
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '-9999px';
    document.body.appendChild(hiddenContainer);

    try {
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        setDownloadProgress(Math.round(((i + 1) / students.length) * 100));

        // Generate QR for this student
        const qrDataUrl = await QRCode.toDataURL(student.dni, { width: 400, margin: 2 });

        // Create a temporary element to render the card
        const cardElement = document.createElement('div');
        cardElement.style.width = '8.5cm';
        cardElement.style.height = '12.2cm';
        cardElement.style.backgroundColor = 'white';
        cardElement.style.display = 'flex';
        cardElement.style.flexDirection = 'column';
        cardElement.style.alignItems = 'center';
        cardElement.style.border = '8px solid #0f172a';
        cardElement.style.borderRadius = '24px';
        cardElement.style.overflow = 'hidden';
        cardElement.style.fontFamily = 'sans-serif';
        cardElement.style.position = 'relative';

        const isDocente = student.rol === 'Docente';
        const primaryColor = isDocente ? '#059669' : '#2563eb'; // Emerald vs Blue
        const secondaryColor = isDocente ? '#10b981' : '#3b82f6';
        const headerBg = isDocente ? '#064e3b' : '#0f172a';

        cardElement.innerHTML = `
          <div style="width: 100%; background-color: ${headerBg}; color: white; padding: 20px 8px; text-align: center; border-bottom: 6px solid ${primaryColor};">
            <h1 style="font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 0; line-height: 1.2; letter-spacing: -0.02em;">${activeConfig.siteName}</h1>
          </div>
          <div style="flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 20px 16px; background: linear-gradient(to bottom, #ffffff, ${isDocente ? '#ecfdf5' : '#f8fafc'});">
            <!-- 2. Photograph -->
            <div style="width: 140px; height: 140px; background-color: #ffffff; border-radius: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 4px solid ${isDocente ? '#d1fae5' : '#e2e8f0'}; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
              ${student.foto ? `<img src="${student.foto}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="color: #cbd5e1; display: flex; align-items: center; justify-content: center; height: 100%;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>`}
            </div>
            
            <!-- 3. Name and Surname -->
            <div style="text-align: center; width: 100%;">
              <h3 style="font-size: 22px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; line-height: 1.1;">${student.nombre}</h3>
              <p style="font-size: 18px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; margin: 2px 0 0 0; line-height: 1.1;">${student.apellido}</p>
            </div>

            <!-- 4. Aula / Cargo -->
            <div style="text-align: center; width: 100%;">
              <div style="display: inline-block; padding: 6px 16px; background-color: ${isDocente ? '#059669' : '#f1f5f9'}; color: ${isDocente ? '#ffffff' : '#475569'}; border-radius: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase; border: 1px solid ${isDocente ? '#047857' : '#e2e8f0'}; letter-spacing: 0.05em;">
                ${isDocente ? 'PERSONAL DOCENTE' : `Aula: ${student.grado} "${student.seccion}"`}
              </div>
            </div>

            <!-- 5. QR Code -->
            <div style="display: flex; flex-direction: column; align-items: center;">
              <div style="background-color: white; padding: 8px; border-radius: 16px; border: 2px solid ${isDocente ? '#d1fae5' : '#f1f5f9'}; box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);">
                <img src="${qrDataUrl}" style="width: 100px; height: 100px; display: block;" />
              </div>
              <p style="font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 0.3em;">DNI: ${student.dni}</p>
            </div>

            <!-- Slogan/Line -->
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center;">
              <div style="width: 70%; height: 1px; background: linear-gradient(to right, transparent, ${isDocente ? '#10b981' : '#e2e8f0'}, transparent); margin-bottom: 4px;"></div>
              <p style="font-size: 8px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; margin: 0; letter-spacing: 0.15em; font-style: italic;">"Educación con Valores y Tecnología"</p>
            </div>
          </div>
        `;

        hiddenContainer.appendChild(cardElement);
        
        const dataUrl = await htmlToImage.toJpeg(cardElement, { 
          quality: 0.95, 
          pixelRatio: 3, // Full HD Quality
          cacheBust: true,
          includeQueryParams: true,
        });
        
        const base64Data = dataUrl.split(',')[1];
        folder?.file(`${student.dni}_${student.nombre.split(' ')[0]}.jpg`, base64Data, { base64: true });
        
        hiddenContainer.removeChild(cardElement);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credenciales_stnj_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating zip:", error);
      alert("Error al generar el archivo de credenciales.");
    } finally {
      document.body.removeChild(hiddenContainer);
      setIsDownloadingAll(false);
    }
  };

  const handleDownloadSingleJPG = async () => {
    if (!cardRef.current || !selectedStudentForId) return;
    
    try {
      const dataUrl = await htmlToImage.toJpeg(cardRef.current, { 
        quality: 0.95, 
        pixelRatio: 3, // Full HD Quality
        cacheBust: true,
        includeQueryParams: true,
        filter: (node) => {
          // Exclude elements with data-ignore attribute
          if (node instanceof HTMLElement && node.dataset.ignore) {
            return false;
          }
          return true;
        }
      });
      
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `credencial_${selectedStudentForId.dni}_${selectedStudentForId.nombre.split(' ')[0]}.jpg`;
      a.click();
    } catch (error) {
      console.error("Error downloading JPG:", error);
      alert("Error al descargar la imagen.");
    }
  };

  const generateQRCodeSVG = (dni: string) => {
    if (!currentQRCode) return <div className="w-20 h-20 bg-slate-50 animate-pulse rounded-lg" />;
    return <img src={currentQRCode} className="w-20 h-20" alt="QR Code" />;
  };

  // --- Filtering Logic ---
  const filteredEntries = students.filter(s => 
    `${s.nombre} ${s.apellido} ${s.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttendance = attendance.filter(a => {
    const matchesSearch = a.studentName.toLowerCase().includes(attSearch.toLowerCase()) || a.studentDni?.includes(attSearch) || a.studentId.includes(attSearch);
    const matchesStatus = attStatusFilter === 'todos' || a.estado === attStatusFilter;
    const matchesRole = attRoleFilter === 'todos' || a.studentRol === attRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const studentsCount = students.filter(s => s.rol === 'Estudiante').length;
  const teachersCount = students.filter(s => s.rol === 'Docente').length;
  
  const todayAttendance = attendance.filter(a => a.fecha === new Date().toLocaleDateString());
  const statsAtt = {
    presentes: todayAttendance.filter(a => a.estado === 'entrada').length,
    tardanzas: todayAttendance.filter(a => a.estado === 'tardanza').length,
    permisos: todayAttendance.filter(a => a.estado === 'permiso').length,
    salidas: todayAttendance.filter(a => a.estado === 'salida').length,
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password');
    const user = users.find(u => u.password === password);
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Set first available tab
      if (user.permissions.length > 0) {
        setActiveTab(user.permissions[0] as any);
      }
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setShowLanding(true);
  };

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportToPDF = (data: any[], title: string) => {
    const doc = new jspdf.jsPDF();
    const config = currentUser?.config || globalConfig;
    
    // Header
    doc.setFillColor(30, 58, 138); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    // Logo if exists
    if (config.logo) {
      try {
        const imgProps = doc.getImageProperties(config.logo);
        const ratio = imgProps.width / imgProps.height;
        const maxWidth = 30;
        const maxHeight = 30;
        let imgWidth = maxWidth;
        let imgHeight = maxWidth / ratio;
        
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = maxHeight * ratio;
        }
        
        doc.addImage(config.logo, 'PNG', 10, (40 - imgHeight) / 2, imgWidth, imgHeight);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(config.siteName, 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(title, 105, 30, { align: 'center' });
    
    // Table
    const tableData = data.map(item => [
      item.nombre,
      item.dni,
      item.rol,
      item.entrada || '-',
      item.salida || '-',
      item.fecha || '-'
    ]);
    
    doc.autoTable({
      startY: 50,
      head: [['Nombre', 'DNI', 'Rol', 'Entrada', 'Salida', 'Fecha']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] }
    });
    
    doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
  };

  const exportPersonalReportToPDF = (student: Student, attendanceData: Attendance[], stats: any) => {
    const doc = new jspdf.jsPDF();
    const config = currentUser?.config || globalConfig;
    
    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 40, 'F');
    
    if (config.logo) {
      try {
        doc.addImage(config.logo, 'PNG', 10, 5, 30, 30);
      } catch (e) {}
    }
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(config.siteName, 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`REPORTE DETALLADO DE ASISTENCIA`, 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 105, 33, { align: 'center' });

    // Student Info
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("DATOS DEL PERSONAL / ESTUDIANTE", 15, 50);
    doc.line(15, 52, 195, 52);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Nombre Completo: ${student.nombre} ${student.apellido}`, 15, 60);
    doc.text(`DNI: ${student.dni}`, 15, 67);
    doc.text(`Rol: ${student.rol}`, 15, 74);
    doc.text(`Nivel: ${student.nivel}`, 100, 60);
    doc.text(`Grado/Aula: ${student.grado}`, 100, 67);
    doc.text(`Sección: ${student.seccion}`, 100, 74);

    // Statistics
    doc.setFont("helvetica", "bold");
    doc.text("RESUMEN DE ASISTENCIA", 15, 85);
    doc.line(15, 87, 195, 87);
    
    const statsData = [
      ["Asistencias (Entrada)", stats.presentes],
      ["Tardanzas", stats.tardanzas],
      ["Permisos", stats.permisos],
      ["Faltas (Ausente)", stats.faltas]
    ];

    doc.autoTable({
      startY: 90,
      head: [['Concepto', 'Cantidad']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: 15, right: 15 }
    });

    // Detailed History
    doc.setFont("helvetica", "bold");
    doc.text("HISTORIAL DETALLADO POR FECHA", 15, doc.lastAutoTable.finalY + 15);
    doc.line(15, doc.lastAutoTable.finalY + 17, 195, doc.lastAutoTable.finalY + 17);

    const historyData = attendanceData
      .sort((a, b) => {
        const dateA = a.fecha.split('/').reverse().join('-');
        const dateB = b.fecha.split('/').reverse().join('-');
        return dateB.localeCompare(dateA);
      })
      .map(record => [
        record.fecha,
        record.horaEntrada || '-',
        record.horaSalida || '-',
        record.estado.toUpperCase()
      ]);

    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Fecha', 'Ingreso', 'Salida', 'Estado']],
      body: historyData,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      margin: { left: 15, right: 15 }
    });

    doc.save(`Reporte_${student.nombre}_${student.apellido}_${student.dni}.pdf`);
  };

  const handleImportAttendance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Map imported data to Attendance objects
        const importedAttendance: Attendance[] = data.map((item: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          studentDni: item.DNI?.toString() || '',
          studentId: '', // We might need to find the student ID
          studentName: item.Nombre || '',
          studentRol: item.Rol || 'Estudiante',
          estado: (item.Estado?.toLowerCase() || 'entrada') as AttendanceStatus,
          fecha: item.Fecha || new Date().toLocaleDateString(),
          hora: item.Hora || new Date().toLocaleTimeString()
        }));

        setAttendance([...importedAttendance, ...attendance]);
        alert(`${importedAttendance.length} registros importados con éxito.`);
      } catch (error) {
        console.error("Error importing Excel:", error);
        alert("Error al procesar el archivo Excel. Asegúrese de que tenga las columnas: DNI, Nombre, Rol, Estado, Hora, Fecha.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredReportData = useMemo(() => {
    const targetDate = new Date(reportDateFilter + 'T12:00:00').toLocaleDateString();
    
    return students.filter(student => {
      const matchesSearch = 
        student.nombre.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        student.apellido.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        student.dni.includes(reportSearchTerm);
      
      const matchesClass = !reportClassFilter || student.grado === reportClassFilter;
      const matchesRole = reportRoleFilter === 'todos' || student.rol === reportRoleFilter;
      
      return matchesSearch && matchesClass && matchesRole;
    }).map(student => {
      // Find attendance for this student on the selected date
      const record = attendance.find(a => a.studentDni === student.dni && a.fecha === targetDate);
      
      return {
        ...student,
        record
      };
    }).sort((a, b) => {
      if (!a.record?.horaEntrada && !b.record?.horaEntrada) return 0;
      if (!a.record?.horaEntrada) return 1;
      if (!b.record?.horaEntrada) return -1;
      // Sort by arrival time
      return a.record.horaEntrada.localeCompare(b.record.horaEntrada);
    });
  }, [students, attendance, reportSearchTerm, reportClassFilter, reportDateFilter, reportRoleFilter]);

  const reportStats = useMemo(() => {
    const studentsCount = filteredReportData.filter(i => i.rol === 'Estudiante').length;
    const teachersCount = filteredReportData.filter(i => i.rol === 'Docente').length;
    const presentCount = filteredReportData.filter(i => i.record).length;
    return { studentsCount, teachersCount, presentCount };
  }, [filteredReportData]);

  useEffect(() => {
    if (isScannerModalOpen && (activeTab !== 'asistencia' || !isAuthenticated)) {
      stopScanner();
    }
  }, [activeTab, isAuthenticated, isScannerModalOpen, stopScanner]);

  const handleConsultasSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const pub = globalConfig.publicModules || { attendance: true, alerts: true, schedule: true };
    if (!pub.attendance && !pub.alerts && !pub.schedule) {
      setToast({ message: "El acceso público está deshabilitado por el administrador.", type: 'error' });
      return;
    }

    const student = students.find(s => s.dni === consultasSearchDni);
    if (student) {
      setConsultasResult(student);
      setIsDniInputModalOpen(false);
      setIsConsultasModalOpen(true);
      setConsultasSearchDni("");

      // Log the search
      const newLog: ConsultationLog = {
        id: Date.now().toString(),
        studentDni: student.dni,
        nivel: student.nivel,
        grado: student.grado,
        seccion: student.seccion,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0]
      };
      setConsultationLogs(prev => [...prev, newLog]);

      // Set default tab based on role
      if (student.rol === 'Docente') {
        setActiveConsultasTab('horario');
      } else {
        if (pub.attendance) setActiveConsultasTab('asistencia');
        else if (pub.alerts) setActiveConsultasTab('alerta');
        else if (pub.schedule) setActiveConsultasTab('horario');
      }
    } else {
      setToast({ message: "No se encontró ningún estudiante con ese DNI.", type: 'error' });
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Check if password matches any admin user
    const adminUser = users.find(u => u.role === 'admin' && u.password === adminLoginPassword);
    if (adminUser) {
      setShowLanding(false);
      setIsAdminLoginModalOpen(false);
      setAdminLoginPassword("");
      // If we want to automatically log in the user, we could do it here, 
      // but the user just said "ingresar a la pagina principal con la contraseña".
      // Let's see if we should also set isAuthenticated.
      // Usually "ingresar a la pagina principal" means bypassing the login screen.
      setIsAuthenticated(true);
      setCurrentUser(adminUser);
      setToast({ message: `Bienvenido, ${adminUser.fullName || adminUser.username}`, type: 'success' });
    } else {
      setToast({ message: "Contraseña administrativa incorrecta.", type: 'error' });
    }
  };

  if (showLanding) {
    const pub = globalConfig.publicModules || { attendance: true, alerts: true, schedule: true };
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 relative overflow-hidden" style={{ fontFamily: globalConfig.theme.fontFamily, background: `linear-gradient(135deg, ${globalConfig.theme.primaryColor}10 0%, ${globalConfig.theme.secondaryColor}10 100%)` }}>
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse opacity-20" style={{ backgroundColor: globalConfig.theme.primaryColor }}></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-pulse delay-700 opacity-20" style={{ backgroundColor: globalConfig.theme.secondaryColor }}></div>

        <div className="max-w-md w-full space-y-12 text-center relative z-10">
          <div className="space-y-4 animate-slide-up">
            <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110 duration-500">
              {globalConfig.logo ? <img src={globalConfig.logo} className="w-16 h-16 object-contain" /> : <GraduationCap size={48} style={{ color: globalConfig.theme.primaryColor }} />}
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
              {globalConfig.siteName}
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">
              {globalConfig.slogan || "Educación con Valores y Tecnología"}
            </p>
          </div>

          <div className="space-y-6 animate-slide-up delay-150">
            <button 
              onClick={() => setIsDniInputModalOpen(true)}
              className="w-full py-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-2xl hover:shadow-blue-200/50 hover:border-blue-200 transition-all group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col items-center gap-2">
                <Search size={40} style={{ color: globalConfig.theme.primaryColor }} className="mb-2" />
                <span className="text-4xl font-black text-slate-800 tracking-tight uppercase">Consultas</span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso Público</span>
              </div>
            </button>

            <button 
              onClick={() => setIsAdminLoginModalOpen(true)}
              className="group flex flex-col items-center mx-auto transition-all hover:scale-105"
            >
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                <Lock size={20} />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 group-hover:text-slate-900 transition-all">Admin</span>
            </button>
          </div>
        </div>

        {/* DNI Input Modal */}
        {isDniInputModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">Consulta DNI</h2>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Ingrese el documento del alumno</p>
                </div>
                <button onClick={() => setIsDniInputModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleConsultasSearch} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">DNI del Estudiante</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      autoFocus
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                      value={consultasSearchDni}
                      onChange={(e) => setConsultasSearchDni(e.target.value)}
                      placeholder="Ej. 70654321"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:opacity-90 transition-all" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
                  Buscar Estudiante
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Consultas Modal */}
        {isConsultasModalOpen && consultasResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-full max-h-[90vh] overflow-hidden flex flex-col animate-slide-up relative">
              {/* Fixed Close Button */}
              <button 
                onClick={() => setIsConsultasModalOpen(false)} 
                className="absolute top-6 right-6 z-[110] bg-black/20 hover:bg-black/40 text-white p-3 rounded-full transition-all shadow-lg"
              >
                <X size={24} />
              </button>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50">
                {/* Modal Header (Now inside scrollable area) */}
                <div className="p-8 md:p-12 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${consultasResult.primaryColor || globalConfig.theme.primaryColor} 0%, ${consultasResult.secondaryColor || globalConfig.theme.secondaryColor} 100%)` }}>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
                  <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10 w-full md:w-auto text-center sm:text-left">
                    <div className="w-24 h-24 rounded-3xl bg-white/10 p-1 border border-white/20 mx-auto sm:mx-0 shadow-2xl">
                      <div className="w-full h-full rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden">
                        {consultasResult.foto ? (
                          <img src={consultasResult.foto} className="w-full h-full object-cover" />
                        ) : consultasResult.logo ? (
                          <img src={consultasResult.logo} className="w-full h-full object-contain p-2 opacity-50" />
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
                    </div>
                  )}
                </div>

                {/* Modal Content */}
                <div className="p-8 md:p-12">
                {activeConsultasTab === 'asistencia' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                        <p className="text-4xl font-black text-emerald-600">{attendance.filter(a => a.studentDni === consultasResult.dni && a.estado === 'entrada').length}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Entradas</p>
                      </div>
                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                        <p className="text-4xl font-black text-amber-500">{attendance.filter(a => a.studentDni === consultasResult.dni && a.estado === 'tardanza').length}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Tardanzas</p>
                      </div>
                      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center">
                        <p className="text-4xl font-black text-rose-500">{attendance.filter(a => a.studentDni === consultasResult.dni && a.estado === 'ausente').length}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Faltas</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[500px]">
                          <thead>
                            <tr className="text-white" style={{ backgroundColor: consultasResult.primaryColor || globalConfig.theme.primaryColor }}>
                              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest">Fecha</th>
                              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest">Entrada</th>
                              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest">Salida</th>
                              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase tracking-widest">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {attendance.filter(a => a.studentDni === consultasResult.dni).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(att => (
                              <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 md:px-6 py-4 font-bold text-slate-700 text-sm whitespace-nowrap">{att.fecha}</td>
                                <td className="px-4 md:px-6 py-4 font-black text-slate-900 text-sm">{att.horaEntrada || '--:--'}</td>
                                <td className="px-4 md:px-6 py-4 font-black text-slate-900 text-sm">{att.horaSalida || '--:--'}</td>
                                <td className="px-4 md:px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest ${
                                    att.estado === 'entrada' ? 'bg-emerald-50 text-emerald-600' :
                                    att.estado === 'tardanza' ? 'bg-amber-50 text-amber-600' :
                                    att.estado === 'salida' ? 'bg-blue-50 text-blue-600' :
                                    'bg-rose-50 text-rose-600'
                                  }`}>
                                    {att.estado}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeConsultasTab === 'alerta' && (
                  <div className="space-y-6 animate-fade-in">
                    {incidences.filter(i => i.studentDni === consultasResult.dni).length === 0 ? (
                      <div className="bg-white p-20 rounded-[3rem] shadow-xl border border-slate-100 text-center">
                        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                          <CheckCircle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sin Alertas</h3>
                        <p className="text-slate-400 font-medium mt-2">No se han registrado incidencias para este estudiante.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-6">
                        {incidences.filter(i => i.studentDni === consultasResult.dni).map(inc => (
                          <div key={inc.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-l-8 border-slate-200 hover:shadow-2xl transition-all" style={{ borderLeftColor: inc.severity === 'grave' ? '#ef4444' : inc.severity === 'moderado' ? '#f97316' : '#3b82f6' }}>
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className={`px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest ${
                                  inc.severity === 'leve' ? 'bg-blue-50 text-blue-600' :
                                  inc.severity === 'moderado' ? 'bg-orange-50 text-orange-600' :
                                  'bg-red-50 text-red-600'
                                }`}>
                                  Gravedad: {inc.severity}
                                </span>
                                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-2">{inc.type}</h4>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inc.date}</p>
                                <span className="inline-block mt-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-lg font-black text-[8px] uppercase tracking-widest">
                                  Estado: {inc.status}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-600 font-medium leading-relaxed bg-slate-50 p-6 rounded-2xl border border-slate-100 italic">
                              "{inc.description}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeConsultasTab === 'horario' && (
                  <div className="space-y-8 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Horario Semanal</h3>
                      <button 
                        onClick={() => {
                          const element = document.getElementById('public-schedule-export');
                          if (element) {
                            element.style.display = 'block';
                            htmlToImage.toJpeg(element, { quality: 0.95, backgroundColor: '#ffffff' })
                              .then((dataUrl) => {
                                const link = document.createElement('a');
                                link.download = `horario_${consultasResult.nombre}_${consultasResult.apellido}.jpg`;
                                link.href = dataUrl;
                                link.click();
                                element.style.display = 'none';
                              });
                          }
                        }}
                        className="w-full sm:w-auto bg-slate-900 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                      >
                        <Download size={16} /> Descargar JPG
                      </button>
                    </div>

                    {/* Exportable Schedule View (Hidden) */}
                    <div id="public-schedule-export" className="hidden p-10 bg-white" style={{ width: '1200px' }}>
                      <div className="flex items-center gap-8 mb-10 pb-10 border-b-4 border-slate-900">
                        <div className="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-slate-900">
                          {consultasResult.foto ? <img src={consultasResult.foto} className="w-full h-full object-cover" /> : <User size={64} className="text-slate-300" />}
                        </div>
                        <div>
                          <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">{consultasResult.nombre} {consultasResult.apellido}</h1>
                          <div className="flex gap-6">
                            <div className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase text-xs tracking-widest">DNI: {consultasResult.dni}</div>
                            <div className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase text-xs tracking-widest">{consultasResult.nivel}</div>
                            <div className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black uppercase text-xs tracking-widest">{consultasResult.grado} "{consultasResult.seccion}"</div>
                          </div>
                        </div>
                        <div className="ml-auto text-right">
                          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest">{globalConfig.siteName}</h2>
                          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Horario Escolar 2026</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-[2rem] shadow-2xl border-4 border-slate-900 overflow-hidden">
                        <div className="grid grid-cols-8 text-white bg-slate-900">
                          <div className="p-6 text-xs font-black uppercase tracking-widest border-r border-white/10">Hora</div>
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                            <div key={dia} className="p-6 text-xs font-black uppercase tracking-widest text-center border-r border-white/10 last:border-0">{dia}</div>
                          ))}
                        </div>
                        <div className="divide-y-2 divide-slate-100">
                          {Array.from({ length: 10 }).map((_, i) => {
                            const hour = 7 + i;
                            const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                            return (
                              <div key={i} className="grid grid-cols-8">
                                <div className="p-6 text-xs font-black text-slate-400 border-r-2 border-slate-100 bg-slate-50/50">{timeStr}</div>
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => {
                                  const sch = schedules.find(s => s.dia === dia && s.inicio <= timeStr && s.fin > timeStr && (s.targetId === consultasResult.id || gradeLevels.find(gl => gl.id === s.targetId && gl.nombre === consultasResult.grado && gl.seccion === consultasResult.seccion)));
                                  return (
                                    <div key={dia} className="p-2 border-r-2 border-slate-100 last:border-0 min-h-[80px] flex items-center justify-center">
                                      {sch && (
                                        <div className={`w-full h-full p-3 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm border-2 ${sch.type === 'clase' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                          <p className="text-[10px] font-black uppercase leading-tight">{sch.materia || (sch.type === 'clase' ? 'Clase' : 'Laboral')}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Visual Schedule View */}
                    <div className="bg-white rounded-3xl md:rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                      <div className="overflow-x-auto no-scrollbar touch-pan-x">
                        <div className="min-w-[700px] md:min-w-[1000px]">
                          <div className="grid grid-cols-8 text-white sticky top-0 z-20" style={{ backgroundColor: consultasResult.primaryColor || globalConfig.theme.primaryColor }}>
                            <div className="p-3 md:p-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest border-r border-white/10">Hora</div>
                            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                              <div key={dia} className="p-3 md:p-4 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-center border-r border-white/10 last:border-0">{dia}</div>
                            ))}
                          </div>
                          
                          <div className="divide-y divide-slate-100">
                            {timeSlots.map((slot, i) => {
                              const timeStr = slot.start;
                              return (
                                <div key={i} className="grid grid-cols-8 hover:bg-slate-50 transition-colors">
                                  <div className="p-3 md:p-4 text-[9px] md:text-[10px] font-black text-slate-400 border-r border-slate-100 bg-slate-50/50 flex items-center justify-center">{timeStr}</div>
                                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => {
                                    const sch = schedules.find(s => s.dia === dia && s.inicio <= timeStr && s.fin > timeStr && (s.targetId === consultasResult.id || gradeLevels.find(gl => gl.id === s.targetId && gl.nombre === consultasResult.grado && gl.seccion === consultasResult.seccion)));
                                    return (
                                      <div key={dia} className="p-1 md:p-2 border-r border-slate-100 last:border-0 min-h-[50px] md:min-h-[70px] flex items-center justify-center">
                                        {sch && (
                                          <div className={`w-full h-full p-1.5 md:p-2 rounded-lg md:rounded-xl flex flex-col items-center justify-center text-center shadow-sm border ${sch.type === 'clase' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                            <p className="text-[7px] md:text-[8px] font-black uppercase leading-tight">{sch.materia || (sch.type === 'clase' ? 'Clase' : 'Laboral')}</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Admin Login Modal */}
        {isAdminLoginModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">Acceso Admin</h2>
                  <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">Ingrese su clave maestra</p>
                </div>
                <button onClick={() => setIsAdminLoginModalOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
              </div>
              <form onSubmit={handleAdminLogin} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" 
                      autoFocus
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                      value={adminLoginPassword}
                      onChange={(e) => setAdminLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">
                  Ingresar al Sistema
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="absolute bottom-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">
          {globalConfig.footerText || `${globalConfig.siteName} © 2024`}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center gradient-brand p-6" style={{ background: `linear-gradient(135deg, ${globalConfig.theme.primaryColor} 0%, ${globalConfig.theme.secondaryColor} 100%)` }}>
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md animate-slide-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
              {globalConfig.logo ? <img src={globalConfig.logo} className="w-full h-full object-contain p-2" /> : <GraduationCap size={32} className="text-white" />}
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{globalConfig.siteName}</h1>
            <p className="text-slate-500 text-xs font-medium tracking-wide">Acceso Administrativo</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input name="password" type="password" placeholder="Ingrese su Contraseña" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-sm" required />
            <button type="submit" className="w-full text-white font-black py-4 rounded-xl transition-all shadow-lg uppercase tracking-widest mt-2 text-xs" style={{ backgroundColor: globalConfig.theme.primaryColor }}>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'estudiantes', icon: Database, label: 'Base de Datos' },
    { id: 'asistencia', icon: CalendarCheck, label: 'Asistencia' },
    { id: 'reportes', icon: FileText, label: 'Reportes' },
    { id: 'alerta', icon: AlertCircle, label: 'ALERTA' },
    { id: 'calificaciones', icon: BarChart3, label: 'Calificaciones' },
    { id: 'mi-panel', icon: User, label: 'Mi Panel' },
    { id: 'config', icon: Settings, label: 'Configuración' }
  ].filter(item => currentUser?.permissions.includes(item.id));

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden" style={{ fontFamily: activeConfig.theme.fontFamily }}>
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 text-white z-30 shadow-lg" style={{ background: `linear-gradient(135deg, ${activeConfig.theme.primaryColor} 0%, ${activeConfig.theme.secondaryColor} 100%)` }}>
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-lg">
            {activeConfig.logo ? <img src={activeConfig.logo} className="w-6 h-6 object-contain" /> : <GraduationCap size={20} />}
          </div>
          <h2 className="font-black text-lg tracking-tight uppercase truncate max-w-[180px]">{activeConfig.siteName}</h2>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 text-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `} style={{ background: `linear-gradient(135deg, ${activeConfig.theme.primaryColor} 0%, ${activeConfig.theme.secondaryColor} 100%)` }}>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl">
            {activeConfig.logo ? <img src={activeConfig.logo} className="w-6 h-6 object-contain" /> : <GraduationCap size={24} />}
          </div>
          <div>
            <h2 className="font-black text-base tracking-tight uppercase truncate max-w-[140px]">{activeConfig.siteName}</h2>
            <p className="text-[9px] text-blue-200 uppercase tracking-widest font-black opacity-80 truncate max-w-[140px]">
              {activeConfig.slogan || (currentUser?.role === 'admin' ? 'Master Console' : 'Staff Access')}
            </p>
          </div>
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden ml-auto p-2 hover:bg-white/10 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-1 mt-2 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id as any);
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all duration-200 text-sm ${activeTab === item.id ? 'sidebar-active bg-white/10' : 'hover:bg-white/5 opacity-70 hover:opacity-100'}`}
            >
              <item.icon size={18} />
              <span className="font-bold">{item.label}</span>
              {activeTab === item.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-200 transition-all font-black uppercase tracking-widest text-[9px]">
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Reportes Section */}
          {activeTab === 'reportes' && (
            <div className="animate-slide-up space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                  <p className="text-slate-500 font-medium">Reportes Institucionales - Análisis y exportación de datos.</p>
                </div>
                <div className="flex flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveReportSubTab('global')}
                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeReportSubTab === 'global' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-200'}`}
                  >
                    Reporte Global
                  </button>
                  <button 
                    onClick={() => setActiveReportSubTab('personalizado')}
                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeReportSubTab === 'personalizado' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-200'}`}
                  >
                    Personalizado
                  </button>
                </div>
              </header>

              {activeReportSubTab === 'global' && (
                <div className="space-y-8">
                  {/* Stats Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
                      <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                        <Users size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudiantes</p>
                        <h4 className="text-2xl font-black text-slate-800">{reportStats.studentsCount}</h4>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
                      <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                        <GraduationCap size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Docentes</p>
                        <h4 className="text-2xl font-black text-slate-800">{reportStats.teachersCount}</h4>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center gap-6">
                      <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                        <UserCheck size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asistentes Hoy</p>
                        <h4 className="text-2xl font-black text-slate-800">{reportStats.presentCount}</h4>
                      </div>
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Búsqueda</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="Nombre o DNI..." 
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                            value={reportSearchTerm}
                            onChange={(e) => setReportSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Grado / Aula</label>
                        <select 
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                          value={reportClassFilter}
                          onChange={(e) => setReportClassFilter(e.target.value)}
                        >
                          <option value="">Todos los grados</option>
                          {Array.from(new Set(students.map(s => s.grado))).sort().map(grado => (
                            <option key={grado} value={grado}>{grado}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol</label>
                        <select 
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                          value={reportRoleFilter}
                          onChange={(e) => setReportRoleFilter(e.target.value)}
                        >
                          <option value="todos">Todos</option>
                          <option value="Estudiante">Estudiantes</option>
                          <option value="Docente">Docentes</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha</label>
                        <input 
                          type="date" 
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                          value={reportDateFilter}
                          onChange={(e) => setReportDateFilter(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setReportSearchTerm("");
                          setReportClassFilter("");
                          setReportDateFilter(new Date().toISOString().split('T')[0]);
                          setReportRoleFilter("todos");
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all w-full sm:w-auto"
                      >
                        <RefreshCw size={16} /> Limpiar Filtros
                      </button>

                      <div className="hidden sm:block flex-1"></div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <label className="cursor-pointer flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg w-full sm:w-auto">
                          <Upload size={16} /> Importar Asistencia
                          <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImportAttendance} />
                        </label>
                        <button 
                          onClick={() => {
                            const data = filteredReportData.map(item => ({
                              Nombre: `${item.nombre} ${item.apellido}`,
                              DNI: item.dni,
                              Rol: item.rol,
                              Grado: item.grado,
                              Seccion: item.seccion,
                              Entrada: item.record?.horaEntrada || '-',
                              Salida: item.record?.horaSalida || '-',
                              Fecha: reportDateFilter
                            }));
                            exportToExcel(data, `reporte_global_${reportDateFilter}`);
                          }}
                          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg w-full sm:w-auto"
                        >
                          <Database size={16} /> Excel
                        </button>
                        <button 
                          onClick={() => {
                            const data = filteredReportData.map(item => ({
                              nombre: `${item.nombre} ${item.apellido}`,
                              dni: item.dni,
                              rol: item.rol,
                              entrada: item.record?.horaEntrada || '-',
                              salida: item.record?.horaSalida || '-',
                              fecha: reportDateFilter
                            }));
                            exportToPDF(data, `Reporte Global de Asistencia - ${reportDateFilter}`);
                          }}
                          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-lg w-full sm:w-auto"
                        >
                          <FileText size={16} /> PDF
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Persona</th>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">DNI</th>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Rol</th>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">Aula</th>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest text-emerald-600">Entrada</th>
                          <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest text-blue-600">Salida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredReportData.map(item => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors animate-fade-in">
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                  {item.foto ? <img src={item.foto} className="w-full h-full object-cover" /> : <Users className="text-slate-300" size={18} />}
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 uppercase tracking-tighter text-sm">{item.nombre} {item.apellido}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 font-mono text-slate-500 font-bold text-sm">{item.dni}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${item.rol === 'Docente' ? 'text-indigo-600 border-indigo-100 bg-indigo-50/30' : 'text-blue-600 border-blue-100 bg-blue-50/30'}`}>
                                {item.rol}
                              </span>
                            </td>
                            <td className="p-6 font-bold text-slate-500 text-sm">{item.grado} "{item.seccion}"</td>
                            <td className="p-6">
                              {item.record?.horaEntrada ? (
                                <span className="font-mono text-sm font-black text-emerald-600">{item.record.horaEntrada}</span>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                            <td className="p-6">
                              {item.record?.horaSalida ? (
                                <span className="font-mono text-sm font-black text-blue-600">{item.record.horaSalida}</span>
                              ) : (
                                <span className="text-slate-200">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        {filteredReportData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="p-20 text-center">
                              <div className="flex flex-col items-center gap-4 opacity-30">
                                <Search size={48} />
                                <p className="font-black uppercase tracking-widest text-sm">No se encontraron registros</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

              {activeReportSubTab === 'personalizado' && (
                <div className="animate-slide-up space-y-6">
                  {/* Search for Student */}
                  <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                    <div className="max-w-xl mx-auto space-y-4">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Reporte Individual Detallado</h3>
                        <p className="text-slate-500 text-xs font-medium">Busque a una persona para generar su historial completo.</p>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input 
                          type="text" 
                          placeholder="Ingrese DNI o Nombre completo..." 
                          className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-lg font-bold transition-all shadow-inner"
                          value={personalSearchTerm}
                          onChange={(e) => {
                            setPersonalSearchTerm(e.target.value);
                            if (e.target.value.length > 2) {
                              const found = students.find(s => 
                                s.dni.includes(e.target.value) || 
                                `${s.nombre} ${s.apellido}`.toLowerCase().includes(e.target.value.toLowerCase())
                              );
                              if (found) setSelectedPersonalStudent(found);
                              else setSelectedPersonalStudent(null);
                            } else {
                              setSelectedPersonalStudent(null);
                            }
                          }}
                        />
                      </div>

                      {personalSearchTerm.length > 2 && !selectedPersonalStudent && (
                        <p className="text-center text-rose-500 font-bold animate-pulse text-xs">No se encontró ninguna coincidencia exacta.</p>
                      )}
                    </div>
                  </div>

                  {selectedPersonalStudent && (
                    <div className="animate-slide-up space-y-6">
                      {/* Student Profile Summary */}
                      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-white shadow-lg overflow-hidden flex-shrink-0">
                          {selectedPersonalStudent.foto ? (
                            <img src={selectedPersonalStudent.foto} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <User size={64} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-3">
                          <div>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${selectedPersonalStudent.rol === 'Estudiante' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                              {selectedPersonalStudent.rol}
                            </span>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-1">{selectedPersonalStudent.nombre} {selectedPersonalStudent.apellido}</h2>
                            <p className="text-slate-400 font-mono font-bold text-lg">DNI: {selectedPersonalStudent.dni}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nivel</p>
                              <p className="font-bold text-slate-700 text-xs">{selectedPersonalStudent.nivel}</p>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Grado / Aula</p>
                              <p className="font-bold text-slate-700 text-xs">{selectedPersonalStudent.grado} "{selectedPersonalStudent.seccion}"</p>
                            </div>
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Turno</p>
                              <p className="font-bold text-slate-700 text-xs">{selectedPersonalStudent.turno || 'No asignado'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <button 
                            onClick={() => {
                              const studentAttendance = attendance.filter(a => a.studentDni === selectedPersonalStudent.dni);
                              const stats = {
                                presentes: studentAttendance.filter(a => a.estado === 'entrada').length,
                                tardanzas: studentAttendance.filter(a => a.estado === 'tardanza').length,
                                permisos: studentAttendance.filter(a => a.estado === 'permiso').length,
                                faltas: studentAttendance.filter(a => a.estado === 'ausente').length
                              };
                              exportPersonalReportToPDF(selectedPersonalStudent, studentAttendance, stats);
                            }}
                            className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-rose-700 transition-all shadow-lg uppercase tracking-widest text-xs"
                          >
                            <FileText size={18} /> Descargar PDF
                          </button>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(() => {
                          const studentAttendance = attendance.filter(a => a.studentDni === selectedPersonalStudent.dni);
                          const stats = [
                            { label: 'Asistencias', value: studentAttendance.filter(a => a.estado === 'entrada').length, color: 'emerald', icon: CheckCircle },
                            { label: 'Tardanzas', value: studentAttendance.filter(a => a.estado === 'tardanza').length, color: 'amber', icon: Clock },
                            { label: 'Permisos', value: studentAttendance.filter(a => a.estado === 'permiso').length, color: 'indigo', icon: FileText },
                            { label: 'Faltas', value: studentAttendance.filter(a => a.estado === 'ausente').length, color: 'rose', icon: X }
                          ];
                          return stats.map(stat => (
                            <div key={stat.label} className={`bg-white p-6 rounded-3xl shadow-md border border-${stat.color}-50 text-center relative overflow-hidden group`}>
                              <div className={`absolute -right-2 -top-2 text-${stat.color}-500/10 group-hover:scale-110 transition-transform`}>
                                <stat.icon size={64} />
                              </div>
                              <p className={`text-2xl font-black text-${stat.color}-600 relative z-10`}>{stat.value}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">{stat.label}</p>
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Detailed History Table */}
                      <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                          <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historial de Asistencia</h4>
                          <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest">Total: {attendance.filter(a => a.studentDni === selectedPersonalStudent.dni).length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="stnj-table w-full">
                            <thead>
                              <tr>
                                <th>Fecha</th>
                                <th>Ingreso</th>
                                <th>Salida</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance
                                .filter(a => a.studentDni === selectedPersonalStudent.dni)
                                .sort((a, b) => {
                                  const dateA = a.fecha.split('/').reverse().join('-');
                                  const dateB = b.fecha.split('/').reverse().join('-');
                                  return dateB.localeCompare(dateA);
                                })
                                .map(record => (
                                  <tr key={record.id}>
                                    <td className="font-bold text-slate-600 text-xs">{record.fecha}</td>
                                    <td className="font-mono font-black text-emerald-600 text-xs">{record.horaEntrada || '—'}</td>
                                    <td className="font-mono font-black text-blue-600 text-xs">{record.horaSalida || '—'}</td>
                                    <td>
                                      <StatusBadge status={record.estado} />
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedPersonalStudent && personalSearchTerm.length <= 2 && (
                    <div className="bg-white p-12 rounded-3xl shadow-md border border-slate-200 text-center">
                      <div className="max-w-md mx-auto space-y-4 opacity-40">
                        <Sparkles size={48} className="mx-auto text-blue-600" />
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Reportes Personalizados</h3>
                        <p className="text-xs font-medium text-slate-500">Busque un estudiante o docente para ver su historial detallado de asistencia y descargar el reporte oficial.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Dashboard Section */}
          {activeTab === 'dashboard' && (
            <div className="animate-slide-up space-y-6">
              <header>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                <p className="text-slate-500 text-xs font-medium">Panel de Control Institucional.</p>
              </header>
              <StatCards 
                studentsCount={studentsCount} 
                teachersCount={teachersCount} 
                grades={grades} 
                todayAttendance={todayAttendance}
                consultationLogs={consultationLogs}
                activeConfig={activeConfig}
              />

              {/* Consultation Analytics Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Search size={16} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Análisis de Consultas Públicas</h3>
                </div>
                <ConsultationAnalytics logs={consultationLogs} />
              </div>

              <div className="bg-white rounded-3xl p-8 shadow-md border border-blue-50 relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  <div className="p-3 bg-blue-600 rounded-xl shadow-lg text-white">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Reporte IA Sensei</h3>
                </div>
                {isAiLoading ? (
                  <div className="flex flex-col items-center py-8"><div className="animate-spin text-blue-600 mb-4"><Sparkles size={32} /></div></div>
                ) : aiReport ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100"><p className="text-slate-600 text-xs leading-relaxed italic">{aiReport}</p></div>
                ) : (
                  <button onClick={generateAiReport} className="px-8 py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-black transition-all uppercase tracking-widest text-[10px] shadow-lg">Analizar Datos con IA</button>
                )}
              </div>
            </div>
          )}

          {/* Base de Datos Section */}
          {activeTab === 'estudiantes' && (
            <div className="animate-slide-up space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                  <p className="text-slate-500 text-xs font-medium">Base de Datos Institucional - Personal y alumnado.</p>
                </div>
                <button onClick={() => { setEditingStudent(null); setIsStudentModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md uppercase tracking-widest text-xs">
                  <Plus size={18} /> NUEVO REGISTRO
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Buscar por DNI, Nombre, Correo..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-lg shadow-md transition-all font-bold placeholder:text-slate-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-md">
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm uppercase text-[9px]">Importar CSV</button>
                  <button onClick={handleExportCSV} className="bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-all shadow-sm uppercase text-[9px]">Exportar CSV</button>
                  <button onClick={downloadAllFotochecks} disabled={isDownloadingAll} className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase text-[9px] disabled:opacity-50">
                    {isDownloadingAll ? (
                      <><RefreshCw className="animate-spin" size={12} /> Generando ({downloadProgress}%)</>
                    ) : (
                      <><Download size={12} /> Descargar Todo (JPG)</>
                    )}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center bg-slate-900 text-white px-5 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-widest gap-4 w-full sm:w-auto justify-center">
                     <span className="flex items-center gap-2 text-blue-400"><Users size={14}/> {studentsCount} Alumnos</span>
                     <span className="w-px h-4 bg-slate-700"></span>
                     <span className="flex items-center gap-2 text-indigo-400"><GraduationCap size={14}/> {teachersCount} Docentes</span>
                  </div>
                  <button onClick={deleteAllStudents} className="bg-rose-600 text-white px-5 py-2 rounded-xl font-black hover:bg-rose-700 transition-all shadow-md uppercase tracking-widest text-[9px] w-full sm:w-auto">Eliminar Todo</button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleImportCSV} />
              </div>
              
              {/* Comprehensive Database Table */}
              <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="stnj-table min-w-[1000px]">
                    <thead>
                      <tr>
                        <th>Rol</th>
                        <th>DNI</th>
                        <th>Persona</th>
                        <th>Nivel</th>
                        <th>Aula / Grado</th>
                        <th>Celular</th>
                        <th>Email</th>
                        <th>Turno</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map(s => (
                        <tr key={s.id}>
                          <td>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${s.rol === 'Estudiante' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                              {s.rol}
                            </span>
                          </td>
                          <td>
                            <span className="font-mono bg-slate-900 text-white px-2 py-1 rounded text-xs font-bold">{s.dni}</span>
                          </td>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                                {s.foto ? <img src={s.foto} className="w-full h-full object-cover" /> : <Users className="text-slate-300" size={14} />}
                              </div>
                              <span className="font-black text-slate-800 text-xs uppercase leading-tight">{s.nombre} {s.apellido}</span>
                            </div>
                          </td>
                          <td>
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-slate-200">{s.nivel}</span>
                          </td>
                          <td>
                            <div className="text-xs">
                              <p className="font-black text-slate-700 uppercase">{s.grado}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Sección {s.seccion}</p>
                            </div>
                          </td>
                          <td className="text-slate-600 font-bold text-xs">
                            {s.celularApoderado ? (
                              <div className="flex items-center gap-1.5"><Phone size={12} className="text-emerald-500" /> {s.celularApoderado}</div>
                            ) : <span className="text-slate-200 italic font-normal">No registrado</span>}
                          </td>
                          <td className="text-slate-600 font-medium text-xs">
                            {s.email ? (
                              <div className="flex items-center gap-1.5"><Mail size={12} className="text-blue-500" /> {s.email}</div>
                            ) : <span className="text-slate-200 italic font-normal">No registrado</span>}
                          </td>
                          <td>
                            <span className="bg-white text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-slate-100 shadow-sm">{s.turno}</span>
                          </td>
                          <td>
                            <div className="flex gap-1.5">
                              <button onClick={() => { setEditingStudent(s); setIsStudentModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all bg-blue-50">
                                <Edit size={14} />
                              </button>
                              <button onClick={() => { setSelectedStudentForId(s); setHasChanges(false); setIsFotocheckOpen(true); }} className="p-2 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all bg-indigo-50">
                                <IdCard size={14} />
                              </button>
                              <button onClick={() => deleteStudent(s.id)} className="p-2 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all bg-rose-50">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredEntries.length === 0 && (
                  <div className="py-40 flex flex-col items-center justify-center text-slate-300 opacity-30">
                    <Database size={80} />
                    <p className="mt-6 font-black uppercase tracking-widest text-2xl">Sin registros en la base de datos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Asistencia Section */}
          {activeTab === 'asistencia' && (
            <div className="animate-slide-up space-y-6 md:space-y-8">
               <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                 <div>
                   <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                   <p className="text-slate-500 text-xs md:text-base font-medium">Gestión de Asistencia - Control institucional en tiempo real.</p>
                 </div>
               </header>

               <StatCardsAttendance statsAtt={statsAtt} />

               <div className="bg-white rounded-3xl md:rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200 p-6 md:p-8 space-y-6 md:space-y-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
                     <div className="w-full md:w-auto space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 text-center md:text-left block">Seleccionar Estado</label>
                        <div className="flex justify-center md:justify-start flex-wrap gap-2">
                          <StatusButton active={selectedQuickStatus === 'entrada'} onClick={() => setSelectedQuickStatus('entrada')} status="entrada" icon={UserCheck} />
                          <StatusButton active={selectedQuickStatus === 'tardanza'} onClick={() => setSelectedQuickStatus('tardanza')} status="tardanza" icon={Clock} />
                          <StatusButton active={selectedQuickStatus === 'salida'} onClick={() => setSelectedQuickStatus('salida')} status="salida" icon={LogOutIcon} />
                          <StatusButton active={selectedQuickStatus === 'permiso'} onClick={() => setSelectedQuickStatus('permiso')} status="permiso" icon={FileText} />
                        </div>
                     </div>

                     <div className="w-full md:w-auto space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 text-center md:text-right block">Método de Registro</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                           <button onClick={() => setIsDniModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-4 bg-slate-900 text-white px-6 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-xl hover:bg-black transition-all transform hover:-translate-y-1">
                             <Keyboard size={20} /> Registro por DNI
                           </button>
                           <button onClick={startScanner} className="w-full sm:w-auto flex items-center justify-center gap-4 bg-blue-600 text-white px-6 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-[11px] shadow-xl hover:bg-blue-700 transition-all transform hover:-translate-y-1">
                             <Scan size={20} /> Escáner QR
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[3rem] shadow-xl border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
                  <div className="w-full md:flex-1 relative">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar en la bitácora..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 font-bold" value={attSearch} onChange={(e) => setAttSearch(e.target.value)} />
                  </div>
                  <div className="flex w-full md:w-auto gap-3 items-center">
                    <div className="flex-1 md:flex-none text-center bg-blue-600 text-white px-6 md:px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                      Bitácora: {filteredAttendance.length}
                    </div>
                    <button 
                      onClick={clearAttendanceHistory}
                      className="flex-1 md:flex-none justify-center bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                      title="Vaciar todo el historial"
                    >
                      <Trash2 size={16} /> Vaciar
                    </button>
                  </div>
               </div>

               <div className="bg-white rounded-2xl md:rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">DNI</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Persona</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Rol</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest text-emerald-600">Ingreso</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest text-blue-600">Salida</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipo</th>
                        <th className="p-4 md:p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAttendance.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors animate-fade-in group">
                          <td className="p-4 md:p-8 font-mono text-slate-500 font-bold text-xs md:text-base">{record.studentDni}</td>
                          <td className="p-4 md:p-8 font-black text-slate-800 text-sm md:text-xl uppercase tracking-tighter truncate max-w-[150px] md:max-w-[200px]">{record.studentName}</td>
                          <td className="p-4 md:p-8">
                            <span className={`px-3 md:px-4 py-1 md:py-2 rounded-full text-[8px] md:text-[10px] font-black uppercase border ${record.studentRol === 'Docente' ? 'text-indigo-600 border-indigo-100' : 'text-blue-600 border-blue-100'}`}>
                              {record.studentRol}
                            </span>
                          </td>
                          <td className="p-4 md:p-8 text-[9px] md:text-[11px] font-bold text-slate-500">{record.fecha}</td>
                          <td className="p-4 md:p-8">
                            { record.horaEntrada ? (
                              <span className="font-mono text-sm md:text-lg font-black text-emerald-600">{record.horaEntrada}</span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                          <td className="p-4 md:p-8">
                            { record.horaSalida ? (
                              <span className="font-mono text-sm md:text-lg font-black text-blue-600">{record.horaSalida}</span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                          <td className="p-4 md:p-8">
                             <StatusBadge status={record.estado} />
                          </td>
                          <td className="p-4 md:p-8">
                            <div className="flex gap-2">
                               <button onClick={() => setEditingAttendance(record)} className="p-2 md:p-3 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50">
                                 <Edit size={14} md:size={16} />
                               </button>
                               <button onClick={() => deleteAttendance(record.id)} className="p-2 md:p-3 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all bg-rose-50">
                                 <Trash2 size={14} md:size={16} />
                               </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    </table>
                  </div>
               </div>
            </div>
          )}

          {/* ALERTA Section */}
          {activeTab === 'alerta' && (
            <div className="animate-slide-up space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tight">ALERTA</h2>
                  <p className="text-slate-500 font-medium">Gestión de Incidencias y Reportes de Conducta.</p>
                </div>
                <div className="flex flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActiveAlertaSubTab('registro')}
                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeAlertaSubTab === 'registro' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-red-200'}`}
                  >
                    Registrar Incidencia
                  </button>
                  <button 
                    onClick={() => setActiveAlertaSubTab('historial')}
                    className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeAlertaSubTab === 'historial' ? 'bg-red-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:border-red-200'}`}
                  >
                    Historial
                  </button>
                </div>
              </header>

              {activeAlertaSubTab === 'registro' && (
                <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[3.5rem] shadow-2xl border border-slate-200 space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Buscar Alumno (DNI, Nombre o Grado)</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-black text-lg outline-none transition-all"
                        value={personalSearchTerm}
                        onChange={(e) => setPersonalSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {personalSearchTerm && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-2 custom-scrollbar">
                      {students.filter(s => 
                        s.nombre.toLowerCase().includes(personalSearchTerm.toLowerCase()) || 
                        s.apellido.toLowerCase().includes(personalSearchTerm.toLowerCase()) || 
                        s.dni.includes(personalSearchTerm) ||
                        s.grado.toLowerCase().includes(personalSearchTerm.toLowerCase())
                      ).map(student => (
                        <button 
                          key={student.id}
                          onClick={() => {
                            setSelectedPersonalStudent(student);
                            setPersonalSearchTerm("");
                          }}
                          className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-red-500 hover:bg-red-50 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                            {student.foto ? <img src={student.foto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-400" />}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-sm">{student.nombre} {student.apellido}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{student.grado} - {student.dni}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedPersonalStudent && (
                    <div className="animate-fade-in space-y-8">
                      <div className="flex flex-col md:flex-row gap-8 p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 relative">
                        <button onClick={() => setSelectedPersonalStudent(null)} className="absolute top-6 right-6 p-2 hover:bg-white rounded-full transition-all text-slate-400"><X size={20} /></button>
                        <div className="w-32 h-32 rounded-[2rem] bg-white shadow-xl border-4 border-white overflow-hidden flex-shrink-0">
                          {selectedPersonalStudent.foto ? <img src={selectedPersonalStudent.foto} className="w-full h-full object-cover" /> : <User className="w-full h-full p-6 text-slate-200" />}
                        </div>
                        <div className="space-y-4 flex-1">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedPersonalStudent.nombre} {selectedPersonalStudent.apellido}</h3>
                            <p className="text-red-600 font-black text-[10px] uppercase tracking-widest mt-1">Ficha del Estudiante</p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DNI</p>
                              <p className="font-bold text-slate-700 text-sm">{selectedPersonalStudent.dni}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Nivel</p>
                              <p className="font-bold text-slate-700 text-sm">{selectedPersonalStudent.nivel}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Grado</p>
                              <p className="font-bold text-slate-700 text-sm">{selectedPersonalStudent.grado}</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sección</p>
                              <p className="font-bold text-slate-700 text-sm">{selectedPersonalStudent.seccion}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <form onSubmit={(e: any) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const newIncidence: Incidence = {
                          id: Date.now().toString(),
                          studentId: selectedPersonalStudent.id,
                          studentName: `${selectedPersonalStudent.nombre} ${selectedPersonalStudent.apellido}`,
                          studentDni: selectedPersonalStudent.dni,
                          studentGrade: selectedPersonalStudent.grado,
                          type: formData.get('type') as string,
                          description: formData.get('description') as string,
                          severity: formData.get('severity') as IncidenceSeverity,
                          status: 'registrada',
                          date: new Date().toLocaleString(),
                          registeredBy: currentUser?.fullName || currentUser?.username || 'Admin'
                        };
                        setIncidences([newIncidence, ...incidences]);
                        setSelectedPersonalStudent(null);
                        setToast({ message: "Incidencia registrada correctamente.", type: 'success' });
                      }} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Incidencia</label>
                            <select name="type" required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all">
                              <option value="">Seleccione tipo...</option>
                              {incidenceTypes.map(type => (
                                <option key={type.id} value={type.name}>{type.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nivel de Gravedad</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              {['leve', 'moderado', 'grave'].map((sev) => (
                                <label key={sev} className="flex-1">
                                  <input type="radio" name="severity" value={sev} required className="hidden peer" />
                                  <div className={`text-center p-3 sm:p-4 rounded-2xl border-2 border-slate-100 cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600 hover:bg-slate-50`}>
                                    {sev}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descripción de la Incidencia</label>
                          <textarea name="description" required rows={4} placeholder="Detalle lo sucedido..." className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all resize-none" />
                        </div>
                        <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-700 transition-all">Registrar Alerta</button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {activeAlertaSubTab === 'historial' && (
                <div className="space-y-8">
                  <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-[3.5rem] shadow-2xl border border-slate-200 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-red-50 p-4 rounded-2xl text-red-600">
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Incidencias</p>
                          <h4 className="text-2xl font-black text-slate-800">{incidences.length}</h4>
                        </div>
                      </div>
                      <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar en historial..." 
                          className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-red-500 font-bold text-sm"
                          value={reportSearchTerm}
                          onChange={(e) => setReportSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <th className="px-6 py-4">Estudiante</th>
                            <th className="px-6 py-4">Tipo / Fecha</th>
                            <th className="px-6 py-4">Gravedad</th>
                            <th className="px-6 py-4">Estado</th>
                            <th className="px-6 py-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incidences.filter(inc => 
                            inc.studentName.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
                            inc.studentDni.includes(reportSearchTerm) ||
                            inc.type.toLowerCase().includes(reportSearchTerm.toLowerCase())
                          ).map((inc) => (
                            <tr key={inc.id} className="bg-white hover:bg-slate-50 transition-all group shadow-sm rounded-2xl">
                              <td className="px-6 py-4 first:rounded-l-2xl">
                                <p className="font-black text-slate-800 text-sm">{inc.studentName}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{inc.studentGrade} - {inc.studentDni}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-700 text-xs uppercase">{inc.type}</p>
                                <p className="text-[10px] font-medium text-slate-400 mt-1">{inc.date}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest ${
                                  inc.severity === 'leve' ? 'bg-blue-50 text-blue-600' :
                                  inc.severity === 'moderado' ? 'bg-orange-50 text-orange-600' :
                                  'bg-red-50 text-red-600'
                                }`}>
                                  {inc.severity}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={inc.status}
                                  onChange={(e) => {
                                    const updated = incidences.map(i => i.id === inc.id ? { ...i, status: e.target.value as IncidenceStatus } : i);
                                    setIncidences(updated);
                                  }}
                                  className="bg-slate-50 border-none rounded-lg p-2 font-bold text-[10px] uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option value="registrada">Registrada</option>
                                  <option value="en evaluación">En Evaluación</option>
                                  <option value="en seguimiento">En Seguimiento</option>
                                  <option value="resuelta">Resuelta</option>
                                  <option value="escalada a un caso mayor">Escalada</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 last:rounded-r-2xl text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => setEditingIncidence(inc)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                    title="Editar"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      const student = students.find(s => s.id === inc.studentId);
                                      if (student && student.celularApoderado) {
                                        const message = `ALERTA INSTITUCIONAL: Se ha registrado una incidencia de tipo "${inc.type}" para el alumno ${inc.studentName}. Gravedad: ${inc.severity.toUpperCase()}. Descripción: ${inc.description}`;
                                        window.open(`https://wa.me/${student.celularApoderado.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                                      } else {
                                        alert("No se encontró número de WhatsApp registrado para el apoderado.");
                                      }
                                    }}
                                    className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                                    title="Enviar por WhatsApp"
                                  >
                                    <Phone size={16} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if(confirm('¿Está seguro de eliminar este registro?')) {
                                        setIncidences(incidences.filter(i => i.id !== inc.id));
                                      }
                                    }}
                                    className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Calificaciones Section */}
          {activeTab === 'calificaciones' && (
            <div className="animate-slide-up space-y-6">
               <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter text-center italic uppercase">{activeConfig.siteName}</h2>
               <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl border-t-4 border-t-blue-600 max-w-6xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                  {/* Search and Filters */}
                  <div className="md:col-span-4 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Búsqueda de Alumno</label>
                    <div className="relative">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Nombre o DNI..." 
                        value={calificacionesSearch}
                        onChange={(e) => setCalificacionesSearch(e.target.value)}
                        className="w-full pl-12 p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Nivel</label>
                    <select 
                      value={calificacionesLevelFilter}
                      onChange={(e) => setCalificacionesLevelFilter(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                    >
                      <option value="">Todos</option>
                      {levels.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Grado</label>
                    <select 
                      value={calificacionesGradeFilter}
                      onChange={(e) => setCalificacionesGradeFilter(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                    >
                      <option value="">Todos</option>
                      {Array.from(new Set(gradeLevels.map(gl => gl.nombre))).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Sección</label>
                    <select 
                      value={calificacionesSectionFilter}
                      onChange={(e) => setCalificacionesSectionFilter(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                    >
                      <option value="">Todas</option>
                      {Array.from(new Set(gradeLevels.map(gl => gl.seccion))).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="md:col-span-2 flex items-end">
                    <button 
                      onClick={() => {
                        setCalificacionesSearch("");
                        setCalificacionesGradeFilter("");
                        setCalificacionesLevelFilter("");
                        setCalificacionesSectionFilter("");
                      }}
                      className="w-full p-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >Limpiar</button>
                  </div>
                </div>

                {/* Student Selection List */}
                <div className="mb-8">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Seleccionar Alumno</label>
                  <div className="max-h-48 overflow-y-auto no-scrollbar border-2 border-slate-50 rounded-2xl p-2 space-y-2">
                    {students
                      .filter(s => {
                        const matchesSearch = (s.nombre + " " + s.apellido + " " + s.dni).toLowerCase().includes(calificacionesSearch.toLowerCase());
                        const matchesLevel = !calificacionesLevelFilter || s.nivel === calificacionesLevelFilter;
                        const matchesGrade = !calificacionesGradeFilter || s.grado === calificacionesGradeFilter;
                        const matchesSection = !calificacionesSectionFilter || s.seccion === calificacionesSectionFilter;
                        return matchesSearch && matchesLevel && matchesGrade && matchesSection;
                      })
                      .map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedPersonalStudent(s)}
                          className={`w-full p-3 rounded-xl flex justify-between items-center transition-all ${selectedPersonalStudent?.id === s.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                        >
                          <span className="font-bold text-sm">{s.nombre} {s.apellido}</span>
                          <span className="text-[10px] opacity-60">{s.dni} • {s.grado} "{s.seccion}"</span>
                        </button>
                      ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Materia</label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none" id="grade-materia">
                      <option value="">-- Seleccionar --</option>
                      {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      {courses.length === 0 && (
                        <>
                          <option>Matemáticas</option>
                          <option>Lenguaje</option>
                          <option>Ciencias</option>
                          <option>Historia</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Tipo de Nota</label>
                    <select className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none" id="grade-type">
                      {gradeTypes.map(gt => <option key={gt.id} value={gt.name}>{gt.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">Nota</label>
                    <input type="number" placeholder="00" className="w-full p-3 rounded-xl bg-slate-50 border-none font-black text-center text-2xl text-blue-600 shadow-inner outline-none" id="grade-nota" min="0" max="20" />
                  </div>
                </div>

                <button 
                  onClick={() => {
                    const student = selectedPersonalStudent;
                    const mat = (document.getElementById('grade-materia') as HTMLSelectElement).value;
                    const type = (document.getElementById('grade-type') as HTMLSelectElement).value;
                    const notaInput = (document.getElementById('grade-nota') as HTMLInputElement);
                    const nota = parseFloat(notaInput.value);
                    if(student && mat && !isNaN(nota)) {
                      setGrades([{ 
                        id: Date.now().toString(), 
                        studentId: student.id, 
                        studentName: `${student.nombre} ${student.apellido}`, 
                        materia: `${mat} (${type})`, 
                        nota, 
                        fecha: new Date().toLocaleDateString() 
                      }, ...grades]);
                      notaInput.value = '';
                      setToast({ message: "Nota registrada con éxito", type: 'success' });
                    } else {
                      setToast({ message: "Por favor complete todos los campos", type: 'error' });
                    }
                  }}
                  className="w-full text-white py-6 rounded-2xl font-black text-xl transition-all uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: activeConfig.theme.primaryColor }}
                >Registrar Nota</button>
               </div>
            </div>
          )}

          {/* Configuración Section */}
          {/* Mi Panel Section */}
          {activeTab === 'mi-panel' && (
            <div className="animate-slide-up space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="text-center md:text-left">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                  <p className="text-slate-500 font-medium text-sm md:text-base">Mi Panel - Gestión de perfil, grados y horarios.</p>
                </div>
                <div className="flex flex-row bg-white p-1 rounded-xl shadow-lg border border-slate-100 overflow-x-auto no-scrollbar w-full md:w-auto justify-center gap-0.5">
                  <button 
                    onClick={() => setActivePanelSubTab('perfil')}
                    className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'perfil' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Perfil</button>
                  <button 
                    onClick={() => setActivePanelSubTab('grados')}
                    className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'grados' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Grados</button>
                  <button 
                    onClick={() => setActivePanelSubTab('horarios')}
                    className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'horarios' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Horarios</button>
                  <button 
                    onClick={() => setActivePanelSubTab('profesores')}
                    className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'profesores' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >Profesores</button>
                  <button 
                    onClick={() => setActivePanelSubTab('alerta')}
                    className={`flex-1 md:flex-none px-3 py-2 rounded-lg font-black text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'alerta' ? 'bg-red-600 text-white shadow-md' : 'text-red-400 hover:text-red-600'}`}
                  >Alerta</button>
                </div>
              </header>

              {activePanelSubTab === 'perfil' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] shadow-2xl border border-slate-200 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
                      <div className="relative pt-12">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-white p-1 mx-auto shadow-2xl relative z-10">
                          <div className="w-full h-full rounded-[2.2rem] bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                            <User size={64} className="text-slate-300" />
                          </div>
                        </div>
                        <div className="mt-6">
                          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{currentUser?.fullName || currentUser?.username}</h3>
                          <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mt-1">{currentUser?.role === 'admin' ? 'Administrador Maestro' : 'Personal de Apoyo'}</p>
                        </div>
                      </div>

                      <div className="mt-10 space-y-4 text-left">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <Mail size={18} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                            <p className="text-sm font-bold text-slate-700">{currentUser?.email || 'No registrado'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <Phone size={18} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">WhatsApp</p>
                            <p className="text-sm font-bold text-slate-700">{currentUser?.whatsapp || 'No registrado'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                            <Shield size={18} />
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID de Usuario</p>
                            <p className="text-sm font-bold text-slate-700">{currentUser?.id}</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setPanelModalType('profile')}
                        className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl"
                      >
                        Editar Perfil
                      </button>
                    </div>
                  </div>

                  {/* Activity & Stats */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Public Modules Config */}
                    {currentUser?.role === 'admin' && (
                      <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-200 space-y-8 animate-fade-in">
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Módulos de Consulta Pública</h3>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Configure qué información será visible para el público</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <button 
                            onClick={() => {
                              const current = globalConfig.publicModules || { attendance: true, alerts: true, schedule: true };
                              const newModules = { ...current, attendance: !current.attendance };
                              setGlobalConfig({ ...globalConfig, publicModules: newModules });
                              setToast({ message: `Módulo Asistencia ${!current.attendance ? 'habilitado' : 'deshabilitado'}`, type: 'success' });
                            }}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.attendance ?? true) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                          >
                            <div className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.attendance ?? true) ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                              <CalendarCheck size={24} />
                            </div>
                            <div className="text-center">
                              <p className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.attendance ?? true) ? 'text-emerald-900' : 'text-slate-400'}`}>Asistencia</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{(globalConfig.publicModules?.attendance ?? true) ? 'Visible' : 'Oculto'}</p>
                            </div>
                          </button>

                          <button 
                            onClick={() => {
                              const current = globalConfig.publicModules || { attendance: true, alerts: true, schedule: true };
                              const newModules = { ...current, alerts: !current.alerts };
                              setGlobalConfig({ ...globalConfig, publicModules: newModules });
                              setToast({ message: `Módulo Alertas ${!current.alerts ? 'habilitado' : 'deshabilitado'}`, type: 'success' });
                            }}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.alerts ?? true) ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                          >
                            <div className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.alerts ?? true) ? 'bg-rose-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                              <AlertCircle size={24} />
                            </div>
                            <div className="text-center">
                              <p className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.alerts ?? true) ? 'text-rose-900' : 'text-slate-400'}`}>Alertas</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{(globalConfig.publicModules?.alerts ?? true) ? 'Visible' : 'Oculto'}</p>
                            </div>
                          </button>

                          <button 
                            onClick={() => {
                              const current = globalConfig.publicModules || { attendance: true, alerts: true, schedule: true };
                              const newModules = { ...current, schedule: !current.schedule };
                              setGlobalConfig({ ...globalConfig, publicModules: newModules });
                              setToast({ message: `Módulo Horario ${!current.schedule ? 'habilitado' : 'deshabilitado'}`, type: 'success' });
                            }}
                            className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.schedule ?? true) ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                          >
                            <div className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.schedule ?? true) ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                              <Clock size={24} />
                            </div>
                            <div className="text-center">
                              <p className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.schedule ?? true) ? 'text-blue-900' : 'text-slate-400'}`}>Horario</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{(globalConfig.publicModules?.schedule ?? true) ? 'Visible' : 'Oculto'}</p>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                            <Clock size={24} />
                          </div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight">Última Actividad</h4>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-bold text-slate-600">Inicio de Sesión</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase">Hoy, 08:15 AM</span>
                          </div>
                          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <span className="text-xs font-bold text-slate-600">Registro de Asistencia</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase">Ayer, 04:30 PM</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                              <AlertCircle size={24} />
                            </div>
                            <h4 className="font-black text-slate-800 uppercase tracking-tight">Notificaciones</h4>
                          </div>
                          <button 
                            onClick={() => setPanelModalType('report')}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                            title="Registrar Reporte/Mensaje"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {notifications.length > 0 ? (
                            notifications.map(notif => (
                              <div key={notif.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{notif.username}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[8px] font-bold text-slate-400">{notif.date}</span>
                                    {currentUser?.role === 'admin' && (
                                      <button 
                                        onClick={() => {
                                          setNotifications(notifications.filter(n => n.id !== notif.id));
                                          setToast({ message: "Notificación eliminada", type: 'success' });
                                        }}
                                        className="text-rose-500 hover:text-rose-700 transition-all"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-tight">{notif.message}</p>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center py-4 opacity-30">
                              <Mail size={32} className="mb-2" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Sin mensajes nuevos</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-200">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Resumen de Gestión</h4>
                        <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">Este Mes</span>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Registros de Asistencia</span>
                            <span>85%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Nuevos Estudiantes</span>
                            <span>40%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '40%' }}></div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Reportes Generados</span>
                            <span>65%</span>
                          </div>
                          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: '65%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePanelSubTab === 'grados' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestión de Niveles y Grados</h3>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setActiveGradosSubTab('niveles')}
                        className={`px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeGradosSubTab === 'niveles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >Niveles</button>
                      <button 
                        onClick={() => setActiveGradosSubTab('grados')}
                        className={`px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeGradosSubTab === 'grados' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >Grados</button>
                    </div>
                  </div>

                  {activeGradosSubTab === 'niveles' && (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setPanelModalType('level')}
                          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                        >
                          <Plus size={20} /> NUEVO NIVEL
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {levels.map(lvl => (
                          <div key={lvl.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                {lvl.nombre[0].toUpperCase()}
                              </div>
                              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{lvl.nombre}</h4>
                            </div>
                            <button 
                              onClick={() => {
                                setLevels(levels.filter(l => l.id !== lvl.id));
                                setToast({ message: "Nivel eliminado", type: 'success' });
                              }}
                              className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeGradosSubTab === 'grados' && (
                    <div className="space-y-6">
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setPanelModalType('grade')}
                          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                        >
                          <Plus size={20} /> NUEVO GRADO
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {gradeLevels.map(gl => {
                          const level = levels.find(l => l.id === gl.nivelId);
                          return (
                            <div key={gl.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all">
                              <div>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full inline-block mb-2">{level?.nombre || 'Sin Nivel'}</p>
                                <h4 className="text-2xl font-black text-slate-800">{gl.nombre} <span className="text-blue-600">"{gl.seccion}"</span></h4>
                              </div>
                              <button 
                                onClick={() => {
                                  setGradeLevels(gradeLevels.filter(g => g.id !== gl.id));
                                  setToast({ message: "Grado eliminado", type: 'success' });
                                }}
                                className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          );
                        })}
                        {gradeLevels.length === 0 && (
                          <div className="col-span-full p-20 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200 opacity-30">
                            <Database size={64} className="mx-auto mb-4" />
                            <p className="font-black uppercase tracking-widest text-xl">No hay grados registrados</p>
                            <p className="text-sm font-bold mt-2">Crea un nuevo grado para empezar a organizar tus aulas</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activePanelSubTab === 'profesores' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestión de Profesores</h3>
                      <p className="text-slate-500 font-medium text-sm">Asigna cursos y grados a los docentes registrados.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Teachers List */}
                    <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 h-fit">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">Docentes Registrados</h4>
                      <div className="space-y-3">
                        {students.filter(s => s.rol === 'Docente').map(teacher => (
                          <button
                            key={teacher.id}
                            onClick={() => setSelectedPersonalStudent(teacher)}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedPersonalStudent?.id === teacher.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                          >
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">
                              {teacher.nombre[0]}{teacher.apellido[0]}
                            </div>
                            <div className="text-left">
                              <p className="font-black text-sm uppercase tracking-tight leading-tight">{teacher.nombre} {teacher.apellido}</p>
                              <p className="text-[10px] opacity-60 font-bold uppercase">{teacher.dni}</p>
                            </div>
                          </button>
                        ))}
                        {students.filter(s => s.rol === 'Docente').length === 0 && (
                          <div className="text-center py-10 text-slate-400">
                            <GraduationCap size={40} className="mx-auto mb-2 opacity-20" />
                            <p className="font-bold text-xs uppercase">No hay docentes registrados</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Teacher Assignment */}
                    <div className="lg:col-span-2 space-y-8">
                      {selectedPersonalStudent && selectedPersonalStudent.rol === 'Docente' ? (
                        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-fade-in">
                          <div className="flex items-center gap-6 mb-8">
                            <div className="w-20 h-20 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-600">
                              <GraduationCap size={40} />
                            </div>
                            <div>
                              <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedPersonalStudent.nombre} {selectedPersonalStudent.apellido}</h4>
                              <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">Docente Activo</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Course Assignment */}
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cursos Asignados</h5>
                              <div className="space-y-2">
                                {courses.filter(c => c.teacherId === selectedPersonalStudent.id).map(course => (
                                  <div key={course.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div>
                                      <span className="font-bold text-slate-700 text-xs uppercase">{course.name}</span>
                                    </div>
                                    <button 
                                      onClick={() => setCourses(courses.map(c => c.id === course.id ? {...c, teacherId: undefined} : c))}
                                      className="p-1.5 text-red-400 hover:text-red-600 transition-all"
                                    ><X size={14} /></button>
                                  </div>
                                ))}
                                <div className="pt-2">
                                  <select 
                                    onChange={(e) => {
                                      const cid = e.target.value;
                                      if(cid) {
                                        setCourses(courses.map(c => c.id === cid ? {...c, teacherId: selectedPersonalStudent.id} : c));
                                        e.target.value = '';
                                      }
                                    }}
                                    className="w-full p-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-xs uppercase outline-none focus:border-blue-500"
                                  >
                                    <option value="">+ Asignar Curso</option>
                                    {courses.filter(c => c.teacherId !== selectedPersonalStudent.id).map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Grade Assignment */}
                            <div className="space-y-4">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Grados que Imparte</h5>
                              <div className="flex flex-wrap gap-2">
                                {gradeLevels.map(gl => {
                                  // This is a mock logic for assignment, in a real app we'd have a separate table
                                  const isAssigned = false; 
                                  return (
                                    <button 
                                      key={gl.id}
                                      className={`px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${isAssigned ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                      {gl.nombre} "{gl.seccion}"
                                    </button>
                                  );
                                })}
                              </div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-2">* Haz clic para asignar/quitar grados.</p>
                            </div>
                          </div>

                          {/* Teacher Schedule View */}
                          <div className="mt-10 pt-10 border-t border-slate-100 space-y-6">
                            <div className="flex justify-between items-center">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Horario del Docente</h5>
                              <button 
                                onClick={() => {
                                  // Simple PDF download simulation using print
                                  const printContent = document.getElementById('teacher-schedule-print');
                                  if(printContent) {
                                    const win = window.open('', '', 'height=700,width=900');
                                    win?.document.write('<html><head><title>Horario del Docente</title>');
                                    win?.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
                                    win?.document.write('</head><body class="p-10">');
                                    win?.document.write(printContent.innerHTML);
                                    win?.document.write('</body></html>');
                                    win?.document.close();
                                    setTimeout(() => {
                                      win?.print();
                                      win?.close();
                                    }, 500);
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all"
                              >
                                <Download size={14} /> Descargar PDF
                              </button>
                            </div>

                            <div id="teacher-schedule-print" className="bg-slate-50 p-6 rounded-3xl border border-slate-100 overflow-x-auto no-scrollbar">
                              <div className="min-w-[600px]">
                                <div className="grid grid-cols-8 gap-1 mb-2">
                                  <div className="p-2"></div>
                                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                                    <div key={dia} className="text-center font-black text-[8px] uppercase tracking-widest text-slate-400">{dia}</div>
                                  ))}
                                </div>
                                <div className="space-y-1">
                                  {timeSlots.map(slot => (
                                    <div key={slot.id} className="grid grid-cols-8 gap-1">
                                      <div className="flex items-center justify-center bg-white rounded-lg p-1 border border-slate-100">
                                        <span className="font-black text-[8px] text-slate-400">{slot.start}</span>
                                      </div>
                                      {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => {
                                        // Find courses assigned to this teacher that are scheduled at this time
                                        const teacherCourses = courses.filter(c => c.teacherId === selectedPersonalStudent.id);
                                        const sch = schedules.find(s => 
                                          s.dia === dia && 
                                          s.inicio === slot.start && 
                                          teacherCourses.some(tc => tc.name === s.materia)
                                        );
                                        return (
                                          <div 
                                            key={dia}
                                            className={`min-h-[40px] rounded-lg flex items-center justify-center p-1 text-center border ${sch ? 'bg-white shadow-sm' : 'bg-slate-100/50 border-transparent'}`}
                                            style={sch ? { 
                                              borderColor: courses.find(c => c.name === sch.materia)?.color + '30',
                                              color: courses.find(c => c.name === sch.materia)?.color
                                            } : {}}
                                          >
                                            {sch && (
                                              <div className="flex flex-col">
                                                <span className="font-black text-[7px] uppercase leading-tight">{sch.materia}</span>
                                                <span className="text-[6px] opacity-60 font-bold">
                                                  {gradeLevels.find(gl => gl.id === sch.targetId)?.nombre || 'Gral'}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-10 text-center">
                          <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-300 mb-6">
                            <GraduationCap size={40} />
                          </div>
                          <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">Selecciona un Docente</h4>
                          <p className="text-slate-400 text-xs font-bold uppercase mt-2">Para gestionar sus cursos y grados asignados.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {activePanelSubTab === 'alerta' && (
                <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-200 space-y-8 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tipos de Incidencia</h3>
                      <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Configure las opciones disponibles en el módulo de alertas</p>
                    </div>
                    <button 
                      onClick={() => setEditingIncidenceType({ id: '', name: '' })}
                      className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <Plus size={16} /> Nuevo Tipo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {incidenceTypes.map(type => (
                      <div key={type.id} className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex justify-between items-center group hover:border-red-200 transition-all">
                        <span className="font-black text-slate-700 uppercase tracking-tight text-sm">{type.name}</span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setEditingIncidenceType(type)}
                            className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('¿Eliminar este tipo de incidencia?')) {
                                setIncidencesTypes(incidenceTypes.filter(t => t.id !== type.id));
                              }
                            }}
                            className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {editingIncidenceType && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-red-600 text-white">
                          <div>
                            <h2 className="text-xl font-black uppercase tracking-widest">{editingIncidenceType.id ? 'Editar Tipo' : 'Nuevo Tipo'}</h2>
                            <p className="text-red-100 text-[9px] font-bold uppercase mt-1">Defina el nombre de la incidencia</p>
                          </div>
                          <button onClick={() => setEditingIncidenceType(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
                        </div>
                        <form onSubmit={(e: any) => {
                          e.preventDefault();
                          const name = new FormData(e.currentTarget).get('name') as string;
                          if (editingIncidenceType.id) {
                            setIncidencesTypes(incidenceTypes.map(t => t.id === editingIncidenceType.id ? { ...t, name } : t));
                          } else {
                            setIncidencesTypes([...incidenceTypes, { id: Date.now().toString(), name }]);
                          }
                          setEditingIncidenceType(null);
                          setToast({ message: "Tipo de incidencia guardado.", type: 'success' });
                        }} className="p-8 space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Tipo</label>
                            <input 
                              name="name" 
                              defaultValue={editingIncidenceType.name} 
                              required 
                              autoFocus
                              placeholder="Ej. Falta de uniforme" 
                              className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-black text-lg outline-none transition-all" 
                            />
                          </div>
                          <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-700 transition-all">
                            Guardar Tipo
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activePanelSubTab === 'horarios' && (
                <div className="space-y-8">
                  {currentUser?.permissions.includes('horarios') ? (
                    <>
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter text-center md:text-left">Gestión de Horarios</h3>
                        <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full md:w-auto">
                          <button 
                            onClick={() => setActiveHorariosSubTab('turnos')}
                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === 'turnos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Turnos</button>
                          <button 
                            onClick={() => setActiveHorariosSubTab('config')}
                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Horas</button>
                          <button 
                            onClick={() => setActiveHorariosSubTab('materias')}
                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === 'materias' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Materias</button>
                          <button 
                            onClick={() => setActiveHorariosSubTab('creador')}
                            className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === 'creador' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Creador</button>
                        </div>
                      </div>

                      {activeHorariosSubTab === 'materias' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                              <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">Materias / Cursos</h3>
                              <button 
                                onClick={() => setEditingCourse({id: Date.now().toString(), name: '', color: '#3b82f6'})}
                                className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"
                              ><Plus size={20} /></button>
                            </div>
                            <div className="space-y-3">
                              {courses.map(course => (
                                <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <div className="flex items-center gap-4">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: course.color }}></div>
                                    <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{course.name}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingCourse(course)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit size={16} /></button>
                                    <button onClick={() => setCourses(courses.filter(c => c.id !== course.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                              ))}
                              {courses.length === 0 && <p className="text-center text-slate-400 font-bold py-10">No hay materias registradas</p>}
                            </div>
                          </div>

                          <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100">
                            <h3 className="text-xl font-black uppercase tracking-widest text-slate-800 mb-6">Tipos de Nota</h3>
                            <div className="space-y-3">
                              {gradeTypes.map(type => (
                                <div key={type.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                  <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{type.name}</span>
                                  <button onClick={() => setGradeTypes(gradeTypes.filter(t => t.id !== type.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                                </div>
                              ))}
                              <div className="pt-4 flex gap-2">
                                <input id="new-grade-type" placeholder="Nuevo tipo..." className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-100 font-bold text-sm outline-none" />
                                <button 
                                  onClick={() => {
                                    const input = document.getElementById('new-grade-type') as HTMLInputElement;
                                    if(input.value) {
                                      setGradeTypes([...gradeTypes, {id: Date.now().toString(), name: input.value}]);
                                      input.value = '';
                                    }
                                  }}
                                  className="p-3 bg-slate-900 text-white rounded-xl shadow-lg"
                                ><Plus size={20} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeHorariosSubTab === 'config' && (
                        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl">
                          <div className="flex justify-between items-center mb-8">
                            <div>
                              <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">Horas de Clase</h3>
                              <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Define los bloques horarios para el cronograma</p>
                            </div>
                            <button 
                              onClick={() => setEditingTimeSlot({id: Date.now().toString(), start: '08:00', end: '09:00'})}
                              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                            >Agregar Hora</button>
                          </div>
                          <div className="space-y-3">
                            {timeSlots.map((slot, idx) => (
                              <div key={slot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group">
                                <div className="flex items-center gap-6">
                                  <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-xs">{idx + 1}</span>
                                  <div className="flex items-center gap-3">
                                    <span className="font-black text-slate-700 text-lg">{slot.start}</span>
                                    <span className="text-slate-300">—</span>
                                    <span className="font-black text-slate-700 text-lg">{slot.end}</span>
                                  </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => setEditingTimeSlot(slot)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit size={16} /></button>
                                  <button onClick={() => setTimeSlots(timeSlots.filter(s => s.id !== slot.id))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeHorariosSubTab === 'creador' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                          {/* Sidebar: Courses */}
                          <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Materias Disponibles</h4>
                              <div className="space-y-2">
                                {courses.map(course => (
                                  <div 
                                    key={course.id}
                                    draggable
                                    onDragStart={() => setDraggedCourse(course)}
                                    className="p-3 rounded-xl border-2 border-slate-50 bg-slate-50 cursor-move hover:border-blue-200 transition-all flex items-center gap-3 group"
                                  >
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: course.color }}></div>
                                    <span className="font-black text-[10px] uppercase tracking-tight text-slate-600 group-hover:text-blue-600">{course.name}</span>
                                  </div>
                                ))}
                                {courses.length === 0 && <p className="text-[9px] text-slate-400 font-bold uppercase text-center py-4 italic">Crea materias primero</p>}
                              </div>
                            </div>

                            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Filtros de Horario</h4>
                              <div className="space-y-4">
                                <select className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase outline-none" id="schedule-grade-filter">
                                  <option value="">Seleccionar Grado</option>
                                  {gradeLevels.map(gl => <option key={gl.id} value={gl.id}>{gl.nombre} "{gl.seccion}"</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Main: Schedule Grid */}
                          <div className="lg:col-span-3 bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-x-auto no-scrollbar">
                            <div className="min-w-[800px]">
                              <div className="grid grid-cols-8 gap-2 mb-4">
                                <div className="p-2"></div>
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => (
                                  <div key={dia} className="text-center font-black text-[10px] uppercase tracking-widest text-slate-400">{dia}</div>
                                ))}
                              </div>
                              <div className="space-y-2">
                                {timeSlots.map(slot => (
                                  <div key={slot.id} className="grid grid-cols-8 gap-2">
                                    <div className="flex items-center justify-center bg-slate-50 rounded-xl p-2">
                                      <span className="font-black text-[10px] text-slate-400">{slot.start}</span>
                                    </div>
                                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dia => {
                                      const targetId = (document.getElementById('schedule-grade-filter') as HTMLSelectElement)?.value;
                                      const sch = schedules.find(s => s.dia === dia && s.inicio === slot.start && s.targetId === targetId);
                                      return (
                                        <div 
                                          key={dia}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={() => {
                                            if(draggedCourse && targetId) {
                                              // Check for conflicts
                                              const conflict = schedules.find(s => s.dia === dia && s.inicio === slot.start && s.targetId === targetId);
                                              if(conflict) {
                                                setToast({ message: "Ya existe una clase en este horario", type: 'error' });
                                                return;
                                              }
                                              setSchedules([...schedules, {
                                                id: Date.now().toString(),
                                                dia,
                                                inicio: slot.start,
                                                fin: slot.end,
                                                materia: draggedCourse.name,
                                                type: 'clase',
                                                targetId
                                              }]);
                                              setToast({ message: "Horario actualizado", type: 'success' });
                                            }
                                          }}
                                          className={`min-h-[60px] rounded-xl border-2 border-dashed transition-all flex items-center justify-center p-2 relative group ${sch ? 'border-transparent' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'}`}
                                        >
                                          {sch ? (
                                            <div 
                                              className="w-full h-full rounded-lg flex flex-col items-center justify-center text-center p-1 shadow-sm border"
                                              style={{ 
                                                backgroundColor: courses.find(c => c.name === sch.materia)?.color + '15' || '#f1f5f9',
                                                borderColor: courses.find(c => c.name === sch.materia)?.color + '30' || '#e2e8f0',
                                                color: courses.find(c => c.name === sch.materia)?.color || '#64748b'
                                              }}
                                            >
                                              <span className="font-black text-[8px] uppercase leading-tight">{sch.materia}</span>
                                              <button 
                                                onClick={() => setSchedules(schedules.filter(s => s.id !== sch.id))}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full shadow-md text-red-500 hover:scale-110 transition-all"
                                              ><X size={10} /></button>
                                            </div>
                                          ) : (
                                            <Plus size={14} className="text-slate-200 group-hover:text-blue-300" />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeHorariosSubTab === 'clases' && (
                        <div className="space-y-6">
                          <div className="flex justify-end">
                            <button 
                              onClick={() => setPanelModalType('schedule')}
                              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                            >
                              <Plus size={20} /> NUEVO HORARIO
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {schedules.map(sch => (
                              <div key={sch.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex justify-between items-center group hover:border-indigo-200 transition-all">
                                <div className="flex items-center gap-6">
                                  <div className={`w-16 h-16 rounded-3xl flex items-center justify-center font-black ${sch.type === 'clase' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Clock size={32} />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{sch.dia} • {sch.type === 'clase' ? 'Clase' : 'Laboral'}</p>
                                    <h4 className="text-2xl font-black text-slate-800">{sch.inicio} - {sch.fin}</h4>
                                    {sch.materia && <p className="text-sm font-bold text-indigo-600 uppercase tracking-tight mt-1">{sch.materia}</p>}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    setSchedules(schedules.filter(s => s.id !== sch.id));
                                    setToast({ message: "Horario eliminado", type: 'success' });
                                  }}
                                  className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeHorariosSubTab === 'turnos' && (
                        <div className="space-y-6">
                          <div className="flex justify-end">
                            <button 
                              onClick={() => setPanelModalType('shift')}
                              className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                            >
                              <Plus size={20} /> NUEVO TURNO
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {shifts.map(shift => (
                              <div key={shift.id} className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-100 space-y-8 group hover:border-indigo-200 transition-all">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                      <Clock size={28} />
                                    </div>
                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{shift.nombre}</h4>
                                  </div>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        // We need a way to edit shifts. I'll use the same modal but pre-fill it.
                                        // I'll add a state for editingShift.
                                        setEditingShift(shift);
                                        setPanelModalType('shift');
                                      }}
                                      className="p-4 text-blue-500 hover:bg-blue-500 hover:text-white rounded-2xl transition-all bg-blue-50"
                                    >
                                      <Edit size={20} />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if(confirm('¿Eliminar este turno?')) {
                                          setShifts(shifts.filter(s => s.id !== shift.id));
                                          setToast({ message: "Turno eliminado", type: 'success' });
                                        }
                                      }}
                                      className="p-4 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all bg-rose-50"
                                    >
                                      <Trash2 size={20} />
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                  <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-100/50 rounded-full -mr-8 -mt-8"></div>
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 relative z-10">Turno Mañana</p>
                                    <div className="flex flex-col gap-1 relative z-10">
                                      <p className="text-xs font-bold text-slate-400 uppercase">Ingreso: {shift.entradaMañana}</p>
                                      <p className="text-xs font-bold text-slate-400 uppercase">Salida: {shift.salidaMañana}</p>
                                    </div>
                                  </div>
                                  <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-amber-100/50 rounded-full -mr-8 -mt-8"></div>
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 relative z-10">Turno Tarde</p>
                                    <div className="flex flex-col gap-1 relative z-10">
                                      <p className="text-xs font-bold text-slate-400 uppercase">Ingreso: {shift.entradaTarde}</p>
                                      <p className="text-xs font-bold text-slate-400 uppercase">Salida: {shift.salidaTarde}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white p-16 rounded-[4rem] shadow-2xl border border-slate-100 text-center space-y-6 animate-fade-in">
                      <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <Lock size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Acceso Restringido</h3>
                        <p className="text-slate-500 font-medium max-w-md mx-auto">No cuenta con los permisos necesarios para gestionar los horarios institucionales. Por favor, contacte con el administrador del sistema.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="animate-slide-up space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h1 className="text-4xl font-black text-slate-800 tracking-tight">Configuración</h1>
                  <p className="text-slate-500 text-lg">Administración global del sistema {activeConfig.siteName}.</p>
                </div>
                <div className="flex flex-col sm:flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 w-full sm:w-auto">
                  <button 
                    onClick={() => setActiveConfigSubTab('usuarios')}
                    className={`px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === 'usuarios' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Usuarios
                  </button>
                  <button 
                    onClick={() => setActiveConfigSubTab('sistema')}
                    className={`px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === 'sistema' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Sistema
                  </button>
                </div>
              </header>

              {activeConfigSubTab === 'usuarios' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                      <Shield className="text-blue-600" /> Gestión de Usuarios
                    </h3>
                    <button 
                      onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest text-xs w-full sm:w-auto"
                    >
                      <Plus size={20} /> NUEVO USUARIO
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {users.map(user => (
                      <div key={user.id} className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 hover:shadow-blue-100/50 transition-all group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {user.username[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 uppercase text-lg leading-tight">{user.username}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingUser(user); setIsUserModalOpen(true); }} className="p-3 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50">
                              <Edit size={16} />
                            </button>
                            {user.role !== 'admin' && (
                              <button onClick={() => {
                                setUsers(users.filter(u => u.id !== user.id));
                                setToast({ message: "Usuario eliminado del sistema", type: 'success' });
                              }} className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-2">
                            {user.fullName && (
                              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                <Users size={14} className="text-slate-400" /> {user.fullName}
                              </div>
                            )}
                            {user.whatsapp && (
                              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                <Phone size={14} className="text-emerald-500" /> {user.whatsapp}
                              </div>
                            )}
                            {user.email && (
                              <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                <Mail size={14} className="text-blue-500" /> {user.email}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Permisos de Acceso</p>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 no-scrollbar">
                              {['dashboard', 'estudiantes', 'asistencia', 'reportes', 'calificaciones', 'mi-panel', 'config', 'horarios'].map(perm => (
                                <button
                                  key={perm}
                                  onClick={() => {
                                    const updatedUsers = users.map(u => {
                                      if(u.id === user.id) {
                                        const newPerms = u.permissions.includes(perm) 
                                          ? u.permissions.filter(p => p !== perm)
                                          : [...u.permissions, perm];
                                        return { ...u, permissions: newPerms };
                                      }
                                      return u;
                                    });
                                    setUsers(updatedUsers);
                                  }}
                                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase transition-all border ${user.permissions.includes(perm) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-200'}`}
                                >
                                  {perm}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pt-4 border-t border-slate-50 flex flex-col gap-2">
                            <button 
                              onClick={() => {
                                setConfigTargetUser(user);
                                setPanelModalType('siteConfig');
                              }}
                              className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                              <Palette size={14} /> Personalizar Usuario
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeConfigSubTab === 'sistema' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-10 shadow-2xl border border-slate-100 space-y-10">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Palette size={24} /></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase text-center sm:text-left">Personalización Global</h3>
                      <button 
                        onClick={() => setPanelModalType('siteConfig')}
                        className="sm:ml-auto w-full sm:w-auto px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Palette size={14} /> Temas y Logo
                      </button>
                    </div>

                    <div className="space-y-8">
                      {/* Site Name and Slogan */}
                      <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"><Globe size={14}/> Nombre del Sitio Web</label>
                          <input 
                            type="text" 
                            value={globalConfig.siteName} 
                            onChange={(e) => setGlobalConfig({...globalConfig, siteName: e.target.value})}
                            className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"><Type size={14}/> Slogan Institucional</label>
                          <input 
                            type="text" 
                            value={globalConfig.slogan} 
                            onChange={(e) => setGlobalConfig({...globalConfig, slogan: e.target.value})}
                            className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"><FileText size={14}/> Texto de Pie de Página</label>
                          <input 
                            type="text" 
                            value={globalConfig.footerText} 
                            onChange={(e) => setGlobalConfig({...globalConfig, footerText: e.target.value})}
                            className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                            placeholder="Control y Gestión 2026 © 2024"
                          />
                        </div>
                      </div>

                      {/* Logo Upload */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"><ImageIcon size={14}/> Logo Institucional</label>
                        <div className="flex items-center gap-6">
                          <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                            {globalConfig.logo ? <img src={globalConfig.logo} className="w-full h-full object-contain p-2" /> : <Upload className="text-slate-300" />}
                          </div>
                          <button 
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.accept = 'image/*';
                              input.onchange = (e: any) => {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  setGlobalConfig({...globalConfig, logo: ev.target?.result as string});
                                };
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                          >
                            Subir Logo
                          </button>
                        </div>
                      </div>

                      {/* Colors */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Primario</label>
                          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                            <input 
                              type="color" 
                              value={globalConfig.theme.primaryColor} 
                              onChange={(e) => setGlobalConfig({...globalConfig, theme: {...globalConfig.theme, primaryColor: e.target.value}})}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                            />
                            <span className="font-mono font-bold text-xs text-slate-500 uppercase">{globalConfig.theme.primaryColor}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Secundario</label>
                          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                            <input 
                              type="color" 
                              value={globalConfig.theme.secondaryColor} 
                              onChange={(e) => setGlobalConfig({...globalConfig, theme: {...globalConfig.theme, secondaryColor: e.target.value}})}
                              className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                            />
                            <span className="font-mono font-bold text-xs text-slate-500 uppercase">{globalConfig.theme.secondaryColor}</span>
                          </div>
                        </div>
                      </div>

                      {/* Font Family */}
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2"><Type size={14}/> Fuente del Sistema</label>
                        <select 
                          value={globalConfig.theme.fontFamily}
                          onChange={(e) => setGlobalConfig({...globalConfig, theme: {...globalConfig.theme, fontFamily: e.target.value}})}
                          className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all appearance-none"
                        >
                          <option value="Poppins">Poppins (Moderno)</option>
                          <option value="Inter">Inter (Limpio)</option>
                          <option value="Montserrat">Montserrat (Elegante)</option>
                          <option value="Roboto">Roboto (Clásico)</option>
                          <option value="system-ui">System Default</option>
                        </select>
                      </div>

                      <div className="pt-6">
                        <button 
                          onClick={() => {
                            if(confirm("¿Restablecer toda la configuración a los valores predeterminados?")) {
                              setGlobalConfig({
                                siteName: 'Sistema de Control y Gestión',
                                theme: {
                                  primaryColor: '#1e3a8a',
                                  secondaryColor: '#3b82f6',
                                  fontFamily: 'Poppins'
                                }
                              });
                            }
                          }}
                          className="w-full py-4 border-2 border-rose-100 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                        >
                          Restablecer Configuración
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- FLOATING DNI MODAL --- */}
      {isDniModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border-8 border-white">
              <div className="p-12 text-white text-center relative" style={{ backgroundColor: activeConfig.theme.primaryColor }}>
                 <button onClick={() => setIsDniModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
                 <div className="inline-flex p-6 bg-white/10 rounded-[2rem] mb-6 shadow-xl border border-white/10"><Keyboard size={40} /></div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Marcado Manual</h2>
                 <div className="mt-4"><StatusBadge status={selectedQuickStatus} /></div>
              </div>
              <div className="p-12 space-y-8">
                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 block">Ingrese Número de DNI</label>
                    <input 
                      type="number" 
                      ref={markingInputRef}
                      placeholder="00000000" 
                      className="w-full p-8 rounded-[2rem] bg-slate-50 border-4 border-slate-100 focus:border-blue-500 outline-none text-5xl tracking-[0.3em] text-center font-black text-slate-900 shadow-inner"
                      autoFocus
                      onKeyDown={(e) => {
                        if(e.key === 'Enter') {
                          markAttendance((e.target as HTMLInputElement).value, selectedQuickStatus);
                        }
                      }}
                    />
                 </div>
                 <button 
                   onClick={() => markAttendance((markingInputRef.current?.value || ""), selectedQuickStatus)} 
                   className="w-full text-white py-8 rounded-[2rem] transition-all shadow-2xl font-black uppercase tracking-widest text-xs"
                   style={{ backgroundColor: activeConfig.theme.primaryColor }}
                 >Registrar Asistencia</button>
              </div>
           </div>
        </div>
      )}

      {/* --- FLOATING QR SCANNER MODAL --- */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-fade-in p-4">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border-4 border-blue-600 relative">
              <div className="p-8 bg-blue-600 text-white text-center relative">
                 <button onClick={stopScanner} className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all"><X size={24} /></button>
                 <h2 className="text-2xl font-black uppercase tracking-widest">Escáner de Asistencia</h2>
                 <div className="mt-2"><span className="px-4 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase border border-white/10 tracking-widest">Modo: {selectedQuickStatus}</span></div>
              </div>
              <div className="p-8">
                 <div className="relative w-full aspect-square bg-black rounded-[3rem] overflow-hidden border-4 border-slate-100 shadow-2xl">
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                       <div className="w-64 h-64 border-4 border-white/40 rounded-[4rem] border-dashed animate-pulse flex items-center justify-center">
                          <div className="w-48 h-48 border-2 border-white/20 rounded-[3rem]"></div>
                       </div>
                       <div className="absolute top-0 left-0 w-full h-2 bg-blue-400/60 blur-md animate-[scanLine_3s_infinite]"></div>
                    </div>
                 </div>
              </div>
              
              <div className="px-8 pb-8">
                {lastDetectedPerson ? (
                  <div className="animate-fade-in">
                    <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-[2rem] flex items-center gap-6 shadow-lg">
                      <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg">
                        <CheckCircle size={32} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Registro Exitoso</p>
                        <p className="text-xl font-black text-slate-800 truncate uppercase tracking-tight">{lastDetectedPerson.nombre} {lastDetectedPerson.apellido}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">Enfoque el código QR dentro del recuadro</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      )}

      {/* --- STUDENT MODAL - RESTRUCTURED PROFESSIONAL DESIGN --- */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-slide-up border border-white/20">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest">{editingStudent ? 'Actualizar Registro' : 'Nuevo Registro'}</h2>
                <p className="text-blue-100 text-[10px] font-bold uppercase mt-1">Diligencie los campos para {activeConfig.siteName}</p>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 md:p-10 space-y-6 md:space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {/* Section 1: Identity */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">1. Cargo (Rol)</label>
                  <select name="rol" defaultValue={editingStudent?.rol || 'Estudiante'} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-blue-800 text-lg appearance-none shadow-sm transition-all outline-none">
                    <option value="Estudiante">Estudiante</option>
                    <option value="Docente">Docente</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">2. DNI / Identificación</label>
                  <input name="dni" defaultValue={editingStudent?.dni} required placeholder="Número de DNI" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black font-mono text-xl shadow-sm transition-all outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">3. Nombres</label>
                  <input name="nombre" defaultValue={editingStudent?.nombre} required placeholder="Nombres del titular" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm transition-all outline-none" />
                </div>

                {/* Section 2: Personal Details */}
                <div className="space-y-3 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">4. Apellidos Completos</label>
                  <input name="apellido" defaultValue={editingStudent?.apellido} required placeholder="Apellidos paterno y materno" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm transition-all outline-none" />
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">5. Nivel</label>
                  <select name="nivel" defaultValue={editingStudent?.nivel || 'Primaria'} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm appearance-none outline-none">
                    {levels.map(lvl => (
                      <option key={lvl.id} value={lvl.nombre}>{lvl.nombre}</option>
                    ))}
                    <option value="Docente">Docente</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">6. Grado / Aula</label>
                  <select name="grado" defaultValue={editingStudent?.grado} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm appearance-none outline-none">
                    {gradeLevels.map(gl => (
                      <option key={gl.id} value={gl.nombre}>{gl.nombre}</option>
                    ))}
                    {!gradeLevels.length && <option value="">No hay grados registrados</option>}
                  </select>
                </div>

                {/* Section 3: More Details */}
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">7. Sección</label>
                  <select name="seccion" defaultValue={editingStudent?.seccion || 'A'} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm appearance-none outline-none">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">7. Celular Apoderado (Opcional)</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="celularApoderado" defaultValue={editingStudent?.celularApoderado} placeholder="999 999 999" className="w-full pl-12 p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">8. Correo Electrónico (Opcional)</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="email" type="email" defaultValue={editingStudent?.email} placeholder="ejemplo@correo.com" className="w-full pl-12 p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm outline-none" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">9. Turno (Opcional)</label>
                  <select name="turno" defaultValue={editingStudent?.turno || 'Mañana'} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm appearance-none outline-none">
                    {shifts.map(s => (
                      <option key={s.id} value={s.nombre}>{s.nombre}</option>
                    ))}
                    {!shifts.length && (
                      <>
                        <option value="Mañana">Mañana</option>
                        <option value="Tarde">Tarde</option>
                        <option value="Noche">Noche</option>
                      </>
                    )}
                    <option value="Sin asignar">Sin asignar</option>
                  </select>
                </div>

                {/* Personalization Section */}
                <div className="space-y-3 md:col-span-3 pt-6 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-4">Personalización de Fotocheck (Opcional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Nombre del Sitio (Personalizado)</label>
                      <input name="siteName" defaultValue={editingStudent?.siteName} placeholder="Ej. I.E. San Juan Bautista" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm outline-none" />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Slogan (Personalizado)</label>
                      <input name="slogan" defaultValue={editingStudent?.slogan} placeholder="Ej. Educación de Calidad" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg shadow-sm outline-none" />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Logo Institucional (Personalizado)</label>
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                          {editingStudent?.logo ? <img src={editingStudent.logo} className="w-full h-full object-contain p-2" /> : <Upload className="text-slate-300" />}
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (editingStudent) {
                                  setEditingStudent({ ...editingStudent, logo: ev.target?.result as string });
                                }
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                        >
                          Subir Logo para este Estudiante
                        </button>
                        {editingStudent?.logo && (
                          <button 
                            type="button"
                            onClick={() => setEditingStudent({ ...editingStudent, logo: undefined })}
                            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                          >
                            Eliminar Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6 pt-10 border-t border-slate-100">
                <button type="button" onClick={() => setIsStudentModalOpen(false)} className="flex-1 py-6 rounded-[2rem] border-4 border-slate-50 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-sm transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-6 rounded-[2rem] bg-blue-600 text-white font-black shadow-2xl hover:bg-blue-700 uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3">
                   <Save size={20} /> {editingStudent ? 'Actualizar Registro' : 'Completar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- USER MODAL --- */}
      {/* --- PANEL MODALS --- */}
      {panelModalType === 'level' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Nuevo Nivel</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const nombre = e.target.nombre.value;
              if(nombre) {
                setLevels([...levels, { id: Date.now().toString(), nombre }]);
                setPanelModalType(null);
              }
            }} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Nivel</label>
                <input name="nombre" required placeholder="Ej. Primaria" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">Guardar Nivel</button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'grade' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Nuevo Grado</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const nombre = e.target.nombre.value;
              const seccion = e.target.seccion.value;
              const nivelId = e.target.nivelId.value;
              if(nombre && seccion && nivelId) {
                setGradeLevels([...gradeLevels, { id: Date.now().toString(), nombre, seccion, nivelId }]);
                setPanelModalType(null);
              }
            }} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Grado</label>
                <input name="nombre" required placeholder="Ej. 1er Grado" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Sección</label>
                  <select name="seccion" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none appearance-none">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nivel Académico</label>
                  <select name="nivelId" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none appearance-none">
                    {levels.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">Crear Grado desde Cero</button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'shift' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">{editingShift ? 'Editar Turno' : 'Configurar Turno'}</h2>
              <button onClick={() => { setPanelModalType(null); setEditingShift(null); }} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const nombre = e.target.nombre.value;
              const em = e.target.em.value;
              const sm = e.target.sm.value;
              const et = e.target.et.value;
              const st = e.target.st.value;
              if(nombre && em && sm) {
                if(editingShift) {
                  setShifts(shifts.map(s => s.id === editingShift.id ? { ...s, nombre, entradaMañana: em, salidaMañana: sm, entradaTarde: et || '-', salidaTarde: st || '-' } : s));
                  setToast({ message: "Turno actualizado", type: 'success' });
                } else {
                  setShifts([...shifts, { id: Date.now().toString(), nombre, entradaMañana: em, salidaMañana: sm, entradaTarde: et || '-', salidaTarde: st || '-' }]);
                  setToast({ message: "Turno creado", type: 'success' });
                }
                setPanelModalType(null);
                setEditingShift(null);
              }
            }} className="p-6 md:p-10 space-y-6 md:space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Turno</label>
                <input name="nombre" required defaultValue={editingShift?.nombre || ''} placeholder="Ej. Mañana / Tarde / Completo" className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base md:text-lg outline-none transition-all" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-4 p-4 md:p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Horario Mañana</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="em" required defaultValue={editingShift?.entradaMañana || ''} placeholder="Ingreso" className="w-full p-3 md:p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none" />
                    <input name="sm" required defaultValue={editingShift?.salidaMañana || ''} placeholder="Salida" className="w-full p-3 md:p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-4 p-4 md:p-6 rounded-3xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Horario Tarde</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="et" defaultValue={editingShift?.entradaTarde || ''} placeholder="Ingreso" className="w-full p-3 md:p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none" />
                    <input name="st" defaultValue={editingShift?.salidaTarde || ''} placeholder="Salida" className="w-full p-3 md:p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-indigo-700 transition-all">
                {editingShift ? 'Actualizar Turno' : 'Guardar Configuración de Turno'}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'schedule' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up border border-white/20">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white sticky top-0 z-10">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest">Nuevo Horario</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-6 md:p-8">
              <form onSubmit={(e: any) => {
                e.preventDefault();
                const type = e.target.type.value;
                const dia = e.target.dia.value;
                const inicio = e.target.inicio.value;
                const fin = e.target.fin.value;
                const materia = e.target.materia?.value;
                if(type && dia && inicio && fin) {
                  setSchedules([...schedules, { id: Date.now().toString(), targetId: 'global', type, dia, inicio, fin, materia }]);
                  setPanelModalType(null);
                }
              }} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Horario</label>
                  <select name="type" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none appearance-none">
                    <option value="clase">Clase Académica</option>
                    <option value="laboral">Jornada Laboral</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Día de la Semana</label>
                  <select name="dia" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none appearance-none">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Inicio</label>
                    <input name="inicio" type="time" required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fin</label>
                    <input name="fin" type="time" required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Materia / Actividad</label>
                  <input name="materia" placeholder="Ej. Matemáticas" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none" />
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all">Registrar en Horario</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {panelModalType === 'profile' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Editar Perfil</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const fullName = e.target.fullName.value;
              const email = e.target.email.value;
              const whatsapp = e.target.whatsapp.value;
              const password = e.target.password.value;
              
              if(currentUser) {
                const updatedUser = { ...currentUser, fullName, email, whatsapp, password };
                setCurrentUser(updatedUser);
                setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
                setPanelModalType(null);
                alert("Perfil actualizado correctamente.");
              }
            }} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo</label>
                <input name="fullName" defaultValue={currentUser?.fullName} required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico</label>
                <input name="email" type="email" defaultValue={currentUser?.email} required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp</label>
                <input name="whatsapp" defaultValue={currentUser?.whatsapp} required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nueva Contraseña</label>
                <input name="password" type="text" defaultValue={currentUser?.password} required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
              </div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'report' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Registrar Reporte</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const message = e.target.message.value;
              if(message && currentUser) {
                const newNotif: AppNotification = {
                  id: Date.now().toString(),
                  userId: currentUser.id,
                  username: currentUser.username,
                  message,
                  date: new Date().toLocaleString(),
                  type: 'report'
                };
                setNotifications([newNotif, ...notifications]);
                setPanelModalType(null);
                alert("Reporte registrado y enviado a notificaciones.");
              }
            }} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Mensaje / Incidencia</label>
                <textarea name="message" required rows={4} placeholder="Describa el reporte o mensaje aquí..." className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 outline-none transition-all resize-none" />
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all">Enviar Reporte</button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'siteConfig' && (() => {
        const rawTargetConfig = configTargetUser ? (configTargetUser.config || globalConfig) : globalConfig;
        const targetConfig = {
          ...globalConfig,
          ...rawTargetConfig,
          theme: {
            ...globalConfig.theme,
            ...(rawTargetConfig.theme || {})
          }
        };
        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
            <div className="bg-white rounded-[2rem] md:rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border-4 md:border-8 border-white">
              <div className="p-6 md:p-10 text-white flex justify-between items-center" style={{ backgroundColor: targetConfig.theme.primaryColor }}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="p-2 md:p-3 bg-white/10 rounded-xl md:rounded-2xl border border-white/10"><Palette size={20} /></div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-black uppercase tracking-widest leading-tight">{configTargetUser ? 'Personalizar Usuario' : 'Personalizar Sitio'}</h2>
                    <p className="text-white/60 text-[8px] md:text-[10px] font-bold uppercase mt-1">{configTargetUser ? (configTargetUser.fullName || configTargetUser.username) : 'Configuración Global'}</p>
                  </div>
                </div>
                <button onClick={() => { setPanelModalType(null); setConfigTargetUser(null); }} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
              </div>
              
              <div className="p-6 md:p-10 space-y-6 md:space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Site Name and Slogan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                    <input 
                      type="text"
                      value={targetConfig.siteName}
                      onChange={(e) => {
                        if(configTargetUser) {
                          const updatedUsers = users.map(u => {
                            if(u.id === configTargetUser.id) {
                              const updated = { ...u, config: { ...(u.config || globalConfig), siteName: e.target.value } };
                              if(currentUser?.id === u.id) setCurrentUser(updated);
                              return updated;
                            }
                            return u;
                          });
                          setUsers(updatedUsers);
                          setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                        } else {
                          setGlobalConfig({ ...globalConfig, siteName: e.target.value });
                        }
                      }}
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Slogan</label>
                    <input 
                      type="text"
                      value={targetConfig.slogan || ''}
                      onChange={(e) => {
                        if(configTargetUser) {
                          const updatedUsers = users.map(u => {
                            if(u.id === configTargetUser.id) {
                              const updated = { ...u, config: { ...(u.config || globalConfig), slogan: e.target.value } };
                              if(currentUser?.id === u.id) setCurrentUser(updated);
                              return updated;
                            }
                            return u;
                          });
                          setUsers(updatedUsers);
                          setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                        } else {
                          setGlobalConfig({ ...globalConfig, slogan: e.target.value });
                        }
                      }}
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" 
                    />
                  </div>
                </div>

                {/* Logo Section */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Logo Institucional</label>
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                      {targetConfig.logo ? (
                        <img src={targetConfig.logo} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Upload className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = (e: any) => {
                            const file = e.target.files[0];
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if(configTargetUser) {
                                const updatedUsers = users.map(u => {
                                  if(u.id === configTargetUser.id) {
                                    const updated = { ...u, config: { ...(u.config || globalConfig), logo: ev.target?.result as string } };
                                    if(currentUser?.id === u.id) setCurrentUser(updated);
                                    return updated;
                                  }
                                  return u;
                                });
                                setUsers(updatedUsers);
                                setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                              } else {
                                setGlobalConfig({ ...globalConfig, logo: ev.target?.result as string });
                              }
                            };
                            reader.readAsDataURL(file);
                          };
                          input.click();
                        }}
                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                      >
                        Subir Logo
                      </button>
                      <button 
                        onClick={() => {
                          if(configTargetUser) {
                            const updatedUsers = users.map(u => {
                              if(u.id === configTargetUser.id) {
                                const { logo, ...restConfig } = u.config || {};
                                const updated = { ...u, config: restConfig as UserConfig };
                                if(currentUser?.id === u.id) setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                          } else {
                            setGlobalConfig({ ...globalConfig, logo: undefined });
                          }
                        }}
                        className="px-6 py-3 border-2 border-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                      >
                        Restablecer Default
                      </button>
                    </div>
                  </div>
                </div>

                {/* Themes Palette */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Temas Predeterminados</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {PREDEFINED_THEMES.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => {
                          if(configTargetUser) {
                            const updatedUsers = users.map(u => {
                              if(u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    theme: {
                                      ...(u.config?.theme || globalConfig.theme),
                                      primaryColor: theme.primary,
                                      secondaryColor: theme.secondary
                                    }
                                  }
                                };
                                if(currentUser?.id === u.id) setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                          } else {
                            setGlobalConfig({
                              ...globalConfig,
                              theme: { ...globalConfig.theme, primaryColor: theme.primary, secondaryColor: theme.secondary }
                            });
                          }
                        }}
                        className="p-3 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all text-left"
                      >
                        <div className="flex gap-1 mb-2">
                          <div className="w-full h-3 rounded-full" style={{ backgroundColor: theme.primary }}></div>
                          <div className="w-full h-3 rounded-full" style={{ backgroundColor: theme.secondary }}></div>
                        </div>
                        <p className="text-[8px] font-black text-slate-500 uppercase truncate">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Primario</label>
                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <input 
                        type="color" 
                        value={targetConfig.theme.primaryColor} 
                        onChange={(e) => {
                          if(configTargetUser) {
                            const updatedUsers = users.map(u => {
                              if(u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    theme: { ...(u.config?.theme || globalConfig.theme), primaryColor: e.target.value }
                                  }
                                };
                                if(currentUser?.id === u.id) setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                          } else {
                            setGlobalConfig({ ...globalConfig, theme: { ...globalConfig.theme, primaryColor: e.target.value } });
                          }
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">{targetConfig.theme.primaryColor}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Secundario</label>
                    <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                      <input 
                        type="color" 
                        value={targetConfig.theme.secondaryColor} 
                        onChange={(e) => {
                          if(configTargetUser) {
                            const updatedUsers = users.map(u => {
                              if(u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    theme: { ...(u.config?.theme || globalConfig.theme), secondaryColor: e.target.value }
                                  }
                                };
                                if(currentUser?.id === u.id) setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(updatedUsers.find(u => u.id === configTargetUser.id) || null);
                          } else {
                            setGlobalConfig({ ...globalConfig, theme: { ...globalConfig.theme, secondaryColor: e.target.value } });
                          }
                        }}
                        className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                      />
                      <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">{targetConfig.theme.secondaryColor}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setPanelModalType(null);
                    setConfigTargetUser(null);
                    setToast({ message: "Configuración guardada correctamente.", type: 'success' });
                  }}
                  className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-black transition-all"
                >
                  Cerrar y Aplicar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {editingAttendance && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Editar Asistencia</h2>
                <p className="text-blue-100 text-[10px] font-bold uppercase mt-1">{editingAttendance.studentName}</p>
              </div>
              <button onClick={() => setEditingAttendance(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleUpdateAttendance} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estado</label>
                <select 
                  name="estado" 
                  defaultValue={editingAttendance.estado}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none appearance-none"
                >
                  <option value="entrada">Entrada</option>
                  <option value="tardanza">Tardanza</option>
                  <option value="salida">Salida</option>
                  <option value="permiso">Permiso</option>
                  <option value="ausente">Falta</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hora Ingreso</label>
                  <input 
                    name="horaEntrada" 
                    type="text" 
                    defaultValue={editingAttendance.horaEntrada || ''} 
                    placeholder="--:--:--"
                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Hora Salida</label>
                  <input 
                    name="horaSalida" 
                    type="text" 
                    defaultValue={editingAttendance.horaSalida || ''} 
                    placeholder="--:--:--"
                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fecha</label>
                <input 
                  name="fecha" 
                  type="text" 
                  defaultValue={editingAttendance.fecha} 
                  required
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none" 
                />
              </div>

              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all">
                Actualizar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {editingIncidence && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-red-600 text-white">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">Editar Incidencia</h2>
                <p className="text-red-100 text-[10px] font-bold uppercase mt-1">{editingIncidence.studentName}</p>
              </div>
              <button onClick={() => setEditingIncidence(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const updated = incidences.map(i => i.id === editingIncidence.id ? { 
                ...i, 
                type: formData.get('type') as string,
                severity: formData.get('severity') as IncidenceSeverity,
                status: formData.get('status') as IncidenceStatus,
                description: formData.get('description') as string
              } : i);
              setIncidences(updated);
              setEditingIncidence(null);
              setToast({ message: "Incidencia actualizada.", type: 'success' });
            }} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Incidencia</label>
                  <select name="type" defaultValue={editingIncidence.type} required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all">
                    {incidenceTypes.map(type => (
                      <option key={type.id} value={type.name}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Estado de Seguimiento</label>
                  <select name="status" defaultValue={editingIncidence.status} required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all">
                    <option value="registrada">Registrada</option>
                    <option value="en evaluación">En Evaluación</option>
                    <option value="en seguimiento">En Seguimiento</option>
                    <option value="resuelta">Resuelta</option>
                    <option value="escalada a un caso mayor">Escalada</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nivel de Gravedad</label>
                <div className="flex gap-2">
                  {['leve', 'moderado', 'grave'].map((sev) => (
                    <label key={sev} className="flex-1">
                      <input type="radio" name="severity" value={sev} defaultChecked={editingIncidence.severity === sev} required className="hidden peer" />
                      <div className={`text-center p-4 rounded-2xl border-2 border-slate-100 cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600 hover:bg-slate-50`}>
                        {sev}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Descripción</label>
                <textarea name="description" defaultValue={editingIncidence.description} required rows={4} className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all resize-none" />
              </div>
              <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-700 transition-all">Guardar Cambios</button>
            </form>
          </div>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden animate-slide-up border border-white/20 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <div>
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase mt-1 md:mt-2">Gestión de credenciales y datos personales</p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="hover:bg-white/20 p-2 md:p-4 rounded-full transition-all"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 md:p-10 space-y-4 md:space-y-6 bg-white overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre de Usuario</label>
                  <input name="username" defaultValue={editingUser?.username} required placeholder="Ej. admin_stnj" className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="password" type="text" defaultValue={editingUser?.password} required placeholder="Clave de acceso" className="w-full pl-10 md:pl-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombres Completos</label>
                  <input name="fullName" defaultValue={editingUser?.fullName} placeholder="Nombre y Apellidos" className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="whatsapp" defaultValue={editingUser?.whatsapp} placeholder="999 999 999" className="w-full pl-10 md:pl-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="email" type="email" defaultValue={editingUser?.email} placeholder="ejemplo@stnj.com" className="w-full pl-10 md:pl-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol del Usuario</label>
                  <select name="role" defaultValue={editingUser?.role || 'staff'} className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg appearance-none outline-none">
                    <option value="admin">Administrador (Master)</option>
                    <option value="staff">Personal (Staff)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-[10px] md:text-xs transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-[10px] md:text-xs transition-all">
                   {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFotocheckOpen && selectedStudentForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
          <div ref={cardRef} className={`bg-white p-0 flex flex-col items-center animate-slide-up shadow-2xl relative overflow-hidden border-[4px] rounded-2xl ${selectedStudentForId.rol === 'Docente' ? 'border-emerald-900' : 'border-slate-900'}`} 
               style={{ width: '5.4cm', height: '8.6cm', minWidth: '5.4cm', minHeight: '8.6cm' }}>
            
            {/* Decorative Institutional Border */}
            <div className={`absolute inset-0 border-[1px] pointer-events-none rounded-[1.2rem] ${selectedStudentForId.rol === 'Docente' ? 'border-emerald-600/20' : 'border-blue-600/20'}`}></div>
            
            {/* Close Button (UI only, not part of the card) */}
            <button data-ignore="true" onClick={handleCloseFotocheck} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 z-30 bg-white/90 p-1.5 rounded-full border border-slate-200 transition-all print:hidden shadow-sm">
              <X size={18}/>
            </button>

            {/* 1. Header: Institution Name (Title) */}
            <div className={`w-full text-white py-2 px-3 text-center border-b-[3px] relative flex items-center justify-center gap-2 ${selectedStudentForId.rol === 'Docente' ? 'bg-emerald-900 border-emerald-600' : 'bg-slate-900 border-blue-600'}`}>
              <div className={`absolute top-0 left-0 w-full h-1 ${selectedStudentForId.rol === 'Docente' ? 'bg-emerald-400/30' : 'bg-blue-400/30'}`}></div>
              {(selectedStudentForId.logo || activeConfig.logo) && (
                <img src={selectedStudentForId.logo || activeConfig.logo} className="w-6 h-6 object-contain" alt="Logo" />
              )}
              <h1 className="font-black text-[9px] uppercase tracking-tighter leading-tight drop-shadow-sm">
                {selectedStudentForId.siteName || activeConfig.siteName}
              </h1>
            </div>

            <div className={`flex-1 w-full flex flex-col items-center justify-start pt-1 pb-1 px-4 bg-gradient-to-b from-white ${selectedStudentForId.rol === 'Docente' ? 'to-emerald-50/50' : 'to-slate-50/50'} space-y-1`}>
              {/* 2. Photograph */}
              <div className="relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                <div className={`w-20 h-20 bg-white rounded-xl flex items-center justify-center overflow-hidden border-[2px] shadow-lg relative z-10 ${selectedStudentForId.rol === 'Docente' ? 'border-emerald-100' : 'border-slate-200'}`}>
                  {selectedStudentForId.foto ? (
                    <img src={selectedStudentForId.foto} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-slate-300">
                      <ImageIcon size={48} className="opacity-20" />
                      <span className="text-[10px] font-black uppercase tracking-widest mt-2">Subir Foto</span>
                    </div>
                  )}
                </div>
                
                {/* Photo Actions (UI only) */}
                <div data-ignore="true" className="absolute -bottom-2 -right-2 flex gap-1.5 print:hidden z-20">
                  <div className={`${selectedStudentForId.rol === 'Docente' ? 'bg-emerald-600' : 'bg-blue-600'} text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform`}>
                    <Camera size={16} />
                  </div>
                  {selectedStudentForId.foto && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForId({ ...selectedStudentForId, foto: undefined });
                        setHasChanges(true);
                      }}
                      className="bg-rose-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-rose-700 hover:scale-110 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => handlePhotoUpload(e)} />
              </div>

              {/* 3. Name and Surname */}
              <div className="text-center w-full space-y-0.5">
                <h3 className="text-[14px] font-black text-slate-900 uppercase leading-tight tracking-tight">
                  {selectedStudentForId.nombre}
                </h3>
                <p className={`text-[12px] font-bold uppercase leading-tight tracking-tight ${selectedStudentForId.rol === 'Docente' ? 'text-emerald-600' : 'text-blue-600'}`}>
                  {selectedStudentForId.apellido}
                </p>
              </div>

              {/* 4. Aula / Cargo */}
              <div className="text-center w-full">
                <div className={`inline-block px-4 py-1 rounded-lg text-[8px] font-black uppercase border tracking-wider shadow-sm ${selectedStudentForId.rol === 'Docente' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {selectedStudentForId.rol === 'Docente' ? 'PERSONAL DOCENTE' : `Aula: ${selectedStudentForId.grado} "${selectedStudentForId.seccion}"`}
                </div>
              </div>

              {/* 5. QR Code (Large and Visible) */}
              <div className="flex flex-col items-center">
                <div className={`bg-white p-1 rounded-xl border-2 shadow-inner ${selectedStudentForId.rol === 'Docente' ? 'border-emerald-100' : 'border-slate-100'}`}>
                  {currentQRCode ? (
                    <img src={currentQRCode} className="w-20 h-20" alt="QR Code" />
                  ) : (
                    <div className="w-20 h-20 bg-slate-50 animate-pulse rounded-lg" />
                  )}
                </div>
              </div>

              {/* Slogan or Long Line */}
              <div className="w-full flex flex-col items-center pb-1">
                <div className={`w-full h-0.5 bg-gradient-to-r from-transparent to-transparent mb-0.5 ${selectedStudentForId.rol === 'Docente' ? 'via-emerald-200' : 'via-slate-200'}`}></div>
                <p className={`text-[5px] font-black uppercase tracking-[0.2em] italic text-center px-2 ${selectedStudentForId.rol === 'Docente' ? 'text-emerald-900' : 'text-blue-900'}`}>
                  "{selectedStudentForId.slogan || activeConfig.slogan || 'Educación con Valores y Tecnología'}"
                </p>
              </div>
            </div>

            {/* Print Button Overlay (UI only) */}
            <div data-ignore="true" className="absolute bottom-0 left-0 w-full p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 flex gap-2 print:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
              <button onClick={handleDownloadSingleJPG} className={`flex-1 py-4 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg uppercase text-[12px] tracking-widest active:scale-95 ${selectedStudentForId.rol === 'Docente' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                <Download size={18} /> Descargar JPG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black uppercase tracking-widest">Configurar Materia</h2>
              <button onClick={() => setEditingCourse(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre de la Materia</label>
                <input 
                  value={editingCourse.name}
                  onChange={(e) => setEditingCourse({...editingCourse, name: e.target.value})}
                  placeholder="Ej. Matemáticas" 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Docente Asignado</label>
                <select 
                  value={editingCourse.teacherId || ''}
                  onChange={(e) => setEditingCourse({...editingCourse, teacherId: e.target.value})}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-xs uppercase outline-none transition-all"
                >
                  <option value="">Sin Asignar</option>
                  {students.filter(s => s.rol === 'Docente').map(teacher => (
                    <option key={teacher.id} value={teacher.id}>{teacher.nombre} {teacher.apellido}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Distintivo</label>
                <div className="flex gap-3 flex-wrap">
                  {['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'].map(color => (
                    <button 
                      key={color}
                      onClick={() => setEditingCourse({...editingCourse, color})}
                      className={`w-10 h-10 rounded-full border-4 transition-all ${editingCourse.color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingCourse(null)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs transition-all">Cancelar</button>
                <button 
                  onClick={() => {
                    if(editingCourse.name) {
                      const exists = courses.find(c => c.id === editingCourse.id);
                      if(exists) {
                        setCourses(courses.map(c => c.id === editingCourse.id ? editingCourse : c));
                      } else {
                        setCourses([...courses, editingCourse]);
                      }
                      setEditingCourse(null);
                      setToast({ message: "Materia guardada", type: 'success' });
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-xs transition-all"
                >Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Modal */}
      {editingTimeSlot && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black uppercase tracking-widest">Configurar Hora</h2>
              <button onClick={() => setEditingTimeSlot(null)} className="hover:bg-white/20 p-2 rounded-full transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Inicio</label>
                  <input 
                    type="time"
                    value={editingTimeSlot.start}
                    onChange={(e) => setEditingTimeSlot({...editingTimeSlot, start: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fin</label>
                  <input 
                    type="time"
                    value={editingTimeSlot.end}
                    onChange={(e) => setEditingTimeSlot({...editingTimeSlot, end: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setEditingTimeSlot(null)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs transition-all">Cancelar</button>
                <button 
                  onClick={() => {
                    const exists = timeSlots.find(s => s.id === editingTimeSlot.id);
                    if(exists) {
                      setTimeSlots(timeSlots.map(s => s.id === editingTimeSlot.id ? editingTimeSlot : s).sort((a,b) => a.start.localeCompare(b.start)));
                    } else {
                      setTimeSlots([...timeSlots, editingTimeSlot].sort((a,b) => a.start.localeCompare(b.start)));
                    }
                    setEditingTimeSlot(null);
                    setToast({ message: "Horario guardado", type: 'success' });
                  }}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-xs transition-all"
                >Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-rose-600 border-rose-400 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <p className="font-black uppercase tracking-widest text-[10px]">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Sub-components ---
const StatCards = ({ studentsCount, teachersCount, grades, todayAttendance, consultationLogs, activeConfig }: any) => {
  const today = new Date().toISOString().split('T')[0];
  const todayConsultations = consultationLogs.filter((l: any) => l.date === today).length;
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
      <StatCard title="Estudiantes" value={studentsCount} icon={Users} color="blue" activeConfig={activeConfig} />
      <StatCard title="Docentes" value={teachersCount} icon={GraduationCap} color="indigo" activeConfig={activeConfig} />
      <StatCard title="Promedio" value={(grades.reduce((a: any, b: any) => a + b.nota, 0) / (grades.length || 1)).toFixed(1)} icon={Award} color="amber" activeConfig={activeConfig} />
      <StatCard title="Asistencia" value={todayAttendance.length} icon={CheckCircle} color="emerald" activeConfig={activeConfig} />
      <StatCard title="Consultas" value={todayConsultations} icon={Search} color="blue" activeConfig={activeConfig} />
    </div>
  );
};

const StatCardsAttendance = ({ statsAtt }: any) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-white p-6 rounded-3xl shadow-md border border-emerald-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
        <div className="flex justify-center mb-2 relative z-10">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
            <UserCheck size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-emerald-600 relative z-10">{statsAtt.presentes}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Entrada</p>
        <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-600">
          <UserCheck size={60} />
        </div>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-amber-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
        <div className="flex justify-center mb-2 relative z-10">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-amber-600 relative z-10">{statsAtt.tardanzas}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Tardanzas</p>
        <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-600">
          <Clock size={60} />
        </div>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-blue-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
        <div className="flex justify-center mb-2 relative z-10">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
            <LogOutIcon size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-blue-600 relative z-10">{statsAtt.salidas}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Salidas</p>
        <div className="absolute -right-2 -bottom-2 opacity-5 text-blue-600">
          <LogOutIcon size={60} />
        </div>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-indigo-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
        <div className="flex justify-center mb-2 relative z-10">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
            <FileText size={20} />
          </div>
        </div>
        <p className="text-2xl font-black text-indigo-600 relative z-10">{statsAtt.permisos}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">Permisos</p>
        <div className="absolute -right-2 -bottom-2 opacity-5 text-indigo-600">
          <FileText size={60} />
        </div>
    </div>
  </div>
);

const ConsultationAnalytics = ({ logs }: { logs: ConsultationLog[] }) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Daily data (today)
  const todayLogs = logs.filter(l => l.date === today);
  const dailyData = useMemo(() => {
    const counts: Record<string, number> = {};
    todayLogs.forEach(l => {
      const key = `${l.grado} ${l.seccion}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [todayLogs]);

  // Weekly data
  const weeklyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    
    const weekLogs = logs.filter(l => last7Days.includes(l.date));
    
    const levelCounts: Record<string, number> = {};
    const gradeCounts: Record<string, number> = {};
    
    weekLogs.forEach(l => {
      levelCounts[l.nivel] = (levelCounts[l.nivel] || 0) + 1;
      gradeCounts[l.grado] = (gradeCounts[l.grado] || 0) + 1;
    });
    
    const sortedLevels = Object.entries(levelCounts).sort((a,b) => (b[1] as number) - (a[1] as number));
    const sortedGrades = Object.entries(gradeCounts).sort((a,b) => (b[1] as number) - (a[1] as number));
    
    return {
      levels: sortedLevels,
      grades: sortedGrades,
      total: weekLogs.length
    };
  }, [logs]);

  const COLORS = ['#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Consultas de Hoy</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Actividad por Grado y Sección</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {dailyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                <Search size={40} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">Sin actividad hoy</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Resumen Semanal</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Tendencias de Búsqueda</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nivel más consultado</p>
                {weeklyData.levels[0] ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">{weeklyData.levels[0][0]}</p>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-black">{weeklyData.levels[0][1]}</span>
                  </div>
                ) : <p className="text-xs font-bold text-slate-300 italic">Sin datos</p>}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grado más consultado</p>
                {weeklyData.grades[0] ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">{weeklyData.grades[0][0]}</p>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black">{weeklyData.grades[0][1]}</span>
                  </div>
                ) : <p className="text-xs font-bold text-slate-300 italic">Sin datos</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Nivel menos consultado</p>
                {weeklyData.levels.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">{weeklyData.levels[weeklyData.levels.length - 1][0]}</p>
                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">{weeklyData.levels[weeklyData.levels.length - 1][1]}</span>
                  </div>
                ) : <p className="text-xs font-bold text-slate-300 italic">Sin datos</p>}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Grado menos consultado</p>
                {weeklyData.grades.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">{weeklyData.grades[weeklyData.grades.length - 1][0]}</p>
                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">{weeklyData.grades[weeklyData.grades.length - 1][1]}</span>
                  </div>
                ) : <p className="text-xs font-bold text-slate-300 italic">Sin datos</p>}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Consultas (7d)</p>
            <p className="text-2xl font-black text-slate-800">{weeklyData.total}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, activeConfig }: { title: string, value: any, icon: any, color: string, activeConfig: any }) => {
  const colors: any = {
    blue: { bg: 'bg-blue-600', text: 'text-blue-600', shadow: 'shadow-blue-100', light: 'bg-blue-50' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-600', shadow: 'shadow-amber-100', light: 'bg-amber-50' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-600', shadow: 'shadow-emerald-100', light: 'bg-emerald-50' },
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-600', shadow: 'shadow-indigo-100', light: 'bg-indigo-50' }
  };
  const c = colors[color] || colors.blue;
  
  return (
    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${c.light} ${c.text} group-hover:scale-110 transition-transform duration-500`}>
          <Icon size={24} />
        </div>
        <div className="w-2 h-2 rounded-full bg-slate-100"></div>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{value}</p>
        <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{title}</p>
      </div>
      {/* Decorative background icon */}
      <div className={`absolute -right-4 -bottom-4 opacity-5 ${c.text} group-hover:scale-125 transition-transform duration-700`}>
        <Icon size={100} />
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: AttendanceStatus }) => {
  const cfg = {
    entrada: { label: 'Entrada', class: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    tardanza: { label: 'Tardanza', class: 'bg-amber-50 text-amber-700 border-amber-100' },
    ausente: { label: 'Falta', class: 'bg-rose-50 text-rose-700 border-rose-100' },
    salida: { label: 'Salida', class: 'bg-blue-50 text-blue-700 border-blue-100' },
    permiso: { label: 'Permiso', class: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  };
  const s = cfg[status] ? status : 'entrada';
  return (
    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${cfg[s].class}`}>
      {cfg[s].label}
    </span>
  );
};

const StatusButton = ({ status, active, onClick, icon: Icon }: { status: AttendanceStatus, active: boolean, onClick: () => void, icon: any }) => {
  const styles: any = {
    entrada: active ? 'bg-emerald-600 text-white shadow-md' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
    tardanza: active ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-500 hover:bg-amber-100',
    salida: active ? 'bg-blue-600 text-white shadow-md' : 'bg-blue-50 text-blue-600 hover:bg-blue-100',
    permiso: active ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
  };

  const labels: any = {
     entrada: 'Entrada',
     tardanza: 'Tardanza',
     salida: 'Salida',
     permiso: 'Permiso'
  };

  return (
    <button onClick={onClick} className={`p-3 rounded-xl font-black uppercase tracking-widest text-[8px] flex flex-col items-center gap-1.5 transition-all border border-transparent ${styles[status]}`}>
      <Icon size={16}/>
      {labels[status]}
    </button>
  );
}

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
