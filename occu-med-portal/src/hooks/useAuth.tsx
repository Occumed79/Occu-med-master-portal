import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { PORTALS, type PortalPermissionKey } from '../lib/config';

type PortalRole = 'Admin' | 'User';

type StoredAdminSession = {
  email: string;
  role: PortalRole;
  permissions: PortalPermissionKey[];
};

const SESSION_KEY = 'occu-med-admin-session';

const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD ?? '');

function makeUser(email: string): User {
  return { email } as User;
}

function readStoredSession(): StoredAdminSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    if (!parsed.email || parsed.role !== 'Admin') return null;

    return {
      email: parsed.email.toLowerCase(),
      role: 'Admin',
      permissions: PORTALS.map((portal) => portal.permissionKey),
    };
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function saveStoredSession(session: StoredAdminSession) {
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
      setRole('Admin');
      setPermissions(session.permissions);
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return { error: 'Admin credentials are not configured in Render.' };
    }

    if (normalizedEmail !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return { error: 'Invalid admin credentials.' };
    }

    const session: StoredAdminSession = {
      email: normalizedEmail,
      role: 'Admin',
      permissions: PORTALS.map((portal) => portal.permissionKey),
    };

    saveStoredSession(session);
    setUser(makeUser(session.email));
    setRole('Admin');
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
