// components/Odontologia/EstadoCuenta/EstadoCuentaSeccion.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  FiDollarSign, FiPlus, FiClock, FiPackage, FiCreditCard,
  FiX, FiCheck, FiGrid, FiPrinter, FiSearch, FiUser, FiLoader,
  FiFileText, FiCalendar, FiTag, FiRefreshCw, FiChevronDown, FiChevronUp,
  FiCheckSquare, FiSquare
} from 'react-icons/fi';
import { FaHandHoldingDollar } from 'react-icons/fa6';
import { FaMoneyBillTransfer } from 'react-icons/fa6';
import { fetchWithAuth } from '../../../config/apiBase';
import CobroModal from '../CobroModal';
import '../../../styles/Odontologia/EstadoCuenta.css';


const AccountTab = ({ active, onClick, children }) => (
  <button className={`odont-atender-subtab ${active ? 'active' : ''}`} onClick={onClick} type="button">
    {children}
  </button>
);

const EstadoCuentaSeccion = ({
  paciente: pacienteProp,
  presupuestos = [],
  pagos = [],
  laboratorios = [],
  onCreateBudget,
  onProcesarPago,
  currencySymbol = 'US$',
  bizInfo = null,
  pacienteId,
}) => {
  // ── Estados ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('presupuestos');
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Estados para Planes y Cuotas ──────────────────────────────────────
  const [planesData, setPlanesData] = useState([]);
  const [planesPagosData, setPlanesPagosData] = useState([]);
  const [cuotasData, setCuotasData] = useState({});
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [filterType, setFilterType] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlanPago, setSelectedPlanPago] = useState(null);
  const [selectedCuota, setSelectedCuota] = useState(null);

  // Estados para acordeón y selección de tratamientos
  const [expandedPlanes, setExpandedPlanes] = useState(new Set());
  const [selectedTratamientos, setSelectedTratamientos] = useState({});
  const [cobrandoTratamientos, setCobrandoTratamientos] = useState(false);
  const [planParaCobrar, setPlanParaCobrar] = useState(null);

  // ── Búsqueda de cliente en línea ────────────────────────────────────
  const [clienteCedula, setClienteCedula] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [clienteDireccion, setClienteDireccion] = useState('');
  const [foundCliente, setFoundCliente] = useState(null);
  const [clientApiLoading, setClientApiLoading] = useState(false);
  const [clienteBuscado, setClienteBuscado] = useState(false);
  const [busquedaExitosa, setBusquedaExitosa] = useState(false);

  const printResolveRef = useRef(null);

  // ── Función para esperar decisión de impresión ──────────────────────
  const awaitPrintDecision = () => new Promise(res => {
    printResolveRef.current = res;
    setShowPrintModal(true);
  });

  const handlePrintDecision = (v) => {
    setShowPrintModal(false);
    printResolveRef.current?.(v);
  };

  // ── Cargar Planes y Cuotas ─────────────────────────────────────────────
  const loadPlanesData = async () => {
    if (!pacienteId && !pacienteProp?.id) return;

    const id = pacienteId || pacienteProp?.id;
    setLoadingPlanes(true);

    try {
      const planesRes = await fetchWithAuth(`/api/odontologia/planes-tratamiento/patient/${id}`);
      const planesDataResult = await planesRes.json();

      let planesList = [];
      if (planesRes.ok && planesDataResult.success && planesDataResult.data) {
        planesList = Array.isArray(planesDataResult.data) ? planesDataResult.data : [];
      } else if (Array.isArray(planesDataResult)) {
        planesList = planesDataResult;
      }
      setPlanesData(planesList);

      const pagosRes = await fetchWithAuth(`/api/odontologia/plan-pagos/patient/${id}`);
      const pagosDataResult = await pagosRes.json();

      let pagosList = [];
      if (pagosRes.ok && pagosDataResult.success && pagosDataResult.data) {
        pagosList = Array.isArray(pagosDataResult.data) ? pagosDataResult.data : [];
      }
      setPlanesPagosData(pagosList);

      const cuotasMap = {};
      for (const plan of pagosList) {
        if (plan.id) {
          try {
            const cuotasRes = await fetchWithAuth(`/api/odontologia/cuotas-ortodoncia/plan/${plan.id}`);
            const cuotasDataResult = await cuotasRes.json();
            if (cuotasRes.ok && cuotasDataResult.success) {
              cuotasMap[plan.id] = cuotasDataResult.data || [];
            } else {
              cuotasMap[plan.id] = [];
            }
          } catch (err) {
            cuotasMap[plan.id] = [];
          }
        }
      }
      setCuotasData(cuotasMap);

    } catch (err) {
      console.error('❌ Error cargando planes:', err);
    } finally {
      setLoadingPlanes(false);
    }
  };

  useEffect(() => {
    if (pacienteProp || pacienteId) {
      loadPlanesData();
    }
  }, [pacienteProp, pacienteId]);

  useEffect(() => {
    if (pacienteProp) {
      setClienteCedula(pacienteProp.document_number || pacienteProp.cedula || '');
    }
  }, [pacienteProp]);

  // ── Buscar cliente en línea ──────────────────────────────────────────
  const buscarClienteEnLinea = async (doc) => {
    if (!doc || (doc.length !== 10 && doc.length !== 13)) {
      setError('Ingrese una cédula válida (10 dígitos) o RUC (13 dígitos)');
      return;
    }

    setClientApiLoading(true);
    setError('');
    setClienteBuscado(false);
    setBusquedaExitosa(false);

    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({
        documento: doc.slice(0, 10),
        tipo: '1'
      });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      const text = await response.text();

      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          setClienteNombre(nombreCompleto);
          setFoundCliente({
            document_number: doc,
            nombre: nombreCompleto,
            first_name: json.nombres || '',
            last_name: json.apellidos || '',
            email: '',
            phone: '',
            address: ''
          });
          setClienteBuscado(true);
          setBusquedaExitosa(true);
          setSuccess('Cliente encontrado');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setFoundCliente(null);
          setClienteBuscado(true);
          setBusquedaExitosa(false);
          setClienteNombre('');
          setError('No se encontraron datos');
          setTimeout(() => setError(''), 3000);
        }
      } else {
        setFoundCliente(null);
        setClienteBuscado(true);
        setBusquedaExitosa(false);
        setClienteNombre('');
        setError('No se encontraron datos');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      console.error('Error al buscar:', err);
      setFoundCliente(null);
      setClienteBuscado(true);
      setBusquedaExitosa(false);
      setClienteNombre('');
      setError('Error al consultar');
      setTimeout(() => setError(''), 3000);
    } finally {
      setClientApiLoading(false);
    }
  };

  const fmt = (n) => `${currencySymbol} ${parseFloat(n || 0).toFixed(2)}`;

  // ── Resumen financiero ──────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalPresupuestos = presupuestos.reduce((sum, pres) => sum + (Number(pres.total) || 0), 0);
    const totalPagado = presupuestos.reduce((sum, pres) => sum + (Number(pres.paid) || 0), 0);
    const totalPendiente = presupuestos.reduce((sum, pres) => sum + (Number(pres.pending) || 0), 0);

    const totalPlanesPagos = planesPagosData.reduce((sum, p) => sum + parseFloat(p.monto_total || 0), 0);
    let totalCuotasPagadas = 0;
    let totalCuotasPendientes = 0;
    let totalPagadoCuotas = 0;

    Object.values(cuotasData).forEach(cuotasList => {
      cuotasList.forEach(c => {
        if (c.estado === 'pagado') {
          totalCuotasPagadas++;
          totalPagadoCuotas += parseFloat(c.monto || 0);
        } else {
          totalCuotasPendientes++;
        }
      });
    });

    return {
      totalPresupuestos,
      totalPagado,
      totalPendiente,
      totalPlanesPagos,
      totalCuotas: Object.values(cuotasData).reduce((sum, c) => sum + c.length, 0),
      totalCuotasPagadas,
      totalCuotasPendientes,
      totalPagadoCuotas,
      totalPlanes: planesData.length + planesPagosData.length,
    };
  }, [presupuestos, planesData, planesPagosData, cuotasData]);

  // ── Abrir CobroModal para cuota ──────────────────────────────────────
  const abrirCobroCuota = (cuota, planPago) => {
    setSelectedCuota(cuota);
    setSelectedPlanPago(planPago);
    setShowCobroModal(true);
  };

  // ── Procesar pago de cuota ───────────────────────────────────────────
  const procesarPagoCuota = async (pagoData) => {
    if (!selectedPlanPago?.id || !selectedCuota) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const dataToSend = {
        plan_id: selectedPlanPago.id,
        cuota_id: selectedCuota.id,
        monto: pagoData.total,
        metodo_pago: pagoData.metodo_pago,
        referencia: pagoData.referencia || '',
        notas: pagoData.notas || '',
        invoice_number: pagoData.invoice_number || null,
      };

      const res = await fetchWithAuth(`/api/odontologia/plan-pagos/${selectedPlanPago.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al registrar pago');
      }

      await loadPlanesData();
      setSuccess(`✅ Pago registrado - Cuota #${selectedCuota.numero_cuota}`);
      setTimeout(() => setSuccess(''), 3000);

      return result.data;
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
      setTimeout(() => setError(null), 4000);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ── Seleccionar/Deseleccionar un tratamiento individual ─────────────
  const toggleTratamientoSelection = (planId, itemIndex) => { 
    const key = `${planId}-${itemIndex}`; 
    setSelectedTratamientos(prev => ({ 
      ...prev, 
      [key]: !prev[key] 
    })); 
  }; 

  // ── Seleccionar/Deseleccionar TODOS los pendientes ──────────────────
  const seleccionarTodosTratamientos = (planId, tratamientos) => { 
    const pendientes = tratamientos.filter(t => t.estado !== 'completado'); 
    if (pendientes.length === 0) return; 
 
    const allSelected = pendientes.every((t, idx) => { 
      const key = `${planId}-${idx}`; 
      return selectedTratamientos[key]; 
    }); 
 
    const newSelected = { ...selectedTratamientos }; 
    pendientes.forEach((t, idx) => { 
      const key = `${planId}-${idx}`; 
      newSelected[key] = !allSelected; 
    }); 
 
    setSelectedTratamientos(newSelected); 
  }; 

  // ── Abrir CobroModal para tratamientos seleccionados ──────────────────
  const abrirCobroSeleccionados = (plan) => { 
    const items = plan.items || []; 
    const seleccionados = items.filter((t, idx) => { 
      const key = `${plan.id}-${idx}`; 
      return selectedTratamientos[key]; 
    }); 
 
    if (seleccionados.length === 0) { 
      setError('Selecciona al menos un tratamiento para cobrar'); 
      setTimeout(() => setError(''), 3000); 
      return; 
    } 
 
    // Calcular el total
    const total = seleccionados.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    
    // Crear items con estructura completa para CobroModal
    const itemsConEstructura = seleccionados.map((t, idx) => ({
      id: t.id || `temp-${idx}`,
      service: t.tratamiento || t.service || 'Tratamiento',
      product_name: t.tratamiento || t.service || 'Tratamiento',
      description: t.tratamiento || t.service || 'Tratamiento',
      tooth: t.tooth || '',
      quantity: 1,
      price: parseFloat(t.price || 0),
      subtotal: parseFloat(t.price || 0),
      paid: 0,
      pending: parseFloat(t.price || 0),
      comment: t.observaciones || `Diente #${t.tooth || ''}`,
      surfaces: t.surfaces || [],
      diagnostico: t.diagnostico || '',
      estado: t.estado || 'pendiente',
      code: `TRT-${String(idx + 1).padStart(3, '0')}`,
    }));

    setPlanParaCobrar({ 
      plan, 
      seleccionados,
      items: itemsConEstructura, 
      total: total, 
    }); 
    setShowCobroModal(true); 
  }; 

  // ── Procesar pago de tratamientos seleccionados ──────────────────────
  const procesarPagoTratamientos = async (pagoData) => { 
    if (!planParaCobrar) return; 
 
    const { plan, seleccionados } = planParaCobrar; 
    setCobrandoTratamientos(true); 
    setError(''); 
    setSuccess(''); 
 
    try { 
      // Crear un Set con los IDs de los tratamientos seleccionados
      const selectedIds = new Set(seleccionados.map(t => t.id).filter(Boolean));
      
      // Actualizar items - usar el ID si existe, si no usar el índice
      const updatedItems = plan.items.map((item, idx) => {
        // Si el item tiene ID y está en la selección, marcarlo como completado
        if (item.id && selectedIds.has(item.id)) {
          return { ...item, estado: 'completado' };
        }
        // Si no tiene ID, verificar si está en la selección por índice
        const key = `${plan.id}-${idx}`;
        if (selectedTratamientos[key]) {
          return { ...item, estado: 'completado' };
        }
        return item;
      }); 
 
      const res = await fetchWithAuth(`/api/odontologia/planes-tratamiento/${plan.id}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          ...plan, 
          items: updatedItems, 
        }), 
      }); 
 
      if (!res.ok) { 
        const result = await res.json();
        throw new Error(result.error || 'Error al actualizar los tratamientos'); 
      } 
 
      // Registrar el pago
      if (pagoData?.total > 0 && onProcesarPago) { 
        const pagoFinal = { 
          ...pagoData, 
          presupuesto_id: plan.id, 
          presupuesto_name: `${plan.name || plan.nombre} - Tratamientos`, 
          items_detalle: seleccionados.map(t => ({ 
            servicio: t.tratamiento || t.service || 'Tratamiento', 
            diente: t.tooth || '', 
            precio: t.price || 0,
            surfaces: t.surfaces || [],
            diagnostico: t.diagnostico || '',
          })), 
        }; 
        await onProcesarPago(pagoFinal); 
      } 
 
      await loadPlanesData(); 
      setSuccess(`✅ ${seleccionados.length} tratamiento(s) completado(s) - ${fmt(pagoData?.total || 0)}`); 
      setTimeout(() => setSuccess(''), 3000); 
 
      // Limpiar selección y planParaCobrar in the CobroModal's onClose instead!
      // Let CobroModal finish emitirFactura, print prompt, etc. first!
    } catch (err) { 
      console.error('❌ Error en procesarPagoTratamientos:', err); 
      setError(err.message || 'Error al procesar el pago'); 
      setTimeout(() => setError(null), 4000); 
    } finally { 
      setCobrandoTratamientos(false); 
      // Don't close modal here - let CobroModal handle it after print!
    } 
  };

  // ── Toggle expandir plan ─────────────────────────────────────────────
  const toggleExpand = (planId) => {
    const newExpanded = new Set(expandedPlanes);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlanes(newExpanded);
  };

  // ── Render CobroModal unificado ──────────────────────────────────────
  const renderCobroModal = () => {
    // Caso 1: Cobro de cuota
    if (selectedCuota && selectedPlanPago) {
      return (
        <CobroModal
          isOpen={showCobroModal}
          onClose={() => {
            setShowCobroModal(false);
            setSelectedCuota(null);
            setSelectedPlanPago(null);
            setPlanParaCobrar(null);
          }}
          presupuesto={{
            id: selectedCuota.id,
            name: `Cuota #${selectedCuota.numero_cuota} - ${selectedPlanPago.nombre || 'Plan de Ortodoncia'}`,
            pending: selectedCuota.monto,
            total: selectedCuota.monto,
            items: [{
              service: `Cuota #${selectedCuota.numero_cuota}`,
              product_name: `Cuota #${selectedCuota.numero_cuota}`,
              description: `Cuota #${selectedCuota.numero_cuota}`,
              quantity: 1,
              price: selectedCuota.monto,
              subtotal: selectedCuota.monto,
              paid: 0,
              pending: selectedCuota.monto,
              code: 'CUOTA-001',
            }],
          }}
          paciente={pacienteProp}
          onProcesarPago={procesarPagoCuota}
          currencySymbol={currencySymbol}
          bizInfo={bizInfo}
        />
      );
    }

    // Caso 2: Cobro de tratamientos seleccionados
    if (planParaCobrar) {
      const { plan, items: itemsSeleccionados, total } = planParaCobrar;
      
      // Asegurar que los items tengan la estructura correcta para la factura
      const items = itemsSeleccionados.map((t, idx) => ({
        id: t.id || `temp-${Date.now()}-${idx}`,
        service: t.tratamiento || t.service || 'Tratamiento',
        product_name: t.tratamiento || t.service || 'Tratamiento',
        description: t.tratamiento || t.service || 'Tratamiento',
        tooth: t.tooth || '',
        quantity: 1,
        price: parseFloat(t.price || 0),
        subtotal: parseFloat(t.price || 0),
        paid: 0,
        pending: parseFloat(t.price || 0),
        comment: t.observaciones || `Diente #${t.tooth || ''}`,
        code: t.code || `TRT-${String(idx + 1).padStart(3, '0')}`,
        surfaces: t.surfaces || [],
        diagnostico: t.diagnostico || '',
        estado: t.estado || 'pendiente',
        // Campos adicionales para la factura
        product_id: plan.id,
        unit_price: parseFloat(t.price || 0),
        line_total: parseFloat(t.price || 0),
        tax_rate: 15,
        iva_amount: 0,
      }));

      return (
        <CobroModal
          isOpen={showCobroModal}
          onClose={() => {
            // Clear selected treatments for this plan when closing!
            if (planParaCobrar?.plan?.id) {
              const planId = planParaCobrar.plan.id;
              const items = planParaCobrar.plan.items || [];
              setSelectedTratamientos(prev => {
                const newSelected = { ...prev };
                items.forEach((_, idx) => {
                  const key = `${planId}-${idx}`;
                  delete newSelected[key];
                });
                return newSelected;
              });
            }
            
            setShowCobroModal(false);
            setPlanParaCobrar(null);
            setSelectedCuota(null);
            setSelectedPlanPago(null);
          }}
          presupuesto={{
            id: `${plan.id}-tratamientos-${Date.now()}`,
            name: `${plan.name || plan.nombre} - ${items.length} tratamiento(s) seleccionado(s)`,
            pending: total,
            total: total,
            items: items,
          }}
          paciente={pacienteProp}
          onProcesarPago={procesarPagoTratamientos}
          currencySymbol={currencySymbol}
          bizInfo={bizInfo}
        />
      );
    }

    return null;
  };

  // ── Render detalle de plan normal con selección ──────────────────────
  const renderDetallePlanNormal = (plan) => { 
    const isExpanded = expandedPlanes.has(plan.id); 
    const items = plan.items || []; 
    const pendientes = items.filter(t => t.estado !== 'completado'); 
    
    const totalSeleccionados = pendientes.filter((t, idx) => { 
      const key = `${plan.id}-${idx}`; 
      return selectedTratamientos[key]; 
    }).length; 
    
    const totalMontoSeleccionado = pendientes 
      .filter((t, idx) => { 
        const key = `${plan.id}-${idx}`; 
        return selectedTratamientos[key]; 
      }) 
      .reduce((sum, t) => sum + parseFloat(t.price || 0), 0); 
 
    const todosSeleccionados = pendientes.length > 0 && 
      pendientes.every((t, idx) => { 
        const key = `${plan.id}-${idx}`; 
        return selectedTratamientos[key]; 
      });

    return (
      <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <button
            onClick={() => toggleExpand(plan.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              padding: '4px 0',
            }}
          >
            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            {isExpanded ? 'Ocultar detalle' : 'Ver detalle de tratamientos'}
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              ({pendientes.length} pendientes)
            </span>
          </button>

          {totalSeleccionados > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <span style={{ fontSize: '12px', color: '#10b981' }}>
                {totalSeleccionados} seleccionados - {fmt(totalMontoSeleccionado)}
              </span>
              <button
                onClick={() => abrirCobroSeleccionados(plan)}
                disabled={cobrandoTratamientos}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: cobrandoTratamientos ? 'wait' : 'pointer',
                  opacity: cobrandoTratamientos ? 0.7 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <FiDollarSign size={14} />
                {cobrandoTratamientos ? 'Procesando...' : `Cobrar ${totalSeleccionados}`}
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b', fontWeight: 600, width: '40px' }}>
                    <button
                      onClick={() => seleccionarTodosTratamientos(plan.id, items)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '2px',
                      }}
                      title="Seleccionar todos los pendientes"
                    >
                      {todosSeleccionados ? <FiCheckSquare size={16} color="#10b981" /> : <FiSquare size={16} />}
                    </button>
                  </th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Diente</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Diagnóstico</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Tratamiento</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Precio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const estadoMap = {
                    pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fef3c7' },
                    en_proceso: { label: 'En proceso', color: '#3b82f6', bg: '#eff6ff' },
                    completado: { label: 'Completado', color: '#10b981', bg: '#d1fae5' },
                    cancelado: { label: 'Cancelado', color: '#ef4444', bg: '#fee2e2' },
                  };
                  const estado = estadoMap[item.estado] || estadoMap.pendiente;
                  const key = `${plan.id}-${idx}`; 
                  const isSelected = selectedTratamientos[key] || false;
                  const isCompletado = item.estado === 'completado';

                  return (
                    <tr key={key} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      opacity: isCompletado ? 0.6 : 1,
                      background: isCompletado ? 'rgba(16,185,129,0.03)' : 'transparent',
                    }}>
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {!isCompletado && (
                          <button
                            onClick={() => toggleTratamientoSelection(plan.id, idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                            }}
                          >
                            {isSelected ? <FiCheckSquare size={16} color="#10b981" /> : <FiSquare size={16} />}
                          </button>
                        )}
                        {isCompletado && (
                          <FiCheck size={16} color="#10b981" />
                        )}
                      </td>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#f1f5f9' }}>
                        #{item.tooth || '-'}
                        {isCompletado && <span style={{ marginLeft: '6px', fontSize: '10px', color: '#10b981' }}>✓</span>}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>
                        {item.diagnostico || '-'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#f1f5f9' }}>
                        {item.tratamiento || item.service || '-'}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: estado.bg,
                          color: estado.color,
                        }}>
                          {estado.label}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: isCompletado ? '#10b981' : '#f1f5f9', fontWeight: 600 }}>
                        ${parseFloat(item.price || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>
                    Total
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#10b981' }}>
                    ${parseFloat(plan.costo_total || plan.total_cost || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── Render plan normal ──────────────────────────────────────────────
  const renderPlanNormal = (plan) => {
    const statusMap = {
      draft: { label: 'Borrador', color: '#64748b', bg: '#f1f5f9' },
      active: { label: 'Activo', color: '#1e40af', bg: '#dbeafe' },
      completed: { label: 'Completado', color: '#065f46', bg: '#d1fae5' },
      cancelled: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
    };
    const status = statusMap[plan.status] || statusMap.draft;
    const totalItems = plan.items?.length || 0;
    const completados = plan.items?.filter(i => i.estado === 'completado').length || 0;

    return (
      <div key={plan.id} className="presupuesto-card" style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '15px' }}>
              <FiFileText size={18} color="#6366f1" />
              {plan.name || plan.nombre || 'Plan sin nombre'}
              <span style={{
                fontSize: '11px',
                padding: '2px 10px',
                borderRadius: '12px',
                background: status.bg,
                color: status.color,
                fontWeight: 600,
              }}>
                {status.label}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                fontWeight: 500,
              }}>
                {completados}/{totalItems} completados
              </span>
            </h4>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span><FiCalendar size={12} style={{ marginRight: '4px' }} />
                Creado: {plan.created_at ? new Date(plan.created_at).toLocaleDateString('es-ES') : '—'}
              </span>
              <span><FiTag size={12} style={{ marginRight: '4px' }} />
                Fase: {plan.fase || 'inicial'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
              ${parseFloat(plan.costo_total || plan.total_cost || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              {totalItems} tratamientos
            </div>
          </div>
        </div>

        {plan.descripcion || plan.description ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
            {plan.descripcion || plan.description}
          </div>
        ) : null}

        {plan.items && plan.items.length > 0 && (
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
            <strong>Tratamientos:</strong>{' '}
            {plan.items.map(i => i.tratamiento || i.service).filter(Boolean).join(', ')}
          </div>
        )}

        {renderDetallePlanNormal(plan)}
      </div>
    );
  };

  // ── Render plan de pagos ────────────────────────────────────────────
  const renderPlanPago = (plan) => {
    const planCuotas = cuotasData[plan.id] || [];
    const totalCuotas = planCuotas.length;
    const pagadas = planCuotas.filter(c => c.estado === 'pagado').length;
    const montoTotal = parseFloat(plan.monto_total || 0);
    const montoPagado = planCuotas.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + parseFloat(c.monto || 0), 0);
    const porcentajePagado = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0;

    const statusMap = {
      activo: { label: 'Activo', color: '#1e40af', bg: '#dbeafe' },
      completado: { label: 'Completado', color: '#065f46', bg: '#d1fae5' },
      cancelado: { label: 'Cancelado', color: '#991b1b', bg: '#fee2e2' },
    };
    const status = statusMap[plan.estado] || statusMap.activo;

    const isExpanded = expandedPlanes.has(plan.id);

    return (
      <div key={plan.id} className="presupuesto-card" style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, fontSize: '15px' }}>
              <FiCreditCard size={18} color="#10b981" />
              {plan.nombre || 'Plan de Ortodoncia'}
              <span style={{
                fontSize: '11px',
                padding: '2px 10px',
                borderRadius: '12px',
                background: status.bg,
                color: status.color,
                fontWeight: 600,
              }}>
                {status.label}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 10px',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8',
                fontWeight: 500,
              }}>
                {pagadas}/{totalCuotas} cuotas pagadas
              </span>
            </h4>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
              <FiCalendar size={12} style={{ marginRight: '4px' }} />
              Inicio: {plan.fecha_inicio ? new Date(plan.fecha_inicio).toLocaleDateString('es-ES') : '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
              ${montoTotal.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
              {totalCuotas} cuotas
            </div>
          </div>
        </div>

        {plan.descripcion ? (
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
            {plan.descripcion}
          </div>
        ) : null}

        <div style={{
          height: 4,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.04)',
          marginBottom: 12,
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${porcentajePagado}%`,
            height: '100%',
            background: porcentajePagado >= 100
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : 'linear-gradient(90deg, #f59e0b, #d97706)',
            borderRadius: 4,
            transition: 'width 0.6s ease'
          }} />
        </div>

        <button
          onClick={() => toggleExpand(plan.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            padding: '4px 0',
            marginBottom: isExpanded ? '12px' : '0',
          }}
        >
          {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          {isExpanded ? 'Ocultar cuotas' : 'Ver cuotas'}
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            ({totalCuotas} cuotas)
          </span>
        </button>

        {isExpanded && planCuotas.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}># Cuota</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Vencimiento</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Monto</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Estado</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planCuotas.map((cuota) => {
                  const isPaid = cuota.estado === 'pagado';
                  const isPending = cuota.estado === 'pendiente';
                  const isOverdue = cuota.estado === 'vencido';

                  const statusStyle = isPaid
                    ? { background: '#d1fae5', color: '#065f46' }
                    : isOverdue
                      ? { background: '#fee2e2', color: '#991b1b' }
                      : { background: '#fef3c7', color: '#92400e' };

                  return (
                    <tr key={cuota.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600, color: '#f1f5f9' }}>
                        #{cuota.numero_cuota}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#94a3b8' }}>
                        {cuota.fecha_vencimiento ? new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td style={{ padding: '6px 10px', color: '#10b981', fontWeight: 600 }}>
                        ${parseFloat(cuota.monto || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          ...statusStyle,
                        }}>
                          {isPaid ? 'Pagado' : isOverdue ? 'Vencido' : 'Pendiente'}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        {!isPaid && (
                          <button
                            style={{
                              padding: '4px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onClick={() => abrirCobroCuota(cuota, plan)}
                          >
                            <FiDollarSign size={12} /> Cobrar
                          </button>
                        )}
                        {isPaid && (
                          <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FiCheck size={14} /> Pagado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2" style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#94a3b8' }}>
                    Totales
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 700, color: '#10b981' }}>
                    ${montoTotal.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#94a3b8' }}>
                    Pagado: ${montoPagado.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 10px', fontWeight: 600, color: montoTotal - montoPagado > 0 ? '#f59e0b' : '#10b981' }}>
                    Pendiente: ${(montoTotal - montoPagado).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ── Render presupuestos ─────────────────────────────────────────────
  const renderPresupuestos = () => {
    const allPlanes = [
      ...planesData.map(p => ({ ...p, type: 'normal' })),
      ...planesPagosData.map(p => ({ ...p, type: 'pagos' })),
    ];

    let filtered = allPlanes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.name || p.nombre || '').toLowerCase().includes(term) ||
        (p.description || p.descripcion || '').toLowerCase().includes(term)
      );
    }
    if (filterType === 'normales') {
      filtered = filtered.filter(p => p.type === 'normal');
    } else if (filterType === 'pagos') {
      filtered = filtered.filter(p => p.type === 'pagos');
    }

    filtered.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.created_at || b.fecha_inicio || 0) - new Date(a.created_at || a.fecha_inicio || 0);
    });

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div>
            <h4 style={{ margin: 0 }}>Planes de Tratamiento</h4>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {filtered.length} planes · {summary.totalCuotas} cuotas
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${filterType === 'todos' ? '#10b981' : '#e2e8f0'}`,
                background: filterType === 'todos' ? '#10b981' : 'transparent',
                color: filterType === 'todos' ? '#fff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setFilterType('todos')}
            >
              Todos
            </button>
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${filterType === 'normales' ? '#6366f1' : '#e2e8f0'}`,
                background: filterType === 'normales' ? '#6366f1' : 'transparent',
                color: filterType === 'normales' ? '#fff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setFilterType('normales')}
            >
              Planes Normales
            </button>
            <button
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: `1px solid ${filterType === 'pagos' ? '#10b981' : '#e2e8f0'}`,
                background: filterType === 'pagos' ? '#10b981' : 'transparent',
                color: filterType === 'pagos' ? '#fff' : '#94a3b8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setFilterType('pagos')}
            >
              Planes de Pagos
            </button>
            <button
              className="odont-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 10px' }}
              onClick={loadPlanesData}
              disabled={loadingPlanes}
            >
              <FiRefreshCw size={14} className={loadingPlanes ? 'spin' : ''} />
            </button>
          </div>
        </div>

        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <FiSearch size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Buscar plan por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
              fontSize: '13px',
              fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.03)',
              color: '#f1f5f9',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              <FiX size={14} />
            </button>
          )}
        </div>

        <div className="odont-treatment-note" style={{ marginBottom: 16 }}>
          <div className="odont-info-card" style={{ flex: 1 }}>
            <strong>Total Planes</strong>
            <span>{summary.totalPlanes}</span>
          </div>
          <div className="odont-info-card" style={{ flex: 1 }}>
            <strong>Total Presupuestos</strong>
            <span>{fmt(summary.totalPresupuestos)}</span>
          </div>
          <div className="odont-info-card" style={{ flex: 1 }}>
            <strong>Pagado</strong>
            <span style={{ color: '#10b981' }}>{fmt(summary.totalPagado)}</span>
          </div>
          <div className="odont-info-card" style={{ flex: 1 }}>
            <strong>Por pagar</strong>
            <span style={{ color: '#f59e0b' }}>{fmt(summary.totalPendiente)}</span>
          </div>
          <div className="odont-info-card" style={{ flex: 1 }}>
            <strong>Cuotas Pagadas</strong>
            <span style={{ color: '#10b981' }}>{summary.totalCuotasPagadas}</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="odont-empty-state">
            <FiPackage size={48} style={{ color: '#94a3b8' }} />
            <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500, color: '#94a3b8' }}>
              No hay planes disponibles
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
              {filterType === 'pagos'
                ? 'Genera un plan de pagos desde Ortodoncia'
                : 'Crea un plan desde el Odontograma'}
            </div>
          </div>
        ) : (
          filtered.map((plan) => {
            if (plan.type === 'normal') {
              return renderPlanNormal(plan);
            } else {
              return renderPlanPago(plan);
            }
          })
        )}
      </>
    );
  };

  const renderPagos = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>Historial de pagos</h4>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Movimientos registrados</span>
      </div>
      {pagos.length === 0 ? (
        <div className="odont-empty-state">No hay pagos registrados</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pagos.map((pago) => (
            <div key={pago.id} className="odont-info-card" style={{ alignItems: 'flex-start' }}>
              <strong>{pago.reason || 'Pago'}</strong>
              <span>{pago.date || '—'} · {pago.doctor || '—'}</span>
              <small>{pago.comment || 'Sin comentario'}</small>
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>{fmt(pago.price || 0)}</span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                  {pago.method === 'cash' ? 'Efectivo' :
                    pago.method === 'card' ? 'Tarjeta' :
                      pago.method === 'transfer' ? 'Transferencia' : '—'}
                </span>
                {pago.reference && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                    Ref: {pago.reference}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderLaboratorios = () => (
    <>
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: 0 }}>Órdenes de Lab.</h4>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Órdenes sugeridas y derivadas</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="odont-btn-primary" style={{ fontSize: 12 }}>
          <FiPlus /> Nuevo
        </button>
      </div>
      {laboratorios.length === 0 ? (
        <div className="odont-empty-state">No hay órdenes de laboratorio</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {laboratorios.map((orden) => (
            <div key={orden.id} className="odont-info-card" style={{ alignItems: 'flex-start' }}>
              <strong>{orden.reason || 'Orden'}</strong>
              <span>{orden.date || '—'} · {orden.doctor || '—'}</span>
              <small>{orden.comment || 'Sin comentario'}</small>
              <span style={{ color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                Valor referencial: {fmt(orden.price || 0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const createBudgetFromPatient = () => {
    const items = [
      { service: 'Control clínico', tooth: 0, quantity: 1, currency: 'US$', price: 35, discount: 0, subtotal: 35, paid: 0, pending: 35, comment: 'Control general' },
      { service: 'Evaluación diagnóstica', tooth: 0, quantity: 1, currency: 'US$', price: 25, discount: 0, subtotal: 25, paid: 0, pending: 25, comment: 'Diagnóstico inicial' },
    ];

    onCreateBudget?.({
      name: `${pacienteProp ? `${pacienteProp.first_name} ${pacienteProp.last_name}` : 'Paciente'} - Nuevo presupuesto`,
      items,
      total: 60,
      paid: 0,
      pending: 60,
      created_at: new Date().toISOString().slice(0, 10),
      internal_note: 'Creado desde estado de cuenta',
      patient_note: 'Presupuesto sugerido por evaluación clínica.',
    });
  };

  return (
    <div className="odont-atender-section">
      <div className="odont-atender-section-header">
        <h3><FiDollarSign /> Estado de Cuenta</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' , color:'#1e1c1cff'}}>
          <button className="odont-btn-secondary" style={{ fontSize: 12 }} onClick={() => setActiveTab('presupuestos')}>
            <FiPackage /> Presupuestos
          </button>
          <button className="odont-btn-secondary" style={{ fontSize: 12 }} onClick={() => setActiveTab('pagos')}>
            <FiClock /> Historial de pagos
          </button>
          <button className="odont-btn-secondary" style={{ fontSize: 12 }} onClick={() => setActiveTab('laboratorios')}>
            <FiPackage /> Órdenes de Lab.
          </button>
        </div>
      </div>

      

      {activeTab === 'presupuestos' && renderPresupuestos()}
      {activeTab === 'pagos' && renderPagos()}
      {activeTab === 'laboratorios' && renderLaboratorios()}

      {/* Modal de cobro unificado */}
      {renderCobroModal()}

      {/* Modal de impresión */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 340,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🧾</div>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>
              ¿Imprimir comprobante?
            </h3>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
              El pago fue registrado exitosamente.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => handlePrintDecision(true)}
                style={{
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '11px 24px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FiCheck size={15} /> Sí, imprimir
              </button>
              <button
                onClick={() => handlePrintDecision(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '11px 24px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FiX size={15} /> No
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default EstadoCuentaSeccion;