import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import PrintCashClosePdfButton from '../../components/PrintCashClosePdfButton';
import PrintCashCloseButton from '../../components/PrintCashCloseButton';
import '../../styles/CloseCash.css';

// ===============================
// HELPERS
// ===============================
const toNum = (v) => Number(v) || 0;

const money = (val) =>
  toNum(val).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });

// ===============================
// COMPONENT
// ===============================
export default function CashRegisterClosePage() {

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  const [summary, setSummary] = useState(null);
  const [opening, setOpening] = useState(null);
  const [closing, setClosing] = useState(null);
  const [loading, setLoading] = useState(true);

  const [efectivo, setEfectivo] = useState(0);
  const [transfer, setTransfer] = useState(0);
  const [tarjeta, setTarjeta] = useState(0);
  const [propina, setPropina] = useState(0);
  const [comandas, setComandas] = useState(0);
  const [remarks, setRemarks] = useState('');

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // ===============================
  // LOAD DATA
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [sumRes, openRes, closeRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
      ]);

      setSummary(await sumRes.json());

      if (openRes.ok) {
        setOpening(await openRes.json());
      }

      if (closeRes.ok) {
        const c = await closeRes.json();
        setClosing(c);

        setEfectivo(c.cash_counted || 0);
        setTransfer(c.transfer_counted || 0);
        setTarjeta(c.card_counted || 0);
        setPropina(0);
        setComandas(c.orders_counted || 0);
        setRemarks(c.remarks || '');
      }

    } catch (err) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // ===============================
  // CALCULOS CORRECTOS
  // ===============================
  const ventas = summary?.metodos || [];

  const totalVentas =
    ventas.reduce((a, b) => a + toNum(b.total_cobrado), 0);

  const gastos =
    (summary?.gastos || []).reduce((a, g) => a + toNum(g.monto), 0);

  // 🔥 APERTURA REAL (SEPARADA)
  const aperturaEfectivo = toNum(opening?.total_efectivo);
  const aperturaBanca = toNum(opening?.monto_banca);

  // 🔥 IMPORTANTE: banca se suma a transferencias
  const aperturaTotal = aperturaEfectivo + aperturaBanca;

  const cajaTotal =
    aperturaTotal + totalVentas - gastos;

  // ===============================
  // GUARDAR CIERRE
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico: efectivo,
          transferenciaFisico: transfer,
          tarjetaFisico: tarjeta,
          propinaFisico: propina,
          comandasFisico: comandas,
          date: today,
          remarks
        }),
      });

      if (!res.ok) throw new Error('Error al guardar cierre');

      const closeData = await res.json();

      setMsg('✔ Cierre guardado correctamente');

      await load();

      // ===============================
      // 🖨️ AUTO PRINT TERMICO
      // ===============================
      if (window.printCashClose) {
        window.printCashClose(closeData, summary, opening);
      }

      // ===============================
      // 📄 AUTO PDF
      // ===============================
      setTimeout(() => {
        document.getElementById('btn-pdf')?.click();
      }, 500);

    } catch (err) {
      setError(err.message);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate title="Cierre de Caja SaaS">

      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-success">{msg}</div>}

      {loading && <div>Cargando...</div>}

      {!loading && summary && (

        <div className="cash-layout">

          {/* ================= LEFT ================= */}
          <div className="cash-left">

            <div className="card">
              <h3>📦 Apertura</h3>

              <p>Efectivo: {money(aperturaEfectivo)}</p>
              <p>Banca: {money(aperturaBanca)}</p>

              <hr />
              <b>Total: {money(aperturaTotal)}</b>
            </div>

            <div className="card">
              <h3>💸 Egresos</h3>

              {(summary?.gastos || []).map((g, i) => (
                <div key={i} className="row">
                  <span>{g.concepto}</span>
                  <span>{money(g.monto)}</span>
                </div>
              ))}

              <hr />
              <b>Total: {money(gastos)}</b>
            </div>

          </div>

          {/* ================= RIGHT ================= */}
          <div className="cash-right">

            {closing && <div className="lock">🔒 CIERRE YA REALIZADO</div>}

            <form onSubmit={handleSubmit}>

              <div className="grid">
                <label>Efectivo</label>
                <input value={efectivo} onChange={e=>setEfectivo(e.target.value)} disabled={!!closing} />

                <label>Transferencia</label>
                <input value={transfer} onChange={e=>setTransfer(e.target.value)} disabled={!!closing} />

                <label>Tarjeta</label>
                <input value={tarjeta} onChange={e=>setTarjeta(e.target.value)} disabled={!!closing} />

                <label>Propina</label>
                <input value={propina} onChange={e=>setPropina(e.target.value)} disabled={!!closing} />
              </div>

              <textarea
                value={remarks}
                onChange={e=>setRemarks(e.target.value)}
                disabled={!!closing}
                placeholder="Observaciones"
              />

              <button disabled={!!closing}>
                {closing ? 'Cerrado' : 'Guardar cierre'}
              </button>

            </form>

            <div className="card total">
              <h3>📊 Resumen Final</h3>
              <p>Total ventas: {money(totalVentas)}</p>
              <p>Base + ventas - egresos</p>
              <h2>{money(cajaTotal)}</h2>
            </div>

            {/* BOTONES */}
            {closing && (
              <>
                <PrintCashClosePdfButton
                  close={closing}
                  opening={opening}
                  summary={summary}
                />

                <PrintCashCloseButton
                  close={closing}
                  datos={summary}
                />
              </>
            )}

          </div>
        </div>
      )}
    </PageTemplate>
  );
}