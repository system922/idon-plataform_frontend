import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const HELP_CONFIGS = {
  basic: {
    title: 'Consejos — Información Básica',
    items: [
      'Nombre: pon un nombre claro y descriptivo.',
      'Tipo: selecciona el tipo de descuento para ver consejos específicos.',
      'Valor: 20 para 20% o 5.00 para $5 fijo.',
      'Aplicar a: toda la orden, un producto o una categoría.',
      'Código de cupón: solo si elegiste "Cupón".',
    ]
  },
  schedule: {
    title: 'Consejos — Programación',
    items: [
      'Días: selecciona los días que aplica. Dejar vacío = todos los días.',
      'Horas: rango horario, ej. 14:00 a 18:00. Vacío = todo el día.',
      'Fechas: rango de fechas de vigencia. Vacío = sin límite de fechas.',
      'Si todo está vacío: la promoción aplica siempre (24/7, todos los días).',
    ]
  },
  conditions: {
    title: 'Consejos — Condiciones',
    items: [
      'Monto mínimo: ej. 30.00 → solo aplica si la compra supera $30.',
      'Descuento máximo: tope del descuento, ej. máximo $10 aunque el % dé más.',
      'Cantidad mínima: unidades necesarias para activar el descuento.',
      'Límite de usos: número total de veces que puede usarse este descuento.',
      'Prioridad: número más alto = se aplica primero cuando hay varios descuentos.',
      'Acumulable: si puede combinarse con otros descuentos activos.',
      'Activar descuento: debe estar marcado para que aparezca en el POS.',
    ]
  }
};

const getHelpConfig = (tab, formType, formAppliesTo, categoryMode, comboMode) => {
  if (tab === 'schedule') return HELP_CONFIGS.schedule;
  if (tab === 'conditions') return HELP_CONFIGS.conditions;
  
  if (comboMode) {
    return {
      title: 'Consejos — Combo/Bundle',
      items: [
        'Nombre: ej. "Combo Caelum Viernes".',
        'Precio del combo: precio final con IVA incluido que paga el cliente por el combo completo. ej. 10.00.',
        'Productos del combo: agrega cada ítem con su cantidad. ej. 1 Hot Dog + 1 Sánduche + 2 Bubble Tea.',
        'Descripción: explica el combo. ej. "Todos los viernes: 1 hot dog, 1 sánduche y 2 bubble tea a $10.00".',
        'El descuento se activa solo si todos los productos del combo están en la orden con la cantidad exacta.',
      ]
    };
  }

  if (formType === 'coupon') {
    return {
      title: 'Consejos — Cupón de descuento',
      items: [
        'Nombre: ej. "Cupón Inauguración 10%".',
        'Código: el código que ingresará el cliente, ej. INAUGURA10. Sin espacios, preferiblemente mayúsculas.',
        'Tipo: elige si el cupón da un porcentaje (%) o un monto fijo ($) de descuento.',
        'Valor: ej. 10 para 10% o 5.00 para $5 fijo.',
        'Límite de usos (Condiciones): cuántas veces puede ser canjeado este cupón en total.',
      ]
    };
  }

  if (formType === 'percentage') {
    if (formAppliesTo === 'order') {
      return {
        title: 'Consejos — % sobre toda la orden',
        items: [
          'Nombre: ej. "Happy Hour 20%" o "Viernes de descuento".',
          'Valor: escribe solo el número sin el símbolo %. ej. 20 para 20%.',
          'Aplicar a: Toda la orden → el % se calcula sobre el subtotal completo.',
          'Monto mínimo (Condiciones): útil si quieres activarlo solo con compras mayores a cierto valor.',
          'Programación: úsala si el descuento aplica solo ciertos días u horarios.',
        ]
      };
    }
    if (formAppliesTo === 'category' && categoryMode === 'all') {
      return {
        title: 'Consejos — % sobre categoría completa',
        items: [
          'Nombre: ej. "Postres 30% off" o "Bebidas Happy Hour".',
          'Valor: porcentaje de descuento. ej. 30 para 30%.',
          'Categoría: selecciona la categoría que tendrá el descuento.',
          'Solo aplica a los productos de esa categoría; el resto de la orden va a precio normal.',
          'Descuento máximo (Condiciones): puedes limitar cuánto descuento se aplica como máximo.',
        ]
      };
    }
    if (formAppliesTo === 'category' && categoryMode === 'second') {
      return {
        title: 'Consejos — 2do producto de la categoría con descuento',
        items: [
          'Nombre: ej. "2do Postre 50% off" o "Segundo café al 30%".',
          'Valor: porcentaje que paga el 2do producto. ej. 50 → el 2do ítem paga 50% de su precio (50% de descuento).',
          'Categoría: la categoría donde aplica. El 2do ítem más barato del par recibe el descuento.',
          'Se activa solo si hay al menos 2 ítems de esa categoría en la orden.',
          'Con 4 ítems, el 1ro y 3ro pagan normal; el 2do y 4to tienen descuento.',
        ]
      };
    }
    if (formAppliesTo === 'product') {
      return {
        title: 'Consejos — % sobre un producto específico',
        items: [
          'Nombre: ej. "Latte 15% off" o "Promo Sandwich".',
          'Valor: porcentaje de descuento sobre ese producto. ej. 15 para 15%.',
          'Producto: selecciona el producto exacto.',
          'El descuento aplica solo si ese producto está en la orden.',
        ]
      };
    }
  }

  if (formType === 'fixed') {
    if (formAppliesTo === 'category' && categoryMode === 'fixed_price') {
      return {
        title: 'Consejos — Precio fijo por unidad en categoría',
        items: [
          'Nombre: ej. "Desayunos $4.50 c/u" o "Lates $2.50 c/u".',
          'Valor: precio final con IVA que paga el cliente por unidad. ej. 4.50 → cada desayuno cuesta $4.50 al cliente.',
          'NO es el precio base sin IVA. Escribe el precio que quieres que vea en el ticket. El IVA se separa automáticamente.',
          'Categoría: todos los productos de esa categoría cuyo precio sea mayor al valor ingresado tendrán precio fijo.',
          'Los extras baratos (precio menor al fijo) se cobran a su precio normal — no se les aplica el precio fijo.',
        ]
      };
    }
    if (formAppliesTo === 'order') {
      return {
        title: 'Consejos — Monto fijo sobre la orden',
        items: [
          'Nombre: ej. "$5 OFF en tu primera compra".',
          'Valor: monto en dólares a descontar. ej. 5.00 para $5 OFF.',
          'Aplicar a: Toda la orden → se descuenta del subtotal completo.',
          'Monto mínimo (Condiciones): ej. 20.00 para activarlo solo con compras ≥ $20.',
          'El descuento no puede superar el subtotal de la orden.',
        ]
      };
    }
    if (formAppliesTo === 'product') {
      return {
        title: 'Consejos — Monto fijo sobre un producto',
        items: [
          'Nombre: ej. "$2 OFF Americano".',
          'Valor: monto en dólares a descontar de ese producto. ej. 2.00.',
          'Producto: selecciona el producto específico.',
          'El descuento no puede superar el precio del producto.',
        ]
      };
    }
  }

  if (formType === 'bulk') {
    return {
      title: 'Consejos — Descuento por volumen (mayoreo)',
      items: [
        'Nombre: ej. "10% con 5+ unidades" o "Mayoreo Bebidas".',
        'Valor: porcentaje de descuento. ej. 10 para 10%.',
        'Cantidad mínima (Condiciones): cuántas unidades deben estar en la orden para activarlo. ej. 5.',
        'Aplicar a: "Toda la orden" para contar todas las unidades, o un producto específico.',
        'Puedes combinarlo con días u horarios en la pestaña Programación.',
      ]
    };
  }

  if (formType === 'buy_x_get_y') {
    if (formAppliesTo === 'category' && categoryMode === 'second') {
      return {
        title: 'Consejos — 2do producto de la categoría con descuento',
        items: [
          'Nombre: ej. "2do Postre 50% off".',
          'Valor: porcentaje que paga el 2do ítem. ej. 50 → 50% de descuento en el 2do.',
          'Categoría: el 2do ítem más barato de cada par recibe el descuento.',
          'Necesitas mínimo 2 ítems de esa categoría en la orden.',
        ]
      };
    }
    return {
      title: 'Consejos — Compra X lleva Y gratis',
      items: [
        'Nombre: ej. "2x1 en Bebidas" o "Lleva 3 paga 2".',
        'Valor: porcentaje que representa el producto gratis. ej. 100 para gratis, 50 para mitad de precio.',
        'Cantidad mínima (Condiciones): cuántos debe comprar el cliente para activarlo. ej. 2 para "compra 2".',
        'Aplicar a: toda la orden o una categoría específica.',
      ]
    };
  }

  return HELP_CONFIGS.basic;
};

