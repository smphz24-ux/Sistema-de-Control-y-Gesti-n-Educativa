import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import debounce from "lodash.debounce";
import { createRoot } from "react-dom/client";
import * as htmlToImage from "html-to-image";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { GoogleGenAI } from "@google/genai";
import { hashPassword } from "./utils/crypto";
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
  Check,
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
  FileCheck,
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
  School,
  Hash,
  Eraser,
  ShieldCheck,
  FileSpreadsheet,
  Palette,
  Type,
  Globe,
  Lock,
  Menu,
  ArrowLeft,
  ArrowRight,
  Share2,
  LogIn,
  Eye,
  EyeOff,
  AlertTriangle,
  Layers,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import QRCode from "qrcode";
import Barcode from "react-barcode";
import JsBarcode from "jsbarcode";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import jsQR from "jsqr";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";

import {
  AppUser,
  UserConfig,
  Student,
  ConsultationLog,
  AttendanceStatus,
  Attendance,
  Grade,
  ExamType,
  Level,
  GradeLevel,
  Shift,
  Schedule,
  IncidenceSeverity,
  IncidenceStatus,
  Incidence,
  IncidenceType,
  AppNotification,
  MeritCategory,
  DemeritCategory,
  ConductAction,
  Period,
  Enrollment,
} from "./types";
import {
  PREDEFINED_THEMES,
  PREDEFINED_COURSE_COLORS,
  DEFAULT_CONFIG,
} from "./constants";
import * as api from "./services/api";
import Landing from "./components/Landing";
import ConsultasModal from "./components/ConsultasModal";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Login from "./components/Login";
import AdminLoginModal from "./components/AdminLoginModal";
import FichaOptica from "./components/FichaOptica";
import OpticalSheetPreview from "./components/OpticalSheetPreview";

// Declaration for jsQR which is loaded via CDN in index.html
const ALL_PERMISSIONS = [
  "dashboard",
  "estudiantes",
  "asistencia",
  "reportes",
  "alerta",
  "calificaciones",
  "mi-panel",
  "config",
  "horarios",
  "matricula",
  "mi-panel:grados",
  "mi-panel:alerta",
  "mi-panel:horario",
  "mi-panel:horarios:ver",
];

const App = () => {
  // --- State ---
  const isRemoteUpdate = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [globalConfig, setGlobalConfig] = useState<UserConfig>(() => {
    const saved = localStorage.getItem("edu_config_v10");
    if (saved) {
      try {
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed) {
          return {
            ...DEFAULT_CONFIG,
            ...parsed,
            theme: { ...DEFAULT_CONFIG.theme, ...parsed.theme },
          };
        }
      } catch (e) {
        console.error("Error parsing globalConfig from localStorage:", e);
      }
    }
    return DEFAULT_CONFIG;
  });
  const [pendingConfig, setPendingConfig] = useState<UserConfig | null>(null);

  const [selectedGradeName, setSelectedGradeName] = useState<string>("");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await api.fetchConfig();
        if (config) {
          isRemoteUpdate.current = true;
          setGlobalConfig((prev) => ({
            ...DEFAULT_CONFIG,
            ...prev,
            ...config,
            theme: {
              ...DEFAULT_CONFIG.theme,
              ...(prev.theme || {}),
              ...(config.theme || {}),
            },
            credentialConfig: {
              ...DEFAULT_CONFIG.credentialConfig,
              ...(prev.credentialConfig || {}),
              ...(config.credentialConfig || {}),
            },
          }));
          setTimeout(() => (isRemoteUpdate.current = false), 100);
        }
      } catch (e) {
        console.error("Error loading config", e);
      }
    };
    loadConfig();
  }, []);

  const debouncedSaveConfig = useMemo(
    () =>
      debounce((config: any) => {
        api.saveConfig(config).catch((err) => {
          console.error("Failed to save config remotely:", err);
          setToast({
            message: "Error al guardar configuración. Verifique su conexión.",
            type: "error",
          });
        });
      }, 2000),
    [],
  );

  const debouncedSaveUsers = useMemo(
    () =>
      debounce((usersList: AppUser[]) => {
        if (usersList.length > 0) {
          api.saveUsers(usersList).catch((err) => {
            console.error("Failed to save users remotely:", err);
            setToast({
              message: "Error al guardar usuarios. Verifique su conexión.",
              type: "error",
            });
          });
        }
      }, 2000),
    [],
  );

  const debouncedSaveUserData = useMemo(
    () =>
      debounce(async (ownerId: string, data: any) => {
        try {
          await api.saveUserData(ownerId, data);
        } catch (err) {
          console.error("Failed to save user data remotely:", err);
          setToast({
            message: "Error al guardar datos. Verifique su conexión.",
            type: "error",
          });
        }
      }, 2000),
    [],
  );

  useEffect(() => {
    if (!isRemoteUpdate.current) {
      localStorage.setItem("edu_config_v10", JSON.stringify(globalConfig));
      debouncedSaveConfig(globalConfig);
    }
  }, [globalConfig, debouncedSaveConfig]);

  const [originalUser, setOriginalUser] = useState<AppUser | null>(null);
  const [isBoletaModalOpen, setIsBoletaModalOpen] = useState(false);
  const [isAdminScheduleFullScreen, setIsAdminScheduleFullScreen] =
    useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(
    null,
  );
  const [viewingEnrollment, setViewingEnrollment] = useState<Enrollment | null>(
    null,
  );
  const [enrollmentSearch, setEnrollmentSearch] = useState("");
  const [selectedEnrollmentStudent, setSelectedEnrollmentStudent] =
    useState<Student | null>(null);
  const [enrollmentPaymentType, setEnrollmentPaymentType] = useState<
    "contado" | "cuotas"
  >("contado");
  const [enrollmentScholarship, setEnrollmentScholarship] = useState<
    "ninguna" | "media" | "completa"
  >("ninguna");
  const [enrollmentFirstInstallment, setEnrollmentFirstInstallment] =
    useState(0);
  const [enrollmentTotalAmount, setEnrollmentTotalAmount] = useState(0);
  const [enrollmentMaterialsAmount, setEnrollmentMaterialsAmount] = useState(0);
  const [enrollmentInstallmentsCount, setEnrollmentInstallmentsCount] =
    useState(1);
  const [enrollmentClassStartDate, setEnrollmentClassStartDate] = useState("");
  const [enrollmentPaymentMethod, setEnrollmentPaymentMethod] = useState<
    "efectivo" | "transferencia" | "billetera"
  >("efectivo");
  const [enrollmentHistorySearch, setEnrollmentHistorySearch] = useState("");
  const [enrollmentHistoryDate, setEnrollmentHistoryDate] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "estudiantes"
    | "asistencia"
    | "calificaciones"
    | "reportes"
    | "alerta"
    | "mi-panel"
    | "config"
    | "matricula"
  >("dashboard");
  const [activeConfigSubTab, setActiveConfigSubTab] = useState<
    "usuarios" | "sistema"
  >("usuarios");
  const [activeReportSubTab, setActiveReportSubTab] = useState<
    "global" | "personalizado"
  >("global");
  const [activeAlertaSubTab, setActiveAlertaSubTab] = useState<
    "registro" | "historial"
  >("registro");
  const [activePanelSubTab, setActivePanelSubTab] = useState<
    "perfil" | "grados" | "horarios" | "alerta" | "profesores"
  >("perfil");
  const [activeGradosSubTab, setActiveGradosSubTab] = useState<
    "niveles" | "grados" | "secciones" | "periodos"
  >("niveles");
  const [activeHorariosSubTab, setActiveHorariosSubTab] = useState<
    "turnos" | "config" | "creador" | "materias" | "ver-horario"
  >("turnos");
  const [panelModalType, setPanelModalType] = useState<
    | "level"
    | "grade"
    | "shift"
    | "schedule"
    | "profile"
    | "report"
    | "siteConfig"
    | "section"
    | "period"
    | "publicOpticalConfig"
    | null
  >(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [editingGradeLevel, setEditingGradeLevel] = useState<GradeLevel | null>(
    null,
  );
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [editingScheduleGrade, setEditingScheduleGrade] = useState<GradeLevel | null>(null);
  const [tempSchedules, setTempSchedules] = useState<Schedule[]>([]);
  const [isScheduleEditsDirty, setIsScheduleEditsDirty] = useState(false);
  const calificarSearchInputRef = useRef<HTMLInputElement>(null);
  const [calificarMaxScore, setCalificarMaxScore] = useState<number>(20);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const confirmAction = (
    message: string,
    onConfirm: () => void,
    title: string = "Confirmar Acción",
  ) => {
    setConfirmModal({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(null);
      },
    });
  };
  const [courses, setCourses] = useState<
    {
      id: string;
      name: string;
      color: string;
      teacherId?: string;
      grades?: string[];
    }[]
  >([
    { id: "1", name: "Matemáticas", color: "#3b82f6" },
    { id: "2", name: "Lenguaje", color: "#ef4444" },
    { id: "3", name: "Ciencias", color: "#10b981" },
    { id: "4", name: "Historia", color: "#f59e0b" },
  ]);
  const [gradeTypes, setGradeTypes] = useState<{ id: string; name: string }[]>([
    { id: "1", name: "Tarea" },
    { id: "2", name: "Examen" },
    { id: "3", name: "Medición" },
    { id: "4", name: "Participación" },
  ]);
  const [timeSlots, setTimeSlots] = useState<
    { id: string; start: string; end: string }[]
  >(
    Array.from({ length: 10 }).map((_, i) => ({
      id: i.toString(),
      start: `${(7 + i).toString().padStart(2, "0")}:00`,
      end: `${(8 + i).toString().padStart(2, "0")}:00`,
    })),
  );
  const [activeCalificacionesSubTab, setActiveCalificacionesSubTab] = useState<
    "lista" | "registros" | "boletas" | "calificar" | "ficha-optica"
  >("lista");
  const [draggedSchedule, setDraggedSchedule] = useState<Schedule | null>(null);
  const [calificacionesGradeFilter, setCalificacionesGradeFilter] =
    useState("");
  const [calificacionesLevelFilter, setCalificacionesLevelFilter] =
    useState("");
  const [calificacionesSectionFilter, setCalificacionesSectionFilter] =
    useState("");
  const [calificacionesSearch, setCalificacionesSearch] = useState("");
  const [calificacionesMateriaFilter, setCalificacionesMateriaFilter] =
    useState("");
  const [calificacionesExamenFilter, setCalificacionesExamenFilter] = useState("");
  const [calificacionesDateFilter, setCalificacionesDateFilter] = useState("");
  const [boletasSortOrder, setBoletasSortOrder] = useState<
    "merito" | "demerito"
  >("merito");
  const [registrosSortOrder, setRegistrosSortOrder] = useState<
    "ninguno" | "merito" | "demerito"
  >("ninguno");
  const adminScheduleRef = useRef<HTMLDivElement>(null);

  const handleDownloadAdminSchedule = useCallback(async () => {
    if (adminScheduleRef.current) {
      try {
        const node = adminScheduleRef.current;
        const captureWidth = 1300;
        const captureHeight = node.scrollHeight;

        const dataUrl = await htmlToImage.toJpeg(node, {
          quality: 1.0,
          backgroundColor: "#ffffff",
          pixelRatio: 2, // High resolution
          width: captureWidth,
          height: captureHeight,
          style: {
            padding: "40px",
            borderRadius: "0",
            width: `${captureWidth}px`,
            height: `${captureHeight}px`,
            margin: "0 auto",
          },
        });
        const link = document.createElement("a");
        link.download = `horario-escolar-${new Date().toLocaleDateString()}.jpg`;
        link.href = dataUrl;
        link.click();
        setToast({ message: "Horario descargado con éxito", type: "success" });
      } catch (err) {
        console.error("Error downloading schedule:", err);
        setToast({ message: "Error al descargar el horario", type: "error" });
      }
    }
  }, []);
  const handlePrintAdminSchedule = () => {
    if (adminScheduleRef.current) {
      const printContent = adminScheduleRef.current;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Horario Escolar - ${activeConfig.siteName}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              @media print {
                @page { size: landscape; margin: 1cm; }
                body { -webkit-print-color-adjust: exact; }
              }
              body { font-family: sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: center; }
              .bg-slate-900 { background-color: #0f172a !important; color: white !important; }
              .rounded-xl { border-radius: 0.75rem; }
            </style>
          </head>
          <body>
            <div class="mb-6">
              <h1 class="text-2xl font-black uppercase">${activeConfig.siteName}</h1>
              <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Horario de Clases - ${gradeLevels.find((gl) => gl.id === scheduleGradeFilter)?.nombre || "General"}</p>
            </div>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const [selectedBoletaStudent, setSelectedBoletaStudent] =
    useState<Student | null>(null);
  const [showBoletaDownloadOptions, setShowBoletaDownloadOptions] =
    useState(false);
  const [showEnrollmentPDFOptions, setShowEnrollmentPDFOptions] =
    useState(false);
  const [pendingEnrollmentForPDF, setPendingEnrollmentForPDF] =
    useState<Enrollment | null>(null);

  useEffect(() => {
    if (selectedBoletaStudent) {
      // Auto-print when boleta is generated (after a short delay to ensure rendering)
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [selectedBoletaStudent]);
  const [viewingAnswers, setViewingAnswers] = useState<Grade | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [selectedGradeType, setSelectedGradeType] = useState("");
  const [editingCourse, setEditingCourse] = useState<{
    id: string;
    name: string;
    color: string;
    teacherId?: string;
  } | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<{
    id: string;
    start: string;
    end: string;
  } | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [draggedCourse, setDraggedCourse] = useState<any>(null);
  const [configTargetUser, setConfigTargetUser] = useState<AppUser | null>(
    null,
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [levels, setLevels] = useState<Level[]>([
    { id: "1", nombre: "Inicial" },
    { id: "2", nombre: "Primaria" },
    { id: "3", nombre: "Secundaria" },
  ]);
  const [gradeLevels, setGradeLevels] = useState<GradeLevel[]>([]);
  const [sections, setSections] = useState<string[]>(["A", "B", "C", "D", "E"]);
  const [schoolDays, setSchoolDays] = useState<string[]>([
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
  ]);
  const [scheduleGradeFilter, setScheduleGradeFilter] = useState<string>("");
  const [scheduleSectionFilter, setScheduleSectionFilter] =
    useState<string>("");
  const [scheduleTeacherFilter, setScheduleTeacherFilter] =
    useState<string>("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [incidences, setIncidences] = useState<Incidence[]>([]);
  const [incidenceTypes, setIncidencesTypes] = useState<IncidenceType[]>([
    { id: "1", name: "Acumulación de tardanzas" },
    { id: "2", name: "Incumplimiento de tareas" },
    { id: "3", name: "Faltas repetidas" },
    { id: "4", name: "Celular en clases" },
    { id: "5", name: "Conducta inapropiada en la institución" },
  ]);
  const [meritCategories, setMeritCategories] = useState<MeritCategory[]>(
    DEFAULT_CONFIG.meritCategories,
  );
  const [demeritCategories, setDemeritCategories] = useState<DemeritCategory[]>(
    DEFAULT_CONFIG.demeritCategories,
  );
  const [periods, setPeriods] = useState<Period[]>(DEFAULT_CONFIG.periods);
  const [editingIncidence, setEditingIncidence] = useState<Incidence | null>(
    null,
  );
  const [editingIncidenceType, setEditingIncidenceType] =
    useState<IncidenceType | null>(null);
  const [editingMeritCategory, setEditingMeritCategory] =
    useState<MeritCategory | null>(null);
  const [editingDemeritCategory, setEditingDemeritCategory] =
    useState<DemeritCategory | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [publicSearchOwnerId, setPublicSearchOwnerId] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // --- Real-time Sync via WebSockets ---
  useEffect(() => {
    const ownerId = currentUser ? getOwnerId(currentUser) : publicSearchOwnerId;
    if (!ownerId) return;

    // Connect to WebSocket server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Connected to real-time server');
      // Join the room for the specific owner
      socket.send(JSON.stringify({ type: 'join', ownerId }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'update' && message.data) {
          isRemoteUpdate.current = true;
          const data = message.data;
          if (data.students) setStudents(data.students);
          if (data.grades) setGrades(data.grades);
          if (data.attendance) setAttendance(data.attendance);
          if (data.incidences) setIncidences(data.incidences);
          if (data.courses) setCourses(data.courses);
          if (data.gradeLevels) setGradeLevels(data.gradeLevels);
          if (data.schedules) setSchedules(data.schedules);
          if (data.shifts) setShifts(data.shifts);
          if (data.consultationLogs) setConsultationLogs(data.consultationLogs);
          if (data.conductActions) setConductActions(data.conductActions);
          if (data.examTypes) setExamTypes(data.examTypes);
          setTimeout(() => isRemoteUpdate.current = false, 500);
        } else if (message.type === 'config_update' && message.data) {
          isRemoteUpdate.current = true;
          setGlobalConfig(message.data);
          setTimeout(() => isRemoteUpdate.current = false, 500);
        } else if (message.type === 'users_update' && message.data) {
          isRemoteUpdate.current = true;
          setUsers(message.data);
          setTimeout(() => isRemoteUpdate.current = false, 500);
        }
      } catch (err) {
        console.error('Error processing real-time message:', err);
      }
    };

    socket.onclose = () => {
      console.log('Disconnected from real-time server');
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [currentUser, publicSearchOwnerId]);

  const [examTypes, setExamTypes] = useState<ExamType[]>(
    DEFAULT_CONFIG.examTypes,
  );
  const [editingExamType, setEditingExamType] = useState<ExamType | null>(null);
  const [isExamTypeModalOpen, setIsExamTypeModalOpen] = useState(false);
  const [editingClassroomsForExamId, setEditingClassroomsForExamId] = useState<string | null>(null);
  const [isCreateKeyModalOpen, setIsCreateKeyModalOpen] = useState(false);
  const [selectedExamTypeForKey, setSelectedExamTypeForKey] =
    useState<ExamType | null>(null);

  const activeConfig = useMemo(() => {
    const config = currentUser?.config || globalConfig;
    return {
      ...DEFAULT_CONFIG,
      ...globalConfig,
      ...config,
      examTypes: examTypes,
      theme: {
        ...DEFAULT_CONFIG.theme,
        ...globalConfig.theme,
        ...(config.theme || {}),
      },
      credentialConfig: {
        ...(DEFAULT_CONFIG.credentialConfig || {}),
        ...(globalConfig.credentialConfig || {}),
        ...(config.credentialConfig || {}),
      },
    };
  }, [currentUser, globalConfig, examTypes]);

  // Search & Filters (Global/Students)
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [dbLevelFilter, setDbLevelFilter] = useState("");
  const [dbGradeFilter, setDbGradeFilter] = useState("");
  const [dbSchoolFilter, setDbSchoolFilter] = useState("");
  const [dbRoleFilter, setDbRoleFilter] = useState<"Estudiante" | "Docente" | "">("");

  const uniqueSchools = useMemo(() => {
    const schoolsList = students
      .map((s) => (s.schoolName || "").trim())
      .filter((name) => name !== "");

    const uniqueMap = new Map<string, string>();
    schoolsList.forEach((name) => {
      const lower = name.toLowerCase();
      if (!uniqueMap.has(lower)) {
        uniqueMap.set(lower, name);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.localeCompare(b));
  }, [students]);

  // Report Filters
  const [reportSearchTerm, setReportSearchTerm] = useState("");
  const [reportClassFilter, setReportClassFilter] = useState("");
  const [reportDateFilter, setReportDateFilter] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportRoleFilter, setReportRoleFilter] = useState<string>("todos");

  // Personal Report State
  const [personalSearchTerm, setPersonalSearchTerm] = useState("");
  const [selectedPersonalStudent, setSelectedPersonalStudent] =
    useState<Student | null>(null);

  // Calificar Section State
  const [calificarSearchDni, setCalificarSearchDni] = useState("");
  const [calificarSelectedIndex, setCalificarSelectedIndex] = useState(0);
  const [calificarSearchResults, setCalificarSearchResults] = useState<
    Student[]
  >([]);
  const [selectedCalificarStudent, setSelectedCalificarStudent] =
    useState<Student | null>(null);
  const [selectedExamType, setSelectedExamType] = useState("");
  const [showExcessAlert, setShowExcessAlert] = useState(false);
  const [buenas, setBuenas] = useState<number>(0);
  const [malas, setMalas] = useState<number>(0);
  const [blancas, setBlancas] = useState<number>(0);
  const [selectedCalificarMateria, setSelectedCalificarMateria] = useState("");

  const calculatedScore = useMemo(() => {
    const currentExamType = examTypes.find((t) => t.name === selectedExamType);
    if (!currentExamType) return { rawScore: 0, finalGrade: 0 };

    // Calculate raw score based on answers and points
    const rawScore =
      buenas * (currentExamType.pointsPerGood || 0) +
      malas * (currentExamType.pointsPerBad || 0) +
      blancas * (currentExamType.pointsPerBlank || 0);

    // Calculate final grade using divisor
    const divisor = currentExamType.divisor;
    const finalGrade = divisor && divisor > 0 ? rawScore / divisor : rawScore;

    return { rawScore, finalGrade };
  }, [selectedExamType, buenas, malas, blancas, examTypes]);

  const isExcessQuestions = useMemo(() => {
    const currentExamType = examTypes.find((t) => t.name === selectedExamType);
    if (!currentExamType) return false;
    return buenas + malas + blancas > currentExamType.numQuestions;
  }, [buenas, malas, blancas, selectedExamType, examTypes]);

  const handleRegisterGrade = () => {
    if (!selectedCalificarStudent) return;
    if (!selectedExamType) {
      setToast({ message: "Asigne tipo de examen", type: "error" });
      return;
    }
    if (isExcessQuestions) {
      setShowExcessAlert(true);
      return;
    }
    const et = examTypes.find((t) => t.name === selectedExamType);
    const newGrade: Grade = {
      id: Date.now().toString(),
      ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
      studentId: selectedCalificarStudent.id,
      studentName: `${selectedCalificarStudent.nombre} ${selectedCalificarStudent.apellido}`,
      materia: "Examen",
      examType: selectedExamType,
      periodo: "General",
      nota: calculatedScore.finalGrade,
      fecha: new Date().toLocaleDateString(),
      buenas,
      malas,
      blancas,
      maxScore: 20,
      pointsPerGood: et?.pointsPerGood,
      pointsPerBad: et?.pointsPerBad,
      pointsPerBlank: et?.pointsPerBlank,
      numQuestions: et?.numQuestions,
      isIndispensable: et?.isIndispensable,
      divisor: et?.divisor || 1,
      rawScore: calculatedScore.rawScore,
    };
    setGrades((prev) => [...prev, newGrade]);
    setToast({ message: "Guardado Correctamente", type: "success" });
    setBuenas(0);
    setMalas(0);
    setBlancas(0);
    setSelectedExamType("");
    setCalificarSearchDni("");
    setSelectedCalificarStudent(null);
    setTimeout(() => {
      calificarSearchInputRef.current?.focus();
    }, 100);
  };

  useEffect(() => {
    if (isExcessQuestions) {
      setShowExcessAlert(true);
    } else {
      setShowExcessAlert(false);
    }
  }, [isExcessQuestions]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowExcessAlert(false);
      }
    };
    if (showExcessAlert) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showExcessAlert]);

  // Attendance Filters
  const [attSearch, setAttSearch] = useState("");
  const [attStatusFilter, setAttStatusFilter] = useState<
    AttendanceStatus | "todos"
  >("todos");
  const [attRoleFilter, setAttRoleFilter] = useState<
    "Estudiante" | "Docente" | "todos"
  >("todos");

  // Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [studentModalNivel, setStudentModalNivel] = useState<string>("Primaria");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (isStudentModalOpen) {
      if (editingStudent) {
        setStudentModalNivel(editingStudent.nivel || "Primaria");
      } else {
        setStudentModalNivel("Primaria");
      }
    }
  }, [isStudentModalOpen, editingStudent]);
  const [isFotocheckOpen, setIsFotocheckOpen] = useState(false);
  const [selectedStudentForId, setSelectedStudentForId] =
    useState<Student | null>(null);
  const [selectedQuickStatus, setSelectedQuickStatus] =
    useState<AttendanceStatus>("entrada");
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(
    null,
  );
  const [hasChanges, setHasChanges] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [currentQRCode, setCurrentQRCode] = useState<string | null>(null);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [conductActions, setConductActions] = useState<ConductAction[]>([]);

  // Terminal Modals
  const [isDniModalOpen, setIsDniModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [personalizingUser, setPersonalizingUser] = useState<AppUser | null>(
    null,
  );
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] =
    useState(false);
  const [isGlobalThemeModalOpen, setIsGlobalThemeModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminLoginPassword, setAdminLoginPassword] = useState("");
  const [consultasSearchDni, setConsultasSearchDni] = useState("");
  const [consultasResult, setConsultasResult] = useState<Student | null>(null);
  const [consultationLogs, setConsultationLogs] = useState<ConsultationLog[]>(
    [],
  );
  const [activeConsultasTab, setActiveConsultasTab] = useState<
    "asistencia" | "alerta" | "horario" | "notas"
  >("asistencia");
  const [isConsultasModalOpen, setIsConsultasModalOpen] = useState(false);
  const [isDniInputModalOpen, setIsDniInputModalOpen] = useState(false);
  const [isMeritModalOpen, setIsMeritModalOpen] = useState(false);
  const [isDemeritModalOpen, setIsDemeritModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [previewingExamType, setPreviewingExamType] = useState<ExamType | null>(
    null,
  );

  // QR Scanner State
  const [lastDetectedPerson, setLastDetectedPerson] = useState<Student | null>(
    null,
  );
  const [scanCooldown, setScanCooldown] = useState(false);

  // Audio/Haptic Feedback
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }
      const audioCtx = audioCtxRef.current;

      // Resume context if it's suspended (common in browsers until user interaction)
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.3,
      );

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
  const loadInitialData = async () => {
    try {
      const config = await api.fetchConfig();
      if (config) setGlobalConfig(config);

      const serverUsers = await api.fetchUsers();
      const defaultAdmin: AppUser = {
        id: "admin-1",
        username: "admin",
        password: "1234",
        role: "admin",
        permissions: ALL_PERMISSIONS,
      };

      if (!serverUsers || serverUsers.length === 0) {
        setUsers([defaultAdmin]);
        await api.saveUsers([defaultAdmin]);
        // Load data for default admin to enable public features
        await loadUserData(defaultAdmin);
      } else {
        const updatedUsers = serverUsers.map((u: AppUser) => {
          if (u.role === "admin") {
            return { ...u, permissions: ALL_PERMISSIONS };
          }
          return u;
        });

        const hasAdmin = updatedUsers.some((u: AppUser) => u.role === "admin");
        const firstAdmin =
          updatedUsers.find((u: AppUser) => u.role === "admin") || defaultAdmin;

        if (!hasAdmin) {
          const finalUsers = [defaultAdmin, ...updatedUsers];
          setUsers(finalUsers);
          await api.saveUsers(finalUsers);
          await loadUserData(defaultAdmin);
        } else {
          setUsers(updatedUsers);
          // Save updated permissions if they changed
          if (JSON.stringify(updatedUsers) !== JSON.stringify(serverUsers)) {
            await api.saveUsers(updatedUsers);
          }
          // Load data for the first admin to enable public features
          await loadUserData(firstAdmin);
        }
      }
    } catch (e) {
      console.error("Error loading initial data", e);
      setToast({
        message: "Error al conectar con el servidor. Verifique su conexión.",
        type: "error",
      });
    }
  };

  const getOwnerId = (user: AppUser | null) => {
    if (!user) return "admin-1";
    if (user.role === "enrolador" && user.linkedUserId)
      return user.linkedUserId;
    return user.parentId || user.id;
  };

  const loadUserData = async (user: AppUser) => {
    try {
      isRemoteUpdate.current = true;
      // Clear current states before loading new data
      setStudents([]);
      setAttendance([]);
      setGrades([]);
      setIncidences([]);
      setGradeLevels([]);
      setSchedules([]);
      setShifts([]);
      setConsultationLogs([]);
      setConductActions([]);
      setEnrollments([]);

      const ownerId = getOwnerId(user);
      const data = await api.fetchUserData(ownerId);
      if (data && Object.keys(data).length > 0) {
        setStudents(data.students || []);
        setAttendance(data.attendance || []);
        setGrades(data.grades || []);
        setIncidences(data.incidences || []);
        setCourses(data.courses || courses);
        setGradeLevels(data.gradeLevels || []);
        setSchedules(data.schedules || []);
        setShifts(data.shifts || []);
        setSections(data.sections || ["A", "B", "C", "D", "E"]);
        setLevels(
          data.levels || [
            { id: "1", nombre: "Inicial" },
            { id: "2", nombre: "Primaria" },
            { id: "3", nombre: "Secundaria" },
          ],
        );
        setGradeTypes(
          data.gradeTypes || [
            { id: "1", name: "Tarea" },
            { id: "2", name: "Examen" },
            { id: "3", name: "Medición" },
            { id: "4", name: "Participación" },
          ],
        );
        setTimeSlots(
          data.timeSlots ||
            Array.from({ length: 10 }).map((_, i) => ({
              id: i.toString(),
              start: `${(7 + i).toString().padStart(2, "0")}:00`,
              end: `${(8 + i).toString().padStart(2, "0")}:00`,
            })),
        );
        setSchoolDays(
          data.schoolDays || [
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
          ],
        );
        if (data.examTypes) {
          setExamTypes(data.examTypes);
        } else if (user.config?.examTypes) {
          setExamTypes(user.config.examTypes);
        } else {
          setExamTypes(DEFAULT_CONFIG.examTypes);
        }
        setIncidencesTypes(
          data.incidenceTypes || [
            { id: "1", name: "Acumulación de tardanzas" },
            { id: "2", name: "Incumplimiento de tareas" },
            { id: "3", name: "Faltas repetidas" },
            { id: "4", name: "Celular en clases" },
            { id: "5", name: "Conducta inapropiada en la institución" },
          ],
        );
        setMeritCategories(data.meritCategories || DEFAULT_CONFIG.meritCategories);
        setDemeritCategories(
          data.demeritCategories || DEFAULT_CONFIG.demeritCategories,
        );
        setPeriods(data.periods || DEFAULT_CONFIG.periods);
        setConsultationLogs(data.consultationLogs || []);
        setConductActions(data.conductActions || []);
        setEnrollments(data.enrollments || []);
        if (data.globalConfig) {
          setGlobalConfig(data.globalConfig);
        }
      }
      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 500);
    } catch (e) {
      console.error("Error loading user data", e);
      setToast({
        message: "Error al cargar datos de usuario. Verifique su conexión.",
        type: "error",
      });
      isRemoteUpdate.current = false;
    }
  };

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadUserData(currentUser);
    }
  }, [isAuthenticated, currentUser]);

  useEffect(() => {
    if (activeConfigSubTab === "sistema" && !pendingConfig) {
      setPendingConfig(globalConfig);
    }
  }, [activeConfigSubTab, globalConfig, pendingConfig]);

  const handlePublishConfig = async () => {
    if (!pendingConfig) return;
    try {
      await api.saveConfig(pendingConfig);
      setGlobalConfig(pendingConfig);
      setToast({
        message: "Configuración publicada exitosamente",
        type: "success",
      });
      setPendingConfig(null);
    } catch (error) {
      console.error("Error publishing config:", error);
      setToast({
        message:
          "Error al publicar la configuración (El archivo puede ser muy grande)",
        type: "error",
      });
    }
  };

  const saveUserData = useCallback(() => {
    if (!currentUser) return;
    const ownerId = getOwnerId(currentUser);
    const dataToSave = {
      students,
      attendance,
      grades,
      incidences,
      courses,
      gradeLevels,
      schedules,
      shifts,
      sections,
      levels,
      gradeTypes,
      timeSlots,
      schoolDays,
      incidenceTypes,
      meritCategories,
      demeritCategories,
      periods,
      consultationLogs,
      conductActions,
      examTypes,
      globalConfig,
    };
    debouncedSaveUserData(ownerId, dataToSave);
  }, [
    isAuthenticated,
    currentUser,
    users,
    students,
    attendance,
    grades,
    incidences,
    courses,
    gradeLevels,
    schedules,
    shifts,
    sections,
    levels,
    gradeTypes,
    timeSlots,
    schoolDays,
    incidenceTypes,
    meritCategories,
    demeritCategories,
    periods,
    consultationLogs,
    conductActions,
    examTypes,
    globalConfig,
    debouncedSaveUserData,
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const boletaRef = useRef<HTMLDivElement>(null);

  const downloadAllBoletasPDF = () => {
    if (!currentUser?.permissions.includes("calificaciones:boletas")) {
      setToast({ message: "No tienes permiso para realizar esta acción.", type: "error" });
      return;
    }
    const filteredStudents = students
      .filter((s) => {
        const matchesSearch = (s.nombre + " " + s.apellido + " " + s.dni)
          .toLowerCase()
          .includes(calificacionesSearch.toLowerCase());
        const matchesLevel =
          !calificacionesLevelFilter || s.nivel === calificacionesLevelFilter;
        const matchesGrade =
          !calificacionesGradeFilter || s.grado === calificacionesGradeFilter;
        const matchesSection =
          !calificacionesSectionFilter ||
          s.seccion === calificacionesSectionFilter;
        return matchesSearch && matchesLevel && matchesGrade && matchesSection;
      })
      .map((s) => {
        const studentGrades = grades.filter((g) => g.studentId === s.id);
        const average =
          studentGrades.length > 0
            ? studentGrades.reduce((acc, curr) => acc + curr.nota, 0) /
              studentGrades.length
            : 0;
        const conduct = (s.conductPoints || 100) / 5;
        return { ...s, average, conduct };
      })
      .sort((a, b) =>
        boletasSortOrder === "merito"
          ? b.average - a.average
          : a.average - b.average,
      );

    const doc = new jsPDF();

    // Add Title
    doc.setFontSize(18);
    doc.text("Lista de Orden de Mérito y Conducta", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Filtro: ${calificacionesSearch || "Todos"}`, 14, 35);

    const tableData = filteredStudents.map((s, index) => [
      index + 1,
      `${s.nombre} ${s.apellido}`,
      s.dni,
      `${s.grado} "${s.seccion}"`,
      s.nivel,
      s.average.toFixed(2),
      s.conduct.toFixed(2),
    ]);

    autoTable(doc, {
      startY: 45,
      head: [
        [
          "Puesto",
          "Alumno",
          "DNI",
          "Grado/Sección",
          "Nivel",
          "Promedio",
          "Conducta",
        ],
      ],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 20, halign: "center", fontStyle: "bold" },
        6: { cellWidth: 20, halign: "center", fontStyle: "bold" },
      },
    });

    doc.save(`orden_merito_conducta_${new Date().getTime()}.pdf`);
    setToast({ message: "PDF generado con éxito", type: "success" });
  };

  const exportBoletasToExcel = async () => {
    if (!currentUser?.permissions.includes("calificaciones:boletas")) {
      setToast({ message: "No tienes permiso para realizar esta acción.", type: "error" });
      return;
    }
    const filteredStudents = students
      .filter((s) => {
        const matchesSearch = (s.nombre + " " + s.apellido + " " + s.dni)
          .toLowerCase()
          .includes(calificacionesSearch.toLowerCase());
        const matchesLevel =
          !calificacionesLevelFilter || s.nivel === calificacionesLevelFilter;
        const matchesGrade =
          !calificacionesGradeFilter || s.grado === calificacionesGradeFilter;
        const matchesSection =
          !calificacionesSectionFilter ||
          s.seccion === calificacionesSectionFilter;
        return matchesSearch && matchesLevel && matchesGrade && matchesSection;
      })
      .map((s, index) => {
        const studentGrades = grades.filter((g) => g.studentId === s.id);
        const average =
          studentGrades.length > 0
            ? studentGrades.reduce((acc, curr) => acc + curr.nota, 0) /
              studentGrades.length
            : 0;
        const conduct = (s.conductPoints || 100) / 5;
        return {
          Puesto: index + 1,
          Alumno: `${s.nombre} ${s.apellido}`,
          DNI: s.dni,
          Nivel: s.nivel,
          Grado: s.grado,
          Sección: s.seccion,
          Promedio: average.toFixed(2),
          Conducta: conduct.toFixed(2),
        };
      });

    const { utils, writeFile } = await import("xlsx");
    const worksheet = utils.json_to_sheet(filteredStudents);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Boletas");
    writeFile(workbook, `boletas_${new Date().getTime()}.xlsx`);
    setToast({ message: "Excel exportado con éxito", type: "success" });
  };

  const downloadBoletaPDF = async (mode: "single" | "double") => {
    if (!currentUser?.permissions.includes("calificaciones:boletas")) {
      setToast({ message: "No tienes permiso para realizar esta acción.", type: "error" });
      return;
    }
    if (!boletaRef.current || !selectedBoletaStudent) return;

    setToast({ message: "Generando PDF...", type: "info" });
    setShowBoletaDownloadOptions(false);

    try {
      const { toPng } = await import("html-to-image");

      // Capture with a fixed width to ensure consistency
      const dataUrl = await toPng(boletaRef.current, {
        quality: 1,
        pixelRatio: 2, // 2 is usually enough for A4
        backgroundColor: "#ffffff",
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
          width: "1000px", // Fixed width for capture
          margin: "0",
          padding: "48px", // Match p-12
          borderRadius: "0",
          border: "none",
          boxShadow: "none",
        },
      });

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgProps = doc.getImageProperties(dataUrl);
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      if (mode === "single") {
        const availableWidth = pdfWidth - 20;
        const availableHeight = pageHeight - 20;

        let finalWidth = availableWidth;
        let finalHeight = (imgProps.height * finalWidth) / imgProps.width;

        if (finalHeight > availableHeight) {
          finalHeight = availableHeight;
          finalWidth = (imgProps.width * finalHeight) / imgProps.height;
        }

        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pageHeight - finalHeight) / 2;

        doc.addImage(dataUrl, "PNG", xOffset, yOffset, finalWidth, finalHeight);
      } else {
        // Double mode
        const margin = 10;
        const availableWidth = pdfWidth - margin * 2;
        const maxCopyHeight = (pageHeight - margin * 3) / 2;

        let finalWidth = availableWidth;
        let finalHeight = (imgProps.height * finalWidth) / imgProps.width;

        if (finalHeight > maxCopyHeight) {
          finalHeight = maxCopyHeight;
          finalWidth = (imgProps.width * finalHeight) / imgProps.height;
        }

        const xOffset = (pdfWidth - finalWidth) / 2;

        // First copy
        doc.addImage(dataUrl, "PNG", xOffset, margin, finalWidth, finalHeight);

        // Dashed separator
        doc.setLineDashPattern([2, 1], 0);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight / 2, pdfWidth - margin, pageHeight / 2);

        // Second copy
        doc.addImage(
          dataUrl,
          "PNG",
          xOffset,
          pageHeight / 2 + margin,
          finalWidth,
          finalHeight,
        );
      }

      doc.save(
        `Boleta_${selectedBoletaStudent.nombre}_${selectedBoletaStudent.apellido}_${mode}.pdf`,
      );
      setToast({
        message: `Boleta (${mode === "single" ? "Simple" : "Doble"}) generada`,
        type: "success",
      });
    } catch (error) {
      console.error("Error generating PDF", error);
      setToast({ message: "Error al generar el PDF", type: "error" });
    }
  };

  const handleConductAction = async (
    studentId: string,
    type: "merit" | "demerit",
    category: MeritCategory | DemeritCategory,
    description?: string,
  ) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const newAction: ConductAction = {
      id: Date.now().toString(),
      ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
      studentId,
      type,
      categoryName: category.name,
      points: category.points,
      description,
      date: new Date().toLocaleString(),
      registeredBy: currentUser?.fullName || currentUser?.username || "Admin",
    };

    const updatedPoints = (student.conductPoints || 100) + category.points;
    const clampedPoints = Math.max(0, Math.min(100, updatedPoints));

    const updatedStudents = students.map((s) =>
      s.id === studentId ? { ...s, conductPoints: clampedPoints } : s,
    );
    setStudents(updatedStudents);
    setConductActions([newAction, ...conductActions]);

    // Also register as an incidence if it's a demerit
    if (type === "demerit") {
      const newIncidence: Incidence = {
        id: `inc-${Date.now()}`,
        ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
        studentId: student.id,
        studentName: `${student.nombre} ${student.apellido}`,
        studentDni: student.dni,
        studentGrade: student.grado,
        type: `Demérito: ${category.name}`,
        description:
          description ||
          `Se registró un demérito de ${category.points} puntos.`,
        severity:
          Math.abs(category.points) >= 20
            ? "grave"
            : Math.abs(category.points) >= 10
              ? "moderado"
              : "leve",
        status: "registrada",
        date: new Date().toLocaleString(),
        registeredBy: currentUser?.fullName || currentUser?.username || "Admin",
      };
      setIncidences([newIncidence, ...incidences]);
    }

    setToast({
      message: `${type === "merit" ? "Mérito" : "Demérito"} registrado con éxito`,
      type: "success",
    });
  };

  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;

    const ownerId =
      currentUser.role === "enrolador"
        ? currentUser.linkedUserId || currentUser.id
        : currentUser.id;

    // Polling fallback to keep data in sync
    const pollInterval = setInterval(async () => {
      try {
        const data = await api.fetchUserData(ownerId);
        if (data) {
          isRemoteUpdate.current = true;
          if (data.students) setStudents(data.students);
          if (data.attendance) setAttendance(data.attendance);
          if (data.grades) setGrades(data.grades);
          if (data.incidences) setIncidences(data.incidences);
          if (data.courses) setCourses(data.courses);
          if (data.gradeLevels) setGradeLevels(data.gradeLevels);
          if (data.sections) setSections(data.sections);
          if (data.levels) setLevels(data.levels);
          if (data.gradeTypes) setGradeTypes(data.gradeTypes);
          if (data.examTypes) setExamTypes(data.examTypes);
          if (data.timeSlots) setTimeSlots(data.timeSlots);
          if (data.schoolDays) setSchoolDays(data.schoolDays);
          if (data.incidenceTypes) setIncidencesTypes(data.incidenceTypes);
          if (data.meritCategories) setMeritCategories(data.meritCategories);
          if (data.demeritCategories) setDemeritCategories(data.demeritCategories);
          if (data.periods) setPeriods(data.periods);
          if (data.schedules) setSchedules(data.schedules);
          if (data.shifts) setShifts(data.shifts);
          if (data.consultationLogs) setConsultationLogs(data.consultationLogs);
          if (data.conductActions) setConductActions(data.conductActions);
          if (data.globalConfig) setGlobalConfig(data.globalConfig);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        }

        const config = await api.fetchConfig();
        if (config) {
          isRemoteUpdate.current = true;
          setGlobalConfig(config);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        }

        const usersData = await api.fetchUsers();
        if (usersData) {
          isRemoteUpdate.current = true;
          setUsers(usersData);
          setTimeout(() => {
            isRemoteUpdate.current = false;
          }, 100);
        }
      } catch (e) {
        if (e instanceof Error && e.message === "Failed to fetch") {
          // Silent ignore for transient network failures during dev/restarts
          return;
        }
        console.error("Polling error:", e);
      }
    }, 300000); // Poll every 5 minutes (increased from 60s to prevent 429)

    return () => {
      clearInterval(pollInterval);
    };
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      loadUserData(currentUser);
    }
  }, [isAuthenticated, currentUser?.id]);

  useEffect(() => {
    if (!isRemoteUpdate.current) {
      if (
        (isAuthenticated && currentUser) ||
        (!isAuthenticated && users.length > 0)
      ) {
        saveUserData();
      }
    }
  }, [
    students,
    attendance,
    grades,
    incidences,
    courses,
    gradeLevels,
    schedules,
    shifts,
    sections,
    levels,
    consultationLogs,
    conductActions,
    gradeTypes,
    timeSlots,
    schoolDays,
    incidenceTypes,
    examTypes,
    saveUserData,
    isAuthenticated,
    currentUser,
    users.length,
  ]);

  useEffect(() => {
    if (users.length > 0 && !isRemoteUpdate.current) {
      debouncedSaveUsers(users);
    }
  }, [users, debouncedSaveUsers]);

  // --- Dynamic Theme Application ---
  useEffect(() => {
    document.title = activeConfig.siteName;
  }, [activeConfig.siteName]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary-color",
      activeConfig.theme?.primaryColor || "#1e3a8a",
    );
    document.documentElement.style.setProperty(
      "--primary-color-15",
      (activeConfig.theme?.primaryColor || "#1e3a8a") + "15",
    );
    document.documentElement.style.setProperty(
      "--secondary-color",
      activeConfig.theme?.secondaryColor || "#3b82f6",
    );
    document.documentElement.style.setProperty(
      "--font-family",
      activeConfig.theme?.fontFamily || "Poppins",
    );

    // Sidebar and Topbar background variables
    document.documentElement.style.setProperty(
      "--sidebar-bg",
      activeConfig.theme?.primaryColor || "#1e3a8a",
    );
    document.documentElement.style.setProperty(
      "--topbar-bg",
      activeConfig.theme?.secondaryColor || "#3b82f6",
    );
  }, [activeConfig]);

  // --- Gemini AI Logic ---
  const generateAiReport = async () => {
    setIsAiLoading(true);
    try {
      const prompt = `Analiza los siguientes datos escolares y genera un resumen ejecutivo breve (máximo 150 palabras) sobre el estado actual del colegio.
      Estudiantes: ${students.filter((s) => s.rol === "Estudiante").length}
      Docentes: ${students.filter((s) => s.rol === "Docente").length}
      Asistencias hoy: ${attendance.filter((a) => a.fecha === new Date().toLocaleDateString()).length}
      Promedio General: ${(grades.reduce((acc, curr) => acc + curr.nota, 0) / (grades.length || 1)).toFixed(2)}
      
      Brinda 3 consejos estratégicos para mejorar el rendimiento escolar.`;

      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al generar reporte");

      setAiReport(data.text);
    } catch (e) {
      console.error("AI report error:", e);
      setToast({
        message:
          "Error al generar reporte: " +
          (e instanceof Error ? e.message : String(e)),
        type: "error",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  // --- Actions ---
  const markAttendance = useCallback(
    (dni: string, status: AttendanceStatus) => {
      if (!dni) return;
      const person = students.find((s) => s.dni === dni);
      if (!person) {
        setToast({
          message: `Identificación no encontrada en el sistema ${activeConfig.siteName}.`,
          type: "error",
        });
        return;
      }

      const nowFull = new Date();
      const today = nowFull.toLocaleDateString();
      const nowTime = nowFull.toLocaleTimeString();
      const currentMinute = nowFull.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      let finalStatus = status;
      const isEntry = status === "entrada" || status === "tardanza";
      const isExit = status === "salida" || status === "permiso";

      if (isEntry) {
        const dayNames = [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ];
        const todayName = dayNames[nowFull.getDay()];

        let targetId = person.id;
        if (person.rol === "Estudiante") {
          const gradeLevel = gradeLevels.find(
            (g) => g.nombre === person.grado && g.seccion === person.seccion,
          );
          if (gradeLevel) targetId = gradeLevel.id;
        }

        const personSchedules = schedules.filter(
          (s) => s.targetId === targetId && s.dia === todayName,
        );

        if (personSchedules.length > 0) {
          personSchedules.sort((a, b) => a.inicio.localeCompare(b.inicio));
          const currentMinutes = nowFull.getHours() * 60 + nowFull.getMinutes();

          let relevantSchedule = personSchedules[personSchedules.length - 1];
          for (const sch of personSchedules) {
            const [startH, startM] = sch.inicio.split(":").map(Number);
            const [endH, endM] = sch.fin.split(":").map(Number);
            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (currentMinutes <= endMinutes + 30) {
              relevantSchedule = sch;
              break;
            }
          }

          const [startH, startM] = relevantSchedule.inicio
            .split(":")
            .map(Number);
          const startMinutes = startH * 60 + startM;
          const diffMinutes = currentMinutes - startMinutes;

          if (diffMinutes > 60) {
            finalStatus = "ausente";
          } else if (diffMinutes > 10) {
            finalStatus = "tardanza";
          } else {
            finalStatus = "entrada";
          }
        }
      }

      // Find the last record for today to see if we should update it or create a new one
      const todayRecords = attendance
        .filter((a) => a.studentDni === dni && a.fecha === today)
        .sort((a, b) => b.hora.localeCompare(a.hora)); // Ensure newest first
      const lastRecord = todayRecords.length > 0 ? todayRecords[0] : null;

      // Logic for "Historial Real" (multiple entries/exits)
      if (isExit && lastRecord && !lastRecord.horaSalida) {
        if (lastRecord.hora.includes(currentMinute)) {
          setToast({
            message: `Ya se registró un movimiento para ${person.nombre} en este minuto.`,
            type: "error",
          });
          if (markingInputRef.current) markingInputRef.current.value = "";
          return;
        }

        const updatedRecord: Attendance = {
          ...lastRecord,
          hora: nowTime,
          horaSalida: nowTime,
        };

        const newAttendance = attendance.map((a) =>
          a.id === lastRecord.id ? updatedRecord : a,
        );
        setAttendance(newAttendance);
        setToast({
          message: `SALIDA registrada: ${person.nombre}`,
          type: "success",
        });
      } else {
        if (lastRecord && lastRecord.hora.includes(currentMinute)) {
          setToast({
            message: `Ya se registró un movimiento para ${person.nombre} en este minuto.`,
            type: "error",
          });
          if (markingInputRef.current) markingInputRef.current.value = "";
          return;
        }

        const newEntry: Attendance = {
          id: Date.now().toString(),
          ownerId: getOwnerId(currentUser),
          studentDni: person.dni,
          studentId: person.id,
          studentName: `${person.nombre} ${person.apellido}`,
          studentRol: person.rol,
          estado: finalStatus,
          fecha: today,
          hora: nowTime,
          horaEntrada: isEntry ? nowTime : undefined,
          horaSalida: isExit ? nowTime : undefined,
        };

        setAttendance([newEntry, ...attendance]);
        setToast({
          message: `${(isEntry ? finalStatus : "SALIDA").toUpperCase()} registrada: ${person.nombre}`,
          type: "success",
        });
      }

      if (markingInputRef.current) {
        markingInputRef.current.value = "";
        markingInputRef.current.focus();
      }
    },
    [
      students,
      attendance,
      activeConfig.siteName,
      schedules,
      gradeLevels,
      currentUser,
    ],
  );

  // --- QR Scanner Logic ---

  const stopScanner = useCallback(() => {
    if (codeReaderRef.current) {
      BrowserCodeReader.releaseAllStreams();
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsScannerModalOpen(false);
  }, []);

  // --- Keyboard Listeners ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
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
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isScannerModalOpen, stopScanner]);

  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const startScanner = useCallback(async () => {
    setIsScannerModalOpen(true);
    setScanCooldown(false);
    setLastDetectedPerson(null);
  }, []);

  useEffect(() => {
    if (isScannerModalOpen) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setToast({
          message:
            "Su navegador no soporta el acceso a la cámara o no está en un entorno seguro (HTTPS).",
          type: "error",
        });
        setIsScannerModalOpen(false);
        return;
      }

      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      const initDecoder = async () => {
        try {
          const videoInputDevices =
            await BrowserCodeReader.listVideoInputDevices();
          const selectedDeviceId =
            videoInputDevices.length > 0
              ? videoInputDevices[0].deviceId
              : undefined;

          if (videoRef.current) {
            codeReaderRef.current.decodeFromVideoDevice(
              selectedDeviceId,
              videoRef.current,
              (result, err) => {
                if (result && !scanCooldown) {
                  const dni = result.getText().trim();
                  const person = students.find((s) => s.dni === dni);
                  if (person) {
                    markAttendance(dni, selectedQuickStatus);
                    setLastDetectedPerson(person);
                    playChime();
                    setScanCooldown(true);
                    setTimeout(() => {
                      setScanCooldown(false);
                    }, 1000);
                  } else {
                    console.log("Code detected but no person found:", dni);
                  }
                }
              },
            );
          }
        } catch (err: any) {
          console.error("No se pudo acceder a la cámara:", err);
          const errorMsg = err?.message || err?.name || "Error desconocido";
          setToast({ 
            message: `Error de cámara: ${errorMsg}. Por favor, verifique los permisos en la configuración de su navegador y del sitio.`, 
            type: "error" 
          });
          setIsScannerModalOpen(false);
        }
      };

      initDecoder();

      // Cleanup when closed
      return () => {
        BrowserCodeReader.releaseAllStreams();
      };
    }
  }, [
    isScannerModalOpen,
    students,
    selectedQuickStatus,
    markAttendance,
    playChime,
    scanCooldown,
  ]);

  // --- Actions ---
  const deleteAttendance = (id: string) => {
    setAttendance(attendance.filter((a) => a.id !== id));
    setToast({ message: "Registro de asistencia eliminado", type: "success" });
  };

  const clearAttendanceHistory = () => {
    setAttendance([]);
    setToast({ message: "Historial de asistencia vaciado", type: "success" });
  };

  const handleSaveUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const isNewUser = !users.some((u) => u.id === (editingUser?.id || ""));
    const password = formData.get("password") as string;

    // Hash password if it's new or changed
    let finalPassword = editingUser?.password || password;
    let finalRealPassword = editingUser?.realPassword;
    
    if (isNewUser || (editingUser && password !== editingUser.password && password !== editingUser.realPassword)) {
      finalPassword = await hashPassword(password);
      finalRealPassword = password;
    }

    const role = (formData.get("role") as any) || "staff";
    const isMainAdmin =
      role === "admin" && !editingUser?.parentId && !currentUser?.parentId;

    // Handle permissions
    let permissions: string[] = [];
    if (isMainAdmin) {
      permissions = [
        "dashboard",
        "estudiantes",
        "asistencia",
        "reportes",
        "alerta",
        "calificaciones",
        "mi-panel",
        "config",
        "matricula",
      ];
      // Grant all sub-permissions too
      permissions.push(
        "mi-panel:perfil",
        "mi-panel:grados",
        "mi-panel:horarios",
        "mi-panel:alerta",
        "mi-panel:profesores",
        "mi-panel:horarios:turnos",
        "mi-panel:horarios:config",
        "mi-panel:horarios:materias",
        "mi-panel:horarios:creador",
        "mi-panel:grados:niveles",
        "mi-panel:grados:grados",
        "mi-panel:grados:secciones",
        "calificaciones:lista",
        "calificaciones:registros",
        "calificaciones:boletas",
        "calificaciones:calificar",
        "alerta:registro",
        "alerta:historial",
        "reportes:global",
        "reportes:personalizado",
        "config:usuarios",
        "config:sistema",
      );
    } else {
      // Get selected permissions from form
      const selectedPerms = formData.getAll("permissions") as string[];
      permissions =
        selectedPerms.length > 0
          ? selectedPerms
          : editingUser?.permissions || ["mi-panel"];
      
      if (!permissions.includes("matricula")) {
        permissions.push("matricula");
      }

      // If mi-panel is selected but no sub-perms, add all sub-perms as default
      if (
        permissions.includes("mi-panel") &&
        !permissions.some((p) => p.startsWith("mi-panel:"))
      ) {
        permissions.push(
          "mi-panel:perfil",
          "mi-panel:grados",
          "mi-panel:horarios",
          "mi-panel:alerta",
          "mi-panel:profesores",
        );
      }
    }

    const userData: AppUser = {
      id:
        editingUser && !isNewUser
          ? editingUser.id
          : editingUser?.id || Date.now().toString(),
      username: formData.get("username") as string,
      password: finalPassword,
      realPassword: finalRealPassword,
      fullName: formData.get("fullName") as string,
      whatsapp: formData.get("whatsapp") as string,
      email: formData.get("email") as string,
      role: role,
      permissions: permissions,
      config: editingUser?.config,
      parentId: isNewUser
        ? currentUser?.parentId || currentUser?.id
        : editingUser?.parentId, // Link new users to the admin tree they were created in
      studentId: (formData.get("studentId") as string) || undefined,
      linkedUserId: (formData.get("linkedUserId") as string) || undefined,
      hasOwnDatabase: role === "admin" && !editingUser?.parentId,
    };

    if (!isNewUser) {
      setUsers((users || []).map((u) => (u.id === userData.id ? userData : u)));
      // Update current user if they are editing themselves
      if (currentUser?.id === userData.id) {
        setCurrentUser(userData);
      }
      // If the user being edited is a sub-user of the current user,
      // we don't need to do anything else, but the user requested "instant update".
      // Usually, state updates are instant in React.
    } else {
      setUsers([userData, ...users]);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
    setToast({
      message: editingUser ? "Usuario actualizado" : "Usuario creado con éxito",
      type: "success",
    });
  };

  const handleUpdateAttendance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAttendance) return;
    const formData = new FormData(e.currentTarget);
    const updated: Attendance = {
      ...editingAttendance,
      estado: formData.get("estado") as AttendanceStatus,
      horaEntrada: (formData.get("horaEntrada") as string) || undefined,
      horaSalida: (formData.get("horaSalida") as string) || undefined,
      fecha: formData.get("fecha") as string,
      hora: new Date().toLocaleTimeString(), // Update last modified
    };
    setAttendance(attendance.map((a) => (a.id === updated.id ? updated : a)));
    setEditingAttendance(null);
  };

  useEffect(() => {
    if (selectedStudentForId) {
      QRCode.toDataURL(selectedStudentForId.dni, {
        width: 400,
        margin: 4,
        errorCorrectionLevel: "H",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => {
          setCurrentQRCode(url);
        })
        .catch((err) => {
          console.error("Error generating QR code:", err);
        });
    }
  }, [selectedStudentForId]);

  const handleSaveStudent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const studentData: Student = {
      id: editingStudent ? editingStudent.id : Date.now().toString(),
      ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
      nombre: formData.get("nombre") as string,
      apellido: formData.get("apellido") as string,
      dni: formData.get("dni") as string,
      nivel: formData.get("nivel") as any,
      grado: formData.get("grado") as string,
      seccion: formData.get("seccion") as string,
      schoolName: formData.get("schoolName") as string,
      studentPhone: formData.get("studentPhone") as string,
      registrationDate:
        editingStudent?.registrationDate ||
        new Date().toISOString().split("T")[0],
      rol: formData.get("rol") as any,
      celularApoderado: formData.get("celularApoderado") as string,
      email: formData.get("email") as string,
      foto: editingStudent?.foto,
      siteName: formData.get("siteName") as string,
      slogan: formData.get("slogan") as string,
      logo: editingStudent?.logo,
      fechaNacimiento: formData.get("fechaNacimiento") as string,
    };

    if (editingStudent) {
      setStudents(
        students.map((s) => (s.id === editingStudent.id ? studentData : s)),
      );
    } else {
      setStudents([studentData, ...students]);
    }
    setIsStudentModalOpen(false);
    setEditingStudent(null);
  };

  const deleteStudent = (id: string) => {
    setStudents(students.filter((s) => s.id !== id));
    setAttendance(attendance.filter((a) => a.studentId !== id));
    setGrades(grades.filter((g) => g.studentId !== id));
    setToast({
      message: "Estudiante eliminado de la base de datos",
      type: "success",
    });
  };

  const deleteAllStudents = () => {
    const isFiltered = searchTerm !== "" || dateFilter !== "" || dbLevelFilter !== "" || dbGradeFilter !== "" || dbSchoolFilter !== "";
    const targets = isFiltered ? filteredEntries : students;

    if (targets.length === 0) {
      setToast({
        message: "No hay registros para eliminar",
        type: "info",
      });
      return;
    }

    const idsToDelete = new Set(targets.map((s) => s.id));

    setStudents((prev) => prev.filter((s) => !idsToDelete.has(s.id)));
    setAttendance((prev) => prev.filter((a) => !idsToDelete.has(a.studentId)));
    setGrades((prev) => prev.filter((g) => !idsToDelete.has(g.studentId)));

    setToast({
      message: isFiltered
        ? `${targets.length} registros filtrados eliminados`
        : "Base de datos vaciada completamente",
      type: "success",
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudentForId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const resizedBase64 = canvas.toDataURL(file.type || "image/jpeg", 0.8);

        setSelectedStudentForId((prev) =>
          prev ? { ...prev, foto: resizedBase64 } : null,
        );
        setHasChanges(true);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadOpticalSheet = (examType: ExamType) => {
    setPreviewingExamType(examType);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const newEntries: Student[] = jsonData
          .map((row): Student | null => {
            const nombre = row.Nombre || row.nombre;
            const apellido = row.Apellido || row.apellido;
            const dni = String(row.DNI || row.dni || "").trim();
            if (!nombre && !dni) return null;

            return {
              id: Math.random().toString(36).substr(2, 9),
              ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
              nombre: String(nombre || "Sin Nombre").trim(),
              apellido: String(apellido || "").trim(),
              dni: dni || "0",
              nivel: String(row.Nivel || row.nivel || "Primaria").trim() as any,
              grado: String(row.Grado || row.grado || "1° Grado").trim(),
              seccion: String(row.Seccion || row.seccion || "A").trim(),
              schoolName: String(row.Colegio || row.schoolName || "").trim(),
              studentPhone: String(
                row.CelularEstudiante || row.studentPhone || "",
              ).trim(),
              registrationDate: String(
                row.FechaReg ||
                  row.registrationDate ||
                  new Date().toISOString().split("T")[0],
              ).trim(),
              rol: String(row.Rol || row.rol || "Estudiante").trim() as any,
              celularApoderado: String(
                row.CelularApoderado || row.celularApoderado || "",
              ).trim(),
              email: String(row.Email || row.email || "").trim(),
              siteName: String(row.Sitio || row.siteName || "").trim(),
              slogan: String(row.Slogan || row.slogan || "").trim(),
              fechaNacimiento: String(row.FechaNacimiento || row.fechaNacimiento || "").trim(),
            };
          })
          .filter((s): s is Student => s !== null);

        setStudents((prev) => {
          const updated = [...prev];
          newEntries.forEach((newStudent) => {
            const index = updated.findIndex((s) => s.dni === newStudent.dni);
            if (index !== -1) {
              // Update existing student with new data, keeping the same ID
              updated[index] = {
                ...updated[index],
                ...newStudent,
                id: updated[index].id,
              };
            } else {
              // Add new student
              updated.unshift(newStudent);
            }
          });
          return updated;
        });
        setToast({
          message: `${newEntries.length} registros procesados con éxito`,
          type: "success",
        });
      } catch (error) {
        console.error("Error importing file:", error);
        setToast({
          message:
            "Error al importar el archivo. Asegúrese de que sea un formato válido.",
          type: "error",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExportCSV = () => {
    const dataToExport = students.map((s) => ({
      Nombre: s.nombre,
      Apellido: s.apellido,
      DNI: s.dni,
      FechaNacimiento: s.fechaNacimiento || "",
      Nivel: s.nivel,
      Grado: s.grado,
      Seccion: s.seccion,
      Colegio: s.schoolName || "",
      CelularEstudiante: s.studentPhone || "",
      FechaReg: s.registrationDate || "",
      Rol: s.rol,
      CelularApoderado: s.celularApoderado || "",
      Email: s.email || "",
      Sitio: s.siteName || "",
      Slogan: s.slogan || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estudiantes");

    // Generate CSV using XLSX to ensure proper escaping and structure
    const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvOutput], {
      type: "text/csv;charset=utf-8;",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_estudiantes_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const handleCloseFotocheck = () => {
    if (hasChanges && selectedStudentForId) {
      setStudents((prev) =>
        prev.map((s) =>
          s.id === selectedStudentForId.id ? selectedStudentForId : s,
        ),
      );
      setToast({
        message: "Foto y cambios guardados automáticamente",
        type: "success",
      });
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
    const folder = zip.folder("credenciales_educativas");

    // We need a hidden container to render each card for capture
    const hiddenContainer = document.createElement("div");
    hiddenContainer.style.position = "fixed";
    hiddenContainer.style.left = "-9999px";
    hiddenContainer.style.top = "-9999px";
    document.body.appendChild(hiddenContainer);

    try {
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        setDownloadProgress(Math.round(((i + 1) / students.length) * 100));

        // Generate QR for this student
        const qrDataUrl = await QRCode.toDataURL(student.dni, {
          width: 400,
          margin: 4,
          errorCorrectionLevel: "H",
        });

        // Generate Barcode
        const barcodeCanvas = document.createElement("canvas");
        JsBarcode(barcodeCanvas, student.dni, {
          format: "CODE128",
          displayValue: false,
          fontSize: 14,
          margin: 4,
          height: 50,
          width: 2.2,
          background: "#ffffff",
        });
        const barcodeDataUrl = barcodeCanvas.toDataURL("image/png");

        const barcodeDisplay =
          activeConfig.credentialConfig?.barcodeDisplay || "qr";

        // Create a temporary element to render the card
        const cardElement = document.createElement("div");
        cardElement.style.width = "8.5cm";
        cardElement.style.height = "12.2cm";
        cardElement.style.backgroundColor = "white";
        cardElement.style.display = "flex";
        cardElement.style.flexDirection = "column";
        cardElement.style.alignItems = "center";
        cardElement.style.border = "8px solid #0f172a";
        cardElement.style.borderRadius = "24px";
        cardElement.style.overflow = "hidden";
        cardElement.style.fontFamily = "sans-serif";
        cardElement.style.position = "relative";

        const isDocente = student.rol === "Docente";
        const primaryColor = isDocente ? "#059669" : "#2563eb"; // Emerald vs Blue
        const secondaryColor = isDocente ? "#10b981" : "#3b82f6";
        const headerBg = isDocente ? "#064e3b" : "#0f172a";

        cardElement.innerHTML = `
          <div style="width: 100%; background-color: ${headerBg}; color: white; padding: 20px 8px; text-align: center; border-bottom: 6px solid ${primaryColor};">
            <h1 style="font-weight: 900; font-size: 18px; text-transform: uppercase; margin: 0; line-height: 1.2; letter-spacing: -0.02em;">${activeConfig.siteName}</h1>
          </div>
          <div style="flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 15px 16px 12px 16px; background: linear-gradient(to bottom, #ffffff, ${isDocente ? "#ecfdf5" : "#f8fafc"}); box-sizing: border-box;">
            <!-- Top section for info -->
            <div style="display: flex; flex-direction: column; align-items: center; width: 100%; gap: 12px;">
              <!-- 2. Photograph -->
              <div style="width: 140px; height: 140px; background-color: #ffffff; border-radius: 20px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 4px solid ${isDocente ? "#d1fae5" : "#e2e8f0"}; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);">
                ${student.foto ? `<img src="${student.foto}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="color: #cbd5e1; display: flex; align-items: center; justify-content: center; height: 100%;"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>`}
              </div>
              
              <!-- 3. Name and Surname -->
              <div style="text-align: center; width: 100%;">
                <h3 style="font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; line-height: 1;">${student.nombre}</h3>
                <p style="font-size: 16px; font-weight: 700; color: ${primaryColor}; text-transform: uppercase; margin: 2px 0 0 0; line-height: 1;">${student.apellido}</p>
              </div>

              <!-- 4. Aula / Cargo -->
              <div style="text-align: center; width: 100%;">
                <div style="display: inline-block; padding: 4px 12px; background-color: ${isDocente ? "#059669" : "#f1f5f9"}; color: ${isDocente ? "#ffffff" : "#475569"}; border-radius: 8px; font-size: 10px; font-weight: 900; text-transform: uppercase; border: 1px solid ${isDocente ? "#047857" : "#e2e8f0"}; letter-spacing: 0.05em;">
                  ${isDocente ? "PERSONAL DOCENTE" : `Aula: ${student.grado} "${student.seccion}"`}
                </div>
              </div>
            </div>

            <!-- Middle section for Codes -->
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; gap: 6px; flex: 1;">
              <div style="display: flex; ${barcodeDisplay === "qr_barcode" ? "flex-direction: column;" : "flex-direction: row;"} align-items: center; justify-content: center; gap: 8px; width: 100%;">
                ${
                  barcodeDisplay === "qr" || barcodeDisplay === "qr_barcode"
                    ? `
                  <div style="background-color: transparent; padding: 0; display: flex; align-items: center; justify-content: center;">
                    <img src="${qrDataUrl}" style="${barcodeDisplay === "qr_barcode" ? "width: 70px; height: 70px;" : "width: 100px; height: 100px;"} display: block;" />
                  </div>
                `
                    : ""
                }
                ${
                  barcodeDisplay === "barcode" ||
                  barcodeDisplay === "qr_barcode"
                    ? `
                  <div style="background-color: transparent; padding: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; max-width: 100%;">
                    <img src="${barcodeDataUrl}" style="${barcodeDisplay === "qr_barcode" ? "height: 28px;" : "height: 50px;"} display: block; width: 100%; object-fit: contain;" />
                  </div>
                `
                    : ""
                }
              </div>
              ${barcodeDisplay === "qr" ? `<p style="font-size: 7px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin: 2px 0 0 0; letter-spacing: 0.1em;">DNI: ${student.dni}</p>` : ""}
            </div>

            <!-- Footer for Slogan -->
            <div style="width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 15px; box-sizing: border-box; margin-top: auto;">
              <div style="width: 80%; height: 1.5px; background: linear-gradient(to right, transparent, ${primaryColor}66, transparent); margin-bottom: 6px;"></div>
              <p style="font-size: 7.5px; font-weight: 900; color: #334155; text-transform: uppercase; margin: 0; text-align: center; font-style: italic; letter-spacing: 0.05em; line-height: 1.2; width: 100%; overflow: hidden; word-break: break-word;">${activeConfig.slogan || "EXCELENCIA Y VALORES"}</p>
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

        const base64Data = dataUrl.split(",")[1];
        folder?.file(
          `${student.dni}_${(student.nombre || "").split(" ")[0]}.jpg`,
          base64Data,
          { base64: true },
        );

        hiddenContainer.removeChild(cardElement);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `credenciales_educativas_${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating zip:", error);
      setToast({
        message: "Error al generar el archivo de credenciales.",
        type: "error",
      });
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
        },
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `credencial_${selectedStudentForId.dni}_${(selectedStudentForId.nombre || "").split(" ")[0]}.jpg`;
      a.click();
    } catch (error) {
      console.error("Error downloading JPG:", error);
      setToast({ message: "Error al descargar la imagen.", type: "error" });
    }
  };

  const generateQRCodeSVG = (dni: string) => {
    if (!currentQRCode)
      return <div className="w-20 h-20 bg-slate-50 animate-pulse rounded-lg" />;
    return <img src={currentQRCode} className="w-20 h-20" alt="QR Code" />;
  };

  // --- Filtering Logic ---
  const filteredEntries = students.filter((s) => {
    const matchesSearch =
      `${s.nombre} ${s.apellido} ${s.dni} ${s.schoolName || ""} ${s.studentPhone || ""}`
        .toLowerCase()
        .includes((searchTerm || "").toLowerCase());
    const matchesDate =
      !dateFilter || (s.registrationDate && s.registrationDate === dateFilter);
    const matchesLevel =
      !dbLevelFilter || (s.nivel && s.nivel === dbLevelFilter);
    const matchesGrade =
      !dbGradeFilter || (s.grado && s.grado === dbGradeFilter);
    const matchesSchool =
      !dbSchoolFilter || (s.schoolName && s.schoolName.toLowerCase() === dbSchoolFilter.toLowerCase());
    const matchesRole =
      !dbRoleFilter || s.rol === dbRoleFilter;

    return matchesSearch && matchesDate && matchesLevel && matchesGrade && matchesSchool && matchesRole;
  });

  const filteredAttendance = attendance.filter((a) => {
    const matchesSearch =
      (a.studentName || "")
        .toLowerCase()
        .includes((attSearch || "").toLowerCase()) ||
      a.studentDni?.includes(attSearch) ||
      a.studentId.includes(attSearch);
    const matchesStatus =
      attStatusFilter === "todos" || a.estado === attStatusFilter;
    const matchesRole =
      attRoleFilter === "todos" || a.studentRol === attRoleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const studentsCount = students.filter((s) => s.rol === "Estudiante").length;
  const teachersCount = students.filter((s) => s.rol === "Docente").length;

  const todayAttendance = attendance.filter(
    (a) => a.fecha === new Date().toLocaleDateString(),
  );
  const statsAtt = {
    presentes: todayAttendance.filter((a) => a.estado === "entrada").length,
    tardanzas: todayAttendance.filter((a) => a.estado === "tardanza").length,
    permisos: todayAttendance.filter((a) => a.estado === "permiso").length,
    salidas: todayAttendance.filter((a) => a.estado === "salida").length,
  };

  const exportIncidencesToExcel = () => {
    const filteredIncidences = incidences.filter(
      (inc) =>
        (inc.studentName || "")
          .toLowerCase()
          .includes((reportSearchTerm || "").toLowerCase()) ||
        inc.studentDni.includes(reportSearchTerm) ||
        (inc.type || "")
          .toLowerCase()
          .includes((reportSearchTerm || "").toLowerCase()),
    );

    const data = filteredIncidences.map((inc) => ({
      Estudiante: inc.studentName,
      DNI: inc.studentDni,
      Grado: inc.studentGrade,
      Tipo: inc.type,
      Fecha: inc.date,
      Gravedad: inc.severity.toUpperCase(),
      Estado: inc.status.toUpperCase(),
      Descripción: inc.description,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Incidencias");
    XLSX.writeFile(
      wb,
      `Historial_Incidencias_${new Date().toLocaleDateString()}.xlsx`,
    );
    setToast({ message: "Excel descargado", type: "success" });
  };

  const exportIncidencesToPDF = () => {
    const doc = new jsPDF();
    const filteredIncidences = incidences.filter(
      (inc) =>
        (inc.studentName || "")
          .toLowerCase()
          .includes((reportSearchTerm || "").toLowerCase()) ||
        inc.studentDni.includes(reportSearchTerm) ||
        (inc.type || "")
          .toLowerCase()
          .includes((reportSearchTerm || "").toLowerCase()),
    );

    doc.setFontSize(18);
    doc.text(activeConfig.siteName.toUpperCase(), 14, 15);
    doc.setFontSize(14);
    doc.text("Historial de Incidencias", 14, 25);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 32);

    const tableData = filteredIncidences.map((inc) => [
      inc.studentName,
      inc.studentGrade,
      inc.type,
      inc.date,
      inc.severity.toUpperCase(),
      inc.status.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Estudiante", "Grado", "Tipo", "Fecha", "Gravedad", "Estado"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: activeConfig.theme.primaryColor || "#1e3a8a" },
    });

    doc.save(`Historial_Incidencias_${new Date().toLocaleDateString()}.pdf`);
    setToast({ message: "PDF descargado", type: "success" });
  };

  const exportGradesToExcel = (filteredGrades: any[]) => {
    const data = filteredGrades.map((g, index) => {
      const student = students.find((s) => s.id === g.studentId);
      return {
        Puesto: index + 1,
        Alumno: g.studentName,
        DNI: student?.dni || "",
        Grado: student?.grado || "",
        Sección: student?.seccion || "",
        Materia: g.materia,
        Puntos: g.rawScore || 0,
        Nota: g.nota,
        Fecha: g.fecha,
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registros de Notas");
    XLSX.writeFile(
      wb,
      `Registros_Notas_${new Date().toLocaleDateString()}.xlsx`,
    );
    setToast({ message: "Excel descargado", type: "success" });
  };

  const exportGradesToPDF = (filteredGrades: any[]) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(activeConfig.siteName.toUpperCase(), 14, 15);
    doc.setFontSize(14);
    doc.text("Registros de Calificaciones", 14, 25);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 32);

    const tableData = filteredGrades.map((g, index) => [
      index + 1,
      g.studentName,
      g.materia,
      g.rawScore?.toFixed(1) || "-",
      g.nota.toString().padStart(2, "0"),
      g.fecha,
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Puesto", "Alumno", "Materia / Tipo", "Puntos", "Nota", "Fecha"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: activeConfig.theme.primaryColor || "#1e3a8a" },
    });

    doc.save(`Registros_Notas_${new Date().toLocaleDateString()}.pdf`);
    setToast({ message: "PDF descargado", type: "success" });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    const hashedPassword = await hashPassword(password);

    // Only sub-users can login here (staff or admin with parentId)
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        (u.password === password || u.password === hashedPassword) &&
        (u.role === "staff" || u.parentId !== undefined),
    );

    if (user) {
      const userWithAllPerms =
        user.role === "admin"
          ? { ...user, permissions: ALL_PERMISSIONS }
          : user;
      // If password was plain text, update it to hashed
      if (userWithAllPerms.password === password) {
        const updatedUser = { ...userWithAllPerms, password: hashedPassword, realPassword: userWithAllPerms.realPassword || password };
        setUsers((users || []).map((u) => (u.id === user.id ? updatedUser : u)));
        setCurrentUser(updatedUser);
      } else {
        setCurrentUser(userWithAllPerms);
      }
      setIsAuthenticated(true);
      setShowLanding(false);

      // Set active tab to first available permission
      const firstTab = userWithAllPerms.permissions.find(
        (p) => !p.includes(":"),
      );
      if (firstTab) {
        setActiveTab(firstTab as any);
        // If the first tab is mi-panel, set the subtab to the first available sub-permission
        if (firstTab === "mi-panel") {
          const firstSubTab = user.permissions.find((p) =>
            p.startsWith("mi-panel:"),
          );
          if (firstSubTab) {
            setActivePanelSubTab(firstSubTab.split(":")[1] as any);
          }
        }
      } else if (user.permissions.length > 0) {
        const mainTab = user.permissions[0].split(":")[0];
        setActiveTab(mainTab as any);
        if (mainTab === "mi-panel") {
          setActivePanelSubTab(user.permissions[0].split(":")[1] as any);
        }
      }

      setToast({
        message: `Bienvenido, ${user.fullName || user.username}`,
        type: "success",
      });
    } else {
      setToast({ message: "Usuario o contraseña incorrectos", type: "error" });
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
    const doc = new jsPDF();
    const config = currentUser?.config || globalConfig;

    // Header
    doc.setFillColor(30, 58, 138); // Slate 900
    doc.rect(0, 0, 210, 40, "F");

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

        doc.addImage(
          config.logo,
          "PNG",
          10,
          (40 - imgHeight) / 2,
          imgWidth,
          imgHeight,
        );
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(config.siteName, 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(title, 105, 30, { align: "center" });

    // Table
    const tableData = data.map((item) => [
      item.nombre,
      item.dni,
      item.rol,
      item.entrada || "-",
      item.salida || "-",
      item.fecha || "-",
    ]);

    autoTable(doc, {
      startY: 50,
      head: [["Nombre", "DNI", "Rol", "Entrada", "Salida", "Fecha"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(`${title.toLowerCase().replace(/ /g, "_")}.pdf`);
  };

  const exportPersonalReportToPDF = (
    student: Student,
    attendanceData: Attendance[],
    stats: any,
  ) => {
    const doc = new jsPDF();
    const config = currentUser?.config || globalConfig;

    // Header
    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, 210, 40, "F");

    if (config.logo) {
      try {
        doc.addImage(config.logo, "PNG", 10, 5, 30, 30);
      } catch (e) {}
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(config.siteName, 105, 15, { align: "center" });
    doc.setFontSize(14);
    doc.text(`REPORTE DETALLADO DE ASISTENCIA`, 105, 25, { align: "center" });
    doc.setFontSize(10);
    doc.text(
      `Generado el: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
      105,
      33,
      { align: "center" },
    );

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
      ["Faltas (Ausente)", stats.faltas],
    ];

    autoTable(doc, {
      startY: 90,
      head: [["Concepto", "Cantidad"]],
      body: statsData,
      theme: "striped",
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: 15, right: 15 },
    });

    // Detailed History
    doc.setFont("helvetica", "bold");
    const currentY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text("HISTORIAL DETALLADO POR FECHA", 15, currentY + 15);
    doc.line(15, currentY + 17, 195, currentY + 17);

    const historyData = attendanceData
      .sort((a, b) => {
        const dateA = (a.fecha || "").split("/").reverse().join("-");
        const dateB = (b.fecha || "").split("/").reverse().join("-");
        return dateB.localeCompare(dateA);
      })
      .map((record) => [
        record.fecha,
        record.horaEntrada || "-",
        record.horaSalida || "-",
        record.estado.toUpperCase(),
      ]);

    autoTable(doc, {
      startY: ((doc as any).lastAutoTable?.finalY || 120) + 20,
      head: [["Fecha", "Ingreso", "Salida", "Estado"]],
      body: historyData,
      theme: "grid",
      headStyles: { fillColor: [71, 85, 105] },
      margin: { left: 15, right: 15 },
    });

    doc.save(
      `Reporte_${student.nombre}_${student.apellido}_${student.dni}.pdf`,
    );
  };

  const handleImportAttendance = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map imported data to Attendance objects
        const importedAttendance = (data as any[]).reduce((acc: Attendance[], item: any): Attendance[] => {
          const dni = item.DNI?.toString() || "";
          if (!dni) return acc;
          
          const student = students.find((s) => s.dni === dni);
          if (!student) return acc; // Only import those found by DNI

          const estado = (item.Estado?.toLowerCase() || "entrada") as AttendanceStatus;
          const hora = item.Hora || new Date().toLocaleTimeString();

          // Handle Excel date format and normalize to local locale string for matching
          let fecha = item.Fecha;
          if (fecha instanceof Date) {
            fecha = fecha.toLocaleDateString();
          } else if (typeof fecha === "number") {
            // Excel serial date number
            fecha = new Date(Math.round((fecha - 25569) * 86400 * 1000)).toLocaleDateString();
          } else if (typeof fecha === "string" && fecha.includes("-")) {
            // Probably YYYY-MM-DD
            fecha = new Date(fecha + "T12:00:00").toLocaleDateString();
          } else if (!fecha || fecha === "-") {
            fecha = new Date(reportDateFilter + "T12:00:00").toLocaleDateString();
          }

          acc.push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            ownerId: currentUser?.parentId || currentUser?.id || "admin-1",
            studentDni: dni,
            studentId: student.id,
            studentName: `${student.nombre} ${student.apellido}`,
            studentRol: (student.rol as any) || "Estudiante",
            estado: estado,
            fecha: fecha,
            hora: hora,
            horaEntrada: estado === "entrada" || estado === "tardanza" ? hora : undefined,
            horaSalida: estado === "salida" ? hora : undefined,
          });
          return acc;
        }, [] as Attendance[]);

        // Filter out those that don't have a DNI if the user wants "only those that correspond"
        const validImports = importedAttendance;

        // Merge with existing attendance, potentially replacing duplicates if we really wanted to,
        // but for now appending is fine as the UI merges them in view.
        setAttendance((prev) => [...validImports, ...prev]);
        setToast({
          message: `${validImports.length} registros importados con éxito y vinculados a la lista.`,
          type: "success",
        });
      } catch (error) {
        console.error("Error importing Excel:", error);
        setToast({
          message:
            "Error al procesar el archivo Excel. Asegúrese de que tenga las columnas: DNI, Nombre, Rol, Estado, Hora, Fecha.",
          type: "error",
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredReportData = useMemo(() => {
    const targetDate = new Date(
      reportDateFilter + "T12:00:00",
    ).toLocaleDateString();

    return students
      .filter((student) => {
        const matchesSearch =
          (student.nombre || "")
            .toLowerCase()
            .includes((reportSearchTerm || "").toLowerCase()) ||
          (student.apellido || "")
            .toLowerCase()
            .includes((reportSearchTerm || "").toLowerCase()) ||
          student.dni.includes(reportSearchTerm);

        const matchesClass =
          !reportClassFilter || student.grado === reportClassFilter;
        const matchesRole =
          reportRoleFilter === "todos" || student.rol === reportRoleFilter;

        return matchesSearch && matchesClass && matchesRole;
      })
      .map((student) => {
        const targetDate = new Date(
          reportDateFilter + "T12:00:00",
        ).toLocaleDateString();
        const studentRecords = attendance.filter(
          (a) => a.studentDni === student.dni && a.fecha === targetDate,
        );

        // Merge multiple records if they exist (e.g., one for entry, one for exit)
        const combinedRecord = studentRecords.reduce((acc, curr) => {
          return {
            ...acc,
            ...curr,
            horaEntrada: curr.horaEntrada || acc.horaEntrada,
            horaSalida: curr.horaSalida || acc.horaSalida,
            // If multiple statuses, we might prefer one, but let's keep the latest or "salida" if exists
            estado: acc.estado === "salida" ? "salida" : curr.estado
          };
        }, {} as any);

        return {
          ...student,
          record: studentRecords.length > 0
            ? {
                horaEntrada: combinedRecord.horaEntrada,
                horaSalida: combinedRecord.horaSalida,
                estado: combinedRecord.estado,
              }
            : undefined,
        };
      })
      .sort((a, b) => {
        const timeA = a.record?.horaEntrada || "99:99:99";
        const timeB = b.record?.horaEntrada || "99:99:99";
        return timeA.localeCompare(timeB);
      });
  }, [
    students,
    attendance,
    reportSearchTerm,
    reportClassFilter,
    reportDateFilter,
    reportRoleFilter,
  ]);

  const reportStats = useMemo(() => {
    const studentsCount = filteredReportData.filter(
      (i) => i.rol === "Estudiante",
    ).length;
    const teachersCount = filteredReportData.filter(
      (i) => i.rol === "Docente",
    ).length;
    const presentCount = filteredReportData.filter(
      (i) => i.record?.estado,
    ).length;
    return { studentsCount, teachersCount, presentCount };
  }, [filteredReportData]);

  useEffect(() => {
    if (
      isScannerModalOpen &&
      (activeTab !== "asistencia" || !isAuthenticated)
    ) {
      stopScanner();
    }
  }, [activeTab, isAuthenticated, isScannerModalOpen, stopScanner]);

  const performEnrollmentPDFDownload = (
    enrollment: Enrollment,
    mode: "single" | "double",
  ) => {
    const doc = new jsPDF({
      orientation: mode === "double" ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const drawBoleta = (
      doc: jsPDF,
      en: Enrollment,
      xPos: number,
      yPos: number,
      scale: number,
    ) => {
      // Helper for scaled values
      const s = (v: number) => v * scale;
      const margin = mode === "double" ? 6 : 15;
      const pageWidth = mode === "double" ? 148 : 210;
      const fontSizeFactor = mode === "double" ? 0.85 : 1.0;
      const f = (size: number) => s(size * fontSizeFactor);

      // Header background
      doc.setFillColor(globalConfig.primaryColor || "#0f172a");
      doc.rect(xPos, yPos, pageWidth, s(35), "F");

      // Site Name
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(f(20));
      doc.setFont("helvetica", "bold");
      doc.text(globalConfig.siteName.toUpperCase(), xPos + pageWidth / 2, yPos + s(15), {
        align: "center",
      });

      // Slogan
      doc.setFontSize(f(8));
      doc.setFont("helvetica", "normal");
      doc.text(
        globalConfig.slogan || "Gestión Educativa Inteligente",
        xPos + pageWidth / 2,
        yPos + s(20),
        {
          align: "center",
        },
      );

      // Receipt Info
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(f(14));
      doc.setFont("helvetica", "bold");
      doc.text(
        `BOLETA #${enrollment.receiptNumber}`,
        xPos + pageWidth / 2,
        yPos + s(32),
        {
          align: "center",
        },
      );

      doc.setFontSize(f(8));
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${enrollment.date}`, xPos + margin, yPos + s(40));
      doc.text(`Atendido: ${enrollment.attendedBy}`, xPos + margin, yPos + s(45));

      // Student Info
      doc.setFillColor(248, 250, 252);
      doc.rect(xPos + margin, yPos + s(50), pageWidth - margin * 2, s(25), "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(xPos + margin, yPos + s(50), pageWidth - margin * 2, s(25), "S");

      doc.setFont("helvetica", "bold");
      doc.text("DATOS DEL ESTUDIANTE", xPos + margin + 3, yPos + s(55));
      doc.setFont("helvetica", "normal");
      doc.text(`Nombre: ${enrollment.studentName}`, xPos + margin + 3, yPos + s(60));
      doc.text(`DNI: ${enrollment.studentDni}`, xPos + margin + 3, yPos + s(65));
      doc.text(`Inicio: ${enrollment.classStartDate}`, xPos + margin + 3, yPos + s(70));

      // Payment Details
      doc.setFont("helvetica", "bold");
      doc.text("DETALLES DEL PAGO", xPos + margin, yPos + s(82));

      const tableData = [
        ["Concepto", "Monto"],
        ["Monto Total", `S/ ${enrollment.totalAmount}`],
        ["Materiales", `S/ ${enrollment.materialsAmount}`],
        ["Beca", enrollment.scholarshipType.toUpperCase()],
        ["Pago", enrollment.paymentType.toUpperCase()],
      ];

      if (enrollment.paymentType === "cuotas") {
        tableData.push([
          "Cuotas",
          enrollment.installmentsCount?.toString() || "N/A",
        ]);
        tableData.push([
          "Inicial",
          `S/ ${enrollment.firstInstallment}`,
        ]);
      }

      autoTable(doc, {
        startY: yPos + s(85),
        margin: { left: xPos + margin, right: 297 - (xPos + pageWidth - margin) },
        head: [tableData[0]],
        body: tableData.slice(1),
        theme: "striped",
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: f(8),
          fontStyle: "bold",
        },
        styles: { fontSize: f(8), cellPadding: s(1.5) },
      });

      // Total
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + s(120);
      doc.setFontSize(f(10));
      doc.setFont("helvetica", "bold");

      let totalToPay = 0;
      let baseAmount = enrollment.totalAmount;
      if (enrollment.scholarshipType === "completa") {
        baseAmount = 0;
      } else if (enrollment.scholarshipType === "media") {
        baseAmount = enrollment.totalAmount / 2;
      }
      totalToPay = baseAmount + (enrollment.materialsAmount || 0);

      doc.text(`TOTAL FINAL: S/ ${totalToPay.toFixed(2)}`, xPos + pageWidth - margin, finalY + s(8), {
        align: "right",
      });

      if (enrollment.paymentType === "cuotas" && enrollment.installmentsCount) {
        const paidNow = enrollment.firstInstallment || 0;
        const remaining = totalToPay - paidNow;
        const remainingInstallments = enrollment.installmentsCount - 1;
        const nextInstallmentAmount =
          remainingInstallments > 0 ? remaining / remainingInstallments : 0;

        doc.setFontSize(f(7));
        doc.text(
          `Saldo: S/ ${remaining.toFixed(2)}`,
          xPos + pageWidth - margin,
          finalY + s(14),
          { align: "right" },
        );
        if (remainingInstallments > 0) {
          doc.text(
            `${remainingInstallments} cuotas de S/ ${nextInstallmentAmount.toFixed(2)}`,
            xPos + pageWidth - margin,
            finalY + s(18),
            { align: "right" },
          );
        }
      }

      doc.setFontSize(f(7));
      doc.text(
        `Método: ${(enrollment.paymentMethod || "Efectivo").toUpperCase()}`,
        xPos + margin,
        finalY + s(8),
      );

      // Disclaimer
      const disclaimerY = finalY + s(25);
      doc.setFontSize(f(6));
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const disclaimer = "ACEPTO TODOS LOS DERECHOS Y SOY CONCIENTE DEL PAGO QUE ESTOY REALIZANDO. NO HAY DEVOLUCIONES POSTERIORMENTE DESPUES DE REALIZAR EL PAGO.";
      const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - margin * 2);
      doc.text(splitDisclaimer, xPos + pageWidth / 2, disclaimerY, { align: "center" });

      // Footer slogan
      doc.setFontSize(f(6));
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text(
        globalConfig.footerText || "Gracias por confiar en nuestra institución.",
        xPos + pageWidth / 2,
        disclaimerY + s(8),
        { align: "center" },
      );
    };


    if (mode === "single") {
      drawBoleta(doc, enrollment, 0, 0, 1);
    } else {
      // Side-by-side on Landscape A4
      // A4 Landscape: 297x210 mm
      // Center lines at 148.5 mm
      
      drawBoleta(doc, enrollment, 0, 0, 0.9);
      
      // Separator line at 148.5
      doc.setLineDashPattern([2, 5], 0);
      doc.setDrawColor(200, 200, 200);
      doc.line(148.5, 5, 148.5, 205);
      
      // Second copy centered nicely
      drawBoleta(doc, enrollment, 148.5, 0, 0.9);
    }

    doc.save(`Boleta_Matricula_${enrollment.receiptNumber}.pdf`);
    setShowEnrollmentPDFOptions(false);
    setToast({ message: `Boleta (${mode === 'single' ? 'Simple' : 'Doble'}) descargada`, type: "success" });
  };

  const generateEnrollmentPDF = (enrollment: Enrollment) => {
    setPendingEnrollmentForPDF(enrollment);
    setShowEnrollmentPDFOptions(true);
  };

  const handleUpdateEnrollment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingEnrollment) return;

    const formData = new FormData(e.currentTarget);
    const updated: Enrollment = {
      ...editingEnrollment,
      paymentType: formData.get("paymentType") as any,
      scholarshipType: formData.get("scholarshipType") as any,
      totalAmount: parseFloat(formData.get("totalAmount") as string),
      materialsAmount: parseFloat(formData.get("materialsAmount") as string),
      firstInstallment: formData.get("firstInstallment")
        ? parseFloat(formData.get("firstInstallment") as string)
        : undefined,
      installmentsCount: formData.get("installmentsCount")
        ? parseInt(formData.get("installmentsCount") as string)
        : undefined,
      classStartDate: formData.get("classStartDate") as string,
    };

    setEnrollments(
      enrollments.map((en) => (en.id === updated.id ? updated : en)),
    );
    setEditingEnrollment(null);
    setToast({ message: "Matrícula actualizada con éxito", type: "success" });
  };

  const shareEnrollmentWhatsApp = (enrollment: Enrollment) => {
    let baseAmount = enrollment.totalAmount;
    if (enrollment.scholarshipType === "completa") {
      baseAmount = 0;
    } else if (enrollment.scholarshipType === "media") {
      baseAmount = enrollment.totalAmount / 2;
    }
    const totalToPay = baseAmount + (enrollment.materialsAmount || 0);
    const remaining =
      enrollment.paymentType === "cuotas"
        ? totalToPay - (enrollment.firstInstallment || 0)
        : 0;
    const remainingInstallments = (enrollment.installmentsCount || 1) - 1;
    const nextInstallmentAmount =
      remainingInstallments > 0 ? remaining / remainingInstallments : 0;

    const student = students.find((s) => s.dni === enrollment.studentDni);
    const phone = student?.celularApoderado
      ? student.celularApoderado.replace(/\D/g, "")
      : "";

    const message =
      `*BOLETA DE MATRÍCULA #${enrollment.receiptNumber}*\n\n` +
      `*Estudiante:* ${enrollment.studentName}\n` +
      `*DNI:* ${enrollment.studentDni}\n` +
      `*Fecha:* ${enrollment.date}\n` +
      `*Inicio Clases:* ${enrollment.classStartDate}\n\n` +
      `*DETALLES DEL PAGO*\n` +
      `*Tipo:* ${enrollment.paymentType.toUpperCase()}\n` +
      `*Beca:* ${enrollment.scholarshipType.toUpperCase()}\n` +
      `*Método:* ${(enrollment.paymentMethod || "Efectivo").toUpperCase()}\n` +
      `*Total:* S/ ${totalToPay.toFixed(2)}\n` +
      (enrollment.paymentType === "cuotas"
        ? `*Pago Inicial:* S/ ${enrollment.firstInstallment?.toFixed(2)}\n` +
          `*Saldo Pendiente:* S/ ${remaining.toFixed(2)}\n` +
          (remainingInstallments > 0
            ? `*Cuotas Restantes (${remainingInstallments}):* S/ ${nextInstallmentAmount.toFixed(2)} c/u\n`
            : "")
        : "") +
      `\n_Acepto todos los derechos y soy conciente del pago realizado. No hay devoluciones._`;

    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleConsultasSearch = async (dni: string) => {
    const pub = globalConfig.publicModules || {
      attendance: true,
      alerts: true,
      schedule: true,
      grades: true,
      exams: true,
    };
    if (!pub.attendance && !pub.alerts && !pub.schedule && !pub.grades && pub.exams === false) {
      setToast({
        message: "El acceso público está deshabilitado por el administrador.",
        type: "error",
      });
      return;
    }

    try {
      const result = await api.fetchPublicSearch(dni); // TODO: implement client-side caching
      if (result && result.student) {
        // Temporarily set the state with the fetched data so the modal can display it
        // We don't want to overwrite the main state if an admin is logged in, but for public access it's fine.
        // Actually, the modal uses the global state (attendance, grades, etc.).
        // We should pass the fetched data to the modal or update the state if not authenticated.
        if (!isAuthenticated) {
          setAttendance(result.attendance || []);
          setGrades(result.grades || []);
          setIncidences(result.incidences || []);
          setSchedules(result.schedules || []);
          setCourses(result.courses || []);
          setGradeLevels(result.gradeLevels || []);
          setExamTypes(result.examTypes || []);
          setTimeSlots(result.timeSlots || []);
          setSchoolDays(result.schoolDays || []);
          setPublicSearchOwnerId(result.ownerId || null);
        }

        const student = result.student;
        setConsultasResult(student);
        setIsDniInputModalOpen(false);
        setIsConsultasModalOpen(true);
        setConsultasSearchDni("");

        // Log the search (only if authenticated, or we can just skip logging for public search to avoid complex state updates)
        if (isAuthenticated) {
          const newLog: ConsultationLog = {
            id: Date.now().toString(),
            studentDni: student.dni,
            nivel: student.nivel,
            grado: student.grado,
            seccion: student.seccion,
            timestamp: Date.now(),
            date: new Date().toISOString().split("T")[0],
          };
          setConsultationLogs((prev) => [...prev, newLog]);
        }

        // Set default tab based on role
        if (student.rol === "Docente") {
          setActiveConsultasTab("horario");
        } else {
          if (pub.attendance === true) setActiveConsultasTab("asistencia");
          else if (pub.alerts === true) setActiveConsultasTab("alerta");
          else if (pub.schedule === true) setActiveConsultasTab("horario");
          else if (pub.grades === true) setActiveConsultasTab("notas");
          else if (pub.opticalSheetEnabled === true) setActiveConsultasTab("ficha_optica");
        }
      } else {
        setToast({
          message: "No se encontró ningún estudiante con ese DNI.",
          type: "error",
        });
      }
    } catch (e) {
      console.error("Error searching student:", e);
      setToast({
        message:
          "No se encontró ningún estudiante con ese DNI o hubo un error de conexión.",
        type: "error",
      });
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Attempting admin login...");
    const hashedPassword = await hashPassword(adminLoginPassword);
    console.log("Input password:", adminLoginPassword);
    console.log("Hashed input:", hashedPassword);

    // Only main admin (no parentId) can login here
    const adminUser = users.find(
      (u) => u.role === "admin" && u.parentId === undefined,
    );

    if (adminUser) {
      console.log("Admin user found:", adminUser.username);
      console.log("Stored password:", adminUser.password);

      const isMatch =
        adminUser.password === adminLoginPassword ||
        adminUser.password === hashedPassword;
      console.log("Password match:", isMatch);

      if (isMatch) {
        const adminWithAllPerms = {
          ...adminUser,
          permissions: ALL_PERMISSIONS,
        };
        // Update password to hashed if it was plain text
        if (adminWithAllPerms.password === adminLoginPassword) {
          console.log("Updating plain text password to hashed...");
          const updatedUser = {
            ...adminWithAllPerms,
            password: hashedPassword,
            realPassword: adminWithAllPerms.realPassword || adminLoginPassword,
          };
          setUsers((users || []).map((u) => (u.id === adminUser.id ? updatedUser : u)));
          setCurrentUser(updatedUser);
        } else {
          setCurrentUser(adminWithAllPerms);
        }
        setShowLanding(false);
        setIsAdminLoginModalOpen(false);
        setAdminLoginPassword("");
        setIsAuthenticated(true);
        setToast({
          message: `Bienvenido Administrador, ${adminWithAllPerms.fullName || adminWithAllPerms.username}`,
          type: "success",
        });
      } else {
        setToast({
          message: "Contraseña administrativa incorrecta.",
          type: "error",
        });
      }
    } else {
      console.log("No main admin user found in users list.");
      setToast({
        message: "No se encontró un administrador principal.",
        type: "error",
      });
    }
  };

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "estudiantes", icon: Database, label: "Registro General" },
    { id: "asistencia", icon: CalendarCheck, label: "Asistencia" },
    { id: "reportes", icon: FileText, label: "Reportes" },
    { id: "matricula", icon: FileSpreadsheet, label: "Matrícula" },
    { id: "alerta", icon: AlertCircle, label: "ALERTA" },
    { id: "calificaciones", icon: BarChart3, label: "Calificaciones" },
    { id: "mi-panel", icon: User, label: "Mi Panel" },
    { id: "config", icon: Settings, label: "Configuración" },
  ].filter((item) => {
    if (item.id === "config" && currentUser?.role !== "admin") return false;
    if (currentUser?.role === "admin") return true;
    if (currentUser?.permissions.includes(item.id)) return true;
    return currentUser?.permissions.some((p) => p.startsWith(`${item.id}:`));
  });

  // Ensure activePanelSubTab is valid for current user permissions
  useEffect(() => {
    if (activeTab === "mi-panel" && currentUser?.role !== "admin") {
      const hasCurrentSubTab = currentUser?.permissions.includes(
        `mi-panel:${activePanelSubTab}`,
      );
      if (!hasCurrentSubTab) {
        const firstAvailable = currentUser?.permissions.find((p) =>
          p.startsWith("mi-panel:"),
        );
        if (firstAvailable) {
          setActivePanelSubTab(firstAvailable.split(":")[1] as any);
        }
      }
    }
  }, [activeTab, currentUser, activePanelSubTab]);

  const handleVerifyPassword = async (password: string) => {
    const hashedPassword = await hashPassword(password);
    console.log("Verifying password:", { password, hashedPassword });

    let matchedUser = users.find(
      (u) => u.password === password || u.password === hashedPassword,
    );

    if (
      globalConfig.adminPassword === password ||
      globalConfig.adminPassword === hashedPassword
    ) {
      matchedUser =
        users.find((u) => u.role === "admin") ||
        ({
          id: "admin-1",
          role: "admin",
          permissions: ALL_PERMISSIONS,
        } as AppUser);
    }

    if (matchedUser) {
      setCurrentUser(matchedUser);
      await loadUserData(matchedUser);
      return true;
    }

    return false;
  };

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #boleta-generada, #boleta-generada * {
              visibility: visible;
            }
            #boleta-generada {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              border: none;
              box-shadow: none;
              background: white;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>
      {showLanding ? (
        <Landing
          globalConfig={globalConfig}
          onConsultasSearch={handleConsultasSearch}
          onAdminLogin={() => setIsAdminLoginModalOpen(true)}
          onLogin={() => setShowLanding(false)}
          onMarkAttendance={markAttendance}
          onVerifyPassword={handleVerifyPassword}
        />
      ) : !isAuthenticated ? (
        <Login
          globalConfig={globalConfig}
          handleLogin={handleLogin}
          onBack={() => setShowLanding(true)}
        />
      ) : (
        <div
          className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden"
          style={{ fontFamily: activeConfig.theme?.fontFamily || "Poppins" }}
        >
          <Sidebar
            activeConfig={activeConfig}
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isMobileMenuOpen={isMobileMenuOpen}
            onLogout={handleLogout}
            navItems={navItems}
            originalUser={originalUser}
            onBackToOriginal={() => {
              if (originalUser) {
                setCurrentUser(originalUser);
                setOriginalUser(null);
                setToast({
                  message: `Regresando a la cuenta de ${originalUser.username}`,
                  type: "success",
                });
              }
            }}
          />

          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar
              activeTab={activeTab}
              activeConfig={activeConfig}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              isMobileMenuOpen={isMobileMenuOpen}
            />

            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
              <div className="max-w-7xl mx-auto space-y-6">
                {activeTab === "dashboard" && (
                  <Dashboard
                    students={students}
                    attendance={attendance}
                    incidences={incidences}
                    activeConfig={activeConfig}
                    isAiLoading={isAiLoading}
                    aiReport={aiReport}
                    generateAiReport={generateAiReport}
                    currentUser={currentUser}
                  />
                )}

                {/* Reportes Section */}
                {activeTab === "reportes" && (
                  <div className="animate-slide-up space-y-8">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tight">
                          {activeConfig.siteName}
                        </h2>
                        <p className="text-slate-500 font-medium">
                          Reportes Institucionales - Análisis y exportación de
                          datos.
                        </p>
                      </div>
                      <div className="flex flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 overflow-x-auto no-scrollbar">
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "reportes:global",
                          )) && (
                          <button
                            onClick={() => setActiveReportSubTab("global")}
                            className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeReportSubTab === "global" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200 hover:border-blue-200"}`}
                          >
                            Reporte Global
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "reportes:personalizado",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveReportSubTab("personalizado")
                            }
                            className={`px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all whitespace-nowrap ${activeReportSubTab === "personalizado" ? "bg-blue-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200 hover:border-blue-200"}`}
                          >
                            Personalizado
                          </button>
                        )}
                      </div>
                    </header>

                    {activeReportSubTab === "global" && (
                      <div className="space-y-8">
                        {/* Stats Bar */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-6">
                            <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
                              <Users size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Estudiantes
                              </p>
                              <h4 className="text-2xl font-black text-slate-800">
                                {reportStats.studentsCount}
                              </h4>
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-6">
                            <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600">
                              <GraduationCap size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Docentes
                              </p>
                              <h4 className="text-2xl font-black text-slate-800">
                                {reportStats.teachersCount}
                              </h4>
                            </div>
                          </div>
                          <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-6">
                            <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
                              <UserCheck size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Asistentes Hoy
                              </p>
                              <h4 className="text-2xl font-black text-slate-800">
                                {reportStats.presentCount}
                              </h4>
                            </div>
                          </div>
                        </div>

                        {/* Filters Bar */}
                        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                Búsqueda
                              </label>
                              <div className="relative">
                                <Search
                                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                  size={18}
                                />
                                <input
                                  type="text"
                                  placeholder="Nombre o DNI..."
                                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                  value={reportSearchTerm}
                                  onChange={(e) =>
                                    setReportSearchTerm(e.target.value)
                                  }
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                Grado / Aula
                              </label>
                              <select
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                value={reportClassFilter}
                                onChange={(e) =>
                                  setReportClassFilter(e.target.value)
                                }
                              >
                                <option value="">Todos los grados</option>
                                {Array.from(
                                  new Set(students.map((s) => s.grado)),
                                )
                                  .sort()
                                  .map((grado) => (
                                    <option key={grado} value={grado}>
                                      {grado}
                                    </option>
                                  ))}
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                Rol
                              </label>
                              <select
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                                value={reportRoleFilter}
                                onChange={(e) =>
                                  setReportRoleFilter(e.target.value)
                                }
                              >
                                <option value="todos">Todos</option>
                                <option value="Estudiante">Estudiantes</option>
                                <option value="Docente">Docentes</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                Fecha
                              </label>
                              <input
                                type="date"
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                                value={reportDateFilter}
                                onChange={(e) =>
                                  setReportDateFilter(e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row flex-wrap gap-4 pt-4 border-t border-slate-100">
                            <button
                              onClick={() => {
                                setReportSearchTerm("");
                                setReportClassFilter("");
                                setReportDateFilter(
                                  new Date().toISOString().split("T")[0],
                                );
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
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".xlsx, .xls"
                                  onChange={handleImportAttendance}
                                />
                              </label>
                              <button
                                onClick={() => {
                                  const data = filteredReportData.flatMap(
                                    (item) => {
                                      const records = [];
                                      if (item.record?.horaEntrada) {
                                        records.push({
                                          Nombre: `${item.nombre} ${item.apellido}`,
                                          DNI: item.dni,
                                          Rol: item.rol,
                                          Grado: item.grado,
                                          Seccion: item.seccion,
                                          Estado: "entrada",
                                          Hora: item.record.horaEntrada,
                                          Fecha: reportDateFilter,
                                        });
                                      }
                                      if (item.record?.horaSalida) {
                                        records.push({
                                          Nombre: `${item.nombre} ${item.apellido}`,
                                          DNI: item.dni,
                                          Rol: item.rol,
                                          Grado: item.grado,
                                          Seccion: item.seccion,
                                          Estado: "salida",
                                          Hora: item.record.horaSalida,
                                          Fecha: reportDateFilter,
                                        });
                                      }
                                      // If no records, just create a placeholder row for template if needed? 
                                      // User wants to export what corresponds.
                                      if (records.length === 0) {
                                        records.push({
                                          Nombre: `${item.nombre} ${item.apellido}`,
                                          DNI: item.dni,
                                          Rol: item.rol,
                                          Grado: item.grado,
                                          Seccion: item.seccion,
                                          Estado: "-",
                                          Hora: "-",
                                          Fecha: reportDateFilter,
                                        });
                                      }
                                      return records;
                                    }
                                  );
                                  exportToExcel(
                                    data,
                                    `reporte_global_${reportDateFilter}`,
                                  );
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all shadow-lg w-full sm:w-auto"
                              >
                                <Database size={16} /> Excel
                              </button>
                              <button
                                onClick={() => {
                                  const data = filteredReportData.map(
                                    (item) => ({
                                      nombre: `${item.nombre} ${item.apellido}`,
                                      dni: item.dni,
                                      rol: item.rol,
                                      entrada: item.record?.horaEntrada || "-",
                                      salida: item.record?.horaSalida || "-",
                                      fecha: reportDateFilter,
                                    }),
                                  );
                                  exportToPDF(
                                    data,
                                    `Reporte Global de Asistencia - ${reportDateFilter}`,
                                  );
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-rose-700 transition-all shadow-lg w-full sm:w-auto"
                              >
                                <FileText size={16} /> PDF
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Results Table */}
                        <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl overflow-scroll no-scrollbar border border-slate-200">
                          <div className="w-full">
                            <table className="w-full text-left border-collapse table-fixed">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="p-4 md:p-6 font-black text-slate-400 uppercase text-[8px] md:text-[10px] tracking-widest w-1/2 md:w-2/5 md:pl-10">
                                    Persona
                                  </th>
                                  <th className="p-4 md:p-6 font-black text-slate-400 uppercase text-[8px] md:text-[10px] tracking-widest text-center w-1/4 md:w-1/4">
                                    Registros
                                  </th>
                                  <th className="p-4 md:p-6 font-black text-slate-400 uppercase text-[8px] md:text-[10px] tracking-widest text-center w-1/4 md:w-1/6 md:pr-10">
                                    Aula / Rol
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {filteredReportData.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-blue-50/30 transition-colors group"
                                  >
                                    <td className="p-4 md:p-6 md:pl-10">
                                      <div className="flex flex-col">
                                        <p className="font-black text-slate-800 uppercase tracking-tighter text-[10px] md:text-sm truncate leading-tight">
                                          {item.nombre} {item.apellido}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <p className="font-mono text-slate-400 font-bold text-[8px] md:text-[10px]">
                                            {item.dni}
                                          </p>
                                          <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-200"></span>
                                          <span className="text-[7px] md:text-[9px] font-black text-blue-400 uppercase sm:hidden">
                                            {item.rol}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="p-4 md:p-6 text-center">
                                      <div className="flex flex-col items-center gap-1">
                                        {item.record?.horaEntrada && (
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono text-[9px] md:text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                              {item.record.horaEntrada}
                                            </span>
                                          </div>
                                        )}
                                        {item.record?.horaSalida && (
                                          <div className="flex items-center gap-1">
                                            <span className="font-mono text-[9px] md:text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                              {item.record.horaSalida}
                                            </span>
                                          </div>
                                        )}
                                        {!item.record && (
                                          <span className="text-slate-200">—</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-4 md:p-6 text-center md:pr-10">
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[9px] md:text-xs font-bold text-slate-500 whitespace-nowrap">
                                          {item.grado} "{item.seccion}"
                                        </span>
                                        <span className={`hidden sm:inline px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${item.rol === "Docente" ? "text-indigo-500 border-indigo-100 bg-indigo-50/30" : "text-blue-500 border-blue-100 bg-blue-50/30"}`}>
                                          {item.rol}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {filteredReportData.length === 0 && (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                              <ClipboardList size={40} className="opacity-20" />
                              <p className="mt-4 font-black uppercase tracking-widest text-xs text-center">
                                No se encontraron registros de asistencia
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeReportSubTab === "personalizado" && (
                      <div className="animate-slide-up space-y-6">
                        {/* Search for Student */}
                        <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-200">
                          <div className="max-w-xl mx-auto space-y-4">
                            <div className="text-center space-y-1">
                              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                Reporte Individual Detallado
                              </h3>
                              <p className="text-slate-500 text-xs font-medium">
                                Busque a una persona para generar su historial
                                completo.
                              </p>
                            </div>
                            <div className="relative">
                              <Search
                                className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                                size={20}
                              />
                              <input
                                type="text"
                                placeholder="Ingrese DNI o Nombre completo..."
                                className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-lg font-bold transition-all shadow-inner"
                                value={personalSearchTerm}
                                onChange={(e) => {
                                  setPersonalSearchTerm(e.target.value);
                                  if (e.target.value.length > 2) {
                                    const found = students.find(
                                      (s) =>
                                        s.dni.includes(e.target.value) ||
                                        `${s.nombre} ${s.apellido}`
                                          .toLowerCase()
                                          .includes(
                                            e.target.value.toLowerCase(),
                                          ),
                                    );
                                    if (found)
                                      setSelectedPersonalStudent(found);
                                    else setSelectedPersonalStudent(null);
                                  } else {
                                    setSelectedPersonalStudent(null);
                                  }
                                }}
                              />
                            </div>

                            {personalSearchTerm.length > 2 &&
                              !selectedPersonalStudent && (
                                <p className="text-center text-rose-500 font-bold animate-pulse text-xs">
                                  No se encontró ninguna coincidencia exacta.
                                </p>
                              )}
                          </div>
                        </div>

                        {selectedPersonalStudent && (
                          <div className="animate-slide-up space-y-6">
                            {/* Student Profile Summary */}
                            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-100 flex flex-col md:flex-row gap-8 items-center">
                              <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-white shadow-lg overflow-hidden flex-shrink-0">
                                {selectedPersonalStudent.foto ? (
                                  <img
                                    src={selectedPersonalStudent.foto}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <User size={64} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 text-center md:text-left space-y-3">
                                <div>
                                  <span
                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${selectedPersonalStudent.rol === "Estudiante" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}
                                  >
                                    {selectedPersonalStudent.rol}
                                  </span>
                                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mt-1">
                                    {selectedPersonalStudent.nombre}{" "}
                                    {selectedPersonalStudent.apellido}
                                  </h2>
                                  <p className="text-slate-400 font-mono font-bold text-lg">
                                    DNI: {selectedPersonalStudent.dni}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Nivel
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs">
                                      {selectedPersonalStudent.nivel}
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Grado / Aula
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs">
                                      {selectedPersonalStudent.grado} "
                                      {selectedPersonalStudent.seccion}"
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Turno
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs">
                                      {selectedPersonalStudent.turno ||
                                        "No asignado"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex-shrink-0">
                                <button
                                  onClick={() => {
                                    const studentAttendance = attendance.filter(
                                      (a) =>
                                        a.studentDni ===
                                        selectedPersonalStudent.dni,
                                    );
                                    const stats = {
                                      presentes: studentAttendance.filter(
                                        (a) => a.estado === "entrada",
                                      ).length,
                                      tardanzas: studentAttendance.filter(
                                        (a) => a.estado === "tardanza",
                                      ).length,
                                      permisos: studentAttendance.filter(
                                        (a) => a.estado === "permiso",
                                      ).length,
                                      faltas: studentAttendance.filter(
                                        (a) => a.estado === "ausente",
                                      ).length,
                                    };
                                    exportPersonalReportToPDF(
                                      selectedPersonalStudent,
                                      studentAttendance,
                                      stats,
                                    );
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
                                const studentAttendance = attendance.filter(
                                  (a) =>
                                    a.studentDni ===
                                    selectedPersonalStudent.dni,
                                );
                                const stats = [
                                  {
                                    label: "Asistencias",
                                    value: studentAttendance.filter(
                                      (a) => a.estado === "entrada",
                                    ).length,
                                    color: "emerald",
                                    icon: CheckCircle,
                                  },
                                  {
                                    label: "Tardanzas",
                                    value: studentAttendance.filter(
                                      (a) => a.estado === "tardanza",
                                    ).length,
                                    color: "amber",
                                    icon: Clock,
                                  },
                                  {
                                    label: "Permisos",
                                    value: studentAttendance.filter(
                                      (a) => a.estado === "permiso",
                                    ).length,
                                    color: "indigo",
                                    icon: FileText,
                                  },
                                  {
                                    label: "Faltas",
                                    value: studentAttendance.filter(
                                      (a) => a.estado === "ausente",
                                    ).length,
                                    color: "rose",
                                    icon: X,
                                  },
                                ];
                                return stats.map((stat) => (
                                  <div
                                    key={stat.label}
                                    className={`bg-white p-6 rounded-3xl shadow-md border border-${stat.color}-50 text-center relative overflow-hidden group`}
                                  >
                                    <div
                                      className={`absolute -right-2 -top-2 text-${stat.color}-500/10 group-hover:scale-110 transition-transform`}
                                    >
                                      <stat.icon size={64} />
                                    </div>
                                    <p
                                      className={`text-2xl font-black text-${stat.color}-600 relative z-10`}
                                    >
                                      {stat.value}
                                    </p>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">
                                      {stat.label}
                                    </p>
                                  </div>
                                ));
                              })()}
                            </div>

                            {/* Detailed History Table */}
                            <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-200">
                              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                  Historial de Asistencia
                                </h4>
                                <span className="px-3 py-1 rounded-lg bg-slate-50 text-slate-400 font-black text-[9px] uppercase tracking-widest">
                                  Total:{" "}
                                  {
                                    attendance.filter(
                                      (a) =>
                                        a.studentDni ===
                                        selectedPersonalStudent.dni,
                                    ).length
                                  }{" "}
                                  registros
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="edu-table w-full">
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
                                      .filter(
                                        (a) =>
                                          a.studentDni ===
                                          selectedPersonalStudent.dni,
                                      )
                                      .sort((a, b) => {
                                        const dateA = (a.fecha || "")
                                          .split("/")
                                          .reverse()
                                          .join("-");
                                        const dateB = (b.fecha || "")
                                          .split("/")
                                          .reverse()
                                          .join("-");
                                        return dateB.localeCompare(dateA);
                                      })
                                      .map((record) => (
                                        <tr key={record.id}>
                                          <td className="font-bold text-slate-600 text-xs">
                                            {record.fecha}
                                          </td>
                                          <td className="font-mono font-black text-emerald-600 text-xs">
                                            {record.horaEntrada || "—"}
                                          </td>
                                          <td className="font-mono font-black text-blue-600 text-xs">
                                            {record.horaSalida || "—"}
                                          </td>
                                          <td>
                                            <StatusBadge
                                              status={record.estado}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {!selectedPersonalStudent &&
                          personalSearchTerm.length <= 2 && (
                            <div className="bg-white p-12 rounded-3xl shadow-md border border-slate-200 text-center">
                              <div className="max-w-md mx-auto space-y-4 opacity-40">
                                <Sparkles
                                  size={48}
                                  className="mx-auto text-blue-600"
                                />
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                  Reportes Personalizados
                                </h3>
                                <p className="text-xs font-medium text-slate-500">
                                  Busque un estudiante o docente para ver su
                                  historial detallado de asistencia y descargar
                                  el reporte oficial.
                                </p>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "matricula" && (
                  <div className="animate-slide-up space-y-8">
                    <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                          Módulo de Matrícula
                        </h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base">
                          Gestión de inscripciones, pagos y boletas.
                        </p>
                      </div>
                    </header>

                    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                            Buscar Estudiante (Nombre o DNI)
                          </label>
                          <div className="relative">
                            <Search
                              className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
                              size={20}
                            />
                            <input
                              type="text"
                              placeholder="Ingrese nombre o DNI..."
                              className="w-full pl-14 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none text-lg font-bold transition-all shadow-inner"
                              value={enrollmentSearch}
                              onChange={(e) => {
                                setEnrollmentSearch(e.target.value);
                                const found = students.find(
                                  (s) =>
                                    s.dni.includes(e.target.value) ||
                                    `${s.nombre} ${s.apellido}`
                                      .toLowerCase()
                                      .includes(e.target.value.toLowerCase()),
                                );
                                if (found) setSelectedEnrollmentStudent(found);
                                else setSelectedEnrollmentStudent(null);
                              }}
                            />
                          </div>
                        </div>

                        {selectedEnrollmentStudent && (
                          <div className="animate-slide-up space-y-8">
                            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-6">
                              <div className="w-20 h-20 rounded-2xl bg-white p-1 shadow-md">
                                <div className="w-full h-full rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                                  {selectedEnrollmentStudent.foto ? (
                                    <img
                                      src={selectedEnrollmentStudent.foto}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User
                                      size={32}
                                      className="text-slate-300"
                                    />
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                  {selectedEnrollmentStudent.nombre}{" "}
                                  {selectedEnrollmentStudent.apellido}
                                </h4>
                                <p className="text-xs font-bold text-slate-500 uppercase">
                                  {selectedEnrollmentStudent.grado} "
                                  {selectedEnrollmentStudent.seccion}" -{" "}
                                  {selectedEnrollmentStudent.nivel}
                                </p>
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                                  DNI: {selectedEnrollmentStudent.dni}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                    Tipo de Pago
                                  </label>
                                  <div className="grid grid-cols-2 gap-4">
                                    <button
                                      onClick={() =>
                                        setEnrollmentPaymentType("contado")
                                      }
                                      className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${enrollmentPaymentType === "contado" ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                    >
                                      Al Contado
                                    </button>
                                    <button
                                      onClick={() =>
                                        setEnrollmentPaymentType("cuotas")
                                      }
                                      className={`py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${enrollmentPaymentType === "cuotas" ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                    >
                                      A Cuotas
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                    Tipo de Beca
                                  </label>
                                  <div className="grid grid-cols-3 gap-4">
                                    <button
                                      onClick={() =>
                                        setEnrollmentScholarship("ninguna")
                                      }
                                      className={`py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${enrollmentScholarship === "ninguna" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                    >
                                      Ninguna
                                    </button>
                                    <button
                                      onClick={() =>
                                        setEnrollmentScholarship("media")
                                      }
                                      className={`py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${enrollmentScholarship === "media" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                    >
                                      Media Beca
                                    </button>
                                    <button
                                      onClick={() =>
                                        setEnrollmentScholarship("completa")
                                      }
                                      className={`py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${enrollmentScholarship === "completa" ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                    >
                                      Beca Completa
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                    Fecha de Inicio de Clases
                                  </label>
                                  <input
                                    type="date"
                                    value={enrollmentClassStartDate}
                                    onChange={(e) =>
                                      setEnrollmentClassStartDate(
                                        e.target.value,
                                      )
                                    }
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                    Método de Pago
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {[
                                      "efectivo",
                                      "transferencia",
                                      "billetera",
                                    ].map((method) => (
                                      <button
                                        key={method}
                                        onClick={() =>
                                          setEnrollmentPaymentMethod(
                                            method as any,
                                          )
                                        }
                                        className={`py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${enrollmentPaymentMethod === method ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                                      >
                                        {method === "billetera"
                                          ? "Yape/Plin"
                                          : method.charAt(0).toUpperCase() +
                                            method.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                      Monto Total
                                    </label>
                                    <input
                                      type="number"
                                      value={enrollmentTotalAmount}
                                      onChange={(e) =>
                                        setEnrollmentTotalAmount(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                      Monto Materiales
                                    </label>
                                    <input
                                      type="number"
                                      value={enrollmentMaterialsAmount}
                                      onChange={(e) =>
                                        setEnrollmentMaterialsAmount(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>

                                {enrollmentPaymentType === "cuotas" && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                        Primera Cuota
                                      </label>
                                      <input
                                        type="number"
                                        value={enrollmentFirstInstallment}
                                        onChange={(e) =>
                                          setEnrollmentFirstInstallment(
                                            Number(e.target.value),
                                          )
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                        N° de Cuotas
                                      </label>
                                      <input
                                        type="number"
                                        value={enrollmentInstallmentsCount}
                                        onChange={(e) =>
                                          setEnrollmentInstallmentsCount(
                                            Number(e.target.value),
                                          )
                                        }
                                        className="w-full p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                      Resumen de Pago
                                    </span>
                                    <span className="px-3 py-1 rounded-lg bg-white/10 text-[9px] font-black uppercase tracking-widest">
                                      {enrollmentScholarship === "completa"
                                        ? "Beca Completa"
                                        : enrollmentScholarship === "media"
                                          ? "Media Beca"
                                          : "Regular"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-baseline">
                                    <span className="text-xs font-bold opacity-60">
                                      Total a Pagar:
                                    </span>
                                    <span className="text-3xl font-black">
                                      S/{" "}
                                      {enrollmentScholarship === "completa"
                                        ? enrollmentMaterialsAmount
                                        : enrollmentScholarship === "media"
                                          ? enrollmentTotalAmount / 2 +
                                            enrollmentMaterialsAmount
                                          : enrollmentTotalAmount +
                                            enrollmentMaterialsAmount}
                                    </span>
                                  </div>
                                  {enrollmentPaymentType === "cuotas" && (
                                    <>
                                      <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                          Pago Inicial:
                                        </span>
                                        <span className="text-xl font-black text-blue-400">
                                          S/ {enrollmentFirstInstallment}
                                        </span>
                                      </div>
                                      {enrollmentInstallmentsCount > 1 && (
                                        <div className="pt-2 flex justify-between items-center">
                                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                            Cuotas Restantes (
                                            {enrollmentInstallmentsCount - 1}):
                                          </span>
                                          <span className="text-sm font-bold text-slate-300">
                                            S/{" "}
                                            {(
                                              ((enrollmentScholarship ===
                                              "completa"
                                                ? enrollmentMaterialsAmount
                                                : enrollmentScholarship ===
                                                    "media"
                                                  ? enrollmentTotalAmount / 2 +
                                                    enrollmentMaterialsAmount
                                                  : enrollmentTotalAmount +
                                                    enrollmentMaterialsAmount) -
                                                enrollmentFirstInstallment) /
                                              (enrollmentInstallmentsCount - 1)
                                            ).toFixed(2)}{" "}
                                            c/u
                                          </span>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-center pt-8">
                              <button
                                onClick={() => {
                                  if (!enrollmentClassStartDate) {
                                    setToast({
                                      message:
                                        "Debe seleccionar una fecha de inicio de clases",
                                      type: "error",
                                    });
                                    return;
                                  }
                                  const newEnrollment: Enrollment = {
                                    id: Date.now().toString(),
                                    ownerId:
                                      currentUser?.parentId ||
                                      currentUser?.id ||
                                      "admin-1",
                                    studentId: selectedEnrollmentStudent.id,
                                    studentName: `${selectedEnrollmentStudent.nombre} ${selectedEnrollmentStudent.apellido}`,
                                    studentDni: selectedEnrollmentStudent.dni,
                                    paymentType: enrollmentPaymentType,
                                    scholarshipType: enrollmentScholarship,
                                    totalAmount: enrollmentTotalAmount,
                                    firstInstallment:
                                      enrollmentPaymentType === "cuotas"
                                        ? enrollmentFirstInstallment
                                        : undefined,
                                    materialsAmount: enrollmentMaterialsAmount,
                                    date: new Date().toLocaleDateString(),
                                    receiptNumber: (enrollments.length + 1)
                                      .toString()
                                      .padStart(6, "0"),
                                    attendedBy:
                                      currentUser?.fullName ||
                                      currentUser?.username ||
                                      "Admin",
                                    status: "pagado",
                                    installmentsCount:
                                      enrollmentPaymentType === "cuotas"
                                        ? enrollmentInstallmentsCount
                                        : undefined,
                                    classStartDate: enrollmentClassStartDate,
                                    paymentMethod: enrollmentPaymentMethod,
                                  };
                                  setEnrollments([
                                    ...enrollments,
                                    newEnrollment,
                                  ]);
                                  setToast({
                                    message: "Matrícula registrada con éxito",
                                    type: "success",
                                  });
                                }}
                                className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm hover:bg-blue-700 transition-all shadow-2xl flex items-center gap-4"
                              >
                                <FileText size={24} /> GENERAR MATRÍCULA Y
                                BOLETA
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enrollment History */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
                      <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                          Historial de Matrículas
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedEnrollments.length > 0 && (
                            <button
                              onClick={() =>
                                confirmAction(
                                  `¿Está seguro de eliminar ${selectedEnrollments.length} matrículas?`,
                                  () => {
                                    setEnrollments(
                                      enrollments.filter(
                                        (e) =>
                                          !selectedEnrollments.includes(e.id),
                                      ),
                                    );
                                    setSelectedEnrollments([]);
                                    setToast({
                                      message: "Matrículas eliminadas",
                                      type: "success",
                                    });
                                  },
                                )
                              }
                              className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all"
                            >
                              <Trash2 size={14} /> Eliminar Seleccionados (
                              {selectedEnrollments.length})
                            </button>
                          )}
                          <div className="relative">
                            <Search
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                              size={14}
                            />
                            <input
                              type="text"
                              placeholder="DNI, Nombre o Boleta..."
                              className="pl-9 pr-4 py-2 rounded-xl bg-slate-50 border-none text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                              value={enrollmentHistorySearch}
                              onChange={(e) =>
                                setEnrollmentHistorySearch(e.target.value)
                              }
                            />
                          </div>
                          <input
                            type="date"
                            className="px-4 py-2 rounded-xl bg-slate-50 border-none text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                            value={enrollmentHistoryDate}
                            onChange={(e) =>
                              setEnrollmentHistoryDate(e.target.value)
                            }
                          />
                          <span className="px-4 py-2 rounded-xl bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest flex items-center">
                            Total: {enrollments.length}
                          </span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="p-6">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  checked={
                                    selectedEnrollments.length > 0 &&
                                    selectedEnrollments.length ===
                                      enrollments.length
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedEnrollments(
                                        enrollments.map((en) => en.id),
                                      );
                                    } else {
                                      setSelectedEnrollments([]);
                                    }
                                  }}
                                />
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                N° Boleta
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                Estudiante
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                Tipo
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                Monto
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                Fecha
                              </th>
                              <th className="p-6 font-black text-slate-400 uppercase text-[10px] tracking-widest">
                                Acciones
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {enrollments
                              .filter((e) => {
                                const term = (
                                  enrollmentHistorySearch || ""
                                ).toLowerCase();
                                const matchesSearch =
                                  (e.studentName || "")
                                    .toLowerCase()
                                    .includes(term) ||
                                  e.studentDni.toLowerCase().includes(term) ||
                                  (e.receiptNumber || "").toLowerCase().includes(term);
                                const matchesDate = enrollmentHistoryDate
                                  ? e.date ===
                                    new Date(
                                      enrollmentHistoryDate + "T00:00:00",
                                    ).toLocaleDateString()
                                  : true;
                                return matchesSearch && matchesDate;
                              })
                              .map((enrollment) => (
                                <tr
                                  key={enrollment.id}
                                  className="hover:bg-slate-50/50 transition-colors"
                                >
                                  <td className="p-6">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                      checked={selectedEnrollments.includes(
                                        enrollment.id,
                                      )}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedEnrollments([
                                            ...selectedEnrollments,
                                            enrollment.id,
                                          ]);
                                        } else {
                                          setSelectedEnrollments(
                                            selectedEnrollments.filter(
                                              (id) => id !== enrollment.id,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-6 font-mono font-black text-blue-600">
                                    #{enrollment.receiptNumber}
                                  </td>
                                  <td className="p-6">
                                    <p className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                                      {enrollment.studentName}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400">
                                      DNI: {enrollment.studentDni}
                                    </p>
                                  </td>
                                  <td className="p-6">
                                    <span
                                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${enrollment.paymentType === "contado" ? "text-emerald-600 border-emerald-100 bg-emerald-50" : "text-amber-600 border-amber-100 bg-amber-50"}`}
                                    >
                                      {enrollment.paymentType}
                                    </span>
                                  </td>
                                  <td className="p-6 font-black text-slate-800">
                                    S/ {enrollment.totalAmount}
                                  </td>
                                  <td className="p-6 text-xs font-bold text-slate-500">
                                    {enrollment.date}
                                  </td>
                                  <td className="p-6">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          setViewingEnrollment(enrollment)
                                        }
                                        title="Ver Boleta"
                                        className="p-3 text-slate-600 hover:bg-slate-600 hover:text-white rounded-xl transition-all bg-slate-50"
                                      >
                                        <Eye size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setEditingEnrollment(enrollment)
                                        }
                                        title="Editar Datos"
                                        className="p-3 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all bg-amber-50"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          generateEnrollmentPDF(enrollment)
                                        }
                                        title="Descargar PDF"
                                        className="p-3 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50"
                                      >
                                        <Download size={16} />
                                      </button>
                                      <button
                                        onClick={() =>
                                          shareEnrollmentWhatsApp(enrollment)
                                        }
                                        title="Compartir WhatsApp"
                                        className="p-3 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all bg-emerald-50"
                                      >
                                        <Share2 size={16} />
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

                {/* Base de Datos Section */}
                {activeTab === "estudiantes" && (
                  <div className="animate-slide-up space-y-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                          {activeConfig.siteName}
                        </h2>
                        <p className="text-slate-500 text-xs font-medium">
                          Registro General Institucional - Personal y alumnado.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingStudent(null);
                          setIsStudentModalOpen(true);
                        }}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 transition-all shadow-md uppercase tracking-widest text-xs"
                      >
                        <Plus size={18} /> NUEVO REGISTRO
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search
                          className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400"
                          size={20}
                        />
                        <input
                          type="text"
                          placeholder="Buscar por DNI, Nombre, Colegio, Celular Estudiante..."
                          className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-lg shadow-md transition-all font-bold placeholder:text-slate-300"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                              <Calendar size={12} /> Fecha
                            </label>
                            <input
                              type="date"
                              className="w-full p-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold shadow-sm transition-all"
                              value={dateFilter}
                              onChange={(e) => setDateFilter(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                              <Layers size={12} /> Nivel
                            </label>
                            <select
                              className="w-full p-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold shadow-sm transition-all"
                              value={dbLevelFilter}
                              onChange={(e) => setDbLevelFilter(e.target.value)}
                            >
                              <option value="">Todos los Niveles</option>
                              {levels.map((l) => (
                                <option key={l.id} value={l.nombre}>
                                  {l.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                              <BookOpen size={12} /> Grado/Sección
                            </label>
                            <select
                              className="w-full p-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold shadow-sm transition-all"
                              value={dbGradeFilter}
                              onChange={(e) => setDbGradeFilter(e.target.value)}
                            >
                              <option value="">Todos los Grados</option>
                              {gradeLevels.map((gl) => (
                                <option key={gl.id} value={gl.nombre}>
                                  {gl.nombre} - {gl.seccion}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                              <School size={12} /> Colegio
                            </label>
                            <select
                              className="w-full p-2.5 rounded-xl bg-white border border-slate-200 focus:border-blue-500 outline-none text-xs font-bold shadow-sm transition-all"
                              value={dbSchoolFilter}
                              onChange={(e) => setDbSchoolFilter(e.target.value)}
                            >
                              <option value="">Todos los Colegios</option>
                              {uniqueSchools.map((school) => (
                                <option key={school} value={school}>
                                  {school}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSearchTerm("");
                            setDateFilter("");
                            setDbLevelFilter("");
                            setDbGradeFilter("");
                            setDbSchoolFilter("");
                            setDbRoleFilter("");
                          }}
                          className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-sm h-[42px]"
                        >
                          <Eraser size={14} /> Limpiar Filtros
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-md">
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm uppercase text-[9px]"
                        >
                          Importar Excel
                        </button>
                        <button
                          onClick={handleExportCSV}
                          className="bg-slate-50 text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-slate-800 hover:text-white transition-all shadow-sm uppercase text-[9px]"
                        >
                          Exportar CSV
                        </button>
                        <button
                          onClick={downloadAllFotochecks}
                          disabled={isDownloadingAll}
                          className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-4 py-2 rounded-lg font-black flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm uppercase text-[9px] disabled:opacity-50"
                        >
                          {isDownloadingAll ? (
                            <>
                              <RefreshCw className="animate-spin" size={12} />{" "}
                              Generando ({downloadProgress}%)
                            </>
                          ) : (
                            <>
                              <Download size={12} /> Descargar Todo (JPG)
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <div className="flex items-center bg-slate-900 text-white px-5 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-widest gap-4 w-full sm:w-auto justify-center">
                          <span
                            onClick={() => setDbRoleFilter(dbRoleFilter === "Estudiante" ? "" : "Estudiante")}
                            className={`flex items-center gap-2 cursor-pointer transition-all ${dbRoleFilter === "Estudiante" ? "text-blue-400 scale-110" : "text-slate-400 hover:text-blue-400"}`}
                          >
                            <Users size={14} /> {studentsCount} Alumnos
                          </span>
                          <span className="w-px h-4 bg-slate-700"></span>
                          <span
                            onClick={() => setDbRoleFilter(dbRoleFilter === "Docente" ? "" : "Docente")}
                            className={`flex items-center gap-2 cursor-pointer transition-all ${dbRoleFilter === "Docente" ? "text-indigo-400 scale-110" : "text-slate-400 hover:text-indigo-400"}`}
                          >
                            <GraduationCap size={14} /> {teachersCount} Docentes
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            confirmAction(
                              searchTerm || dateFilter || dbLevelFilter || dbGradeFilter || dbSchoolFilter
                                ? `¿Eliminar los ${filteredEntries.length} registros filtrados? Esta acción no se puede deshacer.`
                                : "¿Eliminar TODOS los registros de la base de datos? Esta acción no se puede deshacer.",
                              deleteAllStudents,
                            )
                          }
                          className="bg-rose-600 text-white px-5 py-2 rounded-xl font-black hover:bg-rose-700 transition-all shadow-md uppercase tracking-widest text-[9px] w-full sm:w-auto"
                        >
                          {searchTerm || dateFilter || dbLevelFilter || dbGradeFilter || dbSchoolFilter ? "Eliminar Filtrados" : "Eliminar Todo"}
                        </button>
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleImportFile}
                      />
                    </div>

                    {/* Comprehensive Database Table */}
                    <div className="bg-white rounded-3xl shadow-md overflow-hidden border border-slate-100">
                      <div className="overflow-x-auto">
                        <table className="edu-table min-w-[1000px]">
                          <thead>
                            <tr>
                              <th>Rol</th>
                              <th>DNI</th>
                              <th>Fecha Nac.</th>
                              <th>Persona</th>
                              <th>Nivel</th>
                              <th>Aula / Grado</th>
                              <th>Celular</th>
                              <th>Colegio / Nro</th>
                              <th>Fecha Reg.</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEntries.map((s) => (
                              <tr key={s.id}>
                                <td>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border ${s.rol === "Estudiante" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}
                                  >
                                    {s.rol}
                                  </span>
                                </td>
                                <td>
                                  <span className="font-mono bg-slate-900 text-white px-2 py-1 rounded text-xs font-bold">
                                    {s.dni}
                                  </span>
                                </td>
                                <td>
                                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                                    {s.fechaNacimiento || "-"}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 flex-shrink-0">
                                      {s.foto ? (
                                        <img
                                          src={s.foto}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Users
                                          className="text-slate-300"
                                          size={14}
                                        />
                                      )}
                                    </div>
                                    <span className="font-black text-slate-800 text-xs uppercase leading-tight">
                                      {s.nombre} {s.apellido}
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-slate-200">
                                    {s.nivel}
                                  </span>
                                </td>
                                <td>
                                  <div className="text-xs">
                                    <p className="font-black text-slate-700 uppercase">
                                      {s.grado}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                      Sección {s.seccion}
                                    </p>
                                  </div>
                                </td>
                                <td className="text-slate-600 font-bold text-xs">
                                  {s.celularApoderado ? (
                                    <div className="flex items-center gap-1.5">
                                      <Phone
                                        size={12}
                                        className="text-emerald-500"
                                      />{" "}
                                      {s.celularApoderado}
                                    </div>
                                  ) : (
                                    <span className="text-slate-200 italic font-normal">
                                      No registrado
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="text-xs">
                                    <p className="font-black text-slate-700 uppercase leading-tight">
                                      {s.schoolName || (
                                        <span className="text-slate-200 italic font-normal">
                                          Sin colegio
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                                      Cel: {s.studentPhone || "-"}
                                    </p>
                                  </div>
                                </td>
                                <td>
                                  <span className="bg-white text-slate-500 px-2 py-0.5 rounded-full text-[9px] font-black uppercase border border-slate-100 shadow-sm">
                                    {s.registrationDate || "-"}
                                  </span>
                                </td>
                                <td>
                                  <div className="flex gap-1.5">
                                    <button
                                      onClick={() => {
                                        setEditingStudent(s);
                                        setIsStudentModalOpen(true);
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all bg-blue-50"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedStudentForId(s);
                                        setHasChanges(false);
                                        setIsFotocheckOpen(true);
                                      }}
                                      className="p-2 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all bg-indigo-50"
                                    >
                                      <IdCard size={14} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        confirmAction(
                                          "¿Eliminar este estudiante?",
                                          () => deleteStudent(s.id),
                                        )
                                      }
                                      className="p-2 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all bg-rose-50"
                                    >
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
                          <p className="mt-6 font-black uppercase tracking-widest text-2xl">
                            Sin registros en la base de datos
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Asistencia Section */}
                {activeTab === "asistencia" && (
                  <div className="animate-slide-up space-y-4 md:space-y-6">
                    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                      <div className="max-w-md">
                        <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                          Control de Asistencia
                        </h2>
                        <p className="text-slate-500 text-[10px] md:text-xs font-medium leading-relaxed">
                          Gestión institucional en tiempo real - Bitácora de accesos.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button
                          onClick={() => setIsDniModalOpen(true)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white px-4 sm:px-10 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[11px] sm:text-[13px] shadow-2xl hover:bg-black transition-all transform hover:scale-105 active:scale-95 group"
                        >
                          <Keyboard size={20} className="text-blue-400 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" /> DNI
                        </button>
                        <button
                          onClick={startScanner}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white px-4 sm:px-10 py-4 sm:py-5 rounded-2xl font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[11px] sm:text-[13px] shadow-2xl hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95 group"
                        >
                          <Scan size={20} className="group-hover:rotate-90 transition-transform sm:w-6 sm:h-6" /> Escáner QR
                        </button>
                      </div>
                    </header>

                    <StatCardsAttendance statsAtt={statsAtt} />

                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl overflow-hidden border border-slate-100 p-4 md:p-6 space-y-4">
                      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6">
                        <div className="space-y-2 flex-1 min-w-0">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                            Filtrar por nombre o DNI
                          </label>
                          <div className="relative group">
                            <Search
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors"
                              size={16}
                            />
                            <input
                              type="text"
                              placeholder="Buscar en la bitácora..."
                              className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border-2 border-transparent focus:border-blue-100 focus:bg-white font-bold text-xs md:text-sm outline-none transition-all placeholder:text-slate-300"
                              value={attSearch}
                              onChange={(e) => setAttSearch(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 w-full lg:w-auto">
                          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 md:gap-3 w-full flex-1">
                            <StatusButton
                              active={selectedQuickStatus === "entrada"}
                              onClick={() => setSelectedQuickStatus("entrada")}
                              status="entrada"
                              icon={UserCheck}
                              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] px-4 md:px-8"
                            />
                            <StatusButton
                              active={selectedQuickStatus === "tardanza"}
                              onClick={() => setSelectedQuickStatus("tardanza")}
                              status="tardanza"
                              icon={Clock}
                              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] px-4 md:px-8"
                            />
                            <StatusButton
                              active={selectedQuickStatus === "salida"}
                              onClick={() => setSelectedQuickStatus("salida")}
                              status="salida"
                              icon={LogOutIcon}
                              className="flex-1 sm:flex-none min-w-[100px] sm:min-w-[120px] px-4 md:px-8"
                            />
                          </div>
                          
                          <div className="flex justify-center shrink-0">
                            <button
                              onClick={() => confirmAction("¿Vaciar todo el historial de asistencia?", clearAttendanceHistory)}
                              className="px-6 py-3 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 hover:border-rose-200 transition-all flex items-center justify-center gap-2 font-black text-[10px] sm:text-xs uppercase tracking-widest w-full sm:w-auto"
                            >
                              <Trash2 size={18} /> <span>Vaciar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                      <div className="w-full overflow-x-auto">
                        <table className="w-full min-w-[320px] text-left border-collapse table-fixed">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="p-3 md:p-5 font-black text-slate-400 uppercase text-[8px] md:text-[9px] tracking-widest md:pl-8 w-2/5 md:w-1/3">Participante</th>
                              <th className="p-3 md:p-5 font-black text-slate-400 uppercase text-[8px] md:text-[9px] tracking-widest text-center w-1/4 md:w-1/6">Marcación</th>
                              <th className="p-3 md:p-5 font-black text-slate-400 uppercase text-[8px] md:text-[9px] tracking-widest text-center hidden sm:table-cell w-1/6">Estado</th>
                              <th className="p-3 md:p-5 font-black text-slate-400 uppercase text-[8px] md:text-[9px] tracking-widest text-right md:pr-8 w-1/4 md:w-1/6">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredAttendance.map((record) => (
                              <tr key={record.id} className="hover:bg-blue-50/50 transition-colors group">
                                <td className="p-3 md:p-5 md:pl-8">
                                  <div className="flex flex-col">
                                    <p className="font-black text-slate-700 text-[10px] md:text-sm uppercase tracking-tight truncate leading-tight">
                                      {record.studentName}
                                    </p>
                                    <p className="font-mono text-slate-400 font-bold text-[8px] md:text-[10px] mt-0.5">
                                      ID: {record.studentDni}
                                    </p>
                                    <p className="text-[7px] font-black text-blue-400 uppercase md:hidden mt-0.5">
                                      {record.studentRol} • {record.fecha}
                                    </p>
                                  </div>
                                </td>
                                <td className="p-3 md:p-5">
                                  <div className="flex flex-col items-center gap-1">
                                    {record.horaEntrada && (
                                      <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 hidden sm:block"></span>
                                        <span className="font-mono text-[9px] md:text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                                          {record.horaEntrada}
                                        </span>
                                      </div>
                                    )}
                                    {record.horaSalida && (
                                      <div className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 hidden sm:block"></span>
                                        <span className="font-mono text-[9px] md:text-xs font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                          {record.horaSalida}
                                        </span>
                                      </div>
                                    )}
                                    {!record.horaEntrada && !record.horaSalida && (
                                      <span className="text-slate-200">—</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 md:p-5 text-center hidden sm:table-cell">
                                  <StatusBadge status={record.estado} compact />
                                </td>
                                <td className="p-3 md:p-5 text-right md:pr-8">
                                  <div className="flex gap-1 justify-end lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => setEditingAttendance(record)}
                                      className="p-1.5 md:p-2 text-blue-500 hover:bg-blue-600 hover:text-white rounded-lg transition-all bg-blue-50/50 lg:bg-transparent"
                                      title="Editar"
                                    >
                                      <Edit size={12} />
                                    </button>
                                    <button
                                      onClick={() => confirmAction("¿Eliminar registro?", () => deleteAttendance(record.id))}
                                      className="p-1.5 md:p-2 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-all bg-rose-50/50 lg:bg-transparent"
                                      title="Eliminar"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {filteredAttendance.length === 0 && (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300">
                          <ClipboardList size={40} className="opacity-20" />
                          <p className="mt-4 font-black uppercase tracking-widest text-xs">Sin registros hoy</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ALERTA Section */}
                {activeTab === "alerta" && (
                  <div className="animate-slide-up space-y-6 md:space-y-8">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                      <div className="w-full md:w-auto">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                          ALERTA
                        </h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base">
                          Gestión de Incidencias y Reportes de Conducta.
                        </p>
                      </div>
                      <div className="flex flex-row bg-white p-1.5 md:p-2 rounded-2xl shadow-xl border border-slate-100 w-full md:w-auto overflow-x-auto no-scrollbar">
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "alerta:registro",
                          )) && (
                          <button
                            onClick={() => setActiveAlertaSubTab("registro")}
                            className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all whitespace-nowrap ${activeAlertaSubTab === "registro" ? "bg-red-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200 hover:border-red-200"}`}
                          >
                            Registrar Incidencia
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "alerta:historial",
                          )) && (
                          <button
                            onClick={() => setActiveAlertaSubTab("historial")}
                            className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all whitespace-nowrap ${activeAlertaSubTab === "historial" ? "bg-red-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-200 hover:border-red-200"}`}
                          >
                            Historial
                          </button>
                        )}
                      </div>
                    </header>

                    {activeAlertaSubTab === "registro" && (
                      <div className="bg-white p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl border border-slate-200 space-y-6 md:space-y-8">
                        <div className="space-y-3 md:space-y-4">
                          <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Buscar Alumno (DNI, Nombre o Grado)
                          </label>
                          <div className="relative">
                            <Search
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              size={18}
                            />
                            <input
                              type="text"
                              placeholder="Buscar..."
                              className="w-full pl-12 pr-4 py-3.5 md:py-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-black text-base md:text-lg outline-none transition-all"
                              value={personalSearchTerm}
                              onChange={(e) =>
                                setPersonalSearchTerm(e.target.value)
                              }
                            />
                          </div>
                        </div>

                        {personalSearchTerm && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-2 custom-scrollbar">
                            {students
                              .filter(
                                (s) =>
                                  (s.nombre || "")
                                    .toLowerCase()
                                    .includes(
                                      (personalSearchTerm || "").toLowerCase(),
                                    ) ||
                                  (s.apellido || "")
                                    .toLowerCase()
                                    .includes(
                                      (personalSearchTerm || "").toLowerCase(),
                                    ) ||
                                  s.dni.includes(personalSearchTerm) ||
                                  (s.grado || "")
                                    .toLowerCase()
                                    .includes(personalSearchTerm.toLowerCase()),
                              )
                              .map((student) => (
                                <button
                                  key={student.id}
                                  onClick={() => {
                                    setSelectedPersonalStudent(student);
                                    setPersonalSearchTerm("");
                                  }}
                                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-red-500 hover:bg-red-50 transition-all text-left"
                                >
                                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                                    {student.foto ? (
                                      <img
                                        src={student.foto}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="w-full h-full p-2 text-slate-400" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-800 text-sm">
                                      {student.nombre} {student.apellido}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">
                                      {student.grado} - {student.dni}
                                    </p>
                                  </div>
                                </button>
                              ))}
                          </div>
                        )}

                        {selectedPersonalStudent && (
                          <div className="animate-fade-in space-y-6 md:space-y-8">
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 p-6 md:p-8 bg-slate-50 rounded-2xl md:rounded-2xl border-2 border-slate-100 relative">
                              <button
                                onClick={() => setSelectedPersonalStudent(null)}
                                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-white rounded-full transition-all text-slate-400"
                              >
                                <X size={20} />
                              </button>
                              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl md:rounded-[2rem] bg-white shadow-xl border-4 border-white overflow-hidden flex-shrink-0 mx-auto md:mx-0">
                                {selectedPersonalStudent.foto ? (
                                  <img
                                    src={selectedPersonalStudent.foto}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-full h-full p-4 md:p-6 text-slate-200" />
                                )}
                              </div>
                              <div className="space-y-4 flex-1 text-center md:text-left">
                                <div>
                                  <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">
                                    {selectedPersonalStudent.nombre}{" "}
                                    {selectedPersonalStudent.apellido}
                                  </h3>
                                  <p className="text-red-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest mt-1">
                                    Ficha del Estudiante
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      DNI
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs md:text-sm">
                                      {selectedPersonalStudent.dni}
                                    </p>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Nivel
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs md:text-sm">
                                      {selectedPersonalStudent.nivel}
                                    </p>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Grado
                                    </p>
                                    <p className="font-bold text-slate-700 text-xs md:text-sm">
                                      {selectedPersonalStudent.grado}
                                    </p>
                                  </div>
                                  <div className="bg-white p-2 rounded-xl border border-slate-100">
                                    <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Puntaje
                                    </p>
                                    <div className="flex items-center justify-center md:justify-start gap-1">
                                      <span
                                        className={`font-black text-xs md:text-sm ${
                                          (selectedPersonalStudent.conductPoints ||
                                            100) >= 80
                                            ? "text-emerald-600"
                                            : (selectedPersonalStudent.conductPoints ||
                                                  100) >= 60
                                              ? "text-amber-600"
                                              : "text-rose-600"
                                        }`}
                                      >
                                        {(
                                          ((selectedPersonalStudent.conductPoints ||
                                            100) /
                                            100) *
                                          20
                                        ).toFixed(1)}
                                      </span>
                                      <span className="text-[8px] text-slate-400">
                                        (
                                        {selectedPersonalStudent.conductPoints ||
                                          100}
                                        )
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-3 md:gap-4 pt-2 md:pt-4">
                                  <button
                                    onClick={() => setIsMeritModalOpen(true)}
                                    className="flex-1 bg-emerald-600 text-white py-2.5 md:py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                  >
                                    <Award size={14} md:size={16} /> Mérito
                                  </button>
                                  <button
                                    onClick={() => setIsDemeritModalOpen(true)}
                                    className="flex-1 bg-rose-600 text-white py-2.5 md:py-3 rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                                  >
                                    <AlertCircle size={14} md:size={16} />{" "}
                                    Demérito
                                  </button>
                                </div>
                              </div>
                            </div>

                            <form
                              onSubmit={(e: any) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const newIncidence: Incidence = {
                                  id: Date.now().toString(),
                                  ownerId:
                                    currentUser?.parentId ||
                                    currentUser?.id ||
                                    "admin-1",
                                  studentId: selectedPersonalStudent.id,
                                  studentName: `${selectedPersonalStudent.nombre} ${selectedPersonalStudent.apellido}`,
                                  studentDni: selectedPersonalStudent.dni,
                                  studentGrade: selectedPersonalStudent.grado,
                                  type: formData.get("type") as string,
                                  description: formData.get(
                                    "description",
                                  ) as string,
                                  severity: formData.get(
                                    "severity",
                                  ) as IncidenceSeverity,
                                  status: "registrada",
                                  date: new Date().toLocaleString(),
                                  registeredBy:
                                    currentUser?.fullName ||
                                    currentUser?.username ||
                                    "Admin",
                                };
                                setIncidences([newIncidence, ...incidences]);
                                setSelectedPersonalStudent(null);
                                setToast({
                                  message:
                                    "Incidencia registrada correctamente.",
                                  type: "success",
                                });
                              }}
                              className="space-y-4 md:space-y-6"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2">
                                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Tipo de Incidencia
                                  </label>
                                  <select
                                    name="type"
                                    required
                                    className="w-full p-3.5 md:p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all text-sm md:text-base"
                                  >
                                    <option value="">Seleccione tipo...</option>
                                    {incidenceTypes.map((type) => (
                                      <option key={type.id} value={type.name}>
                                        {type.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Nivel de Gravedad
                                  </label>
                                  <div className="flex flex-row gap-2">
                                    {["leve", "moderado", "grave"].map(
                                      (sev) => (
                                        <label key={sev} className="flex-1">
                                          <input
                                            type="radio"
                                            name="severity"
                                            value={sev}
                                            required
                                            className="hidden peer"
                                          />
                                          <div
                                            className={`text-center p-3 md:p-4 rounded-2xl border-2 border-slate-100 cursor-pointer font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600 hover:bg-slate-50`}
                                          >
                                            {sev}
                                          </div>
                                        </label>
                                      ),
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Descripción de la Incidencia
                                </label>
                                <textarea
                                  name="description"
                                  required
                                  rows={3}
                                  md:rows={4}
                                  placeholder="Detalle lo sucedido..."
                                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all resize-none text-sm md:text-base"
                                />
                              </div>
                              <button
                                type="submit"
                                className="w-full py-4 md:py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-red-700 transition-all"
                              >
                                Registrar Alerta
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}

                    {activeAlertaSubTab === "historial" && (
                      <div className="space-y-8">
                        <div className="bg-white p-4 md:p-8 rounded-3xl md:rounded-3xl shadow-2xl border border-slate-200 space-y-6">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                              <div className="bg-red-50 p-4 rounded-2xl text-red-600">
                                <AlertCircle size={24} />
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  Total Incidencias
                                </p>
                                <h4 className="text-2xl font-black text-slate-800">
                                  {incidences.length}
                                </h4>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                              <div className="relative w-full md:w-64">
                                <Search
                                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                  size={18}
                                />
                                <input
                                  type="text"
                                  placeholder="Buscar alumno..."
                                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-red-500 font-bold text-sm"
                                  value={reportSearchTerm}
                                  onChange={(e) =>
                                    setReportSearchTerm(e.target.value)
                                  }
                                />
                              </div>
                              <div className="flex gap-2 w-full md:w-auto">
                                <button
                                  onClick={exportIncidencesToExcel}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                >
                                  <FileSpreadsheet size={16} /> Excel
                                </button>
                                <button
                                  onClick={exportIncidencesToPDF}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                >
                                  <FileText size={16} /> PDF
                                </button>
                              </div>
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
                                  <th className="px-6 py-4 text-right">
                                    Acciones
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {incidences
                                  .filter(
                                    (inc) =>
                                      (inc.studentName || "")
                                        .toLowerCase()
                                        .includes(
                                          (
                                            reportSearchTerm || ""
                                          ).toLowerCase(),
                                        ) ||
                                      inc.studentDni.includes(
                                        reportSearchTerm,
                                      ) ||
                                      (inc.type || "")
                                        .toLowerCase()
                                        .includes(
                                          (
                                            reportSearchTerm || ""
                                          ).toLowerCase(),
                                        ),
                                  )
                                  .map((inc) => (
                                    <tr
                                      key={inc.id}
                                      className="bg-white hover:bg-slate-50 transition-all group shadow-sm rounded-2xl"
                                    >
                                      <td className="px-6 py-4 first:rounded-l-2xl">
                                        <p className="font-black text-slate-800 text-sm">
                                          {inc.studentName}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">
                                          {inc.studentGrade} - {inc.studentDni}
                                        </p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <p className="font-bold text-slate-700 text-xs uppercase">
                                          {inc.type}
                                        </p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1">
                                          {inc.date}
                                        </p>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span
                                          className={`px-3 py-1 rounded-full font-black text-[8px] uppercase tracking-widest ${
                                            inc.severity === "leve"
                                              ? "bg-blue-50 text-blue-600"
                                              : inc.severity === "moderado"
                                                ? "bg-orange-50 text-orange-600"
                                                : "bg-red-50 text-red-600"
                                          }`}
                                        >
                                          {inc.severity}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <select
                                          value={inc.status}
                                          onChange={(e) => {
                                            const updated = incidences.map(
                                              (i) =>
                                                i.id === inc.id
                                                  ? {
                                                      ...i,
                                                      status: e.target
                                                        .value as IncidenceStatus,
                                                    }
                                                  : i,
                                            );
                                            setIncidences(updated);
                                          }}
                                          className="bg-slate-50 border-none rounded-lg p-2 font-bold text-[10px] uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-red-500"
                                        >
                                          <option value="registrada">
                                            Registrada
                                          </option>
                                          <option value="en evaluación">
                                            En Evaluación
                                          </option>
                                          <option value="en seguimiento">
                                            En Seguimiento
                                          </option>
                                          <option value="resuelta">
                                            Resuelta
                                          </option>
                                          <option value="escalada a un caso mayor">
                                            Escalada
                                          </option>
                                        </select>
                                      </td>
                                      <td className="px-6 py-4 last:rounded-r-2xl text-right">
                                        <div className="flex justify-end gap-2">
                                          <button
                                            onClick={() =>
                                              setEditingIncidence(inc)
                                            }
                                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                                            title="Editar"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button
                                            onClick={() => {
                                              const student = students.find(
                                                (s) => s.id === inc.studentId,
                                              );
                                              if (
                                                student &&
                                                student.celularApoderado
                                              ) {
                                                const message = `ALERTA INSTITUCIONAL: Se ha registrado una incidencia de tipo "${inc.type}" para el alumno ${inc.studentName}. Gravedad: ${inc.severity.toUpperCase()}. Descripción: ${inc.description}`;
                                                window.open(
                                                  `https://wa.me/${student.celularApoderado.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
                                                  "_blank",
                                                );
                                              } else {
                                                setToast({
                                                  message:
                                                    "No se encontró número de WhatsApp registrado para el apoderado.",
                                                  type: "error",
                                                });
                                              }
                                            }}
                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                                            title="Enviar por WhatsApp"
                                          >
                                            <Phone size={16} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              confirmAction(
                                                "¿Eliminar este registro de incidencia?",
                                                () => {
                                                  setIncidences(
                                                    incidences.filter(
                                                      (i) => i.id !== inc.id,
                                                    ),
                                                  );
                                                  setToast({
                                                    message:
                                                      "Registro eliminado",
                                                    type: "success",
                                                  });
                                                },
                                              )
                                            }
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

                {activeTab === "calificaciones" && (
                  <div className="animate-slide-up space-y-6">
                    <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter text-center italic uppercase">
                      {activeConfig.siteName}
                    </h2>

                    <div className="flex justify-center mb-6 px-2">
                      <div className="grid grid-cols-2 sm:flex bg-white p-1 rounded-2xl shadow-xl border border-slate-100 w-full sm:w-auto">
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "calificaciones:lista",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveCalificacionesSubTab("lista")
                            }
                            className={`px-3 sm:px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeCalificacionesSubTab === "lista" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Lista
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "calificaciones:registros",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveCalificacionesSubTab("registros")
                            }
                            className={`px-3 sm:px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeCalificacionesSubTab === "registros" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Registros
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "calificaciones:boletas",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveCalificacionesSubTab("boletas")
                            }
                            className={`px-3 sm:px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeCalificacionesSubTab === "boletas" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Boletas
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "calificaciones:calificar",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveCalificacionesSubTab("calificar")
                            }
                            className={`px-3 sm:px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeCalificacionesSubTab === "calificar" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Calificar
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "calificaciones:optica",
                          )) && (
                          <button
                            onClick={() =>
                              setActiveCalificacionesSubTab("ficha-optica")
                            }
                            className={`px-3 sm:px-6 py-3 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeCalificacionesSubTab === "ficha-optica" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Ficha Examen
                          </button>
                        )}
                      </div>
                    </div>

                    {activeCalificacionesSubTab === "lista" && (
                      <div className="bg-white rounded-[2rem] md:rounded-3xl p-6 md:p-6 md:p-8 shadow-2xl border-t-4 border-t-blue-600 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                          {/* Search and Filters */}
                          <div className="md:col-span-4 space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Búsqueda de Alumno
                            </label>
                            <div className="relative">
                              <Search
                                size={16}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                              <input
                                type="text"
                                placeholder="Nombre o DNI..."
                                value={calificacionesSearch}
                                onChange={(e) =>
                                  setCalificacionesSearch(e.target.value)
                                }
                                className="w-full pl-12 p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Nivel
                            </label>
                            <select
                              value={calificacionesLevelFilter}
                              onChange={(e) =>
                                setCalificacionesLevelFilter(e.target.value)
                              }
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                            >
                              <option value="">Todos</option>
                              {levels.map((l) => (
                                <option key={l.id} value={l.nombre}>
                                  {l.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Grado
                            </label>
                            <select
                              value={calificacionesGradeFilter}
                              onChange={(e) =>
                                setCalificacionesGradeFilter(e.target.value)
                              }
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                            >
                              <option value="">Todos</option>
                              {Array.from(
                                new Set(gradeLevels.map((gl) => gl.nombre)),
                              ).map((g) => (
                                <option key={g} value={g}>
                                  {g}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Sección
                            </label>
                            <select
                              value={calificacionesSectionFilter}
                              onChange={(e) =>
                                setCalificacionesSectionFilter(e.target.value)
                              }
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                            >
                              <option value="">Todas</option>
                              {Array.from(
                                new Set(gradeLevels.map((gl) => gl.seccion)),
                              ).map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
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
                            >
                              Limpiar
                            </button>
                          </div>
                        </div>

                        {/* Student Selection List */}
                        <div className="mb-8">
                          <div className="flex justify-between items-center mb-4 ml-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                              Seleccionar Alumno
                            </label>
                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                              Lista Completa
                            </span>
                          </div>
                          <div className="max-h-64 overflow-y-auto no-scrollbar border-2 border-slate-50 rounded-[2rem] p-3 space-y-2 bg-slate-50/50 shadow-inner">
                            {students
                              .filter((s) => {
                                const matchesSearch = (
                                  s.nombre +
                                  " " +
                                  s.apellido +
                                  " " +
                                  s.dni +
                                  " " +
                                  s.grado +
                                  " " +
                                  s.seccion +
                                  " " +
                                  s.nivel
                                )
                                  .toLowerCase()
                                  .includes(calificacionesSearch.toLowerCase());
                                const matchesLevel =
                                  !calificacionesLevelFilter ||
                                  s.nivel === calificacionesLevelFilter;
                                const matchesGrade =
                                  !calificacionesGradeFilter ||
                                  s.grado === calificacionesGradeFilter;
                                const matchesSection =
                                  !calificacionesSectionFilter ||
                                  s.seccion === calificacionesSectionFilter;
                                return (
                                  matchesSearch &&
                                  matchesLevel &&
                                  matchesGrade &&
                                  matchesSection
                                );
                              })
                              .map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => setSelectedPersonalStudent(s)}
                                  className={`w-full p-4 rounded-2xl flex justify-between items-center transition-all group ${selectedPersonalStudent?.id === s.id ? "bg-blue-600 text-white shadow-xl scale-[1.02]" : "bg-white text-slate-700 hover:bg-blue-50 border border-slate-100"}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] ${selectedPersonalStudent?.id === s.id ? "bg-white/20" : "bg-blue-100 text-blue-600"}`}
                                    >
                                      {s.nombre[0]}
                                      {s.apellido[0]}
                                    </div>
                                    <div className="text-left">
                                      <p className="font-black text-xs uppercase tracking-tight">
                                        {s.nombre} {s.apellido}
                                      </p>
                                      <p
                                        className={`text-[8px] font-bold uppercase ${selectedPersonalStudent?.id === s.id ? "text-white/60" : "text-slate-400"}`}
                                      >
                                        {s.dni}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${selectedPersonalStudent?.id === s.id ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}
                                    >
                                      {s.grado} "{s.seccion}"
                                    </span>
                                  </div>
                                </button>
                              ))}
                            {students.length === 0 && (
                              <div className="py-10 text-center text-slate-400 font-bold uppercase text-[10px] italic">
                                No hay alumnos registrados
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Materia
                            </label>
                            <select
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                              id="grade-materia"
                            >
                              <option value="">-- Seleccionar --</option>
                              {courses.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
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
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Tipo de Nota
                            </label>
                            <select
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                              id="grade-type"
                            >
                              {gradeTypes.map((gt) => (
                                <option key={gt.id} value={gt.name}>
                                  {gt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">
                              Nota
                            </label>
                            <input
                              type="number"
                              placeholder="00"
                              className="w-full p-3 rounded-xl bg-slate-50 border-none font-black text-center text-2xl text-blue-600 shadow-inner outline-none"
                              id="grade-nota"
                              min="0"
                              max="20"
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const student = selectedPersonalStudent;
                            const mat = (
                              document.getElementById(
                                "grade-materia",
                              ) as HTMLSelectElement
                            ).value;
                            const type = (
                              document.getElementById(
                                "grade-type",
                              ) as HTMLSelectElement
                            ).value;
                            const notaInput = document.getElementById(
                              "grade-nota",
                            ) as HTMLInputElement;
                            const nota = parseFloat(notaInput.value);
                            if (student && mat && !isNaN(nota)) {
                              setGrades([
                                {
                                  id: Date.now().toString(),
                                  studentId: student.id,
                                  studentName: `${student.nombre} ${student.apellido}`,
                                  materia: `${mat} (${type})`,
                                  nota,
                                  fecha: new Date().toLocaleDateString(),
                                },
                                ...grades,
                              ]);
                              notaInput.value = "";
                              setToast({
                                message: "Nota registrada con éxito",
                                type: "success",
                              });
                            } else {
                              setToast({
                                message: "Por favor complete todos los campos",
                                type: "error",
                              });
                            }
                          }}
                          className="w-full text-white py-6 rounded-2xl font-black text-xl transition-all uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95"
                          style={{
                            backgroundColor: activeConfig.theme.primaryColor,
                          }}
                        >
                          Registrar Nota
                        </button>
                      </div>
                    )}

                    {activeCalificacionesSubTab === "calificar" && (
                      <div className="bg-white rounded-[2rem] md:rounded-3xl p-6 md:p-6 md:p-8 shadow-2xl border-t-4 border-t-blue-600 max-w-4xl mx-auto">
                        {/* Alerta de Exceso (Modal de alta visibilidad - Movido al inicio para evitar conflictos) */}
                        <AnimatePresence>
                          {showExcessAlert && isExcessQuestions && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl"
                              onClick={() => setShowExcessAlert(false)}
                            >
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-[2.5rem] shadow-[0_0_100px_-10px_rgba(225,29,72,0.4)] p-10 max-w-md w-full text-center relative border-8 border-rose-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Decoración superior */}
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                                  <div className="bg-rose-500 text-white p-5 rounded-3xl shadow-2xl shadow-rose-500/40 transform -rotate-12 border-4 border-white">
                                    <AlertTriangle size={40} className="animate-pulse" />
                                  </div>
                                </div>

                                <button 
                                  onClick={() => setShowExcessAlert(false)}
                                  className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all duration-300"
                                >
                                  <X size={28} />
                                </button>

                                <div className="mt-6 mb-8">
                                  <h4 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none italic">
                                    ¡Exceso Detectado!
                                  </h4>
                                  <div className="h-1.5 w-16 bg-rose-500 mx-auto rounded-full mb-6"></div>
                                  <p className="text-base font-medium text-slate-500 leading-relaxed px-2">
                                    Actualmente has registrado <span className="font-black text-rose-600 px-1 bg-rose-50 rounded-lg">{buenas + malas + blancas}</span> respuestas, 
                                    pero el examen solo permite un máximo de <span className="font-black text-slate-900">{examTypes.find(t => t.name === selectedExamType)?.numQuestions}</span>.
                                  </p>
                                </div>

                                <div className="grid gap-4">
                                  <button 
                                    onClick={() => setShowExcessAlert(false)}
                                    className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-rose-600 transition-all duration-500 shadow-2xl active:scale-95 flex items-center justify-center gap-3 group"
                                  >
                                    <span>ENTENDIDO, CORREGIR AHORA</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                  </button>
                                  
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Presiona <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded">ESC</span> para cerrar
                                  </p>
                                </div>
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                              Calificar Alumno
                            </h3>
                            <p className="text-slate-500 mt-1">
                              Registro de notas mediante conteo de respuestas.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-8">
                          {/* Student Search */}
                          <div className="space-y-4 sticky top-0 z-10 bg-white py-4 -mt-4 border-b border-slate-50">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              Buscar Alumno (Nombre o DNI)
                            </label>
                            <div className="relative">
                              <div className="relative flex gap-3">
                                <div className="relative flex-1">
                                  <Search
                                    size={18}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  <input
                                    ref={calificarSearchInputRef}
                                    type="text"
                                    placeholder="Ingrese Nombre o DNI..."
                                    value={calificarSearchDni}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        if (calificarSelectedIndex >= 0 && calificarSelectedIndex < calificarSearchResults.length) {
                                          setSelectedCalificarStudent(calificarSearchResults[calificarSelectedIndex]);
                                          setCalificarSearchDni(calificarSearchResults[calificarSelectedIndex].dni);
                                          setCalificarSearchResults([]);
                                        } else {
                                          const student = students.find(
                                            (s) =>
                                              s.dni === calificarSearchDni ||
                                              `${s.nombre} ${s.apellido}`.toLowerCase() ===
                                                calificarSearchDni.toLowerCase(),
                                          );
                                          if (student) {
                                            setSelectedCalificarStudent(student);
                                            setCalificarSearchResults([]);
                                          }
                                        }
                                      } else if (e.key === "ArrowDown") {
                                        setCalificarSelectedIndex((prev) => Math.min(prev + 1, calificarSearchResults.length - 1));
                                      } else if (e.key === "ArrowUp") {
                                        setCalificarSelectedIndex((prev) => Math.max(prev - 1, 0));
                                      }
                                    }}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setCalificarSearchDni(val);
                                      setCalificarSelectedIndex(0);
                                      setSelectedCalificarStudent(null);
                                      if (val.length >= 3) {
                                        const filtered = students.filter(
                                          (s) =>
                                          s.rol !== 'Docente' &&
                                          s.nivel !== 'Docente' &&
                                          (s.dni.includes(val) ||
                                            `${s.nombre} ${s.apellido}`.toLowerCase().includes(val.toLowerCase()) ||
                                            (s.grado || "").toLowerCase().includes(val.toLowerCase()) ||
                                            (s.seccion || "").toLowerCase().includes(val.toLowerCase())),
                                        );
                                        setCalificarSearchResults(filtered);
                                      } else {
                                        setCalificarSearchResults([]);
                                      }
                                    }}
                                    className="w-full pl-12 p-4 rounded-2xl bg-slate-50 border-none font-bold text-slate-800 text-lg shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    const student = students.find(
                                      (s) => s.dni === calificarSearchDni,
                                    );
                                    if (student)
                                      setSelectedCalificarStudent(student);
                                    else if (
                                      calificarSearchResults.length === 1
                                    )
                                      setSelectedCalificarStudent(
                                        calificarSearchResults[0],
                                      );
                                    else
                                      setToast({
                                        message:
                                          "Por favor seleccione un alumno de la lista",
                                        type: "error",
                                      });
                                  }}
                                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-lg"
                                >
                                  Buscar
                                </button>
                              </div>

                              {calificarSearchResults.length > 0 &&
                                !selectedCalificarStudent && (
                                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                                    {calificarSearchResults.map((student, index) => (
                                      <button
                                        key={student.id}
                                        onClick={() => {
                                          setSelectedCalificarStudent(student);
                                          setCalificarSearchDni(student.dni);
                                          setCalificarSearchResults([]);
                                        }}
                                        className={`w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-all border-b border-slate-50 last:border-none text-left ${index === calificarSelectedIndex ? 'bg-blue-50' : ''}`}
                                      >
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs overflow-hidden">
                                          {student.foto ? (
                                            <img
                                              src={student.foto}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            student.nombre[0]
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-black text-slate-800 uppercase text-xs">
                                            {student.nombre} {student.apellido}
                                          </p>
                                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                                            DNI: {student.dni} | {student.grado}{" "}
                                            "{student.seccion}"
                                          </p>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>

                          {selectedCalificarStudent && (
                            <div className="animate-fade-in space-y-8">
                              {/* Student Info Card */}
                              <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-slate-100 mb-4 transition-all hover:border-blue-200">
                                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                                  {selectedCalificarStudent.foto ? (
                                    <img
                                      src={selectedCalificarStudent.foto}
                                      alt="Student"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User size={20} className="text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-black text-slate-800 uppercase truncate">
                                    {selectedCalificarStudent.nombre} {selectedCalificarStudent.apellido}
                                  </h4>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase leading-none">
                                    {selectedCalificarStudent.grado} "{selectedCalificarStudent.seccion}"
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSelectedCalificarStudent(null)}
                                  className="ml-auto p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>

                              {/* Grading Form Optimized Grid */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pb-6">
                                <div className="lg:col-span-7 space-y-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-white group">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">
                                      Tipo de Examen
                                    </label>
                                    <select
                                      value={selectedExamType}
                                      onChange={(e) => {
                                        setSelectedExamType(e.target.value);
                                        const type = examTypes.find((t) => t.name === e.target.value);
                                        if (type) setCalificarMaxScore(type.maxScore);
                                      }}
                                      className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-bold text-slate-800 text-xs shadow-sm outline-none focus:border-blue-500 transition-all cursor-pointer"
                                    >
                                      <option value="">Seleccione el tipo...</option>
                                      {examTypes.filter((t) => {
                                        if (!t.classrooms || t.classrooms.length === 0) return true;
                                        if (!selectedCalificarStudent) return true;
                                        const studentGradeLevelId = gradeLevels.find(gl => gl.nombre === selectedCalificarStudent.grado && gl.seccion === selectedCalificarStudent.seccion)?.id;
                                        return studentGradeLevelId && t.classrooms.includes(studentGradeLevelId);
                                      }).map((t) => (
                                        <option key={t.id} value={t.name}>
                                          {t.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-3 gap-3">
                                    {[
                                      { label: 'Buenas', val: buenas, set: setBuenas, color: 'emerald' },
                                      { label: 'Malas', val: malas, set: setMalas, color: 'rose' },
                                      { label: 'Blancas', val: blancas, set: setBlancas, color: 'slate' }
                                    ].map((field) => (
                                      <div key={field.label} className="bg-white p-3 rounded-2xl border-2 border-slate-50 shadow-sm transition-all hover:border-slate-200">
                                        <label className={`text-[9px] font-black text-${field.color}-500 uppercase tracking-widest block mb-2 text-center`}>
                                          {field.label}
                                        </label>
                                        <input
                                          type="number"
                                          value={field.val}
                                          onChange={(e) => field.set(parseInt(e.target.value) || 0)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              handleRegisterGrade();
                                            }
                                          }}
                                          className={`w-full p-2.5 rounded-xl bg-${field.color}-50 border-none font-black text-${field.color}-700 text-center text-lg outline-none focus:ring-2 focus:ring-${field.color}-500 transition-all`}
                                        />
                                        <div className={`text-[8px] font-bold text-${field.color}-400 text-center uppercase tracking-tighter mt-1 italic`}>
                                          Regíst: {field.val}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {selectedExamType && (
                                    <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-center justify-between px-6">
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Cargadas</span>
                                        <span className={`text-xl font-black ${isExcessQuestions ? 'text-rose-600 animate-pulse' : 'text-blue-700'}`}>
                                          {buenas + malas + blancas}
                                        </span>
                                      </div>
                                      <div className="h-8 w-px bg-blue-100"></div>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Máximo</span>
                                        <span className="text-xl font-black text-slate-800">
                                          {examTypes.find(t => t.name === selectedExamType)?.numQuestions}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Right Column: Score & Actions */}
                                <div className="lg:col-span-5 h-full">
                                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col items-center justify-center h-full min-h-[340px] group border-4 border-slate-800">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                                      <Award size={100} />
                                    </div>
                                    
                                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-blue-400/60 mb-2">
                                      Puntaje Final
                                    </p>
                                    
                                    <div className="relative">
                                      <h3 className="text-8xl font-black tracking-tighter leading-none text-white transition-transform group-hover:scale-105 duration-500">
                                        {calculatedScore.finalGrade.toFixed(1)}
                                      </h3>
                                      <div className="absolute -top-1 -right-8 bg-blue-600 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-white/20 shadow-lg">
                                        / 20.0
                                      </div>
                                    </div>

                                    <div className="mt-8 w-full space-y-4">
                                      <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex justify-between items-center px-6 transition-all hover:bg-white/10">
                                        <div className="flex flex-col">
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Bruto</span>
                                          <span className="text-xl font-black">{calculatedScore.rawScore.toFixed(1)}</span>
                                        </div>
                                        <div className="h-8 w-px bg-white/20"></div>
                                        <div className="flex flex-col items-end text-right">
                                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Estado</span>
                                          <span className={`text-xs font-black uppercase tracking-wider ${calculatedScore.finalGrade >= 10.5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {calculatedScore.finalGrade >= 10.5 ? 'Aprobado' : 'Reprobado'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <button
                                        disabled={isExcessQuestions}
                                        onClick={handleRegisterGrade}
                                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 ${
                                          isExcessQuestions
                                            ? "bg-rose-500/10 text-rose-300 cursor-not-allowed border-2 border-rose-500/20 shadow-none"
                                            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40"
                                        }`}
                                      >
                                        {isExcessQuestions ? <AlertTriangle size={18} /> : <Save size={18} />}
                                        {isExcessQuestions ? "Corregir Exceso" : "Registrar Calificación"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            )}
                          </div>
                        </div>
                      )}
                        {activeCalificacionesSubTab === "registros" &&
                        (() => {
                        const filteredGrades = (() => {
                          const searchLower = calificacionesSearch.toLowerCase();
                          let baseGrades = [...grades];

                          if (calificacionesExamenFilter) {
                            const relevantStudents = students.filter(s => s.rol === 'Estudiante' && (!calificacionesGradeFilter || s.grado === calificacionesGradeFilter));
                            const existingGradeStudentIds = new Set(
                              grades.filter(g => g.examType === calificacionesExamenFilter || g.materia === calificacionesExamenFilter).map(g => g.studentId)
                            );
                            const synthesizedGrades: any[] = relevantStudents
                              .filter(s => !existingGradeStudentIds.has(s.id))
                              .map(s => ({
                                id: `missing-${s.id}`,
                                ownerId: s.ownerId,
                                studentId: s.id,
                                studentName: `${s.nombre} ${s.apellido}`,
                                materia: calificacionesMateriaFilter || calificacionesExamenFilter,
                                examType: calificacionesExamenFilter,
                                nota: 0,
                                rawScore: 0,
                                fecha: calificacionesDateFilter || new Date().toISOString().split('T')[0],
                                isMissing: true 
                              }));
                            
                            // Include these synthesized grades into base grades
                            baseGrades = [...baseGrades, ...synthesizedGrades];
                          }

                          return baseGrades
                            .filter((g) => {
                              const student = students.find((s) => s.id === g.studentId);
                              const matchesSearch =
                                (g.studentName || "").toLowerCase().includes(searchLower) ||
                                (student?.dni || "").toLowerCase().includes(searchLower);

                              const matchesGrade =
                                !calificacionesGradeFilter ||
                                student?.grado === calificacionesGradeFilter;
                              const matchesMateria =
                                !calificacionesMateriaFilter ||
                                (g.materia || "").toLowerCase().includes(calificacionesMateriaFilter.toLowerCase());
                              const matchesExamen = 
                                !calificacionesExamenFilter ||
                                g.examType === calificacionesExamenFilter || 
                                (g.materia || "").toLowerCase() === calificacionesExamenFilter.toLowerCase();

                              let matchesDate = true;
                              if (calificacionesDateFilter) {
                                matchesDate = g.fecha === calificacionesDateFilter;
                              }

                              return (
                                matchesSearch &&
                                matchesGrade &&
                                matchesMateria &&
                                matchesExamen &&
                                matchesDate
                              );
                            })
                            .sort((a, b) => {
                              if (registrosSortOrder === "merito")
                                return b.nota - a.nota;
                              if (registrosSortOrder === "demerito")
                                return a.nota - b.nota;
                              return 0;
                            });
                        })();

                        return (
                          <div className="bg-white rounded-[2rem] md:rounded-3xl p-6 md:p-10 shadow-2xl border-t-4 border-t-blue-600 max-w-6xl mx-auto">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                              <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                  Registros de Calificaciones
                                </h3>
                                <p className="text-slate-500 mt-1 text-sm font-bold">
                                  Historial completo de notas registradas en el
                                  sistema.
                                </p>
                                <div className="mt-2 flex items-center gap-4">
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                                    Mostrando: {filteredGrades.length}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-widest">
                                    Total: {grades.length}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <button
                                  onClick={() =>
                                    exportGradesToExcel(filteredGrades)
                                  }
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                >
                                  <FileSpreadsheet size={16} /> Excel
                                </button>
                                <button
                                  onClick={() =>
                                    exportGradesToPDF(filteredGrades)
                                  }
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                >
                                  <FileText size={16} /> PDF
                                </button>
                                <button
                                  onClick={() => {
                                    if (filteredGrades.length > 0) {
                                      confirmAction(
                                        "¿Eliminar TODOS los registros filtrados?",
                                        () => {
                                          const idsToRemove = new Set(
                                            filteredGrades.map((fg) => fg.id),
                                          );
                                          setGrades(
                                            grades.filter(
                                              (g) => !idsToRemove.has(g.id),
                                            ),
                                          );
                                          setToast({
                                            message:
                                              "Registros filtrados eliminados",
                                            type: "success",
                                          });
                                        },
                                      );
                                    }
                                  }}
                                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg"
                                >
                                  <Trash2 size={16} /> Borrar Todo
                                </button>
                              </div>
                            </div>

                            {/* Filters Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-4 mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Buscar Alumno
                                </label>
                                <div className="relative">
                                  <Search
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Nombre o DNI..."
                                    value={calificacionesSearch}
                                    onChange={(e) =>
                                      setCalificacionesSearch(e.target.value)
                                    }
                                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Grado
                                </label>
                                <select
                                  value={calificacionesGradeFilter}
                                  onChange={(e) =>
                                    setCalificacionesGradeFilter(e.target.value)
                                  }
                                  className="w-full px-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Todos los Grados</option>
                                  {Array.from(
                                    new Set(
                                      students
                                        .filter((s) => s.rol === "Estudiante")
                                        .map((s) => s.grado),
                                    ),
                                  ).map((g) => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Materia
                                </label>
                                <select
                                  value={calificacionesMateriaFilter}
                                  onChange={(e) =>
                                    setCalificacionesMateriaFilter(
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Todas las Materias</option>
                                  {courses.map((c) => (
                                    <option key={c.id} value={c.name}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Examen
                                </label>
                                <select
                                  value={calificacionesExamenFilter}
                                  onChange={(e) =>
                                    setCalificacionesExamenFilter(
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Todos los Exámenes</option>
                                  {activeConfig.examTypes?.map((e) => (
                                    <option key={e.id} value={e.name}>
                                      {e.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Fecha
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="date"
                                    value={calificacionesDateFilter}
                                    onChange={(e) =>
                                      setCalificacionesDateFilter(
                                        e.target.value,
                                      )
                                    }
                                    className="flex-1 px-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                  Orden de Mérito
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={registrosSortOrder}
                                    onChange={(e) =>
                                      setRegistrosSortOrder(
                                        e.target.value as any,
                                      )
                                    }
                                    className="flex-1 min-w-[120px] px-4 py-2 rounded-xl bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="ninguno">Ninguno</option>
                                    <option value="merito">Mérito</option>
                                    <option value="demerito">Demérito</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      setCalificacionesSearch("");
                                      setCalificacionesGradeFilter("");
                                      setCalificacionesMateriaFilter("");
                                      setCalificacionesExamenFilter("");
                                      setCalificacionesDateFilter("");
                                      setRegistrosSortOrder("ninguno");
                                    }}
                                    className="w-[34px] flex-shrink-0 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm transition-all flex items-center justify-center outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Limpiar Filtros"
                                  >
                                    <RefreshCw size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {registrosSortOrder !== "ninguno" && (
                                      <th className="px-6 py-4">Puesto</th>
                                    )}
                                    <th className="px-6 py-4">Alumno</th>
                                    <th className="px-6 py-4">
                                      Materia / Tipo
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                      Puntos
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                      Nota
                                    </th>
                                    <th className="px-6 py-4">Fecha</th>
                                    <th className="px-6 py-4 text-right">
                                      Acciones
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredGrades.map((grade, index) => {
                                    const student = students.find(
                                      (s) => s.id === grade.studentId,
                                    );
                                    return (
                                      <tr
                                        key={grade.id}
                                        className={`bg-white hover:bg-slate-50 transition-all group shadow-sm rounded-2xl ${grade.isOpticalSheet ? 'bg-indigo-50/50 border-l-4 border-l-indigo-600' : ''}`}
                                      >
                                        {registrosSortOrder !== "ninguno" && (
                                          <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-100">
                                            <span
                                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${index < 3 && registrosSortOrder === "merito" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}
                                            >
                                              {index + 1}
                                            </span>
                                          </td>
                                        )}
                                        <td
                                          className={`px-6 py-4 ${registrosSortOrder === "ninguno" ? "rounded-l-2xl border-l" : ""} border-y border-slate-100`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs overflow-hidden">
                                              {student?.foto ? (
                                                <img
                                                  src={student.foto}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                grade.studentName[0]
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-black text-slate-800 uppercase text-xs">
                                                {grade.studentName}
                                              </p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                {student?.grado} "
                                                {student?.seccion}" -{" "}
                                                {student?.nivel}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100">
                                          <div className="flex flex-col gap-1">
                                            <p className="font-bold text-slate-600 text-xs">
                                              {grade.materia}
                                            </p>
                                            {grade.isFromPublicConsultas && (
                                              <span className="w-fit flex items-center gap-1 bg-indigo-600 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                                                <Layers size={8} /> Marcado por Alumno
                                              </span>
                                            )}

                                          </div>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100 text-center">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {(grade as any).isMissing ? "-" : grade.rawScore?.toFixed(1) || "-"}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100 text-center">
                                          <span
                                            className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${(grade as any).isMissing ? "bg-slate-50 text-slate-400" : grade.nota >= 11 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                                          >
                                            {(grade as any).isMissing ? "Sin nota" : grade.nota
                                              .toString()
                                              .padStart(2, "0")}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100">
                                          <p className="text-[10px] font-bold text-slate-400">
                                            {(grade as any).isMissing ? "-" : grade.fecha}
                                          </p>
                                        </td>
                                        <td className="px-6 py-4 border-y border-r border-slate-100 rounded-r-2xl text-right">
                                          {!(grade as any).isMissing ? (
                                          <div className="flex justify-end gap-2">
                                            <button
                                              onClick={() => {
                                                const message = `Hola ${grade.studentName}, se ha registrado tu nota en ${grade.materia}: *${grade.nota}*. Fecha: ${grade.fecha}.`;
                                                const phone =
                                                  student?.celularApoderado ||
                                                  "";
                                                const waLink = `https://wa.me/${phone.replace(/\s+/g, "")}?text=${encodeURIComponent(`Estimado Apoderado, se le comunica que se ha registrado una nota para el alumno ${grade.studentName} en la materia ${grade.materia}. Nota: *${grade.nota}*. Fecha: ${grade.fecha}.`)}`;
                                                window.open(waLink, "_blank");
                                              }}
                                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                              title="Enviar al Apoderado"
                                            >
                                              <Phone size={16} />
                                            </button>
                                            <button
                                              onClick={() => {
                                                const phone =
                                                  student?.studentPhone || "";
                                                const waLink = `https://wa.me/${phone.replace(/\s+/g, "")}?text=${encodeURIComponent(`Hola ${grade.studentName}, se ha registrado tu nota en ${grade.materia}: *${grade.nota}*. Fecha: ${grade.fecha}.`)}`;
                                                window.open(waLink, "_blank");
                                              }}
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                              title="Enviar al Alumno"
                                            >
                                              <Users size={16} />
                                            </button>
                                            {(grade.isOpticalSheet || grade.isFromPublicConsultas) && (
                                              <button
                                                onClick={() =>
                                                  setViewingAnswers(grade)
                                                }
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Ver Respuestas"
                                              >
                                                <Eye size={16} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() =>
                                                setEditingGrade(grade)
                                              }
                                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                              <Edit size={16} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                confirmAction(
                                                  "¿Eliminar este registro de calificación?",
                                                  () => {
                                                    setGrades(
                                                      grades.filter(
                                                        (g) =>
                                                          g.id !== grade.id,
                                                      ),
                                                    );
                                                    setToast({
                                                      message:
                                                        "Registro eliminado",
                                                      type: "success",
                                                    });
                                                  },
                                                )
                                              }
                                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                          ) : (
                                            <div className="flex justify-end gap-2">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 py-1 bg-slate-50 rounded-lg">Falta Evaluar</span>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              {filteredGrades.length === 0 && (
                                <div className="py-20 text-center">
                                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText size={32} />
                                  </div>
                                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                    No hay registros de notas que coincidan
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {activeCalificacionesSubTab === "boletas" && (
                      <div className="bg-white rounded-[2rem] md:rounded-3xl p-6 md:p-10 shadow-2xl border-t-4 border-t-blue-600 max-w-6xl mx-auto">
                        {!selectedBoletaStudent ? (
                          <>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
                              <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                  Boletas de Notas
                                </h3>
                                <p className="text-slate-500 mt-1">
                                  Generación de boletas y orden de mérito.
                                </p>
                              </div>
                              <div className="flex gap-2">
                                {currentUser?.permissions.includes("calificaciones:boletas") && (
                                  <button
                                    onClick={downloadAllBoletasPDF}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all"
                                  >
                                    <Printer size={16} /> Imprimir Todo
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-8">
                              <div className="md:col-span-4 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                  Búsqueda
                                </label>
                                <div className="relative">
                                  <Search
                                    size={16}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Nombre o DNI..."
                                    value={calificacionesSearch}
                                    onChange={(e) =>
                                      setCalificacionesSearch(e.target.value)
                                    }
                                    className="w-full pl-12 p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                  Nivel
                                </label>
                                <select
                                  value={calificacionesLevelFilter}
                                  onChange={(e) =>
                                    setCalificacionesLevelFilter(e.target.value)
                                  }
                                  className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                                >
                                  <option value="">Todos</option>
                                  {levels.map((l) => (
                                    <option key={l.id} value={l.nombre}>
                                      {l.nombre}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                  Grado
                                </label>
                                <select
                                  value={calificacionesGradeFilter}
                                  onChange={(e) =>
                                    setCalificacionesGradeFilter(e.target.value)
                                  }
                                  className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                                >
                                  <option value="">Todos</option>
                                  {Array.from(
                                    new Set(gradeLevels.map((gl) => gl.nombre)),
                                  ).map((g) => (
                                    <option key={g} value={g}>
                                      {g}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">
                                  Sección
                                </label>
                                <select
                                  value={calificacionesSectionFilter}
                                  onChange={(e) =>
                                    setCalificacionesSectionFilter(
                                      e.target.value,
                                    )
                                  }
                                  className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-slate-800 text-sm shadow-inner outline-none"
                                >
                                  <option value="">Todas</option>
                                  {Array.from(
                                    new Set(
                                      gradeLevels.map((gl) => gl.seccion),
                                    ),
                                  ).map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full text-left border-separate border-spacing-y-3">
                                <thead>
                                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-6 py-4">Alumno</th>
                                    <th className="px-6 py-4">
                                      Grado / Sección
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                      Promedio
                                    </th>
                                    <th className="px-6 py-4 text-center">
                                      Conducta
                                    </th>
                                    <th className="px-6 py-4 text-right">
                                      Acciones
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {students
                                    .filter((s) => {
                                      const matchesSearch = (
                                        s.nombre +
                                        " " +
                                        s.apellido +
                                        " " +
                                        s.dni
                                      )
                                        .toLowerCase()
                                        .includes(
                                          calificacionesSearch.toLowerCase(),
                                        );
                                      const matchesLevel =
                                        !calificacionesLevelFilter ||
                                        s.nivel === calificacionesLevelFilter;
                                      const matchesGrade =
                                        !calificacionesGradeFilter ||
                                        s.grado === calificacionesGradeFilter;
                                      const matchesSection =
                                        !calificacionesSectionFilter ||
                                        s.seccion ===
                                          calificacionesSectionFilter;
                                      return (
                                        matchesSearch &&
                                        matchesLevel &&
                                        matchesGrade &&
                                        matchesSection
                                      );
                                    })
                                    .map((s) => {
                                      const studentGrades = grades.filter(
                                        (g) => g.studentId === s.id,
                                      );
                                      const average =
                                        studentGrades.length > 0
                                          ? studentGrades.reduce(
                                              (acc, curr) => acc + curr.nota,
                                              0,
                                            ) / studentGrades.length
                                          : 0;
                                      return { ...s, average };
                                    })
                                    .map((s, index) => (
                                      <tr
                                        key={s.id}
                                        className="bg-white hover:bg-slate-50 transition-all group shadow-sm rounded-2xl"
                                      >
                                        <td className="px-6 py-4 rounded-l-2xl border-y border-l border-slate-100">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs overflow-hidden">
                                              {s.foto ? (
                                                <img
                                                  src={s.foto}
                                                  className="w-full h-full object-cover"
                                                />
                                              ) : (
                                                s.nombre[0]
                                              )}
                                            </div>
                                            <div>
                                              <p className="font-black text-slate-800 uppercase text-xs">
                                                {s.nombre} {s.apellido}
                                              </p>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase">
                                                {s.dni}
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100">
                                          <p className="text-[10px] font-bold text-slate-600 uppercase">
                                            {s.grado} "{s.seccion}" - {s.nivel}
                                          </p>
                                        </td>
                                        <td className="px-6 py-4 border-y border-slate-100 text-center">
                                          <span
                                            className={`inline-block px-3 py-1 rounded-lg font-black text-sm ${s.average >= 11 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                                          >
                                            {s.average.toFixed(2)}
                                          </span>
                                        </td>
                                        <td className="px-6 py-4 border-y border-r border-slate-100 rounded-r-2xl text-right">
                                          <button
                                            onClick={() =>
                                              setSelectedBoletaStudent(s)
                                            }
                                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md"
                                          >
                                            Generar Boleta
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        ) : (
                          <div className="animate-fade-in">
                            <div className="flex justify-between items-center mb-10 no-print">
                              <button
                                onClick={() => setSelectedBoletaStudent(null)}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-all"
                              >
                                <ArrowLeft size={16} /> Volver a la lista
                              </button>
                              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <button
                                  onClick={() => window.print()}
                                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all w-full sm:w-auto"
                                >
                                  <Printer size={16} /> Imprimir
                                </button>
                                <button
                                  onClick={() =>
                                    setShowBoletaDownloadOptions(true)
                                  }
                                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl hover:bg-blue-700 transition-all w-full sm:w-auto"
                                >
                                  <Download size={16} /> Descargar PDF
                                </button>
                              </div>
                            </div>

                            <AnimatePresence>
                              {showBoletaDownloadOptions && (
                                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full border-4 border-white"
                                  >
                                    <div className="text-center mb-8">
                                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Download size={32} />
                                      </div>
                                      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                        Opciones de Descarga
                                      </h3>
                                      <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">
                                        ¿Cómo deseas descargar la boleta?
                                      </p>
                                    </div>

                                    <div className="grid gap-3">
                                      <button
                                        onClick={() =>
                                          downloadBoletaPDF("single")
                                        }
                                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-4 px-6 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-blue-200"
                                      >
                                        <div className="text-left">
                                          <span className="block text-sm uppercase tracking-tight">
                                            Simple (1 copia)
                                          </span>
                                          <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">
                                            Una boleta por página A4
                                          </span>
                                        </div>
                                        <FileText
                                          size={20}
                                          className="text-slate-400 group-hover:text-blue-500 transition-colors"
                                        />
                                      </button>

                                      <button
                                        onClick={() =>
                                          downloadBoletaPDF("double")
                                        }
                                        className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-4 px-6 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-blue-200"
                                      >
                                        <div className="text-left">
                                          <span className="block text-sm uppercase tracking-tight">
                                            Doble (2 copias)
                                          </span>
                                          <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">
                                            Dos boletas en una página A4
                                          </span>
                                        </div>
                                        <Layers
                                          size={20}
                                          className="text-slate-400 group-hover:text-blue-500 transition-colors"
                                        />
                                      </button>

                                      <button
                                        onClick={() =>
                                          setShowBoletaDownloadOptions(false)
                                        }
                                        className="w-full mt-4 text-slate-400 hover:text-slate-600 font-black py-2 uppercase text-[10px] tracking-widest transition-all"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>

                            <div
                              id="boleta-generada"
                              ref={boletaRef}
                              className="bg-white p-12 rounded-3xl border-8 border-slate-50 shadow-inner max-w-4xl mx-auto print:shadow-none print:border-0 print:p-0"
                            >
                              <div className="flex justify-between items-start mb-12 border-b-4 border-slate-50 pb-8">
                                <div className="flex items-center gap-6">
                                  <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl">
                                    {activeConfig.logo ? (
                                      <img
                                        src={activeConfig.logo}
                                        className="w-16 h-16 object-contain"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : (
                                      <GraduationCap size={48} />
                                    )}
                                  </div>
                                  <div>
                                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase">
                                      {activeConfig.siteName}
                                    </h1>
                                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">
                                      {activeConfig.slogan}
                                    </p>
                                    <p className="text-blue-600 font-black uppercase tracking-widest text-[10px] mt-2">
                                      Boleta Informativa de Calificaciones
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      Fecha de Emisión
                                    </p>
                                    <p className="text-lg font-black text-slate-800">
                                      {new Date().toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-12 mb-12">
                                <div className="space-y-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 overflow-hidden border-4 border-white shadow-lg">
                                      {selectedBoletaStudent.foto ? (
                                        <img
                                          src={selectedBoletaStudent.foto}
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-2xl text-slate-300">
                                          {selectedBoletaStudent.nombre[0]}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                        Estudiante
                                      </p>
                                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                        {selectedBoletaStudent.nombre}{" "}
                                        {selectedBoletaStudent.apellido}
                                      </h2>
                                      <p className="text-xs font-bold text-slate-500">
                                        DNI: {selectedBoletaStudent.dni}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Nivel
                                    </p>
                                    <p className="text-sm font-black text-slate-800 uppercase">
                                      {selectedBoletaStudent.nivel}
                                    </p>
                                  </div>
                                  <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                      Grado / Sección
                                    </p>
                                    <p className="text-sm font-black text-slate-800 uppercase">
                                      {selectedBoletaStudent.grado} "
                                      {selectedBoletaStudent.seccion}"
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="mb-12">
                                <table className="w-full border-separate border-spacing-y-2">
                                  <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                                      <th className="px-6 py-4">
                                        Área Curricular / Materia
                                      </th>
                                      <th className="px-6 py-4 text-center">
                                        Calificación
                                      </th>
                                      <th className="px-6 py-4 text-center">
                                        Estado
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {Array.from(
                                      new Set(
                                        grades
                                          .filter(
                                            (g) =>
                                              g.studentId ===
                                              selectedBoletaStudent.id,
                                          )
                                          .map((g) => g.materia),
                                      ),
                                    ).map((materia) => {
                                      const studentGrades = grades.filter(
                                        (g) =>
                                          g.studentId ===
                                            selectedBoletaStudent.id &&
                                          g.materia === materia,
                                      );
                                      const avg =
                                        studentGrades.reduce(
                                          (a, b) => a + b.nota,
                                          0,
                                        ) / studentGrades.length;
                                      return (
                                        <tr
                                          key={materia}
                                          className="bg-slate-50/50 rounded-2xl"
                                        >
                                          <td className="px-6 py-4 rounded-l-2xl font-bold text-slate-700 text-sm uppercase">
                                            {materia}
                                          </td>
                                          <td className="px-6 py-4 text-center font-black text-lg text-slate-800">
                                            {avg.toFixed(0).padStart(2, "0")}
                                          </td>
                                          <td className="px-6 py-4 rounded-r-2xl text-center">
                                            <span
                                              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${avg >= 11 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                                            >
                                              {avg >= 11
                                                ? "Aprobado"
                                                : "Desaprobado"}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                    {grades.filter(
                                      (g) =>
                                        g.studentId ===
                                        selectedBoletaStudent.id,
                                    ).length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={3}
                                          className="py-10 text-center text-slate-400 font-bold uppercase text-[10px] italic"
                                        >
                                          No hay notas registradas para este
                                          estudiante
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              <div className="grid grid-cols-3 gap-6">
                                <div className="col-span-2 bg-blue-600 p-8 rounded-2xl text-white shadow-2xl relative overflow-hidden">
                                  <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">
                                      Promedio General Acumulado
                                    </p>
                                    <div className="flex items-baseline justify-between w-full">
                                      <div className="flex items-baseline gap-4">
                                        <h3 className="text-6xl font-black tracking-tighter">
                                          {(
                                            grades
                                              .filter(
                                                (g) =>
                                                  g.studentId ===
                                                  selectedBoletaStudent.id,
                                              )
                                              .reduce((a, b) => a + b.nota, 0) /
                                            (grades.filter(
                                              (g) =>
                                                g.studentId ===
                                                selectedBoletaStudent.id,
                                            ).length || 1)
                                          ).toFixed(2)}
                                        </h3>
                                        <p className="text-blue-200 font-black uppercase text-xs tracking-widest">
                                          Puntos
                                        </p>
                                      </div>
                                      <div className="text-right bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/10">
                                        <p className="text-[8px] font-black uppercase tracking-widest opacity-60 mb-1">
                                          Nota Comportamiento
                                        </p>
                                        <p className="text-2xl font-black">
                                          {(
                                            (selectedBoletaStudent.conductPoints ||
                                              100) / 5
                                          ).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
                                    <Award size={200} />
                                  </div>
                                </div>
                                <div className="bg-slate-900 p-8 rounded-2xl text-white flex flex-col justify-center items-center text-center shadow-2xl">
                                  <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-2">
                                    Puesto en Grado
                                  </p>
                                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-2">
                                    <span className="text-3xl font-black">
                                      {students
                                        .filter(
                                          (s) =>
                                            s.grado ===
                                            selectedBoletaStudent.grado,
                                        )
                                        .map((s) => {
                                          const sg = grades.filter(
                                            (g) => g.studentId === s.id,
                                          );
                                          return {
                                            id: s.id,
                                            avg:
                                              sg.length > 0
                                                ? sg.reduce(
                                                    (a, b) => a + b.nota,
                                                    0,
                                                  ) / sg.length
                                                : 0,
                                          };
                                        })
                                        .sort((a, b) => b.avg - a.avg)
                                        .findIndex(
                                          (s) =>
                                            s.id === selectedBoletaStudent.id,
                                        ) + 1}
                                    </span>
                                  </div>
                                  <p className="text-[8px] font-black uppercase tracking-tighter opacity-40">
                                    De{" "}
                                    {
                                      students.filter(
                                        (s) =>
                                          s.grado ===
                                          selectedBoletaStudent.grado,
                                      ).length
                                    }{" "}
                                    alumnos
                                  </p>
                                </div>
                              </div>

                              <div className="mt-20 grid grid-cols-2 gap-20">
                                <div className="border-t-2 border-slate-200 pt-4 text-center">
                                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                    Firma del Director
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Sello Institucional
                                  </p>
                                </div>
                                <div className="border-t-2 border-slate-200 pt-4 text-center">
                                  <p className="text-xs font-black text-slate-800 uppercase tracking-widest">
                                    Firma del Padre/Tutor
                                  </p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    DNI:
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "calificaciones" &&
                  activeCalificacionesSubTab === "ficha-optica" && (
                    <FichaOptica
                      students={students}
                      examTypes={examTypes}
                      gradeLevels={gradeLevels}
                      onSaveGrade={(grade) => {
                        setGrades((prev) => [...prev, grade]);
                        setToast({
                          message: "Calificación guardada en registros",
                          type: "success",
                        });
                      }}
                    />
                  )}

                {/* Configuración Section */}
                {/* Mi Panel Section */}
                {activeTab === "mi-panel" && (
                  <div className="animate-slide-up space-y-8">
                    <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                      <div className="text-center md:text-left">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                          {activeConfig.siteName}
                        </h2>
                        <p className="text-slate-500 font-medium text-sm md:text-base">
                          Mi Panel - Gestión de perfil, grados y horarios.
                        </p>
                      </div>
                      <div className="flex flex-row bg-white p-1 rounded-xl shadow-lg border border-slate-100 overflow-x-auto no-scrollbar w-full md:w-auto justify-center gap-0.5 scroll-smooth">
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "mi-panel:perfil",
                          )) && (
                          <button
                            onClick={() => setActivePanelSubTab("perfil")}
                            className={`flex-1 md:flex-none px-2.5 py-2 rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === "perfil" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Perfil
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "mi-panel:grados",
                          )) && (
                          <button
                            onClick={() => setActivePanelSubTab("grados")}
                            className={`flex-1 md:flex-none px-2.5 py-2 rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === "grados" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Grados
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.some((p) =>
                            p.startsWith("mi-panel:horarios"),
                          )) && (
                          <button
                            onClick={() => setActivePanelSubTab("horarios")}
                            className={`flex-1 md:flex-none px-2.5 py-2 rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === "horarios" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Horarios
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "mi-panel:alerta",
                          )) && (
                          <button
                            onClick={() => setActivePanelSubTab("alerta")}
                            className={`flex-1 md:flex-none px-2.5 py-2 rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === "alerta" ? "bg-red-600 text-white shadow-md" : "text-red-400 hover:text-red-600"}`}
                          >
                            Alerta
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "mi-panel:profesores",
                          )) && (
                          <button
                            onClick={() => setActivePanelSubTab("profesores")}
                            className={`flex-1 md:flex-none px-2.5 py-2 rounded-lg font-black text-[7px] md:text-[8px] uppercase tracking-widest transition-all whitespace-nowrap ${activePanelSubTab === "profesores" ? "bg-slate-900 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Profesores
                          </button>
                        )}
                      </div>
                    </header>

                    {activePanelSubTab === "perfil" && (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Profile Card */}
                        {currentUser?.role !== "admin" && (
                          <div className="lg:col-span-1 space-y-8">
                            <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-3xl shadow-2xl border border-slate-200 text-center relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700"></div>
                              <div className="relative pt-12">
                                <div className="w-32 h-32 rounded-2xl bg-white p-1 mx-auto shadow-2xl relative z-10">
                                  <div className="w-full h-full rounded-[2.2rem] bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                    <User
                                      size={64}
                                      className="text-slate-300"
                                    />
                                  </div>
                                </div>
                                <div className="mt-6">
                                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                    {currentUser?.fullName ||
                                      currentUser?.username}
                                  </h3>
                                  <p className="text-blue-600 font-black uppercase tracking-[0.2em] text-[10px] mt-1">
                                    {currentUser?.role === "admin"
                                      ? "Administrador Maestro"
                                      : "Personal de Apoyo"}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-10 space-y-4 text-left">
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <Mail size={18} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      Email
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                      {currentUser?.email || "No registrado"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <Phone size={18} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      WhatsApp
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                      {currentUser?.whatsapp || "No registrado"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                    <Shield size={18} />
                                  </div>
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      ID de Usuario
                                    </p>
                                    <p className="text-sm font-bold text-slate-700">
                                      {currentUser?.id}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => setPanelModalType("profile")}
                                className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all shadow-xl"
                              >
                                Editar Perfil
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Activity & Stats */}
                        <div
                          className={`${currentUser?.role === "admin" ? "lg:col-span-3" : "lg:col-span-2"} space-y-8`}
                        >
                          {/* Public Modules Config */}
                          {currentUser?.role === "admin" && (
                            <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
                              <div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                  Módulos de Consulta Pública
                                </h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                  Configure qué información será visible para el
                                  público
                                </p>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                      };
                                    const newModules = {
                                      ...current,
                                      attendance: !current.attendance,
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Módulo Asistencia ${!current.attendance ? "habilitado" : "deshabilitado"}`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.attendance ?? true) ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.attendance ?? true) ? "bg-emerald-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <CalendarCheck size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.attendance ?? true) ? "text-emerald-900" : "text-slate-400"}`}
                                    >
                                      Asistencia
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {(globalConfig.publicModules
                                        ?.attendance ?? true)
                                        ? "Visible"
                                        : "Oculto"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                      };
                                    const newModules = {
                                      ...current,
                                      alerts: !current.alerts,
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Módulo Alertas ${!current.alerts ? "habilitado" : "deshabilitado"}`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.alerts ?? true) ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.alerts ?? true) ? "bg-rose-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <AlertCircle size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.alerts ?? true) ? "text-rose-900" : "text-slate-400"}`}
                                    >
                                      Alertas
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {(globalConfig.publicModules?.alerts ??
                                      true)
                                        ? "Visible"
                                        : "Oculto"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                      };
                                    const newModules = {
                                      ...current,
                                      schedule: !current.schedule,
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Módulo Horario ${!current.schedule ? "habilitado" : "deshabilitado"}`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.schedule ?? true) ? "bg-blue-50 border-blue-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.schedule ?? true) ? "bg-blue-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <Clock size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.schedule ?? true) ? "text-blue-900" : "text-slate-400"}`}
                                    >
                                      Horario
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {(globalConfig.publicModules?.schedule ??
                                      true)
                                        ? "Visible"
                                        : "Oculto"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                        hideTeacherSchedule: false,
                                      };
                                    const newModules = {
                                      ...current,
                                      hideTeacherSchedule:
                                        !current.hideTeacherSchedule,
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Horario de Docentes ${newModules.hideTeacherSchedule ? "oculto" : "visible"} para el público`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 flex flex-col items-center gap-4 group ${globalConfig.publicModules?.hideTeacherSchedule ? "bg-slate-50 border-slate-100 opacity-60" : "bg-amber-50 border-amber-200"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl ${globalConfig.publicModules?.hideTeacherSchedule ? "bg-slate-200 text-slate-400" : "bg-amber-600 text-white shadow-lg"}`}
                                  >
                                    <Shield size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${globalConfig.publicModules?.hideTeacherSchedule ? "text-slate-400" : "text-amber-900"}`}
                                    >
                                      Mostrar Horario Docente
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {globalConfig.publicModules
                                        ?.hideTeacherSchedule
                                        ? "Desactivado"
                                        : "Activado"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                        exams: true,
                                      };
                                    const newModules = {
                                      ...current,
                                      grades: !current.grades,
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Módulo Notas ${!current.grades ? "habilitado" : "deshabilitado"}`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.grades ?? true) ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.grades ?? true) ? "bg-amber-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <Award size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.grades ?? true) ? "text-amber-900" : "text-slate-400"}`}
                                    >
                                      Notas
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {(globalConfig.publicModules?.grades ??
                                      true)
                                        ? "Visible"
                                        : "Oculto"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current =
                                      globalConfig.publicModules || {
                                        attendance: true,
                                        alerts: true,
                                        schedule: true,
                                        grades: true,
                                        exams: true,
                                      };
                                    const newModules = {
                                      ...current,
                                      exams: !(current.exams ?? true),
                                    };
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      publicModules: newModules,
                                    }));
                                    setToast({
                                      message: `Módulo Exámenes ${!(current.exams ?? true) ? "habilitado" : "deshabilitado"}`,
                                      type: "success",
                                    });
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${(globalConfig.publicModules?.exams ?? true) ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${(globalConfig.publicModules?.exams ?? true) ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <FileText size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${(globalConfig.publicModules?.exams ?? true) ? "text-indigo-900" : "text-slate-400"}`}
                                    >
                                      Exámenes
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {(globalConfig.publicModules?.exams ??
                                      true)
                                        ? "Visible"
                                        : "Oculto"}
                                    </p>
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    const current = globalConfig.publicModules || {
                                      attendance: true,
                                      alerts: true,
                                      schedule: true,
                                      grades: true,
                                      exams: true,
                                    };
                                    
                                    if (!current.opticalSheetEnabled) {
                                      setPanelModalType("publicOpticalConfig");
                                    } else {
                                      const newModules = {
                                        ...current,
                                        opticalSheetEnabled: false,
                                      };
                                      setGlobalConfig((prev) => ({
                                        ...prev,
                                        publicModules: newModules,
                                      }));
                                      setToast({
                                        message: "Módulo Ficha Examen deshabilitado",
                                        type: "success",
                                      });
                                    }
                                  }}
                                  className={`p-8 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 group ${globalConfig.publicModules?.opticalSheetEnabled ? "bg-violet-50 border-violet-200" : "bg-slate-50 border-slate-100 opacity-60"}`}
                                >
                                  <div
                                    className={`p-4 rounded-2xl transition-all ${globalConfig.publicModules?.opticalSheetEnabled ? "bg-violet-600 text-white shadow-lg" : "bg-slate-200 text-slate-400"}`}
                                  >
                                    <Layers size={24} />
                                  </div>
                                  <div className="text-center">
                                    <p
                                      className={`font-black uppercase tracking-widest text-[10px] ${globalConfig.publicModules?.opticalSheetEnabled ? "text-violet-900" : "text-slate-400"}`}
                                    >
                                      Ficha Examen
                                    </p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                      {globalConfig.publicModules?.opticalSheetEnabled
                                        ? "Activado"
                                        : "Desactivado"}
                                    </p>
                                  </div>
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                              <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
                                  <Clock size={24} />
                                </div>
                                <h4 className="font-black text-slate-800 uppercase tracking-tight">
                                  Última Actividad
                                </h4>
                              </div>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <span className="text-xs font-bold text-slate-600">
                                    Inicio de Sesión
                                  </span>
                                  <span className="text-[10px] font-black text-blue-600 uppercase">
                                    Hoy, 08:15 AM
                                  </span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                  <span className="text-xs font-bold text-slate-600">
                                    Registro de Asistencia
                                  </span>
                                  <span className="text-[10px] font-black text-blue-600 uppercase">
                                    Ayer, 04:30 PM
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <AlertCircle size={24} />
                                  </div>
                                  <h4 className="font-black text-slate-800 uppercase tracking-tight">
                                    Notificaciones
                                  </h4>
                                </div>
                                <button
                                  onClick={() => setPanelModalType("report")}
                                  className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                                  title="Registrar Reporte/Mensaje"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                              <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                {notifications.length > 0 ? (
                                  notifications.map((notif) => (
                                    <div
                                      key={notif.id}
                                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1"
                                    >
                                      <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">
                                          {notif.username}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[8px] font-bold text-slate-400">
                                            {notif.date}
                                          </span>
                                          {currentUser?.role === "admin" && (
                                            <button
                                              onClick={() =>
                                                confirmAction(
                                                  "¿Eliminar esta notificación?",
                                                  () => {
                                                    setNotifications(
                                                      notifications.filter(
                                                        (n) =>
                                                          n.id !== notif.id,
                                                      ),
                                                    );
                                                    setToast({
                                                      message:
                                                        "Notificación eliminada",
                                                      type: "success",
                                                    });
                                                  },
                                                )
                                              }
                                              className="text-rose-500 hover:text-rose-700 transition-all"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <p className="text-xs text-slate-600 font-medium leading-tight">
                                        {notif.message}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-4 opacity-30">
                                    <Mail size={32} className="mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">
                                      Sin mensajes nuevos
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200">
                            <div className="flex items-center justify-between mb-8">
                              <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                Resumen de Gestión
                              </h4>
                              <span className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                                Este Mes
                              </span>
                            </div>
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Registros de Asistencia</span>
                                  <span>85%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-600 rounded-full"
                                    style={{ width: "85%" }}
                                  ></div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Nuevos Estudiantes</span>
                                  <span>40%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-600 rounded-full"
                                    style={{ width: "40%" }}
                                  ></div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  <span>Reportes Generados</span>
                                  <span>65%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-600 rounded-full"
                                    style={{ width: "65%" }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activePanelSubTab === "grados" && (
                      <div className="space-y-6 md:space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                          <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter text-center md:text-left">
                            Gestión de Niveles y Grados
                          </h3>
                          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto justify-center">
                            {(currentUser?.role === "admin" ||
                              currentUser?.permissions.includes(
                                "mi-panel:grados:niveles",
                              )) && (
                              <button
                                onClick={() => setActiveGradosSubTab("niveles")}
                                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeGradosSubTab === "niveles" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                              >
                                Niveles
                              </button>
                            )}
                            {(currentUser?.role === "admin" ||
                              currentUser?.permissions.includes(
                                "mi-panel:grados:grados",
                              )) && (
                              <button
                                onClick={() => setActiveGradosSubTab("grados")}
                                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeGradosSubTab === "grados" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                              >
                                Grados
                              </button>
                            )}
                            {(currentUser?.role === "admin" ||
                              currentUser?.permissions.includes(
                                "mi-panel:grados:secciones",
                              )) && (
                              <button
                                onClick={() =>
                                  setActiveGradosSubTab("secciones")
                                }
                                className={`flex-1 md:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all ${activeGradosSubTab === "secciones" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
                              >
                                Secciones
                              </button>
                            )}
                          </div>
                        </div>

                        {activeGradosSubTab === "niveles" && (
                          <div className="space-y-6">
                            <div className="flex justify-center md:justify-end">
                              <button
                                onClick={() => {
                                  setEditingLevel(null);
                                  setPanelModalType("level");
                                }}
                                className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                              >
                                <Plus size={20} /> NUEVO NIVEL
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {levels.map((lvl) => (
                                <div
                                  key={lvl.id}
                                  className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                                      {lvl.nombre[0].toUpperCase()}
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                      {lvl.nombre}
                                    </h4>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        setEditingLevel(lvl);
                                        setPanelModalType("level");
                                      }}
                                      className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all bg-blue-50"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmModal({
                                          title: "Eliminar Nivel",
                                          message: `¿Estás seguro de eliminar el nivel "${lvl.nombre}"? Esto podría afectar a los grados asociados.`,
                                          onConfirm: () => {
                                            setLevels(
                                              levels.filter(
                                                (l) => l.id !== lvl.id,
                                              ),
                                            );
                                            setToast({
                                              message: "Nivel eliminado",
                                              type: "success",
                                            });
                                            setConfirmModal(null);
                                          },
                                        });
                                      }}
                                      className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeGradosSubTab === "secciones" && (
                          <div className="space-y-6 animate-slide-up">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                              <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                  Gestión de Secciones
                                </h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                  Administra las secciones disponibles en el
                                  sistema
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingSection(null);
                                  setPanelModalType("section");
                                }}
                                className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                style={{
                                  backgroundColor:
                                    activeConfig.theme.primaryColor,
                                }}
                              >
                                <Plus size={16} /> Nueva Sección
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sections.map((s, i) => (
                                <div
                                  key={i}
                                  className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all"
                                >
                                  <div className="flex items-center gap-4">
                                    <div
                                      className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-blue-600 text-lg"
                                      style={{
                                        color: activeConfig.theme.primaryColor,
                                      }}
                                    >
                                      {s}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-slate-900 uppercase">
                                        Sección {s}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Disponible para todos los grados
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingSection(s);
                                        setPanelModalType("section");
                                      }}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfirmModal({
                                          title: "Eliminar Sección",
                                          message: `¿Estás seguro de eliminar la sección "${s}"?`,
                                          onConfirm: () => {
                                            const isUsed = gradeLevels.some(
                                              (gl) => gl.seccion === s,
                                            );
                                            if (isUsed) {
                                              setConfirmModal({
                                                title: "Sección en Uso",
                                                message: `La sección "${s}" está siendo usada por algunos grados. ¿Estás seguro de eliminarla? Los grados mantendrán el nombre de la sección pero ya no estará disponible para nuevos grados.`,
                                                onConfirm: () => {
                                                  setSections(
                                                    sections.filter(
                                                      (sec) => sec !== s,
                                                    ),
                                                  );
                                                  setToast({
                                                    message:
                                                      "Sección eliminada",
                                                    type: "success",
                                                  });
                                                  setConfirmModal(null);
                                                },
                                              });
                                              return;
                                            }
                                            setSections(
                                              sections.filter(
                                                (sec) => sec !== s,
                                              ),
                                            );
                                            setToast({
                                              message: "Sección eliminada",
                                              type: "success",
                                            });
                                            setConfirmModal(null);
                                          },
                                        });
                                      }}
                                      className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {activeGradosSubTab === "grados" && (
                          <div className="space-y-6">
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  setEditingGradeLevel(null);
                                  setPanelModalType("grade");
                                }}
                                className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                              >
                                <Plus size={20} /> NUEVO GRADO
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {gradeLevels.map((gl) => {
                                const level = levels.find(
                                  (l) => l.id === gl.nivelId,
                                );
                                return (
                                  <div
                                    key={gl.id}
                                    className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex justify-between items-center group hover:border-blue-200 transition-all"
                                  >
                                    <div>
                                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full inline-block mb-2">
                                        {level?.nombre || "Sin Nivel"}
                                      </p>
                                      <h4 className="text-2xl font-black text-slate-800">
                                        {gl.nombre}{" "}
                                        <span className="text-blue-600">
                                          "{gl.seccion}"
                                        </span>
                                      </h4>
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingGradeLevel(gl);
                                          setPanelModalType("grade");
                                        }}
                                        className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all bg-blue-50"
                                      >
                                        <Edit size={16} />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setConfirmModal({
                                            title: "Eliminar Grado",
                                            message: `¿Estás seguro de eliminar el grado "${gl.nombre} ${gl.seccion}"?`,
                                            onConfirm: () => {
                                              setGradeLevels(
                                                gradeLevels.filter(
                                                  (g) => g.id !== gl.id,
                                                ),
                                              );
                                              setToast({
                                                message: "Grado eliminado",
                                                type: "success",
                                              });
                                              setConfirmModal(null);
                                            },
                                          });
                                        }}
                                        className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              {gradeLevels.length === 0 && (
                                <div className="col-span-full p-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 opacity-30">
                                  <Database
                                    size={64}
                                    className="mx-auto mb-4"
                                  />
                                  <p className="font-black uppercase tracking-widest text-xl">
                                    No hay grados registrados
                                  </p>
                                  <p className="text-sm font-bold mt-2">
                                    Crea un nuevo grado para empezar a organizar
                                    tus aulas
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activePanelSubTab === "profesores" && (
                      <div className="space-y-8">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">
                              Gestión de Profesores
                            </h3>
                            <p className="text-slate-500 font-medium text-sm">
                              Asigna cursos y grados a los docentes registrados.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          {/* Teachers List */}
                          <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 h-fit">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 ml-2">
                              Docentes Registrados
                            </h4>
                            <div className="space-y-3">
                              {students
                                .filter((s) => s.rol === "Docente")
                                .map((teacher) => (
                                  <button
                                    key={teacher.id}
                                    onClick={() =>
                                      setSelectedPersonalStudent(teacher)
                                    }
                                    className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedPersonalStudent?.id === teacher.id ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                                  >
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-black">
                                      {teacher.nombre[0]}
                                      {teacher.apellido[0]}
                                    </div>
                                    <div className="text-left">
                                      <p className="font-black text-sm uppercase tracking-tight leading-tight">
                                        {teacher.nombre} {teacher.apellido}
                                      </p>
                                      <p className="text-[10px] opacity-60 font-bold uppercase">
                                        {teacher.dni}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              {students.filter((s) => s.rol === "Docente")
                                .length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                  <GraduationCap
                                    size={40}
                                    className="mx-auto mb-2 opacity-20"
                                  />
                                  <p className="font-bold text-xs uppercase">
                                    No hay docentes registrados
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Teacher Assignment */}
                          <div className="lg:col-span-2 space-y-8">
                            {selectedPersonalStudent &&
                            selectedPersonalStudent.rol === "Docente" ? (
                              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-100 animate-fade-in">
                                <div className="flex items-center gap-6 mb-8">
                                  <div className="w-20 h-20 rounded-[2rem] bg-blue-50 flex items-center justify-center text-blue-600">
                                    <GraduationCap size={40} />
                                  </div>
                                  <div>
                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                      {selectedPersonalStudent.nombre}{" "}
                                      {selectedPersonalStudent.apellido}
                                    </h4>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                      Docente Activo
                                    </span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  {/* Course Assignment */}
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                      Cursos Asignados
                                    </h5>
                                    <div className="space-y-2">
                                      {courses
                                        .filter(
                                          (c) =>
                                            c.teacherId ===
                                            selectedPersonalStudent.id,
                                        )
                                        .map((course) => (
                                          <div
                                            key={course.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100"
                                          >
                                            <div className="flex items-center gap-3">
                                              <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                  backgroundColor: course.color,
                                                }}
                                              ></div>
                                              <span className="font-bold text-slate-700 text-xs uppercase">
                                                {course.name}
                                              </span>
                                            </div>
                                            <button
                                              onClick={() =>
                                                setCourses(
                                                  courses.map((c) =>
                                                    c.id === course.id
                                                      ? {
                                                          ...c,
                                                          teacherId: undefined,
                                                        }
                                                      : c,
                                                  ),
                                                )
                                              }
                                              className="p-1.5 text-red-400 hover:text-red-600 transition-all"
                                            >
                                              <X size={14} />
                                            </button>
                                          </div>
                                        ))}
                                      <div className="pt-2">
                                        <select
                                          onChange={(e) => {
                                            const cid = e.target.value;
                                            if (cid) {
                                              setCourses(
                                                courses.map((c) =>
                                                  c.id === cid
                                                    ? {
                                                        ...c,
                                                        teacherId:
                                                          selectedPersonalStudent.id,
                                                      }
                                                    : c,
                                                ),
                                              );
                                              e.target.value = "";
                                            }
                                          }}
                                          className="w-full p-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold text-xs uppercase outline-none focus:border-blue-500"
                                        >
                                          <option value="">
                                            + Asignar Curso
                                          </option>
                                          {courses
                                            .filter(
                                              (c) =>
                                                c.teacherId !==
                                                selectedPersonalStudent.id,
                                            )
                                            .map((c) => (
                                              <option key={c.id} value={c.id}>
                                                {c.name}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Grade Assignment */}
                                  <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                      Grados que Imparte
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                      {gradeLevels.map((gl) => {
                                        // This is a mock logic for assignment, in a real app we'd have a separate table
                                        const isAssigned = false;
                                        return (
                                          <button
                                            key={gl.id}
                                            className={`px-3 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${isAssigned ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                                          >
                                            {gl.nombre} "{gl.seccion}"
                                          </button>
                                        );
                                      })}
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase italic mt-2">
                                      * Haz clic para asignar/quitar grados.
                                    </p>
                                  </div>
                                </div>

                                {/* Teacher Schedule View */}
                                <div className="mt-10 pt-10 border-t border-slate-100 space-y-6">
                                  <div className="flex justify-between items-center">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                      Horario del Docente
                                    </h5>
                                    <button
                                      onClick={() => {
                                        // Simple PDF download simulation using print
                                        const printContent =
                                          document.getElementById(
                                            "teacher-schedule-print",
                                          );
                                        if (printContent) {
                                          const win = window.open(
                                            "",
                                            "",
                                            "height=700,width=900",
                                          );
                                          win?.document.write(
                                            "<html><head><title>Horario del Docente</title>",
                                          );
                                          win?.document.write(
                                            '<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">',
                                          );
                                          win?.document.write(
                                            '</head><body class="p-10">',
                                          );
                                          win?.document.write(
                                            printContent.innerHTML,
                                          );
                                          win?.document.write("</body></html>");
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

                                  <div
                                    id="teacher-schedule-print"
                                    className="bg-slate-50 p-6 rounded-3xl border border-slate-100 overflow-x-auto no-scrollbar"
                                  >
                                    <div className="min-w-[600px]">
                                      <div className="grid grid-cols-8 gap-1 mb-2">
                                        <div className="p-2"></div>
                                        {[
                                          "Lunes",
                                          "Martes",
                                          "Miércoles",
                                          "Jueves",
                                          "Viernes",
                                          "Sábado",
                                          "Domingo",
                                        ].map((dia) => (
                                          <div
                                            key={dia}
                                            className="text-center font-black text-[8px] uppercase tracking-widest text-slate-400"
                                          >
                                            {dia}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="space-y-1">
                                        {timeSlots.map((slot) => (
                                          <div
                                            key={slot.id}
                                            className="grid grid-cols-8 gap-1"
                                          >
                                            <div className="flex items-center justify-center bg-white rounded-lg p-1 border border-slate-100">
                                              <span className="font-black text-[8px] text-slate-400">
                                                {slot.start}
                                              </span>
                                            </div>
                                            {[
                                              "Lunes",
                                              "Martes",
                                              "Miércoles",
                                              "Jueves",
                                              "Viernes",
                                              "Sábado",
                                              "Domingo",
                                            ].map((dia) => {
                                              // Find courses assigned to this teacher that are scheduled at this time
                                              const teacherCourses =
                                                courses.filter(
                                                  (c) =>
                                                    c.teacherId ===
                                                    selectedPersonalStudent.id,
                                                );
                                              const sch = schedules.find(
                                                (s) =>
                                                  s.dia === dia &&
                                                  s.inicio === slot.start &&
                                                  teacherCourses.some(
                                                    (tc) =>
                                                      tc.name === s.materia,
                                                  ),
                                              );
                                              return (
                                                <div
                                                  key={dia}
                                                  className={`min-h-[40px] rounded-lg flex items-center justify-center p-1 text-center border ${sch ? "bg-white shadow-sm" : "bg-slate-100/50 border-transparent"}`}
                                                  style={
                                                    sch
                                                      ? {
                                                          borderColor:
                                                            courses.find(
                                                              (c) =>
                                                                c.name ===
                                                                sch.materia,
                                                            )?.color + "30",
                                                          color: courses.find(
                                                            (c) =>
                                                              c.name ===
                                                              sch.materia,
                                                          )?.color,
                                                        }
                                                      : {}
                                                  }
                                                >
                                                  {sch && (
                                                    <div className="flex flex-col">
                                                      <span className="font-black text-[7px] uppercase leading-tight">
                                                        {sch.materia}
                                                      </span>
                                                      <span className="text-[6px] opacity-60 font-bold">
                                                        {gradeLevels.find(
                                                          (gl) =>
                                                            gl.id ===
                                                            sch.targetId,
                                                        )?.nombre || "Gral"}
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
                              <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 h-full flex flex-col items-center justify-center p-10 text-center">
                                <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-300 mb-6">
                                  <GraduationCap size={40} />
                                </div>
                                <h4 className="text-xl font-black text-slate-400 uppercase tracking-widest">
                                  Selecciona un Docente
                                </h4>
                                <p className="text-slate-400 text-xs font-bold uppercase mt-2">
                                  Para gestionar sus cursos y grados asignados.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {activePanelSubTab === "alerta" && (
                      <div className="space-y-8 animate-fade-in">
                        {/* Tipos de Incidencia */}
                        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                Tipos de Incidencia
                              </h3>
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Configure las opciones disponibles en el módulo
                                de alertas
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setEditingIncidenceType({ id: "", name: "" })
                              }
                              className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-700 transition-all flex items-center gap-2"
                            >
                              <Plus size={16} /> Nuevo Tipo
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {incidenceTypes.map((type) => (
                              <div
                                key={type.id}
                                className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 flex justify-between items-center group hover:border-red-200 transition-all"
                              >
                                <span className="font-black text-slate-700 uppercase tracking-tight text-sm">
                                  {type.name}
                                </span>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      setEditingIncidenceType(type)
                                    }
                                    className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      confirmAction(
                                        "¿Eliminar este tipo de incidencia?",
                                        () =>
                                          setIncidencesTypes(
                                            incidenceTypes.filter(
                                              (t) => t.id !== type.id,
                                            ),
                                          ),
                                      )
                                    }
                                    className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Categorías de Méritos */}
                        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-2xl font-black text-emerald-800 uppercase tracking-tight">
                                Categorías de Méritos
                              </h3>
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Gestione los puntos positivos por buena conducta
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setEditingMeritCategory({
                                  id: "",
                                  name: "",
                                  points: 5,
                                })
                              }
                              className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2"
                            >
                              <Plus size={16} /> Nueva Categoría
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {meritCategories.map((cat) => (
                              <div
                                key={cat.id}
                                className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 flex justify-between items-center group hover:border-emerald-200 transition-all"
                              >
                                <div>
                                  <span className="font-black text-emerald-900 uppercase tracking-tight text-sm block">
                                    {cat.name}
                                  </span>
                                  <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                                    +{cat.points} Puntos
                                  </span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setEditingMeritCategory(cat)}
                                    className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      confirmAction(
                                        "¿Eliminar esta categoría de mérito?",
                                        () =>
                                          setMeritCategories(
                                            meritCategories.filter(
                                              (c) => c.id !== cat.id,
                                            ),
                                          ),
                                      )
                                    }
                                    className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Categorías de Deméritos */}
                        <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 space-y-8">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-2xl font-black text-rose-800 uppercase tracking-tight">
                                Categorías de Deméritos
                              </h3>
                              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Gestione los puntos negativos por mala conducta
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                setEditingDemeritCategory({
                                  id: "",
                                  name: "",
                                  points: 5,
                                })
                              }
                              className="bg-rose-600 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-rose-700 transition-all flex items-center gap-2"
                            >
                              <Plus size={16} /> Nueva Categoría
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {demeritCategories.map((cat) => (
                              <div
                                key={cat.id}
                                className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 flex justify-between items-center group hover:border-rose-200 transition-all"
                              >
                                <div>
                                  <span className="font-black text-rose-900 uppercase tracking-tight text-sm block">
                                    {cat.name}
                                  </span>
                                  <span className="text-rose-600 font-black text-[10px] uppercase tracking-widest">
                                    -{cat.points} Puntos
                                  </span>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() =>
                                      setEditingDemeritCategory(cat)
                                    }
                                    className="p-2 bg-white text-blue-600 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    onClick={() =>
                                      confirmAction(
                                        "¿Eliminar esta categoría de demérito?",
                                        () =>
                                          setDemeritCategories(
                                            demeritCategories.filter(
                                              (c) => c.id !== cat.id,
                                            ),
                                          ),
                                      )
                                    }
                                    className="p-2 bg-white text-red-600 rounded-lg shadow-sm hover:bg-red-600 hover:text-white transition-all"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Modals for Editing Categories */}
                        {editingIncidenceType && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-red-600 text-white">
                                <div>
                                  <h2 className="text-xl font-black uppercase tracking-widest">
                                    {editingIncidenceType.id
                                      ? "Editar Tipo"
                                      : "Nuevo Tipo"}
                                  </h2>
                                  <p className="text-red-100 text-[9px] font-bold uppercase mt-1">
                                    Defina el nombre de la incidencia
                                  </p>
                                </div>
                                <button
                                  onClick={() => setEditingIncidenceType(null)}
                                  className="hover:bg-white/20 p-2 rounded-full transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                              <form
                                onSubmit={(e: any) => {
                                  e.preventDefault();
                                  const name = new FormData(
                                    e.currentTarget,
                                  ).get("name") as string;
                                  if (editingIncidenceType.id) {
                                    setIncidencesTypes(
                                      incidenceTypes.map((t) =>
                                        t.id === editingIncidenceType.id
                                          ? { ...t, name }
                                          : t,
                                      ),
                                    );
                                  } else {
                                    setIncidencesTypes([
                                      ...incidenceTypes,
                                      { id: Date.now().toString(), name },
                                    ]);
                                  }
                                  setEditingIncidenceType(null);
                                  setToast({
                                    message: "Tipo de incidencia guardado.",
                                    type: "success",
                                  });
                                }}
                                className="p-8 space-y-6"
                              >
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Nombre del Tipo
                                  </label>
                                  <input
                                    name="name"
                                    defaultValue={editingIncidenceType.name}
                                    required
                                    autoFocus
                                    placeholder="Ej. Falta de uniforme"
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-700 transition-all"
                                >
                                  Guardar Tipo
                                </button>
                              </form>
                            </div>
                          </div>
                        )}

                        {editingMeritCategory && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
                                <div>
                                  <h2 className="text-xl font-black uppercase tracking-widest">
                                    {editingMeritCategory.id
                                      ? "Editar Mérito"
                                      : "Nuevo Mérito"}
                                  </h2>
                                  <p className="text-emerald-100 text-[9px] font-bold uppercase mt-1">
                                    Defina el nombre y puntaje
                                  </p>
                                </div>
                                <button
                                  onClick={() => setEditingMeritCategory(null)}
                                  className="hover:bg-white/20 p-2 rounded-full transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                              <form
                                onSubmit={(e: any) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget,
                                  );
                                  const name = formData.get("name") as string;
                                  const points = parseInt(
                                    formData.get("points") as string,
                                  );

                                  const newCategories = [
                                    ...meritCategories,
                                  ];
                                  if (editingMeritCategory.id) {
                                    const index = newCategories.findIndex(
                                      (c) => c.id === editingMeritCategory.id,
                                    );
                                    newCategories[index] = {
                                      ...editingMeritCategory,
                                      name,
                                      points,
                                    };
                                  } else {
                                    newCategories.push({
                                      id: Date.now().toString(),
                                      name,
                                      points,
                                    });
                                  }

                                  setMeritCategories(newCategories);
                                  setEditingMeritCategory(null);
                                  setToast({
                                    message: "Categoría de mérito guardada.",
                                    type: "success",
                                  });
                                }}
                                className="p-8 space-y-6"
                              >
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Nombre
                                  </label>
                                  <input
                                    name="name"
                                    defaultValue={editingMeritCategory.name}
                                    required
                                    autoFocus
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Puntos
                                  </label>
                                  <input
                                    name="points"
                                    type="number"
                                    defaultValue={editingMeritCategory.points}
                                    required
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-emerald-700 transition-all"
                                >
                                  Guardar
                                </button>
                              </form>
                            </div>
                          </div>
                        )}

                        {editingDemeritCategory && (
                          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
                            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-rose-600 text-white">
                                <div>
                                  <h2 className="text-xl font-black uppercase tracking-widest">
                                    {editingDemeritCategory.id
                                      ? "Editar Demérito"
                                      : "Nuevo Demérito"}
                                  </h2>
                                  <p className="text-rose-100 text-[9px] font-bold uppercase mt-1">
                                    Defina el nombre y puntaje
                                  </p>
                                </div>
                                <button
                                  onClick={() =>
                                    setEditingDemeritCategory(null)
                                  }
                                  className="hover:bg-white/20 p-2 rounded-full transition-all"
                                >
                                  <X size={20} />
                                </button>
                              </div>
                              <form
                                onSubmit={(e: any) => {
                                  e.preventDefault();
                                  const formData = new FormData(
                                    e.currentTarget,
                                  );
                                  const name = formData.get("name") as string;
                                  const points = parseInt(
                                    formData.get("points") as string,
                                  );

                                  const newCategories = [
                                    ...demeritCategories,
                                  ];
                                  if (editingDemeritCategory.id) {
                                    const index = newCategories.findIndex(
                                      (c) => c.id === editingDemeritCategory.id,
                                    );
                                    newCategories[index] = {
                                      ...editingDemeritCategory,
                                      name,
                                      points,
                                    };
                                  } else {
                                    newCategories.push({
                                      id: Date.now().toString(),
                                      name,
                                      points,
                                    });
                                  }

                                  setDemeritCategories(newCategories);
                                  setEditingDemeritCategory(null);
                                  setToast({
                                    message: "Categoría de demérito guardada.",
                                    type: "success",
                                  });
                                }}
                                className="p-8 space-y-6"
                              >
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Nombre
                                  </label>
                                  <input
                                    name="name"
                                    defaultValue={editingDemeritCategory.name}
                                    required
                                    autoFocus
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Puntos
                                  </label>
                                  <input
                                    name="points"
                                    type="number"
                                    defaultValue={editingDemeritCategory.points}
                                    required
                                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <button
                                  type="submit"
                                  className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-rose-700 transition-all"
                                >
                                  Guardar
                                </button>
                              </form>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {activePanelSubTab === "horarios" && (
                      <div className="space-y-8">
                        {currentUser?.permissions.includes("horarios") ||
                        currentUser?.permissions.includes(
                          "mi-panel:horarios",
                        ) ? (
                          <>
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter text-center md:text-left">
                                Gestión de Horarios
                              </h3>
                              <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full md:w-auto">
                                {(currentUser?.role === "admin" ||
                                  currentUser?.permissions.includes(
                                    "mi-panel:horarios:turnos",
                                  )) && (
                                  <button
                                    onClick={() =>
                                      setActiveHorariosSubTab("turnos")
                                    }
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === "turnos" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                  >
                                    Turnos
                                  </button>
                                )}
                                {(currentUser?.role === "admin" ||
                                  currentUser?.permissions.includes(
                                    "mi-panel:horarios:config",
                                  )) && (
                                  <button
                                    onClick={() =>
                                      setActiveHorariosSubTab("config")
                                    }
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === "config" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                  >
                                    Horas
                                  </button>
                                )}
                                {(currentUser?.role === "admin" ||
                                  currentUser?.permissions.includes(
                                    "mi-panel:horarios:materias",
                                  )) && (
                                  <button
                                    onClick={() =>
                                      setActiveHorariosSubTab("materias")
                                    }
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === "materias" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                  >
                                    Materias
                                  </button>
                                )}
                                {(currentUser?.role === "admin" ||
                                  currentUser?.permissions.includes(
                                    "mi-panel:horarios:creador",
                                  )) && (
                                  <button
                                    onClick={() =>
                                      setActiveHorariosSubTab("creador")
                                    }
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === "creador" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                  >
                                    Creador
                                  </button>
                                )}
                                {(currentUser?.role === "admin" ||
                                  currentUser?.permissions.includes(
                                    "mi-panel:horarios:ver",
                                  )) && (
                                  <button
                                    onClick={() =>
                                      setActiveHorariosSubTab("ver-horario")
                                    }
                                    className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeHorariosSubTab === "ver-horario" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                  >
                                    Ver Horario
                                  </button>
                                )}
                              </div>
                            </div>

                            {activeHorariosSubTab === "materias" && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-100">
                                  <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">
                                      Materias / Cursos
                                    </h3>
                                    <button
                                      onClick={() =>
                                        setEditingCourse({
                                          id: Date.now().toString(),
                                          name: "",
                                          color: "#3b82f6",
                                        })
                                      }
                                      className="p-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all"
                                    >
                                      <Plus size={20} />
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {courses.map((course) => (
                                      <div
                                        key={course.id}
                                        className="flex flex-col p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all"
                                      >
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-4">
                                            <div
                                              className="w-5 h-5 rounded-full shadow-sm"
                                              style={{
                                                backgroundColor: course.color,
                                              }}
                                            ></div>
                                            <span className="font-black text-slate-800 uppercase text-sm tracking-tight">
                                              {course.name}
                                            </span>
                                          </div>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() =>
                                                setEditingCourse(course)
                                              }
                                              className="p-2 text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm"
                                            >
                                              <Edit size={16} />
                                            </button>
                                            <button
                                              onClick={() =>
                                                confirmAction(
                                                  "¿Eliminar este curso?",
                                                  () =>
                                                    setCourses(
                                                      courses.filter(
                                                        (c) =>
                                                          c.id !== course.id,
                                                      ),
                                                    ),
                                                )
                                              }
                                              className="p-2 text-red-600 hover:bg-white rounded-xl transition-all shadow-sm"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100">
                                          <GraduationCap
                                            size={14}
                                            className="text-slate-400"
                                          />
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {students.find(
                                              (s) => s.id === course.teacherId,
                                            )?.nombre || "Sin Docente"}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    {courses.length === 0 && (
                                      <p className="text-center text-slate-400 font-bold py-10 uppercase text-[10px] tracking-widest italic">
                                        No hay materias registradas
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-100">
                                  <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">
                                      Tipos de Nota / Examen
                                    </h3>
                                    <button
                                      onClick={() =>
                                        setIsExamTypeModalOpen(true)
                                      }
                                      className="p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all"
                                    >
                                      <Settings size={20} />
                                    </button>
                                  </div>
                                  <div className="space-y-3">
                                    {examTypes.map((type) => (
                                      <div
                                        key={type.id}
                                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-black text-slate-700 uppercase text-xs tracking-widest">
                                            {type.name}
                                          </span>
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                            Divisor: {type.divisor} | Q:{" "}
                                            {type.numQuestions}
                                          </span>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              setIsExamTypeModalOpen(true)
                                            }
                                            className="p-2 text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm"
                                          >
                                            <Edit size={14} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              confirmAction(
                                                "¿Eliminar este tipo de examen?",
                                                () =>
                                                  setExamTypes(
                                                    examTypes.filter(
                                                      (t) => t.id !== type.id,
                                                    ),
                                                  ),
                                              )
                                            }
                                            className="p-2 text-red-600 hover:bg-white rounded-lg transition-all shadow-sm"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                    {examTypes.length === 0 && (
                                      <p className="text-center text-slate-400 font-bold py-10 uppercase text-[10px] tracking-widest italic">
                                        No hay tipos de nota registrados
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeHorariosSubTab === "config" && (
                              <div className="bg-white p-6 md:p-10 rounded-2xl shadow-2xl border border-slate-100 max-w-2xl">
                                <div className="flex justify-between items-center mb-8">
                                  <div>
                                    <h3 className="text-xl font-black uppercase tracking-widest text-slate-800">
                                      Horas de Clase
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">
                                      Define los bloques horarios para el
                                      cronograma
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setEditingTimeSlot({
                                        id: Date.now().toString(),
                                        start: "08:00",
                                        end: "09:00",
                                      })
                                    }
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all"
                                  >
                                    Agregar Hora
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {timeSlots.map((slot, idx) => (
                                    <div
                                      key={slot.id}
                                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 transition-all group"
                                    >
                                      <div className="flex items-center gap-6">
                                        <span className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-500 text-xs">
                                          {idx + 1}
                                        </span>
                                        <div className="flex items-center gap-3">
                                          <span className="font-black text-slate-700 text-lg">
                                            {slot.start}
                                          </span>
                                          <span className="text-slate-300">
                                            —
                                          </span>
                                          <span className="font-black text-slate-700 text-lg">
                                            {slot.end}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                        <button
                                          onClick={() =>
                                            setEditingTimeSlot(slot)
                                          }
                                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                        >
                                          <Edit size={16} />
                                        </button>
                                        <button
                                          onClick={() =>
                                            confirmAction(
                                              "¿Eliminar este horario?",
                                              () =>
                                                setTimeSlots(
                                                  timeSlots.filter(
                                                    (s) => s.id !== slot.id,
                                                  ),
                                                ),
                                            )
                                          }
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {activeHorariosSubTab === "creador" && (
                              <div className="space-y-8">
                                {/* Header: Controls & Filters */}
                                <div className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl border border-slate-100">
                                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                    {/* Materias */}
                                    <div className="lg:col-span-1">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">
                                        Materias Disponibles
                                      </h4>
                                      <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                                        {courses.map((course) => (
                                          <div
                                            key={course.id}
                                            draggable
                                            onDragStart={() =>
                                              setDraggedCourse(course)
                                            }
                                            className="p-2 px-3 rounded-xl border-2 border-slate-50 bg-slate-50 cursor-move hover:border-blue-200 transition-all flex items-center gap-2 group"
                                          >
                                            <div
                                              className="w-2 h-2 rounded-full shrink-0"
                                              style={{
                                                backgroundColor: course.color,
                                              }}
                                            ></div>
                                            <span className="font-black text-[9px] uppercase tracking-tight text-slate-600 group-hover:text-blue-600">
                                              {course.name}
                                            </span>
                                          </div>
                                        ))}
                                        {courses.length === 0 && (
                                          <p className="text-[9px] text-slate-400 font-bold uppercase text-center py-4 italic w-full">
                                            Crea materias primero
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Días de Clase */}
                                    <div className="lg:col-span-1">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">
                                        Días de Clase
                                      </h4>
                                      <div className="grid grid-cols-4 gap-2">
                                        {[
                                          "Lunes",
                                          "Martes",
                                          "Miércoles",
                                          "Jueves",
                                          "Viernes",
                                          "Sábado",
                                          "Domingo",
                                        ].map((dia) => (
                                          <button
                                            key={dia}
                                            onClick={() => {
                                              if (schoolDays.includes(dia)) {
                                                if (schoolDays.length > 1) {
                                                  setSchoolDays(
                                                    schoolDays.filter(
                                                      (d) => d !== dia,
                                                    ),
                                                  );
                                                } else {
                                                  setToast({
                                                    message:
                                                      "Debe haber al menos un día de clase",
                                                    type: "error",
                                                  });
                                                }
                                              } else {
                                                const allDays = [
                                                  "Lunes",
                                                  "Martes",
                                                  "Miércoles",
                                                  "Jueves",
                                                  "Viernes",
                                                  "Sábado",
                                                  "Domingo",
                                                ];
                                                const newDays = [
                                                  ...schoolDays,
                                                  dia,
                                                ].sort(
                                                  (a, b) =>
                                                    allDays.indexOf(a) -
                                                    allDays.indexOf(b),
                                                );
                                                setSchoolDays(newDays);
                                              }
                                            }}
                                            className={`px-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${schoolDays.includes(dia) ? "bg-blue-600 text-white shadow-lg" : "bg-slate-50 text-slate-400 border border-slate-100 hover:border-blue-200"}`}
                                            style={
                                              schoolDays.includes(dia)
                                                ? {
                                                    backgroundColor:
                                                      activeConfig.theme
                                                        .primaryColor,
                                                  }
                                                : {}
                                            }
                                          >
                                            {dia.substring(0, 3)}
                                            {schoolDays.includes(dia) ? (
                                              <X size={8} />
                                            ) : (
                                              <Plus size={8} />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Filtros */}
                                    <div className="lg:col-span-2">
                                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">
                                        Filtros de Horario
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                            Grado
                                          </label>
                                          <select
                                            className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase outline-none"
                                            value={selectedGradeName}
                                            onChange={(e) => {
                                              setSelectedGradeName(
                                                e.target.value,
                                              );
                                              setScheduleGradeFilter("");
                                            }}
                                          >
                                            <option value="">
                                              Seleccionar Grado
                                            </option>
                                            {Array.from(
                                              new Set(
                                                gradeLevels.map(
                                                  (gl) => gl.nombre,
                                                ),
                                              ),
                                            ).map((name) => (
                                              <option key={name} value={name}>
                                                {name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                            Sección
                                          </label>
                                          <select
                                            className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-xs uppercase outline-none"
                                            value={scheduleGradeFilter}
                                            onChange={(e) =>
                                              setScheduleGradeFilter(
                                                e.target.value,
                                              )
                                            }
                                            disabled={!selectedGradeName}
                                          >
                                            <option value="">
                                              Seleccionar Sección
                                            </option>
                                            {gradeLevels
                                              .filter(
                                                (gl) =>
                                                  gl.nombre ===
                                                  selectedGradeName,
                                              )
                                              .map((gl) => (
                                                <option
                                                  key={gl.id}
                                                  value={gl.id}
                                                >
                                                  {gl.seccion}
                                                </option>
                                              ))}
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Main: Schedule Grid */}
                                <div className="space-y-4">
                                  <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 gap-4">
                                    <div className="text-center sm:text-left">
                                      <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                                        Diseño de Horario
                                      </h4>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Arrastra materias al calendario para
                                        asignar
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                                      <button
                                        onClick={() =>
                                          setIsAdminScheduleFullScreen(
                                            !isAdminScheduleFullScreen,
                                          )
                                        }
                                        className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg min-w-[120px]"
                                      >
                                        <Calendar size={14} />{" "}
                                        {isAdminScheduleFullScreen
                                          ? "Salir"
                                          : "Pantalla Completa"}
                                      </button>
                                      <button
                                        onClick={handlePrintAdminSchedule}
                                        className="flex-1 sm:flex-none bg-slate-100 text-slate-600 px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm min-w-[100px]"
                                      >
                                        <Printer size={14} /> Imprimir
                                      </button>
                                      <button
                                        onClick={handleDownloadAdminSchedule}
                                        className="flex-1 sm:flex-none bg-slate-900 text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg min-w-[120px]"
                                      >
                                        <Download size={14} /> Descargar
                                      </button>
                                    </div>
                                  </div>

                                  <div
                                    className={`bg-white p-4 md:p-10 rounded-2xl shadow-2xl border border-slate-100 overflow-x-auto custom-scrollbar relative ${isAdminScheduleFullScreen ? "fixed inset-0 z-[200] rounded-none overflow-hidden flex flex-col" : ""}`}
                                  >
                                    {isAdminScheduleFullScreen && (
                                      <button
                                        onClick={() =>
                                          setIsAdminScheduleFullScreen(false)
                                        }
                                        className="absolute top-4 right-4 z-[210] bg-black/20 hover:bg-black/40 text-white p-3 rounded-full transition-all shadow-lg"
                                      >
                                        <X size={24} />
                                      </button>
                                    )}
                                    <div
                                      className={`absolute top-2 right-10 animate-pulse pointer-events-none md:hidden ${isAdminScheduleFullScreen ? "hidden" : ""}`}
                                    >
                                      <div className="flex items-center gap-2 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full border border-blue-500/20">
                                        <span className="text-[8px] font-black uppercase tracking-widest">
                                          Desliza para ver más →
                                        </span>
                                      </div>
                                    </div>

                                    <div
                                      className={`min-w-[1200px] ${isAdminScheduleFullScreen ? "min-w-full h-full overflow-y-auto p-10" : ""}`}
                                      ref={adminScheduleRef}
                                    >
                                      <div
                                        className={`grid gap-3 mb-4`}
                                        style={{
                                          gridTemplateColumns: `repeat(${schoolDays.length + 1}, 1fr)`,
                                        }}
                                      >
                                        <div className="p-2"></div>
                                        {schoolDays.map((dia) => (
                                          <div
                                            key={dia}
                                            className="text-center font-black text-[11px] uppercase tracking-widest text-slate-500 py-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm"
                                          >
                                            {dia}
                                          </div>
                                        ))}
                                      </div>
                                      <div className="space-y-3">
                                        {timeSlots.map((slot) => (
                                          <div
                                            key={slot.id}
                                            className={`grid gap-3`}
                                            style={{
                                              gridTemplateColumns: `repeat(${schoolDays.length + 1}, 1fr)`,
                                            }}
                                          >
                                            <div className="flex items-center justify-center bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800">
                                              <span className="font-black text-[11px] tracking-tighter whitespace-nowrap">
                                                {slot.start} - {slot.end}
                                              </span>
                                            </div>
                                            {schoolDays.map((dia) => {
                                              const targetId =
                                                scheduleGradeFilter;
                                              const teacherId =
                                                scheduleTeacherFilter;

                                              let sch = null;
                                              if (targetId) {
                                                sch = schedules.find(
                                                  (s) =>
                                                    (s.dia === dia ||
                                                      s.day === dia) &&
                                                    (s.inicio === slot.start ||
                                                      s.timeSlotId ===
                                                        slot.id) &&
                                                    s.targetId === targetId,
                                                );
                                              } else if (teacherId) {
                                                sch = schedules.find((s) => {
                                                  if (
                                                    (s.dia !== dia &&
                                                      s.day !== dia) ||
                                                    (s.inicio !== slot.start &&
                                                      s.timeSlotId !== slot.id)
                                                  )
                                                    return false;
                                                  const course = courses.find(
                                                    (c) => c.name === s.materia,
                                                  );
                                                  return (
                                                    course?.teacherId ===
                                                    teacherId
                                                  );
                                                });
                                              }

                                              return (
                                                <div
                                                  key={dia}
                                                  onDragOver={(e) =>
                                                    e.preventDefault()
                                                  }
                                                  onDrop={() => {
                                                    if (
                                                      (draggedCourse ||
                                                        draggedSchedule) &&
                                                      targetId
                                                    ) {
                                                      const courseToUse =
                                                        draggedCourse ||
                                                        courses.find(
                                                          (c) =>
                                                            c.name ===
                                                            draggedSchedule?.materia,
                                                        );
                                                      if (!courseToUse) return;

                                                      // Check for conflicts in the same grade
                                                      const conflict =
                                                        schedules.find(
                                                          (s) =>
                                                            (s.dia === dia ||
                                                              s.day === dia) &&
                                                            (s.inicio ===
                                                              slot.start ||
                                                              s.timeSlotId ===
                                                                slot.id) &&
                                                            s.targetId ===
                                                              targetId &&
                                                            s.id !==
                                                              draggedSchedule?.id,
                                                        );
                                                      if (conflict) {
                                                        setToast({
                                                          message:
                                                            "Ya existe una clase en este horario",
                                                          type: "error",
                                                        });
                                                        return;
                                                      }

                                                      // Check for teacher conflicts (same teacher at same time in ANY grade)
                                                      const tId =
                                                        courseToUse.teacherId;
                                                      if (tId) {
                                                        const teacherConflict =
                                                          schedules.find(
                                                            (s) => {
                                                              if (
                                                                (s.dia !==
                                                                  dia &&
                                                                  s.day !==
                                                                    dia) ||
                                                                (s.inicio !==
                                                                  slot.start &&
                                                                  s.timeSlotId !==
                                                                    slot.id) ||
                                                                s.id ===
                                                                  draggedSchedule?.id
                                                              )
                                                                return false;
                                                              const sCourse =
                                                                courses.find(
                                                                  (c) =>
                                                                    c.name ===
                                                                    s.materia,
                                                                );
                                                              return (
                                                                sCourse?.teacherId ===
                                                                tId
                                                              );
                                                            },
                                                          );
                                                        if (teacherConflict) {
                                                          const conflictGrade = gradeLevels.find(gl => gl.id === teacherConflict.targetId);
                                                          setToast({
                                                            message:
                                                              `El profesor ya tiene clase en este horario (${conflictGrade?.nombre || "otro grado"})`,
                                                            type: "error",
                                                          });
                                                          return;
                                                        }
                                                      }

                                                      let newSchedules = [
                                                        ...schedules,
                                                      ];
                                                      if (draggedSchedule) {
                                                        newSchedules =
                                                          newSchedules.filter(
                                                            (s) =>
                                                              s.id !==
                                                              draggedSchedule.id,
                                                          );
                                                      }

                                                      setSchedules([
                                                        ...newSchedules,
                                                        {
                                                          id: Date.now().toString(),
                                                          dia: dia as any,
                                                          inicio: slot.start,
                                                          fin: slot.end,
                                                          materia:
                                                            courseToUse.name,
                                                          type: "clase",
                                                          targetId,
                                                        },
                                                      ]);
                                                      setDraggedCourse(null);
                                                      setDraggedSchedule(null);
                                                      setToast({
                                                        message:
                                                          "Horario actualizado",
                                                        type: "success",
                                                      });
                                                    } else if (
                                                      !targetId &&
                                                      !teacherId
                                                    ) {
                                                      setToast({
                                                        message:
                                                          "Selecciona un grado primero",
                                                        type: "error",
                                                      });
                                                    } else if (teacherId) {
                                                      setToast({
                                                        message:
                                                          "Solo puedes asignar clases desde la vista de Grado",
                                                        type: "info",
                                                      });
                                                    }
                                                  }}
                                                  className={`min-h-[100px] rounded-[1.5rem] border-2 border-dashed transition-all flex items-center justify-center p-3 relative group ${sch ? "border-transparent shadow-md" : "border-slate-100 hover:border-blue-400 hover:bg-blue-50/50"}`}
                                                >
                                                  {sch ? (
                                                    <div
                                                      draggable={!!targetId}
                                                      onDragStart={() =>
                                                        targetId &&
                                                        setDraggedSchedule(sch)
                                                      }
                                                      className="w-full h-full rounded-2xl flex flex-col items-center justify-center text-center p-3 shadow-sm border-2 cursor-move relative transition-transform hover:scale-[1.02]"
                                                      style={{
                                                        backgroundColor:
                                                          (courses.find(
                                                            (c) =>
                                                              c.name ===
                                                              sch.materia,
                                                          )?.color ||
                                                            "#3b82f6") + "15",
                                                        borderColor:
                                                          (courses.find(
                                                            (c) =>
                                                              c.name ===
                                                              sch.materia,
                                                          )?.color ||
                                                            "#3b82f6") + "40",
                                                        color:
                                                          courses.find(
                                                            (c) =>
                                                              c.name ===
                                                              sch.materia,
                                                          )?.color || "#1e293b",
                                                      }}
                                                    >
                                                      <span className="font-black text-[10px] uppercase leading-tight mb-2">
                                                        {sch.materia}
                                                      </span>
                                                      <div className="flex items-center gap-1 opacity-60">
                                                        <GraduationCap
                                                          size={10}
                                                        />
                                                        <span className="text-[8px] font-bold uppercase">
                                                          {teacherId
                                                            ? gradeLevels.find(
                                                                (gl) =>
                                                                  gl.id ===
                                                                  sch.targetId,
                                                              )
                                                              ? `${gradeLevels.find((gl) => gl.id === sch.targetId)?.nombre} "${gradeLevels.find((gl) => gl.id === sch.targetId)?.seccion}"`
                                                              : "S.G."
                                                            : students.find(
                                                                (s) =>
                                                                  s.id ===
                                                                  courses.find(
                                                                    (c) =>
                                                                      c.name ===
                                                                      sch.materia,
                                                                  )?.teacherId,
                                                              )?.nombre ||
                                                              "S.D."}
                                                        </span>
                                                      </div>
                                                      {targetId && (
                                                        <button
                                                          onClick={() =>
                                                            confirmAction(
                                                              "¿Eliminar esta clase del horario?",
                                                              () =>
                                                                setSchedules(
                                                                  schedules.filter(
                                                                    (s) =>
                                                                      s.id !==
                                                                      sch.id,
                                                                  ),
                                                                ),
                                                            )
                                                          }
                                                          className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 p-2 bg-white rounded-full shadow-xl text-red-500 hover:scale-110 transition-all border border-slate-100 z-10"
                                                        >
                                                          <X size={14} />
                                                        </button>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                      <Plus
                                                        size={16}
                                                        className="text-blue-400"
                                                      />
                                                      <span className="text-[7px] font-black text-blue-400 uppercase">
                                                        Asignar
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
                            )}

                             {(currentUser?.role === "admin" ||
                               currentUser?.permissions.includes("mi-panel:horarios:ver")) && activeHorariosSubTab === "ver-horario" && (
                              <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                                  <div className="text-center md:text-left">
                                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Horarios Guardados</h4>
                                    <p className="text-slate-500 font-medium text-sm">Visualiza y gestiona los horarios asignados por grado y sección.</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100 px-6">
                                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                        Total Grados: {gradeLevels.length}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                  {gradeLevels.map((gl) => {
                                    const hasSchedule = schedules.some(s => s.targetId === gl.id);
                                    return (
                                      <div key={gl.id} className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col justify-between hover:border-indigo-200 transition-all group relative overflow-hidden">
                                        <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-50/50 rounded-full blur-2xl group-hover:bg-indigo-100 transition-all"></div>
                                        <div className="relative">
                                          <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                              <Calendar size={24} />
                                            </div>
                                            <div>
                                              <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{gl.nombre}</h4>
                                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Sección "{gl.seccion}"</p>
                                            </div>
                                          </div>

                                          <div className="space-y-4">
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-slate-50 pb-2">
                                              <span className="text-slate-400">Estado:</span>
                                              <span className={hasSchedule ? "text-emerald-500" : "text-slate-300"}>
                                                {hasSchedule ? "Configurado" : "Pendiente"}
                                              </span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-slate-50 pb-2">
                                              <span className="text-slate-400">Materias:</span>
                                              <span className="text-slate-800">
                                                {new Set(schedules.filter(s => s.targetId === gl.id).map(s => s.materia)).size} Asignadas
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="mt-10 flex flex-col gap-3">
                                          <button
                                            onClick={() => {
                                              setEditingScheduleGrade(gl);
                                              setTempSchedules(schedules.filter(s => s.targetId === gl.id));
                                              setIsScheduleEditsDirty(false);
                                            }}
                                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
                                          >
                                            <Eye size={16} /> Ver y Editar
                                          </button>
                                          
                                          {hasSchedule && (
                                            <button
                                              onClick={() => confirmAction(
                                                `¿Eliminar TODO el horario de ${gl.nombre} "${gl.seccion}"?`,
                                                () => {
                                                  setSchedules(prev => prev.filter(s => s.targetId !== gl.id));
                                                  setToast({ message: "Horario eliminado correctamente", type: "success" });
                                                }
                                              )}
                                              className="w-full py-3 bg-rose-50 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                            >
                                              <Trash2 size={14} /> Borrar Todo
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {activeHorariosSubTab === "turnos" && (
                              <div className="space-y-6">
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setPanelModalType("shift")}
                                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 hover:bg-indigo-700 transition-all shadow-xl uppercase text-xs tracking-widest"
                                  >
                                    <Plus size={20} /> NUEVO TURNO
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  {shifts.map((shift) => (
                                    <div
                                      key={shift.id}
                                      className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-3xl shadow-xl border border-slate-100 space-y-6 group hover:border-indigo-200 transition-all"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Clock size={20} />
                                          </div>
                                          <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                                            {shift.nombre}
                                          </h4>
                                        </div>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => {
                                              setEditingShift(shift);
                                              setPanelModalType("shift");
                                            }}
                                            className="p-2.5 text-blue-500 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50 shadow-sm"
                                          >
                                            <Edit size={16} />
                                          </button>
                                          <button
                                            onClick={() =>
                                              confirmAction(
                                                "¿Eliminar este turno?",
                                                () => {
                                                  setShifts(
                                                    shifts.filter(
                                                      (s) => s.id !== shift.id,
                                                    ),
                                                  );
                                                  setToast({
                                                    message: "Turno eliminado",
                                                    type: "success",
                                                  });
                                                },
                                              )
                                            }
                                            className="p-2.5 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl transition-all bg-rose-50 shadow-sm"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                          <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                                            Mañana
                                          </p>
                                          <p className="font-black text-slate-700 text-xs">
                                            {shift.entradaMañana} -{" "}
                                            {shift.salidaMañana}
                                          </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                                          <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1">
                                            Tarde
                                          </p>
                                          <p className="font-black text-slate-700 text-xs">
                                            {shift.entradaTarde} -{" "}
                                            {shift.salidaTarde}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-white p-16 rounded-3xl shadow-2xl border border-slate-100 text-center space-y-6 animate-fade-in">
                            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <Lock size={48} />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                                Acceso Restringido
                              </h3>
                              <p className="text-slate-500 font-medium max-w-md mx-auto">
                                No cuenta con los permisos necesarios para
                                gestionar los horarios institucionales. Por
                                favor, contacte con el administrador del
                                sistema.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "config" && currentUser?.role === "admin" && (
                  <div className="animate-slide-up space-y-8">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                          Configuración
                        </h1>
                        <p className="text-slate-500 text-lg">
                          Administración global del sistema{" "}
                          {activeConfig.siteName}.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row bg-white p-2 rounded-2xl shadow-xl border border-slate-100 w-full sm:w-auto">
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "config:usuarios",
                          )) && (
                          <button
                            onClick={() => setActiveConfigSubTab("usuarios")}
                            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === "usuarios" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Usuarios
                          </button>
                        )}
                        {(currentUser?.role === "admin" ||
                          currentUser?.permissions.includes(
                            "config:sistema",
                          )) && (
                          <button
                            onClick={() => setActiveConfigSubTab("sistema")}
                            className={`px-4 sm:px-8 py-3 sm:py-4 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${activeConfigSubTab === "sistema" ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"}`}
                          >
                            Sistema
                          </button>
                        )}
                      </div>
                    </header>

                    {activeConfigSubTab === "usuarios" && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
                            <Shield className="text-blue-600" /> Gestión de
                            Usuarios
                          </h3>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setIsUserModalOpen(true);
                            }}
                            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl uppercase tracking-widest text-xs w-full sm:w-auto"
                          >
                            <Plus size={20} /> NUEVO USUARIO
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {(users || []).map((user) => (
                            <div
                              key={user.id}
                              className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 hover:shadow-blue-100/50 transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    {user.username[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-800 uppercase text-lg leading-tight">
                                      {user.username}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                      {user.role}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingUser(user);
                                      setIsUserModalOpen(true);
                                    }}
                                    className="p-3 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all bg-blue-50"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  {user.role !== "admin" && (
                                    <button
                                      onClick={() =>
                                        confirmAction(
                                          `¿Eliminar al usuario ${user.username}?`,
                                          () => {
                                            setUsers(
                                              users.filter(
                                                (u) => u.id !== user.id,
                                              ),
                                            );
                                            setToast({
                                              message:
                                                "Usuario eliminado del sistema",
                                              type: "success",
                                            });
                                          },
                                        )
                                      }
                                      className="p-3 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all bg-rose-50"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-2">
                                  {user.fullName && (
                                    <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                      <Users
                                        size={14}
                                        className="text-slate-400"
                                      />{" "}
                                      {user.fullName}
                                    </div>
                                  )}
                                  {user.whatsapp && (
                                    <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                      <Phone
                                        size={14}
                                        className="text-emerald-500"
                                      />{" "}
                                      {user.whatsapp}
                                    </div>
                                  )}
                                  {user.email && (
                                    <div className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                                      <Mail
                                        size={14}
                                        className="text-blue-500"
                                      />{" "}
                                      {user.email}
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    Permisos de Acceso
                                  </p>
                                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 no-scrollbar">
                                    {[
                                      "dashboard",
                                      "estudiantes",
                                      "asistencia",
                                      "reportes",
                                      "alerta",
                                      "config",
                                      "calificaciones:lista",
                                      "calificaciones:registros",
                                      "calificaciones:boletas",
                                      "mi-panel:perfil",
                                      "mi-panel:grados",
                                      "mi-panel:horarios:turnos",
                                      "mi-panel:horarios:config",
                                      "mi-panel:horarios:creador",
                                      "mi-panel:horarios:materias",
                                      "mi-panel:profesores",
                                      "mi-panel:alerta",
                                    ].map((perm) => (
                                      <button
                                        key={perm}
                                        onClick={() => {
                                          const updatedUsers = users.map(
                                            (u) => {
                                              if (u.id === user.id) {
                                                const newPerms =
                                                  u.permissions.includes(perm)
                                                    ? u.permissions.filter(
                                                        (p) => p !== perm,
                                                      )
                                                    : [...u.permissions, perm];
                                                return {
                                                  ...u,
                                                  permissions: newPerms,
                                                };
                                              }
                                              return u;
                                            },
                                          );
                                          setUsers(updatedUsers);
                                        }}
                                        className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase transition-all border ${user.permissions.includes(perm) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-400 border-slate-200 hover:border-blue-200"}`}
                                      >
                                        {perm.replace(/:/g, " > ")}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div className="pt-4 border-t border-slate-50 flex flex-col gap-2">
                                  {currentUser?.role === "enrolador" && (
                                    <button
                                      onClick={() => {
                                        setOriginalUser(currentUser);
                                        setCurrentUser(user);
                                        setToast({
                                          message: `Ingresando como ${user.username}`,
                                          type: "success",
                                        });
                                      }}
                                      className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg"
                                    >
                                      <LogIn size={14} /> Ingresar como Usuario
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setConfigTargetUser(user);
                                      setPanelModalType("siteConfig");
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

                    {activeConfigSubTab === "sistema" && (
                      <div className="w-full">
                        <div className="bg-white rounded-3xl md:rounded-3xl p-6 md:p-10 shadow-2xl border border-slate-100 space-y-10">
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                              <Palette size={24} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase text-center sm:text-left flex items-center gap-3">
                              Personalización Global
                              {pendingConfig && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-600 text-[8px] rounded-full animate-pulse">
                                  Cambios Pendientes
                                </span>
                              )}
                            </h3>
                            <div className="sm:ml-auto flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={handlePublishConfig}
                                className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                              >
                                <Check size={14} /> Publicar Cambios
                              </button>
                            </div>
                          </div>

                          <div className="space-y-12">
                            {/* Site Information Section */}
                            <section className="space-y-6">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                  Información del Sitio
                                </h4>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    <Globe size={14} /> Nombre del Sitio Web
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      pendingConfig?.siteName ||
                                      globalConfig.siteName
                                    }
                                    onChange={(e) =>
                                      setPendingConfig((prev) => ({
                                        ...(prev || globalConfig),
                                        siteName: e.target.value,
                                      }))
                                    }
                                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-3">
                                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    <Type size={14} /> Slogan Institucional
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      pendingConfig?.slogan ||
                                      globalConfig.slogan
                                    }
                                    onChange={(e) =>
                                      setPendingConfig((prev) => ({
                                        ...(prev || globalConfig),
                                        slogan: e.target.value,
                                      }))
                                    }
                                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                                  />
                                </div>
                                <div className="space-y-3 md:col-span-2">
                                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    <FileText size={14} /> Texto de Pie de
                                    Página
                                  </label>
                                  <input
                                    type="text"
                                    value={
                                      pendingConfig?.footerText ||
                                      globalConfig.footerText
                                    }
                                    onChange={(e) =>
                                      setPendingConfig((prev) => ({
                                        ...(prev || globalConfig),
                                        footerText: e.target.value,
                                      }))
                                    }
                                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                                    placeholder="Control y Gestión 2026 © 2024"
                                  />
                                </div>
                              </div>
                            </section>

                            {/* Visual Identity Section */}
                            <section className="space-y-6">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                  Identidad Visual
                                </h4>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Logo Upload */}
                                <div className="space-y-3">
                                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                    <ImageIcon size={14} /> Logo Institucional
                                  </label>
                                  <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
                                    <div className="w-24 h-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                                      {pendingConfig?.logo ||
                                      globalConfig.logo ? (
                                        <img
                                          src={
                                            pendingConfig?.logo ||
                                            globalConfig.logo
                                          }
                                          className="w-full h-full object-contain p-2"
                                        />
                                      ) : (
                                        <GraduationCap
                                          className="text-slate-300"
                                          size={40}
                                        />
                                      )}
                                    </div>
                                    <button
                                      onClick={() => {
                                        const input =
                                          document.createElement("input");
                                        input.type = "file";
                                        input.accept = "image/*";
                                        input.onchange = (e: any) => {
                                          const file = e.target.files[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                              const img = new Image();
                                              img.onload = () => {
                                                const canvas =
                                                  document.createElement(
                                                    "canvas",
                                                  );
                                                const MAX_WIDTH = 300;
                                                const MAX_HEIGHT = 300;
                                                let width = img.width;
                                                let height = img.height;

                                                if (width > height) {
                                                  if (width > MAX_WIDTH) {
                                                    height *= MAX_WIDTH / width;
                                                    width = MAX_WIDTH;
                                                  }
                                                } else {
                                                  if (height > MAX_HEIGHT) {
                                                    width *=
                                                      MAX_HEIGHT / height;
                                                    height = MAX_HEIGHT;
                                                  }
                                                }
                                                canvas.width = width;
                                                canvas.height = height;
                                                const ctx =
                                                  canvas.getContext("2d");
                                                ctx?.drawImage(
                                                  img,
                                                  0,
                                                  0,
                                                  width,
                                                  height,
                                                );
                                                const dataUrl =
                                                  canvas.toDataURL(
                                                    "image/png",
                                                    0.8,
                                                  );
                                                setPendingConfig((prev) => ({
                                                  ...(prev || globalConfig),
                                                  logo: dataUrl,
                                                }));
                                              };
                                              img.src = ev.target
                                                ?.result as string;
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        };
                                        input.click();
                                      }}
                                      className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                    >
                                      Cambiar Logo
                                    </button>
                                    {(pendingConfig?.logo ||
                                      globalConfig.logo) && (
                                      <button
                                        onClick={() =>
                                          setPendingConfig((prev) => ({
                                            ...(prev || globalConfig),
                                            logo: undefined,
                                          }))
                                        }
                                        className="w-full py-2 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all"
                                      >
                                        Quitar Logo
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Custom Colors */}
                                <div className="md:col-span-2 space-y-6">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                        Color Primario
                                      </label>
                                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                        <input
                                          type="color"
                                          value={
                                            pendingConfig?.theme
                                              ?.primaryColor ||
                                            globalConfig.theme?.primaryColor ||
                                            "#1e3a8a"
                                          }
                                          onChange={(e) =>
                                            setPendingConfig((prev) => ({
                                              ...(prev || globalConfig),
                                              theme: {
                                                ...((prev || globalConfig)
                                                  .theme || {}),
                                                primaryColor: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="font-mono font-bold text-sm text-slate-500 uppercase">
                                          {pendingConfig?.theme?.primaryColor ||
                                            globalConfig.theme?.primaryColor ||
                                            "#1e3a8a"}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                        Color Secundario
                                      </label>
                                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border-2 border-slate-100">
                                        <input
                                          type="color"
                                          value={
                                            pendingConfig?.theme
                                              ?.secondaryColor ||
                                            globalConfig.theme
                                              ?.secondaryColor ||
                                            "#3b82f6"
                                          }
                                          onChange={(e) =>
                                            setPendingConfig((prev) => ({
                                              ...(prev || globalConfig),
                                              theme: {
                                                ...((prev || globalConfig)
                                                  .theme || {}),
                                                secondaryColor: e.target.value,
                                              },
                                            }))
                                          }
                                          className="w-12 h-12 rounded-xl cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="font-mono font-bold text-sm text-slate-500 uppercase">
                                          {pendingConfig?.theme
                                            ?.secondaryColor ||
                                            globalConfig.theme
                                              ?.secondaryColor ||
                                            "#3b82f6"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                                      <Type size={14} /> Fuente del Sistema
                                    </label>
                                    <select
                                      value={
                                        pendingConfig?.theme?.fontFamily ||
                                        globalConfig.theme?.fontFamily ||
                                        "Poppins"
                                      }
                                      onChange={(e) =>
                                        setPendingConfig((prev) => ({
                                          ...(prev || globalConfig),
                                          theme: {
                                            ...((prev || globalConfig).theme ||
                                              {}),
                                            fontFamily: e.target.value,
                                          },
                                        }))
                                      }
                                      className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all appearance-none"
                                    >
                                      <option value="Poppins">
                                        Poppins (Moderno)
                                      </option>
                                      <option value="Inter">
                                        Inter (Limpio)
                                      </option>
                                      <option value="Montserrat">
                                        Montserrat (Elegante)
                                      </option>
                                      <option value="Roboto">
                                        Roboto (Clásico)
                                      </option>
                                      <option value="system-ui">
                                        System Default
                                      </option>
                                    </select>
                                  </div>
                                </div>
                              </div>
                            </section>

                            {/* Predefined Themes Section */}
                            <section className="space-y-6">
                              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                                  Temas Predeterminados
                                </h4>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
                                {PREDEFINED_THEMES.map((theme) => (
                                  <button
                                    key={theme.name}
                                    onClick={() =>
                                      setPendingConfig((prev) => ({
                                        ...(prev || globalConfig),
                                        theme: {
                                          ...(prev || globalConfig).theme,
                                          primaryColor: theme.primary,
                                          secondaryColor: theme.secondary,
                                        },
                                      }))
                                    }
                                    className={`group p-3 rounded-2xl border-2 transition-all text-center ${
                                      (pendingConfig?.theme.primaryColor ||
                                        globalConfig.theme.primaryColor) ===
                                      theme.primary
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-slate-50 hover:border-slate-200 bg-white"
                                    }`}
                                  >
                                    <div className="flex flex-col gap-1 mb-3">
                                      <div
                                        className="w-full h-4 rounded-full shadow-sm"
                                        style={{
                                          backgroundColor: theme.primary,
                                        }}
                                      ></div>
                                      <div
                                        className="w-full h-2 rounded-full opacity-50"
                                        style={{
                                          backgroundColor: theme.secondary,
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 block truncate">
                                      {theme.name}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </section>

                            <div className="pt-10 border-t border-slate-100">
                              <button
                                onClick={() =>
                                  confirmAction(
                                    "¿Restablecer toda la configuración a los valores predeterminados?",
                                    () => {
                                      setPendingConfig({
                                        ...globalConfig,
                                        siteName:
                                          "Sistema de Control y Gestión",
                                        slogan:
                                          "Educación con Valores y Tecnología",
                                        theme: {
                                          primaryColor: "#1e3a8a",
                                          secondaryColor: "#3b82f6",
                                          fontFamily: "Poppins",
                                        },
                                      });
                                    },
                                  )
                                }
                                className="w-full py-5 border-2 border-rose-100 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-3"
                              >
                                <RefreshCw size={14} /> Restablecer
                                Configuración de Fábrica
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
          </div>
        </div>
      )}

      {/* --- FLOATING DNI MODAL --- */}
      {isDniModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-sm md:max-w-lg overflow-hidden animate-slide-up border-4 md:border-8 border-white">
            <div
              className="p-4 md:p-12 text-white text-center relative"
              style={{ backgroundColor: activeConfig.theme.primaryColor }}
            >
              <button
                onClick={() => setIsDniModalOpen(false)}
                className="absolute top-4 md:top-8 right-4 md:right-8 p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>
              <div className="inline-flex p-2 md:p-6 bg-white/10 rounded-[1rem] md:rounded-[2rem] mb-2 md:mb-6 shadow-xl border border-white/10">
                <Keyboard size={24} className="md:w-10 md:h-10" />
              </div>
              <h2 className="text-base md:text-3xl font-black uppercase tracking-tighter">
                Marcado Manual
              </h2>
              <div className="mt-1 md:mt-4">
                <StatusBadge status={selectedQuickStatus} />
              </div>
            </div>
            <div className="p-4 md:p-12 space-y-3 md:space-y-8">
              <div className="space-y-1 md:space-y-4">
                <label className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2 block">
                  Ingrese Número de DNI
                </label>
                <input
                  type="number"
                  ref={markingInputRef}
                  placeholder="00000000"
                  className="w-full p-3 md:p-8 rounded-[1rem] md:rounded-[2rem] bg-slate-50 border-2 md:border-4 border-slate-100 focus:border-blue-500 outline-none text-xl md:text-5xl tracking-[0.1em] md:tracking-[0.3em] text-center font-black text-slate-900 shadow-inner"
                  autoFocus
                  onChange={(e) => {
                    if (e.target.value.length === 8) {
                      markAttendance(e.target.value, selectedQuickStatus);
                      e.target.value = "";
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      markAttendance(
                        (e.target as HTMLInputElement).value,
                        selectedQuickStatus,
                      );
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
              <button
                onClick={() =>
                  markAttendance(
                    markingInputRef.current?.value || "",
                    selectedQuickStatus,
                  )
                }
                className="w-full text-white py-3 md:py-8 rounded-[1rem] md:rounded-[2rem] transition-all shadow-2xl font-black uppercase tracking-widest text-[10px] md:text-xs"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                Registrar Asistencia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FLOATING QR SCANNER MODAL --- */}
      {isScannerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-fade-in p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border-4 border-blue-600 relative">
            <div className="p-8 bg-blue-600 text-white text-center relative">
              <button
                onClick={stopScanner}
                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-black uppercase tracking-widest">
                Escáner de Asistencia
              </h2>
              <div className="mt-2">
                <span className="px-4 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase border border-white/10 tracking-widest">
                  Modo: {selectedQuickStatus}
                </span>
              </div>
            </div>
            <div className="p-8">
              <div className="relative w-full aspect-square bg-black rounded-3xl overflow-hidden border-4 border-slate-100 shadow-2xl">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-white/40 rounded-3xl border-dashed animate-pulse flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white/20 rounded-3xl"></div>
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
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
                        Registro Exitoso
                      </p>
                      <p className="text-xl font-black text-slate-800 truncate uppercase tracking-tight">
                        {lastDetectedPerson.nombre}{" "}
                        {lastDetectedPerson.apellido}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] animate-pulse">
                    Enfoque el código QR dentro del recuadro
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- STUDENT MODAL - RESTRUCTURED PROFESSIONAL DESIGN --- */}
      {isStudentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl md:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto animate-slide-up border border-white/20">
            <div className="p-5 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white sticky top-0 z-10">
              <div>
                <h2 className="text-lg md:text-3xl font-black uppercase tracking-widest">
                  {editingStudent ? "Actualizar Registro" : "Nuevo Registro"}
                </h2>
                <p className="text-blue-100 text-[8px] md:text-[10px] font-bold uppercase mt-1">
                  Diligencie los campos para {activeConfig.siteName}
                </p>
              </div>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
              >
                <X size={20} md:size={24} />
              </button>
            </div>
            <form
              onSubmit={handleSaveStudent}
              className="p-5 md:p-10 space-y-8 bg-white"
            >
              <div className="space-y-8">
                {/* Section: Identity & Role */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <User size={16} />
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Información de Identidad
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Cargo (Rol)
                      </label>
                      <select
                        name="rol"
                        defaultValue={editingStudent?.rol || "Estudiante"}
                        onChange={(e) => {
                          setStudentModalNivel(e.target.value);
                        }}
                        className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-blue-800 text-sm appearance-none shadow-sm transition-all outline-none"
                      >
                        <option value="Estudiante">Estudiante</option>
                        <option value="Docente">Docente</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        DNI / Identificación
                      </label>
                      <input
                        name="dni"
                        defaultValue={editingStudent?.dni}
                        required
                        placeholder="Número de DNI"
                        className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black font-mono text-base shadow-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        name="fechaNacimiento"
                        defaultValue={editingStudent?.fechaNacimiento}
                        required
                        className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Nombres
                      </label>
                      <input
                        name="nombre"
                        defaultValue={editingStudent?.nombre}
                        required
                        placeholder="Nombres completos"
                        className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-base shadow-sm transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Apellidos
                      </label>
                      <input
                        name="apellido"
                        defaultValue={editingStudent?.apellido}
                        required
                        placeholder="Apellidos completos"
                        className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-base shadow-sm transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section: Academic Info */}
                {studentModalNivel !== "Docente" && (
                  <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <GraduationCap size={16} />
                      </div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                        Detalles Académicos
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          Nivel
                        </label>
                        <select
                          name="nivel"
                          defaultValue={editingStudent?.nivel || "Primaria"}
                          onChange={(e) => setStudentModalNivel(e.target.value)}
                          className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm appearance-none outline-none"
                        >
                          {levels.map((lvl) => (
                            <option key={lvl.id} value={lvl.nombre}>
                              {lvl.nombre}
                            </option>
                          ))}
                          <option value="Docente">Docente</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          Grado / Aula
                        </label>
                        <select
                          name="grado"
                          defaultValue={editingStudent?.grado}
                          className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm appearance-none outline-none"
                        >
                          {gradeLevels.map((gl) => (
                            <option key={gl.id} value={gl.nombre}>
                              {gl.nombre}
                            </option>
                          ))}
                          {!gradeLevels.length && (
                            <option value="">No hay grados</option>
                          )}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          Sección
                        </label>
                        <select
                          name="seccion"
                          defaultValue={
                            editingStudent?.seccion || sections[0] || "A"
                          }
                          className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm appearance-none outline-none"
                        >
                          {sections.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section: Contact & School */}
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Phone size={16} />
                    </div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                      Contacto y Procedencia
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {studentModalNivel === "Docente" ? (
                      <div className="space-y-2 md:col-span-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                          Celular del Docente
                        </label>
                        <div className="relative">
                          <Phone
                            size={14}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                          <input
                            name="studentPhone"
                            defaultValue={editingStudent?.studentPhone}
                            placeholder="Número de celular"
                            className="w-full pl-11 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm outline-none"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Celular Apoderado
                          </label>
                          <div className="relative">
                            <Phone
                              size={14}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              name="celularApoderado"
                              defaultValue={editingStudent?.celularApoderado}
                              placeholder="999 999 999"
                              className="w-full pl-11 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm outline-none"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Celular del Estudiante
                          </label>
                          <div className="relative">
                            <Phone
                              size={14}
                              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                              name="studentPhone"
                              defaultValue={editingStudent?.studentPhone}
                              placeholder="999 999 999"
                              className="w-full pl-11 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <Mail
                          size={14}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          name="email"
                          type="email"
                          defaultValue={editingStudent?.email}
                          placeholder="ejemplo@correo.com"
                          className="w-full pl-11 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Nombre del Colegio
                      </label>
                      <div className="relative">
                        <School
                          size={14}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          name="schoolName"
                          defaultValue={editingStudent?.schoolName}
                          placeholder="Nombre del colegio"
                          className="w-full pl-11 p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-black text-sm shadow-sm outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personalization Section */}
                <div className="bg-slate-900 p-6 rounded-2xl space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Sparkles size={16} />
                    </div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      Personalización de Fotocheck
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Nombre del Sitio
                      </label>
                      <input
                        name="siteName"
                        defaultValue={editingStudent?.siteName}
                        placeholder="Ej. I.E. San Juan Bautista"
                        className="w-full p-4 rounded-2xl bg-slate-800 border-2 border-slate-700 focus:border-blue-500 font-black text-white text-sm shadow-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Slogan
                      </label>
                      <input
                        name="slogan"
                        defaultValue={editingStudent?.slogan}
                        placeholder="Ej. Educación de Calidad"
                        className="w-full p-4 rounded-2xl bg-slate-800 border-2 border-slate-700 focus:border-blue-500 font-black text-white text-sm shadow-sm outline-none"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Logo Institucional
                      </label>
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-800 rounded-2xl border border-slate-700">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0">
                          {editingStudent?.logo ? (
                            <img
                              src={editingStudent.logo}
                              className="w-full h-full object-contain p-2"
                            />
                          ) : (
                            <Upload className="text-slate-600" />
                          )}
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e: any) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  const img = new Image();
                                  img.onload = () => {
                                    const canvas =
                                      document.createElement("canvas");
                                    const MAX_WIDTH = 300;
                                    const MAX_HEIGHT = 300;
                                    let width = img.width;
                                    let height = img.height;

                                    if (width > height) {
                                      if (width > MAX_WIDTH) {
                                        height *= MAX_WIDTH / width;
                                        width = MAX_WIDTH;
                                      }
                                    } else {
                                      if (height > MAX_HEIGHT) {
                                        width *= MAX_HEIGHT / height;
                                        height = MAX_HEIGHT;
                                      }
                                    }
                                    canvas.width = width;
                                    canvas.height = height;
                                    const ctx = canvas.getContext("2d");
                                    ctx?.drawImage(img, 0, 0, width, height);
                                    const resizedBase64 = canvas.toDataURL(
                                      file.type || "image/jpeg",
                                      0.8,
                                    );

                                    if (editingStudent) {
                                      setEditingStudent({
                                        ...editingStudent,
                                        logo: resizedBase64,
                                      });
                                    }
                                  };
                                  img.src = ev.target?.result as string;
                                };
                                reader.readAsDataURL(file);
                              };
                              input.click();
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20"
                          >
                            Subir Logo Personalizado
                          </button>
                          {editingStudent?.logo && (
                            <button
                              type="button"
                              onClick={() =>
                                confirmAction("¿Eliminar este logo?", () =>
                                  setEditingStudent({
                                    ...editingStudent,
                                    logo: undefined,
                                  }),
                                )
                              }
                              className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-300 transition-all text-left ml-2"
                            >
                              Eliminar Logo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 pt-6 md:pt-10 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="flex-1 py-4 md:py-6 rounded-2xl md:rounded-[2rem] border-2 md:border-4 border-slate-50 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs md:text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 md:py-6 rounded-2xl md:rounded-[2rem] bg-blue-600 text-white font-black shadow-2xl hover:bg-blue-700 uppercase tracking-widest text-xs md:text-sm transition-all flex items-center justify-center gap-3"
                >
                  <Save size={18} md:size={20} />{" "}
                  {editingStudent
                    ? "Actualizar Registro"
                    : "Completar Registro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM MODAL --- */}
      {confirmModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-slate-100">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle size={40} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- USER MODAL --- */}
      {/* --- PANEL MODALS --- */}
      {panelModalType === "section" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div
              className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white"
              style={{ backgroundColor: activeConfig.theme.primaryColor }}
            >
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                {editingSection ? "Editar Sección" : "Nueva Sección"}
              </h2>
              <button
                onClick={() => {
                  setPanelModalType(null);
                  setEditingSection(null);
                }}
                className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
              >
                <X size={20} md:size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const nombre = e.target.nombre.value.toUpperCase();
                if (nombre) {
                  if (editingSection) {
                    setSections(
                      sections.map((s) => (s === editingSection ? nombre : s)),
                    );
                    setGradeLevels(
                      gradeLevels.map((gl) =>
                        gl.seccion === editingSection
                          ? { ...gl, seccion: nombre }
                          : gl,
                      ),
                    );
                    setToast({
                      message: "Sección actualizada",
                      type: "success",
                    });
                  } else {
                    if (sections.includes(nombre)) {
                      setToast({
                        message: "La sección ya existe",
                        type: "error",
                      });
                      return;
                    }
                    setSections([...sections, nombre]);
                    setToast({ message: "Sección creada", type: "success" });
                  }
                  setPanelModalType(null);
                  setEditingSection(null);
                }
              }}
              className="p-6 md:p-10 space-y-4 md:space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre de la Sección
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editingSection || ""}
                  placeholder="Ej. A"
                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-blue-700 transition-all"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                {editingSection ? "Actualizar Sección" : "Guardar Sección"}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "period" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div
              className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white"
              style={{ backgroundColor: activeConfig.theme.primaryColor }}
            >
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                {editingPeriod ? "Editar Periodo" : "Nuevo Periodo"}
              </h2>
              <button
                onClick={() => {
                  setPanelModalType(null);
                  setEditingPeriod(null);
                }}
                className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
              >
                <X size={20} md:size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const nombre = e.target.nombre.value.toUpperCase();
                if (nombre) {
                  const newPeriods = [...periods];
                  if (editingPeriod) {
                    const idx = newPeriods.findIndex(
                      (p) => p.id === editingPeriod.id,
                    );
                    newPeriods[idx] = { ...editingPeriod, name: nombre };
                    setToast({
                      message: "Periodo actualizado",
                      type: "success",
                    });
                  } else {
                    newPeriods.push({
                      id: Date.now().toString(),
                      name: nombre,
                    });
                    setToast({ message: "Periodo creado", type: "success" });
                  }
                  setPeriods(newPeriods);
                  setPanelModalType(null);
                  setEditingPeriod(null);
                }
              }}
              className="p-6 md:p-10 space-y-4 md:space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre del Periodo
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editingPeriod?.name || ""}
                  placeholder="Ej. 1ER BIMESTRE"
                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-blue-700 transition-all"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                {editingPeriod ? "Actualizar Periodo" : "Guardar Periodo"}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "level" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div
              className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white"
              style={{ backgroundColor: activeConfig.theme.primaryColor }}
            >
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                {editingLevel ? "Editar Nivel" : "Nuevo Nivel"}
              </h2>
              <button
                onClick={() => {
                  setPanelModalType(null);
                  setEditingLevel(null);
                }}
                className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
              >
                <X size={20} md:size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const nombre = e.target.nombre.value;
                if (nombre) {
                  if (editingLevel) {
                    setLevels(
                      levels.map((l) =>
                        l.id === editingLevel.id ? { ...l, nombre } : l,
                      ),
                    );
                    setToast({ message: "Nivel actualizado", type: "success" });
                  } else {
                    setLevels([
                      ...levels,
                      {
                        id: Date.now().toString(),
                        ownerId:
                          currentUser?.parentId || currentUser?.id || "admin-1",
                        nombre,
                      },
                    ]);
                    setToast({ message: "Nivel creado", type: "success" });
                  }
                  setPanelModalType(null);
                  setEditingLevel(null);
                }
              }}
              className="p-6 md:p-10 space-y-4 md:space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre del Nivel
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editingLevel?.nombre || ""}
                  placeholder="Ej. Primaria"
                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-blue-700 transition-all"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                {editingLevel ? "Actualizar Nivel" : "Guardar Nivel"}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "grade" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div
              className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white"
              style={{ backgroundColor: activeConfig.theme.primaryColor }}
            >
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                {editingGradeLevel ? "Editar Grado" : "Nuevo Grado"}
              </h2>
              <button
                onClick={() => {
                  setPanelModalType(null);
                  setEditingGradeLevel(null);
                }}
                className="hover:bg-white/20 p-2 md:p-3 rounded-full transition-all"
              >
                <X size={20} md:size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const nombre = e.target.nombre.value;
                const seccion = e.target.seccion.value;
                const nivelId = e.target.nivelId.value;
                if (nombre && seccion && nivelId) {
                  if (editingGradeLevel) {
                    setGradeLevels(
                      gradeLevels.map((gl) =>
                        gl.id === editingGradeLevel.id
                          ? { ...gl, nombre, seccion, nivelId }
                          : gl,
                      ),
                    );
                    setToast({ message: "Grado actualizado", type: "success" });
                  } else {
                    setGradeLevels([
                      ...gradeLevels,
                      {
                        id: Date.now().toString(),
                        ownerId:
                          currentUser?.parentId || currentUser?.id || "admin-1",
                        nombre,
                        seccion,
                        nivelId,
                      },
                    ]);
                    setToast({ message: "Grado creado", type: "success" });
                  }
                  setPanelModalType(null);
                  setEditingGradeLevel(null);
                }
              }}
              className="p-6 md:p-10 space-y-4 md:space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre del Grado
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editingGradeLevel?.nombre || ""}
                  placeholder="Ej. 1er Grado"
                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Sección
                  </label>
                  <select
                    name="seccion"
                    defaultValue={editingGradeLevel?.seccion || "A"}
                    className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none appearance-none"
                  >
                    {sections.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Nivel Académico
                  </label>
                  <select
                    name="nivelId"
                    defaultValue={editingGradeLevel?.nivelId || levels[0]?.id}
                    className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-base md:text-lg outline-none appearance-none"
                  >
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 md:py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-blue-700 transition-all"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                {editingGradeLevel ? "Actualizar Grado" : "Guardar Grado"}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "shift" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest">
                {editingShift ? "Editar Turno" : "Configurar Turno"}
              </h2>
              <button
                onClick={() => {
                  setPanelModalType(null);
                  setEditingShift(null);
                }}
                className="hover:bg-white/20 p-3 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const nombre = e.target.nombre.value;
                const em = e.target.em.value;
                const sm = e.target.sm.value;
                const et = e.target.et.value;
                const st = e.target.st.value;
                if (nombre && em && sm) {
                  if (editingShift) {
                    setShifts(
                      shifts.map((s) =>
                        s.id === editingShift.id
                          ? {
                              ...s,
                              nombre,
                              entradaMañana: em,
                              salidaMañana: sm,
                              entradaTarde: et || "-",
                              salidaTarde: st || "-",
                            }
                          : s,
                      ),
                    );
                    setToast({ message: "Turno actualizado", type: "success" });
                  } else {
                    setShifts([
                      ...shifts,
                      {
                        id: Date.now().toString(),
                        ownerId:
                          currentUser?.parentId || currentUser?.id || "admin-1",
                        nombre,
                        entradaMañana: em,
                        salidaMañana: sm,
                        entradaTarde: et || "-",
                        salidaTarde: st || "-",
                      },
                    ]);
                    setToast({ message: "Turno creado", type: "success" });
                  }
                  setPanelModalType(null);
                  setEditingShift(null);
                }
              }}
              className="p-6 md:p-10 space-y-6 md:space-y-8"
            >
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre del Turno
                </label>
                <input
                  name="nombre"
                  required
                  defaultValue={editingShift?.nombre || ""}
                  placeholder="Ej. Mañana / Tarde / Completo"
                  className="w-full p-4 md:p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base md:text-lg outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-4 p-4 md:p-6 rounded-3xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    Horario Mañana
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="em"
                      required
                      defaultValue={editingShift?.entradaMañana || ""}
                      placeholder="Ingreso"
                      className="w-full p-3 md:p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none"
                    />
                    <input
                      name="sm"
                      required
                      defaultValue={editingShift?.salidaMañana || ""}
                      placeholder="Salida"
                      className="w-full p-3 md:p-4 rounded-xl bg-white border border-emerald-200 font-bold text-sm outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4 p-4 md:p-6 rounded-3xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                    Horario Tarde
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      name="et"
                      defaultValue={editingShift?.entradaTarde || ""}
                      placeholder="Ingreso"
                      className="w-full p-3 md:p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none"
                    />
                    <input
                      name="st"
                      defaultValue={editingShift?.salidaTarde || ""}
                      placeholder="Salida"
                      className="w-full p-3 md:p-4 rounded-xl bg-white border border-amber-200 font-bold text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-4 md:py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] md:text-xs shadow-xl hover:bg-indigo-700 transition-all"
              >
                {editingShift
                  ? "Actualizar Turno"
                  : "Guardar Configuración de Turno"}
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "schedule" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up border border-white/20">
            <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white sticky top-0 z-10">
              <h2 className="text-lg md:text-xl font-black uppercase tracking-widest">
                Nuevo Horario
              </h2>
              <button
                onClick={() => setPanelModalType(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 md:p-8">
              <form
                onSubmit={(e: any) => {
                  e.preventDefault();
                  const type = e.target.type.value;
                  const dia = e.target.dia.value;
                  const inicio = e.target.inicio.value;
                  const fin = e.target.fin.value;
                  const materia = e.target.materia?.value;
                  if (type && dia && inicio && fin) {
                    setSchedules([
                      ...schedules,
                      {
                        id: Date.now().toString(),
                        ownerId:
                          currentUser?.parentId || currentUser?.id || "admin-1",
                        targetId: "global",
                        type,
                        dia,
                        inicio,
                        fin,
                        materia,
                      },
                    ]);
                    setPanelModalType(null);
                  }
                }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Tipo de Horario
                  </label>
                  <select
                    name="type"
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none appearance-none"
                  >
                    <option value="clase">Clase Académica</option>
                    <option value="laboral">Jornada Laboral</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Día de la Semana
                  </label>
                  <select
                    name="dia"
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none appearance-none"
                  >
                    {[
                      "Lunes",
                      "Martes",
                      "Miércoles",
                      "Jueves",
                      "Viernes",
                      "Sábado",
                      "Domingo",
                    ].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Inicio
                    </label>
                    <input
                      name="inicio"
                      type="time"
                      required
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Fin
                    </label>
                    <input
                      name="fin"
                      type="time"
                      required
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Materia / Actividad
                  </label>
                  <input
                    name="materia"
                    placeholder="Ej. Matemáticas"
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-black text-base outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all"
                >
                  Registrar en Horario
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {panelModalType === "profile" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">
                Editar Perfil
              </h2>
              <button
                onClick={() => setPanelModalType(null)}
                className="hover:bg-white/20 p-3 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={async (e: any) => {
                e.preventDefault();
                const fullName = e.target.fullName.value;
                const email = e.target.email.value;
                const whatsapp = e.target.whatsapp.value;
                const password = e.target.password.value;

                if (currentUser) {
                  let finalPassword = currentUser.password || password;
                  let finalRealPassword = currentUser.realPassword;

                  if (password !== currentUser.password && password !== currentUser.realPassword) {
                    finalPassword = await hashPassword(password);
                    finalRealPassword = password;
                  } else {
                    finalRealPassword = currentUser.realPassword || password;
                  }

                  const updatedUser = {
                    ...currentUser,
                    fullName,
                    email,
                    whatsapp,
                    password: finalPassword,
                    realPassword: finalRealPassword,
                  };
                  setCurrentUser(updatedUser);
                  setUsers(
                    users.map((u) =>
                      u.id === currentUser.id ? updatedUser : u,
                    ),
                  );
                  setPanelModalType(null);
                  setToast({
                    message: "Perfil actualizado correctamente.",
                    type: "success",
                  });
                }
              }}
              className="p-10 space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre Completo
                </label>
                <input
                  name="fullName"
                  defaultValue={currentUser?.fullName}
                  required
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Correo Electrónico
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={currentUser?.email}
                  required
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  WhatsApp
                </label>
                <input
                  name="whatsapp"
                  defaultValue={currentUser?.whatsapp}
                  required
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    defaultValue={currentUser?.realPassword || currentUser?.password}
                    required
                    className="w-full p-5 pr-12 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "report" && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-700 text-white">
              <h2 className="text-2xl font-black uppercase tracking-widest">
                Registrar Reporte
              </h2>
              <button
                onClick={() => setPanelModalType(null)}
                className="hover:bg-white/20 p-3 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const message = e.target.message.value;
                if (message && currentUser) {
                  const newNotif: AppNotification = {
                    id: Date.now().toString(),
                    userId: currentUser.id,
                    username: currentUser.username,
                    message,
                    date: new Date().toLocaleString(),
                    type: "report",
                  };
                  setNotifications([newNotif, ...notifications]);
                  setPanelModalType(null);
                  setToast({
                    message: "Reporte registrado y enviado a notificaciones.",
                    type: "success",
                  });
                }
              }}
              className="p-10 space-y-6"
            >
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Mensaje / Incidencia
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="Describa el reporte o mensaje aquí..."
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 font-bold text-slate-700 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-indigo-700 transition-all"
              >
                Enviar Reporte
              </button>
            </form>
          </div>
        </div>
      )}

      {panelModalType === "publicOpticalConfig" && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border-4 border-white">
            <div className="p-6 md:p-8 bg-violet-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
                  <Layers size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">Configurar Ficha Examen Pública</h2>
                  <p className="text-white/60 text-[10px] font-bold uppercase mt-1">Seleccione los exámenes disponibles para los alumnos</p>
                </div>
              </div>
              <button onClick={() => setPanelModalType(null)} className="hover:bg-white/20 p-2 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                {(activeConfig.examTypes || []).filter(e => e.hasOpticalSheet).length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">No hay exámenes con "Usar Ficha Examen" activado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {(activeConfig.examTypes || []).filter(e => e.hasOpticalSheet).map(exam => {
                      const isSelected = globalConfig.publicModules?.authorizedExams?.includes(exam.id);
                      return (
                        <button
                          key={exam.id}
                          onClick={() => {
                            const currentAuthorized = globalConfig.publicModules?.authorizedExams || [];
                            const newAuthorized = isSelected 
                              ? currentAuthorized.filter(id => id !== exam.id)
                              : [...currentAuthorized, exam.id];
                            
                            setGlobalConfig(prev => ({
                              ...prev,
                              publicModules: {
                                ...(prev.publicModules || {}),
                                authorizedExams: newAuthorized
                              }
                            }));
                          }}
                          className={`p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${isSelected ? 'bg-violet-50 border-violet-200 shadow-md' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg transition-all ${isSelected ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <FileText size={18} />
                            </div>
                            <div className="text-left">
                              <p className={`font-black uppercase tracking-tight text-sm ${isSelected ? 'text-violet-900' : 'text-slate-600'}`}>
                                {exam.name}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">
                                {exam.numQuestions} Preguntas
                              </p>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-200'}`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
              <button
                onClick={() => setPanelModalType(null)}
                className="flex-1 py-4 bg-slate-200 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setGlobalConfig(prev => ({
                    ...prev,
                    publicModules: {
                      ...(prev.publicModules || {}),
                      opticalSheetEnabled: true
                    }
                  }));
                  setPanelModalType(null);
                  setToast({ message: "Módulo Ficha Examen activado correctamente", type: "success" });
                }}
                disabled={(globalConfig.publicModules?.authorizedExams || []).length === 0}
                className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Activar Módulo
              </button>
            </div>
          </div>
        </div>
      )}

      {panelModalType === "siteConfig" &&
        (() => {
          const rawTargetConfig = configTargetUser
            ? configTargetUser.config || globalConfig
            : globalConfig;
          const targetConfig = {
            ...globalConfig,
            ...rawTargetConfig,
            theme: {
              ...globalConfig.theme,
              ...(rawTargetConfig.theme || {}),
            },
          };
          return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
              <div className="bg-white rounded-[2rem] md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border-4 md:border-8 border-white">
                <div
                  className="p-5 md:p-10 text-white flex justify-between items-center"
                  style={{ backgroundColor: targetConfig.theme.primaryColor }}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 bg-white/10 rounded-xl md:rounded-2xl border border-white/10">
                      <Palette size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm md:text-2xl font-black uppercase tracking-widest leading-tight">
                        {configTargetUser
                          ? "Personalizar Usuario"
                          : "Personalizar Sitio"}
                      </h2>
                      <p className="text-white/60 text-[8px] md:text-[10px] font-bold uppercase mt-1">
                        {configTargetUser
                          ? configTargetUser.fullName ||
                            configTargetUser.username
                          : "Configuración Global"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setPanelModalType(null);
                      setConfigTargetUser(null);
                    }}
                    className="hover:bg-white/20 p-2 rounded-full transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="p-5 md:p-10 space-y-6 md:space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* Site Name and Slogan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-1 md:space-y-2">
                      <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={targetConfig.siteName}
                        onChange={(e) => {
                          if (configTargetUser) {
                            const updatedUsers = users.map((u) => {
                              if (u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    siteName: e.target.value,
                                  },
                                };
                                if (currentUser?.id === u.id)
                                  setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(
                              updatedUsers.find(
                                (u) => u.id === configTargetUser.id,
                              ) || null,
                            );
                          } else {
                            setGlobalConfig((prev) => ({
                              ...prev,
                              siteName: e.target.value,
                            }));
                          }
                        }}
                        className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Slogan
                      </label>
                      <input
                        type="text"
                        value={targetConfig.slogan || ""}
                        onChange={(e) => {
                          if (configTargetUser) {
                            const updatedUsers = users.map((u) => {
                              if (u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    slogan: e.target.value,
                                  },
                                };
                                if (currentUser?.id === u.id)
                                  setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(
                              updatedUsers.find(
                                (u) => u.id === configTargetUser.id,
                              ) || null,
                            );
                          } else {
                            setGlobalConfig((prev) => ({
                              ...prev,
                              slogan: e.target.value,
                            }));
                          }
                        }}
                        className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Logo Section */}
                  <div className="space-y-3 md:space-y-4">
                    <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Logo Institucional
                    </label>
                    <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-8 p-4 md:p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
                      <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-2xl md:rounded-[2rem] border-4 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shadow-inner">
                        {targetConfig.logo ? (
                          <img
                            src={targetConfig.logo}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <Upload className="text-slate-300" size={20} />
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas =
                                    document.createElement("canvas");
                                  const MAX_WIDTH = 500;
                                  const MAX_HEIGHT = 500;
                                  let width = img.width;
                                  let height = img.height;

                                  if (width > height) {
                                    if (width > MAX_WIDTH) {
                                      height *= MAX_WIDTH / width;
                                      width = MAX_WIDTH;
                                    }
                                  } else {
                                    if (height > MAX_HEIGHT) {
                                      width *= MAX_HEIGHT / height;
                                      height = MAX_HEIGHT;
                                    }
                                  }
                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext("2d");
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  const resizedBase64 = canvas.toDataURL(
                                    file.type || "image/jpeg",
                                    0.8,
                                  );

                                  if (configTargetUser) {
                                    const updatedUsers = users.map((u) => {
                                      if (u.id === configTargetUser.id) {
                                        const updated = {
                                          ...u,
                                          config: {
                                            ...(u.config || globalConfig),
                                            logo: resizedBase64,
                                          },
                                        };
                                        if (currentUser?.id === u.id)
                                          setCurrentUser(updated);
                                        return updated;
                                      }
                                      return u;
                                    });
                                    setUsers(updatedUsers);
                                    setConfigTargetUser(
                                      updatedUsers.find(
                                        (u) => u.id === configTargetUser.id,
                                      ) || null,
                                    );
                                  } else {
                                    setGlobalConfig((prev) => ({
                                      ...prev,
                                      logo: resizedBase64,
                                    }));
                                  }
                                };
                                img.src = ev.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            };
                            input.click();
                          }}
                          className="w-full sm:px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-md"
                        >
                          Subir Logo
                        </button>
                        <button
                          onClick={() => {
                            if (configTargetUser) {
                              const updatedUsers = users.map((u) => {
                                if (u.id === configTargetUser.id) {
                                  const { logo, ...restConfig } =
                                    u.config || {};
                                  const updated = {
                                    ...u,
                                    config: restConfig as UserConfig,
                                  };
                                  if (currentUser?.id === u.id)
                                    setCurrentUser(updated);
                                  return updated;
                                }
                                return u;
                              });
                              setUsers(updatedUsers);
                              setConfigTargetUser(
                                updatedUsers.find(
                                  (u) => u.id === configTargetUser.id,
                                ) || null,
                              );
                            } else {
                              setGlobalConfig((prev) => ({
                                ...prev,
                                logo: undefined,
                              }));
                            }
                          }}
                          className="w-full sm:px-6 py-3 border-2 border-slate-200 text-slate-400 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                        >
                          Restablecer
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Themes Palette */}
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Temas Predeterminados
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PREDEFINED_THEMES.map((theme) => (
                        <button
                          key={theme.name}
                          onClick={() => {
                            if (configTargetUser) {
                              const updatedUsers = users.map((u) => {
                                if (u.id === configTargetUser.id) {
                                  const updated = {
                                    ...u,
                                    config: {
                                      ...(u.config || globalConfig),
                                      theme: {
                                        ...(u.config?.theme ||
                                          globalConfig.theme),
                                        primaryColor: theme.primary,
                                        secondaryColor: theme.secondary,
                                      },
                                    },
                                  };
                                  if (currentUser?.id === u.id)
                                    setCurrentUser(updated);
                                  return updated;
                                }
                                return u;
                              });
                              setUsers(updatedUsers);
                              setConfigTargetUser(
                                updatedUsers.find(
                                  (u) => u.id === configTargetUser.id,
                                ) || null,
                              );
                            } else {
                              setGlobalConfig((prev) => ({
                                ...prev,
                                theme: {
                                  ...prev.theme,
                                  primaryColor: theme.primary,
                                  secondaryColor: theme.secondary,
                                },
                              }));
                            }
                          }}
                          className="p-3 rounded-2xl border-2 border-slate-100 hover:border-blue-500 transition-all text-left"
                        >
                          <div className="flex gap-1 mb-2">
                            <div
                              className="w-full h-3 rounded-full"
                              style={{ backgroundColor: theme.primary }}
                            ></div>
                            <div
                              className="w-full h-3 rounded-full"
                              style={{ backgroundColor: theme.secondary }}
                            ></div>
                          </div>
                          <p className="text-[8px] font-black text-slate-500 uppercase truncate">
                            {theme.name}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Color Primario
                      </label>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <input
                          type="color"
                          value={targetConfig.theme.primaryColor}
                          onChange={(e) => {
                            if (configTargetUser) {
                              const updatedUsers = users.map((u) => {
                                if (u.id === configTargetUser.id) {
                                  const updated = {
                                    ...u,
                                    config: {
                                      ...(u.config || globalConfig),
                                      theme: {
                                        ...(u.config?.theme ||
                                          globalConfig.theme),
                                        primaryColor: e.target.value,
                                      },
                                    },
                                  };
                                  if (currentUser?.id === u.id)
                                    setCurrentUser(updated);
                                  return updated;
                                }
                                return u;
                              });
                              setUsers(updatedUsers);
                              setConfigTargetUser(
                                updatedUsers.find(
                                  (u) => u.id === configTargetUser.id,
                                ) || null,
                              );
                            } else {
                              setGlobalConfig((prev) => ({
                                ...prev,
                                theme: {
                                  ...prev.theme,
                                  primaryColor: e.target.value,
                                },
                              }));
                            }
                          }}
                          className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                        />
                        <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">
                          {targetConfig.theme.primaryColor}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Color Secundario
                      </label>
                      <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
                        <input
                          type="color"
                          value={targetConfig.theme.secondaryColor}
                          onChange={(e) => {
                            if (configTargetUser) {
                              const updatedUsers = users.map((u) => {
                                if (u.id === configTargetUser.id) {
                                  const updated = {
                                    ...u,
                                    config: {
                                      ...(u.config || globalConfig),
                                      theme: {
                                        ...(u.config?.theme ||
                                          globalConfig.theme),
                                        secondaryColor: e.target.value,
                                      },
                                    },
                                  };
                                  if (currentUser?.id === u.id)
                                    setCurrentUser(updated);
                                  return updated;
                                }
                                return u;
                              });
                              setUsers(updatedUsers);
                              setConfigTargetUser(
                                updatedUsers.find(
                                  (u) => u.id === configTargetUser.id,
                                ) || null,
                              );
                            } else {
                              setGlobalConfig((prev) => ({
                                ...prev,
                                theme: {
                                  ...prev.theme,
                                  secondaryColor: e.target.value,
                                },
                              }));
                            }
                          }}
                          className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                        />
                        <span className="font-mono font-bold text-[10px] text-slate-500 uppercase">
                          {targetConfig.theme.secondaryColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Font Family */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      Fuente del Sistema
                    </label>
                    <select
                      value={targetConfig.theme?.fontFamily || "Poppins"}
                      onChange={(e) => {
                        if (configTargetUser) {
                          const updatedUsers = users.map((u) => {
                            if (u.id === configTargetUser.id) {
                              const updated = {
                                ...u,
                                config: {
                                  ...(u.config || globalConfig),
                                  theme: {
                                    ...(u.config?.theme ||
                                      globalConfig.theme ||
                                      {}),
                                    fontFamily: e.target.value,
                                  },
                                },
                              };
                              if (currentUser?.id === u.id)
                                setCurrentUser(updated);
                              return updated;
                            }
                            return u;
                          });
                          setUsers(updatedUsers);
                          setConfigTargetUser(
                            updatedUsers.find(
                              (u) => u.id === configTargetUser.id,
                            ) || null,
                          );
                        } else {
                          setGlobalConfig((prev) => ({
                            ...prev,
                            theme: {
                              ...(prev.theme || {}),
                              fontFamily: e.target.value,
                            },
                          }));
                        }
                      }}
                      className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm outline-none transition-all appearance-none"
                    >
                      <option value="Poppins">Poppins (Moderno)</option>
                      <option value="Inter">Inter (Limpio)</option>
                      <option value="Montserrat">Montserrat (Elegante)</option>
                      <option value="Roboto">Roboto (Clásico)</option>
                    </select>
                  </div>

                  {/* Credential Personalization Section */}
                  <div className="space-y-6 pt-4 border-t border-slate-100">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <IdCard size={14} className="text-blue-600" />{" "}
                      Personalización de Credenciales
                    </h3>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Formato de Código
                      </label>
                      <select
                        value={
                          targetConfig.credentialConfig?.barcodeDisplay || "qr"
                        }
                        onChange={(e) => {
                          const val = e.target.value as
                            | "qr"
                            | "qr_barcode"
                            | "barcode";
                          if (configTargetUser) {
                            const updatedUsers = users.map((u) => {
                              if (u.id === configTargetUser.id) {
                                const updated = {
                                  ...u,
                                  config: {
                                    ...(u.config || globalConfig),
                                    credentialConfig: {
                                      ...(u.config?.credentialConfig ||
                                        globalConfig.credentialConfig ||
                                        DEFAULT_CONFIG.credentialConfig),
                                      barcodeDisplay: val,
                                    },
                                  },
                                };
                                if (currentUser?.id === u.id)
                                  setCurrentUser(updated);
                                return updated;
                              }
                              return u;
                            });
                            setUsers(updatedUsers);
                            setConfigTargetUser(
                              updatedUsers.find(
                                (u) => u.id === configTargetUser.id,
                              ) || null,
                            );
                          } else {
                            setGlobalConfig({
                              ...globalConfig,
                              credentialConfig: {
                                ...(globalConfig.credentialConfig ||
                                  DEFAULT_CONFIG.credentialConfig),
                                barcodeDisplay: val,
                              },
                            });
                          }
                        }}
                        className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 focus:border-blue-500 font-bold text-sm outline-none transition-all"
                      >
                        <option value="qr">Solo QR</option>
                        <option value="qr_barcode">
                          QR + Código de barras
                        </option>
                        <option value="barcode">Solo Código de barras</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Student Credential */}
                      <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                          Alumnos
                        </p>
                        <div className="space-y-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Color Identificación
                          </label>
                          <input
                            type="color"
                            value={
                              targetConfig.credentialConfig?.studentColor ||
                              "#3b82f6"
                            }
                            onChange={(e) => {
                              const newColor = e.target.value;
                              if (configTargetUser) {
                                const updatedUsers = users.map((u) => {
                                  if (u.id === configTargetUser.id) {
                                    const updated = {
                                      ...u,
                                      config: {
                                        ...(u.config || globalConfig),
                                        credentialConfig: {
                                          ...(u.config?.credentialConfig ||
                                            globalConfig.credentialConfig ||
                                            DEFAULT_CONFIG.credentialConfig),
                                          studentColor: newColor,
                                        },
                                      },
                                    };
                                    if (currentUser?.id === u.id)
                                      setCurrentUser(updated);
                                    return updated;
                                  }
                                  return u;
                                });
                                setUsers(updatedUsers);
                                setConfigTargetUser(
                                  updatedUsers.find(
                                    (u) => u.id === configTargetUser.id,
                                  ) || null,
                                );
                              } else {
                                setGlobalConfig({
                                  ...globalConfig,
                                  credentialConfig: {
                                    ...(globalConfig.credentialConfig ||
                                      DEFAULT_CONFIG.credentialConfig),
                                    studentColor: newColor,
                                  },
                                });
                              }
                            }}
                            className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Fondo (Diseño)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const img = new Image();
                                    img.onload = () => {
                                      const canvas =
                                        document.createElement("canvas");
                                      const MAX_WIDTH = 800;
                                      const MAX_HEIGHT = 800;
                                      let width = img.width;
                                      let height = img.height;

                                      if (width > height) {
                                        if (width > MAX_WIDTH) {
                                          height *= MAX_WIDTH / width;
                                          width = MAX_WIDTH;
                                        }
                                      } else {
                                        if (height > MAX_HEIGHT) {
                                          width *= MAX_HEIGHT / height;
                                          height = MAX_HEIGHT;
                                        }
                                      }
                                      canvas.width = width;
                                      canvas.height = height;
                                      const ctx = canvas.getContext("2d");
                                      ctx?.drawImage(img, 0, 0, width, height);
                                      const result = canvas.toDataURL(
                                        file.type || "image/jpeg",
                                        0.8,
                                      );

                                      if (configTargetUser) {
                                        const updatedUsers = users.map((u) => {
                                          if (u.id === configTargetUser.id) {
                                            const updated = {
                                              ...u,
                                              config: {
                                                ...(u.config || globalConfig),
                                                credentialConfig: {
                                                  ...(u.config
                                                    ?.credentialConfig ||
                                                    globalConfig.credentialConfig ||
                                                    DEFAULT_CONFIG.credentialConfig),
                                                  studentBg: result,
                                                },
                                              },
                                            };
                                            if (currentUser?.id === u.id)
                                              setCurrentUser(updated);
                                            return updated;
                                          }
                                          return u;
                                        });
                                        setUsers(updatedUsers);
                                        setConfigTargetUser(
                                          updatedUsers.find(
                                            (u) => u.id === configTargetUser.id,
                                          ) || null,
                                        );
                                      } else {
                                        setGlobalConfig({
                                          ...globalConfig,
                                          credentialConfig: {
                                            ...(globalConfig.credentialConfig ||
                                              DEFAULT_CONFIG.credentialConfig),
                                            studentBg: result,
                                          },
                                        });
                                      }
                                    };
                                    img.src = ev.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                };
                                input.click();
                              }}
                              className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-black transition-all"
                            >
                              Subir
                            </button>
                            {targetConfig.credentialConfig?.studentBg && (
                              <button
                                onClick={() => {
                                  if (configTargetUser) {
                                    const updatedUsers = users.map((u) => {
                                      if (u.id === configTargetUser.id) {
                                        const updated = {
                                          ...u,
                                          config: {
                                            ...(u.config || globalConfig),
                                            credentialConfig: {
                                              ...(u.config?.credentialConfig ||
                                                globalConfig.credentialConfig ||
                                                DEFAULT_CONFIG.credentialConfig),
                                              studentBg: undefined,
                                            },
                                          },
                                        };
                                        if (currentUser?.id === u.id)
                                          setCurrentUser(updated);
                                        return updated;
                                      }
                                      return u;
                                    });
                                    setUsers(updatedUsers);
                                    setConfigTargetUser(
                                      updatedUsers.find(
                                        (u) => u.id === configTargetUser.id,
                                      ) || null,
                                    );
                                  } else {
                                    setGlobalConfig({
                                      ...globalConfig,
                                      credentialConfig: {
                                        ...(globalConfig.credentialConfig ||
                                          DEFAULT_CONFIG.credentialConfig),
                                        studentBg: undefined,
                                      },
                                    });
                                  }
                                }}
                                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Teacher Credential */}
                      <div className="space-y-4 p-4 bg-slate-50 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                          Docentes
                        </p>
                        <div className="space-y-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Color Identificación
                          </label>
                          <input
                            type="color"
                            value={
                              targetConfig.credentialConfig?.teacherColor ||
                              "#10b981"
                            }
                            onChange={(e) => {
                              const newColor = e.target.value;
                              if (configTargetUser) {
                                const updatedUsers = users.map((u) => {
                                  if (u.id === configTargetUser.id) {
                                    const updated = {
                                      ...u,
                                      config: {
                                        ...(u.config || globalConfig),
                                        credentialConfig: {
                                          ...(u.config?.credentialConfig ||
                                            globalConfig.credentialConfig ||
                                            DEFAULT_CONFIG.credentialConfig),
                                          teacherColor: newColor,
                                        },
                                      },
                                    };
                                    if (currentUser?.id === u.id)
                                      setCurrentUser(updated);
                                    return updated;
                                  }
                                  return u;
                                });
                                setUsers(updatedUsers);
                                setConfigTargetUser(
                                  updatedUsers.find(
                                    (u) => u.id === configTargetUser.id,
                                  ) || null,
                                );
                              } else {
                                setGlobalConfig({
                                  ...globalConfig,
                                  credentialConfig: {
                                    ...(globalConfig.credentialConfig ||
                                      DEFAULT_CONFIG.credentialConfig),
                                    teacherColor: newColor,
                                  },
                                });
                              }
                            }}
                            className="w-full h-10 rounded-xl cursor-pointer border-none bg-transparent"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">
                            Fondo (Diseño)
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = "image/*";
                                input.onchange = (e: any) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const img = new Image();
                                    img.onload = () => {
                                      const canvas =
                                        document.createElement("canvas");
                                      const MAX_WIDTH = 800;
                                      const MAX_HEIGHT = 800;
                                      let width = img.width;
                                      let height = img.height;

                                      if (width > height) {
                                        if (width > MAX_WIDTH) {
                                          height *= MAX_WIDTH / width;
                                          width = MAX_WIDTH;
                                        }
                                      } else {
                                        if (height > MAX_HEIGHT) {
                                          width *= MAX_HEIGHT / height;
                                          height = MAX_HEIGHT;
                                        }
                                      }
                                      canvas.width = width;
                                      canvas.height = height;
                                      const ctx = canvas.getContext("2d");
                                      ctx?.drawImage(img, 0, 0, width, height);
                                      const result = canvas.toDataURL(
                                        file.type || "image/jpeg",
                                        0.8,
                                      );

                                      if (configTargetUser) {
                                        const updatedUsers = users.map((u) => {
                                          if (u.id === configTargetUser.id) {
                                            const updated = {
                                              ...u,
                                              config: {
                                                ...(u.config || globalConfig),
                                                credentialConfig: {
                                                  ...(u.config
                                                    ?.credentialConfig ||
                                                    globalConfig.credentialConfig ||
                                                    DEFAULT_CONFIG.credentialConfig),
                                                  teacherBg: result,
                                                },
                                              },
                                            };
                                            if (currentUser?.id === u.id)
                                              setCurrentUser(updated);
                                            return updated;
                                          }
                                          return u;
                                        });
                                        setUsers(updatedUsers);
                                        setConfigTargetUser(
                                          updatedUsers.find(
                                            (u) => u.id === configTargetUser.id,
                                          ) || null,
                                        );
                                      } else {
                                        setGlobalConfig({
                                          ...globalConfig,
                                          credentialConfig: {
                                            ...(globalConfig.credentialConfig ||
                                              DEFAULT_CONFIG.credentialConfig),
                                            teacherBg: result,
                                          },
                                        });
                                      }
                                    };
                                    img.src = ev.target?.result as string;
                                  };
                                  reader.readAsDataURL(file);
                                };
                                input.click();
                              }}
                              className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-black transition-all"
                            >
                              Subir
                            </button>
                            {targetConfig.credentialConfig?.teacherBg && (
                              <button
                                onClick={() => {
                                  if (configTargetUser) {
                                    const updatedUsers = users.map((u) => {
                                      if (u.id === configTargetUser.id) {
                                        const updated = {
                                          ...u,
                                          config: {
                                            ...(u.config || globalConfig),
                                            credentialConfig: {
                                              ...(u.config?.credentialConfig ||
                                                globalConfig.credentialConfig ||
                                                DEFAULT_CONFIG.credentialConfig),
                                              teacherBg: undefined,
                                            },
                                          },
                                        };
                                        if (currentUser?.id === u.id)
                                          setCurrentUser(updated);
                                        return updated;
                                      }
                                      return u;
                                    });
                                    setUsers(updatedUsers);
                                    setConfigTargetUser(
                                      updatedUsers.find(
                                        (u) => u.id === configTargetUser.id,
                                      ) || null,
                                    );
                                  } else {
                                    setGlobalConfig({
                                      ...globalConfig,
                                      credentialConfig: {
                                        ...(globalConfig.credentialConfig ||
                                          DEFAULT_CONFIG.credentialConfig),
                                        teacherBg: undefined,
                                      },
                                    });
                                  }
                                }}
                                className="p-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setPanelModalType(null);
                      setConfigTargetUser(null);
                      setToast({
                        message: "Configuración guardada correctamente.",
                        type: "success",
                      });
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">
                  Editar Asistencia
                </h2>
                <p className="text-blue-100 text-[10px] font-bold uppercase mt-1">
                  {editingAttendance.studentName}
                </p>
              </div>
              <button
                onClick={() => setEditingAttendance(null)}
                className="hover:bg-white/20 p-3 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateAttendance} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Estado
                </label>
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Hora Ingreso
                  </label>
                  <input
                    name="horaEntrada"
                    type="text"
                    defaultValue={editingAttendance.horaEntrada || ""}
                    placeholder="--:--:--"
                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Hora Salida
                  </label>
                  <input
                    name="horaSalida"
                    type="text"
                    defaultValue={editingAttendance.horaSalida || ""}
                    placeholder="--:--:--"
                    className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Fecha
                </label>
                <input
                  name="fecha"
                  type="text"
                  defaultValue={editingAttendance.fecha}
                  required
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all"
              >
                Actualizar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      {editingIncidence && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-red-600 text-white">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-widest">
                  Editar Incidencia
                </h2>
                <p className="text-red-100 text-[10px] font-bold uppercase mt-1">
                  {editingIncidence.studentName}
                </p>
              </div>
              <button
                onClick={() => setEditingIncidence(null)}
                className="hover:bg-white/20 p-3 rounded-full transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updated = incidences.map((i) =>
                  i.id === editingIncidence.id
                    ? {
                        ...i,
                        type: formData.get("type") as string,
                        severity: formData.get("severity") as IncidenceSeverity,
                        status: formData.get("status") as IncidenceStatus,
                        description: formData.get("description") as string,
                      }
                    : i,
                );
                setIncidences(updated);
                setEditingIncidence(null);
                setToast({
                  message: "Incidencia actualizada.",
                  type: "success",
                });
              }}
              className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Tipo de Incidencia
                  </label>
                  <select
                    name="type"
                    defaultValue={editingIncidence.type}
                    required
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all"
                  >
                    {incidenceTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Estado de Seguimiento
                  </label>
                  <select
                    name="status"
                    defaultValue={editingIncidence.status}
                    required
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all"
                  >
                    <option value="registrada">Registrada</option>
                    <option value="en evaluación">En Evaluación</option>
                    <option value="en seguimiento">En Seguimiento</option>
                    <option value="resuelta">Resuelta</option>
                    <option value="escalada a un caso mayor">Escalada</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nivel de Gravedad
                </label>
                <div className="flex gap-2">
                  {["leve", "moderado", "grave"].map((sev) => (
                    <label key={sev} className="flex-1">
                      <input
                        type="radio"
                        name="severity"
                        value={sev}
                        defaultChecked={editingIncidence.severity === sev}
                        required
                        className="hidden peer"
                      />
                      <div
                        className={`text-center p-4 rounded-2xl border-2 border-slate-100 cursor-pointer font-black text-[10px] uppercase tracking-widest transition-all peer-checked:bg-red-600 peer-checked:text-white peer-checked:border-red-600 hover:bg-slate-50`}
                      >
                        {sev}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  defaultValue={editingIncidence.description}
                  required
                  rows={4}
                  className="w-full p-5 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold text-slate-700 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-red-700 transition-all"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDICIÓN DE HORARIO (VER HORARIO) */}
      <AnimatePresence>
        {editingScheduleGrade && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md cursor-pointer"
            onClick={() => {
              if (isScheduleEditsDirty) {
                confirmAction(
                  "Tiene cambios sin guardar. ¿Desea cerrar y descartar los cambios?",
                  () => setEditingScheduleGrade(null),
                  "Cambios sin Guardar",
                );
              } else {
                setEditingScheduleGrade(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border-4 border-slate-900 flex flex-col w-full max-w-7xl h-[90vh] relative overflow-hidden cursor-default"
            >
              {/* Header Modal */}
              <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Editar Horario: {editingScheduleGrade.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Sección "{editingScheduleGrade.seccion}"</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSchedules(prev => [
                        ...prev.filter(s => s.targetId !== editingScheduleGrade.id),
                        ...tempSchedules
                      ]);
                      setEditingScheduleGrade(null);
                      setToast({ message: "Horario guardado con éxito", type: "success" });
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                  >
                    <Save size={16} /> Guardar Cambios
                  </button>
                  <button
                    onClick={() => {
                      if (isScheduleEditsDirty) {
                        confirmAction(
                          "Tiene cambios sin guardar. ¿Desea cerrar y descartar los cambios?",
                          () => setEditingScheduleGrade(null),
                          "Cambios sin Guardar"
                        );
                      } else {
                        setEditingScheduleGrade(null);
                      }
                    }}
                    className="p-3 bg-white/10 text-white hover:bg-rose-600 rounded-xl transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Sidebar Materias */}
                <div className="w-full lg:w-64 bg-slate-50 p-6 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Materias</h4>
                  <div className="flex flex-row lg:flex-col flex-wrap gap-2">
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        draggable
                        onDragStart={() => setDraggedCourse(course)}
                        className="p-2.5 px-4 rounded-xl border-2 border-white bg-white cursor-move hover:border-blue-200 transition-all flex items-center gap-3 group shadow-sm"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }}></div>
                        <span className="font-black text-[10px] uppercase tracking-tight text-slate-600 group-hover:text-blue-600">{course.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid Horario */}
                <div className="flex-1 p-6 md:p-10 overflow-auto custom-scrollbar bg-white">
                  <div className="min-w-[1000px]">
                    <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: `repeat(${schoolDays.length + 1}, 1fr)` }}>
                      <div className="p-2"></div>
                      {schoolDays.map((dia) => (
                        <div key={dia} className="text-center font-black text-[10px] uppercase tracking-widest text-slate-500 py-3 bg-slate-50 rounded-2xl border border-slate-100">{dia}</div>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {timeSlots.map((slot) => (
                        <div key={slot.id} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${schoolDays.length + 1}, 1fr)` }}>
                          <div className="flex items-center justify-center bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-800">
                            <span className="font-black text-[10px] tracking-tighter whitespace-nowrap">{slot.start} - {slot.end}</span>
                          </div>
                          {schoolDays.map((dia) => {
                            const sch = tempSchedules.find(s => (s.dia === dia || s.day === dia) && (s.inicio === slot.start || s.timeSlotId === slot.id));
                            return (
                              <div
                                key={dia}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={() => {
                                  if (draggedCourse || draggedSchedule) {
                                    const courseToUse = draggedCourse || courses.find(c => c.name === draggedSchedule?.materia);
                                    if (!courseToUse) return;

                                    const teacherId = courseToUse.teacherId;
                                    if (teacherId) {
                                      // Check tempSchedules (other than dragged)
                                      const conflictInTemp = tempSchedules.find(s => 
                                        (s.dia === dia || s.day === dia) && 
                                        (s.inicio === slot.start || s.timeSlotId === slot.id) &&
                                        courses.find(c => c.name === s.materia)?.teacherId === teacherId &&
                                        s.id !== draggedSchedule?.id
                                      );

                                      // Check global schedules
                                      const conflictInGlobal = schedules.find(s => 
                                        (s.dia === dia || s.day === dia) &&
                                        (s.inicio === slot.start || s.timeSlotId === slot.id) &&
                                        courses.find(c => c.name === s.materia)?.teacherId === teacherId &&
                                        s.targetId !== editingScheduleGrade.id
                                      );

                                      if (conflictInTemp || conflictInGlobal) {
                                        const conflictGradeId = conflictInTemp ? conflictInTemp.targetId : conflictInGlobal?.targetId;
                                        const grade = gradeLevels.find(gl => gl.id === conflictGradeId);
                                        setToast({ message: `Docente ya tiene clase en: ${grade?.nombre || "otro grado"}`, type: "error" });
                                        return;
                                      }
                                    }
                                    
                                    const conflict = tempSchedules.find(s => (s.dia === dia || s.day === dia) && (s.inicio === slot.start || s.timeSlotId === slot.id) && s.id !== draggedSchedule?.id);
                                    if (conflict) {
                                      setToast({ message: "Ya existe una clase en este horario", type: "error" });
                                      return;
                                    }

                                    let newTempSchedules = [...tempSchedules];
                                    if (draggedSchedule) {
                                      newTempSchedules = newTempSchedules.filter(s => s.id !== draggedSchedule.id);
                                    }

                                    setTempSchedules([...newTempSchedules, {
                                      id: Date.now().toString(),
                                      dia: dia as any,
                                      inicio: slot.start,
                                      fin: slot.end,
                                      materia: courseToUse.name,
                                      type: "clase",
                                      targetId: editingScheduleGrade.id,
                                    }]);
                                    setIsScheduleEditsDirty(true);
                                    setDraggedCourse(null);
                                    setDraggedSchedule(null);
                                  }
                                }}
                                className={`min-h-[90px] rounded-[1.5rem] border-2 border-dashed transition-all flex items-center justify-center p-2 relative group ${sch ? "border-transparent shadow-md" : "border-slate-100 hover:border-blue-400 hover:bg-blue-50/50"}`}
                              >
                                {sch ? (
                                  <div
                                    draggable
                                    onDragStart={() => setDraggedSchedule(sch)}
                                    className="w-full h-full rounded-2xl flex flex-col items-center justify-center text-center p-2 shadow-sm border-2 cursor-move relative transition-transform hover:scale-[1.02]"
                                    style={{
                                      backgroundColor: (courses.find(c => c.name === sch.materia)?.color || "#3b82f6") + "15",
                                      borderColor: (courses.find(c => c.name === sch.materia)?.color || "#3b82f6") + "40",
                                      color: courses.find(c => c.name === sch.materia)?.color || "#1e293b",
                                    }}
                                  >
                                    <span className="font-black text-[9px] uppercase leading-tight mb-1">{sch.materia}</span>
                                    <button
                                      onClick={() => {
                                        setTempSchedules(prev => prev.filter(s => s.id !== sch.id));
                                        setIsScheduleEditsDirty(true);
                                      }}
                                      className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white rounded-full shadow-lg text-red-500 hover:scale-110 transition-all border border-slate-100 z-10"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <Plus size={14} className="text-blue-400" />
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isUserModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg md:max-w-2xl overflow-hidden animate-slide-up border border-white/20 max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white shrink-0">
              <div>
                <h2 className="text-xl md:text-3xl font-black uppercase tracking-widest">
                  {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                </h2>
                <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase mt-1 md:mt-2">
                  Gestión de credenciales y datos personales
                </p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="hover:bg-white/20 p-2 md:p-4 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSaveUser}
              className="p-6 md:p-10 space-y-4 md:space-y-6 bg-white overflow-y-auto no-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Nombre de Usuario
                  </label>
                  <input
                    name="username"
                    defaultValue={editingUser?.username}
                    required
                    placeholder="Ej. admin_educativo"
                    className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      defaultValue={editingUser?.realPassword || editingUser?.password}
                      required
                      placeholder="Clave de acceso"
                      className="w-full pl-10 md:pl-12 pr-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Nombres Completos
                  </label>
                  <input
                    name="fullName"
                    defaultValue={editingUser?.fullName}
                    placeholder="Nombre y Apellidos"
                    className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    WhatsApp
                  </label>
                  <div className="relative">
                    <Phone
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="whatsapp"
                      defaultValue={editingUser?.whatsapp}
                      placeholder="999 999 999"
                      className="w-full pl-10 md:pl-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingUser?.email}
                      placeholder="ejemplo@educativa.com"
                      className="w-full pl-10 md:pl-12 p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Rol del Usuario
                  </label>
                  <select
                    name="role"
                    defaultValue={editingUser?.role || "staff"}
                    className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg appearance-none outline-none"
                  >
                    <option value="admin">Administrador (Master)</option>
                    <option value="staff">Personal (Staff)</option>
                    <option value="enrolador">Enrolador (Configurable)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Vincular a Usuario (Enrolador)
                  </label>
                  <select
                    name="linkedUserId"
                    defaultValue={editingUser?.linkedUserId || ""}
                    className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-sm md:text-lg appearance-none outline-none"
                  >
                    <option value="">Sin vincular</option>
                    {users
                      .filter((u) => u.id !== editingUser?.id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.role.toUpperCase()}: {u.fullName || u.username}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {(currentUser?.role === "admin" ||
                currentUser?.role === "enrolador") &&
                !currentUser.parentId && (
                  <div className="space-y-6 pt-4 border-t border-slate-100 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Permisos de Acceso (Menú Principal)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: "dashboard", label: "Dashboard" },
                          { id: "estudiantes", label: "Base Datos" },
                          { id: "asistencia", label: "Asistencia" },
                          { id: "reportes", label: "Reportes" },
                          { id: "matricula", label: "Matrícula" },
                          { id: "alerta", label: "Alerta" },
                          { id: "calificaciones", label: "Notas" },
                          { id: "mi-panel", label: "Mi Panel" },
                          { id: "config", label: "Config" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Notas / Calificaciones)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { id: "calificaciones:lista", label: "Lista" },
                          { id: "calificaciones:registros", label: "Registros" },
                          { id: "calificaciones:boletas", label: "Boletas" },
                          { id: "calificaciones:calificar", label: "Calificar" },
                          { id: "calificaciones:optica", label: "Óptica" },
                          { id: "calificaciones:niveles", label: "Niveles" },
                          { id: "calificaciones:grados", label: "Grados" },
                          { id: "calificaciones:secciones", label: "Secciones" },
                          { id: "calificaciones:periodos", label: "Periodos" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Reportes)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "reportes:global", label: "Reporte Global" },
                          {
                            id: "reportes:personalizado",
                            label: "Personalizado",
                          },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Alerta)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {
                            id: "alerta:registro",
                            label: "Registrar Incidencia",
                          },
                          { id: "alerta:historial", label: "Historial" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Configuración)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "config:usuarios", label: "Usuarios" },
                          { id: "config:sistema", label: "Sistema" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Mi Panel)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: "mi-panel:perfil", label: "Perfil" },
                          { id: "mi-panel:grados", label: "Grados" },
                          { id: "mi-panel:horarios", label: "Ver Horario" },
                          { id: "mi-panel:horarios:ver", label: "Ver Horarios" },
                          { id: "mi-panel:alerta", label: "Config Alerta" },
                          { id: "mi-panel:profesores", label: "Profesores" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Horarios)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { id: "mi-panel:horarios:turnos", label: "Turnos" },
                          { id: "mi-panel:horarios:config", label: "Config" },
                          { id: "mi-panel:horarios:creador", label: "Creador" },
                          {
                            id: "mi-panel:horarios:materias",
                            label: "Materias",
                          },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                        Sub-Permisos (Grados)
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {[
                          { id: "mi-panel:grados:niveles", label: "Niveles" },
                          { id: "mi-panel:grados:grados", label: "Grados" },
                          {
                            id: "mi-panel:grados:secciones",
                            label: "Secciones",
                          },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={perm.id}
                              defaultChecked={
                                editingUser
                                  ? editingUser.permissions.includes(perm.id)
                                  : true
                              }
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">
                              {perm.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              <div className="flex gap-3 md:gap-4 pt-4 md:pt-6">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-[10px] md:text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 md:py-4 rounded-xl md:rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-[10px] md:text-xs transition-all"
                >
                  {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFotocheckOpen && selectedStudentForId && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in gap-4">
          <div
            ref={cardRef}
            className={`bg-white p-0 flex flex-col items-center animate-slide-up shadow-2xl relative overflow-hidden border-[4px] rounded-2xl`}
            style={{
              width: "5.4cm",
              height: "8.6cm",
              minWidth: "5.4cm",
              minHeight: "8.6cm",
              borderColor:
                selectedStudentForId.rol === "Docente"
                  ? activeConfig.credentialConfig?.teacherColor || "#064e3b"
                  : activeConfig.credentialConfig?.studentColor || "#0f172a",
            }}
          >
            {/* Background Image */}
            {(selectedStudentForId.rol === "Docente"
              ? activeConfig.credentialConfig?.teacherBg
              : activeConfig.credentialConfig?.studentBg) && (
              <div className="absolute inset-0 z-0">
                <img
                  src={
                    selectedStudentForId.rol === "Docente"
                      ? activeConfig.credentialConfig?.teacherBg
                      : activeConfig.credentialConfig?.studentBg
                  }
                  className="w-full h-full object-cover opacity-40"
                  alt="Background"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            {/* Decorative Institutional Border */}
            <div
              className={`absolute inset-0 border-[1px] pointer-events-none rounded-[1.2rem] z-10`}
              style={{
                borderColor:
                  selectedStudentForId.rol === "Docente"
                    ? activeConfig.credentialConfig?.teacherColor + "33" ||
                      "#05966933"
                    : activeConfig.credentialConfig?.studentColor + "33" ||
                      "#2563eb33",
              }}
            ></div>

            {/* Close Button (UI only, not part of the card) */}
            <button
              data-ignore="true"
              onClick={handleCloseFotocheck}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 z-40 bg-white/90 p-1.5 rounded-full border border-slate-200 transition-all print:hidden shadow-sm"
            >
              <X size={18} />
            </button>

            {/* 1. Header: Institution Name (Title) */}
            <div
              className={`w-full text-white py-2 px-3 text-center border-b-[3px] relative flex items-center justify-center gap-2 z-20`}
              style={{
                backgroundColor:
                  selectedStudentForId.rol === "Docente"
                    ? activeConfig.credentialConfig?.teacherColor || "#064e3b"
                    : activeConfig.credentialConfig?.studentColor || "#0f172a",
                borderBottomColor:
                  selectedStudentForId.rol === "Docente"
                    ? activeConfig.credentialConfig?.teacherColor + "CC" ||
                      "#059669CC"
                    : activeConfig.credentialConfig?.studentColor + "CC" ||
                      "#2563ebCC",
              }}
            >
              <div
                className={`absolute top-0 left-0 w-full h-1 bg-white/20`}
              ></div>
              {(selectedStudentForId.logo || activeConfig.logo) && (
                <img
                  src={selectedStudentForId.logo || activeConfig.logo}
                  className="w-6 h-6 object-contain"
                  alt="Logo"
                  referrerPolicy="no-referrer"
                />
              )}
              <h1 className="font-black text-[9px] uppercase tracking-tighter leading-tight drop-shadow-sm">
                {selectedStudentForId.siteName || activeConfig.siteName}
              </h1>
            </div>

            <div
              className={`flex-1 w-full flex flex-col items-center justify-between pt-1 pb-3 px-4 bg-gradient-to-b from-white/80 to-slate-50/50 z-20`}
            >
              <div className="flex flex-col items-center w-full space-y-1.5 flex-1 justify-center">
                {/* 2. Photograph */}
                <div
                  className="relative group cursor-pointer"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <div
                    className={`w-20 h-20 bg-white rounded-xl flex items-center justify-center overflow-hidden border-[2px] shadow-lg relative z-10`}
                    style={{
                      borderColor:
                        selectedStudentForId.rol === "Docente"
                          ? activeConfig.credentialConfig?.teacherColor + "33" ||
                            "#ecfdf5"
                          : activeConfig.credentialConfig?.studentColor + "33" ||
                            "#f8fafc",
                    }}
                  >
                    {selectedStudentForId.foto ? (
                      <img
                        src={selectedStudentForId.foto}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center text-slate-300">
                        <ImageIcon size={48} className="opacity-20" />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">
                          Subir Foto
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Photo Actions (UI only) */}
                  <div
                    data-ignore="true"
                    className="absolute -bottom-2 -right-2 flex gap-1.5 print:hidden z-20"
                  >
                    <div
                      className={`text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform`}
                      style={{
                        backgroundColor:
                          selectedStudentForId.rol === "Docente"
                            ? activeConfig.credentialConfig?.teacherColor ||
                              "#059669"
                            : activeConfig.credentialConfig?.studentColor ||
                              "#2563eb",
                      }}
                    >
                      <Camera size={16} />
                    </div>
                    {selectedStudentForId.foto && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentForId({
                            ...selectedStudentForId,
                            foto: undefined,
                          });
                          setHasChanges(true);
                        }}
                        className="bg-rose-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-rose-700 hover:scale-110 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={photoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handlePhotoUpload(e)}
                  />
                </div>

                {/* 3. Name and Surname */}
                <div className="text-center w-full space-y-0.5 relative z-20">
                  <h3 className="text-[13.5px] font-black text-slate-900 uppercase leading-none tracking-tight">
                    {selectedStudentForId.nombre}
                  </h3>
                  <p
                    className={`text-[11.5px] font-black uppercase leading-none tracking-tight`}
                    style={{
                      color:
                        selectedStudentForId.rol === "Docente"
                          ? activeConfig.credentialConfig?.teacherColor ||
                            "#059669"
                          : activeConfig.credentialConfig?.studentColor ||
                            "#2563eb",
                    }}
                  >
                    {selectedStudentForId.apellido}
                  </p>
                </div>

                {/* 4. Aula / Cargo */}
                <div className="text-center w-full">
                  <div
                    className={`inline-block px-3 py-0.5 rounded-lg text-[7px] font-black uppercase border tracking-wider shadow-sm`}
                    style={{
                      backgroundColor:
                        selectedStudentForId.rol === "Docente"
                          ? activeConfig.credentialConfig?.teacherColor ||
                            "#059669"
                          : "#f1f5f9",
                      color:
                        selectedStudentForId.rol === "Docente"
                          ? "white"
                          : "#475569",
                      borderColor:
                        selectedStudentForId.rol === "Docente"
                          ? activeConfig.credentialConfig?.teacherColor ||
                            "#047857"
                          : "#e2e8f0",
                    }}
                  >
                    {selectedStudentForId.rol === "Docente"
                      ? "PERSONAL DOCENTE"
                      : `Aula: ${selectedStudentForId.grado} "${selectedStudentForId.seccion}"`}
                  </div>
                </div>

                {/* 5. Code (QR / Barcode) */}
                <div
                  className={`flex flex-col items-center justify-center w-full gap-0 pt-0.5`}
                >
                  <div
                    className={`flex flex-col items-center justify-center w-full px-2`}
                  >
                    {(!activeConfig.credentialConfig?.barcodeDisplay ||
                      activeConfig.credentialConfig?.barcodeDisplay === "qr" ||
                      activeConfig.credentialConfig?.barcodeDisplay ===
                        "qr_barcode") && (
                      <div
                        className={`bg-transparent p-0 flex-shrink-0 flex items-center justify-center`}
                      >
                        {currentQRCode ? (
                          <img
                            src={currentQRCode}
                            className={
                              activeConfig.credentialConfig?.barcodeDisplay ===
                              "qr_barcode"
                                ? "w-14 h-14"
                                : "w-22 h-22"
                            }
                            alt="QR Code"
                          />
                        ) : (
                          <div
                            className={`${activeConfig.credentialConfig?.barcodeDisplay === "qr_barcode" ? "w-14 h-14" : "w-22 h-22"} bg-slate-50 animate-pulse rounded-lg`}
                          />
                        )}
                      </div>
                    )}

                    {(activeConfig.credentialConfig?.barcodeDisplay ===
                      "barcode" ||
                      activeConfig.credentialConfig?.barcodeDisplay ===
                        "qr_barcode") && (
                      <div
                        className={`bg-transparent p-0 flex items-center justify-center overflow-hidden max-w-full -mt-1`}
                      >
                        <Barcode
                          value={selectedStudentForId.dni}
                          width={
                            activeConfig.credentialConfig?.barcodeDisplay ===
                            "qr_barcode"
                              ? 1.1
                              : 1.6
                          }
                          height={
                            activeConfig.credentialConfig?.barcodeDisplay ===
                            "qr_barcode"
                              ? 16
                              : 35
                          }
                          displayValue={false}
                          margin={0}
                          background="transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Slogan or Long Line (Fixed Footer) */}
              <div className="w-full flex flex-col items-center pb-1 mt-auto">
                <div
                  className={`w-full h-[1.5px] bg-gradient-to-r from-transparent to-transparent mb-1.5`}
                  style={{
                    backgroundImage: `linear-gradient(to right, transparent, ${selectedStudentForId.rol === "Docente" ? activeConfig.credentialConfig?.teacherColor + "66" || "#a7f3d0" : activeConfig.credentialConfig?.studentColor + "66" || "#e2e8f0"}, transparent)`,
                  }}
                ></div>
                <p
                  className={`text-[7.5px] font-black uppercase tracking-[0.05em] italic text-center px-4 break-words w-full max-w-full leading-tight`}
                  style={{
                    color:
                      selectedStudentForId.rol === "Docente"
                        ? activeConfig.credentialConfig?.teacherColor ||
                          "#059669"
                        : activeConfig.credentialConfig?.studentColor ||
                          "#2563eb",
                  }}
                >
                  {activeConfig.slogan || "EXCELENCIA Y VALORES"}
                </p>
              </div>
            </div>

          </div>
        {/* Download Button (Outside of the cardRef to avoid clipping) */}
        <button
          onClick={handleDownloadSingleJPG}
          className={`w-full max-w-[200px] py-2.5 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-xl uppercase text-[10px] tracking-widest active:scale-95 hover:brightness-110 print:hidden z-30`}
          style={{
            backgroundColor:
              selectedStudentForId.rol === "Docente"
                ? activeConfig.credentialConfig?.teacherColor || "#059669"
                : activeConfig.credentialConfig?.studentColor || "#2563eb",
          }}
        >
          <Download size={14} /> Descargar JPG
        </button>
      </div>
    )}

      {/* Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black uppercase tracking-widest">
                Configurar Materia
              </h2>
              <button
                onClick={() => setEditingCourse(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Nombre de la Materia
                </label>
                <input
                  value={editingCourse.name}
                  onChange={(e) =>
                    setEditingCourse({ ...editingCourse, name: e.target.value })
                  }
                  placeholder="Ej. Matemáticas"
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Docente Asignado
                </label>
                <select
                  value={editingCourse.teacherId || ""}
                  onChange={(e) =>
                    setEditingCourse({
                      ...editingCourse,
                      teacherId: e.target.value,
                    })
                  }
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-xs uppercase outline-none transition-all"
                >
                  <option value="">Sin Asignar</option>
                  {students
                    .filter((s) => s.rol === "Docente")
                    .map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.nombre} {teacher.apellido}
                      </option>
                    ))}
                  {/* Fallback if no teachers in students list */}
                  {students.filter((s) => s.rol === "Docente").length === 0 && (
                    <option value="T1">Prof. Juan Pérez</option>
                  )}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Color Distintivo
                </label>
                <div className="flex gap-2 flex-wrap">
                  {PREDEFINED_COURSE_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() =>
                        setEditingCourse({ ...editingCourse, color })
                      }
                      className={`w-8 h-8 rounded-full border-2 transition-all ${editingCourse.color === color ? "border-slate-900 scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingCourse(null)}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (editingCourse.name) {
                      const exists = courses.find(
                        (c) => c.id === editingCourse.id,
                      );
                      if (exists) {
                        setCourses(
                          courses.map((c) =>
                            c.id === editingCourse.id ? editingCourse : c,
                          ),
                        );
                      } else {
                        setCourses([
                          ...courses,
                          {
                            ...editingCourse,
                            ownerId:
                              currentUser?.parentId ||
                              currentUser?.id ||
                              "admin-1",
                          },
                        ]);
                      }
                      setEditingCourse(null);
                      setToast({
                        message: "Materia guardada",
                        type: "success",
                      });
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-xs transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exam Type Modal */}
      {isExamTypeModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black uppercase tracking-widest">
                Configurar Tipos de Examen
              </h2>
              <button
                onClick={() => setIsExamTypeModalOpen(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examTypes.map((type) => (
                  <div
                    key={type.id}
                    className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100 space-y-4 relative group"
                  >
                    <button
                      onClick={() =>
                        confirmAction(
                          `¿Eliminar el tipo de examen "${type.name}"?`,
                          () =>
                            setExamTypes(
                              examTypes.filter((t) => t.id !== type.id),
                            ),
                        )
                      }
                      className="absolute top-4 right-4 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Nombre del Examen
                      </label>
                      <input
                        type="text"
                        value={type.name}
                        onChange={(e) =>
                          setExamTypes(
                            examTypes.map((t) =>
                              t.id === type.id
                                ? { ...t, name: e.target.value }
                                : t,
                            ),
                          )
                        }
                        className="w-full p-3 rounded-xl bg-white border-none font-bold text-slate-800 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Divisor de Nota
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={type.divisor || 1}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? {
                                      ...t,
                                      divisor: parseFloat(e.target.value) || 1,
                                    }
                                  : t,
                              ),
                            )
                          }
                          className="w-full p-2 rounded-lg bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Num. Preguntas
                        </label>
                        <input
                          type="number"
                          value={type.numQuestions || 0}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? {
                                      ...t,
                                      numQuestions:
                                        parseInt(e.target.value) || 0,
                                    }
                                  : t,
                              ),
                            )
                          }
                          className="w-full p-3 rounded-lg bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">
                          Ptos. Buenas
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={type.pointsPerGood}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? {
                                      ...t,
                                      pointsPerGood:
                                        parseFloat(e.target.value) || 0,
                                    }
                                  : t,
                              ),
                            )
                          }
                          className="w-full p-2 rounded-lg bg-white border-none font-bold text-emerald-600 text-xs shadow-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-rose-500 uppercase tracking-widest">
                          Ptos. Malas
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={type.pointsPerBad}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? {
                                      ...t,
                                      pointsPerBad:
                                        parseFloat(e.target.value) || 0,
                                    }
                                  : t,
                              ),
                            )
                          }
                          className="w-full p-2 rounded-lg bg-white border-none font-bold text-rose-600 text-xs shadow-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Ptos. Blancas
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={type.pointsPerBlank}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? {
                                      ...t,
                                      pointsPerBlank:
                                        parseFloat(e.target.value) || 0,
                                    }
                                  : t,
                              ),
                            )
                          }
                          className="w-full p-2 rounded-lg bg-white border-none font-bold text-slate-600 text-xs shadow-sm outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-4">
                        <input
                          type="checkbox"
                          checked={type.isIndispensable || false}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? { ...t, isIndispensable: e.target.checked }
                                  : t,
                              ),
                            )
                          }
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Indispensable
                        </label>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          checked={type.hasOpticalSheet || false}
                          onChange={(e) =>
                            setExamTypes(
                              examTypes.map((t) =>
                                t.id === type.id
                                  ? { ...t, hasOpticalSheet: e.target.checked }
                                  : t,
                              ),
                            )
                          }
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">
                          Usa Ficha Examen
                        </label>
                      </div>
                      {type.hasOpticalSheet && (
                        <div className="space-y-3 pt-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={type.hasTimer || false}
                              onChange={(e) =>
                                setExamTypes(
                                  examTypes.map((t) =>
                                    t.id === type.id
                                      ? { ...t, hasTimer: e.target.checked }
                                      : t,
                                  ),
                                )
                              }
                              className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                            />
                            <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest">
                              Activar Cuenta Regresiva
                            </label>
                          </div>
                          {type.hasTimer && (
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                Tiempo (Minutos)
                              </label>
                              <input
                                type="number"
                                value={type.timerMinutes || 0}
                                onChange={(e) =>
                                  setExamTypes(
                                    examTypes.map((t) =>
                                      t.id === type.id
                                        ? {
                                            ...t,
                                            timerMinutes:
                                              parseInt(e.target.value) || 0,
                                          }
                                        : t,
                                    ),
                                  )
                                }
                                className="w-full p-2 rounded-lg bg-white border-none font-bold text-slate-800 text-xs shadow-sm outline-none"
                                placeholder="Minutos"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="pt-2 flex flex-col gap-2">
                        <button
                          onClick={() =>
                            setEditingClassroomsForExamId(
                              editingClassroomsForExamId === type.id ? null : type.id
                            )
                          }
                          className={`w-full p-2 rounded-lg font-bold text-[10px] uppercase transition-colors ${
                            editingClassroomsForExamId === type.id
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Asignar Aulas ({type.classrooms?.length || 0})
                        </button>
                        {editingClassroomsForExamId === type.id && (
                          <div className="col-span-2 bg-slate-100 p-3 rounded-xl border border-slate-200 mt-2 space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-slate-600 mb-2">
                              Seleccionar Aulas
                            </h4>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-2 no-scrollbar">
                              {gradeLevels.map((gl) => (
                                <label
                                  key={gl.id}
                                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 cursor-pointer hover:border-blue-200"
                                >
                                  <input
                                    type="checkbox"
                                    checked={
                                      type.classrooms?.includes(gl.id) || false
                                    }
                                    onChange={(e) => {
                                      const currentClassrooms =
                                        type.classrooms || [];
                                      const newClassrooms = e.target.checked
                                        ? [...currentClassrooms, gl.id]
                                        : currentClassrooms.filter(
                                            (id) => id !== gl.id
                                          );
                                      setExamTypes(
                                        examTypes.map((t) =>
                                          t.id === type.id
                                            ? { ...t, classrooms: newClassrooms }
                                            : t
                                        )
                                      );
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs font-bold text-slate-700">
                                    {gl.nombre} - {gl.seccion}
                                  </span>
                                </label>
                              ))}
                              {gradeLevels.length === 0 && (
                                <p className="text-xs text-slate-400 italic">No hay aulas creadas.</p>
                              )}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setSelectedExamTypeForKey(type);
                            setIsCreateKeyModalOpen(true);
                          }}
                          className="w-full p-2 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[10px] uppercase hover:bg-indigo-200"
                        >
                          Crear Clave
                        </button>
                        <button
                          onClick={() => handleDownloadOpticalSheet(type)}
                          className="w-full p-2 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] uppercase hover:bg-slate-200 flex items-center justify-center gap-2"
                        >
                          <Download size={12} /> Descargar Ficha
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setExamTypes([
                      ...examTypes,
                      {
                        id: Date.now().toString(),
                        name: "Nuevo Examen",
                        maxScore: 20,
                        pointsPerGood: 1,
                        pointsPerBad: 0,
                        pointsPerBlank: 0,
                        numQuestions: 20,
                        isIndispensable: false,
                        divisor: 1,
                      },
                    ])
                  }
                  className="border-4 border-dashed border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-300 hover:text-blue-500 hover:border-blue-100 transition-all group"
                >
                  <Plus
                    size={32}
                    className="group-hover:scale-110 transition-transform"
                  />
                  <span className="font-black uppercase tracking-widest text-[10px]">
                    Agregar Tipo
                  </span>
                </button>
              </div>
              <div className="pt-6">
                <button
                  onClick={() => setIsExamTypeModalOpen(false)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-slate-800 transition-all"
                >
                  Cerrar y Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateKeyModalOpen && selectedExamTypeForKey && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-900 text-white">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Crear Clave: {selectedExamTypeForKey.name}
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const doc = new jsPDF();
                      const primaryColor = activeConfig.theme.primaryColor;
                      
                      // Header
                      doc.setFillColor(primaryColor);
                      doc.rect(0, 0, 210, 40, 'F');
                      
                      // Determine text color based on brightness
                      const hexToRgb = (hex: string) => {
                        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                        return result ? {
                          r: parseInt(result[1], 16),
                          g: parseInt(result[2], 16),
                          b: parseInt(result[3], 16)
                        } : { r: 30, g: 58, b: 138 };
                      };
                      const rgb = hexToRgb(primaryColor);
                      const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                      const textColor = brightness > 125 ? 0 : 255;
                      
                      doc.setTextColor(textColor, textColor, textColor);
                      
                      // Logo if exists
                      let textX = 15;
                      if (activeConfig.logo) {
                        try {
                          doc.addImage(activeConfig.logo, 'PNG', 12, 8, 20, 20);
                          textX = 38;
                        } catch (e) {
                          console.error("Error adding logo to PDF", e);
                        }
                      }
                      
                      doc.setFontSize(18);
                      doc.setFont('helvetica', 'bold');
                      doc.text(activeConfig.siteName.toUpperCase(), textX, 18);
                      
                      doc.setFontSize(8);
                      doc.setFont('helvetica', 'normal');
                      doc.text(activeConfig.slogan || '', textX, 24, { maxWidth: 100 });
                      
                      doc.setFontSize(11);
                      doc.setFont('helvetica', 'bold');
                      doc.text('CLAVES DE RESPUESTAS', textX, 32);
                      
                      // Body Header
                      doc.setTextColor(0, 0, 0);
                      doc.setFontSize(10);
                      doc.text('INFORMACIÓN DEL EXAMEN', 15, 50);
                      doc.setFont('helvetica', 'normal');
                      doc.text(`Nombre: ${selectedExamTypeForKey.name}`, 15, 56);
                      doc.text(`Cant. Preguntas: ${selectedExamTypeForKey.numQuestions}`, 15, 61);
                      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 195, 56, { align: 'right' });
                      
                      doc.setDrawColor(primaryColor);
                      doc.setLineWidth(0.5);
                      doc.line(15, 65, 195, 65);

                      // Autotable for keys - Strictly limited to numQuestions
                      const rawKeys = selectedExamTypeForKey.answerKey || [];
                      const keys = rawKeys.slice(0, selectedExamTypeForKey.numQuestions);
                      
                      const numColsForTable = selectedExamTypeForKey.numQuestions < 10 ? 1 : 4;
                      const itemsPerCol = Math.ceil(keys.length / numColsForTable);
                      const tableData = [];
                      
                      for (let i = 0; i < itemsPerCol; i++) {
                        const row = [];
                        for (let j = 0; j < numColsForTable; j++) {
                          const idx = i + j * itemsPerCol;
                          if (idx < keys.length) {
                            row.push({ content: `${idx + 1}`, styles: { fontStyle: 'bold', halign: 'center', fillColor: [rgb.r, rgb.g, rgb.b], textColor: textColor, fontSize: 8 } });
                            row.push({ content: keys[idx] || '-', styles: { halign: 'center', fontStyle: 'bold', textColor: [0, 0, 0], fontSize: 10 } });
                          }
                        }
                        if (row.length > 0) tableData.push(row);
                      }

                      autoTable(doc, {
                        startY: 72,
                        body: tableData,
                        theme: 'grid',
                        styles: { fontSize: 10, cellPadding: 2.5, lineColor: [220, 220, 220] },
                        columnStyles: {
                          0: { cellWidth: 10 }, 1: { cellWidth: 30 },
                          2: { cellWidth: 10 }, 3: { cellWidth: 30 },
                          4: { cellWidth: 10 }, 5: { cellWidth: 30 },
                          6: { cellWidth: 10 }, 7: { cellWidth: 30 }
                        }
                      });
                      
                      // Footer
                      const finalY = (doc as any).lastAutoTable.finalY || 72;
                      doc.setFontSize(8);
                      doc.setTextColor(150, 150, 150);
                      doc.text(`Generado por ${activeConfig.siteName} - ${new Date().toLocaleString()}`, 105, 285, { align: 'center' });

                      doc.save(`Claves_${selectedExamTypeForKey.name.replace(/\s+/g, '_')}.pdf`);
                      setToast({ message: "PDF de claves generado", type: "success" });
                    }}
                    title="Descargar PDF"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter"
                  >
                    <FileText size={16} /> PDF
                  </button>
                  <button
                    onClick={() => {
                      const rawKeys = selectedExamTypeForKey.answerKey || [];
                      const keys = rawKeys.slice(0, selectedExamTypeForKey.numQuestions);
                      const data = keys.map((key, i) => ({
                        'Pregunta': i + 1,
                        'Clave': key || '-'
                      }));
                      const ws = XLSX.utils.json_to_sheet(data);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Claves");
                      XLSX.writeFile(wb, `Claves_${selectedExamTypeForKey.name}.xlsx`);
                      setToast({ message: "Excel de claves generado", type: "success" });
                    }}
                    title="Descargar Excel"
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-tighter"
                  >
                    <FileSpreadsheet size={16} /> EXCEL
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateKeyModalOpen(false);
                  setSelectedExamTypeForKey(null);
                }}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, colIndex) => {
                  const questionsPerCol = Math.ceil(
                    selectedExamTypeForKey.numQuestions / 3,
                  );
                  const startIndex = colIndex * questionsPerCol;
                  const endIndex = Math.min(
                    startIndex + questionsPerCol,
                    selectedExamTypeForKey.numQuestions,
                  );
                  const columnQuestions = Array.from(
                    { length: endIndex - startIndex },
                    (_, i) => startIndex + i,
                  );

                  if (columnQuestions.length === 0) return null;

                  return (
                    <div key={colIndex} className="flex flex-col gap-3">
                      {columnQuestions.map((qIdx) => (
                        <div
                          key={qIdx}
                          className="flex gap-4 items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-indigo-300 transition-all"
                        >
                          <span className="font-black text-xs w-8 h-8 flex items-center justify-center text-indigo-700 bg-indigo-50 rounded-lg">
                            {qIdx + 1}
                          </span>
                          <div className="flex gap-2">
                            {["A", "B", "C", "D", "E"].map((opt) => (
                              <button
                                key={opt}
                                onClick={() => {
                                  const newKey = [
                                    ...(selectedExamTypeForKey.answerKey ||
                                      Array(
                                        selectedExamTypeForKey.numQuestions,
                                      ).fill("")),
                                  ];
                                  newKey[qIdx] =
                                    newKey[qIdx] === opt ? "" : opt;
                                  const updatedExamType = {
                                    ...selectedExamTypeForKey,
                                    answerKey: newKey,
                                  };
                                  setExamTypes(
                                    examTypes.map((t) =>
                                      t.id === selectedExamTypeForKey.id
                                        ? updatedExamType
                                        : t,
                                    ),
                                  );
                                  setSelectedExamTypeForKey(updatedExamType);
                                }}
                                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-black text-[10px] transition-all duration-200 
                                  ${
                                    selectedExamTypeForKey.answerKey?.[qIdx] ===
                                    opt
                                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md scale-105"
                                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400 hover:bg-slate-50"
                                  }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setIsCreateKeyModalOpen(false);
                  setSelectedExamTypeForKey(null);
                }}
                className="w-full p-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-sm hover:bg-indigo-700"
              >
                Guardar Clave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Time Slot Modal */}
      {editingTimeSlot && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-white/20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <h2 className="text-xl font-black uppercase tracking-widest">
                Configurar Hora
              </h2>
              <button
                onClick={() => setEditingTimeSlot(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Inicio
                  </label>
                  <input
                    type="time"
                    value={editingTimeSlot.start}
                    onChange={(e) =>
                      setEditingTimeSlot({
                        ...editingTimeSlot,
                        start: e.target.value,
                      })
                    }
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Fin
                  </label>
                  <input
                    type="time"
                    value={editingTimeSlot.end}
                    onChange={(e) =>
                      setEditingTimeSlot({
                        ...editingTimeSlot,
                        end: e.target.value,
                      })
                    }
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-black text-lg outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setEditingTimeSlot(null)}
                  className="flex-1 py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black hover:bg-slate-50 uppercase tracking-widest text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const exists = timeSlots.find(
                      (s) => s.id === editingTimeSlot.id,
                    );
                    if (exists) {
                      setTimeSlots(
                        timeSlots
                          .map((s) =>
                            s.id === editingTimeSlot.id ? editingTimeSlot : s,
                          )
                          .sort((a, b) => a.start.localeCompare(b.start)),
                      );
                    } else {
                      setTimeSlots(
                        [...timeSlots, editingTimeSlot].sort((a, b) =>
                          a.start.localeCompare(b.start),
                        ),
                      );
                    }
                    setEditingTimeSlot(null);
                    setToast({ message: "Horario guardado", type: "success" });
                  }}
                  className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-black shadow-xl hover:bg-blue-700 uppercase tracking-widest text-xs transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT GRADE MODAL --- */}
      {viewingAnswers && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Respuestas del Examen</h3>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{viewingAnswers.studentName} - {viewingAnswers.materia}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingAnswers(null)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Score Summary for Optical Sheets */}
              {viewingAnswers.isOpticalSheet && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Buenas</p>
                    <p className="text-xl font-black text-emerald-700">{viewingAnswers.buenas || 0}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-center">
                    <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Malas</p>
                    <p className="text-xl font-black text-rose-700">{viewingAnswers.malas || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Blancas</p>
                    <p className="text-xl font-black text-slate-600">{viewingAnswers.blancas || 0}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {viewingAnswers.studentAnswers?.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</span>
                    <span className="font-black text-slate-700 text-sm">{ans || '-'}</span>
                  </div>
                ))}
                {(!viewingAnswers.studentAnswers || viewingAnswers.studentAnswers.length === 0) && (
                  <p className="col-span-full text-center py-8 text-slate-400 font-bold uppercase text-[10px] tracking-widest">No hay respuestas registradas</p>
                )}
              </div>

              {viewingAnswers.submittedAt && (
                <div className="mt-8 flex items-center justify-center gap-2 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <CalendarCheck size={16} className="text-indigo-600" />
                  <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">
                    Entregado el: {new Date(viewingAnswers.submittedAt).toLocaleString('es-PE')}
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/30">
              <button
                onClick={() => setViewingAnswers(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-800 transition-all shadow-xl"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {editingGrade && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in overflow-y-auto">
          {(editingGrade.isOpticalSheet || editingGrade.isFromPublicConsultas) ? (
            <div className="w-full max-w-4xl animate-slide-up relative mt-20 mb-20">
              <button
                onClick={() => setEditingGrade(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-all"
              >
                <X size={24} />
              </button>
              <FichaOptica
                students={students}
                examTypes={examTypes}
                gradeLevels={gradeLevels}
                gradeToEdit={editingGrade}
                onCancelEdit={() => setEditingGrade(null)}
                onSaveGrade={(updatedGrade) => {
                  setGrades(
                    grades.map((g) =>
                      g.id === updatedGrade.id ? updatedGrade : g,
                    ),
                  );
                  setEditingGrade(null);
                  setToast({
                    message: "Calificación actualizada exitosamente",
                    type: "success",
                  });
                }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up border-8 border-white">
              <div
                className="p-10 text-white text-center relative"
                style={{ backgroundColor: activeConfig.theme.primaryColor }}
              >
                <button
                  onClick={() => setEditingGrade(null)}
                  className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X />
                </button>
                <div className="inline-flex p-4 bg-white/10 rounded-2xl mb-4 shadow-xl border border-white/10">
                  <Edit size={32} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight">
                  Editar Calificación
                </h2>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {editingGrade.studentName}
                </p>
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Materia / Descripción
                  </label>
                  <input
                    type="text"
                    value={editingGrade.materia}
                    onChange={(e) =>
                      setEditingGrade({
                        ...editingGrade,
                        materia: e.target.value,
                      })
                    }
                    className="w-full p-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 outline-none font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 text-center block">
                    Nota Real
                  </label>
                  <input
                    type="number"
                    value={editingGrade.nota}
                    onChange={(e) =>
                      setEditingGrade({
                        ...editingGrade,
                        nota: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-6 rounded-2xl bg-slate-50 border-4 border-slate-100 focus:border-blue-500 outline-none text-5xl text-center font-black text-blue-600 shadow-inner"
                    min="0"
                    max="20"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setEditingGrade(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setGrades(
                        grades.map((g) =>
                          g.id === editingGrade.id ? editingGrade : g,
                        ),
                      );
                      setEditingGrade(null);
                      setToast({
                        message: "Calificación actualizada",
                        type: "success",
                      });
                    }}
                    className="flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all"
                    style={{ backgroundColor: activeConfig.theme.primaryColor }}
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {previewingExamType && (
        <OpticalSheetPreview
          examType={previewingExamType}
          siteName={activeConfig.siteName}
          slogan={activeConfig.slogan}
          logo={activeConfig.logo}
          primaryColor={activeConfig.theme.primaryColor}
          onClose={() => setPreviewingExamType(null)}
        />
      )}

      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] animate-slide-up">
          <div
            className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 ${
              toast.type === "success"
                ? "bg-emerald-600 border-emerald-400 text-white"
                : toast.type === "info"
                  ? "bg-blue-600 border-blue-400 text-white"
                  : "bg-rose-600 border-rose-400 text-white"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : toast.type === "info" ? (
              <Sparkles size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <p className="font-black uppercase tracking-widest text-[10px]">
              {toast.message}
            </p>
          </div>
        </div>
      )}

      {/* --- ADMIN LOGIN MODAL --- */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        handleAdminLogin={handleAdminLogin}
        password={adminLoginPassword}
        setPassword={setAdminLoginPassword}
      />

      {/* --- MERIT MODAL --- */}
      {isMeritModalOpen && selectedPersonalStudent && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up relative">
            <button
              onClick={() => setIsMeritModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Registrar Mérito
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedPersonalStudent.nombre}{" "}
                  {selectedPersonalStudent.apellido}
                </p>
              </div>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const catId = e.target.category.value;
                const description = e.target.description.value;
                const category = meritCategories.find(
                  (c) => c.id === catId,
                );
                if (category) {
                  handleConductAction(
                    selectedPersonalStudent.id,
                    "merit",
                    category,
                    description,
                  );
                  setIsMeritModalOpen(false);
                }
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Categoría de Mérito
                </label>
                <select
                  name="category"
                  required
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-bold text-slate-700 outline-none transition-all"
                >
                  <option value="">Seleccione...</option>
                  {meritCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (+{cat.points} pts)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Descripción / Motivo
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="Detalle el mérito..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-bold text-slate-700 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-emerald-700 transition-all"
              >
                Registrar Mérito
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- DEMERIT MODAL --- */}
      {isDemeritModalOpen && selectedPersonalStudent && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-slide-up relative">
            <button
              onClick={() => setIsDemeritModalOpen(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Registrar Demérito
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedPersonalStudent.nombre}{" "}
                  {selectedPersonalStudent.apellido}
                </p>
              </div>
            </div>
            <form
              onSubmit={(e: any) => {
                e.preventDefault();
                const catId = e.target.category.value;
                const description = e.target.description.value;
                const category = demeritCategories.find(
                  (c) => c.id === catId,
                );
                if (category) {
                  handleConductAction(
                    selectedPersonalStudent.id,
                    "demerit",
                    category,
                    description,
                  );
                  setIsDemeritModalOpen(false);
                }
              }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Gravedad del Demérito
                </label>
                <select
                  name="category"
                  required
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-bold text-slate-700 outline-none transition-all"
                >
                  <option value="">Seleccione...</option>
                  {demeritCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.points} pts)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                  Descripción / Motivo
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="Detalle lo sucedido..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-rose-500 font-bold text-slate-700 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-rose-700 transition-all"
              >
                Registrar Demérito
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Edit Modal */}
      {editingEnrollment && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Editar Matrícula #{editingEnrollment.receiptNumber}
                </h2>
                <p className="text-blue-100 text-[9px] font-bold uppercase mt-1">
                  Modifique los datos de la inscripción
                </p>
              </div>
              <button
                onClick={() => setEditingEnrollment(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleUpdateEnrollment}
              className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Tipo de Pago
                  </label>
                  <select
                    name="paymentType"
                    defaultValue={editingEnrollment.paymentType}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  >
                    <option value="contado">Al Contado</option>
                    <option value="cuotas">A Cuotas</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Tipo de Beca
                  </label>
                  <select
                    name="scholarshipType"
                    defaultValue={editingEnrollment.scholarshipType}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  >
                    <option value="ninguna">Ninguna</option>
                    <option value="media">Media Beca</option>
                    <option value="completa">Beca Completa</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Monto Pensión (S/)
                  </label>
                  <input
                    name="totalAmount"
                    type="number"
                    defaultValue={editingEnrollment.totalAmount}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Monto Materiales (S/)
                  </label>
                  <input
                    name="materialsAmount"
                    type="number"
                    defaultValue={editingEnrollment.materialsAmount}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Fecha Inicio Clases
                  </label>
                  <input
                    name="classStartDate"
                    type="date"
                    defaultValue={editingEnrollment.classStartDate}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    N° Cuotas
                  </label>
                  <input
                    name="installmentsCount"
                    type="number"
                    defaultValue={editingEnrollment.installmentsCount}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                    Pago Inicial (S/)
                  </label>
                  <input
                    name="firstInstallment"
                    type="number"
                    defaultValue={editingEnrollment.firstInstallment}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 focus:border-blue-500 font-bold outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all"
              >
                Guardar Cambios
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Enrollment Preview Modal */}
      {viewingEnrollment && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-900 text-white">
              <div>
                <h2 className="text-xl font-black uppercase tracking-widest">
                  Vista Previa de Boleta
                </h2>
                <p className="text-slate-400 text-[9px] font-bold uppercase mt-1">
                  Visualización del recibo generado
                </p>
              </div>
              <button
                onClick={() => setViewingEnrollment(null)}
                className="hover:bg-white/20 p-2 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                      {activeConfig.siteName}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {activeConfig.slogan}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-blue-600 uppercase">
                      Boleta #{viewingEnrollment.receiptNumber}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      {viewingEnrollment.date}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                    Estudiante
                  </p>
                  <p className="text-lg font-black text-slate-800 uppercase">
                    {viewingEnrollment.studentName}
                  </p>
                  <p className="text-xs font-bold text-slate-500">
                    DNI: {viewingEnrollment.studentDni}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Tipo de Pago
                    </p>
                    <p className="text-xs font-black text-slate-700 uppercase">
                      {viewingEnrollment.paymentType}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Beca
                    </p>
                    <p className="text-xs font-black text-slate-700 uppercase">
                      {viewingEnrollment.scholarshipType}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                  <p className="text-sm font-black text-slate-800 uppercase">
                    Total Pagado
                  </p>
                  <p className="text-2xl font-black text-blue-600">
                    S/{" "}
                    {viewingEnrollment.scholarshipType === "completa"
                      ? viewingEnrollment.materialsAmount
                      : viewingEnrollment.scholarshipType === "media"
                        ? viewingEnrollment.totalAmount / 2 +
                          (viewingEnrollment.materialsAmount || 0)
                        : viewingEnrollment.totalAmount +
                          (viewingEnrollment.materialsAmount || 0)}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => generateEnrollmentPDF(viewingEnrollment)}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  <Download size={18} /> Descargar PDF
                </button>
                <button
                  onClick={() => setViewingEnrollment(null)}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONSULTAS MODAL --- */}
      <AnimatePresence>
        {showEnrollmentPDFOptions && pendingEnrollmentForPDF && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl max-w-sm w-full border-4 border-white"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Download size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Opciones de Boleta
                </h3>
                <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">
                  ¿Cómo deseas generar la boleta de matrícula?
                </p>
              </div>

              <div className="grid gap-3">
                <button
                  onClick={() =>
                    performEnrollmentPDFDownload(pendingEnrollmentForPDF, "single")
                  }
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-4 px-6 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-blue-200"
                >
                  <div className="text-left">
                    <span className="block text-sm uppercase tracking-tight">
                      Simple (1 copia)
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">
                      Una boleta por página A4
                    </span>
                  </div>
                  <FileText
                    size={20}
                    className="text-slate-400 group-hover:text-blue-500 transition-colors"
                  />
                </button>

                <button
                  onClick={() =>
                    performEnrollmentPDFDownload(pendingEnrollmentForPDF, "double")
                  }
                  className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-black py-4 px-6 rounded-2xl flex items-center justify-between transition-all group border-2 border-transparent hover:border-blue-200"
                >
                  <div className="text-left">
                    <span className="block text-sm uppercase tracking-tight">
                      Doble (2 copias)
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-widest leading-none">
                      Dos boletas en una página A4
                    </span>
                  </div>
                  <Layers
                    size={20}
                    className="text-slate-400 group-hover:text-blue-500 transition-colors"
                  />
                </button>

                <button
                  onClick={() => {
                    setShowEnrollmentPDFOptions(false);
                    setPendingEnrollmentForPDF(null);
                  }}
                  className="w-full mt-4 text-slate-400 hover:text-slate-600 font-black py-2 uppercase text-[10px] tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isConsultasModalOpen && consultasResult && (
        <ConsultasModal
          consultasResult={consultasResult}
          globalConfig={globalConfig}
          activeConsultasTab={activeConsultasTab}
          setActiveConsultasTab={setActiveConsultasTab as any}
          onClose={() => setIsConsultasModalOpen(false)}
          attendance={attendance}
          courses={courses}
          schedules={schedules}
          timeSlots={timeSlots}
          pub={globalConfig.publicModules}
          conductActions={conductActions}
          examTypes={examTypes}
          grades={grades}
          schoolDays={schoolDays}
          gradeLevels={gradeLevels}
          students={students}
          onSaveGrade={async (grade) => {
            const ownerId = currentUser ? getOwnerId(currentUser) : publicSearchOwnerId;
            const newGrade: Grade = {
              id: Math.random().toString(36).substr(2, 9),
              ownerId: ownerId || "default",
              studentId: consultasResult.id,
              studentName: `${consultasResult.nombre} ${consultasResult.apellido}`,
              fecha: new Date().toISOString().split("T")[0],
              isFromPublicConsultas: true, 
              isOpticalSheet: true, // Habilitar interfaz de corrección
              ...grade,
            };
            
            setGrades(prev => [...prev, newGrade]);
            
            if (isAuthenticated) {
              // Standard auto-save will handle it via useEffect/debouncedSave
            } else if (ownerId) {
              try {
                await api.savePublicGrade(ownerId, newGrade);
              } catch (e) {
                console.error("Error saving public grade:", e);
                setToast({ message: "Error al sincronizar con el servidor", type: "error" });
              }
            }
            
            setToast({ message: "Resultado del examen guardado correctamente", type: "success" });
          }}
        />
      )}
    </>
  );
};

// --- Sub-components ---
const StatCards = ({
  studentsCount,
  teachersCount,
  grades = [],
  todayAttendance = [],
  consultationLogs = [],
  activeConfig,
}: any) => {
  const today = new Date().toISOString().split("T")[0];
  const todayConsultations = (consultationLogs || []).filter(
    (l: any) => l.date === today,
  ).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
      <StatCard
        title="Estudiantes"
        value={studentsCount}
        icon={Users}
        color="blue"
        activeConfig={activeConfig}
      />
      <StatCard
        title="Docentes"
        value={teachersCount}
        icon={GraduationCap}
        color="indigo"
        activeConfig={activeConfig}
      />
      <StatCard
        title="Promedio"
        value={(
          grades.reduce((a: any, b: any) => a + b.nota, 0) /
          (grades.length || 1)
        ).toFixed(1)}
        icon={Award}
        color="amber"
        activeConfig={activeConfig}
      />
      <StatCard
        title="Asistencia"
        value={todayAttendance.length}
        icon={CheckCircle}
        color="emerald"
        activeConfig={activeConfig}
      />
      <StatCard
        title="Consultas"
        value={todayConsultations}
        icon={Search}
        color="blue"
        activeConfig={activeConfig}
      />
    </div>
  );
};

const StatCardsAttendance = ({ statsAtt }: any) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border border-emerald-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
      <div className="flex justify-center mb-2 relative z-10">
        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:scale-110 transition-transform">
          <UserCheck size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-emerald-600 relative z-10">
        {statsAtt.presentes}
      </p>
      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">
        Entrada
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-5 text-emerald-600">
        <UserCheck size={60} />
      </div>
    </div>
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border border-amber-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
      <div className="flex justify-center mb-2 relative z-10">
        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
          <Clock size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-amber-600 relative z-10">
        {statsAtt.tardanzas}
      </p>
      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">
        Tardanzas
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-5 text-amber-600">
        <Clock size={60} />
      </div>
    </div>
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border border-blue-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
      <div className="flex justify-center mb-2 relative z-10">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
          <LogOutIcon size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-blue-600 relative z-10">
        {statsAtt.salidas}
      </p>
      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">
        Salidas
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-5 text-blue-600">
        <LogOutIcon size={60} />
      </div>
    </div>
    <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-md border border-indigo-50 text-center transition-all hover:shadow-lg group relative overflow-hidden">
      <div className="flex justify-center mb-2 relative z-10">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
          <FileText size={20} className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
      <p className="text-xl sm:text-2xl font-black text-indigo-600 relative z-10">
        {statsAtt.permisos}
      </p>
      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 relative z-10">
        Permisos
      </p>
      <div className="absolute -right-2 -bottom-2 opacity-5 text-indigo-600">
        <FileText size={60} />
      </div>
    </div>
  </div>
);

const ConsultationAnalytics = ({ logs = [] }: { logs: ConsultationLog[] }) => {
  const today = new Date().toISOString().split("T")[0];

  // Daily data (today)
  const todayLogs = (logs || []).filter((l) => l.date === today);
  const dailyData = useMemo(() => {
    const counts: Record<string, number> = {};
    todayLogs.forEach((l) => {
      const key = `${l.grado} ${l.seccion}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [todayLogs]);

  // Weekly data
  const weeklyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split("T")[0];
    });

    const weekLogs = logs.filter((l) => last7Days.includes(l.date));

    const levelCounts: Record<string, number> = {};
    const gradeCounts: Record<string, number> = {};

    weekLogs.forEach((l) => {
      levelCounts[l.nivel] = (levelCounts[l.nivel] || 0) + 1;
      gradeCounts[l.grado] = (gradeCounts[l.grado] || 0) + 1;
    });

    const sortedLevels = Object.entries(levelCounts).sort(
      (a, b) => (b[1] as number) - (a[1] as number),
    );
    const sortedGrades = Object.entries(gradeCounts).sort(
      (a, b) => (b[1] as number) - (a[1] as number),
    );

    return {
      levels: sortedLevels,
      grades: sortedGrades,
      total: weekLogs.length,
    };
  }, [logs]);

  const COLORS = [
    "#2563eb",
    "#4f46e5",
    "#7c3aed",
    "#db2777",
    "#dc2626",
    "#ea580c",
    "#d97706",
    "#ca8a04",
    "#65a30d",
    "#16a34a",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
              <BarChart3 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Consultas de Hoy
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Actividad por Grado y Sección
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{
                      fontSize: "12px",
                      fontWeight: 900,
                      textTransform: "uppercase",
                    }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {dailyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                <Search size={40} className="opacity-20" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Sin actividad hoy
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                Resumen Semanal
              </h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                Tendencias de Búsqueda
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Nivel más consultado
                </p>
                {weeklyData.levels[0] ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">
                      {weeklyData.levels[0][0]}
                    </p>
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-black">
                      {weeklyData.levels[0][1]}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-300 italic">
                    Sin datos
                  </p>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Grado más consultado
                </p>
                {weeklyData.grades[0] ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">
                      {weeklyData.grades[0][0]}
                    </p>
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-black">
                      {weeklyData.grades[0][1]}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-300 italic">
                    Sin datos
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Nivel menos consultado
                </p>
                {weeklyData.levels.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">
                      {weeklyData.levels[weeklyData.levels.length - 1][0]}
                    </p>
                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">
                      {weeklyData.levels[weeklyData.levels.length - 1][1]}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-300 italic">
                    Sin datos
                  </p>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Grado menos consultado
                </p>
                {weeklyData.grades.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <p className="font-black text-slate-800 uppercase text-sm">
                      {weeklyData.grades[weeklyData.grades.length - 1][0]}
                    </p>
                    <span className="bg-slate-200 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black">
                      {weeklyData.grades[weeklyData.grades.length - 1][1]}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-300 italic">
                    Sin datos
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Total Consultas (7d)
            </p>
            <p className="text-2xl font-black text-slate-800">
              {weeklyData.total}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  activeConfig,
}: {
  title: string;
  value: any;
  icon: any;
  color: string;
  activeConfig: any;
}) => {
  const colors: any = {
    blue: {
      bg: "bg-blue-600",
      text: "text-blue-600",
      shadow: "shadow-blue-100",
      light: "bg-blue-50",
    },
    amber: {
      bg: "bg-amber-600",
      text: "text-amber-600",
      shadow: "shadow-amber-100",
      light: "bg-amber-50",
    },
    emerald: {
      bg: "bg-emerald-600",
      text: "text-emerald-600",
      shadow: "shadow-emerald-100",
      light: "bg-emerald-50",
    },
    indigo: {
      bg: "bg-indigo-600",
      text: "text-indigo-600",
      shadow: "shadow-indigo-100",
      light: "bg-indigo-50",
    },
  };
  const c = colors[color] || colors.blue;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-md border border-slate-100 hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div
          className={`p-3 rounded-xl ${c.light} ${c.text} group-hover:scale-110 transition-transform duration-500`}
        >
          <Icon size={24} />
        </div>
        <div className="w-2 h-2 rounded-full bg-slate-100"></div>
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black text-slate-800 mb-1 tracking-tight">
          {value}
        </p>
        <p className="text-slate-400 font-black text-[9px] uppercase tracking-widest">
          {title}
        </p>
      </div>
      {/* Decorative background icon */}
      <div
        className={`absolute -right-4 -bottom-4 opacity-5 ${c.text} group-hover:scale-125 transition-transform duration-700`}
      >
        <Icon size={100} />
      </div>
    </div>
  );
};

const StatusBadge = ({
  status,
  compact = false,
}: {
  status: AttendanceStatus;
  compact?: boolean;
}) => {
  const cfg = {
    entrada: {
      label: "Entrada",
      class: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    tardanza: {
      label: "Tardanza",
      class: "bg-amber-50 text-amber-700 border-amber-100",
    },
    ausente: {
      label: "Falta",
      class: "bg-rose-50 text-rose-700 border-rose-100",
    },
    falta: {
      label: "Falta",
      class: "bg-rose-50 text-rose-700 border-rose-100",
    },
    presente: {
      label: "Presente",
      class: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    salida: {
      label: "Salida",
      class: "bg-blue-50 text-blue-700 border-blue-100",
    },
    permiso: {
      label: "Permiso",
      class: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
  };
  const s = (cfg[status] ? status : "entrada") as keyof typeof cfg;
  return (
    <span
      className={`${compact ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[9px]"} rounded-lg font-black uppercase tracking-widest border ${cfg[s].class}`}
    >
      {cfg[s].label}
    </span>
  );
};

const StatusButton = ({
  status,
  active,
  onClick,
  icon: Icon,
  className = "",
}: {
  status: AttendanceStatus;
  active: boolean;
  onClick: () => void;
  icon: any;
  className?: string;
}) => {
  const styles: any = {
    entrada: active
      ? "bg-emerald-600 text-white shadow-lg border-emerald-700 shadow-emerald-500/30"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    tardanza: active
      ? "bg-amber-500 text-white shadow-lg border-amber-600 shadow-amber-500/30"
      : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    salida: active
      ? "bg-blue-600 text-white shadow-lg border-blue-700 shadow-blue-500/30"
      : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    permiso: active
      ? "bg-indigo-600 text-white shadow-lg border-indigo-700 shadow-indigo-500/30"
      : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100",
  };

  const labels: any = {
    entrada: "Entrada",
    tardanza: "Tardanza",
    salida: "Salida",
    permiso: "Permiso",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 sm:py-2.5 rounded-xl font-black uppercase tracking-[0.1em] sm:tracking-widest text-[10px] sm:text-xs flex flex-row items-center justify-center gap-2 sm:gap-2.5 transition-all outline-none border ${styles[status]} ${className}`}
    >
      <Icon size={16} className={active ? "scale-110" : ""} />
      <span>{labels[status]}</span>
    </button>
  );
};

export default App;
