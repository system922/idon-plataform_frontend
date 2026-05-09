import React, { useState } from 'react';
import { FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import qz from 'qz-tray';
import { buildPayrollPrintText } from '../Helper/buildPayrollPrintText';

export default function PrintPayrollButton({ 
  payroll, 
  details, 
  periodInfo,
  businessInfo,
  userName,
  printerTicket, 
  className 
}) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePrint = async () => {
    setError('');
    setSuccess('');

    // Validaciones
    if (!printerTicket || !printerTicket.name) {
      setError('⚠️ IMPRESORA NO DETECTADA, PRIMERO AGREGUE UNA IMPRESORA PARA IMPRIMIR');
      return;
    }

    if (!payroll) {
      setError('No hay datos de nómina para imprimir');
      return;
    }

    setPrinting(true);

    try {
      const printerName = printerTicket.name;
      const width = printerTicket.width || 32;
      const footer = printerTicket.footer || null;

      // Construir el texto de la nómina
      const text = buildPayrollPrintText(
        payroll,
        details,
        periodInfo,
        businessInfo,
        userName,
        width,
        footer
      );

      // Verificar conexión con QZ Tray
      if (!qz.websocket.isActive()) {
        throw new Error('QZ Tray no está conectado. Por favor, inicia QZ Tray.');
      }

      // Configurar impresora
      const config = qz.configs.create(printerName, {
        encoding: 'UTF-8',
        endOfDoc: '\n\n\n'
      });

      // Imprimir
      await qz.print(config, [
        {
          type: 'raw',
          format: 'plain',
          data: text
        }
      ]);

      setSuccess('✅ Recibo de nómina impreso correctamente');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error imprimiendo nómina:', err);
      setError(err.message || 'Error al imprimir');

      // Fallback: imprimir en navegador
      imprimirHTML(
        buildPayrollPrintText(
          payroll,
          details,
          periodInfo,
          businessInfo,
          userName,
          printerTicket?.width || 32,
          printerTicket?.footer
        ),
        printerTicket?.width || 32
      );
    } finally {
      setPrinting(false);
    }
  };

  // Función de fallback para imprimir en navegador
  const imprimirHTML = (text, width) => {
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
            margin: 3mm; 
            size: ${width * 2}mm auto; 
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10pt; 
            white-space: pre; 
            width: ${width * 1.6}mm; 
            margin: 0 auto; 
            color: #000; 
            line-height: 1.3; 
          }
        </style>
      </head>
      <body>${escaped}</body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0');
    
    if (!printWindow) {
      setError('Permite ventanas emergentes para imprimir');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  return (
    <div className="print-button-wrapper">
      <button 
        className={className || "btn-print-modern"} 
        onClick={handlePrint}
        disabled={printing}
        type="button"
      >
        <FiPrinter className="btn-icon" />
        {printing ? 'Imprimiendo...' : 'Imprimir'}
      </button>
      
      {error && (
        <div className="print-error">
          <FiAlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="print-success">
          <FiCheckCircle size={14} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}