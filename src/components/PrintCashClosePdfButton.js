import jsPDF from "jspdf";

export default function PrintCashClosePdfButton({ close, opening, summary }) {

  const download = () => {
    const doc = new jsPDF();

    let y = 10;

    doc.setFontSize(16);
    doc.text("CIERRE DE CAJA", 60, y);

    y += 10;

    // APERTURA
    doc.setFontSize(12);
    doc.text("APERTURA", 10, y); y += 6;
    doc.text(`Efectivo: $${opening?.total_efectivo || 0}`, 10, y); y += 5;
    doc.text(`Banca: $${opening?.monto_banca || 0}`, 10, y); y += 10;

    // VENTAS
    doc.text("VENTAS", 10, y); y += 6;

    summary?.metodos?.forEach(m => {
      doc.text(`${m.payment_method}: $${m.total_cobrado}`, 10, y);
      y += 5;
    });

    y += 10;

    // EGRESOS
    doc.text("EGRESOS", 10, y); y += 6;

    summary?.gastos?.forEach(g => {
      doc.text(`${g.concepto}: $${g.monto}`, 10, y);
      y += 5;
    });

    y += 10;

    const ventas = summary?.metodos?.reduce((a,b)=>a+Number(b.total_cobrado),0) || 0;
    const gastos = summary?.gastos?.reduce((a,b)=>a+Number(b.monto),0) || 0;

    doc.text(`TOTAL VENTAS: $${ventas}`, 10, y); y += 6;
    doc.text(`TOTAL EGRESOS: $${gastos}`, 10, y); y += 6;
    doc.text(`CAJA FINAL: $${ventas - gastos}`, 10, y);

    doc.save(`cierre-${Date.now()}.pdf`);
  };

  return (
    <button id="btn-pdf" className="btn-pdf" onClick={download}>
      Descargar PDF
    </button>
  );
}