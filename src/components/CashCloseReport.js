export function buildCashCloseReport({ close, opening, summary, bizInfo }) {

  const money = (v) =>
    Number(v || 0).toLocaleString('es-EC', {
      style: 'currency',
      currency: 'USD'
    });

  const ventas = summary?.metodos || [];
  const gastos = summary?.gastos || [];

  const totalVentas = ventas.reduce(
    (a, b) => a + Number(b.total_cobrado || 0),
    0
  );

  const totalGastos = gastos.reduce(
    (a, b) => a + Number(b.monto || 0),
    0
  );

  const aperturaTotal =
    Number(opening?.total_efectivo || 0) +
    Number(opening?.monto_banca || 0);

  const cajaFinal =
    aperturaTotal + totalVentas - totalGastos;

  return {
    header: {
      business: bizInfo?.name || "Mi Negocio",
      date: close?.closing_date || new Date().toISOString().slice(0,10),
      user: close?.closing_user_id
    },

    opening: {
      efectivo: opening?.total_efectivo || 0,
      banca: opening?.monto_banca || 0,
      total: aperturaTotal
    },

    sales: ventas.map(v => ({
      metodo: v.payment_method,
      total: v.total_cobrado
    })),

    expenses: gastos.map(g => ({
      concepto: g.concepto,
      monto: g.monto
    })),

    totals: {
      ventas: totalVentas,
      gastos: totalGastos,
      apertura: aperturaTotal,
      cajaFinal
    },

    closing: close
  };
}