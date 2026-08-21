// components/Odontologia/Ortodoncia/OrtodonciaTratamiento.jsx
import React, { useState, useEffect } from 'react';
import {
  FiDollarSign,
  FiCalendar,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiInfo,
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

const selectOptions = ['Seleccionar', 'Fuerte', 'Moderado', 'Ligero'];

const styles = {
  container: {
    padding: '0',
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  input: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  select: {
    padding: '8px 32px 8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    appearance: 'none',
    cursor: 'pointer',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1.5px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '13px',
    fontFamily: 'inherit',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
  },
  marginTop: {
    marginTop: '12px',
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  },
  buttonPrimaryDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  message: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  messageSuccess: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
  messageError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
  },
  infoBox: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '8px',
  },
  infoLabel: {
    fontSize: '13px',
    color: '#065f46',
    fontWeight: 500,
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#065f46',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
};

export default function OrtodonciaTratamiento({ 
  form, 
  handleNestedChange, 
  pacienteId, 
  ortodonciaId,
  onPlanGenerado,
}) {
  const t = form.tratamiento || {};
  const [generating, setGenerating] = useState(false);
  const [generarError, setGenerarError] = useState(null);
  const [generarSuccess, setGenerarSuccess] = useState(false);
  const [planGenerado, setPlanGenerado] = useState(null);
  
  // Estado local para el monto mensual y total calculado
  const [montoMensual, setMontoMensual] = useState(t.monto_mensual || '');
  const [costoTotalCalculado, setCostoTotalCalculado] = useState(0);

  // ============================================================
  // CALCULAR COSTO TOTAL AUTOMÁTICAMENTE
  // ============================================================
  useEffect(() => {
    const tiempo = parseInt(t.tiempo_estimado) || 0;
    const monto = parseFloat(montoMensual) || 0;
    
    if (tiempo > 0 && monto > 0) {
      const total = tiempo * monto;
      setCostoTotalCalculado(total);
      
      // Actualizar el form con el costo total calculado
      handleNestedChange('tratamiento', 'costo_total', total);
      
      // También actualizar el resumen si existe
      if (form.resumen) {
        handleNestedChange('resumen', 'costo_total', total);
      }
    } else {
      setCostoTotalCalculado(0);
    }
  }, [t.tiempo_estimado, montoMensual]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleMontoMensualChange = (e) => {
    const value = e.target.value;
    setMontoMensual(value);
  };

  const selectField = (name, label, options = selectOptions) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <select
        style={styles.select}
        value={t[name] || ''}
        onChange={(e) => handleNestedChange('tratamiento', name, e.target.value)}
      >
        {options.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
    </div>
  );

  const inputField = (name, label, type = 'text') => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={t[name] || ''}
        onChange={(e) => handleNestedChange('tratamiento', name, e.target.value)}
      />
    </div>
  );

  const textareaField = (name, label, rows = 4) => (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>{label}</label>
      <textarea
        style={styles.textarea}
        value={t[name] || ''}
        onChange={(e) => handleNestedChange('tratamiento', name, e.target.value)}
        rows={rows}
      />
    </div>
  );

  // ============================================================
  // GENERAR PLAN DE PAGOS
  // ============================================================
  const generarPlanPagos = async () => {
    if (!pacienteId) {
      setGenerarError('No hay paciente seleccionado');
      return;
    }

    const fechaInicial = t.fecha_inicial;
    const tiempoEstimado = parseInt(t.tiempo_estimado) || 0;
    const descripcion = t.descripcion || '';
    const montoMensualNum = parseFloat(montoMensual) || 0;

    if (!fechaInicial) {
      setGenerarError('Debes seleccionar una fecha inicial');
      return;
    }

    if (!tiempoEstimado || tiempoEstimado <= 0) {
      setGenerarError('Debes ingresar el tiempo estimado en meses');
      return;
    }

    if (!montoMensualNum || montoMensualNum <= 0) {
      setGenerarError('Debes ingresar el monto mensual');
      return;
    }

    const montoTotal = tiempoEstimado * montoMensualNum;

    setGenerating(true);
    setGenerarError(null);
    setGenerarSuccess(false);

    try {
      const dataToSend = {
        paciente_id: pacienteId,
        ortodoncia_id: ortodonciaId || null,
        nombre: `Plan de Ortodoncia - ${new Date(fechaInicial).toLocaleDateString('es-ES')}`,
        descripcion: descripcion || 'Plan generado desde el tratamiento',
        monto_total: montoTotal,
        numero_cuotas: tiempoEstimado,
        monto_mensual: montoMensualNum,
        fecha_inicio: fechaInicial,
        tipo_cuota: 'fija',
        estado: 'activo',
      };

      const res = await fetchWithAuth('/api/odontologia/plan-pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al generar el plan de pagos');
      }

      setPlanGenerado(result.data);
      setGenerarSuccess(true);
      
      if (onPlanGenerado) {
        onPlanGenerado(result.data);
      }

      setTimeout(() => setGenerarSuccess(false), 5000);
    } catch (err) {
      console.error('❌ Error generando plan:', err);
      setGenerarError(err.message);
      setTimeout(() => setGenerarError(null), 5000);
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // FORMATEAR FECHA
  // ============================================================
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const tiempo = parseInt(t.tiempo_estimado) || 0;
  const monto = parseFloat(montoMensual) || 0;
  const total = tiempo * monto;

  return (
    <div style={styles.container}>
      <div style={styles.grid3}>
        {/* Fecha inicial */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Fecha inicial</label>
          <input
            style={styles.input}
            type="date"
            value={t.fecha_inicial || ''}
            onChange={(e) => handleNestedChange('tratamiento', 'fecha_inicial', e.target.value)}
          />
          {t.fecha_inicial && (
            <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {formatDate(t.fecha_inicial)}
            </span>
          )}
        </div>

        {/* Tiempo estimado (meses) */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Tiempo estimado (meses)</label>
          <input
            style={styles.input}
            type="number"
            min="1"
            value={t.tiempo_estimado || ''}
            onChange={(e) => handleNestedChange('tratamiento', 'tiempo_estimado', e.target.value)}
            placeholder="12"
          />
        </div>

        {/* Fecha final (calculada automáticamente) */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Fecha final</label>
          <input
            style={styles.input}
            type="date"
            value={t.fecha_final || ''}
            onChange={(e) => handleNestedChange('tratamiento', 'fecha_final', e.target.value)}
            placeholder="Se calcula automáticamente"
          />
          {t.fecha_inicial && tiempo > 0 && (
            <span style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
              {tiempo} meses después: {formatDate(new Date(new Date(t.fecha_inicial).setMonth(new Date(t.fecha_inicial).getMonth() + tiempo)))}
            </span>
          )}
        </div>
      </div>

      {/* Segunda fila - Tipo, Aparatos ortopédicos, Anclajes */}
      <div style={{ ...styles.grid3, marginTop: '12px' }}>
        {selectField('tipo', 'Tipo', ['Seleccionar', 'Ortopédico', 'Ortodóncico', 'Mixto'])}
        {inputField('aparatos_ortopedicos', 'Aparatos ortopédicos')}
        {selectField('anclaje_superior', 'Anclaje superior')}
      </div>

      <div style={{ ...styles.grid3, marginTop: '12px' }}>
        {selectField('anclaje_inferior', 'Anclaje inferior')}
        {inputField('aparatos', 'Aparatos')}
        {inputField('otros', 'Otros')}
      </div>

      {/* Técnica, Brackets, Tubos */}
      <div style={{ ...styles.grid3, marginTop: '12px' }}>
        {selectField('tecnica', 'Técnica', ['Seleccionar', 'Fija', 'Removible', 'Mixta'])}
        {selectField('brackets', 'Brackets', ['Seleccionar', 'Metálicos', 'Cerámicos', 'Autoligado'])}
        {inputField('tubos_adhesivos_sup', 'Tubos adhesivos sup.')}
      </div>

      <div style={{ ...styles.grid3, marginTop: '12px' }}>
        {inputField('tubos_adhesivos_inf', 'Tubos adhesivos inf.')}
        {inputField('banda_superior', 'Banda superior')}
        {inputField('banda_inferior', 'Banda inferior')}
      </div>

      <div style={{ ...styles.grid3, marginTop: '12px' }}>
        {inputField('tubos_soldados_sup', 'Tubos soldados sup.')}
        {inputField('tubos_soldados_inf', 'Tubos soldados inf.')}
        {inputField('extracciones', 'Extracciones')}
      </div>

      {/* Descripción */}
      <div style={styles.marginTop}>
        {textareaField('descripcion', 'Descripción del plan de tratamiento', 4)}
      </div>

      {/* ============================================================
          SECCIÓN DE MONTO MENSUAL Y COSTO TOTAL
          ============================================================ */}
      <div style={{ 
        ...styles.marginTop, 
        padding: '16px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FiDollarSign size={18} style={{ color: '#10b981' }} />
          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px' }}>
            Configuración Financiera
          </span>
          <span style={{ 
            fontSize: '11px', 
            color: '#94a3b8', 
            background: '#f1f5f9', 
            padding: '2px 10px', 
            borderRadius: '12px' 
          }}>
            El costo total se calcula automáticamente
          </span>
        </div>

        <div style={{ ...styles.grid3 }}>
          {/* Monto Mensual */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <FiDollarSign size={12} style={{ color: '#10b981' }} /> Monto Mensual ($)
            </label>
            <input
              style={{ ...styles.input, borderColor: monto > 0 ? '#10b981' : '#e2e8f0' }}
              type="number"
              step="0.01"
              min="0"
              value={montoMensual}
              onChange={handleMontoMensualChange}
              placeholder="0.00"
            />
            {monto > 0 && (
              <span style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                <FiCheckCircle size={12} style={{ marginRight: '4px' }} />
                Monto configurado
              </span>
            )}
          </div>

          {/* Tiempo estimado (mostrar) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <FiCalendar size={12} style={{ color: '#6366f1' }} /> Tiempo estimado
            </label>
            <div style={{ 
              padding: '8px 12px', 
              background: '#ffffff', 
              borderRadius: '6px',
              border: '1.5px solid #e2e8f0',
              fontSize: '13px',
              color: '#1e293b',
              fontWeight: 500,
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center',
            }}>
              {tiempo > 0 ? `${tiempo} meses` : 'No definido'}
            </div>
          </div>

          {/* Costo Total (calculado) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <FiDollarSign size={12} style={{ color: '#f59e0b' }} /> Costo Total ($)
            </label>
            <div style={{ 
              padding: '8px 12px', 
              background: total > 0 ? '#f0fdf4' : '#f8fafc', 
              borderRadius: '6px',
              border: `1.5px solid ${total > 0 ? '#10b981' : '#e2e8f0'}`,
              fontSize: '16px',
              color: total > 0 ? '#065f46' : '#94a3b8',
              fontWeight: 700,
              minHeight: '38px',
              display: 'flex',
              alignItems: 'center',
            }}>
              {total > 0 ? `$ ${total.toFixed(2)}` : '$ 0.00'}
            </div>
          </div>
        </div>

        {/* Resumen del cálculo */}
        {tiempo > 0 && monto > 0 && (
          <div style={styles.infoBox}>
            <div style={styles.summaryRow}>
              <span style={styles.infoLabel}>
                <FiInfo size={14} style={{ marginRight: '4px' }} />
                Resumen:
              </span>
              <span style={styles.infoValue}>
                ${monto.toFixed(2)} × {tiempo} meses = ${total.toFixed(2)}
              </span>
            </div>
            <span style={{ fontSize: '12px', color: '#065f46' }}>
              {tiempo} cuotas de ${monto.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* BOTÓN GENERAR PLAN DE PAGOS */}
      <div style={{ 
        ...styles.marginTop, 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px',
        flexWrap: 'wrap',
        paddingTop: '16px',
        borderTop: '1px solid #e2e8f0',
      }}>
        <button
          style={{
            ...styles.buttonPrimary,
            ...(!t.fecha_inicial || !t.tiempo_estimado || !montoMensual ? styles.buttonPrimaryDisabled : {}),
          }}
          onClick={generarPlanPagos}
          disabled={generating || !t.fecha_inicial || !t.tiempo_estimado || !montoMensual}
        >
          {generating ? (
            <><FiRefreshCw size={16} className="spin" /> Generando...</>
          ) : (
            <><FiDollarSign size={16} /> Generar Plan de Pagos</>
          )}
        </button>

        {planGenerado && (
          <span style={{ fontSize: '13px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FiCheckCircle size={16} /> Plan generado: {planGenerado.numero_cuotas} cuotas de ${parseFloat(planGenerado.monto_mensual).toFixed(2)}
          </span>
        )}

        {(!t.fecha_inicial || !t.tiempo_estimado || !montoMensual) && (
          <span style={{ fontSize: '12px', color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <FiAlertCircle size={14} /> 
            {!t.fecha_inicial && 'Falta fecha inicial '}
            {!t.tiempo_estimado && 'Falta tiempo estimado '}
            {!montoMensual && 'Falta monto mensual'}
          </span>
        )}
      </div>

      {/* Mensajes */}
      {generarError && (
        <div style={{ ...styles.message, ...styles.messageError }}>
          <FiAlertCircle size={16} /> {generarError}
        </div>
      )}
      {generarSuccess && (
        <div style={{ ...styles.message, ...styles.messageSuccess }}>
          <FiCheckCircle size={16} /> Plan de pagos generado exitosamente. Ve a la pestaña "Plan de Pagos" para cobrar.
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}