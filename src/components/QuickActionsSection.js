import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFileText, FiDollarSign, FiTrendingUp, FiPlus,
  FiBell, FiShoppingCart, FiCreditCard,
  FiUsers, FiPackage,
} from 'react-icons/fi';
import { useBusiness } from '../context/BusinessContext';

// Solo rutas que tienen página real en businessRoutes.jsx
const ALL_ACTIONS = [
  { label: 'Nueva Orden',  icon: FiPlus,        path: '/app/orders/orders.create' },
  { label: 'Ventas POS',   icon: FiShoppingCart, path: '/app/pos/pos.sales' },
  { label: 'POS Retail',   icon: FiCreditCard,   path: '/app/pos/pos.retail' },
  { label: 'Inventario',   icon: FiPackage,      path: '/app/inventory/inventory.products' },
  { label: 'Compras',      icon: FiDollarSign,   path: '/app/purchases/purchases.history' },
  { label: 'Empleados',    icon: FiUsers,        path: '/app/employees/employees.manage' },
  { label: 'Facturas',     icon: FiFileText,     path: '/app/einvoicing/einvoicing.status' },
  { label: 'Ventas',       icon: FiTrendingUp,   path: '/app/reports/reports.sales' },
  { label: 'Auditoría',    icon: FiBell,         path: '/app/core/core.audit_log' },
];

// ── Extrae todos los paths del menú de navegación activo ──────────────────────
function getAllNavPaths(navigation) {
  const paths = [];
  if (!Array.isArray(navigation)) return paths;
  navigation.forEach(section => {
    if (section.path) paths.push(section.path);
    if (Array.isArray(section.items)) {
      section.items.forEach(item => { if (item.path) paths.push(item.path); });
    }
  });
  return paths;
}

// ── Verifica si una acción es accesible (match exacto o por prefijo) ──────────
function hasAccess(navPaths, targetPath) {
  if (!navPaths.length) return true; // si no cargó navegación, mostrar todo
  return navPaths.some(navPath =>
    navPath === targetPath ||
    navPath.startsWith(targetPath + '/') ||
    targetPath.startsWith(navPath + '/') ||
    navPath.startsWith(targetPath.split('/').slice(0, 3).join('/'))
  );
}

export default function QuickActionsSection() {
  const navigate = useNavigate();
  const { navigation } = useBusiness();

  const navPaths = getAllNavPaths(navigation);
  const visible  = ALL_ACTIONS.filter(a => hasAccess(navPaths, a.path));

  if (!visible.length) return null;

  return (
    <div className="dashboard-quick-actions">
      <h3>Acciones Rápidas</h3>
      <div className="action-buttons">
        {visible.map(({ label, icon: Icon, path }) => (
          <button
            key={path}
            className="action-btn quick"
            onClick={() => navigate(path)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}
