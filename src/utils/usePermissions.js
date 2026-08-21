// src/hooks/usePermissions.js
import { useSession } from '../context/SessionContext';
import { hasPermission } from '../utils/permissions';

export const usePermissions = () => {
  const { user } = useSession();
  const userRole = user?.role || user?.roleCode || 'user';
  
  return {
    // Devuelve true/false para una acción concreta
    can: (action) => hasPermission(userRole, action),

    // Atajos comunes (opcional)
    canCreateUsers: () => hasPermission(userRole, 'createUser'),
    canEditUsers: () => hasPermission(userRole, 'editUser'),
    canDeleteUsers: () => hasPermission(userRole, 'deleteUser'),
    canViewUsers: () => hasPermission(userRole, 'viewUsers'),

    canCreateProducts: () => hasPermission(userRole, 'createProduct'),
    canEditProducts: () => hasPermission(userRole, 'editProduct'),
    canDeleteProducts: () => hasPermission(userRole, 'deleteProduct'),
    canViewProducts: () => hasPermission(userRole, 'viewProducts'),

    canCreateInventory: () => hasPermission(userRole, 'createInventory'),
    canCloseInventory: () => hasPermission(userRole, 'closeInventory'),
    canViewInventoryDetail: () => hasPermission(userRole, 'viewInventoryDetail'),
  };
};