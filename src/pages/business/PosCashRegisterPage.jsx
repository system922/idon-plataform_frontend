// PosCashRegisterPage.jsx - Con useSession y api
import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../../context/SessionContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiBox,
  FiDollarSign,
  FiAlertCircle,
  FiCheckCircle,
  FiTrendingUp,
  FiGrid,
  FiCreditCard,
  FiSmartphone,
  FiHeart,
  FiBriefcase,
  FiPrinter,
  FiUser,
  FiClock
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; // ✅ CORREGIDO
import { useCashDrawer } from '../../hooks/useCashDrawer';
import { usePrinterService } from '../../services/usePrinterService';
import PrintCashClosePdfButton, { generateCashClosePdfBase64 } from '../../components/PrintCashClosePdfButton';

// Componentes reutilizables
import Modal from '../../components/General/Modal';
import Button, { ButtonGroup, IconTextButton } from '../../components/General/Button';
import Input from '../../components/General/Input';

// Estilos específicos del componente
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

// ===============================
// COMPONENTE PRINCIPAL
// ===============================
const CierreDeCajaPage = ({ 
  onClose, 
  cajaData: initialCajaData,
}) => {
  // USAR SESIÓN
  const { user } = useSession();
  const { openDrawer } = useCashDrawer();
  const { print } = usePrinterService();
  const { showConfirm } = useConfirm();
  
  const [loading, setLoading] = useState(true);
  const [cerrando, setCerrando] = useState(false);
  // Estados separados para Billetes y Monedas
  const [conteoEfectivo, setConteoEfectivo] = useState({});
  const [conteoMonedas, setConteoMonedas] = useState({});
  
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

  const [transferRaw, setTransferRaw] = useState('');
  const [tarjetaRaw, setTarjetaRaw] = useState('');
  const [propinaRaw, setPropinaRaw] = useState('');
  
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil'
  });

  // OBTENER DATOS DEL USUARIO DESDE SESSION
  const userName = user?.firstName || user?.nombre || user?.name || user?.username || user?.email || 'Usuario';
  const userRole = user?.role || user?.roleCode || user?.role_code || 'Cajero';
  const userEmail = user?.email || '';
  const userId = user?.id;

  // Obtener fecha y hora actual
  const now = new Date();
  const fechaActual = now.toLocaleDateString('es-EC', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Guayaquil'
  });
  const horaActual = now.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Guayaquil'
  });

  // ===============================
  // INICIALIZAR CONTEO DE DENOMINACIONES
  // ===============================
  const inicializarConteoEfectivo = () => {
    // Inicializar Billetes
    const initialBilletes = {};
    DENOMINACIONES.BILLETES.forEach(denom => {
      initialBilletes[denom] = 0;
    });
    setConteoEfectivo(initialBilletes);

    // Inicializar Monedas
    const initialMonedas = {};
    DENOMINACIONES.MONEDAS.forEach(denom => {
      initialMonedas[denom] = 0;
    });
    setConteoMonedas(initialMonedas);
  };

  // ===============================
  // CARGAR DATOS REALES DESDE LA API
  // ===============================
  const cargarDatosReales = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [sumRes, openRes, closeRes, extrasRes] = await Promise.all([
        fetchWithAuth(`/pos/cash-register/summary?date=${today}`),
        fetchWithAuth(`/pos/cash-register/opening?date=${today}`),
        fetchWithAuth(`/pos/cash-register/full-closing?date=${today}`),
        fetchWithAuth(`/pos/cash-register/income-extra?date=${today}`)
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

      // Si ya existe cierre para este usuario, mostrar los datos
      if (closeData && closeData.id) {
        console.log('Cierre existente encontrado para este usuario:', closeData);
        setClosing(closeData);
        setEfectivoFisico(closeData.cash_counted || 0);
        setTransferFisico(closeData.transfer_counted || 0);
        setTarjetaFisico(closeData.card_counted || 0);
        setPropinaFisico(closeData.tip_counted || 0);
        setRemarks(closeData.remarks || '');
        
        // Cargar denominaciones si existen en el campo extras
        if (closeData.extras) {
          try {
            const extras = typeof closeData.extras === 'string' 
              ? JSON.parse(closeData.extras) 
              : closeData.extras;
            
            // Inicializar Billetes con valores del cierre existente
            const initialBilletes = {};
            DENOMINACIONES.BILLETES.forEach(denom => {
              initialBilletes[denom] = extras.cash_denomination?.[denom] || 0;
            });
            setConteoEfectivo(initialBilletes);
            
            // Inicializar Monedas con valores del cierre existente
            const initialMonedas = {};
            DENOMINACIONES.MONEDAS.forEach(denom => {
              const key = denom.toString();
              initialMonedas[denom] = extras.coins_denomination?.[key] || 0;
            });
            setConteoMonedas(initialMonedas);
            
            if (extras.propina !== undefined) {
              setPropinaFisico(extras.propina);
            }
          } catch (e) {
            console.error('Error parsing extras:', e);
            inicializarConteoEfectivo();
          }
        } else {
          inicializarConteoEfectivo();
        }
      }
    } catch (err) {
      console.error('Error cargando datos del cierre:', err);
      setError('Error cargando datos del cierre');
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EFFECT PRINCIPAL
  // ===============================
  useEffect(() => {
    if (initialCajaData && initialCajaData.summary) {
      setSummary(initialCajaData.summary);
      setOpening(initialCajaData.opening || {});
      setIncomeExtras(initialCajaData.incomes || []);
      
      // Si hay cierre existente en los datos
      if (initialCajaData.existingClose) {
        const closeData = initialCajaData.existingClose;
        setClosing(closeData);
        setEfectivoFisico(closeData.cash_counted || 0);
        setTransferFisico(closeData.transfer_counted || 0);
        setTarjetaFisico(closeData.card_counted || 0);
        setPropinaFisico(closeData.tip_counted || 0);
        setRemarks(closeData.remarks || '');
        
        // Cargar denominaciones desde extras
        if (closeData.extras) {
          try {
            const extras = typeof closeData.extras === 'string' 
              ? JSON.parse(closeData.extras) 
              : closeData.extras;
            
            // Inicializar Billetes con valores del cierre existente
            const initialBilletes = {};
            DENOMINACIONES.BILLETES.forEach(denom => {
              initialBilletes[denom] = extras.cash_denomination?.[denom] || 0;
            });
            setConteoEfectivo(initialBilletes);
            
            // Inicializar Monedas con valores del cierre existente
            const initialMonedas = {};
            DENOMINACIONES.MONEDAS.forEach(denom => {
              const key = denom.toString();
              initialMonedas[denom] = extras.coins_denomination?.[key] || 0;
            });
            setConteoMonedas(initialMonedas);
            
            if (extras.propina !== undefined) {
              setPropinaFisico(extras.propina);
            }
          } catch (e) {
            console.error('Error parsing extras:', e);
            inicializarConteoEfectivo();
          }
        } else {
          inicializarConteoEfectivo();
        }
        
        setLoading(false);
      } else {
        inicializarConteoEfectivo();
        setLoading(false);
      }
    } else {
      cargarDatosReales();
      inicializarConteoEfectivo();
    }
  }, [initialCajaData]);

  // Función para actualizar Billetes
  const actualizarConteo = (denominacion, value) => {
    const numValue = parseInt(value) || 0;
    setConteoEfectivo(prev => ({
      ...prev,
      [denominacion]: numValue
    }));
    const nuevoTotal = calcularTotalEfectivoDesdeDenominaciones({
      ...conteoEfectivo,
      ...conteoMonedas,
      [denominacion]: numValue
    });
    setEfectivoFisico(nuevoTotal);
  };

  // Función para actualizar Monedas
  const actualizarConteoMonedas = (denominacion, value) => {
    const numValue = parseInt(value) || 0;
    setConteoMonedas(prev => ({
      ...prev,
      [denominacion]: numValue
    }));
    const nuevoTotal = calcularTotalEfectivoDesdeDenominaciones({
      ...conteoEfectivo,
      ...conteoMonedas,
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
  // DATOS DEL SISTEMA
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
  // GUARDAR CIERRE - CON USUARIO Y VERIFICACIÓN
  // ===============================
  const handleGuardarCierre = async () => {
    // Si ya existe cierre, no permitir guardar
    if (closing) {
      setError('Ya existe un cierre de caja para hoy para este usuario');
      return;
    }

    setCerrando(true);
    setError('');

    try {
      // CALCULAR TODOS LOS DATOS QUE SE MUESTRAN EN EL CIERRE
      const ventas = summary?.metodos || [];
      
      // Ventas por método de pago (sistema)
      const cashSystem = Number(ventas.find(m => m.payment_method === 'cash')?.total_cobrado || 0);
      const transferSystem = Number(ventas.find(m => m.payment_method === 'transfer')?.total_cobrado || 0);
      const cardSystem = Number(ventas.find(m => m.payment_method === 'card')?.total_cobrado || 0);
      const totalVentasSistema = cashSystem + transferSystem + cardSystem;
      
      // Calcular ordersSystem correctamente
      let ordersSystem = 0;
      if (summary?.total_orders) {
        ordersSystem = Number(summary.total_orders);
      } else if (summary?.metodos) {
        ordersSystem = summary.metodos.reduce((total, m) => total + (Number(m.ordenes_afectadas) || 0), 0);
      }
      
      // Gastos del día
      const expensesTotal = (summary?.gastos || []).reduce((a, g) => a + toNum(g.monto), 0);
      
      // Apertura
      const aperturaTotal = toNum(opening?.total_efectivo) + toNum(opening?.monto_banca);
      const aperturaEfectivo = toNum(opening?.total_efectivo);
      const aperturaBanca = toNum(opening?.monto_banca);
      
      // Ingresos extras
      const extrasCash = incomeExtras.filter(e => e.payment_method === 'cash').reduce((s, e) => s + toNum(e.amount), 0);
      const extrasCard = incomeExtras.filter(e => e.payment_method === 'card').reduce((s, e) => s + toNum(e.amount), 0);
      const extrasTransfer = incomeExtras.filter(e => e.payment_method === 'transfer').reduce((s, e) => s + toNum(e.amount), 0);
      const totalExtras = extrasCash + extrasCard + extrasTransfer;
      
      // TOTAL ESPERADO (el que se muestra en el cierre)
      const totalGeneralEsperado = aperturaTotal + totalVentasSistema - expensesTotal + totalExtras;
      
      const totalContadoGeneral = toNum(efectivoFisico) + toNum(transferFisico) + toNum(tarjetaFisico);
      const diferenciaGeneral = totalContadoGeneral - totalGeneralEsperado;

      // USAR fetchWithAuth SIN /api/
      const res = await fetchWithAuth('/pos/cash-register/closing', {
        method: 'POST',
        body: JSON.stringify({
          // Datos contados físicamente
          efectivoFisico: efectivoFisico,
          transferenciaFisico: transferFisico,
          tarjetaFisico: tarjetaFisico,
          propinaFisico: propinaFisico,
          
          // Datos del sistema (ventas reales del sistema)
          cash_system: cashSystem,
          transfer_system: transferSystem,
          card_system: cardSystem,
          
          // total_system = TOTAL ESPERADO
          total_system: totalGeneralEsperado,
          
          orders_system: ordersSystem,
          expenses_total: expensesTotal,
          total_extras: totalExtras,
          apertura_total: aperturaTotal,
          total_esperado: totalGeneralEsperado,
          
          // Denominaciones contadas
          cashDenominationCount: conteoEfectivo,
          coinsDenominationCount: conteoMonedas,
          
          // Metadata
          date: today,
          remarks: remarks,
          closing_user_id: userId,
          process_inventory: true,
        }),
      });

      // MANEJAR ERROR 409 - CIERRE YA EXISTE
      if (res.status === 409) {
        const errorData = await res.json();
        console.log('Cierre ya existe:', errorData.existingClose);
        
        setError(errorData.error || 'Ya existe un cierre para hoy');
        setResultadoCierre({
          success: false,
          message: errorData.error || 'No se puede guardar: ya existe un cierre para hoy'
        });
        
        if (errorData.existingClose) {
          setClosing(errorData.existingClose);
        }
        
        setTimeout(() => {
          onClose?.(false);
        }, 3000);
        
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar cierre');
      }

      const closeData = await res.json();
      const closeDataConPropina = {
        ...closeData,
        tip_counted: propinaFisico,
        propina: propinaFisico,
        closing_user_name: userName,
        closing_user_email: userEmail,
        closing_user_role: userRole,
      };
      setClosing(closeDataConPropina);

      // Generar PDF con datos del usuario
      generateCashClosePdfBase64(
        closeDataConPropina, 
        opening, 
        summary, 
        incomeExtras,
        { name: userName, email: userEmail, role: userRole }
      )
        .then(pdfBase64 => fetchWithAuth('/pos/cash-register/send-close-email', {
          method: 'POST',
          body: JSON.stringify({
            pdfBase64,
            closingDate: today,
            totalVentas: totalVentasSistema,
            totalContado: totalContadoGeneral,
            diferencia: diferenciaGeneral,
            closingUser: { name: userName, email: userEmail }
          }),
        }))
        .catch(() => {});

      setResultadoCierre({
        success: true,
        message: 'Cierre de caja guardado exitosamente',
        cierreId: closeData.id,
        user: { name: userName, email: userEmail, role: userRole }
      });

      // Imprimir ticket
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
        closingUser: { name: userName, email: userEmail, role: userRole },
      };
      print('printer_main', 'cash-close', printData).catch(() => {});

      // Registrar auditoría - CON fetchWithAuth
      try {
        const auditResponse = await fetchWithAuth('/audit-log', {
          method: 'POST',
          body: JSON.stringify({
            user_id: userId,
            user_name: userName,
            user_email: userEmail,
            table_name: "cash_drawer",
            action: "c_caja",
            description: `Cierre de caja completado por ${userName} (${userEmail})`,
            new_values: closeDataConPropina,
            reason: "Cierre de caja"
          })
        });

        if (!auditResponse.ok) {
          console.error('❌ Error en auditoría:', auditResponse.status);
        }
        
      } catch (auditError) {
        console.error('Error en auditoría (no crítico):', auditError.message);
      }

      // PASAR LOS DATOS DEL CIERRE EN onClose
      setTimeout(() => {
        onClose?.(true, closeDataConPropina);
      }, 4000);

    } catch (err) {
      console.error('❌ Error en handleGuardarCierre:', err);
      setError(err.message || 'Error al guardar cierre');
      setResultadoCierre({
        success: false,
        message: err.message || 'Error al cerrar la caja'
      });
    } finally {
      setCerrando(false);
    }
  };

  // ===============================
  // RENDER - CONTENIDO DEL MODAL
  // ===============================
  const renderContent = () => {
    if (loading) {
      return (
        <div className="cierre-loading">
          <div className="spinner"></div>
          <p>Cargando datos del cierre...</p>
        </div>
      );
    }

    if (resultadoCierre) {
      return (
        <div className="cierre-resultado">
          {resultadoCierre.success ? 
            <FiCheckCircle size={48} color="var(--success)" /> : 
            <FiAlertCircle size={48} color="var(--danger)" />
          }
          <h3>{resultadoCierre.success ? 'Cierre Exitoso!' : 'Error en Cierre'}</h3>
          <p>{resultadoCierre.message}</p>
          {resultadoCierre.success && resultadoCierre.user && (
            <small style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              Realizado por: {resultadoCierre.user.name} ({resultadoCierre.user.email})
            </small>
          )}
          {resultadoCierre.success && (
            <div style={{ marginTop: 20, display: 'flex', gap: 12, flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <Button
                  variant="success"
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
                      closingUser: { name: userName, email: userEmail, role: userRole },
                    }).catch(() => {});
                  }}
                >
                  <FiPrinter size={15} /> Reimprimir ticket
                </Button>
                <PrintCashClosePdfButton
                  ref={pdfButtonRef}
                  close={closing}
                  opening={opening}
                  summary={summary}
                  incomeExtras={incomeExtras}
                  variant="danger"
                  user={{ name: userName, email: userEmail, role: userRole }}
                />
              </div>
              <small style={{ color: 'var(--text-muted)' }}>Imprimiendo ticket automáticamente...</small>
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        {error && (
          <div className="alert-error">
            <FiAlertCircle size={14} /> {error}
          </div>
        )}
        
        {/* CIERRE EXISTENTE */}
        {closing && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '12px', 
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fecha</span>
                <div style={{ fontWeight: 600 }}>{closing.closing_date}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hora</span>
                <div style={{ fontWeight: 600 }}>{closing.closing_time}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Contado</span>
                <div style={{ fontWeight: 600, color: 'var(--success)' }}>{money(closing.total_counted)}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Sistema</span>
                <div style={{ fontWeight: 600 }}>{money(closing.total_system)}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Diferencia</span>
                <div style={{ fontWeight: 600, color: closing.diff_total === 0 ? 'var(--success)' : 'var(--warning)' }}>
                  {money(closing.diff_total)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Observaciones</span>
                <div style={{ fontWeight: 600 }}>{closing.remarks || 'Sin observaciones'}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <IconTextButton
                variant="warning"
                size="sm"
                onClick={() => {
                  const bizInfo = getBusinessInfo();
                  print('printer_main', 'cash-close', {
                    bizInfo,
                    close: closing,
                    summary: closing,
                    sales: { transaction_count: closing?.orders_system, total: closing?.total_system },
                    expenses: summary?.gastos || [],
                    cashFlow: { 
                      opening_float: aperturaEfectivo + aperturaBanca, 
                      extra_income: totalExtras, 
                      expected_cash: totalGeneralEsperado, 
                      counted_cash: totalContadoGeneral 
                    },
                    totals: { 
                      system_total: closing?.total_system, 
                      counted_total: closing?.total_counted, 
                      total_diff: closing?.diff_total 
                    },
                    closingUser: { name: userName, email: userEmail, role: userRole },
                  }).catch(() => {});
                }}
              >
                <FiPrinter size={13} /> Reimprimir ticket
              </IconTextButton>
              <PrintCashClosePdfButton
                close={closing}
                opening={opening}
                summary={summary}
                incomeExtras={incomeExtras}
                variant="danger"
                size="sm"
                user={{ name: userName, email: userEmail, role: userRole }}
              />
            </div>
          </div>
        )}

        {/* HEADER CON FECHA, HORA Y USUARIO */}
        <div className="cierre-header">
          <div className="cierre-header-info">
            <div className="cierre-header-row">
              <FiUser size={14} className="cierre-header-icon" />
              <span className="cierre-header-label">Usuario:</span>
              <span className="cierre-header-value">{userName}</span>
            </div>
            <div className="cierre-header-row">
              <FiClock size={14} className="cierre-header-icon" />
              <span className="cierre-header-label">Fecha y Hora:</span>
              <span className="cierre-header-value">{fechaActual} - {horaActual}</span>
            </div>
          </div>
        </div>

        {/* 3 TARJETAS HORIZONTALES */}
        <div className="cards-row">
          <div className="card-info">
            <div className="card-header">
              <FiBriefcase size={14} />
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
                <span className="value">{money(aperturaTotal)}</span>
              </div>
            </div>
          </div>

          <div className="card-info">
            <div className="card-header">
              <FiTrendingUp size={14} />
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
                <span className="label">Total Ventas Brutas</span>
                <span className="value">{money(totalVentas)}</span>
              </div>
            </div>
          </div>

          <div className="card-info">
            <div className="card-header">
              <FiDollarSign size={14} />
              <h4>TOTAL GENERAL ESPERADO</h4>
            </div>
            <div className="card-body">
              <div className="card-row">
                <span className="label">Total Apertura</span>
                <span className="value">{money(aperturaTotal)}</span>
              </div>
              <div className="card-row">
                <span className="label">+ Ventas Brutas</span>
                <span className="value">{money(totalVentas)}</span>
              </div>
              {gastos > 0 && (
                <div className="card-row">
                  <span className="label">- Gastos</span>
                  <span className="value" style={{ color: 'var(--danger)' }}>-{money(gastos)}</span>
                </div>
              )}
              {totalExtras > 0 && (
                <div className="card-row">
                  <span className="label">+ Ingresos Extras</span>
                  <span className="value" style={{ color: 'var(--success)' }}>{money(totalExtras)}</span>
                </div>
              )}
              <div className="card-divider"></div>
              <div className="card-row">
                <span className="label">= Total Esperado</span>
                <span className="value" style={{ fontWeight: 700, fontSize: 'var(--font-lg)' }}>
                  {money(totalGeneralEsperado)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* CONTEO FISICO - EFECTIVO */}
        <div className="card-info">
          <div className="card-header">
            <FiGrid size={14}/>
            <h4>CONTEO FISICO - EFECTIVO</h4>
          </div>
          
          {/* Billetes */}
          <div className="apertura-section">
            <div className="apertura-section-header">
              <FiCreditCard size={14} />
              <span>Billetes</span>
            </div>
            <div className="apertura-denom-grid">
              {DENOMINACIONES.BILLETES.map(denom => (
                <div key={denom} className="apertura-denom-card">
                  <span className="apertura-denom-label">${denom}</span>
                  <Input
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    value={conteoEfectivo[denom] || 0}
                    onChange={(val) => actualizarConteo(denom, val)}
                    disabled={!!closing}
                    className="input-denom-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Monedas */}
          <div className="apertura-section">
            <div className="apertura-section-header">
              <FiBox size={14} />
              <span>Monedas</span>
            </div>
            <div className="apertura-denom-grid">
              {DENOMINACIONES.MONEDAS.map(denom => (
                <div key={denom} className="apertura-denom-card">
                  <span className="apertura-denom-label">${denom}</span>
                  <Input
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    value={conteoMonedas[denom] || 0}
                    onChange={(val) => actualizarConteoMonedas(denom, val)}
                    disabled={!!closing}
                    className="input-denom-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="card-header">
            <span>Total Efectivo Contado:</span>
            <strong>{money(efectivoFisico)}</strong>
          </div>
        </div>

        {/* 2 COLUMNAS */}
        {/* ─── CONTEO FISICO - OTROS MÉTODOS ─── */}
        <div className="two-columns-layout">
          <div className="left-column">
            <div className="card-info">
              <div className="card-header">
                <FiCreditCard size={14} />
                <h3>CONTEO FISICO - OTROS MÉTODOS</h3>
              </div>
              <div className="card-body">
                {/* TRANSFERENCIA */}
                <div className="metodo-input">
                  <label>
                    <FiSmartphone size={12} /> Transferencia
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      (Sistema: {money(ventasTransferencia)})
                    </span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    size="sm"
                    value={transferFisico === 0 ? '' : transferFisico.toFixed(2)}
                    onChange={(val) => {
                      // Solo dígitos
                      let digits = val.replace(/\D/g, '');
                      if (digits.length > 8) digits = digits.slice(0, 8);
                      setTransferRaw(digits);
                      const num = digits === '' ? 0 : parseInt(digits, 10) / 100;
                      setTransferFisico(num);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const raw = transferRaw || '';
                        if (raw.length === 0) {
                          e.preventDefault();
                          return;
                        }
                        if (raw.length === 1) {
                          setTransferRaw('');
                          setTransferFisico(0);
                          e.preventDefault();
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={!!closing}
                    placeholder="0.00"
                    className="metodo-input-field"
                  />
                </div>

                {/* TARJETA */}
                <div className="metodo-input">
                  <label>
                    <FiCreditCard size={12} /> Tarjeta
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                      (Sistema: {money(ventasTarjeta)})
                    </span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    size="sm"
                    value={tarjetaFisico === 0 ? '' : tarjetaFisico.toFixed(2)}
                    onChange={(val) => {
                      let digits = val.replace(/\D/g, '');
                      if (digits.length > 8) digits = digits.slice(0, 8);
                      setTarjetaRaw(digits);
                      const num = digits === '' ? 0 : parseInt(digits, 10) / 100;
                      setTarjetaFisico(num);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const raw = tarjetaRaw || '';
                        if (raw.length === 0) {
                          e.preventDefault();
                          return;
                        }
                        if (raw.length === 1) {
                          setTarjetaRaw('');
                          setTarjetaFisico(0);
                          e.preventDefault();
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={!!closing}
                    placeholder="0.00"
                    className="metodo-input-field"
                  />
                </div>
              </div>
            </div>

            {/* ─── INGRESOS EXTRAS & PROPINA ─── */}
            <div className="card-info">
              <div className="card-header">
                <FiHeart size={14} />
                <h3>INGRESOS EXTRAS & PROPINA</h3>
              </div>
              <div className="card-body">
                <div className="metodo-input">
                  <label>
                    <FiCreditCard size={12} /> Extras del día
                  </label>
                </div>
              </div>
              <div className="extras-list-container">
                {/* ... (sin cambios) ... */}
              </div>

              {/* PROPINA */}
              <div className="propina-section">
                <div className="metodo-input">
                  <label>
                    <FiHeart size={12} />
                    <span>Propina</span>
                    <span className="propina-label">(No afectan cuadre)</span>
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    size="sm"
                    value={propinaFisico === 0 ? '' : propinaFisico.toFixed(2)}
                    onChange={(val) => {
                      let digits = val.replace(/\D/g, '');
                      if (digits.length > 8) digits = digits.slice(0, 8);
                      setPropinaRaw(digits);
                      const num = digits === '' ? 0 : parseInt(digits, 10) / 100;
                      setPropinaFisico(num);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace') {
                        const raw = propinaRaw || '';
                        if (raw.length === 0) {
                          e.preventDefault();
                          return;
                        }
                        if (raw.length === 1) {
                          setPropinaRaw('');
                          setPropinaFisico(0);
                          e.preventDefault();
                        }
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    disabled={!!closing}
                    placeholder="0.00"
                    className="metodo-input-field"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card-info">
            <div className="card-header">
              <FiAlertCircle size={14} />
              <h3>COMPARATIVA DE CIERRE</h3>
            </div>
            <div className="card-body">
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
                <div className="propina-extra-row" style={{ color: 'var(--success)' }}>
                  <span className="label">+ Ingresos extras:</span>
                  <span>{money(totalExtras)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OBSERVACIONES */}
        <div className="card-info">
          <div className="card-header">
            <FiAlertCircle size={14} />
            <h3>OBSERVACIONES DEL CIERRE</h3>
          </div>
          <textarea
            className="apertura-obs"
            placeholder="Notas adicionales del cierre..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={!!closing}
            rows={3}
          />
        </div>
      </>
    );
  };

  // ===============================
  // RENDER - FOOTER DEL MODAL
  // ===============================
  const renderFooter = () => {
    if (loading || resultadoCierre) return null;
    
    if (closing) {
      return (
        <ButtonGroup>
          <IconTextButton
            variant=""
            onClick={() => onClose?.(false)}
          >
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      );
    }
    
    return (
      <ButtonGroup>
        <IconTextButton
          variant=""
          onClick={() => onClose?.(false)}
          disabled={cerrando}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          onClick={handleGuardarCierre}
          disabled={cerrando || !!closing}
          loading={cerrando}
        >
          Guardar Cierre
        </IconTextButton>
      </ButtonGroup>
    );
  };

  // ===============================
  // RENDER - MODAL COMPLETO
  // ===============================
  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={() => onClose?.(false)}
      title={closing ? "REVISIÓN DE CUADRE" : "CUADRE DE CAJA DIARIO"}
      size="xl"
      className="cierre-modal-container"
      overlayClassName="cierre-modal-overlay"
      footer={renderFooter()}
    >
      {renderContent()}
    </Modal>
  );
};

export default CierreDeCajaPage;