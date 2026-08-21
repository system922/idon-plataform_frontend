import React from 'react';
import { 
  FiTag, FiPackage, FiGift, FiShoppingBag, FiDollarSign, 
  FiLayers, FiHash, FiList, FiCheckCircle, FiPlus,
} from 'react-icons/fi';
import Input from '../Input';
import CustomCombobox from '../CustomCombobox';

const BasicTab = ({
  form,
  setField,
  comboMode,
  setComboMode,
  comboItems,
  setComboItems,
  comboNewItem,
  setComboNewItem,
  categoryMode,
  setCategoryMode,
  couponMode,
  setCouponMode,
  multiProductIds,
  toggleMultiProduct,
  productSearch,
  setProductSearch,
  categories,
  products,
  ivaRate,
  pvpCalc,
  setPvpCalc,
  modeButtonStyle
}) => {
  return (
    <div className="basic-tab">
      <div className="basic-tab-mode-buttons">
        <button
          type="button"
          onClick={() => setComboMode(false)}
          className={`basic-tab-mode-btn ${!comboMode ? 'basic-tab-mode-btn--active' : 'basic-tab-mode-btn--inactive'}`}
        >
          <FiTag size={14} /> Descuento estándar
        </button>
        <button
          type="button"
          onClick={() => setComboMode(true)}
          className={`basic-tab-mode-btn ${comboMode ? 'basic-tab-mode-btn--active' : 'basic-tab-mode-btn--inactive'}`}
        >
          <FiPackage size={14} /> Combo / Paquete
        </button>
      </div>

      <div>
        <label className="basic-tab-label">
          Nombre del descuento *
        </label>
        <Input
          type="text"
          value={form.name}
          onChange={(value) => setField('name', value)}
          placeholder={comboMode ? 'Ej: COMBO PROMO' : 'Ej: Descuento de fin de semana'}
          size="md"
          required
        />
      </div>

      <div>
        <label className="basic-tab-label">
          Descripción
        </label>
        <textarea
          className="basic-tab-textarea"
          rows="2"
          value={form.description || ''}
          onChange={e => setField('description', e.target.value)}
          placeholder={comboMode
            ? 'Ej: 1 hot dog + 1 sánduche + 2 bubble tea a precio especial'
            : 'Descripción de la promoción...'}
        />
      </div>

      {comboMode ? (
        <ComboSection
          form={form}
          setField={setField}
          comboItems={comboItems}
          setComboItems={setComboItems}
          comboNewItem={comboNewItem}
          setComboNewItem={setComboNewItem}
          products={products}
          ivaRate={ivaRate}
        />
      ) : (
        <StandardSection
          form={form}
          setField={setField}
          categoryMode={categoryMode}
          setCategoryMode={setCategoryMode}
          couponMode={couponMode}
          setCouponMode={setCouponMode}
          multiProductIds={multiProductIds}
          toggleMultiProduct={toggleMultiProduct}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          categories={categories}
          products={products}
          ivaRate={ivaRate}
          pvpCalc={pvpCalc}
          setPvpCalc={setPvpCalc}
        />
      )}
    </div>
  );
};

