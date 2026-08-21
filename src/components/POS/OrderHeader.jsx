// src/components/POS/OrderHeader.jsx
import React from 'react';
import CustomCombobox from '../General/CustomCombobox';

const OrderHeader = ({ 
  selectedOrder, 
  orders, 
  onSelectOrder, 
  children 
}) => {
  // Convertir órdenes a opciones para el combobox
  const orderOptions = orders.map(order => {
    const lugar = order.mesa_numero ? `M.${order.mesa_numero}` : 
                 order.order_type === 'delivery' ? 'DEL' : 'LLEVAR';
    const prefix = order.status === 'completed' ? '✓ ' : 
                  order.status === 'sent' ? ' ' : '';
    const num = String(order.order_number || order.id).split('-').pop();
    return {
      label: `${prefix}${lugar} #${num}`,
      value: String(order.id),
    };
  });

  return (
    <div className="cmbx-row">
      <CustomCombobox
        options={orderOptions}
        value={selectedOrder?.id ? String(selectedOrder.id) : ''}
        onChange={(value) => onSelectOrder(value)}
        placeholder="No. Orden"
        filterable={true}
        className="combobox-compact"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default OrderHeader;