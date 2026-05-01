import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
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

  // ===============================
  // STATE
  // ===============================
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
      // SUMMARY
      const res = await fetchWithAuth(
        `/api/pos/cash-register/summary?date=${today}`
      );
      const data = await res.json();
      setSummary(data);

      // OPENING
      const openRes = await fetchWithAuth(
        `/api/pos/cash-register/opening?date=${today}`
      );

      if (openRes.ok) {
        setOpening(await openRes.json());
      }

      // CLOSING (SI EXISTE)
      const closeRes = await fetchWithAuth(
        `/api/pos/cash-register/full-closing?date=${today}`
      );

      if (closeRes.ok) {
        const close = await closeRes.json();
        setClosing(close);

        // bloquear inputs con datos existentes
        setEfectivo(close.cash_counted || 0);
        setTransfer(close.transfer_counted || 0);
        setTarjeta(close.card_counted || 0);
        setPropina(0);
        setComandas(close.orders_counted || 0);
        setRemarks(close.remarks || '');
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
  // CALCULOS
  // ===============================
  const ventas = summary?.metodos || [];

  const totalVentas = ventas.reduce(
    (a, b) => a + toNum(b.total_cobrado),
    0
  );

  const gastos = (summary?.gastos || []).reduce(
    (a, g) => a + toNum(g.monto),
    0
  );

  const aperturaTotal =
    toNum(opening?.total_efectivo) +
    toNum(opening?.monto_banca);

  const cajaTotal =
    aperturaTotal + totalVentas - gastos;

  // ===============================
  // GUARDAR
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

      if (!res.ok) throw new Error('Error al guardar');

      setMsg('✔ Cierre guardado correctamente');
      load();

    } catch (err) {
      setError(err.message);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate title="Cierre de Caja">

      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-success">{msg}</div>}

      {loading && <div>Cargando...</div>}

      {!loading && summary && (
        <div className="cash-layout">

          {/* ================= LEFT SIDE ================= */}
          <div className="cash-left">

            {/* APERTURA */}
            <div className="card">
              <h3>📦 Apertura</h3>
              <p>Efectivo: {money(opening?.total_efectivo)}</p>
              <p>Banca (transferencias): {money(opening?.monto_banca)}</p>
              <p><b>Total:</b> {money(aperturaTotal)}</p>
            </div>

            {/* EGRESOS */}
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

          {/* ================= RIGHT SIDE ================= */}
          <div className="cash-right">

            {closing && (
              <div className="lock">
                🔒 CIERRE YA REALIZADO
              </div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="grid">

                <label>Efectivo</label>
                <input
                  value={efectivo}
                  onChange={e => setEfectivo(e.target.value)}
                  disabled={!!closing}
                />

                <label>Transferencia</label>
                <input
                  value={transfer}
                  onChange={e => setTransfer(e.target.value)}
                  disabled={!!closing}
                />

                <label>Tarjeta</label>
                <input
                  value={tarjeta}
                  onChange={e => setTarjeta(e.target.value)}
                  disabled={!!closing}
                />

                <label>Propina</label>
                <input
                  value={propina}
                  onChange={e => setPropina(e.target.value)}
                  disabled={!!closing}
                />

              </div>

              <textarea
                placeholder="Observaciones"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                disabled={!!closing}
              />

              <button disabled={!!closing}>
                {closing ? 'Cerrado' : 'Guardar cierre'}
              </button>

            </form>

            {/* RESUMEN FINAL */}
            <div className="card total">
              <h3>📊 Resumen</h3>
              <p>Ventas: {money(totalVentas)}</p>
              <p>Apertura + ventas - gastos</p>
              <h2>{money(cajaTotal)}</h2>
            </div>

          </div>
        </div>
      )}
    </PageTemplate>
  );
}