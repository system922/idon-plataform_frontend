import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import qz from 'qz-tray';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import usePrinterTicket from '../../hooks/usePrinterConfig.';
import '../../styles/CloseCash.css';

// --- Helpers ---
function money(val) {
  if (val === null || val === undefined || isNaN(val)) return '$0.00';
  return Number(val).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function getMetodoTotal(metodosArr, metodo) {
  if (!Array.isArray(metodosArr)) return 0;

  const obj = metodosArr.find(m => m.payment_method === metodo);

  return obj ? Number(obj.total_cobrado || 0) : 0;
}

function getTotalVentas(metodosArr) {
  if (!Array.isArray(metodosArr)) return 0;

  return metodosArr.reduce(
    (acc, m) => acc + Number(m.total_cobrado || 0),
    0
  );
}

// --- COMPONENTE ---
export default function CashRegisterClosePage() {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  const printerTicket = usePrinterTicket();
  const { selectedBusiness } = useBusinessContext();

  const [close, setClose] = useState(null);
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  const [efectivoFisico, setEfectivoFisico] = useState('0.00');
  const [transferFisico, setTransferFisico] = useState('0.00');
  const [tarjetaFisico, setTarjetaFisico] = useState('0.00');
  const [propinaFisico, setPropinaFisico] = useState('0.00');
  const [comandasFisico, setComandasFisico] = useState('0');
  const [remarks, setRemarks] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --- QZ CONFIG ---
  useEffect(() => {
    (async () => {
      try {
        const certData = await fetchWithAuth('/api/print/cert').then(r => r.text());

        qz.security.setCertificatePromise(async () => certData);

        qz.security.setSignaturePromise(async (toSign) => {
          const { signature } = await fetchWithAuth('/api/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          }).then(r => r.json());
          return signature;
        });

        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }

      } catch (e) {
        console.warn("⚠️ QZ no conectado:", e.message);
      }
    })();
  }, []);

  // --- LOAD DATA ---
  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [closeRes, summaryRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`)
      ]);

      // --- FULL CLOSING ---
      let closeData = null;
      if (closeRes.status !== 404) {
        if (!closeRes.ok) throw new Error('Error cargando cierre');
        closeData = await closeRes.json();
      }

      // --- SUMMARY ---
      if (!summaryRes.ok) throw new Error('Error cargando summary');

      const summaryData = await summaryRes.json();

      console.log("🔥 SUMMARY OK:", summaryData);

      setClose(closeData && closeData.id ? closeData : null);
      setDatos(summaryData);

    } catch (err) {
      console.error("❌ ERROR LOAD:", err);
      setError('Error cargando datos del servidor');
      setDatos(null);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  // --- CALCULOS ---
  const gastosTotal = (datos?.gastos || []).reduce(
    (a, g) => a + Number(g.monto || 0),
    0
  );

  const ventasSistema = getTotalVentas(datos?.metodos || []);

  const ventasFisicoCalc =
    Number(efectivoFisico || 0) +
    Number(transferFisico || 0) +
    Number(tarjetaFisico || 0);

  const netoSistema = ventasSistema - gastosTotal;

  // --- SUBMIT ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico: Number(efectivoFisico),
          transferenciaFisico: Number(transferFisico),
          tarjetaFisico: Number(tarjetaFisico),
          propinaFisico: Number(propinaFisico),
          comandasFisico: Number(comandasFisico),
          date: today,
          remarks,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Error guardando cuadre');
      }

      setMessage('✅ Cuadre guardado correctamente');
      load();

    } catch (err) {
      console.error("❌ ERROR SUBMIT:", err);
      setError(err.message);
    }
  };

  // --- UI ---
  return (
    <PageTemplate title="Cuadre de Caja" theme="cash">

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {loading && <div>Cargando...</div>}

      {!loading && !datos && (
        <div style={{ color: 'red' }}>❌ No se pudieron cargar datos</div>
      )}

      {!loading && datos?.metodos?.length === 0 && (
        <div style={{ color: 'orange' }}>⚠ No hay ventas registradas hoy</div>
      )}

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

              {['cash', 'transfer', 'card'].map((metodo) => {
                const fisicoMap = {
                  cash: [efectivoFisico, setEfectivoFisico],
                  transfer: [transferFisico, setTransferFisico],
                  card: [tarjetaFisico, setTarjetaFisico],
                };

                const [value, setter] = fisicoMap[metodo];
                const sistema = getMetodoTotal(datos.metodos, metodo);

                return (
                  <tr key={metodo}>
                    <td>{metodo.toUpperCase()}</td>
                    <td>
                      <input
                        value={value}
                        onChange={e => setter(e.target.value)}
                      />
                    </td>
                    <td>{money(sistema)}</td>
                    <td>{money(Number(value) - sistema)}</td>
                  </tr>
                );
              })}

              <tr>
                <td><strong>Total Ventas</strong></td>
                <td>{money(ventasFisicoCalc)}</td>
                <td>{money(ventasSistema)}</td>
                <td>{money(ventasFisicoCalc - ventasSistema)}</td>
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
