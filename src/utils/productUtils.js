import { INVENTORY_CONSTANTS } from '../constants/inventoryConstants';

/**
 * Convierte un valor a número de forma segura
 * @param {*} value - Valor a convertir
 * @param {number} defaultValue - Valor por defecto
 * @returns {number}
 */
export const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'number' && !isNaN(value)) return value;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Convierte un valor a booleano de forma segura
 * @param {*} value - Valor a convertir
 * @param {boolean} defaultValue - Valor por defecto
 * @returns {boolean}
 */
export const toBoolean = (value, defaultValue = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return defaultValue;
};

/**
 * Convierte a string de forma segura
 * @param {*} value - Valor a convertir
 * @param {string} defaultValue - Valor por defecto
 * @returns {string}
 */
export const toSafeString = (value, defaultValue = '') => {
  if (value === null || value === undefined) return defaultValue;
  return String(value).trim();
};

/**
 * Formatea un número como moneda
 * @param {number} value - Valor a formatear
 * @returns {string}
 */
export const formatCurrency = (value) => {
  const num = toNumber(value);
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Calcula el PVP = selling_price + tax_rate
 * @param {Object} product - Producto con selling_price y tax_rate
 * @returns {number}
 */
export const calculatePVP = (product) => {
  const sellingPrice = toNumber(product.selling_price);
  const taxRate = toNumber(product.tax_rate);
  return Number((sellingPrice + taxRate).toFixed(2));
};

/**
 * Genera código SKU basado en categoría
 * @param {string} categoryName - Nombre de la categoría
 * @param {number} nextNumber - Número correlativo
 * @returns {string}
 */
export const generateSku = (categoryName, nextNumber) => {
  const base = (categoryName && categoryName.length >= 4)
    ? categoryName.slice(0, 4).toUpperCase()
    : 'PROD';
  const paddedNumber = String(nextNumber).padStart(3, '0');
  return `${base}-${paddedNumber}`;
};

/**
 * Genera código de barras EAN-13 único
 * @returns {string}
 */
export const generateUniqueBarcode = () => {
  const maxAttempts = INVENTORY_CONSTANTS.BARCODE_GENERATION_ATTEMPTS;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const base = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += (i % 2 === 0 ? 1 : 3) * Number(base[i]);
    }
    const checksum = (10 - (sum % 10)) % 10;
    const barcode = base + checksum;
    
    // Validar que sea un código válido (no todos ceros, etc.)
    if (barcode !== '0000000000000' && !/^0+$/.test(barcode)) {
      return barcode;
    }
  }
  
  // Fallback con timestamp
  return Date.now().toString().slice(-13).padStart(13, '0');
};

/**
 * Valida un código de barras EAN-13
 * @param {string} barcode - Código a validar
 * @returns {boolean}
 */
export const isValidBarcode = (barcode) => {
  if (!barcode || barcode.length !== 13) return false;
  if (!/^\d+$/.test(barcode)) return false;
  
  // Validar dígito de control
  const digits = barcode.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += (i % 2 === 0 ? 1 : 3) * digits[i];
  }
  const checksum = (10 - (sum % 10)) % 10;
  return checksum === digits[12];
};