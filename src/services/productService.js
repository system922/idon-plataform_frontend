import { fetchWithAuth } from '../config/apiBase';
import { API_ENDPOINTS } from '../constants/inventoryConstants';
import { toNumber, toBoolean } from '../utils/productUtils';

/**
 * Servicio centralizado para operaciones de productos
 */
class ProductService {
  /**
   * Obtiene todos los productos
   * @param {AbortSignal} signal - Señal para abortar la petición
   */
  async getAll(signal) {
    const response = await fetchWithAuth(API_ENDPOINTS.PRODUCTS, { signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const productsList = Array.isArray(data) ? data : data.products || data.data || [];
    
    // Normalizar datos
    return productsList.map(p => ({
      ...p,
      selling_price: toNumber(p.selling_price),
      tax_rate: toNumber(p.tax_rate),
      unit_cost: toNumber(p.unit_cost),
      stock: toNumber(p.stock),
      is_taxable: toNumber(p.is_taxable),  // ✅ MANTENER COMO NÚMERO (0, 5, 8, 12, 15)
      is_active: toBoolean(p.is_active),
    }));
  }

  /**
   * Crea un nuevo producto
   * @param {Object} payload - Datos del producto
   */
  async create(payload) {
    const response = await fetchWithAuth(API_ENDPOINTS.PRODUCTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Actualiza un producto existente
   * @param {string} id - ID del producto
   * @param {Object} payload - Datos a actualizar
   */
  async update(id, payload) {
    const response = await fetchWithAuth(`${API_ENDPOINTS.PRODUCTS}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  /**
   * Elimina un producto (soft delete)
   * @param {string} id - ID del producto
   */
  async delete(id) {
    const response = await fetchWithAuth(`${API_ENDPOINTS.PRODUCTS}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    return true;
  }

  /**
   * Obtiene las categorías
   * @param {AbortSignal} signal - Señal para abortar la petición
   */
  async getCategories(signal) {
    const response = await fetchWithAuth(API_ENDPOINTS.CATEGORIES, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Obtiene el siguiente código SKU para una categoría
   * @param {string} categoryName - Nombre de la categoría
   */
  async getNextCode(categoryName) {
    const response = await fetchWithAuth(`${API_ENDPOINTS.NEXT_CODE}?categoria=${encodeURIComponent(categoryName)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      code: data.code,
      next: toNumber(data.next, 1),
    };
  }
}

export const productService = new ProductService();