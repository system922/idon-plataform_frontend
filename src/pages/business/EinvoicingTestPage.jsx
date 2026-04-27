import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { PlusCircle, Trash2, Send, Download, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const IVA_RATES = [
  { value: 0,  label: '0% - Tarifa 0' },
  { value: 5,  label: '5%' },
  { value: 8,  label: '8%' },
  { value: 15, label: '15%' },
];

const TIPO_ID = [
  { value: '07', label: 'Consumidor Final' },
  { value: '05', label: 'Cédula' },
  { value: '04', label: 'RUC' },
  { value: '06', label: 'Pasaporte' },
];

const FORMA_PAGO = [
  { value: '01', label: 'Efectivo' },
  { value: '16', label: 'Tarjeta de débito' },
  { value: '19', label: 'Tarjeta de crédito' },
  { value: '17', label: 'Dinero electrónico' },
  { value: '20', label: 'Otros (sistema financiero)' },
];

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  label: 'Pendiente',  Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',  border: 'rgba(225,29,72,0.25)', label: 'Rechazada',  Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.3)',label: 'Error',       Icon: AlertCircle },
};

const emptyItem = () => ({ description: '', qty: '1', unit_price: '' });

function calcItem(item) {
  return parseFloat(((parseFloat(item.qty) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2));
}

export default function EinvoicingTestPage() {
  // ── Form state ─────────────────────────────────────────────────────────────
  const [tipoId,    setTipoId]    = useState('07');
  const [idNum,     setIdNum]     = useState('');
  const [custName,  setCustName]  = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [items,     setItems]     = useState([emptyItem()]);
  const [ivaRate,   setIvaRate]   = useState(15);
  const [formaPago, setFormaPago] = useState('01');
  const [emitting,  setEmitting]  = useState(false);
  const [result,    setResult]    = useState(null);
  const [emitError, setEmitError] = useState('');

  // ── List state ─────────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState([]);
  const [listLoad, setListLoad] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [listErr,  setListErr]  = useState('');

  // ── Totals ─────────────────────────────────────────────────────────────────
  const subtotal  = items.reduce((s, it) => s + calcItem(it), 0);
  const ivaAmount = parseFloat((subtotal * ivaRate / 100).toFixed(2));
  const total     = parseFloat((subtotal + ivaAmount).toFixed(2));

  // ── Load list ──────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoad(true); setListErr('');
    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices?limit=100');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar facturas');
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      setListErr(e.message);
      setInvoices([]);
    } finally {
      setListLoad(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Item helpers ───────────────────────────────────────────────────────────
  const updateItem = (idx, field, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  const addItem    = () => setItems(p => [...p, emptyItem()]);
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx));

  // ── Emit ───────────────────────────────────────────────────────────────────
  const handleEmit = async () => {
    setEmitError(''); setResult(null);
    if (tipoId !== '07' && !custName) { setEmitError('Ingresa el nombre del cliente'); return; }
    if (items.some(it => !it.description || !it.unit_price)) {
      setEmitError('Completa descripción y precio en todos los ítems'); return;
    }
    if (subtotal <= 0) { setEmitError('El subtotal debe ser mayor a 0'); return; }

    setEmitting(true);
    try {
      const res = await fetchWithAuth('/api/einvoicing/invoices/emit', {
        method: 'POST',
        body: JSON.stringify({
          customer: {
            name:                tipoId === '07' ? 'CONSUMIDOR FINAL' : custName,
            ruc:                 tipoId === '07' ? '9999999999999'    : idNum,
            email:               custEmail || null,
            tipo_identificacion: tipoId,
          },
          items: items.map(it => ({
            description: it.description,
            qty:         parseFloat(it.qty) || 1,
            unit_price:  parseFloat(it.unit_price) || 0,
            subtotal:    calcItem(it),
          })),
          subtotal, iva_rate: ivaRate, iva_amount: ivaAmount, total,
          forma_pago: formaPago,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al emitir factura');
      setResult(data);
      setInvoices(prev => [data, ...prev]);
    } catch (e) {
      setEmitError(e.message);
    } finally {
      setEmitting(false);
    }
  };

  // ── Download PDF ───────────────────────────────────────────────────────────
  const handleDownloadPdf = async (inv) => {
    setListErr('');
    try {
      const res = await fetchWithAuth(`/api/einvoicing/invoices/${inv.id}/pdf`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'PDF no disponible'); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `RIDE-${inv.invoice_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setListErr(e.message); }
  };

  // ── Download XML ───────────────────────────────────────────────────────────
  const handleDownloadXml = async (inv) => {
    setListErr('');
    try {
      const res = await fetchWithAuth(`/api/einvoicing/invoices/${inv.id}/xml`);
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'XML no disponible'); }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${inv.invoice_number}.xml`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setListErr(e.message); }
  };

  // ── Resend ─────────────────────────────────────────────────────────────────
  const handleResend = async (inv) => {
    setListErr(''); setActionId(inv.id);
    try {
      const res  = await fetchWithAuth(`/api/einvoicing/invoices/${inv.id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar');
      setInvoices(prev => prev.map(i => i.id === inv.id ? data : i));
      if (result?.id === inv.id) setResult(data);
    } catch (e) {
      setListErr(e.message);
    } finally {
      setActionId(null);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card  = { background: 'var(--color-card,#fff)', border: '1.5px solid var(--color-border,#e2e8f0)', borderRadius: 14, padding: 24, boxShadow: '0 4px 24px rgba(90,60,170,0.06)' };
  const inp   = { width: '100%', padding: '8px 11px', borderRadius: 7, border: '1.5px solid var(--color-border,#e2e8f0)', fontSize: 13, boxSizing: 'border-box', background: 'var(--color-bg,#fff)', color: 'var(--color-text,#1a202c)', outline: 'none' };
  const lbl   = { fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--color-text-muted,#64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <PageTemplate
      title="Facturación Electrónica"
      subtitle="Emitir comprobantes al SRI Ecuador"
      theme="business"
      headerAction={
        <button onClick={loadList} disabled={listLoad} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          <RefreshCw size={13} style={{ animation: listLoad ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar lista
        </button>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Columna izquierda: Formulario ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Cliente */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#6842fe,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>👤</div>
              Datos del cliente
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={lbl}>Tipo de identificación</label>
                <select value={tipoId} onChange={e => { setTipoId(e.target.value); if (e.target.value === '07') { setIdNum(''); setCustName(''); } }} style={{ ...inp, cursor: 'pointer' }}>
                  {TIPO_ID.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              {tipoId !== '07' && (
                <>
                  <div>
                    <label style={lbl}>{tipoId === '04' ? 'RUC' : tipoId === '05' ? 'Cédula' : 'N° Pasaporte'}</label>
                    <input value={idNum} onChange={e => setIdNum(e.target.value)} placeholder={tipoId === '04' ? '1390000000001' : '0912345678'} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Razón social / Nombre</label>
                    <input value={custName} onChange={e => setCustName(e.target.value)} placeholder="Nombre del cliente" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Email (opcional)</label>
                    <input value={custEmail} onChange={e => setCustEmail(e.target.value)} placeholder="cliente@email.com" style={inp} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Ítems */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#6842fe,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📦</div>
                Productos / servicios
              </div>
              <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', background: '#f0eeff', color: '#6842fe', border: '1px solid #dad2fa', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <PlusCircle size={12} /> Agregar
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 48px 72px 60px 20px', gap: 5, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>
              <span>Descripción</span><span style={{ textAlign: 'center' }}>Cant.</span><span style={{ textAlign: 'right' }}>P.Unit.</span><span style={{ textAlign: 'right' }}>Total</span><span />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 48px 72px 60px 20px', gap: 5, alignItems: 'center' }}>
                  <input value={it.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Descripción" style={{ ...inp, padding: '6px 8px' }} />
                  <input value={it.qty} onChange={e => updateItem(idx, 'qty', e.target.value)} type="number" min="0.01" step="0.01" style={{ ...inp, padding: '6px 4px', textAlign: 'center' }} />
                  <input value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} type="number" min="0" step="0.01" placeholder="0.00" style={{ ...inp, padding: '6px 4px', textAlign: 'right' }} />
                  <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>${calcItem(it).toFixed(2)}</div>
                  <button onClick={() => removeItem(idx)} disabled={items.length === 1} style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'default' : 'pointer', color: items.length === 1 ? '#cbd5e1' : '#e11d48', padding: 0, display: 'flex' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Totales + Emitir */}
          <div style={card}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Tarifa IVA</label>
                <select value={ivaRate} onChange={e => setIvaRate(Number(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
                  {IVA_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Forma de pago</label>
                <select value={formaPago} onChange={e => setFormaPago(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                  {FORMA_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 14px', marginBottom: 14 }}>
              {[['Subtotal', subtotal], [`IVA ${ivaRate}%`, ivaAmount]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#64748b' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>${v.toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '1px solid #e2e8f0', paddingTop: 6, marginTop: 2 }}>
                <span>TOTAL</span><span style={{ color: '#6842fe' }}>${total.toFixed(2)}</span>
              </div>
            </div>

            {emitError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 7, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
                <AlertCircle size={13} /> {emitError}
              </div>
            )}

            <button onClick={handleEmit} disabled={emitting} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', background: emitting ? '#a78bfa' : 'linear-gradient(135deg,#6842fe,#7c3aed)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: emitting ? 'default' : 'pointer' }}>
              <Send size={15} />
              {emitting ? 'Enviando al SRI...' : 'Emitir factura'}
            </button>
          </div>

          {/* Resultado último emitido */}
          {result && (() => {
            const st = STATUS_STYLE[result.status] || STATUS_STYLE.pendiente;
            const { Icon } = st;
            return (
              <div style={{ ...card, border: `1.5px solid ${st.border}`, background: st.bg }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Icon size={20} color={st.color} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: st.color }}>{st.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{result.invoice_number}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: '#6842fe' }}>${parseFloat(result.total || 0).toFixed(2)}</div>
                </div>
                {result.auth_number && (
                  <div style={{ fontSize: 11, color: st.color, background: 'rgba(0,0,0,0.04)', borderRadius: 5, padding: '5px 8px', wordBreak: 'break-all', marginBottom: 10 }}>
                    Auth: {result.auth_number}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 7 }}>
                  {result.signed_xml && (
                    <button onClick={() => handleDownloadPdf(result)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', background: '#fff7ed', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      <Download size={12} /> PDF
                    </button>
                  )}
                  {result.signed_xml && (
                    <button onClick={() => handleDownloadXml(result)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', background: '#fff', color: '#6842fe', border: '1px solid #dad2fa', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      <Download size={12} /> XML
                    </button>
                  )}
                  {(result.status === 'pendiente' || result.status === 'rechazada') && (
                    <button onClick={() => handleResend(result)} disabled={actionId === result.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px', background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                      <Send size={12} /> {actionId === result.id ? '...' : 'Reenviar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ── Columna derecha: Historial ── */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6842fe,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={15} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Comprobantes emitidos</div>
                <div style={{ fontSize: 11, color: '#888' }}>{invoices.length} factura{invoices.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(STATUS_STYLE).map(([k, s]) => {
                const cnt = invoices.filter(i => i.status === k).length;
                if (!cnt) return null;
                return (
                  <span key={k} style={{ fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '2px 9px' }}>
                    {s.label}: {cnt}
                  </span>
                );
              })}
            </div>
          </div>

          {listErr && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 12 }}>
              <AlertCircle size={13} /> {listErr}
            </div>
          )}

          {listLoad && <div style={{ textAlign: 'center', color: '#94a3b8', padding: 32, fontSize: 13 }}>Cargando...</div>}

          {!listLoad && invoices.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>
              <FileText size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
              <div style={{ fontSize: 13 }}>Sin facturas emitidas</div>
            </div>
          )}

          {!listLoad && invoices.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['N° Factura', 'Fecha', 'Cliente / RUC', 'Subtotal', 'IVA', 'Total', 'Estado', ''].map(h => (
                      <th key={h} style={{ padding: '9px 8px', textAlign: h === 'Total' || h === 'Subtotal' || h === 'IVA' ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const st = STATUS_STYLE[inv.status] || STATUS_STYLE.pendiente;
                    const { Icon } = st;
                    const isActing = actionId === inv.id;
                    const date = inv.emission_date
                      ? new Date(inv.emission_date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—';
                    return (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#6842fe', whiteSpace: 'nowrap' }}>{inv.invoice_number}</td>
                        <td style={{ padding: '10px 8px', whiteSpace: 'nowrap', color: '#64748b' }}>{date}</td>
                        <td style={{ padding: '10px 8px', maxWidth: 160 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer_name}</div>
                          {inv.customer_ruc && <div style={{ fontSize: 10, color: '#94a3b8' }}>{inv.customer_ruc}</div>}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>${parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>${parseFloat(inv.iva_amount || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>${parseFloat(inv.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 20, padding: '3px 9px', fontWeight: 700, fontSize: 11 }}>
                            <Icon size={11} /> {st.label}
                          </span>
                          {inv.auth_number && (
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2, maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.auth_number}>
                              {inv.auth_number}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                            {inv.signed_xml && (
                              <button onClick={() => handleDownloadPdf(inv)} title="Descargar RIDE (PDF)" style={{ padding: '4px 7px', background: '#fff7ed', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                                <Download size={10} /> PDF
                              </button>
                            )}
                            {inv.signed_xml && (
                              <button onClick={() => handleDownloadXml(inv)} title="Descargar XML firmado" style={{ padding: '4px 7px', background: '#fff', color: '#6842fe', border: '1px solid #dad2fa', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                                <Download size={10} /> XML
                              </button>
                            )}
                            {(inv.status === 'pendiente' || inv.status === 'rechazada') && (
                              <button onClick={() => handleResend(inv)} disabled={isActing} title="Reenviar al SRI" style={{ padding: '4px 7px', background: isActing ? '#f1f5f9' : '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 4, cursor: isActing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>
                                <Send size={10} /> {isActing ? '...' : 'Reenviar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}
