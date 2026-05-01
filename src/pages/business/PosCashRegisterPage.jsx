import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import PrintCashCloseButton from '../../components/PrintCashCloseButton';
import PrintCashClosePdfButton from '../../components/PrintCashClosePdfButton';
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
  // DATA
  // ===============================
  const [summary, setSummary] = useState(null);
  const [opening, setOpening] = useState(null);
  const [closing, setClosing] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===============================
  // INPUTS (SOLO UNO POR VARIABLE)
  // ===============================
  const [cash, setCash] = useState(0);
  const [transfer, setTransfer] = useState(0);
  const [card, setCard] = useState(0);
  const [tip, setTip] = useState(0);
  const [orders, setOrders] = useState(0);
  const [remarks, setRemarks] = useState('');

  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // ===============================
  // LOAD
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);
    try {

      const [sumRes, openRes, closeRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
      ]);

      const sum = await sumRes.json();
      setSummary(sum);

      if (openRes.ok) setOpening(await openRes.json());

      if (closeRes.ok) {
        const c = await closeRes.json();
        setClosing(c);

        // preload cierre (bloqueado)
        setCash(c.cash_counted || 0);
        setTransfer(c.transfer_counted || 0);
        setCard(c.card_counted || 0);
        setOrders(c.orders_counted || 0);
        setRemarks(c.remarks || '');
      }

    } catch (err) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

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

  const cajaFinal = aperturaTotal + totalVentas - gastos;

  // ===============================
  // GUARDAR
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico: cash,
          transferenciaFisico: transfer,
          tarjetaFisico: card,
          propinaFisico: tip,
          comandasFisico: orders,
          date: today,
          remarks
        }),
      });

      if (!res.ok) throw new Error('Error guardando cierre');

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

          {/* ================= LEFT ================= */}
          <div className="cash-left">

            <div className="card">
              <h3>📦 Apertura de Caja</h3>
              <p>Efectivo inicial: {money(opening?.total_efectivo)}</p>
              <p>Banca (transferencias): {money(opening?.monto_banca)}</p>
              <hr />
              <b>Total apertura: {money(aperturaTotal)}</b>
            </div>

            <div className="card">
              <h3>💸 Egresos del día</h3>

              {(summary?.gastos || []).map((g, i) => (
                <div key={i} className="row">
                  <span>{g.concepto}</span>
                  <span>{money(g.monto)}</span>
                </div>
              ))}

              <hr />
              <b>Total gastos: {money(gastos)}</b>
            </div>

          </div>

          {/* ================= RIGHT (70%) ================= */}
          <div className="cash-right">

            {closing && (
              <div className="lock">🔒 CIERRE YA REGISTRADO</div>
            )}

            <form onSubmit={handleSubmit}>

              <div className="grid">

                <label>Efectivo</label>
                <input value={cash} onChange={e => setCash(e.target.value)} disabled={!!closing} />

                <label>Transferencia</label>
                <input value={transfer} onChange={e => setTransfer(e.target.value)} disabled={!!closing} />

                <label>Tarjeta</label>
                <input value={card} onChange={e => setCard(e.target.value)} disabled={!!closing} />

                <label>Propina</label>
                <input value={tip} onChange={e => setTip(e.target.value)} disabled={!!closing} />

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

            {/* ================= REPORT ACTIONS ================= */}
            {closing && (
              <div className="actions">

                <PrintCashCloseButton
                  close={closing}
                  datos={summary}
                  className="btn"
                />

                <PrintCashClosePdfButton
                  close={closing}
                  datos={summary}
                  className="btn btn-pdf"
                />

              </div>
            )}

            <div className="card total">
              <h3>📊 Caja Final</h3>
              <p>Apertura + Ventas - Gastos</p>
              <h2>{money(cajaFinal)}</h2>
            </div>

          </div>
        </div>
      )}
    </PageTemplate>
  );
}