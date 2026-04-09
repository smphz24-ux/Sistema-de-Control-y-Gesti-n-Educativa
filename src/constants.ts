
export const PREDEFINED_THEMES = [
  { name: 'Océano Profundo', primary: '#1e3a8a', secondary: '#3b82f6' },
  { name: 'Esmeralda Vital', primary: '#064e3b', secondary: '#10b981' },
  { name: 'Atardecer Cálido', primary: '#7c2d12', secondary: '#f97316' },
  { name: 'Amatista Real', primary: '#4c1d95', secondary: '#8b5cf6' },
  { name: 'Medianoche', primary: '#0f172a', secondary: '#64748b' },
  { name: 'Bosque', primary: '#14532d', secondary: '#22c55e' },
  { name: 'Carmesí', primary: '#7f1d1d', secondary: '#ef4444' },
  { name: 'Oro', primary: '#713f12', secondary: '#eab308' },
];

export const PREDEFINED_COURSE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#6366f1', '#14b8a6', '#f43f5e', '#a855f7', '#d946ef', '#22c55e', '#eab308', '#475569'
];

export const DEFAULT_CONFIG = {
  siteName: 'Sistema de Control y Gestión',
  slogan: 'Educación con Valores y Tecnología',
  theme: {
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    fontFamily: 'Poppins'
  },
  publicModules: {
    attendance: true,
    alerts: true,
    schedule: true,
    grades: true,
    hideTeacherSchedule: false
  },
  meritCategories: [
    { id: '1', name: 'Valores', points: 5 },
    { id: '2', name: 'Responsabilidad', points: 10 },
    { id: '3', name: 'Liderazgo', points: 5 },
    { id: '4', name: 'Académico', points: 10 },
    { id: '5', name: 'Honestidad', points: 10 }
  ],
  demeritCategories: [
    { id: '1', name: 'Leve', points: -5 },
    { id: '2', name: 'Moderada', points: -10 },
    { id: '3', name: 'Grave', points: -20 },
    { id: '4', name: 'Muy Grave', points: -40 }
  ],
  periods: [
    { id: '1', name: '1er Bimestre' },
    { id: '2', name: '2do Bimestre' },
    { id: '3', name: '3er Bimestre' },
    { id: '4', name: '4to Bimestre' }
  ],
  examTypes: [
    { id: '1', name: 'Tarea', maxScore: 20, pointsPerGood: 2, pointsPerBad: 0, pointsPerBlank: 0, numQuestions: 10, isIndispensable: false, divisor: 1 },
    { id: '2', name: 'Examen Parcial', maxScore: 20, pointsPerGood: 1, pointsPerBad: -0.25, pointsPerBlank: 0, numQuestions: 20, isIndispensable: true, divisor: 1 },
    { id: '3', name: 'Examen Final', maxScore: 20, pointsPerGood: 1, pointsPerBad: -0.25, pointsPerBlank: 0, numQuestions: 20, isIndispensable: true, divisor: 1 },
    { id: '4', name: 'Participación', maxScore: 20, pointsPerGood: 1, pointsPerBad: 0, pointsPerBlank: 0, numQuestions: 20, isIndispensable: false, divisor: 1 }
  ],
  sections: ['A', 'B', 'C', 'D', 'E'],
  footerText: 'Control y Gestión 2026 © 2024',
  credentialConfig: {
    studentColor: '#3b82f6',
    teacherColor: '#10b981',
    width: 86,
    height: 54
  }
};
