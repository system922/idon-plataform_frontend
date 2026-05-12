// src/components/GlobalExpenseBubble.jsx (versión completa mejorada)
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDrawer } from '../context/DrawerContext';
import { fetchWithAuth } from '../config/apiBase';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { usePrinterService } from '../services/usePrinterService';

// ─── Helper para obtener fecha actual en Ecuador ────────────────────────────
function getTodayDateInEcuador() {
  const TZ = 'America/Guayaquil';
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: TZ });
}

function GlobalExpenseBubble() {
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

  useEffect(() => {
    if (pendingExpense) {
      loadCategories();
    }
  }, [pendingExpense]);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const res = await fetchWithAuth('/api/expense-categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !categoryId) {
          setCategoryId(data[0].id);
        }
      } else {

      }
    } catch (err) {

    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) {
      setError('Monto inválido');
      return;
    }
    if (!categoryId) {
      setError('Selecciona una categoría');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        amount: parseFloat(amount),
        description: `Retiro/egreso para compras${reason ? ': ' + reason : ''}`,
        reference: reason || null,   // ✅ Cambiado: antes era "notes"
        category_id: categoryId,
        created_by: pendingExpense?.userId || null,
        date: getTodayDateInEcuador()
      };

      const resp = await fetchWithAuth('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errorText = await resp.text();

        let errorMsg;
        try {
          const data = JSON.parse(errorText);
          errorMsg = data?.error || data?.message || 'Error registrando el gasto';
        } catch {
          errorMsg = errorText || `Error ${resp.status}: ${resp.statusText}`;
        }
        setError(errorMsg);
        return;
      }
      const data = await resp.json();

      await openCashDrawer().catch(() => {});
      clearExpense();
      setExpanded(false);
      if (pendingExpense?.onDoneCallback) pendingExpense.onDoneCallback();
    } catch (err) {

      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!pendingExpense) return null;

  if (!expanded) {
    return ReactDOM.createPortal(
      <div
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          background: '#f39c12', borderRadius: 50, padding: '14px 20px',
          boxShadow: '0 6px 24px rgba(243,156,18,0.5)',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', userSelect: 'none',
          animation: 'pulse-bubble 2s infinite',
        }}
      >
        <FiAlertCircle size={22} color="#1a1a2e" />
        <span style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
          Registrar gasto
        </span>
      </div>,
      document.body
    );
  }

  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: '#1a1a2e', border: '2px solid #f39c12',
      borderRadius: 16, padding: '16px 18px', width: 320,
      boxShadow: '0 8px 32px rgba(243,156,18,0.45)',
    }}>
      <div
        onClick={() => setExpanded(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer' }}
      >
        <FiAlertCircle size={18} color="#f39c12" />
        <span style={{ color: '#f39c12', fontWeight: 700, fontSize: 13, flex: 1 }}>
          Registra lo gastado al regresar
        </span>
        <span style={{ color: '#f39c12', fontSize: 18, lineHeight: 1 }}>›</span>
      </div>

      <form onSubmit={handleSave}>
        <input
          type="number" min="0" step="0.01"
          placeholder="Monto gastado *"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          disabled={saving}
          required
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 8,
            border: '1px solid #ffffff33', background: '#0d0d1a',
            color: '#fff', fontSize: 13, marginBottom: 8, boxSizing: 'border-box',
          }}
        />

        <div style={{ marginBottom: 8 }}>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            disabled={saving || loadingCategories}
            required
            style={{
              width: '100%', padding: '7px 10px', borderRadius: 8,
              border: '1px solid #ffffff33', background: '#0d0d1a',
              color: '#fff', fontSize: 13, boxSizing: 'border-box',
            }}
          >
            <option value="" disabled>Selecciona tipo de gasto</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {loadingCategories && (
            <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
              <FiRefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} /> Cargando categorías...
            </div>
          )}
        </div>

        <textarea
          placeholder="Comentario de la compra (opcional)"
          value={reason}
          onChange={e => setReason(e.target.value)}
          disabled={saving}
          rows={2}
          style={{
            width: '100%', padding: '7px 10px', borderRadius: 8,
            border: '1px solid #ffffff33', background: '#0d0d1a',
            color: '#fff', fontSize: 13, marginBottom: 8,
            resize: 'none', boxSizing: 'border-box',
          }}
        />
        {error && <div style={{ color: '#e74c3c', fontSize: 12, marginBottom: 6 }}>{error}</div>}
        <button
          type="submit"
          disabled={saving || !amount || !categoryId}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 8,
            background: amount && categoryId ? '#27ae60' : '#555',
            color: '#fff', border: 'none', fontWeight: 700, fontSize: 13,
            cursor: amount && categoryId ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Gasto'}
        </button>
      </form>
    </div>,
    document.body
  );
}

export default GlobalExpenseBubble;