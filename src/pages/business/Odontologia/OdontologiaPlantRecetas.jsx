// components/Odontologia/Plantillas/PlantillasPage.jsx
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
import { FiPlus, FiX, FiRefreshCw, FiEdit, FiTrash2, FiEye, FiCopy } from 'react-icons/fi';
import '../../../styles/Odontologia/index.css';

export default function PlantillasPage() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const isMounted = useRef(true);

  // Estado principal
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);

  // Datos maestros
  const [tipos, setTipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);

  // Formulario
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    medicamentos: [{ 
      medicamento_id: '',
      categoria_id: '',
      tipo_id: '',
      dosis_especifica: '', 
      frecuencia_especifica: '', 
      notas: '' 
    }],
    instrucciones: '',
    duracion: '',
    advertencias: ''
  });

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0
  });

  // ─── Carga de datos ──
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');
    try {
      // 1. Cargar plantillas
      const response = await fetchWithAuth('/odontologia/plantillas-recetas');
      const data = await response.json();

      if (!isMounted.current) return;

      let plantillasData = [];
      if (data.success && data.data) {
        plantillasData = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        plantillasData = data;
      }

      setPlantillas(plantillasData);

      const total = plantillasData.length;
      const activos = plantillasData.filter(p => p.is_active !== false).length;
      const inactivos = plantillasData.filter(p => p.is_active === false).length;

      setStats({ total, activos, inactivos });

      // 2. Cargar TIPOS
      try {
        const tiposRes = await fetchWithAuth('/odontologia/plantillas-recetas/tipos');
        const tiposData = await tiposRes.json();
        if (tiposData.success && tiposData.data) {
          setTipos(tiposData.data);
        }
      } catch (tiposErr) {
        console.warn('⚠️ Error cargando tipos:', tiposErr);
        setTipos([]);
      }

      // 3. Cargar CATEGORÍAS
      try {
        const categoriasRes = await fetchWithAuth('/odontologia/plantillas-recetas/categorias');
        const categoriasData = await categoriasRes.json();
        if (categoriasData.success && categoriasData.data) {
          setCategorias(categoriasData.data);
        }
      } catch (categoriasErr) {
        console.warn('⚠️ Error cargando categorías:', categoriasErr);
        setCategorias([]);
      }

      // 4. Cargar MEDICAMENTOS
      try {
        const medRes = await fetchWithAuth('/odontologia/plantillas-recetas/medicamentos');
        const medData = await medRes.json();
        if (medData.success && medData.data) {
          setMedicamentos(medData.data);
        }
      } catch (medErr) {
        console.warn('⚠️ Error cargando medicamentos:', medErr);
        setMedicamentos([]);
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

  // ─── Filtrar plantillas ──
  const filteredPlantillas = useMemo(() => {
    let result = plantillas;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        p.nombre?.toLowerCase().includes(term) ||
        p.descripcion?.toLowerCase().includes(term) ||
        p.medicamentos?.some(m => 
          (m.medicamento_nombre || m.name || '').toLowerCase().includes(term)
        )
      );
    }
    if (tipoFilter) {
      result = result.filter(p =>
        p.medicamentos?.some(m => m.tipo_nombre?.toLowerCase() === tipoFilter.toLowerCase())
      );
    }
    return result;
  }, [plantillas, searchTerm, tipoFilter]);

  // ─── Guardar (crear/editar) ──
  const handleSave = async (formData) => {
    setSaving(true);
    setModalError('');
    try {
      const isEdit = !!selectedPlantilla;
      const url = isEdit
        ? `/odontologia/plantillas-recetas/${selectedPlantilla.id}`
        : '/odontologia/plantillas-recetas';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar la plantilla');
      }

      await loadData();
      setShowModal(false);
      setSelectedPlantilla(null);
      setModalError('');
      await alert.success(data.message || 'Plantilla guardada correctamente', 'Guardado exitoso');
      return data.data;
    } catch (err) {
      setModalError(err.message || 'Error al guardar la plantilla');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar ──
  const handleDelete = async (id) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de eliminar esta plantilla? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/odontologia/plantillas-recetas/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar la plantilla');
      await loadData();
      await alert.success('Plantilla eliminada correctamente', 'Eliminación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al eliminar la plantilla');
      return { success: false, error: err.message };
    }
  };

  // ─── Duplicar ──
  const handleDuplicate = async (plantilla) => {
    try {
      const { id, ...copyData } = plantilla;
      const newPlantilla = {
        ...copyData,
        nombre: `${plantilla.nombre} (Copia)`
      };

      const response = await fetchWithAuth('/odontologia/plantillas-recetas', {
        method: 'POST',
        body: JSON.stringify(newPlantilla),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al duplicar la plantilla');
      }

      await loadData();
      await alert.success('Plantilla duplicada correctamente', 'Duplicación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al duplicar la plantilla');
      return { success: false, error: err.message };
    }
  };

  // ─── Abrir modal de edición ──
  const handleEdit = (plantilla) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPlantilla(plantilla);
    
    const medicamentosForm = plantilla.medicamentos?.length > 0 
      ? plantilla.medicamentos.map(m => ({
          medicamento_id: m.medicamento_id || '',
          categoria_id: m.categoria_id || '',
          tipo_id: m.tipo_id || '',
          dosis_especifica: m.dosis_especifica || '',
          frecuencia_especifica: m.frecuencia_especifica || '',
          notas: m.notas || ''
        }))
      : [{ 
          medicamento_id: '',
          categoria_id: '',
          tipo_id: '',
          dosis_especifica: '', 
          frecuencia_especifica: '', 
          notas: '' 
        }];
    
    setForm({
      nombre: plantilla.nombre || '',
      descripcion: plantilla.descripcion || '',
      medicamentos: medicamentosForm,
      instrucciones: plantilla.instrucciones || '',
      duracion: plantilla.duracion || '',
      advertencias: plantilla.advertencias || ''
    });
    setModalError('');
    setShowModal(true);
  };

  // ─── Abrir modal de detalle ──
  const handleView = (plantilla) => {
    setSelectedPlantilla(plantilla);
    setShowDetailModal(true);
  };

  // ─── Cerrar modales ──
  const closeModal = () => {
    setShowModal(false);
    setSelectedPlantilla(null);
    setModalError('');
    setError('');
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPlantilla(null);
  };

  // ─── Columnas de la tabla ──
  const columns = [
    {
      accessor: 'nombre',
      label: 'Nombre',
      render: (item) => (
        <div>
          <strong>{item.nombre}</strong>
          {item.descripcion && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {item.descripcion}
            </div>
          )}
        </div>
      ),
    },
    {
      accessor: 'medicamentos',
      label: 'Medicamentos',
      render: (item) => {
        const medList = item.medicamentos?.map(m => m.medicamento_nombre || m.name || '').filter(Boolean);
        return (
          <span>
            {medList?.length > 0 ? medList.join(', ') : '—'}
          </span>
        );
      },
    },
    {
      accessor: 'duracion',
      label: 'Duración',
      align: 'center',
      render: (item) => <span>{item.duracion || '—'}</span>,
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      align: 'center',
      render: (item) => (
        <span className={`estado-badge ${item.is_active !== false ? 'activo' : 'inactivo'}`}>
          {item.is_active !== false ? 'Activo' : 'Inactivo'}
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
            variant=""
            size="sm"
            icon={<FiCopy size={14} />}
            onClick={() => handleDuplicate(item)}
            title="Duplicar"
          >
            Duplicar
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
              { value: '', label: 'Todos los tipos' },
              { value: 'antibiotico', label: 'Antibióticos' },
              { value: 'analgesico', label: 'Analgésicos' },
              { value: 'corticoide', label: 'Corticoides' },
              { value: 'antifungico', label: 'Antifúngicos' },
              { value: 'antiviral', label: 'Antivirales' },
            ]}
            value={tipoFilter}
            onChange={setTipoFilter}
            placeholder="Filtrar por tipo"
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
              setSelectedPlantilla(null);
              setForm({ 
                nombre: '', 
                descripcion: '', 
                medicamentos: [{ 
                  medicamento_id: '',
                  categoria_id: '',
                  tipo_id: '',
                  dosis_especifica: '', 
                  frecuencia_especifica: '', 
                  notas: '' 
                }],
                instrucciones: '',
                duracion: '',
                advertencias: ''
              });
              setModalError('');
              setShowModal(true);
            }}
          >
            Nueva plantilla
          </IconTextButton>
        </ButtonGroup>
        
      </div>
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
            // Validación básica
            if (!form.nombre.trim()) {
              setModalError('El nombre es requerido');
              return;
            }
            if (form.medicamentos.some(m => !m.medicamento_id)) {
              setModalError('Todos los medicamentos deben estar seleccionados');
              return;
            }
            
            const dataToSend = {
              nombre: form.nombre,
              descripcion: form.descripcion || null,
              duracion: form.duracion || null,
              instrucciones: form.instrucciones || null,
              advertencias: form.advertencias || null,
              medicamentos: form.medicamentos.map(m => ({
                medicamento_id: m.medicamento_id,
                dosis_especifica: m.dosis_especifica || null,
                frecuencia_especifica: m.frecuencia_especifica || null,
                notas: m.notas || null
              }))
            };
            handleSave(dataToSend);
          }}
          disabled={saving}
          loading={saving}
        >
          {selectedPlantilla ? 'Actualizar' : 'Guardar'}
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
      {selectedPlantilla && (
        <>
          <IconTextButton
            variant="secondary"
            size="md"
            icon={<FiCopy size={14} />}
            onClick={() => {
              const plantilla = selectedPlantilla;
              closeDetailModal();
              handleDuplicate(plantilla);
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
              handleEdit(selectedPlantilla);
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
      title="Plantillas de Recetas"
      subtitle="Catálogo de plantillas para recetas odontológicas"
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
        data={filteredPlantillas}
        columns={columns}
        keyField="id"
        title="Lista de plantillas"
        subtitle={`${filteredPlantillas.length} ${filteredPlantillas.length === 1 ? 'plantilla' : 'plantillas'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder='Buscar por nombre, descripción o medicamento...'
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 15, 20]}
        loading={loading}
        emptyMessage={
          searchTerm || tipoFilter
            ? 'No hay plantillas que coincidan con los filtros'
            : 'No hay plantillas registradas'
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
        title={selectedPlantilla ? 'Editar plantilla' : 'Nueva plantilla'}
        size="md"
        className="plantillas-modal"
        footer={modalFooter}
        closeOnOverlayClick={false}
      >
        <div className="plantillas-modal-body">
          <div className="form-group">
            <label>Nombre *</label>
            <Input
              type="text"
              value={form.nombre}
              onChange={(val) => setForm(f => ({ ...f, nombre: val }))}
              placeholder="Ej: Extracción Dental"
              size="md"
            />
          </div>

          <div className="form-group">
            <label>Descripción</label>
            <Input
              type="textarea"
              value={form.descripcion}
              onChange={(val) => setForm(f => ({ ...f, descripcion: val }))}
              placeholder="Descripción del tratamiento"
              size="md"
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Duración</label>
              <Input
                type="text"
                value={form.duracion}
                onChange={(val) => setForm(f => ({ ...f, duracion: val }))}
                placeholder="Ej: 7 días"
                size="md"
              />
            </div>
          </div>

          {/* Medicamentos */}
          <div className="form-group">
            <label>Medicamentos *</label>
            <small style={{ display: 'block', color: '#6b7280', fontSize: '12px', marginBottom: '8px' }}>
              Cada medicamento puede tener su propia categoría y tipo
            </small>

            {form.medicamentos.map((med, idx) => {
              const medicamentosFiltrados = medicamentos.filter(m => {
                const matchCategoria = !med.categoria_id || m.categoria_id === med.categoria_id;
                const matchTipo = !med.tipo_id || m.tipo_id === med.tipo_id;
                return matchCategoria && matchTipo;
              });

              return (
                <div key={idx} style={{
                  background: '#f8fafc',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Categoría</label>
                      <select
                        value={med.categoria_id}
                        onChange={(e) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].categoria_id = e.target.value;
                          newMed[idx].tipo_id = '';
                          newMed[idx].medicamento_id = '';
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="">Seleccionar</option>
                        {categorias.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Tipo</label>
                      <select
                        value={med.tipo_id}
                        onChange={(e) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].tipo_id = e.target.value;
                          newMed[idx].medicamento_id = '';
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        disabled={!med.categoria_id}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="">Seleccionar</option>
                        {tipos.map(t => (
                          <option key={t.id} value={t.id}>{t.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Medicamento</label>
                      <select
                        value={med.medicamento_id}
                        onChange={(e) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].medicamento_id = e.target.value;
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        disabled={!med.categoria_id || !med.tipo_id}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                      >
                        <option value="">Seleccionar</option>
                        {medicamentosFiltrados.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} {m.presentacion ? `(${m.presentacion})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Dosis</label>
                      <Input
                        type="text"
                        value={med.dosis_especifica}
                        onChange={(val) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].dosis_especifica = val;
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        placeholder="1"
                        size="sm"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Frecuencia</label>
                      <Input
                        type="text"
                        value={med.frecuencia_especifica}
                        onChange={(val) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].frecuencia_especifica = val;
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        placeholder="c/8h"
                        size="sm"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Notas</label>
                      <Input
                        type="text"
                        value={med.notas}
                        onChange={(val) => {
                          const newMed = [...form.medicamentos];
                          newMed[idx].notas = val;
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        placeholder="Notas adicionales"
                        size="sm"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (form.medicamentos.length === 1) {
                            setModalError('Debe tener al menos un medicamento');
                            return;
                          }
                          const newMed = form.medicamentos.filter((_, i) => i !== idx);
                          setForm({ ...form, medicamentos: newMed });
                        }}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#94a3b8'
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setForm({
                  ...form,
                  medicamentos: [...form.medicamentos, { 
                    medicamento_id: '',
                    categoria_id: '',
                    tipo_id: '',
                    dosis_especifica: '', 
                    frecuencia_especifica: '', 
                    notas: '' 
                  }]
                });
              }}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px dashed #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#6b7280',
                fontSize: '13px',
                width: '100%'
              }}
            >
              <FiPlus size={14} style={{ marginRight: '4px' }} /> Agregar otro medicamento
            </button>
          </div>

          <div className="form-group">
            <label>Instrucciones Generales</label>
            <Input
              type="textarea"
              value={form.instrucciones}
              onChange={(val) => setForm(f => ({ ...f, instrucciones: val }))}
              placeholder="Instrucciones para el paciente..."
              size="md"
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Advertencia / Contraindicación</label>
            <Input
              type="textarea"
              value={form.advertencias}
              onChange={(val) => setForm(f => ({ ...f, advertencias: val }))}
              placeholder="Ej: Contraindicado en pacientes alérgicos a penicilinas..."
              size="md"
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Modal de detalle */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title="Detalles de la plantilla"
        size="md"
        className="plantillas-detail-modal"
        footer={detailModalFooter}
        closeOnOverlayClick={false}
      >
        {selectedPlantilla && (
          <div className="plantillas-detail-body">
            <div className="detail-row">
              <span className="detail-label">Nombre:</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{selectedPlantilla.nombre}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Descripción:</span>
              <span className="detail-value">{selectedPlantilla.descripcion || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Duración:</span>
              <span className="detail-value">{selectedPlantilla.duracion || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Estado:</span>
              <span className={`detail-value estado-badge ${selectedPlantilla.is_active !== false ? 'activo' : 'inactivo'}`}>
                {selectedPlantilla.is_active !== false ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              <div className="detail-label" style={{ marginBottom: '8px' }}>Medicamentos:</div>
              {selectedPlantilla.medicamentos?.length > 0 ? (
                selectedPlantilla.medicamentos.map((med, idx) => (
                  <div key={idx} style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ fontWeight: 600 }}>{med.medicamento_nombre || med.name || 'Sin nombre'}</div>
                    <div style={{ fontSize: '13px', color: '#475569', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {med.dosis_especifica && <span><strong>Dosis:</strong> {med.dosis_especifica}</span>}
                      {med.frecuencia_especifica && <span><strong>Frecuencia:</strong> {med.frecuencia_especifica}</span>}
                      {med.notas && <span><strong>Notas:</strong> {med.notas}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <span style={{ color: '#94a3b8' }}>—</span>
              )}
            </div>

            {selectedPlantilla.instrucciones && (
              <div className="detail-row" style={{ marginTop: '12px' }}>
                <span className="detail-label">Instrucciones:</span>
                <span className="detail-value">{selectedPlantilla.instrucciones}</span>
              </div>
            )}

            {selectedPlantilla.advertencias && (
              <div className="detail-row" style={{ marginTop: '8px' }}>
                <span className="detail-label">Advertencia:</span>
                <span className="detail-value" style={{ color: '#991b1b' }}>{selectedPlantilla.advertencias}</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageTemplate>
  );
}