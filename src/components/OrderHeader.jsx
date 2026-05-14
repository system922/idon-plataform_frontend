import React, { useState } from 'react';
import { FiChevronDown, FiMapPin, FiFileText } from 'react-icons/fi';

export default function OrderHeader({
  orderType,
  setOrderType,
  numeroMesa,
  setNumeroMesa,
  mesaId,
  setMesaId,
  notas,
  setNotas
}) {
  const [showUbicacion, setShowUbicacion] = useState(false);
  const [showNotas, setShowNotas] = useState(false);

  return (
    <section className="card card-soft">
      <div className="card-head">
        <h3>Datos de la orden</h3>
      </div>
      <div className="form-grid form-grid-3col">

        {/* TIPO */}
        <div className="field">
          <label>Tipo</label>
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="dine_in">Local</option>
            <option value="take_away">Llevar</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

        {/* N° MESA */}
        <div className="field">
          <label>N° Mesa</label>
          <input
            type="number"
            value={numeroMesa}
            onChange={(e) => setNumeroMesa(e.target.value)}
            placeholder="1, 2, 3..."
            min="1"
            disabled={orderType !== 'dine_in'}
          />
        </div>

        {/* UBICACIÓN — collapsible */}
        <div className="field order-field-ubicacion">
          <button
            type="button"
            className="collapsible-label"
            onClick={() => setShowUbicacion(v => !v)}
          >
            <FiMapPin size={12} />
            <span>Ubicación</span>
            <FiChevronDown size={13} className={showUbicacion ? 'chev-open' : ''} />
          </button>
          {showUbicacion && (
            <input
              type="text"
              value={mesaId}
              onChange={(e) => setMesaId(e.target.value)}
              placeholder="A-1, Interior-5..."
              disabled={orderType !== 'dine_in'}
              style={{
                opacity: orderType === 'dine_in' ? 1 : 0.5,
                cursor: orderType === 'dine_in' ? 'text' : 'not-allowed',
                marginTop: 6
              }}
            />
          )}
        </div>

        {/* NOTAS — collapsible, full width */}
        <div className="field field-full">
          <button
            type="button"
            className="collapsible-label"
            onClick={() => setShowNotas(v => !v)}
          >
            <FiFileText size={12} />
            <span>Notas</span>
            <FiChevronDown size={13} className={showNotas ? 'chev-open' : ''} />
          </button>
          {showNotas && (
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Instrucciones especiales..."
              rows={3}
              style={{ marginTop: 6 }}
            />
          )}
        </div>

      </div>
    </section>
  );
}
