// components/Odontologia/Tratamientos/TratamientosPage.jsx
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
import { FiPlus, FiX, FiRefreshCw, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import '../../../styles/Odontologia/index.css';

export default function TratamientosPage() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const isMounted = useRef(true);

  // Estado principal
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState(''); // '' | 'activo' | 'inactivo'

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTratamiento, setSelectedTratamiento] = useState(null);

  // Formulario
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: '',
    price: '',
    is_active: true,
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    duracionPromedio: 0,
    precioPromedio: 0,
  });

  // ─── Carga de datos (sin dependencias para evitar bucles) ──
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth('/odontologia/tratamientos');
      const data = await response.json();

      if (!isMounted.current) return;

      let tratamientosData = [];
      if (Array.isArray(data)) tratamientosData = data;
      else if (data.tratamientos && Array.isArray(data.tratamientos)) tratamientosData = data.tratamientos;
      else if (data.data && Array.isArray(data.data)) tratamientosData = data.data;
      else if (data.rows && Array.isArray(data.rows)) tratamientosData = data.rows;
      else if (data.success && data.data) tratamientosData = Array.isArray(data.data) ? data.data : [];

      setTratamientos(tratamientosData);

      const total = tratamientosData.length;
      const activos = tratamientosData.filter(t => t.is_active === true).length;
      const inactivos = tratamientosData.filter(t => t.is_active === false).length;
      const duracionPromedio = total > 0
        ? Math.round(tratamientosData.reduce((sum, t) => sum + (Number(t.duration_minutes) || 0), 0) / total)
        : 0;
      const precioPromedio = total > 0
        ? tratamientosData.reduce((sum, t) => sum + (Number(t.price) || 0), 0) / total
        : 0;

      setStats({ total, activos, inactivos, duracionPromedio, precioPromedio });
    } catch (err) {
      const msg = 'Error al cargar los datos: ' + err.message;
      setError(msg);
      if (isMounted.current) {
        await alert.error(msg);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []); // ⬅️ Sin dependencias – estable

  // ─── Cargar al montar ──────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, [loadData]); // ⬅️ loadData es estable, solo se ejecuta una vez

  // ─── Refrescar ──────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── Filtrar tratamientos ──────────────────────────────────
  const filteredTratamientos = useMemo(() => {
    let result = tratamientos;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.name?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }
    if (estadoFilter === 'activo') {
      result = result.filter(t => t.is_active === true);
    } else if (estadoFilter === 'inactivo') {
      result = result.filter(t => t.is_active === false);
    }
    return result;
  }, [tratamientos, searchTerm, estadoFilter]);

  // ─── Guardar (crear/editar) ──────────────────────────────────
  const handleSave = async (formData) => {
    setSaving(true);
    setModalError('');
    try {
      const isEdit = !!selectedTratamiento;
      const url = isEdit
        ? `/api/odontologia/tratamientos/${selectedTratamiento.id}`
        : '/odontologia/tratamientos';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) throw new Error(data.error || 'El tratamiento ya existe');
        throw new Error(data.error || 'Error al guardar el tratamiento');
      }

      await loadData();
      setShowModal(false);
      setSelectedTratamiento(null);
      setModalError('');
      await alert.success(data.message || 'Tratamiento guardado correctamente', 'Guardado exitoso');
      return data.data;
    } catch (err) {
      setModalError(err.message || 'Error al guardar el tratamiento');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar ──────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de eliminar este tratamiento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/odontologia/tratamientos/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar el tratamiento');
      await loadData();
      await alert.success('Tratamiento eliminado correctamente', 'Eliminación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al eliminar el tratamiento');
      return { success: false, error: err.message };
    }
  };

  // ─── Abrir modal de edición ──────────────────────────────────
  const handleEdit = (tratamiento) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedTratamiento(tratamiento);
    setForm({
      name: tratamiento.name || '',
      description: tratamiento.description || '',
      duration_minutes: tratamiento.duration_minutes || '',
      price: tratamiento.price || '',
      is_active: tratamiento.is_active !== undefined ? tratamiento.is_active : true,
    });
    setModalError('');
    setShowModal(true);
  };

  // ─── Abrir modal de detalle ──────────────────────────────────
  const handleView = (tratamiento) => {
    setSelectedTratamiento(tratamiento);
    setShowDetailModal(true);
  };

  // ─── Cerrar modales ──────────────────────────────────────────
  const closeModal = () => {
    setShowModal(false);
    setSelectedTratamiento(null);
    setModalError('');
    setError('');
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTratamiento(null);
  };

  // ─── Columnas de la tabla ──────────────────────────────────────
  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => <strong>{item.name}</strong>,
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => (
        <span className="tratamiento-desc">{item.description || '—'}</span>
      ),
    },
    {
      accessor: 'duration_minutes',
      label: 'Duración (min)',
      align: 'center',
      render: (item) => <span>{item.duration_minutes || '—'}</span>,
    },
    {
      accessor: 'price',
      label: 'Precio',
      align: 'center',
      render: (item) => (
        <span>${Number(item.price).toFixed(2)}</span>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      align: 'center',
      render: (item) => (
        <span className={`estado-badge ${item.is_active ? 'activo' : 'inactivo'}`}>
          {item.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
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

  // ─── Toolbar ──────────────────────────────────────────────────
  const toolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        <div className="products-filter-group">
          <CustomCombobox
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'activo', label: 'Activos' },
              { value: 'inactivo', label: 'Inactivos' },
            ]}
            value={estadoFilter}
            onChange={setEstadoFilter}
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
              setSelectedTratamiento(null);
              setForm({ name: '', description: '', duration_minutes: '', price: '', is_active: true });
              setModalError('');
              setShowModal(true);
            }}
          >
            Nuevo tratamiento
          </IconTextButton>
        </ButtonGroup>
        
      </div>
    </div>
  );

  // ─── Modal de creación/edición ──────────────────────────────
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
            // Validación básica
            if (!form.name.trim()) {
              setModalError('El nombre es requerido');
              return;
            }
            if (!form.duration_minutes || Number(form.duration_minutes) <= 0) {
              setModalError('La duración debe ser mayor a 0');
              return;
            }
            if (!form.price || Number(form.price) < 0) {
              setModalError('El precio debe ser mayor o igual a 0');
              return;
            }
            handleSave(form);
          }}
          disabled={saving}
          loading={saving}
        >
          {selectedTratamiento ? 'Actualizar' : 'Guardar'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  // ─── Modal de detalle ────────────────────────────────────────
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
      {selectedTratamiento && (
        <IconTextButton
          variant="info"
          size="md"
          icon={<FiEdit size={14} />}
          onClick={() => {
            closeDetailModal();
            handleEdit(selectedTratamiento);
          }}
        >
          Editar
        </IconTextButton>
      )}
    </ButtonGroup>
  );

  // ─── Render ──────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Tratamientos"
      subtitle="Catálogo de tratamientos"
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
      <Table
        data={filteredTratamientos}
        columns={columns}
        keyField="id"
        title="Lista de tratamientos"
        subtitle={`${filteredTratamientos.length} ${filteredTratamientos.length === 1 ? 'tratamiento' : 'tratamientos'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder='Ej: Apicectomía'
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 15, 20]}
        loading={loading}
        emptyMessage={
          searchTerm || estadoFilter
            ? 'No hay tratamientos que coincidan con los filtros'
            : 'No hay tratamientos registrados'
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
          title={selectedTratamiento ? 'Editar tratamiento' : 'Nuevo tratamiento'}
          size="sm"
          className="tratamientos-modal"
          footer={modalFooter}
          closeOnOverlayClick={false}
        >
          <div className="tratamientos-modal-body">
            <div className="form-group">
              <label>Nombre *</label>
              <Input
                type="text"
                value={form.name}
                onChange={(val) => setForm(f => ({ ...f, name: val }))}
                placeholder="Ej: Limpieza dental"
                size="md"
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <Input
                type="textarea"
                value={form.description}
                onChange={(val) => setForm(f => ({ ...f, description: val }))}
                placeholder="Descripción del tratamiento"
                size="md"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Duración (minutos) *</label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.duration_minutes}
                  onChange={(val) => setForm(f => ({ ...f, duration_minutes: val }))}
                  placeholder="30"
                  size="md"
                />
              </div>
              <div className="form-group">
                <label>Precio *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(val) => setForm(f => ({ ...f, price: val }))}
                  placeholder="0.00"
                  size="md"
                />
              </div>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))}
                />
                Activo
              </label>
            </div>
          </div>
        </Modal>

        {/* Modal de detalle */}
        <Modal
          isOpen={showDetailModal}
          onClose={closeDetailModal}
          title="Detalles del tratamiento"
          size="sm"
          className="tratamientos-detail-modal"
          footer={detailModalFooter}
          closeOnOverlayClick={false}
        >
          {selectedTratamiento && (
            <div className="tratamientos-detail-body">
              <div className="detail-row">
                <span className="detail-label">Nombre:</span>
                <span className="detail-value">{selectedTratamiento.name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Descripción:</span>
                <span className="detail-value">{selectedTratamiento.description || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Duración:</span>
                <span className="detail-value">{selectedTratamiento.duration_minutes || '—'} minutos</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Precio:</span>
                <span className="detail-value">${Number(selectedTratamiento.price || 0).toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Estado:</span>
                <span className={`detail-value estado-badge ${selectedTratamiento.is_active ? 'activo' : 'inactivo'}`}>
                  {selectedTratamiento.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          )}
        </Modal>
    </PageTemplate>
  );
}