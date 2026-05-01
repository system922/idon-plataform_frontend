import jsPDF from "jspdf";

export default function PrintCashClosePdfButton({ close, opening, summary }) {

  const handle = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("CIERRE DE CAJA", 10, 10);

    doc.setFontSize(11);

    doc.text(`APERTURA:`, 10, 20);
    doc.text(`Efectivo: $${opening?.total_efectivo}`, 10, 28);
    doc.text(`Banca: $${opening?.monto_banca}`, 10, 34);

    doc.text(`VENTAS:`, 10, 45);
    summary?.metodos?.forEach((m, i) => {
      doc.text(`${m.payment_method}: $${m.total_cobrado}`, 10, 52 + i * 6);
    });

    doc.save("cierre-caja.pdf");
  };

  return (
    <button id="btn-pdf" onClick={handle}>
      Descargar PDF
    </button>
  );
}