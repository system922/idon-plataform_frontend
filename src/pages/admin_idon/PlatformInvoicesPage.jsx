import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';
import { ButtonGroup, IconTextButton } from '../../components/General/Button';
import { useAlert } from '../../context/ConfirmContext';
import { adminApi, api } from '../../config/api';
import { FiDownload, FiMail, FiRefreshCw, FiSearch } from 'react-icons/fi';
import '../../styles/PlatformEinvoicesPage.css';

const STATUS_LABELS = {
  autorizada: 'Autorizada',
  pendiente: 'Pendiente SRI',
  rechazada: 'Rechazada',
  error: 'Error de emisión',
};

export default function PlatformInvoicesPage() {
  const alert = useAlert();
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [actingInvoice, setActingInvoice] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await adminApi.get('/admin/einvoicing/invoices');
      setInvoices(response.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const status = invoice.sri_status || invoice.invoice_status || 'pendiente';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const searchable = [
        invoice.business_name,
        invoice.customer_name,
        invoice.customer_email,
        invoice.customer_ruc,
        invoice.invoice_number,
      ].join(' ').toLowerCase();
      return matchesStatus && (!term || searchable.includes(term));
    });
  }, [invoices, search, statusFilter]);

  const downloadFile = async (invoice, format) => {
    try {
      const response = await api.get(
        `/admin/einvoicing/invoices/${invoice.invoice_id}/${format}`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${format === 'pdf' ? 'FACT' : 'XML'}-${invoice.invoice_number}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (downloadError) {
      alert.error(`No se pudo descargar el comprobante: ${downloadError.response?.data?.message || downloadError.message}`);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoice || !email.trim()) return;
    setSending(true);
    try {
      await adminApi.post(`/admin/einvoicing/invoices/${selectedInvoice.invoice_id}/email`, { email: email.trim() });
      alert.success(`Factura ${selectedInvoice.invoice_number} enviada a ${email.trim()}.`, '✅ Éxito');
      setSelectedInvoice(null);
    } catch (sendError) {
      alert.error(`No se pudo enviar la factura: ${sendError.response?.data?.message || sendError.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (invoice) => {
    setActingInvoice(invoice.billing_history_id);
    try {
      await adminApi.post(`/admin/einvoicing/payments/${invoice.billing_history_id}/emit`, {});
      await load();
      alert.success('Factura emitida y enviada a autorización del SRI.', '✅ Éxito');
    } catch (retryError) {
      alert.error(`No se pudo emitir la factura: ${retryError.response?.data?.message || retryError.message}`);
    } finally {
      setActingInvoice(null);
    }
  };

  const columns = [
    {
      accessor: 'billing_date',
      label: 'Fecha',
      render: (invoice) => invoice.billing_date
        ? new Date(invoice.billing_date).toLocaleDateString('es-EC')
        : '—',
    },
    {
      accessor: 'business_name',
      label: 'Negocio / Cliente',
      render: (invoice) => (
        <div>
          <strong>{invoice.business_name}</strong>
          <div className="platform-invoice-subtext">{invoice.customer_name || '—'}</div>
          <div className="platform-invoice-subtext">{invoice.customer_email || '—'}</div>
        </div>
      ),
    },
    {
      accessor: 'invoice_number',
      label: 'N.º comprobante',
      render: (invoice) => invoice.invoice_number || 'Sin emitir',
    },
    {
      accessor: 'customer_ruc',
      label: 'Identificación',
      render: (invoice) => invoice.customer_ruc || '—',
    },
    {
      accessor: 'invoice_total',
      label: 'Total',
      align: 'center',
      render: (invoice) => `$${Number(invoice.invoice_total ?? invoice.amount ?? 0).toFixed(2)}`,
    },
    {
      accessor: 'sri_status',
      label: 'Estado SRI',
      render: (invoice) => {
        const status = invoice.sri_status || invoice.invoice_status || 'pendiente';
        return (
          <div>
            <span className={`platform-invoice-status platform-invoice-status-${status}`}>
              {STATUS_LABELS[status] || status}
            </span>
            {invoice.invoice_error && <div className="platform-invoice-error">{invoice.invoice_error}</div>}
            {invoice.sri_message && <div className="platform-invoice-subtext">{invoice.sri_message}</div>}
          </div>
        );
      },
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (invoice) => {
        const status = invoice.sri_status || invoice.invoice_status;
        return (
          <div className="platform-invoice-actions">
            {invoice.invoice_id && (
              <>
                <button type="button" onClick={() => downloadFile(invoice, 'pdf')} title="Descargar PDF">
                  <FiDownload size={14} /> PDF
                </button>
                {invoice.has_signed_xml && (
                  <button type="button" onClick={() => downloadFile(invoice, 'xml')} title="Descargar XML firmado">
                    <FiDownload size={14} /> XML
                  </button>
                )}
                {status === 'autorizada' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInvoice(invoice);
                      setEmail(invoice.customer_email || '');
                    }}
                    title="Enviar factura por correo"
                  >
                    <FiMail size={14} /> Enviar
                  </button>
                )}
              </>
            )}
            {!invoice.invoice_id && ['error', 'pendiente'].includes(invoice.invoice_status) && (
              <button
                type="button"
                disabled={actingInvoice === invoice.billing_history_id}
                onClick={() => handleRetry(invoice)}
              >
                {actingInvoice === invoice.billing_history_id ? 'Reintentando...' : 'Reintentar'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const toolbar = (
    <div className="platform-invoices-toolbar">
      <label className="platform-invoices-search">
        <FiSearch size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar negocio, cliente, RUC o comprobante..."
        />
      </label>
      <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
        <option value="all">Todos los estados</option>
        <option value="autorizada">Autorizadas</option>
        <option value="pendiente">Pendientes</option>
        <option value="rechazada">Rechazadas</option>
        <option value="error">Error de emisión</option>
      </select>
    </div>
  );

  const emailFooter = (
    <ButtonGroup>
      <IconTextButton variant="" size="md" onClick={() => setSelectedInvoice(null)} disabled={sending}>
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        icon={<FiMail size={14} />}
        onClick={handleSendEmail}
        disabled={sending || !email.trim()}
        loading={sending}
      >
        {sending ? 'Enviando...' : 'Enviar factura'}
      </IconTextButton>
    </ButtonGroup>
  );

  const refreshButton = (
    <button className="dashboard-refresh-btn-header" onClick={handleRefresh} disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="COMPROBANTES ELECTRÓNICOS"
      subtitle="Consulta los comprobantes emitidos por pagos de suscripción, revisa su estado SRI y descarga o reenvía los autorizados."
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      <Table
        data={filteredInvoices}
        columns={columns}
        keyField="billing_history_id"
        title="Facturas de suscripción"
        subtitle={`${filteredInvoices.length} comprobante${filteredInvoices.length === 1 ? '' : 's'}`}
        toolbar={toolbar}
        searchable={false}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        emptyMessage={search || statusFilter !== 'all' ? 'No hay comprobantes que coincidan con los filtros.' : 'Todavía no hay pagos registrados.'}
        striped={true}
        hoverable={true}
        bordered={false}
      />
      <p className="platform-invoices-note">
        Las facturas se envían automáticamente al correo del cliente cuando el SRI las autoriza.
      </p>
      {selectedInvoice && (
        <Modal
          isOpen={true}
          title={`Enviar factura ${selectedInvoice.invoice_number}`}
          size="sm"
          closeOnOverlayClick={false}
          onClose={() => setSelectedInvoice(null)}
          footer={emailFooter}
        >
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="cliente@ejemplo.com"
          />
        </Modal>
      )}
    </PageTemplate>
  );
}
