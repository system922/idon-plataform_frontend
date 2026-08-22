import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import {
  FiBox, FiCheck, FiX, FiRefreshCw, FiEye, FiClock,
  FiUser, FiMail, FiPhone, FiFile, FiAlertCircle,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';

// Modal de detalles (sin módulos, solo información y aprobar/rechazar)
function DetailModal({ request, onClose, onApprove, onReject }) {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [saving, setSaving] = useState(false);

  const handleApprove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onApprove();
      // onApprove ya cierra el modal y actualiza la lista
    } catch (err) {
      alert.error(err.message || 'Error al aprobar');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!await showConfirm({
      title: 'Rechazar solicitud',
      message: `¿Estás seguro de que deseas rechazar la solicitud "${request.empresa}"? Esta acción no se puede deshacer.`,
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    setSaving(true);
    try {
      await onReject();
    } catch (err) {
      alert.error(err.message || 'Error al rechazar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal 
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Detalles de Solicitud"
      size="md"
      className="solicitud-modal-detail"
      footer={
        <ButtonGroup>
          <IconTextButton
            variant=""
            size="md"
            icon={<FiX size={14} />}
            onClick={onClose}
            disabled={saving}
          >
            Cerrar
          </IconTextButton>
          {request.estado === 'pendiente' && (
            <>
              <IconTextButton
                variant="danger"
                size="md"
                icon={<FiX size={14} />}
                onClick={handleReject}
                disabled={saving}
              >
                Rechazar
              </IconTextButton>
              <IconTextButton
                variant="success"
                size="md"
                icon={<FiCheck size={14} />}
                onClick={handleApprove}
                disabled={saving}
                loading={saving}
              >
                {saving ? 'Aprobando...' : 'Aprobar'}
              </IconTextButton>
            </>
          )}
        </ButtonGroup>
      }
    >
      <div className="solicitud-modal-body">
        <div className="solicitud-detail-grid">
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiBox size={14} /> Empresa</span>
            <span className="solicitud-detail-value">{request.empresa}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiUser size={14} /> Propietario</span>
            <span className="solicitud-detail-value">{request.propietario}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiMail size={14} /> Email</span>
            <span className="solicitud-detail-value">{request.email}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiPhone size={14} /> Teléfono</span>
            <span className="solicitud-detail-value">{request.telefono}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiFile size={14} /> Cédula / RUC</span>
            <span className="solicitud-detail-value">{request.cedula}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiBox size={14} /> Tipo de negocio</span>
            <span className="solicitud-detail-value">{request.tipo || '—'}</span>
          </div>
          <div className="solicitud-detail-item">
            <span className="solicitud-detail-label"><FiClock size={14} /> Fecha de solicitud</span>
            <span className="solicitud-detail-value">{request.creado}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminSolicitudes() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [allRequests, setAllRequests] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = [
    { value: 'todos', label: `Todos (${allRequests.length})` },
    { value: 'pendiente', label: `Pendientes (${allRequests.filter(r => r.estado === 'pendiente').length})` },
    { value: 'aprobado', label: `Aprobados (${allRequests.filter(r => r.estado === 'aprobado').length})` },
    { value: 'rechazado', label: `Rechazados (${allRequests.filter(r => r.estado === 'rechazado').length})` },
  ];

  const mapRequests = (raw) => (raw || []).map(item => ({
    id: item.id,
    propietario: item.contact_name ||
      `${item.owner_first_name || ''} ${item.owner_last_name || ''}`.trim(),
    tipo: item.business_type_name || '',
    tipo_codigo: item.business_type_code || '',
    empresa: item.business_name,
    email: item.owner_email,
    telefono: item.owner_phone || '—',
    cedula: item.owner_document_number || '—',
    status: item.status,
    business_id: item.business_id || null,
    estado: item.status === 'pending' ? 'pendiente'
      : item.status === 'approved' ? 'aprobado'
      : item.status === 'rejected' ? 'rechazado'
      : item.status,
    creado: item.requested_at
      ? new Date(item.requested_at).toLocaleString('es-EC', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })
      : '—',
  }));

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.get('/admin/requests');
      const allData = mapRequests(res.data);
      setAllRequests(allData);
      setRequests(filterStatus === 'todos'
        ? allData
        : allData.filter(r => r.estado === filterStatus));
    } catch (err) {
      setError(err.message || 'Error al cargar solicitudes');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleApprove = async (requestId) => {
    try {
      await adminApi.post(`/admin/${requestId}/approve`, {});
      await loadRequests();
      alert.success('Solicitud aprobada correctamente');
    } catch (err) {
      alert.error(err.message || 'Error al aprobar');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await adminApi.post(`/admin/${requestId}/reject`, {});
      await loadRequests();
      alert.info('Solicitud rechazada');
    } catch (err) {
      alert.error(err.message || 'Error al rechazar');
    }
  };

  const getStatusBadge = (status) => {
    const norm = status === 'pendiente' ? 'pending'
      : status === 'aprobado' ? 'approved'
      : status === 'rechazado' ? 'rejected'
      : status;
    const cls = { pending: 'admin-badge-warning', approved: 'admin-badge-success', rejected: 'admin-badge-danger' };
    const label = {
      pending: <><FiClock size={13} /> Pendiente</>,
      approved: <><FiCheck size={13} /> Aprobado</>,
      rejected: <><FiX size={13} /> Rechazado</>,
    };
    return <span className={`admin-badge ${cls[norm] || 'admin-badge-info'}`}>{label[norm] || status}</span>;
  };

  const openDetail = (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setSelectedRequest(null);
  };

  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    const term = searchTerm.toLowerCase();
    return requests.filter(r =>
      r.propietario?.toLowerCase().includes(term) ||
      r.empresa?.toLowerCase().includes(term) ||
      r.email?.toLowerCase().includes(term) ||
      r.tipo?.toLowerCase().includes(term) ||
      r.cedula?.toLowerCase().includes(term)
    );
  }, [requests, searchTerm]);

  const columns = [
    {
      accessor: 'propietario',
      label: 'Propietario',
      render: (item) => <strong>{item.propietario}</strong>,
    },
    {
      accessor: 'empresa',
      label: 'Empresa',
    },
    {
      accessor: 'tipo',
      label: 'Tipo',
      render: (item) => item.tipo || item.tipo_codigo || '—',
    },
    {
      accessor: 'estado',
      label: 'Estado',
      render: (item) => getStatusBadge(item.status || item.estado),
    },
    {
      accessor: 'creado',
      label: 'Creado',
      render: (item) => <span className="admin-table-date">{item.creado}</span>,
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline
            icon={<FiEye size={13} />}
            onClick={() => openDetail(item)}
            tooltip="Ver detalles"
          >
            Ver
          </IconTextButton>
          {item.estado === 'pendiente' && (
            <>
              <IconTextButton
                variant="success"
                size="sm"
                inline
                icon={<FiCheck size={13} />}
                onClick={() => handleApprove(item.id)}
                tooltip="Aprobar solicitud"
              >
                Aprobar
              </IconTextButton>
              <IconTextButton
                variant="danger"
                size="sm"
                inline
                icon={<FiX size={13} />}
                onClick={() => handleReject(item.id)}
                tooltip="Rechazar solicitud"
              >
                Rechazar
              </IconTextButton>
            </>
          )}
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <CustomCombobox
      options={statusOptions}
      value={filterStatus}
      onChange={setFilterStatus}
      placeholder="Filtrar por estado"
      filterable={false}
      size="sm"
    />
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="SOLICITUDES DE REGISTRO"
      subtitle="Revisa y aprueba nuevas solicitudes de registro de negocios"
      theme="admin"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error" style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredRequests}
        columns={columns}
        keyField="id"
        title="Lista de Solicitudes"
        subtitle={`${filteredRequests.length} ${filteredRequests.length === 1 ? 'solicitud' : 'solicitudes'} encontradas`}
        toolbar={toolbar}
        searchable
        searchPlaceholder="Buscar por propietario, empresa, email..."
        searchFields={['propietario', 'empresa', 'email', 'tipo', 'cedula']}
        pagination
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterStatus !== 'todos'
            ? 'No hay solicitudes que coincidan con los filtros aplicados'
            : 'No hay solicitudes de registro pendientes'
        }
        striped
        hoverable
      />

      {showDetailModal && selectedRequest && (
        <DetailModal
          request={selectedRequest}
          onClose={closeDetail}
          onApprove={() => { handleApprove(selectedRequest.id); closeDetail(); }}
          onReject={() => { handleReject(selectedRequest.id); closeDetail(); }}
        />
      )}
    </PageTemplate>
  );
}