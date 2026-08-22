import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import {
  FiBox, FiShoppingCart, FiShoppingBag, FiClipboard, FiClock,
  FiCheck, FiX, FiRefreshCw, FiEye, FiPackage, FiStar,
  FiSettings, FiBarChart2,
  FiCreditCard, FiDollarSign, FiTruck, FiGrid, FiCalendar,
  FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiThermometer, FiUser, FiMail, FiPhone,
  FiFile, FiAlertCircle,
} from 'react-icons/fi';
import { adminApi } from '../../config/api';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import Checklist from '../../components/General/Checklist';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';

const MOD_ICON_MAP = {
  core:          <FiSettings size={16} />,
  pos:           <FiShoppingCart size={16} />,
  inventory:     <FiBox size={16} />,
  reports:       <FiBarChart2 size={16} />,
  payments:      <FiCreditCard size={16} />,
  accounting:    <FiDollarSign size={16} />,
  orders:        <FiClipboard size={16} />,
  kitchen:       <FiThermometer size={16} />,
  delivery:      <FiTruck size={16} />,
  tables:        <FiGrid size={16} />,
  reservations:  <FiCalendar size={16} />,
  loyalty:       <FiStar size={16} />,
  suppliers:     <FiTruck size={16} />,
  purchases:     <FiShoppingBag size={16} />,
  appointments:  <FiCalendar size={16} />,
  employees:     <FiUsers size={16} />,
  crm:           <FiUserCheck size={16} />,
  routes:        <FiMap size={16} />,
  tracking:      <FiMapPin size={16} />,
  queue:         <FiList size={16} />,
  ecommerce:     <FiGlobe size={16} />,
  notifications: <FiBell size={16} />,
  einvoicing:    <FiFileText size={16} />,
};

const ModIcon = ({ code }) => (
  <span className="solicitud-mod-icon">
    {MOD_ICON_MAP[code] || <FiBox size={16} />}
  </span>
);

