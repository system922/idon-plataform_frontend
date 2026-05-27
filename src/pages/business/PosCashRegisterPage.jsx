// PosCashRegisterPage.jsx - Versión SIN precarga automática
import React, { useState, useEffect, useRef } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiX,
  FiDollarSign,
  FiLock,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiGrid,
  FiCreditCard,
  FiSave,
  FiSmartphone,
  FiHeart,
  FiBriefcase,
  FiPrinter,
  FiFileText
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/apiBase';
import { useCashDrawer } from '../../hooks/useCashDrawer';
import { usePrinterService } from '../../services/usePrinterService';
import PrintCashClosePdfButton, { generateCashClosePdfBase64 } from '../../components/PrintCashClosePdfButton';
import '../../styles/CierreDeCajaPage.css';

// ===============================
// HELPERS
// ===============================
const toNum = (v) => Number(v) || 0;

const money = (val) =>
  toNum(val).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

function getBusinessInfo() {
  try {
    return JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  } catch {
    return {};
  }
}

const DENOMINACIONES = {
  BILLETES: [100, 50, 20, 10, 5, 2, 1],
  MONEDAS: [1, 0.50, 0.25, 0.10, 0.05, 0.01]
};

const CierreDeCajaPage = ({ onClose, cajaData: initialCajaData }) => {
  const { openDrawer } = useCashDrawer();
  const { print } = usePrinterService();
  const { showConfirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  const [conteoEfectivo, setConteoEfectivo] = useState({});
  
  // Datos reales desde la API o desde props
  const [summary, setSummary] = useState(null);
  const [opening, setOpening] = useState(null);
  const [closing, setClosing] = useState(null);
  
  // CONTEO FISICO - TODOS INICIAN EN 0
  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);
  const [propinaFisico, setPropinaFisico] = useState(0);
  const [remarks, setRemarks] = useState('');
  
  const [resultadoCierre, setResultadoCierre] = useState(null);
  const [error, setError] = useState('');
  
  const [incomeExtras, setIncomeExtras] = useState([]);

  const pdfButtonRef = useRef(null);
  
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  // ===============================
  // INICIALIZAR CONTEO DE DENOMINACIONES
  // ===============================
  const inicializarConteoEfectivo = () => {
    const initialConteo = {};
    [...DENOMINACIONES.BILLETES, ...DENOMINACIONES.MONEDAS].forEach(denom => {
      initialConteo[denom] = 0;
    });
    setConteoEfectivo(initialConteo);
  };

  // ===============================
  // CARGAR DATOS REALES DESDE LA API (FALLBACK)
  // ===============================
  const cargarDatosReales = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [sumRes, openRes, closeRes, extrasRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/income-extra?date=${today}`)
      ]);

      let sumData = {};
      let openData = {};
      let closeData = null;
      let extrasData = [];

      if (sumRes.ok) sumData = await sumRes.json();
      if (openRes.ok) openData = await openRes.json();
      if (closeRes.ok) closeData = await closeRes.json();
      if (extrasRes.ok) extrasData = await extrasRes.json();

      setSummary(sumData);
      setOpening(openData);
      setIncomeExtras(Array.isArray(extrasData) ? extrasData : []);

      if (closeData) {
        setClosing(closeData);
        setEfectivoFisico(closeData.cash_counted || 0);
        setTransferFisico(closeData.transfer_counted || 0);
        setTarjetaFisico(closeData.card_counted || 0);
        setPropinaFisico(closeData.tip_counted || 0);
        setRemarks(closeData.remarks || '');
        setConteoEfectivo(closeData.cash_denomination_count || {});
      }
    } catch (err) {
      console.error('Error cargando datos del cierre:', err);
      setError('Error cargando datos del cierre');
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EFFECT PRINCIPAL: Usar datos del padre o cargar desde API
  // ===============================
  useEffect(() => {
    console.log('🔍 CierreDeCajaPage - initialCajaData:', initialCajaData);
    
    if (initialCajaData && initialCajaData.summary) {
      console.log('📦 Usando cajaData del padre');
      setSummary(initialCajaData.summary);
      setOpening(initialCajaData.opening || {});
      setIncomeExtras(initialCajaData.incomes || []);
      inicializarConteoEfectivo();
      setLoading(false);
    } else {
      console.log('📦 No hay cajaData del padre, cargando desde API');
      cargarDatosReales();
      inicializarConteoEfectivo();
    }
  }, []);

  const actualizarConteo = (denominacion, value) => {
    const numValue = parseInt(value) || 0;
    setConteoEfectivo(prev => ({
      ...prev,
      [denominacion]: numValue
    }));
    const nuevoTotal = calcularTotalEfectivoDesdeDenominaciones({
      ...conteoEfectivo,
      [denominacion]: numValue
    });
    setEfectivoFisico(nuevoTotal);
  };

  const calcularTotalEfectivoDesdeDenominaciones = (conteo) => {
    let total = 0;
    Object.entries(conteo).forEach(([denominacion, cantidad]) => {
      total += parseFloat(denominacion) * cantidad;
    });
    return total;
  };

  // ===============================
  // DATOS DEL SISTEMA (desde summary) - SOLO PARA MOSTRAR
  // ===============================
  const ventas = summary?.metodos || [];
  
  const ventasEfectivo      = Number(ventas.find(m => m.payment_method === 'cash')?.total_cobrado     || 0);
  const ventasTarjeta       = Number(ventas.find(m => m.payment_method === 'card')?.total_cobrado     || 0);
  const ventasTransferencia = Number(ventas.find(m => m.payment_method === 'transfer')?.total_cobrado || 0);
  const totalVentas = ventasEfectivo + ventasTarjeta + ventasTransferencia;
  
  const gastos = (summary?.gastos || []).reduce((a, g) => a + toNum(g.monto), 0);

  const aperturaEfectivo = toNum(opening?.total_efectivo);
  const aperturaBanca = toNum(opening?.monto_banca);
  const aperturaTotal = aperturaEfectivo + aperturaBanca;

  const extrasCash     = incomeExtras.filter(e => e.payment_method === 'cash')    .reduce((s, e) => s + toNum(e.amount), 0);
  const extrasCard     = incomeExtras.filter(e => e.payment_method === 'card')    .reduce((s, e) => s + toNum(e.amount), 0);
  const extrasTransfer = incomeExtras.filter(e => e.payment_method === 'transfer').reduce((s, e) => s + toNum(e.amount), 0);
  const totalExtras    = extrasCash + extrasCard + extrasTransfer;

  const totalGeneralEsperado = aperturaTotal + totalVentas - gastos + totalExtras;
  const totalContadoGeneral = toNum(efectivoFisico) + toNum(transferFisico) + toNum(tarjetaFisico);
  const diferenciaGeneral = totalContadoGeneral - totalGeneralEsperado;

  // ===============================
  // GUARDAR CIERRE
  // ===============================
  const handleGuardarCierre = async () => {
    setCerrando(true);
    setError('');

    const operador = getOperatorUser();
    const userName = operador?.nombre || operador?.name || operador?.username || operador?.email || 'Usuario';

    try {
      const res = await fetchWithAuth('/api/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          efectivoFisico: efectivoFisico,
          transferenciaFisico: transferFisico,
          tarjetaFisico: tarjetaFisico,
          propinaFisico: propinaFisico,
          date: today,
          remarks,
          cashDenominationCount: conteoEfectivo,
          closing_user_id: operador?.id,
          closing_user_name: userName,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar cierre');
      }

      const closeData = await res.json();
      const closeDataConPropina = {
        ...closeData,
        tip_counted: propinaFisico,
        propina: propinaFisico
      };
      setClosing(closeDataConPropina);

      generateCashClosePdfBase64(closeDataConPropina, opening, summary, incomeExtras)
        .then(pdfBase64 => fetchWithAuth('/api/pos/cash-register/send-close-email', {
          method: 'POST',
          body: JSON.stringify({
            pdfBase64,
            closingDate: today,
            totalVentas,
            totalContado: totalContadoGeneral,
            diferencia: diferenciaGeneral,
          }),
        }))
        .catch(() => {});

      setResultadoCierre({
        success: true,
        message: 'Cierre de caja guardado exitosamente',
        cierreId: closeData.id
      });

      const bizInfo = getBusinessInfo();
      const printData = {
        bizInfo,
        close: closeDataConPropina,
        summary: closeDataConPropina,
        sales: {
          transaction_count: closeDataConPropina.orders_system,
          total: closeDataConPropina.total_system,
        },
        expenses: summary?.gastos || [],
        cashFlow: {
          opening_float: aperturaEfectivo + aperturaBanca,
          extra_income: totalExtras,
          expected_cash: totalGeneralEsperado,
          counted_cash: totalContadoGeneral,
          cash_diff: diferenciaGeneral,
        },
        totals: {
          system_total: closeDataConPropina.total_system,
          counted_total: closeDataConPropina.total_counted,
          total_diff: closeDataConPropina.diff_total,
        },
      };
      print('printer_main', 'cash-close', printData).catch(() => {});

      setTimeout(() => {
        onClose?.(true);
      }, 4000);

    } catch (err) {
      setError(err.message || 'Error al guardar cierre');
      setResultadoCierre({
        success: false,
        message: err.message || 'Error al cerrar la caja'
      });
    } finally {
      setCerrando(false);
    }
  };

  if (loading) {
    return (
      <div className="cierre-modal-overlay">
        <div className="cierre-modal-container">
          <div className="cierre-loading">
            <div className="spinner"></div>
            <p>Cargando datos del cierre...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cierre-modal-overlay">
      <div className="cierre-modal-container">
        <div className="cierre-modal-header">
          <div className="cierre-header-title">
            <FiLock size={20} color="#f97316" />
            <h2>CUADRE DE CAJA DIARIO</h2>
          </div>
          <button className="cierre-close-btn" onClick={() => onClose?.(false)}>
            <FiX size={20} />
          </button>
        </div>

        {resultadoCierre ? (
          <div className="cierre-resultado">
            {resultadoCierre.success ? <FiCheckCircle size={48} color="#10b981" /> : <FiAlertCircle size={48} color="#ef4444" />}
            <h3>{resultadoCierre.success ? 'Cierre Exitoso!' : 'Error en Cierre'}</h3>
            <p>{resultadoCierre.message}</p>
            {resultadoCierre.success && (
              <div style={{ marginTop: 20, display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => {
                      const bizInfo = getBusinessInfo();
                      print('printer_main', 'cash-close', {
                        bizInfo,
                        close: closing,
                        summary: closing,
                        sales: { transaction_count: closing?.orders_system, total: closing?.total_system },
                        expenses: summary?.gastos || [],
                        cashFlow: { opening_float: aperturaEfectivo + aperturaBanca, extra_income: totalExtras, expected_cash: totalGeneralEsperado, counted_cash: totalContadoGeneral },
                        totals: { system_total: closing?.total_system, counted_total: closing?.total_counted, total_diff: closing?.diff_total },
                      }).catch(() => {});
                    }}
                  >
                    <FiPrinter size={15} /> Reimprimir ticket
                  </button>
                  <PrintCashClosePdfButton
                    ref={pdfButtonRef}
                    close={closing}
                    opening={opening}
                    summary={summary}
                    incomeExtras={incomeExtras}
                    className="btn-secondary"
                  />
                </div>
                <small style={{ color: '#a0a0b0' }}>✅ Imprimiendo ticket automáticamente...</small>
              </div>
            )}
          </div>
        ) : (
          <div className="cierre-modal-content">
            {error && <div className="alert-error">{error}</div>}
            
            {closing && (
              <div className="alert-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiLock size={14} />
                  <span>Ya existe un cierre registrado para hoy</span>
                </div>
                <div className="print-buttons-group">
                  <button
                    className="btn-print-small-modern"
                    onClick={() => {
                      print('printer_main', 'cash-close', {
                        bizInfo: getBusinessInfo(),
                        close: closing,
                        summary: closing,
                        sales: { transaction_count: closing?.orders_system, total: closing?.total_system },
                        expenses: summary?.gastos || [],
                        cashFlow: { opening_float: aperturaEfectivo + aperturaBanca, extra_income: totalExtras, expected_cash: totalGeneralEsperado, counted_cash: totalContadoGeneral },
                        totals: { system_total: closing?.total_system, counted_total: closing?.total_counted, total_diff: closing?.diff_total },
                      }).catch(() => {});
                    }}
                  >
                    <FiPrinter size={13} /> Imprimir
                  </button>
                  <PrintCashClosePdfButton
                    close={closing}
                    opening={opening}
                    summary={summary}
                    incomeExtras={incomeExtras}
                    className="btn-pdf-small-modern"
                  />
                </div>
              </div>
            )}

            {/* 3 TARJETAS HORIZONTALES */}
            <div className="cards-row">
              <div className="card-info">
                <div className="card-header">
                  <FiBriefcase className="card-icon" />
                  <h4>APERTURA</h4>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="label">Efectivo</span>
                    <span className="value">{money(aperturaEfectivo)}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">Banca (Transferencia)</span>
                    <span className="value">{money(aperturaBanca)}</span>
                  </div>
                  <div className="card-divider"></div>
                  <div className="card-row">
                    <span className="label">Total Apertura</span>
                    <span className="value total">{money(aperturaTotal)}</span>
                  </div>
                </div>
              </div>

              <div className="card-info">
                <div className="card-header">
                  <FiTrendingUp className="card-icon" />
                  <h4>VENTAS DEL DIA</h4>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="label">Efectivo</span>
                    <span className="value">{money(ventasEfectivo)}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">Tarjeta</span>
                    <span className="value">{money(ventasTarjeta)}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">Transferencia</span>
                    <span className="value">{money(ventasTransferencia)}</span>
                  </div>
                  <div className="card-divider"></div>
                  <div className="card-row">
                    <span className="label">Gastos</span>
                    <span className="value negative">-{money(gastos)}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">Total Ventas Netas</span>
                    <span className="value total">{money(totalVentas - gastos)}</span>
                  </div>
                </div>
              </div>

              <div className="card-info highlight">
                <div className="card-header">
                  <FiDollarSign className="card-icon" />
                  <h4>TOTAL GENERAL ESPERADO</h4>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="label">Total Apertura</span>
                    <span className="value">{money(aperturaTotal)}</span>
                  </div>
                  <div className="card-row">
                    <span className="label">+ Ventas Netas</span>
                    <span className="value">{money(totalVentas - gastos)}</span>
                  </div>
                  {totalExtras > 0 && (
                    <div className="card-row">
                      <span className="label">+ Ingresos Extras</span>
                      <span className="value" style={{ color: '#10b981' }}>{money(totalExtras)}</span>
                    </div>
                  )}
                  <div className="card-divider"></div>
                  <div className="card-row">
                    <span className="label">= Total Esperado</span>
                    <span className="value expected">{money(totalGeneralEsperado)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTEO FISICO - EFECTIVO (Denominaciones) */}
            <div className="cierre-section">
              <div className="section-header">
                <FiGrid size={16} className="section-icon" />
                <h3>CONTEO FISICO - EFECTIVO</h3>
              </div>
              <div className="denom-container">
                <div className="denom-group">
                  <div className="denom-title">BILLETES</div>
                  <div className="denom-grid">
                    {DENOMINACIONES.BILLETES.map(denom => (
                      <div key={denom} className="denom-input-group">
                        <label>${denom}</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="denom-input"
                          value={conteoEfectivo[denom] || 0}
                          onChange={(e) => actualizarConteo(denom, e.target.value)}
                          disabled={!!closing}
                          placeholder="0"
                        />
                        <span className="denom-subtotal">{money((conteoEfectivo[denom] || 0) * denom)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="denom-group">
                  <div className="denom-title">MONEDAS</div>
                  <div className="denom-grid">
                    {DENOMINACIONES.MONEDAS.map(denom => (
                      <div key={denom} className="denom-input-group">
                        <label>${denom}</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="denom-input"
                          value={conteoEfectivo[denom] || 0}
                          onChange={(e) => actualizarConteo(denom, e.target.value)}
                          disabled={!!closing}
                          placeholder="0"
                        />
                        <span className="denom-subtotal">{money((conteoEfectivo[denom] || 0) * denom)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="total-efectivo">
                <span>Total Efectivo Contado:</span>
                <strong>{money(efectivoFisico)}</strong>
              </div>
            </div>

            {/* 2 COLUMNAS - CONTEO FISICO MANUAL */}
            <div className="two-columns-layout">
              <div className="left-column">
                {/* OTROS METODOS DE PAGO - CAMPOS MANUALES (SIN PRECARGA) */}
                <div className="metodos-card">
                  <div className="card-header">
                    <FiCreditCard className="card-icon" />
                    <h3>CONTEO FISICO - OTROS MÉTODOS</h3>
                  </div>
                  <div className="metodos-grid">
                    <div className="metodo-input">
                      <label>
                        <FiSmartphone size={12} /> Transferencia
                        <span style={{ fontSize: 11, color: '#a0a0b0', marginLeft: 8 }}>
                          (Sistema: {money(ventasTransferencia)})
                        </span>
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="metodo-input-field"
                        value={transferFisico === 0 ? '' : transferFisico}
                        onChange={(e) => setTransferFisico(toNum(e.target.value))} 
                        disabled={!!closing} 
                        placeholder="0.00" 
                      />
                    </div>
                    <div className="metodo-input">
                      <label>
                        <FiCreditCard size={12} /> Tarjeta
                        <span style={{ fontSize: 11, color: '#a0a0b0', marginLeft: 8 }}>
                          (Sistema: {money(ventasTarjeta)})
                        </span>
                      </label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="metodo-input-field"
                        value={tarjetaFisico === 0 ? '' : tarjetaFisico}
                        onChange={(e) => setTarjetaFisico(toNum(e.target.value))} 
                        disabled={!!closing} 
                        placeholder="0.00" 
                      />
                    </div>
                  </div>
                </div>

                <div className="ingreso-card">
                  <div className="card-header">
                    <FiHeart className="card-icon" />
                    <h3>INGRESOS EXTRAS & PROPINA</h3>
                  </div>

                  <div style={{ fontSize: 11, color: '#a0a0b0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Extras del día <span style={{ color: '#10b981' }}>(afectan cuadre)</span>
                  </div>
                  {incomeExtras.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#666', padding: '4px 0 8px' }}>Sin ingresos extras registrados hoy</div>
                  ) : (
                    <>
                      {incomeExtras.map(extra => (
                        <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ color: '#e2e8f0' }}>{extra.description || 'Ingreso extra'}</span>
                            <span style={{ fontSize: 10, color: '#888' }}>
                              {{ cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' }[extra.payment_method] || extra.payment_method}
                            </span>
                          </div>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{money(toNum(extra.amount))}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontWeight: 700, fontSize: 13 }}>
                        <span>Total extras:</span>
                        <span style={{ color: '#10b981' }}>{money(totalExtras)}</span>
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: '#a0a0b0', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Propina <span style={{ color: '#f39c12' }}>(sin cuadre)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        step="0.01"
                        className="ingreso-input-field"
                        value={propinaFisico === 0 ? '' : propinaFisico}
                        onChange={(e) => setPropinaFisico(toNum(e.target.value))}
                        disabled={!!closing}
                        placeholder="0.00"
                        style={{ flex: 1 }}
                      />
                      {propinaFisico > 0 && (
                        <span style={{ color: '#f39c12', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                          {money(propinaFisico)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="comparativa-card">
                <div className="card-header">
                  <FiAlertCircle className="card-icon" />
                  <h3>COMPARATIVA DE CIERRE</h3>
                </div>
                <div className="comparativa-row">
                  <span className="label">Efectivo Contado:</span>
                  <span className="value">{money(efectivoFisico)}</span>
                </div>
                <div className="comparativa-row">
                  <span className="label">Transferencia Contada:</span>
                  <span className="value">{money(transferFisico)}</span>
                </div>
                <div className="comparativa-row">
                  <span className="label">Tarjeta Contada:</span>
                  <span className="value">{money(tarjetaFisico)}</span>
                </div>
                <div className="comparativa-row highlight">
                  <span className="label">TOTAL CONTADO FISICO:</span>
                  <span className="total-value">{money(totalContadoGeneral)}</span>
                </div>
                <div className="comparativa-row">
                  <span className="label">TOTAL ESPERADO SISTEMA:</span>
                  <span className="value">{money(totalGeneralEsperado)}</span>
                </div>
                <div className={`comparativa-row diferencia-row ${diferenciaGeneral > 0 ? 'positive' : diferenciaGeneral < 0 ? 'negative' : ''}`}>
                  <span className="label">DIFERENCIA:</span>
                  <span>{diferenciaGeneral > 0 ? '+' : ''}{money(diferenciaGeneral)}</span>
                </div>
                {Math.abs(diferenciaGeneral) > 5 && (
                  <div className="alerta-descuadre">
                    <FiAlertCircle size={12} />
                    <span>Atencion! Descuadre mayor a $5. Verifica el conteo.</span>
                  </div>
                )}
                <div className="propina-extra-row">
                  <span className="label">Propina (sin cuadre):</span>
                  <span>{money(propinaFisico)}</span>
                </div>
                {totalExtras > 0 && (
                  <div className="propina-extra-row" style={{ color: '#10b981' }}>
                    <span className="label">+ Ingresos extras:</span>
                    <span>{money(totalExtras)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div className="observaciones-card">
              <div className="card-header">
                <FiAlertCircle className="card-icon" />
                <h3>OBSERVACIONES DEL CIERRE</h3>
              </div>
              <textarea
                className="observaciones-input"
                placeholder="Notas adicionales del cierre..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!!closing}
                rows={3}
              />
            </div>

            {/* BOTONES */}
            <div className="cierre-buttons">
              <button className="btn-cancelar" onClick={() => onClose?.(false)} disabled={cerrando}>
                Cancelar
              </button>
              <button className="btn-guardar" onClick={handleGuardarCierre} disabled={cerrando || !!closing}>
                {cerrando ? (
                  <>
                    <div className="spinner"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FiSave size={14} />
                    {closing ? 'Cierre ya realizado' : 'Guardar Cierre'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CierreDeCajaPage;