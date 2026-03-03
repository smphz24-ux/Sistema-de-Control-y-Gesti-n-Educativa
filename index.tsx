
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
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
      }
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'estudiantes' | 'asistencia' | 'calificaciones' | 'reportes' | 'mi-panel' | 'config'>('dashboard');
  const [activeConfigSubTab, setActiveConfigSubTab] = useState<'usuarios' | 'sistema'>('usuarios');
  const [activeReportSubTab, setActiveReportSubTab] = useState<'global' | 'personalizado'>('global');
  const [activePanelSubTab, setActivePanelSubTab] = useState<'perfil' | 'grados' | 'horarios'>('perfil');
  const [activeGradosSubTab, setActiveGradosSubTab] = useState<'niveles' | 'grados'>('niveles');
  const [activeHorariosSubTab, setActiveHorariosSubTab] = useState<'clases' | 'turnos'>('clases');
  const [panelModalType, setPanelModalType] = useState<'level' | 'grade' | 'shift' | 'schedule' | 'profile' | 'report' | 'siteConfig' | null>(null);
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
  const [aiReport, setAiReport] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const activeConfig = currentUser?.config || globalConfig;

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
    };
    
    if (sharedData.users.length === 0) {
      const defaultAdmin: AppUser = {
        id: 'admin-1',
        username: 'admin',
        password: '1234',
        role: 'admin',
        permissions: ['dashboard', 'estudiantes', 'asistencia', 'reportes', 'calificaciones', 'mi-panel', 'config', 'horarios']
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
  }, []);

  // Load user-specific data when currentUser changes
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const userData = JSON.parse(localStorage.getItem(`stnj_userdata_${currentUser.id}`) || 'null');
      if (userData) {
        setStudents(userData.students || []);
        setAttendance(userData.attendance || []);
        setGrades(userData.grades || []);
      } else {
        // New user or no data yet
        setStudents([]);
        setAttendance([]);
        setGrades([]);
      }
    } else {
      // Logged out
      setStudents([]);
      setAttendance([]);
      setGrades([]);
    }
  }, [isAuthenticated, currentUser]);

  // Save shared data
  useEffect(() => {
    localStorage.setItem('stnj_users_v10', JSON.stringify(users));
    localStorage.setItem('stnj_config_v10', JSON.stringify(globalConfig));
    localStorage.setItem('stnj_notifications_v10', JSON.stringify(notifications));
  }, [users, globalConfig, notifications]);

  // Save user-specific data
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const dataToSave = { students, attendance, grades };
      localStorage.setItem(`stnj_userdata_${currentUser.id}`, JSON.stringify(dataToSave));
    }
  }, [students, attendance, grades, isAuthenticated, currentUser]);

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

                    <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setReportSearchTerm("");
                          setReportClassFilter("");
                          setReportDateFilter(new Date().toISOString().split('T')[0]);
                          setReportRoleFilter("todos");
                        }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                      >
                        <RefreshCw size={16} /> Limpiar Filtros
                      </button>

                      <div className="flex-1"></div>

                      <div className="flex gap-2">
                        <label className="cursor-pointer flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-lg">
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
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg"
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
                          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-lg"
                        >
                          <FileText size={16} /> PDF
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200">
                    <table className="w-full text-left">
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
                activeConfig={activeConfig}
              />
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
              <div className="flex flex-wrap gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-md">
                <div className="flex flex-wrap gap-2">
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
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex items-center bg-slate-900 text-white px-5 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-widest gap-4">
                     <span className="flex items-center gap-2 text-blue-400"><Users size={14}/> {studentsCount} Alumnos</span>
                     <span className="w-px h-4 bg-slate-700"></span>
                     <span className="flex items-center gap-2 text-indigo-400"><GraduationCap size={14}/> {teachersCount} Docentes</span>
                  </div>
                  <button onClick={deleteAllStudents} className="bg-rose-600 text-white px-5 py-2 rounded-xl font-black hover:bg-rose-700 transition-all shadow-md uppercase tracking-widest text-[9px]">Eliminar Todo</button>
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
            <div className="animate-slide-up space-y-8">
               <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                   <h2 className="text-4xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                   <p className="text-slate-500 font-medium">Gestión de Asistencia - Control institucional en tiempo real.</p>
                 </div>
               </header>

               <StatCardsAttendance statsAtt={statsAtt} />

               <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-200 p-8 space-y-8">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="w-full md:w-auto space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Seleccionar Estado</label>
                        <div className="flex flex-wrap gap-2">
                          <StatusButton active={selectedQuickStatus === 'entrada'} onClick={() => setSelectedQuickStatus('entrada')} status="entrada" icon={UserCheck} />
                          <StatusButton active={selectedQuickStatus === 'tardanza'} onClick={() => setSelectedQuickStatus('tardanza')} status="tardanza" icon={Clock} />
                          <StatusButton active={selectedQuickStatus === 'salida'} onClick={() => setSelectedQuickStatus('salida')} status="salida" icon={LogOutIcon} />
                          <StatusButton active={selectedQuickStatus === 'permiso'} onClick={() => setSelectedQuickStatus('permiso')} status="permiso" icon={FileText} />
                        </div>
                     </div>

                     <div className="w-full md:w-auto space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 text-center md:text-right block">Método de Registro</label>
                        <div className="flex gap-4">
                           <button onClick={() => setIsDniModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-black transition-all transform hover:-translate-y-1">
                             <Keyboard size={20} /> Registro por DNI
                           </button>
                           <button onClick={startScanner} className="flex-1 md:flex-none flex items-center justify-center gap-4 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-blue-700 transition-all transform hover:-translate-y-1">
                             <Scan size={20} /> Escáner QR
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100 flex flex-wrap gap-4 items-center">
                  <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar en la bitácora..." className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-none focus:ring-4 focus:ring-blue-100 font-bold" value={attSearch} onChange={(e) => setAttSearch(e.target.value)} />
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">
                      Bitácora: {filteredAttendance.length}
                    </div>
                    <button 
                      onClick={clearAttendanceHistory}
                      className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                      title="Vaciar todo el historial"
                    >
                      <Trash2 size={16} /> Vaciar
                    </button>
                  </div>
               </div>

               <div className="bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">DNI</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Persona</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Rol</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Fecha</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest text-emerald-600">Ingreso</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest text-blue-600">Salida</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipo</th>
                        <th className="p-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredAttendance.map(record => (
                        <tr key={record.id} className="hover:bg-slate-50/50 transition-colors animate-fade-in group">
                          <td className="p-8 font-mono text-slate-500 font-bold">{record.studentDni}</td>
                          <td className="p-8 font-black text-slate-800 text-xl uppercase tracking-tighter truncate max-w-[200px]">{record.studentName}</td>
                          <td className="p-8">
                            <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase border ${record.studentRol === 'Docente' ? 'text-indigo-600 border-indigo-100' : 'text-blue-600 border-blue-100'}`}>
                              {record.studentRol}
                            </span>
                          </td>
                          <td className="p-8 text-[11px] font-bold text-slate-500">{record.fecha}</td>
                          <td className="p-8">
                            { record.horaEntrada ? (
                              <span className="font-mono text-lg font-black text-emerald-600">{record.horaEntrada}</span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                          <td className="p-8">
                            { record.horaSalida ? (
                              <span className="font-mono text-lg font-black text-blue-600">{record.horaSalida}</span>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                          <td className="p-8">
                             <StatusBadge status={record.estado} />
                          </td>
                          <td className="p-8">
                            <div className="flex gap-2">
                               <button onClick={() => setEditingAttendance(record)} className="p-3 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50">
                                 <Edit size={16} />
                               </button>
                               <button onClick={() => deleteAttendance(record.id)} className="p-3 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all bg-rose-50">
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

          {/* Calificaciones Section */}
          {activeTab === 'calificaciones' && (
            <div className="animate-slide-up space-y-8">
               <h2 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tighter text-center italic uppercase">{activeConfig.siteName}</h2>
               <div className="bg-white rounded-[2rem] md:rounded-[4rem] p-6 md:p-16 shadow-2xl border-t-8 border-t-blue-600 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-16">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Perfil</label>
                    <select className="w-full p-8 rounded-[2rem] bg-slate-50 border-none font-black text-slate-800 text-xl appearance-none shadow-inner" id="grade-student">
                      <option value="">-- Seleccionar --</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.nombre} {s.apellido} ({s.dni})</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Materia</label>
                    <select className="w-full p-8 rounded-[2rem] bg-slate-50 border-none font-black text-slate-800 text-xl appearance-none shadow-inner" id="grade-materia"><option>Matemáticas</option><option>Lenguaje</option><option>Ciencias</option><option>Historia</option></select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">Nota</label>
                    <input type="number" placeholder="00" className="w-full p-8 rounded-[2rem] bg-slate-50 border-none font-black text-center text-5xl text-blue-600 shadow-inner" id="grade-nota" min="0" max="20" />
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const sid = (document.getElementById('grade-student') as HTMLSelectElement).value;
                    const student = students.find(s => s.id === sid);
                    const mat = (document.getElementById('grade-materia') as HTMLSelectElement).value;
                    const notaInput = (document.getElementById('grade-nota') as HTMLInputElement);
                    const nota = parseFloat(notaInput.value);
                    if(student && !isNaN(nota)) {
                      setGrades([{ id: Date.now().toString(), studentId: student.id, studentName: `${student.nombre} ${student.apellido}`, materia: mat, nota, fecha: new Date().toLocaleDateString() }, ...grades]);
                      notaInput.value = '';
                    }
                  }}
                  className="w-full text-white py-10 rounded-[2.5rem] font-black text-3xl transition-all uppercase tracking-tighter shadow-2xl"
                  style={{ backgroundColor: activeConfig.theme.primaryColor }}
                >Registrar Nota</button>
               </div>
            </div>
          )}

          {/* Configuración Section */}
          {/* Mi Panel Section */}
          {activeTab === 'mi-panel' && (
            <div className="animate-slide-up space-y-8">
              <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-4xl font-black text-slate-800 tracking-tight">{activeConfig.siteName}</h2>
                  <p className="text-slate-500 font-medium">Mi Panel - Gestión de perfil, grados y horarios.</p>
                </div>
                <div className="flex flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 overflow-x-auto no-scrollbar">
                  <button 
                    onClick={() => setActivePanelSubTab('perfil')}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'perfil' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >Perfil</button>
                  <button 
                    onClick={() => setActivePanelSubTab('grados')}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'grados' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >Grados</button>
                  <button 
                    onClick={() => setActivePanelSubTab('horarios')}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === 'horarios' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >Horarios</button>
                </div>
              </header>

              {activePanelSubTab === 'perfil' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Profile Card */}
                  <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-slate-200 text-center relative overflow-hidden">
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

              {activePanelSubTab === 'horarios' && (
                <div className="space-y-8">
                  {currentUser?.permissions.includes('horarios') ? (
                    <>
                      <div className="flex justify-between items-center">
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Gestión de Horarios</h3>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            onClick={() => setActiveHorariosSubTab('clases')}
                            className={`px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeHorariosSubTab === 'clases' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Clases</button>
                          <button 
                            onClick={() => setActiveHorariosSubTab('turnos')}
                            className={`px-6 py-3 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${activeHorariosSubTab === 'turnos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >Turnos (Ingreso/Salida)</button>
                        </div>
                      </div>

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
                                  <button 
                                    onClick={() => {
                                      setShifts(shifts.filter(s => s.id !== shift.id));
                                      setToast({ message: "Turno eliminado", type: 'success' });
                                    }}
                                    className="p-4 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl transition-all bg-rose-50"
                                  >
                                    <Trash2 size={20} />
                                  </button>
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
                <div className="flex bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
                  <button 
                    onClick={() => setActiveConfigSubTab('usuarios')}
                    className={`px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === 'usuarios' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Usuarios
                  </button>
                  <button 
                    onClick={() => setActiveConfigSubTab('sistema')}
                    className={`px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === 'sistema' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    Sistema
                  </button>
                </div>
              </header>

              {activeConfigSubTab === 'usuarios' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                      <Shield className="text-blue-600" /> Gestión de Usuarios
                    </h3>
                    <button 
                      onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest text-xs"
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
                            <div className="flex flex-wrap gap-2">
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
                  <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-100 space-y-10">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Palette size={24} /></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase">Personalización Global</h3>
                      <button 
                        onClick={() => setPanelModalType('siteConfig')}
                        className="ml-auto px-6 py-3 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-12 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-widest">{editingStudent ? 'Actualizar Registro' : 'Nuevo Registro'}</h2>
                <p className="text-blue-100 text-xs font-bold uppercase mt-2">Diligencie todos los campos para el sistema {activeConfig.siteName}</p>
              </div>
              <button onClick={() => setIsStudentModalOpen(false)} className="hover:bg-white/20 p-4 rounded-full transition-all"><X size={32} /></button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-12 space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Configurar Turno</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={(e: any) => {
              e.preventDefault();
              const nombre = e.target.nombre.value;
              const em = e.target.em.value;
              const sm = e.target.sm.value;
              const et = e.target.et.value;
              const st = e.target.st.value;
              if(nombre && em && sm) {
                setShifts([...shifts, { id: Date.now().toString(), nombre, entradaMañana: em, salidaMañana: sm, entradaTarde: et || '-', salidaTarde: st || '-' }]);
                setPanelModalType(null);
              }
            }} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Turno</label>
                <input name="nombre" required placeholder="Ej. Mañana / Tarde / Completo" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4 p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Horario Mañana</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="em" required placeholder="Ingreso" className="w-full p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none" />
                    <input name="sm" required placeholder="Salida" className="w-full p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none" />
                  </div>
                </div>
                <div className="space-y-4 p-6 rounded-3xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Horario Tarde</p>
                  <div className="grid grid-cols-2 gap-4">
                    <input name="et" placeholder="Ingreso" className="w-full p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none" />
                    <input name="st" placeholder="Salida" className="w-full p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none" />
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all">Guardar Configuración de Turno</button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === 'schedule' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">Nuevo Horario Académico</h2>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            <div className="p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Form Side */}
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
              }} className="lg:col-span-1 space-y-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo de Horario</label>
                  <select name="type" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none appearance-none">
                    <option value="clase">Clase Académica</option>
                    <option value="laboral">Jornada Laboral</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Día de la Semana</label>
                  <select name="dia" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none appearance-none">
                    {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Inicio</label>
                    <input name="inicio" type="time" required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Fin</label>
                    <input name="fin" type="time" required className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Materia / Actividad</label>
                  <input name="materia" placeholder="Ej. Matemáticas" className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-lg outline-none" />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all">Registrar en Horario</button>
              </form>

              {/* Visual Grid Side (Cuadro de Horario) */}
              <div className="lg:col-span-2 bg-slate-50 rounded-[3rem] p-8 border border-slate-100 overflow-hidden flex flex-col">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter mb-6 flex items-center gap-3">
                  <Calendar className="text-indigo-600" /> Vista Semanal de Horarios
                </h3>
                <div className="flex-1 overflow-auto">
                  <div className="min-w-[600px]">
                    <div className="grid grid-cols-8 gap-2 mb-4">
                      <div className="h-10"></div>
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {d}
                        </div>
                      ))}
                    </div>
                    {/* Simplified grid view */}
                    <div className="space-y-2">
                      {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(time => (
                        <div key={time} className="grid grid-cols-8 gap-2">
                          <div className="h-12 flex items-center justify-end pr-3 text-[10px] font-bold text-slate-400">{time}</div>
                          {[1, 2, 3, 4, 5, 6, 7].map(dayIndex => {
                            const dayName = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][dayIndex - 1];
                            const schAtTime = schedules.find(s => s.dia === dayName && s.inicio.startsWith(time.split(':')[0]));
                            return (
                              <div key={dayIndex} className={`h-12 rounded-xl border border-dashed flex items-center justify-center p-1 overflow-hidden ${schAtTime ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-200'}`}>
                                {schAtTime && (
                                  <div className="text-[8px] font-black uppercase leading-tight text-center truncate">
                                    {schAtTime.materia || schAtTime.type}
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

      {panelModalType === 'siteConfig' && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border-8 border-white">
            <div className="p-10 text-white flex justify-between items-center" style={{ backgroundColor: configTargetUser ? (configTargetUser.config?.theme.primaryColor || globalConfig.theme.primaryColor) : globalConfig.theme.primaryColor }}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10"><Palette size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-widest">{configTargetUser ? 'Personalizar Usuario' : 'Personalizar Sitio'}</h2>
                  <p className="text-white/60 text-[10px] font-bold uppercase mt-1">{configTargetUser ? (configTargetUser.fullName || configTargetUser.username) : 'Configuración Global'}</p>
                </div>
              </div>
              <button onClick={() => { setPanelModalType(null); setConfigTargetUser(null); }} className="hover:bg-white/20 p-3 rounded-full transition-all"><X size={24} /></button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Site Name and Slogan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                  <input 
                    type="text"
                    value={configTargetUser ? (configTargetUser.config?.siteName || globalConfig.siteName) : globalConfig.siteName}
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
                    value={configTargetUser ? (configTargetUser.config?.slogan || globalConfig.slogan) : globalConfig.slogan}
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
                    {(configTargetUser ? (configTargetUser.config?.logo || globalConfig.logo) : globalConfig.logo) ? (
                      <img src={configTargetUser ? (configTargetUser.config?.logo || globalConfig.logo) : globalConfig.logo} className="w-full h-full object-contain p-2" />
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
                      value={configTargetUser ? (configTargetUser.config?.theme.primaryColor || globalConfig.theme.primaryColor) : globalConfig.theme.primaryColor} 
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
                    <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">{configTargetUser ? (configTargetUser.config?.theme.primaryColor || globalConfig.theme.primaryColor) : globalConfig.theme.primaryColor}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Color Secundario</label>
                  <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <input 
                      type="color" 
                      value={configTargetUser ? (configTargetUser.config?.theme.secondaryColor || globalConfig.theme.secondaryColor) : globalConfig.theme.secondaryColor} 
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
                    <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">{configTargetUser ? (configTargetUser.config?.theme.secondaryColor || globalConfig.theme.secondaryColor) : globalConfig.theme.secondaryColor}</span>
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
      )}

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

      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-widest">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-2">Gestión de credenciales y datos personales</p>
              </div>
              <button onClick={() => setIsUserModalOpen(false)} className="hover:bg-white/20 p-4 rounded-full transition-all"><X size={24} /></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-10 space-y-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre de Usuario</label>
                  <input name="username" defaultValue={editingUser?.username} required placeholder="Ej. admin_stnj" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="password" type="text" defaultValue={editingUser?.password} required placeholder="Clave de acceso" className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombres Completos</label>
                  <input name="fullName" defaultValue={editingUser?.fullName} placeholder="Nombre y Apellidos" className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">WhatsApp</label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="whatsapp" defaultValue={editingUser?.whatsapp} placeholder="999 999 999" className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input name="email" type="email" defaultValue={editingUser?.email} placeholder="ejemplo@stnj.com" className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol del Usuario</label>
                  <select name="role" defaultValue={editingUser?.role || 'staff'} className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg appearance-none outline-none">
                    <option value="admin">Administrador (Master)</option>
                    <option value="staff">Personal (Staff)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-xs transition-all">
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
const StatCards = ({ studentsCount, teachersCount, grades, todayAttendance, activeConfig }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    <StatCard title="Estudiantes" value={studentsCount} icon={Users} color="blue" activeConfig={activeConfig} />
    <StatCard title="Docentes" value={teachersCount} icon={GraduationCap} color="indigo" activeConfig={activeConfig} />
    <StatCard title="Promedio" value={(grades.reduce((a: any, b: any) => a + b.nota, 0) / (grades.length || 1)).toFixed(1)} icon={Award} color="amber" activeConfig={activeConfig} />
    <StatCard title="Hoy Asistieron" value={todayAttendance.length} icon={CheckCircle} color="emerald" activeConfig={activeConfig} />
  </div>
);

const StatCardsAttendance = ({ statsAtt }: any) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div className="bg-white p-6 rounded-3xl shadow-md border border-emerald-50 text-center transition-all hover:shadow-lg">
        <p className="text-2xl font-black text-emerald-600">{statsAtt.presentes}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Entrada</p>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-amber-50 text-center transition-all hover:shadow-lg">
        <p className="text-2xl font-black text-amber-600">{statsAtt.tardanzas}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Tardanzas</p>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-blue-50 text-center transition-all hover:shadow-lg">
        <p className="text-2xl font-black text-blue-600">{statsAtt.salidas}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Salidas</p>
    </div>
    <div className="bg-white p-6 rounded-3xl shadow-md border border-indigo-50 text-center transition-all hover:shadow-lg">
        <p className="text-2xl font-black text-indigo-600">{statsAtt.permisos}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Permisos</p>
    </div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, color, activeConfig }: { title: string, value: any, icon: any, color: string, activeConfig: any }) => {
  const colors: any = {
    blue: 'bg-blue-600 text-blue-600 shadow-blue-100',
    amber: 'bg-amber-600 text-amber-600 shadow-amber-100',
    emerald: 'bg-emerald-600 text-emerald-600 shadow-emerald-100',
    indigo: 'bg-indigo-600 text-indigo-600 shadow-indigo-100'
  };
  return (
    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-opacity-10 ${colors[color].split(' ')[0]}`}>
          <Icon size={20} style={{ color: colors[color].includes('blue') ? activeConfig.theme.primaryColor : undefined }} className={!colors[color].includes('blue') ? colors[color].split(' ')[1] : ''} />
        </div>
        <div className="w-2 h-2 rounded-full bg-slate-100"></div>
      </div>
      <p className="text-3xl font-black text-slate-800 mb-1 tracking-tight">{value}</p>
      <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">{title}</p>
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
