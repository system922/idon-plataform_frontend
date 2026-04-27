const { pool, closePool } = require('./src/db/neonConfig');

async function seedModulesAndFeatures() {
  const client = await pool.connect();

  // Helpers
  const upsertBusinessType = async ({ code, name, description }) => {
    const { rows } = await client.query(
      `
      INSERT INTO public.business_types (code, name, description, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_active = true
      RETURNING id
      `,
      [code, name, description]
    );
    return rows[0].id;
  };

  const upsertModule = async ({ code, name, description }) => {
    const { rows } = await client.query(
      `
      INSERT INTO public.modules (code, name, description, is_active)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_active = true
      RETURNING id
      `,
      [code, name, description]
    );
    return rows[0].id;
  };

  const upsertFeature = async ({ code, name, description, tier }) => {
    const { rows } = await client.query(
      `
      INSERT INTO public.features (code, name, description, tier, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            tier = EXCLUDED.tier,
            is_active = true
      RETURNING id
      `,
      [code, name, description, tier]
    );
    return rows[0].id;
  };

  const ensureBusinessTypeModule = async ({ businessTypeId, moduleId, isDefault }) => {
    await client.query(
      `
      INSERT INTO public.business_type_modules (business_type_id, module_id, is_default)
      VALUES ($1, $2, $3)
      ON CONFLICT (business_type_id, module_id)
      DO UPDATE SET is_default = EXCLUDED.is_default
      `,
      [businessTypeId, moduleId, isDefault]
    );
  };

  const ensureBusinessTypeFeature = async ({ businessTypeId, featureId, isDefault }) => {
    await client.query(
      `
      INSERT INTO public.business_type_features (business_type_id, feature_id, is_default)
      VALUES ($1, $2, $3)
      ON CONFLICT (business_type_id, feature_id)
      DO UPDATE SET is_default = EXCLUDED.is_default
      `,
      [businessTypeId, featureId, isDefault]
    );
  };

  try {
    console.log('🌱 Iniciando seed (business_types, modules, features, mappings)...\n');
    await client.query('BEGIN');

    // ============================================================================
    // 0. CREAR TABLAS SI NO EXISTEN (MVP)
    // ============================================================================
    console.log('0️⃣  Creando tablas si no existen...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.business_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.modules (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.features (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        tier VARCHAR(20) DEFAULT 'pro' CHECK (tier IN ('free', 'pro', 'enterprise')),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.business_type_modules (
        id SERIAL PRIMARY KEY,
        business_type_id INTEGER NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT true,
        UNIQUE(business_type_id, module_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.business_type_features (
        id SERIAL PRIMARY KEY,
        business_type_id INTEGER NOT NULL REFERENCES public.business_types(id) ON DELETE CASCADE,
        feature_id INTEGER NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
        is_default BOOLEAN DEFAULT false,
        UNIQUE(business_type_id, feature_id)
      )
    `);

    console.log('   ✅ Tablas creadas/verificadas\n');

    // ============================================================================
    // 1. BUSINESS TYPES (según tus códigos)
    // ============================================================================
    console.log('1️⃣  Insertando tipos de negocio...');
    const businessTypes = [
      { code: 'restaurant', name: 'Restaurante', description: 'Comida y bebida con servicio en mesa y comandas.' },
      { code: 'pizza', name: 'Pizzería', description: 'Especializado en pizzas: salón, takeout y delivery.' },
      { code: 'retail', name: 'Retail / Tienda', description: 'Venta de productos al público.' },
      { code: 'cafe', name: 'Café / Cafetería', description: 'Bebidas y comida ligera, puede manejar mesas.' },
      { code: 'services', name: 'Servicios', description: 'Servicios profesionales (barbería, spa, consultorios, etc.).' },
      { code: 'delivery', name: 'Delivery / Reparto', description: 'Negocio centrado en entregas y logística de pedidos.' },
      { code: 'other', name: 'Otro', description: 'Cualquier otro tipo de negocio.' }
    ];

    const businessTypeIds = {};
    for (const bt of businessTypes) {
      businessTypeIds[bt.code] = await upsertBusinessType(bt);
    }
    console.log(`   ✅ ${businessTypes.length} tipos de negocio insertados\n`);

    // ============================================================================
    // 2. MODULES (MVP global; el filtro lo hace business_type_modules)
    // ============================================================================
    console.log('2️⃣  Insertando módulos (MVP)...');

    const modules = [
      // Base
      { code: 'core', name: 'Configuración', description: 'Configuración general del negocio (datos, preferencias, etc.).' },
      { code: 'users_roles', name: 'Usuarios y Permisos', description: 'Gestión de usuarios, roles y permisos (RBAC).' },

      // Operación
      { code: 'catalog_products', name: 'Catálogo', description: 'Productos/servicios, categorías, precios base.' },
      { code: 'orders', name: 'Órdenes / Pedidos', description: 'Gestión del ciclo de órdenes/pedidos.' },
      { code: 'pos', name: 'Punto de Venta (POS)', description: 'Cobro y venta rápida / checkout.' },
      { code: 'cash_registers', name: 'Caja', description: 'Apertura/cierre, arqueos y control básico de caja.' },

      // Clientes / stock / fiscales
      { code: 'customers_crm', name: 'Clientes', description: 'Registro, búsqueda e historial de clientes.' },
      { code: 'inventory', name: 'Inventario', description: 'Stock básico y movimientos simples.' },
      { code: 'invoicing', name: 'Facturación', description: 'Emisión de documentos / facturación (según país).' },

      // Gestión y soporte
      { code: 'reports_analytics', name: 'Reportes', description: 'Reportes básicos de ventas y operación.' },
      { code: 'notifications', name: 'Notificaciones', description: 'Alertas internas del sistema.' },

      // Restaurant/Pizza/Café
      { code: 'tables_rooms', name: 'Mesas y Salones', description: 'Gestión de mesas/salones (ocupación, rotación, etc.).' },
      { code: 'kitchen_kds', name: 'Cocina (KDS)', description: 'Comandas y visualización de órdenes en cocina.' },
      { code: 'modifiers_addons', name: 'Modificadores / Extras', description: 'Extras, toppings, modificaciones por ítem.' },

      // Delivery
      { code: 'delivery', name: 'Delivery', description: 'Asignación de repartidores, zonas, estados y tracking básico.' }
    ];

    const moduleIds = {};
    for (const m of modules) {
      moduleIds[m.code] = await upsertModule(m);
    }
    console.log(`   ✅ ${modules.length} módulos insertados\n`);

    // ============================================================================
    // 3. FEATURES (MVP; puedes crecer luego)
    // ============================================================================
    console.log('3️⃣  Insertando características (MVP)...');

    const features = [
      // Restaurant / Pizza / Café
      { code: 'table-management', name: 'Control de Mesas', description: 'Estados de mesa, rotación y control de atención.', tier: 'pro' },
      { code: 'kitchen-display', name: 'Kitchen Display', description: 'Pantallas KDS para cocina.', tier: 'pro' },
      { code: 'order-commands', name: 'Sistema de Comandas', description: 'Comandas por mesa y seguimiento.', tier: 'pro' },

      // Delivery
      { code: 'delivery-routing', name: 'Ruteo de Delivery', description: 'Ruteo/zonas/tarifas avanzadas.', tier: 'enterprise' },

      // General
      { code: 'employee-roles', name: 'Roles Granulares', description: 'Permisos granulares por rol.', tier: 'pro' },
      { code: 'advanced-analytics', name: 'Analítica Avanzada', description: 'Dashboards y reportes avanzados.', tier: 'enterprise' },
      { code: 'api-access', name: 'Acceso API', description: 'API para integraciones.', tier: 'enterprise' }
    ];

    const featureIds = {};
    for (const f of features) {
      featureIds[f.code] = await upsertFeature(f);
    }
    console.log(`   ✅ ${features.length} características insertadas\n`);

    // ============================================================================
    // 4. BUSINESS TYPE → MODULES (con defaults razonables por tipo)
    // ============================================================================
    console.log('4️⃣  Mapeando módulos por tipo de negocio (defaults + opcionales)...');

    // Estructura: { type: { default: [], optional: [] } }
    const businessTypeModules = {
      restaurant: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'pos', 'cash_registers', 'customers_crm', 'inventory', 'reports_analytics', 'notifications', 'tables_rooms', 'kitchen_kds', 'modifiers_addons'],
        optional: ['delivery', 'invoicing']
      },
      pizza: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'pos', 'cash_registers', 'customers_crm', 'inventory', 'reports_analytics', 'notifications', 'tables_rooms', 'kitchen_kds', 'modifiers_addons', 'delivery'],
        optional: ['invoicing']
      },
      cafe: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'pos', 'cash_registers', 'customers_crm', 'inventory', 'reports_analytics', 'notifications', 'tables_rooms'],
        optional: ['kitchen_kds', 'modifiers_addons', 'delivery', 'invoicing']
      },
      retail: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'pos', 'cash_registers', 'customers_crm', 'inventory', 'reports_analytics', 'notifications'],
        optional: ['invoicing']
      },
      services: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'customers_crm', 'reports_analytics', 'notifications'],
        optional: ['pos', 'cash_registers', 'inventory', 'invoicing']
      },
      delivery: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'customers_crm', 'delivery', 'reports_analytics', 'notifications'],
        optional: ['pos', 'cash_registers', 'inventory', 'invoicing', 'kitchen_kds']
      },
      other: {
        default: ['core', 'users_roles', 'catalog_products', 'orders', 'customers_crm', 'reports_analytics', 'notifications'],
        optional: ['pos', 'cash_registers', 'inventory', 'invoicing', 'delivery', 'tables_rooms', 'kitchen_kds', 'modifiers_addons']
      }
    };

    let totalModuleMappings = 0;
    for (const [typeCode, cfg] of Object.entries(businessTypeModules)) {
      const businessTypeId = businessTypeIds[typeCode];

      for (const moduleCode of cfg.default) {
        await ensureBusinessTypeModule({
          businessTypeId,
          moduleId: moduleIds[moduleCode],
          isDefault: true
        });
        totalModuleMappings++;
      }

      for (const moduleCode of cfg.optional) {
        await ensureBusinessTypeModule({
          businessTypeId,
          moduleId: moduleIds[moduleCode],
          isDefault: false
        });
        totalModuleMappings++;
      }
    }

    console.log(`   ✅ ${totalModuleMappings} mapeos tipo → módulo creados/actualizados\n`);

    // ============================================================================
    // 5. BUSINESS TYPE → FEATURES (MVP)
    // ============================================================================
    console.log('5️⃣  Mapeando características por tipo de negocio (defaults mínimos)...');

    const businessTypeFeatures = {
      restaurant: {
        default: ['employee-roles'],
        optional: ['table-management', 'kitchen-display', 'order-commands', 'advanced-analytics', 'api-access']
      },
      pizza: {
        default: ['employee-roles'],
        optional: ['table-management', 'kitchen-display', 'order-commands', 'delivery-routing', 'advanced-analytics', 'api-access']
      },
      cafe: {
        default: ['employee-roles'],
        optional: ['table-management', 'kitchen-display', 'advanced-analytics', 'api-access']
      },
      retail: {
        default: ['employee-roles'],
        optional: ['advanced-analytics', 'api-access']
      },
      services: {
        default: ['employee-roles'],
        optional: ['advanced-analytics', 'api-access']
      },
      delivery: {
        default: ['employee-roles'],
        optional: ['delivery-routing', 'advanced-analytics', 'api-access']
      },
      other: {
        default: ['employee-roles'],
        optional: ['advanced-analytics', 'api-access']
      }
    };

    let totalFeatureMappings = 0;
    for (const [typeCode, cfg] of Object.entries(businessTypeFeatures)) {
      const businessTypeId = businessTypeIds[typeCode];

      for (const featureCode of cfg.default) {
        await ensureBusinessTypeFeature({
          businessTypeId,
          featureId: featureIds[featureCode],
          isDefault: true
        });
        totalFeatureMappings++;
      }

      for (const featureCode of cfg.optional) {
        await ensureBusinessTypeFeature({
          businessTypeId,
          featureId: featureIds[featureCode],
          isDefault: false
        });
        totalFeatureMappings++;
      }
    }

    console.log(`   ✅ ${totalFeatureMappings} mapeos tipo → feature creados/actualizados\n`);

    await client.query('COMMIT');

    // ============================================================================
    // SUMMARY
    // ============================================================================
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('✨ SEED COMPLETADO EXITOSAMENTE');
    console.log('══════════════════════════════════════════════════════════���════════════\n');

    console.log('📊 RESUMEN:');
    console.log(`   • ${businessTypes.length} Tipos de negocio`);
    console.log(`   • ${modules.length} Módulos`);
    console.log(`   • ${features.length} Features`);
    console.log(`   • ${totalModuleMappings} Mapeos tipo→módulo`);
    console.log(`   • ${totalFeatureMappings} Mapeos tipo→feature\n`);

    console.log('📋 DEFAULTS POR TIPO (módulos):\n');
    for (const [typeCode, cfg] of Object.entries(businessTypeModules)) {
      console.log(`📌 ${typeCode.toUpperCase()}`);
      console.log(`   Default:   ${cfg.default.join(', ')}`);
      console.log(`   Opcional:  ${cfg.optional.join(', ')}\n`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
  }
}

seedModulesAndFeatures()
  .then(async () => {
    console.log('\n✅ Script finalizado correctamente');
    await closePool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Error fatal en el seed:', error);
    await closePool();
    process.exit(1);
  });