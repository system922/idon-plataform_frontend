// pages/business/Odontologia/OdontologiaAgenda.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiPlus, FiEdit, FiTrash2, FiX, FiSearch,
  FiCalendar, FiUserCheck, FiRefreshCw,
  FiVolume2, FiChevronLeft, FiChevronRight,
  FiAlertCircle, FiClock
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { 
  CitaModal, 
  CitaDetailModal,
  CitaStats
} from '../../../components/Odontologia/Citas/index';
import '../../../styles/Odontologia/index.css';

export default function OdontologiaAgenda() {
  const navigate = useNavigate();

  // ============================================================
  // ESTADOS
  // ============================================================
  const [citas, setCitas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    confirmed: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    no_show: 0,
  });

  const [especialistas, setEspecialistas] = useState([]);
  const [selectedEspecialista, setSelectedEspecialista] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showLlamadaModal, setShowLlamadaModal] = useState(false);
  const [pacienteLlamado, setPacienteLlamado] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);

  // Estado para verificación de disponibilidad
  const [verificandoDisponibilidad, setVerificandoDisponibilidad] = useState(false);
  const [showDisponibilidadModal, setShowDisponibilidadModal] = useState(false);
  const [mensajeDisponibilidad, setMensajeDisponibilidad] = useState(null);

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [Agenda] Cargando datos...');

      const espRes = await fetchWithAuth('/api/odontologia/especialistas');
      const espData = await espRes.json();
      
      if (espData.success && espData.data) {
        setEspecialistas(espData.data);
        if (espData.data.length > 0 && !selectedEspecialista) {
          setSelectedEspecialista(espData.data[0].id);
        }
      }

      const res = await fetchWithAuth('/api/odontologia/citas');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || `Error HTTP ${res.status}`);
      }

      let citasData = [];
      
      if (Array.isArray(data)) {
        citasData = data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        citasData = data.data;
      } else if (data.data && Array.isArray(data.data)) {
        citasData = data.data;
      } else {
        citasData = [];
      }
      
      setCitas(citasData);
      console.log(`✅ [Agenda] ${citasData.length} citas cargadas`);
      
      try {
        const statsRes = await fetchWithAuth('/api/odontologia/citas/stats');
        const statsData = await statsRes.json();
        
        let statsResult = { 
          total: 0, 
          scheduled: 0, 
          confirmed: 0, 
          in_progress: 0, 
          completed: 0, 
          cancelled: 0, 
          no_show: 0 
        };
        
        if (statsData.success && statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else if (statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else {
          statsResult = { ...statsResult, ...statsData };
        }
        
        if (statsResult.total === 0 && citasData.length > 0) {
          statsResult.total = citasData.length;
          statsResult.scheduled = citasData.filter(c => c.status === 'scheduled').length;
          statsResult.confirmed = citasData.filter(c => c.status === 'confirmed').length;
          statsResult.in_progress = citasData.filter(c => c.status === 'in_progress').length;
          statsResult.completed = citasData.filter(c => c.status === 'completed').length;
          statsResult.cancelled = citasData.filter(c => c.status === 'cancelled').length;
          statsResult.no_show = citasData.filter(c => c.status === 'no_show').length;
        }
        
        setStats(statsResult);
        console.log('📊 [Agenda] Estadísticas:', statsResult);
        
      } catch (statsErr) {
        console.warn('⚠️ [Agenda] Error cargando estadísticas, calculando manualmente');
        const total = citasData.length;
        const scheduled = citasData.filter(c => c.status === 'scheduled').length;
        const confirmed = citasData.filter(c => c.status === 'confirmed').length;
        const in_progress = citasData.filter(c => c.status === 'in_progress').length;
        const completed = citasData.filter(c => c.status === 'completed').length;
        const cancelled = citasData.filter(c => c.status === 'cancelled').length;
        const no_show = citasData.filter(c => c.status === 'no_show').length;
        setStats({ total, scheduled, confirmed, in_progress, completed, cancelled, no_show });
      }
      
    } catch (err) {
      console.error('❌ [Agenda] Error:', err);
      setError('Error al cargar los datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // VERIFICAR DISPONIBILIDAD AL HACER CLIC EN UN SLOT
  // ============================================================
  const verificarDisponibilidadSlot = async (fecha, hora) => {
    setVerificandoDisponibilidad(true);
    setShowDisponibilidadModal(false);
    setMensajeDisponibilidad(null);

    try {
      const [h, m] = hora.split(':').map(Number);
      const horaFinDate = new Date();
      horaFinDate.setHours(h, m + 30, 0, 0);
      const horaFin = horaFinDate.toTimeString().slice(0, 8);

      console.log('📡 [Agenda] Verificando disponibilidad:', { fecha, hora, horaFin });

      const res = await fetchWithAuth(
        `/api/odontologia/citas/especialistas-disponibles?fecha=${fecha}&hora_inicio=${hora}&hora_fin=${horaFin}`
      );
      const data = await res.json();
      
      console.log('📦 [Agenda] Especialistas disponibles:', data);

      if (data.success && data.data && data.data.length > 0) {
        setSelectedDate(fecha);
        setSelectedHour(hora);
        setSelectedCita(null);
        setShowModal(true);
        setError(null);
        setShowDisponibilidadModal(false);
      } else {
        const fechaObj = new Date(fecha + 'T' + hora + ':00');
        const fechaFormateada = fechaObj.toLocaleString('es-EC', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        setMensajeDisponibilidad({
          tipo: 'error',
          titulo: '⏰ No hay disponibilidad',
          mensaje: `No hay especialistas disponibles para el ${fechaFormateada}.`,
          detalles: 'Por favor, selecciona otra fecha u horario disponible.'
        });
        setShowDisponibilidadModal(true);
      }
    } catch (err) {
      console.error('❌ [Agenda] Error verificando disponibilidad:', err);
      setMensajeDisponibilidad({
        tipo: 'error',
        titulo: '❌ Error',
        mensaje: 'Error al verificar disponibilidad.',
        detalles: 'Intenta nuevamente o contacta al administrador.'
      });
      setShowDisponibilidadModal(true);
    } finally {
      setVerificandoDisponibilidad(false);
    }
  };

  // ============================================================
  // CALCULAR SEMANA - SIEMPRE DE LUNES A DOMINGO
  // ============================================================
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  const daysOfWeek = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  const horas = useMemo(() => {
    const hs = [];
    for (let h = 8; h <= 20; h++) {
      hs.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) hs.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return hs;
  }, []);

  // ============================================================
  // FILTRAR CITAS
  // ============================================================
  const filteredCitas = citas.filter(c => {
    const cDate = new Date(c.fecha);
    const isInWeek = cDate >= weekStart && cDate <= weekEnd;
    if (!isInWeek) return false;

    const matchEspecialista = !selectedEspecialista || c.especialista_id === selectedEspecialista;

    const nombrePaciente = c.paciente_nombre || '';
    const matchSearch = searchTerm === '' || 
      nombrePaciente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tratamiento_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.especialista_nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchEspecialista && matchSearch;
  });

  // ============================================================
  // HANDLERS - CRUD
  // ============================================================
  const handleSave = async (formData) => {
    setSaving(true);
    setError(null);
    try {
      let url, method;
      if (selectedCita) {
        url = `/api/odontologia/citas/${selectedCita.id}`;
        method = 'PUT';
        console.log(`✏️ [Agenda] PUT ${url}`);
      } else {
        url = '/api/odontologia/citas';
        method = 'POST';
        console.log(`📝 [Agenda] POST ${url}`);
      }

      console.log(`📤 [Agenda] ${method} ${url}`, formData);

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la cita');
      }

      await loadData();
      setShowModal(false);
      setSelectedCita(null);
      setSelectedDate(null);
      setSelectedHour(null);
      alert(data.message || 'Cita guardada correctamente');
      return data.data;
    } catch (err) {
      console.error('❌ [Agenda] Error guardando:', err);
      setError(err.message);
      alert(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (cita) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedCita(cita);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta cita? Esta acción no se puede deshacer.')) return;

    try {
      console.log(`🗑️ [Agenda] DELETE /api/odontologia/citas/${id}`);
      const res = await fetchWithAuth(`/api/odontologia/citas/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar la cita');
      }

      await loadData();
      alert('Cita eliminada correctamente');
      return { success: true };
    } catch (err) {
      console.error('❌ [Agenda] Error eliminando:', err);
      alert(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleView = (cita) => {
    setSelectedCita(cita);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCita(null);
    setSelectedDate(null);
    setSelectedHour(null);
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedCita(null);
  };

  // ============================================================
  // ACCIONES DE CITA - IGUAL QUE EN LA VERSIÓN CON MOCK
  // ============================================================
  
  const updateStatus = (id, newStatus) => {
    // Actualizar estado local
    setCitas(prevCitas => prevCitas.map(c => 
      c.id === id ? { ...c, status: newStatus } : c
    ));
    
    // Llamar a la API en segundo plano
    fetchWithAuth(`/api/odontologia/citas/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        console.error('Error actualizando estado en API:', data.error);
        // Revertir si falla
        loadData();
      }
    })
    .catch(err => {
      console.error('Error en PATCH status:', err);
      loadData();
    });
  };

  // ============================================================
  // HANDLE ATENDER - IGUAL QUE EN LA VERSIÓN CON MOCK
  // ============================================================
  const handleAtender = (cita) => {
    if (!cita || !cita.id) {
      alert('Error: Cita no válida');
      console.error('❌ [Agenda] Cita no válida:', cita);
      return;
    }

    console.log('📋 [Agenda] Atendiendo cita:', cita.id, cita.paciente_nombre);

    // Si la cita está confirmada o programada, cambiar a "en curso" (igual que en mock)
    if (cita.status === 'confirmed' || cita.status === 'scheduled') {
      updateStatus(cita.id, 'in_progress');
      // Navegar a la página de atención (igual que en mock)
      navigate(`/app/odontologia/atencion/${cita.id}`);
    } else {
      // Si ya está en curso o tiene otro estado, navegar directamente
      navigate(`/app/odontologia/atencion/${cita.id}`);
    }
  };

  // Función para llamar
  const handleLlamar = (cita) => {
    const nombre = cita.paciente_nombre || 'Paciente';
    setPacienteLlamado({ nombre });
    setShowLlamadaModal(true);
    const mensaje = `Siguiente paciente ${nombre}, pase por favor`;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(mensaje);
      utterance.lang = 'es-ES';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      setTimeout(() => window.speechSynthesis.speak(utterance), 3000);
    }
    setTimeout(() => {
      setShowLlamadaModal(false);
      setPacienteLlamado(null);
    }, 6000);
  };

  // ============================================================
  // FUNCIONES DE RENDER
  // ============================================================
  const getStatusColor = (status) => {
    const map = {
      scheduled: '#facc15',
      confirmed: '#4ade80',
      in_progress: '#3b82f6',
      completed: '#9ca3af',
      cancelled: '#ef4444',
      no_show: '#f59e0b'
    };
    return map[status] || '#9ca3af';
  };

  const getStatusLabel = (status) => {
    const map = {
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No asistió'
    };
    return map[status] || status;
  };

  const getCitasForSlot = (day, hora) => {
    const [h, m] = hora.split(':').map(Number);
    const slotTime = new Date(day);
    slotTime.setHours(h, m, 0, 0);
    const slotEnd = new Date(slotTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return filteredCitas.filter(c => {
      const cDate = new Date(c.fecha);
      const cHora = c.hora_inicio ? c.hora_inicio.split(':').map(Number) : [0, 0];
      const cDateStart = new Date(c.fecha);
      cDateStart.setHours(cHora[0] || 0, cHora[1] || 0, 0, 0);
      
      const duracion = c.duracion || 30;
      const cDateEnd = new Date(cDateStart);
      cDateEnd.setMinutes(cDateEnd.getMinutes() + duracion);
      
      return (cDateStart >= slotTime && cDateStart < slotEnd) ||
             (cDateStart < slotTime && cDateEnd > slotTime);
    });
  };

  const renderCitaBlock = (cita) => {
    const nombre = cita.paciente_nombre || '—';
    const trat = cita.tratamiento_nombre || '—';
    const color = getStatusColor(cita.status);
    const isLlamando = showLlamadaModal && pacienteLlamado?.nombre === nombre;

    return (
      <div
        key={cita.id}
        className="odonto-agenda-cita"
        style={{
          background: color + '22',
          borderLeft: `4px solid ${color}`,
          padding: '6px 8px',
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 4,
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        onClick={(e) => { e.stopPropagation(); handleView(cita); }}
        title={`${nombre} - ${trat} (${getStatusLabel(cita.status)})`}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 600,
          color: '#0f172a',
          fontSize: 13,
        }}>
          <span style={{ color: '#1e293b', fontWeight: 700, letterSpacing: '0.3px' }}>
            {nombre}
          </span>
          <span 
            style={{ 
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: color,
              flexShrink: 0,
              marginLeft: 6,
              border: '2px solid rgba(255,255,255,0.6)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: '#475569', fontWeight: 400, marginTop: 1 }}>
          {trat}
        </div>

        <div style={{ display: 'flex', gap: 4, marginTop: 4, justifyContent: 'space-between' }}>
          {cita.status !== 'completed' && cita.status !== 'cancelled' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleLlamar(cita); }}
                className="odonto-btn-icon"
                style={{ 
                  flex: 1,
                  background: isLlamando ? '#4ade80' : 'rgba(0,0,0,0.04)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  minWidth: '32px',
                  height: '32px',
                  color: isLlamando ? '#fff' : '#475569',
                }}
                title="Llamar"
              >
                <FiVolume2 size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleAtender(cita); }}
                className="odonto-btn-icon"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  background: 'rgba(0,0,0,0.04)',
                  minWidth: '32px',
                  height: '32px',
                  color: '#475569',
                }}
                title="Atender"
              >
                <FiUserCheck size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(cita); }}
                className="odonto-btn-icon"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  background: 'rgba(0,0,0,0.04)',
                  minWidth: '32px',
                  height: '32px',
                  color: '#475569',
                }}
                title="Editar"
              >
                <FiEdit size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(cita.id); }}
                className="odonto-btn-icon"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: 4,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  background: 'rgba(0,0,0,0.04)',
                  minWidth: '32px',
                  height: '32px',
                  color: '#ef4444',
                }}
                title="Eliminar"
              >
                <FiTrash2 size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const goPrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplateOdontologia
      title="Agenda Odontológica"
      subtitle="Agenda semanal de citas"
      loading={loading}
      icon={<FiCalendar size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar paciente o tratamiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="odonto-search-clear"
                onClick={() => setSearchTerm('')}
                type="button"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          
          <button 
            className="odonto-btn-primary" 
            onClick={() => {
              setSelectedCita(null);
              setSelectedDate(null);
              setSelectedHour(null);
              setShowModal(true);
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nueva Cita
          </button>
          
          <button 
            className="odonto-btn-secondary" 
            onClick={loadData} 
            title="Recargar" 
            disabled={loading}
          >
            <FiRefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      }
    >
      {error && (
        <div className="odonto-alert error" style={{ marginBottom: 16 }}>
          <span>❌ {error}</span>
        </div>
      )}

      {verificandoDisponibilidad && (
        <div className="odonto-alert info" style={{ 
          marginBottom: 16, 
          padding: '12px 16px', 
          borderRadius: 8, 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
          <span>Verificando disponibilidad de especialistas...</span>
        </div>
      )}

      <CitaStats stats={stats} citas={citas} />

      {/* Filtros y navegación */}
      <div className="odonto-filters-row">
        <div className="odonto-filter-group">
          <label>Especialista:</label>
          <select 
            className="odonto-filter-select"
            value={selectedEspecialista}
            onChange={(e) => setSelectedEspecialista(e.target.value)}
          >
            {especialistas.map(e => (
              <option key={e.id} value={e.id}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="odonto-agenda-nav">
          <button onClick={goPrevWeek} className="odonto-btn-icon">
            <FiChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="odonto-btn-secondary" style={{ fontSize: '13px', padding: '4px 12px' }}>
            Hoy
          </button>
          <button onClick={goNextWeek} className="odonto-btn-icon">
            <FiChevronRight size={18} />
          </button>
          <span className="odonto-agenda-week-label">
            {weekStart.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })} - {weekEnd.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredCitas.length} de {citas.length} citas</span>
        </div>
      </div>

      {/* AGENDA */}
      <div className="odonto-agenda-container">
        <div className="odonto-agenda-grid">
          <div className="odonto-agenda-header odonto-agenda-corner"></div>
          
          {daysOfWeek.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
            return (
              <div key={idx} className={`odonto-agenda-header ${isToday ? 'today' : ''}`}>
                <div className="day-name">{dayNames[idx]}</div>
                <div className="day-number">{day.getDate()}</div>
              </div>
            );
          })}

          {horas.map((hora) => (
            <React.Fragment key={hora}>
              <div className="odonto-agenda-hour">{hora}</div>
              {daysOfWeek.map((day, colIdx) => {
                const citasEnSlot = getCitasForSlot(day, hora);
                const hayCitas = citasEnSlot.length > 0;
                
                return (
                  <div
                    key={colIdx}
                    className="odonto-agenda-slot"
                    onClick={() => {
                      if (hayCitas) {
                        const fechaFormateada = new Date(day).toLocaleDateString('es-EC', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long'
                        });
                        setMensajeDisponibilidad({
                          tipo: 'error',
                          titulo: '⚠️ Horario ocupado',
                          mensaje: `Este horario (${hora}) ya tiene una cita asignada.`,
                          detalles: `Fecha: ${fechaFormateada}`
                        });
                        setShowDisponibilidadModal(true);
                        return;
                      }

                      const year = day.getFullYear();
                      const month = String(day.getMonth() + 1).padStart(2, '0');
                      const dayNum = String(day.getDate()).padStart(2, '0');
                      const fechaStr = `${year}-${month}-${dayNum}`;
                      
                      console.log('📅 [Agenda] Slot clickeado:', { 
                        fecha: fechaStr, 
                        hora: hora,
                        day: day.toISOString()
                      });
                      
                      verificarDisponibilidadSlot(fechaStr, hora);
                    }}
                    style={{
                      cursor: hayCitas ? 'not-allowed' : 'pointer',
                      opacity: hayCitas ? 0.6 : 1
                    }}
                  >
                    {citasEnSlot.map(c => renderCitaBlock(c))}
                    {!hayCitas && (
                      <div style={{ 
                        fontSize: '10px', 
                        color: '#94a3b8',
                        textAlign: 'center',
                        padding: '4px 0',
                        opacity: 0.5
                      }}>
                        Disponible
                      </div>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Modal de formulario */}
      <CitaModal
        isOpen={showModal}
        onClose={closeModal}
        cita={selectedCita}
        onSave={handleSave}
        loading={saving}
        selectedDate={selectedDate}
        selectedHour={selectedHour}
        especialistas={especialistas}
      />

      {/* Modal de detalle */}
      <CitaDetailModal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        cita={selectedCita}
        onEdit={handleEdit}
        onAtender={handleAtender}
        onLlamar={handleLlamar}
        onStatusChange={updateStatus}
        onDelete={handleDelete}
      />

      {/* Modal de disponibilidad - VENTANA EMERGENTE */}
      {showDisponibilidadModal && mensajeDisponibilidad && (
        <div className="odonto-modal-overlay" onClick={() => setShowDisponibilidadModal(false)}>
          <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="odonto-modal-header" style={{ 
              borderBottom: 'none', 
              padding: '20px 24px 0',
              background: mensajeDisponibilidad.tipo === 'error' ? '#fef2f2' : '#eff6ff'
            }}>
              <button className="odonto-modal-close" onClick={() => setShowDisponibilidadModal(false)}>
                <FiX size={24} />
              </button>
            </div>
            <div className="odonto-modal-body" style={{ 
              padding: '20px 24px 24px',
              textAlign: 'center',
              background: mensajeDisponibilidad.tipo === 'error' ? '#fef2f2' : '#eff6ff'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                {mensajeDisponibilidad.tipo === 'error' ? '⏰' : 'ℹ️'}
              </div>
              <h3 style={{ 
                color: mensajeDisponibilidad.tipo === 'error' ? '#991b1b' : '#1e40af',
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8
              }}>
                {mensajeDisponibilidad.titulo}
              </h3>
              <p style={{ 
                color: mensajeDisponibilidad.tipo === 'error' ? '#7f1d1d' : '#1e3a5f',
                fontSize: 16,
                marginBottom: 8
              }}>
                {mensajeDisponibilidad.mensaje}
              </p>
              {mensajeDisponibilidad.detalles && (
                <p style={{ 
                  color: mensajeDisponibilidad.tipo === 'error' ? '#991b1b' : '#1e40af',
                  fontSize: 14,
                  opacity: 0.8,
                  marginBottom: 16
                }}>
                  {mensajeDisponibilidad.detalles}
                </p>
              )}
              <button 
                className="odonto-btn-primary"
                onClick={() => setShowDisponibilidadModal(false)}
                style={{
                  background: mensajeDisponibilidad.tipo === 'error' ? '#dc2626' : '#2563eb',
                  padding: '10px 32px',
                  borderRadius: 8,
                  border: 'none',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(0.98)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de llamada - Estilos modernos para odontología */}
      {showLlamadaModal && pacienteLlamado && (
        <div className="odonto-modal-overlay" onClick={() => setShowLlamadaModal(false)}>
          <div 
            className="odonto-modal odonto-modal-llamada" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              maxWidth: 420,
              background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
              border: '1px solid rgba(74, 222, 128, 0.15)',
              boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(74, 222, 128, 0.05)',
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Fondo decorativo */}
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-30%',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-40%',
              left: '-20%',
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 70%)',
              borderRadius: '50%',
              pointerEvents: 'none'
            }} />

            {/* Header con onda sonora animada */}
            <div className="odonto-modal-header" style={{ 
              borderBottom: 'none', 
              padding: '24px 24px 0',
              background: 'transparent',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '16px',
                width: '100%'
              }}>
                {/* Animación de ondas de sonido */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#4ade80',
                    borderRadius: '2px',
                    animation: 'ondasSonido 1.2s ease-in-out infinite',
                    animationDelay: '0s'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '32px',
                    background: '#4ade80',
                    borderRadius: '2px',
                    animation: 'ondasSonido 1.2s ease-in-out infinite',
                    animationDelay: '0.2s'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '44px',
                    background: '#4ade80',
                    borderRadius: '2px',
                    animation: 'ondasSonido 1.2s ease-in-out infinite',
                    animationDelay: '0.4s'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '32px',
                    background: '#4ade80',
                    borderRadius: '2px',
                    animation: 'ondasSonido 1.2s ease-in-out infinite',
                    animationDelay: '0.6s'
                  }} />
                  <div style={{
                    width: '4px',
                    height: '20px',
                    background: '#4ade80',
                    borderRadius: '2px',
                    animation: 'ondasSonido 1.2s ease-in-out infinite',
                    animationDelay: '0.8s'
                  }} />
                </div>
                
                <span style={{ 
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#ffffff',
                  letterSpacing: '0.5px'
                }}>
                  Llamando paciente
                </span>
                
                <button 
                  className="odonto-modal-close" 
                  onClick={() => setShowLlamadaModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50%',
                    padding: '8px',
                    marginLeft: 'auto'
                  }}
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="odonto-modal-body" style={{ 
              textAlign: 'center', 
              padding: '20px 24px 28px',
              background: 'transparent',
              position: 'relative',
              zIndex: 1
            }}>
              {/* Subtítulo */}
              <p style={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '13px', 
                margin: '0 0 4px 0',
                fontWeight: '500',
                letterSpacing: '2px',
                textTransform: 'uppercase'
              }}>
                Siguiente paciente
              </p>

              {/* Nombre del paciente */}
              <div style={{
                margin: '8px 0 16px 0',
                padding: '8px 16px',
                background: 'rgba(74, 222, 128, 0.06)',
                borderRadius: '12px',
                border: '1px solid rgba(74, 222, 128, 0.08)',
                display: 'inline-block'
              }}>
                <p style={{ 
                  color: '#4ade80', 
                  fontSize: '32px', 
                  fontWeight: '700', 
                  margin: '0',
                  letterSpacing: '-0.5px',
                  textShadow: '0 0 30px rgba(74, 222, 128, 0.1)'
                }}>
                  {pacienteLlamado.nombre}
                </p>
              </div>

              {/* Mensaje */}
              <p style={{ 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: '16px', 
                margin: '0 0 16px 0',
                fontWeight: '400'
              }}>
                por favor, acérquese a la consulta
              </p>

              {/* Badge de estado con animación */}
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px',
                padding: '6px 16px',
                background: 'rgba(74, 222, 128, 0.06)',
                borderRadius: '20px',
                border: '1px solid rgba(74, 222, 128, 0.08)'
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#4ade80',
                  animation: 'pulsoLlamada 1.5s ease-in-out infinite'
                }} />
                <span style={{ 
                  fontSize: '12px', 
                  color: '#4ade80',
                  fontWeight: '500',
                  letterSpacing: '0.5px'
                }}>
                  LLAMANDO EN CURSO
                </span>
              </div>

              {/* Botones */}
              <div style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <button 
                  className="odonto-btn-primary"
                  onClick={() => setShowLlamadaModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #4ade80, #22c55e)',
                    border: 'none',
                    padding: '10px 28px',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 16px rgba(74, 222, 128, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 24px rgba(74, 222, 128, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(74, 222, 128, 0.2)';
                  }}
                >
                  <span>✓</span> Confirmar
                </button>
                <button 
                  className="odonto-btn-secondary"
                  onClick={() => setShowLlamadaModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTemplateOdontologia>
  );
}