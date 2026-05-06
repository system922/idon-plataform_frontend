// adminMenu.js
// Menú fijo para el panel SUPER ADMIN de IDON
// IMPORTANTE: las rutas deben coincidir exactamente con las de App.js

export const ADMIN_MENU = [
  {
    label: 'General',
    icon: 'dashboard',
    subitems: [
      { label: 'Dashboard',  path: '/admin/dashboard' },
    ],
  },
  {
    label: 'Negocios',
    icon: 'building',
    subitems: [
      { label: 'Solicitudes de Registro', path: '/admin/requests'    },
      { label: 'Gestión de Clientes',     path: '/admin/businesses'  },
    ],
  },
  {
    label: 'Sistema',
    icon: 'layers',
    subitems: [
      { label: 'Tipos de Negocios',  path: '/admin/business-types' },
      { label: 'Módulos',          path: '/admin/modules'        },
      { label: 'Funcionalidades',  path: '/admin/features'       },
      { label: 'Plantillas',       path: '/admin/templates'      },
    ],
  },
  {
    label: 'Comercial',
    icon: 'credit-card',
    subitems: [
      { label: 'Planes',  path: '/admin/plans'    },
      { label: 'Pagos',   path: '/admin/payments' },
    ],
  },
  {
    label: 'Usuarios',
    icon: 'users',
    subitems: [
      { label: 'Gestión de Usuarios', path: '/admin/users' },
      { label: 'Roles y Permisos',    path: '/admin/roles' },
    ],
  },
  {
    label: 'Global',
    icon: 'settings',
    subitems: [
      { label: 'Configuración',           path: '/admin/settings'              },
      { label: 'Auditoría',               path: '/admin/audit'                 },
    ],
  },
];
