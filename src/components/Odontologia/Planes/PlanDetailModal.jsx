// components/Odontologia/Planes/PlanDetailModal.jsx
import React from 'react';
import { 
  FiX, FiEdit, FiClock, FiDollarSign, 
  FiActivity, FiCheckCircle, FiXCircle, FiUser,
  FiCalendar, FiFileText, FiLayers, FiInfo
} from 'react-icons/fi';

export default function PlanDetailModal({ 
  isOpen, 
  onClose, 
  plan, 
  onEdit 
}) {
  if (!isOpen || !plan) return null;

  const getStatusBadge = (status) => {
    const map = {
      draft: { label: 'Borrador', class: 'draft' },
      active: { label: 'Activo', class: 'active' },
      completed: { label: 'Completado', class: 'completed' },
      cancelled: { label: 'Cancelado', class: 'cancelled' }
    };
    return map[status] || map.draft;
  };

  const getFaseLabel = (fase) => {
    const map = {
      inicial: 'Inicial',
      evolucion: 'Evolución',
      alta: 'Alta'
    };
    return map[fase] || fase || 'Sin fase';
  };

  const statusBadge = getStatusBadge(plan.status);

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal odonto-modal-detail" onClick={e => e.stopPropagation()}>
        {/* HEADER */}
        <div className="odonto-modal-header blue">
          <div>
            <h3>Detalles del Plan</h3>
            <p>{plan.name}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* BODY */}
        <div className="odonto-modal-body odonto-detail-body">
          {/* Header con nombre y estado */}
          <div className="odonto-detail-header-info" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '2px solid #e2e8f0'
          }}>
            <div className="odonto-detail-name-title" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FiFileText size={20} style={{ color: '#2563eb' }} />
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
                {plan.name}
              </h2>
            </div>
            <span className={`odonto-badge-status ${statusBadge.class}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* INFORMACIÓN PRINCIPAL - 3 columnas */}
          <div className="odonto-detail-grid-three" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '24px'
          }}>
            <div className="odonto-detail-item">
              <div className="odonto-detail-label" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px'
              }}>
                <FiUser size={14} />
                <span>Paciente</span>
              </div>
              <div className="odonto-detail-value" style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0f172a',
                padding: '4px 0'
              }}>
                {plan.paciente_nombre || '—'}
              </div>
            </div>

            <div className="odonto-detail-item">
              <div className="odonto-detail-label" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px'
              }}>
                <FiLayers size={14} />
                <span>Fase</span>
              </div>
              <div className="odonto-detail-value" style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#0f172a',
                padding: '4px 0'
              }}>
                <span className="odonto-badge odonto-badge-info" style={{
                  display: 'inline-block',
                  padding: '2px 12px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#dbeafe',
                  color: '#1e40af'
                }}>
                  {getFaseLabel(plan.fase)}
                </span>
              </div>
            </div>

            <div className="odonto-detail-item">
              <div className="odonto-detail-label" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '4px'
              }}>
                <FiDollarSign size={14} />
                <span>Costo Total</span>
              </div>
              <div className="odonto-detail-value odonto-precio" style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#059669',
                padding: '4px 0'
              }}>
                ${Number(plan.total_cost || 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          {plan.description && (
            <div className="odonto-detail-section" style={{
              marginBottom: '24px',
              padding: '4px 0'
            }}>
              <div className="odonto-detail-section-header" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
                paddingBottom: '10px',
                borderBottom: '2px solid #e2e8f0'
              }}>
                <FiInfo size={16} style={{ color: '#2563eb' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Descripción
                </h4>
              </div>
              <p className="odonto-description-text" style={{
                background: '#f8fafc',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                margin: 0,
                fontSize: '14px',
                color: '#334155',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap'
              }}>
                {plan.description}
              </p>
            </div>
          )}

          {/* ITEMS DEL PLAN DE TRATAMIENTO */}
          <div className="odonto-detail-section" style={{
            marginBottom: '24px',
            padding: '4px 0'
          }}>
            <div className="odonto-detail-section-header" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
              paddingBottom: '10px',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <FiActivity size={16} style={{ color: '#2563eb' }} />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                Items del Plan de Tratamiento ({plan.items?.length || 0})
              </h4>
            </div>
            <div className="odonto-plan-items-list">
              {plan.items && plan.items.length > 0 ? (
                plan.items.map((item, idx) => (
                  <div key={idx} className="odonto-plan-item" style={{
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          Diente {item.tooth}
                        </strong>
                        <span style={{ 
                          fontSize: '13px', 
                          color: '#475569',
                          background: '#e2e8f0',
                          padding: '0 8px',
                          borderRadius: '4px'
                        }}>
                          {item.hallazgoLabel || item.hallazgo || 'Sin hallazgo'}
                        </span>
                        {item.servicio && (
                          <span style={{ 
                            fontSize: '13px', 
                            color: '#2563eb',
                            background: '#dbeafe',
                            padding: '0 8px',
                            borderRadius: '4px'
                          }}>
                            → {item.servicio}
                          </span>
                        )}
                      </div>
                      {item.nota && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#94a3b8', 
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <span>📝</span> {item.nota}
                        </div>
                      )}
                      {item.surfaces && item.surfaces.length > 0 && (
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#64748b', 
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexWrap: 'wrap'
                        }}>
                          <span>🔲 Caras:</span>
                          {item.surfaces.map((s, i) => (
                            <span key={i} style={{
                              background: '#e2e8f0',
                              padding: '0 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              textTransform: 'capitalize'
                            }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {item.price && (
                      <span style={{ 
                        fontWeight: 600, 
                        color: '#059669',
                        fontSize: '15px',
                        whiteSpace: 'nowrap'
                      }}>
                        ${Number(item.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 20px',
                  color: '#94a3b8',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #e2e8f0'
                }}>
                  <FiActivity size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>No hay items registrados en este plan</p>
                </div>
              )}
            </div>
          </div>

          {/* FECHAS */}
          <div className="odonto-detail-grid-two" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px',
            marginBottom: '20px'
          }}>
            {plan.created_at && (
              <div className="odonto-detail-item">
                <div className="odonto-detail-label" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  <FiCalendar size={14} />
                  <span>Fecha de creación</span>
                </div>
                <div className="odonto-detail-value" style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0f172a',
                  padding: '4px 0'
                }}>
                  {new Date(plan.created_at).toLocaleString('es-EC', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}

            {plan.updated_at && plan.created_at !== plan.updated_at && (
              <div className="odonto-detail-item">
                <div className="odonto-detail-label" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '4px'
                }}>
                  <FiClock size={14} />
                  <span>Última actualización</span>
                </div>
                <div className="odonto-detail-value" style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#0f172a',
                  padding: '4px 0'
                }}>
                  {new Date(plan.updated_at).toLocaleString('es-EC', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ACCIONES - FOOTER */}
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
              className="odonto-btn-primary" 
              onClick={() => { 
                onEdit(plan); 
                onClose(); 
              }}
            >
              <FiEdit size={16} style={{ marginRight: 6 }} /> Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}