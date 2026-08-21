// utils/pacienteUtils.js

/**
 * Calcula los días restantes para el cumpleaños
 * @param {string} birthDate - Fecha de nacimiento (YYYY-MM-DD)
 * @returns {Object} - { days: number, nextAge: number, isSoon: boolean, formatted: string }
 */
export const calculateBirthday = (birthDate) => {
  if (!birthDate) return null;

  const today = new Date();
  const birth = new Date(birthDate);
  
  // Calcular próxima fecha de cumpleaños
  const nextBirthday = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
  
  // Si ya pasó este año, pasar al próximo
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }
  
  // Días restantes
  const diffTime = nextBirthday - today;
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Edad que cumplirá
  const nextAge = nextBirthday.getFullYear() - birth.getFullYear();
  
  // Está en el mes de su cumpleaños (menos de 31 días)
  const isSoon = days <= 31;
  
  // Formatear texto
  let formatted = '';
  if (isSoon && days >= 0) {
    formatted = `${days} día${days !== 1 ? 's' : ''} para cumplir ${nextAge} años`;
    if (days === 0) formatted = `¡Hoy cumple ${nextAge} años! 🎉`;
  } else {
    formatted = new Date(birthDate).toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  
  return { days, nextAge, isSoon, formatted };
};

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
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

/**
 * Formatea número de teléfono
 */
export const formatPhone = (phone) => {
  if (!phone) return 'No registrado';
  // Formato: (XXX) XXX-XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};