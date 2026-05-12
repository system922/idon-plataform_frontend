import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { Plus, Edit2, Trash2, X, Check, AlertCircle } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/PurchasesCategories.css';

export default function PurchasesCategories() {
  const { showConfirm } = useConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#95a5a6' });
  const [saving, setSaving] = useState(false);

  // Colores predefinidos para sugerir
  const colorPalette = [
    '#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#95a5a6', '#34495e', '#e84393'
  ];

  // Cargar categorías
  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/purchases/expense-categories');
      if (!res.ok) throw new Error('Error al cargar categorías');
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Abrir modal para crear/editar
  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, color: category.color || '#95a5a6' });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', color: '#95a5a6' });
    }
    setModalOpen(true);
  };

  // Guardar categoría (crear o editar)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = editingCategory
        ? `/api/purchases/expense-categories/${editingCategory.id}`
        : '/api/purchases/expense-categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ name: formData.name.trim(), color: formData.color }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      setSuccess(editingCategory ? 'Categoría actualizada' : 'Categoría creada');
      setModalOpen(false);
      loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Eliminar categoría
  const handleDelete = async (category) => {
    if (!await showConfirm(`¿Eliminar la categoría "${category.name}"? Los gastos que la usen quedarán sin categoría.`)) return;
    try {
      const res = await fetchWithAuth(`/api/purchases/expense-categories/${category.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }
      setSuccess('Categoría eliminada');
      loadCategories();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Header actions
  const headerAction = (
    <div className="categories-header-actions">
      <button className="btn-primary" onClick={() => openModal()}>
        <Plus size={16} /> Nueva categoría
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Categorías de Gastos"
      subtitle="Gestiona las categorías para clasificar tus gastos operativos"
      loading={loading}
      headerAction={headerAction}
    >
      <div className="categories-container">
        {error && <div className="alert-error"><AlertCircle size={16} /> {error}</div>}
        {success && <div className="alert-success"><Check size={16} /> {success}</div>}

        <div className="categories-table-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Color</th>
                <th>Fecha de creación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="empty-row">No hay categorías registradas</td>
                </tr>
              ) : (
                categories.map(cat => (
                  <tr key={cat.id}>
                    <td className="category-name">{cat.name}</td>
                    <td>
                      <div className="color-display" style={{ backgroundColor: cat.color || '#95a5a6' }} />
                      <span className="color-hex">{cat.color || '#95a5a6'}</span>
                    </td>
                    <td>{new Date(cat.created_at).toLocaleDateString('es-ES')}</td>
                    <td className="actions-cell">
                      <button className="icon-btn edit" onClick={() => openModal(cat)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="icon-btn delete" onClick={() => handleDelete(cat)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal para crear/editar */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h2>
                <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Alquiler, Servicios, Proveedores..."
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <div className="color-palette">
                    {colorPalette.map(col => (
                      <button
                        key={col}
                        type="button"
                        className={`color-option ${formData.color === col ? 'active' : ''}`}
                        style={{ backgroundColor: col }}
                        onClick={() => setFormData({ ...formData, color: col })}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="color-picker"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}