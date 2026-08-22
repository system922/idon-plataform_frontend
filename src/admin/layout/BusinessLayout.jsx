// BusinessLayout.jsx - Modificado (MEJORADO PARA CIERRE + ICONOS POR PÁGINA)
import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useSession } from '../../context/SessionContext';
import { useSoundAlert } from '../../hooks/useSoundAlert';
import { api, fetchWithAuth } from '../../config/api';
import SidebarModern from '../../components/SidebarModern';
import {
  FiSettings, FiShoppingCart, FiBox, FiBarChart2, FiCreditCard,
  FiDollarSign, FiClipboard, FiThermometer, FiTruck, FiGrid,
  FiCalendar, FiStar, FiShoppingBag, FiClock, FiUsers,
  FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe, FiBell,
  FiFileText, FiAlertCircle, FiZap, FiMenu,
  FiLock, FiPrinter, FiRefreshCw, FiPercent,
  FiBook, FiPackage, FiTrendingUp, FiPlus, FiCheckCircle,
  FiMonitor, FiActivity, FiTag, FiShare2, FiSearch,
  FiMail, FiGift, FiX, FiUser, FiLayers, FiShield
} from 'react-icons/fi';
import Footer from '../../components/common/Footer';

import AperturaCajaPage from '../../pages/business/PosAperturaCajaPage';
import CierreDeCajaPage from '../../pages/business/PosCashRegisterPage';
import { usePrinterService } from '../../services/usePrinterService';
import { useQzTray } from '../../components/useQzTray';
import { useAutoPrint } from '../../hooks/useAutoPrint';
import { useAppVersion } from '../../hooks/useAppVersion';
import Modal from '../../components/General/Modal';
import { ButtonGroup, IconTextButton } from '../../components/General/Button';

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
  odontologia:   <FiBook        size={17}/>,
};

