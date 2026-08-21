import { FiPercent, FiDollarSign, FiShoppingBag, FiUsers, FiAward, FiCalendar, FiRepeat, FiClock } from 'react-icons/fi';

export const DAYS = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const EMPTY_FORM = {
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

export const formatMoney = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;

export const parseDays = (daysStr) => {
  if (!daysStr) return [];
  if (Array.isArray(daysStr)) return daysStr;
  return daysStr.split(',').map(Number);
};

export const isDiscountActive = (discount) => {
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

export const scheduleLabel = (d) => {
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

export const getDiscountTypeIcon = (type) => {
  switch(type) {
    case 'percentage': return <FiPercent size={18} />;
    case 'fixed': return <FiDollarSign size={18} />;
    case 'buy_x_get_y': return <FiShoppingBag size={18} />;
    case 'bulk': return <FiUsers size={18} />;
    case 'coupon': return <FiAward size={18} />;
    default: return <FiPercent size={18} />;
  }
};

export const ScheduleIcon = ({ discount }) => {
  if (discount?.start_date && discount?.end_date) return <FiCalendar size={12} />;
  if (discount?.days_of_week?.length > 0) return <FiRepeat size={12} />;
  if (discount?.start_time) return <FiClock size={12} />;
  return <FiClock size={12} />;
};

export const parseComboCard = (d) => {
  try {
    if (!String(d.description || '').startsWith('__COMBO__')) return null;
    return JSON.parse(d.description.slice(9).split('||')[0]);
  } catch { return null; }
};