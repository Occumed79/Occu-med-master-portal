import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { PORTALS, type PortalPermissionKey } from '../lib/config';

type PortalRole = 'Admin' | 'User';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<PortalRole>('User');
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PortalPermissionKey[]>(PORTALS.map((p) => p.permissionKey));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setPermissions([]);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setPermissions([]);
        setRole('User');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      if (!supabase || !currentUser.email) return;
      const { data, error } = await supabase
        .from('portal_users')
        .select('role, permissions')
        .eq('email', currentUser.email.toLowerCase())
        .maybeSingle();

      if (!error && data) {
        setRole(data.role === 'Admin' ? 'Admin' : 'User');
        setPermissions(Array.isArray(data.permissions) ? data.permissions : []);
      } else {
        setRole('User');
        setPermissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return { user, role, permissions, loading, isLive: !!supabase, isAdmin: role === 'Admin' };
}
