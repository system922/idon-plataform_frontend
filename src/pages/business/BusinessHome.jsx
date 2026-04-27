import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBarChart2, FiShoppingCart, FiDollarSign, FiTrendingUp,
  FiAlertTriangle, FiCopy, FiCheck, FiLogOut, FiRefreshCw,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../config/apiBase';

const getStoredBiz = () => {
  try { return JSON.parse(localStorage.getItem('selectedBusiness') || 'null'); }
  catch { return null; }
};


// ─── CUENTAS BANCARIAS ────────────────────────────────────────────────────────
const BANK_ACCOUNTS = [
  {
    id: 1,
    bankName:      'BANCO PICHINCHA',
    bankImage:     'https://yt3.googleusercontent.com/8XLAF1AoMmKrX999-FMbfYlCLTtudDylFsU6LnTNQUYOqIQUTQaZpwVRylSwMJAKXCUHElck4A=s900-c-k-c0x00ffffff-no-rj',
    accountType:   'Cuenta de Ahorros',
    accountNumber: '2207508542',
  },
  {
    id: 2,
    bankName:      'BANCO BOLIVARIANO',
    bankImage:     'https://i0.wp.com/fiduvalor.com.ec/wp-content/uploads/2023/05/AQDL9O13aRNhSG6p.jpg?fit=1024%2C1024&ssl=1',
    accountType:   'Cuenta de Ahorros',
    accountNumber: '0004081788',
  },
  {
    id: 3,
    bankName:      'BANCO PRODUBANCO',
    bankImage:     'https://scalashopping.com/wp-content/uploads/2018/08/NuevoLogoPBO.jpg',
    accountType:   'Cuenta de Ahorros',
    accountNumber: '20300944487',
  },
];
// ─────────────────────────────────────────────────────────────────────────────

// ─── Página informativa de suscripción suspendida ─────────────────────────────
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

      {/* Título sección cuentas */}
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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
            {/* Cabecera: logo + nombre del banco */}
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
                  background: acc.bankColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                }}>
                  {acc.bankInitial}
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{acc.bankName}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{acc.accountType}</div>
              </div>
            </div>

            {/* Cuerpo: titular y número */}
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{acc.accountHolder}</div>
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

