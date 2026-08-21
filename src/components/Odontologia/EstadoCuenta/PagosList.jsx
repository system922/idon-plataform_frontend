// components/Odontologia/EstadoCuenta/components/PagosList.jsx

import React from 'react';
import { FiClock } from 'react-icons/fi';
import { fmt, getMetodoPagoLabel, formatDate } from '../../../utils/helpers';

const PagosList = ({ pagos, currencySymbol }) => {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>Historial de pagos</h4>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Movimientos registrados</span>
      </div>
      {pagos.length === 0 ? (
        <div className="odont-empty-state">No hay pagos registrados</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pagos.map((pago) => (
            <div key={pago.id} className="odont-info-card" style={{ alignItems: 'flex-start' }}>
              <strong>{pago.reason || 'Pago'}</strong>
              <span>{formatDate(pago.date) || '—'} · {pago.doctor || '—'}</span>
              <small>{pago.comment || 'Sin comentario'}</small>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{fmt(currencySymbol, pago.price || 0)}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {getMetodoPagoLabel(pago.method)}
                </span>
                {pago.reference && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                    Ref: {pago.reference}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PagosList;