// components/CompositeMaterialForm.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, Package, Layers } from 'react-feather';
import Modal from './General/Modal';
import Input from './General/Input';
import CustomCombobox from './General/CustomCombobox';
import { IconTextButton, ButtonGroup } from './General/Button';

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

const CompositeMaterialForm = ({ isOpen, onClose, onSave, rawMaterials = [] }) => {
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'unidad',
    unit_cost: 0,
    is_composite: true,
    recipe: {
      description: '',
      yield_qty: 1,
      yield_unit: 'unidad',
      ingredients: []
    }
  });
  
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [newIngredient, setNewIngredient] = useState({
    raw_material_id: '',
    quantity: 1,
    unit: '',
    unit_cost: 0
  });
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      const newCode = `MPC${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      setForm({
        code: newCode,
        name: '',
        description: '',
        unit: 'unidad',
        unit_cost: 0,
        is_composite: true,
        recipe: {
          description: '',
          yield_qty: 1,
          yield_unit: 'unidad',
          ingredients: []
        }
      });
      setNewIngredient({
        raw_material_id: '',
        quantity: 1,
        unit: '',
        unit_cost: 0
      });
      setEditingIngredient(null);
      setErrors({});
    }
  }, [isOpen]);

  const handleAddIngredient = () => {
    if (!newIngredient.raw_material_id) {
      alert('Selecciona una materia prima');
      return;
    }
    if (!newIngredient.quantity || newIngredient.quantity <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }

    const material = rawMaterials.find(m => String(m.id) === String(newIngredient.raw_material_id));
    const unitCost = newIngredient.unit_cost || material?.unit_cost || 0;
    const totalCost = newIngredient.quantity * unitCost;
    
    const ingredient = {
      ...newIngredient,
      raw_material_name: material?.name || '',
      raw_material_code: material?.code || '',
      raw_material_unit: material?.unit || '',
      unit: newIngredient.unit || material?.unit || 'unidad',
      unit_cost: unitCost,
      total_cost: totalCost
    };

    if (editingIngredient) {
      const updatedIngredients = form.recipe.ingredients.map(ing => 
        ing.id === editingIngredient.id ? { ...ingredient, id: ing.id } : ing
      );
      setForm({
        ...form,
        recipe: {
          ...form.recipe,
          ingredients: updatedIngredients
        }
      });
      setEditingIngredient(null);
    } else {
      setForm({
        ...form,
        recipe: {
          ...form.recipe,
          ingredients: [...form.recipe.ingredients, { ...ingredient, id: Date.now() }]
        }
      });
    }

    setNewIngredient({
      raw_material_id: '',
      quantity: 1,
      unit: '',
      unit_cost: 0
    });
    setSelectedMaterial('');
  };

  const handleRemoveIngredient = (ingredientId) => {
    setForm({
      ...form,
      recipe: {
        ...form.recipe,
        ingredients: form.recipe.ingredients.filter(ing => ing.id !== ingredientId)
      }
    });
  };

  const handleEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setNewIngredient({
      raw_material_id: ingredient.raw_material_id,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unit_cost: ingredient.unit_cost
    });
    setSelectedMaterial(String(ingredient.raw_material_id));
  };

  const calculateTotalCost = () => {
    return form.recipe.ingredients.reduce((sum, ing) => sum + (ing.total_cost || 0), 0);
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!form.name) newErrors.name = 'El nombre es requerido';
    if (form.recipe.ingredients.length === 0) {
      newErrors.ingredients = 'La receta debe tener al menos un ingrediente';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        code: form.code,
        name: form.name,
        description: form.description,
        unit: form.unit,
        unit_cost: calculateTotalCost() / form.recipe.yield_qty,
        is_composite: true,
        recipe: {
          description: form.recipe.description || `Receta de ${form.name}`,
          yield_qty: form.recipe.yield_qty || 1,
          yield_unit: form.recipe.yield_unit || 'unidad',
          ingredients: form.recipe.ingredients.map(ing => ({
            raw_material_id: ing.raw_material_id,
            quantity: ing.quantity,
            unit: ing.unit,
            unit_cost: ing.unit_cost || 0,
            total_cost: ing.total_cost
          }))
        }
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saving composite material:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <ButtonGroup>
      <IconTextButton
        variant="danger"
        size="md"
        icon={<X size={14} />}
        onClick={onClose}
        disabled={saving}
      >
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        icon={<Check size={14} />}
        onClick={handleSubmit}
        disabled={saving || !form.name || form.recipe.ingredients.length === 0}
        loading={saving}
      >
        Crear Subreceta
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Materia Prima Compuesta (Subreceta)"
      size="xl"
      footer={footer}
      closeOnOverlayClick={false}
      
    >
      <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.5fr', gap: '12px' }}>
        <div className="form-group">
          <label>Código *</label>
          <Input
            value={form.code}
            onChange={(val) => setForm({ ...form, code: val })}
            placeholder="MPC-001"
            size="md"
            disabled
          />
        </div>

        <div className="form-group">
          <label>Nombre *</label>
          <Input
            value={form.name}
            onChange={(val) => setForm({ ...form, name: val })}
            placeholder="Ej: Salsa BBQ, Aderezo César"
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
              placeholder="Descripción de la subreceta"
              size="md"
            />
          </div>
          <div>
            <label>U. Medida</label>
            <CustomCombobox
              options={UNIT_OPTIONS}
              value={form.unit}
              onChange={(val) => setForm({ ...form, unit: val })}
              placeholder="Seleccionar unidad"
              filterable
            />
          </div>
        </div>

        <div className="form-group">
          <label>Rendimiento</label>
          <Input
            type="number"
            min="0.001"
            step="0.001"
            value={form.recipe.yield_qty}
            onChange={(val) => setForm({
              ...form,
              recipe: { ...form.recipe, yield_qty: Number(val) }
            })}
            size="md"
            placeholder="1"
          />
          <small style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            Cantidad que produce esta receta
          </small>
        </div>

        <div className="form-group">
          <label>Unidad de rendimiento</label>
          <Input
            value={form.recipe.yield_unit}
            onChange={(val) => setForm({
              ...form,
              recipe: { ...form.recipe, yield_unit: val }
            })}
            placeholder="unidad, porción, litro..."
            size="md"
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Descripción de la receta</label>
          <Input
            type="textarea"
            rows={1}
            value={form.recipe.description}
            onChange={(val) => setForm({
              ...form,
              recipe: { ...form.recipe, description: val }
            })}
            placeholder="Instrucciones o descripción de la receta"
            size="md"
          />
        </div>
      </div>

      {/* Ingredientes */}
      <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
        <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} />
          Ingredientes de la receta
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 'normal' }}>
            ({form.recipe.ingredients.length} ingredientes)
          </span>
          {errors.ingredients && (
            <span style={{ color: 'var(--danger)', fontSize: 12, fontWeight: 'normal' }}>
              * {errors.ingredients}
            </span>
          )}
        </h4>

        {/* Formulario para agregar ingredientes */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 10, marginBottom: 12 }}>
          <div className="form-group">
            <label>Materia Prima</label>
            <CustomCombobox
              options={rawMaterials
                .filter(m => m.is_active !== false && !m.is_composite)
                .map(m => ({ label: `${m.name} (${m.code})`, value: String(m.id) }))}
              value={String(newIngredient.raw_material_id || '')}
              onChange={(val) => {
                const material = rawMaterials.find(m => String(m.id) === val);
                setNewIngredient({
                  ...newIngredient,
                  raw_material_id: val,
                  unit: material?.unit || '',
                  unit_cost: material?.unit_cost || 0
                });
                setSelectedMaterial(val);
              }}
              placeholder="Seleccionar materia prima"
              filterable
            />
          </div>
          <div className="form-group">
            <label>Cantidad</label>
            <Input
              type="number"
              min="0"
              step="0.001"
              value={newIngredient.quantity}
              onChange={(val) => setNewIngredient({ ...newIngredient, quantity: Number(val) })}
              size="sm"
              placeholder="1"
            />
          </div>
          <div className="form-group">
            <label>Unidad</label>
            <CustomCombobox
              options={UNIT_OPTIONS}
              value={newIngredient.unit || ''}
              onChange={(val) => setNewIngredient({ ...newIngredient, unit: val })}
              placeholder="Unidad"
              filterable
              size="sm"
            />
          </div>
          <div className="form-group">
            <label>Costo unit.</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newIngredient.unit_cost}
              onChange={(val) => setNewIngredient({ ...newIngredient, unit_cost: Number(val) })}
              size="sm"
              placeholder="0.00"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'end', gap: 4 }}>
            <IconTextButton
              variant="success"
              size="sm"
              icon={editingIngredient ? <Check size={12} /> : <Plus size={12} />}
              onClick={handleAddIngredient}
              disabled={!newIngredient.raw_material_id}
            >
              {editingIngredient ? 'Actualizar' : 'Agregar'}
            </IconTextButton>
            {editingIngredient && (
              <IconTextButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEditingIngredient(null);
                  setNewIngredient({ raw_material_id: '', quantity: 1, unit: '', unit_cost: 0 });
                }}
              >
                Cancelar
              </IconTextButton>
            )}
          </div>
        </div>

        {/* Lista de ingredientes */}
        {form.recipe.ingredients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
            <Package size={24} style={{ opacity: 0.3 }} />
            <div>Agrega ingredientes a la receta</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-striped table-hover" style={{ width: '100%', fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Materia Prima</th>
                  <th>Código</th>
                  <th>Cantidad</th>
                  <th>Unidad</th>
                  <th>Costo unit.</th>
                  <th>Costo total</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {form.recipe.ingredients.map((ing, idx) => (
                  <tr key={ing.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ fontWeight: 500 }}>{ing.raw_material_name}</td>
                    <td>{ing.raw_material_code || '—'}</td>
                    <td>{ing.quantity}</td>
                    <td>{ing.unit || '—'}</td>
                    <td>${Number(ing.unit_cost).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                      ${Number(ing.total_cost).toFixed(2)}
                    </td>
                    <td>
                      <ButtonGroup>
                        <IconTextButton
                          variant="blue"
                          size="xs"
                          icon={<Edit2 size={10} />}
                          onClick={() => handleEditIngredient(ing)}
                          title="Editar"
                        />
                        <IconTextButton
                          variant="danger"
                          size="xs"
                          icon={<Trash2 size={10} />}
                          onClick={() => handleRemoveIngredient(ing.id)}
                          title="Eliminar"
                        />
                      </ButtonGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                  <td colSpan="5" style={{ textAlign: 'right' }}>Costo total de la receta:</td>
                  <td style={{ color: 'var(--success)' }}>${calculateTotalCost().toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  <td colSpan="7" style={{ textAlign: 'right' }}>
                    Costo por unidad ({form.unit}): ${(calculateTotalCost() / (form.recipe.yield_qty || 1)).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CompositeMaterialForm;