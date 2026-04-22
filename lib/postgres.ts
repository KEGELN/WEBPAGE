import { Pool, PoolConfig } from 'pg';

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

function createPool(connectionString: string) {
  const cache = getPoolCache();
  const cached = cache.get(connectionString);
  if (cached) return cached;

  const isVercel = process.env.VERCEL === '1';

  // Strip sslmode from the connection string — letting it coexist with the ssl
  // config object causes pg to use Node's TLS chain validation which fails on
  // Supabase's pooler self-signed cert. We handle SSL entirely via the config.
  const cleanConnectionString = connectionString.replace(/[?&]sslmode=[^&]*/g, (m) =>
    m.startsWith('?') ? '?' : ''
  ).replace(/\?$/, '');

  const poolConfig: PoolConfig = {
    connectionString: cleanConnectionString,
    max: isVercel ? 2 : 5,
    idleTimeoutMillis: isVercel ? 10000 : 30000,
    connectionTimeoutMillis: isVercel ? 5000 : 10000,
    ssl: { rejectUnauthorized: false },
  };

  const pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
  });

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