// ─── Stat card reutilizable ───────────────────────────────────────────────────
function StatCard({ icon, label, value, detail, color, bg }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: '1px solid rgba(255,255,255,.07)',
      borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: '20px 22px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: bg, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>{label}</p>
        <h2 style={{ margin: '0 0 3px', fontSize: 26, fontWeight: 800, color }}>{value}</h2>
        <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{detail}</p>
      </div>
    </div>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────────
export default function BusinessHome() {
  const navigate = useNavigate();
  const { logout: authLogout } = useAuth();

  const [allBusinesses, setAllBusinesses] = useState([]);
  const [selectedBiz,   setSelectedBiz]   = useState(getStoredBiz);
  const [bizLoading,    setBizLoading]    = useState(true);
  const [stats,         setStats]         = useState(null);
  const [statsLoading,  setStatsLoading]  = useState(false);
  const [error,         setError]         = useState('');

  // 1. Cargar todos los negocios del usuario con estado de suscripción
  useEffect(() => {
    (async () => {
      try {
        setBizLoading(true);
        const res  = await fetchWithAuth('/api/business-status/my-businesses');

        // Endpoint opcional — si no existe (404) o falla, continuar sin datos
        if (!res.ok) return;

        const data = await res.json();

        if (data.ok && Array.isArray(data.businesses)) {
          setAllBusinesses(data.businesses);

          // Verificar si el negocio almacenado sigue en la lista
          const stored     = getStoredBiz();
          const stillValid = data.businesses.find(b => b.id === stored?.id);

          if (!stillValid) {
            // Seleccionar el primer negocio activo disponible
            const firstActive =
              data.businesses.find(b => b.subscription_status !== 'suspended' && b.isActive !== false)
              || data.businesses[0];

            if (firstActive) {
              setSelectedBiz(firstActive);
              localStorage.setItem('selectedBusiness', JSON.stringify(firstActive));
            }
          } else {
            // Actualizar el negocio seleccionado con datos frescos (incluye subscription_status)
            setSelectedBiz(stillValid);
            localStorage.setItem('selectedBusiness', JSON.stringify(stillValid));
          }
        }
      } catch (e) {
        console.error('[BusinessHome] Error cargando negocios:', e);
      } finally {
        setBizLoading(false);
      }
    })();
  }, []);

  // 2. Cargar estadísticas al cambiar el negocio (solo si no está suspendido)
  useEffect(() => {
    if (!selectedBiz) return;
    const suspended = selectedBiz.subscription_status === 'suspended' || selectedBiz.isActive === false;
    if (suspended) return;
    fetchStats(selectedBiz);
  }, [selectedBiz?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchStats(biz) {
    try {
      setStatsLoading(true); setError('');
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

      const [salesR, purchR, clientR] = await Promise.allSettled([
        fetchWithAuth(`/api/reports/sales-today?date=${today}`),
        fetchWithAuth(`/api/compras?date=${today}`),
        fetchWithAuth('/api/clientes'),
      ]);

      const toJson = async (settled) => {
        if (settled.status === 'fulfilled' && settled.value.ok) {
          try { return await settled.value.json(); } catch { return {}; }
        }
        return {};
      };

      const [s, p, c] = await Promise.all([toJson(salesR), toJson(purchR), toJson(clientR)]);
      setStats({ sales: s, purchases: p, clients: c });
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setStatsLoading(false);
    }
  }

  const handleSwitchBusiness = (biz) => {
    localStorage.setItem('selectedBusiness', JSON.stringify(biz));
    localStorage.setItem('dbName', biz.schemaName || biz.slug || '');
    // Recarga completa para que BusinessLayout re-verifique suspensión y sidebar
    window.location.reload();
  };

  const handleLogout = () => {
    authLogout();
    localStorage.removeItem('idonToken');
    localStorage.removeItem('token');
    localStorage.removeItem('selectedBusiness');
    navigate('/login', { replace: true });
  };

  // ── Loading inicial ──────────────────────────────────────────────────────────
  if (bizLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 36, height: 36, border: '3px solid #ff8c42', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, margin: 0 }}>Cargando panel...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  // ── Negocio suspendido → página de pago ─────────────────────────────────────
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

  // ── Dashboard normal ─────────────────────────────────────────────────────────
  const s = stats?.sales     || {};
  const p = stats?.purchases || {};
  const salesTotal     = Number(s?.totals?.total ?? s?.total ?? 0);
  const salesTickets   = Number(s?.totals?.tickets_count ?? s?.tickets_count ?? s?.count ?? 0);
  const purchasesTotal = Number(p?.total ?? (Array.isArray(p) ? p.reduce((acc, r) => acc + Number(r.total ?? 0), 0) : 0));
  const clientsTotal   = Number(stats?.clients?.total ?? 0);
  const balance        = salesTotal - purchasesTotal;
  const fmt = n => `$${Number(n || 0).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: '#fff' }}>
            Dashboard de Gerente
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,.45)' }}>
            {selectedBiz?.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {allBusinesses.length > 1 && (
            <select
              value={selectedBiz?.id || ''}
              onChange={e => {
                const biz = allBusinesses.find(b => b.id === e.target.value);
                if (biz) handleSwitchBusiness(biz);
              }}
              style={{
                padding: '8px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(255,255,255,.15)',
                color: '#fff', fontSize: 13, cursor: 'pointer',
              }}
            >
              {allBusinesses.map(b => (
                <option key={b.id} value={b.id} style={{ background: '#1a1a1a' }}>
                  {b.name}{b.subscription_status === 'suspended' ? ' ⚠' : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => fetchStats(selectedBiz)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.1)',
              color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <FiRefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#ef4444', marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {statsLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 32, height: 32, border: '3px solid #ff8c42', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
            <StatCard icon={<FiTrendingUp size={24}/>}  label="Ventas Hoy"      value={fmt(salesTotal)}     detail={`${salesTickets} tickets`} color="#10b981" bg="rgba(16,185,129,.1)" />
            <StatCard icon={<FiShoppingCart size={24}/>} label="Compras Hoy"    value={fmt(purchasesTotal)} detail="Gastos operativos"          color="#3b82f6" bg="rgba(59,130,246,.1)" />
            <StatCard icon={<FiDollarSign size={24}/>}   label="Balance Neto"   value={fmt(balance)}        detail="Ganancia neta"              color={balance >= 0 ? '#10b981' : '#ef4444'} bg={balance >= 0 ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'} />
            <StatCard icon={<FiBarChart2 size={24}/>}    label="Clientes Totales" value={clientsTotal}      detail="En la base de datos"        color="#a855f7" bg="rgba(168,85,247,.1)" />
          </div>

          {/* Acciones rápidas */}
          <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.7)' }}>Acciones Rápidas</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { label: 'Nuevo Ticket', path: '/app/pos/ventas-en-caja' },
                { label: 'Inventario',   path: '/app/inventory' },
                { label: 'Compras',      path: '/app/purchases' },
                { label: 'Reportes',     path: '/app/reports' },
                { label: 'Abrir Caja',   path: '/app/pos/apertura-cierre-de-caja' },
              ].map(a => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(255,140,66,.3)', background: 'rgba(255,140,66,.08)', color: '#ff8c42' }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
