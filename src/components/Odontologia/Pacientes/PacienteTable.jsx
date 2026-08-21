// componentes/pacientes/PacienteTable.jsx
import React from 'react';
import { PacienteRow } from './PacienteRow';

export const PacienteTable = ({ 
  pacientes, 
  onEdit, 
  onDelete, 
  onView,
  onRefresh,
  loading
}) => {
  return (
    <>
      <div className="odonto-table-container">
        <table className="odonto-table">
          <thead>
            <tr>
              <th>Nombres</th>
              <th>Apellidos</th>
              <th>Cédula</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Cumpleaños</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pacientes?.length > 0 ? (
              pacientes.map(p => (
                <PacienteRow 
                  key={p.id}
                  paciente={p}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onView={onView}
                />
              ))
            ) : (
              <tr>
                <td colSpan="7" className="odonto-empty-state">
                  {loading ? 'Cargando pacientes...' : 'No hay pacientes registrados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="odonto-table-info">
          Mostrando {pacientes?.length || 0} pacientes
        </div>
      </div>
    </>
  );
};