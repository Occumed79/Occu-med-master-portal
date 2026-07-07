import { useCallback, useEffect, useState } from 'react';

export type AdminSession = {
  email?: string;
};

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function useAuth() {
  const [user, setUser] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await parseJson<{ isAdmin: boolean }>(await fetch('/api/admin/me', { credentials: 'include' }));
      setUser(data.isAdmin ? {} : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginAdmin = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await parseJson<{ admin?: { email?: string } }>(await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }));
      setUser(data.admin ?? {});
      return true;
    } catch {
      setUser(null);
      return false;
    }
  };

  const logoutAdmin = async (): Promise<void> => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setUser(null);
  };

  return {
    user,
    role: user ? 'Admin' : 'User',
    permissions: [],
    loading,
    isLive: true,
    isAdmin: !!user,
    loginAdmin,
    logoutAdmin,
    refresh,
  };
}
