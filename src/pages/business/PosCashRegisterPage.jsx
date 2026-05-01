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

      setSummary(await sumRes.json());

      if (openRes.ok) setOpening(await openRes.json());
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

    } catch (e) {
      setError('Error cargando datos');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // ===============================
  // DATA CALCS
  // ===============================
  const ventas = summary?.metodos || [];

  const totalVentas = ventas.reduce(
    (a, b) => a + toNum(b.total_cobrado),
    0
  );

  const gastos = (summary?.gastos || [])
    .reduce((a, g) => a + toNum(g.monto), 0);

  // 🔥 APERTURA PRO REAL
  const aperturaEfectivo = toNum(opening?.total_efectivo);
  const aperturaBanca = toNum(opening?.monto_banca);
  const aperturaTotal = aperturaEfectivo + aperturaBanca;

  const cajaTotal = aperturaTotal + totalVentas - gastos;

  // ===============================
  // SAVE
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

      const closeData = await res.json();

      setMsg('✔ Cierre guardado');

      await load();

      // AUTO PRINT
      window.printCashClose?.(closeData, summary, opening);

      // AUTO PDF
      setTimeout(() => {
        document.getElementById('btn-pdf')?.click();
      }, 600);

    } catch (e) {
      setError(e.message);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate title="Cierre de Caja SaaS">

      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-success">{msg}</div>}

      {loading && <div className="loading">Cargando...</div>}

      {!loading && summary && (

        <div className="cash-layout">

          {/* ================= LEFT ================= */}
          <div className="cash-left">

            <div className="card">
              <h3>📦 Apertura</h3>
              <div>Efectivo: {money(aperturaEfectivo)}</div>
              <div>Banca (Transferencias): {money(aperturaBanca)}</div>
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

            {closing && (
              <div className="lock">🔒 CIERRE REALIZADO</div>
            )}

            <form onSubmit={handleSubmit} className="form">

              <input placeholder="Efectivo" value={efectivo} onChange={e=>setEfectivo(e.target.value)} disabled={!!closing}/>
              <input placeholder="Transferencia" value={transfer} onChange={e=>setTransfer(e.target.value)} disabled={!!closing}/>
              <input placeholder="Tarjeta" value={tarjeta} onChange={e=>setTarjeta(e.target.value)} disabled={!!closing}/>
              <input placeholder="Propina" value={propina} onChange={e=>setPropina(e.target.value)} disabled={!!closing}/>

              <textarea
                placeholder="Observaciones"
                value={remarks}
                onChange={e=>setRemarks(e.target.value)}
                disabled={!!closing}
              />

              <button disabled={!!closing}>
                {closing ? 'Cerrado' : 'Guardar cierre'}
              </button>

            </form>

            <div className="card total">
              <h3>📊 Resumen Final</h3>
              <div>Ventas: {money(totalVentas)}</div>
              <div>Caja total</div>
              <h2>{money(cajaTotal)}</h2>
            </div>

            {closing && (
              <div className="actions">
                <PrintCashClosePdfButton
                  close={closing}
                  opening={opening}
                  summary={summary}
                />

                <PrintCashCloseButton
                  close={closing}
                  datos={summary}
                />
              </div>
            )}

          </div>
        </div>
      )}
    </PageTemplate>
  );
}