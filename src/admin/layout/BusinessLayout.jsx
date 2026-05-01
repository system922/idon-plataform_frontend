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
  FiFileText, FiUser, FiAlertCircle, FiZap, FiMenu, FiInbox,
} from 'react-icons/fi';
import API_BASE, { fetchWithAuth } from '../../config/apiBase';
import '../../styles/BusinessLayout.css';

import { BusinessContextProvider } from '../../admin/config/BusinessContext';
import AperturaCajaPage from '../../pages/business/AperturaCajaPage';
import { useAutoPrint } from '../../hooks/useAutoPrint';
import { useCashDrawer } from '../../hooks/useCashDrawer';

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

const toSlug = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

function buildSidebarMenu(navData) {
  if (!navData?.modules?.length) return [];

  return navData.modules.map(mod => {
    const icon  = MOD_ICONS[mod.code] || <FiZap size={17}/>;
    const pages = mod.pages || [];

    const resolvePath = (rawPath, fallback) => {
      if (!rawPath) return fallback;
      return rawPath.startsWith('/app') ? rawPath : `/app${rawPath}`;
    };

    if (pages.length > 1) {
      const mainPage =
        pages.find(p => p.isMain) ||
        pages.find(p => (p.code || '').split('.').pop() === 'general') ||
        pages[0];

      const mainPath = resolvePath(mainPage?.path, `/app/${mod.code}`);
      const subPages = pages.filter(p => p !== mainPage);

      return {
        section: mod.name,
        icon,
        path: mainPath,
        items: subPages.map(page => ({
          label: page.name,
          path:  resolvePath(page.path, `/app/${mod.code}/${toSlug(page.name)}`),
          icon:  <FiZap size={15}/>,
        })),
      };
    }

    const single = pages[0];
    return {
      label: mod.name,
      icon,
      path: resolvePath(single?.path, `/app/${mod.code}`),
    };
  });
}

const getStoredBiz = () => {
  try { return JSON.parse(localStorage.getItem('selectedBusiness') || 'null'); }
  catch { return null; }
};

const CASHIER_ROLES = ['cashier', 'cajero', 'cajera'];
const isCashierRole = (user) => {
  const role = (user?.roleCode || user?.role_code || user?.role || '').toLowerCase();
  return CASHIER_ROLES.some(r => role.includes(r));
};

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

