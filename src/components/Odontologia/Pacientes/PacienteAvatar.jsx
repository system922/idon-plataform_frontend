// componentes/pacientes/PacienteAvatar.jsx
import React from 'react';
import { getInitials, getAvatarColor } from '../../../utils/AvatarUtils';
import '../../../styles/Odontologia/odonto-avatar.css';

export const PacienteAvatar = ({ 
  firstName, 
  lastName, 
  imageUrl, 
  size = 40,
  className = '',
  onClick 
}) => {
  const initials = getInitials(firstName, lastName);
  const bgColor = getAvatarColor(`${firstName} ${lastName}`);

  if (imageUrl) {
    return (
      <div 
        className={`odonto-avatar ${className}`} 
        style={{ width: size, height: size }}
        onClick={onClick}
      >
        <img 
          src={imageUrl} 
          alt={`${firstName} ${lastName}`} 
          className="odonto-avatar-image"
        />
      </div>
    );
  }

  return (
    <div 
      className={`odonto-avatar ${className}`} 
      style={{ 
        width: size, 
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.4
      }}
      onClick={onClick}
    >
      {initials}
    </div>
  );
};