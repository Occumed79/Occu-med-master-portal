import { Pool } from 'pg';

export const ALLOWED_PORTAL_KEYS = [
  'leadership',
  'exam_qa',
  'scheduling',
  'harvesting',
  'sme',
  'operations',
  'new',
  'network',
  'shared',
] as const;

export type AllowedPortalKey = (typeof ALLOWED_PORTAL_KEYS)[number];

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

export function assertDatabaseConfigured(): void {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
}

export async function migrate(): Promise<void> {
  assertDatabaseConfigured();
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_settings (
      id integer primary key default 1,
      settings jsonb not null default '{}',
      opening_video_url text,
      audio_url text,
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_users (
      id uuid primary key default gen_random_uuid(),
      first_name text not null,
      last_name text not null,
      username text not null unique,
      pin_digest text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS portal_user_permissions (
      user_id uuid references portal_users(id) on delete cascade,
      portal_key text not null,
      enabled boolean not null default true,
      primary key (user_id, portal_key)
    )
  `);
  await pool.query(`
    INSERT INTO portal_settings (id, settings)
    VALUES (1, '{}')
    ON CONFLICT (id) DO NOTHING
  `);
}

export function isAllowedPortalKey(value: string): value is AllowedPortalKey {
  return ALLOWED_PORTAL_KEYS.includes(value as AllowedPortalKey);
}
