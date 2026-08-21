// src/pages/business/OdontologiaAgenda.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../../components/PageTemplate';
import {
  FiPlus, FiEdit, FiTrash2, FiCheck, FiX, FiSearch,
  FiCalendar, FiClock, FiUser, FiTool, FiRefreshCw,
  FiUserCheck, FiVolume2, FiXCircle, FiChevronLeft, FiChevronRight,
  FiSettings, 
} from 'react-icons/fi';
import CitaFormModal from '../../../components/Odontologia/CitaFormModal';
import ConfiguracionAgenda from '../../../components/Odontologia/ConfiguracionAgenda';
import '../../../styles/Odontologia/Agenda.css';

// ============================================================
// DATOS MOCK
// ============================================================
const mockPacientes = [
  { id: '1', first_name: 'Jhonny', last_name: 'Cruzatty' },
  { id: '2', first_name: 'Carlos', last_name: 'Pérez' },
  { id: '3', first_name: 'Ana', last_name: 'Rodríguez' },
  { id: '4', first_name: 'Romeo', last_name: 'Prueba' },
  { id: '5', first_name: 'Homero', last_name: 'Prueba' },
];
const mockTratamientos = [
  { id: '1', name: 'Limpieza dental' },
  { id: '2', name: 'Endodoncia' },
  { id: '3', name: 'Ortodoncia' },
  { id: '4', name: 'Consulta general' },
];
const mockOdontologos = [
  { id: '1', name: 'Dr. Juan Torres' },
  { id: '2', name: 'Dra. Laura Silva' },
];

