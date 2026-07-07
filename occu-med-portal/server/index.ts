import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { clearAdminCookie, createAdminSession, hasValidAdminSession, requireAdmin, setAdminCookie } from './auth.js';
import { ALLOWED_PORTAL_KEYS, isAllowedPortalKey, migrate, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');

const portalLabels: Record<string, string> = {
  leadership: 'Leadership',
  exam_qa: 'ExamQA',
  scheduling: 'Scheduling',
  harvesting: 'Harvesting',
  sme: 'SME',
  operations: 'Operations',
  new: 'New',
  network: 'Network',
  shared: 'Shared',
};

type SettingsRow = {
  settings: unknown;
  opening_video_url: string | null;
  audio_url: string | null;
};

type UserRow = {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  permissions: string[] | null;
};

function normalizeUsername(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generatePin(): string {
  return Array.from(crypto.randomBytes(6), (byte) => (byte % 10).toString()).join('');
}

function digestPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

function sanitizePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter((permission): permission is string => typeof permission === 'string' && isAllowedPortalKey(permission)))];
}

async function getSettings() {
  const { rows } = await pool.query<SettingsRow>('select settings, opening_video_url, audio_url from portal_settings where id = 1');
  const row = rows[0] ?? { settings: {}, opening_video_url: null, audio_url: null };
  return {
    settings: row.settings ?? {},
    openingVideoUrl: row.opening_video_url ?? '',
    audioUrl: row.audio_url ?? '',
  };
}

async function getAdminUsers() {
  const { rows } = await pool.query<UserRow>(`
    select
      u.id,
      u.first_name,
      u.last_name,
      u.username,
      coalesce(array_agg(p.portal_key order by p.portal_key) filter (where p.enabled = true), '{}') as permissions
    from portal_users u
    left join portal_user_permissions p on p.user_id = u.id
    group by u.id
    order by u.username
  `);

  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    username: row.username,
    permissions: row.permissions ?? [],
  }));
}

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.post('/api/admin/login', (req, res) => {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD ?? '';
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!configuredEmail || !configuredPassword) {
    res.status(500).json({ error: 'Admin credentials are not configured.' });
    return;
  }

  if (email !== configuredEmail || password !== configuredPassword) {
    res.status(401).json({ error: 'Invalid admin email or password.' });
    return;
  }

  setAdminCookie(res, createAdminSession(configuredEmail));
  res.json({ ok: true, admin: { email: configuredEmail } });
});

app.post('/api/admin/logout', (_req, res) => {
  clearAdminCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: hasValidAdminSession(req) });
});

app.get('/api/portal/state', async (_req, res, next) => {
  try {
    res.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/state', requireAdmin, async (_req, res, next) => {
  try {
    const settings = await getSettings();
    const users = await getAdminUsers();
    res.json({ ...settings, users });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/settings', requireAdmin, async (req, res, next) => {
  try {
    await pool.query(
      `update portal_settings set settings = $1::jsonb, opening_video_url = $2, audio_url = $3, updated_at = now() where id = 1`,
      [req.body?.settings ?? {}, req.body?.openingVideoUrl ?? null, req.body?.audioUrl ?? null],
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res, next) => {
  try {
    const firstName = String(req.body?.firstName ?? '').trim();
    const lastName = String(req.body?.lastName ?? '').trim();
    const username = normalizeUsername(`${firstName}${lastName}`);
    if (!firstName || !lastName || !username) {
      res.status(400).json({ error: 'First name and last name are required.' });
      return;
    }

    const generatedPin = generatePin();
    const pinDigest = digestPin(generatedPin);
    const { rows } = await pool.query<{ id: string }>(
      `insert into portal_users (first_name, last_name, username, pin_digest)
       values ($1, $2, $3, $4)
       returning id`,
      [firstName, lastName, username, pinDigest],
    );

    res.status(201).json({ id: rows[0].id, firstName, lastName, username, generatedPin, permissions: [] });
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      res.status(409).json({ error: 'A user with that username already exists.' });
      return;
    }
    next(error);
  }
});

app.post('/api/admin/users/:id/regenerate-pin', requireAdmin, async (req, res, next) => {
  try {
    const generatedPin = generatePin();
    const { rowCount } = await pool.query('update portal_users set pin_digest = $1, updated_at = now() where id = $2', [digestPin(generatedPin), req.params.id]);
    if (!rowCount) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ generatedPin });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('delete from portal_users where id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/users/:id/permissions', requireAdmin, async (req, res, next) => {
  const permissions = sanitizePermissions(req.body?.permissions);
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('delete from portal_user_permissions where user_id = $1', [req.params.id]);
    for (const permission of permissions) {
      await client.query('insert into portal_user_permissions (user_id, portal_key, enabled) values ($1, $2, true)', [req.params.id, permission]);
    }
    await client.query('update portal_users set updated_at = now() where id = $1', [req.params.id]);
    await client.query('commit');
    res.json({ permissions });
  } catch (error) {
    await client.query('rollback');
    next(error);
  } finally {
    client.release();
  }
});

app.post('/api/portal/verify-access', async (req, res, next) => {
  try {
    const username = normalizeUsername(String(req.body?.username ?? ''));
    const pin = String(req.body?.pin ?? '');
    const portalKey = String(req.body?.portalKey ?? '');

    if (!isAllowedPortalKey(portalKey)) {
      res.status(400).json({ allowed: false, reason: 'Invalid portal.' });
      return;
    }

    const userResult = await pool.query<{ id: string; pin_digest: string }>('select id, pin_digest from portal_users where username = $1', [username]);
    const user = userResult.rows[0];
    if (!user || user.pin_digest !== digestPin(pin)) {
      res.json({ allowed: false, reason: 'Invalid username or password.' });
      return;
    }

    const permissionResult = await pool.query('select 1 from portal_user_permissions where user_id = $1 and portal_key = $2 and enabled = true', [user.id, portalKey]);
    if (permissionResult.rowCount === 0) {
      res.json({ allowed: false, reason: `This user does not have access to ${portalLabels[portalKey]}.` });
      return;
    }

    const settings = await getSettings();
    const portalSettings = settings.settings as Record<string, { url?: string; videoUrl?: string }>;
    const portal = portalSettings[portalKey] ?? {};
    res.json({ allowed: true, portalUrl: portal.url ?? '', transitionVideoUrl: portal.videoUrl ?? '' });
  } catch (error) {
    next(error);
  }
});

app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  res.status(500).json({ error: message });
});

await migrate();
app.listen(port, '0.0.0.0', () => {
  console.log(`Occu-Med portal server listening on port ${port}`);
});
