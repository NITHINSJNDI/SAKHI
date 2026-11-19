/**
 * Unified per-user data store for Her Mode, Mom Mode and the dashboards.
 *
 * Primary backend: PostgreSQL table `user_documents` (one JSONB document per
 * user per kind). No size limit, survives browser changes, works across devices.
 *
 * Fallback 1 (no DATABASE_URL, running locally): a JSON file under .data/
 * (override with SAKHI_DATA_DIR). Keeps full history for laptop demos.
 * Fallback 2 (serverless without a database): httpOnly cookies named
 * `sakhi_<kind>_<owner>`, the names the app used before, trimmed to fit ~4 KB.
 * Whenever a persistent backend is available, any legacy cookie found is
 * imported into it once and then deleted.
 *
 * Identity: signed-in users are keyed by email. Signed-out visitors get a random
 * `sakhi_guest_id` (httpOnly) so guests never share one bucket of data.
 */
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { authOptions } from '@/lib/auth';
import { getPool, isConnectionError, markDbUnavailable } from '@/lib/db';

export type DocKind =
  | 'her_profile'
  | 'daily_logs'
  | 'cycle_history'
  | 'preg_profile'
  | 'pregnancy_logs'
  | 'pregnancy_nutrition'
  | 'pregnancy_appointments'
  | 'appointments_month'
  | 'notifications'
  | 'consent'
  | 'relief_feedback'
  | 'chat_her'
  | 'chat_mom'
  | 'ai_usage'
  | 'weight_log'
  | 'lab_results'
  | 'tablets'
  | 'checklists'
  | 'family'
  | 'mood_checks'
  | 'postpartum'
  | 'her_goal'
  | 'meals'
  | 'hygiene';

export const ALL_KINDS: DocKind[] = [
  'her_profile', 'daily_logs', 'cycle_history', 'preg_profile', 'pregnancy_logs',
  'pregnancy_nutrition', 'pregnancy_appointments', 'appointments_month', 'notifications', 'consent',
  'relief_feedback', 'chat_her', 'chat_mom', 'ai_usage', 'weight_log', 'lab_results',
  'tablets', 'checklists', 'family', 'mood_checks', 'postpartum', 'her_goal', 'meals', 'hygiene',
];

/** Kinds too large for a 4 KB cookie; without Postgres/file storage the browser keeps them. */
const NO_COOKIE: ReadonlySet<DocKind> = new Set(['chat_her', 'chat_mom']);

const YEAR = 60 * 60 * 24 * 365;
const GUEST_COOKIE = 'sakhi_guest_id';

export const secureCookie = (maxAge = YEAR) => ({
  path: '/',
  maxAge,
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
});

export interface Owner {
  /** database key, e.g. "user:a@b.com" or "guest:<uuid>" */
  key: string;
  /** cookie-safe id used in legacy cookie names */
  cookieId: string;
  email: string | null;
  name: string | null;
  isGuest: boolean;
  userId?: number | null;
  userUuid?: string | null;
}

/** Resolve who the current request belongs to (creates a guest id if needed). */
export async function getOwner(): Promise<Owner> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email || null;
  if (email) {
    const cleanEmail = email.toLowerCase().trim();
    let userId: number | null = null;
    let userUuid: string | null = null;

    try {
      const pool = await getPool();
      if (pool) {
        const { rows } = await pool.query(
          "SELECT id, uuid, name, full_name FROM users WHERE LOWER(email) = $1 LIMIT 1",
          [cleanEmail]
        );
        if (rows.length > 0) {
          userId = rows[0].id;
          userUuid = rows[0].uuid;
        }
      }
    } catch (e: any) {
      console.error("[getOwner] DB lookup failed:", e?.message);
    }

    return {
      key: `user:${cleanEmail}`,
      cookieId: cleanEmail.replace(/[^a-zA-Z0-9]/g, '_'),
      email: cleanEmail,
      name: session?.user?.name || null,
      isGuest: false,
      userId,
      userUuid,
    };
  }
  const store = await cookies();
  let guestId = store.get(GUEST_COOKIE)?.value;
  if (!guestId || !/^[a-zA-Z0-9-]{8,64}$/.test(guestId)) {
    guestId = randomUUID();
    store.set(GUEST_COOKIE, guestId, secureCookie());
  }
  return {
    key: `guest:${guestId}`,
    cookieId: `guest_${guestId.replace(/[^a-zA-Z0-9]/g, '')}`,
    email: null,
    name: null,
    isGuest: true,
    userId: null,
    userUuid: null,
  };
}


