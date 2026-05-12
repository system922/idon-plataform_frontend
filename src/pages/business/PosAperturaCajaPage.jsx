import { useState, useMemo } from 'react';
import { fetchWithAuth } from '../../config/apiBase';
import { FiDollarSign, FiAlertCircle, FiBox, FiCreditCard, FiFileText, FiX } from 'react-icons/fi';
import '../../styles/AperturaCaja.css';

// Denominaciones del sistema monetario Ecuador (USD)
const MONEDAS = [
  { key: 'moneda_001', label: '1¢',  valor: 0.01 },
  { key: 'moneda_005', label: '5¢',  valor: 0.05 },
  { key: 'moneda_010', label: '10¢', valor: 0.10 },
  { key: 'moneda_025', label: '25¢', valor: 0.25 },
  { key: 'moneda_050', label: '50¢', valor: 0.50 },
  { key: 'moneda_100', label: '$1',  valor: 1.00 },
];

const BILLETES = [
  { key: 'billete_1',   label: '$1',   valor: 1   },
  { key: 'billete_5',   label: '$5',   valor: 5   },
  { key: 'billete_10',  label: '$10',  valor: 10  },
  { key: 'billete_20',  label: '$20',  valor: 20  },
  { key: 'billete_50',  label: '$50',  valor: 50  },
  { key: 'billete_100', label: '$100', valor: 100 },
];

const INIT_DENOMS = Object.fromEntries(
  [...MONEDAS, ...BILLETES].map(d => [d.key, ''])
);

function fmt(n) {
  return Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

export default function AperturaCajaPage({ onAperturaCompleta, onClose }) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  const [denoms,     setDenoms]     = useState(INIT_DENOMS);
  const [montoBanca, setMontoBanca] = useState('');
  const [observ,     setObserv]     = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  const totalEfectivo = useMemo(() => {
    let total = 0;
    for (const d of [...MONEDAS, ...BILLETES]) {
      total += (parseInt(denoms[d.key], 10) || 0) * d.valor;
    }
    return total;
  }, [denoms]);

  const totalInicial = totalEfectivo + (parseFloat(montoBanca) || 0);

  const handleDenom = (key, val) => {
    const num = val.replace(/[^0-9]/g, '');
    setDenoms(prev => ({ ...prev, [key]: num }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const operador = getOperatorUser();

    try {
      const body = { 
        date: today, 
        monto_banca: parseFloat(montoBanca) || 0, 
        observaciones: observ || null 
      };
      
      for (const d of [...MONEDAS, ...BILLETES]) {
        body[d.key] = parseInt(denoms[d.key], 10) || 0;
      }

      const res = await fetchWithAuth('/api/pos/cash-register/opening', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      const data = await res.json();

      if (res.status === 409) {
        onAperturaCompleta(data);
        return;
      }

      if (!res.ok) throw new Error(data?.error || 'Error al guardar apertura');

      const userName = operador.nombre || operador.name || operador.username || operador.email || 'Usuario';
      
      const auditPayload = {
        user_id: operador.id,
        table_name: "cash_drawer",
        action: "apertura_caja",
        description: `Registro de Apertura de caja realizado por ${userName}. Efectivo inicial: $${totalEfectivo.toFixed(2)}, Banca inicial: $${(parseFloat(montoBanca) || 0).toFixed(2)}, Total: $${totalInicial.toFixed(2)}${observ ? `. Observaciones: ${observ}` : ''}`,
        new_values: {
          efectivo_inicial: totalEfectivo,
          banca_inicial: parseFloat(montoBanca) || 0,
          total_inicial: totalInicial,
          denominaciones: denoms,
          observaciones: observ || null
        },
        reason: "Registro de Apertura"
      };

      await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify(auditPayload)
      }).catch(() => {});

      onAperturaCompleta(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="apertura-overlay">
      <div className="apertura-modal">
        {/* Botón cerrar */}
        {onClose && (
          <button className="apertura-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        )}

        {/* Cabecera */}
        <div className="apertura-header">
          <div className="apertura-header-icon">
            <FiDollarSign size={28} />
          </div>
          <div>
            <h2 className="apertura-title">Apertura de Caja</h2>
            <p className="apertura-subtitle">
              {new Date().toLocaleDateString('es-EC', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                timeZone: 'America/Guayaquil'
              })}
            </p>
          </div>
        </div>

        <p className="apertura-info">
          Cuenta el efectivo físico que tienes en caja al inicio del día. 
          Ingresa la cantidad de piezas por cada denominación.
        </p>

        {error && (
          <div className="apertura-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Monedas */}
          <div className="apertura-section">
            <div className="apertura-section-header">
              <FiBox size={14} />
              <span>Monedas</span>
            </div>
            <div className="apertura-denom-grid">
              {MONEDAS.map(d => {
                const qty = parseInt(denoms[d.key], 10) || 0;
                const subtotal = qty * d.valor;
                return (
                  <div key={d.key} className="apertura-denom-card">
                    <span className="apertura-denom-label">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={denoms[d.key]}
                      onChange={e => handleDenom(d.key, e.target.value)}
                      className="apertura-denom-input"
                    />
                    <span className="apertura-denom-sub">${fmt(subtotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Billetes */}
          <div className="apertura-section">
            <div className="apertura-section-header">
              <FiCreditCard size={14} />
              <span>Billetes</span>
            </div>
            <div className="apertura-denom-grid">
              {BILLETES.map(d => {
                const qty = parseInt(denoms[d.key], 10) || 0;
                const subtotal = qty * d.valor;
                return (
                  <div key={d.key} className="apertura-denom-card">
                    <span className="apertura-denom-label">{d.label}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={denoms[d.key]}
                      onChange={e => handleDenom(d.key, e.target.value)}
                      className="apertura-denom-input"
                    />
                    <span className="apertura-denom-sub">${fmt(subtotal)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banco */}
          <div className="apertura-bank-card">
            <div className="apertura-bank-header">
              <FiFileText size={14} />
              <span>Monto en banca al iniciar el día</span>
            </div>
            <div className="apertura-bank-input-wrap">
              <span className="apertura-bank-prefix">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={montoBanca}
                onChange={e => setMontoBanca(e.target.value)}
                className="apertura-bank-input"
              />
            </div>
          </div>

          {/* Observaciones */}
          <textarea
            className="apertura-obs"
            placeholder="Observaciones (opcional)"
            value={observ}
            onChange={e => setObserv(e.target.value)}
            rows={3}
          />

          {/* Totales */}
          <div className="apertura-totals">
            <div className="apertura-total-row">
              <span>Total efectivo contado</span>
              <span className="apertura-total-val">${fmt(totalEfectivo)}</span>
            </div>
            <div className="apertura-total-row">
              <span>Monto en banca</span>
              <span className="apertura-total-val">${fmt(parseFloat(montoBanca) || 0)}</span>
            </div>
            <div className="apertura-total-row apertura-total-row--main">
              <span>Total inicial del día</span>
              <span className="apertura-total-val apertura-total-val--main">${fmt(totalInicial)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="apertura-submit"
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Aperturar caja'}
          </button>
        </form>
      </div>
    </div>
  );
}