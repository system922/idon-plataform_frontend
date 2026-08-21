// components/Odontologia/HistoriaClinica.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { 
  FiArrowRight, FiClock, FiClipboard, FiEye, FiSave, FiX,
  FiUser, FiFileText, FiCalendar, FiHash, FiRefreshCw, FiPlus
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

// Importar componentes de historias
import {
  HistoriaList,
  HistoriaView,
  HistoriaForm,
  HistoriaConfirmModal
} from '.';

const HistoriaClinica = ({ paciente, onSave, historialPrevio = [] }) => {
  const [form, setForm] = useState({
    motivo_consulta: '',
    enfermedad_actual: '',
    tiempo_enfermedad: '',
    signos_sintomas: '',
    relato_cronologico: '',
    funciones_biologicas: '',
    antecedentes_familiares: '',
    antecedentes_personales: '',
    presion_alta: false,
    vih: false,
    presion_baja: false,
    diabetes: false,
    hepatitis: false,
    asma: false,
    gastritis: false,
    fuma: false,
    ulceras: false,
    comentario_adicional: '',
    enfermedades_sanguineas: '',
    problemas_cardiacos: '',
    otras_enfermedades: '',
    cepillado_diario: '',
    sangra_encias: '',
    hemorragias_extraccion: '',
    rechina_dientes: '',
    otras_molestias: '',
    alergias: '',
    operacion_reciente: '',
    medicacion_permanente: '',
    pa: '',
    fc: '',
    temperatura: '',
    fr: '',
    examen_extraoral: '',
    examen_intraoral: '',
    examenes_auxiliares: '',
    observaciones: '',
  });
  
  const [showHistorial, setShowHistorial] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historiasAPI, setHistoriasAPI] = useState([]);
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    historiaId: null,
    title: '',
    message: ''
  });

  // ============================================================
  // CARGAR HISTORIAS DESDE API
  // ============================================================
  const loadHistorias = async () => {
    if (!paciente?.id) return;
    
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/api/odontologia/historias-clinicas/paciente/${paciente.id}`);
      const data = await res.json();
      
      if (data.success && data.data) {
        setHistoriasAPI(data.data);
        // Actualizar historialPrevio si existe
        if (onSave) {
          // El padre se actualizará con los datos
        }
      }
    } catch (err) {
      console.error('Error cargando historias:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paciente?.id) {
      loadHistorias();
    }
  }, [paciente?.id]);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const dataToSend = {
        ...form,
        patient_id: paciente?.id,
        tipo: 'evaluacion_inicial',
        titulo: `Evaluación - ${new Date().toLocaleDateString()}`,
        fecha: new Date().toISOString().split('T')[0],
        datos: JSON.stringify({
          motivo_consulta: form.motivo_consulta,
          enfermedad_actual: form.enfermedad_actual,
          antecedentes: {
            familiares: form.antecedentes_familiares,
            personales: form.antecedentes_personales,
          }
        })
      };

      const res = await fetchWithAuth('/api/odontologia/historias-clinicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la historia');
      }

      // Recargar historias
      await loadHistorias();
      
      // Notificar al padre
      if (onSave) {
        onSave({
          ...form,
          saved_at: new Date().toISOString(),
          patient_id: paciente?.id,
          id: data.data?.id
        });
      }

      alert('Historia guardada correctamente');
      setShowForm(false);
      setEditMode(false);

    } catch (err) {
      console.error('Error guardando historia:', err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHistoria = async (id) => {
    try {
      const res = await fetchWithAuth(`/api/odontologia/historias-clinicas/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar la historia');
      }

      await loadHistorias();
      setSelectedHistoria(null);
      setConfirmModal({ isOpen: false, historiaId: null, title: '', message: '' });
      alert('Historia eliminada correctamente');

    } catch (err) {
      console.error('Error eliminando historia:', err);
      alert(err.message);
    }
  };

  const handleSelectHistoria = (historia) => {
    setSelectedHistoria(historia);
    setSelectedHistoryId(historia.id);
    setShowForm(false);
    setEditMode(false);
    
    // Cargar datos en el formulario
    if (historia.datos) {
      try {
        const datos = typeof historia.datos === 'string' ? JSON.parse(historia.datos) : historia.datos;
        setForm(prev => ({
          ...prev,
          motivo_consulta: datos.motivo_consulta || '',
          enfermedad_actual: datos.enfermedad_actual || '',
          antecedentes_familiares: datos.antecedentes?.familiares || '',
          antecedentes_personales: datos.antecedentes?.personales || '',
          observaciones: historia.observaciones || '',
        }));
      } catch (e) {
        console.warn('Error parseando datos:', e);
      }
    }
  };

  const handleNewHistoria = () => {
    setForm({
      motivo_consulta: '',
      enfermedad_actual: '',
      tiempo_enfermedad: '',
      signos_sintomas: '',
      relato_cronologico: '',
      funciones_biologicas: '',
      antecedentes_familiares: '',
      antecedentes_personales: '',
      presion_alta: false,
      vih: false,
      presion_baja: false,
      diabetes: false,
      hepatitis: false,
      asma: false,
      gastritis: false,
      fuma: false,
      ulceras: false,
      comentario_adicional: '',
      enfermedades_sanguineas: '',
      problemas_cardiacos: '',
      otras_enfermedades: '',
      cepillado_diario: '',
      sangra_encias: '',
      hemorragias_extraccion: '',
      rechina_dientes: '',
      otras_molestias: '',
      alergias: '',
      operacion_reciente: '',
      medicacion_permanente: '',
      pa: '',
      fc: '',
      temperatura: '',
      fr: '',
      examen_extraoral: '',
      examen_intraoral: '',
      examenes_auxiliares: '',
      observaciones: '',
    });
    setSelectedHistoria(null);
    setSelectedHistoryId(null);
    setShowForm(true);
    setEditMode(true);
    setShowHistorial(false);
  };

  const requestDelete = (historiaId, titulo) => {
    setConfirmModal({
      isOpen: true,
      historiaId: historiaId,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar la historia "${titulo}"? Esta acción no se puede deshacer.`
    });
  };

  const selectedHistory = useMemo(() => {
    if (!selectedHistoryId) return null;
    return historiasAPI.find((item) => item.id === selectedHistoryId) || null;
  }, [historiasAPI, selectedHistoryId]);

  const restoreRecord = (record) => {
    if (record?.datos) {
      try {
        const datos = typeof record.datos === 'string' ? JSON.parse(record.datos) : record.datos;
        setForm(prev => ({
          ...prev,
          motivo_consulta: datos.motivo_consulta || '',
          enfermedad_actual: datos.enfermedad_actual || '',
          antecedentes_familiares: datos.antecedentes?.familiares || '',
          antecedentes_personales: datos.antecedentes?.personales || '',
          observaciones: record.observaciones || '',
        }));
      } catch (e) {
        console.warn('Error parseando datos:', e);
      }
    }
    setSelectedHistoryId(record?.id || null);
    setShowHistorial(false);
  };

  return (
    <div className="hc-main-container" style={{ padding: '0' }}>
      {/* HEADER */}
      <div className="hc-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div className="hc-header-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiClipboard size={20} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Historia Clínica
          </h3>
          <span style={{ 
            fontSize: '12px', 
            background: '#e2e8f0', 
            padding: '2px 10px', 
            borderRadius: '12px',
            color: '#475569'
          }}>
            {historiasAPI.length} registros
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="hc-btn-secondary" 
            onClick={() => setShowHistorial(v => !v)}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiEye size={16} /> {showHistorial ? 'Ocultar' : 'Ver anteriores'}
          </button>
          <button 
            className="hc-btn-primary" 
            onClick={handleNewHistoria}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <FiPlus size={16} /> Nueva Historia
          </button>
          <button 
            className="hc-btn-secondary" 
            onClick={loadHistorias}
            disabled={loading}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* PACIENTE BANNER */}
      {paciente && (
        <div className="hc-patient-banner" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', display: 'block' }}>
                HC: {paciente.hc_number || 'Sin asignar'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b' }}>
            <span><FiClock size={14} style={{ marginRight: '4px' }} /> {historiasAPI.length} registros</span>
          </div>
        </div>
      )}

      {/* CONTENIDO PRINCIPAL - Panel dividido */}
      <div className="hc-panel" style={{ display: 'flex', gap: '16px', padding: '16px 20px', minHeight: '400px' }}>
        {/* Panel izquierdo - Lista de historias */}
        <div className="hc-panel-left" style={{ flex: '0 0 280px', maxHeight: '500px', overflowY: 'auto' }}>
          <HistoriaList
            historias={historiasAPI}
            selectedHistoriaId={selectedHistoryId}
            onSelectHistoria={handleSelectHistoria}
            onEditHistoria={(historia) => {
              setSelectedHistoria(historia);
              setSelectedHistoryId(historia.id);
              setEditMode(true);
              setShowForm(true);
              // Cargar datos
              if (historia.datos) {
                try {
                  const datos = typeof historia.datos === 'string' ? JSON.parse(historia.datos) : historia.datos;
                  setForm(prev => ({
                    ...prev,
                    motivo_consulta: datos.motivo_consulta || '',
                    enfermedad_actual: datos.enfermedad_actual || '',
                    antecedentes_familiares: datos.antecedentes?.familiares || '',
                    antecedentes_personales: datos.antecedentes?.personales || '',
                    observaciones: historia.observaciones || '',
                  }));
                } catch (e) {}
              }
            }}
            onDeleteHistoria={requestDelete}
            onNewHistoria={handleNewHistoria}
            loading={loading}
          />
        </div>

        {/* Panel derecho - Formulario o Vista */}
        <div className="hc-panel-right" style={{ flex: 1, minHeight: '300px' }}>
          {showForm ? (
            <HistoriaForm
              form={form}
              setForm={setForm}
              tipoSeleccionado={'evaluacion_inicial'}
              setTipoSeleccionado={() => {}}
              selectedHistoria={selectedHistoria}
              onSave={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditMode(false);
                if (selectedHistoria) {
                  setSelectedHistoryId(selectedHistoria.id);
                } else {
                  setForm({
                    motivo_consulta: '',
                    enfermedad_actual: '',
                    tiempo_enfermedad: '',
                    signos_sintomas: '',
                    relato_cronologico: '',
                    funciones_biologicas: '',
                    antecedentes_familiares: '',
                    antecedentes_personales: '',
                    presion_alta: false,
                    vih: false,
                    presion_baja: false,
                    diabetes: false,
                    hepatitis: false,
                    asma: false,
                    gastritis: false,
                    fuma: false,
                    ulceras: false,
                    comentario_adicional: '',
                    enfermedades_sanguineas: '',
                    problemas_cardiacos: '',
                    otras_enfermedades: '',
                    cepillado_diario: '',
                    sangra_encias: '',
                    hemorragias_extraccion: '',
                    rechina_dientes: '',
                    otras_molestias: '',
                    alergias: '',
                    operacion_reciente: '',
                    medicacion_permanente: '',
                    pa: '',
                    fc: '',
                    temperatura: '',
                    fr: '',
                    examen_extraoral: '',
                    examen_intraoral: '',
                    examenes_auxiliares: '',
                    observaciones: '',
                  });
                }
              }}
              saving={saving}
            />
          ) : (
            <HistoriaView
              historia={selectedHistory}
              historiasCount={historiasAPI.length}
              onNewHistoria={handleNewHistoria}
            />
          )}
        </div>
      </div>

      {/* CONFIRMAR ELIMINACIÓN */}
      <HistoriaConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, historiaId: null, title: '', message: '' })}
        onConfirm={() => handleDeleteHistoria(confirmModal.historiaId)}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default HistoriaClinica;