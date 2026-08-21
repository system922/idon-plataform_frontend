// src/pages/cashier/components/PaymentForm/CreditNotePayment.jsx
import React from 'react';
import { Check, X } from 'react-feather';
import { MdOutlineReceiptLong } from 'react-icons/md';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { CiCreditCard1 } from "react-icons/ci";
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import { IoFileTrayFull } from 'react-icons/io5';
import { CiWarning } from 'react-icons/ci';
import { BsCurrencyExchange } from 'react-icons/bs';
import Input from '../../../components/General/Input';
import Button, { IconTextButton, ButtonGroup } from '../../../components/General/Button';

const CreditNotePayment = ({
  creditNotesAvailable,
  cnLoading,
  appliedCreditNote,
  setAppliedCreditNote,
  creditNoteApplyAmt,
  setCreditNoteApplyAmt,
  cnMetodoRestante,
  setCnMetodoRestante,
  cnCashPaid,
  setCnCashPaid,
  cnCashPaidRaw,
  setCnCashPaidRaw,
  cnCardRef,
  setCnCardRef,
  cnTransferRef,
  setCnTransferRef,
  totalOrdenConDescuento,
  printLoading,
  onPagar,
  onCancelar,
  onLoadCreditNotes,
  fmt,
}) => {
  const ncBalance = appliedCreditNote ? parseFloat(appliedCreditNote.remaining_balance) : 0;
  const ncApply = parseFloat(creditNoteApplyAmt) || 0;
  const ncRestante = Math.max(0, totalOrdenConDescuento - ncApply);
  const ncCambio = cnMetodoRestante === 'cash' ? Math.max(0, (parseFloat(cnCashPaid) || 0) - ncRestante) : 0;

  const isDisabled = () => {
    if (!appliedCreditNote || !creditNoteApplyAmt) return true;
    const a = parseFloat(creditNoteApplyAmt) || 0;
    const r = Math.max(0, totalOrdenConDescuento - a);
    if (r <= 0.01) return false;
    if (!cnMetodoRestante) return true;
    if (cnMetodoRestante === 'cash') return (parseFloat(cnCashPaid) || 0) < r - 0.01;
    if (cnMetodoRestante === 'card') return !cnCardRef;
    if (cnMetodoRestante === 'transfer') return !cnTransferRef;
    return false;
  };

  const handleCashChange = (value) => {
    let d = value.replace(/\D/g, '');
    if (!d) d = '0';
    if (d.length > 8) d = d.slice(0, 8);
    setCnCashPaidRaw(d);
    setCnCashPaid((parseInt(d, 10) / 100).toFixed(2));
  };

  return (
    <div style={{ 
      marginTop: 10, 
      background: 'rgba(104,66,254,0.06)', 
      border: '1px solid rgba(104,66,254,0.2)', 
      borderRadius: 10, 
      padding: '12px 14px' 
    }}>
      <div style={{ 
        fontSize: 12, 
        fontWeight: 700, 
        color: '#a78bfa', 
        marginBottom: 8, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 6 
      }}>
        <MdOutlineReceiptLong size={14} /> Notas de crédito disponibles
        <IconTextButton
          variant="purple"
          size="sm"
          onClick={onLoadCreditNotes}
          disabled={cnLoading}
          style={{ marginLeft: 'auto' }}
        >
          {cnLoading ? '...' : '↺ Buscar'}
        </IconTextButton>
      </div>
      
      {cnLoading && <div style={{ fontSize: 12, color: '#94a3b8' }}>Buscando...</div>}
      
      {!cnLoading && creditNotesAvailable.length === 0 && (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          No hay notas de crédito disponibles para este cliente.
        </div>
      )}
      
      {creditNotesAvailable.map(cn => {
        const balance = parseFloat(cn.remaining_balance);
        const isSelected = appliedCreditNote?.id === cn.id;
        return (
          <div 
            key={cn.id}
            onClick={() => { 
              setAppliedCreditNote(cn); 
              setCreditNoteApplyAmt(Math.min(balance, totalOrdenConDescuento).toFixed(2)); 
            }}
            style={{ 
              cursor: 'pointer', 
              padding: '8px 10px', 
              borderRadius: 8, 
              marginBottom: 6, 
              border: `1.5px solid ${isSelected ? '#7c3aed' : 'rgba(104,66,254,0.2)'}`, 
              background: isSelected ? 'rgba(124,58,237,0.12)' : 'rgba(15,23,42,0.4)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ fontWeight: 700, color: '#a78bfa' }}>NC#{cn.id} · Fac. {cn.reference_invoice || '—'}</span>
              <span style={{ fontWeight: 800, color: '#34d399' }}>Saldo: ${balance.toFixed(2)}</span>
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{(cn.reason || '').substring(0, 60)}</div>
          </div>
        );
      })}
      
      {appliedCreditNote && (
        <>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>Monto a aplicar:</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={ncBalance}
              value={creditNoteApplyAmt}
              onChange={(value) => { 
                setCreditNoteApplyAmt(value); 
                setCnMetodoRestante(''); 
                setCnCashPaid(''); 
                setCnCardRef(''); 
                setCnTransferRef(''); 
              }}
              size="md"
              style={{ width: 90 }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>/ ${ncBalance.toFixed(2)} disp.</span>
          </div>

          {ncRestante > 0.01 && (
            <div style={{ 
              marginTop: 10, 
              background: 'rgba(245,158,11,0.06)', 
              border: '1px solid rgba(245,158,11,0.25)', 
              borderRadius: 8, 
              padding: '10px 12px' 
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
                Restante a pagar: <strong>{fmt(ncRestante)}</strong> — ¿cómo paga el cliente?
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {[
                  { key: 'cash', label: 'Efectivo', Icon: FaHandHoldingDollar },
                  { key: 'card', label: 'Tarjeta', Icon: CiCreditCard1 },
                  { key: 'transfer', label: 'Transferencia', Icon: FaMoneyBillTransfer },
                ].map(({ key, label, Icon }) => (
                  <IconTextButton
                    key={key}
                    variant={cnMetodoRestante === key ? 'warning' : 'secondary'}
                    size="sm"
                    icon={<Icon size={13} />}
                    onClick={() => { 
                      setCnMetodoRestante(key); 
                      setCnCashPaid(''); 
                      setCnCashPaidRaw(''); 
                      setCnCardRef(''); 
                      setCnTransferRef(''); 
                    }}
                    outline={cnMetodoRestante !== key}
                  >
                    {label}
                  </IconTextButton>
                ))}
              </div>

              {cnMetodoRestante === 'cash' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, color: '#94a3b8', flexShrink: 0 }}>Recibido:</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={cnCashPaid}
                    onChange={handleCashChange}
                    placeholder="0.00"
                    size="md"
                    style={{ width: 90 }}
                  />
                  {ncCambio > 0 && <span style={{ fontSize: 12, color: '#34d399' }}>Cambio: {fmt(ncCambio)}</span>}
                </div>
              )}
              
              {(cnMetodoRestante === 'card' || cnMetodoRestante === 'transfer') && (
                <Input
                  type="text"
                  value={cnMetodoRestante === 'card' ? cnCardRef : cnTransferRef}
                  onChange={cnMetodoRestante === 'card' ? setCnCardRef : setCnTransferRef}
                  placeholder="Número de referencia"
                  size="md"
                />
              )}
            </div>
          )}
        </>
      )}
      
      <div className="pay-inline-actions" style={{ marginTop: 10 }}>
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<Check size={15} />}
            onClick={onPagar}
            disabled={printLoading || isDisabled()}
            loading={printLoading}
          >
            COBRAR
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="md"
            icon={<X size={13} />}
            onClick={onCancelar}
          >
            Cancelar
          </IconTextButton>
        </ButtonGroup>
      </div>
    </div>
  );
};

export default CreditNotePayment;