// components/Odontologia/Periodontograma/PeriodontogramaSeccion.jsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  FiSave, FiCheckCircle, FiAlertCircle, FiEdit, FiActivity, FiRefreshCw
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PerioTable from './PerioTable';
import PerioStats from './PerioStats';
import ToothModal from './ToothModal';

// Datos por defecto para cada diente
const DEFAULT_TOOTH = {
  movilidad: 0,
  implante: false,
  furcacion: 0,
  ausente: false,
  nota: '',
  sitios: {
    V: {
      mesial: { mg: 0, ps: 0, placa: false, sangrado: false },
      central: { mg: 0, ps: 0, placa: false, sangrado: false },
      distal: { mg: 0, ps: 0, placa: false, sangrado: false },
    },
    L: {
      mesial: { mg: 0, ps: 0, placa: false, sangrado: false },
      central: { mg: 0, ps: 0, placa: false, sangrado: false },
      distal: { mg: 0, ps: 0, placa: false, sangrado: false },
    },
  },
};

export default function PeriodontogramaSeccion({ 
  periodontoState = null, 
  onSave, 
  pacienteId = null,
  pacienteData = null
}) {
  const [teethData, setTeethData] = useState(periodontoState?.teeth || {});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCara, setActiveCara] = useState('V');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(periodontoState?.lastSavedAt || null);
  const [loading, setLoading] = useState(false);

  // ✅ Refs para auto-guardado
  const autoSaveTimeout = useRef(null);
  const autoSaveRef = useRef({ isSaving: false });

  // 🔥 INICIALIZAR CON DATOS REALES DEL PACIENTE
  const [patientInfo, setPatientInfo] = useState({
    id: pacienteId || '',
    apellidos: pacienteData?.last_name || '',
    nombre: pacienteData?.first_name || '',
    fechaNacimiento: pacienteData?.birth_date || '',
    fechaExamen: new Date().toISOString().slice(0, 10),
    clinico: 'Dr. Jefferson Cagua',
  });

  // 🔥 ACTUALIZAR CUANDO CAMBIEN LOS DATOS DEL PACIENTE
  useEffect(() => {
    if (pacienteData) {
      setPatientInfo(prev => ({
        ...prev,
        id: pacienteId || prev.id,
        apellidos: pacienteData.last_name || prev.apellidos,
        nombre: pacienteData.first_name || prev.nombre,
        fechaNacimiento: pacienteData.birth_date || prev.fechaNacimiento,
      }));
    }
  }, [pacienteData, pacienteId]);

  // 🔥 CARGAR PERIODONTOGRAMA GUARDADO AL MONTAR
  useEffect(() => {
    if (pacienteId) {
      loadPeriodontograma();
    }
  }, [pacienteId]);

  const loadPeriodontograma = async () => {
    if (!pacienteId) return;
    
    setLoading(true);
    try {
      console.log('📤 [Periodontograma] Cargando para paciente:', pacienteId);
      const res = await fetchWithAuth(`/api/odontologia/periodontogramas/patient/${pacienteId}`);
      const data = await res.json();
      
      if (res.ok && data.success && data.data) {
        console.log('✅ [Periodontograma] Cargado exitosamente');
        setTeethData(data.data.teeth || {});
        
        if (data.data.patient_info) {
          setPatientInfo(prev => ({
            ...prev,
            ...data.data.patient_info,
          }));
        }
        setLastSavedAt(data.data.last_saved_at);
      } else {
        console.log('ℹ️ [Periodontograma] No hay datos guardados, usando valores por defecto');
      }
    } catch (err) {
      console.error('❌ Error cargando periodontograma:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔥 FUNCIÓN DE GUARDADO (reutilizable para auto-save y manual)
  // ============================================================
  const savePeriodontograma = useCallback(async (silent = false) => {
    if (!pacienteId) {
      if (!silent) alert('No hay paciente seleccionado');
      return false;
    }

    // No guardar si no hay datos (opcional: puedes permitir guardar vacío)
    if (Object.keys(teethData).length === 0) {
      return false;
    }

    // Evitar guardados simultáneos
    if (autoSaveRef.current.isSaving) return false;

    autoSaveRef.current.isSaving = true;
    if (!silent) setSaving(true);

    try {
      const dataToSend = {
        patient_id: pacienteId,
        teeth: JSON.stringify(teethData),
        patient_info: JSON.stringify(patientInfo),
        notas: '',
      };

      console.log(`📤 [Periodontograma] ${silent ? 'Auto-guardando' : 'Guardando'} para paciente:`, pacienteId);

      const res = await fetchWithAuth('/api/odontologia/periodontogramas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el periodontograma');
      }

      const now = new Date().toISOString();
      setLastSavedAt(now);

      if (!silent) {
        setSaveMessage({ type: 'success', text: 'Periodontograma guardado correctamente' });
        setTimeout(() => setSaveMessage(null), 3000);
      }

      if (onSave) {
        onSave(data.data);
      }

      return true;
    } catch (err) {
      console.error('❌ Error guardando periodontograma:', err);
      if (!silent) {
        setSaveMessage({ type: 'error', text: err.message || 'Error al guardar' });
        setTimeout(() => setSaveMessage(null), 3000);
      }
      return false;
    } finally {
      autoSaveRef.current.isSaving = false;
      if (!silent) setSaving(false);
    }
  }, [pacienteId, teethData, patientInfo, onSave]);

  // ============================================================
  // 🔥 AUTO-GUARDADO (con debounce)
  // ============================================================
  const autoSave = useCallback(() => {
    if (!pacienteId) return;
    if (autoSaveRef.current.isSaving) return;
    if (Object.keys(teethData).length === 0) return;
    if (loading) return;

    // Limpiar timeout anterior
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Establecer nuevo timeout (1500ms de debounce)
    autoSaveTimeout.current = setTimeout(async () => {
      await savePeriodontograma(true);
    }, 1500);
  }, [pacienteId, teethData, loading]);

  // ✅ Disparar auto-guardado cuando cambien los datos
  useEffect(() => {
    if (pacienteId && !loading && Object.keys(teethData).length > 0) {
      autoSave();
    }

    // Limpiar timeout al desmontar
    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [teethData, pacienteId, loading]);

  // ============================================================
  // FUNCIONES DE MANIPULACIÓN DE DATOS
  // ============================================================
  const getToothData = (toothNumber) => {
    return teethData[toothNumber] || { ...DEFAULT_TOOTH };
  };

  const updateToothData = (toothNumber, newData) => {
    setTeethData(prev => ({
      ...prev,
      [toothNumber]: {
        ...prev[toothNumber],
        ...newData,
      },
    }));
  };

  const updateSiteData = (toothNumber, cara, posicion, field, value) => {
    setTeethData(prev => {
      const tooth = prev[toothNumber] || { ...DEFAULT_TOOTH };
      const sitios = tooth.sitios || { ...DEFAULT_TOOTH.sitios };
      const caraData = sitios[cara] || {};
      const posData = caraData[posicion] || { mg: 0, ps: 0, placa: false, sangrado: false };

      return {
        ...prev,
        [toothNumber]: {
          ...tooth,
          sitios: {
            ...sitios,
            [cara]: {
              ...caraData,
              [posicion]: {
                ...posData,
                [field]: value,
              },
            },
          },
        },
      };
    });
  };

  const openModal = (toothNumber) => {
    setSelectedTooth(toothNumber);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTooth(null);
  };

  const handleSaveTooth = (toothNumber, data) => {
    updateToothData(toothNumber, data);
    closeModal();
  };

  // ============================================================
  // HANDLE SAVE MANUAL (botón)
  // ============================================================
  const handleSave = async () => {
    await savePeriodontograma(false);
  };

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================
  const stats = useMemo(() => {
    let totalPresentes = 0;
    let totalAusentes = 0;
    let totalSangrado = 0;
    let totalPlaca = 0;
    let totalSitios = 0;
    let sumProfundidad = 0;
    let sumInsercion = 0;
    let sitiosProfundidad = 0;

    const allTeeth = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,
                      48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

    allTeeth.forEach(key => {
      const tooth = teethData[key];
      if (!tooth || tooth.ausente) {
        totalAusentes++;
        return;
      }
      totalPresentes++;

      const sitios = tooth.sitios || {};
      ['V', 'L'].forEach(cara => {
        const caraData = sitios[cara] || {};
        ['mesial', 'central', 'distal'].forEach(pos => {
          const sitio = caraData[pos] || {};
          if (sitio.ps !== undefined && sitio.ps !== null) {
            totalSitios++;
            sumProfundidad += sitio.ps || 0;
            sitiosProfundidad++;
            const nic = (sitio.mg || 0) + (sitio.ps || 0);
            sumInsercion += nic;
          }
          if (sitio.sangrado) totalSangrado++;
          if (sitio.placa) totalPlaca++;
        });
      });
    });

    const avgProfundidad = sitiosProfundidad > 0 ? sumProfundidad / sitiosProfundidad : 0;
    const avgInsercion = sitiosProfundidad > 0 ? sumInsercion / sitiosProfundidad : 0;
    const totalSitiosEvaluados = totalPresentes * 6;
    const bop = totalSitiosEvaluados > 0 ? (totalSangrado / totalSitiosEvaluados) * 100 : 0;
    const pi = totalSitiosEvaluados > 0 ? (totalPlaca / totalSitiosEvaluados) * 100 : 0;

    return {
      totalPresentes,
      totalAusentes,
      avgProfundidad: avgProfundidad.toFixed(1),
      avgInsercion: avgInsercion.toFixed(1),
      bop: bop.toFixed(0),
      pi: pi.toFixed(0),
    };
  }, [teethData]);

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <FiRefreshCw size={32} className="spin" style={{ color: '#94a3b8' }} />
        <p style={{ marginTop: '12px', color: '#64748b' }}>Cargando periodontograma...</p>
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

  return (
    <div className="odont-atender-section" style={{ background: '#ffffff', borderRadius: '12px' }}>
      {/* HEADER */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '5px 5px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '0',
        flexWrap: 'wrap',
        gap: '5px',
        background: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FiActivity size={20} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
            Periodontograma
          </h3>
          {lastSavedAt ? (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              color: '#22c55e',
              background: 'rgba(34, 197, 94, 0.1)',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <FiCheckCircle size={12} /> Guardado: {new Date(lastSavedAt).toLocaleString()}
            </span>
          ) : (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              color: '#f59e0b',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <FiEdit size={12} /> Sin guardar
            </span>
          )}
          {autoSaveRef.current.isSaving && (
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px',
              color: '#3b82f6',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <FiRefreshCw size={12} className="spin" /> Guardando...
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="hc-btn-primary" 
            onClick={handleSave}
            disabled={saving || autoSaveRef.current.isSaving}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: (saving || autoSaveRef.current.isSaving) ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              opacity: (saving || autoSaveRef.current.isSaving) ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!saving && !autoSaveRef.current.isSaving) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
            }}
          >
            <FiSave size={16} /> {saving || autoSaveRef.current.isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* Mensaje de guardado (solo para guardado manual) */}
      {saveMessage && (
        <div style={{ 
          padding: '10px 20px',
          background: saveMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          borderBottom: `2px solid ${saveMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: saveMessage.type === 'success' ? '#166534' : '#991b1b',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {saveMessage.type === 'success' ? <FiCheckCircle size={18} /> : <FiAlertCircle size={18} />}
          {saveMessage.text}
        </div>
      )}

      {/* BARRA DE ESTADO */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '16px', 
        padding: '10px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '13px',
        color: '#64748b',
        alignItems: 'center'
      }}>
        <span style={{ color: '#64748b' }}>
          <strong style={{ color: '#0f172a' }}>Dientes guardados:</strong> {Object.keys(teethData).length}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
          <strong style={{ color: '#0f172a' }}>Estado:</strong> 
          {autoSaveRef.current.isSaving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}>
              <FiRefreshCw size={14} className="spin" /> Guardando...
            </span>
          ) : lastSavedAt ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
              <FiCheckCircle size={14} /> Guardado
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
              <FiEdit size={14} /> En edición
            </span>
          )}
        </span>
      </div>

      <PerioStats stats={stats} />

      <div className="perio-cara-selector" style={{ 
        display: 'flex', 
        gap: '4px', 
        padding: '5px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          className={`perio-cara-btn ${activeCara === 'V' ? 'active' : ''}`}
          onClick={() => setActiveCara('V')}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeCara === 'V' ? 600 : 500,
            background: activeCara === 'V' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeCara === 'V' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Vestibular
        </button>
        <button
          className={`perio-cara-btn ${activeCara === 'L' ? 'active' : ''}`}
          onClick={() => setActiveCara('L')}
          style={{
            padding: '6px 16px',
            borderRadius: '6px',
            border: 'none',
            fontSize: '13px',
            fontWeight: activeCara === 'L' ? 600 : 500,
            background: activeCara === 'L' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
            color: activeCara === 'L' ? '#ffffff' : '#64748b',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Lingual / Palatino
        </button>
      </div>

      <div style={{ padding: '10px 0px' }}>
        <PerioTable
          teethData={teethData}
          activeCara={activeCara}
          onToothClick={openModal}
        />
      </div>

      {isModalOpen && selectedTooth !== null && (
        <ToothModal
          toothNumber={selectedTooth}
          toothData={getToothData(selectedTooth)}
          onSave={handleSaveTooth}
          onClose={closeModal}
        />
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