/**
 * buildSidebar: Genera el menú dinámico para dueños de negocio y usuarios por esquema
 * @param {Object} params
 * @param {Array} params.modules - módulos activos
 * @param {Array} params.features - features activas
 * @returns {Array} menú procesado
 */
export function buildSidebar({ modules = [], features = [] }) {
  // MOCK: estructura básica, reemplazar por lógica real según módulos/features
  // Ejemplo: si el usuario tiene el módulo "ventas" y feature "reportes"
  const menu = [];
  if (modules.includes('ventas')) {
    menu.push({
      section: 'Ventas',
      icon: '🛒',
      items: [
        { label: 'Punto de Venta', path: '/ventas/pos', icon: '🧾' },
        features.includes('reportes') && { label: 'Reportes', path: '/ventas/reportes', icon: '📊' }
      ].filter(Boolean)
    });
  }
  if (modules.includes('inventario')) {
    menu.push({
      section: 'Inventario',
      icon: '📦',
      items: [
        { label: 'Stock', path: '/inventario/stock', icon: '📋' }
      ]
    });
  }
  // ...agrega más lógica según tus módulos/features
  return menu;
}
/**
 * Genera el menú de admin IDON (proveedor) como lista de módulos con subpáginas (acordeón)
 * Retorna: Array de módulos con subpáginas
 */
// ...existing code...
/**
 * buildSidebarAdmin: Menú fijo para admin IDON (proveedor)
 * Retorna: Array de módulos con subpáginas
 */
export function buildSidebarAdmin() {
  // Menú fijo para admin proveedor
  return [
    {
      moduleId: 'dashboard',
      name: 'Dashboard',
      icon: 'fas fa-tachometer-alt',
      pages: [
        { pageId: 'overview', name: 'Resumen', route: '/admin/dashboard', icon: 'fas fa-chart-pie' }
      ]
    },
    {
      moduleId: 'businesses',
      name: 'Negocios',
      icon: 'fas fa-building',
      pages: [
        { pageId: 'requests', name: 'Solicitudes', route: '/admin/requests', icon: 'fas fa-inbox' },
        { pageId: 'list', name: 'Lista de negocios', route: '/admin/businesses', icon: 'fas fa-list' }
      ]
    },
    {
      moduleId: 'modules',
      name: 'Módulos',
      icon: 'fas fa-puzzle-piece',
      pages: [
        { pageId: 'catalog', name: 'Catálogo', route: '/admin/modules', icon: 'fas fa-th-large' }
      ]
    },
    {
      moduleId: 'users',
      name: 'Usuarios',
      icon: 'fas fa-users',
      pages: [
        { pageId: 'admins', name: 'Admins', route: '/admin/users', icon: 'fas fa-user-shield' }
      ]
    },
    {
      moduleId: 'settings',
      name: 'Configuración',
      icon: 'fas fa-cogs',
      pages: [
        { pageId: 'general', name: 'General', route: '/admin/settings', icon: 'fas fa-sliders-h' }
      ]
    }
  ];
}

/**
 * HELPER: Contar items totales en el sidebar
 */
/**
 * HELPER: Contar items totales en el sidebar
 */
export function countMenuItems(sidebar) {
  return sidebar.reduce((total, section) => {
    return total + (section.subitems?.length || 1);
  }, 0);
}
/**
 * HELPER: Obtener todas las rutas disponibles (para validación de acceso)
 */
export function getAllMenuRoutes(sidebar) {
  const routes = [];
  
  sidebar.forEach(section => {
    if (section.path) routes.push(section.path);
    if (section.subitems) {
      section.subitems.forEach(sub => {
        if (sub.page) routes.push(sub.page);
      });
    }
  });
  return routes;
}

/**
 * HELPER: Obtener todas las rutas disponibles (para validación de acceso)
 */

