
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
  logo: 'https://picsum.photos/seed/educativa/200',
  theme: {
    primaryColor: '#1e3a8a',
    secondaryColor: '#3b82f6',
    fontFamily: 'Poppins'
  },
  publicModules: {
    attendance: true,
    alerts: true,
    schedule: true,
    grades: true
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
  footerText: 'Control y Gestión 2026 © 2024',
  credentialConfig: {
    studentColor: '#3b82f6',
    teacherColor: '#10b981',
    width: 86,
    height: 54
  }
};
