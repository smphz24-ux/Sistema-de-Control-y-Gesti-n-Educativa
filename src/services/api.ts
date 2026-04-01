
import { AppUser, UserConfig, Student, Attendance, Grade, Incidence, Level, GradeLevel, Schedule, Shift } from '../types';

const fetchWithRetry = async (url: string, options?: RequestInit, retries = 5, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
      return await res.text();
    } catch (err) {
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      const isRetryableError = isNetworkError || (err instanceof Error && err.message.includes('HTTP error! status: 5'));
      
      if (i === retries - 1 || !isRetryableError) throw err;
      
      // Exponential backoff with jitter
      const delay = backoff * Math.pow(2, i) + Math.random() * 1000;
      console.warn(`Fetch attempt ${i + 1} failed for ${url}. Retrying in ${Math.round(delay)}ms...`, err);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

export const fetchConfig = async () => {
  return fetchWithRetry('/api/config');
};

export const saveConfig = async (config: UserConfig) => {
  return fetchWithRetry('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
};

export const fetchUsers = async () => {
  return fetchWithRetry('/api/users');
};

export const saveUsers = async (users: AppUser[]) => {
  return fetchWithRetry('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  });
};

export const fetchUserData = async (ownerId: string) => {
  return fetchWithRetry(`/api/data/${ownerId}`);
};

export const saveUserData = async (ownerId: string, data: any) => {
  return fetchWithRetry(`/api/data/${ownerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};
