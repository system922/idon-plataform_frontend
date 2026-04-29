import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import qz from 'qz-tray';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import usePrinterTicket from '../../hooks/usePrinterConfig'; // ✅ FIX IMPORT
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

// 🔥 Helper seguro
function getMetodoTotal(metodosArr, metodo) {
  if (!Array.isArray(metodosArr)) return 0;

  const obj = metodosArr.find(m => m.payment_method === metodo);

  console.log("🔍 Método:", metodo, "→", obj);

  return obj ? Number(obj.total_cobrado || 0) : 0;
}

// 🔥 Total dinámico
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

  const [close, setClose] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState(null);

  const [efectivoFisico, setEfectivoFisico] = useState('0.00');
  const [transferFisico, setTransferFisico] = useState('0.00');
  const [tarjetaFisico, setTarjetaFisico] = useState('0.00');
  const [propinaFisico, setPropinaFisico] = useState('0.00');
  const [comandasFisico, setComandasFisico] = useState('0');
  const [remarks, setRemarks] = useState('');

  const { selectedBusiness } = useBusinessContext();

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // --- QZ ---
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

        if (!qz.websocket.isActive()) await qz.websocket.connect();
      } catch (e) {
        console.warn("QZ no conectado");
      }
    })();
  }, []);

  // --- LOAD ---
  const load = useCallback(() => {
    setLoading(true);
    setError('');

    Promise.all([
      fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
        .then(r => r.status === 404 ? {} : r.json()).catch(() => null),

      fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`)
        .then(r => r.json()).catch(() => null),
    ])
    .then(([closeRes, datosRes]) => {

      console.log("🔥 API SUMMARY:", datosRes);

      setClose(closeRes && closeRes.id ? closeRes : null);
      setDatos(datosRes || null);

    })
    .finally(() => setLoading(false));

  }, [today]);

  useEffect(() => { load(); }, [load]);

  // 🔥 CÁLCULOS
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
      if (!res.ok) throw new Error(data?.error || 'Error');

      setMessage('✅ Cuadre guardado');
      load();

    } catch (err) {
      setError(err.message);
    }
  };

  // --- RENDER ---
  return (
    <PageTemplate title="Cuadre de Caja" theme="cash">

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {loading && <div>Cargando...</div>}

      {!loading && !datos && (
        <div style={{color:'red'}}>❌ No se pudieron cargar datos</div>
      )}

      {!loading && datos?.metodos?.length === 0 && (
        <div style={{color:'orange'}}>⚠ No hay ventas registradas hoy</div>
      )}

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

            <tr>
              <td>Efectivo</td>
              <td>
                <input
                  value={efectivoFisico}
                  onChange={e => setEfectivoFisico(e.target.value)}
                />
              </td>
              <td>{money(getMetodoTotal(datos?.metodos, "cash"))}</td>
              <td>{money(Number(efectivoFisico) - getMetodoTotal(datos?.metodos, "cash"))}</td>
            </tr>

            <tr>
              <td>Transferencia</td>
              <td>
                <input
                  value={transferFisico}
                  onChange={e => setTransferFisico(e.target.value)}
                />
              </td>
              <td>{money(getMetodoTotal(datos?.metodos, "transfer"))}</td>
              <td>{money(Number(transferFisico) - getMetodoTotal(datos?.metodos, "transfer"))}</td>
            </tr>

            <tr>
              <td>Tarjeta</td>
              <td>
                <input
                  value={tarjetaFisico}
                  onChange={e => setTarjetaFisico(e.target.value)}
                />
              </td>
              <td>{money(getMetodoTotal(datos?.metodos, "card"))}</td>
              <td>{money(Number(tarjetaFisico) - getMetodoTotal(datos?.metodos, "card"))}</td>
            </tr>

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
    </PageTemplate>
  );
}
