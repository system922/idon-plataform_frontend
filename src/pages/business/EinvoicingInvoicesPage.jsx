import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from '../../context/SessionContext'; 
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, Download, Send, AlertCircle, CheckCircle, XCircle, Clock, MessageCircle, Mail, X, Search, Folder } from 'react-feather';
import { MdOutlineFileDownload } from "react-icons/md";
import { fetchWithAuth, api } from '../../config/api';
import '../../styles/EinvoicingInvoicesPage.css';
import JSZip from 'jszip';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import CustomCombobox from '../../components/General/CustomCombobox';

// ── Configuración de zona horaria Ecuador ──
const ECUADOR_TIMEZONE = 'America/Guayaquil';

// ── Funciones de utilidad para fechas ──
const dateUtils = {
  toEcuadorDate: (isoDate) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return new Date(date.toLocaleString('en-US', { timeZone: ECUADOR_TIMEZONE }));
  },
  getEcuadorDateString: (isoDate) => {
    const date = dateUtils.toEcuadorDate(isoDate);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  isSameDay: (isoDate1, isoDate2) => {
    const date1 = dateUtils.getEcuadorDateString(isoDate1);
    const date2 = dateUtils.getEcuadorDateString(isoDate2);
    return date1 === date2;
  },
  isDateInRange: (isoDate, startDate, endDate) => {
    if (!isoDate) return false;
    const dateStr = dateUtils.getEcuadorDateString(isoDate);
    if (!dateStr) return false;
    if (!startDate && !endDate) return true;
    if (startDate && !endDate) return dateStr === startDate;
    if (!startDate && endDate) return dateStr <= endDate;
    return dateStr >= startDate && dateStr <= endDate;
  },
  getCurrentEcuadorDate: () => {
    const now = new Date();
    return new Date(now.toLocaleString('en-US', { timeZone: ECUADOR_TIMEZONE }));
  },
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
  },
  getDateInputValue: (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
};

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.3)', label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.3)', label: 'Pendiente',  Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)', border: 'rgba(225,29,72,0.25)', label: 'Rechazada',  Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Error', Icon: AlertCircle },
};

// ── Opciones para los combobox ──────────────────────────────────────────
const dateOptions = [
  { label: 'Todas las fechas', value: 'all' },
  { label: 'Hoy', value: 'today' },
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Personalizado', value: 'custom' },
];

const statusOptions = [
  { label: 'Todos los estados', value: 'all' },
  { label: 'Autorizadas', value: 'autorizada' },
  { label: 'Pendientes', value: 'pendiente' },
  { label: 'Rechazadas', value: 'rechazada' },
  { label: 'Error', value: 'error' },
];

