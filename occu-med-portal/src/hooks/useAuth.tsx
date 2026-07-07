import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { PORTALS, type PortalPermissionKey } from '../lib/config';

type PortalRole = 'Admin' | 'User';

type StoredPortalSession = {
  email: string;
  role: PortalRole;
  permissions: PortalPermissionKey[];
};

const SESSION_KEY = 'occu-med-portal-session';

const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD ?? '');
const PORTAL_PASSWORD = String(import.meta.env.VITE_PORTAL_PASSWORD ?? ADMIN_PASSWORD ?? '');

const USER_PORTALS = PORTALS
  .filter((portal) => portal.id !== 'admin')
  .map((portal) => portal.permissionKey);

function makeUser(email: string): User {
  return { email } as User;
}

function readStoredSession(): StoredPortalSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPortalSession>;
    if (!parsed.email || !parsed.role || !Array.isArray(parsed.permissions)) return null;

    return {
      email: parsed.email.toLowerCase(),
      role: parsed.role === 'Admin' ? 'Admin' : 'User',
      permissions: parsed.permissions as PortalPermissionKey[],
    };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveStoredSession(session: StoredPortalSession) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<PortalRole>('User');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PortalPermissionKey[]>([]);

  useEffect(() => {
    const session = readStoredSession();

    if (session) {
      setUser(makeUser(session.email));
      setRole(session.role);
      setPermissions(session.permissions);
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return { error: 'Enter an email address.' };
    }

    if (!password) {
      return { error: 'Enter the portal password.' };
    }

    const isAdminLogin = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD)
      && normalizedEmail === ADMIN_EMAIL
      && password === ADMIN_PASSWORD;

    const isPortalLogin = Boolean(PORTAL_PASSWORD) && password === PORTAL_PASSWORD;

    if (!isAdminLogin && !isPortalLogin) {
      return { error: 'Invalid portal password.' };
    }

    const session: StoredPortalSession = isAdminLogin
      ? {
          email: normalizedEmail,
          role: 'Admin',
          permissions: PORTALS.map((portal) => portal.permissionKey),
        }
      : {
          email: normalizedEmail,
          role: 'User',
          permissions: USER_PORTALS,
        };

    saveStoredSession(session);
    setUser(makeUser(session.email));
    setRole(session.role);
    setPermissions(session.permissions);

    return {};
  };

  const signOut = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setRole('User');
    setPermissions([]);
  };

  return {
    user,
    role,
    permissions,
    loading,
    isLive: true,
    isAdmin: role === 'Admin',
    signIn,
    signOut,
  };
}