const ComboSection = ({ form, setField, comboItems, setComboItems, comboNewItem, setComboNewItem, products, ivaRate }) => {
  return (
    <div className="combo-section">
      <div>
        <label className="basic-tab-label">
          Precio del combo ($) *
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={form.value}
          onChange={(value) => setField('value', value)}
          placeholder="ej: 10.00"
          size="md"
          required
        />
      </div>

      <div>
        <label className="basic-tab-label">
          Productos del combo *
          <span className="basic-tab-label--combo-count">
            (mín. 2 productos)
          </span>
        </label>

        {comboItems.length > 0 && (
          <div className="combo-section__products-list">
            {comboItems.map((ci, idx) => {
              const prod = products.find(p => String(p.id) === String(ci.id));
              return (
                <div key={idx} className="combo-section__product-item">
                  <span className="combo-section__product-name">
                    <strong>{ci.qty}×</strong>{' '}
                    {prod?.name || ci.name || 'Producto'}
                  </span>
                  <span className="combo-section__product-price">
                    ${((prod?.selling_price || 0) * ci.qty).toFixed(2)}
                  </span>
                  <div className="combo-section__product-qty-controls">
                    <button 
                      type="button" 
                      onClick={() => setComboItems(prev =>
                        prev.map((x, i) => i === idx ? { ...x, qty: Math.max(1, x.qty - 1) } : x)
                      )} 
                      className="combo-section__qty-btn"
                    >
                      −
                    </button>
                    <span className="combo-section__qty-value">
                      {ci.qty}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setComboItems(prev =>
                        prev.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x)
                      )} 
                      className="combo-section__qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                    className="combo-section__remove-btn"
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {(() => {
              const baseRegular = comboItems.reduce((s, ci) => {
                const p = products.find(x => String(x.id) === String(ci.id));
                return s + (p?.selling_price || 0) * ci.qty;
              }, 0);
              const pvpRegular = baseRegular * (1 + ivaRate / 100);
              const comboVal = parseFloat(form.value) || 0;
              const ahorro = Math.max(0, pvpRegular - comboVal);
              return (
                <div className="combo-section__summary">
                  PVP regular:{' '}
                  <strong>${pvpRegular.toFixed(2)}</strong>
                  {comboVal > 0 && (
                    <> → cliente paga <strong className="combo-price">${comboVal.toFixed(2)}</strong>
                    {' '}(ahorra <strong className="savings">${ahorro.toFixed(2)}</strong>)
                    <div className="iva-note">
                      Precio combo incluye IVA del {ivaRate}%
                    </div>
                  </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        <div className="combo-section__add-row">
          <div className="combo-section__product-select">
            <CustomCombobox
              options={products
                .filter(p => !comboItems.some(ci => String(ci.id) === String(p.id)))
                .map(p => ({ label: `${p.name} ($${p.selling_price})`, value: p.id }))}
              value={comboNewItem.product_id}
              onChange={(value) => setComboNewItem(p => ({ ...p, product_id: value }))}
              placeholder="Seleccionar producto..."
              filterable
              forceDropup={false}
            />
          </div>
          <div className="combo-section__qty-input">
            <Input
              type="number"
              min="1"
              step="1"
              value={comboNewItem.qty}
              onChange={(value) => setComboNewItem(p => ({ ...p, qty: parseInt(value) || 1 }))}
              style={{ textAlign: 'center' }}
              size="md"
            />
          </div>
          <button
            type="button"
            disabled={!comboNewItem.product_id}
            onClick={() => {
              const prod = products.find(p => String(p.id) === String(comboNewItem.product_id));
              if (!prod) return;
              setComboItems(prev => [...prev, { id: comboNewItem.product_id, qty: comboNewItem.qty, name: prod.name }]);
              setComboNewItem({ product_id: '', qty: 1 });
            }}
            className={`combo-section__add-btn ${comboNewItem.product_id ? 'combo-section__add-btn--enabled' : 'combo-section__add-btn--disabled'}`}
          >
            <FiPlus size={14} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

const StandardSection = ({ 
  form, setField, categoryMode, setCategoryMode, couponMode, setCouponMode,
  multiProductIds, toggleMultiProduct, productSearch, setProductSearch,
  categories, products, ivaRate, pvpCalc, setPvpCalc 
}) => {
  return (
    <div className="standard-section">
      {/* Fila 1: Tipo + Valor */}
      <div className="standard-section__row">
        <div className="form-group">
          <label className="basic-tab-label">
            T.descuento *
          </label>
          {form.applies_to === 'category' && categoryMode === 'second' ? (
            <div className="basic-tab-display-input basic-tab-display-input--success">
              <FiShoppingBag size={14} /> 2do producto con % de descuento
            </div>
          ) : form.applies_to === 'category' && categoryMode === 'fixed_price' ? (
            <div className="basic-tab-display-input basic-tab-display-input--info">
              <FiTag size={14} /> Precio fijo por unidad
            </div>
          ) : (
            <CustomCombobox
              options={[
                { label: 'Porcentaje (%)', value: 'percentage' },
                { label: 'Monto fijo ($)', value: 'fixed' },
                ...(form.applies_to !== 'category' ? [{ label: 'Compra X, lleva Y', value: 'buy_x_get_y' }] : []),
                { label: 'Volumen/Mayoreo', value: 'bulk' },
                { label: 'Cupón', value: 'coupon' },
              ]}
              value={form.type}
              onChange={(value) => { setField('type', value); setPvpCalc(''); }}
              placeholder="Seleccionar tipo..."
              filterable
              forceDropup={false}
            />
          )}
        </div>

        <div className="form-group">
          <label className="basic-tab-label">
            {categoryMode === 'fixed_price'
              ? 'Precio fijo por unidad ($) *'
              : <>Valor * {form.type === 'fixed' && pvpCalc && (
                  <span style={{ 
                    color: 'var(--success, #10b981)', 
                    fontWeight: 'var(--font-weight-normal, 400)', 
                    textTransform: 'none', 
                    fontSize: 'var(--font-size-xs, 11px)' 
                  }}>
                    — calculado desde precio objetivo
                  </span>
                )}</>
            }
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(value) => { setField('value', value); setPvpCalc(''); }}
            placeholder={categoryMode === 'fixed_price' ? 'ej: 2.00' : form.type === 'percentage' ? '10' : '5.00'}
            size="md"
            required
          />
        </div>
      </div>

      {/* Aplicar a */}
      {form.type !== 'coupon' && (
        <>
          {form.applies_to === 'order' ? (
            <div className="form-group">
              <label className="basic-tab-label">
                Aplicar a
              </label>
              <div className="standard-section__applies-to">
                <CustomCombobox
                  options={[
                    { label: 'Toda la orden', value: 'order' },
                    { label: 'Producto específico', value: 'product' },
                    { label: 'Categoría específica', value: 'category' },
                  ]}
                  value={form.applies_to}
                  onChange={(value) => {
                    setField('applies_to', value);
                    if (value !== 'category') {
                      setCategoryMode('all');
                      if (form.type === 'buy_x_get_y') setField('type', 'percentage');
                    }
                  }}
                  placeholder="Seleccionar..."
                  filterable
                  forceDropup={false}
                />
              </div>
            </div>
          ) : form.applies_to === 'product' ? (
            <div className="standard-section__row">
              <div className="form-group">
                <label className="basic-tab-label">
                  Aplicar a
                </label>
                <CustomCombobox
                  options={[
                    { label: 'Toda la orden', value: 'order' },
                    { label: 'Producto específico', value: 'product' },
                    { label: 'Categoría específica', value: 'category' },
                  ]}
                  value={form.applies_to}
                  onChange={(value) => {
                    setField('applies_to', value);
                    if (value !== 'category') {
                      setCategoryMode('all');
                      if (form.type === 'buy_x_get_y') setField('type', 'percentage');
                    }
                  }}
                  placeholder="Seleccionar..."
                  filterable
                  forceDropup={false}
                />
              </div>
              <div className="form-group">
                <label className="basic-tab-label">
                  Producto
                </label>
                <CustomCombobox
                  options={products.map(p => ({ label: p.name, value: p.id }))}
                  value={form.product_id || ''}
                  onChange={(value) => setField('product_id', value)}
                  placeholder="Seleccionar producto..."
                  filterable
                  forceDropup={false}
                />
              </div>
            </div>
          ) : form.applies_to === 'category' && (
            <div className="standard-section__row">
              <div className="form-group">
                <label className="basic-tab-label">
                  Aplicar a
                </label>
                <CustomCombobox
                  options={[
                    { label: 'Toda la orden', value: 'order' },
                    { label: 'Producto específico', value: 'product' },
                    { label: 'Categoría específica', value: 'category' },
                  ]}
                  value={form.applies_to}
                  onChange={(value) => {
                    setField('applies_to', value);
                    if (value !== 'category') {
                      setCategoryMode('all');
                      if (form.type === 'buy_x_get_y') setField('type', 'percentage');
                    }
                  }}
                  placeholder="Seleccionar..."
                  filterable
                  forceDropup={false}
                />
              </div>
              <div className="form-group">
                <label className="basic-tab-label">
                  Categoría
                </label>
                <CustomCombobox
                  options={categories.map(c => ({ label: c.name, value: c.id }))}
                  value={form.category_id || ''}
                  onChange={(value) => setField('category_id', value)}
                  placeholder="Seleccionar categoría..."
                  filterable
                  forceDropup={false}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Modos de categoría */}
      {form.applies_to === 'category' && form.type !== 'coupon' && (
        <div className="category-modes">
          <label className="category-modes__label">
            Modo de descuento en categoría
          </label>
          <div className="category-modes__buttons">
            <button
              type="button"
              onClick={() => {
                setCategoryMode('all');
                if (form.type === 'buy_x_get_y') setField('type', 'percentage');
              }}
              className={`category-modes__btn category-modes__btn--all ${categoryMode === 'all' ? 'active' : ''}`}
            >
              <FiLayers size={20} />
              <div>A todos los productos</div>
              <div className="category-modes__btn-sub">
                Descuento sobre el total de la categoría
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCategoryMode('second');
                setField('type', 'buy_x_get_y');
                setField('min_quantity', 2);
              }}
              className={`category-modes__btn category-modes__btn--second ${categoryMode === 'second' ? 'active' : ''}`}
            >
              <FiHash size={20} />
              <div>2do producto con descuento</div>
              <div className="category-modes__btn-sub">
                El 1ro paga normal, el 2do al %
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setCategoryMode('fixed_price');
                setField('type', 'fixed');
              }}
              className={`category-modes__btn category-modes__btn--fixed ${categoryMode === 'fixed_price' ? 'active' : ''}`}
            >
              <FiTag size={20} />
              <div>Precio fijo por unidad</div>
              <div className="category-modes__btn-sub">
                Todos pagan el mismo precio
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Explicación para fixed_price */}
      {categoryMode === 'fixed_price' && form.applies_to === 'category' && (
        <div className="info-box info-box--fixed-price">
          <div className="info-box__title info-box__title--fixed">
            <FiTag size={14} /> Cómo funciona — Precio fijo por unidad
          </div>

          <div className="info-box__highlight">
            <span className="info-box__label info-box__label--info">
              El valor que ingresas es el precio FINAL con IVA
            </span> que paga el cliente por unidad.
            {parseFloat(form.value) > 0 && (
              <span className="info-box__text-muted">
                ${parseFloat(form.value).toFixed(2)} (PVP) → base sin IVA: <strong>
                  ${(parseFloat(form.value) / (1 + ivaRate / 100)).toFixed(2)}
                </strong> · IVA ({ivaRate}%): <strong>
                  ${(parseFloat(form.value) - parseFloat(form.value) / (1 + ivaRate / 100)).toFixed(2)}
                </strong>
              </span>
            )}
          </div>

          <div className="info-box__block">
            <span className="info-box__label info-box__label--success">
              Producto más caro que el precio fijo
            </span>
            <span className="info-box__text-muted">
              Si el producto cuesta más de ${parseFloat(form.value) > 0 ? parseFloat(form.value).toFixed(2) : '?'} (PVP), se cobra exactamente <strong className="info-highlight">
                ${parseFloat(form.value) > 0 ? parseFloat(form.value).toFixed(2) : '?'}
              </strong> c/u.
              {parseFloat(form.value) > 0 && ' El descuento = diferencia entre su precio normal y el precio fijo.'}
            </span>
          </div>

          <div className="info-box__block">
            <span className="info-box__label info-box__label--warning">
              Producto más barato que el precio fijo
            </span>
            <span className="info-box__text-muted">
              Si el producto cuesta menos de ${parseFloat(form.value) > 0 ? parseFloat(form.value).toFixed(2) : '?'} (PVP), se cobra a su <strong>precio normal</strong> — no se aplica ningún descuento ni se sube el precio.
            </span>
          </div>

          <div>
            <span className="info-box__label info-box__label--purple">
              Extras / productos de otras categorías
            </span>
            <span className="info-box__text-muted">
              Los productos fuera de <strong>
                {form.category_id && categories.find(c => String(c.id) === String(form.category_id))?.name || 'la categoría'}
              </strong> se suman a precio normal. El total final = precio fijo × unidades de la categoría + precio normal de los demás.
            </span>
          </div>
        </div>
      )}

      {/* Explicación para second mode */}
      {categoryMode === 'second' && form.applies_to === 'category' && (
        <div className="info-box info-box--second">
          <div className="info-box__title info-box__title--second">
            <FiGift size={14} /> Cómo funciona
          </div>
          <div>
            Cuando haya <strong>2 o más productos</strong> de la categoría
            {form.category_id && categories.find(c => String(c.id) === String(form.category_id)) && (
              <strong style={{ color: 'var(--primary, #f97316)' }}>
                {' '}{categories.find(c => String(c.id) === String(form.category_id)).name}
              </strong>
            )},
            el más barato recibe el <strong style={{ color: 'var(--success, #10b981)' }}>{form.value || '?'}% de descuento</strong>.
          </div>
          <div style={{ marginTop: 'var(--space-2, 6px)', color: 'var(--text-muted, rgba(255,255,255,0.5))', fontSize: 'var(--font-size-sm, 12px)' }}>
            Ej: 2 postres → el 1ro paga precio normal, el 2do paga con {form.value || '?'}% OFF.
            Con 4 postres → 2 pagan normal y 2 con descuento.
          </div>
        </div>
      )}

      {/* Cupón */}
      {form.type === 'coupon' && (
        <CouponSection
          form={form}
          setField={setField}
          couponMode={couponMode}
          setCouponMode={setCouponMode}
          multiProductIds={multiProductIds}
          toggleMultiProduct={toggleMultiProduct}
          productSearch={productSearch}
          setProductSearch={setProductSearch}
          products={products}
          categories={categories}
          ivaRate={ivaRate}
        />
      )}
    </div>
  );
};

const CouponSection = ({ 
  form, setField, couponMode, setCouponMode,
  multiProductIds, toggleMultiProduct, productSearch, setProductSearch,
  products, categories, ivaRate
}) => {
  return (
    <div className="coupon-section">
      <div className="coupon-section__title">
        <FiGift size={14} /> Configuración del Cupón
      </div>

      <div className="coupon-section__modes">
        <button
          type="button"
          onClick={() => { setCouponMode('fixed'); setField('applies_to', 'order'); setField('product_id', ''); setField('category_id', ''); }}
          className={`coupon-section__mode-btn ${couponMode === 'fixed' ? 'coupon-section__mode-btn--active' : 'coupon-section__mode-btn--inactive'}`}
        >
          <FiDollarSign size={14} />
          Monto fijo
          <div className="coupon-section__mode-sub">
            Descuenta $ del total
          </div>
        </button>
        <button
          type="button"
          onClick={() => { setCouponMode('product'); setField('applies_to', 'product'); setField('category_id', ''); }}
          className={`coupon-section__mode-btn ${couponMode === 'product' ? 'coupon-section__mode-btn--active' : 'coupon-section__mode-btn--inactive'}`}
        >
          <FiGift size={14} />
          Producto gratis
          <div className="coupon-section__mode-sub">
            1 producto específico
          </div>
        </button>
        <button
          type="button"
          onClick={() => { setCouponMode('category'); setField('applies_to', 'category'); setField('product_id', ''); setField('value', '100'); }}
          className={`coupon-section__mode-btn ${couponMode === 'category' ? 'coupon-section__mode-btn--active' : 'coupon-section__mode-btn--inactive'}`}
        >
          <FiTag size={14} />
          Categoría a elección
          <div className="coupon-section__mode-sub">
            Cliente elige qué item
          </div>
        </button>
        <button
          type="button"
          onClick={() => { setCouponMode('multiproduct'); setField('applies_to', 'products_list'); setField('product_id', ''); setField('category_id', ''); setField('value', '100'); }}
          className={`coupon-section__mode-btn ${couponMode === 'multiproduct' ? 'coupon-section__mode-btn--active' : 'coupon-section__mode-btn--inactive'}`}
        >
          <FiList size={14} />
          Varios productos
          <div className="coupon-section__mode-sub">
            Elige de una lista
          </div>
        </button>
      </div>

      <div>
        <label className="basic-tab-label">
          Código del cupón *
        </label>
        <Input
          type="text"
          value={form.code || ''}
          onChange={(value) => setField('code', value.toUpperCase().replace(/\s/g, ''))}
          placeholder="EJ: GRATIS-LATTE"
          size="md"
        />
        <small className="help-text">
          El cajero debe ingresar este código exacto en el POS para activar el descuento.
        </small>
      </div>

      {couponMode === 'fixed' && (
        <div>
          <label className="basic-tab-label">
            Valor del descuento ($) *
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(value) => setField('value', value)}
            placeholder="Ej: 5.00"
            size="md"
          />
          <small className="help-text">
            Monto que se descuenta del subtotal de la orden (sin IVA).
          </small>
        </div>
      )}

      {couponMode === 'category' && (
        <>
          <div>
            <label className="basic-tab-label">
              Descuento sobre el ítem seleccionado (%)
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={form.value}
              onChange={(value) => setField('value', value)}
              placeholder="100"
              size="md"
            />
            <small className="help-text">
              100 = completamente gratis. 50 = mitad de precio.
            </small>
          </div>
          <div className="coupon-section__product-info">
            <div className="coupon-section__product-info-title">
              Cómo funciona en el POS
            </div>
            <div className="coupon-section__product-info-text">
              Al ingresar el código en caja, el cajero verá <strong style={{ color: 'var(--primary, #f97316)' }}>todos los productos de la orden</strong> y elige cuál(es) reciben el {form.value || 100}% de descuento.
            </div>
          </div>
        </>
      )}

      {couponMode === 'multiproduct' && (
        <>
          <div>
            <label className="basic-tab-label">
              Productos que el cliente puede recibir gratis *
            </label>
            <Input
              type="text"
              placeholder="Buscar producto..."
              value={productSearch}
              onChange={(value) => setProductSearch(value)}
              size="md"
              style={{ marginBottom: 'var(--space-2, 8px)' }}
            />
            <div className="coupon-section__product-list">
              {products
                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                .map(p => {
                  const checked = multiProductIds.includes(String(p.id));
                  const pvp = (parseFloat(p.selling_price || 0) * (1 + ivaRate / 100)).toFixed(2);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleMultiProduct(String(p.id))}
                      className={`coupon-section__product-item ${checked ? 'coupon-section__product-item--checked' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        readOnly 
                      />
                      <span className={`coupon-section__product-name ${checked ? 'coupon-section__product-name--checked' : ''}`}>
                        {p.name}
                      </span>
                      <span className="coupon-section__product-price">
                        ${pvp}
                      </span>
                    </div>
                  );
                })}
              {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                <div style={{ 
                  padding: '14px 12px', 
                  fontSize: 'var(--font-size-sm, 12px)', 
                  color: 'var(--text-muted, #555)', 
                  textAlign: 'center' 
                }}>
                  Sin resultados
                </div>
              )}
            </div>
            {multiProductIds.length > 0 && (
              <div className="coupon-section__selected-count">
                <FiCheckCircle size={12} style={{ display: 'inline', marginRight: 'var(--space-1, 4px)' }} /> 
                {multiProductIds.length} producto{multiProductIds.length !== 1 ? 's' : ''} seleccionado{multiProductIds.length !== 1 ? 's' : ''}
              </div>
            )}
            <small className="help-text">
              En caja, el cajero verá solo estos productos de la orden y elegirá cuál(es) recibe gratis el cliente.
            </small>
          </div>
          <div>
            <label className="basic-tab-label">
              Descuento sobre el ítem seleccionado (%)
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              step="1"
              value={form.value}
              onChange={(value) => setField('value', value)}
              placeholder="100"
              size="md"
            />
            <small className="help-text">
              100 = completamente gratis. 50 = mitad de precio.
            </small>
          </div>
        </>
      )}

      {couponMode === 'product' && (
        <>
          <div>
            <label className="basic-tab-label">
              Producto que se regala *
            </label>
            <CustomCombobox
              options={products.map(p => ({
                label: `${p.name} — base $${parseFloat(p.selling_price || 0).toFixed(2)} · PVP $${(parseFloat(p.selling_price || 0) * (1 + ivaRate / 100)).toFixed(2)}`,
                value: p.id
              }))}
              value={form.product_id || ''}
              onChange={(value) => {
                const prod = products.find(p => String(p.id) === value);
                setField('product_id', value);
                setField('applies_to', 'product');
                if (prod) {
                  setField('value', parseFloat(prod.selling_price || prod.price || 0).toFixed(2));
                }
              }}
              placeholder="Seleccionar producto..."
              filterable
              forceDropup={false}
            />
          </div>

          {form.product_id && (() => {
            const prod = products.find(p => String(p.id) === String(form.product_id));
            if (!prod) return null;
            const base = parseFloat(prod.selling_price || 0);
            const pvp = base * (1 + ivaRate / 100);
            return (
              <div className="coupon-section__product-info">
                <div className="coupon-section__product-info-title">
                  <FiGift size={14} /> 
                  {prod.name} — completamente gratis
                </div>
                <div className="coupon-section__product-info-text">
                  Precio base (sin IVA): <strong>${base.toFixed(2)}</strong>
                  {' '}· IVA {ivaRate}%: <strong>${(pvp - base).toFixed(2)}</strong>
                  {' '}· PVP: <strong className="pvp-highlight">${pvp.toFixed(2)}</strong>
                </div>
                <div className="coupon-section__product-info-note">
                  El descuento aplicado será <strong>${base.toFixed(2)}</strong> (base sin IVA).
                  El cupón solo se activa si el producto está en la orden.
                </div>
              </div>
            );
          })()}

          <div>
            <label className="basic-tab-label">
              Valor del descuento (base sin IVA) *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.value}
              onChange={(value) => setField('value', value)}
              placeholder="Se llena automáticamente al seleccionar producto"
              size="md"
            />
            <small className="help-text">
              Se auto-completa con el precio base del producto. Ajusta si es necesario.
            </small>
          </div>
        </>
      )}
    </div>
  );
};

export default BasicTab;