// ------------------------------------------------------------ file backend

const DATA_DIR = process.env.SAKHI_DATA_DIR || path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'sakhi-store.json');
let fileUsable: Promise<boolean> | null = null;
let fileCache: Record<string, Record<string, any>> | null = null;
let fileWrite: Promise<void> = Promise.resolve();

function fileBackendUsable() {
  if (!fileUsable) {
    fileUsable = (async () => {
      // Serverless filesystems are read-only/ephemeral; never use a file there
      if (process.env.VERCEL || process.env.SAKHI_DISABLE_FILE_STORE === '1') return false;
      try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        await fs.access(DATA_DIR);
        return true;
      } catch {
        return false;
      }
    })();
  }
  return fileUsable;
}

async function loadFile() {
  if (fileCache) return fileCache;
  try {
    fileCache = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  } catch {
    fileCache = {};
  }
  return fileCache!;
}

function saveFile() {
  // Serialize writes; write to a temp file then rename so a crash can't corrupt it
  fileWrite = fileWrite.then(async () => {
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(fileCache || {}), 'utf-8');
    await fs.rename(tmp, DATA_FILE);
  }).catch(err => console.error('[store] file write failed:', err?.message));
  return fileWrite;
}

const fileBackend = {
  async get(owner: Owner, kind: DocKind) {
    const db = await loadFile();
    return db[owner.key] && kind in db[owner.key] ? { found: true, value: db[owner.key][kind] } : { found: false, value: undefined };
  },
  async set(owner: Owner, kind: DocKind, value: any) {
    const db = await loadFile();
    db[owner.key] = { ...(db[owner.key] || {}), [kind]: value ?? null };
    await saveFile();
  },
  async deleteAll(owner: Owner) {
    const db = await loadFile();
    delete db[owner.key];
    await saveFile();
  },
};

let tableReady: Promise<void> | null = null;