/* ══════════════════════════════════════════════════════════
   MODAL DE ALERTA DE APERTURA
══════════════════════════════════════════════════════════ */
function AlertaAperturaModal({ onAceptar, abriendo }) {
  return (
    <div className="apertura-alert-overlay">
      <div className="apertura-alert-modal">
        <div className="apertura-alert-icon">
          <FiInbox size={48} color="#10b981" />
        </div>
        <h2 className="apertura-alert-title">Apertura de Caja Requerida</h2>
        <p className="apertura-alert-message">
          Debes registrar la apertura de caja antes de comenzar a operar.
          Al presionar "Aceptar", se abrirá el cajón físico y podrás ingresar los datos iniciales.
        </p>
        <button
          type="button"
          className="apertura-alert-btn"
          onClick={onAceptar}
          disabled={abriendo}
        >
          {abriendo ? 'Abriendo caja...' : 'Aceptar y Abrir Caja'}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BUSINESS LAYOUT
══════════════════════════════════════════════════════════ */
export default function BusinessLayout({ user, onLogout }) {
  const navigate   = useNavigate();
  const openDrawer = useCashDrawer();
  
  const [navData,      setNavData]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [isSuspended,  setIsSuspended]  = useState(false);
  const [selectedBiz,  setSelectedBiz]  = useState(getStoredBiz);

  useAutoPrint({ businessId: selectedBiz?.id, enabled: !!selectedBiz?.id });

  // ── Apertura de caja ──────────────────────────────────────────────────────
  const [aperturaChecked,     setAperturaChecked]     = useState(false);
  const [aperturaHecha,       setAperturaHecha]       = useState(true);
  const [mostrarAlerta,       setMostrarAlerta]       = useState(false);
  const [mostrarFormulario,   setMostrarFormulario]   = useState(false);
  const [abriendoCaja,        setAbriendoCaja]        = useState(false);

  const checkApertura = useCallback(async () => {
    if (!isCashierRole(user)) { 
      setAperturaChecked(true); 
      setAperturaHecha(true); 
      return; 
    }
    
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      const res   = await fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`);
      
      if (res.status === 200) {
        setAperturaHecha(true);
      } else if (res.status === 404) {
        setAperturaHecha(false);
        setMostrarAlerta(true); // Mostrar alerta en lugar del formulario directamente
      } else {
        setAperturaHecha(true);
      }
    } catch {
      setAperturaHecha(true);
    } finally {
      setAperturaChecked(true);
    }
  }, [user]);

  useEffect(() => { checkApertura(); }, [checkApertura]);

  const handleAceptarAlerta = async () => {
    setAbriendoCaja(true);

    const operador = getOperatorUser();
    const userName = operador?.nombre || operador?.name || operador?.username || operador?.email || 'Usuario';

    try {
      // 1. Guardar auditoría de intento de apertura
      if (operador?.id) {
        const auditPayload = {
          user_id: operador.id,
          table_name: "cash_drawer",
          action: "intento_apertura_caja",
          description: `${userName} inició el proceso de apertura de caja. Cajón físico abierto.`,
          new_values: null,
          reason: "Inicio de proceso de apertura"
        };

        await fetchWithAuth('/api/audit-log', {
          method: 'POST',
          body: JSON.stringify(auditPayload)
        }).catch(err => console.warn('Error guardando auditoría inicial:', err));
      }

      // 2. Abrir cajón físico
      const ok = await openDrawer();
      
      if (!ok) {
        console.warn('No se pudo abrir la caja física');
      }

      // 3. Mostrar formulario de apertura
      setMostrarAlerta(false);
      setMostrarFormulario(true);

    } catch (err) {
      console.error('Error en apertura:', err);
      // Continuar mostrando el formulario aunque falle algo
      setMostrarAlerta(false);
      setMostrarFormulario(true);
    } finally {
      setAbriendoCaja(false);
    }
  };

  const handleAperturaCompleta = async (data) => {
    const operador = getOperatorUser();
    const userName = operador?.nombre || operador?.name || operador?.username || operador?.email || 'Usuario';

    // Guardar auditoría final de apertura completada
    if (operador?.id && data) {
      const totalEfectivo = data.total_efectivo || 0;
      const montoBanca = data.monto_banca || 0;
      const totalInicial = totalEfectivo + montoBanca;

      const auditPayload = {
        user_id: operador.id,
        table_name: "cash_drawer",
        action: "apertura_caja_completada",
        description: `Apertura de caja completada por ${userName}. Efectivo: $${totalEfectivo.toFixed(2)}, Banca: $${montoBanca.toFixed(2)}, Total: $${totalInicial.toFixed(2)}${data.observaciones ? `. Observaciones: ${data.observaciones}` : ''}`,
        new_values: {
          total_efectivo: totalEfectivo,
          monto_banca: montoBanca,
          total_inicial: totalInicial,
          observaciones: data.observaciones || null
        },
        reason: "Registro de Apertura"
      };

      await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify(auditPayload)
      }).catch(err => console.warn('Error guardando auditoría final:', err));
    }

    setAperturaHecha(true);
    setMostrarFormulario(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
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
        } catch {}

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

  return (
    <BusinessContextProvider>
      {/* Alerta de apertura requerida */}
      {aperturaChecked && mostrarAlerta && (
        <AlertaAperturaModal 
          onAceptar={handleAceptarAlerta}
          abriendo={abriendoCaja}
        />
      )}

      {/* Formulario de apertura de caja */}
      {aperturaChecked && mostrarFormulario && (
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
          {mobileOpen && (
            <div
              className="sidebar-mobile-overlay"
              onClick={() => setMobileOpen(false)}
            />
          )}

          <div className={`business-sidebar-wrapper ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
            <SidebarModern
              user={user}
              menu={navData ? buildSidebarMenu(navData) : []}
              onLogout={handleLogout}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              onMobileClose={() => setMobileOpen(false)}
            />
          </div>

          <div className="business-content-area">
            <div className="mobile-topbar">
              <span className="mobile-topbar-brand">
                <span className="logo-white">ID</span><span className="logo-orange">ON</span>
              </span>
              <button
                className="mobile-hamburger"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Abrir menú"
              >
                <FiMenu size={20} />
              </button>
            </div>

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