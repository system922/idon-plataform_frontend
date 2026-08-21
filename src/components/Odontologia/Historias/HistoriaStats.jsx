// components/Odontologia/Historias/HistoriaStats.jsx
import React from 'react';
import { FiFileText, FiList, FiClock, FiUser } from 'react-icons/fi';

export default function HistoriaStats({ 
  totalHistorias, 
  totalTipos, 
  ultimaFecha,
  pacienteSeleccionado 
}) {
  return (
    <div className="hc-stats-grid">
      {/* Total de historias */}
      <div className="hc-stat-card">
        <div className="hc-stat-icon hc-stat-icon-records">
          <FiFileText size={24} />
        </div>
        <div className="hc-stat-info">
          <div className="hc-stat-value">{totalHistorias}</div>
          <div className="hc-stat-label">Historias registradas</div>
        </div>
      </div>

      {/* Tipos de historias */}
      <div className="hc-stat-card">
        <div className="hc-stat-icon hc-stat-icon-types">
          <FiList size={24} />
        </div>
        <div className="hc-stat-info">
          <div className="hc-stat-value">{totalTipos}</div>
          <div className="hc-stat-label">Tipos de historias</div>
        </div>
      </div>

      {/* Última historia */}
      <div className="hc-stat-card">
        <div className="hc-stat-icon hc-stat-icon-updated">
          <FiClock size={24} />
        </div>
        <div className="hc-stat-info">
          <div className="hc-stat-value">
            {ultimaFecha ? new Date(ultimaFecha).toLocaleDateString() : '—'}
          </div>
          <div className="hc-stat-label">Última historia</div>
        </div>
      </div>

      {/* Pacientes (solo si hay paciente seleccionado) */}
      {pacienteSeleccionado && (
        <div className="hc-stat-card">
          <div className="hc-stat-icon hc-stat-icon-patients">
            <FiUser size={24} />
          </div>
          <div className="hc-stat-info">
            <div className="hc-stat-value">1</div>
            <div className="hc-stat-label">Paciente actual</div>
          </div>
        </div>
      )}
    </div>
  );
}