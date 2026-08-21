// components/Odontologia/EstadoCuenta/utils/helpers.js

export const fmt = (currencySymbol, n) => 
  `${currencySymbol} ${parseFloat(n || 0).toFixed(2)}`;

export const getStatusMap = () => ({
  draft: { label: 'Borrador', color: '#64748b', bg: '#f1f5f9' },
  active: { label: 'Activo', color: '#1e40af', bg: '#dbeafe' },
  completed: { label: 'Completado', color: '#065f46', bg: '#d1fae5' },
  cancelled: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
});

export const getCuotaEstado = (estado) => {
  const map = {
    pagado: { label: 'Pagado', bg: '#d1fae5', color: '#065f46' },
    pendiente: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
    vencido: { label: 'Vencido', bg: '#fee2e2', color: '#991b1b' },
  };
  return map[estado] || map.pendiente;
};

export const getTratamientoEstado = (estado) => {
  const map = {
    pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
    en_proceso: { label: 'En proceso', color: '#3b82f6', bg: '#eff6ff' },
    completado: { label: 'Completado', color: '#10b981', bg: '#d1fae5' },
    cancelado: { label: 'Cancelado', color: '#ef4444', bg: '#fee2e2' },
  };
  return map[estado] || map.pendiente;
};

export const getMetodoPagoLabel = (method) => {
  const map = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credit: 'Crédito',
    debit: 'Débito',
  };
  return map[method] || method || '—';
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('es-ES');
};