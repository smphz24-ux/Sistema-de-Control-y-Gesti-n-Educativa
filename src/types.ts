
export interface CredentialConfig {
  studentColor: string;
  teacherColor: string;
  studentBg?: string; // base64
  teacherBg?: string; // base64
  width: number; // in mm
  height: number; // in mm
}

export interface Period {
  id: string;
  name: string;
}

export interface UserConfig {
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
    grades: boolean;
    hideTeacherSchedule?: boolean;
  };
  meritCategories?: MeritCategory[];
  demeritCategories?: DemeritCategory[];
  periods?: Period[];
  footerText?: string;
  credentialConfig?: CredentialConfig;
}

export interface AppUser {
  id: string;
  username: string;
  password: string;
  fullName?: string;
  whatsapp?: string;
  email?: string;
  role: 'admin' | 'staff' | 'enrolador';
  permissions: string[];
  config?: UserConfig;
  parentId?: string;
  studentId?: string;
}

export interface Student {
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
  conductPoints?: number;
  siteName?: string;
  slogan?: string;
  logo?: string; // base64 logo override
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ConsultationLog {
  id: string;
  studentDni: string;
  nivel: string;
  grado: string;
  seccion: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export type AttendanceStatus = 'entrada' | 'tardanza' | 'ausente' | 'salida' | 'permiso';

export interface Attendance {
  id: string;
  studentDni: string;
  studentId: string;
  studentName: string;
  studentRol: 'Estudiante' | 'Docente';
  estado: AttendanceStatus;
  fecha: string;
  hora: string;
  horaEntrada?: string;
  horaSalida?: string;
}

export interface Grade {
  id: string;
  studentId: string;
  studentName: string;
  materia: string;
  examType?: string;
  nota: number;
  fecha: string;
  periodo?: string;
  buenas?: number;
  malas?: number;
  blancas?: number;
  maxScore?: number;
  pointsPerGood?: number;
  pointsPerBad?: number;
  pointsPerBlank?: number;
  numQuestions?: number;
  isIndispensable?: boolean;
  divisor?: number;
}

export interface ExamType {
  id: string;
  name: string;
  maxScore: number;
  pointsPerGood: number;
  pointsPerBad: number;
  pointsPerBlank: number;
  numQuestions: number;
  isIndispensable: boolean;
  divisor: number;
}

export interface Level {
  id: string;
  nombre: string;
}

export interface GradeLevel {
  id: string;
  nombre: string;
  nivelId: string;
  seccion: string;
}

export interface Shift {
  id: string;
  nombre: string;
  entradaMañana: string;
  salidaMañana: string;
  entradaTarde: string;
  salidaTarde: string;
}

export interface Schedule {
  id: string;
  targetId: string; // GradeLevel ID or Teacher ID
  type: 'clase' | 'laboral';
  dia: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  inicio: string;
  fin: string;
  materia?: string;
}

export type IncidenceSeverity = 'leve' | 'moderado' | 'grave';
export type IncidenceStatus = 'registrada' | 'en evaluación' | 'en seguimiento' | 'resuelta' | 'escalada a un caso mayor';

export interface Incidence {
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

export interface IncidenceType {
  id: string;
  name: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  username: string;
  message: string;
  date: string;
  type: 'report' | 'system';
}

export interface MeritCategory {
  id: string;
  name: string;
  points: number;
}

export interface DemeritCategory {
  id: string;
  name: string;
  points: number; // This will be a negative number or I'll handle it as subtraction
}

export interface ConductAction {
  id: string;
  studentId: string;
  type: 'merit' | 'demerit';
  categoryName: string;
  points: number;
  description?: string;
  date: string;
  registeredBy: string;
}

export type User = AppUser;
export type AppConfig = UserConfig;

export interface Course {
  id: string;
  nombre: string;
  nivelId: string;
}

export interface TimeSlot {
  id: string;
  targetId?: string;
  type?: 'clase' | 'laboral';
  dia?: string;
  start: string;
  end: string;
  materia?: string;
}
