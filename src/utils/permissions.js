// src/utils/permissions.js

export const ROLES = {
  ADMIN: 'Administrador/a', // Administrador
  MANAGER: 'manager',    // Jefe de Caja
  CASHIER: 'cashier',    // Cajero/a
  SECRETARY: 'secreatary', // Secrectaria/o
  WAITER: 'waiter',      // Mesero/a
};

// Mapa de permisos: cada clave es una acción, y el valor es un array de roles que pueden realizarla.
const PERMISSION_MAP = {
  // ─── Usuarios ──────────────────────────────────────
  viewUsers: [ROLES.ADMIN, ROLES.MANAGER],
  createUser: [ROLES.ADMIN],
  editUser: [ROLES.ADMIN, ROLES.MANAGER],
  deleteUser: [ROLES.ADMIN],

  // ─── Productos ──────────────────────────────────────
  viewProducts: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  createProduct: [ROLES.ADMIN, ROLES.MANAGER],
  editProduct: [ROLES.ADMIN, ROLES.MANAGER],
  deleteProduct: [ROLES.ADMIN],
  adjustStock: [ROLES.ADMIN, ROLES.MANAGER],

  // ─── Inventarios ────────────────────────────────────
  viewInventoryList: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  viewInventoryDetail: [ROLES.ADMIN, ROLES.MANAGER],
  createInventory: [ROLES.ADMIN, ROLES.MANAGER],
  openInventory: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER, ROLES.WAITER],
  closeInventory: [ROLES.ADMIN, ROLES.MANAGER],
  recountInventory: [ROLES.ADMIN, ROLES.MANAGER],
  viewClosedInventory: [ROLES.ADMIN, ROLES.MANAGER],
  deleteInventory: [ROLES.ADMIN],

  // ─── Ventas / Pedidos ──────────────────────────────
  viewSales: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  createSale: [ROLES.ADMIN, ROLES.MANAGER, ROLES.CASHIER],
  cancelSale: [ROLES.ADMIN, ROLES.MANAGER],
  viewReports: [ROLES.ADMIN, ROLES.MANAGER],
  // ... añade todas las acciones que necesites
};

/**
 * Función principal: verifica si el rol actual puede realizar una acción.
 * @param {string} userRole - El rol del usuario (ej: 'admin', 'cashier')
 * @param {string} action - La acción a verificar (ej: 'createUser')
 * @returns {boolean} - true si tiene permiso
 */
export const hasPermission = (userRole, action) => {
  if (!userRole) return false;
  const allowedRoles = PERMISSION_MAP[action];
  if (!allowedRoles) return false; // acción no definida
  return allowedRoles.includes(userRole);
};

/**
 * Devuelve un objeto con todas las capacidades para el rol dado.
 * Útil para pasar a componentes o para depuración.
 */
export const getPermissionsForRole = (userRole) => {
  const result = {};
  for (const [action, roles] of Object.entries(PERMISSION_MAP)) {
    result[action] = roles.includes(userRole);
  }
  return result;
};