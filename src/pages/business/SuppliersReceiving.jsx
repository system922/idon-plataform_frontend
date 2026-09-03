// pages/Inventory/PurchaseReceipts.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import {
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiX,
  FiTruck,
  FiPackage,
  FiAlertCircle,
  FiEye,
  FiCheck,
  FiArrowLeft,
  FiDollarSign,
  FiPrinter
} from 'react-icons/fi';

import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';

import { fetchWithAuth } from '../../config/api';
import { useAlert } from '../../components/ConfirmContext';
import { useConfirm } from '../../context/ConfirmContext';
import { usePrinterService } from '../../services/usePrinterService';
import TableSkeleton from '../../components/General/TableSkeleton';


// ============================================================
// HELPERS
// ============================================================

const money = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD'
  }).format(number);
};

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

// ─── Componente de selector de fechas personalizadas ─────────
function DateRangePicker({ startDate, endDate, onApply, onClose }) {
  const [localStart, setLocalStart] = useState(startDate || '');
  const [localEnd, setLocalEnd] = useState(endDate || '');

  const handleApply = () => {
    if (localStart && localEnd) {
      onApply(localStart, localEnd);
    }
  };

  return (
    <div className="report-date-range-picker">
      <div className="report-date-range-inputs">
        <input
          type="date"
          value={localStart}
          onChange={(e) => setLocalStart(e.target.value)}
          placeholder="Fecha inicial"
        />
        <span>a</span>
        <input
          type="date"
          value={localEnd}
          onChange={(e) => setLocalEnd(e.target.value)}
          placeholder="Fecha final"
        />
      </div>
      <div className="report-date-range-actions">
        <button onClick={onClose} className="report-btn-cancel">Cancelar</button>
        <button onClick={handleApply} className="report-btn-apply" disabled={!localStart || !localEnd}>
          Aplicar
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MODAL DE PAGO DE RECEPCIÓN (PARA PAGAR DESDE EL LISTADO)
// ============================================================

function PaymentModal({ receipt, onClose, onConfirm, saving }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [reference, setReference] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (receipt) {
      setPaymentAmount(String(receipt.total || 0));
    }
  }, [receipt]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }
    if ((paymentMethod === 'card' || paymentMethod === 'transfer') && !reference) {
      setError('Ingrese el número de referencia');
      return;
    }
    onConfirm({
      paymentMethod,
      amount: parseFloat(paymentAmount),
      reference: reference || null
    });
  };

  const paymentOptions = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'card', label: 'Tarjeta' },
    { value: 'transfer', label: 'Transferencia' },
  ];

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Pagar Recepción de Mercadería"
      size="sm"
      footer={
        <>
          {error && (
            <div className="modal-error-text">
              <FiAlertCircle size={16} /> {error}
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
              icon={<FiCheck size={14} />}
              onClick={handleSubmit}
              disabled={saving || !paymentAmount}
              loading={saving}
            >
              {saving ? 'Procesando...' : 'Pagar'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            Total a pagar
          </label>
          <Input
            min="0"
            value={paymentAmount}
            onChange={setPaymentAmount}
            disabled
            size="md"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
            Método de pago *
          </label>
          <CustomCombobox
            options={paymentOptions}
            value={paymentMethod}
            onChange={setPaymentMethod}
            placeholder="Seleccionar método..."
            filterable={false}
            forceDropup={false}
            size="md"
          />
        </div>

        {(paymentMethod === 'card' || paymentMethod === 'transfer') && (
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Número de referencia *
            </label>
            <Input
              type="text"
              value={reference}
              onChange={setReference}
              placeholder={paymentMethod === 'card' ? 'Número de autorización' : 'Número de transferencia'}
              size="md"
            />
          </div>
        )}

        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: 'var(--info-bg, rgba(59, 130, 246, 0.08))',
          color: 'var(--info, #3b82f6)',
          fontSize: '12px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
        }}>
          {paymentMethod === 'cash' && 'Se abrirá el cajón para registrar el pago en efectivo.'}
          {paymentMethod === 'card' && 'Se registrará el pago con tarjeta.'}
          {paymentMethod === 'transfer' && 'Se registrará la transferencia bancaria.'}
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// MODAL DE OPCIONES DE PAGO - CON TABS POR PROVEEDOR
// ============================================================

function PaymentOptionsModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  supplierGroups,
  receiptNumber,
  saving 
}) {
  const [activeSupplierIndex, setActiveSupplierIndex] = useState(0);
  const [supplierData, setSupplierData] = useState({});
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Obtener el proveedor activo
  const activeSupplier = supplierGroups && supplierGroups.length > 0 
    ? supplierGroups[activeSupplierIndex] 
    : null;
  
  const total = activeSupplier?.total || 0;
  const supplierName = activeSupplier?.supplier_name || '';
  const supplierId = activeSupplier?.supplier_id || '';

  // Obtener los datos del proveedor activo
  const getSupplierFields = (id) => {
    if (!id) return { invoiceNumber: '', abonoAmount: '', dueDate: '' };
    return supplierData[id] || { 
      invoiceNumber: '', 
      abonoAmount: '', 
      dueDate: new Date().toISOString().split('T')[0] 
    };
  };

  // Actualizar datos de un proveedor específico
  const updateSupplierField = (id, field, value) => {
    setSupplierData(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { 
          invoiceNumber: '', 
          abonoAmount: '', 
          dueDate: new Date().toISOString().split('T')[0] 
        }),
        [field]: value
      }
    }));
  };

  // Inicializar datos para todos los proveedores al abrir
  React.useEffect(() => {
    if (isOpen && supplierGroups?.length > 0) {
      const initialData = {};
      const today = new Date().toISOString().split('T')[0];
      
      supplierGroups.forEach(group => {
        initialData[group.supplier_id] = {
          invoiceNumber: '',
          abonoAmount: '',
          dueDate: today
        };
      });
      
      setSupplierData(initialData);
      setActiveSupplierIndex(0);
      setError('');
      setIsProcessing(false);
    }
  }, [isOpen, supplierGroups]);

  // Manejar confirmación del proveedor actual
  const handleConfirm = () => {
    if (!activeSupplier) return;
    if (isProcessing) return;
    
    const supplierId = activeSupplier.supplier_id;
    const fields = getSupplierFields(supplierId);
    
    const totalValue = Number(total) || 0;
    const abonoValue = parseFloat(fields.abonoAmount) || 0;

    // Validar N° Factura (obligatorio)
    if (!fields.invoiceNumber.trim()) {
      setError('Ingresa el número de factura');
      return;
    }

    // Validar que el abono no sea mayor al total
    if (abonoValue > totalValue) {
      setError(`El abono no puede ser mayor al total (${money(totalValue)})`);
      return;
    }

    // Si es pago total (abono = total o abono vacío)
    const isFullPayment = abonoValue === 0 || abonoValue === totalValue;

    // Pago parcial - se requiere fecha de vencimiento
    if (!isFullPayment && !fields.dueDate) {
      setError('Selecciona la fecha de vencimiento');
      return;
    }

    // Marcar como procesando para evitar doble click
    setIsProcessing(true);

    const confirmData = {
      supplierGroups: supplierGroups,
      activeSupplierIndex: activeSupplierIndex,
      paymentOption: isFullPayment ? 'pay_now' : 'pay_later',
      paymentMethod: 'cash',
      paymentReference: null,
      amount: totalValue,
      invoiceNumber: fields.invoiceNumber.trim(),
      dueDate: isFullPayment ? null : (fields.dueDate || null),
      isPartial: !isFullPayment && abonoValue > 0 && abonoValue < totalValue,
      abonoAmount: isFullPayment ? totalValue : abonoValue,
      totalAmount: totalValue,
      supplier_id: supplierId,
      supplier_name: supplierName,
      isFullPayment: isFullPayment,
      allSupplierData: supplierData,
      // Indicar si es el último proveedor
      isLastSupplier: activeSupplierIndex === supplierGroups.length - 1
    };

    // Pasar una función callback para manejar el resultado
    onConfirm(confirmData, (success) => {
      setIsProcessing(false);
      
      if (success) {
        // Si hay más proveedores, avanzar al siguiente
        if (activeSupplierIndex < supplierGroups.length - 1) {
          setActiveSupplierIndex(activeSupplierIndex + 1);
          setError('');
        }
        // Si es el último, el modal se cierra desde el callback
        // (el callback de onConfirm maneja el cierre)
      }
    });
  };

  // Obtener datos del proveedor activo para renderizar
  const activeFields = getSupplierFields(supplierId);
  const totalValue = Number(total) || 0;
  const abonoValue = parseFloat(activeFields.abonoAmount) || 0;
  const remainingBalance = totalValue - abonoValue;
  const isFullPayment = abonoValue === 0 || abonoValue === totalValue;
  const showDueDate = !isFullPayment && abonoValue > 0;

  // Si no hay proveedores, no renderizar
  if (!supplierGroups || supplierGroups.length === 0) {
    return null;
  }

  const isLast = activeSupplierIndex === supplierGroups.length - 1;
  const totalSuppliers = supplierGroups.length;

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      title="Finalizar recepción"
      size="md"
      footer={
        <>
          {error && (
            <div className="modal-error-text">
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: '100%'
          }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {totalSuppliers > 1 && (
                <span>
                  Proveedor {activeSupplierIndex + 1} de {totalSuppliers}
                  {isProcessing && ' Procesando...'}
                </span>
              )}
            </div>
            <ButtonGroup>
              <IconTextButton
                variant=""
                size="md"
                onClick={onClose}
                disabled={saving || isProcessing}
              >
                Cancelar
              </IconTextButton>
              <IconTextButton
                variant="success"
                size="md"
                icon={<FiCheck size={14} />}
                onClick={handleConfirm}
                disabled={saving || isProcessing || !activeFields.invoiceNumber.trim()}
                loading={saving || isProcessing}
              >
                {saving || isProcessing 
                  ? 'Procesando...' 
                  : isLast
                    ? `Finalizar (${activeSupplierIndex + 1}/${totalSuppliers})`
                    : `Confirmar y continuar (${activeSupplierIndex + 1}/${totalSuppliers})`
                }
              </IconTextButton>
            </ButtonGroup>
          </div>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Tabs de proveedores */}
        {supplierGroups.length > 1 && (
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            borderBottom: '1px solid var(--border, #e9ecef)',
            paddingBottom: '12px',
            flexWrap: 'wrap'
          }}>
            {supplierGroups.map((group, index) => {
              const groupFields = getSupplierFields(group.supplier_id);
              const hasInvoice = groupFields.invoiceNumber?.trim()?.length > 0;
              const hasAbono = parseFloat(groupFields.abonoAmount) > 0;
              const isActive = activeSupplierIndex === index;
              const isCompleted = hasInvoice; // Ya tiene factura, está completado
              
              return (
                <button
                  key={group.supplier_id}
                  onClick={() => {
                    if (!isProcessing) {
                      setActiveSupplierIndex(index);
                      setError('');
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: isActive 
                      ? '2px solid var(--primary, #2563eb)' 
                      : isCompleted
                        ? '2px solid var(--success, #28a745)'
                        : '1px solid var(--border, #e9ecef)',
                    background: isActive 
                      ? 'var(--primary-bg, rgba(37, 99, 235, 0.08))' 
                      : isCompleted
                        ? 'var(--success-bg, rgba(40, 167, 69, 0.08))'
                        : 'var(--bg-white, #fff)',
                    cursor: isProcessing ? 'default' : 'pointer',
                    fontSize: '13px',
                    fontWeight: isActive ? '600' : '400',
                    color: isActive 
                      ? 'var(--primary, #2563eb)' 
                      : isCompleted
                        ? 'var(--success, #28a745)'
                        : 'var(--text-secondary, #6c757d)',
                    transition: 'all 0.2s',
                    position: 'relative',
                    opacity: isProcessing && !isActive ? 0.5 : 1
                  }}
                  disabled={isProcessing && !isActive}
                >
                  {isCompleted && <span style={{ marginRight: '4px' }}>✅</span>}
                  {group.supplier_name}
                  <span style={{ 
                    marginLeft: '6px', 
                    fontSize: '11px',
                    color: isActive ? 'var(--primary, #2563eb)' : 'var(--text-secondary, #6c757d)'
                  }}>
                    ({money(group.total)})
                  </span>
                  
                  {/* Indicador visual de que el proveedor tiene datos configurados */}
                  {(hasInvoice || hasAbono) && !isActive && (
                    <span style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: hasInvoice ? 'var(--success, #28a745)' : 'var(--warning, #ffc107)',
                      border: '2px solid var(--bg-white, #fff)'
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Información de la recepción */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--bg-secondary, #f8f9fa)',
          border: '1px solid var(--border, #e9ecef)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600 }}>Recepción:</span>
            <span>{receiptNumber || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontWeight: 600 }}>Proveedor:</span>
            <span style={{ fontWeight: 'bold' }}>{supplierName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600 }}>Total a pagar:</span>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--success, #28a745)' }}>
              {money(totalValue)}
            </span>
          </div>
        </div>

        {/* Campos de ingreso - USANDO DATOS DEL PROVEEDOR ACTIVO */}
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'var(--bg-secondary, #f8f9fa)',
          border: '1px solid var(--border, #e9ecef)'
        }}>
          {/* N° Factura (obligatorio) */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              N° Factura *
            </label>
            <Input
              type="text"
              value={activeFields.invoiceNumber}
              onChange={(value) => updateSupplierField(supplierId, 'invoiceNumber', value)}
              placeholder="Número de factura"
              size="md"
              required
              disabled={isProcessing}
            />
          </div>

          {/* Monto Total (no editable) */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Monto Total
            </label>
            <Input
              type="text"
              value={money(totalValue)}
              disabled
              size="md"
            />
          </div>

          {/* Abono (opcional) */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
              Abono (opcional)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={totalValue}
              value={activeFields.abonoAmount}
              onChange={(value) => {
                updateSupplierField(supplierId, 'abonoAmount', value);
                setError('');
              }}
              placeholder="Monto a abonar (vacío = pago total)"
              size="md"
              disabled={isProcessing}
            />
            {abonoValue > 0 && abonoValue < totalValue && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Saldo pendiente: <strong>{money(remainingBalance)}</strong>
              </div>
            )}
          </div>

          {/* Fecha de vencimiento - solo se muestra si es pago parcial */}
          {showDueDate && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Fecha de vencimiento *
              </label>
              <Input
                type="date"
                value={activeFields.dueDate}
                onChange={(value) => updateSupplierField(supplierId, 'dueDate', value)}
                size="md"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Mensaje de confirmación */}
          <div style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: isFullPayment || abonoValue === 0 
              ? 'var(--success-bg, rgba(40, 167, 69, 0.08))' 
              : 'var(--warning-bg, rgba(255, 193, 7, 0.08))',
            border: isFullPayment || abonoValue === 0
              ? '1px solid rgba(40, 167, 69, 0.2)'
              : '1px solid rgba(255, 193, 7, 0.2)',
            fontSize: '13px',
            color: isFullPayment || abonoValue === 0
              ? 'var(--success, #28a745)'
              : 'var(--warning, #ffc107)'
          }}>
            {isFullPayment || abonoValue === 0 ? (
              'Se registrará el pago total. La recepción quedará como pagada.'
            ) : abonoValue > 0 && abonoValue < totalValue ? (
              `Se creará cuenta por pagar con saldo pendiente de ${money(remainingBalance)}`
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// OPCIONES DE FILTRO
// ============================================================

const dateFilterOptions = [
  { value: 'all', label: 'Todas las fechas' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
];

const statusFilterOptions = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'completed', label: 'Completada' },
  { value: 'draft', label: 'Borrador' },
  { value: 'paid', label: 'Pagada' },
];

// ============================================================
// MODAL - NUEVA RECEPCIÓN CON FLUJO DE DOS PASOS
// ============================================================

function ReceiptModal({
  onClose,
  pendingOrders,
  suppliers: allSuppliers,
  onSave,
  saving
}) {
  const alert = useAlert();
  const confirm = useConfirm();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [receiptItems, setReceiptItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [orderType, setOrderType] = useState(null);
  const [productSuppliers, setProductSuppliers] = useState({});
  const [showGroupedView, setShowGroupedView] = useState(false);
  const [groupedBySupplier, setGroupedBySupplier] = useState({});
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [allSupplierGroups, setAllSupplierGroups] = useState([]);

  const orderOptions = useMemo(() => {
    return pendingOrders.map(order => ({
      value: order.id,
      label: `${order.order_number} - ${order.supplier_name || 'Sin proveedor'} (${order.pending_items} pendientes)`
    }));
  }, [pendingOrders]);

  const loadOrderItems = async (orderId) => {
    if (!orderId) {
      setOrderItems([]);
      setReceiptItems([]);
      setProductSuppliers({});
      setOrderType(null);
      setShowGroupedView(false);
      setGroupedBySupplier({});
      return;
    }

    setLoadingItems(true);
    setError('');

    try {
      const response = await fetchWithAuth(`/purchase-orders/${orderId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar la orden');
      }

      setSelectedOrder(data.order);
      setOrderType(data.order.order_type);
      setOrderItems(data.items || []);
      setShowGroupedView(false);
      setGroupedBySupplier({});

      const suppliersMap = {};
      const items = data.items || [];

      for (const item of items) {
        let productIdForSupplier = item.product_id;
        
        if (data.order.order_type === 'MANUFACTURED' && item.raw_material_id) {
          productIdForSupplier = item.raw_material_id;
        }

        if (productIdForSupplier) {
          try {
            let endpoint;
            if (data.order.order_type === 'MANUFACTURED') {
              endpoint = `/purchase-receipts/suppliers/raw-material/${productIdForSupplier}`;
            } else {
              endpoint = `/purchase-receipts/suppliers/${productIdForSupplier}`;
            }
            const supResponse = await fetchWithAuth(endpoint);
            const supData = await supResponse.json();
            
            if (supResponse.ok && Array.isArray(supData)) {
              suppliersMap[item.id] = supData.map(s => ({
                ...s,
                has_history: s.has_history !== undefined ? s.has_history : false
              }));
            } else {
              suppliersMap[item.id] = allSuppliers
                .filter(s => s.is_active !== false)
                .map(s => ({
                  ...s,
                  has_history: false,
                  last_unit_cost: null,
                  total_orders: 0
                }));
            }
          } catch (err) {
            suppliersMap[item.id] = allSuppliers
              .filter(s => s.is_active !== false)
              .map(s => ({
                ...s,
                has_history: false,
                last_unit_cost: null,
                total_orders: 0
              }));
          }
        } else {
          suppliersMap[item.id] = allSuppliers
            .filter(s => s.is_active !== false)
            .map(s => ({
              ...s,
              has_history: false,
              last_unit_cost: null,
              total_orders: 0
            }));
        }
      }

      setProductSuppliers(suppliersMap);

      const initialItems = items
        .filter(item => item.quantity > (item.received_qty || 0))
        .map(item => {
          const pendingQty = Number(item.quantity) - Number(item.received_qty || 0);
          
          return {
            tempId: crypto.randomUUID(),
            purchase_order_item_id: item.id,
            product_id: data.order.order_type === 'MANUFACTURED' ? item.raw_material_id : item.product_id,
            product_name: item.product_name,
            product_code: item.product_code || item.raw_material_code,
            barcode: item.barcode,
            quantity: pendingQty,
            unit_cost: 0,
            line_total: 0,
            supplier_id: '',
            notes: ''
          };
        });

      setReceiptItems(initialItems);

    } catch (error) {
      setError(error.message);
      await alert.error(error.message);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleOrderSelect = (value) => {
    setSelectedOrder(null);
    setOrderItems([]);
    setReceiptItems([]);
    setProductSuppliers({});
    setOrderType(null);
    setShowGroupedView(false);
    setGroupedBySupplier({});
    setError('');

    if (value) {
      loadOrderItems(value);
    }
  };

  const updateReceiptItem = (tempId, field, value) => {
    setReceiptItems(current =>
      current.map(item => {
        if (item.tempId !== tempId) return item;

        const updated = { ...item, [field]: value };

        if (field === 'quantity' || field === 'unit_cost') {
          const qty = Number(updated.quantity || 0);
          const cost = Number(updated.unit_cost || 0);
          updated.line_total = qty * cost;
        }

        return updated;
      })
    );
  };

  const removeReceiptItem = (tempId) => {
    setReceiptItems(current =>
      current.filter(item => item.tempId !== tempId)
    );
  };

  const handleSupplierChange = (tempId, supplierId, purchaseOrderItemId) => {
    updateReceiptItem(tempId, 'supplier_id', supplierId);
    
    const suppliers = productSuppliers[purchaseOrderItemId] || [];
    const selected = suppliers.find(s => s.id === supplierId);
    
    if (selected && selected.last_unit_cost && selected.has_history === true) {
      updateReceiptItem(tempId, 'unit_cost', Number(selected.last_unit_cost));
    } else {
      updateReceiptItem(tempId, 'unit_cost', 0);
    }
  };

  const getSupplierOptions = (orderItemId) => {
    const suppliersList = productSuppliers[orderItemId] || [];
    
    let suppliers = suppliersList;
    if (suppliersList.length === 0) {
      suppliers = allSuppliers.filter(s => s.is_active !== false);
    }
    
    const options = [
      { value: '', label: 'Seleccionar proveedor...' }
    ];
    
    const sortedSuppliers = [...suppliers].sort((a, b) => {
      if (a.has_history && !b.has_history) return -1;
      if (!a.has_history && b.has_history) return 1;
      return 0;
    });
    
    sortedSuppliers.forEach(sup => {
      let label = sup.name;
      
      if (sup.has_history && sup.last_unit_cost) {
        label += ` (Último: ${money(sup.last_unit_cost)})`;
      } else if (sup.has_history === false) {
        label += `Nuevo`;
      }
      
      options.push({
        value: sup.id,
        label: label,
        meta: {
          has_history: sup.has_history,
          last_unit_cost: sup.last_unit_cost,
          total_orders: sup.total_orders
        }
      });
    });
    
    return options;
  };

  const getSupplierName = (supplierId) => {
    for (const key of Object.keys(productSuppliers)) {
      const found = productSuppliers[key].find(s => s.id === supplierId);
      if (found) return found.name;
    }
    const found = allSuppliers.find(s => s.id === supplierId);
    return found?.name || 'Proveedor';
  };

  const totals = useMemo(() => {
    const subtotal = receiptItems.reduce((sum, item) => {
      return sum + Number(item.line_total || 0);
    }, 0);

    const itemsWithSupplier = receiptItems.filter(item => item.supplier_id && item.supplier_id !== '').length;
    const totalItems = receiptItems.length;
    const itemsWithPrice = receiptItems.filter(item => item.unit_cost > 0).length;

    return {
      subtotal,
      total: subtotal,
      items: totalItems,
      itemsWithSupplier,
      itemsWithPrice
    };
  }, [receiptItems]);

  const validateBeforeGroup = () => {
    const itemsWithoutSupplier = receiptItems.filter(item => !item.supplier_id || item.supplier_id === '');
    if (itemsWithoutSupplier.length > 0) {
      const productNames = itemsWithoutSupplier.map(i => i.product_name).join(', ');
      alert.info(
        `Los siguientes productos no tienen proveedor asignado: ${productNames}.`,
        'Asignar Proveedor'
      );
      return false;
    }

    const invalidItems = receiptItems.filter(item => !item.quantity || item.quantity <= 0);
    if (invalidItems.length > 0) {
      alert.info(
        `Todos los items deben de tener cantidad mayor a 0.`,
        'Asignar Cantidad'
      );
      return false;
    }

    const itemsWithoutPrice = receiptItems.filter(item => !item.unit_cost || item.unit_cost <= 0);
    if (itemsWithoutPrice.length > 0) {
      const productNames = itemsWithoutPrice.map(i => i.product_name).join(', ');
      alert.error(`Los siguientes productos no tienen precio asignado o el precio es 0: ${productNames}`);
      return false;
    }

    return true;
  };

  const handleGroupBySupplier = () => {
    if (!validateBeforeGroup()) return;

    const groups = {};

    receiptItems.forEach(item => {
      const supplierId = item.supplier_id;
      
      if (!groups[supplierId]) {
        const supplierName = getSupplierName(supplierId);
        
        groups[supplierId] = {
          supplier_id: supplierId,
          supplier_name: supplierName,
          items: []
        };
      }
      
      groups[supplierId].items.push({ ...item });
    });

    setGroupedBySupplier(groups);
    setShowGroupedView(true);
  };

  const handleBackToAssignment = () => {
    setShowGroupedView(false);
    setGroupedBySupplier({});
  };

  const handleSubmit = async () => {
    if (!selectedOrder) {
      await alert.info(
        `Seleccionar una orden de compra.`,
        'Seleccionar Orden'
      );
      return;
    }

    const allItems = [];
    Object.values(groupedBySupplier).forEach(group => {
      group.items.forEach(item => {
        allItems.push({
          purchase_order_item_id: item.purchase_order_item_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_cost || 0),
          line_total: Number(item.line_total || 0),
          notes: item.notes || null
        });
      });
    });

    if (allItems.length === 0) {
      await alert.error(
        `No hay items para recibir.`,
        'Asignar items'
      );
      return;
    }

    const confirmed = await confirm.showConfirm({
      title: 'Confirmar recepción',
      message: `¿Estás seguro de recibir ${allItems.length} items de la orden ${selectedOrder.order_number}?`,
      confirmText: 'Recibir mercadería',
      cancelText: 'Cancelar',
      danger: false,
    });

    if (!confirmed) return;

    // Preparar datos de proveedores para el modal
    const supplierGroups = Object.values(groupedBySupplier).map(group => ({
      supplier_id: group.supplier_id,
      supplier_name: group.supplier_name,
      total: group.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0),
      items: group.items.map(item => ({
        purchase_order_item_id: item.purchase_order_item_id,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost || 0),
        line_total: Number(item.line_total || 0),
        notes: item.notes || null
      }))
    }));

    setAllSupplierGroups(supplierGroups);
    setShowPaymentOptions(true);
  };

  // ============================================================
  // handleConfirmPayment - MODIFICADO CON CALLBACK
  // ============================================================
  const handleConfirmPayment = async (paymentData, callback) => {
    setPaymentSaving(true);
    
    try {
      const { 
        paymentOption: selectedOption, 
        invoiceNumber: invNumber,
        dueDate: due,
        abonoAmount: abono,
        isPartial,
        isFullPayment,
        supplierGroups,
        activeSupplierIndex,
        supplier_name,
        allSupplierData,
        isLastSupplier
      } = paymentData;
      
      const activeGroup = supplierGroups[activeSupplierIndex];
      const activeTotal = activeGroup?.total || 0;
      
      // Construir supplier_groups con configuración por proveedor
      const supplierGroupsWithPayment = supplierGroups.map((group, index) => {
        const isActiveSupplier = index === activeSupplierIndex;
        const supplierFields = allSupplierData?.[group.supplier_id] || {};
        
        let effectiveInvoiceNumber;
        if (isActiveSupplier) {
          effectiveInvoiceNumber = invNumber || null;
        } else {
          effectiveInvoiceNumber = supplierFields.invoiceNumber || null;
        }
        
        const effectiveAbono = isActiveSupplier
          ? (isFullPayment ? group.total : (abono || 0))
          : (parseFloat(supplierFields.abonoAmount) || 0);
        
        const effectiveDueDate = isActiveSupplier
          ? (isFullPayment ? null : (due || null))
          : (supplierFields.dueDate || null);
        
        const effectiveIsFullPayment = isActiveSupplier
          ? isFullPayment
          : (effectiveAbono === 0 || effectiveAbono === group.total);
        
        const effectivePaymentOption = effectiveIsFullPayment ? 'pay_now' : 'pay_later';
        
        return {
          supplier_id: group.supplier_id,
          items: group.items.map(item => ({
            purchase_order_item_id: item.purchase_order_item_id,
            quantity: Number(item.quantity),
            unit_cost: Number(item.unit_cost || 0),
            line_total: Number(item.line_total || 0),
            notes: item.notes || null
          })),
          payment_option: effectivePaymentOption,
          payment_method: effectiveIsFullPayment ? 'cash' : null,
          payment_reference: null,
          invoice_number: effectiveInvoiceNumber,
          due_date: effectiveDueDate,
          abono_amount: effectiveIsFullPayment ? group.total : effectiveAbono,
          is_partial: !effectiveIsFullPayment && effectiveAbono > 0 && effectiveAbono < group.total
        };
      });

      const payload = {
        purchase_order_id: selectedOrder.id,
        notes: notes || null,
        supplier_groups: supplierGroupsWithPayment,
        payment_option: isFullPayment ? 'pay_now' : 'pay_later',
        payment_method: 'cash',
        payment_reference: null,
        invoice_number: invNumber || null,
        due_date: isFullPayment ? null : (due || null),
        abono_amount: isFullPayment ? 0 : (abono || 0),
        is_partial: !isFullPayment
      };
      
      // Guardar y esperar resultado
      await onSave(payload);
      
      // Mostrar mensaje según el tipo de pago
      if (isFullPayment) {
        await alert.success(
          `Pago registrado exitosamente para proveedor ${supplier_name}`,
          'Pago completado'
        );
      } else {
        await alert.success(
          `Cuenta por pagar creada exitosamente para proveedor ${supplier_name} (Saldo pendiente: ${money(activeTotal - abono)})`,
          'Cuenta creada'
        );
      }
      
      // Si no es el último, mostrar mensaje de continuación
      if (!isLastSupplier) {
        await alert.info(
          `Proveedor ${activeSupplierIndex + 1} de ${supplierGroups.length} procesado. Avanzando al siguiente...`,
          'Siguiente proveedor'
        );
      }
      
      // Llamar al callback con éxito
      if (callback) {
        callback(true);
      }
      
    } catch (error) {
      console.error('Error en handleConfirmPayment:', error);
      await alert.error(error.message);
      
      // Llamar al callback con error
      if (callback) {
        callback(false);
      }
    } finally {
      setPaymentSaving(false);
    }
  };

  const renderAssignmentTable = () => (
    <div className="receipt-items">
      <div className="receipt-items-header">
        <strong>Items a recibir {selectedOrder && (
                <div className="receipt-order-info">
                  Orden #{selectedOrder.order_number} - {receiptItems.length} items pendientes
                  {orderType && (
                    <span className="receipt-order-type" style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      ({orderType === 'COMMERCIAL' ? 'Comercial' : 'Manufacturado'})
                    </span>
                  )}
                </div>
              )}
        </strong>
      </div>

      <div className="receipt-items-table-wrapper">
        <table className="receipt-items-table">
          <thead>
            <tr>
              <th className="receipt-col-center">Código</th>
              <th>Producto</th>
              <th className="receipt-col-center" style={{ minWidth: '220px' }}>Proveedor *</th>
              <th className="receipt-col-center">Cantidad</th>
              <th className="receipt-col-center">Precio unit. *</th>
              <th className="receipt-col-center" style={{ width: '60px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {receiptItems.map((item) => {
              const supplierOpts = getSupplierOptions(item.purchase_order_item_id);
              const hasSupplier = item.supplier_id && item.supplier_id !== '';
              
              return (
                <tr key={item.tempId} className={!hasSupplier ? 'receipt-row-warning' : ''}>
                  <td className="receipt-col-center">{item.product_code || '—'}</td>
                  <td><strong>{item.product_name}</strong></td>
                  <td className="receipt-col-center" style={{ minWidth: '220px' }}>
                    <CustomCombobox
                      key={`supplier-${item.tempId}`}
                      options={supplierOpts}
                      value={item.supplier_id || ''}
                      onChange={(value) => {
                        handleSupplierChange(item.tempId, value, item.purchase_order_item_id);
                      }}
                      placeholder="Seleccionar proveedor..."
                      filterable={true}
                      size="sm"
                      forceDropup={false}
                    />
                    <div style={{ marginTop: '2px' }}>
                      {!hasSupplier ? (
                        <span className="receipt-field-error">Requerido</span>
                      ) : (
                        (() => {
                          const suppliers = productSuppliers[item.purchase_order_item_id] || [];
                          const selected = suppliers.find(s => s.id === item.supplier_id);
                          return selected?.has_history === false ? (
                            <span className="receipt-field-info" style={{ fontSize: '11px', color: 'var(--warning)' }}>
                              Nuevo proveedor - Ingresa precio
                            </span>
                          ) : (
                            <span className="receipt-field-success" style={{ fontSize: '11px', color: 'var(--success)' }}>
                              Proveedor asignado
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </td>
                  <td className="receipt-col-center">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.quantity}
                      onChange={(value) => updateReceiptItem(item.tempId, 'quantity', value)}
                      size="sm"
                      className="receipt-input-quantity"
                    />
                  </td>
                  <td className="receipt-col-center">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_cost || ''}
                      onChange={(value) => updateReceiptItem(item.tempId, 'unit_cost', value)}
                      size="sm"
                      className="receipt-input-cost"
                      placeholder={hasSupplier ? '0.00' : '0.00'}
                      disabled={!hasSupplier}
                    />
                  </td>
                  <td className="receipt-col-center">
                    <IconTextButton
                      variant="danger"
                      size="sm"
                      inline={true}
                      icon={<FiTrash2 size={14} />}
                      onClick={() => removeReceiptItem(item.tempId)}
                      tooltip="Eliminar"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="receipt-footer-label">
                Total items: {totals.items}
                {totals.itemsWithSupplier < totals.items && (
                  <span className="receipt-footer-warning">
                    {totals.items - totals.itemsWithSupplier} sin proveedor
                  </span>
                )}
                {totals.itemsWithPrice < totals.items && totals.itemsWithSupplier === totals.items && (
                  <span className="receipt-footer-warning">
                    {totals.items - totals.itemsWithPrice} sin precio
                  </span>
                )}
              </td>
              <td></td>
              <td className="receipt-footer-total">
                <strong>Total: {money(totals.subtotal)}</strong>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  const renderGroupedView = () => (
    <div className="supplier-groups">
      {Object.values(groupedBySupplier).map((group) => {
        const groupTotal = group.items.reduce((sum, item) => sum + Number(item.line_total || 0), 0);
        
        return (
          <div key={group.supplier_id} className="supplier-receipt-card">
            <div className="supplier-receipt-header">
              <div className="supplier-receipt-header-left">
                <FiTruck size={20} style={{ color: 'var(--primary)' }} />
                <div>
                  <strong>{group.supplier_name}</strong>
                  <span className="supplier-item-count">
                    {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>
            </div>

            <table className="receipt-items-table">
              <thead>
                <tr>
                  <th className="receipt-col-center">Código</th>
                  <th>Producto</th>
                  <th className="receipt-col-center">Cantidad</th>
                  <th className="receipt-col-right">Costo unit.</th>
                  <th className="receipt-col-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => (
                  <tr key={item.tempId}>
                    <td className="receipt-col-center">{item.product_code || '—'}</td>
                    <td><strong>{item.product_name}</strong></td>
                    <td className="receipt-col-center">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(value) => updateReceiptItem(item.tempId, 'quantity', value)}
                        size="sm"
                        className="receipt-input-quantity"
                      />
                    </td>
                    <td className="receipt-col-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(value) => updateReceiptItem(item.tempId, 'unit_cost', value)}
                        size="sm"
                        className="receipt-input-cost"
                      />
                    </td>
                    <td className="receipt-col-right receipt-item-total">
                      {money(item.line_total || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3" className="receipt-footer-label">
                    Total proveedor
                  </td>
                  <td></td>
                  <td className="receipt-footer-total">
                    <strong>{money(groupTotal)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );

  const renderFooter = () => {
    if (showGroupedView) {
      return (
        <ButtonGroup>
          <IconTextButton
            variant=""
            size="md"
            icon={<FiArrowLeft size={14} />}
            onClick={handleBackToAssignment}
            disabled={saving}
          >
            Volver a asignación
          </IconTextButton>

          <IconTextButton
            variant="success"
            size="md"
            icon={<FiTruck size={14} />}
            onClick={handleSubmit}
            loading={saving}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Recibir mercadería'}
          </IconTextButton>
        </ButtonGroup>
      );
    }

    return (
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
          icon={<FiCheck size={14} />}
          onClick={handleGroupBySupplier}
          disabled={saving || receiptItems.length === 0}
        >
          Distribuir por proveedor
        </IconTextButton>
      </ButtonGroup>
    );
  };

  return (
    <>
      <Modal
        closeOnOverlayClick={false}
        isOpen={true}
        onClose={onClose}
        title={showGroupedView ? 'Revisar recepción por proveedor' : 'Nueva recepción de mercadería'}
        size="full"
        footer={
          <>
            {error && (
              <div className="modal-error-text">
                <FiAlertCircle size={16} /> {error}
              </div>
            )}
            {renderFooter()}
          </>
        }
      >
        <div className="receipt-modal-content">
          <div className="receipt-header">
            <div className="form-group">
              <label>Orden de compra *</label>
              <CustomCombobox
                options={orderOptions}
                value={selectedOrder?.id || ''}
                onChange={handleOrderSelect}
                placeholder="Seleccionar orden pendiente..."
                filterable={true}
                size="md"
                disabled={showGroupedView}
              />
            </div>

            <div className="form-group">
              <label>Proveedores asignados</label>
              <div className="receipt-supplier-summary">
                {showGroupedView ? (
                  <span style={{ color: 'var(--success)' }}>
                    {Object.keys(groupedBySupplier).length} proveedor(es) - {receiptItems.length} items
                  </span>
                ) : totals.itemsWithSupplier > 0 ? (
                  <span style={{ color: 'var(--success)' }}>
                    {totals.itemsWithSupplier} / {totals.items} items tienen proveedor asignado
                    {totals.itemsWithPrice < totals.items && (
                      <span style={{ color: 'var(--warning)', marginLeft: '8px' }}>
                        {totals.items - totals.itemsWithPrice} - sin precio
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="receipt-supplier-warning">
                    Asigna un proveedor y precio a cada producto
                  </span>
                )}
              </div>
            </div>
          </div>

          {loadingItems ? (
            <div className="receipt-loading">Cargando items de la orden...</div>
          ) : receiptItems.length > 0 ? (
            showGroupedView ? renderGroupedView() : renderAssignmentTable()
          ) : selectedOrder ? (
            <div className="receipt-empty">
              <FiPackage size={32} />
              <div>No hay items pendientes para esta orden</div>
              <div className="receipt-empty-sub">Todos los items ya han sido recibidos</div>
            </div>
          ) : (
            <div className="receipt-empty">
              <FiTruck size={32} />
              <div>Selecciona una orden de compra para comenzar</div>
              <div className="receipt-empty-sub">Solo se muestran órdenes aprobadas con items pendientes</div>
            </div>
          )}

          <div className="form-group">
            <label>Observaciones</label>
            <Input
              type="text"
              value={notes}
              onChange={setNotes}
              placeholder="Observaciones de la recepción..."
              size="md"
              disabled={showGroupedView && saving}
            />
          </div>
        </div>
      </Modal>

      {/* Modal de opciones de pago - con supplierGroups */}
      <PaymentOptionsModal
        isOpen={showPaymentOptions}
        onClose={() => {
          setShowPaymentOptions(false);
          // Cerrar también el modal principal cuando se completa todo
          onClose();
        }}
        onConfirm={handleConfirmPayment}
        supplierGroups={allSupplierGroups}
        receiptNumber={selectedOrder?.order_number || ''}
        saving={paymentSaving || saving}
      />
    </>
  );
}

// ============================================================
// MODAL - DETALLE DE RECEPCIÓN
// ============================================================

function ReceiptDetailModal({ receipt, items, onClose }) {
  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={`Detalle de recepción #${receipt?.receipt_number || ''}`}
      size="xl"
      className="receipt-detail-modal"
      footer={
        <ButtonGroup>
          <IconTextButton variant="" onClick={onClose}>
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="receipt-detail-content">
        <div className="receipt-detail-info">
          <div className="receipt-detail-field">
            <label>Orden de compra</label>
            <p>{receipt?.order_number || '—'}</p>
          </div>
          <div className="receipt-detail-field">
            <label>Proveedor</label>
            <p>{receipt?.supplier_name || '—'}</p>
          </div>
          <div className="receipt-detail-field">
            <label>Total</label>
            <p className="receipt-detail-total">
              {money(items?.reduce((sum, item) => sum + Number(item.line_total || 0), 0) || 0)}
            </p>
          </div>
          <div className="receipt-detail-field">
            <label>Fecha</label>
            <p>{receipt?.receipt_date ? new Date(receipt.receipt_date).toLocaleString() : '—'}</p>
          </div>
          <div className="receipt-detail-field">
            <label>Estado</label>
            <p>
              <span className={`status-badge status-${receipt?.status?.toLowerCase() || 'draft'}`}>
                {receipt?.status === 'completed' ? 'Completada' : 
                 receipt?.status === 'paid' ? 'Pagada' : 'Borrador'}
              </span>
            </p>
          </div>
          <div className="receipt-detail-field">
            <label>Items</label>
            <p>{items?.length || 0}</p>
          </div>
        </div>

        {receipt?.notes && (
          <div className="receipt-detail-notes">
            <label>Notas</label>
            <p>{receipt.notes}</p>
          </div>
        )}

        <div className="receipt-detail-items">
          <h4>Items recibidos</h4>
          <div className="receipt-detail-table-wrapper">
            <table className="receipt-detail-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="receipt-col-center">Código</th>
                  <th className="receipt-col-center">Cantidad</th>
                  <th className="receipt-col-right">Costo unit.</th>
                  <th className="receipt-col-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.product_name}</strong></td>
                    <td className="receipt-col-center">{item.product_code || '—'}</td>
                    <td className="receipt-col-center">{item.quantity}</td>
                    <td className="receipt-col-right">{money(item.unit_cost)}</td>
                    <td className="receipt-col-right receipt-item-total">{money(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================

export default function PurchaseReceipts() {
  const { user, selectedBusiness } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const { openCashDrawer } = usePrinterService();

  const [receipts, setReceipts] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [paying, setPaying] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [receiptsRes, pendingRes, suppliersRes] = await Promise.all([
        fetchWithAuth('/purchase-receipts'),
        fetchWithAuth('/purchase-receipts/pending'),
        fetchWithAuth('/suppliers')
      ]);

      const receiptsData = await receiptsRes.json();
      const pendingData = await pendingRes.json();
      const suppliersData = await suppliersRes.json();

      if (!receiptsRes.ok) {
        throw new Error(receiptsData.error || 'Error al cargar recepciones');
      }

      if (!pendingRes.ok) {
        throw new Error(pendingData.error || 'Error al cargar órdenes pendientes');
      }

      if (!suppliersRes.ok) {
        throw new Error(suppliersData.error || 'Error al cargar proveedores');
      }

      setReceipts(Array.isArray(receiptsData) ? receiptsData : []);
      setPendingOrders(Array.isArray(pendingData) ? pendingData : []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePayReceipt = async (paymentData) => {
    setPaying(true);
    setError('');

    const operador = getOperatorUser();
    const schemaLocal = selectedBusiness?.schemaName || user?.schemaName;

    try {
      const { paymentMethod, amount, reference } = paymentData;

      const auditRes = await fetchWithAuth('/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id || user?.id,
          table_name: 'purchase_receipts',
          action: 'purchase_payment',
          description: `Pago de recepción #${paymentReceipt.receipt_number} por $${amount.toFixed(2)} - Método: ${paymentMethod}`,
          new_values: {
            receipt_id: paymentReceipt.id,
            receipt_number: paymentReceipt.receipt_number,
            amount: amount,
            payment_method: paymentMethod,
            reference: reference,
            schema: schemaLocal
          },
          reason: 'Pago de compra'
        })
      });

      if (!auditRes.ok) {
        const data = await auditRes.json().catch(() => ({}));
        throw new Error(data?.error || 'Error registrando auditoría');
      }

      const updateRes = await fetchWithAuth(`/purchase-receipts/${paymentReceipt.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'paid',
          payment_method: paymentMethod,
          payment_reference: reference || null,
          paid_at: new Date().toISOString()
        })
      });

      if (!updateRes.ok) {
        const data = await updateRes.json().catch(() => ({}));
        throw new Error(data?.error || 'Error actualizando estado de la recepción');
      }

      if (paymentMethod === 'cash') {
        await openCashDrawer().catch(() => {});
      }

      await loadData();
      setShowPaymentModal(false);
      setPaymentReceipt(null);
      await alert.success(`Recepción #${paymentReceipt.receipt_number} pagada correctamente por $${amount.toFixed(2)}`, '✅ Pago registrado');

    } catch (err) {
      setError(err.message || 'Error al procesar el pago');
      await alert.error(err.message || 'Error al procesar el pago');
    } finally {
      setPaying(false);
    }
  };

  const getDateFilter = useCallback((dateStr, filter, startDate, endDate) => {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today': {
        const todayStr = today.toISOString().split('T')[0];
        const dateStrNormalized = dateStr.split('T')[0];
        return dateStrNormalized === todayStr;
      }

      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        const dateTimestamp = date.getTime();
        const weekStartTimestamp = weekStart.getTime();
        const todayEndTimestamp = new Date(today);
        todayEndTimestamp.setHours(23, 59, 59, 999);
        
        return dateTimestamp >= weekStartTimestamp && 
               dateTimestamp <= todayEndTimestamp.getTime();
      }

      case 'month': {
        return date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
      }

      case 'custom': {
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) return true;
          
          end.setHours(23, 59, 59, 999);
          const dateTimestamp = date.getTime();
          return dateTimestamp >= start.getTime() && 
                 dateTimestamp <= end.getTime();
        }
        return true;
      }

      default:
        return true;
    }
  }, []);

  const filteredReceipts = useMemo(() => {
    let result = receipts;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(receipt =>
        String(receipt.receipt_number || '').toLowerCase().includes(search) ||
        String(receipt.order_number || '').toLowerCase().includes(search) ||
        String(receipt.supplier_name || '').toLowerCase().includes(search)
      );
    }

    if (dateFilter !== 'all') {
      result = result.filter(receipt =>
        getDateFilter(receipt.receipt_date, dateFilter, customStartDate, customEndDate)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(receipt =>
        (receipt.status || 'draft').toLowerCase() === statusFilter
      );
    }

    return result;
  }, [receipts, searchTerm, dateFilter, statusFilter, customStartDate, customEndDate, getDateFilter]);

  // ============================================================
  // handleSaveReceipt - MODIFICADO PARA PROCESAR UN PROVEEDOR A LA VEZ
  // ============================================================
  const handleSaveReceipt = async (payload) => {
    
    // NO activar saving global aquí, se maneja en handleConfirmPayment
    // setSaving(true);

    try {
      const response = await fetchWithAuth('/purchase-receipts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error en respuesta:', data);
        throw new Error(data.error || data.message || 'No se pudo crear la recepción');
      }
      
      // Recargar datos después de cada proveedor
      await loadData();
      
      // NO cerrar el modal aquí, se maneja en el callback
      // setShowModal(false);
      // await alert.success('Recepción de mercadería creada correctamente');

    } catch (error) {
      console.error('❌ Error en handleSaveReceipt:', error);
      throw error; // Re-lanzar para que handleConfirmPayment lo capture
    } finally {
      // setSaving(false);
      console.log('🔍 ===== FIN handleSaveReceipt =====');
    }
  };

  const viewReceiptDetail = async (receipt) => {
    try {
      const response = await fetchWithAuth(`/purchase-receipts/${receipt.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar el detalle');
      }

      setSelectedReceipt(data.receipt);
      setReceiptItems(data.items || []);
      setShowDetailModal(true);

    } catch (error) {
      await alert.error(error.message);
    }
  };

  const handleDelete = async (receipt) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Eliminar la recepción #${receipt.receipt_number}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/purchase-receipts/${receipt.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la recepción');
      }

      await loadData();
      await alert.success(`Recepción #${receipt.receipt_number} eliminada correctamente`);

    } catch (error) {
      await alert.error(error.message);
    }
  };

  const columns = [
    {
      accessor: 'receipt_number',
      label: 'Recepción',
      render: item => <strong>{item.receipt_number}</strong>
    },
    {
      accessor: 'order_number',
      label: 'Orden de compra',
      render: item => <span>{item.order_number || '—'}</span>
    },
    {
      accessor: 'supplier_name',
      label: 'Proveedor',
      render: item => <span>{item.supplier_name || '—'}</span>
    },
    {
      accessor: 'receipt_date',
      label: 'Fecha',
      render: item => {
        if (!item.receipt_date) return '—';
        return new Date(item.receipt_date).toLocaleDateString('es-EC');
      }
    },
    {
      accessor: 'item_count',
      label: 'Items',
      align: 'center',
      render: item => <span>{item.item_count || 0}</span>
    },
    {
      accessor: 'total',
      label: 'Total',
      align: 'right',
      render: item => <strong className="receipt-total">{money(item.total)}</strong>
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: item => {
        const statusMap = {
          'completed': <span className="status-badge status-completed">Completada</span>,
          'paid': <span className="status-badge status-paid">Pagada</span>,
          'draft': <span className="status-badge status-draft">Borrador</span>
        };
        return statusMap[item.status?.toLowerCase()] || <span className="status-badge status-draft">📄 {item.status || 'Borrador'}</span>;
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <div className="receipt-actions" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<FiEye size={14} />}
            onClick={() => viewReceiptDetail(item)}
            tooltip="Ver detalle"
          >
            Ver
          </IconTextButton>

          {item.status === 'completed' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<FiDollarSign size={14} />}
              onClick={() => {
                setPaymentReceipt(item);
                setShowPaymentModal(true);
              }}
              tooltip="Pagar recepción"
            >
              Pagar
            </IconTextButton>
          )}

          {item.status === 'draft' && (
            <IconTextButton
              variant="danger"
              size="sm"
              inline={true}
              icon={<FiTrash2 size={14} />}
              onClick={() => handleDelete(item)}
              tooltip="Eliminar"
            >
              Eliminar
            </IconTextButton>
          )}

          {item.status === 'paid' && (
            <IconTextButton
              variant="success"
              size="sm"
              inline={true}
              icon={<FiPrinter size={14} />}
              onClick={async () => {
                try {
                  await alert.success(`Recepción #${item.receipt_number} pagada por ${money(item.total)}`, 
                  ' Recepción de Mercadería Pagada');
                } catch {}
              }}
              tooltip="Imprimir comprobante"
            >
              Comprobante
            </IconTextButton>
          )}
        </div>
      )
    }
  ];

  const toolbar = (
    <div className="users-toolbar" style={{ position: 'relative' }}>
      <div style={{ minWidth: '150px'}}>
        <CustomCombobox
          options={dateFilterOptions}
          value={dateFilter}
          onChange={(value) => {
            setDateFilter(value);
            if (value === 'custom') {
              setShowCustomDate(true);
            } else {
              setShowCustomDate(false);
              setCustomStartDate('');
              setCustomEndDate('');
            }
          }}
          placeholder="Filtrar por fecha..."
          filterable={false}
          size="md"
          forceDropup={false}
        />
      </div>
      <div style={{ minWidth: '160px'}}>
        <CustomCombobox
          options={statusFilterOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="Filtrar por estado..."
          filterable={false}
          size="md"
          forceDropup={false}
        />
      </div>
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="sm"
          icon={<FiX size={14} />}
          onClick={() => {
            setSearchTerm('');
            setDateFilter('all');
            setStatusFilter('all');
            setCustomStartDate('');
            setCustomEndDate('');
            setShowCustomDate(false);
          }}
        >
          Limpiar
        </IconTextButton>

        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setShowModal(true)}
          disabled={pendingOrders.length === 0}
        >
          Nueva recepción
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (loading) {
    return (
      <PageTemplate
        title="Recepción de mercadería"
        subtitle="Gestión de recepciones de compras"
        theme="business"
        loading={false}
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={7}
          title="Recepciones de mercadería"
          subtitle="Cargando recepciones..."
          columnWidths={['1.2fr', '1.2fr', '1.8fr', '1fr', '0.6fr', '0.8fr', '1fr']}
          toolbarWidth={200}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="Recepción de mercadería"
      subtitle="Gestión de recepciones de compras"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      <Table
        data={filteredReceipts}
        columns={columns}
        keyField="id"
        title="Recepciones de mercadería"
        subtitle={`${filteredReceipts.length} ${filteredReceipts.length === 1 ? 'recepción' : 'recepciones'}`}
        toolbar={toolbar}
        searchable={true}
        searchFields={['order_number', 'mesa_numero', 'id']}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          searchTerm || dateFilter !== 'all' || statusFilter !== 'all'
            ? 'No hay recepciones que coincidan con los filtros'
            : 'No hay recepciones de mercadería registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {showModal && (
        <ReceiptModal
          onClose={() => setShowModal(false)}
          pendingOrders={pendingOrders}
          suppliers={suppliers}
          onSave={handleSaveReceipt}
          saving={saving}
        />
      )}

      {showDetailModal && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          items={receiptItems}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReceipt(null);
            setReceiptItems([]);
          }}
        />
      )}

      {showPaymentModal && paymentReceipt && (
        <PaymentModal
          receipt={paymentReceipt}
          onClose={() => {
            setShowPaymentModal(false);
            setPaymentReceipt(null);
            setError('');
          }}
          onConfirm={handlePayReceipt}
          saving={paying}
        />
      )}

      {showCustomDate && (
        <div className="report-modal-overlay" onClick={() => setShowCustomDate(false)}>
          <div className="report-modal-box" onClick={e => e.stopPropagation()}>
            <div className="report-modal-header">
              <h2>Seleccionar fechas</h2>
              <button 
                type="button" 
                onClick={() => setShowCustomDate(false)} 
                className="report-modal-close"
              >
                ×
              </button>
            </div>
            <div className="report-modal-body">
              <DateRangePicker
                startDate={customStartDate}
                endDate={customEndDate}
                onApply={(start, end) => {
                  setCustomStartDate(start);
                  setCustomEndDate(end);
                  setShowCustomDate(false);
                  setDateFilter('custom');
                }}
                onClose={() => setShowCustomDate(false)}
              />
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}