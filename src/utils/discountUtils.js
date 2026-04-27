// Nombres de días en español (índice = getDay() → 0=Dom…6=Sáb)
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Parsea day_of_week desde string "1,3,5" o array
export function parseDays(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number);
  return String(raw).split(',').map(Number).filter(n => !isNaN(n));
}

// Verifica si un descuento es aplicable en este momento
export function isDiscountActive(discount) {
  if (!discount.is_active) return false;

  const now = new Date();

  if (discount.schedule_type === 'date_range') {
    if (discount.start_date) {
      const start = new Date(discount.start_date);
      start.setHours(0, 0, 0, 0);
      if (now < start) return false;
    }
    if (discount.end_date) {
      const end = new Date(discount.end_date);
      end.setHours(23, 59, 59, 999);
      if (now > end) return false;
    }
  } else if (discount.schedule_type === 'weekly_day') {
    const days = parseDays(discount.day_of_week);
    if (days.length > 0 && !days.includes(now.getDay())) return false;
  }

  return true;
}

/**
 * Devuelve los descuentos aplicables a un ítem de orden.
 * @param {Array}  discounts   - lista completa de descuentos
 * @param {number|null} categoryId - categoría del producto (null = sin categoría)
 * @param {number} itemTotal   - total del ítem para validar min_amount
 */
export function getApplicableDiscounts(discounts, categoryId, itemTotal = 0) {
  return discounts.filter(d => {
    if (!isDiscountActive(d)) return false;

    // category_id null/0/"" → aplica a todos
    if (d.category_id && Number(d.category_id) !== Number(categoryId)) return false;

    // monto mínimo
    if (d.min_amount && itemTotal < Number(d.min_amount)) return false;

    return true;
  });
}

/**
 * Aplica los descuentos aplicables a un precio y devuelve el precio final.
 * Se aplica el descuento de mayor valor (no se acumulan).
 */
export function applyBestDiscount(price, applicableDiscounts) {
  if (!applicableDiscounts.length) return { finalPrice: price, discount: null, saved: 0 };

  let bestDiscount = null;
  let bestSaved = 0;

  for (const d of applicableDiscounts) {
    const saved =
      d.type === 'percentage'
        ? price * (Number(d.value) / 100)
        : Math.min(Number(d.value), price);

    if (saved > bestSaved) {
      bestSaved = saved;
      bestDiscount = d;
    }
  }

  return {
    finalPrice: Math.max(0, price - bestSaved),
    discount: bestDiscount,
    saved: bestSaved,
  };
}
