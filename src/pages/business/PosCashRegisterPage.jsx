import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';

import PrintCashCloseButton from '../../components/PrintCashCloseButton';
import PrintCashClosePdfButton from '../../components/PrintCashClosePdfButton';

import '../../styles/CloseCash.css';

const toNum = (v) => isNaN(Number(v)) ? 0 : Number(v);

const money = (v) =>
  toNum(v).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD'
  });

export default function CashRegisterClosePage() {

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  const [datos, setDatos] = useState(null);
  const [opening, setOpening] = useState(null);
  const [loading, setLoading] = useState(true);

  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);

  const [closeSaved, setCloseSaved] = useState(null);

  // ===============================
  // LOAD DATA
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [summaryRes, openingRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`)
      ]);

      const summary = await summaryRes.json();
      const openingData = openingRes.ok ? await openingRes.json() : null;

      setDatos(summary);
      setOpening(openingData);

    } catch (err) {
      console.error(err);
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

  const gastosTotal = (datos?.gastos || [])
    .reduce((a, b) => a + toNum(b.monto), 0);

  const cashVentas = datos?.metodos?.find(m => m.payment_method === 'cash')?.total_cobrado || 0;
  const transferVentas = datos?.metodos?.find(m => m.payment_method === 'transfer')?.total_cobrado || 0;
  const cardVentas = datos?.metodos?.find(m => m.payment_method === 'card')?.total_cobrado || 0;

  // 🧠 APERTURA
  const aperturaEfectivo = toNum(opening?.total_efectivo);
  const aperturaBanca = toNum(opening?.monto_banca);

  // ===============================
  // ESPERADO REAL
  // ===============================
  const efectivoEsperado =
    aperturaEfectivo + toNum(cashVentas) - gastosTotal;

  const transferEsperado =
    aperturaBanca + toNum(transferVentas);

  const tarjetaEsperado = toNum(cardVentas);

  // ===============================
  // DIFERENCIAS
  // ===============================
  const diffCash = toNum(efectivoFisico) - efectivoEsperado;
  const diffTransfer = toNum(transferFisico) - transferEsperado;
  const diffCard = toNum(tarjetaFisico) - tarjetaEsperado;

  // ===============================
  // GUARDAR
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetchWithAuth('/api/pos/cash-register/closing', {
      method: 'POST',
      body: JSON.stringify({
        efectivoFisico,
        transferenciaFisico: transferFisico,
        tarjetaFisico
      })
    });

    const data = await res.json();
    setCloseSaved(data);
    alert("Cierre guardado correctamente");
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <PageTemplate title="Cuadre de Caja">

      <div className="cash-grid">

        {/* =========================
            🟦 IZQUIERDA
        ========================= */}
        <div className="left-panel">

          {/* APERTURA */}
          <div className="card">
            <h3>Apertura</h3>

            <p>Efectivo: {money(aperturaEfectivo)}</p>
            <p>Banca (transfer): {money(aperturaBanca)}</p>

            <hr />

            <p>
              <strong>Total:</strong>{" "}
              {money(aperturaEfectivo + aperturaBanca)}
            </p>
          </div>

          {/* EGRESOS */}
          <div className="card">
            <h3>Egresos</h3>

            {(datos?.gastos || []).map((g, i) => (
              <div key={i} className="row">
                <span>{g.concepto}</span>
                <span>{money(g.monto)}</span>
              </div>
            ))}

            <hr />

            <p>
              <strong>Total:</strong> {money(gastosTotal)}
            </p>
          </div>

        </div>

        {/* =========================
            🟩 DERECHA (70%)
        ========================= */}
        <div className="right-panel">

          <form onSubmit={handleSubmit}>

            <table className="cash-table">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Esperado</th>
                  <th>Físico</th>
                  <th>Diferencia</th>
                </tr>
              </thead>

              <tbody>

                <tr>
                  <td>Efectivo</td>
                  <td>{money(efectivoEsperado)}</td>
                  <td>
                    <input value={efectivoFisico}
                      onChange={e => setEfectivoFisico(e.target.value)} />
                  </td>
                  <td>{money(diffCash)}</td>
                </tr>

                <tr>
                  <td>Transfer</td>
                  <td>{money(transferEsperado)}</td>
                  <td>
                    <input value={transferFisico}
                      onChange={e => setTransferFisico(e.target.value)} />
                  </td>
                  <td>{money(diffTransfer)}</td>
                </tr>

                <tr>
                  <td>Tarjeta</td>
                  <td>{money(tarjetaEsperado)}</td>
                  <td>
                    <input value={tarjetaFisico}
                      onChange={e => setTarjetaFisico(e.target.value)} />
                  </td>
                  <td>{money(diffCard)}</td>
                </tr>

              </tbody>
            </table>

            <button className="btn-primary">
              Cerrar Caja
            </button>

          </form>

          {/* =========================
              🖨️ PRINT + PDF
          ========================= */}
          {closeSaved && (
            <div style={{ marginTop: 20 }}>

              <PrintCashCloseButton
                close={closeSaved}
                datos={datos}
                printerTicket={{ name: "POS-58", width: 32 }}
                printerConnected={true}
              />

              <PrintCashClosePdfButton
                close={closeSaved}
                datos={datos}
                opening={opening}
              />

            </div>
          )}

        </div>

      </div>

    </PageTemplate>
  );
}