import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import { 
  toNumber, toBoolean, toSafeString, generateUniqueBarcode, generateSku 
} from '../utils/productUtils';
import { productService } from '../services/productService';
import { ERROR_MESSAGES, INVENTORY_CONSTANTS } from '../constants/inventoryConstants';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

/**
 * Componente Modal para crear/editar productos
 * Extraído del componente principal para mejorar mantenibilidad
 */
const ProductModal = ({ isOpen, product, onSave, onClose }) => {
  // Estado del formulario
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    unit_cost: '',
    sku: '',
    barcode: '',
    stock: '0',
    min_stock: '0',
    is_taxable: true,
    is_active: true,
    pvp: '',
  });
  
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [skuGenerated, setSkuGenerated] = useState(false);
  const barcodeRef = useRef();
  
  const { execute: loadCategories, isLoading: loadingCategories } = useAsyncOperation();
  const { execute: generateSkuAsync, isLoading: generatingSku } = useAsyncOperation();

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (!isOpen) return;
    
    loadCategories(
      (signal) => productService.getCategories(signal),
      (data) => setCategories(data)
    );
  }, [isOpen, loadCategories]);

  // Inicializar formulario
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    if (product) {
      // Edición: calcular PVP correctamente
      const pvp = toNumber(product.selling_price) + toNumber(product.tax_rate);
      setForm({
        name: toSafeString(product.name),
        description: toSafeString(product.description),
        category_id: product.category_id || '',
        unit_cost: toNumber(product.unit_cost).toFixed(2),
        sku: toSafeString(product.sku),
        barcode: toSafeString(product.barcode),
        stock: toNumber(product.stock).toString(),
        min_stock: toNumber(product.min_stock).toString(),
        is_taxable: toBoolean(product.is_taxable, true),
        is_active: toBoolean(product.is_active, true),
        pvp: pvp > 0 ? pvp.toFixed(2) : '',
      });
      setSkuGenerated(!!product.sku);
    } else {
      // Nuevo producto
      setForm({
        name: '',
        description: '',
        category_id: '',
        unit_cost: '',
        sku: '',
        barcode: generateUniqueBarcode(),
        stock: String(INVENTORY_CONSTANTS.DEFAULT_STOCK),
        min_stock: String(INVENTORY_CONSTANTS.DEFAULT_STOCK),
        is_taxable: true,
        is_active: true,
        pvp: '',
      });
      setSkuGenerated(false);
    }
  }, [isOpen, product]);

  // Resetear formulario
  const resetForm = () => {
    setForm({
      name: '', description: '', category_id: '', unit_cost: '', sku: '', barcode: '',
      stock: '0', min_stock: '0', is_taxable: true, is_active: true, pvp: '',
    });
    setErrors({});
    setSkuGenerated(false);
  };

  // Generar SKU automático
  useEffect(() => {
    if (!isOpen || product || skuGenerated || !form.category_id || generatingSku) return;

    const generate = async () => {
      const category = categories.find(c => c.id === toNumber(form.category_id));
      const categoryName = category?.name || '';
      
      try {
        const { next } = await productService.getNextCode(categoryName);
        const newSku = generateSku(categoryName, next);
        setForm(prev => ({ ...prev, sku: newSku }));
        setSkuGenerated(true);
      } catch (error) {
        console.error('Error generating SKU:', error);
      }
    };
    
    generate();
  }, [isOpen, product, skuGenerated, form.category_id, categories, generatingSku]);

  // Manejar cambios en el formulario
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Manejar cambio de código de barras
  const handleBarcodeChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, INVENTORY_CONSTANTS.BARCODE_LENGTH);
    setForm(prev => ({ ...prev, barcode: rawValue }));
    if (errors.barcode) setErrors(prev => ({ ...prev, barcode: '' }));
  };

  // Generar nuevo código de barras
  const handleGenerateBarcode = () => {
    setForm(prev => ({ ...prev, barcode: generateUniqueBarcode() }));
    barcodeRef.current?.focus();
  };

  // Validar formulario
  const validateForm = () => {
    const err = {};
    
    if (!toSafeString(form.name)) {
      err.name = ERROR_MESSAGES.VALIDATION_NAME;
    }
    
    if (!form.category_id) {
      err.category_id = ERROR_MESSAGES.VALIDATION_CATEGORY;
    }
    
    const barcode = toSafeString(form.barcode);
    if (!barcode || barcode.length < 8) {
      err.barcode = ERROR_MESSAGES.VALIDATION_BARCODE;
    }
    
    const pvp = toNumber(form.pvp);
    if (!form.pvp || pvp <= 0) {
      err.pvp = ERROR_MESSAGES.VALIDATION_PVP;
    }
    
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: toSafeString(form.name),
      description: toSafeString(form.description) || null,
      category_id: toNumber(form.category_id),
      unit_cost: toNumber(form.unit_cost),
      sku: toSafeString(form.sku) || null,
      barcode: toSafeString(form.barcode),
      stock: toNumber(form.stock),
      min_stock: toNumber(form.min_stock),
      is_taxable: toBoolean(form.is_taxable),
      is_active: toBoolean(form.is_active),
      price: toNumber(form.pvp), // PVP con IVA
    };

    await onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{product ? '✏️ Editar' : '➕ Nuevo'} Producto</h2>
          <button className="modal-close" onClick={onClose}><FiX size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              {/* Nombre */}
              <div className="full-width">
                <label>Nombre *</label>
                <input name="name" value={form.name} onChange={handleChange} />
                {errors.name && <small className="error-text">{errors.name}</small>}
              </div>
              
              {/* Descripción */}
              <div className="full-width">
                <label>Descripción</label>
                <textarea name="description" rows="2" value={form.description} onChange={handleChange} />
              </div>
              
              {/* Categoría */}
              <div>
                <label>Categoría *</label>
                <select name="category_id" value={form.category_id} onChange={handleChange} disabled={loadingCategories}>
                  <option value="">-- Seleccionar --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.category_id && <small className="error-text">{errors.category_id}</small>}
              </div>
              
              {/* SKU */}
              <div>
                <label>SKU</label>
                <input name="sku" value={form.sku} onChange={handleChange} placeholder="Auto-generado" />
              </div>
              
              {/* Código Barras */}
              <div>
                <label>Código Barras *</label>
                <div className="input-group">
                  <input ref={barcodeRef} value={form.barcode} onChange={handleBarcodeChange} maxLength={13} />
                  <button type="button" className="btn-secondary" onClick={handleGenerateBarcode}>
                    Generar
                  </button>
                </div>
                {errors.barcode && <small className="error-text">{errors.barcode}</small>}
              </div>
              
              {/* PVP */}
              <div>
                <label>💰 PVP (Precio Venta Público) *</label>
                <div className="currency-input">
                  <span className="currency-symbol">$</span>
                  <input name="pvp" type="number" step="0.01" min="0" value={form.pvp} onChange={handleChange} />
                </div>
                {errors.pvp && <small className="error-text">{errors.pvp}</small>}
              </div>
              
              {/* Costo */}
              <div>
                <label>📦 Costo (lo que pagas)</label>
                <div className="currency-input">
                  <span className="currency-symbol">$</span>
                  <input name="unit_cost" type="number" step="0.01" min="0" value={form.unit_cost} onChange={handleChange} />
                </div>
              </div>
              
              {/* Stock */}
              <div>
                <label>Stock</label>
                <input name="stock" type="number" step="1" min="0" value={form.stock} onChange={handleChange} />
              </div>
              
              {/* Stock Mínimo */}
              <div>
                <label>Stock Mínimo</label>
                <input name="min_stock" type="number" step="1" min="0" value={form.min_stock} onChange={handleChange} />
              </div>
              
              {/* Checkboxes */}
              <div className="full-width checkbox-group">
                <label>
                  <input type="checkbox" name="is_taxable" checked={form.is_taxable} onChange={handleChange} />
                  Producto con IVA
                </label>
                <label>
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  Producto Activo
                </label>
              </div>
            </div>
            {errors.submit && <div className="error-message">{errors.submit}</div>}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-save">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;