// ── Modal de envío por correo ─────────────────────────────────────────────────
function EmailModal({ inv, onClose, onSent }) {
  const [email, setEmail] = useState(inv.customer_email || '');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = async () => {
    if (!email.trim()) { setErr('Ingresa un correo electrónico'); return; }
    setSending(true); setErr('');
    try {
      const res = await fetchWithAuth(`/einvoicing/invoices/${inv.id}/email`, {
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
  const { user } = useSession(); // ✅ AGREGADO
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emailMdl, setEmailMdl] = useState(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth('/einvoicing/invoices?limit=200');
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

  // ── Configurar fechas según el rango seleccionado ──────────────────────
  useEffect(() => {
    const now = dateUtils.getCurrentEcuadorDate();
    
    switch (dateRange) {
      case 'all':
        setStartDate('');
        setEndDate('');
        break;
      case 'today': {
        const todayStr = dateUtils.getDateInputValue(now);
        setStartDate(todayStr);
        setEndDate(todayStr);
        break;
      }
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        setStartDate(dateUtils.getDateInputValue(weekStart));
        setEndDate(dateUtils.getDateInputValue(weekEnd));
        break;
      }
      case 'month': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(dateUtils.getDateInputValue(monthStart));
        setEndDate(dateUtils.getDateInputValue(monthEnd));
        break;
      }
      case 'custom':
        break;
      default:
        setStartDate('');
        setEndDate('');
    }
  }, [dateRange]);

  const notify = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 6000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 5000); }
  };

  // Función para descargar archivo usando axios directamente
  const downloadBlob = async (url, filename) => {
    try {
      // Usar api directamente con responseType: 'blob'
      const response = await api({
        url: url,
        method: 'GET',
        responseType: 'blob'
      });
      
      if (response.status < 200 || response.status >= 300) {
        throw new Error('Archivo no disponible');
      }
      
      return response.data; // Esto es un Blob
    } catch (error) {
      console.error('Error descargando:', error);
      throw new Error(error.response?.data || 'Archivo no disponible');
    }
  };

  // Descarga PDF
  const handleDownloadPdf = async (inv) => {
    try { 
      const blob = await downloadBlob(`/einvoicing/invoices/${inv.id}/pdf`, `FACT-${inv.invoice_number}.pdf`);
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `FACT-${inv.invoice_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (e) { 
      notify(e.message, true); 
    }
  };

  // Descarga XML
  const handleDownloadXml = async (inv) => {
    try { 
      const blob = await downloadBlob(`/einvoicing/invoices/${inv.id}/xml`, `FACT-${inv.invoice_number}.xml`);
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `FACT-${inv.invoice_number}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (e) { 
      notify(e.message, true); 
    }
  };

  const filterByDate = (invoicesList, start, end) => {
    return invoicesList.filter(inv => {
      if (!inv.emission_date) return false;
      return dateUtils.isDateInRange(inv.emission_date, start, end);
    });
  };

  const handleDownload = async () => {
    setDownloadingAll(true);
    setError('');
    setSuccess('');

    try {
      let targetInvoices = invoices;
      let isFiltered = false;

      // Si hay fechas definidas, filtrar por fecha
      if (startDate || endDate) {
        targetInvoices = filterByDate(invoices, startDate, endDate);
        isFiltered = true;
      }

      if (search) {
        const q = search.toLowerCase();
        targetInvoices = targetInvoices.filter(inv => {
          return (inv.customer_name || '').toLowerCase().includes(q) ||
                 (inv.customer_ruc || '').toLowerCase().includes(q);
        });
        isFiltered = true;
      }

      if (statusFilter !== 'all') {
        targetInvoices = targetInvoices.filter(inv => inv.status === statusFilter);
        isFiltered = true;
      }

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
          const xmlBlob = await downloadBlob(`/einvoicing/invoices/${inv.id}/xml`, `${inv.invoice_number}.xml`);
          const pdfBlob = await downloadBlob(`/einvoicing/invoices/${inv.id}/pdf`, `RIDE-${inv.invoice_number}.pdf`);

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

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      
      let fileName = `facturas_${new Date().toISOString().slice(0,10)}`;
      if (isFiltered) {
        fileName += `_filtradas`;
        if (startDate) fileName += `_desde_${startDate}`;
        if (endDate) fileName += `_hasta_${endDate}`;
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
      // ✅ SIN /api
      const res = await fetchWithAuth(`/einvoicing/invoices/${inv.id}/resend`, { method: 'POST' });
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

  // ── Función para reenviar todas las pendientes ──────────────────────────
  const handleResendAllPending = async () => {
    const pendingInvoices = filtered.filter(inv => inv.status === 'pendiente');
    if (pendingInvoices.length === 0) {
      notify('No hay facturas pendientes en el filtro actual', true);
      return;
    }

    if (!window.confirm(`¿Reenviar ${pendingInvoices.length} factura(s) pendiente(s) al SRI?`)) {
      return;
    }

    setActionId('all');
    let successCount = 0;
    let errorCount = 0;

    for (const inv of pendingInvoices) {
      try {
        const res = await fetchWithAuth(`/einvoicing/invoices/${inv.id}/resend`, { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al reenviar');
        setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, ...data } : i));
        successCount++;
      } catch (e) {
        console.error(`Error reenviando factura ${inv.invoice_number}:`, e);
        errorCount++;
      }
    }

    setActionId(null);
    notify(`Reenviadas: ${successCount} exitosas, ${errorCount} fallidas`);
  };

  // ── Filtrado combinado ──────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (inv.customer_name || '').toLowerCase().includes(q) ||
      (inv.customer_ruc || '').toLowerCase().includes(q);
    const matchDate = dateUtils.isDateInRange(inv.emission_date, startDate, endDate);
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchDate && matchStatus;
  });


  const hasFilters = search !== '' || dateRange !== 'all' || statusFilter !== 'all';
  
  const downloadCount = filtered.filter(inv => 
    inv.status === 'autorizada' && inv.has_signed_xml
  ).length;

  const pendingCount = filtered.filter(inv => inv.status === 'pendiente').length;

  const clearAllFilters = () => {
    setSearch('');
    setDateRange('all');
    setStatusFilter('all');
  };

  // ── Columnas para la tabla ──────────────────────────────────────────────
  const columns = [
    {
      accessor: 'invoice_number',
      label: 'N° Factura',
      render: (item) => (
        <span>{item.invoice_number}</span>
      )
    },
    {
      accessor: 'emission_date',
      label: 'Fecha',
      render: (item) => {
        const date = dateUtils.formatDisplayDate(item.emission_date);
        return <span style={{ color: 'var(--text-muted)' }}>{date}</span>;
      }
    },
    {
      accessor: 'customer',
      label: 'Cliente',
      render: (item) => (
        <div className="einv-customer-info">
          <div className="einv-customer-name">{item.customer_name}</div>
          {item.customer_ruc && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>{item.customer_ruc}</div>}
          {item.customer_phone && (
            <div className="einv-customer-phone">
              <MessageCircle size={9} /> {item.customer_phone}
            </div>
          )}
        </div>
      )
    },
    {
      accessor: 'subtotal',
      label: 'Subtotal',
      align: 'right',
      render: (item) => (
        <span>${parseFloat(item.subtotal || 0).toFixed(2)}</span>
      )
    },
    {
      accessor: 'iva_amount',
      label: 'IVA',
      align: 'right',
      render: (item) => (
        <span>${parseFloat(item.iva_amount || 0).toFixed(2)}</span>
      )
    },
    {
      accessor: 'total',
      label: 'Total',
      align: 'right',
      render: (item) => (
        <span>
          ${parseFloat(item.total || 0).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => {
        const st = STATUS_STYLE[item.status] || STATUS_STYLE.pendiente;
        return (
          <div>
            <span className={`einv-status-badge ${item.status}`}>
              {st.label}
            </span>
          </div>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => {
        const isAct = actionId === item.id || actionId === 'all';
        return (
          <ButtonGroup>
            {item.has_signed_xml && (
              <IconTextButton
                variant="info"
                size="sm"
                icon={<Download size={11} />}
                onClick={() => handleDownloadPdf(item)}
                tooltip="Descargar RIDE (PDF)"
              >
                PDF
              </IconTextButton>
            )}
            {item.has_signed_xml && (
              <IconTextButton
                variant="blue"
                size="sm"
                icon={<Download size={11} />}
                onClick={() => handleDownloadXml(item)}
                tooltip="Descargar XML firmado"
              >
                XML
              </IconTextButton>
            )}
            {(item.status === 'pendiente' || item.status === 'rechazada') && (
              <IconTextButton
                variant="success"
                size="sm"
                icon={<Send size={11} />}
                onClick={() => handleResend(item)}
                disabled={isAct}
                loading={isAct && actionId === item.id}
                tooltip="Reenviar al SRI"
              >
                SRI
              </IconTextButton>
            )}
            {item.status === 'autorizada' && (
              <IconTextButton
                variant="success"
                size="sm"
                icon={<Mail size={11} />}
                onClick={() => setEmailMdl(item)}
                tooltip="Reenviar comprobante"
              >
                Email
              </IconTextButton>
            )}
          </ButtonGroup>
        );
      }
    }
  ];

  // ── Toolbar ─────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div style={{ minWidth: '130px', maxWidth: '150px'  }}>
        <CustomCombobox
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filtrar por estado"
          size="sm"
          filterable={false}
          style={{ minWidth: '160px' }}
        />
      </div>
      <div style={{ minWidth: '130px', maxWidth: '150px'  }}>
        <CustomCombobox
          options={dateOptions}
          value={dateRange}
          onChange={setDateRange}
          placeholder="Seleccionar período"
          size="sm"
          filterable={false}
          style={{ minWidth: '150px' }}
        />

        {dateRange === 'custom' && (
          <div className="einv-date-range" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              type="date" 
              className="einv-date-input"
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: '130px' }}
            />
            <span className="einv-date-separator" style={{ color: 'var(--text-muted)' }}>→</span>
            <input 
              type="date" 
              className="einv-date-input"
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Opcional"
              style={{ width: '130px' }}
            />
          </div>
        )}
      </div>

      {/* Botones de acción en el toolbar */}
      <ButtonGroup style={{ flexShrink: 0 }}>
        {pendingCount > 0 && (
          <IconTextButton
            variant="warning"
            size="md"
            icon={<Send size={14} />}
            onClick={handleResendAllPending}
            disabled={actionId === 'all'}
            loading={actionId === 'all'}
          >
            Reenviar ({pendingCount})
          </IconTextButton>
        )}

        {downloadCount > 0 && (
          <IconTextButton
            variant={hasFilters ? "purple" : "success"}
            size="md"
            icon={hasFilters ? <Folder size={14} /> : <MdOutlineFileDownload size={14} />}
            onClick={handleDownload}
            disabled={downloadingAll}
            loading={downloadingAll}
          >
            {downloadingAll 
              ? 'Preparando...' 
              : hasFilters 
                ? `Descargar (${downloadCount})` 
                : `Descargar (${downloadCount})`
            }
          </IconTextButton>
        )}

        {downloadCount === 0 && !loading && (
          <span className="einv-no-download-msg" style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '0 8px' }}>
            {hasFilters ? 'Sin facturas' : 'Sin facturas para descargar'}
          </span>
        )}

        {hasFilters && (
          <IconTextButton
            variant="danger"
            size="md"
            icon={<X size={14} />}
            onClick={clearAllFilters}
          >
            Limpiar
          </IconTextButton>
        )}
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar (solo en header) ────────────────────────────────
  const refreshButton = (
    <button
      onClick={load}
      className="dashboard-refresh-btn-header"
      disabled={loading}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={loading ? 'spinning' : ''} />
      <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Comprobantes Electrónicos"
      subtitle="Comprobantes emitidos al SRI"
      theme="business"
      headerAction={refreshButton}
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
        <div className="einv-message error">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {success && (
        <div className="einv-message success">
          <CheckCircle size={15} /> {success}
        </div>
      )}
      {/* Tabla */}
      <Table
        data={filtered}
        columns={columns}
        keyField="id"
        title=""
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder='Buscar por No. factura, nombre...'
        searchFields={['invoice_number', 'customer_name', 'customer_ruc']}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          !loading && invoices.length === 0 
            ? 'Sin facturas electrónicas emitidas' 
            : filtered.length === 0 && invoices.length > 0
              ? 'Sin resultados para esa búsqueda'
              : 'Cargando...'
        }
        striped
        hoverable
        bordered={false}
        className="einv-table"
      />
    </PageTemplate>
  );
}