import React, { useState } from 'react';
import { FiFileText, FiDownload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fetchWithAuth } from '../config/apiBase';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

function drawSectionHeader(doc, text, y, pageWidth, r = 41, g = 128, b = 185) {
  doc.setFillColor(r, g, b);
  doc.rect(15, y, pageWidth - 30, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text(text, 18, y + 5);
  doc.setTextColor(0, 0, 0);
  return y + 10;
}

function drawRow(doc, label, value, y, pageWidth, bold = false) {
  doc.setFontSize(9);
  doc.setFont(undefined, bold ? 'bold' : 'normal');
  doc.text(label, 18, y);
  doc.text(value, pageWidth - 18, y, { align: 'right' });
  return y + 5;
}

function drawDivider(doc, y, pageWidth) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(15, y, pageWidth - 15, y);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  return y + 4;
}

// Captura un elemento DOM como imagen base64 usando html2canvas
async function captureElement(el) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#1e293b',
    logging: false,
  });
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width:   canvas.width,
    height:  canvas.height,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Botón reutilizable que genera un PDF de cualquier reporte con gráficos.
 *
 * Props:
 *   data        – objeto { sales, expenses, summary/totals }
 *   dateRange   – { from, to }
 *   groupBy     – 'day' | 'month' | 'category'
 *   title       – título del reporte
 *   chartRefs   – array de React refs apuntando a los contenedores de gráficos
 *   className   – clase CSS opcional
 */
