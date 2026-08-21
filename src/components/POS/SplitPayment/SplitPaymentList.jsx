// src/components/POS/SplitPayment/SplitPaymentList.jsx
import React from 'react';
import { IconTextButton, ButtonGroup } from '../../General/Button';
import { FiPlus, FiUser, FiX } from 'react-icons/fi';

const SplitPaymentList = ({
  clientesDivididos,
  selectedItems,
  selectedOrder,
  pagosRegistrados,
  totalPagadoAcumulado,
  totalOrdenBruto,
  onAgregarComensal,
  onAsignarItems,
  onSelectItem,
  onEliminarComensal,
  onQuitarItemDeComensal,
  onActualizarComensal,
  onCobrarComensal,
  fmt,
  calcularTotalComensal,
  calcularSubtotalComensal,
  calcularIVAComensal,
  obtenerItemsPendientes,
  clienteCedula,
  clienteNombre,
  clienteEmail
}) => {
  const assignedItemIds = clientesDivididos.flatMap(c => c.items || []);
  
  const itemsPendientes = obtenerItemsPendientes ? 
    obtenerItemsPendientes() : 
    (selectedOrder?.items?.filter(item => !item.paid && !assignedItemIds.includes(item.id)) || []);

  const totalPendiente = itemsPendientes.reduce((sum, item) => {
    const precio = Number(item.selling_price) || Number(item.unit_price) || 0;
    return sum + (precio * (Number(item.quantity) || 1));
  }, 0);

  const ivaPendiente = itemsPendientes.reduce((sum, item) => {
    const precio = Number(item.selling_price) || Number(item.unit_price) || 0;
    const taxRate = Number(item.tax_rate) || 0;
    return sum + (precio * (Number(item.quantity) || 1) * (taxRate / 100));
  }, 0);

  const totalConIva = totalPendiente + ivaPendiente;

  return (
    <div className="split-payment-list">
      <div className="split-header">
        <div className="split-header-info">
          <span className="split-title">Seleccione los productos para cada Comensal</span>
          <span className="split-total-pendiente">
            Total pendiente: {fmt(totalConIva)}
          </span>
        </div>
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="sm"
            icon={<FiPlus size={16} />}
            onClick={onAgregarComensal}
          >
            Agregar Comensal
          </IconTextButton>
        </ButtonGroup>
      </div>

      {itemsPendientes.length > 0 && (
        <div className="split-pending-items">
          <div className="pending-header">
            <span className="pending-title">Productos pendientes:</span>
            <span className="pending-count">{itemsPendientes.length} productos</span>
          </div>
          
          {itemsPendientes.map(item => {
            const precio = Number(item.selling_price) || Number(item.unit_price) || 0;
            const subtotal = precio * (Number(item.quantity) || 1);
            const taxRate = Number(item.tax_rate) || 0;
            const iva = subtotal * (taxRate / 100);
            const totalItem = subtotal + iva;
            const isSelected = selectedItems.includes(item.id);

            return (
              <div 
                key={item.id}
                className={`pending-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectItem(item.id)}
              >
                <div className="item-info">
                  <span className="item-quantity">{item.quantity}x</span>
                  <span className="item-name">{item.product_name || item.name}</span>
                </div>
                <div className="item-price">
                  {fmt(totalItem)}
                </div>
                {isSelected && (
                  <div className="item-selected-badge">✓</div>
                )}
              </div>
            );
          })}

          {selectedItems.length > 0 && (
            <div className="assign-actions">
              <span className="selected-count">
                {selectedItems.length} producto(s) seleccionado(s)
              </span>
              <ButtonGroup>
                {clientesDivididos.map((comensal, idx) => (
                  <IconTextButton
                    key={comensal.id}
                    variant="success"
                    size="sm"
                    icon={<FiUser size={14} />}
                    onClick={() => onAsignarItems(comensal.id)}
                  >
                    Asignar a Comensal {idx + 1}
                  </IconTextButton>
                ))}
              </ButtonGroup>
            </div>
          )}
        </div>
      )}

      {itemsPendientes.length === 0 && assignedItemIds.length > 0 && (
        <div className="split-no-pending">
          Todos los productos han sido asignados a comensales
        </div>
      )}

      {clientesDivididos.length > 0 && (
        <div className="split-comensales-resumen">
          <div className="resumen-header">
            <span>Resumen de comensales</span>
          </div>
          {clientesDivididos.map((comensal, idx) => {
            const totalComensal = calcularTotalComensal ? calcularTotalComensal(comensal) : 0;

            return (
              <div key={comensal.id} className="comensal-resumen-item">
                <span className="comensal-num">Comensal {idx + 1}</span>
                <span className="comensal-items-count">
                  {comensal.items?.length || 0} productos
                </span>
                <span className="comensal-total">{fmt(totalComensal)}</span>
                {comensal.facturaIndividual && (
                  <span className="comensal-factura-badge">📄 Factura</span>
                )}
                {clientesDivididos.length > 1 && (
                  <ButtonGroup>
                    <IconTextButton
                      variant="danger"
                      size="sm"
                      icon={<FiX size={16} />}
                      onClick={() => onEliminarComensal && onEliminarComensal(comensal.id)}
                    >
                      
                    </IconTextButton>
                  </ButtonGroup>

                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SplitPaymentList;