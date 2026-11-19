import { Pool } from 'pg';

// Preserve PostgreSQL pool and circuit-breaker across Next.js dev server reloads
const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
  pgInitPromise?: Promise<void> | null;
  pgDownUntil?: number;
  pgConnError?: string | null;
};

let pool: Pool | null = globalForPg.pgPool || null;
let isMockMode = false;
let connectionError: string | null = globalForPg.pgConnError || null;

// Graceful Mock Database Store (for fallback)
const mockDb = {
  users: [] as any[],
  cycleLogs: [] as any[],
  triageLogs: [] as any[],
  wellnessLogs: [] as any[],
};

// Initialize pool if DATABASE_URL is available
if (!pool) {
  if (process.env.DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // 10s connection timeout for reliable cross-region pooler
        ssl: process.env.DATABASE_URL.includes('supabase') || process.env.DATABASE_URL.includes('neon.tech') 
          ? { rejectUnauthorized: false } 
          : undefined
      });
      globalForPg.pgPool = pool;
    } catch (err: any) {
      console.error("Failed to initialize PostgreSQL pool:", err.message);
      connectionError = err.message;
    }
  } else {
    console.log("No DATABASE_URL found. Running in Graceful Mock Mode.");
    isMockMode = true;
    connectionError = "No DATABASE_URL configured in environment variables.";
  }
}

// Circuit breaker: when the database is unreachable, pause briefly instead of paying timeout
const DOWN_MS = 15_000;
let downUntil = globalForPg.pgDownUntil || 0;

const CONNECTION_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', '28P01', '28000', '3D000', '57P01', '57P03', 'XX000']);
export function isConnectionError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase();
  return CONNECTION_CODES.has(err?.code) || /timeout|terminated|not found|getaddrinfo|connect|tenant|password authentication/.test(msg);
}

export function markDbUnavailable(err: any) {
  downUntil = Date.now() + DOWN_MS;
  globalForPg.pgDownUntil = downUntil;
  connectionError = err?.message || String(err);
  globalForPg.pgConnError = connectionError;
}

export function dbAvailable(): boolean {
  return !isMockMode && Boolean(pool) && Date.now() >= downUntil;
}

// Check database connection status
export async function getDbStatus() {
  if (isMockMode || !pool) {
    return { connected: false, mode: 'Mock/Demo', error: connectionError };
  }
  try {
    const client = await pool.connect();
    client.release();
    return { connected: true, mode: 'PostgreSQL', error: null };
  } catch (err: any) {
    console.error("PostgreSQL connection check failed:", err.message);
    return { connected: false, mode: 'Mock/Demo (Fallback)', error: err.message };
  }
}

// Run the schema migration at most once per server process.
let initPromise: Promise<void> | null = globalForPg.pgInitPromise || null;

/**
 * Returns the shared PostgreSQL pool after making sure tables exist,
 * or null when running in mock mode. Use this instead of creating new Pools.
 */
export async function getPool(): Promise<Pool | null> {
  if (!dbAvailable()) return null;
  if (!initPromise) {
    initPromise = initDatabase()
      .then(() => {
        globalForPg.pgInitPromise = initPromise;
      })
      .catch((err) => {
        console.error("Database initialization failed:", err?.message || err);
        markDbUnavailable(err);
        initPromise = null;
        globalForPg.pgInitPromise = null;
      });
  }
  await initPromise;
  return dbAvailable() ? pool : null;
}

