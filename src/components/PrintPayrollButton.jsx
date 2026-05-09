import React, { useState } from 'react';
import { FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { usePrinterService } from '../services/usePrinterService';
import { buildPayrollPrintText } from '../Helper/buildPayrollPrintText';

export default function PrintPayrollButton({ 
  payroll, 
  details, 
  periodInfo,
  businessInfo,
  userName,
  printerTicket, 
  className,
  onPrintComplete
}) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { print } = usePrinterService();

  const handlePrint = async () => {
    setError('');
    setSuccess('');

    // Validaciones
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
      // Preparar datos para el ticket de nómina
      const data = {
        bizInfo: businessInfo,
        employee: {
          name: payroll.full_name,
          id: payroll.employee_id
        },
        payroll: {
          total_hours: payroll.total_hours,
          extra_hours: payroll.extra_hours,
          hourly_rate: payroll.hourly_rate,
          daily_rate: payroll.daily_rate,
          days_worked: payroll.days_worked || 1,
          total_pay: payroll.total_pay
        },
        period: periodInfo.period_text,
        items: [],
        deductions: [],
        totalEarnings: payroll.total_pay,
        totalDeductions: 0,
        netSalary: payroll.total_pay,
        printerFooter: printerTicket.footer || "Gracias por su trabajo"
      };

      // Usar el servicio de impresión con template 'payroll'
      const result = await print('printer_main', 'payroll', data, false);

      if (result.success) {
        setSuccess('✅ Recibo impreso correctamente');
        setTimeout(() => setSuccess(''), 3000);
        if (onPrintComplete) onPrintComplete();
      } else {
        throw new Error(result.error || 'Error al imprimir');
      }

    } catch (err) {
      console.error('Error imprimiendo nómina:', err);
      setError(err.message || 'Error al imprimir');
      
      // Fallback: imprimir en navegador
      imprimirHTMLFallback();
    } finally {
      setPrinting(false);
    }
  };

  // Función de fallback para imprimir en navegador
  const imprimirHTMLFallback = () => {
    const width = printerTicket?.width || 32;
    
    const text = buildPayrollPrintText(
      payroll,
      details,
      periodInfo,
      businessInfo,
      userName,
      width,
      printerTicket?.footer
    );

    const escaped = text
      .split('\n')
      .map(line => 
        line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      )
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Recibo de Nómina</title>
        <style>
          @page { 
            margin: 0mm; 
            size: ${width * 1.6}mm auto; 
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 9pt; 
            white-space: pre; 
            margin: 5mm auto; 
            width: ${width * 1.6}mm; 
            color: #000; 
            line-height: 1.3; 
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>${escaped}</body>
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
    <div className="print-button-wrapper" style={{ flex: 1 }}>
      <button 
        className={className || "btn-print-modern"} 
        onClick={handlePrint}
        disabled={printing}
        type="button"
        style={{
          width: '100%',
          padding: '10px',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontWeight: 600,
          cursor: printing ? 'not-allowed' : 'pointer',
          opacity: printing ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}
      >
        <FiPrinter size={16} />
        {printing ? 'Imprimiendo...' : 'Imprimir'}
      </button>
      
      {error && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <FiAlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          color: '#10b981',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <FiCheckCircle size={12} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}