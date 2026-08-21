// components/Odontologia/EstadoCuenta/EstadoCuentaSeccion.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiDollarSign, FiPackage, FiClock, FiRefreshCw } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PrintModal from './PrintModal';
import PresupuestosList from './PresupuestosList';
import PagosList from './PagosList';
import LaboratoriosList from './LaboratoriosList';
import CobroModalWrapper from './CobroModalWrapper';
import '../../../styles/Odontologia/index.css';

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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cobrandoTratamientos, setCobrandoTratamientos] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(false);

  // ── Estados para Planes y Cuotas ──────────────────────────────────────
  const [planesData, setPlanesData] = useState([]);
  const [planesPagosData, setPlanesPagosData] = useState([]);
  const [cuotasData, setCuotasData] = useState({});

  // Estados para acordeón y selección de tratamientos
  const [expandedPlanes, setExpandedPlanes] = useState(new Set());
  const [selectedTratamientos, setSelectedTratamientos] = useState({});

  // ── Estados para Cobro Modal ──────────────────────────────────────────
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedPlanPago, setSelectedPlanPago] = useState(null);
  const [selectedCuota, setSelectedCuota] = useState(null);
  const [planParaCobrar, setPlanParaCobrar] = useState(null);

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

  const fmt = (n) => `${currencySymbol} ${parseFloat(n || 0).toFixed(2)}`;

  // ── Resumen financiero ──────────────────────────────────────────────────
  const summary = {
    totalPlanes: planesData.length + planesPagosData.length,
    totalPresupuestos: planesData.reduce((sum, p) => sum + parseFloat(p.costo_total || p.total_cost || 0), 0)
      + planesPagosData.reduce((sum, p) => sum + parseFloat(p.monto_total || 0), 0),
    totalPagado: planesData.reduce((sum, plan) => {
      const items = plan.items || [];
      const completados = items.filter(i => i.estado === 'completado');
      return sum + completados.reduce((s, i) => s + parseFloat(i.price || 0), 0);
    }, 0)
      + Object.values(cuotasData).reduce((sum, cuotasList) => 
        sum + cuotasList.filter(c => c.estado === 'pagado').reduce((s, c) => s + parseFloat(c.monto || 0), 0), 0
      ),
    totalPendiente: 0,
    totalCuotas: Object.values(cuotasData).reduce((sum, c) => sum + c.length, 0),
    totalCuotasPagadas: Object.values(cuotasData).reduce((sum, cuotasList) => 
      sum + cuotasList.filter(c => c.estado === 'pagado').length, 0
    ),
  };

  summary.totalPendiente = summary.totalPresupuestos - summary.totalPagado;

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

  // ── Seleccionar/Deseleccionar un tratamiento individual ─────────────
  const toggleTratamientoSelection = (planId, itemIndex) => {
    const key = `${planId}-${itemIndex}`;
    setSelectedTratamientos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // ── Seleccionar/Deseleccionar TODOS los pendientes ──────────────────
  const seleccionarTodosTratamientos = (planId, items) => {
    const pendientes = items.filter(t => t.estado !== 'completado');
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

    const total = seleccionados.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);

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
      total,
    });
    setShowCobroModal(true);
  };

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

  // ── Procesar pago de tratamientos seleccionados ──────────────────────
  const procesarPagoTratamientos = async (pagoData) => {
    if (!planParaCobrar) return;

    const { plan, seleccionados } = planParaCobrar;
    setCobrandoTratamientos(true);
    setError('');
    setSuccess('');

    try {
      const selectedIds = new Set(seleccionados.map(t => t.id).filter(Boolean));

      const updatedItems = plan.items.map((item, idx) => {
        if (item.id && selectedIds.has(item.id)) {
          return { ...item, estado: 'completado' };
        }
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

      const planId = plan.id;
      const items = plan.items || [];
      setSelectedTratamientos(prev => {
        const newSelected = { ...prev };
        items.forEach((_, idx) => {
          const key = `${planId}-${idx}`;
          delete newSelected[key];
        });
        return newSelected;
      });

      return { success: true };
    } catch (err) {
      console.error('❌ Error en procesarPagoTratamientos:', err);
      setError(err.message || 'Error al procesar el pago');
      setTimeout(() => setError(null), 4000);
      throw err;
    } finally {
      setCobrandoTratamientos(false);
    }
  };

  // ── Cerrar CobroModal ────────────────────────────────────────────────
  const closeCobroModal = () => {
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
  };

  // ── Crear presupuesto desde paciente ─────────────────────────────────
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
    <div className="hc-main-container" style={{ padding: '0' }}>
      {/* HEADER - Título + TABS + Badge + Refresh en una sola fila */}
      <div className="hc-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        {/* Izquierda: Título + Badge */}
        <div className="hc-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiDollarSign size={20} style={{ color: '#10b981' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Estado de Cuenta
          </h3>
          <span style={{ 
            fontSize: '12px', 
            background: '#e2e8f0', 
            padding: '2px 10px', 
            borderRadius: '12px',
            color: '#475569'
          }}>
            {summary.totalPlanes} planes
          </span>
        </div>

        {/* Derecha: Tabs + Refresh */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className={`hc-btn-secondary ${activeTab === 'presupuestos' ? 'active' : ''}`} 
            onClick={() => setActiveTab('presupuestos')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeTab === 'presupuestos' ? 'none' : '1px solid #e2e8f0',
              background: activeTab === 'presupuestos' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'presupuestos' ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'presupuestos' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
              fontFamily: 'inherit'
            }}
          >
            <FiPackage size={15} /> Presupuestos
          </button>
          <button 
            className={`hc-btn-secondary ${activeTab === 'pagos' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pagos')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeTab === 'pagos' ? 'none' : '1px solid #e2e8f0',
              background: activeTab === 'pagos' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'pagos' ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'pagos' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
              fontFamily: 'inherit'
            }}
          >
            <FiClock size={15} /> Historial de pagos
          </button>
          <button 
            className={`hc-btn-secondary ${activeTab === 'laboratorios' ? 'active' : ''}`} 
            onClick={() => setActiveTab('laboratorios')}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: activeTab === 'laboratorios' ? 'none' : '1px solid #e2e8f0',
              background: activeTab === 'laboratorios' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: activeTab === 'laboratorios' ? '#fff' : '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: activeTab === 'laboratorios' ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
              fontFamily: 'inherit'
            }}
          >
            <FiPackage size={15} /> Órdenes de Lab.
          </button>
          <button 
            className="hc-btn-secondary" 
            onClick={loadPlanesData}
            disabled={loadingPlanes}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: 'transparent',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            <FiRefreshCw size={15} className={loadingPlanes ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* CONTENIDO - Sin contenedor adicional, solo el tab activo */}
      {activeTab === 'presupuestos' && (
        <PresupuestosList
          planesData={planesData}
          planesPagosData={planesPagosData}
          cuotasData={cuotasData}
          loadingPlanes={loadingPlanes}
          onLoadPlanes={loadPlanesData}
          summary={summary}
          currencySymbol={currencySymbol}
          expandedPlanes={expandedPlanes}
          onToggleExpand={toggleExpand}
          selectedTratamientos={selectedTratamientos}
          onToggleTratamiento={toggleTratamientoSelection}
          onSeleccionarTodos={seleccionarTodosTratamientos}
          onAbrirCobroSeleccionados={abrirCobroSeleccionados}
          onAbrirCobroCuota={abrirCobroCuota}
          cobrandoTratamientos={cobrandoTratamientos}
        />
      )}

      {activeTab === 'pagos' && (
        <PagosList pagos={pagos} currencySymbol={currencySymbol} />
      )}

      {activeTab === 'laboratorios' && (
        <LaboratoriosList
          laboratorios={laboratorios}
          currencySymbol={currencySymbol}
          onNuevoLaboratorio={createBudgetFromPatient}
        />
      )}

      <CobroModalWrapper
        showCobroModal={showCobroModal}
        onClose={closeCobroModal}
        selectedCuota={selectedCuota}
        selectedPlanPago={selectedPlanPago}
        planParaCobrar={planParaCobrar}
        pacienteProp={pacienteProp}
        currencySymbol={currencySymbol}
        bizInfo={bizInfo}
        onProcesarPagoCuota={procesarPagoCuota}
        onProcesarPagoTratamientos={procesarPagoTratamientos}
      />

      <PrintModal
        isOpen={showPrintModal}
        onPrint={handlePrintDecision}
        onCancel={() => handlePrintDecision(false)}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 0.8s linear infinite;
        }
        .hc-btn-secondary.active {
          background: linear-gradient(135deg, #10b981, #059669) !important;
          color: #fff !important;
          border: none !important;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
        }
        .hc-btn-secondary.active:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35) !important;
        }
        .hc-btn-secondary:hover:not(.active) {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
        }
      `}</style>
    </div>
  );
};

export default EstadoCuentaSeccion;