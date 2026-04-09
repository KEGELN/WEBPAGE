import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Pool } from 'pg';

function getArgs() {
  const args = process.argv.slice(2);
  const source = args.includes('--source') ? args[args.indexOf('--source') + 1] : 'all';
  return { source };
}

function getConnectionString(source) {
  if (source === 'training') {
    return process.env.DATABASE_URL;
  }
  if (source === 'mirror') {
    return process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL;
  }
  return null;
}

async function applySchema(source, fileName) {
  const connectionString = getConnectionString(source);
  if (!connectionString) {
    throw new Error(`${source === 'training' ? 'DATABASE_URL' : 'MIRROR_DATABASE_URL or DATABASE_URL'} is not configured`);
  }

  const sqlPath = path.join(process.cwd(), 'db', fileName);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log(`Applied ${fileName} to ${source} database.`);
  } finally {
    await pool.end();
  }
}

async function main() {
  const { source } = getArgs();
  if (source === 'training' || source === 'all') {
    await applySchema('training', 'training-postgres.sql');
  }
  if (source === 'mirror' || source === 'all') {
    await applySchema('mirror', 'mirror-postgres.sql');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
