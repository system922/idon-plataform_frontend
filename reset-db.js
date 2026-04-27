import pkg from 'pg';
const { Pool } = pkg;
import env from './src/config/env.js';

const pool = new Pool({
  connectionString: env.database.connectionString,
});

async function resetDatabase() {
  const client = await pool.connect();
  try {
    console.log('Dropping all public schema objects...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
    `);
    console.log('✓ Database schema reset complete');
  } catch (error) {
    console.error('Error resetting database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase().catch(err => {
  console.error(err);
  process.exit(1);
});
