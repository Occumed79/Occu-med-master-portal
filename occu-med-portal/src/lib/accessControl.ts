import type { PortalPermissionKey } from './config';

export type PortalManagedUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  permissions: PortalPermissionKey[];
};

export const NON_ADMIN_PORTAL_KEYS: PortalPermissionKey[] = [
  'leadership',
  'exam_qa',
  'scheduling',
  'harvesting',
  'sme',
  'operations',
  'new',
  'network',
  'shared',
];

export function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function buildUsername(firstName: string, lastName: string): string {
  return normalizeUsername(`${firstName}${lastName}`);
}

export function generateAccessCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 10).toString()).join('');
}

export async function digestAccessCode(code: string): Promise<string> {
  const data = new TextEncoder().encode(code.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createUserId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID();
  return `user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
