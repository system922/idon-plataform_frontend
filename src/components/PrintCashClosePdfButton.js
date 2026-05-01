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
      let y = 15;

      // ============ ENCABEZADO CON DATOS DEL NEGOCIO ============
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(settings.trade_name || settings.company_name || "NOMBRE DEL NEGOCIO", pageWidth / 2, y, { align: 'center' });
      
      y += 7;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(settings.address || "Dirección del negocio", pageWidth / 2, y, { align: 'center' });
      
      y += 5;
      const contactInfo = `Tel: ${settings.phone || "N/A"} | RUC: ${settings.ruc || einvData?.ruc || "N/A"}`;
      doc.text(contactInfo, pageWidth / 2, y, { align: 'center' });

      // ============ TÍTULO DEL REPORTE ============
      y = 45;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text("REPORTE DE CIERRE DE CAJA", pageWidth / 2, y, { align: 'center' });

      // ============ INFORMACIÓN DEL REPORTE ============
      y += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      const fechaCierre = new Date().toLocaleString('es-EC', { 
        dateStyle: 'full', 
        timeStyle: 'short' 
      });
      
      doc.text(`Fecha y Hora: ${fechaCierre}`, 15, y);
      y += 5;
      doc.text(`Usuario: ${userData?.name || userData?.username || "N/A"}`, 15, y);
      y += 5;
      doc.text(`Cargo: ${userData?.role || "Cajero"}`, 15, y);
      y += 5;
      doc.text(`ID Cierre: ${close?.id || Date.now()}`, 15, y);

      // Línea separadora
      y += 5;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);

      // ============ SECCIÓN APERTURA ============
      y += 10;
      doc.setFillColor(236, 240, 241);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(52, 73, 94);
      doc.text("APERTURA DE CAJA", 18, y);

      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);
      
      const efectivoApertura = Number(opening?.total_efectivo || 0).toFixed(2);
      const bancaApertura = Number(opening?.monto_banca || 0).toFixed(2);
      const totalApertura = (Number(efectivoApertura) + Number(bancaApertura)).toFixed(2);
      
      doc.text(`Efectivo inicial:`, 20, y);
      doc.text(`$${efectivoApertura}`, pageWidth - 20, y, { align: 'right' });
      y += 6;
      
      doc.text(`Banca inicial:`, 20, y);
      doc.text(`$${bancaApertura}`, pageWidth - 20, y, { align: 'right' });
      y += 6;
      
      doc.setFont(undefined, 'bold');
      doc.text(`Total apertura:`, 20, y);
      doc.text(`$${totalApertura}`, pageWidth - 20, y, { align: 'right' });

      // ============ SECCIÓN VENTAS ============
      y += 12;
      doc.setFillColor(236, 240, 241);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(52, 73, 94);
      doc.text("INGRESOS POR VENTAS", 18, y);

      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      let totalVentas = 0;
      
      if (summary?.metodos && summary.metodos.length > 0) {
        summary.metodos.forEach(m => {
          const monto = Number(m.total_cobrado || 0).toFixed(2);
          totalVentas += Number(monto);
          
          doc.text(`${m.payment_method}:`, 20, y);
          doc.text(`$${monto}`, pageWidth - 20, y, { align: 'right' });
          y += 6;
        });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("No hay ventas registradas", 20, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(`TOTAL VENTAS:`, 20, y);
      doc.text(`$${totalVentas.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

      // ============ SECCIÓN EGRESOS ============
      y += 12;
      doc.setFillColor(236, 240, 241);
      doc.rect(15, y - 5, pageWidth - 30, 8, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(52, 73, 94);
      doc.text("EGRESOS Y GASTOS", 18, y);

      y += 8;
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(0, 0, 0);

      let totalGastos = 0;
      
      if (summary?.gastos && summary.gastos.length > 0) {
        summary.gastos.forEach(g => {
          const monto = Number(g.monto || 0).toFixed(2);
          totalGastos += Number(monto);
          
          doc.text(`${g.concepto}:`, 20, y);
          doc.text(`$${monto}`, pageWidth - 20, y, { align: 'right' });
          y += 6;
        });
      } else {
        doc.setTextColor(150, 150, 150);
        doc.text("No hay egresos registrados", 20, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
      }

      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text(`TOTAL EGRESOS:`, 20, y);
      doc.text(`$${totalGastos.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });

      // ============ RESUMEN FINAL ============
      y += 12;
      doc.setFillColor(52, 152, 219);
      doc.rect(15, y - 5, pageWidth - 30, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      
      y += 2;
      doc.text(`Total Ventas:`, 20, y);
      doc.text(`$${totalVentas.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
      
      y += 6;
      doc.text(`Total Egresos:`, 20, y);
      doc.text(`-$${totalGastos.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
      
      y += 8;
      doc.setFontSize(13);
      const cajaFinal = (totalVentas - totalGastos).toFixed(2);
      doc.text(`CAJA FINAL:`, 20, y);
      doc.text(`$${cajaFinal}`, pageWidth - 20, y, { align: 'right' });

      // ============ PIE DE PÁGINA ============
      y += 15;
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("_".repeat(80), pageWidth / 2, y, { align: 'center' });
      y += 5;
      doc.text("Firma del responsable", pageWidth / 2, y, { align: 'center' });
      
      y += 10;
      doc.setFontSize(7);
      doc.text(`Documento generado automáticamente el ${fechaCierre}`, pageWidth / 2, y, { align: 'center' });

      // Guardar PDF
      const nombreArchivo = `cierre-caja-${new Date().toISOString().split('T')[0]}-${Date.now()}.pdf`;
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