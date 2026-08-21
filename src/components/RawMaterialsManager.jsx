// components/RawMaterialsManager.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw, Check, Layers } from 'react-feather';
import { fetchWithAuth } from '../config/apiBase_';
import Modal from './General/Modal';
import Table from './General/Table';
import { IconTextButton, ButtonGroup } from './General/Button';
import SearchInput from './General/SearchInput';
import Input from './General/Input';
import CustomCombobox from './General/CustomCombobox';
import { useConfirm } from '../context/ConfirmContext';
import { useAlert } from '../components/ConfirmContext';
import CompositeMaterialForm from '../components/CompositeMaterialForm';

// ─── UNIDADES DE MEDIDA ──────────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'lb', label: 'Libra (lb)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'galon', label: 'Galón' },
  { value: 'docena', label: 'Docena' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'botella', label: 'Botella' },
  { value: 'lata', label: 'Lata' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
];

const EMPTY_MATERIAL = {
  code: '',
  name: '',
  description: '',
  unit: 'unidad',
  stock: 0,
  min_stock: 0,
  unit_cost: 0,
  barcode: '',
  sku: '',
};

const RawMaterialsManager = ({ isOpen, onClose, onRefresh }) => {
  const { showConfirm } = useConfirm();
  const alert = useAlert();

  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showCompositeForm, setShowCompositeForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_MATERIAL });
  const [errors, setErrors] = useState({});

  // ── Cargar materias primas ──
  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/raw-materials');
      if (!res.ok) throw new Error('Error al cargar materias primas');
      const data = await res.json();
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      alert.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMaterials();
    }
  }, [isOpen]);

  // ── Abrir formulario para nueva/edición ──
  const openForm = (material = null) => {
    setEditingMaterial(material);
    if (material) {
      setForm({
        code: material.code || '',
        name: material.name || '',
        description: material.description || '',
        unit: material.unit || 'unidad',
        stock: material.stock || 0,
        min_stock: material.min_stock || 0,
        unit_cost: material.unit_cost || 0,
        barcode: material.barcode || '',
        sku: material.sku || '',
      });
    } else {
      const newCode = `MP${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setForm({ ...EMPTY_MATERIAL, code: newCode });
    }
    setErrors({});
    setShowFormModal(true);
  };

  const closeForm = () => {
    setShowFormModal(false);
    setEditingMaterial(null);
    setForm({ ...EMPTY_MATERIAL });
  };

  // ── Guardar materia prima simple ──
  const handleSave = async () => {
    // Validar
    const newErrors = {};
    if (!form.code) newErrors.code = 'El código es requerido';
    if (!form.name) newErrors.name = 'El nombre es requerido';
    if (!form.unit) newErrors.unit = 'La unidad es requerida';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const url = editingMaterial ? `/api/raw-materials/${editingMaterial.id}` : '/api/raw-materials';
      const method = editingMaterial ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      await alert.success(editingMaterial ? 'Materia prima actualizada' : 'Materia prima creada');
      closeForm();
      loadMaterials();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar materia prima ──
  const handleDelete = async (material) => {
    if (!await showConfirm({
      title: 'Eliminar materia prima',
      message: `¿Eliminar "${material.name}"?`,
      confirmText: 'Eliminar',
      danger: true,
    })) return;

    try {
      const res = await fetchWithAuth(`/api/raw-materials/${material.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      await alert.success('Materia prima eliminada');
      loadMaterials();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert.error(err.message);
    }
  };

  // ── Guardar materia prima compuesta ──
  const handleSaveComposite = async (data) => {
    try {
      const res = await fetchWithAuth('/api/raw-materials/composite', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar materia prima compuesta');
      }
      await alert.success('Materia prima compuesta creada');
      setShowCompositeForm(false);
      loadMaterials();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert.error(err.message);
    }
  };

  // ── Filtrado ──
  const filteredMaterials = materials.filter(m => {
    const q = search.toLowerCase();
    return (m.name || '').toLowerCase().includes(q) ||
           (m.code || '').toLowerCase().includes(q) ||
           (m.sku || '').toLowerCase().includes(q);
  });

  // ── Columnas ──
  const columns = [
    {
      accessor: 'code',
      label: 'Código',
      render: (item) => (
        <span style={{ fontWeight: 600 }}>
          {item.code}
          {item.is_composite && (
            <span style={{ 
              fontSize: 10, 
              backgroundColor: 'var(--info)', 
              color: 'white',
              padding: '2px 6px',
              borderRadius: 4,
              marginLeft: 8
            }}>
              Compuesta
            </span>
          )}
        </span>
      ),
    },
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div>
          <div>{item.name}</div>
          {item.description && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'unit',
      label: 'Unidad',
      render: (item) => {
        const unit = UNIT_OPTIONS.find(u => u.value === item.unit);
        return <span>{unit?.label || item.unit || '—'}</span>;
      },
    },
    {
      accessor: 'unit_cost',
      label: 'Costo unit.',
      render: (item) => <span>${Number(item.unit_cost || 0).toFixed(2)}</span>,
    },
    {
      accessor: 'stock',
      label: 'Stock',
      render: (item) => (
        <span style={{ 
          color: item.stock < item.min_stock ? 'var(--danger)' : 'var(--success)',
          fontWeight: 600 
        }}>
          {item.stock || 0}
        </span>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        <span className={`${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    
  ];

  // ── Render de fila ──
  const renderRow = (item) => (
    <tr key={item.id} className={`table-row ${!item.is_active ? 'users-row-inactive' : ''}`}>
      {columns.map((col, idx) => (
        <td key={idx} className="table-cell" data-label={col.label}>
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
      <td className="table-cell table-actions-cell">
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<Edit2 size={12} />}
            onClick={() => openForm(item)}
            title="Editar"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => handleDelete(item)}
            title="Eliminar"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      </td>
    </tr>
  );

  // ── Toolbar ──
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar materia prima..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearch('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={() => openForm()}
          disabled={saving || loading}
        >
          Nueva Materia Prima
        </IconTextButton>
        <IconTextButton
          variant="info"
          size="md"
          icon={<Layers size={13} />}
          onClick={() => setShowCompositeForm(true)}
          disabled={saving || loading}
        >
          Nueva Compuesta
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  const footer = (
    <ButtonGroup>
      <IconTextButton
        variant="danger"
        size="md"
        icon={<X size={14} />}
        onClick={onClose}
      >
        Cerrar
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Materia Prima"
        size="xl"
        footer={footer}
        closeOnOverlayClick={false}
      >
        <Table
          data={filteredMaterials}
          columns={columns}
          keyField="id"
          renderRow={renderRow}
          title="Lista de materia prima"
          subtitle={`${filteredMaterials.length} ${filteredMaterials.length === 1 ? 'registro' : 'registros'}`}
          toolbar={toolbar}
          searchable={false}
          pagination={true}
          itemsPerPage={10}
          itemsPerPageOptions={[10, 25, 50, 100]}
          loading={loading}
          emptyMessage="No hay materias primas registradas"
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />
      </Modal>

      {/* Modal de formulario simple */}
      <Modal
        isOpen={showFormModal}
        onClose={closeForm}
        title={editingMaterial ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
        size="md"
        footer={
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<X size={14} />}
              onClick={closeForm}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<Check size={14} />}
              onClick={handleSave}
              disabled={saving || !form.code || !form.name || !form.unit}
              loading={saving}
            >
              {editingMaterial ? 'Actualizar' : 'Crear'}
            </IconTextButton>
          </ButtonGroup>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.5fr', gap: '12px' }}>
          <div className="form-group">
            <label>Código *</label>
            <Input
              value={form.code}
              onChange={(val) => setForm({ ...form, code: val })}
              placeholder="MP-001"
              size="md"
              error={errors.code}
              disabled={!!editingMaterial}
            />
            {errors.code && <small style={{ color: 'var(--danger)' }}>{errors.code}</small>}
          </div>

          <div className="form-group">
            <label>Nombre *</label>
            <Input
              value={form.name}
              onChange={(val) => setForm({ ...form, name: val })}
              placeholder="Nombre de la materia prima"
              size="md"
              error={errors.name}
            />
            {errors.name && <small style={{ color: 'var(--danger)' }}>{errors.name}</small>}
          </div>

          {/* Descripción + U. Medida en la misma fila */}
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label>Descripción</label>
              <Input
                type="textarea"
                rows={2}
                value={form.description}
                onChange={(val) => setForm({ ...form, description: val })}
                placeholder="Descripción de la materia prima"
                size="md"
              />
            </div>
            <div>
              <label>U. Medida *</label>
              <CustomCombobox
                options={UNIT_OPTIONS}
                value={form.unit}
                onChange={(val) => setForm({ ...form, unit: val })}
                placeholder="Seleccionar unidad"
                filterable
              />
              {errors.unit && <small style={{ color: 'var(--danger)' }}>{errors.unit}</small>}
            </div>
          </div>
          {/* Costo Unitario + Stock Inicial + Stock Mínimo en la misma fila */}
          <div className="form-group" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label>Costo Unitario</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unit_cost}
                onChange={(val) => setForm({ ...form, unit_cost: Number(val) })}
                placeholder="0.00"
                size="md"
              />
            </div>
            <div>
              <label>Stock Inicial</label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.stock}
                onChange={(val) => setForm({ ...form, stock: Number(val) })}
                placeholder="0"
                size="md"
              />
            </div>
            <div>
              <label>Stock Mínimo</label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={form.min_stock}
                onChange={(val) => setForm({ ...form, min_stock: Number(val) })}
                placeholder="0"
                size="md"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de materia prima compuesta */}
      <CompositeMaterialForm
        isOpen={showCompositeForm}
        onClose={() => setShowCompositeForm(false)}
        onSave={handleSaveComposite}
        rawMaterials={materials}
      />
    </>
  );
};

export default RawMaterialsManager;