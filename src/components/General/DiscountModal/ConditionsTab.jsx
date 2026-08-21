import React from 'react';
import Input from '../Input';
import CustomCombobox from '../CustomCombobox';

const ConditionsTab = ({ form, setField }) => {
  return (
    <div className="conditions-tab">
      {/* Fila 1: Monto mínimo y Descuento máximo */}
      <div className="conditions-row">
        <div className="form-group">
          <label className="label">Monto mínimo de compra</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.min_amount}
            onChange={(value) => setField('min_amount', value)}
            placeholder="0.00"
            size="md"
            className="conditions-input"
          />
        </div>

        <div className="form-group">
          <label className="label">Descuento máximo</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.max_discount || ''}
            onChange={(value) => setField('max_discount', value)}
            placeholder="Ej: 50.00"
            size="md"
            className="conditions-input"
          />
        </div>
      </div>

      {/* Fila 2: Cantidad mínima y Límite de usos */}
      <div className="conditions-row">
        <div className="form-group">
          <label className="label">Cantidad mínima</label>
          <Input
            type="number"
            min="1"
            value={form.min_quantity}
            onChange={(value) => setField('min_quantity', value)}
            placeholder="1"
            size="md"
            className="conditions-input"
          />
        </div>

        <div className="form-group">
          <label className="label">Límite de usos</label>
          <Input
            type="number"
            min="1"
            value={form.usage_limit || ''}
            onChange={(value) => setField('usage_limit', value)}
            placeholder="Ilimitado"
            size="md"
            className="conditions-input"
          />
        </div>
      </div>

      {/* Fila 3: Prioridad y Segmento de clientes */}
      <div className="conditions-row">
        <div className="form-group">
          <label className="label">Prioridad</label>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.priority}
            onChange={(value) => setField('priority', value)}
            placeholder="0-100 (mayor = más prioritario)"
            size="md"
            className="conditions-input"
          />
        </div>

        <div className="form-group">
          <label className="label">Segmento de clientes</label>
          <CustomCombobox
            options={[
              { label: 'Todos los clientes', value: 'all' },
              { label: 'Nuevos clientes', value: 'new' },
              { label: 'Clientes frecuentes', value: 'frequent' },
              { label: 'Clientes VIP', value: 'vip' },
            ]}
            value={form.customer_segment}
            onChange={(value) => setField('customer_segment', value)}
            placeholder="Seleccionar segmento..."
            filterable
            forceDropup={false}
            className="conditions-combobox"
          />
        </div>
      </div>

      {/* Checkboxes */}
      <div className="conditions-checkboxes">
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.stackable}
              onChange={e => setField('stackable', e.target.checked)}
            />
            Acumulable con otros descuentos
          </label>
        </div>

        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setField('is_active', e.target.checked)}
            />
            Activar descuento
          </label>
        </div>
      </div>
    </div>
  );
};

export default ConditionsTab;