function DetailModal({ request, onClose, onApprove, onReject, modules, onSave }) {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [selectedMods, setSelectedMods] = useState([]);
  const [selectedFeats, setSelectedFeats] = useState([]);
  const [loadingMods, setLoadingMods] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMods(true);
        let preModIds = [];
        let preFeatIds = [];

        if (request.status === 'approved' && request.business_id) {
          try {
            const bizMods = await adminApi.get(`/admin/businesses/${request.business_id}/modules`);
            preModIds = bizMods.data?.moduleIds || [];
            preFeatIds = bizMods.data?.featureIds || [];
          } catch (e) { }
        } else {
          const savedModCodes = request.modulos || [];
          const savedFeatCodes = request.features || [];
          preModIds = modules.filter(m => savedModCodes.includes(m.code)).map(m => m.id);
          preFeatIds = modules.flatMap(m => m.features || [])
            .filter(f => savedFeatCodes.includes(f.code)).map(f => f.id);
        }

        setSelectedMods(preModIds);
        setSelectedFeats(preFeatIds);
        setHasChanges(false);
      } catch (e) { } finally {
        setLoadingMods(false);
      }
    };
    load();
  }, [request.id, request.status, request.business_id, request.modulos, request.features, modules]);

  const checklistItems = useMemo(() => {
    return modules.map(m => ({
      id: String(m.id),
      label: m.name,
      icon: <ModIcon code={m.code || m.id} />,
      badge: m.price_monthly ? `$${m.price_monthly}/mes` : '',
      isPremium: parseFloat(m.price_monthly || 0) > 0,
      children: m.features?.map(f => ({
        id: String(f.id),
        label: f.name,
        isPremium: f.is_premium || false,
      })) || [],
    }));
  }, [modules]);

  const checklistValue = useMemo(() => {
    return selectedMods.map(modId => ({
      modulo: modId,
      features: selectedFeats.filter(featId => {
        const mod = modules.find(m => m.id === modId);
        return mod?.features?.some(f => f.id === featId);
      }),
    }));
  }, [selectedMods, selectedFeats, modules]);

  const handlePermissionsChange = (newValue) => {
    const modIds = newValue.map(item => item.modulo);
    const featIds = newValue.flatMap(item => item.features || []);
    setSelectedMods(modIds);
    setSelectedFeats(featIds);
    setError('');
    setHasChanges(true);
  };

  const totalMensual = modules
    .filter(m => selectedMods.includes(m.id))
    .reduce((sum, m) => sum + parseFloat(m.price_monthly || 0), 0);

  const handleSave = async () => {
    if (saving || !hasChanges) return;
    setSaving(true);
    setError('');
    try {
      if (request.status === 'approved' && request.business_id) {
        await adminApi.put(`/admin/businesses/${request.business_id}/modules`, {
          moduleIds: selectedMods,
          featureIds: selectedFeats,
        });
      } else {
        await adminApi.post(`/admin/requests/${request.id}/save-modules`, {
          moduleIds: selectedMods,
          featureIds: selectedFeats,
        });
      }
      
      alert.success(
        request.status === 'approved' 
          ? 'Módulos actualizados correctamente en el negocio' 
          : 'Selección guardada correctamente',
        'Actualización Exitosa'
      );
      
      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleApproveWithModules = async () => {
    setSaving(true);
    setError('');
    try {
      await adminApi.post(`/admin/requests/${request.id}/save-modules`, {
        moduleIds: selectedMods,
        featureIds: selectedFeats,
      });
      
      alert.success(
        `La solicitud "${request.empresa}" ha sido aprobada correctamente. El negocio ya puede comenzar a operar.`,
        'Solicitud Aprobada'
      );
      
      onApprove();
    } catch (err) {
      setError(err.message || 'Error al guardar módulos');
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || !hasChanges || loadingMods;

  const handleRejectWithConfirm = async () => {
    if (!await showConfirm({
      title: 'Rechazar solicitud',
      message: `¿Estás seguro de que deseas rechazar la solicitud "${request.empresa}"? Esta acción no se puede deshacer.`,
      confirmText: 'Rechazar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    
    onReject();
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Detalles de Solicitud"
      size="md"
      className="solicitud-modal-detail"
      footer={
        <>
          {error && (
            <div className="modal-error-text" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
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
                  onClick={handleRejectWithConfirm}
                  disabled={saving}
                >
                  Rechazar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiCheck size={14} />}
                  onClick={handleApproveWithModules}
                  disabled={saving}
                  loading={saving}
                >
                  {saving ? 'Guardando...' : 'Aprobar'}
                </IconTextButton>
              </>
            )}
            <IconTextButton
              variant={request.status === 'approved' ? 'success' : 'secondary'}
              size="md"
              icon={<FiCheck size={14} />}
              onClick={handleSave}
              disabled={isSaveDisabled}
              loading={saving}
            >
              {saving 
                ? 'Guardando...' 
                : request.status === 'approved' 
                  ? 'Actualizar módulos' 
                  : 'Guardar selección'
              }
            </IconTextButton>
          </ButtonGroup>
        </>
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
        </div>

        <hr className="solicitud-detail-divider" />

        <div className="solicitud-modules-header">
          <h3><FiPackage size={15} /> Módulos y Funcionalidades</h3>
          <div className="solicitud-modules-stats">
            <span>
              <strong>{selectedMods.length}</strong> módulos ·{' '}
              <strong>{selectedFeats.length}</strong> funcionalidades
            </span>
            {totalMensual > 0 && (
              <span className="solicitud-modules-total">${totalMensual.toFixed(2)}/mes</span>
            )}
          </div>
        </div>

        {loadingMods ? (
          <div className="solicitud-loading">Cargando módulos...</div>
        ) : (
          <Checklist
            items={checklistItems}
            value={checklistValue}
            onChange={handlePermissionsChange}
            mode="hierarchical"
            variant="default"
            maxHeight={350}
            showIcons
            selectAll
            emptyMessage="No hay módulos disponibles"
          />
        )}

        {request.status === 'approved' && (
          <div className="solicitud-info-message">
            ℹ️ Esta solicitud ya está aprobada. Los cambios se guardarán directamente en el negocio.
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function AdminSolicitudes() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [allRequests, setAllRequests] = useState([]);
  const [requests, setRequests] = useState([]);
  const [modules, setModules] = useState([]);
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

  useEffect(() => {
    adminApi.get('/admin/modules-with-features')
      .then(res => setModules(res.data || []))
      .catch(() => setModules([]));
  }, []);

  const mapRequests = (raw) => (raw || []).map(item => ({
    id: item.id,
    propietario: item.contact_name ||
      `${item.owner_first_name || ''} ${item.owner_last_name || ''}`.trim(),
    tipo: item.business_type_name || item.tipo_nombre || '',
    tipo_codigo: item.business_type_code || item.tipo || '',
    empresa: item.business_name,
    email: item.owner_email || item.contact_email,
    telefono: item.owner_phone || item.contact_phone || '—',
    cedula: item.owner_document_number || item.identification_number || '—',
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
    modulos: Array.isArray(item.requested_modules)
      ? item.requested_modules
      : item.requested_modules
        ? item.requested_modules.split(',').map(m => m.trim())
        : [],
    features: Array.isArray(item.requested_features)
      ? item.requested_features
      : item.requested_features
        ? item.requested_features.split(',').map(f => f.trim())
        : [],
  }));

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.get('/admin/requests');
      const allData = mapRequests(data.data);
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
      setError(err.message || 'Error al aprobar la solicitud');
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleReject = async (requestId) => {
    try {
      await adminApi.post(`/admin/${requestId}/reject`, {});
      await loadRequests();
      alert.info('Solicitud rechazada correctamente');
    } catch (err) {
      setError(err.message || 'Error al rechazar la solicitud');
      setTimeout(() => setError(''), 5000);
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
            inline={true}
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
                inline={true}
                icon={<FiCheck size={13} />}
                onClick={() => handleApprove(item.id)}
                tooltip="Aprobar solicitud"
              >
                Aprobar
              </IconTextButton>
              <IconTextButton
                variant="danger"
                size="sm"
                inline={true}
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
        searchable={true}
        searchPlaceholder="Buscar por propietario, empresa, email..."
        searchFields={['propietario', 'empresa', 'email', 'tipo', 'cedula']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterStatus !== 'todos'
            ? 'No hay solicitudes que coincidan con los filtros aplicados'
            : 'No hay solicitudes de registro pendientes'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {showDetailModal && selectedRequest && (
        <DetailModal
          request={selectedRequest}
          modules={modules}
          onClose={closeDetail}
          onApprove={() => { handleApprove(selectedRequest.id); closeDetail(); }}
          onReject={() => { handleReject(selectedRequest.id); closeDetail(); }}
          onSave={loadRequests}
        />
      )}
    </PageTemplate>
  );
}