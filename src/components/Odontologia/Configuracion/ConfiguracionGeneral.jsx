// components/Odontologia/Configuracion/ConfiguracionGeneral.jsx
import React, { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiAlertCircle, FiClock, FiCalendar, FiPlus } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';

export default function ConfiguracionGeneral() {
  const [config, setConfig] = useState({
    duracionTurno: 30,
    intervaloInicio: 8,
    intervaloFin: 18,
    tiempoEntreCitas: 15,
    recordatorioHoras: 24,
    mostrarFinDeSemana: false,
    notificacionesEmail: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [previewHoras, setPreviewHoras] = useState([]);
  const [configExists, setConfigExists] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // ============================================================
  // CARGAR CONFIGURACIÓN DESDE API
  // ============================================================
  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/odontologia/configuracion-general');
      
      const data = await res.json();
      
      if (res.ok && data.success && data.data) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 18,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
        setConfigExists(true);
        generarPreviewHoras(configData.intervalo_inicio || 8, configData.intervalo_fin || 18);
      } else {
        // No hay configuración, mostrar valores por defecto
        setConfigExists(false);
        setConfig({
          duracionTurno: 30,
          intervaloInicio: 8,
          intervaloFin: 18,
          tiempoEntreCitas: 15,
          recordatorioHoras: 24,
          mostrarFinDeSemana: false,
          notificacionesEmail: true,
        });
        generarPreviewHoras(8, 18);
        setError(null); // Limpiar error si no hay configuración
      }
    } catch (err) {
      setError('Error al cargar la configuración');
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // GENERAR VISTA PREVIA DE HORAS
  // ============================================================
  const generarPreviewHoras = (inicio, fin) => {
    const horas = [];
    for (let h = inicio; h < fin; h++) {
      horas.push(`${h.toString().padStart(2, '0')}:00`);
      horas.push(`${h.toString().padStart(2, '0')}:30`);
    }
    horas.push(`${fin.toString().padStart(2, '0')}:00`);
    setPreviewHoras(horas);
  };

  // ============================================================
  // CREAR CONFIGURACIÓN
  // ============================================================
  const handleCreate = async () => {
    // Validaciones
    if (parseInt(config.intervaloInicio) >= parseInt(config.intervaloFin)) {
      setError('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);
    setIsCreating(true);

    try {
      const payload = {
        duracion_turno: parseInt(config.duracionTurno),
        intervalo_inicio: parseInt(config.intervaloInicio),
        intervalo_fin: parseInt(config.intervaloFin),
        tiempo_entre_citas: parseInt(config.tiempoEntreCitas),
        recordatorio_horas: parseInt(config.recordatorioHoras),
        mostrar_fin_semana: config.mostrarFinDeSemana,
        notificaciones_email: config.notificacionesEmail,
      };

      console.log('📤 Creando configuración:', payload);

      const res = await fetchWithAuth('/odontologia/configuracion-general', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al crear configuración');
      }
      
      if (data.success) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 18,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
        setConfigExists(true);
        generarPreviewHoras(configData.intervalo_inicio || 8, configData.intervalo_fin || 18);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        throw new Error(data.error || 'Error al crear la configuración');
      }
    } catch (err) {
      setError(err.message || 'Error al crear la configuración');
      console.error('Error creating config:', err);
    } finally {
      setSaving(false);
      setIsCreating(false);
    }
  };

  // ============================================================
  // ACTUALIZAR CONFIGURACIÓN
  // ============================================================
  const handleUpdate = async () => {
    // Validaciones
    if (parseInt(config.intervaloInicio) >= parseInt(config.intervaloFin)) {
      setError('La hora de inicio debe ser menor que la hora de fin');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = {
        duracion_turno: parseInt(config.duracionTurno),
        intervalo_inicio: parseInt(config.intervaloInicio),
        intervalo_fin: parseInt(config.intervaloFin),
        tiempo_entre_citas: parseInt(config.tiempoEntreCitas),
        recordatorio_horas: parseInt(config.recordatorioHoras),
        mostrar_fin_semana: config.mostrarFinDeSemana,
        notificaciones_email: config.notificacionesEmail,
      };

      console.log('📤 Actualizando configuración:', payload);

      const res = await fetchWithAuth('/odontologia/configuracion-general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al actualizar');
      }
      
      if (data.success) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 18,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
        generarPreviewHoras(configData.intervalo_inicio || 8, configData.intervalo_fin || 18);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      } else {
        throw new Error(data.error || 'Error al actualizar la configuración');
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar la configuración');
      console.error('Error updating config:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // GUARDAR CONFIGURACIÓN (decide si crear o actualizar)
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (configExists) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  // ============================================================
  // REINICIAR CONFIGURACIÓN
  // ============================================================
  const handleReset = async () => {
    if (!configExists) {
      setError('No hay configuración para reiniciar');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres reiniciar la configuración a los valores por defecto?')) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/odontologia/configuracion-general/reset', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Error al reiniciar');
      }
      
      if (data.success) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 18,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
        generarPreviewHoras(configData.intervalo_inicio || 8, configData.intervalo_fin || 18);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
    } catch (err) {
      setError(err.message || 'Error al reiniciar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setConfig({ ...config, [name]: newValue });
    
    // Si cambia el horario, actualizar vista previa
    if (name === 'intervaloInicio' || name === 'intervaloFin') {
      const inicio = name === 'intervaloInicio' ? parseInt(value) : config.intervaloInicio;
      const fin = name === 'intervaloFin' ? parseInt(value) : config.intervaloFin;
      if (!isNaN(inicio) && !isNaN(fin) && inicio < fin) {
        generarPreviewHoras(inicio, fin);
      }
    }
  };

  // ============================================================
  // EFECTO INICIAL
  // ============================================================
  useEffect(() => {
    loadConfig();
  }, []);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="spin" style={{ display: 'inline-block', marginBottom: '10px' }}>
            <FiRefreshCw size={24} />
          </div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>Configuración General</h3>
          <p>
            {configExists 
              ? 'Ajustes generales de la agenda odontológica' 
              : 'No hay configuración configurada. Crea una nueva configuración.'}
          </p>
          {!configExists && (
            <div style={{ 
              marginTop: '8px', 
              padding: '8px 12px', 
              background: '#fef3c7', 
              borderRadius: '6px',
              border: '1px solid #f59e0b',
              fontSize: '14px',
              color: '#92400e'
            }}>
              ⚠️ No existe configuración. Completa los campos y haz clic en "Crear Configuración".
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="odonto-btn-secondary" 
            onClick={loadConfig}
            disabled={loading || saving}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
            <span style={{ marginLeft: '5px' }}>Recargar</span>
          </button>
          {configExists && (
            <button 
              type="button" 
              className="odonto-btn-danger" 
              onClick={handleReset}
              disabled={saving}
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="odonto-alert error" style={{ marginBottom: '16px' }}>
          <FiAlertCircle size={16} />
          <span style={{ marginLeft: '8px' }}>{error}</span>
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}
      
      {success && (
        <div className="odonto-alert success" style={{ marginBottom: '16px' }}>
          <span>✅ {configExists ? 'Configuración actualizada' : 'Configuración creada'} correctamente</span>
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setSuccess(false)}
          >
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="odonto-config-form">
        <div className="odonto-config-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="odonto-form-group">
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
              Duración de turno (minutos)
            </label>
            <input
              type="number"
              name="duracionTurno"
              value={config.duracionTurno}
              onChange={handleChange}
              min={5}
              step={5}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <small className="odonto-form-help" style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Duración estándar de cada cita (mínimo 5 minutos)
            </small>
          </div>

          <div className="odonto-form-group">
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
              Hora de inicio
            </label>
            <input
              type="number"
              name="intervaloInicio"
              value={config.intervaloInicio}
              onChange={handleChange}
              min={0}
              max={23}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <small className="odonto-form-help" style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Hora de inicio de la jornada (0-23)
            </small>
          </div>

          <div className="odonto-form-group">
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
              Hora de fin
            </label>
            <input
              type="number"
              name="intervaloFin"
              value={config.intervaloFin}
              onChange={handleChange}
              min={0}
              max={23}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <small className="odonto-form-help" style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Hora de fin de la jornada (0-23)
            </small>
          </div>

          <div className="odonto-form-group">
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
              Tiempo entre citas (minutos)
            </label>
            <input
              type="number"
              name="tiempoEntreCitas"
              value={config.tiempoEntreCitas}
              onChange={handleChange}
              min={0}
              step={5}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <small className="odonto-form-help" style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Tiempo de descanso entre citas
            </small>
          </div>

          <div className="odonto-form-group">
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '5px' }}>
              Recordatorio (horas antes)
            </label>
            <input
              type="number"
              name="recordatorioHoras"
              value={config.recordatorioHoras}
              onChange={handleChange}
              min={1}
              step={1}
              required
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <small className="odonto-form-help" style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              Horas antes para enviar recordatorios (mínimo 1 hora)
            </small>
          </div>
        </div>

        <div className="odonto-config-checkboxes" style={{ marginTop: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div className="odonto-checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              name="mostrarFinDeSemana"
              checked={config.mostrarFinDeSemana}
              onChange={handleChange}
              id="mostrarFinDeSemana"
            />
            <label htmlFor="mostrarFinDeSemana">Mostrar fines de semana en agenda</label>
          </div>

          <div className="odonto-checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              name="notificacionesEmail"
              checked={config.notificacionesEmail}
              onChange={handleChange}
              id="notificacionesEmail"
            />
            <label htmlFor="notificacionesEmail">Enviar notificaciones por email</label>
          </div>
        </div>

        {/* Vista previa del horario */}
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: '#f3f4f6', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FiClock size={16} />
            <strong>Vista previa del horario:</strong>
            <span style={{ color: '#374151' }}>
              {config.intervaloInicio}:00 - {config.intervaloFin}:00
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '4px',
            maxHeight: '80px',
            overflow: 'auto'
          }}>
            {previewHoras.slice(0, 20).map(hora => (
              <span 
                key={hora} 
                style={{
                  padding: '2px 8px',
                  background: '#ffffff',
                  borderRadius: '4px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db'
                }}
              >
                {hora}
              </span>
            ))}
            {previewHoras.length > 20 && (
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                +{previewHoras.length - 20} más
              </span>
            )}
          </div>
          <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
            Total: {previewHoras.length} slots de 30 minutos
          </small>
        </div>

        <div className="odonto-config-actions" style={{ marginTop: '24px' }}>
          <button 
            type="submit" 
            className="odonto-btn-primary" 
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: configExists ? '#2563eb' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {configExists ? <FiSave size={16} /> : <FiPlus size={16} />}
            {saving 
              ? (configExists ? 'Actualizando...' : 'Creando...') 
              : (configExists ? 'Actualizar Configuración' : 'Crear Configuración')}
          </button>
          
          {!configExists && (
            <span style={{ marginLeft: '12px', fontSize: '14px', color: '#6b7280' }}>
              No existe configuración. Se creará una nueva.
            </span>
          )}
        </div>
      </form>

      {/* Información del ID de configuración */}
      <div style={{ 
        marginTop: '16px', 
        padding: '12px 16px', 
        background: '#f9fafb', 
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap'
      }}>
        <FiCalendar size={14} />
        <span>
          {configExists 
            ? 'Los cambios en el horario afectarán automáticamente la vista de la agenda.' 
            : 'Crea una configuración para poder gestionar la agenda odontológica.'}
        </span>
        {configExists && (
          <span style={{ 
            padding: '2px 8px', 
            background: '#dbeafe', 
            borderRadius: '4px',
            fontSize: '11px',
            color: '#1e40af'
          }}>
            Configuración activa
          </span>
        )}
      </div>
    </div>
  );
}