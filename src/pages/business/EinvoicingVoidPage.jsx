import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  RefreshCw, AlertCircle, CheckCircle, XCircle, Clock,
  FileText, Search, X, Plus, Minus
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import { usePrinterService } from '../../services/usePrinterService';
import '../../styles/EinvoicingInvoicesPage.css';

const INV_STATUS = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'Autorizada', Icon: CheckCircle },
  anulada:    { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',  border: 'rgba(225,29,72,0.25)', label: 'Anulada',    Icon: XCircle    },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  label: 'Pendiente',  Icon: Clock      },
};

const CN_STATUS = {
  emitida:    { color: '#15803d', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'Emitida'    },
  autorizada: { color: '#6842fe', bg: 'rgba(104,66,254,0.08)', border: 'rgba(104,66,254,0.3)', label: 'Autorizada' },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  label: 'Pendiente'  },
};

export default function EinvoicingVoidPage() {
  const { print } = usePrinterService();
  const [invoices,   setInvoices  ] = useState([]);
  const [history,    setHistory   ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError     ] = useState('');
  const [success,    setSuccess   ] = useState('');
  const [search,     setSearch    ] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal,  setShowModal ] = useState(false);
  const [selInvoice, setSelInvoice] = useState(null);
  const [voidType,   setVoidType  ] = useState('total');   // 'total' | 'parcial'
  const [reason,     setReason    ] = useState('');
  const [items,      setItems     ] = useState([]);

  // ── Carga ────────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [invRes, cnRes] = await Promise.all([
        fetchWithAuth('/api/einvoicing/invoices?limit=200'),
        fetchWithAuth('/api/einvoicing/credit-notes'),
      ]);
      const invData = await invRes.json();
      const cnData  = await cnRes.json();
      // Solo facturas autorizadas o con crédito parcial
      setInvoices(
        (Array.isArray(invData) ? invData : [])
          .filter(i => i.status === 'autorizada' || i.status === 'anulada')
      );
      setHistory(Array.isArray(cnData) ? cnData : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Modal ────────────────────────────────────────────────────────────────────

  const openModal = (invoice) => {
    setSelInvoice(invoice);
    setVoidType('total');
    setReason('');
    setError('');
    const rawItems = typeof invoice.items === 'string'
      ? JSON.parse(invoice.items)
      : (invoice.items || []);
    const parsed = rawItems.map(it => ({
      ...it,
      qty_credited:      parseFloat(it.qty ?? it.quantity) || 0,
      price:             parseFloat(it.unit_price)         || 0,
      subtotal_credited: parseFloat(it.subtotal)           || 0,
    }));
    setItems(parsed);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelInvoice(null); };

  const updateItemQty = (idx, qty) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const newQty = Math.max(0, Math.min(qty, parseFloat(it.qty ?? it.quantity) || 0));
      return { ...it, qty_credited: newQty, subtotal_credited: newQty * it.price };
    }));
  };

  // ── Totales del modal ────────────────────────────────────────────────────────

  const calcModal = () => {
    if (!selInvoice) return { subtotal: 0, iva: 0, total: 0 };
    if (voidType === 'total') {
      const sub = parseFloat(selInvoice.subtotal)   || 0;
      const iva = parseFloat(selInvoice.iva_amount) || 0;
      return { subtotal: sub, iva, total: sub + iva };
    }
    const sub = items.reduce((s, it) => s + (parseFloat(it.subtotal_credited) || 0), 0);
    const iva = sub * 0.15;
    return { subtotal: sub, iva, total: sub + iva };
  };

  // ── Enviar ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (submitting) return;
    if (!reason.trim()) { setError('Escribe el motivo'); return; }
    const { subtotal, iva, total } = calcModal();
    if (total <= 0) { setError('El monto a acreditar debe ser mayor a 0'); return; }

    try {
      setSubmitting(true); setError('');
      const rawItems = typeof selInvoice.items === 'string'
        ? JSON.parse(selInvoice.items)
        : (selInvoice.items || []);
      const creditedItems = voidType === 'total'
        ? rawItems.map(it => ({
            description: it.description,
            quantity:    parseFloat(it.qty ?? it.quantity) || 0,
            unit_price:  parseFloat(it.unit_price)         || 0,
            subtotal:    parseFloat(it.subtotal)            || 0,
          }))
        : items
            .filter(it => it.qty_credited > 0)
            .map(it => ({
              description: it.description,
              quantity:    it.qty_credited,
              unit_price:  it.price,
              subtotal:    it.subtotal_credited,
            }));

      const payload = {
        invoice_id:        selInvoice.id,
        reference_invoice: selInvoice.invoice_number,
        reason,
        items:             creditedItems,
        subtotal,
        iva_amount:        iva,
        discount_amount:   0,
        total,
        customer_name:     selInvoice.customer_name,
        customer_ruc:      selInvoice.customer_ruc,
        customer_email:    selInvoice.customer_email,
      };

      const res = await fetchWithAuth('/api/einvoicing/credit-notes', {
        method: 'POST',
        body:   JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al emitir');

      const msg = voidType === 'total'
        ? `Factura ${selInvoice.invoice_number} anulada. Nota de crédito emitida.`
        : `Nota de crédito parcial emitida por $${total.toFixed(2)}.`;
      setSuccess(msg);
      closeModal();
      load();
      setTimeout(() => setSuccess(''), 5000);
      if (data.id) {
        window.open(`/api/einvoicing/credit-notes/${data.id}/pdf`, '_blank');
      }

      // Imprimir en térmica
      try {
        let bizInfo = {};
        const cfgRes = await fetchWithAuth('/api/einvoicing/config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          bizInfo = { ruc: cfg.ruc, company_name: cfg.razon_social, trade_name: cfg.nombre_comercial || cfg.razon_social, address: cfg.direccion_matriz };
        }
        const cnNumber = data.id ? `001-001-${String(data.id).padStart(9, '0')}` : 'N/A';
        await print('printer_main', 'credit-note', {
          bizInfo,
          creditNote: { number: cnNumber, reference_invoice: selInvoice.invoice_number, date: new Date().toISOString() },
          customer:   { name: selInvoice.customer_name, id: selInvoice.customer_ruc },
          reason,
          items:      creditedItems,
          subtotal,
          iva,
          total,
        });
      } catch { /* fallo silencioso si QZ no está activo */ }
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Filtros tabla facturas ───────────────────────────────────────────────────

  const filteredInv = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inv.invoice_number  || '').toLowerCase().includes(q) ||
      (inv.customer_name   || '').toLowerCase().includes(q) ||
      (inv.customer_ruc    || '').toLowerCase().includes(q);
    const matchDate = !filterDate || (inv.emission_date || '').startsWith(filterDate);
    return matchSearch && matchDate;
  });

  const { subtotal: mSub, iva: mIva, total: mTotal } = calcModal();

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="Anulación de Comprobantes"
      subtitle="Anulación interna mediante nota de crédito al SRI"
      theme="business"
      headerAction={
        <button onClick={load} disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'var(--color-primary)', color:'white', border:'none', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:13 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      }
    >
      {error && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {success && (
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#15803d', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Aviso informativo */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, background:'rgba(104,66,254,0.06)', border:'1px solid rgba(104,66,254,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#a78bfa' }}>
        <AlertCircle size={15} style={{ flexShrink:0, marginTop:1 }} />
        <span>
          El SRI no permite modificar facturas autorizadas. La anulación se realiza emitiendo una
          <strong> Nota de Crédito</strong> por el monto total (anulación completa) o por los ítems
          seleccionados (anulación parcial / devolución de producto).
        </span>
      </div>

      {/* Filtros */}
      <div className="einv-filter-bar">
        <div className="einv-search-box">
          <Search size={14} />
          <input type="text" placeholder="Buscar por N° factura, cliente o RUC..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="einv-clear-btn" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <div className="einv-date-filter">
          <label>Fecha</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          {filterDate && <button className="einv-clear-btn" onClick={() => setFilterDate('')}><X size={13} /></button>}
        </div>
      </div>

      {/* Tabla de facturas */}
      <div className="einv-table-container" style={{ overflowX:'auto', background:'#fff', border:'1.5px solid var(--color-border,#e2e8f0)', borderRadius:12, marginBottom:28 }}>
        <table className="einv-table" style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'2px solid var(--color-border,#e2e8f0)' }}>
              <th style={th()}>N° Factura</th>
              <th style={th()}>Fecha</th>
              <th style={th()}>Cliente</th>
              <th style={th('right')}>Total</th>
              <th style={th('right')}>Acreditado</th>
              <th style={th('right')}>Balance</th>
              <th style={th('center')}>Estado</th>
              <th style={th('center')}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} style={{ textAlign:'center', color:'#94a3b8', padding:40 }}>Cargando...</td></tr>}
            {!loading && invoices.length === 0 && !error && (
              <tr>
                <td colSpan={8} style={{ textAlign:'center', padding:48 }}>
                  <FileText size={36} style={{ color:'#cbd5e1', display:'block', margin:'0 auto 10px' }} />
                  <div style={{ color:'#94a3b8', fontSize:13 }}>No hay facturas autorizadas</div>
                </td>
              </tr>
            )}
            {!loading && invoices.length > 0 && filteredInv.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:36, color:'#94a3b8', fontSize:13 }}>Sin resultados</td></tr>
            )}
            {!loading && filteredInv.map(inv => {
              const st       = INV_STATUS[inv.status] || INV_STATUS.pendiente;
              const total    = parseFloat(inv.total)           || 0;
              const credited = parseFloat(inv.credited_amount) || 0;
              const balance  = Math.max(0, total - credited);
              const isAnulada = inv.status === 'anulada';
              const date = inv.emission_date
                ? new Date(inv.emission_date).toLocaleDateString('es-EC', { day:'2-digit', month:'2-digit', year:'numeric' })
                : '—';
              return (
                <tr key={inv.id} className="einv-tbody-tr" style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td className="einv-td" style={{ padding:'11px 10px', fontWeight:700, color:'#6842fe', whiteSpace:'nowrap' }}>{inv.invoice_number}</td>
                  <td className="einv-td" style={{ padding:'11px 10px', color:'#64748b', whiteSpace:'nowrap' }}>{date}</td>
                  <td className="einv-td" style={{ padding:'11px 10px' }}>
                    <div style={{ fontWeight:600 }}>{inv.customer_name}</div>
                    {inv.customer_ruc && <div style={{ fontSize:11, color:'#94a3b8' }}>{inv.customer_ruc}</div>}
                  </td>
                  <td className="einv-td" style={{ padding:'11px 10px', textAlign:'right', fontWeight:700 }}>${total.toFixed(2)}</td>
                  <td className="einv-td" style={{ padding:'11px 10px', textAlign:'right', color: credited > 0 ? '#e11d48' : '#94a3b8' }}>
                    {credited > 0 ? `-$${credited.toFixed(2)}` : '—'}
                  </td>
                  <td className="einv-td" style={{ padding:'11px 10px', textAlign:'right', fontWeight:700, color: balance === 0 ? '#94a3b8' : '#059669' }}>
                    ${balance.toFixed(2)}
                  </td>
                  <td className="einv-td" style={{ padding:'11px 10px', textAlign:'center' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:st.color, background:st.bg, border:`1px solid ${st.border}`, borderRadius:20, padding:'3px 9px', fontWeight:700, fontSize:11 }}>
                      <st.Icon size={11} /> {st.label}
                    </span>
                  </td>
                  <td className="einv-td" style={{ padding:'11px 10px', textAlign:'center' }}>
                    {!isAnulada && balance > 0 ? (
                      <button
                        onClick={() => openModal(inv)}
                        style={{ padding:'5px 12px', background:'rgba(225,29,72,0.08)', color:'#e11d48', border:'1px solid rgba(225,29,72,0.3)', borderRadius:6, cursor:'pointer', fontWeight:700, fontSize:12, display:'inline-flex', alignItems:'center', gap:5 }}
                      >
                        <XCircle size={13} /> Anular
                      </button>
                    ) : (
                      <span style={{ fontSize:11, color:'#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historial de notas de crédito */}
      <div style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.7)', marginBottom:10 }}>
        Historial de notas de crédito emitidas
      </div>
      <div className="einv-table-container" style={{ overflowX:'auto', background:'#fff', border:'1.5px solid var(--color-border,#e2e8f0)', borderRadius:12 }}>
        <table className="einv-table" style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8fafc', borderBottom:'2px solid var(--color-border,#e2e8f0)' }}>
              <th style={th()}>Factura ref.</th>
              <th style={th()}>Motivo</th>
              <th style={th()}>Cliente</th>
              <th style={th('right')}>Total acreditado</th>
              <th style={th('center')}>Estado</th>
              <th style={th()}>Fecha</th>
              <th style={th('center')}>PDF</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'#94a3b8', fontSize:13 }}>Sin notas de crédito emitidas</td></tr>
            )}
            {history.map(cn => {
              const st   = CN_STATUS[cn.status] || CN_STATUS.pendiente;
              const date = cn.created_at ? new Date(cn.created_at).toLocaleDateString('es-EC') : '—';
              return (
                <tr key={cn.id} className="einv-tbody-tr" style={{ borderBottom:'1px solid #f1f5f9' }}>
                  <td className="einv-td" style={{ padding:'10px', fontWeight:700, color:'#6842fe' }}>{cn.reference_invoice || cn.invoice_number || '—'}</td>
                  <td className="einv-td" style={{ padding:'10px', color:'#64748b' }} title={cn.reason}>{(cn.reason||'').substring(0,45)}{cn.reason?.length>45?'…':''}</td>
                  <td className="einv-td" style={{ padding:'10px' }}>
                    <div style={{ fontWeight:600 }}>{cn.customer_name || '—'}</div>
                    {cn.customer_ruc && <div style={{ fontSize:11, color:'#94a3b8' }}>{cn.customer_ruc}</div>}
                  </td>
                  <td className="einv-td" style={{ padding:'10px', textAlign:'right', fontWeight:800, color:'#e11d48' }}>-${parseFloat(cn.total||0).toFixed(2)}</td>
                  <td className="einv-td" style={{ padding:'10px', textAlign:'center' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, color:st.color, background:st.bg, border:`1px solid ${st.border}`, borderRadius:20, padding:'3px 9px', fontWeight:700, fontSize:11 }}>
                      {st.label}
                    </span>
                  </td>
                  <td className="einv-td" style={{ padding:'10px', color:'#64748b' }}>{date}</td>
                  <td className="einv-td" style={{ padding:'10px', textAlign:'center' }}>
                    <button
                      onClick={() => window.open(`/api/einvoicing/credit-notes/${cn.id}/pdf`, '_blank')}
                      title="Ver PDF"
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#6842fe' }}
                    >
                      <FileText size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Modal de anulación ── */}
      {showModal && selInvoice && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
             onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:16, width:'100%', maxWidth:620, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(0,0,0,0.5)' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 20px', borderBottom:'1px solid #334155' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ background:'rgba(225,29,72,0.12)', borderRadius:8, padding:6 }}>
                  <XCircle size={18} color="#e11d48" />
                </div>
                <span style={{ fontWeight:700, fontSize:16, color:'#f1f5f9' }}>Anular Comprobante</span>
              </div>
              <button onClick={closeModal} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer' }}><X size={18} /></button>
            </div>

            <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>

              {/* Info factura */}
              <div style={{ background:'#0f172a', borderRadius:10, padding:'12px 14px', fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'#94a3b8' }}>Factura</span>
                  <span style={{ fontWeight:800, color:'#6842fe' }}>{selInvoice.invoice_number}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ color:'#94a3b8' }}>Cliente</span>
                  <span style={{ color:'#cbd5e1' }}>{selInvoice.customer_name}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'#94a3b8' }}>Total factura</span>
                  <span style={{ fontWeight:800, color:'#22c55e' }}>${parseFloat(selInvoice.total||0).toFixed(2)}</span>
                </div>
              </div>

              {/* Tipo de anulación */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:8 }}>
                  Tipo de anulación
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  {[
                    { val:'total',   label:'Anulación total',    desc:'Acredita el 100% de la factura' },
                    { val:'parcial', label:'Anulación parcial',  desc:'Selecciona los ítems a devolver' },
                  ].map(opt => (
                    <button key={opt.val} onClick={() => setVoidType(opt.val)}
                      style={{ padding:'12px 14px', borderRadius:10, border:`2px solid ${voidType===opt.val ? '#e11d48' : '#334155'}`, background: voidType===opt.val ? 'rgba(225,29,72,0.08)' : '#0f172a', cursor:'pointer', textAlign:'left' }}>
                      <div style={{ fontWeight:700, fontSize:13, color: voidType===opt.val ? '#fca5a5' : '#cbd5e1' }}>{opt.label}</div>
                      <div style={{ fontSize:11, color:'#64748b', marginTop:3 }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ítems (solo anulación parcial) */}
              {voidType === 'parcial' && (
                <div>
                  <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:8 }}>
                    Ítems a acreditar
                  </label>
                  {items.length === 0 ? (
                    <div style={{ color:'#64748b', fontSize:13, padding:'12px 0' }}>La factura no tiene ítems registrados. Se acreditará el monto total.</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {items.map((it, idx) => (
                        <div key={idx} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', alignItems:'center', gap:10, background:'#0f172a', borderRadius:8, padding:'10px 12px' }}>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{it.description}</div>
                            <div style={{ fontSize:11, color:'#64748b' }}>${parseFloat(it.price||0).toFixed(2)} c/u · máx {parseFloat(it.qty ?? it.quantity ?? 0)}</div>
                          </div>
                          <button onClick={() => updateItemQty(idx, it.qty_credited - 1)}
                            style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:6, width:28, height:28, cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Minus size={12} />
                          </button>
                          <span style={{ width:32, textAlign:'center', fontWeight:700, color:'#f1f5f9', fontSize:14 }}>{it.qty_credited}</span>
                          <button onClick={() => updateItemQty(idx, it.qty_credited + 1)}
                            style={{ background:'#1e293b', border:'1px solid #334155', borderRadius:6, width:28, height:28, cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Plus size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Motivo */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.04em', display:'block', marginBottom:6 }}>
                  Motivo *
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={voidType === 'total' ? 'Ej: Anulación total por error en datos del cliente' : 'Ej: Devolución de producto, ítem no entregado'}
                  rows={3}
                  style={{ width:'100%', boxSizing:'border-box', background:'#0f172a', border:'1.5px solid #334155', borderRadius:8, padding:'10px 12px', color:'#f1f5f9', fontSize:13, outline:'none', resize:'vertical' }}
                />
              </div>

              {/* Totales */}
              <div style={{ background:'rgba(225,29,72,0.05)', border:'1px solid rgba(225,29,72,0.2)', borderRadius:10, padding:'12px 16px', fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, color:'#94a3b8' }}>
                  <span>Subtotal a acreditar</span><span>${mSub.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, color:'#94a3b8' }}>
                  <span>IVA</span><span>${mIva.toFixed(2)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:15, color:'#fca5a5' }}>
                  <span>Total nota de crédito</span><span>-${mTotal.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(225,29,72,0.08)', border:'1px solid rgba(225,29,72,0.3)', color:'#fca5a5', borderRadius:8, padding:'9px 12px', fontSize:13 }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', padding:'16px 20px', borderTop:'1px solid #334155' }}>
              <button onClick={closeModal} disabled={submitting}
                style={{ padding:'10px 18px', background:'#1e293b', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, fontWeight:600, fontSize:13, cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleSubmit} disabled={submitting || mTotal <= 0}
                style={{ padding:'10px 20px', background: submitting ? '#7f1d1d' : '#e11d48', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor: submitting ? 'default' : 'pointer', display:'flex', alignItems:'center', gap:7, opacity: mTotal <= 0 ? 0.5 : 1 }}>
                <XCircle size={15} />
                {submitting ? 'Emitiendo…' : voidType === 'total' ? 'Anular Factura' : 'Emitir Nota de Crédito Parcial'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageTemplate>
  );
}

function th(align = 'left') {
  return { padding:'10px', textAlign:align, fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.03em', whiteSpace:'nowrap' };
}
