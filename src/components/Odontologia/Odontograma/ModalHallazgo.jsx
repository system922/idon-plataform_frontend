// src/components/Odontologia/Odontograma/ModalHallazgo.jsx
import React, { useState } from 'react';
import { FiX, FiCheck, FiTrash2, FiAlertCircle } from 'react-icons/fi';
import { CONDITION_MAP, SURFACE_OPTIONS } from '.';
import { 
  HALLAZGOS_GLOBALES, 
  HALLAZGOS_CON_SUPERFICIE,
  CONDICIONES_FAVORABLES,
} from '../Odontograma/OdontogramaConstants';

const ModalHallazgo = ({ toothNumber, currentData, onSave, onClose }) => {
  const [selectedCondition, setSelectedCondition] = useState(currentData?.condition || '');
  const [observations, setObservations] = useState(currentData?.observations || '');
  const [selectedSurfaces, setSelectedSurfaces] = useState(currentData?.surfaces || []);
  const [showOptions, setShowOptions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ Verificar si el hallazgo seleccionado es global
  const esGlobal = HALLAZGOS_GLOBALES.includes(selectedCondition);
  const esSuperficial = HALLAZGOS_CON_SUPERFICIE.includes(selectedCondition);

  // ✅ Verificar si el hallazgo requiere superficie
  const requiereSuperficie = esSuperficial && !esGlobal;

  const handleSave = () => {
    // ✅ Validar: si requiere superficie y no hay superficies seleccionadas
    if (requiereSuperficie && selectedSurfaces.length === 0) {
      setErrorMessage('Debes seleccionar al menos una superficie para este hallazgo.');
      return;
    }

    setErrorMessage('');

    // ✅ Si es global, NO guardamos superficies ni caras
    const surfacesToSave = esGlobal ? [] : selectedSurfaces;
    const carasToSave = esGlobal 
      ? {} 
      : surfacesToSave.reduce((acc, surf) => {
          acc[surf] = selectedCondition;
          return acc;
        }, {});
    
    onSave({
      condition: selectedCondition,
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
    // Limpiar error al seleccionar una superficie
    if (errorMessage) setErrorMessage('');
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
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div 
        className="odonto-modal" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        {/* HEADER con clase primary */}
        <div className="odonto-modal-header primary">
          <div>
            <h3>{title}</h3>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        
        <div className="odonto-modal-body">
          {/* Selector de hallazgo */}
          <div className="form-group">
            <label style={{ 
              color: '#1a1f2a !important', 
              fontWeight: 700, 
              display: 'block !important', 
              marginBottom: '6px !important',
              fontSize: '13px !important',
              textTransform: 'uppercase !important',
              letterSpacing: '0.3px !important',
            }}>
              Selecciona el tipo de hallazgo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            
            <div 
              className="odont-hallazgo-selector"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#f1f5f9',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
                color: '#1a1f2a',
              }}
              onClick={() => setShowOptions(!showOptions)}
            >
              {selectedHallazgo ? (
                <>
                  {renderIcon(selectedHallazgo.icon)}
                  <span style={{ color: '#1a1f2a' }}>{selectedHallazgo.label}</span>
                </>
              ) : (
                <span style={{ color: '#6b7280' }}>Sin hallazgo</span>
              )}
              <span style={{ marginLeft: 'auto', color: '#6b7280' }}>▼</span>
            </div>

            {/* Opciones desplegables */}
            {showOptions && (
              <div 
                className="odont-hallazgo-options"
                style={{
                  marginTop: 4,
                  maxHeight: 200,
                  overflowY: 'auto',
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  padding: 4,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 4,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                    background: selectedCondition === '' ? 'rgba(104,66,254,0.15)' : 'transparent',
                    transition: 'all 0.15s',
                    border: selectedCondition === '' ? '1px solid #6842fe' : '1px solid transparent',
                    color: '#1a1f2a',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCondition('');
                    setSelectedSurfaces([]);
                    setShowOptions(false);
                    setErrorMessage('');
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCondition !== '') {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCondition !== '') {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: 13, color: '#1a1f2a' }}>Sin hallazgo</span>
                  {selectedCondition === '' && <FiCheck size={14} color="#6842fe" style={{ marginLeft: 'auto' }} />}
                </div>

                {/* Opciones de CONDITION_MAP */}
                {Object.entries(CONDITION_MAP).map(([key, val]) => {
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
                        background: selectedCondition === key ? 'rgba(104,66,254,0.15)' : 'transparent',
                        transition: 'all 0.15s',
                        border: selectedCondition === key ? '1px solid #6842fe' : '1px solid transparent',
                        color: '#1a1f2a',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCondition(key);
                        // ✅ Si es global, limpiar superficies
                        if (HALLAZGOS_GLOBALES.includes(key)) {
                          setSelectedSurfaces([]);
                        }
                        setShowOptions(false);
                        setErrorMessage('');
                      }}
                      onMouseEnter={(e) => {
                        if (selectedCondition !== key) {
                          e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedCondition !== key) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {renderIcon(val.icon)}
                      <span style={{ fontSize: 13, color: '#1a1f2a' }}>{val.label}</span>
                      {selectedCondition === key && <FiCheck size={14} color="#6842fe" style={{ marginLeft: 'auto' }} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ✅ Superficies afectadas - solo para hallazgos que requieren superficie */}
          {requiereSuperficie && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label style={{ 
                display: 'flex !important', 
                alignItems: 'center !important', 
                gap: '8px !important', 
                color: '#1a1f2a !important', 
                fontWeight: 700, 
                marginBottom: '6px !important',
                fontSize: '13px !important',
                textTransform: 'uppercase !important',
                letterSpacing: '0.3px !important',
              }}>
                Superficies afectadas
                <span style={{ fontSize: 11, color: '#ef4444' }}>* </span>
                <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'none', fontWeight: 400 }}>
                   (Selecciona al menos una)
                </span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SURFACE_OPTIONS.map(surf => (
                  <button
                    key={surf}
                    onClick={() => toggleSurface(surf)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 20,
                      border: selectedSurfaces.includes(surf) ? '1px solid #6842fe' : '1px solid #d1d5db',
                      background: selectedSurfaces.includes(surf) ? '#6842fe' : '#f1f5f9',
                      color: selectedSurfaces.includes(surf) ? '#fff' : '#1a1f2a',
                      cursor: 'pointer',
                      fontSize: 13,
                      transition: 'all 0.2s',
                      fontWeight: selectedSurfaces.includes(surf) ? 600 : 400,
                    }}
                  >
                    {surf.charAt(0).toUpperCase() + surf.slice(1)}
                  </button>
                ))}
              </div>
              
              {/* ✅ Mensaje de error cuando no hay superficies seleccionadas */}
              {errorMessage && (
                <div style={{
                  marginTop: 8,
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 6,
                  border: '1px solid #ef4444',
                  color: '#dc2626',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <FiAlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* ✅ Mensaje para hallazgos globales */}
          {esGlobal && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <div style={{
                padding: '10px 14px',
                background: 'rgba(251, 191, 36, 0.15)',
                borderRadius: 6,
                border: '1px solid #f59e0b',
                color: '#92400e',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>Este hallazgo no requiere seleccionar superficies específicas.</span>
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label style={{ 
              color: '#1a1f2a !important', 
              fontWeight: 700, 
              display: 'block !important', 
              marginBottom: '6px !important',
              fontSize: '13px !important',
              textTransform: 'uppercase !important',
              letterSpacing: '0.3px !important',
            }}>
              Observaciones
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={2}
              placeholder="Detalles adicionales..."
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#f1f5f9',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                color: '#1a1f2a',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.currentTarget.borderColor = '#6842fe';
                e.currentTarget.background = '#ffffff';
              }}
              onBlur={(e) => {
                e.currentTarget.borderColor = '#d1d5db';
                e.currentTarget.background = '#f1f5f9';
              }}
            />
          </div>

          {/* FOOTER con botones */}
          <div className="odonto-modal-footer" style={{ 
            padding: '16px 0 0 0', 
            borderTop: 'none',
            background: 'transparent',
            borderRadius: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
          }}>
            <button 
              className="odont-btn-secondary" 
              onClick={handleDeleteHallazgo}
              style={{ 
                background: 'rgba(239,68,68,0.1)', 
                border: '1px solid #ef4444',
                color: '#dc2626',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                transition: 'all 0.2s',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
            >
              <FiTrash2 size={16} /> Eliminar
            </button>
            <button 
              className="odont-btn-primary" 
              onClick={handleSave}
              style={{ 
                background: 'linear-gradient(135deg, #6842fe, #4a1dcc)',
                border: 'none',
                color: '#fff',
                padding: '10px 28px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s',
                fontSize: '14px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4a1dcc, #3a15a0)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #6842fe, #4a1dcc)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalHallazgo;