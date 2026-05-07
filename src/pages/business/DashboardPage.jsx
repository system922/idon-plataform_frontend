import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import StatsCardsSection from '../../components/StatsCardsSection';
import SalesChartSection from '../../components/SalesChartSection';
import GraphsRowSection from '../../components/GraphsRowSection.js';
import QuickActionsSection from '../../components/QuickActionsSection';
import { fetchWithAuth } from '../../config/apiBase';
import { useAuth } from '../../context/AuthContext';
import { FiRefreshCw, FiAlertTriangle, FiCopy, FiCheck, FiLogOut } from 'react-icons/fi';
import '../../styles/Dashboard.css';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const getStoredBiz = () => {
  try { return JSON.parse(localStorage.getItem('selectedBusiness') || 'null'); }
  catch { return null; }
};

// ─── DATOS DEL PROPIETARIO ───────────────────────────────────────────────────
const OWNER_INFO = {
  fullName: 'Jefferson Gregorio Cagua Figueroa',
  cedula: '1315614477',
  email: 'jcaguafigueroa9907@gmail.com',
};

// ─── CUENTAS BANCARIAS ───────────────────────────────────────────────────────
const BANK_ACCOUNTS = [
  {
    id: 1,
    bankName: 'BANCO PICHINCHA',
    bankImage: 'https://yt3.googleusercontent.com/8XLAF1AoMmKrX999-FMbfYlCLTtudDylFsU6LnTNQUYOqIQUTQaZpwVRylSwMJAKXCUHElck4A=s900-c-k-c0x00ffffff-no-rj',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '2207508542',
  },
  {
    id: 2,
    bankName: 'BANCO BOLIVARIANO',
    bankImage: 'https://i0.wp.com/fiduvalor.com.ec/wp-content/uploads/2023/05/AQDL9O13aRNhSG6p.jpg?fit=1024%2C1024&ssl=1',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '0004081788',
  },
  {
    id: 3,
    bankName: 'BANCO PRODUBANCO',
    bankImage: 'https://scalashopping.com/wp-content/uploads/2018/08/NuevoLogoPBO.jpg',
    accountType: 'Cuenta de Ahorros',
    accountNumber: '20300944487',
  },
];

