import { fetchWithAuth } from '../config/apiBase';

export const ticketService = {
  async print(htmlContent, options = {}) {
    try {
      // Intentar imprimir con el endpoint del backend primero
      const response = await fetchWithAuth('/api/tickets/print', {
        method: 'POST',
        body: JSON.stringify({
          html: htmlContent,
          printerName: options.printerName || 'POS-58',
          width: options.width || 300
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return;
        }
      }
      
      // Si el backend no tiene el endpoint, intentar con QZ Tray
      await this.printWithQZTray(htmlContent, options);
      
    } catch (error) {
      console.error('Error en ticketService.print:', error);
      // Fallback a impresión del navegador
      await this.printWithBrowser(htmlContent, options);
    }
  },
  
  async printWithBrowser(htmlContent, options) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('No se pudo abrir ventana de impresión');
      return;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Cierre</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 20px;
              width: ${options.width || '300px'};
              background: white;
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none; }
            }
            .ticket-header { text-align: center; margin-bottom: 20px; }
            .ticket-line { border-top: 1px dashed #000; margin: 10px 0; }
            .text-center { text-align: center; }
            .total { font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()" style="padding: 10px 20px; margin: 5px;">🖨️ Imprimir</button>
            <button onclick="window.close()" style="padding: 10px 20px; margin: 5px;">❌ Cerrar</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  },
  
  async printWithQZTray(htmlContent, options) {
    // Implementación para QZ Tray si está disponible
    // Verificar si estamos en el navegador y si qz existe
    if (typeof window !== 'undefined' && window.qz && window.qz.websocket) {
      try {
        // Usar window.qz en lugar de qz directamente
        const qz = window.qz;
        await qz.websocket.connect();
        const config = qz.configs.create(options.printerName || 'POS-58');
        
        // Para impresión de tickets, normalmente se necesita texto plano o ESC/POS
        // Convertir HTML a texto plano si es necesario
        const plainText = this.htmlToPlainText(htmlContent);
        await qz.print(config, plainText);
        
        await qz.websocket.disconnect();
        console.log('✅ Ticket impreso con QZ Tray');
      } catch (qzError) {
        console.error('Error con QZ Tray:', qzError);
        throw qzError;
      }
    } else {
      console.log('⚠️ QZ Tray no disponible, usando impresión de navegador');
      // Fallback a impresión de navegador
      await this.printWithBrowser(htmlContent, options);
    }
  },
  
  // Utilidad para convertir HTML a texto plano para impresoras térmicas
  htmlToPlainText(html) {
    // Crear un elemento temporal para extraer texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extraer texto
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Limpiar y formatear para impresión térmica
    text = text
      .replace(/\s+/g, ' ')  // Espacios múltiples
      .trim();
    
    // Agregar saltos de línea donde haya <br> o </div>
    text = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')  // Eliminar todas las etiquetas HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    return text;
  }
};