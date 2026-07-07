import { useEffect, useState } from 'react';

const ADMIN_SESSION_KEY = 'occu_med_admin_session_v1';

export type AdminSession = {
  email: string;
  createdAt: string;
};

function getConfiguredAdminEmail(): string {
  return (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? '';
}

function getConfiguredAdminPassword(): string {
  return (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined)?.trim() ?? '';
}

function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_SESSION_KEY) ?? window.sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AdminSession;
    return parsed.email === getConfiguredAdminEmail() ? parsed : null;
  } catch {
    return null;
  }
}

export function loginAdmin(email: string, password: string, remember = true): boolean {
  const configuredEmail = getConfiguredAdminEmail();
  const configuredPassword = getConfiguredAdminPassword();
  const matches =
    configuredEmail.length > 0 &&
    configuredPassword.length > 0 &&
    email.trim().toLowerCase() === configuredEmail &&
    password === configuredPassword;

  if (!matches || typeof window === 'undefined') return false;

  const session: AdminSession = { email: configuredEmail, createdAt: new Date().toISOString() };
  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return true;
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function useAuth() {
  const [user, setUser] = useState<AdminSession | null>(() => readAdminSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readAdminSession());
    setLoading(false);

    const onStorage = () => setUser(readAdminSession());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return {
    user,
    role: user ? 'Admin' : 'User',
    permissions: [],
    loading,
    isLive: true,
    isAdmin: !!user,
    loginAdmin,
    logoutAdmin,
  };
}
