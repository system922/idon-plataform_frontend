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

  // DATA
  const [datos, setDatos] = useState(null);
  const [apertura, setApertura] = useState(null);

  // INPUTS
  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // ===============================
  // LOAD
  // ===============================
  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [resSummary, resOpening] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`)
      ]);

      const dataSummary = await resSummary.json();
      const dataOpening = resOpening.ok ? await resOpening.json() : null;

      setDatos(dataSummary);
      setApertura(dataOpening);

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
  const ventas = datos?.metodos || [];
  const gastos = datos?.gastos || [];

  const efectivoSistema = ventas.find(v => v.payment_method === 'cash')?.total_cobrado || 0;
  const transferSistema = ventas.find(v => v.payment_method === 'transfer')?.total_cobrado || 0;
  const tarjetaSistema  = ventas.find(v => v.payment_method === 'card')?.total_cobrado || 0;

  const gastosTotal = gastos.reduce((a, g) => a + toNum(g.monto), 0);

  const aperturaEfectivo = toNum(apertura?.total_efectivo);

  // 🔥 EFECTIVO REAL ESPERADO
  const efectivoEsperado =
    aperturaEfectivo +
    toNum(efectivoSistema) -
    gastosTotal;

  const diffCash = round2(toNum(efectivoFisico) - efectivoEsperado);

  // ===============================
  // UI
  // ===============================
  if (loading) return <PageTemplate title="Caja">Cargando...</PageTemplate>;

  return (
    <PageTemplate title="Cuadre de Caja">

      <div className="cash-grid">

        {/* ================= LEFT ================= */}
        <div className="left-panel">

          {/* APERTURA */}
          <div className="card">
            <h3>APERTURA</h3>
            <p className="amount">{money(aperturaEfectivo)}</p>
          </div>

          {/* EGRESOS */}
          <div className="card">
            <h3>EGRESOS</h3>

            {gastos.length === 0 && <p>No hay gastos</p>}

            {gastos.map((g, i) => (
              <div key={i} className="expense-item">
                <span>{g.concepto}</span>
                <span>{money(g.monto)}</span>
              </div>
            ))}

            <div className="total">
              Total: {money(gastosTotal)}
            </div>
          </div>

        </div>

        {/* ================= RIGHT ================= */}
        <div className="right-panel">

          <div className="card big">

            <h3>CIERRE DE CAJA</h3>

            <table>
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
                      value={efectivoFisico}
                      onChange={e => setEfectivoFisico(e.target.value)}
                    />
                  </td>
                  <td className={diffCash !== 0 ? 'danger' : ''}>
                    {money(diffCash)}
                  </td>
                </tr>

                <tr>
                  <td>TRANSFER</td>
                  <td>{money(transferSistema)}</td>
                  <td>
                    <input
                      type="number"
                      value={transferFisico}
                      onChange={e => setTransferFisico(e.target.value)}
                    />
                  </td>
                  <td>{money(toNum(transferFisico) - transferSistema)}</td>
                </tr>

                <tr>
                  <td>TARJETA</td>
                  <td>{money(tarjetaSistema)}</td>
                  <td>
                    <input
                      type="number"
                      value={tarjetaFisico}
                      onChange={e => setTarjetaFisico(e.target.value)}
                    />
                  </td>
                  <td>{money(toNum(tarjetaFisico) - tarjetaSistema)}</td>
                </tr>

              </tbody>
            </table>

            <button className="btn-primary">
              Cerrar Caja
            </button>

          </div>

        </div>

      </div>

    </PageTemplate>
  );
}