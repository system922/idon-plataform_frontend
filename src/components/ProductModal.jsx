import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX } from 'react-icons/fi';
import { 
  toNumber, toBoolean, toSafeString, generateUniqueBarcode, generateSku 
} from '../utils/productUtils';
import { productService } from '../services/productService';
import { ERROR_MESSAGES, INVENTORY_CONSTANTS } from '../constants/inventoryConstants';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { FiSave } from "react-icons/fi";
import { AiFillProduct } from "react-icons/ai";
import { MdPublishedWithChanges } from "react-icons/md";
import { FaEdit } from "react-icons/fa";
import { VscGitPullRequestNewChanges } from "react-icons/vsc";
import '../styles/ProductModal.css'; 


const ProductModal = ({ isOpen, product, onSave, onClose }) => {
  const [form, setForm] = useState({
    barcode: '', name: '', description: '', category_id: '',
    pvp: '', unit_cost: '', stock: '0', min_stock: '0', is_taxable: true, is_active: true,
  });
  
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const barcodeRef = useRef();
  
  const { execute: loadCategories, isLoading: loadingCategories } = useAsyncOperation();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    loadCategories(
      (signal) => productService.getCategories(signal),
      (data) => setCategories(data)
    );
  }, [isOpen, loadCategories]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    if (product) {
      const pvp = toNumber(product.selling_price) + toNumber(product.tax_rate);
      setForm({
        barcode: toSafeString(product.barcode),
        name: toSafeString(product.name),
        description: toSafeString(product.description),
        category_id: product.category_id || '',
        pvp: pvp > 0 ? pvp.toFixed(2) : '',
        unit_cost: toNumber(product.unit_cost).toFixed(2),
        stock: toNumber(product.stock).toString(),
        min_stock: toNumber(product.min_stock).toString(),
        is_taxable: toBoolean(product.is_taxable, true),
        is_active: toBoolean(product.is_active, true),
      });
    } else {
      setForm({
        barcode: generateUniqueBarcode(), name: '', description: '', category_id: '',
        pvp: '', unit_cost: '', stock: '0', min_stock: '0', is_taxable: true, is_active: true,
      });
    }
  }, [isOpen, product]);

  const resetForm = () => {
    setForm({
      barcode: '', name: '', description: '', category_id: '',
      pvp: '', unit_cost: '', stock: '0', min_stock: '0', is_taxable: true, is_active: true,
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBarcodeChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '').slice(0, INVENTORY_CONSTANTS.BARCODE_LENGTH);
    setForm(prev => ({ ...prev, barcode: rawValue }));
    if (errors.barcode) setErrors(prev => ({ ...prev, barcode: '' }));
  };

  const handleGenerateBarcode = () => {
    setForm(prev => ({ ...prev, barcode: generateUniqueBarcode() }));
    barcodeRef.current?.focus();
  };

  const validateForm = () => {
    const err = {};
    if (!toSafeString(form.name)) err.name = ERROR_MESSAGES.VALIDATION_NAME;
    if (!form.category_id) err.category_id = ERROR_MESSAGES.VALIDATION_CATEGORY;
    const barcode = toSafeString(form.barcode);
    if (!barcode || barcode.length < 8) err.barcode = ERROR_MESSAGES.VALIDATION_BARCODE;
    const pvp = toNumber(form.pvp);
    if (!form.pvp || pvp <= 0) err.pvp = ERROR_MESSAGES.VALIDATION_PVP;
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const payload = {
      barcode: toSafeString(form.barcode),
      name: toSafeString(form.name),
      description: toSafeString(form.description) || null,
      category_id: toNumber(form.category_id),
      price: toNumber(form.pvp),
      unit_cost: toNumber(form.unit_cost),
      stock: toNumber(form.stock),
      min_stock: toNumber(form.min_stock),
      is_taxable: toBoolean(form.is_taxable),
      is_active: toBoolean(form.is_active),
    };
    await onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {product ? (
              <>
                <FaEdit size={18} />
                Editar Producto
              </>
            ) : (
              <>
                <VscGitPullRequestNewChanges size={18} />
                Nuevo Producto
              </>
            )}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">

              {/* ── CÓDIGO DE BARRAS (fila completa) ── */}
              <div className="full-width">
                <label className="field-label">
                  Código de Barras <span className="required">*</span>
                </label>
                <div className="barcode-field-wrap">
                  <input
                    ref={barcodeRef}
                    type="text"
                    name="barcode"
                    value={form.barcode}
                    onChange={handleBarcodeChange}
                    maxLength={13}
                    placeholder="0000000000000"
                    className={`barcode-input${errors.barcode ? ' error' : ''}`}
                  />
                  <button type="button" className="btn-secondary" onClick={handleGenerateBarcode}>
                    <MdPublishedWithChanges size={15} />
                    Generar
                  </button>
                </div>
                {errors.barcode && <span className="error-text">{errors.barcode}</span>}
                {!form.barcode && <small className="hint">EAN-13 · 13 dígitos</small>}
              </div>

              {/* ── NOMBRE + CATEGORÍA ── */}
              <div className="full-width">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label className="field-label">Nombre <span className="required">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Ej: Blusa corta"
                      className={errors.name ? 'error' : ''}
                    />
                    {errors.name && <span className="error-text">{errors.name}</span>}
                  </div>
                  <div>
                    <label className="field-label">Categoría <span className="required">*</span></label>
                    <select
                      name="category_id"
                      value={form.category_id}
                      onChange={handleChange}
                      disabled={loadingCategories}
                      className={errors.category_id ? 'error' : ''}
                    >
                      <option value="">-- Seleccionar categoría --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <span className="error-text">{errors.category_id}</span>}
                  </div>
                </div>
              </div>

              {/* ── DESCRIPCIÓN ── */}
              <div className="full-width">
                <label className="field-label">Descripción</label>
                <textarea
                  name="description"
                  rows="2"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Descripción adicional del producto"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* ── PVP · COSTO · STOCK · STOCK MÍN ── */}
              <div className="full-width">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  <div>
                    <label className="field-label">P.V.P <span className="required">*</span></label>
                    <div className="currency-input">
                      <span className="currency-symbol">$</span>
                      <input type="number" step="0.01" min="0" name="pvp" value={form.pvp} onChange={handleChange} placeholder="0.00" />
                    </div>
                    <small className="hint">Precio final (IVA inc.)</small>
                    {errors.pvp && <span className="error-text">{errors.pvp}</span>}
                  </div>
                  <div>
                    <label className="field-label">Costo</label>
                    <div className="currency-input">
                      <span className="currency-symbol">$</span>
                      <input type="number" step="0.01" min="0" name="unit_cost" value={form.unit_cost} onChange={handleChange} placeholder="0.00" />
                    </div>
                    <small className="hint">Costo de compra</small>
                  </div>
                  <div>
                    <label className="field-label">Stock</label>
                    <input type="number" step="1" min="0" name="stock" value={form.stock} onChange={handleChange} placeholder="0" />
                  </div>
                  <div>
                    <label className="field-label">Stock Mínimo</label>
                    <input type="number" step="1" min="0" name="min_stock" value={form.min_stock} onChange={handleChange} placeholder="0" />
                    <small className="hint">Alerta de stock bajo</small>
                  </div>
                </div>
              </div>

              {/* ── CHECKBOXES ── */}
              <div className="full-width checkbox-group">
                <label>
                  <input type="checkbox" name="is_taxable" checked={form.is_taxable} onChange={handleChange} />
                  <span>Aplica IVA</span>
                </label>
                <label>
                  <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} />
                  <span>{form.is_active ? 'Activo' : 'Inactivo'}</span>
                </label>
              </div>
            </div>
            
            {errors.submit && (
              <div className="error-message">
                ⚠️ {errors.submit}
              </div>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save">
              {product ? (
                <>
                  <FiSave size={18} />
                  Guardar cambios
                </>
              ) : (
                <>
                  <AiFillProduct size={18} />
                  Crear producto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;