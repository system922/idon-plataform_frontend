import React, { useState, useEffect } from 'react';
import Modal from './General/Modal';
import CustomCombobox from './General/CustomCombobox';
import Input from './General/Input';
import { IconTextButton, ButtonGroup } from './General/Button';

export default function EditItemModal({
  showEditItemModal,
  setShowEditItemModal,
  productos,
  productoSeleccionado,
  setProductoSeleccionado,
  cantidadItem,
  setCantidadItem,
  notasItem,
  setNotasItem,
  guardarEdicionItem,
  categorias,
  extrasItem = [],
  setExtrasItem = () => {},
}) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [extraSel, setExtraSel] = useState('');

  useEffect(() => {
    if (showEditItemModal && productoSeleccionado) {
      setCategoriaSeleccionada(productoSeleccionado.category_name || '');
    }
  }, [showEditItemModal, productoSeleccionado]);

  const getProductData = (product) => {
    if (!product) return { selling_price: 0, tax_rate: 0, price: 0 };

    return {
      selling_price: Number(product.selling_price) || 0,
      tax_rate: Number(product.tax_rate) || 0,
      price:
        (Number(product.selling_price) || 0) +
        (Number(product.tax_rate) || 0),
    };
  };

  const extrasProductos = productos
    .filter((p) => p.category_name?.toLowerCase() === 'extras')
    .map((p) => ({
      ...p,
      displayPrice:
        (Number(p.selling_price) || 0) +
        (Number(p.tax_rate) || 0),
    }));

  const categoriasFiltradas = categorias.filter(
    (c) => c.name?.toLowerCase() !== 'extras'
  );

  const productosFiltrados = categoriaSeleccionada
    ? productos.filter((p) => p.category_name === categoriaSeleccionada)
    : productos.filter(
        (p) => p.category_name?.toLowerCase() !== 'extras'
      );

  const handleClose = () => {
    setShowEditItemModal(false);
    setExtrasItem([]);
    setExtraSel('');
  };

  const handleAgregarExtra = () => {
    if (!extraSel) return;

    const extra = extrasProductos.find(
      (e) => String(e.id) === extraSel
    );

    if (!extra) return;

    setExtrasItem((prev) => [
      ...prev,
      {
        id: extra.id,
        name: extra.name,
        price: extra.displayPrice,
        selling_price: Number(extra.selling_price) || 0,
        // 🔥 IMPORTANTE: usar is_taxable como porcentaje
        tax_rate: Number(extra.is_taxable) || 0,      // ← porcentaje
        is_taxable: Number(extra.is_taxable) || 0,    // ← también guardamos el porcentaje
        iva_amount: 0, // se recalculará al guardar
        nota: ''
      },
    ]);

    setExtraSel('');
  };

  const footer = (
    <ButtonGroup
      style={{
        display: 'flex',
        gap: 'var(--space-2)',
        justifyContent: 'flex-end',
      }}
    >
      <IconTextButton
        variant=""
        size="md"
        onClick={handleClose}
      >
        Cancelar
      </IconTextButton>

      <IconTextButton
        variant="success"
        size="md"
        onClick={guardarEdicionItem}
        disabled={!productoSeleccionado}
      >
        Guardar cambios
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <Modal
      isOpen={showEditItemModal}
      onClose={handleClose}
      title="Editar item"
      size="lg"
      footer={footer}
    >
      <div className="add-item-content">
        {/* FILA 1 */}
        <div className="add-item-row add-item-row--first">
          <div className="add-item-field add-item-field--category">
            <label>Categoría</label>
            <CustomCombobox
              options={categoriasFiltradas.map(cat => ({
                value: cat.name,
                label: cat.name
              }))}
              value={categoriaSeleccionada}
              onChange={setCategoriaSeleccionada}
              placeholder="Categoría"
              filterable
              size="sm"
              forceDropup={false}
            />
          </div>

          <div className="add-item-field add-item-field--product">
            <label>Producto</label>
            <CustomCombobox
              options={productosFiltrados.map(p => ({
                value: String(p.id),
                label: p.name
              }))}
              value={productoSeleccionado ? String(productoSeleccionado.id) : ''}
              onChange={(val) => {
                const producto = productosFiltrados.find(
                  p => String(p.id) === val
                );

                if (producto) {
                  setProductoSeleccionado({
                    ...producto,
                    ...getProductData(producto),
                  });
                } else {
                  setProductoSeleccionado(null);
                }
              }}
              placeholder="Producto"
              filterable
              size="sm"
              className="combobox-wide combobox-sm"
              forceDropup={false}
            />
          </div>

          <div className="add-item-field add-item-field--quantity">
            <label>Cantidad</label>
            <div className="stepper">
              <button
                type="button"
                className="stepper-btn"
                onClick={() =>
                  setCantidadItem(v => Math.max(1, Number(v) - 1))
                }
              >
                −
              </button>
              <Input
                type="number"
                value={String(cantidadItem)}
                onChange={(val) =>
                  setCantidadItem(Math.max(1, Number(val) || 1))
                }
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() =>
                  setCantidadItem(v => Number(v) + 1)
                }
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* FILA 2 */}
        <div className="add-item-row add-item-row--second">
          <div className="add-item-field add-item-field--extras">
            <label>Extras</label>
            <CustomCombobox
              options={extrasProductos.map(ex => ({
                value: String(ex.id),
                label: `${ex.name} - $${ex.displayPrice.toFixed(2)}`
              }))}
              value={extraSel}
              onChange={setExtraSel}
              placeholder="Seleccionar extra"
              filterable
              size="sm"
              className="combobox-wide combobox-sm"
              forceDropup={false}
            />
          </div>

          <div className="add-item-field add-item-field--extras-btn">
            <IconTextButton
              variant="success"
              size="sm"
              onClick={handleAgregarExtra}
              disabled={!extraSel}
            >
              Agregar extra
            </IconTextButton>
          </div>
        </div>

        {/* FILA 3 */}
        {extrasItem.length > 0 && (
          <div className="add-item-extras-list">
            {extrasItem.map((e, i) => (
              <div key={i} className="add-item-extra-item">
                <span className="add-item-extra-name">
                  + {e.name}
                </span>
                <span className="add-item-extra-price">
                  +${Number(e.price).toFixed(2)}
                </span>
                <button
                  type="button"
                  className="add-item-extra-remove"
                  onClick={() =>
                    setExtrasItem(prev =>
                      prev.filter((_, j) => j !== i)
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* FILA 4: Notas */}
        <div className="add-item-field add-item-field--notes">
          <label>Notas</label>
          <Input
            type="textarea"
            value={notasItem}
            onChange={setNotasItem}
            placeholder="Sin picante, sin cebolla..."
            size="sm"
            rows={2}
            style={{ minHeight: '40px' }}
          />
        </div>
      </div>
    </Modal>
  );
}