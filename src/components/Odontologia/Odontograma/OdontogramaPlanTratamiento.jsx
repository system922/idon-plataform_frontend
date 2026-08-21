// components/Odontologia/Odontograma/OdontogramaPlanTratamiento.jsx
import React, { useState } from 'react';
import {
  FiList,
  FiCheckCircle,
  FiDollarSign,
  FiSave,
  FiAlertCircle,
  FiPlus,
  FiTrash2,
  FiEdit2,
  FiClock,
  FiCheck,
  FiX,
  FiUserCheck,
} from 'react-icons/fi';
import { CONDITION_MAP } from './index';
import {
  ESTADOS_TRATAMIENTO,
  obtenerHallazgosNoFavorablesDelDiente,
} from './OdontogramaConstants';

// ============================================================
// COMPONENTE PARA AGREGAR TRATAMIENTO
// ============================================================
const AgregarTratamiento = ({ toothNumber, tratamientosAPI, onAdd, disabled }) => {
  const [servicioId, setServicioId] = useState('');
  const [showSelect, setShowSelect] = useState(false);

  const handleAdd = () => {
    if (!servicioId) return;
    const tratamiento = tratamientosAPI.find(t => t.id === servicioId);
    onAdd(toothNumber, {
      servicio_id: servicioId,
      servicio: tratamiento?.name || 'Tratamiento',
      price: tratamiento?.price || 0,
      estado: 'pendiente',
      observaciones: '',
    });
    setServicioId('');
    setShowSelect(false);
  };

  if (disabled) {
    return (
      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
        <FiCheck size={14} style={{ color: '#10b981', marginRight: '4px' }} />
        Completado
      </span>
    );
  }

  if (!showSelect) {
    return (
      <button
        onClick={() => setShowSelect(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '8px',
          border: '1px dashed #2563eb',
          background: 'transparent',
          color: '#2563eb',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#eff6ff';
          e.currentTarget.style.borderColor = '#1d4ed8';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = '#2563eb';
        }}
      >
        <FiPlus size={14} /> Agregar tratamiento
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        value={servicioId}
        onChange={(e) => setServicioId(e.target.value)}
        style={{
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '12px',
          background: '#fff',
          minWidth: '180px',
          outline: 'none',
          transition: 'all 0.2s',
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = '#2563eb')}
        onBlur={(e) => (e.currentTarget.style.borderColor = '#e2e8f0')}
        autoFocus
      >
        <option value="">Seleccionar tratamiento...</option>
        {tratamientosAPI.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} {t.price ? `($${t.price})` : ''}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        style={{
          padding: '6px 16px',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: '#fff',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8, #1e40af)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.25)';
        }}
      >
        Añadir
      </button>
      <button
        onClick={() => setShowSelect(false)}
        style={{
          padding: '6px 8px',
          borderRadius: '8px',
          border: 'none',
          background: '#ef4444',
          color: '#fff',
          fontSize: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#dc2626')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#ef4444')}
      >
        <FiX size={14} />
      </button>
    </div>
  );
};

// ============================================================
// COMPONENTE PARA MOSTRAR TRATAMIENTOS DE UN DIENTE - SOLO LECTURA
// ============================================================
const TratamientosDienteReadOnly = ({ tratamientos }) => {
  if (tratamientos.length === 0) {
    return <span style={{ fontSize: '12px', color: '#94a3b8' }}>Sin tratamientos</span>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {tratamientos.map((t, idx) => {
        const estadoInfo = ESTADOS_TRATAMIENTO.find(e => e.value === t.estado) || ESTADOS_TRATAMIENTO[0];
        return (
          <div
            key={t.id || idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: '#f8fafc',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: 500, color: '#0f172a' }}>{t.servicio}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9' }}>
              ${t.price || 0}
            </span>
            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 600, background: estadoInfo.bg, color: estadoInfo.color, border: `1px solid ${estadoInfo.border}` }}>
              {estadoInfo.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontogramaPlanTratamiento({
  activeSubTab,
  initialTeeth,
  currentPlan,
  tratamientosAPI,
  totalTratamientos,
  totalPresupuesto,
  tratamientosPendientes,
  todosCompletados,
  saving,
  generandoAlta,
  planGuardado,
  onAddTratamiento,
  onUpdateTratamiento,
  onDeleteTratamiento,
  onCompletarTratamiento,
  onSavePlan,
  onGenerarAlta,
  onClosePlan,
}) {
  const isInicial = activeSubTab === 'inicial';
  const isAlta = activeSubTab === 'alta';
  const isEvolucion = activeSubTab === 'evolucion';

  if (isInicial) {
    return (
      <div style={{ marginTop: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', padding: '30px 20px', textAlign: 'center' }}>
        <FiAlertCircle size={32} style={{ color: '#94a3b8', marginBottom: '12px' }} />
        <h4 style={{ color: '#475569', marginBottom: '8px' }}>Plan de Tratamiento no disponible</h4>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>El plan solo está disponible en la fase <strong>Evolución</strong>.</p>
      </div>
    );
  }

  if (isAlta) {
    const dientesConHallazgos = Object.keys(initialTeeth).filter((key) => {
      const tooth = initialTeeth[key];
      if (!tooth) return false;
      return obtenerHallazgosNoFavorablesDelDiente(tooth).length > 0;
    });

    return (
      <div style={{ marginTop: '16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxHeight: '650px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <FiList size={22} style={{ color: '#2563eb' }} />
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Plan de Tratamiento - Alta</h4>
            <span style={{ background: '#10b981', padding: '2px 14px', borderRadius: '20px', fontSize: '12px', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <FiCheckCircle size={14} /> Completado
            </span>
          </div>
          <button onClick={onClosePlan} style={{ padding: '6px 14px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500 }}>
            <FiX size={16} /> Cerrar
          </button>
        </div>

        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, background: '#fafbfc' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diente</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diagnóstico Inicial</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Superficies</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tratamiento</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {dientesConHallazgos.map((toothKey) => {
                  const tooth = initialTeeth[toothKey];
                  const hallazgos = obtenerHallazgosNoFavorablesDelDiente(tooth);
                  const tieneGlobal = hallazgos.some(h => h.tipo === 'global');
                  const superficiesText = tieneGlobal ? 'Todo el diente' : hallazgos.filter(h => h.tipo === 'superficial').map(h => h.surface).join(', ');
                  const hallazgosUnicos = hallazgos.reduce((acc, h) => {
                    if (!acc.some(item => item.hallazgo === h.hallazgo)) {
                      acc.push(h);
                    }
                    return acc;
                  }, []);
                  const tratamientosDiente = currentPlan.filter((t) => t.tooth === parseInt(toothKey) && t.estado !== 'cancelado');
                  const estadoGeneral = tratamientosDiente.length === 0 ? 'sin_asignar' : tratamientosDiente.every((t) => t.estado === 'completado') ? 'completado' : 'en_proceso';
                  const estadoInfo = ESTADOS_TRATAMIENTO.find((e) => e.value === estadoGeneral) || ESTADOS_TRATAMIENTO[0];

                  return (
                    <tr key={toothKey} style={{ background: '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <td style={{ padding: '12px 12px', fontWeight: 700, color: '#0f172a', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                        #{toothKey}{tieneGlobal && <span style={{ marginLeft: '6px', fontSize: '8px', background: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: '12px', fontWeight: 700 }}>GLOBAL</span>}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        {hallazgosUnicos.map((h, idx) => {
                          const condColor = CONDITION_MAP[h.hallazgo]?.color || '#64748b';
                          const label = CONDITION_MAP[h.hallazgo]?.label || h.hallazgo;
                          return <span key={idx} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', background: `${condColor}22`, color: condColor, fontSize: '12px', fontWeight: 500, marginRight: '4px', marginBottom: '2px' }}>{label}</span>;
                        })}
                      </td>
                      <td style={{ padding: '12px 12px', fontSize: '12px', color: '#64748b' }}>{superficiesText || '—'}</td>
                      <td style={{ padding: '12px 12px' }}>
                        {tratamientosDiente.length > 0 ? <TratamientosDienteReadOnly tratamientos={tratamientosDiente} /> : <span style={{ color: '#94a3b8' }}>Sin tratamientos</span>}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: estadoInfo.bg, color: estadoInfo.color, border: `1px solid ${estadoInfo.border}` }}>
                          {estadoInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#ffffff', borderTop: '2px solid #e2e8f0', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}><strong>Total:</strong></span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{totalTratamientos} {totalTratamientos === 1 ? 'tratamiento' : 'tratamientos'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiDollarSign size={18} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}><strong>Presupuesto:</strong></span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>${totalPresupuesto.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ EVOLUCION
  const dientesConHallazgos = Object.keys(initialTeeth).filter((key) => {
    const tooth = initialTeeth[key];
    if (!tooth) return false;
    return obtenerHallazgosNoFavorablesDelDiente(tooth).length > 0;
  });

  const allCompleted = todosCompletados && currentPlan.length > 0;
  const hayTratamientos = currentPlan.filter((t) => t.estado !== 'cancelado').length > 0;

  return (
    <div style={{ marginTop: '16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', maxHeight: '650px', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0', flexShrink: 0, flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <FiList size={22} style={{ color: '#2563eb' }} />
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Plan de Tratamiento</h4>
          <span style={{ background: '#2563eb', padding: '2px 14px', borderRadius: '20px', fontSize: '13px', color: '#ffffff', fontWeight: 600 }}>{totalTratamientos} {totalTratamientos === 1 ? 'tratamiento' : 'tratamientos'}</span>
          {allCompleted && <span style={{ background: '#10b981', padding: '2px 14px', borderRadius: '20px', fontSize: '12px', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={14} /> Todos completados</span>}
          {tratamientosPendientes.length > 0 && !allCompleted && <span style={{ background: '#fef3c7', padding: '2px 14px', borderRadius: '20px', fontSize: '12px', color: '#92400e', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiClock size={14} /> {tratamientosPendientes.length} pendientes</span>}
          {planGuardado ? (
            <span style={{ background: '#dbeafe', padding: '2px 14px', borderRadius: '20px', fontSize: '12px', color: '#1e40af', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={14} /> Plan guardado</span>
          ) : hayTratamientos ? (
            <span style={{ background: '#fef3c7', padding: '2px 14px', borderRadius: '20px', fontSize: '12px', color: '#92400e', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiEdit2 size={14} /> Sin guardar</span>
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {allCompleted && (
            <button onClick={onGenerarAlta} disabled={generandoAlta} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: generandoAlta ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: generandoAlta ? 0.7 : 1 }}>
              <FiUserCheck size={16} /> {generandoAlta ? 'Generando...' : 'Generar Alta'}
            </button>
          )}
          <button onClick={onSavePlan} disabled={saving || !hayTratamientos} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 18px', borderRadius: '8px', border: 'none', background: planGuardado || !hayTratamientos ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: saving || !hayTratamientos ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: planGuardado || !hayTratamientos ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.25)', opacity: saving || !hayTratamientos ? 0.6 : 1 }}>
            <FiSave size={16} /> {saving ? 'Guardando...' : planGuardado ? 'Actualizar Plan' : 'Guardar Plan'}
          </button>
          <button onClick={onClosePlan} style={{ padding: '6px 14px', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#ffffff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#64748b', fontWeight: 500, transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }} onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
            <FiX size={16} /> Cerrar
          </button>
        </div>
      </div>

      {/* BODY - Tabla */}
      <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1, background: '#fafbfc' }}>
        {dientesConHallazgos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <FiCheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 500 }}>No hay hallazgos NO favorables</p>
            <p style={{ fontSize: '14px' }}>Todos los dientes están en condiciones favorables.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diente</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Diagnóstico Inicial</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Superficies</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tratamiento</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dientesConHallazgos.map((toothKey) => {
                  const tooth = initialTeeth[toothKey];
                  const hallazgos = obtenerHallazgosNoFavorablesDelDiente(tooth);
                  const tieneGlobal = hallazgos.some(h => h.tipo === 'global');
                  const superficiesText = tieneGlobal ? 'Todo el diente' : hallazgos.filter(h => h.tipo === 'superficial').map(h => h.surface).join(', ');
                  const hallazgosUnicos = hallazgos.reduce((acc, h) => {
                    if (!acc.some(item => item.hallazgo === h.hallazgo)) {
                      acc.push(h);
                    }
                    return acc;
                  }, []);
                  const tratamientosDiente = currentPlan.filter((t) => t.tooth === parseInt(toothKey) && t.estado !== 'cancelado');
                  const estadoGeneral = tratamientosDiente.length === 0 ? 'sin_asignar' : tratamientosDiente.every((t) => t.estado === 'completado') ? 'completado' : 'en_proceso';
                  const estadoInfo = ESTADOS_TRATAMIENTO.find((e) => e.value === estadoGeneral) || ESTADOS_TRATAMIENTO[0];
                  const isCompletado = estadoGeneral === 'completado';
                  const esEditable = !isCompletado && isEvolucion;

                  // ✅ Obtener tratamientos pendientes (no completados)
                  const tratamientosPendientesDiente = tratamientosDiente.filter(t => t.estado !== 'completado');

                  return (
                    <tr key={toothKey} style={{ background: isCompletado ? '#f0fdf4' : '#ffffff', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s', opacity: isCompletado ? 0.85 : 1 }}>
                      <td style={{ padding: '12px 12px', fontWeight: 700, color: '#0f172a', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                        #{toothKey}
                        {isCompletado && <span style={{ marginLeft: '6px', fontSize: '12px', color: '#10b981' }}><FiCheckCircle size={14} /></span>}
                        {tieneGlobal && <span style={{ marginLeft: '6px', fontSize: '8px', background: '#ef4444', color: '#fff', padding: '1px 8px', borderRadius: '12px', fontWeight: 700 }}>GLOBAL</span>}
                      </td>

                      <td style={{ padding: '12px 12px' }}>
                        {hallazgosUnicos.map((h, idx) => {
                          const condColor = CONDITION_MAP[h.hallazgo]?.color || '#64748b';
                          const label = CONDITION_MAP[h.hallazgo]?.label || h.hallazgo;
                          return <span key={idx} style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '12px', background: `${condColor}22`, color: condColor, fontSize: '12px', fontWeight: 500, marginRight: '4px', marginBottom: '2px' }}>{label}</span>;
                        })}
                      </td>

                      <td style={{ padding: '12px 12px', fontSize: '12px', color: '#64748b' }}>{superficiesText || '—'}</td>

                      <td style={{ padding: '12px 12px' }}>
                        {isCompletado ? (
                          <span style={{ color: '#10b981', fontWeight: 500, fontSize: '13px' }}>
                            {tratamientosDiente.map((t) => t.servicio).join(', ')}
                          </span>
                        ) : (
                          <>
                            <AgregarTratamiento toothNumber={parseInt(toothKey)} tratamientosAPI={tratamientosAPI} onAdd={onAddTratamiento} disabled={!esEditable} />
                            {tratamientosDiente.length > 0 && (
                              <div style={{ marginTop: '6px' }}>
                                {tratamientosDiente.map((t, idx) => (
                                  <div key={t.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 0', fontSize: '12px' }}>
                                    <span style={{ fontWeight: 500 }}>{t.servicio}</span>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#0f172a', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9' }}>
                                      ${t.price || 0}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </td>

                      <td style={{ padding: '12px 12px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: estadoInfo.bg, color: estadoInfo.color, border: `1px solid ${estadoInfo.border}` }}>
                          {estadoInfo.label}
                        </span>
                      </td>

                      {/* ✅ Acciones: SOLO botón de eliminar para tratamientos pendientes */}
                      <td style={{ padding: '12px 12px', borderTopRightRadius: '12px', borderBottomRightRadius: '12px' }}>
                        {isCompletado ? (
                          <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FiCheckCircle size={16} /> Completado
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {tratamientosPendientesDiente.map((t, idx) => (
                              <div key={t.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <button
                                  onClick={() => onDeleteTratamiento(t.id || idx)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
                                  title="Eliminar tratamiento"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {tratamientosPendientesDiente.length === 0 && (
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER */}
      {hayTratamientos && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#ffffff', borderTop: '2px solid #e2e8f0', flexWrap: 'wrap', gap: '12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#64748b' }}><strong>Total:</strong></span>
              <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{totalTratamientos} {totalTratamientos === 1 ? 'tratamiento' : 'tratamientos'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiDollarSign size={18} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '14px', color: '#64748b' }}><strong>Presupuesto:</strong></span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#10b981' }}>${totalPresupuesto.toFixed(2)}</span>
            </div>
            {tratamientosPendientes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#f59e0b' }}><strong>Pendientes:</strong></span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#f59e0b' }}>{tratamientosPendientes.length}</span>
              </div>
            )}
            {todosCompletados && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: '#10b981' }}><strong>Estado:</strong></span>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <FiCheckCircle size={18} /> Todos completados
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {allCompleted && (
              <button onClick={onGenerarAlta} disabled={generandoAlta} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: generandoAlta ? 'wait' : 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: generandoAlta ? 0.7 : 1 }} onMouseEnter={(e) => { if (!generandoAlta) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)'; } }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)'; }}>
                <FiUserCheck size={18} /> {generandoAlta ? 'Generando...' : 'Generar Alta'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}