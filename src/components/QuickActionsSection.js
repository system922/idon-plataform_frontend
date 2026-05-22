import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFileText, FiDollarSign, FiTrendingUp, FiPlus,
  FiBell, FiShoppingCart, FiCreditCard,
  FiUsers, FiPackage,
} from 'react-icons/fi';

const getNavData = () => {
  try { return JSON.parse(localStorage.getItem('idonNavModules') || 'null'); }
  catch { return null; }
};

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
// Soporta dos formatos:
//   1) Sidebar array: [{ path, items: [{path}] }]
//   2) Raw API:       { modules: [{ pages: [{path}] }] }
function getAllNavPaths(navigation) {
  const paths = [];
  const toAbsolute = p => (!p ? null : p.startsWith('/app') ? p : `/app${p}`);

  // Formato sidebar (array)
  if (Array.isArray(navigation)) {
    navigation.forEach(section => {
      const p = toAbsolute(section.path);
      if (p) paths.push(p);
      if (Array.isArray(section.items)) {
        section.items.forEach(item => {
          const ip = toAbsolute(item.path);
          if (ip) paths.push(ip);
        });
      }
    });
    return paths;
  }

  // Formato raw API: { modules: [{pages:[{path}]}] }
  if (Array.isArray(navigation?.modules)) {
    navigation.modules.forEach(mod => {
      (mod.pages || []).forEach(page => {
        const p = toAbsolute(page.path);
        if (p) paths.push(p);
      });
    });
    return paths;
  }

  return paths;
}

// ── Verifica si una acción es accesible (match exacto o por prefijo directo) ──
function hasAccess(navPaths, targetPath) {
  if (!navPaths.length) return true; // si no cargó navegación, mostrar todo
  return navPaths.some(navPath =>
    navPath === targetPath ||
    navPath.startsWith(targetPath + '/') ||
    targetPath.startsWith(navPath + '/')
  );
}

export default function QuickActionsSection() {
  const navigate = useNavigate();

  const navPaths = getAllNavPaths(getNavData());
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