// ─── Página de suscripción suspendida ─────────────────────────────────────────
function SuspendedPage({ business, otherBusinesses, onSwitchBusiness, onLogout }) {
  const [copied, setCopied] = useState(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ maxWidth: 950, margin: '0 auto', padding: '32px 16px' }}>
      {/* Banner de alerta */}
      <div style={{
        background: 'rgba(245,158,11,.08)',
        border: '1px solid rgba(245,158,11,.3)',
        borderRadius: 16,
        padding: '28px 32px',
        marginBottom: 32,
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
      }}>
        <div style={{
          flexShrink: 0, width: 52, height: 52, borderRadius: 12,
          background: 'rgba(245,158,11,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <FiAlertTriangle size={26} color="#f59e0b" />
        </div>
        <div>
          <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>
            Suscripción Suspendida
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,.75)', lineHeight: 1.7 }}>
            El acceso a <strong style={{ color: '#fff' }}>{business?.name}</strong> ha sido
            suspendido por falta de pago. Para reactivar tu suscripción, realiza la transferencia
            a cualquiera de las cuentas indicadas y envía el comprobante al soporte.
          </p>
        </div>
      </div>

      {/* Información del titular */}
      <div style={{
        background: 'rgba(255,255,255,.04)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 14,
        padding: '20px 24px',
        marginBottom: 28,
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Titular de las cuentas
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          <div><span style={{ color: 'rgba(255,255,255,.4)' }}>Nombre:</span> <strong style={{ color: '#fff' }}>{OWNER_INFO.fullName}</strong></div>
          <div><span style={{ color: 'rgba(255,255,255,.4)' }}>Cédula:</span> <strong style={{ color: '#fff' }}>{OWNER_INFO.cedula}</strong></div>
          <div><span style={{ color: 'rgba(255,255,255,.4)' }}>Correo:</span> <strong style={{ color: '#fff' }}>{OWNER_INFO.email}</strong></div>
        </div>
      </div>

      <p style={{
        margin: '0 0 14px',
        fontSize: 11, fontWeight: 700,
        color: 'rgba(255,255,255,.4)',
        textTransform: 'uppercase', letterSpacing: '.7px',
      }}>
        Cuentas para transferencia
      </p>

      {/* Tarjetas de cuentas bancarias */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
        marginBottom: 28,
      }}>
        {BANK_ACCOUNTS.map(acc => (
          <div key={acc.id} style={{
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid rgba(255,255,255,.06)',
            }}>
              {acc.bankImage ? (
                <img
                  src={acc.bankImage}
                  alt={acc.bankName}
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 3 }}
                />
              ) : (
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {acc.bankName.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{acc.bankName}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{acc.accountType}</div>
              </div>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Titular: {OWNER_INFO.fullName}</div>
              </div>
              <div>
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,.4)',
                  textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4,
                }}>
                  Número de cuenta
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#ff8c42', letterSpacing: '.5px' }}>
                    {acc.accountNumber}
                  </span>
                  <button
                    onClick={() => copy(acc.accountNumber, acc.id)}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid rgba(255,255,255,.12)',
                      background: 'rgba(255,255,255,.05)',
                      color: copied === acc.id ? '#10b981' : 'rgba(255,255,255,.5)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontSize: 11, fontWeight: 600,
                    }}
                  >
                    {copied === acc.id
                      ? <><FiCheck size={12} /> Copiado</>
                      : <><FiCopy size={12} /> Copiar</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Nota informativa */}
      <div style={{
        padding: '14px 18px', borderRadius: 10,
        background: 'rgba(255,255,255,.03)',
        border: '1px solid rgba(255,255,255,.07)',
        marginBottom: 32,
        fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7,
      }}>
        Una vez realizado el pago, envía el comprobante al soporte para reactivar tu cuenta
        en un plazo de 5 a 10 min.
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {otherBusinesses.length > 0 && (
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'rgba(255,255,255,.5)' }}>
              Continuar con otro negocio activo:
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {otherBusinesses.map(biz => (
                <button
                  key={biz.id}
                  onClick={() => onSwitchBusiness(biz)}
                  style={{
                    padding: '9px 18px', borderRadius: 8,
                    border: '1px solid rgba(255,140,66,.3)',
                    background: 'rgba(255,140,66,.08)',
                    color: '#ff8c42', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {biz.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 8,
            border: '1px solid rgba(239,68,68,.3)',
            background: 'rgba(239,68,68,.08)',
            color: '#ef4444', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', width: 'fit-content',
          }}
        >
          <FiLogOut size={15} /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

// ─── Helper de horas (sin cambios) ──────────────────────────────────────────
function calcHours(emp) {
  const checkIn  = emp.entrada          ? new Date(emp.entrada)          : null;
  const lunchOut = emp.salida_almuerzo  ? new Date(emp.salida_almuerzo)  : null;
  const lunchIn  = emp.entrada_almuerzo ? new Date(emp.entrada_almuerzo) : null;
  const checkOut = emp.salida           ? new Date(emp.salida)           : null;

  if (!checkIn || !checkOut) return null;

  const totalMs = (lunchOut && lunchIn)
    ? (lunchIn - checkIn) + (checkOut - lunchOut)
    : (checkOut - checkIn);

  const hours = Math.round((totalMs / 3_600_000) * 100) / 100;
  return hours > 0 ? hours : 0;
}

function toArray(data) {
  return Array.isArray(data) ? data : data?.data ?? [];
}

// ─── Componente Principal ────────────────────────────────────────────────────
export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();
  
  const TZ = 'America/Guayaquil';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const fromDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toLocaleDateString('en-CA', { timeZone: TZ });
  })();

  // Estados del negocio y suscripción
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [selectedBiz, setSelectedBiz] = useState(getStoredBiz);
  const [bizLoading, setBizLoading] = useState(true);
  
  // Estados del dashboard
  const [stats, setStats] = useState(null);
  const [graphData, setGraphData] = useState({ sales: [], purchases: [], hours: [] });
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // 1. Cargar negocios y verificar suscripción
  useEffect(() => {
    (async () => {
      try {
        setBizLoading(true);
        const res = await fetchWithAuth('/api/business-status/my-businesses');

        if (!res.ok) {
          console.error('Error al cargar negocios');
          setBizLoading(false);
          return;
        }

        const data = await res.json();

        if (data.ok && Array.isArray(data.businesses)) {
          setAllBusinesses(data.businesses);

          const stored = getStoredBiz();
          const stillValid = data.businesses.find(b => b.id === stored?.id);

          if (!stillValid) {
            const firstActive = data.businesses.find(
              b => b.subscription_status !== 'suspended' && b.isActive !== false
            ) || data.businesses[0];

            if (firstActive) {
              setSelectedBiz(firstActive);
              localStorage.setItem('selectedBusiness', JSON.stringify(firstActive));
              localStorage.setItem('dbName', firstActive.schemaName || firstActive.slug || '');
            }
          } else {
            setSelectedBiz(stillValid);
            localStorage.setItem('selectedBusiness', JSON.stringify(stillValid));
          }
        }
      } catch (e) {
        console.error('[ManagerDashboard] Error cargando negocios:', e);
      } finally {
        setBizLoading(false);
      }
    })();
  }, []);

  // 2. Cargar datos del dashboard SOLO si el negocio NO está suspendido
  useEffect(() => {
    if (!selectedBiz) return;
    
    const isSuspended = selectedBiz.subscription_status === 'suspended' || selectedBiz.isActive === false;
    if (isSuspended) {
      setLoading(false);
      setGraphLoading(false);
      return;
    }
    
    fetchStats();
    fetchGraphs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBiz?.id]);

  async function fetchStats() {
    try {
      setLoading(true);
      const [salesRes, purchasesRes, pendingRes] = await Promise.all([
        fetchWithAuth(`/api/sales/today?date=${today}`),
        fetchWithAuth(`/api/expenses/dashboard/summary?date=${today}`),
        fetchWithAuth('/api/reports/pending'),
      ]);

      setStats({
        sales: salesRes.ok ? await salesRes.json() : {},
        purchases: purchasesRes.ok ? await purchasesRes.json() : {},
        pending: pendingRes.ok ? await pendingRes.json() : {},
      });
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGraphs() {
    try {
      setGraphLoading(true);
      const [salesRes, purchasesRes, attendanceRes] = await Promise.all([
        fetchWithAuth(`/api/graphs/sales-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth(`/api/graphs/purchases-by-day?from=${fromDate}&to=${today}`),
        fetchWithAuth('/api/attendance/today'),
      ]);

      const [salesData, purchasesData, attendanceData] = await Promise.all([
        salesRes.ok ? salesRes.json() : [],
        purchasesRes.ok ? purchasesRes.json() : [],
        attendanceRes.ok ? attendanceRes.json() : [],
      ]);

      const hours = toArray(attendanceData)
        .map(emp => {
          const h = calcHours(emp);
          if (h === null) return null;
          return { day: emp.full_name?.split(' ')[0] ?? `Emp ${emp.employee_id}`, hours: h };
        })
        .filter(Boolean);

      setGraphData({ sales: toArray(salesData), purchases: toArray(purchasesData), hours });
    } catch {
      setGraphData({ sales: [], purchases: [], hours: [] });
    } finally {
      setGraphLoading(false);
    }
  }

  async function handleRefresh() {
    if (!selectedBiz) return;
    
    const isSuspended = selectedBiz.subscription_status === 'suspended' || selectedBiz.isActive === false;
    if (isSuspended) return;
    
    setRefreshing(true);
    setError('');
    try {
      await Promise.all([fetchStats(), fetchGraphs()]);
    } catch {
      setError('Error al actualizar los datos');
    } finally {
      setRefreshing(false);
    }
  }

  const handleSwitchBusiness = (biz) => {
    localStorage.setItem('selectedBusiness', JSON.stringify(biz));
    localStorage.setItem('dbName', biz.schemaName || biz.slug || '');
    window.location.reload();
  };

  const handleLogout = () => {
    authLogout();
    localStorage.removeItem('idonToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedBusiness');
    navigate('/login', { replace: true });
  };

  // ── Computed values ─────────────────────────────────────────────────────
  const rawSales = stats?.sales ?? {};
  const rawPurchases = stats?.purchases ?? {};
  const rawPending = stats?.pending ?? {};

  let salesTotal = Number(rawSales.total_cobrado) || 0;
  let ticketsCount = Number(rawSales.tickets_count) || 0;
  let purchasesTotal = Number(rawPurchases.total) || 0;
  let pendingCount = Number(rawPending.count) || 0;

  if (ticketsCount > 0 && salesTotal === 0) {
    ticketsCount = 0;
  }

  if (purchasesTotal < 0) {
    purchasesTotal = Math.abs(purchasesTotal);
  }

  const balance = salesTotal - purchasesTotal;

  const statsData = {
    sales: { total: salesTotal, tickets: ticketsCount },
    purchases: { total: purchasesTotal },
    balance,
    pending: { count: pendingCount }
  };

  const refreshButton = (
    <button 
      onClick={handleRefresh} 
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} /> 
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Estados de carga y verificación de suscripción ───────────────────────
  
  if (bizLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #ff8c42', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, margin: 0 }}>Cargando panel...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // Verificar si el negocio está suspendido
  const isSuspended = selectedBiz?.subscription_status === 'suspended' || selectedBiz?.isActive === false;
  const otherActive = allBusinesses.filter(b =>
    b.id !== selectedBiz?.id &&
    b.subscription_status !== 'suspended' &&
    b.isActive !== false
  );

  if (isSuspended) {
    return (
      <SuspendedPage
        business={selectedBiz}
        otherBusinesses={otherActive}
        onSwitchBusiness={handleSwitchBusiness}
        onLogout={handleLogout}
      />
    );
  }

  // Si no hay negocio seleccionado
  if (!selectedBiz) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <p style={{ color: 'rgba(255,255,255,.5)' }}>No se encontró ningún negocio asociado</p>
      </div>
    );
  }

  // ── Dashboard normal (renovado) ─────────────────────────────────────────
  return (
    <div className="manager-dashboard-wrapper" style={{ padding: '0 0 20px 0' }}>
      {/* Selector de negocio en la parte superior */}
      {allBusinesses.length > 1 && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end',
          marginBottom: 20, padding: '0 4px'
        }}>
          <select
            value={selectedBiz?.id || ''}
            onChange={e => {
              const biz = allBusinesses.find(b => b.id === e.target.value);
              if (biz) handleSwitchBusiness(biz);
            }}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,.07)',
              border: '1px solid rgba(255,255,255,.15)',
              color: '#fff', fontSize: 13, cursor: 'pointer',
            }}
          >
            {allBusinesses.map(b => (
              <option key={b.id} value={b.id} style={{ background: '#1a1a1a' }}>
                {b.name} {b.subscription_status === 'suspended' ? '⚠ Suspendido' : '✓ Activo'}
              </option>
            ))}
          </select>
        </div>
      )}

      <PageTemplate 
        title="PANEL DE CONTROL" 
        subtitle={`${selectedBiz?.name || 'Resumen ejecutivo'}`}
        headerAction={refreshButton}
        loading={loading}
        error={error}
        onRetry={handleRefresh}
        theme="business"
      >
        <div className="custom-dashboard">
          <StatsCardsSection stats={statsData} />
          <SalesChartSection salesData={graphData.sales} />
          <GraphsRowSection 
            purchasesData={graphData.purchases}
            hoursData={graphData.hours}
            graphLoading={graphLoading}
          />
          <QuickActionsSection />
        </div>
      </PageTemplate>
    </div>
  );
}