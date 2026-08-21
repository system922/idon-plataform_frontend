import React, { useState } from 'react';
import { FiChevronDown, FiMapPin, FiFileText } from 'react-icons/fi';
import CustomCombobox from './General/CustomCombobox';
import Input from './General/Input';

export default function OrderHeader({
  orderType,
  setOrderType,
  numeroMesa,
  setNumeroMesa,
  mesaId,
  setMesaId,
  notas,
  setNotas
}) {
  const [showUbicacion, setShowUbicacion] = useState(false);
  const [showNotas, setShowNotas] = useState(false);

  const orderTypeOptions = [
    { value: 'dine_in', label: 'Local' },
    { value: 'take_away', label: 'Llevar' },
    { value: 'delivery', label: 'Delivery' }
  ];

  const isMesaDisabled = orderType !== 'dine_in';

  return (
    <section className="card card-soft">
      <div className="card-head">
        <h3>Datos de la orden</h3>
        <p>Configura el tipo de orden y los detalles del pedido</p>
      </div>
      
      {/* PRIMERA FILA: 3 columnas (Tipo | Mesa | Ubicación) */}
      <div className="form-grid-3col">
        {/* TIPO DE ORDEN */}
        <div className="field">
          <label>Tipo de orden</label>
          <CustomCombobox
            options={orderTypeOptions}
            value={orderType}
            onChange={setOrderType}
            placeholder="Seleccionar tipo"
            filterable={false}
          />
        </div>

        {/* N° MESA */}
        <div className="field">
          <label>N° Mesa</label>
          <Input
            type="number"
            value={numeroMesa}
            onChange={setNumeroMesa}
            placeholder="1, 2, 3..."
            disabled={isMesaDisabled}
            size="md"
            variant="bordered"
            min={1}
            help={isMesaDisabled ? 'Solo disponible para pedidos en local' : ''}
          />
        </div>

        {/* UBICACIÓN */}
        <div className="field order-field-ubicacion">
          <button
            type="button"
            className="collapsible-label"
            onClick={() => setShowUbicacion(v => !v)}
            aria-expanded={showUbicacion}
          >
            <FiMapPin size={14} />
            <span>Ubicación</span>
            <FiChevronDown 
              size={14} 
              className={showUbicacion ? 'chev-open' : ''} 
            />
          </button>
          
          {showUbicacion && (
            <div className="collapsible-content" style={{ marginTop: 6 }}>
              <Input
                type="text"
                value={mesaId}
                onChange={setMesaId}
                placeholder="A-1, Interior-5..."
                disabled={isMesaDisabled}
                size="md"
                variant="bordered"
                help={isMesaDisabled ? 'Solo disponible para pedidos en local' : ''}
              />
            </div>
          )}
        </div>
      </div>

      {/* SEGUNDA FILA: NOTAS (full width) - FUERA del grid de 3 columnas */}
      <div className="form-grid" style={{ marginTop: 'var(--space-2)' }}>
        <div className="field field-full">
          <button
            type="button"
            className="collapsible-label"
            onClick={() => setShowNotas(v => !v)}
            aria-expanded={showNotas}
          >
            <FiFileText size={14} />
            <span>Notas de la orden</span>
            <FiChevronDown 
              size={14} 
              className={showNotas ? 'chev-open' : ''} 
            />
          </button>
          
          {showNotas && (
            <div className="collapsible-content" style={{ marginTop: 6 }}>
              <Input
                type="textarea"
                value={notas}
                onChange={setNotas}
                placeholder="Instrucciones especiales (ej: sin cebolla, bien cocido, etc.)"
                rows={3}
                size="md"
                variant="bordered"
                help="Estas notas se enviarán a la cocina junto con la orden"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}