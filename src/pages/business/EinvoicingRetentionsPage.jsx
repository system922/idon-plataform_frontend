import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, FileText, Search, X, Download } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/EinvoicingInvoicesPage.css';

const STATUS_STYLE = {
  autorizada: { color: '#15803d', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.3)',   label: 'Autorizada', Icon: CheckCircle },
  pendiente:  { color: '#b45309', bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.3)',   label: 'Pendiente',  Icon: Clock },
  rechazada:  { color: '#b91c1c', bg: 'rgba(225,29,72,0.06)',   border: 'rgba(225,29,72,0.25)',  label: 'Rechazada',  Icon: XCircle },
  error:      { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.3)', label: 'Error',      Icon: AlertCircle },
};

export default function EinvoicingRetentionsPage() {
  const [items,      setItems    ] = useState([]);
  const [loading,    setLoading  ] = useState(true);
  const [error,      setError    ] = useState('');
  const [search,     setSearch   ] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await fetchWithAuth('/api/einvoicing/retentions?limit=200');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (item.number          || '').toLowerCase().includes(q) ||
      (item.supplier_name   || '').toLowerCase().includes(q) ||
      (item.supplier_ruc    || '').toLowerCase().includes(q);
    const matchDate = !filterDate || (item.emission_date || '').startsWith(filterDate);
    return matchSearch && matchDate;
  });

  const totalRetenido = items.reduce((sum, i) => sum + parseFloat(i.total_retenido || 0), 0);

  return (
    <PageTemplate
      title="Retenciones"
      subtitle="Comprobantes de retención emitidos al SRI"
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
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {!loading && items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{items.length} retención{items.length !== 1 ? 'es' : ''}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6842fe' }}>
            Total retenido: ${totalRetenido.toFixed(2)}
          </span>
        </div>
      )}

      <div className="einv-filter-bar">
        <div className="einv-search-box">
          <Search size={14} />
          <input
            type="text"
            placeholder="Buscar por N° retención, proveedor o RUC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="einv-clear-btn" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <div className="einv-date-filter">
          <label>Fecha</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          {filterDate && <button className="einv-clear-btn" onClick={() => setFilterDate('')}><X size={13} /></button>}
        </div>
      </div>

      <div className="einv-table-container" style={{ overflowX: 'auto', background: '#fff', border: '1.5px solid var(--color-border,#e2e8f0)', borderRadius: 12 }}>
        <table className="einv-table" style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--color-border,#e2e8f0)' }}>
              <th style={th()}>N° Retención</th>
              <th style={th()}>Fecha</th>
              <th style={th()}>Proveedor</th>
              <th style={th()}>Comprobante origen</th>
              <th style={th('right')}>Base imponible</th>
              <th style={th('right')}>Total retenido</th>
              <th style={th('center')}>Estado</th>
              <th style={th('center')}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 13 }}>Cargando...</td></tr>
            )}
            {!loading && items.length === 0 && !error && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48 }}>
                  <FileText size={36} style={{ color: '#cbd5e1', display: 'block', margin: '0 auto 10px' }} />
                  <div style={{ color: '#94a3b8', fontSize: 13 }}>Sin comprobantes de retención</div>
                  <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Las retenciones emitidas al SRI aparecerán aquí</div>
                </td>
              </tr>
            )}
            {!loading && items.length > 0 && filtered.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 36, color: '#94a3b8', fontSize: 13 }}>Sin resultados para esa búsqueda</td></tr>
            )}
            {!loading && filtered.map(item => {
              const st   = STATUS_STYLE[item.status] || STATUS_STYLE.pendiente;
              const date = item.emission_date ? new Date(item.emission_date).toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
              return (
                <tr key={item.id} className="einv-tbody-tr" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="einv-td" data-label="N° Retención" style={{ padding: '11px 10px', fontWeight: 700, color: '#6842fe', whiteSpace: 'nowrap' }}>{item.number}</td>
                  <td className="einv-td" data-label="Fecha" style={{ padding: '11px 10px', whiteSpace: 'nowrap', color: '#64748b' }}>{date}</td>
                  <td className="einv-td" data-label="Proveedor" style={{ padding: '11px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{item.supplier_name || '—'}</div>
                    {item.supplier_ruc && <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.supplier_ruc}</div>}
                  </td>
                  <td className="einv-td" data-label="Comprobante origen" style={{ padding: '11px 10px', color: '#64748b' }}>{item.invoice_ref || '—'}</td>
                  <td className="einv-td" data-label="Base imponible" style={{ padding: '11px 10px', textAlign: 'right' }}>${parseFloat(item.base_imponible || 0).toFixed(2)}</td>
                  <td className="einv-td" data-label="Total retenido" style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 800, color: '#059669' }}>${parseFloat(item.total_retenido || 0).toFixed(2)}</td>
                  <td className="einv-td" data-label="Estado" style={{ padding: '11px 10px', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 20, padding: '3px 9px', fontWeight: 700, fontSize: 11 }}>
                      <st.Icon size={11} /> {st.label}
                    </span>
                  </td>
                  <td className="einv-td einv-td-actions" data-label="Acciones" style={{ padding: '11px 10px', textAlign: 'center' }}>
                    {item.signed_xml && (
                      <button
                        title="Descargar PDF"
                        style={{ padding: '4px 8px', background: '#fff7ed', color: '#b45309', border: '1px solid #fcd34d', borderRadius: 4, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 11 }}
                      >
                        <Download size={11} /> PDF
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageTemplate>
  );
}

function th(align = 'left') {
  return { padding: '10px 10px', textAlign: align, fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' };
}
