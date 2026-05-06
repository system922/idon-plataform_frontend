import React, { useState, useEffect } from 'react';
import {
  FiX, FiCheck, FiCreditCard, FiBox, FiSettings, FiShoppingCart,
  FiBarChart2, FiDollarSign, FiBriefcase, FiTruck, FiGrid,
  FiCalendar, FiStar, FiShoppingBag, FiUsers, FiUserCheck,
  FiMap, FiMapPin, FiList, FiGlobe, FiBell, FiFileText,
  FiThermometer, FiPercent, FiTag, FiLoader,
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';

/* ─── Iconos por módulo ──────────────────────────────────── */
const MOD_ICONS = {
  core:          <FiSettings   size={13}/>,
  pos:           <FiShoppingCart size={13}/>,
  inventory:     <FiBox        size={13}/>,
  reports:       <FiBarChart2  size={13}/>,
  payments:      <FiCreditCard size={13}/>,
  accounting:    <FiDollarSign size={13}/>,
  orders:        <FiBriefcase  size={13}/>,
  kitchen:       <FiThermometer size={13}/>,
  delivery:      <FiTruck      size={13}/>,
  tables:        <FiGrid       size={13}/>,
  reservations:  <FiCalendar   size={13}/>,
  loyalty:       <FiStar       size={13}/>,
  suppliers:     <FiTruck      size={13}/>,
  purchases:     <FiShoppingBag size={13}/>,
  appointments:  <FiCalendar   size={13}/>,
  employees:     <FiUsers      size={13}/>,
  crm:           <FiUserCheck  size={13}/>,
  routes:        <FiMap        size={13}/>,
  tracking:      <FiMapPin     size={13}/>,
  queue:         <FiList       size={13}/>,
  ecommerce:     <FiGlobe      size={13}/>,
  notifications: <FiBell       size={13}/>,
  einvoicing:    <FiFileText   size={13}/>,
};

const Lbl = ({ children }) => (
  <label style={{
    display: 'block', marginBottom: '5px', fontSize: '10px',
    color: '#8CB79B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.6px',
  }}>
    {children}
  </label>
);

const Row = ({ label, value, highlight, muted, large }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px',
  }}>
    <span style={{ fontSize: large ? '15px' : '13px', fontWeight: large ? 700 : 500,
      color: muted ? 'var(--admin-text-muted)' : 'var(--admin-text-primary)' }}>
      {label}
    </span>
    <span style={{ fontSize: large ? '22px' : '14px', fontWeight: large ? 800 : 600,
      color: highlight || 'var(--admin-text-primary)' }}>
      {value}
    </span>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SUBSCRIPTION MODAL (CREAR / EDITAR)
   Props:
     business              — { id, business_name, business_type_name, modules: [] }
     existingSubscription  — objeto de suscripción existente (opcional)
     apiFetch              — función async para llamar al backend
     onClose               — cerrar modal
     onSaved               — callback tras éxito
