// components/Odontologia/Configuracion/ConfiguracionGeneral.jsx
import React, { useState, useEffect } from 'react';
import { FiSave, FiRefreshCw, FiAlertCircle } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

export default function ConfiguracionGeneral() {
  const [config, setConfig] = useState({
    duracionTurno: 30,
    intervaloInicio: 8,
    intervaloFin: 20,
    tiempoEntreCitas: 15,
    recordatorioHoras: 24,
    mostrarFinDeSemana: false,
    notificacionesEmail: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ============================================================
  // CARGAR CONFIGURACIÓN DESDE API
  // ============================================================
  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/odontologia/configuracion-general');
      if (!res.ok) throw new Error('Error al cargar configuración');
      const data = await res.json();
      if (data.success) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 20,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
      }
    } catch (err) {
      setError('Error al cargar la configuración');
      console.error('Error loading config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // ============================================================
  // GUARDAR CONFIGURACIÓN EN API
  // ============================================================
  const handleSubmit = async (e) => {
    e.preventDefault();
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

      const res = await fetchWithAuth('/api/odontologia/configuracion-general', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || 'Error al guardar la configuración');
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // REINICIAR CONFIGURACIÓN
  // ============================================================
  const handleReset = async () => {
    if (!window.confirm('¿Estás seguro de que quieres reiniciar la configuración a los valores por defecto?')) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/odontologia/configuracion-general/reset', {
        method: 'POST',
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al reiniciar');
      }
      
      const data = await res.json();
      if (data.success) {
        const configData = data.data;
        setConfig({
          duracionTurno: configData.duracion_turno || 30,
          intervaloInicio: configData.intervalo_inicio || 8,
          intervaloFin: configData.intervalo_fin || 20,
          tiempoEntreCitas: configData.tiempo_entre_citas || 15,
          recordatorioHoras: configData.recordatorio_horas || 24,
          mostrarFinDeSemana: configData.mostrar_fin_semana || false,
          notificacionesEmail: configData.notificaciones_email !== undefined ? configData.notificaciones_email : true,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err.message || 'Error al reiniciar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig({ ...config, [name]: type === 'checkbox' ? checked : value });
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>⚙️ Configuración General</h3>
          <p>Ajustes generales de la agenda odontológica</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            type="button" 
            className="odonto-btn-secondary" 
            onClick={loadConfig}
            disabled={loading}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button 
            type="button" 
            className="odonto-btn-danger" 
            onClick={handleReset}
            disabled={saving}
          >
            Reiniciar
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="odonto-alert error">
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="odonto-alert success">
          <span>✅ Configuración guardada correctamente</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="odonto-config-form">
        <div className="odonto-config-grid">
          <div className="odonto-form-group">
            <label>Duración de turno (minutos)</label>
            <input
              type="number"
              name="duracionTurno"
              value={config.duracionTurno}
              onChange={handleChange}
              min={5}
              step={5}
              required
            />
            <small className="odonto-form-help">Duración estándar de cada cita</small>
          </div>

          <div className="odonto-form-group">
            <label>Hora de inicio</label>
            <input
              type="number"
              name="intervaloInicio"
              value={config.intervaloInicio}
              onChange={handleChange}
              min={0}
              max={23}
              required
            />
            <small className="odonto-form-help">Hora de inicio de la jornada (0-23)</small>
          </div>

          <div className="odonto-form-group">
            <label>Hora de fin</label>
            <input
              type="number"
              name="intervaloFin"
              value={config.intervaloFin}
              onChange={handleChange}
              min={0}
              max={23}
              required
            />
            <small className="odonto-form-help">Hora de fin de la jornada (0-23)</small>
          </div>

          <div className="odonto-form-group">
            <label>Tiempo entre citas (minutos)</label>
            <input
              type="number"
              name="tiempoEntreCitas"
              value={config.tiempoEntreCitas}
              onChange={handleChange}
              min={0}
              step={5}
              required
            />
            <small className="odonto-form-help">Tiempo de descanso entre citas</small>
          </div>

          <div className="odonto-form-group">
            <label>Recordatorio (horas antes)</label>
            <input
              type="number"
              name="recordatorioHoras"
              value={config.recordatorioHoras}
              onChange={handleChange}
              min={1}
              step={1}
              required
            />
            <small className="odonto-form-help">Horas antes para enviar recordatorios</small>
          </div>
        </div>

        <div className="odonto-config-checkboxes">
          <div className="odonto-checkbox-group">
            <input
              type="checkbox"
              name="mostrarFinDeSemana"
              checked={config.mostrarFinDeSemana}
              onChange={handleChange}
              id="mostrarFinDeSemana"
            />
            <label htmlFor="mostrarFinDeSemana">Mostrar fines de semana en agenda</label>
          </div>

          <div className="odonto-checkbox-group">
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

        <div className="odonto-config-actions">
          <button type="submit" className="odonto-btn-primary" disabled={saving}>
            <FiSave size={16} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}