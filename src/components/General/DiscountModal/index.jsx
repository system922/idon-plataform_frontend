import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiPlus, FiAlertCircle } from 'react-icons/fi';
import Modal from '../Modal';
import { ButtonGroup, IconTextButton } from '../Button';
import CollapsibleHelp from '../CollapsibleHelp';
import { EMPTY_FORM, parseDays } from '../DiscountHelpers';
import { fetchWithAuth } from '../../../config/api';
import { useSession } from '../../../context/SessionContext';
import BasicTab from './BasicTab';
import ScheduleTab from './ScheduleTab';
import ConditionsTab from './ConditionsTab';

const DiscountModal = ({ onClose, onSaved, discount = null }) => {
  const { user } = useSession();
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
  
  const [categoryMode, setCategoryMode] = useState(() => {
    if (discount && discount.type === 'buy_x_get_y' && discount.applies_to === 'category') return 'second';
    if (discount && discount.type === 'fixed' && discount.applies_to === 'category' && discount.description?.startsWith('__FPPU__')) return 'fixed_price';
    return 'all';
  });
  
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
          fetchWithAuth('/categories'),
          fetchWithAuth('/products'),
          fetchWithAuth('/productos/fiscal-rates'),
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
      } catch (e) {
        console.error('Error loading data:', e);
      }
    };
    loadData();
  }, []);

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
        is_active: form.is_active,
        created_by: user?.id
      };

      const url = discount ? `/discounts/${discount.id}` : '/discounts';
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

  const modeButtonStyle = (isActive) => ({
    flex: 1,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm, 8px)',
    fontSize: 'var(--font-size-sm, 12px)',
    fontWeight: 'var(--font-weight-bold, 700)',
    border: isActive ? '2px solid var(--primary, #f97316)' : '1px solid var(--border-color, #E2E8F0)',
    background: isActive ? 'var(--primary-bg, rgba(249, 115, 22, 0.08))' : 'var(--bg-secondary, #ffffff)',
    color: isActive ? 'var(--primary, #f97316)' : 'var(--text-secondary, #4A5568)',
    cursor: 'pointer',
    transition: 'var(--transition-fast, all 0.15s ease)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    height: '40px',
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={discount ? 'Editar Descuento' : 'Nuevo Descuento'}
      size="lg"
      footer={
        <>
          {err && (
            <div className="alert-error" style={{ marginBottom: '12px' }}>
              <FiAlertCircle size={16} /> {err}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant=""
              size="md"
              icon={<FiX size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={discount ? <FiEdit2 size={14} /> : <FiPlus size={14} />}
              onClick={handleSubmit}
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Guardando...' : discount ? 'Actualizar' : 'Guardar'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      {/* Tabs normales */}
      <div className="modal-tabs">
        <button 
          className={`tab-btn ${activeTab === 'basic' ? 'active' : ''}`}
          onClick={() => setActiveTab('basic')}
          type="button"
        >
          Información
        </button>
        <button 
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
          type="button"
        >
          Programación
        </button>
        <button 
          className={`tab-btn ${activeTab === 'conditions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conditions')}
          type="button"
        >
          Condiciones
        </button>
      </div>

      <form className="modal-body" onSubmit={handleSubmit}>
        {err && <div className="alert-error"><FiAlertCircle /> {err}</div>}
        
        <CollapsibleHelp
          tab={activeTab}
          formType={form.type}
          formAppliesTo={form.applies_to}
          categoryMode={categoryMode}
          comboMode={comboMode}
        />

        {activeTab === 'basic' && (
          <BasicTab
            form={form}
            setField={setField}
            comboMode={comboMode}
            setComboMode={setComboMode}
            comboItems={comboItems}
            setComboItems={setComboItems}
            comboNewItem={comboNewItem}
            setComboNewItem={setComboNewItem}
            categoryMode={categoryMode}
            setCategoryMode={setCategoryMode}
            couponMode={couponMode}
            setCouponMode={setCouponMode}
            multiProductIds={multiProductIds}
            setMultiProductIds={setMultiProductIds}
            toggleMultiProduct={toggleMultiProduct}
            productSearch={productSearch}
            setProductSearch={setProductSearch}
            categories={categories}
            products={products}
            ivaRate={ivaRate}
            pvpCalc={pvpCalc}
            setPvpCalc={setPvpCalc}
            modeButtonStyle={modeButtonStyle}
          />
        )}

        {activeTab === 'schedule' && (
          <ScheduleTab
            form={form}
            setField={setField}
            toggleDay={toggleDay}
          />
        )}

        {activeTab === 'conditions' && (
          <ConditionsTab
            form={form}
            setField={setField}
          />
        )}
      </form>
    </Modal>
  );
};

export default DiscountModal;