═══════════════════════════════════════════════════════════ */
export default function SubscriptionModal({ business, existingSubscription, onClose, onSaved }) {
  const [loading, setLoading] = useState(!existingSubscription);
  const [period, setPeriod] = useState('monthly');
  const [discount, setDiscount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [existingSub, setExistingSub] = useState(existingSubscription || null);

  const modules = business.modules || [];

  // Si se pasó existingSubscription como prop, cargar los datos inmediatamente
  useEffect(() => {
    if (existingSubscription) {
      setExistingSub(existingSubscription);
      setPeriod(existingSubscription.billing_period || 'monthly');
      setBillingDay(String(existingSubscription.billing_day || 1));
      setStatus(existingSubscription.status || 'active');
      if (existingSubscription.discount_percentage) {
        setDiscount(String(existingSubscription.discount_percentage));
      }
      setLoading(false);
    } else {
      // Cargar suscripción existente desde la API si no se pasó
      const loadExistingSubscription = async () => {
        try {
          const subRes = await adminApiService.get(`/admin/businesses/${business.id}/subscription`);
          if (subRes.data) {
            setExistingSub(subRes.data);
            setPeriod(subRes.data.billing_period || 'monthly');
            setBillingDay(String(subRes.data.billing_day || 1));
            setStatus(subRes.data.status || 'active');
            if (subRes.data.discount_percentage) {
              setDiscount(String(subRes.data.discount_percentage));
            }
          }
        } catch (e) {
          console.log('No tiene suscripción existente');
        } finally {
          setLoading(false);
        }
      };
      loadExistingSubscription();
    }
  }, [business.id, existingSubscription]);

  /* ── Cálculos ── */
  const subtotalMens = modules.reduce((s, m) => s + parseFloat(m.price_monthly || 0), 0);
  const subtotalAnu  = modules.reduce((s, m) => s + parseFloat(m.price_annual  || 0), 0);
  const subtotal     = period === 'monthly' ? subtotalMens : subtotalAnu;

  const discPct      = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
  const discountAmt  = parseFloat((subtotal * discPct / 100).toFixed(2));
  const total        = parseFloat((subtotal - discountAmt).toFixed(2));
  const savingAnu    = parseFloat((subtotalMens * 12 - subtotalAnu).toFixed(2));

  const isEdit = !!existingSub;

  /* ── Guardar suscripción (CREAR o ACTUALIZAR) ── */
  const handleSave = async () => {
    if (modules.length === 0 && !isEdit) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        billing_period: period,
        billing_day: parseInt(billingDay) || 1,
        discount_percentage: discPct,
      };

      if (isEdit) {
        payload.status = status;
        await adminApiService.put(`/admin/businesses/${business.id}/subscription/${existingSub.id}`, payload);
      } else {
        await adminApiService.post(`/admin/businesses/${business.id}/subscribe`, payload);
      }
      setMsg({ ok: true, text: isEdit ? '✅ Suscripción actualizada correctamente' : '✅ Suscripción creada correctamente' });
      onSaved();
      setTimeout(onClose, 1600);
    } catch (e) {
      setMsg({ ok: false, text: '❌ ' + e.message });
    } finally {
      setSaving(false);
    }
  };

  const inp = {
    width: '100%', padding: '9px 12px',
    background: 'var(--admin-bg-primary)',
    border: '1px solid var(--admin-border-light)',
    borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '13px',
    outline: 'none',
  };

  if (loading) {
    return (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)',
        display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200, padding:'16px' }}
        onClick={onClose}>
        <div style={{ background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border-light)',
          borderRadius:'16px', maxWidth:'600px', width:'100%', padding:'40px', textAlign:'center' }}
          onClick={e => e.stopPropagation()}>
          <FiLoader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p>Cargando datos de suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1200, padding:'16px' }}
      onClick={onClose}>
      <div style={{ background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border-light)',
        borderRadius:'16px', maxWidth:'600px', width:'100%', maxHeight:'90vh',
        display:'flex', flexDirection:'column', color:'var(--admin-text-primary)', overflow:'hidden',
        boxShadow:'0 24px 60px rgba(0,0,0,.5)' }}
        onClick={e => e.stopPropagation()}>
        
        <div style={{ padding:'20px 24px 16px', flexShrink:0, borderBottom:'1px solid var(--admin-border-light)',
          display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ margin:0, fontSize:'17px', display:'flex', alignItems:'center', gap:'9px' }}>
            <FiCreditCard size={19} style={{ color:'#ff8c42' }}/>
            {isEdit ? 'Editar Suscripción' : 'Nueva Suscripción'}
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            color:'var(--admin-text-muted)', fontSize:'20px', lineHeight:1 }}><FiX/></button>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'20px 24px' }}>
          {/* Negocio */}
          <div style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--admin-border-light)' }}>
            <Lbl>Negocio</Lbl>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'6px' }}>
              <div><p style={{ margin:0, fontSize:'10px', color:'var(--admin-text-muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'3px' }}>Nombre</p>
                <p style={{ margin:0, fontWeight:700, fontSize:'14px' }}>{business.business_name}</p></div>
              <div><p style={{ margin:0, fontSize:'10px', color:'var(--admin-text-muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:'3px' }}>Tipo</p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--admin-text-secondary)' }}>{business.business_type_name}</p></div>
            </div>
          </div>

          {/* Módulos */}
          <div style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--admin-border-light)' }}>
            <Lbl>Módulos activos ({modules.length})</Lbl>
            {modules.length === 0 ? (
              <p style={{ margin:'8px 0 0', color:'var(--admin-text-muted)', fontSize:'13px' }}>
                Sin módulos activos. Configura módulos desde la sección de módulos del negocio.
              </p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'5px', marginTop:'8px' }}>
                {modules.map(m => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'7px 12px', borderRadius:'8px', background:'rgba(255,140,66,.05)', border:'1px solid rgba(255,140,66,.15)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ color:'#ff8c42' }}>{MOD_ICONS[m.code] || <FiBox size={13}/>}</span>
                      <span style={{ fontSize:'13px', fontWeight:600 }}>{m.name}</span>
                    </div>
                    <div style={{ display:'flex', gap:'14px', fontSize:'11px' }}>
                      <span style={{ color:'var(--admin-text-muted)' }}>${parseFloat(m.price_monthly || 0).toFixed(2)}<span style={{ opacity:.6 }}>/mes</span></span>
                      <span style={{ color:'#ff8c42', fontWeight:700 }}>${parseFloat(m.price_annual || 0).toFixed(2)}<span style={{ fontWeight:400, opacity:.6 }}>/año</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Período de facturación */}
          <div style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--admin-border-light)' }}>
            <Lbl>Período de facturación</Lbl>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginTop:'8px' }}>
              {[
                { value:'monthly', label:'Mensual', price:subtotalMens, unit:'mes' },
                { value:'annual',  label:'Anual',   price:subtotalAnu,  unit:'año' },
              ].map(opt => (
                <div key={opt.value} onClick={() => setPeriod(opt.value)} style={{
                  padding:'14px', borderRadius:'10px', cursor:'pointer',
                  border:`2px solid ${period === opt.value ? '#ff8c42' : 'var(--admin-border-light)'}`,
                  background: period === opt.value ? 'rgba(255,140,66,.08)' : 'transparent'
                }}>
                  <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'6px' }}>{opt.label}</div>
                  <div style={{ fontSize:'20px', fontWeight:800, color:'#ff8c42' }}>
                    ${opt.price.toFixed(2)}<span style={{ fontSize:'11px', fontWeight:400, color:'var(--admin-text-muted)', marginLeft:'3px' }}>/{opt.unit}</span>
                  </div>
                  {opt.value === 'annual' && savingAnu > 0 && <div style={{ fontSize:'11px', color:'#22c55e', marginTop:'4px' }}>Ahorro: ${savingAnu.toFixed(2)}</div>}
                </div>
              ))}
            </div>
            <div style={{ marginTop:'14px' }}>
              <Lbl>Día de facturación del mes (1-28)</Lbl>
              <input type="number" min="1" max="28" value={billingDay} onChange={e => setBillingDay(e.target.value)} style={inp}/>
            </div>
          </div>

          {/* Descuento */}
          <div style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--admin-border-light)' }}>
            <Lbl>Descuento</Lbl>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'8px', alignItems:'end' }}>
              <div>
                <p style={{ margin:'0 0 5px', fontSize:'11px', color:'var(--admin-text-muted)' }}>Porcentaje (%)</p>
                <div style={{ position:'relative' }}>
                  <input type="number" min="0" max="100" step="0.5" value={discount}
                    onChange={e => setDiscount(e.target.value)} placeholder="0"
                    style={{ ...inp, paddingRight:'36px' }}/>
                  <span style={{ position:'absolute', right:'11px', top:'50%', transform:'translateY(-50%)',
                    color:'#ff8c42', fontSize:'14px', pointerEvents:'none' }}><FiPercent size={14}/></span>
                </div>
              </div>
              <div style={{ padding:'10px 14px', borderRadius:'9px', textAlign:'right',
                background: discountAmt > 0 ? 'rgba(140,183,155,.1)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${discountAmt > 0 ? 'rgba(140,183,155,.25)' : 'var(--admin-border-light)'}` }}>
                <p style={{ margin:0, fontSize:'11px', color:'var(--admin-text-muted)', marginBottom:'3px' }}>
                  <FiTag size={10} style={{ marginRight:4 }}/>Ahorro con descuento
                </p>
                <p style={{ margin:0, fontSize:'18px', fontWeight:800, color: discountAmt > 0 ? '#8CB79B' : 'var(--admin-text-muted)' }}>
                  {discountAmt > 0 ? `- $${discountAmt.toFixed(2)}` : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Estado de la suscripción (solo en edición) */}
          {isEdit && (
            <div style={{ marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid var(--admin-border-light)' }}>
              <Lbl>Estado de la suscripción</Lbl>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                <option value="active">Activa</option><option value="suspended">Suspendida</option>
                <option value="cancelled">Cancelada</option><option value="expired">Expirada</option>
              </select>
            </div>
          )}

          {/* Resumen total */}
          <div style={{ borderRadius:'12px', overflow:'hidden', border:'1px solid rgba(255,140,66,.2)' }}>
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} muted/>
            {discountAmt > 0 && <div style={{ borderTop:'1px solid rgba(255,140,66,.1)' }}>
              <Row label={`Descuento (${discPct}%)`} value={`- $${discountAmt.toFixed(2)}`} highlight="#8CB79B"/>
            </div>}
            <div style={{ borderTop:'1px solid rgba(255,140,66,.15)', background:'rgba(255,140,66,.07)' }}>
              <Row label={`Total ${period === 'monthly' ? 'mensual' : 'anual'}`}
                value={`$${total.toFixed(2)} / ${period === 'monthly' ? 'mes' : 'año'}`} highlight="#ff8c42" large/>
            </div>
          </div>
        </div>

        <div style={{ padding:'14px 24px', flexShrink:0, borderTop:'1px solid var(--admin-border-light)',
          display:'flex', flexDirection:'column', gap:'10px' }}>
          {msg && <div style={{ padding:'9px 13px', borderRadius:'8px', fontSize:'13px', fontWeight:600,
            background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            color: msg.ok ? '#22c55e' : '#ef4444',
            border: `1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }}>
            {msg.text}
          </div>}
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || (modules.length === 0 && !isEdit)}
              style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'7px',
                padding:'10px 20px', borderRadius:'8px', fontWeight:700, fontSize:'13px',
                border:'none', cursor: (modules.length === 0 && !isEdit) ? 'not-allowed' : 'pointer',
                background: (modules.length === 0 && !isEdit) ? 'rgba(255,255,255,.08)' : 'linear-gradient(135deg,#ff9d55,#e87030)',
                color: (modules.length === 0 && !isEdit) ? 'var(--admin-text-muted)' : '#fff',
                opacity: saving ? .7 : 1 }}>
              <FiCreditCard size={15}/>
              {saving ? (isEdit ? 'Actualizando...' : 'Creando...') : (isEdit ? 'Actualizar Suscripción' : 'Crear Suscripción')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}