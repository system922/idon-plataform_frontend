// components/Odontologia/Plantillas/PlantillaDetailModal.jsx
import React from 'react';
import { FiX, FiEdit, FiCopy, FiClock, FiAlertCircle, FiActivity, FiInfo, FiList } from 'react-icons/fi';

export default function PlantillaDetailModal({ 
  isOpen, 
  onClose, 
  plantilla, 
  onEdit,
  onDuplicate 
}) {
  if (!isOpen || !plantilla) return null;

  // Obtener el tipo del primer medicamento (si existe)
  const getTipoBadge = (tipo) => {
    const tipos = {
      antibiotico: { label: 'Antibiótico', class: 'antibiotico' },
      analgesico: { label: 'Analgésico', class: 'analgesico' },
      corticoide: { label: 'Corticoide', class: 'corticoide' },
      antifungico: { label: 'Antifúngico', class: 'antifungico' },
      antiviral: { label: 'Antiviral', class: 'antiviral' },
      combinacion: { label: 'Combinación', class: 'combinacion' }
    };
    return tipos[tipo] || { label: tipo || 'Otro', class: 'otro' };
  };

  const getCategoriaLabel = (categoria) => {
    const categorias = {
      infeccion: 'Infección',
      infeccion_severa: 'Infección Severa',
      alergia_penicilina: 'Alergia a Penicilina',
      alternativa_penicilina: 'Alternativa a Penicilina',
      antiinflamatorio: 'Antiinflamatorio',
      dolor_intenso: 'Dolor Intenso',
      dolor_leve: 'Dolor Leve',
      inflamacion_severa: 'Inflamación Severa',
      candidiasis: 'Candidiasis',
      herpes: 'Herpes',
      infeccion_dolor: 'Infección + Dolor',
      alergia_dolor_intenso: 'Alergia + Dolor Intenso'
    };
    return categorias[categoria] || categoria || 'Sin categoría';
  };

  // Mostrar información del primer medicamento para el resumen
  const primerMedicamento = plantilla.medicamentos?.[0] || {};
  const tipoBadge = getTipoBadge(primerMedicamento.tipo_nombre?.toLowerCase());
  const categoriaLabel = primerMedicamento.categoria_nombre || 'Sin categoría';

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal odonto-modal-detail" onClick={e => e.stopPropagation()}>
        <div className="odonto-modal-header blue">
          <div>
            <h3>Detalles de Plantilla</h3>
            <p>{plantilla.nombre}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="odonto-modal-body odonto-detail-body">
          {/* Header con nombre y tipo */}
          <div className="odonto-detail-header-info">
            <div className="odonto-detail-name-title">
              <FiActivity size={20} />
              <h2>{plantilla.nombre}</h2>
            </div>
            {primerMedicamento.tipo_nombre && (
              <span className={`odonto-badge-tipo ${tipoBadge.class}`}>
                {tipoBadge.label}
              </span>
            )}
          </div>

          {/* Descripción */}
          {plantilla.descripcion && (
            <div className="odonto-detail-section">
              <h4>Descripción</h4>
              <p className="odonto-description-text">{plantilla.descripcion}</p>
            </div>
          )}

          {/* Información principal */}
          <div className="odonto-detail-grid-two">
            <div className="odonto-detail-item">
              <div className="odonto-detail-label">
                <FiInfo size={16} />
                <span>Categoría</span>
              </div>
              <div className="odonto-detail-value">
                <span className="odonto-badge odonto-badge-gray">
                  {categoriaLabel}
                </span>
              </div>
            </div>

            <div className="odonto-detail-item">
              <div className="odonto-detail-label">
                <FiClock size={16} />
                <span>Duración</span>
              </div>
              <div className="odonto-detail-value">
                {plantilla.duracion || 'No especificada'}
              </div>
            </div>
          </div>

          {/* Medicamentos - Lista completa */}
          <div className="odonto-detail-section">
            <div className="odonto-detail-section-header">
              <FiList className="odonto-detail-section-icon" />
              <h4 className="odonto-detail-section-title">
                Medicamentos ({plantilla.medicamentos?.length || 0})
              </h4>
            </div>
            <div className="odonto-med-list">
              {plantilla.medicamentos?.length > 0 ? (
                plantilla.medicamentos.map((med, idx) => (
                  <div key={idx} className="odonto-med-item" style={{
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div className="odonto-med-header" style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '4px'
                    }}>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                        {med.medicamento_nombre || med.name || 'Medicamento sin nombre'}
                      </strong>
                      {med.dosis_especifica && (
                        <span className="odonto-med-dosage" style={{
                          background: '#dbeafe',
                          color: '#1e40af',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {med.dosis_especifica}
                        </span>
                      )}
                    </div>
                    <div className="odonto-med-info" style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px 16px',
                      fontSize: '13px',
                      color: '#475569'
                    }}>
                      {med.frecuencia_especifica && (
                        <span>
                          <strong>Frecuencia:</strong> {med.frecuencia_especifica}
                        </span>
                      )}
                      {med.notas && (
                        <span>
                          <strong>Notas:</strong> {med.notas}
                        </span>
                      )}
                      {med.tipo_nombre && (
                        <span>
                          <strong>Tipo:</strong> {med.tipo_nombre}
                        </span>
                      )}
                      {med.categoria_nombre && (
                        <span>
                          <strong>Categoría:</strong> {med.categoria_nombre}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
                  No hay medicamentos asociados a esta plantilla
                </p>
              )}
            </div>
          </div>

          {/* Instrucciones */}
          {plantilla.instrucciones && (
            <div className="odonto-detail-section">
              <h4>Instrucciones Generales</h4>
              <p className="odonto-instructions-text" style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                whiteSpace: 'pre-wrap'
              }}>
                {plantilla.instrucciones}
              </p>
            </div>
          )}

          {/* Advertencia */}
          {plantilla.advertencias && (
            <div className="odonto-detail-section">
              <h4>Advertencia / Contraindicación</h4>
              <div className="odonto-warning-box" style={{
                background: '#fef2f2',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                color: '#991b1b'
              }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{plantilla.advertencias}</span>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="odonto-detail-actions" style={{
            display: 'flex',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            flexWrap: 'wrap'
          }}>
            <button className="odonto-btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button 
              className="odonto-btn-secondary" 
              onClick={() => {
                onDuplicate(plantilla);
                onClose();
              }}
            >
              <FiCopy size={16} /> Duplicar
            </button>
            <button className="odonto-btn-primary" onClick={() => { onEdit(plantilla); onClose(); }}>
              <FiEdit size={16} /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}