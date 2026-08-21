import React from 'react';
import { FiCopy, FiEdit2, FiTrash2, FiTag, FiCheckCircle, FiX, FiDollarSign, FiRepeat, FiPackage } from 'react-icons/fi';
import { getDiscountTypeIcon, ScheduleIcon, scheduleLabel, parseComboCard, isDiscountActive, formatMoney } from '../DiscountHelpers';

const DiscountCard = ({ d, onEdit, onDelete, onDuplicate }) => {
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
      <div className="dc-top">
        <div className="dc-icon" style={{ background: `${accentColor}18`, color: accentColor }}>
          {comboData ? <FiPackage size={18} /> : getDiscountTypeIcon(d.type)}
        </div>
        <div className="dc-name-block">
          <div className="dc-name">{d.name}</div>
          <div className="dc-type-label" style={{ color: accentColor }}>{typeLabel}</div>
        </div>
        <div className={`dc-status-pill ${active ? 'dc-pill-active' : 'dc-pill-inactive'}`}>
          {active ? <FiCheckCircle size={12} /> : <FiX size={12} />}
          {active ? 'Activo' : 'Inactivo'}
        </div>
      </div>

      <div className="dc-value" style={{ color: accentColor }}>
        {valueLabel}
      </div>

      {comboData?.items?.length > 0 && (
        <div className="dc-combo-items">
          {comboData.items.map((ci, i) => (
            <span key={i} className="dc-combo-chip" style={{ background: `${accentColor}18`, color: accentColor }}>
              {ci.qty}× {ci.name}
            </span>
          ))}
        </div>
      )}

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
};

export default DiscountCard;