import React from 'react';
import jsPDF from 'jspdf';

const money = (v) =>
  Number(v || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD'
  });

export default function PrintCashClosePdfButton({ close, datos, opening }) {

  const handlePdf = () => {
    if (!close) return;

    const doc = new jsPDF();

    let y = 10;

    // =========================
    // TÍTULO
    // =========================
    doc.setFontSize(16);
    doc.text("CIERRE DE CAJA", 10, y);

    y += 10;

    // =========================
    // APERTURA
    // =========================
    doc.setFontSize(12);
    doc.text("APERTURA", 10, y);
    y += 6;

    doc.setFontSize(10);
    doc.text(`Efectivo: ${money(opening?.total_efectivo)}`, 10, y);
    y += 5;

    doc.text(`Banca (Transferencias): ${money(opening?.monto_banca)}`, 10, y);
    y += 8;

    // =========================
    // VENTAS
    // =========================
    doc.setFontSize(12);
    doc.text("VENTAS", 10, y);
    y += 6;

    doc.setFontSize(10);

    (datos?.metodos || []).forEach(m => {
      doc.text(
        `${m.payment_method.toUpperCase()}: ${money(m.total_cobrado)}`,
        10,
        y
      );
      y += 5;
    });

    y += 5;

    // =========================
    // EGRESOS
    // =========================
    doc.setFontSize(12);
    doc.text("EGRESOS", 10, y);
    y += 6;

    doc.setFontSize(10);

    const totalGastos = (datos?.gastos || [])
      .reduce((acc, g) => acc + Number(g.monto), 0);

    (datos?.gastos || []).forEach(g => {
      doc.text(`${g.concepto}: ${money(g.monto)}`, 10, y);
      y += 5;
    });

    y += 5;

    doc.text(`TOTAL EGRESOS: ${money(totalGastos)}`, 10, y);

    y += 10;

    // =========================
    // TOTALES
    // =========================
    doc.setFontSize(12);
    doc.text("RESUMEN", 10, y);
    y += 6;

    const totalVentas = (datos?.metodos || [])
      .reduce((a, b) => a + Number(b.total_cobrado), 0);

    doc.setFontSize(10);
    doc.text(`Total Ventas: ${money(totalVentas)}`, 10, y);
    y += 5;

    doc.text(`Total Caja: ${money(
      (opening?.total_efectivo || 0) +
      (opening?.monto_banca || 0) +
      totalVentas -
      totalGastos
    )}`, 10, y);

    // =========================
    // GUARDAR
    // =========================
    doc.save(`cierre-caja-${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <button className="btn-pdf" onClick={handlePdf}>
      Descargar PDF
    </button>
  );
}