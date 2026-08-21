// components/RawMaterialModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Check } from 'react-feather';
import Modal from './General/Modal';
import Input from './General/Input';
import CustomCombobox from './General/CustomCombobox';
import { IconTextButton, ButtonGroup } from './General/Button';

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

const RawMaterialModal = ({ isOpen, material, onSave, onClose, isSaving }) => {
  const [form, setForm] = useState({ ...EMPTY_MATERIAL });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
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
        // Generar código automático
        const newCode = `MP${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        setForm({ ...EMPTY_MATERIAL, code: newCode });
      }
      setErrors({});
    }
  }, [isOpen, material]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.code) newErrors.code = 'El código es requerido';
    if (!form.name) newErrors.name = 'El nombre es requerido';
    if (!form.unit) newErrors.unit = 'La unidad es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(form);
  };

  const footer = (
    <ButtonGroup>
      <IconTextButton
        variant="danger"
        size="md"
        icon={<X size={14} />}
        onClick={onClose}
        disabled={isSaving}
      >
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        icon={<Check size={14} />}
        onClick={handleSubmit}
        disabled={isSaving || !form.code || !form.name || !form.unit}
        loading={isSaving}
      >
        {material ? 'Actualizar' : 'Crear'}
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={material ? 'Editar Materia Prima' : 'Nueva Materia Prima'}
      size="md"
      footer={footer}
      closeOnOverlayClick={false}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label>Código *</label>
          <Input
            value={form.code}
            onChange={(val) => handleChange('code', val)}
            placeholder="MP-001"
            size="md"
            error={errors.code}
            disabled={!!material}
          />
          {errors.code && <small style={{ color: 'var(--danger)' }}>{errors.code}</small>}
        </div>

        <div className="form-group">
          <label>Nombre *</label>
          <Input
            value={form.name}
            onChange={(val) => handleChange('name', val)}
            placeholder="Nombre de la materia prima"
            size="md"
            error={errors.name}
          />
          {errors.name && <small style={{ color: 'var(--danger)' }}>{errors.name}</small>}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Descripción</label>
          <Input
            type="textarea"
            rows={2}
            value={form.description}
            onChange={(val) => handleChange('description', val)}
            placeholder="Descripción de la materia prima"
            size="md"
          />
        </div>

        <div className="form-group">
          <label>Unidad *</label>
          <CustomCombobox
            options={UNIT_OPTIONS}
            value={form.unit}
            onChange={(val) => handleChange('unit', val)}
            placeholder="Seleccionar unidad"
            filterable
          />
          {errors.unit && <small style={{ color: 'var(--danger)' }}>{errors.unit}</small>}
        </div>

        <div className="form-group">
          <label>SKU</label>
          <Input
            value={form.sku}
            onChange={(val) => handleChange('sku', val)}
            placeholder="SKU"
            size="md"
          />
        </div>

        <div className="form-group">
          <label>Código de Barras</label>
          <Input
            value={form.barcode}
            onChange={(val) => handleChange('barcode', val)}
            placeholder="Código de barras"
            size="md"
          />
        </div>

        <div className="form-group">
          <label>Costo Unitario</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.unit_cost}
            onChange={(val) => handleChange('unit_cost', Number(val))}
            placeholder="0.00"
            size="md"
          />
        </div>

        <div className="form-group">
          <label>Stock Inicial</label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={form.stock}
            onChange={(val) => handleChange('stock', Number(val))}
            placeholder="0"
            size="md"
          />
        </div>

        <div className="form-group">
          <label>Stock Mínimo</label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={form.min_stock}
            onChange={(val) => handleChange('min_stock', Number(val))}
            placeholder="0"
            size="md"
          />
        </div>
      </div>
    </Modal>
  );
};

export default RawMaterialModal;