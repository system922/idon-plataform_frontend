// components/Odontologia/Citas/CitaModal.jsx
import React, { useState, useEffect } from 'react';
import { FiX, FiSave, FiCalendar, FiClock, FiUserCheck, FiActivity } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';

export default function CitaModal({ 
  isOpen, 
  onClose, 
  cita, 
  onSave, 
  loading,
  selectedDate = null,
  selectedHour = null,
  especialistas = []
}) {
  const [form, setForm] = useState({
    patient_id: '',
    especialista_id: '',
    tratamiento_id: '',
    motivo_id: '',
    fecha: '',
    hora_inicio: '',
    hora_fin: '',
    duracion: 30,
    status: 'scheduled',
    notas: ''
  });

  const [originalData, setOriginalData] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [userModifiedSchedule, setUserModifiedSchedule] = useState(false);

  const [pacientes, setPacientes] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [listaEspecialistas, setListaEspecialistas] = useState([]);
  const [loadingEspecialistas, setLoadingEspecialistas] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [patientData, setPatientData] = useState(null);

  // ============================================================
  // VALIDAR DISPONIBILIDAD (SOLO PARA EDICIÓN)
  // ============================================================
  const validarDisponibilidad = async () => {
    if (!cita || !originalData) return;
    
    const huboCambioHorario =
      originalData.fecha !== form.fecha ||
      originalData.hora_inicio !== form.hora_inicio ||
      String(originalData.especialista_id) !== String(form.especialista_id) ||
      originalData.duracion !== form.duracion;

    if (!huboCambioHorario) {
      setDisponibilidad(null);
      return;
    }

    setValidandoDisponibilidad(true);
    try {
      const response = await fetchWithAuth('/odontologia/citas/validar-disponibilidad', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cita_id: cita.id,
          especialista_id: form.especialista_id,
          fecha: form.fecha,
          hora_inicio: form.hora_inicio,
          hora_fin: form.hora_fin
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setDisponibilidad({
          disponible: data.data.disponible,
          mensaje: data.data.mensaje || (data.data.disponible ? '🟢 Especialista disponible' : '🔴 El especialista ya tiene una cita en ese horario')
        });
      } else {
        setDisponibilidad({
          disponible: false,
          mensaje: data.message || '❌ No se pudo validar la disponibilidad'
        });
      }
    } catch (error) {
      console.error('❌ Error validando disponibilidad:', error);
      setDisponibilidad({
        disponible: false,
        mensaje: '❌ Error de conexión al validar disponibilidad'
      });
    } finally {
      setValidandoDisponibilidad(false);
    }
  };

  // ============================================================
  // FORMATEAR FECHA CORRECTAMENTE
  // ============================================================
  const formatearFechaLocal = (fechaStr) => {
    if (!fechaStr) return '';
    if (fechaStr.includes('-')) {
      const partes = fechaStr.split('-');
      const year = parseInt(partes[0]);
      const month = parseInt(partes[1]) - 1;
      const day = parseInt(partes[2]);
      const fecha = new Date(year, month, day);
      return fecha.toLocaleDateString('es-EC', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-EC', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  // ============================================================
  // CARGAR DATOS DEL PACIENTE
  // ============================================================
  const loadPatientData = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/${patientId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPatientData(data.data);
        setSearchTerm(data.data.document_number || '');
      }
    } catch (err) {
      console.error('❌ Error cargando datos del paciente:', err);
    }
  };

  // ============================================================
  // BUSCAR PACIENTE POR CÉDULA (para nueva cita)
  // ============================================================
  const buscarPacientePorCedula = async (cedula) => {
    if (cedula.length !== 10) return;
    
    setLoadingPacientes(true);
    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/search?q=${encodeURIComponent(cedula)}`);
      const data = await res.json();

      if (data.success && data.data?.length) {
        const paciente = data.data.find(p => p.document_number === cedula);
        
        if (paciente) {
          setForm(prev => ({
            ...prev,
            patient_id: paciente.id
          }));
          setPatientData(paciente);
          setSearchTerm(cedula);
          setShowPatientSearch(false);
        } else {
          setPatientData(null);
          setForm(prev => ({
            ...prev,
            patient_id: ''
          }));
          setShowPatientSearch(true);
        }
      } else {
        setPatientData(null);
        setForm(prev => ({
          ...prev,
          patient_id: ''
        }));
        setShowPatientSearch(true);
      }
    } catch (error) {
      console.error('❌ Error buscando paciente:', error);
      setPatientData(null);
    } finally {
      setLoadingPacientes(false);
    }
  };

  // ============================================================
  // CARGAR ESPECIALISTAS DISPONIBLES (SOLO PARA NUEVA CITA)
  // ============================================================
  const loadEspecialistasDisponibles = async (fecha, horaInicio) => {
    if (!fecha || !horaInicio) return;
    
    setLoadingEspecialistas(true);
    try {
      const [h, m] = horaInicio.split(':').map(Number);
      const horaFinDate = new Date();
      horaFinDate.setHours(h, m + 30, 0, 0);
      const horaFin = horaFinDate.toTimeString().slice(0, 8);

      const res = await fetchWithAuth(
        `/odontologia/citas/especialistas-disponibles?fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`
      );
      const data = await res.json();
      
      if (data.success && data.data) {
        if (data.data.length === 1) {
          setForm(prev => ({ ...prev, especialista_id: data.data[0].id }));
        }
        setListaEspecialistas(data.data);
      }
    } catch (err) {
      console.error('❌ [CitaModal] Error cargando especialistas:', err);
    } finally {
      setLoadingEspecialistas(false);
    }
  };

  // ============================================================
  // EFECTO PRINCIPAL
  // ============================================================
  useEffect(() => {
    if (isOpen) {
      const loadInitialData = async () => {
        try {
          const [tratRes, motRes] = await Promise.all([
            fetchWithAuth('/odontologia/tratamientos'),
            fetchWithAuth('/odontologia/motivos-consulta')
          ]);
          
          const tratData = await tratRes.json();
          if (tratData.success && tratData.data) {
            setTratamientos(tratData.data);
          }
          
          const motData = await motRes.json();
          if (motData.success && motData.data) {
            setMotivos(motData.data);
          }

          if (cita) {
            console.log('📝 Editando cita:', cita);
            
            let fechaFormateada = cita.fecha;
            if (fechaFormateada && fechaFormateada.includes('T')) {
              fechaFormateada = fechaFormateada.split('T')[0];
            }

            let horaInicio = cita.hora_inicio || '';
            if (horaInicio && !horaInicio.includes(':')) {
              horaInicio = `${horaInicio}:00`;
            }
            if (horaInicio && horaInicio.split(':').length === 2) {
              horaInicio = `${horaInicio}:00`;
            }

            let horaFin = cita.hora_fin || '';
            if (horaFin && !horaFin.includes(':')) {
              horaFin = `${horaFin}:00`;
            }
            if (horaFin && horaFin.split(':').length === 2) {
              horaFin = `${horaFin}:00`;
            }

            const espRes = await fetchWithAuth('/odontologia/especialistas');
            const espData = await espRes.json();
            if (espData.success && espData.data) {
              setListaEspecialistas(espData.data);
            }

            const citaData = {
              patient_id: cita.patient_id || '',
              especialista_id: cita.especialista_id || '',
              tratamiento_id: cita.tratamiento_id || '',
              motivo_id: cita.motivo_id || '',
              fecha: fechaFormateada || '',
              hora_inicio: horaInicio || '',
              hora_fin: horaFin || '',
              duracion: cita.duracion || 30,
              status: cita.status || 'scheduled',
              notas: cita.notas || ''
            };

            setForm(citaData);
            
            setOriginalData({
              fecha: fechaFormateada,
              hora_inicio: horaInicio,
              especialista_id: cita.especialista_id,
              duracion: cita.duracion || 30
            });

            setUserModifiedSchedule(false);
            setDisponibilidad(null);

            // ============================================================
            // CARGA DE DATOS DEL PACIENTE - CORREGIDO
            // ============================================================
            if (cita.patient_id) {
              // PRIMERO: Intentar cargar los datos completos del paciente desde la API
              try {
                const patientRes = await fetchWithAuth(`/odontologia/pacientes/${cita.patient_id}`);
                const patientDataRes = await patientRes.json();
                
                if (patientDataRes.success && patientDataRes.data) {
                  // Si tenemos datos completos del paciente
                  const paciente = patientDataRes.data;
                  setPatientData(paciente);
                  setSearchTerm(paciente.document_number || '');
                  console.log('✅ [CitaModal] Paciente cargado desde API:', paciente);
                } else {
                  // Fallback: usar datos que vienen en la cita
                  if (cita.paciente_nombre) {
                    // Intentar extraer la cédula de la información disponible
                    let cedula = cita.paciente_documento || '';
                    
                    // Si no hay cédula, intentar buscar por nombre
                    if (!cedula && cita.paciente_nombre) {
                      try {
                        const searchRes = await fetchWithAuth(`/odontologia/pacientes/search?q=${encodeURIComponent(cita.paciente_nombre)}`);
                        const searchData = await searchRes.json();
                        if (searchData.success && searchData.data && searchData.data.length > 0) {
                          const encontrado = searchData.data[0];
                          setPatientData(encontrado);
                          setSearchTerm(encontrado.document_number || '');
                          console.log('✅ [CitaModal] Paciente encontrado por nombre:', encontrado);
                        }
                      } catch (searchErr) {
                        console.warn('⚠️ [CitaModal] No se pudo buscar paciente por nombre:', searchErr);
                      }
                    }
                    
                    // Si aún no tenemos datos del paciente, usar lo que venga en la cita
                    if (!patientData) {
                      setPatientData({
                        first_name: cita.paciente_nombre?.split(' ')[0] || '',
                        last_name: cita.paciente_nombre?.split(' ').slice(1).join(' ') || '',
                        document_number: cedula || '',
                        phone: cita.paciente_telefono || '',
                        email: cita.paciente_email || ''
                      });
                      setSearchTerm(cedula || '');
                    }
                  } else {
                    // No hay información del paciente
                    setPatientData(null);
                    setSearchTerm('');
                  }
                }
              } catch (err) {
                console.error('❌ [CitaModal] Error cargando paciente:', err);
                // Fallback: usar datos de la cita
                if (cita.paciente_nombre) {
                  setPatientData({
                    first_name: cita.paciente_nombre?.split(' ')[0] || '',
                    last_name: cita.paciente_nombre?.split(' ').slice(1).join(' ') || '',
                    document_number: cita.paciente_documento || '',
                    phone: cita.paciente_telefono || '',
                    email: cita.paciente_email || ''
                  });
                  setSearchTerm(cita.paciente_documento || '');
                }
              }
            }

            return;
          }

          if (selectedDate && selectedHour) {
            let fechaStr = selectedDate;
            if (fechaStr.includes('T')) {
              fechaStr = fechaStr.split('T')[0];
            }
            
            let horaClean = selectedHour;
            if (!horaClean.includes(':')) {
              horaClean = `${horaClean}:00`;
            }
            if (horaClean.split(':').length === 2) {
              horaClean = `${horaClean}:00`;
            }
            
            const [h, m] = horaClean.split(':').map(Number);
            const horaFinDate = new Date();
            horaFinDate.setHours(h, m + 30, 0, 0);
            const horaFinStr = horaFinDate.toTimeString().slice(0, 8);
            
            setForm({
              patient_id: '',
              especialista_id: '',
              tratamiento_id: '',
              motivo_id: '',
              fecha: fechaStr,
              hora_inicio: horaClean,
              hora_fin: horaFinStr,
              duracion: 30,
              status: 'scheduled',
              notas: ''
            });
            setSearchTerm('');
            setPatientData(null);
            setOriginalData(null);
            setDisponibilidad(null);
            setUserModifiedSchedule(false);

            await loadEspecialistasDisponibles(fechaStr, horaClean);
          } 
          else {
            const hoy = new Date();
            const year = hoy.getFullYear();
            const month = String(hoy.getMonth() + 1).padStart(2, '0');
            const day = String(hoy.getDate()).padStart(2, '0');
            const fechaStr = `${year}-${month}-${day}`;
            
            setForm({
              patient_id: '',
              especialista_id: '',
              tratamiento_id: '',
              motivo_id: '',
              fecha: fechaStr,
              hora_inicio: '',
              hora_fin: '',
              duracion: 30,
              status: 'scheduled',
              notas: ''
            });
            setSearchTerm('');
            setPatientData(null);
            setOriginalData(null);
            setDisponibilidad(null);
            setUserModifiedSchedule(false);
            setListaEspecialistas([]);
          }
        } catch (err) {
          console.error('❌ [CitaModal] Error:', err);
        }
      };
      
      loadInitialData();
    } else {
      setSearchResults([]);
      setShowPatientSearch(false);
      setPatientData(null);
      setOriginalData(null);
      setDisponibilidad(null);
      setUserModifiedSchedule(false);
    }
  }, [isOpen, cita, selectedDate, selectedHour]);

  // ============================================================
  // EFECTO PARA VALIDAR DISPONIBILIDAD SOLO SI EL USUARIO MODIFICÓ
  // ============================================================
  useEffect(() => {
    if (cita && originalData && userModifiedSchedule && isOpen) {
      const timer = setTimeout(() => {
        validarDisponibilidad();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [form.fecha, form.hora_inicio, form.especialista_id, form.duracion]);

  // ============================================================
  // BUSCAR PACIENTES
  // ============================================================
  const handlePatientSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      alert('Ingresa al menos 2 caracteres para buscar');
      return;
    }
    setLoadingPacientes(true);
    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setSearchResults(data.data);
        setShowPatientSearch(true);
      } else {
        setSearchResults([]);
        setShowPatientSearch(true);
      }
    } catch (err) {
      console.error('❌ Error searching patients:', err);
      setSearchResults([]);
    } finally {
      setLoadingPacientes(false);
    }
  };

  const selectPatient = (patient) => {
    setForm({ ...form, patient_id: patient.id });
    setSearchTerm(patient.document_number);
    setPatientData(patient);
    setShowPatientSearch(false);
    setSearchResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Detectar si el usuario modificó el horario (para edición)
    if (originalData && (name === 'fecha' || name === 'hora_inicio' || name === 'especialista_id' || name === 'duracion')) {
      setUserModifiedSchedule(true);
    }
    
    // Para nueva cita: recargar especialistas disponibles
    if (!cita && (name === 'fecha' || name === 'hora_inicio') && form.fecha && form.hora_inicio) {
      const fecha = name === 'fecha' ? value : form.fecha;
      const hora = name === 'hora_inicio' ? value : form.hora_inicio;
      if (fecha && hora) {
        loadEspecialistasDisponibles(fecha, hora);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.patient_id) {
      alert('Selecciona un paciente');
      return;
    }
    if (!form.especialista_id) {
      alert('Selecciona un especialista');
      return;
    }
    if (!form.fecha) {
      alert('Selecciona una fecha');
      return;
    }
    if (!form.hora_inicio) {
      alert('Selecciona un horario');
      return;
    }

    if (cita && originalData) {
      const huboCambioHorario =
        originalData.fecha !== form.fecha ||
        originalData.hora_inicio !== form.hora_inicio ||
        String(originalData.especialista_id) !== String(form.especialista_id) ||
        originalData.duracion !== form.duracion;

      if (huboCambioHorario && disponibilidad && !disponibilidad.disponible) {
        if (!window.confirm(`⚠️ ${disponibilidad.mensaje}\n\n¿Deseas guardar la cita de todas formas?`)) {
          return;
        }
      }
    }

    const dataToSend = {
      ...form,
      hora_inicio: form.hora_inicio.includes(':') ? form.hora_inicio : `${form.hora_inicio}:00`,
      hora_fin: form.hora_fin.includes(':') ? form.hora_fin : `${form.hora_fin}:00`
    };

    const result = await onSave(dataToSend);
    if (result?.success) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const vieneDeAgenda = selectedDate && selectedHour && !cita;
  const fechaFormateada = form.fecha ? formatearFechaLocal(form.fecha) : '';
  const esEdicion = !!cita;

  // Determinar el mensaje del header
  const getHeaderMessage = () => {
    if (esEdicion) {
      return `Editando cita`;
    }
    if (form.fecha && form.hora_inicio) {
      return `Agendar una nueva cita: ${fechaFormateada} a las ${form.hora_inicio.slice(0, 5)}`;
    }
    return 'Agendar una nueva cita';
  };

  const getEspecialistaActual = () => {
    if (form.especialista_id) {
      return listaEspecialistas.find(e => String(e.id) === String(form.especialista_id));
    }
    return null;
  };

  const especialistaActual = getEspecialistaActual();

  const huboCambioHorario = 
    esEdicion && 
    originalData &&
    (
      originalData.fecha !== form.fecha ||
      originalData.hora_inicio !== form.hora_inicio ||
      String(originalData.especialista_id) !== String(form.especialista_id) ||
      originalData.duracion !== form.duracion
    );

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 475 }}>
        <div className="odonto-modal-header blue">
          <div>
            <h3>{esEdicion ? 'Editar Cita' : 'Nueva Cita'}</h3>
            <p>{getHeaderMessage()}</p>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className="odonto-modal-body">
          <form onSubmit={handleSubmit}>
            {/* FILA 1: Cédula y Paciente */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '0.9fr 2.1fr',
                gap: '8px',
                alignItems: 'end',
                marginBottom: '20px'
              }}>
              {/* Cédula */}
              <div className="odonto-form-group">
                <label>Cédula *</label>
                {esEdicion ? (
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                  }}>
                    {patientData?.document_number || searchTerm || 'No disponible'}
                  </div>
                ) : (
                  <input
                    type="text"
                    name="cedula"
                    value={searchTerm}
                    placeholder="0923456789"
                    maxLength={10}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setSearchTerm(value);
                      
                      if (value.length === 10) {
                        buscarPacientePorCedula(value);
                      } else {
                        // Si la cédula no tiene 10 dígitos, limpiar selección
                        setPatientData(null);
                        setForm(prev => ({
                          ...prev,
                          patient_id: ''
                        }));
                      }
                    }}
                    style={{
                      width: '100%',
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      letterSpacing: '1px'
                    }}
                  />
                )}
                {!esEdicion && loadingPacientes && (
                  <small style={{ color: '#6b7280' }}>Buscando paciente...</small>
                )}
              </div>

              {/* Paciente */}
              <div className="odonto-form-group">
                <label>Paciente</label>
                <input
                  type="text"
                  value={
                    patientData
                      ? `${patientData.first_name || ''} ${patientData.last_name || ''}`.trim()
                      : esEdicion 
                        ? (cita?.paciente_nombre || '')
                        : ''
                  }
                  readOnly
                  placeholder={esEdicion ? 'Cargando...' : 'Ingrese cédula para buscar'}
                  style={{
                    backgroundColor: '#f8fafc',
                    fontWeight: patientData ? '600' : 'normal',
                    color: patientData ? 'var(--text-primary)' : 'var(--text-dim)',
                    maxWidth: '100%'
                  }}
                />
                {!esEdicion && searchTerm.length === 10 && !patientData && !loadingPacientes && (
                  <small style={{ color: '#d97706' }}>
                    ⚠️ Paciente no encontrado. Verifica la cédula o crea un nuevo paciente.
                  </small>
                )}
              </div>
            </div>

            {/* FILA 2: Especialista */}
            <div className="odonto-form-group" style={{ marginBottom: '16px' }}>
              <label>
                <FiUserCheck size={14} style={{ marginRight: 4 }} />
                Especialista *
              </label>
              
              {esEdicion ? (
                <>
                  <select
                    name="especialista_id"
                    value={form.especialista_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccionar especialista</option>
                    {listaEspecialistas.map(e => {
                      const esActual = String(e.id) === String(form.especialista_id);
                      return (
                        <option 
                          key={e.id} 
                          value={e.id}
                          style={{
                            fontWeight: esActual ? 'bold' : 'normal',
                            backgroundColor: esActual ? '#eff6ff' : 'white'
                          }}
                        >
                          {e.nombre} {e.especialidad ? `(${e.especialidad})` : ''}
                          {esActual && ' (Actual)'}
                        </option>
                      );
                    })}
                  </select>
                  
                  {huboCambioHorario && (
                    <div style={{ marginTop: '4px' }}>
                      {validandoDisponibilidad ? (
                        <small style={{ color: '#6b7280' }}>
                          ⏳ Validando disponibilidad...
                        </small>
                      ) : disponibilidad ? (
                        <small style={{ 
                          color: disponibilidad.disponible ? '#065f46' : '#dc2626',
                          display: 'block'
                        }}>
                          {disponibilidad.mensaje}
                        </small>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {loadingEspecialistas ? (
                    <div className="odonto-alert info" style={{ padding: '8px 12px', fontSize: '13px' }}>
                      Cargando especialistas disponibles...
                    </div>
                  ) : listaEspecialistas.length === 0 ? (
                    <div className="odonto-alert warning" style={{ 
                      padding: '8px 12px', 
                      fontSize: '13px',
                      background: '#fef3c7',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d',
                      color: '#92400e'
                    }}>
                      ⚠️ No hay especialistas disponibles para esta fecha y hora
                    </div>
                  ) : (
                    <select
                      name="especialista_id"
                      value={form.especialista_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Seleccionar especialista</option>
                      {listaEspecialistas.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </div>

            {/* FILA 3: Fecha, Hora y Duración */}
            <div className="odonto-detail-grid-three" style={{ marginBottom: '16px' }}>
              {/* Fecha */}
              <div className="odonto-form-group">
                <label>
                  <FiCalendar size={14} style={{ marginRight: 4 }} />
                  Fecha *
                </label>
                <input
                  name="fecha"
                  type="date"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                  readOnly={vieneDeAgenda}
                  style={{ 
                    opacity: vieneDeAgenda ? 0.7 : 1,
                    cursor: vieneDeAgenda ? 'not-allowed' : 'default',
                    backgroundColor: vieneDeAgenda ? '#f3f4f6' : 'white'
                  }}
                />
              </div>
              {/* Hora */}
              <div className="odonto-form-group">
                <label>
                  <FiClock size={14} style={{ marginRight: 4 }} />
                  Hora *
                </label>
                <input
                  name="hora_inicio"
                  type="time"
                  value={form.hora_inicio ? form.hora_inicio.slice(0, 5) : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      const [h, m] = value.split(':').map(Number);
                      const horaFinDate = new Date();
                      horaFinDate.setHours(h, m + parseInt(form.duracion || 30), 0, 0);
                      const horaFin = horaFinDate.toTimeString().slice(0, 8);
                      setForm({ ...form, hora_inicio: value + ':00', hora_fin: horaFin });
                      
                      if (originalData) {
                        setUserModifiedSchedule(true);
                      }
                    } else {
                      setForm({ ...form, hora_inicio: '', hora_fin: '' });
                    }
                  }}
                  required
                  step="900"
                  readOnly={vieneDeAgenda}
                  style={{ 
                    opacity: vieneDeAgenda ? 0.7 : 1,
                    cursor: vieneDeAgenda ? 'not-allowed' : 'default',
                    backgroundColor: vieneDeAgenda ? '#f3f4f6' : 'white'
                  }}
                />
              </div>

              {/* Duración */}
              <div className="odonto-form-group">
                <label>Duración</label>
                <select
                  name="duracion"
                  value={form.duracion}
                  onChange={handleChange}
                >
                  <option value="15">15 min</option>
                  <option value="30">30 min</option>
                  <option value="45">45 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                  <option value="120">120 min</option>
                </select>
              </div>
            </div>

            {/* FILA 4: Tratamiento y Motivo */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                width: '100%'
              }}>
              <div className="odonto-form-group">
                <label>
                  <FiActivity size={14} style={{ marginRight: 4 }} />
                  Tratamiento
                </label>
                <select
                  name="tratamiento_id"
                  value={form.tratamiento_id}
                  onChange={handleChange}
                  style={{ width: '100%' }}
                >
                  <option value="">Seleccionar tratamiento</option>
                  {tratamientos.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.duration_minutes ? `(${t.duration_minutes} min)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="odonto-form-group">
                <label>Motivo de Consulta</label>
                <select
                  name="motivo_id"
                  value={form.motivo_id}
                  onChange={handleChange}
                  style={{ width: '100%' }}
                >
                  <option value="">Seleccionar motivo</option>
                  {motivos.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} {m.duracion ? `(${m.duracion} min)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* FILA 5: Notas y Estado */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1.75fr 0.25fr',
                gap: '12px',
                width: '100%'
              }}>
              <div className="odonto-form-group">
                <label>Notas</label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Observaciones de la cita..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
              {esEdicion && (
                <div className="odonto-form-group" style={{ marginBottom: '16px' }}>
                  <label>Estado</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    <option value="scheduled">Programada</option>
                    <option value="confirmed">Confirmada</option>
                    <option value="in_progress">En curso</option>
                    <option value="completed">Completada</option>
                    <option value="cancelled">Cancelada</option>
                    <option value="no_show">No asistió</option>
                  </select>
                </div>
              )}
            </div>
            <div className="odonto-modal-footer">
              <button type="button" className="odonto-btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="odonto-btn-primary" disabled={loading}>
                <FiSave size={16} style={{ marginRight: 6 }} />
                {loading ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Guardar Cita'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}