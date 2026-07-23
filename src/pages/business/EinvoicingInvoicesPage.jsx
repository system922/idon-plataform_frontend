import { useState, useEffect, useCallback, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, Download, Send, AlertCircle, CheckCircle, XCircle, Clock, FileText, MessageCircle, Mail, X, Search, Folder} from 'react-feather';
import { MdOutlineFileDownload } from "react-icons/md";
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/EinvoicingInvoicesPage.css';
import JSZip from 'jszip';

// ── Configuración de zona horaria Ecuador ──
const ECUADOR_TIMEZONE = 'America/Guayaquil';

// ── Funciones de utilidad para fechas ──
const dateUtils = {
  // Convertir fecha ISO a fecha local de Ecuador
  toEcuadorDate: (isoDate) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    // Ajustar a zona horaria de Ecuador
    return new Date(date.toLocaleString('en-US', { timeZone: ECUADOR_TIMEZONE }));
  },

  // Obtener solo la fecha (sin hora) en zona Ecuador
  getEcuadorDateString: (isoDate) => {
    const date = dateUtils.toEcuadorDate(isoDate);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Comparar si dos fechas son el mismo día en zona Ecuador
  isSameDay: (isoDate1, isoDate2) => {
    const date1 = dateUtils.getEcuadorDateString(isoDate1);
    const date2 = dateUtils.getEcuadorDateString(isoDate2);
    return date1 === date2;
  },

  // Verificar si una fecha está dentro de un rango en zona Ecuador
  isDateInRange: (isoDate, startDate, endDate) => {
    if (!isoDate) return false;
    const dateStr = dateUtils.getEcuadorDateString(isoDate);
    if (!dateStr) return false;
    
    // Si no hay fechas de filtro, todas pasan
    if (!startDate && !endDate) return true;
    
    // Solo fecha de inicio
    if (startDate && !endDate) {
      return dateStr === startDate;
    }
    
    // Solo fecha de fin
    if (!startDate && endDate) {
      return dateStr <= endDate;
    }
    
    // Rango completo
    return dateStr >= startDate && dateStr <= endDate;
  },

  // Obtener fecha actual en zona Ecuador
  getCurrentEcuadorDate: () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: ECUADOR_TIMEZONE }));
  },

  // Formatear fecha para mostrar en tabla
  formatDisplayDate: (isoDate) => {
    if (!isoDate) return '—';
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString('es-EC', {
        timeZone: ECUADOR_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }
};

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

// ── Componente de progreso de descarga ──────────────────────────────────────
function DownloadProgress({ total, completed, current }) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: '#1e293b', 
      border: '1px solid #334155', 
      borderRadius: 12, 
      padding: '16px 20px',
      zIndex: 2000,
      minWidth: 280,
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <MdOutlineFileDownload size={18} color="#6842fe" />
        <span style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 13 }}>
          Descargando facturas...
        </span>
        <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 'auto' }}>
          {completed}/{total}
        </span>
      </div>
      <div style={{ 
        width: '100%', 
        height: 6, 
        background: '#0f172a', 
        borderRadius: 3, 
        overflow: 'hidden'
      }}>
        <div style={{ 
          width: `${percentage}%`, 
          height: '100%', 
          background: 'linear-gradient(90deg, #6842fe, #8b5cf6)',
          borderRadius: 3,
          transition: 'width 0.3s ease'
        }} />
      </div>
      {current && (
        <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 6 }}>
          {current.invoice_number} - {current.customer_name}
        </div>
      )}
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
  const [dateStart, setDateStart] = useState('');
  const [dateEnd,   setDateEnd  ] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

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

  // Función para descargar archivo
  const downloadBlob = async (url, filename) => {
    const res = await fetchWithAuth(url);
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Archivo no disponible'); }
    const blob = await res.blob();
    return blob;
  };

  // Descarga individual PDF
  const handleDownloadPdf = async (inv) => {
    try { 
      const blob = await downloadBlob(`/api/einvoicing/invoices/${inv.id}/pdf`, `RIDE-${inv.invoice_number}.pdf`);
      const href = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href, download: `RIDE-${inv.invoice_number}.pdf` }).click();
      URL.revokeObjectURL(href);
    } catch (e) { notify(e.message, true); }
  };

  // Descarga individual XML
  const handleDownloadXml = async (inv) => {
    try { 
      const blob = await downloadBlob(`/api/einvoicing/invoices/${inv.id}/xml`, `${inv.invoice_number}.xml`);
      const href = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href, download: `${inv.invoice_number}.xml` }).click();
      URL.revokeObjectURL(href);
    } catch (e) { notify(e.message, true); }
  };

  // ── Función para filtrar por fechas (CORREGIDA) ──
  const filterByDate = (invoicesList, startDate, endDate) => {
    return invoicesList.filter(inv => {
      if (!inv.emission_date) return false;
      return dateUtils.isDateInRange(inv.emission_date, startDate, endDate);
    });
  };

  // ── Función principal de descarga ──
  const handleDownload = async () => {
    setDownloadingAll(true);
    setError('');
    setSuccess('');

    try {
      // Aplicar filtros
      let targetInvoices = invoices;
      let isFiltered = false;

      // Filtro por fechas
      if (dateStart || dateEnd) {
        targetInvoices = filterByDate(invoices, dateStart, dateEnd);
        isFiltered = true;
      }

      // Filtro por búsqueda
      if (search) {
        const q = search.toLowerCase();
        targetInvoices = targetInvoices.filter(inv => {
          return (inv.customer_name || '').toLowerCase().includes(q) ||
                 (inv.customer_ruc || '').toLowerCase().includes(q);
        });
        isFiltered = true;
      }

      // Solo facturas autorizadas con XML
      targetInvoices = targetInvoices.filter(inv => 
        inv.status === 'autorizada' && inv.has_signed_xml
      );

      if (targetInvoices.length === 0) {
        const msg = isFiltered 
          ? 'No hay facturas autorizadas con XML en los filtros actuales'
          : 'No hay facturas autorizadas con XML para descargar';
        notify(msg, true);
        setDownloadingAll(false);
        return;
      }

      // Crear el ZIP
      const zip = new JSZip();
      const total = targetInvoices.length;
      let completed = 0;

      for (const inv of targetInvoices) {
        setDownloadProgress({
          total,
          completed,
          current: inv
        });

        try {
          const xmlBlob = await downloadBlob(`/api/einvoicing/invoices/${inv.id}/xml`, `${inv.invoice_number}.xml`);
          const pdfBlob = await downloadBlob(`/api/einvoicing/invoices/${inv.id}/pdf`, `RIDE-${inv.invoice_number}.pdf`);

          const invoiceFolder = zip.folder(`Factura_${inv.invoice_number}`);
          invoiceFolder.file(`${inv.invoice_number}.xml`, xmlBlob);
          invoiceFolder.file(`RIDE-${inv.invoice_number}.pdf`, pdfBlob);

          completed++;
        } catch (error) {
          console.error(`Error descargando factura ${inv.invoice_number}:`, error);
        }
      }

      setDownloadProgress({
        total,
        completed,
        current: null
      });

      // Generar y descargar el ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      
      let fileName = `facturas_${new Date().toISOString().slice(0,10)}`;
      if (isFiltered) {
        fileName += `_filtradas`;
        if (dateStart) fileName += `_desde_${dateStart}`;
        if (dateEnd) fileName += `_hasta_${dateEnd}`;
      }
      fileName += '.zip';
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const contextMsg = isFiltered ? ' del filtro actual' : '';
      notify(`Descargadas ${completed} de ${total} facturas${contextMsg} en ZIP ✓`);
    } catch (error) {
      notify(error.message, true);
    } finally {
      setDownloadingAll(false);
      setDownloadProgress(null);
    }
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

  // ── Filtro combinado (CORREGIDO) ──
  const filtered = invoices.filter(inv => {
    // Filtro de búsqueda
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.customer_ruc || '').toLowerCase().includes(q);
    
    // Filtro de fechas con zona horaria Ecuador
    const matchDate = dateUtils.isDateInRange(inv.emission_date, dateStart, dateEnd);
    
    return matchSearch && matchDate;
  });

  const counts = Object.fromEntries(
    Object.keys(STATUS_STYLE).map(k => [k, invoices.filter(i => i.status === k).length])
  );

  // Contar facturas disponibles para descarga
  const hasFilters = search !== '' || dateStart !== '' || dateEnd !== '';
  
  // Facturas autorizadas con XML (totales)
  const allAuthorizedWithXml = invoices.filter(inv => 
    inv.status === 'autorizada' && inv.has_signed_xml
  ).length;

  // Facturas autorizadas con XML (filtradas)
  const filteredAuthorizedWithXml = filtered.filter(inv => 
    inv.status === 'autorizada' && inv.has_signed_xml
  ).length;

  // Determinar cuántas facturas se descargarán
  const downloadCount = hasFilters ? filteredAuthorizedWithXml : allAuthorizedWithXml;

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setSearch('');
    setDateStart('');
    setDateEnd('');
  };

  // Formatear fecha para mostrar en el placeholder
  const today = dateUtils.getCurrentEcuadorDate().toISOString().split('T')[0];

  return (
    <PageTemplate
      title="Comprobantes Electrónicos"
      subtitle="Comprobantes emitidos al SRI"
      theme="business"
      headerAction={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* ÚNICO BOTÓN DE DESCARGA */}
          {downloadCount > 0 && (
            <button
              onClick={handleDownload}
              disabled={downloadingAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                background: downloadingAll ? '#6b7280' : (hasFilters ? '#7c3aed' : '#059669'),
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: downloadingAll ? 'default' : 'pointer',
                fontWeight: 600,
                fontSize: 13,
                transition: 'all 0.2s ease'
              }}
            >
              {hasFilters ? (
                <Folder size={14} />
              ) : (
                <MdOutlineFileDownload size={14} />
              )}
              {downloadingAll 
                ? 'Preparando...' 
                : hasFilters 
                  ? `Descargar filtradas (${downloadCount})` 
                  : `Descargar todas (${downloadCount})`
              }
            </button>
          )}

          {downloadCount === 0 && !loading && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '8px 14px', 
              background: '#f1f5f9', 
              borderRadius: 6,
              color: '#64748b',
              fontSize: 13,
              fontWeight: 500
            }}>
              {hasFilters ? 'Sin facturas en el filtro' : 'Sin facturas para descargar'}
            </div>
          )}

          {/* Botón limpiar filtros */}
          {hasFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fecaca',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 13
              }}
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}

          {/* Botón actualizar */}
          <button
            onClick={load}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              background: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>
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

      {/* Progress de descarga */}
      {downloadProgress && (
        <DownloadProgress 
          total={downloadProgress.total}
          completed={downloadProgress.completed}
          current={downloadProgress.current}
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
          {allAuthorizedWithXml > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px' }}>
              <MdOutlineFileDownload size={11} /> Con XML: {allAuthorizedWithXml}
            </span>
          )}
          {hasFilters && filteredAuthorizedWithXml > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #c4b5fd', borderRadius: 20, padding: '3px 10px' }}>
              <Folder size={11} /> Filtradas: {filteredAuthorizedWithXml}
            </span>
          )}
        </div>
      )}

      {/* Barra de búsqueda y filtros de fecha */}
      <div className="einv-filter-bar" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <div className="einv-search-box" style={{ flex: 1, minWidth: 200 }}>
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

        <div className="einv-date-filter" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Desde:</label>
          <input
            type="date"
            value={dateStart}
            onChange={e => setDateStart(e.target.value)}
            max={dateEnd || undefined}
            style={{
              padding: '6px 10px',
              border: '1.5px solid var(--color-border,#e2e8f0)',
              borderRadius: 6,
              fontSize: 12,
              background: '#fff',
              color: '#1e293b',
              outline: 'none',
              maxWidth: 150
            }}
          />
          {dateStart && (
            <button 
              className="einv-clear-btn" 
              onClick={() => setDateStart('')} 
              title="Limpiar fecha inicio"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 4px' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="einv-date-filter" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Hasta:</label>
          <input
            type="date"
            value={dateEnd}
            onChange={e => setDateEnd(e.target.value)}
            min={dateStart || undefined}
            style={{
              padding: '6px 10px',
              border: '1.5px solid var(--color-border,#e2e8f0)',
              borderRadius: 6,
              fontSize: 12,
              background: '#fff',
              color: '#1e293b',
              outline: 'none',
              maxWidth: 150
            }}
          />
          {dateEnd && (
            <button 
              className="einv-clear-btn" 
              onClick={() => setDateEnd('')} 
              title="Limpiar fecha fin"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px 4px' }}
            >
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
              const date  = dateUtils.formatDisplayDate(inv.emission_date);
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
                      {inv.has_signed_xml && (
                        <button onClick={() => handleDownloadPdf(inv)} title="Descargar RIDE (PDF)" style={btnStyle('#fff7ed', '#b45309', '#fcd34d')}>
                          <Download size={11} /> PDF
                        </button>
                      )}
                      {inv.has_signed_xml && (
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