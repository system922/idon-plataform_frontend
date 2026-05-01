import { useState, useEffect, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import qz from 'qz-tray';

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

  // ── QZ Tray & Printer ──────────────────────────────────────────
  const [qzConnected, setQzConnected] = useState(false);
  const [printerConfig, setPrinterConfig] = useState(null);
  const [bizInfo, setBizInfo] = useState(null);

  // ===============================
  // LOAD QZ TRAY & PRINTER CONFIG
  // ===============================
  useEffect(() => {
    const initQZ = async () => {
      try {
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }
        setQzConnected(true);
      } catch (err) {
        console.warn('QZ Tray no conectado:', err);
        setQzConnected(false);
      }
    };

    const loadPrinterConfig = async () => {
      try {
        const res = await fetchWithAuth('/api/settings/printer');
        if (res.ok) {
          const data = await res.json();
          setPrinterConfig({
            name: data.printer_name || 'POS-58',
            width: data.printer_width || 32,
            footer: data.printer_footer || null
          });
        }
      } catch (err) {
        console.warn('Error cargando configuración de impresora:', err);
      }
    };

    const loadBizInfo = async () => {
      try {
        const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
        if (selectedBusiness) {
          setBizInfo({
            name: selectedBusiness.name || selectedBusiness.business_name,
            ruc: selectedBusiness.ruc || selectedBusiness.tax_id,
            address: selectedBusiness.address,
            phone: selectedBusiness.phone
          });
        }
      } catch (err) {
        console.warn('Error cargando info del negocio:', err);
      }
    };

    initQZ();
    loadPrinterConfig();
    loadBizInfo();

    return () => {
      if (qz.websocket.isActive()) {
        qz.websocket.disconnect().catch(() => {});
      }
    };
  }, []);

  // ===============================
  // LOAD DATA
  // ===============================
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const [sumRes, openRes, closeRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
      ]);

      if (sumRes.ok) {
        setSummary(await sumRes.json());
      }

      if (openRes.ok) {
        setOpening(await openRes.json());
      }

      if (closeRes.ok) {
        const c = await closeRes.json();
        setClosing(c);

        // Cargar los valores guardados en el formulario
        setEfectivo(c.cash_counted || 0);
        setTransfer(c.transfer_counted || 0);
        setTarjeta(c.card_counted || 0);
        setPropina(c.tip_counted || 0);
        setComandas(c.orders_counted || 0);
        setRemarks(c.remarks || '');
      }

    } catch (e) {
      console.error('Error cargando datos:', e);
      setError('Error cargando datos del cierre');
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

  // 🔥 TOTALES CONTADOS (lo que ingresaste físicamente)
  const totalContado = toNum(efectivo) + toNum(transfer) + toNum(tarjeta) + toNum(propina);
  
  // 🔥 DIFERENCIA (lo que debería haber vs lo que hay)
  const diferencia = totalContado - cajaTotal;

  // ===============================
  // SAVE
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

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

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar cierre');
      }

      const closeData = await res.json();
      setClosing(closeData);

      setMsg('✔ Cierre guardado correctamente');

      // Recargar datos
      await load();

    } catch (e) {
      console.error('Error guardando cierre:', e);
      setError(e.message || 'Error al guardar cierre');
    }
  };

  // ===============================
  // DATOS PARA IMPRESIÓN
  // ===============================
  const datosAdicionales = {
    aperturaEfectivo,
    aperturaBanca,
    aperturaTotal,
    totalVentas,
    gastos,
    cajaTotal,
    totalContado,
    diferencia,
    ventas,
    gastosList: summary?.gastos || []
  };

  // ===============================
  // UI
  // ===============================
  return (
    <PageTemplate 
      title="Cierre de Caja Diario" 
      subtitle="Gestiona el cierre de caja, registra el conteo físico y genera reportes."
    >

      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-success">{msg}</div>}

      {loading && <div className="loading">Cargando...</div>}

      {!loading && summary && (

        <div className="cash-layout">

          {/* ================= LEFT ================= */}
          <div className="cash-left">

            <div className="card">
              <h3>📦 APERTURA</h3>
              <div className="row">
                <span>Efectivo:</span>
                <span>{money(aperturaEfectivo)}</span>
              </div>
              <div className="row">
                <span>Banca (Transferencias):</span>
                <span>{money(aperturaBanca)}</span>
              </div>
              <hr />
              <div className="row">
                <b>Total apertura:</b>
                <b>{money(aperturaTotal)}</b>
              </div>
            </div>

            <div className="card">
              <h3>💰 Ventas del día</h3>
              {ventas.length > 0 ? (
                ventas.map((m, i) => (
                  <div key={i} className="row">
                    <span>{m.payment_method}:</span>
                    <span>{money(m.total_cobrado)}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', fontSize: 14 }}>Sin ventas registradas</div>
              )}
              <hr />
              <div className="row">
                <b>Total ventas:</b>
                <b>{money(totalVentas)}</b>
              </div>
            </div>

            <div className="card">
              <h3>💸 EGRESOS</h3>
              {(summary?.gastos || []).length > 0 ? (
                (summary?.gastos || []).map((g, i) => (
                  <div key={i} className="row">
                    <span>{g.concepto}</span>
                    <span>{money(g.monto)}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888', fontSize: 14 }}>Sin egresos registrados</div>
              )}
              <hr />
              <div className="row">
                <b>Total egresos:</b>
                <b>{money(gastos)}</b>
              </div>
            </div>

            <div className="card total">
              <h3>📊 CAJA ESPERADO (SISTEMA)</h3>
              <div className="row">
                <span>Apertura:</span>
                <span>{money(aperturaTotal)}</span>
              </div>
              <div className="row">
                <span>+ Ventas:</span>
                <span>{money(totalVentas)}</span>
              </div>
              <div className="row">
                <span>- Egresos:</span>
                <span>{money(gastos)}</span>
              </div>
              <hr />
              <div className="row">
                <b>Total esperado:</b>
                <h2 style={{ margin: 0 }}>{money(cajaTotal)}</h2>
              </div>
            </div>

          </div>

          {/* ================= RIGHT ================= */}
          <div className="cash-right">

            {closing && (
              <div className="lock">🔒 CIERRE REALIZADO</div>
            )}

            <div className="card">
              <h3>💵 CONTEO FÍSICO EN CAJA</h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 15 }}>
                Ingresa los montos reales que tienes físicamente
              </p>

              <form onSubmit={handleSubmit} className="form">

                <label>
                  <span>Efectivo:</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={efectivo} 
                    onChange={e=>setEfectivo(e.target.value)} 
                    disabled={!!closing}
                  />
                </label>

                <label>
                  <span>Transferencias:</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={transfer} 
                    onChange={e=>setTransfer(e.target.value)} 
                    disabled={!!closing}
                  />
                </label>

                <label>
                  <span>Tarjeta:</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={tarjeta} 
                    onChange={e=>setTarjeta(e.target.value)} 
                    disabled={!!closing}
                  />
                </label>

                <label>
                  <span>Propina:</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    value={propina} 
                    onChange={e=>setPropina(e.target.value)} 
                    disabled={!!closing}
                  />
                </label>

                <label>
                  <span>Observaciones:</span>
                  <textarea
                    placeholder="Notas adicionales del cierre..."
                    value={remarks}
                    onChange={e=>setRemarks(e.target.value)}
                    disabled={!!closing}
                    rows={3}
                  />
                </label>

                <button type="submit" disabled={!!closing}>
                  {closing ? '✓ Cierre guardado' : 'Guardar cierre'}
                </button>

              </form>
            </div>

            {/* RESUMEN DE CONTEO */}
            {(efectivo > 0 || transfer > 0 || tarjeta > 0 || propina > 0) && (
              <div className="card">
                <h3>🧮 RESUMEN DEL CONTEO</h3>
                <div className="row">
                  <span>Total contado:</span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{money(totalContado)}</span>
                </div>
                <div className="row">
                  <span>Total esperado:</span>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{money(cajaTotal)}</span>
                </div>
                <hr />
                <div className="row">
                  <span>Diferencia:</span>
                  <span style={{ 
                    fontWeight: 700, 
                    fontSize: 18,
                    color: diferencia === 0 ? '#22c55e' : diferencia > 0 ? '#3b82f6' : '#ef4444'
                  }}>
                    {diferencia > 0 ? '+' : ''}{money(diferencia)}
                  </span>
                </div>
                {diferencia !== 0 && (
                  <div style={{ 
                    marginTop: 10, 
                    padding: 10, 
                    borderRadius: 6, 
                    background: diferencia > 0 ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                    fontSize: 12,
                    color: diferencia > 0 ? '#3b82f6' : '#ef4444'
                  }}>
                    {diferencia > 0 ? '💰 Sobrante en caja' : '⚠️ Faltante en caja'}
                  </div>
                )}
              </div>
            )}

            {closing && (
              <div className="actions">
                <PrintCashClosePdfButton
                  close={closing}
                  opening={opening}
                  summary={summary}
                />

                <PrintCashCloseButton
                  close={closing}
                  datos={datosAdicionales}
                  bizInfo={bizInfo}
                  printerConnected={qzConnected}
                  printerTicket={printerConfig}
                  className="btn btn-primary"
                />
              </div>
            )}

          </div>
        </div>
      )}
    </PageTemplate>
  );
}