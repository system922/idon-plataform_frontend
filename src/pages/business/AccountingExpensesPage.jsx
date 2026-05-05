import React, { useState, useEffect, useCallback } from "react";
import {
  FiDollarSign, FiPlus, FiEdit2, FiTrash2, FiRefreshCw, 
  FiAlertCircle, FiSearch, FiCalendar, FiChevronDown,
  FiFilter, FiDownload, FiX, FiTag, FiTrendingUp
} from "react-icons/fi";
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import { fetchWithAuth } from '../../config/apiBase';
import "../../styles/AccountingExpensesPage.css";

// ─── Modal de Gastos ─────────────────────────────────────────────────────────
function ExpenseModal({ expense, categories, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category_id: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference: '',
    notes: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (expense) {
      setForm({
        description: expense.description || '',
        amount: expense.amount || '',
        category_id: expense.category_id || '',
        expense_date: expense.expense_date?.split('T')[0] || new Date().toISOString().split('T')[0],
        payment_method: expense.payment_method || 'cash',
        reference: expense.reference || '',
        notes: expense.notes || ''
      });
    } else {
      setForm({
        description: '',
        amount: '',
        category_id: '',
        expense_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        reference: '',
        notes: ''
      });
    }
  }, [expense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) {
      setError('La descripción es requerida');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if (!form.category_id) {
      setError('La categoría es requerida');
      return;
    }
    
    onSave(form);
  };

  return (
    <div className="expense-modal-overlay" onClick={onClose}>
      <div className="expense-modal-box" onClick={e => e.stopPropagation()}>
        <div className="expense-modal-header">
          <h2>{expense ? 'Editar gasto' : 'Nuevo gasto'}</h2>
          <button type="button" onClick={onClose} className="expense-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="expense-form-grid">
            <div className="expense-form-group full-width">
              <label>Descripción *</label>
              <input
                type="text"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Ej: Compra de insumos, Pago de servicios..."
                autoFocus
              />
            </div>

            <div className="expense-form-group">
              <label>Monto *</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="expense-form-group">
              <label>Categoría *</label>
              <select
                value={form.category_id}
                onChange={e => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Seleccionar categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="expense-form-group">
              <label>Fecha *</label>
              <input
                type="date"
                value={form.expense_date}
                onChange={e => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>

            <div className="expense-form-group">
              <label>Método de pago</label>
              <select
                value={form.payment_method}
                onChange={e => setForm({ ...form, payment_method: e.target.value })}
              >
                <option value="cash">Efectivo</option>
                <option value="bank_transfer">Transferencia bancaria</option>
                <option value="credit_card">Tarjeta de crédito</option>
                <option value="debit_card">Tarjeta de débito</option>
                <option value="check">Cheque</option>
              </select>
            </div>

            <div className="expense-form-group">
              <label>Referencia/N°</label>
              <input
                type="text"
                value={form.reference}
                onChange={e => setForm({ ...form, reference: e.target.value })}
                placeholder="Factura #, comprobante..."
              />
            </div>

            <div className="expense-form-group full-width">
              <label>Notas (opcional)</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Notas adicionales..."
              />
            </div>
          </div>

          <div className="expense-modal-footer">
            <button className="expense-btn-cancel" type="button" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button className="expense-btn-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : expense ? 'Guardar cambios' : 'Crear gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal de categorías ──────────────────────────────────────────────────────
function CategoryModal({ category, onClose, onSave, saving }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(category?.name || '');
  }, [category]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('El nombre de la categoría es requerido');
      return;
    }
    onSave({ name: name.trim() });
  };

  return (
    <div className="expense-modal-overlay" onClick={onClose}>
      <div className="expense-modal-box expense-modal-small" onClick={e => e.stopPropagation()}>
        <div className="expense-modal-header">
          <h2>{category ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button type="button" onClick={onClose} className="expense-modal-close">
            <FiX size={22} />
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="expense-form-group">
            <label>Nombre de la categoría *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Insumos, Servicios, Nómina..."
              autoFocus
            />
          </div>

          <div className="expense-modal-footer">
            <button className="expense-btn-cancel" type="button" onClick={onClose}>
              Cancelar
            </button>
            <button className="expense-btn-save" type="submit" disabled={saving}>
              {saving ? 'Guardando...' : category ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AccountingExpensesPage() {
  const { selectedBusiness } = useBusinessContext();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalByCategory, setTotalByCategory] = useState({});

  // Cargar categorías y gastos
  const loadCategories = useCallback(async () => {
    if (!selectedBusiness?.id) return;
    try {
      const res = await fetchWithAuth('/api/purchases/expense-categories');
      const data = await res.json();
      setCategories(Array.isArray(data.data) ? data.data : data.categories || []);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }, [selectedBusiness]);

  const loadExpenses = useCallback(async () => {
    if (!selectedBusiness?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedCategory) params.append('category_id', selectedCategory);
      
      const res = await fetchWithAuth(`/api/purchases/expenses?${params}`);
      const data = await res.json();
      
      const expensesList = Array.isArray(data.data) ? data.data : data.expenses || [];
      setExpenses(expensesList);
      
      // Calcular totales
      const total = expensesList.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
      setTotalExpenses(total);
      
      // Calcular total por categoría
      const byCategory = {};
      expensesList.forEach(e => {
        const catName = e.category_name || 'Sin categoría';
        byCategory[catName] = (byCategory[catName] || 0) + (parseFloat(e.amount) || 0);
      });
      setTotalByCategory(byCategory);
      
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Error al cargar los gastos');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness, dateFrom, dateTo, selectedCategory]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Filtrar por búsqueda
  const filteredExpenses = expenses.filter(e =>
    e.description?.toLowerCase().includes(search.toLowerCase()) ||
    e.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadExpenses();
    await loadCategories();
    setRefreshing(false);
  };

  const handleSaveExpense = async (form) => {
    setSaving(true);
    setError('');
    try {
      const isEdit = !!editingExpense;
      const url = isEdit 
        ? `/api/purchases/expenses/${editingExpense.id}` 
        : '/api/purchases/expenses';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount)
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      
      setShowModal(false);
      setEditingExpense(null);
      loadExpenses();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm(`¿Eliminar el gasto "${expense.description}"?`)) return;
    
    setSaving(true);
    try {
      await fetchWithAuth(`/api/purchases/expenses/${expense.id}`, { method: 'DELETE' });
      loadExpenses();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async (form) => {
    setSaving(true);
    try {
      const isEdit = !!editingCategory;
      const url = isEdit 
        ? `/api/purchases/expense-categories/${editingCategory.id}` 
        : '/api/purchases/expense-categories';
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });
      if (!res.ok) throw new Error('Error al guardar categoría');
      
      setShowCategoryModal(false);
      setEditingCategory(null);
      loadCategories();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`¿Eliminar la categoría "${category.name}"? Los gastos quedarán sin categoría.`)) return;
    
    try {
      await fetchWithAuth(`/api/purchases/expense-categories/${category.id}`, { method: 'DELETE' });
      loadCategories();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (selectedCategory) params.append('category_id', selectedCategory);
      params.append('format', 'csv');
      
      const res = await fetchWithAuth(`/api/purchases/expenses/export?${params}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `gastos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Error al exportar');
    }
  };

  const openCreateExpense = () => {
    setEditingExpense(null);
    setError('');
    setShowModal(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setError('');
    setShowModal(true);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryModal(true);
  };

  const openEditCategory = (category) => {
    setEditingCategory(category);
    setShowCategoryModal(true);
  };

  // Reset filters
  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSelectedCategory('');
    setSearch('');
  };

  // Botones header
  const refreshButton = (
    <button onClick={handleRefresh} className="expense-refresh-btn" disabled={refreshing}>
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const exportButton = (
    <button onClick={handleExport} className="expense-btn-secondary">
      <FiDownload size={16} /> Exportar
    </button>
  );

  const newExpenseButton = (
    <button onClick={openCreateExpense} className="expense-btn-primary">
      <FiPlus size={16} /> Nuevo gasto
    </button>
  );

  return (
    <PageTemplate
      title="CONTABILIDAD - GASTOS"
      subtitle="Gestión y control de gastos contables"
      theme="business"
      loading={loading}
      headerAction={
        <div className="expense-header-actions">
          {newExpenseButton}
          {exportButton}
          {refreshButton}
        </div>
      }
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filtros */}
      <div className="expense-filters-bar">
        <div className="expense-search-wrapper">
          <FiSearch size={16} className="expense-search-icon" />
          <input
            type="text"
            placeholder="Buscar por descripción o referencia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="expense-search-input"
          />
        </div>

        <div className="expense-filter-group">
          <button 
            className={`expense-filter-btn ${showDateFilter ? 'active' : ''}`}
            onClick={() => setShowDateFilter(!showDateFilter)}
          >
            <FiCalendar size={16} />
            Fecha
            <FiChevronDown size={14} />
          </button>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="expense-filter-select"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <button onClick={resetFilters} className="expense-filter-clear">
            Limpiar filtros
          </button>
        </div>

        {showDateFilter && (
          <div className="expense-date-range">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="Fecha desde"
            />
            <span>a</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="Fecha hasta"
            />
          </div>
        )}
      </div>

      {/* Tarjetas de resumen */}
      <div className="expense-summary-grid">
        <div className="expense-summary-card">
          <div className="expense-summary-icon">
            <FiDollarSign size={24} />
          </div>
          <div className="expense-summary-content">
            <div className="expense-summary-title">Total Gastos</div>
            <div className="expense-summary-value">${totalExpenses.toFixed(2)}</div>
          </div>
        </div>

        <div className="expense-summary-card">
          <div className="expense-summary-icon">
            <FiTrendingUp size={24} />
          </div>
          <div className="expense-summary-content">
            <div className="expense-summary-title">Promedio diario</div>
            <div className="expense-summary-value">
              ${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        <div className="expense-summary-card">
          <div className="expense-summary-icon">
            <FiTag size={24} />
          </div>
          <div className="expense-summary-content">
            <div className="expense-summary-title">Categorías</div>
            <div className="expense-summary-value">{categories.length}</div>
          </div>
        </div>

        <div className="expense-summary-card">
          <div className="expense-summary-icon">
            <FiCalendar size={24} />
          </div>
          <div className="expense-summary-content">
            <div className="expense-summary-title">Total Gastos</div>
            <div className="expense-summary-value">{expenses.length}</div>
          </div>
        </div>
      </div>

      {/* Tabla de gastos */}
      <div className="expense-table-container">
        <div className="expense-table-header">
          <h3>Listado de gastos</h3>
          <button onClick={openCreateCategory} className="expense-link-btn">
            <FiPlus size={14} /> Gestionar categorías
          </button>
        </div>

        <div className="expense-table-wrapper">
          <table className="expense-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Referencia</th>
                <th>Método de pago</th>
                <th className="expense-text-right">Monto</th>
                <th style={{ width: '80px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="expense-empty-state">
                    <FiDollarSign size={48} />
                    <span>No hay gastos registrados</span>
                    <button onClick={openCreateExpense} className="expense-empty-btn">
                      <FiPlus size={14} /> Registrar primer gasto
                    </button>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.id}>
                    <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td className="expense-description">{expense.description}</td>
                    <td>
                      <span className="expense-category-badge">
                        {expense.category_name || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="expense-reference">{expense.reference || '—'}</td>
                    <td>
                      <span className="expense-payment-method">
                        {expense.payment_method === 'cash' ? 'Efectivo' :
                         expense.payment_method === 'bank_transfer' ? 'Transferencia' :
                         expense.payment_method === 'credit_card' ? 'T. Crédito' :
                         expense.payment_method === 'debit_card' ? 'T. Débito' : 'Cheque'}
                      </span>
                    </td>
                    <td className="expense-text-right expense-amount">
                      ${parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="expense-actions">
                      <button 
                        className="expense-action-btn edit" 
                        onClick={() => openEditExpense(expense)}
                        title="Editar"
                      >
                        <FiEdit2 size={14} />
                      </button>
                      <button 
                        className="expense-action-btn delete" 
                        onClick={() => handleDeleteExpense(expense)}
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="expense-footer-label">Total</td>
                  <td className="expense-text-right expense-footer-total">
                    ${filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0).toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal de gasto */}
      {showModal && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onClose={() => {
            setShowModal(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
          saving={saving}
        />
      )}

      {/* Modal de categoría */}
      {showCategoryModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowCategoryModal(false);
            setEditingCategory(null);
          }}
          onSave={handleSaveCategory}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}