// Schema Migration
export async function initDatabase() {
  if (isMockMode || !pool) return;

  let client;
  try {
    client = await pool.connect();
  } catch (err: any) {
    console.error("PostgreSQL connection failed during initDatabase:", err?.message || err);
    markDbUnavailable(err);
    return;
  }

  try {
    await client.query('BEGIN');

    // Create or Upgrade Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uuid UUID DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        full_name VARCHAR(255),
        image VARCHAR(255),
        password_hash TEXT,
        auth_provider VARCHAR(50) DEFAULT 'google',
        phone_number VARCHAR(50),
        age INTEGER,
        bmi NUMERIC(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'google';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
    `);

    // Ensure unique constraint on users.uuid
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'users_uuid_key'
        ) THEN
          ALTER TABLE users ADD CONSTRAINT users_uuid_key UNIQUE (uuid);
        END IF;
      END $$;
    `);

    // Sync full_name with name
    await client.query(`
      UPDATE users SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;
    `);

    // Create or Upgrade User Documents Table (JSONB Store with foreign key user_id)
    await client.query(`
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
    `);

    // Create User Health Profiles (One-Time Onboarding)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_health_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        preferred_name VARCHAR(255),
        last_period_start DATE,
        last_period_end DATE,
        period_duration INTEGER,
        cycle_length_avg INTEGER,
        cycle_regularity VARCHAR(50),
        diagnosed_conditions TEXT[],
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'user_health_profiles_user_id_key'
        ) THEN
          ALTER TABLE user_health_profiles ADD CONSTRAINT user_health_profiles_user_id_key UNIQUE (user_id);
        END IF;
      END $$;
    `);

    // Create Daily Health Logs (Check-ins)
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_health_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        on_period BOOLEAN DEFAULT false,
        flow_intensity VARCHAR(50),
        cramps_severity INTEGER DEFAULT 0,
        symptoms TEXT[],
        mood VARCHAR(50),
        sleep_hours NUMERIC(4,2),
        water_consumed VARCHAR(50),
        exercised BOOLEAN DEFAULT false,
        warning_signs TEXT[],
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'daily_health_logs_user_date_key'
        ) THEN
          ALTER TABLE daily_health_logs ADD CONSTRAINT daily_health_logs_user_date_key UNIQUE (user_id, log_date);
        END IF;
      END $$;
    `);

    // Create Appointments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(50),
        doctor_name VARCHAR(255),
        clinic_name VARCHAR(255),
        notes TEXT,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments (user_id);
    `);

    // Create Medications Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100),
        frequency VARCHAR(100),
        time_of_day VARCHAR(100),
        active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_medications_user_id ON medications (user_id);
    `);

    // Create Cycle Logs Table (Legacy)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cycle_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        start_date DATE NOT NULL,
        end_date DATE,
        cycle_length INTEGER,
        period_length INTEGER,
        flow_intensity VARCHAR(50),
        cramp_severity INTEGER DEFAULT 0,
        bloating_severity INTEGER DEFAULT 0,
        headache_severity INTEGER DEFAULT 0,
        fatigue_severity INTEGER DEFAULT 0,
        acne_severity INTEGER DEFAULT 0,
        stress_level INTEGER DEFAULT 0,
        sleep_hours NUMERIC(4,2),
        exercise_frequency VARCHAR(50),
        diet VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Triage Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS triage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE DEFAULT CURRENT_DATE,
        urgency VARCHAR(50),
        reasons TEXT[],
        suspected_profiles TEXT[],
        advice TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Wellness Logs Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS wellness_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        log_date DATE NOT NULL,
        mood VARCHAR(50),
        sleep_hours NUMERIC(4,2),
        stress_level INTEGER,
        anxiety BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Enable Row Level Security (RLS) for Supabase security compliance
    await client.query(`
      ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.user_health_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE IF EXISTS public.daily_health_logs ENABLE ROW LEVEL SECURITY;
    `);

    await client.query('COMMIT');
    console.log("PostgreSQL database tables initialized successfully.");
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error("Database migration error:", err.message);
    markDbUnavailable(err);
  } finally {
    try { client.release(); } catch {}
  }
}

// Query helper that handles database queries and gracefully switches to mock store
export async function query(text: string, params?: any[]) {
  if (!dbAvailable() || !pool) {
    return mockQuery(text, params);
  }
  try {
    return await pool.query(text, params);
  } catch (err: any) {
    if (isConnectionError(err)) markDbUnavailable(err);
    console.error("PostgreSQL query failed. Falling back to mock store for this operation. Error:", err.message);
    return mockQuery(text, params);
  }
}

