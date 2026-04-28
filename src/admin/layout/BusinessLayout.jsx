/**
 * BusinessLayout.jsx
 * Ubicación: src/layouts/BusinessLayout.jsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import SidebarModern from '../../components/SidebarModern';
import {
  FiSettings, FiShoppingCart, FiBox, FiBarChart2, FiCreditCard,
  FiDollarSign, FiClipboard, FiThermometer, FiTruck, FiGrid,
  FiCalendar, FiStar, FiShoppingBag, FiClock, FiUsers,
  FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe, FiBell,
  FiFileText, FiAlertCircle, FiZap, FiMenu,
} from 'react-icons/fi';
import API_BASE, { fetchWithAuth } from '../../config/apiBase';
import '../../styles/BusinessLayout.css';

import { BusinessContextProvider } from '../../admin/config/BusinessContext';
import AperturaCajaPage from '../../pages/business/AperturaCajaPage';
import { useAutoPrint } from '../../hooks/useAutoPrint';

const getToken = () => localStorage.getItem('idonToken') || localStorage.getItem('token');

/* ── Iconos por código de módulo ── */
const MOD_ICONS = {
  core:          <FiSettings    size={17}/>,
  pos:           <FiShoppingCart size={17}/>,
  inventory:     <FiBox         size={17}/>,
  reports:       <FiBarChart2   size={17}/>,
  payments:      <FiCreditCard  size={17}/>,
  accounting:    <FiDollarSign  size={17}/>,
  orders:        <FiClipboard   size={17}/>,
  kitchen:       <FiThermometer size={17}/>,
  delivery:      <FiTruck       size={17}/>,
  tables:        <FiGrid        size={17}/>,
  reservations:  <FiCalendar    size={17}/>,
  loyalty:       <FiStar        size={17}/>,
  suppliers:     <FiTruck       size={17}/>,
  purchases:     <FiShoppingBag size={17}/>,
  appointments:  <FiClock       size={17}/>,
  employees:     <FiUsers       size={17}/>,
  crm:           <FiUserCheck   size={17}/>,
  routes:        <FiMap         size={17}/>,
  tracking:      <FiMapPin      size={17}/>,
  queue:         <FiList        size={17}/>,
  ecommerce:     <FiGlobe       size={17}/>,
  notifications: <FiBell        size={17}/>,
  einvoicing:    <FiFileText    size={17}/>,
};

/**
 * Transforma la respuesta del API al formato de SidebarModern.
 *
 * Si el módulo tiene features (sub-ítems) → sección expandible.
 * Si solo tiene 1 página sin features → link directo.
 */
// Convierte "Nombre de Página" → "nombre-de-pagina"
const toSlug = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const isDashboardPath = (path = '') =>
  /dashboard/.test(path);

function buildSidebarMenu(navData, isOwner = true) {
  if (!navData?.modules?.length) return [];

  return navData.modules.map(mod => {
    const icon  = MOD_ICONS[mod.code] || <FiZap size={17}/>;
    const pages = mod.pages || [];

    // Normaliza el path del backend agregando el prefijo /app si falta
    const resolvePath = (rawPath, fallback) => {
      if (!rawPath) return fallback;
      return rawPath.startsWith('/app') ? rawPath : `/app${rawPath}`;
    };

    // Módulo con múltiples páginas/features → sección con sub-ítems
    if (pages.length > 1) {
      // Página principal del módulo (isMain o la primera con nombre/código "general")
      const mainPage =
        pages.find(p => p.isMain) ||
        pages.find(p => (p.code || '').split('.').pop() === 'general') ||
        pages[0];

      const mainPath = resolvePath(mainPage?.path, `/app/${mod.code}`);

      // Excluir la página principal de los sub-ítems (ya actúa como destino del header)
      const subPages = pages.filter(p => p !== mainPage);

      const filteredSubPages = isOwner
        ? subPages
        : subPages.filter(page => !isDashboardPath(resolvePath(page.path, '')));

      // Si el módulo es solo dashboard y no hay sub-ítems visibles, ocultarlo
      if (!isOwner && isDashboardPath(mainPath) && filteredSubPages.length === 0) return null;

      return {
        section: mod.name,
        icon,
        path: mainPath,
        items: filteredSubPages.map(page => ({
          label: page.name,
          path:  resolvePath(page.path, `/app/${mod.code}/${toSlug(page.name)}`),
          icon:  <FiZap size={15}/>,
        })),
      };
    }

    // Módulo con 1 sola página → link directo
    const single = pages[0];
    const singlePath = resolvePath(single?.path, `/app/${mod.code}`);

    // Ocultar si es dashboard y el usuario no es dueño
    if (!isOwner && isDashboardPath(singlePath)) return null;

    return {
      label: mod.name,
      icon,
      path: singlePath,
    };
  }).filter(Boolean);
}

/* ══════════════════════════════════════════════════════════
   BUSINESS LAYOUT
══════════════════════════════════════════════════════════ */
const getStoredBiz = () => {
  try { return JSON.parse(localStorage.getItem('selectedBusiness') || 'null'); }
  catch { return null; }
};

