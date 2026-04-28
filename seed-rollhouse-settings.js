#!/usr/bin/env node

/**
 * seed-rollhouse-settings.js
 * ──────────────────────────────────────────────────────────────
 * Inserta / actualiza los ajustes del negocio ROLL HOUSE en la
 * tabla  <schema>.settings  para pruebas de impresión de ticket.
 *
 * Uso:
 *   node seed-rollhouse-settings.js              ← detecta el schema automáticamente
 *   node seed-rollhouse-settings.js roll_house   ← usa ese schema directamente
 * ──────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
import pg     from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Datos del negocio ─────────────────────────────────────────
const SETTINGS = {
  company_name:    'ROLL HOUSE',
  trade_name:      'ROLL HOUSE',
  ruc:             '1315614477001',
  address:         'Av. Gonzales Suarez y Manabí',
  city:            'Pedernales - Manabí',
  country:         'Ecuador',
  phone:           '0995903914',
  email:           '',
  tax_rate:        '15',
  currency:        'USD',
  currency_symbol: '$',
  receipt_footer:  'DOCUMENTO SIN VALIDEZ TRIBUTARIA',
};

// ── Helpers ───────────────────────────────────────────────────
const hr  = () => console.log('─'.repeat(52));
const ok  = (msg) => console.log(`  ✓  ${msg}`);
const err = (msg) => console.error(`  ✗  ${msg}`);

async function findSchema(client, argSchema) {
  if (argSchema) return argSchema;

  // Buscar el negocio por nombre en el plano de control
  const res = await client.query(
    `SELECT schema_name, name
     FROM public.businesses
     WHERE LOWER(name) LIKE $1
     ORDER BY created_at DESC
     LIMIT 5`,
    ['%roll%']
  );

  if (res.rows.length === 1) return res.rows[0].schema_name;

  if (res.rows.length > 1) {
    console.log('\nVarios negocios encontrados — elige el correcto:');
    res.rows.forEach((r, i) => console.log(`  [${i + 1}]  ${r.name}  →  schema: ${r.schema_name}`));
    console.log('\nVuelve a ejecutar pasando el schema como argumento:');
    console.log('  node seed-rollhouse-settings.js <schema_name>\n');
    process.exit(0);
  }

  // Fallback: listar todos los schemas disponibles
  const all = await client.query(
    `SELECT schema_name, name FROM public.businesses ORDER BY created_at DESC LIMIT 20`
  );

  console.log('\nNo se encontró "ROLL HOUSE". Schemas disponibles:');
  if (all.rows.length === 0) {
    console.log('  (ninguno — la tabla businesses está vacía)');
  } else {
    all.rows.forEach(r => console.log(`  • ${r.schema_name}  →  ${r.name}`));
  }
  console.log('\nEjecuta de nuevo indicando el schema:');
  console.log('  node seed-rollhouse-settings.js <schema_name>\n');
  process.exit(0);
}

async function upsertSettings(client, schema) {
  let inserted = 0, updated = 0;

  for (const [key, value] of Object.entries(SETTINGS)) {
    const res = await client.query(
      `INSERT INTO "${schema}".settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
         SET value = EXCLUDED.value,
             updated_at = NOW()
       RETURNING (xmax = 0) AS is_insert`,
      [key, value, `Configuración: ${key}`]
    );

    if (res.rows[0]?.is_insert) { inserted++; ok(`INSERT  ${key} = "${value}"`); }
    else                         { updated++;  ok(`UPDATE  ${key} = "${value}"`); }
  }

  return { inserted, updated };
}

// ── Main ──────────────────────────────────────────────────────
(async () => {
  const argSchema = process.argv[2] || null;
  const client = await pool.connect();

  try {
    hr();
    console.log('  ROLL HOUSE — seed de settings para impresión');
    hr();

    const schema = await findSchema(client, argSchema);
    console.log(`\n  Schema detectado: "${schema}"\n`);

    await client.query('BEGIN');
    const { inserted, updated } = await upsertSettings(client, schema);
    await client.query('COMMIT');

    hr();
    console.log(`\n  Listo: ${inserted} insertados, ${updated} actualizados`);
    console.log(`  Puedes imprimir un ticket de prueba desde la Caja / POS.\n`);

  } catch (e) {
    await client.query('ROLLBACK');
    err('Error ejecutando el script:');
    console.error(e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
