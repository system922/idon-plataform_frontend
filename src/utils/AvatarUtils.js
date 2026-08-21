// src/utils/AvatarUtils.js

/**
 * Genera iniciales del paciente
 */
export const getInitials = (firstName, lastName) => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
};

/**
 * Genera color basado en el nombre
 */
export const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#FF8A5C', '#A29BFE', '#FD79A8', '#00CEC9',
    '#6C5CE7', '#FDCB6E', '#E17055', '#00B894'
  ];
  
  let hash = 0;
  const str = name || 'Usuario';
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};