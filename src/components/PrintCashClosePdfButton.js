import React, { useState } from 'react';
import { FiFileText, FiAlertCircle, FiCheckCircle, FiDownload } from 'react-icons/fi';
import jsPDF from "jspdf";
import { fetchWithAuth } from '../config/apiBase';

// Función para obtener el usuario operador del localStorage
function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

export default function PrintCashClosePdfButton({ close, opening, summary, className }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const download = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      // Obtener datos del negocio desde el endpoint
      const settingsRes = await fetchWithAuth('/api/settings');
      const settingsData = await settingsRes.json();
      const settings = settingsData?.data ?? settingsData ?? {};

      // Obtener datos de facturación electrónica (logo, RUC, etc.)
      const einvRes = await fetchWithAuth('/api/einvoicing/config');
      const einvData = einvRes.ok ? await einvRes.json() : null;

      // Obtener datos del usuario operador desde localStorage
      const operador = getOperatorUser();
      
      const userName = operador?.nombre || 
                       operador?.name || 
                       operador?.username || 
                       operador?.email?.split('@')[0] || 
                       "N/A";
      
      const userRole = operador?.role || 
                       operador?.rol || 
                       operador?.cargo || 
                       "Cajero/a";

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 20;

      // ============ ENCABEZADO ============
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(settings.trade_name || settings.company_name || "NOMBRE DEL NEGOCIO", pageWidth / 2, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (settings.address) {
        doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      doc.text(`Tel: ${settings.phone || "N/A"} | RUC: ${settings.ruc || einvData?.ruc || "N/A"}`, pageWidth / 2, y, { align: 'center' });

      // ============ TÍTULO ============
      y = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("REPORTE DE CIERRE DE CAJA", pageWidth / 2, y, { align: 'center' });

      // ============ INFO DEL REPORTE ============
      y += 8;
      doc.setFontSize(8);
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
      doc.text(`Usuario: ${userName}`, 15, y);
      y += 4;
      doc.text(`Cargo: ${userRole}`, 15, y);
      y += 4;
      doc.text(`ID Cierre: #${close?.id || Date.now()}`, 15, y);

      // ============ APERTURA DE CAJA ============
      y += 8;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("APERTURA DE CAJA", 18, y + 4);

      y += 9;
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
      y += 8;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("INGRESOS POR VENTAS", 18, y + 4);

      y += 9;
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
      y += 8;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("EGRESOS Y GASTOS", 18, y + 4);

      y += 9;
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

      // ============ CALCULAR VALORES ============
      const efectivoContado = Number(close?.cash_counted || 0);
      const transferenciaContada = Number(close?.transfer_counted || 0);
      const tarjetaContada = Number(close?.card_counted || 0);
      const propinaContada = Number(close?.tip_counted || 0);
      const totalContado = efectivoContado + transferenciaContada + tarjetaContada + propinaContada;
      const cajaEsperada = totalApertura + totalVentas - totalGastos;
      const diferencia = totalContado - cajaEsperada;
      const esCuadrado = Math.abs(diferencia) < 0.01;

      // ============ CONTEO FÍSICO ============
      y += 10;
      const alturaBloque = 50;
      
      doc.setFillColor(46, 204, 113);
      doc.rect(15, y, pageWidth - 30, alturaBloque, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      y += 5;
      doc.text("CONTEO FÍSICO DE CAJA", 18, y);

      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
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
      
      y += 7;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.3);
      doc.line(18, y, pageWidth - 18, y);
      
      y += 5;
      doc.setFontSize(9);
      doc.text(`Total esperado:`, 18, y);
      doc.text(`$${cajaEsperada.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 5;
      doc.text(`Total contado:`, 18, y);
      doc.text(`$${totalContado.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      
      y += 6;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const diferenciaTexto = esCuadrado ? 'CUADRADO ✓' : diferencia > 0 ? 'SOBRANTE:' : 'FALTANTE:';
      doc.text(diferenciaTexto, 18, y);
      doc.text(`$${Math.abs(diferencia).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);

      // ============ OBSERVACIONES ============
      y += 10;
      if (close?.remarks && close.remarks.trim()) {
        doc.setFillColor(255, 243, 205);
        doc.rect(15, y, pageWidth - 30, 6, 'F');
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("OBSERVACIONES", 18, y + 4);

        y += 9;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        
        const maxWidth = pageWidth - 36;
        const lines = doc.splitTextToSize(close.remarks, maxWidth);
        lines.forEach(line => {
          if (y > pageHeight - 30) return;
          doc.text(line, 18, y);
          y += 4;
        });
      }

      // ============ PIE DE PÁGINA ============
      const footerY = pageHeight - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(pageWidth / 2 - 30, footerY, pageWidth / 2 + 30, footerY);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Firma del responsable", pageWidth / 2, footerY + 5, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text(`Generado el ${new Date().toLocaleDateString('es-EC')} a las ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, footerY + 10, { align: 'center' });

      // Guardar PDF
      const nombreArchivo = `cierre-caja-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(nombreArchivo);

      setSuccess('PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error al generar el PDF:', error);
      setError(error.message || 'Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="pdf-button-wrapper">
      <button 
        className={className || "btn-pdf-modern"} 
        onClick={download}
        disabled={generating}
        type="button"
      >
        <FiFileText className="btn-icon" />
        {generating ? 'Generando PDF...' : 'Descargar'}
        <FiDownload className="btn-icon-right" />
      </button>
      
      {error && (
        <div className="pdf-error">
          <FiAlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="pdf-success">
          <FiCheckCircle size={14} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}