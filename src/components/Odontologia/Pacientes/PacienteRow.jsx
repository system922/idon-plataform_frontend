// componentes/pacientes/PacienteRow.jsx
import React from 'react';
import { FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { PacienteAvatar } from './PacienteAvatar';
import { calculateBirthday, formatPhone } from '../../../utils/pacienteUtils';

export const PacienteRow = ({ 
  paciente, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const birthdayInfo = calculateBirthday(paciente.birth_date);
  
  return (
    <tr>
      <td>
        <div className="odonto-cell-with-avatar">
          <PacienteAvatar 
            firstName={paciente.first_name}
            lastName={paciente.last_name}
            imageUrl={paciente.image_url}
            size={36}
          />
          <span>{paciente.first_name}</span>
        </div>
      </td>
      <td>{paciente.last_name}</td>
      <td>{paciente.document_number}</td>
      <td>{formatPhone(paciente.phone)}</td>
      <td>{paciente.email}</td>
      <td>
        {birthdayInfo && (
          <span className={`odonto-badge-birthday ${birthdayInfo.isSoon ? 'soon' : ''}`}>
            {birthdayInfo.formatted}
          </span>
        )}
      </td>
      <td className="center">
        <div className="odonto-actions">
          <button 
            className="odonto-btn-icon view" 
            onClick={() => onView(paciente)}
            title="Ver detalle"
          >
            <FiEye size={14} />
          </button>
          <button 
            className="odonto-btn-icon edit" 
            onClick={() => onEdit(paciente)}
            title="Editar"
          >
            <FiEdit size={14} />
          </button>
          <button 
            className="odonto-btn-icon delete" 
            onClick={() => onDelete(paciente.id)}
            title="Eliminar"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};