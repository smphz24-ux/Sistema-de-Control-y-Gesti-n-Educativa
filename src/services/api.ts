
import { AppUser, UserConfig, Student, Attendance, Grade, Incidence, Level, GradeLevel, Schedule, Shift } from '../types';
import { supabase } from '../lib/supabase';

export const fetchConfig = async () => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('configs')
    .select('config')
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // No rows found
    console.error("Error fetching config:", error);
    return null;
  }
  return data?.config;
};

export const saveConfig = async (config: UserConfig) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('configs')
    .upsert({ id: 1, config, updated_at: new Date().toISOString() });
  
  if (error) throw error;
  return { success: true };
};

export const fetchUsers = async () => {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return data;
};

export const saveUsers = async (users: AppUser[]) => {
  if (!supabase) throw new Error('Supabase not configured');
  // Clear and re-insert or use upsert if you have proper IDs
  const { error } = await supabase
    .from('users')
    .upsert(users.map(u => ({ ...u, updated_at: new Date().toISOString() })));
  
  if (error) throw error;
  return { success: true };
};

export const fetchPublicSearch = async (dni: string) => {
  if (!supabase) return null;
  // This might be more complex as it searches across owners in app_data
  // For now, let's keep it as an API call to Netlify Function if searching across all is needed
  // OR query Supabase directly if we can
  const { data, error } = await supabase
    .from('app_data')
    .select('*');
    
  if (error) throw error;
  
  // Client-side search for simplicity in migration
  for (const row of data) {
    const userData = row.data;
    if (userData && userData.students) {
      const student = userData.students.find((s: any) => s.dni === dni);
      if (student) {
        return {
          student,
          attendance: userData.attendance || [],
          grades: userData.grades || [],
          incidences: userData.incidences || [],
          schedules: userData.schedules || [],
          ownerId: row.owner_id,
          courses: userData.courses || [],
          gradeLevels: userData.gradeLevels || [],
          examTypes: userData.examTypes || [],
          timeSlots: userData.timeSlots || [],
          schoolDays: userData.schoolDays || []
        };
      }
    }
  }
  return null;
};

export const savePublicGrade = async (ownerId: string, grade: Grade) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: existingData, error: fetchError } = await supabase
    .from('app_data')
    .select('data')
    .eq('owner_id', ownerId)
    .single();
    
  if (fetchError) throw fetchError;
  
  const updatedData = { ...existingData.data };
  if (!updatedData.grades) updatedData.grades = [];
  updatedData.grades.push(grade);
  
  const { error: updateError } = await supabase
    .from('app_data')
    .update({ data: updatedData, updated_at: new Date().toISOString() })
    .eq('owner_id', ownerId);
    
  if (updateError) throw updateError;
  return { success: true };
};

export const fetchUserData = async (ownerId: string) => {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('app_data')
    .select('data')
    .eq('owner_id', ownerId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') return {}; // No rows
    throw error;
  }
  return data?.data || {};
};

export const saveUserData = async (ownerId: string, data: any) => {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('app_data')
    .upsert({ owner_id: ownerId, data, updated_at: new Date().toISOString() });
    
  if (error) throw error;
  return { success: true };
};

export const generateAIReport = async (prompt: string) => {
  // Use the Netlify Function for AI since it has the API key
  const res = await fetch('/api/ai/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('AI request failed');
  return res.json();
};
