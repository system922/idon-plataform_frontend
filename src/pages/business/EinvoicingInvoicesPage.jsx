import { useState, useEffect, useCallback, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, Download, Send, AlertCircle, CheckCircle, XCircle, Clock, FileText, MessageCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.3)',  label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)',  label: 'Pendiente',  Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',  border: 'rgba(225,29,72,0.25)', label: 'Rechazada',  Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.3)',label: 'Error',       Icon: AlertCircle },
};

// ── Página principal ──────────────────────────────────────────────────────────
export default function EinvoicingInvoicesPage() {
  const [invoices,  setInvoices ] = useState([]);
  const [loading,   setLoading  ] = useState(true);
  const [actionId,  setActionId ] = useState(null);
  const [error,     setError    ] = useState('');
  const [success,   setSuccess  ] = useState('');


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

  const counts = Object.fromEntries(
    Object.keys(STATUS_STYLE).map(k => [k, invoices.filter(i => i.status === k).length])
  );

  return (
    <PageTemplate
      title="Facturas Electrónicas"
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

      {/* Tabla */}
      <div style={{ overflowX: 'auto', background: '#fff', border: '1.5px solid var(--color-border,#e2e8f0)', borderRadius: 12 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
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
            {!loading && invoices.map(inv => {
              const st    = STATUS_STYLE[inv.status] || STATUS_STYLE.pendiente;
              const isAct = actionId === inv.id;
              const date  = inv.emission_date
                ? new Date(inv.emission_date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
                : '—';
              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 10px', fontWeight: 700, color: '#6842fe', whiteSpace: 'nowrap' }}>{inv.invoice_number}</td>
                  <td style={{ padding: '11px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{date}</td>
                  <td style={{ padding: '11px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{inv.customer_name}</div>
                    {inv.customer_ruc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.customer_ruc}</div>}
                    {inv.customer_phone && (
                      <div style={{ fontSize: 11, color: '#25d366', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <MessageCircle size={9} /> {inv.customer_phone}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 10px', textAlign: 'right' }}>${parseFloat(inv.subtotal || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right' }}>${parseFloat(inv.iva_amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>${parseFloat(inv.total || 0).toFixed(2)}</td>
                  <td style={{ padding: '11px 10px', textAlign: 'center' }}>
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
                  <td style={{ padding: '11px 10px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                      {/* Descargar PDF */}
                      {inv.signed_xml && (
                        <button onClick={() => handleDownloadPdf(inv)} title="Descargar RIDE (PDF)" style={btnStyle('#fff7ed', '#b45309', '#fcd34d')}>
                          <Download size={11} /> PDF
                        </button>
                      )}
                      {/* Descargar XML */}
                      {inv.signed_xml && (
                        <button onClick={() => handleDownloadXml(inv)} title="Descargar XML firmado" style={btnStyle('#fff', '#6842fe', '#dad2fa')}>
                          <Download size={11} /> XML
                        </button>
                      )}
                      {/* Reenviar al SRI */}
                      {(inv.status === 'pendiente' || inv.status === 'rechazada') && (
                        <button onClick={() => handleResend(inv)} disabled={isAct} title="Reenviar al SRI" style={btnStyle(isAct ? '#f1f5f9' : '#f0fdf4', '#15803d', '#bbf7d0', isAct)}>
                          <Send size={11} /> {isAct ? '...' : 'SRI'}
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