export default function ReportPdfButton({
  data,
  dateRange,
  groupBy = 'day',
  title = 'Reporte Avanzado',
  chartRefs = [],
  className,
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const download = async () => {
    if (!data) return;
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      // ── Datos del negocio ─────────────────────────────────────────────────
      const settingsRes = await fetchWithAuth('/api/settings');
      const settingsRaw = settingsRes.ok ? await settingsRes.json() : {};
      const settings    = settingsRaw?.data ?? settingsRaw ?? {};

      // ── Capturar gráficos ANTES de abrir jsPDF ────────────────────────────
      const chartImages = [];
      for (const ref of chartRefs) {
        if (ref?.current) {
          try {
            const img = await captureElement(ref.current);
            chartImages.push(img);
          } catch {
            // si falla un gráfico, continuar sin él
          }
        }
      }

      // ── Configurar documento ──────────────────────────────────────────────
      const doc        = new jsPDF();
      const pageWidth  = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const marginX    = 15;
      const contentW   = pageWidth - marginX * 2;
      let y = 20;

      // ── Encabezado ────────────────────────────────────────────────────────
      doc.setFillColor(30, 40, 60);
      doc.rect(0, 0, pageWidth, 38, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(
        settings.trade_name || settings.company_name || 'IDON GESTIÓN',
        pageWidth / 2, y, { align: 'center' }
      );

      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (settings.address) {
        doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      if (settings.phone || settings.ruc) {
        doc.text(
          `Tel: ${settings.phone || 'N/A'}  |  RUC: ${settings.ruc || 'N/A'}`,
          pageWidth / 2, y, { align: 'center' }
        );
      }

      // ── Título ────────────────────────────────────────────────────────────
      y = 46;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(title.toUpperCase(), pageWidth / 2, y, { align: 'center' });

      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Periodo: ${dateRange?.from || '-'}  al  ${dateRange?.to || '-'}   |   Agrupado por: ${{ day: 'Dia', month: 'Mes', category: 'Categoria' }[groupBy] || groupBy}`,
        pageWidth / 2, y, { align: 'center' }
      );
      doc.text(
        `Generado: ${new Date().toLocaleString('es-EC')}`,
        pageWidth / 2, y + 4, { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
      y += 14;

      // ── Resumen ejecutivo (KPIs) ──────────────────────────────────────────
      const totals  = data.summary ?? data.totals ?? {};
      const totalV  = Number(totals.total_sales    ?? 0);
      const totalG  = Number(totals.total_expenses ?? 0);
      const netProf = Number(totals.net_profit     ?? (totalV - totalG));
      const margin  = totalV > 0 ? ((netProf / totalV) * 100).toFixed(1) : '0.0';

      y = drawSectionHeader(doc, 'RESUMEN EJECUTIVO', y, pageWidth);

      [
        ['Ventas Totales',     fmt(totalV),    false],
        ['Gastos Totales',     fmt(totalG),    false],
        ['Ganancia Neta',      fmt(netProf),   true ],
        ['Margen de Ganancia', `${margin}%`,   true ],
      ].forEach(([lbl, val, bold]) => {
        y = drawRow(doc, lbl, val, y, pageWidth, bold);
      });

      y = drawDivider(doc, y + 1, pageWidth);

      // ── Gráficos capturados ───────────────────────────────────────────────
      if (chartImages.length > 0) {
        y = drawSectionHeader(doc, 'GRÁFICOS', y, pageWidth);

        for (const img of chartImages) {
          // Calcular altura proporcional al ancho disponible
          const ratio     = img.height / img.width;
          const imgW      = contentW;
          const imgH      = imgW * ratio;

          // Nueva página si no cabe
          if (y + imgH > pageHeight - 25) {
            doc.addPage();
            y = 20;
          }

          doc.addImage(img.dataUrl, 'PNG', marginX, y, imgW, imgH);
          y += imgH + 8;
        }

        y = drawDivider(doc, y, pageWidth);
      }

      // ── Detalle por período ───────────────────────────────────────────────
      if (data.sales && data.sales.length > 0) {
        if (y > pageHeight - 50) { doc.addPage(); y = 20; }

        y = drawSectionHeader(doc, 'DETALLE POR PERÍODO', y, pageWidth);

        // Cabecera de columnas
        doc.setFillColor(240, 240, 240);
        doc.rect(marginX, y - 1, contentW, 6, 'F');
        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(60, 60, 60);

        const col = { fecha: 18, ventas: 78, gastos: 118, margen: pageWidth - 18 };
        doc.text('FECHA',   col.fecha,  y + 3.5);
        doc.text('VENTAS',  col.ventas, y + 3.5);
        doc.text('GASTOS',  col.gastos, y + 3.5);
        doc.text('MARGEN',  col.margen, y + 3.5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 7;

        let rowIdx = 0;
        data.sales.forEach((s) => {
          if (y > pageHeight - 28) { doc.addPage(); y = 20; }

          const key     = s.date ?? s.category;
          const gasto   = Number(data.expenses?.find(e => (e.date ?? e.category) === key)?.total_expenses ?? 0);
          const venta   = Number(s.total_sales ?? s.total ?? 0);
          const margenV = venta - gasto;
          const mColor  = margenV >= 0 ? [16, 185, 129] : [239, 68, 68];

          if (rowIdx % 2 === 0) {
            doc.setFillColor(248, 248, 248);
            doc.rect(marginX, y - 3.5, contentW, 5.5, 'F');
          }

          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.text(String(key ?? '—'), col.fecha,  y);
          doc.text(fmt(venta),         col.ventas, y);
          doc.text(fmt(gasto),         col.gastos, y);
          doc.setTextColor(...mColor);
          doc.text(fmt(margenV),       col.margen, y, { align: 'right' });
          doc.setTextColor(0, 0, 0);

          y += 5.5;
          rowIdx++;
        });

        // Fila totales
        if (y > pageHeight - 18) { doc.addPage(); y = 20; }
        doc.setFillColor(30, 40, 60);
        doc.rect(marginX, y - 1, contentW, 7, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('TOTALES',    col.fecha,  y + 4.5);
        doc.text(fmt(totalV),  col.ventas, y + 4.5);
        doc.text(fmt(totalG),  col.gastos, y + 4.5);
        doc.text(fmt(netProf), col.margen, y + 4.5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 11;
      }

      // ── Pie de página en cada página ──────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const fy = pageHeight - 12;
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.setFont(undefined, 'normal');
        doc.text('IDON | Plataforma de Gestión Multinegocios', marginX, fy);
        doc.text(
          `Página ${p} de ${totalPages}  |  ${new Date().toLocaleDateString('es-EC')}`,
          pageWidth - marginX, fy, { align: 'right' }
        );
      }

      // ── Guardar ────────────────────────────────────────────────────────────
      const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}_${dateRange?.from ?? 'sin-fecha'}_${dateRange?.to ?? ''}.pdf`;
      doc.save(fileName);

      setSuccess('PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error al generar PDF:', err);
      setError(err.message || 'Error al generar el PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <button
        type="button"
        onClick={download}
        disabled={generating || !data}
        className={className}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px',
          background: generating || !data
            ? 'rgba(104,66,254,0.35)'
            : 'linear-gradient(135deg,#6842fe,#4a1dcc)',
          color: '#fff', border: 'none', borderRadius: 8,
          cursor: generating || !data ? 'not-allowed' : 'pointer',
          fontWeight: 700, fontSize: 13,
          transition: 'opacity 0.2s',
          opacity: generating ? 0.7 : 1,
        }}
      >
        <FiFileText size={15} />
        {generating ? 'Generando PDF...' : 'Exportar PDF'}
        <FiDownload size={14} />
      </button>

      {error && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#ef4444' }}>
          <FiAlertCircle size={12} /> {error}
        </span>
      )}
      {success && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#10b981' }}>
          <FiCheckCircle size={12} /> {success}
        </span>
      )}
    </div>
  );
}
