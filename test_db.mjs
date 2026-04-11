import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local' });
const pool = new Pool({
  connectionString: process.env.MIRROR_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
async function test() {
  try {
    const res = await pool.query("SELECT season_id, league_id, sort_key, count(*) FROM standings_snapshots GROUP BY 1,2,3");
    console.log("DB Data:", res.rows);
  } catch (e) {
    console.error("DB Error:", e);
  } finally {
    await pool.end();
  }
}
test();
