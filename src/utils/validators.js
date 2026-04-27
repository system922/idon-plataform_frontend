export const validators = {
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidDocument: (doc) => {
    // Colombian cedula validation (simplified)
    return doc && doc.length >= 8 && doc.length <= 10 && /^\d+$/.test(doc);
  },

  isValidPassword: (password) => {
    // At least 8 characters, 1 uppercase, 1 number
    return password && password.length >= 8 && /[A-Z]/.test(password) && /\d/.test(password);
  },

  isValidSlug: (slug) => {
    // Only lowercase letters, numbers, and hyphens
    return slug && /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
  },
};

export const formatters = {
  formatCurrency: (value, currency = 'USD') => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
    }).format(value);
  },

  formatDate: (date) => {
    return new Date(date).toLocaleDateString('es-CO');
  },

  formatDateTime: (dateTime) => {
    return new Date(dateTime).toLocaleString('es-CO');
  },
};

export const errorMessages = {
  email: 'Email inválido',
  password: 'Contraseña debe tener al menos 8 caracteres, 1 mayúscula y 1 número',
  document: 'Número de documento inválido',
  slug: 'Slug debe tener al menos 3 caracteres y solo contener letras minúsculas, números y guiones',
  required: 'Este campo es requerido',
  match: 'Los valores no coinciden',
};
