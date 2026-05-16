import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiRefreshCw, FiPercent, FiDollarSign, FiPlus, FiX,
  FiCalendar, FiRepeat, FiClock, FiTag, FiEdit2, FiTrash2,
  FiGift, FiUsers, FiShoppingBag, FiAward,
  FiAlertCircle, FiCopy, FiChevronDown, FiChevronUp,
  FiCheckCircle, FiAlertTriangle, FiPackage, FiZap, FiTrendingDown, FiInfo
} from "react-icons/fi";
import { CheckCircle, XCircle } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/PosDiscounts.css';

// ─── Constantes ─────────────────────────
const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const EMPTY_FORM = {
  name: '',
  description: '',
  type: 'percentage',
  value: '',
  applies_to: 'order',
  category_id: '',
  product_id: '',
  min_amount: '',
  max_discount: '',
  min_quantity: 1,
  code: '',
  usage_limit: '',
  days_of_week: [],
  start_time: '',
  end_time: '',
  start_date: '',
  end_date: '',
  stackable: false,
  priority: 0,
  customer_segment: 'all',
  is_active: true
};

// ─── Helpers ─────────────────────────
const formatMoney = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;

const parseDays = (daysStr) => {
  if (!daysStr) return [];
  if (Array.isArray(daysStr)) return daysStr;
  return daysStr.split(',').map(Number);
};

const isDiscountActive = (discount) => {
  if (!discount.is_active) return false;
  
  const now = new Date();
  
  if (discount.start_date && new Date(discount.start_date) > now) return false;
  if (discount.end_date && new Date(discount.end_date) < now) return false;
  
  if (discount.days_of_week && discount.days_of_week.length > 0) {
    const currentDay = now.getDay();
    const days = parseDays(discount.days_of_week);
    if (!days.includes(currentDay)) return false;
  }
  
  if (discount.start_time && discount.end_time) {
    const currentTime = now.toTimeString().slice(0, 5);
    if (currentTime < discount.start_time || currentTime > discount.end_time) return false;
  }
  
  return true;
};

const scheduleLabel = (d) => {
  if (d.start_date && d.end_date) {
    const from = new Date(d.start_date).toLocaleDateString();
    const to = new Date(d.end_date).toLocaleDateString();
    return `${from} → ${to}`;
  }
  if (d.days_of_week && d.days_of_week.length > 0) {
    const days = parseDays(d.days_of_week);
    return days.map(n => DAY_NAMES[n]).join(', ');
  }
  if (d.start_time && d.end_time) {
    return `${d.start_time} - ${d.end_time}`;
  }
  return 'Siempre activo';
};

const getDiscountTypeIcon = (type) => {
  switch(type) {
    case 'percentage': return <FiPercent />;
    case 'fixed': return <FiDollarSign />;
    case 'buy_x_get_y': return <FiShoppingBag />;
    case 'bulk': return <FiUsers />;
    case 'coupon': return <FiAward />;
    default: return <FiPercent />;
  }
};

const ScheduleIcon = ({ discount }) => {
  if (discount?.start_date && discount?.end_date) return <FiCalendar />;
  if (discount?.days_of_week?.length > 0) return <FiRepeat />;
  if (discount?.start_time) return <FiClock />;
  return <FiClock />;
};

