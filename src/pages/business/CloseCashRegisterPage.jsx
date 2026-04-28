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
      hour:   '2-digit', minute: '2-digit', second: '2-digit',
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

// --- Componente principal ---
export default function CashRegisterClosePage() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  const printerTicket = usePrinterTicket();

  const [close, setClose] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState(null);

  // Formulario
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

  // --- QZ Tray setup ---
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
        console.warn('⚠️ QZ Tray no disponible:', e?.message);
        setPrinterConnected(false);
      }
    })();
  }, []);

  // Traer datos
  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([
      fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
        .then(r => r.status === 404 ? {} : r.json()).catch(() => null),
      fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`)
        .then(r => r.json()).catch(() => null),
      fetchWithAuth('/api/settings/receipt-info')
        .then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([closeRes, datosRes, bizRes]) => {
      setClose(closeRes && closeRes.id ? closeRes : null);
      setDatos(datosRes || null);
      if (bizRes) setBizInfo(bizRes);
    }).finally(() => setLoading(false));
  }, [today]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if ([efectivoFisico, transferFisico, tarjetaFisico, propinaFisico, comandasFisico].some(x => x === '')) {
      setError('Ingrese todos los montos físicos solicitados');
      return;
    }
    try {
      setLoading(true);
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
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');
      setMessage('Cuadre de caja guardado!');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  let gastosTotal = 0;
  let ventasSistema = 0;
  let netoSistema = 0;
  if (datos) {
    const gastosList = Array.isArray(datos.gastos) ? datos.gastos : [];
    gastosTotal = gastosList.reduce((a, g) => a + Number(g.monto || 0), 0);
    ventasSistema = Number(datos.ventasEfectivo || 0) + Number(datos.ventasTransferencia || 0) + Number(datos.ventasTarjeta || 0);
    netoSistema = ventasSistema - gastosTotal;
  }
  const ventasFisicoCalc = Number(efectivoFisico || 0) + Number(transferFisico || 0) + Number(tarjetaFisico || 0);
  
  return (
    <PageTemplate
      title="Cuadre de Caja"
      subtitle="Comparativa (Sistema vs. Dinero contado), cierre detallado"
      theme="cash"
      headerAction={
        <button
          onClick={load}
          disabled={loading}
          className="modern-btn header-btn"
        >
          <RefreshCw size={15} className={loading ? 'loading-icon' : ''} />
          Actualizar
        </button>
      }
    >
      {error && <div className="alert-error"><AlertCircle size={15} /> {error}</div>}
      {message && <div className="alert-success">{message}</div>}

      {close ? (
        <div className="cash-close-readonly">
          {/* === Bloque 1: DATOS DEL CIERRE ===  */}
          <div className="cierre-bloque-info modern-block">
            <div className="info-row"><span className="info-label">Usuario:</span> <span className="info-value">{close.closing_user_id}</span></div>
            <div className="info-row"><span className="info-label">Fecha:</span> <span className="info-value">{fmtFechaHora(close.closing_date).split(" ")[0]}</span>
              <span className="info-label">Hora:</span> <span className="info-value">{fmtFechaHora(close.closing_time)}</span></div>
            <div className="info-row"><span className="info-label">Observaciones:</span> <span className="info-value">{close.remarks || '—'}</span></div>
            <div className="info-row"><span className="info-label">Creado:</span> <span className="info-value">{fmtFechaHora(close.created_at)}</span></div>
            <PrintCashCloseButton
              close={close}
              datos={datos}
              bizInfo={bizInfo}
              printerConnected={printerConnected}
              printerTicket={printerTicket} // <----------------
            />
          </div>

          {/* === Bloque 2: Detalle del Cierre === */}
          <div className="cierre-bloque-detalle modern-block">
            <h3 className="detalle-title">Detalle del Cierre</h3>
            <table className="cash-register-number-table modern-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Contado</th>
                  <th>Sistema</th>
                  <th>Diferencia</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="detalle-label">Efectivo</td>
                  <td>{money(close.cash_counted)}</td>
                  <td className="detalle-sistema">{money(close.cash_system)}</td>
                  <td className={getDiffEstado(close.diff_cash)}>{money(close.diff_cash)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Transferencia</td>
                  <td>{money(close.transfer_counted)}</td>
                  <td className="detalle-sistema">{money(close.transfer_system)}</td>
                  <td className={getDiffEstado(close.diff_transfer)}>{money(close.diff_transfer)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Tarjeta</td>
                  <td>{money(close.card_counted)}</td>
                  <td className="detalle-sistema">{money(close.card_system)}</td>
                  <td className={getDiffEstado(close.diff_card)}>{money(close.diff_card)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">N° Comandas</td>
                  <td>{close.orders_counted}</td>
                  <td className="detalle-sistema">{close.orders_system}</td>
                  <td className={getDiffEstado(close.diff_orders)}>{close.diff_orders}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Gastos</td>
                  <td colSpan={2}></td>
                  <td>{money(close.expenses_total)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Total</td>
                  <td>{money(close.total_counted)}</td>
                  <td className="detalle-sistema">{money(close.total_system)}</td>
                  <td className={getDiffEstado(close.diff_total)}>{money(close.diff_total)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Neto</td>
                  <td>{money(close.net_counted)}</td>
                  <td className="detalle-sistema">{money(close.net_system)}</td>
                  <td className={getDiffEstado(close.diff_net)}>{money(close.diff_net)}</td>
                </tr>
                <tr>
                  <td className="detalle-label">Extras (JSON)</td>
                  <td colSpan={3}>
                    <pre style={{whiteSpace:'pre-wrap',margin:0}}>
                      {close.extras ? JSON.stringify(close.extras, null, 2) : '—'}
                    </pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Fin modo lectura */}
        </div>
      ) : (
        <form
          autoComplete="off"
          spellCheck="false"
          onSubmit={handleSubmit}
          className="cash-close-form card-ui panel-glow"
        >
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
                <td><DollarSign size={15} style={{ marginRight: 6 }} />Efectivo</td>
                <td>
                  <input type="number" min={0} step="0.01" inputMode="decimal" required value={efectivoFisico}
                    onChange={e => setEfectivoFisico(e.target.value)} />
                </td>
                <td>{datos ? money(datos.ventasEfectivo) : '—'}</td>
                <td>
                  {efectivoFisico !== '' && datos &&
                    <span className={`cierre-diff ${getDiffEstado(Number(efectivoFisico) - Number(datos.ventasEfectivo || 0))}`}>
                      {Number(efectivoFisico) - Number(datos.ventasEfectivo || 0) === 0 ? '✔' : (Number(efectivoFisico) - Number(datos.ventasEfectivo || 0) > 0 ? '+' : '')}
                      {money(Number(efectivoFisico) - Number(datos.ventasEfectivo || 0))}
                      <span className="cierre-diff-label">{getDiffLabel(Number(efectivoFisico) - Number(datos.ventasEfectivo || 0))}</span>
                    </span>
                  }
                </td>
              </tr>
              <tr>
                <td><Briefcase size={15} style={{ marginRight: 6 }} />Transferencia</td>
                <td>
                  <input type="number" min={0} step="0.01" inputMode="decimal" required value={transferFisico}
                    onChange={e => setTransferFisico(e.target.value)} />
                </td>
                <td>{datos ? money(datos.ventasTransferencia) : '—'}</td>
                <td>
                  {transferFisico !== '' && datos &&
                    <span className={`cierre-diff ${getDiffEstado(Number(transferFisico) - Number(datos.ventasTransferencia || 0))}`}>
                      {Number(transferFisico) - Number(datos.ventasTransferencia || 0) === 0 ? '✔' : (Number(transferFisico) - Number(datos.ventasTransferencia || 0) > 0 ? '+' : '')}
                      {money(Number(transferFisico) - Number(datos.ventasTransferencia || 0))}
                      <span className="cierre-diff-label">{getDiffLabel(Number(transferFisico) - Number(datos.ventasTransferencia || 0))}</span>
                    </span>
                  }
                </td>
              </tr>
              <tr>
                <td><CreditCard size={15} style={{ marginRight: 6 }} />Tarjeta</td>
                <td>
                  <input type="number" min={0} step="0.01" inputMode="decimal" required value={tarjetaFisico}
                    onChange={e => setTarjetaFisico(e.target.value)} />
                </td>
                <td>{datos ? money(datos.ventasTarjeta) : '—'}</td>
                <td>
                  {tarjetaFisico !== '' && datos &&
                    <span className={`cierre-diff ${getDiffEstado(Number(tarjetaFisico) - Number(datos.ventasTarjeta || 0))}`}>
                      {Number(tarjetaFisico) - Number(datos.ventasTarjeta || 0) === 0 ? '✔' : (Number(tarjetaFisico) - Number(datos.ventasTarjeta || 0) > 0 ? '+' : '')}
                      {money(Number(tarjetaFisico) - Number(datos.ventasTarjeta || 0))}
                      <span className="cierre-diff-label">{getDiffLabel(Number(tarjetaFisico) - Number(datos.ventasTarjeta || 0))}</span>
                    </span>
                  }
                </td>
              </tr>
              <tr>
                <tr>
                <tr>
                  <td><Gift size={15} style={{ marginRight: 6 }} />Propinas</td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      required
                      value={propinaFisico}
                      onChange={e => setPropinaFisico(e.target.value)}
                    />
                  </td>
                  <td>—</td>
                  <td>—</td>
                </tr>
              </tr>
                <td>
                  {propinaFisico !== '' && datos &&
                    <span className={`cierre-diff ${getDiffEstado(Number(propinaFisico) - Number(datos.propinas || 0))}`}>
                      {Number(propinaFisico) - Number(datos.propinas || 0) === 0 ? '✔' : (Number(propinaFisico) - Number(datos.propinas || 0) > 0 ? '+' : '')}
                      {money(Number(propinaFisico) - Number(datos.propinas || 0))}
                      <span className="cierre-diff-label">{getDiffLabel(Number(propinaFisico) - Number(datos.propinas || 0))}</span>
                    </span>
                  }
                </td>
              </tr>
              <tr>
                <td className="label-comandas">N° Comandas</td>
                <td>
                  <input type="number" min={0} step="1" required value={comandasFisico}
                    onChange={e => setComandasFisico(e.target.value)} />
                </td>
                <td style={{ color: '#3b82f6', fontWeight: 'bold' }}>
                  {datos?.comandasSistema ?? '0'}
                </td>
                <td>
                  {comandasFisico !== '' && datos &&
                    <span className={`cierre-diff ${getDiffEstado(Number(comandasFisico) - Number(datos.comandasSistema || 0))}`}>
                      {Number(comandasFisico) - Number(datos.comandasSistema || 0) === 0 ? '✔' : (Number(comandasFisico) - Number(datos.comandasSistema || 0) > 0 ? '+' : '')}
                      {Number(comandasFisico) - Number(datos.comandasSistema || 0)}
                      <span className="cierre-diff-label">{getDiffLabel(Number(comandasFisico) - Number(datos.comandasSistema || 0))}</span>
                    </span>
                  }
                </td>
              </tr>
              <tr>
                <td className="label-totalventas">Total Ventas</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      minWidth: 90,
                      fontWeight: 'bold',
                      color: '#fff',
                      background: '#191919',
                      borderRadius: 8,
                      textAlign: 'right',
                      padding: '2px 12px'
                    }}
                  >
                    {money(ventasFisicoCalc)}
                  </span>
                </td>
                <td style={{ color: '#0ea5e9', fontWeight: 'bold' }}>
                  {money(ventasSistema)}
                </td>
                <td>
                  {datos &&
                    <span className={`cierre-diff ${getDiffEstado(ventasFisicoCalc - ventasSistema)}`}>
                      {ventasFisicoCalc - ventasSistema === 0 ? '✔' : ((ventasFisicoCalc - ventasSistema) > 0 ? '+' : '')}
                      {money(ventasFisicoCalc - ventasSistema)}
                      <span className="cierre-diff-label">{getDiffLabel(ventasFisicoCalc - ventasSistema)}</span>
                    </span>
                  }
                </td>
              </tr>
            </tbody>
          </table>

          <div className="gastos-section modern-block">
            <div className="cash-gasto-titulo">Gastos del Día</div>
            {(Array.isArray(datos?.gastos) && datos.gastos.length > 0)
              ? datos.gastos.map((g, i) =>
                <div key={i} className="cash-gasto-item">
                  <span className="gasto-concepto">{g.concepto || 'Gasto'}:</span>
                  <span className="gasto-monto">{money(g.monto)}</span>
                </div>
              )
              : <span className="cash-gasto-vacio">Sin gastos</span>
            }
            <div className="cash-gasto-total">
              Total gastos: <span>{money(gastosTotal)}</span>
            </div>
          </div>

          <div className="cash-neto-resume modern-block">
            <div className="cash-neto-grid">
              <div>
                <span className="cash-neto-label">Total Físico (ventas - gastos):</span>
                <span className="cash-neto-value">{netoSistema !== null ? money(ventasFisicoCalc - gastosTotal) : '—'}</span>
              </div>
              <div>
                <span className="cash-neto-label">Total Sistema (ventas - gastos):</span>
                <span className="cash-neto-value">{money(netoSistema)}</span>
              </div>
              <div>
                <span className="cierre-diff">
                </span>
              </div>
            </div>
          </div>
          <div style={{marginTop:16}}>
            <label>Observaciones:</label>
            <textarea value={remarks} onChange={e=>setRemarks(e.target.value)} rows={2} style={{width:'100%'}} />
          </div>
          <button type="submit" className="cash-save-btn" style={{marginTop:10}}>
            Guardar cuadre de caja
          </button>
        </form>
      )}
    </PageTemplate>
  );
}