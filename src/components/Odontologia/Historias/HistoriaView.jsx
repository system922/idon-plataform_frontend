// components/Odontologia/Historias/HistoriaView.jsx
import React from 'react';
import { FiFileText, FiCalendar, FiPlus } from 'react-icons/fi';

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

export default function HistoriaView({ 
  historia, 
  historiasCount = 0,
  onNewHistoria 
}) {
  if (!historia) {
    return (
      <div className="hc-empty-state">
        <FiFileText className="hc-empty-state-icon" />
        <p className="hc-empty-state-title">
          {historiasCount > 0 ? 'Selecciona una historia' : 'Sin historia clínica'}
        </p>
        <p className="hc-empty-state-subtitle">
          {historiasCount > 0 
            ? 'Haz clic en una historia del panel izquierdo para ver sus detalles'
            : 'Crea la primera historia clínica para este paciente'
          }
        </p>
        {historiasCount === 0 && (
          <button className="hc-btn-primary" onClick={onNewHistoria}>
            <FiPlus /> Crear primera historia
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="hc-view">
      <div className="hc-view-header">
        <div>
          <h3 className="hc-view-title">
            {TIPO_ICONS[historia.tipo] || '📄'} {historia.titulo}
          </h3>
          <div className="hc-view-meta">
            {TIPO_LABELS[historia.tipo] || historia.tipo} • 
            <FiCalendar className="hc-view-meta-icon" />
            {new Date(historia.fecha).toLocaleDateString()}
          </div>
        </div>
        <div className="hc-view-id">
          ID: {historia.id?.substring(0, 8)}
        </div>
      </div>

      {historia.descripcion && (
        <div className="hc-view-section">
          <strong className="hc-view-label">Descripción:</strong>
          <p className="hc-view-text">{historia.descripcion}</p>
        </div>
      )}

      <div className="hc-view-section">
        <strong className="hc-view-label">Datos:</strong>
        <pre className="hc-view-json">
          {JSON.stringify(historia.datos, null, 2)}
        </pre>
      </div>

      {historia.observaciones && (
        <div className="hc-view-section">
          <strong className="hc-view-label">Observaciones:</strong>
          <p className="hc-view-text">{historia.observaciones}</p>
        </div>
      )}

      {historia.notas && (
        <div className="hc-view-section">
          <strong className="hc-view-label">Notas:</strong>
          <p className="hc-view-text hc-view-text-italic">
            {historia.notas}
          </p>
        </div>
      )}

      <div className="hc-view-footer">
        <span>Creado: {new Date(historia.created_at).toLocaleString()}</span>
        <span>Actualizado: {new Date(historia.updated_at).toLocaleString()}</span>
      </div>
    </div>
  );
}