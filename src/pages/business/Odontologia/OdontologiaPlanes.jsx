// pages/business/Odontologia/OdontologiaPlanes.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '../../../context/SessionContext';
import { fetchWithAuth } from '../../../config/api';
import { useConfirm, useAlert } from '../../../context/ConfirmContext';
import PageTemplate from '../../../components/PageTemplate';
import Table from '../../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../../components/General/Button';
import Input from '../../../components/General/Input';
import Modal from '../../../components/General/Modal';
import CustomCombobox from '../../../components/General/CustomCombobox';
import { 
  FiPlus, FiX, FiRefreshCw, FiEdit, FiTrash2, FiEye, FiCopy,
  FiFileText, FiCheckCircle, FiClock, FiXCircle, FiDollarSign,
  FiUser, FiLayers, FiInfo
} from 'react-icons/fi';
import '../../../styles/Odontologia/index.css';

export default function OdontologiaPlanes() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const isMounted = useRef(true);

  // Estado principal
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalError, setModalError] = useState('');

  // Datos maestros para selects
  const [pacientes, setPacientes] = useState([]);

  // Formulario
  const [form, setForm] = useState({
    patient_id: '',
    name: '',
    description: '',
    fase: 'inicial',
    total_cost: 0,
    status: 'draft',
    items: []
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    completados: 0,
    borradores: 0,
    cancelados: 0,
    costo_promedio: 0
  });

  // ─── Carga de datos ──
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');
    try {
      // 1. Cargar planes
      const response = await fetchWithAuth('/odontologia/planes-tratamiento');
      const data = await response.json();

      if (!isMounted.current) return;

      let planesData = [];
      if (data.success && data.data) {
        planesData = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        planesData = data;
      }

      setPlanes(planesData);

      // Calcular estadísticas
      const total = planesData.length;
      const activos = planesData.filter(p => p.status === 'active').length;
      const completados = planesData.filter(p => p.status === 'completed').length;
      const borradores = planesData.filter(p => p.status === 'draft').length;
      const cancelados = planesData.filter(p => p.status === 'cancelled').length;
      const totalCosto = planesData.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
      const costo_promedio = planesData.length > 0 ? totalCosto / planesData.length : 0;

      setStats({ total, activos, completados, borradores, cancelados, costo_promedio });

      // 2. Cargar pacientes para selects
      try {
        const pacientesRes = await fetchWithAuth('/odontologia/pacientes');
        const pacientesData = await pacientesRes.json();
        if (pacientesData.success && pacientesData.data) {
          setPacientes(pacientesData.data);
        }
      } catch (pacientesErr) {
        console.warn('⚠️ Error cargando pacientes:', pacientesErr);
        setPacientes([]);
      }

    } catch (err) {
      const msg = 'Error al cargar los datos: ' + err.message;
      setError(msg);
      if (isMounted.current) {
        await alert.error(msg);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ─── Cargar al montar ──
  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  // ─── Refrescar ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── Filtrar planes ──
  const filteredPlanes = useMemo(() => {
    let result = planes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.paciente_nombre?.toLowerCase().includes(term)
      );
    }
    if (statusFilter) {
      result = result.filter(p => p.status === statusFilter);
    }
    return result;
  }, [planes, searchTerm, statusFilter]);

  // ─── Guardar (crear/editar) ──
  const handleSave = async (formData) => {
    setSaving(true);
    setModalError('');
    try {
      const isEdit = !!selectedPlan;
      const url = isEdit
        ? `/odontologia/planes-tratamiento/${selectedPlan.id}`
        : '/odontologia/planes-tratamiento';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el plan');
      }

      await loadData();
      setShowModal(false);
      setSelectedPlan(null);
      setModalError('');
      await alert.success(data.message || 'Plan guardado correctamente', 'Guardado exitoso');
      return data.data;
    } catch (err) {
      setModalError(err.message || 'Error al guardar el plan');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar ──
  const handleDelete = async (id) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de eliminar este plan de tratamiento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/odontologia/planes-tratamiento/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar el plan');
      await loadData();
      await alert.success('Plan eliminado correctamente', 'Eliminación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al eliminar el plan');
      return { success: false, error: err.message };
    }
  };

  // ─── Duplicar ──
  const handleDuplicate = async (plan) => {
    try {
      const { id, ...copyData } = plan;
      const newPlan = {
        ...copyData,
        name: `${plan.name} (Copia)`
      };

      const response = await fetchWithAuth('/odontologia/planes-tratamiento', {
        method: 'POST',
        body: JSON.stringify(newPlan),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al duplicar el plan');
      }

      await loadData();
      await alert.success('Plan duplicado correctamente', 'Duplicación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al duplicar el plan');
      return { success: false, error: err.message };
    }
  };

  // ─── Abrir modal de edición ──
  const handleEdit = (plan) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPlan(plan);
    setForm({
      patient_id: plan.patient_id || '',
      name: plan.name || '',
      description: plan.description || '',
      fase: plan.fase || 'inicial',
      total_cost: plan.total_cost || 0,
      status: plan.status || 'draft',
      items: plan.items || []
    });
    setModalError('');
    setShowModal(true);
  };

  // ─── Abrir modal de detalle ──
  const handleView = (plan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  // ─── Cerrar modales ──
  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setModalError('');
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPlan(null);
  };

  // ─── Columnas de la tabla ──
  const columns = [
    {
      accessor: 'name',
      label: 'Nombre del Plan',
      render: (item) => (
        <div>
          <strong>{item.name}</strong>
          {item.description && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {item.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: 'paciente_nombre',
      label: 'Paciente',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiUser size={14} style={{ color: '#6b7280' }} />
          <span>{item.paciente_nombre || '—'}</span>
        </div>
      ),
    },
    {
      accessor: 'fase',
      label: 'Fase',
      align: 'center',
      render: (item) => {
        const faseMap = {
          inicial: { label: 'Inicial', class: 'info' },
          evolucion: { label: 'Evolución', class: 'warning' },
          alta: { label: 'Alta', class: 'success' },
        };
        const fase = faseMap[item.fase] || { label: item.fase || '—', class: 'secondary' };
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            background: fase.class === 'info' ? '#dbeafe' : fase.class === 'warning' ? '#fef3c7' : fase.class === 'success' ? '#d1fae5' : '#f3f4f6',
            color: fase.class === 'info' ? '#1e40af' : fase.class === 'warning' ? '#92400e' : fase.class === 'success' ? '#065f46' : '#6b7280'
          }}>
            <FiLayers size={12} />
            {fase.label}
          </span>
        );
      },
    },
    {
      accessor: 'total_cost',
      label: 'Costo Total',
      align: 'center',
      render: (item) => (
        <span style={{ fontWeight: 600, color: '#059669' }}>
          ${Number(item.total_cost || 0).toFixed(2)}
        </span>
      ),
    },
    {
      accessor: 'status',
      label: 'Estado',
      align: 'center',
      render: (item) => {
        const statusMap = {
          draft: { label: 'Borrador', class: 'secondary' },
          active: { label: 'Activo', class: 'success' },
          completed: { label: 'Completado', class: 'info' },
          cancelled: { label: 'Cancelado', class: 'danger' },
        };
        const status = statusMap[item.status] || { label: item.status || '—', class: 'secondary' };
        return (
          <span className={`estado-badge ${status.class}`}>
            {status.label}
          </span>
        );
      },
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            icon={<FiEye size={14} />}
            onClick={() => handleView(item)}
            title="Ver detalles"
          >
            Ver
          </IconTextButton>
          <IconTextButton
            variant="warning"
            size="sm"
            icon={<FiEdit size={14} />}
            onClick={() => handleEdit(item)}
            title="Editar"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item.id)}
            title="Eliminar"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ─── Toolbar ──
  const toolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        <div className="products-filter-group">
          <CustomCombobox
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'draft', label: 'Borrador' },
              { value: 'active', label: 'Activo' },
              { value: 'completed', label: 'Completado' },
              { value: 'cancelled', label: 'Cancelado' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filtrar por estado"
            filterable={false}
            size="md"
            forceDropup={false}
          />
        </div>
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={14} />}
            onClick={() => {
              setSelectedPlan(null);
              setForm({
                patient_id: '',
                name: '',
                description: '',
                fase: 'inicial',
                total_cost: 0,
                status: 'draft',
                items: []
              });
              setModalError('');
              setShowModal(true);
            }}
          >
            Nuevo Plan
          </IconTextButton>
        </ButtonGroup>
      </div>
    </div>
  );

  // ─── Stats ──
  const statsData = [
    {
      label: 'Total Planes',
      value: stats.total,
      icon: <FiFileText size={22} />,
      color: '#3b82f6'
    },
    {
      label: 'Activos',
      value: stats.activos,
      icon: <FiCheckCircle size={22} />,
      color: '#22c55e'
    },
    {
      label: 'Completados',
      value: stats.completados,
      icon: <FiClock size={22} />,
      color: '#8b5cf6'
    },
    {
      label: 'Borradores',
      value: stats.borradores,
      icon: <FiFileText size={22} />,
      color: '#f59e0b'
    },
    {
      label: 'Cancelados',
      value: stats.cancelados,
      icon: <FiXCircle size={22} />,
      color: '#ef4444'
    },
    {
      label: 'Costo Promedio',
      value: `$${stats.costo_promedio.toFixed(2)}`,
      icon: <FiDollarSign size={22} />,
      color: '#059669'
    },
  ];

  const statsToolbar = (
    <div className="odonto-stats-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {statsData.map((s, idx) => (
        <div key={idx} className="odonto-stat-card" style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: `${s.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: s.color
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 500
            }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Modal de creación/edición ──
  const modalFooter = (
    <>
      {modalError && <div className="modal-error-text">⚠️ {modalError}</div>}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={closeModal}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={14} />}
          onClick={() => {
            if (!form.name.trim()) {
              setModalError('El nombre del plan es requerido');
              return;
            }
            if (!form.patient_id) {
              setModalError('Debe seleccionar un paciente');
              return;
            }

            const dataToSend = {
              patient_id: form.patient_id,
              name: form.name,
              description: form.description || null,
              fase: form.fase || 'inicial',
              total_cost: form.total_cost || 0,
              status: form.status || 'draft',
              items: form.items || []
            };
            handleSave(dataToSend);
          }}
          disabled={saving}
          loading={saving}
        >
          {selectedPlan ? 'Actualizar' : 'Guardar'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  // ─── Modal de detalle ──
  const detailModalFooter = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={closeDetailModal}
      >
        Cerrar
      </IconTextButton>
      {selectedPlan && (
        <>
          <IconTextButton
            variant="secondary"
            size="md"
            icon={<FiCopy size={14} />}
            onClick={() => {
              const plan = selectedPlan;
              closeDetailModal();
              handleDuplicate(plan);
            }}
          >
            Duplicar
          </IconTextButton>
          <IconTextButton
            variant="info"
            size="md"
            icon={<FiEdit size={14} />}
            onClick={() => {
              closeDetailModal();
              handleEdit(selectedPlan);
            }}
          >
            Editar
          </IconTextButton>
        </>
      )}
    </ButtonGroup>
  );

  // ─── Render ──
  return (
    <PageTemplate
      title="Planes de Tratamiento"
      subtitle="Gestión de planes de tratamiento odontológicos"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={
        <button
          onClick={handleRefresh}
          className="dashboard-refresh-btn-header"
          disabled={refreshing}
          title="Actualizar datos"
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      {statsToolbar}

      <Table
        data={filteredPlanes}
        columns={columns}
        keyField="id"
        title="Lista de planes"
        subtitle={`${filteredPlanes.length} ${filteredPlanes.length === 1 ? 'plan' : 'planes'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por nombre, descripción o paciente..."
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 15, 20]}
        loading={loading}
        emptyMessage={
          searchTerm || statusFilter
            ? 'No hay planes que coincidan con los filtros'
            : 'No hay planes registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {/* Modal de creación/edición */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={selectedPlan ? 'Editar plan de tratamiento' : 'Nuevo plan de tratamiento'}
        size="md"
        className="planes-modal"
        footer={modalFooter}
        closeOnOverlayClick={false}
      >
        <div className="planes-modal-body">
          <div className="form-group">
            <label>Paciente *</label>
            <select
              value={form.patient_id}
              onChange={(e) => setForm(f => ({ ...f, patient_id: e.target.value }))}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px'
              }}
            >
              <option value="">Seleccionar paciente</option>
              {pacientes.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} {p.document_number ? `- ${p.document_number}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Nombre del Plan *</label>
            <Input
              type="text"
              value={form.name}
              onChange={(val) => setForm(f => ({ ...f, name: val }))}
              placeholder="Ej: Plan de Ortodoncia"
              size="md"
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.description}
              onChange={(val) => setForm(f => ({ ...f, description: val }))}
              placeholder="Descripción detallada del plan..."
              size="md"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fase</label>
              <select
                value={form.fase}
                onChange={(e) => setForm(f => ({ ...f, fase: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              >
                <option value="inicial">Inicial</option>
                <option value="evolucion">Evolución</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px'
                }}
              >
                <option value="draft">Borrador</option>
                <option value="active">Activo</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Costo Total</label>
            <Input
              type="number"
              value={form.total_cost}
              onChange={(val) => setForm(f => ({ ...f, total_cost: parseFloat(val) || 0 }))}
              placeholder="0.00"
              size="md"
              step="0.01"
              min="0"
            />
          </div>
        </div>
      </Modal>

      {/* Modal de detalle */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title="Detalles del plan"
        size="md"
        className="planes-detail-modal"
        footer={detailModalFooter}
        closeOnOverlayClick={false}
      >
        {selectedPlan && (
          <div className="planes-detail-body">
            <div className="detail-row">
              <span className="detail-label">Nombre:</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{selectedPlan.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Paciente:</span>
              <span className="detail-value">{selectedPlan.paciente_nombre || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Descripción:</span>
              <span className="detail-value">{selectedPlan.description || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Fase:</span>
              <span className="detail-value">
                {{
                  inicial: 'Inicial',
                  evolucion: 'Evolución',
                  alta: 'Alta'
                }[selectedPlan.fase] || selectedPlan.fase || '—'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Costo Total:</span>
              <span className="detail-value" style={{ fontWeight: 600, color: '#059669' }}>
                ${Number(selectedPlan.total_cost || 0).toFixed(2)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Estado:</span>
              <span className={`detail-value estado-badge ${selectedPlan.status || 'draft'}`}>
                {{
                  draft: 'Borrador',
                  active: 'Activo',
                  completed: 'Completado',
                  cancelled: 'Cancelado'
                }[selectedPlan.status] || selectedPlan.status || '—'}
              </span>
            </div>

            <div style={{ marginTop: '16px' }}>
              <div className="detail-label" style={{ marginBottom: '8px' }}>Items del Plan:</div>
              {selectedPlan.items?.length > 0 ? (
                selectedPlan.items.map((item, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: 600 }}>
                      {item.servicio || 'Servicio'}
                      {item.tooth && ` - Diente ${item.tooth}`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {item.hallazgo && <span><strong>Hallazgo:</strong> {item.hallazgo}</span>}
                      {item.price && <span><strong>Precio:</strong> ${Number(item.price).toFixed(2)}</span>}
                      {item.nota && <span><strong>Nota:</strong> {item.nota}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ color: '#94a3b8' }}>No hay items registrados</span>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PageTemplate>
  );
}