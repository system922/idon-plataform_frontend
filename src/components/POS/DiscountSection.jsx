// src/pages/cashier/components/DiscountSection.jsx
import React from 'react';
import { FiPercent, FiTag, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';

const DiscountSection = ({
  availableDiscounts,
  appliedDiscount,
  setAppliedDiscount,
  discountAmount,
  setDiscountAmount,
  totalOrdenConDescuento,
  setTotalOrdenConDescuento,
  couponSlots,
  setCouponSlots,
  couponPendingSelect,
  setCouponPendingSelect,
  pendingCoupon,
  setPendingCoupon,
  pendingSlotIdx,
  setPendingSlotIdx,
  couponSelectedItemIds,
  setCouponSelectedItemIds,
  appliedCouponsRef,
  manualDiscountRef,
  couponDiscountAmount,
  couponVersion,
  setCouponVersion,
  descuentosExpanded,
  setDescuentosExpanded,
  selectedOrder,
  getSubtotalSinIVA,
  getOrderTotal,
  fmt,
  isDiscountApplicable,
  calculateDiscountAmountForOrder,
  recalcularTotalConDescuento,
  aplicarCupon,
  quitarCupon,
  confirmarCuponCategoria,
}) => {
  const handleAplicarCupon = (slotIdx) => {
    aplicarCupon(slotIdx);
  };

  return (
    <div style={{ 
      background: 'var(--bg-tertiary, #f8fafc)', 
      border: '1px solid var(--border-color, #E2E8F0)', 
      borderRadius: 'var(--radius-sm, 6px)',
      marginBottom: '12px', 
      marginTop: '5px',
      color: 'var(--text-primary, #1A202C)', 
      overflow: 'hidden' 
    }}>
      <div 
        onClick={() => setDescuentosExpanded(p => !p)}
        style={{ 
          fontSize: 'var(--font-size-sm, 13px)', 
          fontWeight: 'var(--font-weight-semibold, 600)', 
          padding: '10px 12px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px', 
          cursor: 'pointer', 
          userSelect: 'none', 
          borderBottom: descuentosExpanded ? '1px solid var(--border-color, #E2E8F0)' : 'none',
          color: 'var(--text-primary, #1A202C)'
        }}
      >
        <FiPercent size={14} />
        DESCUENTOS Y CUPONES
        {(appliedDiscount || appliedCouponsRef.current.length > 0) && (
          <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs, 11px)', color: 'var(--success, #10b981)', fontWeight: 'var(--font-weight-bold, 700)' }}>
            -{fmt(discountAmount + couponDiscountAmount)}
          </span>
        )}
        <span style={{ 
          marginLeft: appliedDiscount || appliedCouponsRef.current.length > 0 ? '0' : 'auto', 
          color: 'var(--text-muted, #94a3b8)', 
          fontSize: 'var(--font-size-sm, 12px)' 
        }}>
          {descuentosExpanded ? '▲' : '▼'}
        </span>
      </div>
      
      {descuentosExpanded && (
        <div style={{ padding: '12px' }}>
          {/* Descuentos disponibles */}
          {availableDiscounts.filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, getOrderTotal(), selectedOrder?.items || [])).length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '8px', 
              marginBottom: '10px' 
            }}>
              {availableDiscounts
                .filter(d => d.is_active && d.type !== 'coupon' && isDiscountApplicable(d, getOrderTotal(), selectedOrder?.items || []))
                .map(discount => {
                  const isSelected = appliedDiscount?.id === discount.id;
                  const isFPPU = discount.type === 'fixed' && discount.applies_to === 'category' &&
                    String(discount.description || '').startsWith('__FPPU__');
                  const discountLabel =
                    isFPPU ? `$${parseFloat(discount.value).toFixed(2)}/u FIJO` :
                    discount.type === 'percentage' ? `${discount.value}% DESC` :
                    discount.type === 'fixed' ? `$${parseFloat(discount.value).toFixed(2)} DESC` :
                    discount.type === 'buy_x_get_y' ? `COMPRA X LLEVA Y` :
                    discount.type === 'bulk' ? `${discount.value}% MAYOREO` : `DESC`;
                  return (
                    <button
                      key={discount.id}
                      onClick={() => {
                        const couponAmt = couponDiscountAmount;
                        if (isSelected) {
                          manualDiscountRef.current = null;
                          setAppliedDiscount(null);
                          setDiscountAmount(0);
                          const base = getOrderTotal();
                          setTotalOrdenConDescuento(couponAmt > 0 ? Math.round(Math.max(0, base - couponAmt * 1.15) * 100) / 100 : base);
                        } else {
                          const newAmount = calculateDiscountAmountForOrder(discount, getSubtotalSinIVA(), selectedOrder?.items || []);
                          manualDiscountRef.current = { discount, amount: newAmount };
                          setAppliedDiscount(discount);
                          setDiscountAmount(newAmount);
                          recalcularTotalConDescuento(discount, newAmount);
                        }
                      }}
                      style={{ 
                        padding: '8px 10px', 
                        borderRadius: 'var(--radius-sm, 6px)', 
                        border: isSelected ? '2px solid var(--success, #10b981)' : '1px solid var(--border-color, #E2E8F0)', 
                        background: isSelected ? 'var(--success-bg, rgba(16,185,129,0.2))' : 'var(--bg-secondary, #ffffff)', 
                        color: isSelected ? 'var(--success, #10b981)' : 'var(--text-secondary, #4A5568)', 
                        cursor: 'pointer', 
                        fontSize: 'var(--font-size-sm, 12px)', 
                        fontWeight: 'var(--font-weight-semibold, 600)', 
                        transition: 'var(--transition-fast, all 0.15s ease)', 
                        textAlign: 'center', 
                        whiteSpace: 'normal' 
                      }}
                      title={discount.name}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-hover, #D1D5DB)';
                          e.currentTarget.style.background = 'var(--bg-hover, rgba(249, 115, 22, 0.04))';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = 'var(--border-color, #E2E8F0)';
                          e.currentTarget.style.background = 'var(--bg-secondary, #ffffff)';
                        }
                      }}
                    >
                      <div>{discountLabel}</div>
                      <div style={{ 
                        fontSize: 'var(--font-size-xs, 11px)', 
                        opacity: 0.8, 
                        marginTop: '2px' 
                      }}>
                        {discount.name}
                      </div>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Cupones pendientes de selección */}
          {couponPendingSelect && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '8px', 
              marginBottom: '10px', 
              background: 'var(--bg-tertiary, rgba(0,0,0,0.05))', 
              borderRadius: 'var(--radius-sm, 6px)', 
              padding: '10px' 
            }}>
              <div style={{ 
                fontSize: 'var(--font-size-sm, 12px)', 
                color: 'var(--warning, #f59e0b)', 
                fontWeight: 'var(--font-weight-semibold, 600)' 
              }}>
                Cupón "{pendingCoupon?.name}" — selecciona qué ítem(s) reciben el {pendingCoupon?.value}% de descuento:
              </div>
              {(selectedOrder?.items || [])
                .filter(item => {
                  if (item.paid) return false;
                  if (pendingCoupon?.applies_to === 'category') {
                    return pendingCoupon.category_id
                      ? String(item.category_id) === String(pendingCoupon.category_id)
                      : true;
                  }
                  return false;
                })
                .map(item => {
                  const checked = couponSelectedItemIds.includes(item.id);
                  const base = (Number(item.selling_price) || Number(item.unit_price) || 0) * (Number(item.quantity) || 1);
                  const descItem = Math.round(base * (Number(pendingCoupon?.value) / 100) * 100) / 100;
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setCouponSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px', 
                        cursor: 'pointer', 
                        padding: '8px 12px', 
                        borderRadius: 'var(--radius-sm, 6px)', 
                        background: checked ? 'var(--purple-bg, rgba(99,102,241,0.15))' : 'var(--bg-secondary, rgba(255,255,255,0.04))', 
                        border: `1px solid ${checked ? 'var(--purple, #6366f1)' : 'var(--border-color, #E2E8F0)'}` 
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={checked} 
                        readOnly 
                        style={{ 
                          accentColor: 'var(--purple, #6366f1)', 
                          width: 16, 
                          height: 16, 
                          cursor: 'pointer' 
                        }} 
                      />
                      <span style={{ 
                        flex: 1, 
                        fontSize: 'var(--font-size-base, 13px)', 
                        color: 'var(--text-primary, #1A202C)' 
                      }}>
                        {item.quantity}× {item.product_name}
                      </span>
                      <span style={{ 
                        fontSize: 'var(--font-size-sm, 12px)', 
                        color: 'var(--text-muted, #94a3b8)' 
                      }}>
                        {fmt(base)}
                      </span>
                      {checked && (
                        <span style={{ 
                          fontSize: 'var(--font-size-sm, 12px)', 
                          color: 'var(--success, #10b981)', 
                          fontWeight: 'var(--font-weight-bold, 700)' 
                        }}>
                          -{fmt(descItem)}
                        </span>
                      )}
                    </div>
                  );
                })}
              {pendingSlotIdx !== null && couponSlots[pendingSlotIdx]?.error && (
                <div style={{ 
                  color: 'var(--danger, #ef4444)', 
                  fontSize: 'var(--font-size-xs, 11px)' 
                }}>
                  {couponSlots[pendingSlotIdx].error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <ButtonGroup>
                  <IconTextButton
                    variant="success"
                    size="md"
                    icon={<FiCheck size={14} />}
                    onClick={confirmarCuponCategoria}
                    disabled={couponSelectedItemIds.length === 0}
                    style={{ flex: 1 }}
                  >
                    Aplicar ({couponSelectedItemIds.length} ítem{couponSelectedItemIds.length !== 1 ? 's' : ''})
                  </IconTextButton>
                  <IconTextButton
                    variant=""
                    size="md"
                    onClick={() => { 
                      setCouponPendingSelect(false); 
                      setPendingCoupon(null); 
                      setPendingSlotIdx(null); 
                      setCouponSelectedItemIds([]); 
                    }}
                  >
                    Cancelar
                  </IconTextButton>
                </ButtonGroup>
              </div>
            </div>
          )}

          {/* Lista de cupones aplicados */}
          <div style={{ 
            borderTop: '1px solid var(--border-color, #E2E8F0)', 
            paddingTop: '10px' 
          }}>
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'flex-start', 
              gap: '6px' 
            }}>
              {appliedCouponsRef.current.map((c, idx) => (
                <div key={`applied-${idx}`} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '5px', 
                  background: 'var(--success-bg, rgba(16,185,129,0.12))', 
                  border: '1px solid var(--success, #10b981)', 
                  borderRadius: 'var(--radius-sm, 6px)', 
                  padding: '7px 10px', 
                  flexShrink: 0 
                }}>
                  <FiTag size={11} style={{ color: 'var(--success, #10b981)' }} />
                  <span style={{ 
                    fontSize: 'var(--font-size-sm, 12px)', 
                    fontWeight: 'var(--font-weight-bold, 700)', 
                    color: 'var(--success, #10b981)', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {c.discount.name}
                  </span>
                  <span style={{ 
                    fontSize: 'var(--font-size-xs, 11px)', 
                    color: 'var(--success-light, #6ee7b7)', 
                    whiteSpace: 'nowrap' 
                  }}>
                    -{fmt(c.amount)}
                  </span>
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiX size={12} />}
                    onClick={() => quitarCupon(idx)}
                  >
                    Quitar
                  </IconTextButton>
                </div>
              ))}
              
              {/* Inputs de cupones */}
              {couponSlots.map((slot, idx) => (
                <div key={idx} style={{ flex: '1 1 160px', minWidth: '140px' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input
                      type="text"
                      placeholder="Código de cupón"
                      value={slot.code}
                      onChange={e => setCouponSlots(prev => prev.map((s, i) => i === idx ? { ...s, code: e.target.value.toUpperCase(), error: '' } : s))}
                      onKeyPress={e => e.key === 'Enter' && handleAplicarCupon(idx)}
                      style={{ 
                        flex: 1, 
                        minWidth: 0, 
                        background: 'var(--bg-input, #ffffff)', 
                        border: `1px solid ${slot.error ? 'var(--danger, #ef4444)' : 'var(--border-color, #E2E8F0)'}`, 
                        borderRadius: 'var(--radius-sm, 6px)', 
                        color: 'var(--text-primary, #1A202C)', 
                        padding: '7px 10px', 
                        fontSize: 'var(--font-size-base, 13px)', 
                        outline: 'none' 
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--primary, #f97316)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = slot.error ? 'var(--border-color, #ef4444)' : 'var(--border-color, #E2E8F0)';
                      }}
                    />
                    <ButtonGroup>
                      <IconTextButton
                        variant="success"
                        size="md"
                        onClick={() => handleAplicarCupon(idx)}
                      >
                        Aplicar
                      </IconTextButton>
                      {couponSlots.length > 1 && (
                        <IconTextButton
                          variant=""
                          size="md"
                          icon={<FiX size={13} />}
                          onClick={() => setCouponSlots(prev => prev.filter((_, i) => i !== idx))}
                        />
                      )}
                    </ButtonGroup>
                  </div>
                  {slot.error && (
                    <div style={{ 
                      color: 'var(--danger, #ef4444)', 
                      fontSize: 'var(--font-size-xs, 11px)', 
                      marginTop: '3px' 
                    }}>
                      {slot.error}
                    </div>
                  )}
                </div>
              ))}
              <ButtonGroup>
                <IconTextButton
                  variant="blue"
                  size="md"
                  icon={<FiPlus size={11} />}
                  onClick={() => setCouponSlots(prev => [...prev, { code: '', error: '' }])}
                >
                  Agregar cupón
                </IconTextButton>
              </ButtonGroup>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountSection;