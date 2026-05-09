// components/PrintPayrollButton.jsx
import React, { useState } from 'react';
import { FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { usePrinterService } from '../services/usePrinterService';

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
    
    console.log('\n========== 🚀 INICIO IMPRESIÓN TÉRMICA NÓMINA ==========');
    console.log('📄 payroll recibido:', payroll);
    console.log('📋 details recibido:', details);
    console.log('🏢 businessInfo recibido:', businessInfo);
    console.log('🖨️ printerTicket recibido:', printerTicket);
    console.log('👤 userName:', userName);
    console.log('📅 periodInfo:', periodInfo);

    // Validaciones
    if (!printerTicket || !printerTicket.name) {
      console.error('❌ Error: Impresora no detectada');
      setError('⚠️ IMPRESORA NO DETECTADA, PRIMERO AGREGUE UNA IMPRESORA');
      return;
    }

    if (!payroll) {
      console.error('❌ Error: No hay datos de nómina');
      setError('No hay datos de nómina para imprimir');
      return;
    }

    setPrinting(true);

    try {
      // Construir items (ingresos) y deductions (deducciones)
      const itemsList = [];
      const deductionsList = [];
      
      console.log('📊 Procesando details:', details);
      
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

      console.log('💰 itemsList construido:', itemsList);
      console.log('📉 deductionsList construido:', deductionsList);

      // Si no hay detalles, agregar el pago base
      if (itemsList.length === 0) {
        console.log('⚠️ No hay details, usando pago base');
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
        console.log('✅ itemsList después de fallback:', itemsList);
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

      console.log('📦 Data construida para impresión:', JSON.stringify(data, null, 2));
      console.log('📡 Llamando a print() con template "payroll"...');

      // Usar el servicio de impresión con template 'payroll'
      const result = await print('printer_main', 'payroll', data, false);

      console.log('📨 Respuesta de print():', result);

      if (result.success) {
        console.log('✅ Impresión térmica exitosa');
        setSuccess('✅ Recibo impreso correctamente');
        setTimeout(() => setSuccess(''), 3000);
        if (onPrintComplete) onPrintComplete();
      } else {
        console.error('❌ Error en print():', result.error);
        throw new Error(result.error || 'Error al imprimir');
      }

    } catch (err) {
      console.error('❌ Error en handlePrint:', err);
      console.error('Stack trace:', err.stack);
      setError(err.message || 'Error al imprimir');
      
      // Fallback: imprimir en navegador
      console.log('🔄 Ejecutando fallback: impresión en navegador');
      imprimirHTMLFallback();
    } finally {
      setPrinting(false);
      console.log('========== 🏁 FIN IMPRESIÓN TÉRMICA NÓMINA ==========\n');
    }
  };

  const imprimirHTMLFallback = () => {
    console.log('🖨️ Iniciando fallback de impresión en navegador...');
    
    const width = printerTicket?.width || 32;
    console.log('📏 Ancho de papel:', width);
    
    // Construir texto simple para fallback
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
    
    console.log('📝 Texto a imprimir (fallback):\n', text);

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
      console.log('✅ Ventana de impresión abierta');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      if (onPrintComplete) onPrintComplete();
      setSuccess('✅ Enviado a impresión (ventana del navegador)');
    } else {
      console.error('❌ No se pudo abrir ventana de impresión - posiblemente bloqueada');
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