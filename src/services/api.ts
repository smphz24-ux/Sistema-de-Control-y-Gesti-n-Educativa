
import { AppUser, UserConfig, Student, Attendance, Grade, Incidence, Level, GradeLevel, Schedule, Shift } from '../types';

export const fetchConfig = async () => {
  const res = await fetch('/api/config');
  return res.json();
};

export const saveConfig = async (config: UserConfig) => {
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
};

export const fetchUsers = async () => {
  const res = await fetch('/api/users');
  return res.json();
};

export const saveUsers = async (users: AppUser[]) => {
  await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  });
};

export const fetchUserData = async (ownerId: string) => {
  const res = await fetch(`/api/data/${ownerId}`);
  return res.json();
};

export const saveUserData = async (ownerId: string, data: any) => {
  await fetch(`/api/data/${ownerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
};
