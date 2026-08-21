import React from 'react';
import { FiX, FiUsers, FiCheck } from 'react-icons/fi';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { CiCreditCard1 } from "react-icons/ci";
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import { BsCurrencyExchange } from 'react-icons/bs';
import { IoFileTrayFull } from 'react-icons/io5';
import { CiWarning } from 'react-icons/ci';
import { IconTextButton, ButtonGroup } from '../../../components/General/Button';
import Input from '../../../components/General/Input';
import Checklist from '../../../components/General/Checklist';

const SplitCustomerCard = ({
  comensal,
  index,
  clientesDivididos,
  onEliminarComensal,
  onActualizarComensal,
  onBuscarCliente,
  onQuitarItem,
  onCobrarComensal,
  clientApiLoading,
  selectedOrder,
  fmt,
}) => {
  // ---- CÁLCULO DE TOTALES DEL COMENSAL (CORREGIDO) ----
  const subtotalC = comensal.items.reduce((sum, itemId) => {
    const item = selectedOrder?.items?.find(i => i.id === itemId);
    if (!item) return sum;
    const price = Number(item.selling_price) || Number(item.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    return sum + (price * qty);
  }, 0);

  // ✅ CORREGIDO: Usar iva_amount que ya viene calculado o calcularlo correctamente
  const ivaC = comensal.items.reduce((sum, itemId) => {
    const item = selectedOrder?.items?.find(i => i.id === itemId);
    if (!item) return sum;
    // Usar iva_amount si existe, o calcularlo
    const ivaAmount = Number(item.iva_amount) || 0;
    if (ivaAmount > 0) return sum + ivaAmount;
    
    // Fallback: calcular IVA desde el precio y tax_rate
    const price = Number(item.selling_price) || Number(item.unit_price) || 0;
    const qty = Number(item.quantity) || 1;
    const taxRate = Number(item.tax_rate) || 0;
    const subtotal = price * qty;
    // Calcular IVA correctamente: subtotal * (taxRate / 100)
    const calculatedIVA = subtotal * (taxRate / 100);
    return sum + calculatedIVA;
  }, 0);

  const totalC = subtotalC + ivaC;

  // ---- Para el modo MIXTO, usamos `mixtoActive` y `mixtoManual` como en MixedPayment ----
  const mixtoActive = comensal.mixtoActive || new Set();
  const mixtoManual = comensal.mixtoManual || new Set();

  const cashAmount = comensal.cashAmount || 0;
  const cardAmount = comensal.cardAmount || 0;
  const transferAmount = comensal.transferAmount || 0;
  const totalPagadoMixto = cashAmount + cardAmount + transferAmount;
  const faltanteMixto = Math.max(0, totalC - totalPagadoMixto);
  const cambioMixto = Math.max(0, totalPagadoMixto - totalC);

  // ---- Handlers para cédula ----
  const handleCedulaChange = (val, comensalId) => {
    const cleanVal = val.replace(/\D/g, '').slice(0, 13);
    onActualizarComensal(comensalId, 'cedula', cleanVal);
    if (cleanVal.length === 10 || cleanVal.length === 13) {
      onBuscarCliente(cleanVal, true, comensalId);
    } else {
      onActualizarComensal(comensalId, 'nombre', '');
      onActualizarComensal(comensalId, 'email', '');
    }
  };

  const handleKeyPress = (e, comensalId) => {
    if (e.key === 'Enter') {
      const comensal = clientesDivididos.find(c => c.id === comensalId);
      const val = comensal?.cedula || '';
      if (val.length === 10 || val.length === 13) {
        onBuscarCliente(val, true, comensalId);
      }
    }
  };

  const handleBlur = (e, comensalId) => {
    const comensal = clientesDivididos.find(c => c.id === comensalId);
    const val = comensal?.cedula || '';
    if (val.length === 10 || val.length === 13) {
      onBuscarCliente(val, true, comensalId);
    }
  };

  // ---- Handlers de MIXTO (igual que en MixedPayment) ----
  const handleChecklistChange = (selectedIds) => {
    const newActive = new Set(selectedIds);
    const newManual = new Set(mixtoManual);

    for (const method of mixtoManual) {
      if (!newActive.has(method)) {
        newManual.delete(method);
        switch (method) {
          case 'cash':
            onActualizarComensal(comensal.id, 'cashAmount', 0);
            break;
          case 'card':
            onActualizarComensal(comensal.id, 'cardAmount', 0);
            onActualizarComensal(comensal.id, 'referencia', '');
            break;
          case 'transfer':
            onActualizarComensal(comensal.id, 'transferAmount', 0);
            onActualizarComensal(comensal.id, 'referenciaTransfer', '');
            break;
          default:
            break;
        }
      }
    }

    onActualizarComensal(comensal.id, 'mixtoManual', newManual);
    onActualizarComensal(comensal.id, 'mixtoActive', newActive);

    const cash = newActive.has('cash') ? cashAmount : 0;
    const card = newActive.has('card') ? cardAmount : 0;
    const transfer = newActive.has('transfer') ? transferAmount : 0;
    const total = cash + card + transfer;
    onActualizarComensal(comensal.id, 'montoRecibido', total);
  };

  const handleFieldChange = (method, value) => {
    let d = value.replace(/\D/g, '');
    if (!d) d = '0';
    if (d.length > 8) d = d.slice(0, 8);
    const numValue = parseInt(d, 10) / 100;

    if (d === '0' || d === '') {
      limpiarCampoMixto(method);
    } else {
      const field = method === 'cash' ? 'cashAmount' : method === 'card' ? 'cardAmount' : 'transferAmount';
      onActualizarComensal(comensal.id, field, numValue);
      const newManual = new Set(mixtoManual);
      if (numValue > 0) {
        newManual.add(method);
      } else {
        newManual.delete(method);
      }
      onActualizarComensal(comensal.id, 'mixtoManual', newManual);

      const cash = method === 'cash' ? numValue : (comensal.cashAmount || 0);
      const card = method === 'card' ? numValue : (comensal.cardAmount || 0);
      const transfer = method === 'transfer' ? numValue : (comensal.transferAmount || 0);
      const total = cash + card + transfer;
      onActualizarComensal(comensal.id, 'montoRecibido', total);
    }
  };

  const limpiarCampoMixto = (method) => {
    const field = method === 'cash' ? 'cashAmount' : method === 'card' ? 'cardAmount' : 'transferAmount';
    onActualizarComensal(comensal.id, field, 0);
    if (method === 'card') onActualizarComensal(comensal.id, 'referencia', '');
    if (method === 'transfer') onActualizarComensal(comensal.id, 'referenciaTransfer', '');

    const newManual = new Set(mixtoManual);
    newManual.delete(method);
    onActualizarComensal(comensal.id, 'mixtoManual', newManual);

    const cash = method === 'cash' ? 0 : (comensal.cashAmount || 0);
    const card = method === 'card' ? 0 : (comensal.cardAmount || 0);
    const transfer = method === 'transfer' ? 0 : (comensal.transferAmount || 0);
    const total = cash + card + transfer;
    onActualizarComensal(comensal.id, 'montoRecibido', total);
  };

  const paymentOptions = [
    { id: 'cash', label: 'Efectivo', icon: <FaHandHoldingDollar size={16} /> },
    { id: 'card', label: 'Tarjeta', icon: <CiCreditCard1 size={16} /> },
    { id: 'transfer', label: 'Transferencia', icon: <FaMoneyBillTransfer size={16} /> },
  ];

  const selectedMethods = Array.from(mixtoActive);

  // Si no está en modo mixto, mostramos los otros métodos (cash, card, transfer)
  if (comensal.metodoPago !== 'mixto') {
    return (
      <div className="comensal-card">
        <div className="comensal-header">
          <span className="comensal-titulo"><FiUsers size={14} /> Comensal {index + 1}</span>
          {clientesDivididos.length > 1 && (
            <IconTextButton
              variant="danger"
              size="sm"
              icon={<FiX size={14} />}
              onClick={() => onEliminarComensal(comensal.id)}
            >
              Eliminar
            </IconTextButton>
          )}
        </div>

        {comensal.facturaIndividual && (
          <div className="cliente-fields">
            <div className="busqueda-container" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Input
                type="text"
                placeholder="Cédula/RUC"
                value={comensal.cedula || ''}
                onChange={(val) => handleCedulaChange(val, comensal.id)}
                onKeyPress={(e) => handleKeyPress(e, comensal.id)}
                onBlur={(e) => handleBlur(e, comensal.id)}
                size="sm"
                className="cf-cedula"
              />
              {clientApiLoading && <div className="spinner-small"></div>}
            </div>
            <Input
              type="text"
              placeholder="Nombre completo"
              value={comensal.nombre || ''}
              onChange={(val) => onActualizarComensal(comensal.id, 'nombre', val)}
              size="sm"
              className="cf-nombre"
            />
            <Input
              type="email"
              placeholder="Email (factura)"
              value={comensal.email || ''}
              onChange={(val) => onActualizarComensal(comensal.id, 'email', val)}
              size="sm"
              className="cf-email"
            />
          </div>
        )}

        <div className="productos-asignados">
          {comensal.items.map(itemId => {
            const item = selectedOrder?.items?.find(i => i.id === itemId);
            if (!item) return null;
            const price = Number(item.selling_price) || Number(item.unit_price) || 0;
            const qty = Number(item.quantity) || 1;
            const totalItem = price * qty;
            
            return (
              <div key={itemId} className="producto-item">
                <span style={{ flex: 1 }}>
                  {qty}x {item.product_name || 'Producto'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <span>
                    {fmt(totalItem)}
                  </span>
                  <ButtonGroup>
                    <IconTextButton
                      variant="danger"
                      size="sm"
                      icon={<FiX size={12} />}
                      onClick={() => onQuitarItem(comensal.id, itemId)}
                    >
                      Quitar
                    </IconTextButton>
                  </ButtonGroup>
                </div>
              </div>
            );
          })}
          {comensal.items.length === 0 && <span className="empty-text">Sin productos asignados</span>}
        </div>

        <div className="totals-footer">
          <div className="sub-iva-total"><span>SUBTOTAL</span><span>{fmt(subtotalC)}</span></div>
          <div className="sub-iva-total"><span>IVA</span><span>{fmt(ivaC)}</span></div>
          <div className="sub-iva-total total-row"><span>TOTAL</span><span className="total-amount">{fmt(totalC)}</span></div>
        </div>

        <div className="metodo-pago-seleccion">
          <ButtonGroup>
            <IconTextButton
              variant={comensal.metodoPago === 'cash' ? 'primary' : 'secondary'}
              size="sm"
              icon={<FaHandHoldingDollar size={16} />}
              onClick={() => {
                onActualizarComensal(comensal.id, 'metodoPago', 'cash');
                onActualizarComensal(comensal.id, 'mixtoActive', new Set());
                onActualizarComensal(comensal.id, 'mixtoManual', new Set());
                onActualizarComensal(comensal.id, 'cashAmount', 0);
                onActualizarComensal(comensal.id, 'cardAmount', 0);
                onActualizarComensal(comensal.id, 'transferAmount', 0);
                onActualizarComensal(comensal.id, 'montoRecibido', 0);
              }}
              outline={comensal.metodoPago !== 'cash'}
            >
              Efectivo
            </IconTextButton>
            <IconTextButton
              variant={comensal.metodoPago === 'card' ? 'primary' : 'secondary'}
              size="sm"
              icon={<CiCreditCard1 size={16} />}
              onClick={() => {
                onActualizarComensal(comensal.id, 'metodoPago', 'card');
                onActualizarComensal(comensal.id, 'mixtoActive', new Set());
                onActualizarComensal(comensal.id, 'mixtoManual', new Set());
                onActualizarComensal(comensal.id, 'cashAmount', 0);
                onActualizarComensal(comensal.id, 'cardAmount', 0);
                onActualizarComensal(comensal.id, 'transferAmount', 0);
                onActualizarComensal(comensal.id, 'montoRecibido', 0);
              }}
              outline={comensal.metodoPago !== 'card'}
            >
              Tarjeta
            </IconTextButton>
            <IconTextButton
              variant={comensal.metodoPago === 'transfer' ? 'primary' : 'secondary'}
              size="sm"
              icon={<FaMoneyBillTransfer size={16} />}
              onClick={() => {
                onActualizarComensal(comensal.id, 'metodoPago', 'transfer');
                onActualizarComensal(comensal.id, 'mixtoActive', new Set());
                onActualizarComensal(comensal.id, 'mixtoManual', new Set());
                onActualizarComensal(comensal.id, 'cashAmount', 0);
                onActualizarComensal(comensal.id, 'cardAmount', 0);
                onActualizarComensal(comensal.id, 'transferAmount', 0);
                onActualizarComensal(comensal.id, 'montoRecibido', 0);
              }}
              outline={comensal.metodoPago !== 'transfer'}
            >
              Transferencia
            </IconTextButton>
            <IconTextButton
              variant={comensal.metodoPago === 'mixto' ? 'primary' : 'secondary'}
              size="sm"
              icon={<BsCurrencyExchange size={16} />}
              onClick={() => {
                onActualizarComensal(comensal.id, 'metodoPago', 'mixto');
                onActualizarComensal(comensal.id, 'mixtoActive', new Set());
                onActualizarComensal(comensal.id, 'mixtoManual', new Set());
                onActualizarComensal(comensal.id, 'cashAmount', 0);
                onActualizarComensal(comensal.id, 'cardAmount', 0);
                onActualizarComensal(comensal.id, 'transferAmount', 0);
                onActualizarComensal(comensal.id, 'montoRecibido', 0);
              }}
              outline={comensal.metodoPago !== 'mixto'}
            >
              Mixto
            </IconTextButton>
          </ButtonGroup>
        </div>

        {comensal.metodoPago === 'cash' && (
          <div className="payment-cash-row">
            <div className="payment-field">
              <label><BsCurrencyExchange size={16} /> Recibido:</label>
              <Input
                type="text"
                inputMode="numeric"
                value={comensal.montoRecibido > 0 ? comensal.montoRecibido.toFixed(2) : ''}
                onChange={(val) => {
                  let digits = val.replace(/\D/g, '');
                  if (!digits) digits = '0';
                  const value = parseInt(digits, 10) / 100;
                  onActualizarComensal(comensal.id, 'montoRecibido', value);
                }}
                placeholder="0.00"
                size="sm"
              />
            </div>
            <div className="payment-field cambio-field">
              <label><BsCurrencyExchange size={16} /> Cambio:</label>
              <span className="cambio-amount">{fmt(Math.max(0, (comensal.montoRecibido || 0) - totalC))}</span>
            </div>
            <div className="pay-inline-actions">
              <ButtonGroup>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiCheck size={13} />}
                  onClick={() => onCobrarComensal(comensal)}
                  disabled={(comensal.montoRecibido || 0) < totalC || comensal.items.length === 0}
                >
                  Cobrar
                </IconTextButton>
              </ButtonGroup>
            </div>
          </div>
        )}

        {(comensal.metodoPago === 'card' || comensal.metodoPago === 'transfer') && (
          <div className="payment-reference-row">
            <label>
              {comensal.metodoPago === 'card' ? <CiCreditCard1 size={16} /> : <FaMoneyBillTransfer size={16} />} 
              Referencia:
            </label>
            <Input
              type="text"
              value={comensal.referencia || ''}
              onChange={(val) => onActualizarComensal(comensal.id, 'referencia', val)}
              placeholder="Número de referencia"
              size="sm"
            />
            <div className="pay-inline-actions">
              <ButtonGroup>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiCheck size={13} />}
                  onClick={() => onCobrarComensal(comensal)}
                  disabled={!comensal.referencia || comensal.items.length === 0}
                >
                  Cobrar
                </IconTextButton>
              </ButtonGroup>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- Modo MIXTO (comensal.metodoPago === 'mixto') ----
  return (
    <div className="comensal-card">
      <div className="comensal-header">
        <span className="comensal-titulo"><FiUsers size={14} /> Comensal {index + 1}</span>
        {clientesDivididos.length > 1 && (
          <IconTextButton
            variant="danger"
            size="sm"
            icon={<FiX size={14} />}
            onClick={() => onEliminarComensal(comensal.id)}
          >
            Eliminar
          </IconTextButton>
        )}
      </div>

      {comensal.facturaIndividual && (
        <div className="cliente-fields">
          <div className="busqueda-container" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Input
              type="text"
              placeholder="Cédula/RUC"
              value={comensal.cedula || ''}
              onChange={(val) => handleCedulaChange(val, comensal.id)}
              onKeyPress={(e) => handleKeyPress(e, comensal.id)}
              onBlur={(e) => handleBlur(e, comensal.id)}
              size="sm"
              className="cf-cedula"
            />
            {clientApiLoading && <div className="spinner-small"></div>}
          </div>
          <Input
            type="text"
            placeholder="Nombre completo"
            value={comensal.nombre || ''}
            onChange={(val) => onActualizarComensal(comensal.id, 'nombre', val)}
            size="sm"
            className="cf-nombre"
          />
          <Input
            type="email"
            placeholder="Email (factura)"
            value={comensal.email || ''}
            onChange={(val) => onActualizarComensal(comensal.id, 'email', val)}
            size="sm"
            className="cf-email"
          />
        </div>
      )}

      <div className="productos-asignados">
        {comensal.items.map(itemId => {
          const item = selectedOrder?.items?.find(i => i.id === itemId);
          if (!item) return null;
          const price = Number(item.selling_price) || Number(item.unit_price) || 0;
          const qty = Number(item.quantity) || 1;
          const totalItem = price * qty;
          
          return (
            <div key={itemId} className="producto-item">
              <span style={{ flex: 1 }}>
                {qty}x {item.product_name || 'Producto'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                <span>
                  {fmt(totalItem)}
                </span>
                <ButtonGroup>
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiX size={12} />}
                    onClick={() => onQuitarItem(comensal.id, itemId)}
                  >
                    Quitar
                  </IconTextButton>
                </ButtonGroup>
              </div>
            </div>
          );
        })}
        {comensal.items.length === 0 && <span className="empty-text">Sin productos asignados</span>}
      </div>

      <div className="totals-footer">
        <div className="sub-iva-total"><span>SUBTOTAL</span><span>{fmt(subtotalC)}</span></div>
        <div className="sub-iva-total"><span>IVA</span><span>{fmt(ivaC)}</span></div>
        <div className="sub-iva-total total-row"><span>TOTAL</span><span className="total-amount">{fmt(totalC)}</span></div>
      </div>

      <div className="metodo-pago-seleccion">
        <ButtonGroup>
          <IconTextButton
            variant="secondary"
            size="sm"
            icon={<FaHandHoldingDollar size={16} />}
            onClick={() => {
              onActualizarComensal(comensal.id, 'metodoPago', 'cash');
              onActualizarComensal(comensal.id, 'mixtoActive', new Set());
              onActualizarComensal(comensal.id, 'mixtoManual', new Set());
              onActualizarComensal(comensal.id, 'cashAmount', 0);
              onActualizarComensal(comensal.id, 'cardAmount', 0);
              onActualizarComensal(comensal.id, 'transferAmount', 0);
              onActualizarComensal(comensal.id, 'montoRecibido', 0);
            }}
            outline={true}
          >
            Efectivo
          </IconTextButton>
          <IconTextButton
            variant="secondary"
            size="sm"
            icon={<CiCreditCard1 size={16} />}
            onClick={() => {
              onActualizarComensal(comensal.id, 'metodoPago', 'card');
              onActualizarComensal(comensal.id, 'mixtoActive', new Set());
              onActualizarComensal(comensal.id, 'mixtoManual', new Set());
              onActualizarComensal(comensal.id, 'cashAmount', 0);
              onActualizarComensal(comensal.id, 'cardAmount', 0);
              onActualizarComensal(comensal.id, 'transferAmount', 0);
              onActualizarComensal(comensal.id, 'montoRecibido', 0);
            }}
            outline={true}
          >
            Tarjeta
          </IconTextButton>
          <IconTextButton
            variant="secondary"
            size="sm"
            icon={<FaMoneyBillTransfer size={16} />}
            onClick={() => {
              onActualizarComensal(comensal.id, 'metodoPago', 'transfer');
              onActualizarComensal(comensal.id, 'mixtoActive', new Set());
              onActualizarComensal(comensal.id, 'mixtoManual', new Set());
              onActualizarComensal(comensal.id, 'cashAmount', 0);
              onActualizarComensal(comensal.id, 'cardAmount', 0);
              onActualizarComensal(comensal.id, 'transferAmount', 0);
              onActualizarComensal(comensal.id, 'montoRecibido', 0);
            }}
            outline={true}
          >
            Transferencia
          </IconTextButton>
          <IconTextButton
            variant="primary"
            size="sm"
            icon={<BsCurrencyExchange size={16} />}
            onClick={() => {}}
            outline={false}
          >
            Mixto
          </IconTextButton>
        </ButtonGroup>
      </div>

      <div className="mixto-toggle-row">
        <Checklist
          items={paymentOptions}
          value={selectedMethods}
          onChange={handleChecklistChange}
          mode="simple"
          variant="default"
          showIcons={true}
          selectAll={false}
          emptyMessage="Seleccione al menos un método de pago"
        />
      </div>

      {mixtoActive.size > 0 && (
        <div className="payment-mixed-row">
          {mixtoActive.has('cash') && (
            <div className="mixed-field">
              <label><FaHandHoldingDollar size={20} /> Efectivo:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cashAmount > 0 ? cashAmount.toFixed(2) : ''}
                  onChange={(value) => handleFieldChange('cash', value)}
                  placeholder="0.00"
                  size="sm"
                  style={{ flex: 1 }}
                />
                {cashAmount > 0 && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiX size={12} />}
                    onClick={() => limpiarCampoMixto('cash')}
                    title="Limpiar"
                  />
                )}
              </div>
            </div>
          )}
          {mixtoActive.has('card') && (
            <div className="mixed-field">
              <label><CiCreditCard1 size={20} /> Tarjeta:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={cardAmount > 0 ? cardAmount.toFixed(2) : ''}
                  onChange={(value) => handleFieldChange('card', value)}
                  placeholder="0.00"
                  size="sm"
                  style={{ flex: 1 }}
                />
                {cardAmount > 0 && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiX size={12} />}
                    onClick={() => limpiarCampoMixto('card')}
                    title="Limpiar"
                  />
                )}
              </div>
              <Input
                type="text"
                placeholder="Ref. tarjeta"
                value={comensal.referencia || ''}
                onChange={(val) => onActualizarComensal(comensal.id, 'referencia', val)}
                size="sm"
                style={{ marginTop: 4 }}
              />
            </div>
          )}
          {mixtoActive.has('transfer') && (
            <div className="mixed-field">
              <label><FaMoneyBillTransfer size={20} /> Transferencia:</label>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={transferAmount > 0 ? transferAmount.toFixed(2) : ''}
                  onChange={(value) => handleFieldChange('transfer', value)}
                  placeholder="0.00"
                  size="sm"
                  style={{ flex: 1 }}
                />
                {transferAmount > 0 && (
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiX size={12} />}
                    onClick={() => limpiarCampoMixto('transfer')}
                    title="Limpiar"
                  />
                )}
              </div>
              <Input
                type="text"
                placeholder="Ref. transferencia"
                value={comensal.referenciaTransfer || ''}
                onChange={(val) => onActualizarComensal(comensal.id, 'referenciaTransfer', val)}
                size="sm"
                style={{ marginTop: 4 }}
              />
            </div>
          )}
        </div>
      )}

      {mixtoActive.size > 0 && (
        <div className="mixed-total-row">
          <div className="mixed-total-item">
            <span><IoFileTrayFull size={20} /> Total Ingresado:</span>
            <strong>{fmt(totalPagadoMixto)}</strong>
          </div>
          {faltanteMixto > 0 && (
            <div className="mixed-total-item warning">
              <span><CiWarning size={20} /> Faltante:</span>
              <strong>{fmt(faltanteMixto)}</strong>
            </div>
          )}
          {cambioMixto > 0 && (
            <div className="mixed-total-item success">
              <span><BsCurrencyExchange size={20} /> Cambio:</span>
              <strong>{fmt(cambioMixto)}</strong>
            </div>
          )}
          <div className="pay-inline-actions" style={{ marginLeft: 'auto' }}>
            <ButtonGroup>
              <IconTextButton
                variant="success"
                size="md"
                icon={<FiCheck size={13} />}
                onClick={() => onCobrarComensal(comensal)}
                disabled={faltanteMixto > 0.01 || comensal.items.length === 0}
              >
                Cobrar
              </IconTextButton>
            </ButtonGroup>
          </div>
        </div>
      )}
    </div>
  );
};

export default SplitCustomerCard;