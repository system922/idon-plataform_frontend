// PosCashRegisterPage.jsx - Conteo físico SOLO para EFECTIVO
import React, { useState, useEffect, useRef } from 'react';
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
// IMPORTAR LOS COMPONENTES EXISTENTES
import PrintCashCloseButton from '../../components/PrintCashCloseButton';
import PrintCashClosePdfButton from '../../components/PrintCashClosePdfButton';
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

// CONFIGURACIÓN DE IMPRESORA
const PRINTER_CONFIG = {
  name: 'POS-58',
  width: 32
};

const CierreDeCajaPage = ({ onClose, cajaData: initialCajaData }) => {
  const { openDrawer } = useCashDrawer();
  const [loading, setLoading] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [conteoEfectivo, setConteoEfectivo] = useState({});
  
  // Datos reales desde la API
  const [summary, setSummary] = useState(null);
  const [opening, setOpening] = useState(null);
  const [closing, setClosing] = useState(null);
  
  // CONTEO FISICO
  const [efectivoFisico, setEfectivoFisico] = useState(0);
  const [transferFisico, setTransferFisico] = useState(0);
  const [tarjetaFisico, setTarjetaFisico] = useState(0);
  const [propinaFisico, setPropinaFisico] = useState(0);
  const [remarks, setRemarks] = useState('');
  
  const [resultadoCierre, setResultadoCierre] = useState(null);
  const [error, setError] = useState('');
  
  // Refs para los botones (para llamarlos programáticamente)
  const printButtonRef = useRef(null);
  const pdfButtonRef = useRef(null);
  
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  // ===============================
  // CARGAR DATOS REALES DESDE LA API
  // ===============================
  const cargarDatosReales = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [sumRes, openRes, closeRes] = await Promise.all([
        fetchWithAuth(`/api/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/api/pos/cash-register/full-closing?date=${today}`)
      ]);

      if (sumRes.ok) {
        const sumData = await sumRes.json();
        setSummary(sumData);
      }

      if (openRes.ok) {
        const openData = await openRes.json();
        setOpening(openData);
      }

      if (closeRes.ok) {
        const c = await closeRes.json();
        setClosing(c);
        setEfectivoFisico(c.cash_counted || 0);
        setTransferFisico(c.transfer_counted || 0);
        setTarjetaFisico(c.card_counted || 0);
        setPropinaFisico(c.tip_counted || 0);
        setRemarks(c.remarks || '');
        setConteoEfectivo(c.cash_denomination_count || {});
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error cargando datos del cierre');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosReales();
    inicializarConteoEfectivo();
  }, []);

  const inicializarConteoEfectivo = () => {
    const initialConteo = {};
    [...DENOMINACIONES.BILLETES, ...DENOMINACIONES.MONEDAS].forEach(denom => {
      initialConteo[denom] = 0;
    });
    setConteoEfectivo(initialConteo);
  };

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
  // DATOS REALES DEL SISTEMA
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
  
  const totalGeneralEsperado = aperturaTotal + totalVentas - gastos;
  const totalContadoGeneral = toNum(efectivoFisico) + toNum(transferFisico) + toNum(tarjetaFisico);
  const diferenciaGeneral = totalContadoGeneral - totalGeneralEsperado;

  // 🔥 DATOS PARA IMPRESIÓN - INCLUYENDO PROPINA CORRECTAMENTE
  const datosParaImpresion = {
    aperturaEfectivo,
    aperturaBanca,
    aperturaTotal,
    totalVentas,
    gastos,
    cajaTotal: totalGeneralEsperado,
    totalContado: totalContadoGeneral,
    diferencia: diferenciaGeneral,
    ventas: ventas,
    gastosList: summary?.gastos || [],
    conteoDenominaciones: conteoEfectivo,
    propina: propinaFisico,        // 🔥 Propina incluida
    propinaExtra: propinaFisico,    // 🔥 Campo alternativo
    remarks: remarks,
    efectivoFisico: efectivoFisico,
    transferFisico: transferFisico,
    tarjetaFisico: tarjetaFisico,
    // 🔥 Asegurar que los métodos de pago contados estén disponibles
    metodosContados: {
      efectivo: efectivoFisico,
      transferencia: transferFisico,
      tarjeta: tarjetaFisico,
      propina: propinaFisico
    }
  };

  // 🔥 Crear objeto closing completo para imprimir (incluyendo propina)
  const closingConPropina = closing ? {
    ...closing,
    tip_counted: propinaFisico,
    propina: propinaFisico,
    remarks: remarks
  } : null;

  // ===============================
  // GUARDAR CIERRE
  // ===============================
  const handleGuardarCierre = async () => {
    if (!window.confirm('¿Estás seguro de cerrar la caja? Esta acción no se puede deshacer.')) {
      return;
    }

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
          cashDenominationCount: conteoEfectivo
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar cierre');
      }

      const closeData = await res.json();
      // 🔥 Asegurar que la propina esté en el objeto closing
      const closeDataConPropina = {
        ...closeData,
        tip_counted: propinaFisico,
        propina: propinaFisico
      };
      setClosing(closeDataConPropina);

      // Auditoria
      if (operador?.id) {
        const diferenciaTexto = diferenciaGeneral === 0 
          ? 'Sin diferencias' 
          : diferenciaGeneral > 0 
            ? `Sobrante de ${money(Math.abs(diferenciaGeneral))}`
            : `Faltante de ${money(Math.abs(diferenciaGeneral))}`;

        const auditPayload = {
          user_id: operador.id,
          table_name: "cash_drawer",
          action: "cierre_caja_completado",
          description: `Cierre de caja completado por ${userName}. Apertura Efectivo: ${money(aperturaEfectivo)}, Apertura Banca: ${money(aperturaBanca)}. Ventas: Efectivo ${money(ventasEfectivo)}, Tarjeta ${money(ventasTarjeta)}, Transferencia ${money(ventasTransferencia)}. Total Esperado: ${money(totalGeneralEsperado)}. Contado: Efectivo ${money(efectivoFisico)}, Transferencia ${money(transferFisico)}, Tarjeta ${money(tarjetaFisico)}. ${diferenciaTexto}. Propina extra: ${money(propinaFisico)}`,
          new_values: {
            apertura_efectivo: aperturaEfectivo,
            apertura_banca: aperturaBanca,
            ventas_efectivo: ventasEfectivo,
            ventas_tarjeta: ventasTarjeta,
            ventas_transferencia: ventasTransferencia,
            total_gastos: gastos,
            total_esperado: totalGeneralEsperado,
            efectivo_contado: toNum(efectivoFisico),
            transferencia_contada: toNum(transferFisico),
            tarjeta_contada: toNum(tarjetaFisico),
            propina_extra: toNum(propinaFisico),
            total_contado: totalContadoGeneral,
            diferencia: diferenciaGeneral,
            conteo_denominaciones: conteoEfectivo
          },
          reason: "Cierre de Caja"
        };

        await fetchWithAuth('/api/audit-log', {
          method: 'POST',
          body: JSON.stringify(auditPayload)
        }).catch(err => console.warn('Error guardando auditoria:', err));
      }

      setResultadoCierre({
        success: true,
        message: 'Cierre de caja guardado exitosamente',
        cierreId: closeData.id
      });

      // IMPRIMIR AUTOMÁTICAMENTE usando los componentes existentes
      setTimeout(() => {
        if (printButtonRef.current) {
          printButtonRef.current.click();
        }
        setTimeout(() => {
          if (pdfButtonRef.current) {
            pdfButtonRef.current.click();
          }
        }, 1000);
      }, 500);

      setTimeout(() => {
        onClose?.(true);
      }, 4000);

    } catch (err) {
      console.error('Error guardando cierre:', err);
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
                  <PrintCashCloseButton
                    ref={printButtonRef}
                    close={closingConPropina || closing}
                    datos={datosParaImpresion}
                    bizInfo={getBusinessInfo()}
                    printerConnected={true}
                    printerTicket={PRINTER_CONFIG}
                    className="btn-primary"
                  />
                  <PrintCashClosePdfButton
                    ref={pdfButtonRef}
                    close={closingConPropina || closing}
                    opening={opening}
                    summary={summary}
                    className="btn-secondary"
                  />
                </div>
                <small style={{ color: '#a0a0b0' }}>✅ Generando impresión y PDF automáticamente...</small>
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
                <PrintCashCloseButton
                  close={closingConPropina || closing}
                  datos={datosParaImpresion}
                  bizInfo={getBusinessInfo()}
                  printerConnected={true}
                  printerTicket={PRINTER_CONFIG}
                  className="btn-print-small-modern"
                />
                <PrintCashClosePdfButton
                  close={closingConPropina || closing}
                  opening={opening}
                  summary={summary}
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

            {/* 2 COLUMNAS */}
            <div className="two-columns-layout">
              <div className="left-column">
                <div className="metodos-card">
                  <div className="card-header">
                    <FiCreditCard className="card-icon" />
                    <h3>OTROS METODOS DE PAGO</h3>
                  </div>
                  <div className="metodos-grid">
                    <div className="metodo-input">
                      <label><FiSmartphone size={12} /> Transferencia</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="metodo-input-field"
                        value={transferFisico} 
                        onChange={(e) => setTransferFisico(toNum(e.target.value))} 
                        disabled={!!closing} 
                        placeholder="0.00" 
                      />
                    </div>
                    <div className="metodo-input">
                      <label><FiCreditCard size={12} /> Tarjeta</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="metodo-input-field"
                        value={tarjetaFisico} 
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
                    <h3>INGRESO EXTRA (No afecta cuadre)</h3>
                  </div>
                  <div className="ingreso-input">
                    <label><FiHeart size={12} /> Propina</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="ingreso-input-field"
                      value={propinaFisico} 
                      onChange={(e) => setPropinaFisico(toNum(e.target.value))} 
                      disabled={!!closing} 
                      placeholder="0.00" 
                    />
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
                  <span className="label">Propina (Ingreso Extra):</span>
                  <span>{money(propinaFisico)}</span>
                </div>
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