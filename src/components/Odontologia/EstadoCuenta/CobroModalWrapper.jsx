// components/Odontologia/EstadoCuenta/components/CobroModalWrapper.jsx

import React from 'react';
import CobroModal from '../CobroModal';

const CobroModalWrapper = ({
  showCobroModal,
  onClose,
  selectedCuota,
  selectedPlanPago,
  planParaCobrar,
  pacienteProp,
  currencySymbol,
  bizInfo,
  onProcesarPagoCuota,
  onProcesarPagoTratamientos,
}) => {
  // Caso 1: Cobro de cuota
  if (selectedCuota && selectedPlanPago) {
    return (
      <CobroModal
        isOpen={showCobroModal}
        onClose={onClose}
        presupuesto={{
          id: selectedCuota.id,
          name: `Cuota #${selectedCuota.numero_cuota} - ${selectedPlanPago.nombre || 'Plan de Ortodoncia'}`,
          pending: selectedCuota.monto,
          total: selectedCuota.monto,
          items: [{
            service: `Cuota #${selectedCuota.numero_cuota}`,
            product_name: `Cuota #${selectedCuota.numero_cuota}`,
            description: `Cuota #${selectedCuota.numero_cuota}`,
            quantity: 1,
            price: selectedCuota.monto,
            subtotal: selectedCuota.monto,
            paid: 0,
            pending: selectedCuota.monto,
            code: 'CUOTA-001',
          }],
        }}
        paciente={pacienteProp}
        onProcesarPago={onProcesarPagoCuota}
        currencySymbol={currencySymbol}
        bizInfo={bizInfo}
      />
    );
  }

  // Caso 2: Cobro de tratamientos seleccionados
  if (planParaCobrar) {
    const { plan, items: itemsSeleccionados, total } = planParaCobrar;

    const items = itemsSeleccionados.map((t, idx) => ({
      id: t.id || `temp-${Date.now()}-${idx}`,
      service: t.tratamiento || t.service || 'Tratamiento',
      product_name: t.tratamiento || t.service || 'Tratamiento',
      description: t.tratamiento || t.service || 'Tratamiento',
      tooth: t.tooth || '',
      quantity: 1,
      price: parseFloat(t.price || 0),
      subtotal: parseFloat(t.price || 0),
      paid: 0,
      pending: parseFloat(t.price || 0),
      comment: t.observaciones || `Diente #${t.tooth || ''}`,
      code: t.code || `TRT-${String(idx + 1).padStart(3, '0')}`,
      surfaces: t.surfaces || [],
      diagnostico: t.diagnostico || '',
      estado: t.estado || 'pendiente',
      product_id: plan.id,
      unit_price: parseFloat(t.price || 0),
      line_total: parseFloat(t.price || 0),
      tax_rate: 15,
      iva_amount: 0,
    }));

    return (
      <CobroModal
        isOpen={showCobroModal}
        onClose={onClose}
        presupuesto={{
          id: `${plan.id}-tratamientos-${Date.now()}`,
          name: `${plan.name || plan.nombre} - ${items.length} tratamiento(s) seleccionado(s)`,
          pending: total,
          total: total,
          items: items,
        }}
        paciente={pacienteProp}
        onProcesarPago={onProcesarPagoTratamientos}
        currencySymbol={currencySymbol}
        bizInfo={bizInfo}
      />
    );
  }

  return null;
};

export default CobroModalWrapper;