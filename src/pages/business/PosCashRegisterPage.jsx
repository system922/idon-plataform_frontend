import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/CloseCash.css';

// ===============================
// HELPERS
// ===============================
const toNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const round2 = (n) =>
  Math.round((n + Number.EPSILON) * 100) / 100;

function money(val) {
  return toNum(val).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function getMetodoTotal(arr, metodo) {
  if (!Array.isArray(arr)) return 0;
  const obj = arr.find(m => m.payment_method === metodo);
  return toNum(obj?.total_cobrado);
}

// ===============================
// COMPONENT
// ===============================
export default function CashRegisterClosePage() {

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  const [datos, setDatos] = useState(null);
  const [apertura, setApertura] = useState(null);
  const [loading, setLoading] = useState(true);

  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ===============================
  // LOAD
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [summaryRes, openingRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`)
      ]);

      const summaryData = await summaryRes.json();
      setDatos(summaryData);

      if (openingRes.ok) {
        const openData = await openingRes.json();
        setApertura(openData);
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
  // DATOS BASE
  // ===============================
  const aperturaCaja = toNum(apertura?.total_inicial);

  const cashVentas     = getMetodoTotal(datos?.metodos, 'cash');
  const transferVentas = getMetodoTotal(datos?.metodos, 'transfer');
  const cardVentas     = getMetodoTotal(datos?.metodos, 'card');

  // ===============================
  // 🔥 ESPERADO REAL
  // ===============================
  const efectivoEsperado = round2(aperturaCaja + cashVentas);
  const transferEsperado = round2(transferVentas);
  const tarjetaEsperado  = round2(cardVentas);

  const totalEsperado =
    efectivoEsperado +
    transferEsperado +
    tarjetaEsperado;

  // ===============================
  // 🧮 DIFERENCIAS REALES
  // ===============================
  const diffCash     = round2(efectivoFisico - efectivoEsperado);
  const diffTransfer = round2(transferFisico - transferEsperado);
  const diffCard     = round2(tarjetaFisico - tarjetaEsperado);

  const totalFisico =
    toNum(efectivoFisico) +
    toNum(transferFisico) +
    toNum(tarjetaFisico);

  const diffTotal = round2(totalFisico - totalEsperado);

  // ===============================
  // SUBMIT
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico,
          transferenciaFisico: transferFisico,
          tarjetaFisico,
          date: today
        }),
      });

      if (!res.ok) throw new Error('Error');

      setMessage('✅ Cierre guardado');
      load();

    } catch {
      setError('Error al guardar');
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate title="Cuadre PRO">

      {loading && <div>Cargando...</div>}
      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {!loading && (
        <form onSubmit={handleSubmit} className="cash-close-form">

          {/* 🔵 INFO APERTURA */}
          <div className="cash-box">
            <h3>APERTURA</h3>
            <p>Total inicial: {money(aperturaCaja)}</p>
          </div>

          {/* 🧾 TABLA PRO */}
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
                <td>EFECTIVO</td>
                <td>{money(efectivoEsperado)}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={efectivoFisico}
                    onChange={e => setEfectivoFisico(e.target.value)}
                  />
                </td>
                <td className={diffCash !== 0 ? 'diff-error' : 'diff-ok'}>
                  {money(diffCash)}
                </td>
              </tr>

              <tr>
                <td>TRANSFER</td>
                <td>{money(transferEsperado)}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={transferFisico}
                    onChange={e => setTransferFisico(e.target.value)}
                  />
                </td>
                <td className={diffTransfer !== 0 ? 'diff-error' : 'diff-ok'}>
                  {money(diffTransfer)}
                </td>
              </tr>

              <tr>
                <td>TARJETA</td>
                <td>{money(tarjetaEsperado)}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={tarjetaFisico}
                    onChange={e => setTarjetaFisico(e.target.value)}
                  />
                </td>
                <td className={diffCard !== 0 ? 'diff-error' : 'diff-ok'}>
                  {money(diffCard)}
                </td>
              </tr>

              {/* 🔥 TOTAL REAL */}
              <tr>
                <td><strong>TOTAL</strong></td>
                <td>{money(totalEsperado)}</td>
                <td>{money(totalFisico)}</td>
                <td className={diffTotal !== 0 ? 'diff-error' : 'diff-ok'}>
                  {money(diffTotal)}
                </td>
              </tr>

            </tbody>
          </table>

          <button type="submit">Cerrar Caja</button>

        </form>
      )}
    </PageTemplate>
  );
}