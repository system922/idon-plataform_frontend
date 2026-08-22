import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  toNumber, toBoolean, toSafeString, generateUniqueBarcode
} from '../utils/productUtils';
import { productService } from '../services/productService';
import { ERROR_MESSAGES, INVENTORY_CONSTANTS } from '../constants/inventoryConstants';
import Modal from '../components/General/Modal';
import Input from '../components/General/Input';
import CustomCombobox from '../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../components/General/Button';
import { FiSave, FiX, FiRefreshCw } from 'react-icons/fi';

// ─── CONSTANTES ──────────────────────────────────────────────────────────
const PRODUCT_TYPES = [
  { label: 'Comercial', value: 'COMMERCIAL' },
  { label: 'Con receta', value: 'MANUFACTURED' },
];

const ProductModal = ({ isOpen, product, onSave, onClose, isSaving = false }) => {
  // ── Estado del formulario ──
  const [form, setForm] = useState({
    barcode: '',
    name: '',
    description: '',
    category_id: '',
    product_type: 'COMMERCIAL',
    pvp: '',
    unit_cost: '',
    stock: '0',
    min_stock: '0',
    tax_rate: 15,
    is_active: true,
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errors, setErrors] = useState({});
  const barcodeRef = useRef(null);

  // ── Cargar categorías usando productService ──
  const loadCategories = useCallback(async () => {
    if (!isOpen) return;
    
    setLoadingCategories(true);
    try {
      // ✅ Usar productService.getCategories()
      const categoriesList = await productService.getCategories();
      setCategories(categoriesList);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    
    } finally {
      setLoadingCategories(false);
    }
  }, [isOpen]);

  // ── Cargar categorías al abrir ──
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, loadCategories]);

  // ── Llenar formulario al editar o crear ──
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }
    
    if (product) {
      // Modo edición
      const pvp = toNumber(product.selling_price) + toNumber(product.tax_rate);
      const ivaRate = toNumber(product.is_taxable) || 0;
      setForm({
        barcode: toSafeString(product.barcode),
        name: toSafeString(product.name),
        description: toSafeString(product.description),
        category_id: product.category_id || '',
        product_type: product.product_type || 'COMMERCIAL',
        pvp: pvp > 0 ? pvp.toFixed(2) : '',
        unit_cost: toNumber(product.unit_cost).toFixed(2),
        stock: toNumber(product.stock).toString(),
        min_stock: toNumber(product.min_stock).toString(),
        tax_rate: ivaRate,
        is_active: toBoolean(product.is_active, true),
      });
    } else {
      // Modo creación
      setForm({
        barcode: generateUniqueBarcode(),
        name: '',
        description: '',
        category_id: '',
        product_type: 'COMMERCIAL',
        pvp: '',
        unit_cost: '',
        stock: '0',
        min_stock: '0',
        tax_rate: 15,
        is_active: true,
      });
      setTimeout(() => barcodeRef.current?.focus(), 100);
    }
  }, [isOpen, product]);

  const resetForm = () => {
    setForm({
      barcode: '',
      name: '',
      description: '',
      category_id: '',
      product_type: 'COMMERCIAL',
      pvp: '',
      unit_cost: '',
      stock: '0',
      min_stock: '0',
      tax_rate: 15,
      is_active: true,
    });
    setErrors({});
  };

  // ── Handlers ──
  const setFormField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const handleBarcodeChange = (value) => {
    const raw = value.replace(/\D/g, '').slice(0, INVENTORY_CONSTANTS.BARCODE_LENGTH);
    setFormField('barcode', raw);
  };

  const handleGenerateBarcode = () => {
    setFormField('barcode', generateUniqueBarcode());
    barcodeRef.current?.focus();
  };

  const handleChange = (key, value) => {
    setFormField(key, value);
  };

  // ── Validación ──
  const validateForm = () => {
    const err = {};
    if (!toSafeString(form.name)) err.name = ERROR_MESSAGES.VALIDATION_NAME || 'El nombre es requerido';
    if (!form.category_id) err.category_id = ERROR_MESSAGES.VALIDATION_CATEGORY || 'La categoría es requerida';
    const barcode = toSafeString(form.barcode);
    if (!barcode || barcode.length < 8) err.barcode = ERROR_MESSAGES.VALIDATION_BARCODE || 'Código de barras inválido';
    const pvp = toNumber(form.pvp);
    if (!form.pvp || pvp <= 0) err.pvp = ERROR_MESSAGES.VALIDATION_PVP || 'El PVP es requerido';
    if (!form.product_type) err.product_type = 'El tipo de producto es requerido';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  // ── Envío ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const pvpValue = toNumber(form.pvp);
    const taxRateValue = Number(form.tax_rate);
    const sellingPrice = taxRateValue > 0
      ? Number((pvpValue / (1 + taxRateValue / 100)).toFixed(2))
      : pvpValue;

    const payload = {
      barcode: toSafeString(form.barcode),
      name: toSafeString(form.name),
      description: toSafeString(form.description) || null,
      category_id: toNumber(form.category_id),
      product_type: form.product_type || 'COMMERCIAL',
      selling_price: sellingPrice,
      price: pvpValue,
      unit_cost: toNumber(form.unit_cost),
      stock: toNumber(form.stock),
      min_stock: toNumber(form.min_stock),
      tax_rate: taxRateValue,
      is_taxable: taxRateValue,
      is_active: toBoolean(form.is_active),
    };
    
    await onSave(payload);
  };

  // ── Desglose de precios en tiempo real ──
  const pvpValue = toNumber(form.pvp);
  const taxRateValue = Number(form.tax_rate);
  const sellingPrice = taxRateValue > 0
    ? Number((pvpValue / (1 + taxRateValue / 100)).toFixed(2))
    : pvpValue;
  const taxAmount = Number((pvpValue - sellingPrice).toFixed(2));

  // ── Opciones para combos ──
  const categoryOptions = categories.map(c => ({ 
    label: c.name, 
    value: String(c.id) 
  }));
  
  const taxOptions = [
    { label: 'Sin IVA (0%)', value: '0' },
    { label: 'IVA 5%', value: '5' },
    { label: 'IVA 8%', value: '8' },
    { label: 'IVA 12%', value: '12' },
    { label: 'IVA 15%', value: '15' },
  ];

  // ── Footer del modal ──
  const footer = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={onClose}
        disabled={isSaving}
      >
        Cancelar
      </IconTextButton>
      <IconTextButton
        variant="success"
        size="md"
        icon={<FiSave size={14} />}
        onClick={handleSubmit}
        type="submit"
        loading={isSaving}
        disabled={isSaving}
      >
        {product ? 'Modificar' : 'Guardar'}
      </IconTextButton>
    </ButtonGroup>
  );

  // ── Render ──
  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Editar Producto' : 'Nuevo Producto'}
      size="m"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="product-modal-form">
        <div className="form-grid">
          {/* ── Código de Barras ── */}
          <div className="full-width">
            <label className="field-label">
              Código de Barras <span className="required">*</span>
            </label>
            <div className="barcode-field-wrap">
              <Input
                ref={barcodeRef}
                value={form.barcode}
                onChange={handleBarcodeChange}
                placeholder="EAN-13 (13 dígitos)"
                size="md"
                error={errors.barcode}
                maxLength={13}
                className="barcode-input"
                containerClassName="flex-1"
                disabled={isSaving}
              />
              <IconTextButton
                variant="success"
                size="md"
                icon={<FiRefreshCw size={14} />}
                onClick={handleGenerateBarcode}
                title="Generar código de barras"
                className="btn-generate-barcode"
                disabled={isSaving}
              >
                Generar
              </IconTextButton>
            </div>
            {!form.barcode && <small className="hint">EAN-13 · 13 dígitos</small>}
          </div>

          {/* ── Nombre + Categoría ── */}
          <div className="full-width">
            <div className="modal-grid-2">
              <div>
                <label className="field-label">
                  Nombre <span className="required">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(val) => handleChange('name', val)}
                  placeholder="Ej: Producto A"
                  size="md"
                  error={errors.name}
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="field-label">
                  Categoría <span className="required">*</span>
                </label>
                <CustomCombobox
                  options={categoryOptions}
                  value={String(form.category_id)}
                  onChange={(val) => handleChange('category_id', val)}
                  placeholder={loadingCategories ? 'Cargando...' : 'Seleccionar categoría'}
                  filterable
                  disabled={loadingCategories || isSaving}
                  forceDropup={false}
                />
                {errors.category_id && <span className="error-text">{errors.category_id}</span>}
              </div>
            </div>
          </div>

          {/* ── Descripción + Tipo de Producto ── */}
          <div className="full-width">
            <div className="modal-grid-2">
              <div>
                <label className="field-label">Descripción</label>
                <Input
                  type="textarea"
                  value={form.description}
                  onChange={(val) => handleChange('description', val)}
                  placeholder="Descripción adicional del producto"
                  rows={2}
                  size="md"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="field-label">
                  Tipo de Producto <span className="required">*</span>
                </label>
                <CustomCombobox
                  options={PRODUCT_TYPES.map(t => ({ 
                    label: t.label, 
                    value: t.value 
                  }))}
                  value={form.product_type}
                  onChange={(val) => handleChange('product_type', val)}
                  placeholder="Seleccionar tipo"
                  filterable={false}
                  disabled={isSaving}
                  forceDropup={false}
                />
                {errors.product_type && <span className="error-text">{errors.product_type}</span>}
              </div>
            </div>
          </div>

          {/* ── PVP · Costo · Stock · Stock Mínimo ── */}
          <div className="full-width">
            <div className="modal-grid-4">
              <div>
                <label className="field-label">
                  P.V.P <span className="required">*</span>
                </label>
                <div className="currency-input">
                  <span className="currency-symbol">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.pvp}
                    onChange={(val) => handleChange('pvp', val)}
                    placeholder="0.00"
                    error={errors.pvp}
                    className="currency-field"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Costo</label>
                <div className="currency-input">
                  <span className="currency-symbol">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.unit_cost}
                    onChange={(val) => handleChange('unit_cost', val)}
                    placeholder="0.00"
                    className="currency-field"
                    disabled={isSaving}
                  />
                </div>
              </div>
              <div>
                <label className="field-label">Stock</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.stock}
                  onChange={(val) => handleChange('stock', val)}
                  placeholder="0"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="field-label">Stock Mínimo</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.min_stock}
                  onChange={(val) => handleChange('min_stock', val)}
                  placeholder="0"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* ── Tasa IVA ── */}
          <div className="full-width">
            <label className="field-label">Tasa IVA</label>
            <CustomCombobox
              options={taxOptions}
              value={String(form.tax_rate)}
              onChange={(val) => handleChange('tax_rate', Number(val))}
              placeholder="Seleccionar tasa"
              filterable={false}
              forceDropup={false}
              disabled={isSaving}
            />
          </div>

          {/* ── Desglose de precios ── */}
          {pvpValue > 0 && (
            <div className="full-width price-breakdown">
              <div className="breakdown-row highlighted">
                <span className="breakdown-label">Precio Final (con IVA)</span>
                <span className="breakdown-value">${pvpValue.toFixed(2)}</span>
              </div>
              {taxRateValue > 0 && (
                <>
                  <div className="breakdown-row iva-rate">
                    <span className="breakdown-label">Tasa IVA</span>
                    <span className="breakdown-value">{taxRateValue}%</span>
                  </div>
                  <div className="breakdown-row iva-amount">
                    <span className="breakdown-label">Monto IVA</span>
                    <span className="breakdown-value">${taxAmount.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="breakdown-row base-price">
                <span className="breakdown-label">Precio sin IVA (base)</span>
                <span className="breakdown-value">${sellingPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* ── Activo ── */}
          <div className="full-width checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => handleChange('is_active', e.target.checked)}
                disabled={isSaving}
              />
              <span>{form.is_active ? 'Activo' : 'Inactivo'}</span>
            </label>
          </div>
        </div>

        {errors.submit && (
          <div className="error-message">
            ⚠️ {errors.submit}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default ProductModal;