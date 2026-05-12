// BusinessLayout.jsx - Modificado
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
  FiLock, FiLoader
} from 'react-icons/fi';
import API_BASE, { fetchWithAuth } from '../../config/apiBase';
import '../../styles/BusinessLayout.css';
import Footer from '../../components/common/Footer';

import { BusinessContextProvider } from '../../admin/config/BusinessContext';
import AperturaCajaPage from '../../pages/business/PosAperturaCajaPage';
import CierreDeCajaPage from '../../pages/business/PosCashRegisterPage';
import { useAutoPrint } from '../../hooks/useAutoPrint';
import { usePrinterService } from '../../services/usePrinterService';
import { useAppVersion } from '../../hooks/useAppVersion';

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
    const icon = MOD_ICONS[mod.code] || <FiZap size={17}/>;
    
    const pages = (mod.pages || []).filter(page => {
      const pagePath = page.path || '';
      const pageCode = page.code || '';
      const pageName = page.name || '';
      
      const esCierreCaja = 
        pagePath.includes('pos.cash_register') ||
        pagePath.includes('cash_register') ||
        pageCode.includes('cash_register') ||
        pageName.toLowerCase().includes('cierre de caja') ||
        pageName.toLowerCase().includes('cerrar caja');
      
      return !esCierreCaja;
    });

    if (pages.length === 0) return null;

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
          path: resolvePath(page.path, `/app/${mod.code}/${toSlug(page.name)}`),
          icon: <FiZap size={15}/>,
        })),
      };
    }

    const single = pages[0];
    return {
      label: mod.name,
      icon,
      path: resolvePath(single?.path, `/app/${mod.code}`),
    };
  }).filter(Boolean);
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
          <FiInbox size={48} color="#f97316" />
        </div>
        <h2 className="apertura-alert-title">Apertura de Caja Requerida</h2>
        <p className="apertura-alert-message">
          Debes registrar la apertura de caja antes de comenzar a operar.
          Al presionar "Aceptar", se abrirá el cajón físico y podrás ingresar los datos iniciales.
        </p>
        <button
          type="button"
          className="btn-modal-aceptar"
          onClick={onAceptar}
          disabled={abriendo}
        >
          {abriendo ? (
            <>
              <FiLoader size={16} className="spinning" />
              Abriendo cajón...
            </>
          ) : (
            'Aceptar y Abrir Caja'
          )}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL DE CONFIRMACIÓN PARA CIERRE DE CAJA
