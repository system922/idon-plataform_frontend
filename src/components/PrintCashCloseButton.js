import React, { useState } from 'react';
import qz from 'qz-tray';
import { buildCashCloseText } from '../Helper/buildCashCloseText';

export default function PrintCashCloseButtonAdvanced({ 
  close, 
  datos, 
  bizInfo, 
  printerConnected, 
  printerTicket, 
  className 
}) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');

  const handlePrint = async () => {
    // Limpiar errores previos
    setError('');

    // Validaciones
    if (!printerTicket || !printerTicket.name) {
      setError('IMPRESORAS NO DETECTADAS, PRIMERO AGREGUE UNA IMPRESORA PARA IMPRIMIR');
      return;
    }

    if (!close) {
      setError('No hay datos de cierre para imprimir');
      return;
    }

    setPrinting(true);

    try {
      const printerName = printerTicket.name || 'POS-58';
      const width       = printerTicket.width || 32;
      const footer      = printerTicket.footer || null;

      // Construir el texto del cierre
      const text = buildCashCloseText(
        close, 
        datos, 
        close.closing_user_id, 
        bizInfo, 
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

      console.log('✅ Cierre de caja impreso correctamente');

      // Opcional: Mostrar mensaje de éxito
      setTimeout(() => {
        alert('✅ Cierre de caja impreso correctamente');
      }, 100);

    } catch (err) {
      console.error('Error imprimiendo cierre de caja:', err);
      setError(err.message || 'Error al imprimir');

      // Intentar fallback HTML
      if (!printerConnected) {
        imprimirHTML(
          buildCashCloseText(close, datos, close.closing_user_id, bizInfo, printerTicket.width || 32, printerTicket.footer),
          printerTicket.width || 32
        );
      }
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
        <title>Cierre de Caja</title>
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

    const printWindow = window.open('', '_blank', 'width=340,height=700,toolbar=0,menubar=0');
    
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
    <div>
      <button 
        className={className || "modern-btn btn-print"} 
        onClick={handlePrint}
        disabled={printing}
        type="button"
      >
        {printing ? '🖨️ Imprimiendo...' : '🖨️ Imprimir Cierre de Caja'}
      </button>
      
      {error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '8px',
          color: '#fecaca',
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}