/* ── Iconos por código de página ── */
const PAGE_ICONS = {
  'core.dashboard': <FiGrid size={15}/>,
  'core.settings': <FiSettings size={15}/>,
  'core.users': <FiUsers size={15}/>,
  'core.audit_log': <FiFileText size={15}/>,
  'core.roles': <FiShield size={15}/>,
  'core.retail_dashboard': <FiBarChart2 size={15}/>,
  'pos.sales': <FiShoppingCart size={15}/>,
  'pos.retail': <FiShoppingBag size={15}/>,
  'pos.cash_register': <FiDollarSign size={15}/>,
  'pos.discounts': <FiPercent size={15}/>,
  'pos.quotes': <FiFileText size={15}/>,
  'pos.receipt_print': <FiPrinter size={15}/>,
  'pos.returns': <FiRefreshCw size={15}/>,
  'inventory.products': <FiBox size={15}/>,
  'inventory.categories': <FiGrid size={15}/>,
  'inventory.adjustments': <FiAlertCircle size={15}/>,
  'inventory.recipes': <FiBook size={15}/>,
  'inventory.physical': <FiClipboard size={15}/>,
  'inventory.suppliers': <FiTruck size={15}/>,
  'reports.sales': <FiBarChart2 size={15}/>,
  'reports.inventory': <FiBox size={15}/>,
  'reports.shifts': <FiClock size={15}/>,
  'reports.products': <FiPackage size={15}/>,
  'reports.cashiers': <FiUser size={15}/>,
  'reports.profit': <FiDollarSign size={15}/>,
  'reports.customers': <FiUsers size={15}/>,
  'reports.advanced': <FiTrendingUp size={15}/>,
  'accounting.close': <FiLock size={15}/>,
  'accounting.sri': <FiFileText size={15}/>,
  'accounting.tax': <FiPercent size={15}/>,
  'accounting.payable': <FiDollarSign size={15}/>,
  'accounting.receivable': <FiCreditCard size={15}/>,
  'accounting.balance': <FiBarChart2 size={15}/>,
  'orders.create': <FiPlus size={15}/>,
  'orders.history': <FiClock size={15}/>,
  'orders.status': <FiCheckCircle size={15}/>,
  'orders.qr': <FiGrid size={15}/>,
  'orders.scheduled': <FiCalendar size={15}/>,
  'kitchen.kds': <FiMonitor size={15}/>,
  'kitchen.alerts': <FiBell size={15}/>,
  'kitchen.times': <FiClock size={15}/>,
  'kitchen.history': <FiFileText size={15}/>,
  'kitchen.priority': <FiStar size={15}/>,
  'kitchen.recipes': <FiBook size={15}/>,
  'kitchen.stations': <FiGrid size={15}/>,
  'delivery.tracking': <FiMapPin size={15}/>,
  'delivery.zones': <FiMap size={15}/>,
  'delivery.history': <FiClock size={15}/>,
  'delivery.orders': <FiTruck size={15}/>,
  'delivery.integrations': <FiGlobe size={15}/>,
  'delivery.drivers': <FiUser size={15}/>,
  'delivery.rates': <FiDollarSign size={15}/>,
  'delivery.notifications': <FiBell size={15}/>,
  'tracking.gps': <FiMapPin size={15}/>,
  'tracking.alerts': <FiBell size={15}/>,
  'tracking.eta': <FiClock size={15}/>,
  'tracking.history': <FiFileText size={15}/>,
  'tracking.live_status': <FiActivity size={15}/>,
  'tracking.notify': <FiBell size={15}/>,
  'ecommerce.multi': <FiGlobe size={15}/>,
  'ecommerce.coupons': <FiTag size={15}/>,
  'ecommerce.abandoned': <FiShoppingBag size={15}/>,
  'ecommerce.cart': <FiShoppingCart size={15}/>,
  'ecommerce.catalog': <FiGrid size={15}/>,
  'ecommerce.orders': <FiClipboard size={15}/>,
  'ecommerce.social': <FiShare2 size={15}/>,
  'ecommerce.seo': <FiSearch size={15}/>,
  'ecommerce.payments': <FiCreditCard size={15}/>,
  'employees.manage': <FiUsers size={15}/>,
  'employees.performance': <FiBarChart2 size={15}/>,
  'employees.attendance': <FiClock size={15}/>,
  'employees.documents': <FiFileText size={15}/>,
  'employees.schedules': <FiCalendar size={15}/>,
  'employees.leaves': <FiCalendar size={15}/>,
  'employees.payroll': <FiDollarSign size={15}/>,
  'reservations.reminders': <FiBell size={15}/>,
  'reservations.calendar': <FiCalendar size={15}/>,
  'reservations.online': <FiGlobe size={15}/>,
  'reservations.recurring': <FiRefreshCw size={15}/>,
  'reservations.deposit': <FiDollarSign size={15}/>,
  'reservations.waitlist': <FiList size={15}/>,
  'reservations.email': <FiMail size={15}/>,
  'crm.segments': <FiLayers size={15}/>,
  'crm.email': <FiMail size={15}/>,
  'crm.analytics': <FiBarChart2 size={15}/>,
  'crm.customers': <FiUsers size={15}/>,
  'crm.history': <FiClock size={15}/>,
  'loyalty.coupons': <FiTag size={15}/>,
  'loyalty.membership': <FiStar size={15}/>,
  'loyalty.redeem': <FiGift size={15}/>,
  'loyalty.referrals': <FiShare2 size={15}/>,
  'loyalty.cashback': <FiDollarSign size={15}/>,
  'loyalty.points': <FiStar size={15}/>,
  'loyalty.card': <FiCreditCard size={15}/>,
  'queue.manage': <FiList size={15}/>,
  'queue.wait_time': <FiClock size={15}/>,
  'queue.priority': <FiStar size={15}/>,
  'queue.digital': <FiMonitor size={15}/>,
  'queue.stats': <FiBarChart2 size={15}/>,
  'queue.screen': <FiMonitor size={15}/>,
  'suppliers.manage': <FiTruck size={15}/>,
  'suppliers.evaluation': <FiStar size={15}/>,
  'suppliers.prices': <FiDollarSign size={15}/>,
  'suppliers.receiving': <FiPackage size={15}/>,
  'suppliers.orders': <FiClipboard size={15}/>,
  'purchases.budget': <FiDollarSign size={15}/>,
  'purchases.categories': <FiGrid size={15}/>,
  'purchases.approval': <FiCheckCircle size={15}/>,
  'purchases.orders': <FiClipboard size={15}/>,
  'purchases.history': <FiClock size={15}/>,
  'purchases.returns': <FiRefreshCw size={15}/>,
  'tables.map': <FiMap size={15}/>,
  'tables.merge': <FiGrid size={15}/>,
  'tables.rotation': <FiRefreshCw size={15}/>,
  'tables.status': <FiCheckCircle size={15}/>,
  'tables.waiter': <FiUser size={15}/>,
  'tables.timer': <FiClock size={15}/>,
  'appointments.online': <FiGlobe size={15}/>,
  'appointments.reminders': <FiBell size={15}/>,
  'appointments.prepay': <FiDollarSign size={15}/>,
  'appointments.recurring': <FiRefreshCw size={15}/>,
  'appointments.agenda': <FiCalendar size={15}/>,
  'appointments.history': <FiClock size={15}/>,
  'appointments.block': <FiLock size={15}/>,
  'appointments.services': <FiGrid size={15}/>,
  'routes.map': <FiMap size={15}/>,
  'routes.zones': <FiGrid size={15}/>,
  'routes.optimization': <FiTrendingUp size={15}/>,
  'routes.cost': <FiDollarSign size={15}/>,
  'routes.history': <FiClock size={15}/>,
  'einvoicing.debit_notes': <FiFileText size={15}/>,
  'einvoicing.credit_notes': <FiFileText size={15}/>,
  'einvoicing.remissions': <FiFileText size={15}/>,
  'einvoicing.void': <FiX size={15}/>,
  'einvoicing.reports': <FiBarChart2 size={15}/>,
  'einvoicing.status': <FiCheckCircle size={15}/>,
  'einvoicing.retentions': <FiLock size={15}/>,
  'notifications.email': <FiMail size={15}/>,
  'notifications.scheduled': <FiClock size={15}/>,
  'notifications.push': <FiBell size={15}/>,
  'odontologia.reportes': <FiBarChart2 size={15}/>,
  'odontologia.planes': <FiGrid size={15}/>,
  'odontologia.tratamientos': <FiBook size={15}/>,
  'odontologia.historias': <FiFileText size={15}/>,
  'odontologia.pacientes': <FiUsers size={15}/>,
  'odontologia.agenda': <FiCalendar size={15}/>,
  'odontologia.configuracion': <FiSettings size={15}/>,
  'odontologia.plantilla.recetas': <FiFileText size={15}/>,
  'payments.methods': <FiCreditCard size={15}/>,
};

