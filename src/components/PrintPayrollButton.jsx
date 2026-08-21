// components/PrintPayrollButton.jsx
import React, { useState } from 'react';
import { FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { IconTextButton } from './General/Button'; // ← Importar IconTextButton
import { usePrinterService } from '../services/usePrinterService';

export default function PrintPayrollButton({ 
  payroll, 
  details, 
  periodInfo,
  businessInfo,
  userName,
  printerTicket, 
  className,
  onPrintComplete,
  // Nuevas props para consistencia con otros botones
  variant = 'success',
  size = 'md',
  icon = <FiPrinter size={14} />,
  disabled = false,
  ...rest
}) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { print } = usePrinterService();

  const handlePrint = async () => {
    setError('');
    setSuccess('');
    
    if (!printerTicket || !printerTicket.name) {
      setError('⚠️ IMPRESORA NO DETECTADA, PRIMERO AGREGUE UNA IMPRESORA');
      return;
    }

    if (!payroll) {
      setError('No hay datos de nómina para imprimir');
      return;
    }

    setPrinting(true);

    try {
      const itemsList = [];
      const deductionsList = [];

      if (details && Array.isArray(details)) {
        details.forEach(detail => {
          if (detail.type === 'hourly_wage' || detail.type === 'daily_wage') {
            itemsList.push({
              concept: detail.concept || 'Sueldo base',
              amount: Number(detail.amount) || 0
            });
          } else if (detail.type === 'deduction') {
            deductionsList.push({
              concept: detail.concept || 'Deducción',
              amount: Number(detail.amount) || 0
            });
          } else {
            itemsList.push({
              concept: detail.concept || 'Ingreso',
              amount: Number(detail.amount) || 0
            });
          }
        });
      }

      if (itemsList.length === 0) {
        if (periodInfo?.payment_type === 'hourly') {
          itemsList.push({
            concept: `Horas trabajadas (${payroll?.total_hours || 0} h x $${Number(payroll?.hourly_rate || 0).toFixed(2)})`,
            amount: Number(payroll?.total_pay || 0)
          });
        } else {
          itemsList.push({
            concept: `Sueldo diario (${payroll?.days_worked || 1} días x $${Number(payroll?.daily_rate || 0).toFixed(2)})`,
            amount: Number(payroll?.total_pay || 0)
          });
        }
      }

      const data = {
        bizInfo: {
          company_name: businessInfo?.company_name || businessInfo?.trade_name || businessInfo?.name || 'MI NEGOCIO',
          trade_name: businessInfo?.trade_name || businessInfo?.company_name || businessInfo?.name || 'MI NEGOCIO',
          ruc: businessInfo?.ruc || '',
          address: businessInfo?.address || '',
          phone: businessInfo?.phone || ''
        },
        employee: {
          name: payroll?.full_name || 'N/A',
          id: payroll?.employee_id || ''
        },
        period: periodInfo?.period_text || 'N/A',
        payroll: {
          total_hours: payroll?.total_hours || 0,
          extra_hours: payroll?.extra_hours || 0,
          hourly_rate: payroll?.hourly_rate || 0,
          daily_rate: payroll?.daily_rate || 0,
          days_worked: payroll?.days_worked || 1,
          total_pay: payroll?.total_pay || 0
        },
        items: itemsList,
        deductions: deductionsList,
        totalEarnings: itemsList.reduce((sum, i) => sum + (i.amount || 0), 0),
        totalDeductions: deductionsList.reduce((sum, d) => sum + (d.amount || 0), 0),
        netSalary: Number(payroll?.total_pay || 0),
        printerFooter: printerTicket?.footer || "Gracias por su trabajo"
      };

      const result = await print('printer_main', 'payroll', data, false);

      if (result.success) {
        setSuccess('✅ Recibo impreso correctamente');
        setTimeout(() => setSuccess(''), 3000);
        if (onPrintComplete) onPrintComplete();
      } else {
        throw new Error(result.error || 'Error al imprimir');
      }

    } catch (err) {
      setError(err.message || 'Error al imprimir');
      imprimirHTMLFallback();
    } finally {
      setPrinting(false);
    }
  };

  const imprimirHTMLFallback = () => {
    const width = printerTicket?.width || 32;
    let text = '';
    const line = '='.repeat(width);
    const sep = '-'.repeat(width);
    
    text += line + '\n';
    const negocioNombre = businessInfo?.trade_name || businessInfo?.company_name || 'MI NEGOCIO';
    text += negocioNombre.padStart((width + negocioNombre.length) / 2) + '\n';
    text += line + '\n';
    text += 'RECIBO DE NÓMINA\n';
    text += sep + '\n';
    text += `Empleado: ${payroll?.full_name}\n`;
    text += `Período: ${periodInfo?.period_text}\n`;
    text += sep + '\n';
    text += `Total a pagar: $${Number(payroll?.total_pay || 0).toFixed(2)}\n`;
    text += sep + '\n';
    text += `Impreso: ${new Date().toLocaleString()}\n`;
    text += line + '\n\n';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Recibo de Nómina</title>
        <style>
          @page { margin: 0mm; size: ${width * 1.6}mm auto; }
          body { font-family: 'Courier New', monospace; font-size: 9pt; white-space: pre; margin: 5mm auto; width: ${width * 1.6}mm; color: #000; line-height: 1.3; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=450,height=650,toolbar=0,menubar=0');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      if (onPrintComplete) onPrintComplete();
      setSuccess('✅ Enviado a impresión (ventana del navegador)');
    } else {
      setError('Permite ventanas emergentes para imprimir');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
      <IconTextButton
        variant={variant}
        size={size}
        onClick={handlePrint}
        disabled={disabled || printing}
        loading={printing}
        icon={icon}
        className={className}
        block
        {...rest}
      >
        {printing ? 'Imprimiendo...' : 'Imprimir'}
      </IconTextButton>
      
      {error && (
        <div className="payroll-print-error">
          <FiAlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="payroll-print-success">
          <FiCheckCircle size={12} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}