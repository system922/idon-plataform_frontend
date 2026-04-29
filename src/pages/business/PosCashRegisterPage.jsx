import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, AlertCircle, DollarSign, Briefcase, Gift, CreditCard } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
import qz from 'qz-tray';
import { useBusinessContext } from '../../admin/config/BusinessContext';
import usePrinterTicket from '../../hooks/usePrinterConfig.';
import PrintCashCloseButton from '../../components/PrintCashCloseButton';
import '../../styles/CloseCash.css';

// --- Helpers ---
function money(val) {
  if (val === null || val === undefined || isNaN(val)) return '00.00';
  return Number(val).toLocaleString('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtFechaHora(str) {
  if (!str) return '—';
  try {
    if (/^\d{2}:\d{2}:\d{2}/.test(str)) return str.slice(0,8);
    const d = new Date(str);
    return d.toLocaleDateString('es-EC', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      timeZone: 'America/Guayaquil'
    }) + ' ' +
    d.toLocaleTimeString('es-EC', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: 'America/Guayaquil'
    });
  } catch {
    return str;
  }
}

function getDiffEstado(dif) {
  if (dif === 0) return 'cierre-ok';
  if (dif < 0) return 'cierre-faltante';
  return 'cierre-sobrante';
}

function getDiffLabel(dif) {
  if (dif === 0) return 'OK';
  if (dif < 0) return 'FALTANTE';
  return 'SOBRANTE';
}

// 🔥 Helper seguro
function getMetodoTotal(metodosArr, metodo) {
  const obj = (metodosArr || []).find(m => m.payment_method === metodo);
  return obj ? Number(obj.total_cobrado) : 0;
}

// 🔥 Total dinámico (PRO)
function getTotalVentas(metodosArr) {
  return (metodosArr || []).reduce(
    (acc, m) => acc + Number(m.total_cobrado || 0),
    0
  );
}

// --- COMPONENTE ---
export default function CashRegisterClosePage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

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
  const [bizInfo, setBizInfo] = useState(null);
  const [printerConnected, setPrinterConnected] = useState(false);

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
        setPrinterConnected(true);
      } catch (e) {
        setPrinterConnected(false);
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

      fetchWithAuth('/api/settings/receipt-info')
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ])
    .then(([closeRes, datosRes, bizRes]) => {
      setClose(closeRes && closeRes.id ? closeRes : null);
      setDatos(datosRes || null);
      if (bizRes) setBizInfo(bizRes);
    })
    .finally(() => setLoading(false));

  }, [today]);

  useEffect(() => { load(); }, [load]);

  // 🔥 CÁLCULOS ROBUSTOS
  const gastosTotal = (datos?.gastos || []).reduce(
    (a, g) => a + Number(g.monto || 0),
    0
  );

  const ventasSistema = getTotalVentas(datos?.metodos);

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

      setMessage('Cuadre guardado');
      load();

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <PageTemplate title="Cuadre de Caja" theme="cash">

      {error && <div className="alert-error">{error}</div>}
      {message && <div className="alert-success">{message}</div>}

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
              <td><input value={efectivoFisico} onChange={e => setEfectivoFisico(e.target.value)} /></td>
              <td>{money(getMetodoTotal(datos?.metodos, "cash"))}</td>
              <td>{money(Number(efectivoFisico) - getMetodoTotal(datos?.metodos, "cash"))}</td>
            </tr>

            <tr>
              <td>Transferencia</td>
              <td><input value={transferFisico} onChange={e => setTransferFisico(e.target.value)} /></td>
              <td>{money(getMetodoTotal(datos?.metodos, "transfer"))}</td>
              <td>{money(Number(transferFisico) - getMetodoTotal(datos?.metodos, "transfer"))}</td>
            </tr>

            <tr>
              <td>Tarjeta</td>
              <td><input value={tarjetaFisico} onChange={e => setTarjetaFisico(e.target.value)} /></td>
              <td>{money(getMetodoTotal(datos?.metodos, "card"))}</td>
              <td>{money(Number(tarjetaFisico) - getMetodoTotal(datos?.metodos, "card"))}</td>
            </tr>

            <tr>
              <td>Total Ventas</td>
              <td>{money(ventasFisicoCalc)}</td>
              <td>{money(ventasSistema)}</td>
              <td>{money(ventasFisicoCalc - ventasSistema)}</td>
            </tr>

          </tbody>
        </table>

        <div>Total gastos: {money(gastosTotal)}</div>
        <div>Neto sistema: {money(netoSistema)}</div>

        <textarea value={remarks} onChange={e => setRemarks(e.target.value)} />

        <button type="submit">Guardar</button>

      </form>
    </PageTemplate>
  );
}