const CollapsibleHelp = ({ tab, formType, formAppliesTo, categoryMode, comboMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const config = getHelpConfig(tab, formType, formAppliesTo, categoryMode, comboMode);

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-tertiary, #f8fafc)',
          border: '1px solid var(--border-color, #E2E8F0)',
          borderRadius: 'var(--radius-sm, 8px)',
          padding: '6px 12px',  // Reducido de 8px 14px
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',  // Reducido de 8px
          fontSize: '12px',  // Reducido de 14px
          fontWeight: 'var(--font-weight-medium, 500)',
          color: 'var(--text-primary, #1A202C)',
          transition: 'var(--transition-fast, all 0.15s ease)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover, rgba(249, 115, 22, 0.04))'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-tertiary, #f8fafc)'}
      >
        {isOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
        {isOpen ? 'Ocultar consejos' : 'Mostrar consejos'}
      </button>
      {isOpen && (
        <div style={{
          padding: '10px 14px',  // Reducido de 12px 16px
          borderRadius: 'var(--radius-sm, 8px)',
          marginTop: '6px',  // Reducido de 8px
          borderLeft: '3px solid var(--primary, #f97316)',  // Reducido de 4px
          fontSize: '12px',  // Reducido de 14px
          color: 'var(--text-primary, #1A202C)',
          background: 'var(--bg-tertiary, #f8fafc)',
          boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05))'
        }}>
          <strong style={{ 
            display: 'block', 
            marginBottom: '6px',  // Reducido de 8px
            fontSize: '13px',  // Reducido de 16px
            color: 'var(--primary, #f97316)' 
          }}>
            {config.title}
          </strong>
          <ul style={{ 
            marginTop: '4px',  // Reducido de 6px
            marginBottom: 0, 
            paddingLeft: '16px',  // Reducido de 20px
            color: 'var(--text-primary, #1A202C)', 
            lineHeight: '1.5',  // Reducido de 1.7
            fontSize: '11px'  // Añadido para hacer el texto aún más pequeño
          }}>
            {config.items.map((item, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CollapsibleHelp;