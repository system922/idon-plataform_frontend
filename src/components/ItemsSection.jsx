import React from 'react';
import { FiPlus } from 'react-icons/fi';
import ItemsList from './ItemsList';
import OrderSummary from './OrderSummary';
import { IconTextButton, ButtonGroup } from './General/Button';

export default function ItemsSection({
  items,
  eliminarItem,
  abrirEditarItem,
  setShowAddItemModal,
  subtotal,        // ✅ subtotal base (sin IVA) = suma de selling_price × cantidad
  ivaAmount,       // ✅ IVA total = suma de tax_rate × cantidad
  totalConIva,     // ✅ total con IVA = subtotal + ivaAmount
  ivaLabel,        // ✅ porcentaje de IVA (ej: "15%")
  guardando,
  orderType,
  numeroMesa,
  guardarOrden
}) {
  return (
    <section className="card card-soft">
      <div className="items-head">
        <div className="items-head-left">
          <h3 className="items-title">{items.length} item(s)</h3>
        </div>
        <IconTextButton
          variant="success"
          size="sm"
          icon={<FiPlus size={18} />}
          onClick={() => setShowAddItemModal(true)}
        >
          Agregar
        </IconTextButton>
      </div>

      <ItemsList
        items={items}
        eliminarItem={eliminarItem}
        abrirEditarItem={abrirEditarItem}
      />

      <OrderSummary
        subtotal={subtotal}
        ivaAmount={ivaAmount}
        totalConIva={totalConIva}
        ivaLabel={ivaLabel}
        items={items}
        guardando={guardando}
        orderType={orderType}
        numeroMesa={numeroMesa}
        guardarOrden={guardarOrden}
      />
    </section>
  );
}