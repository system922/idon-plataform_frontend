// components/Odontologia/Odontograma/OdontogramaMultipleSelection.jsx
import React from 'react';
import { FiLayers, FiCheckCircle, FiCircle } from 'react-icons/fi';
import { CONDITION_MAP } from '../Odontograma';

export default function OdontogramaMultipleSelection({
  selectedMultiple,
  hallazgoMultiple,
  setHallazgoMultiple,
  notaMultiple,
  setNotaMultiple,
  surfacesMultiple,
  handleBatchSurfaceToggle,
  applyMultiple,
  setModoMultiple,
  setSelectedMultiple,
}) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      gap: '12px', 
      padding: '10px 10px',
      background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
      borderBottom: '2px solid #10b981',
      borderLeft: '4px solid #10b981',
      margin: '0'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiLayers size={20} style={{ color: '#10b981' }} />
          <strong style={{ fontSize: '12px', color: '#0f172a' }}>
            Selección múltiple
          </strong>
          <span style={{ 
            background: '#10b981', 
            color: '#fff', 
            padding: '2px 12px', 
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600
          }}>
            {selectedMultiple.length} dientes seleccionados
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          Aplica el mismo hallazgo a varias piezas dentales
        </span>
      </div>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        alignItems: 'center',
        background: '#ffffff',
        padding: '5px 5px',
        borderRadius: '8px',
        border: '1px solid #d1fae5'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Hallazgo:</span>
          <select 
            value={hallazgoMultiple} 
            onChange={(e) => setHallazgoMultiple(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '11px',
              background: '#fff',
              minWidth: '50px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {Object.entries(CONDITION_MAP).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Nota:</span>
          <input
            type="text"
            value={notaMultiple}
            onChange={(e) => setNotaMultiple(e.target.value)}
            placeholder="Observación para los dientes seleccionados"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '11px',
              flex: '1',
              minWidth: '150px',
              background: '#fff',
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '10px', 
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Superficies:</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['vestibular', 'mesial', 'distal', 'lingual', 'oclusal'].map((surface) => {
              const isActive = surfacesMultiple.includes(surface);
              return (
                <button
                  key={surface}
                  type="button"
                  onClick={() => handleBatchSurfaceToggle(surface)}
                  style={{
                    padding: '2px 12px',
                    borderRadius: '6px',
                    border: isActive ? '1px solid #10b981' : '1px solid #e2e8f0',
                    background: isActive ? 'linear-gradient(135deg, #10b981, #059669)' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none'
                  }}
                >
                  {surface.charAt(0).toUpperCase() + surface.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={applyMultiple}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
          >
            <FiCheckCircle size={16} /> Aplicar a seleccionados
          </button>
          <button
            onClick={() => {
              setSelectedMultiple([]);
              setModoMultiple(false);
            }}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiCircle size={16} /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}