══════════════════════════════════════════════════════════ */
function ConfirmarCierreModal({ onConfirm, onCancel, cargando }) {
  return (
    <div className="apertura-alert-overlay">
      <div className="apertura-alert-modal">
        <div className="apertura-alert-icon">
          <FiLock size={48} color="#f97316" />
        </div>
        <h2 className="apertura-alert-title">Cerrar Caja</h2>
        <p className="apertura-alert-message">
          <strong>¿Estás seguro que deseas cerrar la caja?</strong>
          <br /><br />
          Una vez cerrada la caja:
          <br />
          • No podrás seguir cobrando hasta la próxima apertura
          <br />
          • Se generará el reporte de cierre del día
          <br />
          • Se imprimirá el ticket de cierre
          <br /><br />
          <strong>El cajón se abrirá para que puedas contar el dinero.</strong>
        </p>
        <div className="modal-buttons-group">
          <button
            type="button"
            className="btn-modal-cancelar"
            onClick={onCancel}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-modal-confirmar"
            onClick={onConfirm}
            disabled={cargando}
          >
            {cargando ? (
              <>
                <FiLoader size={16} className="spinning" />
                Abriendo cajón...
              </>
            ) : (
              'Sí, Cerrar Caja'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   BUSINESS LAYOUT
══════════════════════════════════════════════════════════ */
export default function BusinessLayout({ user, onLogout }) {
  const navigate = useNavigate();

  // 🔥 USAR EL MISMO SERVICIO QUE USA GlobalExpenseBubble
  const { openCashDrawer, printerError } = usePrinterService();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const applyOverflow = (isMobile) => {
      if (isMobile) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      } else {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    };
    const handleChange = (e) => applyOverflow(e.matches);
    applyOverflow(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      mq.removeEventListener('change', handleChange);
    };
  }, []);

  const [navData, setNavData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState(getStoredBiz);

  useAutoPrint({ businessId: selectedBiz?.id, enabled: !!selectedBiz?.id });
  const { updateReady, countdown } = useAppVersion();

  // Apertura de caja
  const [aperturaChecked, setAperturaChecked] = useState(false);
  const [aperturaHecha, setAperturaHecha] = useState(true);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [abriendoCaja, setAbriendoCaja] = useState(false);
  const [aperturaIniciada, setAperturaIniciada] = useState(false);
  
  // Cierre de caja
  const [mostrarConfirmacionCierre, setMostrarConfirmacionCierre] = useState(false);
  const [mostrarCierreForm, setMostrarCierreForm] = useState(false);
  const [datosCierre, setDatosCierre] = useState(null);
  const [cargandoCierre, setCargandoCierre] = useState(false);
  const [abriendoCajonCierre, setAbriendoCajonCierre] = useState(false);

  // ═══════════════════════════════════════════════════════
  // 🔥 FUNCIÓN PARA ABRIR CAJÓN - IGUAL QUE EN GlobalExpenseBubble
  // ═══════════════════════════════════════════════════════
  const abrirCajon = useCallback(async () => {
    console.log('🔓 [Layout] Abriendo cajón con openCashDrawer...');
    try {
      await openCashDrawer();
      console.log('✅ [Layout] Cajón abierto exitosamente');
      return true;
    } catch (err) {
      console.error('❌ [Layout] Error abriendo cajón:', err);
      // No lanzamos error para no bloquear el flujo
      return false;
    }
  }, [openCashDrawer]);

  // ═══════════════════════════════════════════════════════
  // VERIFICAR APERTURA
  // ═══════════════════════════════════════════════════════
  const checkApertura = useCallback(async () => {
    if (!isCashierRole(user)) { 
      setAperturaChecked(true); 
      setAperturaHecha(true); 
      return; 
    }
    
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      const res = await fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`);
      
      if (res.status === 200) {
        setAperturaHecha(true);
        setMostrarAlerta(false);
      } else if (res.status === 404) {
        setAperturaHecha(false);
        setMostrarAlerta(true);
      } else {
        setAperturaHecha(true);
      }
    } catch (err) {
      console.error('Error checking aperture:', err);
      setAperturaHecha(true);
    } finally {
      setAperturaChecked(true);
    }
  }, [user]);

  useEffect(() => { checkApertura(); }, [checkApertura]);

  // ═══════════════════════════════════════════════════════
  // CARGAR DATOS PARA CIERRE
  // ═══════════════════════════════════════════════════════
  const cargarDatosCierre = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      
      const [sumRes, openRes, incomesRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/income-extra?date=${today}`)
      ]);

      let summary = {};
      let opening = {};
      let incomes = [];

      if (sumRes.ok) summary = await sumRes.json();
      if (openRes.ok) opening = await openRes.json();
      if (incomesRes.ok) incomes = await incomesRes.json();

      const ventasPorMetodo = summary?.metodos || [];
      const totalVentas = ventasPorMetodo.reduce((a, b) => a + (Number(b.total_cobrado) || 0), 0);
      const ventasEfectivo = ventasPorMetodo.find(m => m.payment_method === 'cash')?.total_cobrado || 0;
      const ventasTarjeta = ventasPorMetodo.find(m => m.payment_method === 'card')?.total_cobrado || 0;
      const ventasTransferencia = ventasPorMetodo.find(m => m.payment_method === 'transfer')?.total_cobrado || 0;
      
      const gastos = (summary?.gastos || []).reduce((a, g) => a + (Number(g.monto) || 0), 0);
      const ingresosExtras = incomes.reduce((a, i) => a + (Number(i.amount) || 0), 0);
      
      const aperturaInicial = (opening?.total_efectivo || 0) + (opening?.monto_banca || 0);
      const totalTransacciones = summary?.total_transactions || 0;

      return {
        ventasDelDia: totalVentas,
        totalTransacciones: totalTransacciones,
        ventasEfectivo: ventasEfectivo,
        ventasTarjeta: ventasTarjeta + ventasTransferencia,
        gastosOperativos: gastos,
        ingresosExtras: ingresosExtras,
        aperturaInicial: aperturaInicial,
        fechaApertura: opening?.created_at || new Date().toISOString(),
        cajero: opening?.user_name || user?.nombre || 'N/A'
      };
    } catch (err) {
      console.error('Error cargando datos cierre:', err);
      return null;
    }
  };

  // ═══════════════════════════════════════════════════════
  // CIERRE DE CAJA
  // ═══════════════════════════════════════════════════════
  const handleClickCerrarCaja = async () => {
    if (!aperturaHecha) {
      setError('No hay una apertura de caja activa. Debes abrir caja primero.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    setCargandoCierre(true);
    const datos = await cargarDatosCierre();
    
    if (!datos) {
      setError('Error al cargar los datos para el cierre');
      setTimeout(() => setError(null), 4000);
      setCargandoCierre(false);
      return;
    }
    
    setDatosCierre(datos);
    setCargandoCierre(false);
    setMostrarConfirmacionCierre(true);
  };

  const handleConfirmarCierre = async () => {
    setMostrarConfirmacionCierre(false);
    setAbriendoCajonCierre(true);
    
    // 🔥 ABRIR CAJÓN IGUAL QUE EN GASTOS
    await abrirCajon();
    
    setAbriendoCajonCierre(false);
    setMostrarCierreForm(true);
  };

  const handleCancelarCierre = () => {
    setMostrarConfirmacionCierre(false);
  };

  const handleCierreCompleto = async (data) => {
    const operador = getOperatorUser();
    if (operador?.id && data) {
      await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: "cash_drawer",
          action: "cierre_caja_completado",
          description: `Cierre de caja completado por ${operador?.nombre || 'Usuario'}`,
          new_values: data,
          reason: "Cierre de caja"
        })
      }).catch(err => console.warn('Error guardando auditoría:', err));
    }
    
    setMostrarCierreForm(false);
    setAperturaHecha(false);
    await checkApertura();
  };

  // ═══════════════════════════════════════════════════════
  // APERTURA DE CAJA
  // ═══════════════════════════════════════════════════════
  const handleAceptarAlerta = async () => {
    if (aperturaIniciada || abriendoCaja) return;
    
    setAperturaIniciada(true);
    setAbriendoCaja(true);

    // 🔥 ABRIR CAJÓN IGUAL QUE EN GASTOS
    await abrirCajon();

    setAbriendoCaja(false);
    setAperturaIniciada(false);
    setMostrarAlerta(false);
    setMostrarFormulario(true);
  };

  const handleClickAbrirCaja = async () => {
    if (aperturaHecha) {
      alert('Ya hay una apertura de caja activa para hoy');
      return;
    }
    
    setAbriendoCaja(true);
    
    // 🔥 ABRIR CAJÓN IGUAL QUE EN GASTOS
    await abrirCajon();
    
    setAbriendoCaja(false);
    setMostrarAlerta(false);
    setMostrarFormulario(true);
  };

  const handleAperturaCompleta = async (data) => {
    const operador = getOperatorUser();
    const userName = operador?.nombre || operador?.name || operador?.username || operador?.email || 'Usuario';

    if (operador?.id && data) {
      const totalEfectivo = Number(data.total_efectivo) || 0;
      const montoBanca = Number(data.monto_banca) || 0;
      const totalInicial = totalEfectivo + montoBanca;

      await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: "cash_drawer",
          action: "apertura_caja_completada",
          description: `Apertura de caja completada por ${userName}. Efectivo: $${totalEfectivo.toFixed(2)}, Banca: $${montoBanca.toFixed(2)}, Total: $${totalInicial.toFixed(2)}`,
          new_values: {
            total_efectivo: totalEfectivo,
            monto_banca: montoBanca,
            total_inicial: totalInicial,
            observaciones: data.observaciones || null
          },
          reason: "Registro de Apertura"
        })
      }).catch(err => console.warn('Error guardando auditoría:', err));
    }

    setAperturaHecha(true);
    setMostrarFormulario(false);
    setMostrarAlerta(false);
  };

  // ═══════════════════════════════════════════════════════
  // CARGA INICIAL
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    const load = async () => {
      try {
        const navRes = await fetch(`${API_BASE}/api/business-status/navigation`, {
          headers: { 'Authorization': `Bearer ${getToken()}` },
        });
        if (navRes.ok) {
          const navData = await navRes.json();
          if (navData.ok) setNavData(navData.data);
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

  if (loading) {
    return (
      <div className="business-loading">
        <div className="business-loading-spinner"/>
        <p>Cargando tu panel...</p>
      </div>
    );
  }

  return (
    <BusinessContextProvider>
      {/* Banner de actualización automática */}
      {updateReady && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
          background: '#1a1a2e', color: '#fff',
          padding: '10px 20px', textAlign: 'center',
          fontSize: 14, fontWeight: 600,
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
        }}>
          🚀 Nueva versión disponible — actualizando en {countdown}s...
        </div>
      )}

      {/* Alerta de apertura requerida */}
      {aperturaChecked && mostrarAlerta && !mostrarFormulario && !mostrarCierreForm && (
        <AlertaAperturaModal 
          onAceptar={handleAceptarAlerta}
          abriendo={abriendoCaja}
        />
      )}

      {/* Formulario de apertura de caja */}
      {aperturaChecked && mostrarFormulario && (
        <AperturaCajaPage 
          onAperturaCompleta={handleAperturaCompleta}
          onCancel={() => {
            setMostrarFormulario(false);
            setMostrarAlerta(true);
            setAperturaIniciada(false);
          }}
        />
      )}

      {/* Modal de confirmación para cierre de caja */}
      {mostrarConfirmacionCierre && (
        <ConfirmarCierreModal
          onConfirm={handleConfirmarCierre}
          onCancel={handleCancelarCierre}
          cargando={abriendoCajonCierre}
        />
      )}

      {/* Formulario de cierre de caja */}
      {mostrarCierreForm && datosCierre && (
        <CierreDeCajaPage
          cajaData={datosCierre}
          onClose={(exitoso) => {
            setMostrarCierreForm(false);
            if (exitoso) {
              handleCierreCompleto(datosCierre);
            }
          }}
        />
      )}

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
            onCerrarCaja={handleClickCerrarCaja}
            onAbrirCaja={handleClickAbrirCaja}
            aperturaHecha={aperturaHecha}
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
                {error}
              </div>
            )}
            {printerError && !loading && (
              <div className="business-warning" style={{ backgroundColor: '#fce4e4', color: '#991b1b', padding: '8px', borderRadius: '4px', marginBottom: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle size={14} />
                Error de impresora: {printerError}
              </div>
            )}
            <Outlet />
          </div>
          <Footer />
        </div>
      </div>
    </BusinessContextProvider>
  );
}