// ─── COMPONENTE DE AYUDA DESPLEGABLE ─────────────────────────
const CollapsibleHelp = ({ tab, formType, formAppliesTo, categoryMode, comboMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  const getBasicHelp = () => {
    // Modo combo
    if (comboMode) return {
      title: '🎁 Consejos — Combo/Bundle',
      color: '#4b0082', border: '#7c3aed', bg: '#f3e8ff', text: '#2e0057',
      items: [
        '✏️ <b>Nombre</b>: ej. "Combo Caelum Viernes".',
        '💰 <b>Precio del combo</b>: precio final con IVA incluido que paga el cliente por el combo completo. ej. <b>10.00</b>.',
        '🛍️ <b>Productos del combo</b>: agrega cada ítem con su cantidad. ej. 1 Hot Dog + 1 Sánduche + 2 Bubble Tea.',
        '📋 <b>Descripción</b>: explica el combo. ej. "Todos los viernes: 1 hot dog, 1 sánduche y 2 bubble tea a $10.00".',
        '⚠️ El descuento se activa solo si <b>todos</b> los productos del combo están en la orden con la cantidad exacta.',
      ]
    };

    // Cupón
    if (formType === 'coupon') return {
      title: '🎟️ Consejos — Cupón de descuento',
      color: '#7c3aed', border: '#a78bfa', bg: '#f5f3ff', text: '#2e1065',
      items: [
        '✏️ <b>Nombre</b>: ej. "Cupón Inauguración 10%".',
        '🔑 <b>Código</b>: el código que ingresará el cliente, ej. <b>INAUGURA10</b>. Sin espacios, preferiblemente mayúsculas.',
        '🎯 <b>Tipo</b>: elige si el cupón da un porcentaje (%) o un monto fijo ($) de descuento.',
        '💰 <b>Valor</b>: ej. <b>10</b> para 10% o <b>5.00</b> para $5 fijo.',
        '🔄 <b>Límite de usos</b> (Condiciones): cuántas veces puede ser canjeado este cupón en total.',
      ]
    };

    // Porcentaje
    if (formType === 'percentage') {
      if (formAppliesTo === 'order') return {
        title: '📊 Consejos — % sobre toda la orden',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "Happy Hour 20%" o "Viernes de descuento".',
          '💰 <b>Valor</b>: escribe solo el número sin el símbolo %. ej. <b>20</b> para 20%.',
          '📦 <b>Aplicar a</b>: Toda la orden → el % se calcula sobre el subtotal completo.',
          '💵 <b>Monto mínimo</b> (Condiciones): útil si quieres activarlo solo con compras mayores a cierto valor.',
          '📅 <b>Programación</b>: úsala si el descuento aplica solo ciertos días u horarios.',
        ]
      };
      if (formAppliesTo === 'category' && categoryMode === 'all') return {
        title: '🏷️ Consejos — % sobre categoría completa',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "Postres 30% off" o "Bebidas Happy Hour".',
          '💰 <b>Valor</b>: porcentaje de descuento. ej. <b>30</b> para 30%.',
          '🗂️ <b>Categoría</b>: selecciona la categoría que tendrá el descuento.',
          '⚠️ Solo aplica a los productos de esa categoría; el resto de la orden va a precio normal.',
          '🔝 <b>Descuento máximo</b> (Condiciones): puedes limitar cuánto descuento se aplica como máximo.',
        ]
      };
      if (formAppliesTo === 'category' && categoryMode === 'second') return {
        title: '2️⃣ Consejos — 2do producto de la categoría con descuento',
        color: '#006d22', border: '#52c41a', bg: '#f6ffed', text: '#003a00',
        items: [
          '✏️ <b>Nombre</b>: ej. "2do Postre 50% off" o "Segundo café al 30%".',
          '💰 <b>Valor</b>: porcentaje que paga el 2do producto. ej. <b>50</b> → el 2do ítem paga 50% de su precio (50% de descuento).',
          '🗂️ <b>Categoría</b>: la categoría donde aplica. El 2do ítem más barato del par recibe el descuento.',
          '⚠️ Se activa solo si hay <b>al menos 2 ítems</b> de esa categoría en la orden.',
          '🔢 Con 4 ítems, el 1ro y 3ro pagan normal; el 2do y 4to tienen descuento.',
        ]
      };
      if (formAppliesTo === 'product') return {
        title: '📦 Consejos — % sobre un producto específico',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "Latte 15% off" o "Promo Sandwich".',
          '💰 <b>Valor</b>: porcentaje de descuento sobre ese producto. ej. <b>15</b> para 15%.',
          '📦 <b>Producto</b>: selecciona el producto exacto.',
          '⚠️ El descuento aplica solo si ese producto está en la orden.',
        ]
      };
    }

    // Monto fijo
    if (formType === 'fixed') {
      if (formAppliesTo === 'category' && categoryMode === 'fixed_price') return {
        title: '🏷️ Consejos — Precio fijo por unidad en categoría',
        color: '#003d80', border: '#0369a1', bg: '#eff6ff', text: '#002060',
        items: [
          '✏️ <b>Nombre</b>: ej. "Desayunos $4.50 c/u" o "Lates $2.50 c/u".',
          '💰 <b>Valor</b>: precio final con IVA que paga el cliente <b>por unidad</b>. ej. <b>4.50</b> → cada desayuno cuesta $4.50 al cliente.',
          '⚠️ <b>NO es el precio base sin IVA</b>. Escribe el precio que quieres que vea en el ticket. El IVA se separa automáticamente.',
          '🗂️ <b>Categoría</b>: todos los productos de esa categoría cuyo precio sea mayor al valor ingresado tendrán precio fijo.',
          '✅ Los extras baratos (precio menor al fijo) se cobran a su precio normal — no se les aplica el precio fijo.',
        ]
      };
      if (formAppliesTo === 'order') return {
        title: '💵 Consejos — Monto fijo sobre la orden',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "$5 OFF en tu primera compra".',
          '💰 <b>Valor</b>: monto en dólares a descontar. ej. <b>5.00</b> para $5 OFF.',
          '📦 <b>Aplicar a</b>: Toda la orden → se descuenta del subtotal completo.',
          '💵 <b>Monto mínimo</b> (Condiciones): ej. 20.00 para activarlo solo con compras ≥ $20.',
          '🔝 El descuento no puede superar el subtotal de la orden.',
        ]
      };
      if (formAppliesTo === 'product') return {
        title: '📦 Consejos — Monto fijo sobre un producto',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "$2 OFF Americano".',
          '💰 <b>Valor</b>: monto en dólares a descontar de ese producto. ej. <b>2.00</b>.',
          '📦 <b>Producto</b>: selecciona el producto específico.',
          '⚠️ El descuento no puede superar el precio del producto.',
        ]
      };
      if (formAppliesTo === 'category') return {
        title: '🏷️ Consejos — Monto fijo sobre categoría',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "$3 OFF en Postres".',
          '💰 <b>Valor</b>: monto fijo a descontar del subtotal de esa categoría. ej. <b>3.00</b>.',
          '🗂️ <b>Categoría</b>: solo los productos de esa categoría participan en el descuento.',
        ]
      };
    }

    // Mayoreo / Bulk
    if (formType === 'bulk') return {
      title: '📦 Consejos — Descuento por volumen (mayoreo)',
      color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
      items: [
        '✏️ <b>Nombre</b>: ej. "10% con 5+ unidades" o "Mayoreo Bebidas".',
        '💰 <b>Valor</b>: porcentaje de descuento. ej. <b>10</b> para 10%.',
        '🔢 <b>Cantidad mínima</b> (Condiciones): cuántas unidades deben estar en la orden para activarlo. ej. <b>5</b>.',
        '📦 <b>Aplicar a</b>: "Toda la orden" para contar todas las unidades, o un producto específico.',
        '📅 Puedes combinarlo con días u horarios en la pestaña Programación.',
      ]
    };

    // Buy X get Y
    if (formType === 'buy_x_get_y') {
      if (formAppliesTo === 'category' && categoryMode === 'second') return {
        title: '2️⃣ Consejos — 2do producto de la categoría con descuento',
        color: '#006d22', border: '#52c41a', bg: '#f6ffed', text: '#003a00',
        items: [
          '✏️ <b>Nombre</b>: ej. "2do Postre 50% off".',
          '💰 <b>Valor</b>: porcentaje que paga el 2do ítem. ej. <b>50</b> → 50% de descuento en el 2do.',
          '🗂️ <b>Categoría</b>: el 2do ítem más barato de cada par recibe el descuento.',
          '⚠️ Necesitas mínimo 2 ítems de esa categoría en la orden.',
        ]
      };
      return {
        title: '🛍️ Consejos — Compra X lleva Y gratis',
        color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
        items: [
          '✏️ <b>Nombre</b>: ej. "2x1 en Bebidas" o "Lleva 3 paga 2".',
          '💰 <b>Valor</b>: porcentaje que representa el producto gratis. ej. <b>100</b> para gratis, <b>50</b> para mitad de precio.',
          '🔢 <b>Cantidad mínima</b> (Condiciones): cuántos debe comprar el cliente para activarlo. ej. <b>2</b> para "compra 2".',
          '📦 <b>Aplicar a</b>: toda la orden o una categoría específica.',
        ]
      };
    }

    // Default
    return {
      title: '📘 Consejos — Información Básica',
      color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
      items: [
        '✏️ <b>Nombre</b>: pon un nombre claro y descriptivo.',
        '🎯 <b>Tipo</b>: selecciona el tipo de descuento para ver consejos específicos.',
        '💰 <b>Valor</b>: 20 para 20% o 5.00 para $5 fijo.',
        '📦 <b>Aplicar a</b>: toda la orden, un producto o una categoría.',
        '🔑 <b>Código de cupón</b>: solo si elegiste "Cupón".',
      ]
    };
  };

  const helps = {
    basic: getBasicHelp(),
    schedule: {
      title: '📅 Consejos — Programación',
      color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
      items: [
        '📅 <b>Días</b>: selecciona los días que aplica. Dejar vacío = todos los días.',
        '⏰ <b>Horas</b>: rango horario, ej. 14:00 a 18:00. Vacío = todo el día.',
        '📆 <b>Fechas</b>: rango de fechas de vigencia. Vacío = sin límite de fechas.',
        '✨ <b>Si todo está vacío</b>: la promoción aplica siempre (24/7, todos los días).',
      ]
    },
    conditions: {
      title: '⚙️ Consejos — Condiciones',
      color: '#0050b3', border: '#1890ff', bg: '#e6f7ff', text: '#003366',
      items: [
        '💵 <b>Monto mínimo</b>: ej. 30.00 → solo aplica si la compra supera $30.',
        '🔝 <b>Descuento máximo</b>: tope del descuento, ej. máximo $10 aunque el % dé más.',
        '🔢 <b>Cantidad mínima</b>: unidades necesarias para activar el descuento.',
        '🔄 <b>Límite de usos</b>: número total de veces que puede usarse este descuento.',
        '⭐ <b>Prioridad</b>: número más alto = se aplica primero cuando hay varios descuentos.',
        '🧩 <b>Acumulable</b>: si puede combinarse con otros descuentos activos.',
        '✅ <b>Activar descuento</b>: <b>debe estar marcado</b> para que aparezca en el POS.',
      ]
    }
  };

  const current = helps[tab] || helps.basic;

  return (
    <div style={{ marginBottom: '16px' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: '#3b4b5e',
          border: '1px solid #5a6e82',
          borderRadius: '6px',
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '13px',
          fontWeight: '500',
          color: '#ffffff',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#4a5e72'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#3b4b5e'}
      >
        {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
        {isOpen ? 'Ocultar consejos' : 'Mostrar consejos'}
      </button>
      {isOpen && (
        <div style={{
          background: current.bg,
          padding: '12px 16px',
          borderRadius: '8px',
          marginTop: '8px',
          borderLeft: `4px solid ${current.border}`,
          fontSize: '13px',
          color: current.text,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <strong style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: current.color }}>
            {current.title}
          </strong>
          <ul style={{ marginTop: '6px', marginBottom: 0, paddingLeft: '20px', color: current.text, lineHeight: '1.7' }}>
            {current.items.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── MODAL ─────────────────────────
function DiscountModal({ onClose, onSaved, discount = null }) {
  const [form, setForm] = useState(() => {
    if (discount) {
      const rawDesc = discount.description || '';
      let cleanDesc = rawDesc;
      if (rawDesc.startsWith('__FPPU__')) cleanDesc = rawDesc.slice(8);
      else if (rawDesc.startsWith('__COMBO__')) {
        const parts = rawDesc.slice(9).split('||');
        cleanDesc = parts.slice(1).join('||');
      }
      return {
        ...EMPTY_FORM,
        ...discount,
        description: cleanDesc,
        days_of_week: parseDays(discount.days_of_week),
        product_id: discount.product_id || '',
        category_id: discount.category_id || ''
      };
    }
    return EMPTY_FORM;
  });
  // 'all'         = descuento % o monto fijo sobre el total de la categoría
  // 'second'      = 2do producto con descuento (buy_x_get_y + category)
  // 'fixed_price' = precio fijo por unidad en la categoría (fixed + __FPPU__ en description)
  const [categoryMode, setCategoryMode] = useState(() => {
    if (discount && discount.type === 'buy_x_get_y' && discount.applies_to === 'category') return 'second';
    if (discount && discount.type === 'fixed' && discount.applies_to === 'category' && discount.description?.startsWith('__FPPU__')) return 'fixed_price';
    return 'all';
  });
  // 'fixed' | 'product' | 'category' | 'multiproduct'
  const [couponMode, setCouponMode] = useState(() => {
    if (discount && discount.type === 'coupon') {
      if (discount.applies_to === 'product') return 'product';
      if (discount.applies_to === 'category') return 'category';
      if (discount.applies_to === 'products_list') return 'multiproduct';
    }
    return 'fixed';
  });
  const [multiProductIds, setMultiProductIds] = useState(() => {
    if (discount?.type === 'coupon' && discount.applies_to === 'products_list') {
      try { return JSON.parse(discount.description?.replace('__MULTIPRODUCT__', '') || '[]').map(p => String(p.id)); }
      catch { return []; }
    }
    return [];
  });
  const [productSearch, setProductSearch] = useState('');
  const toggleMultiProduct = (id) =>
    setMultiProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  // Modo combo: conjunto de productos específicos a precio especial
  const [comboMode, setComboMode] = useState(() =>
    !!(discount && String(discount.description || '').startsWith('__COMBO__'))
  );
  const [comboItems, setComboItems] = useState(() => {
    if (discount && String(discount.description || '').startsWith('__COMBO__')) {
      try {
        const jsonPart = discount.description.slice(9).split('||')[0];
        return JSON.parse(jsonPart).items || [];
      } catch { return []; }
    }
    return [];
  });
  // fila temporal del selector de producto para agregar al combo
  const [comboNewItem, setComboNewItem] = useState({ product_id: '', qty: 1 });
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [activeTab, setActiveTab] = useState('basic');
  const [pvpCalc, setPvpCalc] = useState('');
  const [ivaRate, setIvaRate] = useState(15);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, productsRes, fiscalRes] = await Promise.all([
          fetchWithAuth('/api/categories'),
          fetchWithAuth('/api/products'),
          fetchWithAuth('/api/productos/fiscal-rates'),
        ]);
        if (categoriesRes.ok) {
          const data = await categoriesRes.json();
          setCategories(Array.isArray(data) ? data : []);
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(Array.isArray(data) ? data : []);
        }
        if (fiscalRes.ok) {
          const data = await fiscalRes.json();
          let rate = Number(data?.iva_rate ?? 0.15);
          if (rate > 1) rate = rate / 100;
          setIvaRate(Math.round(rate * 100));
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  // Calcula el descuento exacto sobre subtotal dado el precio PVP objetivo total
  // Usa el selling_price real del producto para replicar la misma aritmética del checkout
  const calcFromPvp = (targetPvp, iva, sellingPrice, qty) => {
    const target = parseFloat(targetPvp) || 0;
    const factor = 1 + (parseFloat(iva) || 15) / 100;
    const sp = parseFloat(sellingPrice) || 0;
    const q = parseInt(qty) || 1;
    if (sp > 0) {
      const subtotal = Math.round(sp * q * 100) / 100;
      const targetBase = Math.round(target / factor * 100) / 100;
      return Math.max(0, subtotal - targetBase).toFixed(2);
    }
    return (Math.floor(target / factor * 100) / 100).toFixed(2);
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.value) {
      return setErr('Nombre y valor requeridos');
    }
    if (comboMode && comboItems.length < 2) {
      return setErr('El combo necesita al menos 2 productos');
    }
    if (form.type === 'coupon' && !form.code?.trim()) {
      return setErr('El cupón debe tener un código');
    }
    if (form.type === 'coupon' && couponMode === 'product' && !form.product_id) {
      return setErr('Selecciona el producto que se regala con el cupón');
    }
    if (form.type === 'coupon' && couponMode === 'multiproduct' && multiProductIds.length === 0) {
      return setErr('Selecciona al menos 1 producto para el cupón');
    }

    setSaving(true);
    setErr('');

    try {
      let finalDesc = form.description || '';
      const isCouponProduct      = form.type === 'coupon' && couponMode === 'product';
      const isCouponCategory     = form.type === 'coupon' && couponMode === 'category';
      const isCouponMultiProduct = form.type === 'coupon' && couponMode === 'multiproduct';
      if (comboMode) {
        const comboData = { price: parseFloat(form.value), items: comboItems };
        finalDesc = '__COMBO__' + JSON.stringify(comboData) + '||' + finalDesc;
      } else if (categoryMode === 'fixed_price') {
        finalDesc = '__FPPU__' + finalDesc;
      } else if (isCouponMultiProduct) {
        const selProds = products
          .filter(p => multiProductIds.includes(String(p.id)))
          .map(p => ({ id: p.id, name: p.name, price: parseFloat(p.selling_price || 0) }));
        finalDesc = '__MULTIPRODUCT__' + JSON.stringify(selProds);
      }

      const payload = {
        name: form.name,
        description: finalDesc,
        type: comboMode ? 'fixed' : form.type,
        value: parseFloat(form.value),
        applies_to: comboMode          ? 'order'
          : isCouponProduct            ? 'product'
          : isCouponCategory           ? 'category'
          : isCouponMultiProduct       ? 'products_list'
          : form.applies_to,
        product_id:  comboMode ? null : (isCouponCategory || isCouponMultiProduct) ? null : (form.product_id || null),
        category_id: comboMode ? null : (isCouponProduct  || isCouponMultiProduct) ? null : (form.category_id || null),
        min_amount: parseFloat(form.min_amount || 0),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        min_quantity: parseInt(form.min_quantity) || 1,
        code: form.code || null,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        days_of_week: form.days_of_week.length ? form.days_of_week : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        stackable: form.stackable,
        priority: parseInt(form.priority) || 0,
        customer_segment: form.customer_segment,
        is_active: form.is_active
      };

      const url = discount ? `/api/discounts/${discount.id}` : '/api/discounts';
      const method = discount ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar descuento');
      }

      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <h2>{discount ? 'Editar Descuento' : 'Nuevo Descuento'}</h2>
            {discount && <small>ID: {discount.id}</small>}
          </div>
          <button type="button" onClick={onClose}><FiX /></button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Información Básica
          </button>
          <button 
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Programación
          </button>
          <button 
            className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
            onClick={() => setActiveTab('conditions')}
          >
            Condiciones
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {err && <div className="alert-error"><FiAlertCircle /> {err}</div>}
          
          {/* Ayuda desplegable contextual */}
          <CollapsibleHelp
            tab={activeTab}
            formType={form.type}
            formAppliesTo={form.applies_to}
            categoryMode={categoryMode}
            comboMode={comboMode}
          />

          {activeTab === 'basic' && (
            <>
              {/* Toggle Combo / Estándar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                <button
                  type="button"
                  onClick={() => setComboMode(false)}
                  style={{
                    flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: !comboMode ? '2px solid #f97316' : '1px solid #333',
                    background: !comboMode ? 'rgba(249,115,22,0.1)' : '#111',
                    color: !comboMode ? '#f97316' : '#666', cursor: 'pointer',
                  }}
                >
                  🏷️ Descuento estándar
                </button>
                <button
                  type="button"
                  onClick={() => setComboMode(true)}
                  style={{
                    flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: comboMode ? '2px solid #a855f7' : '1px solid #333',
                    background: comboMode ? 'rgba(168,85,247,0.1)' : '#111',
                    color: comboMode ? '#a855f7' : '#666', cursor: 'pointer',
                  }}
                >
                  🎁 Combo / Paquete
                </button>
              </div>

              <div>
                <label className="label">Nombre del descuento *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder={comboMode ? 'Ej: COMBO CAELUM' : 'Ej: Descuento de fin de semana'}
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  rows="2"
                  value={form.description || ''}
                  onChange={e => setField('description', e.target.value)}
                  placeholder={comboMode
                    ? 'Ej: 1 hot dog + 1 sánduche + 2 bubble tea a precio especial'
                    : 'Descripción de la promoción...'}
                />
              </div>

              {/* ══ MODO COMBO ══ */}
              {comboMode && (
                <>
                  <div>
                    <label className="label">Precio del combo ($) *</label>
                    <input
                      className="input"
                      type="number" min="0" step="0.01"
                      value={form.value}
                      onChange={e => setField('value', e.target.value)}
                      placeholder="ej: 10.00"
                      required
                    />
                  </div>

                  {/* Lista de productos del combo */}
                  <div>
                    <label className="label" style={{ marginBottom: 8 }}>
                      Productos del combo *
                      <span style={{ color: '#6b7280', textTransform: 'none', fontWeight: 400, marginLeft: 6 }}>
                        (mín. 2 productos)
                      </span>
                    </label>

                    {comboItems.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                        {comboItems.map((ci, idx) => {
                          const prod = products.find(p => String(p.id) === String(ci.id));
                          return (
                            <div key={idx} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'rgba(168,85,247,0.07)',
                              border: '1px solid rgba(168,85,247,0.2)',
                              borderRadius: 8, padding: '8px 10px',
                            }}>
                              <span style={{ flex: 1, fontSize: 13, color: '#e0e0e0' }}>
                                <strong style={{ color: '#a855f7' }}>{ci.qty}×</strong>{' '}
                                {prod?.name || ci.name || 'Producto'}
                              </span>
                              <span style={{ fontSize: 12, color: '#6b7280' }}>
                                ${((prod?.selling_price || 0) * ci.qty).toFixed(2)}
                              </span>
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <button type="button" onClick={() => setComboItems(prev =>
                                  prev.map((x, i) => i === idx ? { ...x, qty: Math.max(1, x.qty - 1) } : x)
                                )} style={{ background: '#222', border: '1px solid #444', borderRadius: 4, color: '#ccc', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                <span style={{ fontSize: 13, color: '#fff', minWidth: 16, textAlign: 'center' }}>{ci.qty}</span>
                                <button type="button" onClick={() => setComboItems(prev =>
                                  prev.map((x, i) => i === idx ? { ...x, qty: x.qty + 1 } : x)
                                )} style={{ background: '#222', border: '1px solid #444', borderRadius: 4, color: '#ccc', width: 22, height: 22, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              </div>
                              <button type="button" onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>
                                ×
                              </button>
                            </div>
                          );
                        })}
                        {/* Precio regular total (PVP con IVA) vs precio combo */}
                        {(() => {
                          const baseRegular = comboItems.reduce((s, ci) => {
                            const p = products.find(x => String(x.id) === String(ci.id));
                            return s + (p?.selling_price || 0) * ci.qty;
                          }, 0);
                          const pvpRegular = baseRegular * (1 + ivaRate / 100);
                          const comboVal = parseFloat(form.value) || 0;
                          const ahorro = Math.max(0, pvpRegular - comboVal);
                          return (
                            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'right', padding: '2px 4px' }}>
                              PVP regular:{' '}
                              <strong style={{ color: '#9ca3af' }}>${pvpRegular.toFixed(2)}</strong>
                              {comboVal > 0 && (
                                <> → cliente paga <strong style={{ color: '#a855f7' }}>${comboVal.toFixed(2)}</strong>
                                {' '}(ahorra <strong style={{ color: '#10b981' }}>${ahorro.toFixed(2)}</strong>)
                                <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>
                                  Precio combo incluye IVA del {ivaRate}%
                                </div>
                              </>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Agregar producto */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <select
                          className="select"
                          value={comboNewItem.product_id}
                          onChange={e => setComboNewItem(p => ({ ...p, product_id: e.target.value }))}
                        >
                          <option value="">Seleccionar producto...</option>
                          {products
                            .filter(p => !comboItems.some(ci => String(ci.id) === String(p.id)))
                            .map(p => (
                              <option key={p.id} value={p.id}>{p.name} (${p.selling_price})</option>
                            ))}
                        </select>
                      </div>
                      <div style={{ width: 70 }}>
                        <input
                          className="input"
                          type="number" min="1" step="1"
                          value={comboNewItem.qty}
                          onChange={e => setComboNewItem(p => ({ ...p, qty: parseInt(e.target.value) || 1 }))}
                          style={{ textAlign: 'center' }}
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
                        style={{
                          padding: '9px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                          background: comboNewItem.product_id ? '#a855f7' : '#333',
                          border: 'none', color: '#fff', cursor: comboNewItem.product_id ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ══ MODO ESTÁNDAR ══ */}
              {!comboMode && (
              <>
              <div className="form-row">
                <div>
                  <label className="label">Tipo de descuento *</label>
                  {form.applies_to === 'category' && categoryMode === 'second' ? (
                    <div className="input" style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      2️⃣ 2do producto con % de descuento
                    </div>
                  ) : form.applies_to === 'category' && categoryMode === 'fixed_price' ? (
                    <div className="input" style={{ color: '#3b82f6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      🏷️ Precio fijo por unidad
                    </div>
                  ) : (
                  <select
                    className="select"
                    value={form.type}
                    onChange={e => { setField('type', e.target.value); setPvpCalc(''); }}
                  >
                    <option value="percentage">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo ($)</option>
                    {form.applies_to !== 'category' && <option value="buy_x_get_y">Compra X, lleva Y</option>}
                    <option value="bulk">Volumen/Mayoreo</option>
                    <option value="coupon">Cupón</option>
                  </select>
                  )}
                </div>

                <div>
                  <label className="label">
                    {categoryMode === 'fixed_price'
                      ? 'Precio fijo por unidad ($) *'
                      : <>Valor * {form.type === 'fixed' && pvpCalc && (
                          <span style={{ color: '#10b981', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>
                            — calculado desde precio objetivo
                          </span>
                        )}</>
                    }
                  </label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={e => { setField('value', e.target.value); setPvpCalc(''); }}
                    placeholder={categoryMode === 'fixed_price' ? 'ej: 2.00' : form.type === 'percentage' ? '10' : '5.00'}
                    required
                  />
                </div>
              </div>

              {/* ── Calculadora precio objetivo PVP → descuento exacto (solo monto fijo, no FPPU) ── */}
              {form.type === 'fixed' && categoryMode !== 'fixed_price' && (() => {
                const selProd = form.applies_to === 'product' && form.product_id
                  ? products.find(p => String(p.id) === String(form.product_id))
                  : null;
                const sp = selProd ? parseFloat(selProd.selling_price || selProd.price || 0) : 0;
                const qty = parseInt(form.min_quantity) || 1;
                const pvpUnit = sp > 0 ? (sp * (1 + ivaRate / 100)).toFixed(2) : null;
                const subtotalActual = sp > 0 ? Math.round(sp * qty * 100) / 100 : null;

                return (
                  <div style={{
                    background: 'rgba(16,185,129,0.07)',
                    border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      🧮 Calculadora — Precio PVP objetivo
                    </span>

                    {selProd && sp > 0 && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                        <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{selProd.name}</strong>
                        {' '}— PVP unitario: <strong style={{ color: '#f97316' }}>${pvpUnit}</strong>
                        {qty > 1 && (
                          <> · {qty}u subtotal: <strong style={{ color: '#f97316' }}>${subtotalActual?.toFixed(2)}</strong> (PVP total: ${(subtotalActual * (1 + ivaRate / 100)).toFixed(2)})</>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                      <div style={{ flex: 2, minWidth: 120 }}>
                        <label className="label">Precio PVP objetivo total ($)</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={pvpCalc}
                          onChange={e => {
                            setPvpCalc(e.target.value);
                            setField('value', calcFromPvp(e.target.value, ivaRate, sp, qty));
                          }}
                          placeholder={selProd && sp > 0 ? `ej: ${(subtotalActual * (1 + ivaRate / 100) * 0.9).toFixed(2)}` : 'ej: 5.00'}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 80 }}>
                        <label className="label">IVA: {ivaRate}%</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          step="1"
                          value={ivaRate}
                          onChange={e => {
                            setIvaRate(e.target.value);
                            if (pvpCalc) setField('value', calcFromPvp(pvpCalc, e.target.value, sp, qty));
                          }}
                        />
                      </div>
                    </div>

                    {pvpCalc && parseFloat(pvpCalc) > 0 && (() => {
                      const disc = calcFromPvp(pvpCalc, ivaRate, sp, qty);
                      const factor = 1 + (parseFloat(ivaRate) || 15) / 100;
                      const targetBase = (Math.round(parseFloat(pvpCalc) / factor * 100) / 100).toFixed(2);
                      return (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.2)', borderRadius: 6, padding: '6px 10px', lineHeight: 1.7 }}>
                          {sp > 0 ? (
                            <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block' }}>
                              Subtotal ${subtotalActual?.toFixed(2)} − base obj ${targetBase} =
                            </span>
                          ) : (
                            <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block' }}>
                              ${pvpCalc} ÷ {factor.toFixed(2)} (piso) =
                            </span>
                          )}
                          <strong style={{ color: '#10b981', fontSize: 14 }}>Descuento: ${disc}</strong>
                          <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 6 }}>
                            → total final ≈ ${parseFloat(pvpCalc).toFixed(2)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {form.type !== 'coupon' && (
              <div>
                <label className="label">Aplicar a</label>
                <select
                  className="select"
                  value={form.applies_to}
                  onChange={e => {
                    const v = e.target.value;
                    setField('applies_to', v);
                    if (v !== 'category') {
                      setCategoryMode('all');
                      if (form.type === 'buy_x_get_y') setField('type', 'percentage');
                    }
                  }}
                >
                  <option value="order">Toda la orden</option>
                  <option value="product">Producto específico</option>
                  <option value="category">Categoría específica</option>
                </select>
              </div>
              )}

              {form.applies_to === 'product' && form.type !== 'coupon' && (
                <div>
                  <label className="label">Producto</label>
                  <select
                    className="select"
                    value={form.product_id || ''}
                    onChange={e => setField('product_id', e.target.value)}
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map(prod => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {form.applies_to === 'category' && form.type !== 'coupon' && (
                <>
                  <div>
                    <label className="label">Categoría</label>
                    <select
                      className="select"
                      value={form.category_id || ''}
                      onChange={e => setField('category_id', e.target.value)}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Modo de descuento por categoría */}
                  <div>
                    <label className="label">Modo de descuento en categoría</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryMode('all');
                          if (form.type === 'buy_x_get_y') setField('type', 'percentage');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: categoryMode === 'all' ? '2px solid #f97316' : '1px solid #404040',
                          background: categoryMode === 'all' ? 'rgba(249,115,22,0.12)' : '#1a1a1a',
                          color: categoryMode === 'all' ? '#f97316' : '#999',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏷️</div>
                        <div>A todos los productos</div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
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
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: categoryMode === 'second' ? '2px solid #10b981' : '1px solid #404040',
                          background: categoryMode === 'second' ? 'rgba(16,185,129,0.12)' : '#1a1a1a',
                          color: categoryMode === 'second' ? '#10b981' : '#999',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>2️⃣</div>
                        <div>2do producto con descuento</div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                          El 1ro paga normal, el 2do al %
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCategoryMode('fixed_price');
                          setField('type', 'fixed');
                        }}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: categoryMode === 'fixed_price' ? '2px solid #3b82f6' : '1px solid #404040',
                          background: categoryMode === 'fixed_price' ? 'rgba(59,130,246,0.12)' : '#1a1a1a',
                          color: categoryMode === 'fixed_price' ? '#3b82f6' : '#999',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontSize: '20px', marginBottom: '4px' }}>🏷️</div>
                        <div>Precio fijo por unidad</div>
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                          Todos pagan el mismo precio
                        </div>
                      </button>
                    </div>
                  </div>

                  {categoryMode === 'fixed_price' && (() => {
                    const catName = form.category_id && categories.find(c => String(c.id) === String(form.category_id))
                      ? categories.find(c => String(c.id) === String(form.category_id)).name
                      : 'la categoría';
                    const pvp = parseFloat(form.value) || 0;
                    const ivaFactor = 1 + ivaRate / 100;
                    const baseTarget = pvp > 0 ? (pvp / ivaFactor).toFixed(2) : '?';
                    return (
                      <div style={{
                        background: 'rgba(59,130,246,0.07)',
                        border: '1px solid rgba(59,130,246,0.25)',
                        borderRadius: '10px',
                        padding: '14px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.75)',
                        lineHeight: 1.7,
                      }}>
                        <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FiTag size={14} /> Cómo funciona — Precio fijo por unidad
                        </div>

                        {/* Qué significa el valor */}
                        <div style={{ marginBottom: '10px', padding: '8px 10px', background: 'rgba(59,130,246,0.1)', borderRadius: '7px' }}>
                          <span style={{ color: '#60a5fa', fontWeight: 700 }}>El valor que ingresas es el precio FINAL con IVA</span> que paga el cliente por unidad.
                          {pvp > 0 && (
                            <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: '12px', marginTop: '2px' }}>
                              ${pvp.toFixed(2)} (PVP) → base sin IVA: <strong style={{ color: '#f97316' }}>${baseTarget}</strong> · IVA ({ivaRate}%): <strong style={{ color: '#f97316' }}>${(pvp - parseFloat(baseTarget)).toFixed(2)}</strong>
                            </span>
                          )}
                        </div>

                        {/* Caso 1 */}
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>✅ Producto más caro que el precio fijo</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: '12px' }}>
                            Si el producto cuesta más de ${pvp > 0 ? pvp.toFixed(2) : '?'} (PVP), se cobra exactamente <strong style={{ color: '#3b82f6' }}>${pvp > 0 ? pvp.toFixed(2) : '?'}</strong> c/u.
                            {pvp > 0 && ' El descuento = diferencia entre su precio normal y el precio fijo.'}
                          </span>
                        </div>

                        {/* Caso 2 */}
                        <div style={{ marginBottom: '6px' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 700 }}>⚠️ Producto más barato que el precio fijo</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: '12px' }}>
                            Si el producto cuesta menos de ${pvp > 0 ? pvp.toFixed(2) : '?'} (PVP), se cobra a su <strong>precio normal</strong> — no se aplica ningún descuento ni se sube el precio.
                          </span>
                        </div>

                        {/* Caso 3 */}
                        <div>
                          <span style={{ color: '#a78bfa', fontWeight: 700 }}>🧾 Extras / productos de otras categorías</span>
                          <span style={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: '12px' }}>
                            Los productos fuera de <strong style={{ color: '#f97316' }}>{catName}</strong> se suman a precio normal. El total final = precio fijo × unidades de {catName} + precio normal de los demás.
                          </span>
                        </div>

                        {/* Ejemplo */}
                        {pvp > 0 && (
                          <div style={{ marginTop: '10px', padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '7px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                            <span style={{ color: '#fff', fontWeight: 700 }}>Ejemplo con {catName}:</span>
                            <span style={{ display: 'block', marginTop: '2px' }}>
                              2× Des. Americano a ${pvp.toFixed(2)} c/u = <strong style={{ color: '#3b82f6' }}>${(pvp * 2).toFixed(2)}</strong>
                            </span>
                            <span style={{ display: 'block' }}>
                              + 1× Extra $0.43 (más barato) = cobra <strong>$0.43 × 1.{ivaRate} = ${(0.43 * ivaFactor).toFixed(2)}</strong>
                            </span>
                            <span style={{ display: 'block', color: '#34d399', fontWeight: 700, marginTop: '2px' }}>
                              Total = ${(pvp * 2).toFixed(2)} + ${(0.43 * ivaFactor).toFixed(2)} = ${(pvp * 2 + 0.43 * ivaFactor).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {categoryMode === 'second' && (
                    <div style={{
                      background: 'rgba(16,185,129,0.07)',
                      border: '1px solid rgba(16,185,129,0.25)',
                      borderRadius: '10px',
                      padding: '14px',
                      fontSize: '13px',
                      color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1.6,
                    }}>
                      <div style={{ fontWeight: 700, color: '#10b981', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiGift size={14} /> Cómo funciona
                      </div>
                      <div>
                        Cuando haya <strong style={{ color: '#fff' }}>2 o más productos</strong> de la categoría
                        {form.category_id && categories.find(c => String(c.id) === String(form.category_id)) && (
                          <strong style={{ color: '#f97316' }}> {categories.find(c => String(c.id) === String(form.category_id)).name}</strong>
                        )},
                        el más barato recibe el <strong style={{ color: '#10b981' }}>{form.value || '?'}% de descuento</strong>.
                      </div>
                      <div style={{ marginTop: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
                        Ej: 2 postres → el 1ro paga precio normal, el 2do paga con {form.value || '?'}% OFF.
                        Con 4 postres → 2 pagan normal y 2 con descuento.
                      </div>
                    </div>
                  )}
                </>
              )}

              {form.type === 'coupon' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 10, padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#ec4899', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FiAward size={14} /> Configuración del Cupón
                  </div>

                  {/* Toggle tipo de cupón */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => { setCouponMode('fixed'); setField('applies_to', 'order'); setField('product_id', ''); setField('category_id', ''); }}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: couponMode === 'fixed' ? '2px solid #ec4899' : '1px solid #333',
                        background: couponMode === 'fixed' ? 'rgba(236,72,153,0.12)' : '#111',
                        color: couponMode === 'fixed' ? '#ec4899' : '#666', cursor: 'pointer',
                      }}
                    >
                      💵 Monto fijo
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>Descuenta $ del total</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCouponMode('product'); setField('applies_to', 'product'); setField('category_id', ''); }}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: couponMode === 'product' ? '2px solid #ec4899' : '1px solid #333',
                        background: couponMode === 'product' ? 'rgba(236,72,153,0.12)' : '#111',
                        color: couponMode === 'product' ? '#ec4899' : '#666', cursor: 'pointer',
                      }}
                    >
                      🎁 Producto gratis
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>1 producto específico</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCouponMode('category'); setField('applies_to', 'category'); setField('product_id', ''); setField('value', '100'); }}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: couponMode === 'category' ? '2px solid #ec4899' : '1px solid #333',
                        background: couponMode === 'category' ? 'rgba(236,72,153,0.12)' : '#111',
                        color: couponMode === 'category' ? '#ec4899' : '#666', cursor: 'pointer',
                      }}
                    >
                      🏷️ Categoría a elección
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>Cliente elige qué item</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setCouponMode('multiproduct'); setField('applies_to', 'products_list'); setField('product_id', ''); setField('category_id', ''); setField('value', '100'); }}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        border: couponMode === 'multiproduct' ? '2px solid #ec4899' : '1px solid #333',
                        background: couponMode === 'multiproduct' ? 'rgba(236,72,153,0.12)' : '#111',
                        color: couponMode === 'multiproduct' ? '#ec4899' : '#666', cursor: 'pointer',
                      }}
                    >
                      🛒 Varios productos
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>Elige de una lista</div>
                    </button>
                  </div>

                  {/* Código del cupón (siempre) */}
                  <div>
                    <label className="label">Código del cupón *</label>
                    <input
                      className="input"
                      value={form.code || ''}
                      onChange={e => setField('code', e.target.value.toUpperCase().replace(/\s/g, ''))}
                      placeholder="EJ: GRATIS-LATTE"
                    />
                    <small className="help-text">El cajero debe ingresar este código exacto en el POS para activar el descuento.</small>
                  </div>

                  {/* Modo: Monto fijo */}
                  {couponMode === 'fixed' && (
                    <div>
                      <label className="label">Valor del descuento ($) *</label>
                      <input
                        className="input"
                        type="number" min="0" step="0.01"
                        value={form.value}
                        onChange={e => setField('value', e.target.value)}
                        placeholder="Ej: 5.00"
                      />
                      <small className="help-text">Monto que se descuenta del subtotal de la orden (sin IVA).</small>
                    </div>
                  )}

                  {/* Modo: Categoría a elección — el cajero elige en caja */}
                  {couponMode === 'category' && (
                    <>
                      <div>
                        <label className="label">Descuento sobre el ítem seleccionado (%)</label>
                        <input
                          className="input"
                          type="number" min="1" max="100" step="1"
                          value={form.value}
                          onChange={e => setField('value', e.target.value)}
                          placeholder="100"
                        />
                        <small className="help-text">100 = completamente gratis. 50 = mitad de precio.</small>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.7 }}>
                        <div style={{ fontWeight: 700, color: '#ec4899', marginBottom: 4 }}>🎯 Cómo funciona en el POS</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                          Al ingresar el código en caja, el cajero verá <strong style={{ color: '#f97316' }}>todos los productos de la orden</strong> y elige cuál(es) reciben el {form.value || 100}% de descuento.
                        </div>
                      </div>
                    </>
                  )}

                  {/* Modo: Varios productos a elección */}
                  {couponMode === 'multiproduct' && (
                    <>
                      <div>
                        <label className="label">Productos que el cliente puede recibir gratis *</label>
                        <input
                          className="input"
                          placeholder="Buscar producto..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          style={{ marginBottom: 8 }}
                        />
                        <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #2a2a2a', borderRadius: 8, background: '#0d0d0d' }}>
                          {products
                            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                            .map(p => {
                              const checked = multiProductIds.includes(String(p.id));
                              const pvp = (parseFloat(p.selling_price || 0) * (1 + ivaRate / 100)).toFixed(2);
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => toggleMultiProduct(String(p.id))}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                                    cursor: 'pointer', borderBottom: '1px solid #1a1a1a',
                                    background: checked ? 'rgba(236,72,153,0.1)' : 'transparent',
                                    transition: 'background 0.15s',
                                  }}
                                >
                                  <input type="checkbox" checked={checked} readOnly style={{ accentColor: '#ec4899', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 13, color: checked ? '#f9a8d4' : '#ccc' }}>{p.name}</span>
                                  <span style={{ fontSize: 11, color: '#666' }}>${pvp}</span>
                                </div>
                              );
                            })}
                          {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                            <div style={{ padding: '14px 12px', fontSize: 12, color: '#555', textAlign: 'center' }}>Sin resultados</div>
                          )}
                        </div>
                        {multiProductIds.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 12, color: '#ec4899', fontWeight: 700 }}>
                            ✓ {multiProductIds.length} producto{multiProductIds.length !== 1 ? 's' : ''} seleccionado{multiProductIds.length !== 1 ? 's' : ''}
                          </div>
                        )}
                        <small className="help-text">En caja, el cajero verá solo estos productos de la orden y elegirá cuál(es) recibe gratis el cliente.</small>
                      </div>
                      <div>
                        <label className="label">Descuento sobre el ítem seleccionado (%)</label>
                        <input
                          className="input"
                          type="number" min="1" max="100" step="1"
                          value={form.value}
                          onChange={e => setField('value', e.target.value)}
                          placeholder="100"
                        />
                        <small className="help-text">100 = completamente gratis. 50 = mitad de precio.</small>
                      </div>
                    </>
                  )}

                  {/* Modo: Producto específico gratis */}
                  {couponMode === 'product' && (
                    <>
                      <div>
                        <label className="label">Producto que se regala *</label>
                        <select
                          className="select"
                          value={form.product_id || ''}
                          onChange={e => {
                            const prod = products.find(p => String(p.id) === e.target.value);
                            setField('product_id', e.target.value);
                            setField('applies_to', 'product');
                            if (prod) {
                              // value = precio base sin IVA (selling_price)
                              setField('value', parseFloat(prod.selling_price || prod.price || 0).toFixed(2));
                            }
                          }}
                        >
                          <option value="">Seleccionar producto...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} — base ${parseFloat(p.selling_price || 0).toFixed(2)} · PVP ${(parseFloat(p.selling_price || 0) * (1 + ivaRate / 100)).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {form.product_id && (() => {
                        const prod = products.find(p => String(p.id) === String(form.product_id));
                        if (!prod) return null;
                        const base = parseFloat(prod.selling_price || 0);
                        const pvp = base * (1 + ivaRate / 100);
                        return (
                          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 12px', fontSize: 12, lineHeight: 1.7 }}>
                            <div style={{ fontWeight: 700, color: '#ec4899', marginBottom: 4 }}>🎁 {prod.name} — completamente gratis</div>
                            <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                              Precio base (sin IVA): <strong style={{ color: '#f1f5f9' }}>${base.toFixed(2)}</strong>
                              {' '}· IVA {ivaRate}%: <strong style={{ color: '#f1f5f9' }}>${(pvp - base).toFixed(2)}</strong>
                              {' '}· PVP: <strong style={{ color: '#10b981' }}>${pvp.toFixed(2)}</strong>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
                              El descuento aplicado será <strong style={{ color: '#ec4899' }}>${base.toFixed(2)}</strong> (base sin IVA).
                              El cupón solo se activa si el producto está en la orden.
                            </div>
                          </div>
                        );
                      })()}

                      <div>
                        <label className="label">Valor del descuento (base sin IVA) *</label>
                        <input
                          className="input"
                          type="number" min="0" step="0.01"
                          value={form.value}
                          onChange={e => setField('value', e.target.value)}
                          placeholder="Se llena automáticamente al seleccionar producto"
                        />
                        <small className="help-text">Se auto-completa con el precio base del producto. Ajusta si es necesario.</small>
                      </div>
                    </>
                  )}
                </div>
              )}
              </>
              )}
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              <div>
                <label className="label">Días de la semana</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DAYS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      className={`day-btn ${form.days_of_week.includes(d.value) ? 'active' : ''}`}
                      onClick={() => toggleDay(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
                <small className="help-text">Dejar vacío para todos los días</small>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Hora inicio</label>
                  <input 
                    className="input" 
                    type="time"
                    value={form.start_time || ''}
                    onChange={e => setField('start_time', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Hora fin</label>
                  <input 
                    className="input" 
                    type="time"
                    value={form.end_time || ''}
                    onChange={e => setField('end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Fecha inicio</label>
                  <input 
                    className="input" 
                    type="date"
                    value={form.start_date?.split('T')[0] || ''}
                    onChange={e => setField('start_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Fecha fin</label>
                  <input 
                    className="input" 
                    type="date"
                    value={form.end_date?.split('T')[0] || ''}
                    onChange={e => setField('end_date', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === 'conditions' && (
            <>
              <div className="form-row">
                <div>
                  <label className="label">Monto mínimo de compra</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_amount}
                    onChange={e => setField('min_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="label">Descuento máximo</label>
                  <input 
                    className="input" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.max_discount || ''}
                    onChange={e => setField('max_discount', e.target.value)}
                    placeholder="Ej: 50.00"
                  />
                </div>
              </div>

              <div className="form-row">
                <div>
                  <label className="label">Cantidad mínima</label>
                  <input 
                    className="input" 
                    type="number"
                    min="1"
                    value={form.min_quantity}
                    onChange={e => setField('min_quantity', e.target.value)}
                    placeholder="1"
                  />
                </div>

                <div>
                  <label className="label">Límite de usos</label>
                  <input 
                    className="input" 
                    type="number"
                    min="1"
                    value={form.usage_limit || ''}
                    onChange={e => setField('usage_limit', e.target.value)}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div>
                <label className="label">Prioridad</label>
                <input 
                  className="input" 
                  type="number"
                  min="0"
                  max="100"
                  value={form.priority}
                  onChange={e => setField('priority', e.target.value)}
                  placeholder="0-100 (mayor = más prioritario)"
                />
              </div>

              <div>
                <label className="label">Segmento de clientes</label>
                <select 
                  className="select"
                  value={form.customer_segment}
                  onChange={e => setField('customer_segment', e.target.value)}
                >
                  <option value="all">Todos los clientes</option>
                  <option value="new">Nuevos clientes</option>
                  <option value="frequent">Clientes frecuentes</option>
                  <option value="vip">Clientes VIP</option>
                </select>
              </div>

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
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando...' : discount ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────
function parseComboCard(d) {
  try {
    if (!String(d.description || '').startsWith('__COMBO__')) return null;
    return JSON.parse(d.description.slice(9).split('||')[0]);
  } catch { return null; }
}

function DiscountCard({ d, onEdit, onDelete, onDuplicate }) {
  const active = isDiscountActive(d);
  const comboData = parseComboCard(d);

  const accentColor = comboData ? '#a855f7'
    : d.type === 'percentage'  ? '#10b981'
    : d.type === 'fixed'       ? '#3b82f6'
    : d.type === 'buy_x_get_y' ? '#f59e0b'
    : d.type === 'bulk'        ? '#06b6d4'
    : d.type === 'coupon'      ? '#ec4899'
    : '#10b981';

  const typeLabel =
    comboData                                                          ? `Combo · ${comboData.items?.length || 0} productos`
    : d.type === 'percentage'                                          ? `Porcentaje · ${d.value}%`
    : d.type === 'fixed' && String(d.description||'').startsWith('__FPPU__') ? `Precio fijo · ${formatMoney(d.value)}/u`
    : d.type === 'fixed'                                               ? `Monto fijo · ${formatMoney(d.value)}`
    : d.type === 'buy_x_get_y' && d.applies_to === 'category'         ? `2do producto · ${d.value}% OFF`
    : d.type === 'buy_x_get_y'                                        ? `Compra ${d.min_quantity||'X'} lleva gratis`
    : d.type === 'bulk'                                                ? `Volumen · ${d.value}%`
    : d.type === 'coupon'                                              ? `Cupón · ${d.code||'Sin código'}`
    : '';

  const valueLabel =
    comboData                                                          ? formatMoney(comboData.price)
    : d.type === 'percentage'                                          ? `${d.value}% OFF`
    : d.type === 'fixed' && String(d.description||'').startsWith('__FPPU__') ? `${formatMoney(d.value)}/u`
    : d.type === 'fixed'                                               ? formatMoney(d.value)
    : d.type === 'buy_x_get_y' && d.applies_to === 'category'         ? `2do al ${d.value}%`
    : d.type === 'buy_x_get_y'                                        ? '2×1'
    : d.type === 'bulk'                                                ? `${d.value}% vol.`
    : d.type === 'coupon'                                              ? formatMoney(d.value)
    : '';

  return (
    <div className={`discount-card ${!active ? 'inactive' : ''}`} style={{ '--card-accent': accentColor }}>

      {/* ── TOP: icono + nombre ── */}
      <div className="dc-top">
        <div className="dc-icon" style={{ background: `${accentColor}18`, color: accentColor }}>
          {comboData ? <FiGift size={18} /> : getDiscountTypeIcon(d.type)}
        </div>
        <div className="dc-name-block">
          <div className="dc-name">{d.name}</div>
          <div className="dc-type-label" style={{ color: accentColor }}>{typeLabel}</div>
        </div>
        <div className={`dc-status-pill ${active ? 'dc-pill-active' : 'dc-pill-inactive'}`}>
          {active ? <CheckCircle size={12} /> : <XCircle size={12} />}
          {active ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      {/* ── VALOR grande ── */}
      <div className="dc-value" style={{ color: accentColor }}>
        {valueLabel}
      </div>

      {/* ── Items combo ── */}
      {comboData?.items?.length > 0 && (
        <div className="dc-combo-items">
          {comboData.items.map((ci, i) => (
            <span key={i} className="dc-combo-chip" style={{ background: `${accentColor}18`, color: accentColor }}>
              {ci.qty}× {ci.name}
            </span>
          ))}
        </div>
      )}

      {/* ── META: badge + schedule + condiciones ── */}
      <div className="dc-meta">
        <span className="dc-badge" style={{ background: `${accentColor}12`, color: accentColor, borderColor: `${accentColor}30` }}>
          <FiTag size={11} /> {d.category_name || d.product_name || 'Toda la orden'}
        </span>
        <span className="dc-schedule">
          <ScheduleIcon discount={d} /> {scheduleLabel(d)}
        </span>
        {d.min_amount > 0 && (
          <span className="dc-schedule">
            <FiDollarSign size={12} /> Mín. {formatMoney(d.min_amount)}
          </span>
        )}
        {d.usage_limit && (
          <span className="dc-schedule">
            <FiRepeat size={12} /> {d.used_count||0}/{d.usage_limit} usos
          </span>
        )}
      </div>

      {/* ── FOOTER: botones ── */}
      <div className="dc-footer">
        <button type="button" className="dc-btn dc-btn-dup" onClick={() => onDuplicate(d)} title="Duplicar">
          <FiCopy size={14} /> Duplicar
        </button>
        <button type="button" className="dc-btn dc-btn-edit" onClick={() => onEdit(d)} title="Editar">
          <FiEdit2 size={14} /> Editar
        </button>
        <button type="button" className="dc-btn dc-btn-del" onClick={() => onDelete(d)} title="Eliminar">
          <FiTrash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────
export default function PosDiscounts() {
  const { showConfirm } = useConfirm();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // ✅ Para delete/duplicate
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setErr('');

    try {
      const res = await fetchWithAuth('/api/discounts');
      
      if (!res.ok) {
        throw new Error('Error al cargar descuentos');
      }

      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (e) {

      setErr(e.message || 'Error al cargar descuentos');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const handleDelete = async (discount) => {
    if (isProcessing) return; // ✅ Prevención de doble envío
    if (!await showConfirm(`¿Eliminar el descuento "${discount.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      setIsProcessing(true);
      const res = await fetchWithAuth(`/api/discounts/${discount.id}?hard_delete=true`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      await load();
      alert('Descuento eliminado exitosamente');
    } catch (e) {
      alert(e.message || 'Error al eliminar descuento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = async (discount) => {
    if (isProcessing) return; // ✅ Prevención de doble envío
    const newName = `${discount.name} (Copia)`;
    if (!await showConfirm(`¿Duplicar el descuento "${discount.name}"?`, { danger: false, confirmText: 'Duplicar' })) return;

    try {
      setIsProcessing(true);
      const duplicateData = {
        name: newName,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        applies_to: discount.applies_to || 'order',
        product_id: discount.product_id,
        category_id: discount.category_id,
        min_amount: discount.min_amount,
        max_discount: discount.max_discount,
        min_quantity: discount.min_quantity || 1,
        code: discount.code,
        usage_limit: discount.usage_limit,
        days_of_week: discount.days_of_week,
        start_time: discount.start_time,
        end_time: discount.end_time,
        start_date: discount.start_date,
        end_date: discount.end_date,
        stackable: discount.stackable,
        priority: discount.priority,
        customer_segment: discount.customer_segment || 'all',
        is_active: false
      };

      const res = await fetchWithAuth('/api/discounts', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
      });

      if (!res.ok) throw new Error('Error al duplicar');

      await load();
      alert('Descuento duplicado exitosamente');
    } catch (e) {
      alert(e.message || 'Error al duplicar descuento');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  const filteredDiscounts = discounts.filter(d => {
    if (filter === 'active') return isDiscountActive(d);
    if (filter === 'inactive') return !isDiscountActive(d);
    return true;
  });

  const stats = {
    total: discounts.length,
    active: discounts.filter(d => isDiscountActive(d)).length,
    inactive: discounts.filter(d => !isDiscountActive(d)).length
  };

  return (
    <>
      <PageTemplate
        title="Descuentos y Promociones"
        subtitle="Gestiona descuentos automáticos y promociones especiales para tus productos"
        loading={loading}
        headerAction={
          <div className="header-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setEditingDiscount(null);
                setShowModal(true);
              }}
            >
              <FiPlus /> Nueva Promoción
            </button>
            <button 
              className="btn btn-outline" 
              onClick={load}
              disabled={loading}
            >
              <FiRefreshCw className={loading ? 'spin' : ''}/> Actualizar
            </button>
          </div>
        }
      >
        <div className="filters-bar">
          <div className="stats-badges">
            <span className="stat-badge">Total: {stats.total}</span>
            <span className="stat-badge success">Activos: {stats.active}</span>
            <span className="stat-badge danger">Inactivos: {stats.inactive}</span>
          </div>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todos
            </button>
            <button 
              className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Activos
            </button>
            <button 
              className={`filter-btn ${filter === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilter('inactive')}
            >
              Inactivos
            </button>
          </div>
        </div>

        {err && <div className="alert-error"><FiAlertCircle /> {err}</div>}

        {!loading && filteredDiscounts.length === 0 && !err && (
          <div className="empty-state">
            <FiGift size={48} />
            <h3>No hay descuentos configurados</h3>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowModal(true)}
            >
              <FiPlus /> Crear Promoción
            </button>
          </div>
        )}

        {filteredDiscounts.length > 0 && (
          <div className="discount-grid">
            {filteredDiscounts.map(d => (
              <DiscountCard 
                key={d.id} 
                d={d} 
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
              />
            ))}
          </div>
        )}
      </PageTemplate>

      {showModal && (
        <DiscountModal
          discount={editingDiscount}
          onClose={handleCloseModal}
          onSaved={() => {
            load();
            handleCloseModal();
          }}
        />
      )}
    </>
  );
}