#!/usr/bin/env node

/**
 * SEED ADMIN USER
 * 
 * Inserta el usuario IDON como proveedor en admin_users
 * para poder loguearse normalmente
 * 
 * Uso: node seed-admin.js
 */

import dotenv from 'dotenv';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();
const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ ERROR: DATABASE_URL no está configurada\n');
  console.error('💡 Configura la variable de entorno:\n');
  console.error('   $env:DATABASE_URL = "tu_connection_string_aqui"\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: dbUrl
});

async function seedAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('👤 CREANDO USUARIOS ADMIN IDON\n');
    console.log('📊 Conexión: Neon PostgreSQL');
    console.log(`   ${dbUrl.split('@')[1] || 'verificando...'}\n`);
    
    // Definir usuarios a crear
    const users = [
      {
        email: 'admin@idon.com',
        password: 'Admin_idon2026.',
        firstName: 'Administrador',
        lastName: 'IDON',
        role: 'super_admin'
      },
      {
        email: 'soporte@idon.com',
        password: 'Soporte_idon2026.',
        firstName: 'Soporte',
        lastName: 'IDON',
        role: 'admin'
      }
    ];
    
    console.log('📝 Usuarios a crear:\n');
    for (const user of users) {
      console.log(`   • ${user.firstName} ${user.lastName} (${user.email}) - Rol: ${user.role}`);
    }
    console.log();
    
    // Primero, eliminar usuarios existentes para recrearlos con contraseñas hasheadas
    console.log('🗑️  Eliminando usuarios existentes...\n');
    for (const user of users) {
      await client.query(
        'DELETE FROM public.admin_users WHERE email = $1',
        [user.email]
      );
    }
    
    // Crear cada usuario
    let createdCount = 0;
    for (const userData of users) {
      try {
        // Hashear contraseña con bcrypt
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Insertar usuario
        const result = await client.query(
          `INSERT INTO public.admin_users 
           (email, password_hash, first_name, last_name, role, is_active) 
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, first_name, last_name, role`,
          [
            userData.email,
            hashedPassword,
            userData.firstName,
            userData.lastName,
            userData.role,
            true
          ]
        );
        
        const user = result.rows[0];
        
        console.log('✅ USUARIO CREADO');
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Nombre: ${user.first_name} ${user.last_name}`);
        console.log(`   - Rol: ${user.role}`);
        console.log(`   - Password: ${userData.password}\n`);
        
        createdCount++;
      } catch (err) {
        console.log(`❌ Error al crear ${userData.email}: ${err.message}\n`);
      }
    }
    
    console.log(`\n✅ RESUMEN: ${createdCount} usuarios creados\n`);
    console.log('🔑 Credenciales de login:\n');
    console.log('   Usuario Admin:');
    console.log('      Email: admin@idon.com');
    console.log('      Password: Admin_idon2026.\n');
    console.log('   Usuario Soporte:');
    console.log('      Email: soporte@idon.com');
    console.log('      Password: Soporte_idon2026.\n');
    console.log('🚀 Ya puedes loguearte normalmente\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:\n', error.message);
    process.exit(1);
  } finally {
    client.release?.();
    await pool.end();
    process.exit(0);
  }
}

seedAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
