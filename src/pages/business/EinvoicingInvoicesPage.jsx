import { useState, useEffect, useCallback, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, Download, Send, AlertCircle, CheckCircle, XCircle, Clock, FileText, MessageCircle, Mail, X, Search } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/EinvoicingInvoicesPage.css';

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  label: 'Pendiente',  Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',  border: 'rgba(225,29,72,0.25)', label: 'Rechazada',  Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.3)',label: 'Error',       Icon: AlertCircle },
};

// ── Modal de envío por correo ─────────────────────────────────────────────────
function EmailModal({ inv, onClose, onSent }) {
  const [email,    setEmail   ] = useState(inv.customer_email || '');
  const [sending,  setSending ] = useState(false);
  const [err,      setErr     ] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = async () => {
    if (!email.trim()) { setErr('Ingresa un correo electrónico'); return; }
    setSending(true); setErr('');
    try {
      const res  = await fetchWithAuth(`/api/einvoicing/invoices/${inv.id}/email`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      onSent(`Factura ${inv.invoice_number} enviada a ${email.trim()} ✓`);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="einv-email-modal" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, padding: 24, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(104,66,254,0.15)', borderRadius: 8, padding: 6 }}>
              <Mail size={18} color="#6842fe" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Enviar por correo</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12 }}>
          <div style={{ color: '#94a3b8', marginBottom: 2 }}>Factura</div>
          <div style={{ fontWeight: 700, color: '#6842fe', fontSize: 14 }}>{inv.invoice_number}</div>
          <div style={{ color: '#cbd5e1', marginTop: 4 }}>{inv.customer_name}</div>
          <div style={{ color: '#22c55e', fontWeight: 700, marginTop: 4 }}>${parseFloat(inv.total || 0).toFixed(2)}</div>
        </div>

        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
          Correo electrónico
        </label>
        <input
          ref={inputRef}
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="cliente@ejemplo.com"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0f172a', border: `1.5px solid ${err ? '#ef4444' : '#334155'}`,
            borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14,
            outline: 'none', marginBottom: err ? 6 : 16,
          }}
        />
        {err && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSend}
            disabled={sending}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 0', background: sending ? '#3730a3' : '#6842fe', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: sending ? 'default' : 'pointer' }}
          >
            <Mail size={15} />
            {sending ? 'Enviando…' : 'Reenviar Factura'}
          </button>
          <button
            onClick={onClose}
            disabled={sending}
            style={{ padding: '10px 16px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function EinvoicingInvoicesPage() {
  const [invoices,  setInvoices ] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [actionId,  setActionId ] = useState(null);
  const [error,     setError    ] = useState('');
  const [success,   setSuccess  ] = useState('');
  const [emailMdl,  setEmailMdl ] = useState(null);
  const [search,    setSearch   ] = useState('');
  const [filterDate,setFilterDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetchWithAuth('/api/einvoicing/invoices?limit=200');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setInvoices(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 6000); }
    else         { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  const downloadBlob = async (url, filename) => {
    const res = await fetchWithAuth(url);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Archivo no disponible'); }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href, download: filename }).click();
    URL.revokeObjectURL(href);
  };

  const handleDownloadPdf = async (inv) => {
    try { await downloadBlob(`/api/einvoicing/invoices/${inv.id}/pdf`, `RIDE-${inv.invoice_number}.pdf`); }
    catch (e) { notify(e.message, true); }
  };

  const handleDownloadXml = async (inv) => {
    try { await downloadBlob(`/api/einvoicing/invoices/${inv.id}/xml`, `${inv.invoice_number}.xml`); }
    catch (e) { notify(e.message, true); }
  };

  const handleResend = async (inv) => {
    setError(''); setSuccess(''); setActionId(inv.id);
    try {
      const res  = await fetchWithAuth(`/api/einvoicing/invoices/${inv.id}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reenviar');
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...data } : i));
      notify(`Factura ${data.invoice_number} → ${STATUS_STYLE[data.status]?.label || data.status}`);
    } catch (e) {
      notify(e.message, true);
    } finally {
      setActionId(null);
    }
  };

  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.customer_ruc  || '').toLowerCase().includes(q);
    const matchDate = !filterDate ||
      (inv.emission_date || '').startsWith(filterDate);
    return matchSearch && matchDate;
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_STYLE).map(k => [k, invoices.filter(i => i.status === k).length])
  );

  return (
    <PageTemplate
      title="Comprobantes Electrónicos"
      subtitle="Comprobantes emitidos al SRI"
      theme="business"
      headerAction={
        <button
          onClick={load}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      }
    >
      {/* Modal Email */}
      {emailMdl && (
        <EmailModal
          inv={emailMdl}
          onClose={() => setEmailMdl(null)}
          onSent={msg => notify(msg)}
        />
      )}

      {/* Mensajes */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Contadores */}
      {!loading && invoices.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>
            {invoices.length} comprobante{invoices.length !== 1 ? 's' : ''}
          </span>
          {Object.entries(STATUS_STYLE).map(([k, s]) => counts[k] > 0 && (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 10px' }}>
              <s.Icon size={11} /> {s.label}: {counts[k]}
            </span>
          ))}
        </div>
      )}

      {/* Barra de búsqueda y filtro de fecha */}
      <div className="einv-filter-bar">
        <div className="einv-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por cédula, RUC o nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="einv-clear-btn" onClick={() => setSearch('')} title="Limpiar">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="einv-date-filter">
          <label>Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button className="einv-clear-btn" onClick={() => setFilterDate('')} title="Limpiar fecha">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="einv-table-container" style={{ overflowX: 'auto', background: '#fff', border: '1.5px solid var(--color-border,#e2e8f0)', borderRadius: 12 }}>
        <table className="einv-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border,#e2e8f0)' }}>
              <th style={th()}>N° Factura</th>
              <th style={th()}>Fecha</th>
              <th style={th()}>Cliente</th>
              <th style={th('right')}>Subtotal</th>
              <th style={th('right')}>IVA</th>
              <th style={th('right')}>Total</th>
              <th style={th('center')}>Estado</th>
              <th style={th('center')}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 13 }}>Cargando...</td></tr>
            )}
            {!loading && invoices.length === 0 && !error && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48 }}>
                  <FileText size={36} style={{ color: '#cbd5e1', display: 'block', margin: '0 auto 10px' }} />
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Sin facturas electrónicas emitidas</div>
                  <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Las facturas emitidas desde el cobro o desde Prueba aparecerán aquí</div>
                </td>
              </tr>
            )}
            {!loading && invoices.length > 0 && filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13 }}>
                  Sin resultados para esa búsqueda
                </td>
              </tr>
            )}
            {!loading && filtered.map(inv => {
              const st    = STATUS_STYLE[inv.status] || STATUS_STYLE.pendiente;
              const isAct = actionId === inv.id;
              const date  = inv.emission_date
                ? new Date(inv.emission_date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';
              return (
                <tr key={inv.id} className="einv-tbody-tr" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="einv-td" data-label="N° Factura" style={{ padding: '11px 10px', fontWeight: 700, color: '#6842fe', whiteSpace: 'nowrap' }}>{inv.invoice_number}</td>
                  <td className="einv-td" data-label="Fecha" style={{ padding: '11px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{date}</td>
                  <td className="einv-td" data-label="Cliente" style={{ padding: '11px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                    {inv.customer_ruc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.customer_ruc}</div>}
                    {inv.customer_phone && (
                      <div style={{ fontSize: 11, color: '#25d366', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <MessageCircle size={9} /> {inv.customer_phone}
                      </div>
                    )}
                  </td>
                  <td className="einv-td einv-td-right" data-label="Subtotal" style={{ padding: '11px 10px', textAlign: 'right' }}>${parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                  <td className="einv-td einv-td-right" data-label="IVA" style={{ padding: '11px 10px', textAlign: 'right' }}>${parseFloat(inv.iva_amount || 0).toFixed(2)}</td>
                  <td className="einv-td einv-td-right" data-label="Total" style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>${parseFloat(inv.total || 0).toFixed(2)}</td>
                  <td className="einv-td" data-label="Estado" style={{ padding: '11px 10px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 20, padding: '3px 9px', fontWeight: 700, fontSize: 11 }}>
                      <st.Icon size={11} /> {st.label}
                    </span>
                    {inv.auth_number && (
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: '3px auto 0' }} title={inv.auth_number}>
                        {inv.auth_number}
                      </div>
                    )}
                    {inv.sri_message && inv.status !== 'autorizada' && (
                      <div style={{ fontSize: 10, color: st.color, marginTop: 3, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={inv.sri_message}>
                        {inv.sri_message}
                      </div>
                    )}
                  </td>
                  <td className="einv-td einv-td-actions" data-label="Acciones" style={{ padding: '11px 10px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {inv.signed_xml && (
                        <button onClick={() => handleDownloadPdf(inv)} title="Descargar RIDE (PDF)" style={btnStyle('#fff7ed', '#b45309', '#fcd34d')}>
                          <Download size={11} /> PDF
                        </button>
                      )}
                      {inv.signed_xml && (
                        <button onClick={() => handleDownloadXml(inv)} title="Descargar XML firmado" style={btnStyle('#fff', '#6842fe', '#dad2fa')}>
                          <Download size={11} /> XML
                        </button>
                      )}
                      {(inv.status === 'pendiente' || inv.status === 'rechazada') && (
                        <button onClick={() => handleResend(inv)} disabled={isAct} title="Reenviar al SRI" style={btnStyle(isAct ? '#f1f5f9' : '#f0fdf4', '#15803d', '#bbf7d0', isAct)}>
                          <Send size={11} /> {isAct ? '...' : 'SRI'}
                        </button>
                      )}
                      {inv.status === 'autorizada' && (
                        <button onClick={() => setEmailMdl(inv)} title="Enviar RIDE por correo" style={btnStyle('#eef2ff', '#6842fe', '#c7d2fe')}>
                          <Mail size={11} /> Email
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

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </PageTemplate>
  );
}

function th(align = 'left') {
  return { padding: '10px 10px', textAlign: align, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
}
function btnStyle(bg, color, border, disabled = false) {
  return { padding: '4px 8px', background: bg, color, border: `1px solid ${border}`, borderRadius: 4, cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap', opacity: disabled ? 0.6 : 1 };
}