import React from 'react';
import { FiPlus, FiPackage } from 'react-icons/fi';
import { fmt, formatDate } from '../../../utils/helpers';

const LaboratoriosList = ({ laboratorios, currencySymbol, onNuevoLaboratorio }) => {
  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>Órdenes de Lab.</h4>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Órdenes sugeridas y derivadas</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="odont-btn-primary" style={{ fontSize: 12 }} onClick={onNuevoLaboratorio}>
          <FiPlus /> Nuevo
        </button>
      </div>
      {laboratorios.length === 0 ? (
        <div className="odont-empty-state">No hay órdenes de laboratorio</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {laboratorios.map((orden) => (
            <div key={orden.id} className="odont-info-card" style={{ alignItems: 'flex-start' }}>
              <strong>{orden.reason || 'Orden'}</strong>
              <span>{formatDate(orden.date) || '—'} · {orden.doctor || '—'}</span>
              <small>{orden.comment || 'Sin comentario'}</small>
              <span style={{ color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                Valor referencial: {fmt(currencySymbol, orden.price || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default LaboratoriosList;