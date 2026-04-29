import React from 'react';

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
  return (
    <section className="card card-soft">
      <div className="card-head">
        <h3>Datos de la orden</h3>
      </div>
      <div className="form-grid form-grid-3col">
        {/* Línea 1: Tipo | Mesa | Ubicación */}
        <div className="field">
          <label>Tipo</label>
          <select value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="dine_in">Local</option>
            <option value="take_away">Llevar</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>

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

        <div className="field">
          <label>Ubicación</label>
          <input
            type="text"
            value={mesaId}
            onChange={(e) => setMesaId(e.target.value)}
            placeholder="A-1, Interior-5..."
            disabled={orderType !== 'dine_in'}
            style={{
              opacity: orderType === 'dine_in' ? 1 : 0.5,
              cursor: orderType === 'dine_in' ? 'text' : 'not-allowed'
            }}
          />
        </div>

        {/* SOLO Notas */}
        <div className="field field-full">
          <label>Notas</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Instrucciones especiales..."
            rows={3}
          />
        </div>
      </div>
    </section>
  );
}