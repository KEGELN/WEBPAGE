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
  
  const poolConfig: PoolConfig = {
    connectionString,
    max: isVercel ? 2 : 5,
    idleTimeoutMillis: isVercel ? 10000 : 30000,
    connectionTimeoutMillis: isVercel ? 5000 : 10000,
    // Supabase and most cloud providers require SSL. 
    // We disable certificate validation because Supabase uses self-signed/internal CA certificates for the direct pooler.
    ssl: {
      rejectUnauthorized: false,
    },
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
