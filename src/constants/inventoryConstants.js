// ============================================================================
// CONSTANTES DE INVENTARIO
// ============================================================================

export const INVENTORY_CONSTANTS = {
  BARCODE_LENGTH: 13,
  DEFAULT_STOCK: 0,
  MIN_STOCK_ALERT: 5,
  BARCODE_GENERATION_ATTEMPTS: 3,
  API_TIMEOUT_MS: 10000,
  DEBOUNCE_DELAY_MS: 300,
  SKU_RETRY_ATTEMPTS: 3,
  SKU_RETRY_DELAY_MS: 500,
};

export const API_ENDPOINTS = {
  PRODUCTS: '/api/products',
  CATEGORIES: '/api/categories',
  NEXT_CODE: '/api/products/next-code',
};

export const ERROR_MESSAGES = {
  LOAD_PRODUCTS: 'Error al cargar los productos. Por favor, intenta nuevamente.',
  SAVE_PRODUCT: 'Error al guardar el producto. Verifica los datos e intenta nuevamente.',
  DELETE_PRODUCT: 'Error al eliminar el producto. Intenta nuevamente.',
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
  VALIDATION_NAME: 'El nombre del producto es requerido',
  VALIDATION_CATEGORY: 'La categoría es requerida',
  VALIDATION_BARCODE: 'El código de barras debe tener al menos 8 dígitos',
  VALIDATION_PVP: 'El precio de venta es requerido y debe ser mayor a cero',
};