const getMockCitas = () => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lunes
  return [
    { id: 'c1', patient_id: '1', treatment_id: '1', odontologo_id: '1', scheduled_for: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 9, 0).toISOString(), duration_minutes: 30, status: 'scheduled', notes: '' },
    { id: 'c2', patient_id: '2', treatment_id: '2', odontologo_id: '2', scheduled_for: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 1, 10, 0).toISOString(), duration_minutes: 60, status: 'confirmed', notes: '' },
    { id: 'c3', patient_id: '3', treatment_id: '3', odontologo_id: '1', scheduled_for: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 2, 11, 30).toISOString(), duration_minutes: 45, status: 'in_progress', notes: '' },
    { id: 'c4', patient_id: '4', treatment_id: '4', odontologo_id: '1', scheduled_for: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 0, 14, 0).toISOString(), duration_minutes: 30, status: 'scheduled', notes: '' },
    { id: 'c5', patient_id: '5', treatment_id: '1', odontologo_id: '2', scheduled_for: new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 3, 9, 30).toISOString(), duration_minutes: 30, status: 'confirmed', notes: '' },
  ];
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontologiaAgenda() {
  const navigate = useNavigate();

  // Estados de datos
  const [citas, setCitas] = useState([]);
  const [pacientes, setPacientes] = useState(mockPacientes);
  const [tratamientos, setTratamientos] = useState(mockTratamientos);
  const [odontologos, setOdontologos] = useState(mockOdontologos);
  const [loading, setLoading] = useState(false);

  // Estados de UI
  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showLlamadaModal, setShowLlamadaModal] = useState(false);
  const [pacienteLlamado, setPacienteLlamado] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Navegación de semana
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calcular semana
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay() + 1);
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

  const hours = useMemo(() => {
    const hs = [];
    for (let h = 8; h <= 20; h++) {
      hs.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) hs.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return hs;
  }, []);

  // Cargar datos
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setCitas(getMockCitas());
      setPacientes(mockPacientes);
      setTratamientos(mockTratamientos);
      setOdontologos(mockOdontologos);
      setLoading(false);
    }, 300);
  }, []);

  // Filtro de búsqueda
  const filteredCitas = useMemo(() => {
    if (!search.trim()) return citas;
    return citas.filter(c => {
      const p = pacientes.find(p => p.id === c.patient_id);
      const t = tratamientos.find(t => t.id === c.treatment_id);
      const nombre = p ? `${p.first_name} ${p.last_name}` : '';
      const trat = t?.name || '';
      return nombre.toLowerCase().includes(search.toLowerCase()) ||
             trat.toLowerCase().includes(search.toLowerCase());
    });
  }, [citas, search, pacientes, tratamientos]);

  // Estadísticas
  const total = citas.length;
  const programadas = citas.filter(c => c.status === 'scheduled').length;
  const confirmadas = citas.filter(c => c.status === 'confirmed').length;
  const completadas = citas.filter(c => c.status === 'completed').length;

  const statsData = [
    { label: 'Total citas', value: total, icon: <FiCalendar size={24} />, color: 'citas' },
    { label: 'Programadas', value: programadas, icon: <FiClock size={24} />, color: 'pacientes' },
    { label: 'Confirmadas', value: confirmadas, icon: <FiCheck size={24} />, color: 'tratamientos' },
    { label: 'Completadas', value: completadas, icon: <FiTool size={24} />, color: 'recetas' },
  ];

  // Acciones CRUD
  const handleSaveCita = (formData) => {
    if (editData) {
      setCitas(citas.map(c => c.id === editData.id ? { ...c, ...formData } : c));
    } else {
      setCitas([...citas, { ...formData, id: 'c' + Date.now() }]);
    }
    setShowFormModal(false);
    setEditData(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Eliminar esta cita?')) return;
    setCitas(citas.filter(c => c.id !== id));
  };

  const updateStatus = (id, newStatus) => {
    setCitas(citas.map(c => c.id === id ? { ...c, status: newStatus } : c));
    if (newStatus === 'in_progress') {
      navigate(`/app/odontologia/atencion/${id}`);
    }
  };

  // Llamar paciente (voz)
  const handleLlamar = (cita) => {
    const paciente = pacientes.find(p => p.id === cita.patient_id);
    if (paciente) {
      setPacienteLlamado(paciente);
      setShowLlamadaModal(true);
      const mensaje = `Siguiente paciente ${paciente.first_name} ${paciente.last_name}, pase por favor`;
      if ('speechSynthesis' in window) {
        const speak = (text) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.rate = 0.9;
          utterance.pitch = 1;
          window.speechSynthesis.speak(utterance);
        };
        speak(mensaje);
        setTimeout(() => speak(mensaje), 3000);
      }
      setTimeout(() => {
        setShowLlamadaModal(false);
        setPacienteLlamado(null);
      }, 6000);
    }
  };

  const handleAtender = (cita) => {
    if (cita.status === 'confirmed' || cita.status === 'scheduled') {
      updateStatus(cita.id, 'in_progress');
    } else {
      navigate(`/app/odontologia/atencion/${cita.id}`);
    }
  };

  // Auxiliares de estado
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

  // Obtener citas por slot
  const getCitasForSlot = (day, hour) => {
    const [h, m] = hour.split(':').map(Number);
    const slotTime = new Date(day);
    slotTime.setHours(h, m, 0, 0);
    const slotEnd = new Date(slotTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return filteredCitas.filter(c => {
      const cDate = new Date(c.scheduled_for);
      const cEnd = new Date(cDate);
      cEnd.setMinutes(cEnd.getMinutes() + (c.duration_minutes || 30));
      return (cDate >= slotTime && cDate < slotEnd) ||
             (cDate < slotTime && cEnd > slotTime);
    });
  };

  // Renderizar bloque de cita
  const renderCitaBlock = (cita) => {
    const paciente = pacientes.find(p => p.id === cita.patient_id);
    const tratamiento = tratamientos.find(t => t.id === cita.treatment_id);
    const nombre = paciente ? `${paciente.first_name} ${paciente.last_name}` : '—';
    const trat = tratamiento?.name || '—';
    const color = getStatusColor(cita.status);
    const isLlamando = showLlamadaModal && pacienteLlamado?.id === cita.patient_id;

    return (
      <div
        key={cita.id}
        className="odont-agenda-cita"
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
        onClick={(e) => { e.stopPropagation(); setEditData(cita); setShowFormModal(true); }}
        title={`${nombre} - ${trat} (${getStatusLabel(cita.status)})`}
      >
        {/* Fila: nombre + punto de color */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          fontWeight: 600,
          color: '#0f172a',
          fontSize: 13,
        }}>
          <span style={{ 
            color: '#1e293b', // Color más visible (gris muy oscuro)
            fontWeight: 700,
            letterSpacing: '0.3px',
          }}>
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

        {/* Tratamiento */}
        <div style={{ 
          fontSize: 11, 
          color: '#475569',
          fontWeight: 400,
          marginTop: 1,
        }}>
          {trat}
        </div>

        {/* Acciones - iconos más grandes y distribuidos uniformemente */}
        <div style={{ 
          display: 'flex', 
          gap: 4,
          marginTop: 4,
          justifyContent: 'space-between', // Distribuye el espacio entre iconos
        }}>
          {cita.status !== 'completed' && cita.status !== 'cancelled' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handleLlamar(cita); }}
                className="odont-btn-icon-sm"
                style={{ 
                  flex: 1, // Ocupa el mismo espacio
                  background: isLlamando ? '#4ade80' : 'rgba(0,0,0,0.04)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: '4px',
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
                className="odont-btn-icon-sm"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: '4px',
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
                onClick={(e) => { e.stopPropagation(); setEditData(cita); setShowFormModal(true); }}
                className="odont-btn-icon-sm"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: '4px',
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
                className="odont-btn-icon-sm"
                style={{ 
                  flex: 1,
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  borderRadius: '4px',
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

  // Navegación semanas
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

  return (
    <PageTemplate
      title="Agenda Odontológica"
      subtitle="Agenda semanal"
      loading={loading}
      headerAction={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="odont-btn-add" onClick={() => { setEditData(null); setShowFormModal(true); }}>
            <FiPlus /> Nueva Cita
          </button>
          <button className="odont-btn-secondary" onClick={() => setShowConfigModal(true)}>
            <FiSettings size={18} /> Configuración
          </button>
        </div>
      }
    >
      {/* Estadísticas */}
      <div className="odont-stats-grid">
        {statsData.map(s => (
          <div key={s.label} className="odont-stat-card">
            <div className={`odont-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="odont-stat-info">
              <div className="odont-stat-value">{s.value}</div>
              <div className="odont-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Navegación y filtros */}
      <div className="odont-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Navegación izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={goPrevWeek} className="odont-btn-icon" style={{ border: '1px solid #ccc', borderRadius: 4, padding: 4 }}>
            <FiChevronLeft size={18} />
          </button>
          <button onClick={goToday} className="odont-btn-secondary" style={{ fontSize: 13, padding: '4px 12px' }}>
            Hoy
          </button>
          <button onClick={goNextWeek} className="odont-btn-icon" style={{ border: '1px solid #ccc', borderRadius: 4, padding: 4 }}>
            <FiChevronRight size={18} />
          </button>
          <span style={{ color: '#000000', fontWeight: 600, fontSize: 15, marginLeft: 8 }}>
            {weekStart.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} - {weekEnd.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Búsqueda y recargar - alineados a la derecha */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
          <FiSearch className="odont-search-icon" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="odont-search odont-search-enhanced">
              <input
                type="text"
                placeholder="Buscar paciente o tratamiento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {search && (
                <button className="odont-search-clear" onClick={() => setSearch('')}>
                  <FiX size={16} />
                </button>
              )}
          </div>
        </div>
      </div>

      {/* AGENDA - Cuadrícula */}
      <div className="odont-agenda-container">
        <div className="odont-agenda-grid">
          {/* Esquina superior izquierda */}
          <div className="odont-agenda-header odont-agenda-corner"></div>
          
          {/* Días de la semana */}
          {daysOfWeek.map((day, idx) => {
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={idx} className={`odont-agenda-header ${isToday ? 'today' : ''}`}>
                <div className="day-name">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][idx]}</div>
                <div className="day-number">{day.getDate()}</div>
              </div>
            );
          })}

          {/* Filas de horas */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="odont-agenda-hour">{hour}</div>
              {daysOfWeek.map((day, colIdx) => {
                const citasEnSlot = getCitasForSlot(day, hour);
                return (
                  <div
                    key={colIdx}
                    className="odont-agenda-slot"
                    onClick={() => {
                      const [h, m] = hour.split(':').map(Number);
                      const newDate = new Date(day);
                      newDate.setHours(h, m, 0, 0);
                      setEditData(null);
                      setShowFormModal(true);
                      window._agendaSelectedDate = newDate.toISOString();
                    }}
                  >
                    {citasEnSlot.map(c => renderCitaBlock(c))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Modal de formulario */}
      {showFormModal && (
        <CitaFormModal
          cita={editData}
          pacientes={pacientes}
          tratamientos={tratamientos}
          odontologos={odontologos}
          onClose={() => { setShowFormModal(false); setEditData(null); }}
          onSave={handleSaveCita}
          initialDate={window._agendaSelectedDate || null}
        />
      )}

      {/* Modal de configuración */}
      {showConfigModal && (
        <div className="odont-modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div
            className="odont-modal"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '1000px',
              overflowY: 'auto',
              padding: 0,
              background: '#fff',
              borderRadius: 12,
            }}
          >
            <div className="odont-modal-header" style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Configuración de Agenda</h3>
              <button className="odont-modal-close" onClick={() => setShowConfigModal(false)}>
                <FiXCircle size={24} />
              </button>
            </div>
            <div className="odont-modal-body" style={{ padding: '20px' }}>
              <ConfiguracionAgenda />
            </div>
          </div>
        </div>
      )}

      {/* Modal de llamada - Compacto */}
      {showLlamadaModal && pacienteLlamado && (
        <div className="odont-modal-overlay" onClick={() => setShowLlamadaModal(false)}>
          <div className="odont-modal odont-modal-llamada" onClick={e => e.stopPropagation()}>
            <div className="odont-modal-header" style={{ borderBottom: 'none', padding: '12px 16px 0' }}>
              <button className="odont-modal-close" onClick={() => setShowLlamadaModal(false)}>
                <FiXCircle size={20} />
              </button>
            </div>
            <div className="odont-modal-body" style={{ padding: '8px 20px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 4 }}>🔊</div>
              <h3 style={{ color: '#fff', fontSize: 20, margin: '4px 0', fontWeight: 600 }}>
                Siguiente paciente
              </h3>
              <p style={{ color: '#4ade80', fontSize: 30, fontWeight: 700, margin: '2px 0' }}>
                {pacienteLlamado.first_name} {pacienteLlamado.last_name}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 2 }}>
                por favor
              </p>
              <div style={{ marginTop: 10 }}>
                <span style={{ background: 'rgba(74,222,128,0.15)', padding: '2px 12px', borderRadius: 16, fontSize: 11, color: '#4ade80' }}>
                  📢 Llamando...
                </span>
              </div>
              <button
                className="odont-btn-secondary"
                onClick={() => setShowLlamadaModal(false)}
                style={{ marginTop: 12, padding: '6px 18px', fontSize: 13 }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}