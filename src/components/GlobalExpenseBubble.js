// src/components/GlobalExpenseBubble.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDrawer } from '../context/DrawerContext';
import { useSession } from '../context/SessionContext';
import { api } from '../config/api';
import { 
  FiAlertCircle, FiRefreshCw, 
  FiX, FiDollarSign 
} from 'react-icons/fi';
import { usePrinterService } from '../services/usePrinterService';

// ─── Helper para obtener fecha actual en Ecuador ────────────────────────────
function getTodayDateInEcuador() {
  const TZ = 'America/Guayaquil';
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: TZ });
}

function GlobalExpenseBubble() {
  const { user } = useSession();
  const { pendingExpense, clearExpense } = useDrawer();
  const { openCashDrawer } = usePrinterService();
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (pendingExpense) {
      loadCategories();
    }
  }, [pendingExpense]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    setError('');
    try {
      const response = await api.get('/expense-categories');
      const data = response.data || [];
      setCategories(data);
      if (data.length > 0 && !categoryId) {
        setCategoryId(data[0].id);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
      setError('Error al cargar categorías');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Ingresa un monto válido mayor a 0');
      return;
    }
    if (!categoryId) {
      setError('Selecciona una categoría');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const payload = {
        amount: parseFloat(amount),
        description: `Retiro/egreso para compras${reason ? ': ' + reason : ''}`,
        reference: reason || null,
        category_id: categoryId,
        created_by: user?.id || pendingExpense?.userId || null,
        date: getTodayDateInEcuador()
      };

      const response = await api.post('/expenses', payload);

      if (response.data) {
        setSuccess(true);
        
        // Abrir cajón
        try {
          await openCashDrawer();
        } catch (drawerError) {
          console.warn('Error abriendo cajón:', drawerError);
        }

        // Limpiar estado después de un momento
        setTimeout(() => {
          clearExpense();
          setExpanded(false);
          setAmount('');
          setReason('');
          setCategoryId('');
          setSuccess(false);
          if (pendingExpense?.onDoneCallback) {
            pendingExpense.onDoneCallback();
          }
        }, 1500);
      }
    } catch (err) {
      console.error('Error registrando gasto:', err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Error registrando el gasto';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setExpanded(false);
    setAmount('');
    setReason('');
    setCategoryId('');
    setError('');
    setSuccess(false);
    clearExpense();
  };

  // Si no hay gasto pendiente, no mostrar nada
  if (!pendingExpense) return null;

  // Estado contraído (burbuja)
  if (!expanded) {
    return ReactDOM.createPortal(
      <div
        className="global-expense-bubble collapsed"
        onClick={() => setExpanded(true)}
      >
        <FiAlertCircle size={22} className="bubble-icon" />
        <span className="bubble-text">Registrar gasto</span>
      </div>,
      document.body
    );
  }

  // Estado expandido (formulario)
  return ReactDOM.createPortal(
    <div className="global-expense-bubble expanded">
      {/* Header */}
      <div className="bubble-header" onClick={() => setExpanded(false)}>
        <FiDollarSign size={18} className="header-icon" />
        <span className="header-title">Registra lo gastado al regresar</span>
        <FiX size={18} className="header-close" />
      </div>

      {/* Formulario */}
      <form onSubmit={handleSave} className="bubble-form">
        {/* Monto */}
        <div className="form-group">
          <label htmlFor="expense-amount">Monto gastado *</label>
          <div className="input-wrapper">
            <span className="input-prefix">$</span>
            <input
              id="expense-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
              className="form-input"
            />
          </div>
        </div>

        {/* Categoría */}
        <div className="form-group">
          <label htmlFor="expense-category">Tipo de gasto *</label>
          <select
            id="expense-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={saving || loadingCategories}
            className="form-select"
          >
            <option value="" disabled>Selecciona una categoría</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon && <span className="category-icon">{cat.icon}</span>}
                {cat.name}
              </option>
            ))}
          </select>
          {loadingCategories && (
            <div className="loading-categories">
              <FiRefreshCw size={12} className="spinning" />
              <span>Cargando categorías...</span>
            </div>
          )}
        </div>

        {/* Comentario */}
        <div className="form-group">
          <label htmlFor="expense-reason">Comentario (opcional)</label>
          <textarea
            id="expense-reason"
            placeholder="Ej: Compra de insumos para la cocina"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={saving}
            rows={2}
            className="form-textarea"
          />
        </div>

        {/* Mensajes */}
        {error && (
          <div className="bubble-error">
            <FiAlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bubble-success">
            <FiAlertCircle size={14} />
            <span>✓ Gasto registrado correctamente</span>
          </div>
        )}

        {/* Botones */}
        <div className="bubble-actions">
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="btn-cancel"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !amount || !categoryId}
            className={`btn-submit ${amount && categoryId ? 'active' : ''}`}
          >
            {saving ? (
              <>
                <FiRefreshCw size={14} className="spinning" />
                Guardando...
              </>
            ) : (
              'Guardar Gasto'
            )}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}

export default GlobalExpenseBubble;