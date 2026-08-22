import React, { useState, useEffect } from 'react';
import {
  FiX, FiCheck, FiCreditCard, FiBox, FiSettings, FiShoppingCart,
  FiBarChart2, FiDollarSign, FiBriefcase, FiTruck, FiGrid,
  FiCalendar, FiStar, FiShoppingBag, FiUsers, FiUserCheck,
  FiMap, FiMapPin, FiList, FiGlobe, FiBell, FiFileText,
  FiThermometer, FiPercent, FiTag, FiLoader, FiPackage,
  FiAlertCircle, FiClock
} from 'react-icons/fi';
import { useAlert } from '../../context/ConfirmContext';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import { adminApi } from '../../config/api';

const MOD_ICONS = {
  core:          <FiSettings   size={13}/>,
  pos:           <FiShoppingCart size={13}/>,
  inventory:     <FiBox        size={13}/>,
  reports:       <FiBarChart2  size={13}/>,
  payments:      <FiCreditCard size={13}/>,
  accounting:    <FiDollarSign size={13}/>,
  orders:        <FiBriefcase  size={13}/>,
  kitchen:       <FiThermometer size={13}/>,
  delivery:      <FiTruck      size={13}/>,
  tables:        <FiGrid       size={13}/>,
  reservations:  <FiCalendar   size={13}/>,
  loyalty:       <FiStar       size={13}/>,
  suppliers:     <FiTruck      size={13}/>,
  purchases:     <FiShoppingBag size={13}/>,
  appointments:  <FiCalendar   size={13}/>,
  employees:     <FiUsers      size={13}/>,
  crm:           <FiUserCheck  size={13}/>,
  routes:        <FiMap        size={13}/>,
  tracking:      <FiMapPin     size={13}/>,
  queue:         <FiList       size={13}/>,
  ecommerce:     <FiGlobe      size={13}/>,
  notifications: <FiBell       size={13}/>,
  einvoicing:    <FiFileText   size={13}/>,
};

const MOD_ICON_LG = {
  core:          <FiSettings   size={16}/>,
  pos:           <FiShoppingCart size={16}/>,
  inventory:     <FiBox        size={16}/>,
  reports:       <FiBarChart2  size={16}/>,
  payments:      <FiCreditCard size={16}/>,
  accounting:    <FiDollarSign size={16}/>,
  orders:        <FiBriefcase  size={16}/>,
  kitchen:       <FiThermometer size={16}/>,
  delivery:      <FiTruck      size={16}/>,
  tables:        <FiGrid       size={16}/>,
  reservations:  <FiCalendar   size={16}/>,
  loyalty:       <FiStar       size={16}/>,
  suppliers:     <FiTruck      size={16}/>,
  purchases:     <FiShoppingBag size={16}/>,
  appointments:  <FiCalendar   size={16}/>,
  employees:     <FiUsers      size={16}/>,
  crm:           <FiUserCheck  size={16}/>,
  routes:        <FiMap        size={16}/>,
  tracking:      <FiMapPin     size={16}/>,
  queue:         <FiList       size={16}/>,
  ecommerce:     <FiGlobe      size={16}/>,
  notifications: <FiBell       size={16}/>,
  einvoicing:    <FiFileText   size={16}/>,
};

const Lbl = ({ children }) => (
  <label className="subscription-label">
    {children}
  </label>
);

const Row = ({ label, value, highlight, muted, large }) => (
  <div className={`subscription-row ${large ? 'large' : ''}`}>
    <span className={`subscription-row-label ${muted ? 'muted' : ''}`}>
      {label}
    </span>
    <span className={`subscription-row-value ${highlight ? 'highlight' : ''}`}>
      {value}
    </span>
  </div>
);

