// components/Odontologia/Configuracion/AgendasConfig.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiEdit, FiTrash2, FiX, FiCalendar, FiUser, 
  FiClock, FiCopy, FiAlertCircle, FiSave,
  FiSearch, FiRefreshCw, FiUserX
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';

const DIAS_SEMANA = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];

export default function AgendasConfig() {
  const [agendas, setAgendas] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDiaLibreModal, setShowDiaLibreModal] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [selectedDiaLibre, setSelectedDiaLibre] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#10b981',
    especialista_id: '',
    grupo_id: '',
    is_active: true,
    dias: DIAS_SEMANA.map(d => ({
      dia: d.value,
      activo: true,
      inicio: '08:00',
      fin: '17:00'
    })),
    dias_libres: []
  });

  const [diaLibreData, setDiaLibreData] = useState({
    fecha: '',
    motivo: ''
  });

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agendasRes, especialistasRes, gruposRes] = await Promise.all([
        fetchWithAuth('/odontologia/agendas'),
        fetchWithAuth('/odontologia/especialistas'),
        fetchWithAuth('/odontologia/grupos-agendas')
      ]);

      const agendasData = await agendasRes.json();
      const especialistasData = await especialistasRes.json();
      const gruposData = await gruposRes.json();

      if (agendasData.success) setAgendas(agendasData.data || []);
      if (especialistasData.success) setEspecialistas(especialistasData.data || []);
      if (gruposData.success) setGrupos(gruposData.data || []);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // HANDLERS - AGENDA
  // ============================================================
  const handleOpenModal = (agenda = null) => {
    if (agenda) {
      setSelectedAgenda(agenda);
      setFormData({
        nombre: agenda.nombre,
        descripcion: agenda.descripcion || '',
        color: agenda.color || '#10b981',
        especialista_id: agenda.especialista_id || '',
        grupo_id: agenda.grupo_id || '',
        is_active: agenda.is_active !== undefined ? agenda.is_active : true,
        dias: agenda.dias || DIAS_SEMANA.map(d => ({
          dia: d.value,
          activo: true,
          inicio: '08:00',
          fin: '17:00'
        })),
        dias_libres: agenda.dias_libres || []
      });
    } else {
      setSelectedAgenda(null);
      setFormData({
        nombre: '',
        descripcion: '',
        color: '#10b981',
        especialista_id: '',
        grupo_id: '',
        is_active: true,
        dias: DIAS_SEMANA.map(d => ({
          dia: d.value,
          activo: true,
          inicio: '08:00',
          fin: '17:00'
        })),
        dias_libres: []
      });
    }
    setShowModal(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAgenda(null);
    setError(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleDiaToggle = (index) => {
    const newDias = [...formData.dias];
    newDias[index].activo = !newDias[index].activo;
    setFormData({ ...formData, dias: newDias });
  };

  const handleDiaHorarioChange = (index, field, value) => {
    const newDias = [...formData.dias];
    newDias[index][field] = value;
    setFormData({ ...formData, dias: newDias });
  };

  const handleToggleAllDias = (activo) => {
    const newDias = formData.dias.map(d => ({ ...d, activo }));
    setFormData({ ...formData, dias: newDias });
  };

  const handleCopyHorarioToAll = (index) => {
    const diaOrigen = formData.dias[index];
    const newDias = formData.dias.map(d => ({
      ...d,
      inicio: diaOrigen.inicio,
      fin: diaOrigen.fin
    }));
    setFormData({ ...formData, dias: newDias });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        dias: formData.dias.filter(d => d.activo)
      };

      const url = selectedAgenda
        ? `/odontologia/agendas/${selectedAgenda.id}`
        : '/odontologia/agendas';
      const method = selectedAgenda ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }

      const data = await res.json();
      if (data.success) {
        await loadData();
        handleCloseModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar la agenda');
      console.error('Error saving agenda:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta agenda?')) return;

    try {
      const res = await fetchWithAuth(`/odontologia/agendas/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar la agenda');
      console.error('Error deleting agenda:', err);
    }
  };

  // ============================================================
  // HANDLERS - DÍAS LIBRES
  // ============================================================
  const handleOpenDiaLibreModal = (agenda, diaLibre = null) => {
    setSelectedAgenda(agenda);
    if (diaLibre) {
      setSelectedDiaLibre(diaLibre);
      setDiaLibreData({
        fecha: diaLibre.fecha,
        motivo: diaLibre.motivo
      });
    } else {
      setSelectedDiaLibre(null);
      setDiaLibreData({
        fecha: new Date().toISOString().split('T')[0],
        motivo: ''
      });
    }
    setShowDiaLibreModal(true);
    setError(null);
  };

  const handleCloseDiaLibreModal = () => {
    setShowDiaLibreModal(false);
    setSelectedDiaLibre(null);
    setSelectedAgenda(null);
    setError(null);
  };

  const handleDiaLibreChange = (e) => {
    const { name, value } = e.target;
    setDiaLibreData({ ...diaLibreData, [name]: value });
  };

  const handleSaveDiaLibre = async (e) => {
    e.preventDefault();
    if (!diaLibreData.fecha || !diaLibreData.motivo) {
      setError('Por favor completa todos los campos');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let res;
      if (selectedDiaLibre) {
        // Actualizar día libre (eliminar y crear nuevo)
        await fetchWithAuth(
          `/odontologia/agendas/${selectedAgenda.id}/dias-libres/${selectedDiaLibre.id}`,
          { method: 'DELETE' }
        );
        res = await fetchWithAuth(
          `/odontologia/agendas/${selectedAgenda.id}/dias-libres`,
          {
            method: 'POST',
            body: JSON.stringify(diaLibreData),
          }
        );
      } else {
        res = await fetchWithAuth(
          `/odontologia/agendas/${selectedAgenda.id}/dias-libres`,
          {
            method: 'POST',
            body: JSON.stringify(diaLibreData),
          }
        );
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }

      const data = await res.json();
      if (data.success) {
        await loadData();
        handleCloseDiaLibreModal();
      }
    } catch (err) {
      setError(err.message || 'Error al guardar el día libre');
      console.error('Error saving dia libre:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDiaLibre = async (agendaId, diaLibre) => {
    if (!window.confirm(`¿Eliminar el día libre ${diaLibre.fecha}?`)) return;

    try {
      const res = await fetchWithAuth(
        `/odontologia/agendas/${agendaId}/dias-libres/${diaLibre.id}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }

      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      alert(err.message || 'Error al eliminar el día libre');
      console.error('Error deleting dia libre:', err);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  const filteredAgendas = agendas.filter(a =>
    a.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEspecialistaNombre = (id) => {
    const esp = especialistas.find(e => e.id === id);
    return esp ? esp.nombre : 'No asignado';
  };

  const getDiaLabel = (diaKey) => {
    const dia = DIAS_SEMANA.find(d => d.value === diaKey);
    return dia ? dia.label : diaKey;
  };

  const getDiasActivos = (dias) => {
    return dias?.filter(d => d.activo).length || 0;
  };

  if (loading) {
    return (
      <div className="odonto-config-section">
        <div className="odonto-loading">Cargando agendas...</div>
      </div>
    );
  }

  return (
    <div className="odonto-config-section">
      <div className="odonto-config-header">
        <div>
          <h3>Agendas por Odontólogo</h3>
          <p>Configura los días y horarios de atención de cada odontólogo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="odonto-btn-secondary" onClick={loadData} disabled={loading}>
            <FiRefreshCw size={16} className={loading ? 'spin' : ''} />
          </button>
          <button className="odonto-btn-primary" onClick={() => handleOpenModal()}>
            <FiPlus size={16} /> Nueva Agenda
          </button>
        </div>
      </div>

      {error && (
        <div className="odonto-alert error">
          <span>{error}</span>
        </div>
      )}

      {/* Búsqueda */}
      <div className="odonto-search-wrapper" style={{ marginBottom: 16 }}>
        <FiSearch className="odonto-search-icon" />
        <input
          type="text"
          className="odonto-search-input"
          placeholder="Buscar agenda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="odonto-search-clear" onClick={() => setSearchTerm('')}>
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* Tabla de agendas */}
      <div className="odonto-table-container">
        <table className="odonto-table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>Color</th>
              <th>Nombre</th>
              <th>Odontólogo</th>
              <th>Días de Atención</th>
              <th>Días Libres</th>
              <th>Estado</th>
              <th className="center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgendas.length === 0 ? (
              <tr>
                <td colSpan="7" className="odonto-empty-state">
                  {searchTerm ? 'No se encontraron agendas con ese nombre' : 'No hay agendas registradas. Crea una nueva agenda.'}
                </td>
              </tr>
            ) : (
              filteredAgendas.map(a => {
                const diasActivos = getDiasActivos(a.dias);
                const totalDias = a.dias?.length || 7;
                const tieneDiasLibres = a.dias_libres?.length > 0;

                return (
                  <tr key={a.id}>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: a.color || '#10b981',
                        border: '2px solid #e2e8f0'
                      }} />
                    </td>
                    <td>
                      <span className="odonto-name">{a.nombre}</span>
                      {a.descripcion && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.descripcion}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FiUser size={14} style={{ color: 'var(--text-muted)' }} />
                        <span>{getEspecialistaNombre(a.especialista_id)}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {a.dias?.map(d => (
                          <span
                            key={d.dia}
                            className={`odonto-badge-status ${d.activo ? 'active' : 'inactive'}`}
                            style={{ fontSize: 10, padding: '2px 6px' }}
                            title={d.activo ? `${getDiaLabel(d.dia)}: ${d.inicio} - ${d.fin}` : `${getDiaLabel(d.dia)}: Descanso`}
                          >
                            {getDiaLabel(d.dia).substring(0, 3)}
                            {d.activo && ` ${d.inicio}`}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {diasActivos} de {totalDias} días de atención
                      </div>
                    </td>
                    <td>
                      {tieneDiasLibres ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {a.dias_libres.slice(0, 2).map((dl, idx) => (
                            <span key={idx} style={{ fontSize: 12, color: 'var(--danger)' }}>
                              {dl.fecha} ({dl.motivo})
                            </span>
                          ))}
                          {a.dias_libres.length > 2 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              +{a.dias_libres.length - 2} más
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`odonto-badge-status ${a.is_active ? 'active' : 'inactive'}`}>
                        {a.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="center">
                      <div className="odonto-actions">
                        <button
                          className="odonto-btn-icon edit"
                          onClick={() => handleOpenModal(a)}
                          title="Editar agenda"
                        >
                          <FiEdit size={14} />
                        </button>
                        <button
                          className="odonto-btn-icon view"
                          onClick={() => handleOpenDiaLibreModal(a)}
                          title="Gestionar días libres"
                        >
                          <FiCalendar size={14} />
                        </button>
                        <button
                          className="odonto-btn-icon delete"
                          onClick={() => handleDelete(a.id)}
                          title="Eliminar agenda"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================
          MODAL DE AGENDA
          ============================================================ */}
      {showModal && (
        <div className="odonto-modal-overlay" onClick={handleCloseModal}>
          <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 750 }}>
            <div className="odonto-modal-header blue">
              <div>
                <h3>{selectedAgenda ? 'Editar Agenda' : 'Nueva Agenda'}</h3>
                <p>Configura los días y horarios de atención del odontólogo</p>
              </div>
              <button className="odonto-modal-close" onClick={handleCloseModal}>
                <FiX size={24} />
              </button>
            </div>

            <div className="odonto-modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {error && (
                <div className="odonto-alert error" style={{ marginBottom: 16 }}>
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleSave}>
                {/* Información básica */}
                <div className="odonto-form-row">
                  <div className="odonto-form-group">
                    <label>Nombre de la Agenda *</label>
                    <input
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      placeholder="Ej: Agenda Dr. Juan Pérez"
                      required
                    />
                  </div>

                  <div className="odonto-form-group">
                    <label>Odontólogo *</label>
                    <select
                      name="especialista_id"
                      value={formData.especialista_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar odontólogo</option>
                      {especialistas.filter(e => e.is_active).map(e => (
                        <option key={e.id} value={e.id}>
                          {e.nombre} - {e.especialidad}
                        </option>
                      ))}
                    </select>
                    <small className="odonto-form-help">Odontólogo asignado a esta agenda</small>
                  </div>
                </div>

                <div className="odonto-form-row">
                  <div className="odonto-form-group">
                    <label>Grupo</label>
                    <select
                      name="grupo_id"
                      value={formData.grupo_id}
                      onChange={handleChange}
                    >
                      <option value="">Sin grupo</option>
                      {grupos.filter(g => g.is_active).map(g => (
                        <option key={g.id} value={g.id}>
                          {g.nombre}
                        </option>
                      ))}
                    </select>
                    <small className="odonto-form-help">Grupo al que pertenece la agenda</small>
                  </div>

                  <div className="odonto-form-group">
                    <label>Color</label>
                    <div className="odonto-color-picker">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`odonto-color-option ${formData.color === c ? 'selected' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setFormData({ ...formData, color: c })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="odonto-form-group">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Descripción de la agenda..."
                    rows={2}
                  />
                </div>

                {/* Configuración de días */}
                <div className="odonto-config-section-title">
                  <FiClock size={18} />
                  <span>Días y Horarios de Atención</span>
                  <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="odonto-btn-secondary"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => handleToggleAllDias(true)}
                    >
                      Activar todos
                    </button>
                    <button
                      type="button"
                      className="odonto-btn-secondary"
                      style={{ padding: '4px 12px', fontSize: 12 }}
                      onClick={() => handleToggleAllDias(false)}
                    >
                      Desactivar todos
                    </button>
                  </div>
                </div>

                <div className="odonto-dias-grid">
                  {formData.dias.map((dia, index) => {
                    const diaInfo = DIAS_SEMANA.find(d => d.value === dia.dia);
                    const isActive = dia.activo;

                    return (
                      <div
                        key={dia.dia}
                        className={`odonto-dia-item ${isActive ? 'active' : 'inactive'}`}
                        style={{
                          borderColor: isActive ? 'var(--primary)' : 'var(--border-color)',
                          background: isActive ? 'var(--primary-bg)' : 'var(--bg-tertiary)'
                        }}
                      >
                        <div className="odonto-dia-header">
                          <span className="odonto-dia-label">{diaInfo?.label || dia.dia}</span>
                          <button
                            type="button"
                            className={`odonto-dia-toggle ${isActive ? 'active' : 'inactive'}`}
                            onClick={() => handleDiaToggle(index)}
                          >
                            {isActive ? '✅ Activo' : '❌ Inactivo'}
                          </button>
                        </div>

                        {isActive && (
                          <div className="odonto-dia-horario">
                            <div className="odonto-dia-horario-group">
                              <label className="odonto-dia-horario-label">Inicio</label>
                              <input
                                type="time"
                                value={dia.inicio}
                                onChange={(e) => handleDiaHorarioChange(index, 'inicio', e.target.value)}
                                className="odonto-dia-input"
                                style={{ fontSize: '11px', padding: '3px 4px' }}
                              />
                            </div>
                            <span className="odonto-dia-separator">—</span>
                            <div className="odonto-dia-horario-group">
                              <label className="odonto-dia-horario-label">Fin</label>
                              <input
                                type="time"
                                value={dia.fin}
                                onChange={(e) => handleDiaHorarioChange(index, 'fin', e.target.value)}
                                className="odonto-dia-input"
                                style={{ fontSize: '11px', padding: '3px 4px' }}
                              />
                            </div>
                          </div>
                        )}

                        {!isActive && (
                          <div className="odonto-dia-descanso">
                            <FiUserX size={16} style={{ color: 'var(--text-muted)' }} />
                            <span>Día de descanso</span>
                            <small style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                              El odontólogo no atiende este día
                            </small>
                          </div>
                        )}

                        {isActive && index === 0 && (
                          <button
                            type="button"
                            className="odonto-dia-copy-btn"
                            onClick={() => handleCopyHorarioToAll(index)}
                          >
                            <FiCopy size={12} /> Copiar horario a todos
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8,
                  padding: 8,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--text-muted)'
                }}>
                  <FiAlertCircle size={16} style={{ color: 'var(--info)' }} />
                  <span>
                    <strong>{formData.dias.filter(d => d.activo).length}</strong> días de atención configurados
                  </span>
                </div>

                <div className="odonto-checkbox-group" style={{ marginTop: 16 }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    id="agenda-activo"
                  />
                  <label htmlFor="agenda-activo">Agenda activa</label>
                  <small className="odonto-form-help">Las agendas inactivas no aparecerán al crear citas</small>
                </div>

                <div className="odonto-modal-footer">
                  <button type="button" className="odonto-btn-secondary" onClick={handleCloseModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="odonto-btn-primary" disabled={saving}>
                    <FiSave size={16} /> {saving ? 'Guardando...' : selectedAgenda ? 'Actualizar' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL DE DÍAS LIBRES
          ============================================================ */}
      {showDiaLibreModal && selectedAgenda && (
        <div className="odonto-modal-overlay" onClick={handleCloseDiaLibreModal}>
          <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 550 }}>
            <div className="odonto-modal-header blue">
              <div>
                <h3>📅 Días Libres - {selectedAgenda.nombre}</h3>
                <p>Gestiona días en los que el odontólogo no atenderá (feriados, vacaciones, etc.)</p>
              </div>
              <button className="odonto-modal-close" onClick={handleCloseDiaLibreModal}>
                <FiX size={24} />
              </button>
            </div>

            <div className="odonto-modal-body">
              {error && (
                <div className="odonto-alert error" style={{ marginBottom: 16 }}>
                  <span>{error}</span>
                </div>
              )}

              {/* Lista de días libres existentes */}
              {selectedAgenda.dias_libres && selectedAgenda.dias_libres.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Días libres registrados
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedAgenda.dias_libres.map((dl, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 6,
                        border: '1px solid var(--border-color)'
                      }}>
                        <div>
                          <span style={{ fontWeight: 500 }}>{dl.fecha}</span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{dl.motivo}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            type="button"
                            className="odonto-btn-icon edit"
                            style={{ width: 28, height: 28 }}
                            onClick={() => handleOpenDiaLibreModal(selectedAgenda, dl)}
                          >
                            <FiEdit size={12} />
                          </button>
                          <button
                            type="button"
                            className="odonto-btn-icon delete"
                            style={{ width: 28, height: 28 }}
                            onClick={() => handleDeleteDiaLibre(selectedAgenda.id, dl)}
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulario para agregar día libre */}
              <form onSubmit={handleSaveDiaLibre}>
                <div className="odonto-form-group">
                  <label>{selectedDiaLibre ? 'Editar día libre' : 'Agregar nuevo día libre'}</label>
                  <div className="odonto-form-row">
                    <div className="odonto-form-group">
                      <label>Fecha</label>
                      <input
                        type="date"
                        name="fecha"
                        value={diaLibreData.fecha}
                        onChange={handleDiaLibreChange}
                        required
                      />
                    </div>
                    <div className="odonto-form-group">
                      <label>Motivo</label>
                      <input
                        type="text"
                        name="motivo"
                        value={diaLibreData.motivo}
                        onChange={handleDiaLibreChange}
                        placeholder="Ej: Feriado, Vacaciones..."
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="odonto-modal-footer">
                  <button type="button" className="odonto-btn-secondary" onClick={handleCloseDiaLibreModal}>
                    Cerrar
                  </button>
                  <button type="submit" className="odonto-btn-primary" disabled={saving}>
                    <FiSave size={16} /> {saving ? 'Guardando...' : selectedDiaLibre ? 'Actualizar' : 'Agregar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}