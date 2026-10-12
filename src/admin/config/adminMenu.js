export const ADMIN_MENU = [
  {
    label: 'General',
    icon: 'dashboard',
    subitems: [
      { label: 'Dashboard', path: '/admin/dashboard' },
    ],
  },
  {
    label: 'Negocios',
    icon: 'building',
    subitems: [
      { label: 'Solicitudes de Registro', path: '/admin/requests' },
      { label: 'Gestión de Clientes', path: '/admin/businesses' },
      { label: 'Tipos de Negocios', path: '/admin/business-types' },
      { label: 'Estadísticas por Negocio', path: '/admin/business-stats' },
    ],
  },
  {
    label: 'Sistema',
    icon: 'layers',
    subitems: [
      { label: 'Módulos', path: '/admin/modules' },
      { label: 'Funcionalidades', path: '/admin/features' },
      { label: 'Versiones', path: '/admin/versions' },
      { label: 'Actualizaciones', path: '/admin/updates' },
    ],
  },
  {
    label: 'Comercial',
    icon: 'credit-card',
    subitems: [
      { label: 'Planes', path: '/admin/plans' },
      { label: 'Pagos', path: '/admin/payments' },
      { label: 'Configuración de facturación', path: '/admin/einvoicing' },
      { label: 'Comprobantes electrónicos', path: '/admin/einvoicing/invoices' },
      { label: 'Pagos Pendientes', path: '/admin/pending-payments' },
      { label: 'Plantillas de Email', path: '/admin/email-templates' },
      { label: 'Idon News', path: '/admin/idon_news' },
    ],
  },
  {
    label: 'Usuarios',
    icon: 'users',
    subitems: [
      { label: 'Gestión de Usuarios', path: '/admin/users' },
      { label: 'Roles y Permisos', path: '/admin/roles' },
      { label: 'Logs de Actividad', path: '/admin/activity-logs' },
    ],
  },
  {
    label: 'Global',
    icon: 'settings',
    subitems: [
      { label: 'Configuración', path: '/admin/settings' },
      { label: 'Auditoría', path: '/admin/audit' },
      { label: 'Respaldos', path: '/admin/backups' },
      { label: 'Reportes', path: '/admin/reports' },
    ],
  },
];