/* ── Resolver icono por código de página ── */
const resolvePageIcon = (pageCode, modCode) => {
  if (pageCode && PAGE_ICONS[pageCode]) {
    return PAGE_ICONS[pageCode];
  }
  if (modCode && MOD_ICONS[modCode]) {
    return MOD_ICONS[modCode];
  }
  return <FiZap size={15}/>;
};

const toSlug = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

function buildSidebarMenu(navData) {
  if (!navData?.modules?.length) return [];

  return navData.modules
    .map(mod => {
      const modIcon = MOD_ICONS[mod.code] || <FiZap size={17}/>;
      
      const pages = (mod.pages || []).filter(page => page && page.name);

      // ❌ Si no tiene páginas, no mostrar el módulo
      if (pages.length === 0) {
        return null;
      }

      const resolvePath = (rawPath, fallback) => {
        if (!rawPath) return fallback;
        return rawPath.startsWith('/app') ? rawPath : `/app${rawPath}`;
      };

      // ✅ Si tiene una sola página
      if (pages.length === 1) {
        const single = pages[0];
        return {
          label: single.name || mod.name,
          icon: modIcon,
          path: resolvePath(single.path, `/app/${mod.code}`),
          items: []
        };
      }

      // ✅ Si tiene múltiples páginas, mostrar TODAS como subitems
      // La primera página será la principal (ruta de la sección)
      const mainPage = pages[0];
      const mainPath = resolvePath(mainPage?.path, `/app/${mod.code}`);
      
      // ✅ TODAS las páginas van como subitems (incluyendo la primera)
      const allPages = pages.map(page => ({
        label: page.name || 'Sin nombre',
        path: resolvePath(page.path, `/app/${mod.code}/${toSlug(page.name || '')}`),
        icon: resolvePageIcon(page.code, mod.code),
      }));

      return {
        section: mod.name,
        icon: modIcon,
        path: mainPath,  // La primera página como ruta por defecto
        items: allPages, // ✅ TODAS las páginas como subitems
      };
    })
    .filter(Boolean);
}