async function ensureTable() {
  const pool = await getPool();
  if (!pool) return null;
  if (!tableReady) {
    tableReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS user_documents (
          owner_key TEXT NOT NULL,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          kind VARCHAR(64) NOT NULL,
          data JSONB,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (owner_key, kind)
        );
        ALTER TABLE user_documents ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_user_documents_user_id ON user_documents(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_documents_owner_key ON user_documents(owner_key);
      `)
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        markDbUnavailable(err);
        throw err;
      });
  }
  await tableReady;
  return pool;
}

const cookieName = (kind: DocKind, owner: Owner) => `sakhi_${kind}_${owner.cookieId}`;

function parse<T>(raw: string | undefined, fallback: T): T {
  if (raw === undefined) return fallback;
  try {
    const v = JSON.parse(raw);
    return v === null || v === undefined ? fallback : v;
  } catch {
    return fallback;
  }
}

/** Where data is stored for this request. */
export async function storageMode(): Promise<'postgres' | 'file' | 'cookie'> {
  try {
    if (await ensureTable()) return 'postgres';
  } catch { /* fall through */ }
  return (await fileBackendUsable()) ? 'file' : 'cookie';
}

export async function readDoc<T>(kind: DocKind, fallback: T, owner?: Owner): Promise<T> {
  const who = owner || (await getOwner());
  const store = await cookies();
  const legacy = store.get(cookieName(kind, who))?.value;

  let pool = null;
  try {
    pool = await ensureTable();
  } catch (err: any) {
    console.error('[store] Postgres unavailable, using cookie fallback:', err?.message);
  }
  if (!pool) {
    if (await fileBackendUsable()) {
      const hit = await fileBackend.get(who, kind);
      if (hit.found) return (hit.value ?? fallback) as T;
      if (legacy !== undefined) {
        const value = parse<T>(legacy, fallback);
        await fileBackend.set(who, kind, value);
        try { store.delete(cookieName(kind, who)); } catch { /* read-only context */ }
        return value;
      }
      return fallback;
    }
    return parse(legacy, fallback);
  }

  try {
    const { rows } = await pool.query(
      `SELECT data FROM user_documents 
       WHERE (owner_key = $1 OR (user_id IS NOT NULL AND user_id = $2)) AND kind = $3 
       ORDER BY updated_at DESC LIMIT 1`,
      [who.key, who.userId ?? -1, kind]
    );
    if (rows.length > 0) return (rows[0].data ?? fallback) as T;

    // One-time migration of data saved in the old cookie format
    if (legacy !== undefined) {
      const value = parse<T>(legacy, fallback);
      await writeDoc(kind, value, who);
      try { store.delete(cookieName(kind, who)); } catch { /* read-only context */ }
      return value;
    }
    return fallback;
  } catch (err: any) {
    if (isConnectionError(err)) markDbUnavailable(err);
    console.error(`[store] read ${kind} failed:`, err?.message);
    return parse(legacy, fallback);
  }
}

async function syncRelationalTables(userId: number, kind: DocKind, value: any, pool: any) {
  if (!userId || !value) return;

  if (kind === 'her_profile' && typeof value === 'object') {
    const cleanConditions = Array.isArray(value.diagnosed_conditions) ? value.diagnosed_conditions : [];
    await pool.query(
      `INSERT INTO user_health_profiles (
        user_id, preferred_name, last_period_start, last_period_end,
        period_duration, cycle_length_avg, cycle_regularity, diagnosed_conditions, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        preferred_name = EXCLUDED.preferred_name,
        last_period_start = EXCLUDED.last_period_start,
        last_period_end = EXCLUDED.last_period_end,
        period_duration = EXCLUDED.period_duration,
        cycle_length_avg = EXCLUDED.cycle_length_avg,
        cycle_regularity = EXCLUDED.cycle_regularity,
        diagnosed_conditions = EXCLUDED.diagnosed_conditions,
        updated_at = NOW()`,
      [
        userId,
        value.preferred_name || null,
        value.last_period_start ? String(value.last_period_start).split('T')[0] : null,
        value.last_period_end ? String(value.last_period_end).split('T')[0] : null,
        parseInt(value.period_duration) || 5,
        parseInt(value.cycle_length || value.cycle_length_avg) || 28,
        value.cycle_regularity || 'Regular',
        cleanConditions,
      ]
    );
  } else if (kind === 'daily_logs' && Array.isArray(value)) {
    for (const log of value.slice(-10)) {
      if (!log || !log.log_date) continue;
      const dayStr = String(log.log_date).split('T')[0];
      const symptoms = Array.isArray(log.symptoms) ? log.symptoms : [log.symptoms || 'None'];
      const warningSigns = Array.isArray(log.warning_signs) ? log.warning_signs : [];
      await pool.query(
        `INSERT INTO daily_health_logs (
          user_id, log_date, on_period, flow_intensity, cramps_severity,
          symptoms, mood, sleep_hours, water_consumed, exercised, warning_signs, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (user_id, log_date) DO UPDATE SET
          on_period = EXCLUDED.on_period,
          flow_intensity = EXCLUDED.flow_intensity,
          cramps_severity = EXCLUDED.cramps_severity,
          symptoms = EXCLUDED.symptoms,
          mood = EXCLUDED.mood,
          sleep_hours = EXCLUDED.sleep_hours,
          water_consumed = EXCLUDED.water_consumed,
          exercised = EXCLUDED.exercised,
          warning_signs = EXCLUDED.warning_signs,
          notes = EXCLUDED.notes`,
        [
          userId,
          dayStr,
          Boolean(log.on_period),
          log.flow_intensity || 'None',
          Number(log.cramps_severity) || 0,
          symptoms,
          log.mood || 'Calm',
          Number(log.sleep_hours) || 7.5,
          log.water_consumed || '1.5-2L',
          Boolean(log.exercised),
          warningSigns,
          log.notes || null,
        ]
      );
    }
  } else if (kind === 'pregnancy_appointments' && Array.isArray(value)) {
    for (const apt of value) {
      if (!apt || !apt.name) continue;
      const aptDate = apt.date && /^\d{4}-\d{2}-\d{2}/.test(apt.date) ? apt.date.split('T')[0] : new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO appointments (user_id, title, appointment_date, completed, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [userId, apt.name, aptDate, Boolean(apt.completed), apt.notes || null]
      );
    }
  } else if (kind === 'tablets' && typeof value === 'object' && Array.isArray(value.list)) {
    for (const tab of value.list) {
      if (!tab || !tab.name) continue;
      await pool.query(
        `INSERT INTO medications (user_id, name, dosage, frequency, active, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, tab.name, tab.dose || tab.dosage || null, tab.schedule || tab.frequency || null, tab.active !== false, tab.notes || null]
      );
    }
  }
}

export async function writeDoc<T>(kind: DocKind, value: T, owner?: Owner): Promise<void> {
  const who = owner || (await getOwner());
  let pool = null;
  try {
    pool = await ensureTable();
  } catch (err: any) {
    console.error('[store] Postgres unavailable, using cookie fallback:', err?.message);
  }
  if (pool) {
    try {
      await pool.query(
        `INSERT INTO user_documents (owner_key, user_id, kind, data, updated_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())
         ON CONFLICT (owner_key, kind) DO UPDATE SET 
           user_id = COALESCE(EXCLUDED.user_id, user_documents.user_id),
           data = EXCLUDED.data, 
           updated_at = NOW()`,
        [who.key, who.userId ?? null, kind, JSON.stringify(value ?? null)]
      );

      if (who.userId) {
        await syncRelationalTables(who.userId, kind, value, pool).catch((err: any) =>
          console.error(`[store] syncRelationalTables ${kind} error:`, err?.message)
        );
      }
      return;
    } catch (err: any) {
      if (isConnectionError(err)) markDbUnavailable(err);
      console.error(`[store] write ${kind} failed, using fallback:`, err?.message);
      pool = null;
    }
  }
  if (!pool && (await fileBackendUsable())) {
    await fileBackend.set(who, kind, value);
    return;
  }
  if (NO_COOKIE.has(kind)) return;
  const store = await cookies();
  const serialized = JSON.stringify(value ?? null);
  if (serialized.length > 3800) {
    // Browsers drop cookies over ~4 KB. Keep the newest entries of list data.
    if (Array.isArray(value)) {
      let trimmed = value.slice();
      while (trimmed.length > 1 && JSON.stringify(trimmed).length > 3800) trimmed = trimmed.slice(1);
      console.warn(`[store] ${kind} trimmed to ${trimmed.length} entries to fit a cookie. Set DATABASE_URL for full history.`);
      store.set(cookieName(kind, who), JSON.stringify(trimmed), secureCookie());
      return;
    }
    console.warn(`[store] ${kind} exceeds cookie size; set DATABASE_URL to persist it.`);
  }
  store.set(cookieName(kind, who), serialized, secureCookie());
}

/** Merge fields into an object document. */
export async function patchDoc(kind: DocKind, patch: Record<string, any>, owner?: Owner) {
  const who = owner || (await getOwner());
  const current = await readDoc<Record<string, any>>(kind, {}, who);
  const next = { ...(current && typeof current === 'object' ? current : {}), ...patch };
  await writeDoc(kind, next, who);
  return next;
}

/** Read every document for export. */
export async function readAllDocs(owner?: Owner) {
  const who = owner || (await getOwner());
  const out: Record<string, any> = {};
  for (const kind of ALL_KINDS) out[kind] = await readDoc(kind, null, who);
  return out;
}

/** Reassign documents created during a guest session to the newly signed-in user. */
export async function claimGuestDocuments(guestOwner: Owner, userOwner: Owner): Promise<void> {
  if (!guestOwner.isGuest || userOwner.isGuest || !userOwner.userId) return;
  const pool = await getPool();
  if (!pool) return;
  try {
    // Reassign guest documents to the user if user does not already have that document
    await pool.query(
      `UPDATE user_documents 
       SET owner_key = $1, user_id = $2, updated_at = NOW()
       WHERE owner_key = $3
       AND kind NOT IN (SELECT kind FROM user_documents WHERE owner_key = $1 OR user_id = $2)`,
      [userOwner.key, userOwner.userId, guestOwner.key]
    );
    // Delete duplicate or leftover guest records
    await pool.query('DELETE FROM user_documents WHERE owner_key = $1', [guestOwner.key]);
  } catch (err: any) {
    console.error('[store] claimGuestDocuments error:', err?.message);
  }
}

/** Delete every document (and legacy cookie) for this owner. */
export async function deleteAllDocs(owner?: Owner) {
  const who = owner || (await getOwner());
  const store = await cookies();
  for (const kind of ALL_KINDS) store.delete(cookieName(kind, who));
  try {
    const pool = await ensureTable();
    if (pool) {
      if (who.userId) {
        await pool.query('DELETE FROM user_documents WHERE owner_key = $1 OR user_id = $2', [who.key, who.userId]);
      } else {
        await pool.query('DELETE FROM user_documents WHERE owner_key = $1', [who.key]);
      }
    }
  } catch (err: any) {
    console.error('[store] delete failed:', err?.message);
  }
  if (await fileBackendUsable()) await fileBackend.deleteAll(who);
}
