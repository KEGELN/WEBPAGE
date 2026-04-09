import { Pool } from 'pg';

declare global {
  var __kegelPools: Map<string, Pool> | undefined;
}

function getPoolCache() {
  if (!global.__kegelPools) {
    global.__kegelPools = new Map<string, Pool>();
  }
  return global.__kegelPools;
}

export function hasTrainingDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function hasMirrorDatabase() {
  return Boolean(process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL);
}

function getSslConfig() {
  if (process.env.PGSSL === 'disable') return false;
  if (process.env.PGSSLMODE) {
    return { sslmode: process.env.PGSSLMODE as 'require' | 'verify-ca' | 'verify-full' };
  }
  return { rejectUnauthorized: false };
}

function createPool(connectionString: string) {
  const cache = getPoolCache();
  const cached = cache.get(connectionString);
  if (cached) return cached;

  const isVercel = process.env.VERCEL === '1';
  const isSupabase = connectionString.includes('supabase') || process.env.NEXT_PUBLIC_SUPABASE_URL;

  const poolConfig: Parameters<Pool>[0] = {
    connectionString,
    ssl: getSslConfig(),
    max: isVercel ? 2 : 5,
    idleTimeoutMillis: isVercel ? 10000 : 30000,
    connectionTimeoutMillis: isVercel ? 5000 : 10000,
  };

  if (isSupabase) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolConfig);
  cache.set(connectionString, pool);
  return pool;
}

export function getTrainingPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  return createPool(connectionString);
}

export function getMirrorPool() {
  const connectionString = process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('MIRROR_DATABASE_URL or DATABASE_URL is not configured');
  }
  return createPool(connectionString);
}