const CASHIER_ROLES = ['cashier', 'cajero', 'cajera'];
const isCashierRole = (user) => {
  const role = (user?.roleCode || user?.role_code || user?.role || '').toLowerCase();
  return CASHIER_ROLES.some(r => role.includes(r));
};

const isBusinessOwner = (user) =>
  user?.userType !== 'schema_employee';

export default function BusinessLayout({ user, onLogout }) {
  const navigate   = useNavigate();
  const ownerAccess = isBusinessOwner(user);
  const [navData,      setNavData]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [isSuspended,  setIsSuspended]  = useState(false);
  const [, setSelectedBiz] = useState(getStoredBiz);

  // ── Impresión automática de comandas (laptop del cajero/dueño) ───────────
  useAutoPrint({ businessId: selectedBiz?.id, enabled: !!selectedBiz?.id });

  // ── Apertura de caja ──────────────────────────────────────────────────────
  const [aperturaChecked,  setAperturaChecked]  = useState(false);
  const [aperturaHecha,    setAperturaHecha]     = useState(true);  // true = no bloquea hasta saber

  const checkApertura = useCallback(async () => {
    if (!isCashierRole(user)) { setAperturaChecked(true); setAperturaHecha(true); return; }
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      const res   = await fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`);
      if (res.status === 200) {
        setAperturaHecha(true);   // ya existe apertura hoy
      } else if (res.status === 404) {
        setAperturaHecha(false);  // no existe → mostrar formulario
      } else {
        setAperturaHecha(true);   // error de servidor → no bloquear al cajero
      }
    } catch {
      setAperturaHecha(true);     // error de red → no bloquear al cajero
    } finally {
      setAperturaChecked(true);
    }
  }, [user]);

  useEffect(() => { checkApertura(); }, [checkApertura]);

  const handleAperturaCompleta = () => {
    setAperturaHecha(true);
  };
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Intentar verificar estado de suscripción (endpoint opcional)
        let suspended = false;
        try {
          const bizRes = await fetch(`${API_BASE}/api/business-status/my-businesses`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
          });
          if (bizRes.ok) {
            const bizData = await bizRes.json();
            if (bizData.ok && Array.isArray(bizData.businesses)) {
              const stored  = getStoredBiz();
              const current = bizData.businesses.find(b => b.id === stored?.id)
                || bizData.businesses[0];
              if (current) {
                setSelectedBiz(current);
                suspended = current.subscription_status === 'suspended'
                  || current.isActive === false;
                setIsSuspended(suspended);
              }
            }
          }
          // Si retorna 404 u otro error HTTP → simplemente ignorar, continuar sin suspensión
        } catch {
          // Error de red o JSON inválido → continuar sin suspensión
        }

        // 2. Cargar menú de navegación (siempre, a menos que esté suspendido)
        if (!suspended) {
          const navRes  = await fetch(`${API_BASE}/api/business-status/navigation`, {
            headers: { 'Authorization': `Bearer ${getToken()}` },
          });
          if (navRes.ok) {
            const navData = await navRes.json();
            if (navData.ok) setNavData(navData.data);
          }
        }
      } catch (e) {
        console.error('Error cargando layout:', e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    onLogout();
    navigate('/login');
  };

  // ⬇️ AQUÍ Envolvemos TODO el layout con el Provider
  return (
    <BusinessContextProvider>
      {/* Gate de apertura de caja para cajeros */}
      {aperturaChecked && !aperturaHecha && (
        <AperturaCajaPage onAperturaCompleta={handleAperturaCompleta} />
      )}

      {loading ? (
        <div className="business-loading">
          <div className="business-loading-spinner"/>
          <p>Cargando tu panel...</p>
        </div>
      ) : isSuspended ? (
        <div style={{ minHeight: '100vh', background: 'var(--bg, #0f1117)', overflowY: 'auto' }}>
          <Outlet />
        </div>
      ) : (
        <div className="business-layout">

          {/* Mobile topbar */}
          <header className="business-mobile-topbar">
            <button className="business-hamburger" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
              <FiMenu size={22} />
            </button>
            <span className="business-mobile-brand">ID<span>ON</span></span>
            <div className="business-mobile-topbar-spacer" />
          </header>

          {/* Overlay backdrop */}
          {mobileOpen && (
            <div className="business-overlay" onClick={() => setMobileOpen(false)} />
          )}

          {/* ── Sidebar ── */}
          <div className={`business-sidebar-wrapper ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <SidebarModern
              user={user}
              menu={navData ? buildSidebarMenu(navData, ownerAccess) : []}
              onLogout={handleLogout}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              onMobileClose={() => setMobileOpen(false)}
            />
          </div>

          {/* ── Contenido principal ── */}
          <div className="business-content-area">
            {/* Contenido de la ruta activa */}
            <div className="business-content-inner">
              {error && (
                <div className="business-error">
                  <FiAlertCircle size={18}/>
                  Error cargando el panel: {error}
                </div>
              )}
              <Outlet />
            </div>
          </div>
        </div>
      )}
    </BusinessContextProvider>
  );
}