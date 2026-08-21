// components/Odontologia/Historias/HistoriaList.jsx
import React from 'react';
import { FiFileText, FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';

// Tipos de historias clínicas disponibles
const HISTORIA_TIPOS = {
  ODONTOGRAMA: 'odontograma',
  PERIODONTOGRAMA: 'periodontograma',
  EVALUACION_INICIAL: 'evaluacion_inicial',
  EVOLUCION: 'evolucion',
  INTERCONSULTA: 'interconsulta'
};

const TIPO_LABELS = {
  [HISTORIA_TIPOS.ODONTOGRAMA]: 'Odontograma',
  [HISTORIA_TIPOS.PERIODONTOGRAMA]: 'Periodontograma',
  [HISTORIA_TIPOS.EVALUACION_INICIAL]: 'Evaluación Inicial',
  [HISTORIA_TIPOS.EVOLUCION]: 'Evolución',
  [HISTORIA_TIPOS.INTERCONSULTA]: 'Interconsulta'
};

const TIPO_ICONS = {
  [HISTORIA_TIPOS.ODONTOGRAMA]: '🦷',
  [HISTORIA_TIPOS.PERIODONTOGRAMA]: '🫧',
  [HISTORIA_TIPOS.EVALUACION_INICIAL]: '📋',
  [HISTORIA_TIPOS.EVOLUCION]: '📊',
  [HISTORIA_TIPOS.INTERCONSULTA]: '👨‍⚕️'
};

export default function HistoriaList({
  historias,
  selectedHistoriaId,
  onSelectHistoria,
  onEditHistoria,
  onDeleteHistoria,
  onNewHistoria,
  loading = false
}) {
  if (loading) {
    return (
      <div className="hc-list-loading">
        <div className="hc-spinner"></div>
        <p>Cargando historias...</p>
      </div>
    );
  }

  return (
    <>
      <div className="hc-list-header">
        <h4 className="hc-list-title">
          Historias Clínicas
          <span className="hc-list-count">({historias.length})</span>
        </h4>
      </div>
      
      {historias.length === 0 ? (
        <div className="hc-list-empty">
          <FiFileText className="hc-list-empty-icon" />
          <p className="hc-list-empty-text">Sin historias registradas</p>
          <button className="hc-btn-primary" onClick={onNewHistoria}>
            <FiPlus /> Crear primera historia
          </button>
        </div>
      ) : (
        <div className="hc-list-items">
          {historias.map(historia => (
            <div
              key={historia.id}
              className={`hc-list-item ${selectedHistoriaId === historia.id ? 'hc-list-item-active' : ''}`}
              onClick={() => onSelectHistoria(historia)}
            >
              <div className="hc-list-item-content">
                <div>
                  <div className="hc-list-item-title">
                    {TIPO_ICONS[historia.tipo] || '📄'} {historia.titulo}
                  </div>
                  <div className="hc-list-item-meta">
                    {TIPO_LABELS[historia.tipo] || historia.tipo} • 
                    {new Date(historia.fecha).toLocaleDateString()}
                  </div>
                </div>
                <div className="hc-list-item-actions">
                  <button
                    className="hc-list-item-btn hc-list-item-btn-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditHistoria(historia);
                    }}
                    title="Editar"
                  >
                    <FiEdit size={14} />
                  </button>
                  <button
                    className="hc-list-item-btn hc-list-item-btn-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteHistoria(historia.id, historia.titulo);
                    }}
                    title="Eliminar"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}