// Mock Query Implementation for Local Demo fallback
function mockQuery(text: string, params?: any[]) {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ');
  
  // 1. SELECT <cols> FROM users WHERE email = $1
  if (/^select .* from users where email =/.test(normalized.trim())) {
    const email = params ? params[0] : '';
    const user = mockDb.users.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }

  // 2. INSERT INTO users (email, name, image) VALUES ($1, $2, $3) [RETURNING *]
  if (normalized.includes('insert into users')) {
    const email = params ? params[0] : '';
    const name = params ? params[1] : '';
    const image = params ? params[2] : '';
    let user = mockDb.users.find(u => u.email === email);
    if (!user) {
      user = {
        id: mockDb.users.length + 1,
        email,
        name,
        image,
        age: params && params.length > 3 ? params[3] : null,
        bmi: params && params.length > 4 ? params[4] : null,
        created_at: new Date()
      };
      mockDb.users.push(user);
    }
    return { rows: [user] };
  }

  // 3. UPDATE users SET age = $1, bmi = $2 WHERE (id|email) = $3
  if (normalized.includes('update users set age')) {
    const age = params ? params[0] : null;
    const bmi = params ? params[1] : null;
    const key = params ? params[2] : null;
    const byEmail = normalized.includes('where email =');
    const user = mockDb.users.find(u => (byEmail ? u.email === key : u.id === key));
    if (user) {
      user.age = age;
      user.bmi = bmi;
    }
    return { rows: user ? [user] : [] };
  }

  // 3b. UPDATE users SET name = COALESCE($1, name), image = COALESCE($2, image) WHERE email = $3
  if (normalized.includes('update users set name')) {
    const user = mockDb.users.find(u => u.email === (params ? params[2] : null));
    if (user) {
      if (params?.[0]) user.name = params[0];
      if (params?.[1]) user.image = params[1];
    }
    return { rows: user ? [user] : [] };
  }

  // 4. SELECT * FROM cycle_logs WHERE user_id = $1 ORDER BY start_date DESC
  if (normalized.includes('select * from cycle_logs where user_id =')) {
    const userId = params ? params[0] : null;
    const logs = mockDb.cycleLogs
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    return { rows: logs };
  }

  // 5. INSERT INTO cycle_logs
  if (normalized.includes('insert into cycle_logs')) {
    const log = {
      id: mockDb.cycleLogs.length + 1,
      user_id: params ? params[0] : null,
      start_date: params ? params[1] : null,
      end_date: params ? params[2] : null,
      cycle_length: params ? params[3] : null,
      period_length: params ? params[4] : null,
      flow_intensity: params ? params[5] : null,
      cramp_severity: params ? params[6] : 0,
      bloating_severity: params ? params[7] : 0,
      headache_severity: params ? params[8] : 0,
      fatigue_severity: params ? params[9] : 0,
      acne_severity: params ? params[10] : 0,
      stress_level: params ? params[11] : 0,
      sleep_hours: params ? params[12] : null,
      exercise_frequency: params ? params[13] : null,
      diet: params ? params[14] : null,
      created_at: new Date()
    };
    mockDb.cycleLogs.push(log);
    return { rows: [log] };
  }

  // 6. SELECT * FROM triage_logs WHERE user_id = $1 ORDER BY log_date DESC
  if (normalized.includes('select * from triage_logs where user_id =')) {
    const userId = params ? params[0] : null;
    const logs = mockDb.triageLogs
      .filter(l => l.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { rows: logs };
  }

  // 7. INSERT INTO triage_logs
  if (normalized.includes('insert into triage_logs')) {
    // The log_date may be passed as a parameter or inlined as CURRENT_DATE
    const p = params || [];
    const dateInlined = normalized.includes('current_date');
    const offset = dateInlined ? 0 : 1;
    const log = {
      id: mockDb.triageLogs.length + 1,
      user_id: p[0] ?? null,
      log_date: dateInlined ? new Date().toISOString().split('T')[0] : p[1],
      urgency: p[1 + offset] ?? 'NORMAL',
      reasons: p[2 + offset] ?? [],
      suspected_profiles: p[3 + offset] ?? [],
      advice: p[4 + offset] ?? '',
      created_at: new Date()
    };
    mockDb.triageLogs.push(log);
    return { rows: [log] };
  }

  return { rows: [] };
}
