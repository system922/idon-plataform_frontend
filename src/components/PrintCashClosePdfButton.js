import jsPDF from "jspdf";
import { fetchWithAuth } from '../config/apiBase';

export default function PrintCashClosePdfButton({ close, opening, summary }) {

  const download = async () => {
    try {
      // Obtener datos del negocio desde el endpoint
      const settingsRes = await fetchWithAuth('/api/settings');
      const settingsData = await settingsRes.json();
      const settings = settingsData?.data ?? settingsData ?? {};

      // Obtener datos de facturación electrónica (logo, RUC, etc.)
      const einvRes = await fetchWithAuth('/api/einvoicing/config');
      const einvData = einvRes.ok ? await einvRes.json() : null;

      // Obtener datos del usuario actual
      const userRes = await fetchWithAuth('/api/auth/me');
      const userData = userRes.ok ? await userRes.json() : null;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 20;

      // ============ ENCABEZADO AZUL ============
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text(settings.trade_name || settings.company_name || "NOMBRE DEL NEGOCIO", pageWidth / 2, y, { align: 'center' });
      
      y += 7;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      if (settings.address) {
        doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
        y += 5;
      }
      doc.text(`Tel: ${settings.phone || "N/A"} | RUC: ${settings.ruc || einvData?.ruc || "N/A"}`, pageWidth / 2, y, { align: 'center' });

      // ============ TÍTULO ============
      y = 55;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("REPORTE DE CIERRE DE CAJA", pageWidth / 2, y, { align: 'center' });

      // ============ INFO DEL REPORTE ============
      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const fechaCierre = new Date().toLocaleString('es-EC', { 
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      doc.text(`Fecha y Hora: ${fechaCierre}`, 15, y);
      y += 4;
      doc.text(`Usuario: ${userData?.name || userData?.username || "N/A"}`, 15, y);
      y += 4;
      doc.text(`Cargo: ${userData?.role || "Cajero"}`, 15, y);
      y += 4;
      doc.text(`ID Cierre: #${close?.id || Date.now()}`, 15, y);

      // ============ APERTURA DE CAJA ============
      y += 10;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 7, 'F');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("APERTURA DE CAJA", 18, y + 5);

      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const efectivoApertura = Number(opening?.total_efectivo || 0);
      const bancaApertura = Number(opening?.monto_banca || 0);
      const totalApertura = efectivoApertura + bancaApertura;
      
      doc.text(`Efectivo inicial:`, 18, y);
      doc.text(`$${efectivoApertura.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Banca inicial:`, 18, y);
      doc.text(`$${bancaApertura.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.setFont(undefined, 'bold');
      doc.text(`Total apertura:`, 18, y);
      doc.text(`$${totalApertura.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ INGRESOS POR VENTAS ============
      y += 10;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 7, 'F');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("INGRESOS POR VENTAS", 18, y + 5);

      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      let totalVentas = 0;
      
      if (summary?.metodos && summary.metodos.length > 0) {
        summary.metodos.forEach(m => {
          const monto = Number(m.total_cobrado || 0);
          totalVentas += monto;
          
          doc.text(`${m.payment_method}:`, 18, y);
          doc.text(`$${monto.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Sin ventas registradas", 18, y);
        y += 5;
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL VENTAS:`, 18, y);
      doc.text(`$${totalVentas.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ EGRESOS Y GASTOS ============
      y += 10;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 7, 'F');
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("EGRESOS Y GASTOS", 18, y + 5);

      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      let totalGastos = 0;
      
      if (summary?.gastos && summary.gastos.length > 0) {
        summary.gastos.forEach(g => {
          const monto = Number(g.monto || 0);
          totalGastos += monto;
          
          doc.text(`${g.concepto}:`, 18, y);
          doc.text(`$${monto.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("Sin egresos registrados", 18, y);
        y += 5;
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL EGRESOS:`, 18, y);
      doc.text(`$${totalGastos.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ CAJA ESPERADA (AZUL) ============
      y += 10;
      doc.setFillColor(52, 152, 219);
      doc.rect(15, y, pageWidth - 30, 22, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      y += 5;
      doc.text(`Apertura:`, 18, y);
      doc.text(`$${totalApertura.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 5;
      doc.text(`+ Ventas:`, 18, y);
      doc.text(`$${totalVentas.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 5;
      doc.text(`- Egresos:`, 18, y);
      doc.text(`$${totalGastos.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 6;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const cajaEsperada = totalApertura + totalVentas - totalGastos;
      doc.text(`CAJA ESPERADA (Sistema):`, 18, y);
      doc.text(`$${cajaEsperada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ CONTEO FÍSICO (VERDE) ============
      y += 12;
      doc.setFillColor(46, 204, 113);
      doc.rect(15, y, pageWidth - 30, 27, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      y += 5;
      doc.text("CONTEO FÍSICO DE CAJA", 18, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      const efectivoContado = Number(close?.cash_counted || 0);
      const transferenciaContada = Number(close?.transfer_counted || 0);
      const tarjetaContada = Number(close?.card_counted || 0);
      const propinaContada = Number(close?.tip_counted || 0);
      
      doc.text(`Efectivo contado:`, 18, y);
      doc.text(`$${efectivoContado.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Transferencias contadas:`, 18, y);
      doc.text(`$${transferenciaContada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Tarjetas contadas:`, 18, y);
      doc.text(`$${tarjetaContada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Propinas contadas:`, 18, y);
      doc.text(`$${propinaContada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      y += 6;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const totalContado = efectivoContado + transferenciaContada + tarjetaContada + propinaContada;
      doc.text(`TOTAL CONTADO:`, 18, y);
      doc.text(`$${totalContado.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ DIFERENCIA (ROJO/VERDE) ============
      y += 12;
      const diferencia = totalContado - cajaEsperada;
      const esCuadrado = Math.abs(diferencia) < 0.01;
      
      if (esCuadrado) {
        doc.setFillColor(34, 197, 94); // Verde
      } else if (diferencia > 0) {
        doc.setFillColor(59, 130, 246); // Azul
      } else {
        doc.setFillColor(239, 68, 68); // Rojo
      }
      
      doc.rect(15, y, pageWidth - 30, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      y += 5;
      doc.text(`Total esperado:`, 18, y);
      doc.text(`$${cajaEsperada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 5;
      doc.text(`Total contado:`, 18, y);
      doc.text(`$${totalContado.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      const diferenciaTexto = esCuadrado ? 'CUADRADO ✓' : diferencia > 0 ? 'SOBRANTE' : 'FALTANTE';
      doc.text(diferenciaTexto, 18, y);
      doc.text(`${diferencia > 0 ? '+' : ''}$${diferencia.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ OBSERVACIONES ============
      if (close?.remarks && close.remarks.trim()) {
        y += 12;
        doc.setFillColor(255, 243, 205);
        doc.rect(15, y, pageWidth - 30, 7, 'F');
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("OBSERVACIONES", 18, y + 5);

        y += 10;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        const maxWidth = pageWidth - 36;
        const lines = doc.splitTextToSize(close.remarks, maxWidth);
        lines.forEach(line => {
          if (y > pageHeight - 30) return; // Evitar overflow
          doc.text(line, 18, y);
          y += 4;
        });
      }

      // ============ PIE DE PÁGINA ============
      const footerY = pageHeight - 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, footerY, pageWidth - 15, footerY);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Firma del responsable", pageWidth / 2, footerY + 5, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text(`Generado el ${fechaCierre}`, pageWidth / 2, footerY + 10, { align: 'center' });

      // Guardar PDF
      const nombreArchivo = `cierre-caja-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Error al generar el reporte. Por favor, intenta nuevamente.');
    }
  };

  return (
    <button id="btn-pdf" className="btn-pdf" onClick={download}>
      📄 Descargar PDF
    </button>
  );
}