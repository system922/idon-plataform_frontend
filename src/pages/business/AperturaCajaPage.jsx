import { useState, useMemo } from 'react';
import { fetchWithAuth } from '../../config/apiBase';
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

export default function AperturaCajaPage({ onAperturaCompleta }) {
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
    try {
      const body = { date: today, monto_banca: parseFloat(montoBanca) || 0, observaciones: observ || null };
      for (const d of [...MONEDAS, ...BILLETES]) {
        body[d.key] = parseInt(denoms[d.key], 10) || 0;
      }
      const res  = await fetchWithAuth('/api/pos/cash-register/opening', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json();

      // 409 = la apertura ya fue registrada hoy → tratarlo como éxito
      if (res.status === 409) {
        onAperturaCompleta(data);
        return;
      }

      if (!res.ok) throw new Error(data?.error || 'Error al guardar apertura');
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

        {/* Cabecera */}
        <div className="apertura-header">
          <div className="apertura-header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 7V5a2 2 0 0 0-4 0v2"/>
              <line x1="12" y1="12" x2="12" y2="16"/>
              <line x1="10" y1="14" x2="14" y2="14"/>
            </svg>
          </div>
          <div>
            <h2 className="apertura-title">Apertura de Caja</h2>
            <p className="apertura-subtitle">
              {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <p className="apertura-info">
          Cuenta el efectivo físico que tienes en caja al inicio del día. Ingresa la cantidad de piezas por cada denominación.
        </p>

        {error && <div className="apertura-error">{error}</div>}

        <form onSubmit={handleSubmit} autoComplete="off">

          {/* Monedas */}
          <div className="apertura-section-label">
            <span className="apertura-badge apertura-badge--coin">Monedas</span>
          </div>
          <div className="apertura-denom-grid">
            {MONEDAS.map(d => {
              const qty      = parseInt(denoms[d.key], 10) || 0;
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

          {/* Billetes */}
          <div className="apertura-section-label" style={{ marginTop: 20 }}>
            <span className="apertura-badge apertura-badge--bill">Billetes</span>
          </div>
          <div className="apertura-denom-grid">
            {BILLETES.map(d => {
              const qty      = parseInt(denoms[d.key], 10) || 0;
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

          {/* Banco */}
          <div className="apertura-bank-row">
            <div className="apertura-bank-label">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="10" width="18" height="11" rx="2"/>
                <path d="M3 10l9-7 9 7"/>
                <line x1="12" y1="10" x2="12" y2="21"/>
              </svg>
              Monto en banca al iniciar el día
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
            rows={2}
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
