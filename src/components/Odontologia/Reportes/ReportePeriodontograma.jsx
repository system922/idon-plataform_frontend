// components/Odontologia/Reportes/ReportePeriodontograma.jsx
import React from 'react';
import { FiPrinter, FiEye, FiClipboard } from 'react-icons/fi';

export default function ReportePeriodontograma({ 
  pacientes, 
  onSelectPaciente, 
  selectedPaciente, 
  onPrint 
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
          <FiPrinter size={16} /> Imprimir Periodontograma
        </button>
        <button className="odonto-btn-secondary" onClick={() => onSelectPaciente(null)}>
          Cambiar Paciente
        </button>
      </div>

      <div className="odontograma-reporte-container">
        <h3>Periodontograma - {selectedPaciente.first_name} {selectedPaciente.last_name}</h3>
        <p>HC: {selectedPaciente.hc_number || 'No asignada'}</p>
        
        <div className="odontograma-placeholder">
          <FiClipboard size={64} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)', marginTop: 12 }}>
            El periodontograma se mostrará aquí con los datos periodontales del paciente.
          </p>
          <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
            Incluye: profundidad de bolsas, recesión gingival, movilidad dental y sangrado.
          </p>
        </div>
      </div>
    </div>
  );
}