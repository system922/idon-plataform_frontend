// src/components/ReportPdfButton.jsx
import React, { useState } from 'react';
import { FiFileText, FiDownload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { fetchWithAuth } from '../config/apiBase';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;

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

function drawDivider(doc, y, pageWidth) {
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(15, y, pageWidth - 15, y);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  return y + 4;
}

async function captureElement(el) {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#1e293b',
    logging: false,
  });
  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

function drawTable(doc, columns, rows, pageWidth, pageHeight, startY, marginX = 15) {
  let y = startY;
  const totalWidth = pageWidth - marginX * 2;
  const baseColWidth = totalWidth / columns.length;
  const colWidths = {};
  columns.forEach((col, idx) => {
    colWidths[idx] = col.width ? (col.width / 100) * totalWidth : baseColWidth;
  });

  // Cabecera
  doc.setFillColor(240, 240, 240);
  doc.rect(marginX, y - 1, totalWidth, 6, 'F');
  doc.setFontSize(8);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(60, 60, 60);
  let xAcc = marginX;
  columns.forEach((col, idx) => {
    doc.text(String(col.label), xAcc + 2, y + 3.5);
    xAcc += colWidths[idx];
  });
  doc.setTextColor(0, 0, 0);
  y += 7;

  for (let i = 0; i < rows.length; i++) {
    if (y > pageHeight - 28) {
      doc.addPage();
      y = 20;
      // Redibujar cabecera
      doc.setFillColor(240, 240, 240);
      doc.rect(marginX, y - 1, totalWidth, 6, 'F');
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(60, 60, 60);
      xAcc = marginX;
      columns.forEach((col, idx) => {
        doc.text(String(col.label), xAcc + 2, y + 3.5);
        xAcc += colWidths[idx];
      });
      doc.setTextColor(0, 0, 0);
      y += 7;
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(marginX, y - 3.5, totalWidth, 5.5, 'F');
    }
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    xAcc = marginX;
    columns.forEach((col, idx) => {
      let value = rows[i][col.key] ?? '';
      if (col.formatter) value = col.formatter(value);
      doc.text(String(value), xAcc + 2, y);
      xAcc += colWidths[idx];
    });
    y += 5.5;
  }
  return y + 4;
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function ReportPdfButton({ customConfig, dateRange, groupBy, title, data, chartRefs, className }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const download = async () => {
    // Determinar configuración: prioriza customConfig, sino crea una desde los props antiguos
    let config = customConfig;
    if (!config && data) {
      // Modo retrocompatibilidad (para ReportsAdvanced donde se usan props antiguas)
      const totals = data.summary ?? data.totals ?? {};
      config = {
        title: title || 'Reporte',
        kpis: [
          { label: 'Ventas Totales', value: totals.total_sales, formatter: fmtCurrency },
          { label: 'Gastos Totales', value: totals.total_expenses, formatter: fmtCurrency },
          { label: 'Ganancia Neta', value: totals.net_profit, formatter: fmtCurrency, bold: true },
          { label: 'Margen de Ganancia', value: totals.total_sales ? ((totals.net_profit / totals.total_sales) * 100).toFixed(1) : '0.0', formatter: (v) => `${v}%`, bold: true }
        ],
        sections: data.sales && data.sales.length ? [{
          title: 'DETALLE POR PERÍODO',
          columns: [
            { label: 'Fecha / Categoria', key: 'date', width: 28 },
            { label: 'Ventas ($)', key: 'ventas', width: 16, formatter: fmtCurrency },
            { label: 'Gastos ($)', key: 'gastos', width: 16, formatter: fmtCurrency },
            { label: 'Margen ($)', key: 'margen', width: 16, formatter: fmtCurrency }
          ],
          rows: (data.sales || []).map(s => {
            const key = s.date ?? s.category;
            const gasto = data.expenses?.find(e => (e.date ?? e.category) === key)?.total_expenses || 0;
            const venta = s.total_sales ?? s.total ?? 0;
            return {
              date: key,
              ventas: venta,
              gastos: gasto,
              margen: venta - gasto
            };
          })
        }] : [],
        chartRefs: chartRefs || []
      };
    }
    if (!config) return;

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const settingsRes = await fetchWithAuth('/api/settings');
      const settingsRaw = settingsRes.ok ? await settingsRes.json() : {};
      const settings = settingsRaw?.data ?? settingsRaw ?? {};

      // Capturar gráficos si existen en config
      const chartImages = [];
      if (config.chartRefs) {
        for (const ref of config.chartRefs) {
          if (ref?.current) {
            try {
              const img = await captureElement(ref.current);
              chartImages.push(img);
            } catch {}
          }
        }
      }

      const doc = new jsPDF(config.landscape ? { orientation: 'landscape', unit: 'mm', format: 'a4' } : {});
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const marginX = 15;
      const contentW = pageWidth - marginX * 2;
      let y = 20;

      // Encabezado
      doc.setFillColor(30, 40, 60);
      doc.rect(0, 0, pageWidth, 38, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(settings.trade_name || settings.company_name || 'IDON GESTIÓN', pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (settings.address) {
        doc.text(settings.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      if (settings.phone || settings.ruc) {
        doc.text(`Tel: ${settings.phone || 'N/A'}  |  RUC: ${settings.ruc || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
      }

      y = 46;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(13);
      doc.setFont(undefined, 'bold');
      doc.text(config.title.toUpperCase(), pageWidth / 2, y, { align: 'center' });
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      if (dateRange?.from && dateRange?.to) {
        doc.text(`Periodo: ${dateRange.from} al ${dateRange.to}`, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      if (groupBy) {
        doc.text(`Agrupado por: ${groupBy}`, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      doc.text(`Generado: ${new Date().toLocaleString('es-EC')}`, pageWidth / 2, y, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y += 10;

      // KPIs
      if (config.kpis && config.kpis.length) {
        y = drawSectionHeader(doc, 'RESUMEN EJECUTIVO', y, pageWidth);
        for (const k of config.kpis) {
          const value = k.formatter ? k.formatter(k.value) : (typeof k.value === 'number' ? fmtCurrency(k.value) : String(k.value));
          doc.setFontSize(9);
          doc.setFont(undefined, k.bold ? 'bold' : 'normal');
          doc.text(k.label, 18, y);
          doc.text(value, pageWidth - 18, y, { align: 'right' });
          y += 5;
        }
        y = drawDivider(doc, y + 1, pageWidth);
      }

      // Gráficos
      if (chartImages.length) {
        y = drawSectionHeader(doc, 'GRÁFICOS', y, pageWidth);
        for (const img of chartImages) {
          const ratio = img.height / img.width;
          const imgW = contentW;
          const imgH = imgW * ratio;
          if (y + imgH > pageHeight - 25) { doc.addPage(); y = 20; }
          doc.addImage(img.dataUrl, 'PNG', marginX, y, imgW, imgH);
          y += imgH + 8;
        }
        y = drawDivider(doc, y, pageWidth);
      }

      // Secciones de tablas
      if (config.sections) {
        for (const section of config.sections) {
          if (y > pageHeight - 40) { doc.addPage(); y = 20; }
          y = drawSectionHeader(doc, section.title, y, pageWidth);
          if (section.rows && section.rows.length) {
            y = drawTable(doc, section.columns, section.rows, pageWidth, pageHeight, y, marginX);
            y += 4;
          } else {
            doc.setFontSize(8);
            doc.text('No hay datos disponibles', marginX, y);
            y += 6;
          }
        }
      }

      // Pie de página
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const fy = pageHeight - 12;
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.setFont(undefined, 'normal');
        doc.text('IDON | Plataforma de Gestión Multinegocios', marginX, fy);
        doc.text(`Página ${p} de ${totalPages}  |  ${new Date().toLocaleDateString('es-EC')}`, pageWidth - marginX, fy, { align: 'right' });
      }

      const fileName = `${config.title.toLowerCase().replace(/\s+/g, '-')}_${dateRange?.from || 'sin-fecha'}.pdf`;
      doc.save(fileName);
      setSuccess('PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {

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
        disabled={generating || (!customConfig && !data)}
        className={className}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 18px',
          background: generating || (!customConfig && !data)
            ? 'rgba(104,66,254,0.35)'
            : 'linear-gradient(135deg,#6842fe,#4a1dcc)',
          color: '#fff', border: 'none', borderRadius: 8,
          cursor: generating || (!customConfig && !data) ? 'not-allowed' : 'pointer',
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