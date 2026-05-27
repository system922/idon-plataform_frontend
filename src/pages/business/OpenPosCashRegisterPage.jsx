import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { RefreshCw, AlertCircle, DollarSign, Briefcase, Gift } from 'react-feather';
import API_BASE, { fetchWithAuth } from '../../config/apiBase';
import '../../styles/OpenCash.css';

function getHeaders(schema) {
  const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-DB-Name': schema,
  };
}

export default function CashRegisterClosePage() {
  const schema = localStorage.getItem('idonSchema') || localStorage.getItem('schemaName') || '';
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });

  const [close, setClose] = useState(null);
  const [loading, setLoading] = useState(true);
  const [datos, setDatos] = useState(null);
  const [efectivoFisico, setEfectivoFisico] = useState('');
  const [transferFisico, setTransferFisico] = useState('');
  const [propinaFisico, setPropinaFisico] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Cargar cuadre/cierre y datos del día
  const load = useCallback(() => {
    setLoading(true); setError('');
    Promise.all([
      fetchWithAuth(`/api/pos/cash-register/closing?date=${today}`)
        .then(r => r.json()).catch(() => null),
      // 🔥 MEJORA: Agregar parámetro status y consultar también órdenes
      fetchWithAuth(`/api/pos/cash-register/summary?date=${today}&status=completed,paid`)
        .then(r => r.json()).catch(() => null),
      fetchWithAuth(`/api/ordenes?date=${today}&limit=999`)
        .then(r => r.json()).catch(() => null),
    ]).then(([closeRes, datosRes, ordersRes]) => {
      setClose(closeRes && closeRes.id ? closeRes : null);
      
      // 🔥 NUEVO: Si summary está vacío, calcular desde orders
      if (!datosRes || !datosRes.metodos || datosRes.metodos.length === 0) {
        const allOrders = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.orders || ordersRes?.data || []);
        
        if (allOrders.length > 0) {
          const ordenesPagadas = allOrders.filter(o => 
            o.status === 'completed' || 
            o.status === 'paid' || 
            o.status === 'partially_paid'
          );

          const groupByMethod = {};
          ordenesPagadas.forEach(o => {
            const method = o.payment_method || 'cash';
            const total = Number(o.total) || 0;
            if (!groupByMethod[method]) groupByMethod[method] = 0;
            groupByMethod[method] += total;
          });

          const ventasPorMetodo = Object.entries(groupByMethod).map(([method, total]) => ({
            payment_method: method,
            total_cobrado: total
          }));

          datosRes = {
            ...datosRes,
            metodos: ventasPorMetodo,
            ventasEfectivo: groupByMethod['cash'] || 0,
            ventasTransferencia: groupByMethod['transfer'] || 0,
            ventasTarjeta: groupByMethod['card'] || 0,
          };
        }
      }
      
      setDatos(datosRes || null);
    }).finally(() => setLoading(false));
  }, [schema, today]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // ✅ Prevención de doble envío
    setMessage('');
    setError('');
    if (!efectivoFisico || !transferFisico || !propinaFisico) { setError('Ingrese todos los montos físicos'); return; }
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico: Number(efectivoFisico),
          transferenciaFisico: Number(transferFisico),
          propinaFisico: Number(propinaFisico),
          date: today,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar');
      setMessage('Cuadre de caja guardado!');
      setClose(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Data de sistema: ventas, transfer, propinas, comandas, gastos, neto
  let neto = 0, gastosTotal = 0;
  if (datos) {
    gastosTotal = (datos.gastos ?? []).reduce((a, g) => a + Number(g.monto), 0);
    neto = (Number(datos.ventasEfectivo || 0) + Number(datos.ventasTransferencia || 0)) - gastosTotal;
  }

  return (
    <PageTemplate
      title="Cuadre de Caja"
      subtitle="Comparativa de sistema y físico al cerrar la caja"
      theme="cash"
      headerAction={
        <button
          onClick={load}
          disabled={loading}
          className="cash-refresh-btn" /* se usa tu clase, SIN inline */
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : undefined }} />
          Actualizar
        </button>
      }
    >
      {error && (
        <div className="alert-error">
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {message && (
        <div className="alert-success">{message}</div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: '#888', padding: 28 }}>Cargando...</div>
      ) : close ? (
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 14 }}>Cuadre registrado hoy</div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Efectivo físico: <b style={{ color: '#22c55e' }}>${close.efectivoFisico}</b>
          </div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Transferencia física: <b style={{ color: '#3b82f6' }}>${close.transferenciaFisico}</b>
          </div>
          <div style={{ fontSize: 15, marginBottom: 8 }}>
            Propina física: <b style={{ color: '#f59e42' }}>${close.propinaFisico}</b>
          </div>
          <div style={{ color: '#888', fontSize: 13 }}>Fecha: {close.date}</div>
        </div>
      ) : (
        <form
          autoComplete="off"
          spellCheck="false"
          onSubmit={handleSubmit}
          className="cash-close-form"
        >
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Físico</th>
                <th>Sistema</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><DollarSign size={15} style={{ marginRight: 5 }} />Efectivo</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    required
                    value={efectivoFisico}
                    onChange={e => setEfectivoFisico(e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center', color: '#064e3b', fontWeight: 600 }}>{datos?.ventasEfectivo ?? '—'}</td>
              </tr>
              <tr>
                <td><Briefcase size={15} style={{ marginRight: 5 }} />Transferencia</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    required
                    value={transferFisico}
                    onChange={e => setTransferFisico(e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 600 }}>{datos?.ventasTransferencia ?? '—'}</td>
              </tr>
              <tr>
                <td><Gift size={15} style={{ marginRight: 5 }} />Propinas</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="number"
                    min={0}
                    required
                    value={propinaFisico}
                    onChange={e => setPropinaFisico(e.target.value)}
                  />
                </td>
                <td style={{ textAlign: 'center', color: '#f59e42', fontWeight: 600 }}>{datos?.propinas ?? '—'}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ background: '#1e2121', fontSize: 14, padding: "7px 8px" }}>
                  <b>N° Comandas:</b>
                  <span style={{ marginLeft: 10, color: '#52525b', fontWeight: 600 }}>Físico: {datos?.comandasFisico ?? '—'}</span>
                  <span style={{ marginLeft: 10, color: '#6366f1', fontWeight: 600 }}>Sistema: {datos?.comandasSistema ?? '—'}</span>
                </td>
              </tr>
              <tr>
                <td colSpan={3}>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>Gastos del Día</div>
                  {(datos?.gastos ?? []).length === 0
                    ? <span style={{ fontSize: 13, color: '#aaa' }}>Sin gastos</span>
                    : (datos.gastos.map((g, i) =>
                      <div key={i} style={{ fontSize: 13 }}>
                        <span className="gasto-concepto">{g.concepto || 'Gasto'}:</span>
                        <span className="gasto-monto">${g.monto}</span>
                      </div>
                    ))
                  }
                  <div style={{ marginTop: 3, color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                    Total gastos: ${gastosTotal}
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                  Total Neto (ventas-gastos):
                </td>
                <td style={{ textAlign: 'center' }}>
                  ${neto}
                </td>
              </tr>
            </tfoot>
          </table>
          <button type="submit">
            Guardar cuadre de caja
          </button>
        </form>
      )}
    </PageTemplate>
  );
}