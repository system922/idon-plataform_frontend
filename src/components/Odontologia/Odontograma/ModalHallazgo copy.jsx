// src/components/Odontologia/ModalHallazgo.jsx
import React, { useState } from 'react';
import { FiX, FiCheck, FiTrash2 } from 'react-icons/fi';
import { CONDITION_MAP, SURFACE_OPTIONS } from '.';
import { HALLAZGOS_GLOBALES, HALLAZGOS_CON_SUPERFICIE } from '../Odontograma/OdontogramaConstants';

const ModalHallazgo = ({ toothNumber, currentData, onSave, onClose }) => {
  const [selectedCondition, setSelectedCondition] = useState(currentData?.condition || '');
  const [observations, setObservations] = useState(currentData?.observations || '');
  const [selectedSurfaces, setSelectedSurfaces] = useState(currentData?.surfaces || []);
  const [showOptions, setShowOptions] = useState(false);

  // ✅ Verificar si el hallazgo seleccionado es global
  const esGlobal = HALLAZGOS_GLOBALES.includes(selectedCondition);
  const esSuperficial = HALLAZGOS_CON_SUPERFICIE.includes(selectedCondition);

  const handleSave = () => {
    // ✅ Si es global, NO guardamos superficies ni caras
    const surfacesToSave = esGlobal ? [] : selectedSurfaces;
    const carasToSave = esGlobal 
      ? {} 
      : surfacesToSave.reduce((acc, surf) => {
          acc[surf] = selectedCondition;
          return acc;
        }, {});
    
    // ✅ SIEMPRE guardar condition, incluso si es global
    onSave({
      condition: selectedCondition,  // ← ESTO ES LO QUE FALTA
      observations,
      surfaces: surfacesToSave,
      caras: carasToSave,
    });
  };

  const handleDeleteHallazgo = () => {
    onSave({
      condition: '',
      observations: observations,
      surfaces: [],
      caras: {},
    });
    onClose();
  };

  const toggleSurface = (surf) => {
    setSelectedSurfaces(prev =>
      prev.includes(surf) ? prev.filter(s => s !== surf) : [...prev, surf]
    );
  };

  const selectedHallazgo = selectedCondition ? CONDITION_MAP[selectedCondition] : null;

  // Título dinámico
  const title = `Pieza #${toothNumber} - ${selectedHallazgo?.label || 'Sin hallazgo'}`;

  const renderIcon = (icon) => {
    if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('data:') || icon.includes('.png') || icon.includes('.svg'))) {
      return <img src={icon} alt="icono" style={{ width: 24, height: 24, objectFit: 'contain' }} />;
    }
    return <span style={{ fontSize: 20 }}>{icon}</span>;
  };

  return (
    <div className="odont-modal-overlay" onClick={onClose}>
      <div className="odont-modal" onClick={e => e.stopPropagation()}>
        <div className="odont-modal-header">
          <h3>{title}</h3>
          <button className="odont-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>
        <div className="odont-modal-body">
          {/* Selector de hallazgo con opción "Sin hallazgo" */}
          <div className="form-group">
            <label>Elige el tipo de hallazgo (opcional)</label>
            
            <div 
              className="odont-hallazgo-selector"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setShowOptions(!showOptions)}
            >
              {selectedHallazgo ? (
                <>
                  {renderIcon(selectedHallazgo.icon)}
                  <span>{selectedHallazgo.label}</span>
                  {esGlobal && (
                    <span style={{
                      marginLeft: 4,
                      fontSize: 10,
                      background: '#ef4444',
                      color: '#fff',
                      padding: '1px 8px',
                      borderRadius: 10,
                      fontWeight: 600,
                    }}>
                      Global
                    </span>
                  )}
                </>
              ) : (
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Sin hallazgo</span>
              )}
              <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)' }}>▼</span>
            </div>

            {/* Opciones desplegables */}
            {showOptions && (
              <div 
                className="odont-hallazgo-options"
                style={{
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.1)',
                  padding: 4,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 4,
                }}
              >
                {/* Opción "Sin hallazgo" */}
                <div
                  className={`odont-hallazgo-option ${selectedCondition === '' ? 'selected' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: selectedCondition === '' ? 'rgba(104,66,254,0.3)' : 'transparent',
                    transition: 'all 0.15s',
                    border: selectedCondition === '' ? '1px solid #6842fe' : '1px solid transparent',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCondition('');
                    setShowOptions(false);
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCondition !== '') {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCondition !== '') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: 18 }}>🚫</span>
                  <span style={{ fontSize: 13 }}>Sin hallazgo</span>
                  {selectedCondition === '' && <FiCheck size={14} color="#6842fe" style={{ marginLeft: 'auto' }} />}
                </div>

                {/* Opciones de CONDITION_MAP */}
                {Object.entries(CONDITION_MAP).map(([key, val]) => {
                  const esGlobalOption = HALLAZGOS_GLOBALES.includes(key);
                  return (
                    <div
                      key={key}
                      className={`odont-hallazgo-option ${selectedCondition === key ? 'selected' : ''}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: selectedCondition === key ? 'rgba(104,66,254,0.3)' : 'transparent',
                        transition: 'all 0.15s',
                        border: selectedCondition === key ? '1px solid #6842fe' : '1px solid transparent',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCondition(key);
                        setShowOptions(false);
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCondition !== key) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCondition !== key) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {renderIcon(val.icon)}
                      <span style={{ fontSize: 13 }}>{val.label}</span>
                      {esGlobalOption && (
                        <span style={{
                          fontSize: 8,
                          background: '#ef4444',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: 8,
                          marginLeft: 'auto',
                        }}>
                          Global
                        </span>
                      )}
                      {selectedCondition === key && <FiCheck size={14} color="#6842fe" style={{ marginLeft: 'auto' }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ✅ Superficies afectadas - solo para hallazgos que requieren superficie */}
          {esSuperficial && (
            <div className="form-group">
              <label>Superficies afectadas</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SURFACE_OPTIONS.map(surf => (
                  <button
                    key={surf}
                    onClick={() => toggleSurface(surf)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: '1px solid rgba(255,255,255,0.2)',
                      background: selectedSurfaces.includes(surf) ? '#6842fe' : 'transparent',
                      color: selectedSurfaces.includes(surf) ? '#fff' : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {surf.charAt(0).toUpperCase() + surf.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ✅ Mensaje para hallazgos globales */}
          {esGlobal && (
            <div className="form-group">
              <div style={{
                padding: '8px 12px',
                background: 'rgba(251, 191, 36, 0.15)',
                borderRadius: 6,
                border: '1px solid #fcd34d',
                color: '#92400e',
                fontSize: '13px'
              }}>
                <span>⚠️ Este hallazgo afecta a <strong>todo el diente</strong>, no requiere seleccionar superficies específicas.</span>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              placeholder="Detalles adicionales..."
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="odont-btn-primary" onClick={handleSave} style={{ flex: 1 }}>
              Guardar
            </button>
            <button 
              className="odont-btn-secondary" 
              onClick={handleDeleteHallazgo}
              style={{ 
                background: 'rgba(239,68,68,0.15)', 
                border: '1px solid #ef4444',
                color: '#ef4444',
                flex: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
              }}
            >
              <FiTrash2 size={16} /> Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalHallazgo;