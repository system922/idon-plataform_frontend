import React, { useState, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import {
  AlertCircle, CheckCircle, DollarSign, Calendar, FileText,
  Download, Upload, RefreshCw, X, Eye, Shield, Zap, Clock
} from 'react-feather';
import { FiRefreshCw as FiRefreshCwIcon } from 'react-icons/fi';

// ─── DATOS DE PRUEBA (MOCK) ──────────────────────────────────────────────────

// Obligaciones fiscales actuales
const TAX_OBLIGATIONS = [
  {
    id: 1,
    name: 'IVA - Declaración Mensual',
    period: 'Enero 2026',
    dueDate: '2026-02-10',
    amount: 1200.00,
    paid: false,
    status: 'pending', // pending, paid, overdue
    type: 'iva'
  },
  {
    id: 2,
    name: 'Retención en la Fuente',
    period: 'Enero 2026',
    dueDate: '2026-02-15',
    amount: 450.00,
    paid: false,
    status: 'pending',
    type: 'withholding'
  },
  {
    id: 3,
    name: 'Impuesto a la Renta - Anticipo',
    period: '1er Trimestre 2026',
    dueDate: '2026-02-28',
    amount: 1800.00,
    paid: false,
    status: 'pending',
    type: 'income'
  },
  {
    id: 4,
    name: 'IVA - Diciembre 2025',
    period: 'Diciembre 2025',
    dueDate: '2026-01-10',
    amount: 980.00,
    paid: true,
    status: 'paid',
    type: 'iva'
  },
  {
    id: 5,
    name: 'Retención en la Fuente - Dic 2025',
    period: 'Diciembre 2025',
    dueDate: '2026-01-15',
    amount: 320.00,
    paid: true,
    status: 'paid',
    type: 'withholding'
  }
];

// Impuestos configurados en el sistema
const TAX_CONFIGURATION = [
  { id: 1, name: 'IVA 0%', rate: 0, type: 'iva', appliesTo: 'Todos los productos' },
  { id: 2, name: 'IVA 12%', rate: 12, type: 'iva', appliesTo: 'Productos y servicios generales' },
  { id: 3, name: 'IVA 15%', rate: 15, type: 'iva', appliesTo: 'Servicios de lujo' },
  { id: 4, name: 'Retención IVA 30%', rate: 30, type: 'withholding', appliesTo: 'Proveedores no residentes' },
  { id: 5, name: 'Retención Renta 10%', rate: 10, type: 'withholding', appliesTo: 'Honorarios profesionales' },
  { id: 6, name: 'Retención Renta 25%', rate: 25, type: 'withholding', appliesTo: 'Servicios de construcción' }
];

// Historial de declaraciones presentadas
const DECLARATION_HISTORY = [
  { id: 1, type: 'IVA', period: 'Dic 2025', submittedAt: '2026-01-10 09:30', status: 'aceptado', amount: 980.00, form: 'Formulario 104' },
  { id: 2, type: 'Retención', period: 'Dic 2025', submittedAt: '2026-01-12 14:15', status: 'aceptado', amount: 320.00, form: 'Formulario 107' },
  { id: 3, type: 'IVA', period: 'Nov 2025', submittedAt: '2025-12-10 11:00', status: 'aceptado', amount: 1050.00, form: 'Formulario 104' },
  { id: 4, type: 'Renta', period: '2025 Anual', submittedAt: '2026-01-20 16:45', status: 'en_proceso', amount: 2400.00, form: 'Formulario 102' },
  { id: 5, type: 'Retención', period: 'Nov 2025', submittedAt: '2025-12-12 10:20', status: 'aceptado', amount: 290.00, form: 'Formulario 107' }
];

// Estado de integración SRI (mock)
const SRI_INTEGRATION = {
  connected: true,
  lastSync: '2026-01-31 18:45:00',
  pendingDocuments: 3,
  totalDocuments: 145,
  lastError: null,
  logs: [
    { id: 1, timestamp: '2026-01-31 18:45:00', level: 'info', message: 'Sincronización completa - 12 comprobantes enviados' },
    { id: 2, timestamp: '2026-01-31 18:30:00', level: 'info', message: 'Conexión establecida con SRI' },
    { id: 3, timestamp: '2026-01-31 18:15:00', level: 'warning', message: 'Documento #FAC-2026-0012 pendiente de autorización' },
    { id: 4, timestamp: '2026-01-31 17:00:00', level: 'error', message: 'Error al enviar factura #FAC-2026-0015 - Clave de acceso duplicada' },
    { id: 5, timestamp: '2026-01-31 16:30:00', level: 'info', message: 'Inicio de sincronización automática' }
  ]
};

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Modal para detalle de declaración
function DeclarationDetailModal({ isOpen, onClose, declaration }) {
  if (!declaration) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Declaración - ${declaration.type}`}
      size="md"
      footer={
        <ButtonGroup>
          <IconTextButton variant="danger" size="md" icon={<X size={14} />} onClick={onClose}>
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div><strong>Período:</strong> {declaration.period}</div>
        <div><strong>Formulario:</strong> {declaration.form}</div>
        <div><strong>Monto:</strong> ${declaration.amount.toFixed(2)}</div>
        <div><strong>Estado:</strong> <span className={`status-badge ${declaration.status}`}>{declaration.status}</span></div>
        <div><strong>Fecha de envío:</strong> {declaration.submittedAt}</div>
        <div><strong>Tipo:</strong> {declaration.type}</div>
      </div>
    </Modal>
  );
}

// Modal para enviar comprobante al SRI
function SendDocumentModal({ isOpen, onClose, onSend }) {
  const [documentType, setDocumentType] = useState('factura');
  const [documentNumber, setDocumentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      setTimeout(() => {
        onSend({ documentType, documentNumber });
        onClose();
        setSuccess(false);
        setDocumentNumber('');
      }, 1000);
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Enviar Comprobante al SRI"
      size="md"
      footer={
        <ButtonGroup>
          <IconTextButton variant="secondary" size="md" onClick={onClose}>
            Cancelar
          </IconTextButton>
          <IconTextButton
            variant="primary"
            size="md"
            icon={<Upload size={14} />}
            onClick={handleSend}
            disabled={!documentNumber || loading}
            loading={loading}
          >
            Enviar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      {success ? (
        <div className="alert-success">
          <CheckCircle size={16} /> Comprobante enviado exitosamente.
        </div>
      ) : (
        <>
          <div className="filter-group" style={{ marginBottom: '12px' }}>
            <label>Tipo de comprobante</label>
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
              <option value="factura">Factura</option>
              <option value="nota_credito">Nota de Crédito</option>
              <option value="nota_debito">Nota de Débito</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Número de comprobante</label>
            <input
              type="text"
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="Ej: FAC-2026-0015"
            />
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function AccountingTax() {
  const [activeTab, setActiveTab] = useState('obligations'); // 'obligations', 'config', 'history', 'sri'
  const [obligations, setObligations] = useState(TAX_OBLIGATIONS);
  const [declarations, setDeclarations] = useState(DECLARATION_HISTORY);
  const [sriStatus, setSriStatus] = useState(SRI_INTEGRATION);
  const [selectedDeclaration, setSelectedDeclaration] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Acciones ──────────────────────────────────────────────────────────────

  // Simular pago de obligación
  const handlePayObligation = (id) => {
    setObligations(prev =>
      prev.map(ob =>
        ob.id === id ? { ...ob, paid: true, status: 'paid' } : ob
      )
    );
    setSuccess('Obligación pagada correctamente (simulado)');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Simular declaración (agregar al historial)
  const handleDeclare = () => {
    const newDeclaration = {
      id: Date.now(),
      type: 'IVA',
      period: 'Enero 2026',
      submittedAt: new Date().toLocaleString('es-EC'),
      status: 'en_proceso',
      amount: 1200.00,
      form: 'Formulario 104'
    };
    setDeclarations([newDeclaration, ...declarations]);
    setSuccess('Declaración enviada correctamente (simulado)');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Simular envío de comprobante al SRI
  const handleSendDocument = (data) => {
    setSuccess(`Comprobante ${data.documentNumber} enviado al SRI (simulado)`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Simular sincronización con SRI
  const handleSyncSRI = () => {
    setRefreshing(true);
    setTimeout(() => {
      const updatedLogs = [
        { id: Date.now(), timestamp: new Date().toLocaleString('es-EC'), level: 'info', message: 'Sincronización manual iniciada' },
        ...sriStatus.logs.slice(0, 4)
      ];
      setSriStatus({
        ...sriStatus,
        lastSync: new Date().toLocaleString('es-EC'),
        pendingDocuments: Math.max(0, sriStatus.pendingDocuments - 2),
        logs: updatedLogs
      });
      setRefreshing(false);
      setSuccess('Sincronización con SRI completada (simulado)');
      setTimeout(() => setSuccess(''), 3000);
    }, 1500);
  };

  // ─── Ver detalle de declaración ────────────────────────────────────────────
  const handleViewDeclaration = (dec) => {
    setSelectedDeclaration(dec);
    setModalOpen(true);
  };

  // ─── Refrescar general ─────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setSuccess('Datos actualizados correctamente');
      setTimeout(() => setSuccess(''), 3000);
    }, 800);
  };

  // ─── Columnas para tablas ─────────────────────────────────────────────────

  // Obligaciones
  const obligationColumns = [
    { accessor: 'name', label: 'Concepto' },
    { accessor: 'period', label: 'Período' },
    { accessor: 'dueDate', label: 'Vencimiento' },
    {
      accessor: 'amount',
      label: 'Monto ($)',
      align: 'right',
      render: (item) => <span>${item.amount.toFixed(2)}</span>
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => (
        <span className={`status-badge ${item.status}`}>
          {item.status === 'pending' ? 'Pendiente' : item.status === 'paid' ? 'Pagado' : 'Vencido'}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <>
          {!item.paid && item.status !== 'paid' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<DollarSign size={12} />}
              onClick={() => handlePayObligation(item.id)}
            >
              Pagar
            </IconTextButton>
          )}
        </>
      )
    }
  ];

  // Configuración de impuestos
  const configColumns = [
    { accessor: 'name', label: 'Nombre' },
    { accessor: 'rate', label: 'Tasa (%)', align: 'right' },
    { accessor: 'type', label: 'Tipo', render: (item) => (
      <span className={`tax-type ${item.type}`}>
        {item.type === 'iva' ? 'IVA' : 'Retención'}
      </span>
    ) },
    { accessor: 'appliesTo', label: 'Aplica a' }
  ];

  // Historial de declaraciones
  const declarationColumns = [
    { accessor: 'type', label: 'Tipo' },
    { accessor: 'period', label: 'Período' },
    { accessor: 'form', label: 'Formulario' },
    {
      accessor: 'amount',
      label: 'Monto ($)',
      align: 'right',
      render: (item) => <span>${item.amount.toFixed(2)}</span>
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => (
        <span className={`status-badge ${item.status}`}>
          {item.status === 'aceptado' ? 'Aceptado' : item.status === 'en_proceso' ? 'En proceso' : 'Rechazado'}
        </span>
      )
    },
    { accessor: 'submittedAt', label: 'Fecha de envío' },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <IconTextButton
          variant="info"
          size="sm"
          inline={true}
          icon={<Eye size={12} />}
          onClick={() => handleViewDeclaration(item)}
        >
          Ver
        </IconTextButton>
      )
    }
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="GESTIÓN DE IMPUESTOS"
      subtitle="Administración de obligaciones fiscales e integración SRI"
      theme="business"
      loading={refreshing}
      headerAction={
        <button
          onClick={handleRefresh}
          className="dashboard-refresh-btn-header"
          disabled={refreshing}
          title="Actualizar datos"
        >
          <FiRefreshCwIcon size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="accounting-tax-container custom-dashboard">
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* ─── Tabs ────────────────────────────────────────────────────────── */}
        <div className="tabs-container">
          <div className="tabs-header">
            <button
              className={`tab-btn ${activeTab === 'obligations' ? 'active' : ''}`}
              onClick={() => setActiveTab('obligations')}
            >
              <DollarSign size={16} /> Obligaciones
            </button>
            <button
              className={`tab-btn ${activeTab === 'config' ? 'active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <Shield size={16} /> Configuración
            </button>
            <button
              className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <FileText size={16} /> Historial
            </button>
            <button
              className={`tab-btn ${activeTab === 'sri' ? 'active' : ''}`}
              onClick={() => setActiveTab('sri')}
            >
              <Zap size={16} /> Integración SRI
            </button>
          </div>

          <div className="tab-content">
            {/* ─── Pestaña: Obligaciones ──────────────────────────────────── */}
            {activeTab === 'obligations' && (
              <div className="tab-panel">
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <IconTextButton
                    variant="primary"
                    size="md"
                    icon={<FileText size={14} />}
                    onClick={handleDeclare}
                  >
                    Nueva Declaración (simular)
                  </IconTextButton>
                </div>
                <Table
                  data={obligations}
                  columns={obligationColumns}
                  keyField="id"
                  title="Obligaciones Fiscales"
                  subtitle={`${obligations.filter(o => !o.paid).length} pendientes de pago`}
                  pagination={true}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10]}
                  striped={true}
                  hoverable={true}
                  emptyMessage="No hay obligaciones registradas"
                />
              </div>
            )}

            {/* ─── Pestaña: Configuración ────────────────────────────────── */}
            {activeTab === 'config' && (
              <div className="tab-panel">
                <div style={{ marginBottom: '16px' }}>
                  <IconTextButton variant="secondary" size="md" icon={<Shield size={14} />}>
                    Agregar Impuesto (simulado)
                  </IconTextButton>
                </div>
                <Table
                  data={TAX_CONFIGURATION}
                  columns={configColumns}
                  keyField="id"
                  title="Configuración de Impuestos"
                  subtitle={`${TAX_CONFIGURATION.length} impuestos configurados`}
                  pagination={true}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10]}
                  striped={true}
                  hoverable={true}
                />
              </div>
            )}

            {/* ─── Pestaña: Historial ────────────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="tab-panel">
                <Table
                  data={declarations}
                  columns={declarationColumns}
                  keyField="id"
                  title="Historial de Declaraciones"
                  subtitle={`${declarations.length} declaraciones presentadas`}
                  pagination={true}
                  itemsPerPage={5}
                  itemsPerPageOptions={[5, 10]}
                  striped={true}
                  hoverable={true}
                  emptyMessage="No hay declaraciones registradas"
                />
              </div>
            )}

            {/* ─── Pestaña: Integración SRI ──────────────────────────────── */}
            {activeTab === 'sri' && (
              <div className="tab-panel">
                <div className="sri-integration-card">
                  <div className="sri-header">
                    <div className="sri-status">
                      <div className={`sri-status-indicator ${sriStatus.connected ? 'connected' : 'disconnected'}`} />
                      <span className="sri-status-label">
                        {sriStatus.connected ? 'Conectado al SRI' : 'Desconectado'}
                      </span>
                    </div>
                    <div className="sri-actions">
                      <IconTextButton
                        variant="primary"
                        size="md"
                        icon={<RefreshCw size={14} />}
                        onClick={handleSyncSRI}
                        disabled={refreshing}
                      >
                        Sincronizar ahora
                      </IconTextButton>
                      <IconTextButton
                        variant="success"
                        size="md"
                        icon={<Upload size={14} />}
                        onClick={() => setSendModalOpen(true)}
                      >
                        Enviar comprobante
                      </IconTextButton>
                    </div>
                  </div>

                  <div className="sri-stats">
                    <div className="sri-stat-item">
                      <div className="sri-stat-label">Última sincronización</div>
                      <div className="sri-stat-value">{sriStatus.lastSync}</div>
                    </div>
                    <div className="sri-stat-item">
                      <div className="sri-stat-label">Documentos pendientes</div>
                      <div className="sri-stat-value">{sriStatus.pendingDocuments}</div>
                    </div>
                    <div className="sri-stat-item">
                      <div className="sri-stat-label">Total de documentos</div>
                      <div className="sri-stat-value">{sriStatus.totalDocuments}</div>
                    </div>
                    <div className="sri-stat-item">
                      <div className="sri-stat-label">Último error</div>
                      <div className="sri-stat-value" style={{ color: 'var(--danger)' }}>
                        {sriStatus.lastError || 'Ninguno'}
                      </div>
                    </div>
                  </div>

                  <div className="sri-logs">
                    <h4 style={{ marginBottom: '12px' }}>Logs de sincronización</h4>
                    <div className="logs-container">
                      {sriStatus.logs.map(log => (
                        <div key={log.id} className={`log-entry log-${log.level}`}>
                          <span className="log-time">{log.timestamp}</span>
                          <span className="log-level">{log.level.toUpperCase()}</span>
                          <span className="log-message">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Modales ────────────────────────────────────────────────────── */}
        <DeclarationDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          declaration={selectedDeclaration}
        />

        <SendDocumentModal
          isOpen={sendModalOpen}
          onClose={() => setSendModalOpen(false)}
          onSend={handleSendDocument}
        />
      </div>
    </PageTemplate>
  );
}