export default function SubscriptionModal({ business, existingSubscription, onClose, onSaved }) {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [discountInput, setDiscountInput] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  const [status, setStatus] = useState('active');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [existingSub, setExistingSub] = useState(existingSubscription || null);
  const [subscriptionItems, setSubscriptionItems] = useState([]);

  const modules = business.modules || [];

  const statusOptions = [
    { value: 'active', label: 'Activa' },
    { value: 'suspended', label: 'Suspendida' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'expired', label: 'Expirada' },
  ];

  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        const subRes = await adminApi.get(`/admin/businesses/${business.id}/subscription`);
        
        if (subRes.data && subRes.data.id) {
          setExistingSub(subRes.data);
          setPeriod(subRes.data.billing_period || 'monthly');
          setBillingDay(String(subRes.data.billing_day || 1));
          setStatus(subRes.data.status || 'active');
          
          const discountValue = subRes.data.discount_percentage !== undefined 
            ? Number(subRes.data.discount_percentage) 
            : 0;
          setDiscountInput(String(discountValue));
          
          try {
            const itemsRes = await adminApi.get(`/admin/subscriptions/${subRes.data.id}/items`);
            if (itemsRes.data) {
              setSubscriptionItems(itemsRes.data);
            }
          } catch (e) {}
        } else if (existingSubscription && existingSubscription.id) {
          setExistingSub(existingSubscription);
          setPeriod(existingSubscription.billing_period || 'monthly');
          setBillingDay(String(existingSubscription.billing_day || 1));
          setStatus(existingSubscription.status || 'active');
          
          const discountValue = existingSubscription.discount_percentage !== undefined 
            ? Number(existingSubscription.discount_percentage) 
            : 0;
          setDiscountInput(String(discountValue));
          
          if (existingSubscription.id) {
            try {
              const itemsRes = await adminApi.get(`/admin/subscriptions/${existingSubscription.id}/items`);
              if (itemsRes.data) {
                setSubscriptionItems(itemsRes.data);
              }
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error('Error cargando suscripción:', e);
        if (existingSubscription && existingSubscription.id) {
          setExistingSub(existingSubscription);
          setPeriod(existingSubscription.billing_period || 'monthly');
          setBillingDay(String(existingSubscription.billing_day || 1));
          setStatus(existingSubscription.status || 'active');
          
          const discountValue = existingSubscription.discount_percentage !== undefined 
            ? Number(existingSubscription.discount_percentage) 
            : 0;
          setDiscountInput(String(discountValue));
        }
      } finally {
        setLoading(false);
      }
    };

    loadSubscriptionData();
  }, [business.id, existingSubscription]);

  const savedMonthlyTotal = Number(existingSub?.amount_monthly) || 0;
  const savedAnnualTotal = Number(existingSub?.amount_annual) || 0;
  const savedDiscount = Number(existingSub?.discount_percentage) || 0;
  
  const discPct = discountInput !== '' ? parseFloat(discountInput) : savedDiscount;
  
  const subtotalMens = modules.reduce((s, m) => s + parseFloat(m.price_monthly || 0), 0);
  const subtotalAnu  = modules.reduce((s, m) => s + parseFloat(m.price_annual  || 0), 0);
  
  const discountAmount = parseFloat((subtotalMens * discPct / 100).toFixed(2));
  const totalWithDiscount = parseFloat((subtotalMens - discountAmount).toFixed(2));

  const isEdit = !!existingSub && !!existingSub.id;

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSave = async () => {
    if (modules.length === 0 && !isEdit) {
      alert.warning('El negocio no tiene módulos activos. Configura módulos primero.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        billing_period: period,
        billing_day: parseInt(billingDay) || 1,
        discount_percentage: discPct,
      };

      if (isEdit) {
        payload.status = status;
        await adminApi.put(`/admin/businesses/${business.id}/subscription/${existingSub.id}`, payload);
        alert.success('Suscripción actualizada correctamente', 'Actualización Exitosa');
      } else {
        await adminApi.post(`/admin/businesses/${business.id}/subscribe`, payload);
        alert.success('Suscripción creada correctamente', '✅ Suscripción Creada');
      }
      setMsg({ ok: true, text: isEdit ? '✅ Suscripción actualizada correctamente' : '✅ Suscripción creada correctamente' });
      onSaved();
      setTimeout(onClose, 1600);
    } catch (e) {
      setMsg({ ok: false, text: '❌ ' + e.message });
      alert.error(e.message || 'Error al guardar la suscripción');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      {msg && (
        <div className={`subscription-msg ${msg.ok ? 'success' : 'error'}`}>
          {msg.text}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiCreditCard size={15} />}
          onClick={handleSave}
          disabled={saving || (modules.length === 0 && !isEdit)}
          loading={saving}
        >
          {saving ? (isEdit ? 'Actualizando...' : 'Creando...') : (isEdit ? 'Actualizar Suscripción' : 'Crear Suscripción')}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  if (loading) {
    return (
      <Modal
        closeOnOverlayClick={false}
        isOpen={true}
        onClose={onClose}
        title="Cargando Suscripción"
        size="md"
        className="subscription-modal"
      >
        <div className="subscription-loading">
          <FiLoader size={32} className="spinning" />
          <span>Cargando datos de suscripción...</span>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={isEdit ? 'Editar Suscripción' : 'Nueva Suscripción'}
      size="md"
      className="subscription-modal"
      footer={footer}
    >
      <div className="subscription-body">
        <div className="subscription-section">
          <Lbl>Negocio</Lbl>
          <div className="subscription-business-grid">
            <div>
              <p className="subscription-business-label">Nombre</p>
              <p className="subscription-business-value">{business.business_name}</p>
            </div>
            <div>
              <p className="subscription-business-label">Tipo</p>
              <p className="subscription-business-value">{business.business_type_name}</p>
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="subscription-section subscription-info-section">
            <Lbl>Información de la Suscripción</Lbl>
            <div className="subscription-info-grid">
              <div className="subscription-info-item">
                <span className="subscription-info-label"><FiCalendar size={12} /> Fecha de activación</span>
                <span className="subscription-info-value">{formatDate(existingSub?.activated_at)}</span>
              </div>
              <div className="subscription-info-item">
                <span className="subscription-info-label"><FiClock size={12} /> Próximo cobro</span>
                <span className="subscription-info-value">{formatDate(existingSub?.next_billing_at)}</span>
              </div>
              <div className="subscription-info-item">
                <span className="subscription-info-label"><FiCreditCard size={12} /> Última actualización</span>
                <span className="subscription-info-value">{formatDate(existingSub?.updated_at) || '—'}</span>
              </div>
              <div className="subscription-info-item">
                <span className="subscription-info-label"><FiPackage size={12} /> Estado</span>
                <span className="subscription-info-value" style={{ 
                  color: status === 'active' ? 'var(--text-primary)' : 
                         status === 'suspended' ? 'var(--text-primary)' : 
                         status === 'cancelled' ? 'var(--text-primary)' : 'var(--text-primary)',
                  fontWeight: 600
                }}>
                  {status === 'active' ? 'Activa' : 
                   status === 'suspended' ? 'Suspendida' : 
                   status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="subscription-section">
          <Lbl>Módulos activos ({modules.length})</Lbl>
          {modules.length === 0 ? (
            <p className="subscription-no-modules">
              Sin módulos activos. Configura módulos desde la sección de módulos del negocio.
            </p>
          ) : (
            <div className="subscription-modules-list">
              {modules.map(m => {
                const savedItem = subscriptionItems.find(item => item.module_id === m.id);
                
                let displayPrice = 0;
                let displayPriceAnnual = 0;
                
                if (savedItem && savedItem.unit_price !== null && savedItem.unit_price !== undefined) {
                  displayPrice = Number(savedItem.unit_price) || 0;
                  displayPriceAnnual = Number(savedItem.unit_price) * 12 || 0;
                } else {
                  displayPrice = Number(m.price_monthly) || 0;
                  displayPriceAnnual = Number(m.price_annual) || 0;
                }
                
                return (
                  <div key={m.id} className="subscription-module-item">
                    <div className="subscription-module-info">
                      <span className="subscription-module-icon">{MOD_ICON_LG[m.code] || <FiBox size={16}/>}</span>
                      <span className="subscription-module-name">{m.name}</span>
                    </div>
                    <div className="subscription-module-prices">
                      <span className="subscription-module-price">
                        ${displayPrice.toFixed(2)}
                        <span className="subscription-module-period">/mes</span>
                      </span>
                      <span className="subscription-module-price-annual">
                        ${displayPriceAnnual.toFixed(2)}
                        <span className="subscription-module-period">/año</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="subscription-section">
          <Lbl>Período de facturación</Lbl>
          <div className="subscription-period-grid">
            <div 
              className={`subscription-period-card ${period === 'monthly' ? 'selected' : ''}`}
              onClick={() => setPeriod('monthly')}
            >
              <div className="subscription-period-label">Mensual</div>
              <div className="subscription-period-price">
                ${subtotalMens.toFixed(2)} <span className="subscription-period-unit">/mes</span>
              </div>
            </div>
            <div 
              className={`subscription-period-card ${period === 'annual' ? 'selected' : ''}`}
              onClick={() => setPeriod('annual')}
            >
              <div className="subscription-period-label">Anual</div>
              <div className="subscription-period-price">
                ${subtotalAnu.toFixed(2)} <span className="subscription-period-unit">/año</span>
              </div>
            </div>
          </div>
          <div className="subscription-billing-day">
            <Lbl>Día de facturación del mes (1-28)</Lbl>
            <input 
              type="number" 
              min="1" 
              max="28" 
              value={billingDay} 
              onChange={e => setBillingDay(e.target.value)} 
              className="subscription-input"
            />
          </div>
        </div>

        <div className="subscription-section">
          <Lbl>Descuento</Lbl>
          <div className="subscription-discount-grid">
            <div>
              <p className="subscription-discount-label">Porcentaje (%)</p>
              <div className="subscription-discount-input-wrapper">
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.5" 
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)} 
                  placeholder="0"
                  className="subscription-input"
                />
                <span className="subscription-discount-icon"><FiPercent size={14}/></span>
              </div>
            </div>
            <div className={`subscription-discount-savings ${discountAmount > 0 ? 'active' : ''}`}>
              <p className="subscription-discount-savings-label">
                <FiTag size={10} /> Ahorro con descuento
              </p>
              <p className="subscription-discount-savings-value">
                {discountAmount > 0 ? `- $${discountAmount.toFixed(2)}` : '—'}
              </p>
            </div>
          </div>
        </div>

        {isEdit && (
          <div className="subscription-section">
            <Lbl>Estado de la suscripción</Lbl>
            <CustomCombobox
              options={statusOptions}
              value={status}
              onChange={setStatus}
              placeholder="Seleccionar estado"
              filterable={false}
              size="md"
              className="subscription-status-combobox"
            />
          </div>
        )}

        <div className="subscription-summary">
          <Row 
            label="Subtotal (sin descuento)" 
            value={`$${subtotalMens.toFixed(2)}`} 
            muted
          />
          
          {discountAmount > 0 && (
            <div className="subscription-summary-discount">
              <Row 
                label={`Descuento (${discPct}%)`} 
                value={`- $${discountAmount.toFixed(2)}`} 
                highlight="#8CB79B"
              />
            </div>
          )}
          
          <div className="subscription-summary-total">
            <Row 
              label="Total mensual (con descuento)"
              value={`$${totalWithDiscount.toFixed(2)}`} 
              highlight="#ff8c42" 
              large
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}