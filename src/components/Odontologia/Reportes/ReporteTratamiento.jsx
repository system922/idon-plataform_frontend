// components/Odontologia/Reportes/ReporteTratamiento.jsx
import React from 'react';
import { FiPrinter, FiEye, FiFile, FiX, FiUser } from 'react-icons/fi';

export default function ReporteTratamiento({ 
  pacientes, 
  onSelectPaciente, 
  selectedPaciente, 
  onPrint,
  onClearPaciente 
}) {
  if (!selectedPaciente) {
    return (
      <div className="odonto-reporte-pacientes">
        <h3>Seleccionar Paciente</h3>
        <div className="odonto-table-container">
          <table className="odonto-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Cédula</th>
                <th className="center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map(p => (
                <tr key={p.id}>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.document_number}</td>
                  <td className="center">
                    <button 
                      className="odonto-btn-primary" 
                      onClick={() => onSelectPaciente(p)}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                    >
                      <FiEye size={14} /> Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="odonto-reporte-content">
      <div className="odonto-reporte-actions">
        <button className="odonto-btn-primary" onClick={onPrint}>
          <FiPrinter size={16} /> Imprimir Reporte
        </button>
        <button className="odonto-btn-secondary" onClick={onClearPaciente}>
          <FiX size={16} /> Cambiar Paciente
        </button>
      </div>

      <div className="odonto-reporte-paciente-info">
        <div className="odonto-reporte-paciente-avatar">
          <FiUser size={24} />
        </div>
        <div className="odonto-reporte-paciente-datos">
          <h4>{selectedPaciente.first_name} {selectedPaciente.last_name}</h4>
          <p>HC: {selectedPaciente.hc_number || 'No asignada'}</p>
        </div>
      </div>

      <div className="odontograma-reporte-container">
        <div className="odontograma-placeholder">
          <FiFile size={64} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
            El reporte de tratamiento mostrará todos los procedimientos realizados al paciente.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Incluye: fecha, tipo de tratamiento, odontólogo responsable y estado.
          </p>
        </div>
      </div>
    </div>
  );
}