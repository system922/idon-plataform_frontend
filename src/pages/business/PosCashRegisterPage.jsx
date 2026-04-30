import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import qz from 'qz-tray';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import usePrinterTicket from '../../hooks/usePrinterConfig';
import '../../styles/CloseCash.css';

// ===============================
// 🔥 HELPERS ROBUSTOS
// ===============================
const toNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

function money(val) {
  const n = toNum(val);
  return n.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function getMetodoTotal(metodosArr, metodo) {
  if (!Array.isArray(metodosArr)) return 0;
  const obj = metodosArr.find(m => m.payment_method === metodo);
  return toNum(obj?.total_cobrado);
}

function getTotalVentas(metodosArr) {
  if (!Array.isArray(metodosArr)) return 0;
  return metodosArr.reduce((acc, m) => acc + toNum(m.total_cobrado), 0);
}

// ===============================
// COMPONENT
// ===============================
export default function CashRegisterClosePage() {

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  const { selectedBusiness } = useBusinessContext();
  const printerTicket = usePrinterTicket();

  // DATA
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  // INPUTS (NUMERICOS REALES)
  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);
  const [propinaFisico, setPropinaFisico] = useState(0);
  const [comandasFisico, setComandasFisico] = useState(0);
  const [remarks, setRemarks] = useState('');

  // UI
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // ===============================
  // LOAD DATA
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetchWithAuth(
        `/api/pos/cash-register/summary?date=${today}`
      );

      const data = await res.json();

      if (!res.ok) throw new Error('Error cargando summary');

      setDatos(data);

    } catch (err) {
      console.error(err);
      setError('Error cargando datos del servidor');
      setDatos(null);
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
  const gastosTotal = (datos?.gastos || []).reduce(
    (acc, g) => acc + toNum(g.monto),
    0
  );

  const ventasSistema = getTotalVentas(datos?.metodos);

  const ventasFisico =
    toNum(efectivoFisico) +
    toNum(transferFisico) +
    toNum(tarjetaFisico);

  // ===============================
  // DIFERENCIAS SEGURAS
  // ===============================
  const efectivoSistema = getMetodoTotal(datos?.metodos, 'cash');
  const transferSistema = getMetodoTotal(datos?.metodos, 'transfer');
  const tarjetaSistema = getMetodoTotal(datos?.metodos, 'card');

  const diffCash = toNum(efectivoFisico) - efectivoSistema;
  const diffTransfer = toNum(transferFisico) - transferSistema;
  const diffCard = toNum(tarjetaFisico) - tarjetaSistema;

  const diffTotal = ventasFisico - ventasSistema;

  const netoSistema = ventasSistema - gastosTotal;

  // ===============================
  // SUBMIT SEGURO
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const payload = {
        efectivoFisico: toNum(efectivoFisico),
        transferenciaFisico: toNum(transferFisico),
        tarjetaFisico: toNum(tarjetaFisico),
        propinaFisico: toNum(propinaFisico),
        comandasFisico: parseInt(comandasFisico || 0),

        date: today,
        remarks: remarks || ''
      };

      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error guardando cierre');
      }

      setMessage('✅ Cuadre guardado correctamente');
      load();

    } catch (err) {
      console.error("❌ ERROR SUBMIT:", err);
      setError(err.message);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate title="Cuadre de Caja" theme="cash">

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {loading && <div>Cargando...</div>}

      {!loading && datos && (
        <form onSubmit={handleSubmit} className="cash-close-form">

          <table className="cash-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Físico</th>
                <th>Sistema</th>
                <th>Diferencia</th>
              </tr>
            </thead>

            <tbody>

              {/* EFECTIVO */}
              <tr>
                <td>EFECTIVO</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={efectivoFisico}
                    onChange={e => setEfectivoFisico(e.target.value)}
                  />
                </td>
                <td>{money(efectivoSistema)}</td>
                <td>{money(diffCash)}</td>
              </tr>

              {/* TRANSFER */}
              <tr>
                <td>TRANSFER</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={transferFisico}
                    onChange={e => setTransferFisico(e.target.value)}
                  />
                </td>
                <td>{money(transferSistema)}</td>
                <td>{money(diffTransfer)}</td>
              </tr>

              {/* TARJETA */}
              <tr>
                <td>TARJETA</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    value={tarjetaFisico}
                    onChange={e => setTarjetaFisico(e.target.value)}
                  />
                </td>
                <td>{money(tarjetaSistema)}</td>
                <td>{money(diffCard)}</td>
              </tr>

              {/* TOTAL */}
              <tr>
                <td><strong>TOTAL VENTAS</strong></td>
                <td>{money(ventasFisico)}</td>
                <td>{money(ventasSistema)}</td>
                <td>{money(diffTotal)}</td>
              </tr>

            </tbody>
          </table>

          <div><strong>Total gastos:</strong> {money(gastosTotal)}</div>
          <div><strong>Neto sistema:</strong> {money(netoSistema)}</div>

          <textarea
            placeholder="Observaciones..."
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />

          <button type="submit">Guardar Cuadre</button>

        </form>
      )}
    </PageTemplate>
  );
}
