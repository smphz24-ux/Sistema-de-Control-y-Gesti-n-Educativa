
import { AppUser, UserConfig, Student, Attendance, Grade, Incidence, Level, GradeLevel, Schedule, Shift } from '../types';

const fetchWithRetry = async (url: string, options?: RequestInit, retries = 3, backoff = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, backoff * (i + 1)));
    }
  }
};

export const fetchConfig = async () => {
  return fetchWithRetry('/api/config');
};

export const saveConfig = async (config: UserConfig) => {
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
};

export const fetchUsers = async () => {
  return fetchWithRetry('/api/users');
};

export const saveUsers = async (users: AppUser[]) => {
  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  });
};

export const fetchUserData = async (ownerId: string) => {
  return fetchWithRetry(`/api/data/${ownerId}`);
};

export const saveUserData = async (ownerId: string, data: any) => {
  await fetch(`/api/data/${ownerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};