const getStoredBiz = () => {
  try {
    // Leer de sessionStorage 
    const fromSession = sessionStorage.getItem('business_id');
    if (fromSession) {
      return { id: fromSession };
    }
    return null;
  } catch {
    return null;
  }
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
    <Modal
      isOpen={true}
      onClose={() => {}}
      size="sm"
      title="Apertura de Caja Requerida"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      footer={
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            onClick={onAceptar}
            disabled={abriendo}
            loading={abriendo}
            block
          >
            {abriendo ? 'Abriendo cajón...' : 'Aceptar y Abrir Caja'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="alerta-apertura-content">
        <p className="alerta-apertura-message">
          Debes registrar la apertura de caja antes de comenzar a operar.
          <br /><br />
          Al presionar <strong>"Aceptar y Abrir Caja"</strong>, se abrirá el cajón físico 
          y podrás ingresar los datos iniciales.
        </p>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   MODAL DE CONFIRMACIÓN PARA CIERRE DE CAJA
══════════════════════════════════════════════════════════ */
function OrdenesPendientesModal({ ordenes, onClose }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="sm"
      title="Órdenes Pendientes de Pago"
      footer={
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            onClick={onClose}
          >
            Ir a cobrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="ordenes-pendientes-content">
        <p className="ordenes-pendientes-message">
          <strong>No puedes cerrar la caja con órdenes pendientes de pago.</strong>
          <br /><br />
          Tienes <strong style={{ color: 'var(--danger)' }}>{ordenes.length} orden{ordenes.length !== 1 ? 'es' : ''}</strong> sin cobrar. 
          Debes cobrarlas o eliminarlas antes de cerrar.
        </p>
        
        <div className="ordenes-pendientes-lista">
          {ordenes.length > 10 && (
            <p className="ordenes-pendientes-mas">
              ...y {ordenes.length - 10} más
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ConfirmarCierreModal({ onConfirm, onCancel, cargando }) {
  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      size="sm"
      className="confirmar-cierre-modal"
      overlayClassName="confirmar-cierre-overlay"
      title='Confirmar Cierre de Caja'
      footer={
          <ButtonGroup>
            <IconTextButton
              variant=""
              size="md"
              icon={<FiX size={14} />}
              onClick={onCancel}
              disabled={cargando}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              onClick={onConfirm}
              disabled={cargando}
              loading={cargando}
            >
              {cargando ? 'Cerrando caja...' : 'Sí, Cerrar Caja'}
            </IconTextButton>
          </ButtonGroup>
      }
    >
      <div className="confirmar-cierre-content">
        <p className="confirmar-cierre-message">
          <strong>¿Estás seguro que deseas cerrar la caja?</strong>
          <br /><br />
          Una vez cerrada la caja:
          <br />
          • No podrás cobrar hasta la próxima apertura
          <br />
          • Se generará el reporte de cierre del día
          <br />
          • Se imprimirá el ticket de cierre
          <br /><br />
          <strong>El cajón se abrirá para que puedas contar el dinero.</strong>
        </p>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════
   BUSINESS LAYOUT
══════════════════════════════════════════════════════════ */
export default function BusinessLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useSession();

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

  useEffect(() => {
    if (mobileOpen) setCollapsed(false);
  }, [mobileOpen]);

  
  const [selectedBiz, setSelectedBiz] = useState(getStoredBiz);

  useQzTray();
  const businessId = user?.businessId || selectedBiz?.id;
 
  useAutoPrint({ businessId, enabled: true });


  const { updateReady, countdown } = useAppVersion();
  const { playOrderReady } = useSoundAlert();

  useEffect(() => {
    if (!selectedBiz?.id) return;
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(process.env.REACT_APP_API_BASE || 'https://idon-plataform-backend.onrender.com', {
      auth: { token, businessId: selectedBiz.id },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });
    socket.on('order_ready', () => { playOrderReady(); });
    return () => socket.disconnect();
  }, [selectedBiz?.id, playOrderReady]);

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
  const [abriendoCajonCierre, setAbriendoCajonCierre] = useState(false);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [cargandoCierreInicial, setCargandoCierreInicial] = useState(false);

  const abrirCajon = useCallback(async () => {
    try {
      await openCashDrawer();
      return true;
    } catch (err) {
      return false;
    }
  }, [openCashDrawer]);

  const checkApertura = useCallback(async () => {
    if (!isCashierRole(user)) { 
      setAperturaChecked(true); 
      setAperturaHecha(true); 
      return; 
    }
    
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      const res = await fetchWithAuth(`/pos/cash-register/opening?date=${today}`);
      
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
      setAperturaHecha(true);
    } finally {
      setAperturaChecked(true);
    }
  }, [user]);

  useEffect(() => { checkApertura(); }, [checkApertura]);

  const cargarDatosCierre = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
            
      const [sumRes, openRes, incomesRes] = await Promise.all([
        fetchWithAuth(`/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/pos/cash-register/income-extra?date=${today}`)
      ]);

      let summary = {};
      let opening = {};
      let incomes = [];

      if (sumRes.ok) {
        summary = await sumRes.json();
      }
      
      if (openRes.ok) {
        opening = await openRes.json();
      }
      
      if (incomesRes.ok) {
        incomes = await incomesRes.json();
      }

      return {
        summary: summary,
        opening: opening,
        incomes: incomes
      };
    } catch (err) {
      return null;
    }
  };

  function CargandoCierreModal() {
    return (
      <div className="spinner-overlay">
        <div className="spinner-brand">
          <div className="spinner-loader spinner-loader-lg spinner-primary" />
          <div className="brand-text">
            ID<span className="highlight">ON</span>
          </div>
          <div className="sub-text">Preparando cierre de caja...</div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // CIERRE DE CAJA - CON VERIFICACIÓN DE EXISTENCIA
  // ═══════════════════════════════════════════════════════
  const handleClickCerrarCaja = async () => {
    if (!aperturaHecha) {
      setError('No hay una apertura de caja activa. Debes abrir caja primero.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    setCargandoCierreInicial(true);

    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
      
      const closeRes = await fetchWithAuth(`/pos/cash-register/full-closing?date=${today}`);
      
      if (closeRes.status === 200) {
        const existingClose = await closeRes.json();
        if (existingClose && existingClose.id) {
          
          const [sumRes, openRes, incomesRes] = await Promise.all([
            fetchWithAuth(`/pos/cash-register/summary?date=${today}`),
            fetchWithAuth(`/pos/cash-register/opening?date=${today}`),
            fetchWithAuth(`/pos/cash-register/income-extra?date=${today}`)
          ]);

          const datosCierre = {
            summary: sumRes.ok ? await sumRes.json() : {},
            opening: openRes.ok ? await openRes.json() : {},
            incomes: incomesRes.ok ? await incomesRes.json() : [],
            existingClose: existingClose
          };

          setDatosCierre(datosCierre);
          setCargandoCierreInicial(false);
          setMostrarCierreForm(true);
          return;
        }
      }
      
      try {
        const res = await fetchWithAuth('/ordenes?status=pending');
        if (res.ok) {
          const pendientes = await res.json();
          const lista = Array.isArray(pendientes) ? pendientes : (pendientes.orders || pendientes.data || []);
          if (lista.length > 0) {
            setOrdenesPendientes(lista);
            setCargandoCierreInicial(false);
            return;
          }
        }
      } catch { /* continuar */ }

      const datos = await cargarDatosCierre();
      setCargandoCierreInicial(false);
      
      if (!datos) {
        setError('Error al cargar los datos para el cierre');
        setTimeout(() => setError(null), 4000);
        return;
      }
      
      setDatosCierre(datos);
      setMostrarConfirmacionCierre(true);
      
    } catch (err) {
      setCargandoCierreInicial(false);
      setError('Error al verificar cierre existente');
      setTimeout(() => setError(null), 4000);
    }
  };

  // CONFIRMAR CIERRE
  const handleConfirmarCierre = async () => {
    setMostrarConfirmacionCierre(false);
    setAbriendoCajonCierre(true);
    
    await abrirCajon();
    
    setAbriendoCajonCierre(false);
    setMostrarCierreForm(true);
  };

  // CANCELAR CIERRE
  const handleCancelarCierre = () => {
    setMostrarConfirmacionCierre(false);
  };

  // CIERRE COMPLETO
  const handleCierreCompleto = async (cierreData) => {
    const operador = getOperatorUser();
    const userName = operador?.nombre || operador?.name || operador?.username || operador?.email || 'Usuario';
    
    if (operador?.id && cierreData) {
      await fetchWithAuth('/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          user_name: userName,
          user_email: operador?.email || '',
          table_name: "cash_drawer",
          action: "c_business",
          description: `Cierre de caja completado por ${userName}. Total sistema: $${cierreData?.total_system || 0}, Total contado: $${cierreData?.total_counted || 0}, Diferencia: $${cierreData?.diff_total || 0}`,
          new_values: {
            total_system: cierreData?.total_system || 0,
            total_counted: cierreData?.total_counted || 0,
            diff_total: cierreData?.diff_total || 0,
            orders_system: cierreData?.orders_system || 0,
            cash_counted: cierreData?.cash_counted || 0,
            transfer_counted: cierreData?.transfer_counted || 0,
            card_counted: cierreData?.card_counted || 0,
            tip_counted: cierreData?.tip_counted || 0,
            date: cierreData?.date || new Date().toISOString().split('T')[0],
            remarks: cierreData?.remarks || '',
          },
          reason: "Cierre de caja completado"
        })
      }).catch(() => {});
    }

    setAperturaHecha(false);
    await checkApertura();
    setMostrarCierreForm(false);
  };

  // ═══════════════════════════════════════════════════════
  // APERTURA DE CAJA
  // ═══════════════════════════════════════════════════════
  const handleAceptarAlerta = async () => {
    if (aperturaIniciada || abriendoCaja) return;
    
    setAperturaIniciada(true);
    setAbriendoCaja(true);

    await abrirCajon();

    setAbriendoCaja(false);
    setAperturaIniciada(false);
    setMostrarAlerta(false);
    setMostrarFormulario(true);
  };

  const handleClickAbrirCaja = async () => {
    if (aperturaHecha) {
      if (window.alert) {
        alert('Ya hay una apertura de caja activa para hoy');
      }
      return;
    }
    
    setAbriendoCaja(true);
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

      await fetchWithAuth('/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: "cash_drawer",
          action: "a_caja",
          description: `Apertura de caja completada por ${userName}. Efectivo: $${totalEfectivo.toFixed(2)}, Banca: $${montoBanca.toFixed(2)}, Total: $${totalInicial.toFixed(2)}`,
          new_values: {
            total_efectivo: totalEfectivo,
            monto_banca: montoBanca,
            total_inicial: totalInicial,
            observaciones: data.observaciones || null
          },
          reason: "Registro de Apertura"
        })
      }).catch(() => {});
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
        const storedBiz = getStoredBiz();
        
        // Intentar cargar del backend
        try {
          const response = await api.get('/business-status/navigation', {
            headers: {
              ...(storedBiz?.id ? { 'x-business-id': storedBiz.id } : {}),
            },
          });
          
          if (response.data?.ok && response.data?.data?.modules?.length > 0) {
            setNavData(response.data.data);
          } else {
            setNavData({ modules: null });
          }
        } catch (e) {
          setNavData({ modules: null });
        }
        
      } catch (e) {
        // Menú por defecto en caso de error
        setNavData({ 
          modules: [
            { id: 1, name: 'Dashboard', code: 'core', path: '/home', pages: [] }
          ] 
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      // Silently handle logout error
    }
  };

  if (loading) {
    return (
      <div className="spinner-overlay">
        <div className="spinner-brand">
          <div className="spinner-loader spinner-loader-lg spinner-primary" />
          <div className="brand-text">
            ID<span className="highlight">ON</span>
          </div>
          <div className="sub-text">Cargando panel...</div>
        </div>
      </div>
    );
  }

  return (
    <>
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

      {aperturaChecked && mostrarAlerta && !mostrarFormulario && !mostrarCierreForm && (
        <AlertaAperturaModal 
          onAceptar={handleAceptarAlerta}
          abriendo={abriendoCaja}
        />
      )}

      {cargandoCierreInicial && <CargandoCierreModal />}

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

      {ordenesPendientes.length > 0 && (
        <OrdenesPendientesModal
          ordenes={ordenesPendientes}
          onClose={() => setOrdenesPendientes([])}
        />
      )}

      {mostrarConfirmacionCierre && (
        <ConfirmarCierreModal
          onConfirm={handleConfirmarCierre}
          onCancel={handleCancelarCierre}
          cargando={abriendoCajonCierre}
        />
      )}

      {mostrarCierreForm && datosCierre && (
        <CierreDeCajaPage
          cajaData={datosCierre}
          user={user}
          onClose={(exitoso, cierreData) => {
            setMostrarCierreForm(false);
            if (exitoso) {
              handleCierreCompleto(cierreData || datosCierre);
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
              <img src="/IDON_2.svg" alt="IDON" className="mobile-topbar-logo" />
              <span className="mobile-topbar-brand-text">
                <span className="mobile-topbar-name"><span className="logo-white">ID</span><span className="logo-orange">ON</span></span>
                <span className="mobile-topbar-subtitle">GESTIÓN MULTINEGOCIOS</span>
              </span>
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
    </>
  );
}