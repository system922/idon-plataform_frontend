#!/usr/bin/env node
import dotenv from 'dotenv';
import { query } from './src/config/database.js';

dotenv.config({ path: '.env' });

(async () => {
  try {
    console.log('\n🗑️  LIMPIANDO TODA LA BASE DE DATOS\n');

    // Obtener y eliminar TODOS los esquemas excepto public e information_schema
    const schemasResult = await query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('public', 'information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `);

    console.log('📌 Eliminando esquemas de negocios...');
    for (const row of schemasResult.rows) {
      try {
        await query(`DROP SCHEMA IF EXISTS "${row.schema_name}" CASCADE`);
        console.log(`   ✅ Eliminado: ${row.schema_name}`);
      } catch (e) {
        console.log(`   ⚠️  Error en ${row.schema_name}: ${e.message}`);
      }
    }

    // Obtener y eliminar TODAS las tablas en public
    const tablesResult = await query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name DESC
    `);

    console.log('\n📌 Eliminando tablas públicas...');
    for (const row of tablesResult.rows) {
      try {
        await query(`DROP TABLE IF EXISTS public."${row.table_name}" CASCADE`);
        console.log(`   ✅ Eliminada: ${row.table_name}`);
      } catch (e) {
        console.log(`   ⚠️  Error en ${row.table_name}: ${e.message}`);
      }
    }

    console.log('\n✅ ✅ ✅ BASE DE DATOS COMPLETAMENTE LIMPIA\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
})();
