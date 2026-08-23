// components/Odontologia/Citas/CitaModal.jsx
import React, { useState, useEffect } from 'react';
import { FiSave, FiCalendar, FiClock, FiUserCheck, FiActivity, FiX } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';
import Modal from '../../General/Modal';
import { PacienteModal } from '../Pacientes/PacienteModal';
import CustomCombobox from '../../General/CustomCombobox';
import Input from '../../General/Input';
import { IconTextButton, ButtonGroup } from '../../General/Button';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAlert } from '../../ConfirmContext';

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
  // ============================================================
  // ESTADOS
  // ============================================================
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

  const { showConfirm } = useConfirm();
  const alert = useAlert();

  const [showPacienteModal, setShowPacienteModal] = useState(false);
  const [cedulaParaRegistrar, setCedulaParaRegistrar] = useState('');
  const [savingPaciente, setSavingPaciente] = useState(false);

  const [originalData, setOriginalData] = useState(null);
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [validandoDisponibilidad, setValidandoDisponibilidad] = useState(false);
  const [userModifiedSchedule, setUserModifiedSchedule] = useState(false);

  const [tratamientos, setTratamientos] = useState([]);
  const [motivos, setMotivos] = useState([]);
  const [listaEspecialistas, setListaEspecialistas] = useState([]);
  const [loadingEspecialistas, setLoadingEspecialistas] = useState(false);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientData, setPatientData] = useState(null);
  const [modalError, setModalError] = useState('');

  // ============================================================
  // FUNCIONES
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
        headers: { 'Content-Type': 'application/json' },
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
      console.error('[CitaModal] Error cargando especialistas:', err);
    } finally {
      setLoadingEspecialistas(false);
    }
  };

  // --- Buscar paciente por cédula con confirmación para registrar ---
  const buscarPacientePorCedula = async (cedula) => {
    if (cedula.length !== 10) return;

    setLoadingPacientes(true);
    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/search?q=${encodeURIComponent(cedula)}`);
      const data = await res.json();

      if (data.success && data.data?.length) {
        const paciente = data.data.find(p => p.document_number === cedula);

        if (paciente) {
          setForm(prev => ({ ...prev, patient_id: paciente.id }));
          setPatientData(paciente);
          setSearchTerm(cedula);
        } else {
          setPatientData(null);
          setForm(prev => ({ ...prev, patient_id: '' }));
          // Preguntar si desea registrar al paciente
          const confirmResult = await showConfirm({
            title: 'Paciente no encontrado',
            message: `No se encontró un paciente con la cédula ${cedula}. ¿Deseas registrarlo ahora?`,
            confirmText: 'Registrar',
            cancelText: 'Cancelar',
          });

          if (confirmResult) {
            setCedulaParaRegistrar(cedula);
            setShowPacienteModal(true);
          }
        }
      } else {
        setPatientData(null);
        setForm(prev => ({ ...prev, patient_id: '' }));
        const confirmResult = await showConfirm({
          title: 'Paciente no encontrado',
          message: `No se encontró un paciente con la cédula ${cedula}. ¿Deseas registrarlo ahora?`,
          confirmText: 'Registrar',
          cancelText: 'Cancelar',
        });

        if (confirmResult) {
          setCedulaParaRegistrar(cedula);
          setShowPacienteModal(true);
        }
      }
    } catch (error) {
      console.error('❌ Error buscando paciente:', error);
      setPatientData(null);
      await alert.error(
        'Ocurrió un error al buscar el paciente. Intenta nuevamente.',
        'Error de conexión'
      );
    } finally {
      setLoadingPacientes(false);
    }
  };

  // --- Guardar paciente desde el modal ---
  const handleSavePaciente = async (formData) => {
    setSavingPaciente(true);
    try {
      const res = await fetchWithAuth('/odontologia/pacientes', {
        method: 'POST',
        body: formData, // ya es FormData
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al crear paciente');
      }

      const nuevoPaciente = data.data;

      // Actualizar el estado del modal de cita
      setPatientData(nuevoPaciente);
      setForm(prev => ({ ...prev, patient_id: nuevoPaciente.id }));
      setSearchTerm(nuevoPaciente.document_number);

      // Cerrar modal de paciente y mostrar éxito
      setShowPacienteModal(false);
      setCedulaParaRegistrar('');
      await alert.success(
        `Paciente "${nuevoPaciente.first_name} ${nuevoPaciente.last_name}" registrado correctamente.`,
        'Paciente creado'
      );

      return { success: true };
    } catch (error) {
      await alert.error(error.message, 'Error al registrar paciente');
      return { success: false, error: error.message };
    } finally {
      setSavingPaciente(false);
    }
  };

  // ============================================================
  // EFECTOS
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
            // Edición
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

            // Cargar datos del paciente
            if (cita.patient_id) {
              try {
                const patientRes = await fetchWithAuth(`/odontologia/pacientes/${cita.patient_id}`);
                const patientDataRes = await patientRes.json();
                if (patientDataRes.success && patientDataRes.data) {
                  setPatientData(patientDataRes.data);
                  setSearchTerm(patientDataRes.data.document_number || '');
                } else if (cita.paciente_nombre) {
                  setPatientData({
                    first_name: cita.paciente_nombre?.split(' ')[0] || '',
                    last_name: cita.paciente_nombre?.split(' ').slice(1).join(' ') || '',
                    document_number: cita.paciente_documento || '',
                    phone: cita.paciente_telefono || '',
                    email: cita.paciente_email || ''
                  });
                  setSearchTerm(cita.paciente_documento || '');
                }
              } catch (err) {
                console.error('❌ Error cargando paciente:', err);
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

          // Nueva cita
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
          } else {
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
      setPatientData(null);
      setOriginalData(null);
      setDisponibilidad(null);
      setUserModifiedSchedule(false);
      setModalError('');
    }
  }, [isOpen, cita, selectedDate, selectedHour]);

  // Efecto para validar disponibilidad solo si el usuario modificó
  useEffect(() => {
    if (cita && originalData && userModifiedSchedule && isOpen) {
      const timer = setTimeout(() => {
        validarDisponibilidad();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form.fecha, form.hora_inicio, form.especialista_id, form.duracion]);

  // ============================================================
  // MANEJADORES
  // ============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    if (originalData && (name === 'fecha' || name === 'hora_inicio' || name === 'especialista_id' || name === 'duracion')) {
      setUserModifiedSchedule(true);
    }

    if (!cita && (name === 'fecha' || name === 'hora_inicio') && form.fecha && form.hora_inicio) {
      const fecha = name === 'fecha' ? value : form.fecha;
      const hora = name === 'hora_inicio' ? value : form.hora_inicio;
      if (fecha && hora) {
        loadEspecialistasDisponibles(fecha, hora);
      }
    }
  };

  const handleSubmit = async () => {
    setModalError('');

    if (!form.patient_id) {
      setModalError('Selecciona un paciente');
      return;
    }
    if (!form.especialista_id) {
      setModalError('Selecciona un especialista');
      return;
    }
    if (!form.fecha) {
      setModalError('Selecciona una fecha');
      return;
    }
    if (!form.hora_inicio) {
      setModalError('Selecciona un horario');
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

    try {
      const result = await onSave(dataToSend);
      if (result?.success) {
        onClose();
      } else {
        setModalError(result?.error || 'Error al guardar la cita');
      }
    } catch (err) {
      setModalError(err.message || 'Error al guardar la cita');
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!isOpen) return null;

  const esEdicion = !!cita;
  const vieneDeAgenda = selectedDate && selectedHour && !cita;
  const fechaFormateada = form.fecha ? formatearFechaLocal(form.fecha) : '';

  const getHeaderMessage = () => {
    if (esEdicion) return `Editando cita`;
    if (form.fecha && form.hora_inicio) {
      return `Agendar una nueva cita: ${fechaFormateada} a las ${form.hora_inicio.slice(0, 5)}`;
    }
    return 'Agendar una nueva cita';
  };

  const huboCambioHorario =
    esEdicion &&
    originalData &&
    (originalData.fecha !== form.fecha ||
     originalData.hora_inicio !== form.hora_inicio ||
     String(originalData.especialista_id) !== String(form.especialista_id) ||
     originalData.duracion !== form.duracion);

  const footer = (
    <>
      {modalError && (
        <div className="modal-error-text" style={{
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '12px',
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          borderRadius: '6px',
          border: '1px solid #fca5a5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px'
        }}>
          <span>❌</span>
          <span>{modalError}</span>
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={onClose}
          disabled={loading}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiSave size={14} />}
          onClick={handleSubmit}
          disabled={loading}
          loading={loading}
        >
          {loading ? 'Guardando...' : esEdicion ? 'Actualizar' : 'Guardar Cita'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  const getTitle = () => {
    if (esEdicion) return 'Editar Cita';
    const fechaStr = form.fecha ? formatearFechaLocal(form.fecha) : '';
    const horaStr = form.hora_inicio ? form.hora_inicio.slice(0,5) : '';
    return fechaStr && horaStr ? `Nueva Cita - ${fechaStr} a las ${horaStr}` : 'Nueva Cita';
  };

  return (
    <>
      {/* Modal de Cita */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={getTitle()}
        size="md"
        closeOnOverlayClick={false}
        closeOnEscape={true}
        footer={footer}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* FILA 1: Cédula y Paciente */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '0.95fr 2.1fr',
            gap: '12px',
            alignItems: 'end'
          }}>
            <div className="form-group">
              <label>Cédula *</label>
              {esEdicion ? (
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontFamily: 'monospace'
                }}>
                  {patientData?.document_number || searchTerm || 'No disponible'}
                </div>
              ) : (
                <Input
                  type="text"
                  value={searchTerm}
                  placeholder="0923456789"
                  maxLength={10}
                  onChange={(value) => {
                    const cleaned = value.replace(/\D/g, '');
                    setSearchTerm(cleaned);
                    if (cleaned.length === 10) {
                      buscarPacientePorCedula(cleaned);
                    } else {
                      setPatientData(null);
                      setForm(prev => ({ ...prev, patient_id: '' }));
                    }
                  }}
                  size="md"
                  style={{ fontFamily: 'monospace', fontSize: '15px', letterSpacing: '1px' }}
                />
              )}
            </div>

            <div className="form-group">
              <label>Paciente</label>
              <Input
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
                  color: patientData ? 'var(--text-primary)' : 'var(--text-dim)'
                }}
              />
            </div>
          </div>

          {/* FILA 2: Especialista */}
          <div className="form-group">
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
                  className="odonto-select"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    fontSize: '14px'
                  }}
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
                      <small style={{ color: '#6b7280' }}>⏳ Validando disponibilidad...</small>
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
                  <div style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>
                    Cargando especialistas disponibles...
                  </div>
                ) : listaEspecialistas.length === 0 ? (
                  <div style={{
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
                  <CustomCombobox
                    options={listaEspecialistas.map(e => ({ label: e.nombre, value: e.id }))}
                    value={form.especialista_id}
                    onChange={(val) => {
                      setForm(prev => ({ ...prev, especialista_id: val }));
                      if (originalData) setUserModifiedSchedule(true);
                    }}
                    placeholder="Seleccionar especialista"
                    filterable
                    forceDropup={false}
                  />
                )}
              </>
            )}
          </div>

          {/* FILA 3: Fecha, Hora y Duración */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 0.7fr',
            gap: '12px'
          }}>
            <div className="form-group">
              <label>
                <FiCalendar size={14} style={{ marginRight: 4 }} />
                Fecha *
              </label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(value) => {
                  setForm(prev => ({ ...prev, fecha: value }));
                  if (originalData) setUserModifiedSchedule(true);
                  if (!cita && value && form.hora_inicio) {
                    loadEspecialistasDisponibles(value, form.hora_inicio);
                  }
                }}
                required
                readOnly={vieneDeAgenda}
                disabled={vieneDeAgenda}
                size="md"
              />
            </div>
            <div className="form-group">
              <label>
                <FiClock size={14} style={{ marginRight: 4 }} />
                Hora *
              </label>
              <Input
                type="time"
                value={form.hora_inicio ? form.hora_inicio.slice(0, 5) : ''}
                onChange={(value) => {
                  if (value) {
                    const [h, m] = value.split(':').map(Number);
                    const horaFinDate = new Date();
                    horaFinDate.setHours(h, m + parseInt(form.duracion || 30), 0, 0);
                    const horaFin = horaFinDate.toTimeString().slice(0, 8);
                    setForm(prev => ({ ...prev, hora_inicio: value + ':00', hora_fin: horaFin }));
                    if (originalData) setUserModifiedSchedule(true);
                    if (!cita && form.fecha && value) {
                      loadEspecialistasDisponibles(form.fecha, value + ':00');
                    }
                  } else {
                    setForm(prev => ({ ...prev, hora_inicio: '', hora_fin: '' }));
                  }
                }}
                required
                step="900"
                readOnly={vieneDeAgenda}
                disabled={vieneDeAgenda}
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Duración</label>
              <CustomCombobox
                options={[
                  { label: '15 min', value: 15 },
                  { label: '30 min', value: 30 },
                  { label: '45 min', value: 45 },
                  { label: '60 min', value: 60 },
                  { label: '90 min', value: 90 },
                  { label: '120 min', value: 120 }
                ]}
                value={form.duracion}
                onChange={(val) => {
                  setForm(prev => ({ ...prev, duracion: val }));
                  if (originalData) setUserModifiedSchedule(true);
                }}
                placeholder="Duración"
                filterable={false}
                forceDropup={false}
              />
            </div>
          </div>

          {/* FILA 4: Tratamiento y Motivo */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px'
          }}>
            <div className="form-group">
              <label>
                <FiActivity size={14} style={{ marginRight: 4 }} />
                Tratamiento
              </label>
              <CustomCombobox
                options={tratamientos.map(t => ({
                  label: `${t.name}${t.duration_minutes ? ` (${t.duration_minutes} min)` : ''}`,
                  value: t.id
                }))}
                value={form.tratamiento_id}
                onChange={(val) => setForm(prev => ({ ...prev, tratamiento_id: val }))}
                placeholder="Seleccionar tratamiento"
                filterable
                forceDropup={false}
              />
            </div>
            <div className="form-group">
              <label>Motivo de Consulta</label>
              <CustomCombobox
                options={motivos.map(m => ({
                  label: `${m.nombre}${m.duracion ? ` (${m.duracion} min)` : ''}`,
                  value: m.id
                }))}
                value={form.motivo_id}
                onChange={(val) => setForm(prev => ({ ...prev, motivo_id: val }))}
                placeholder="Seleccionar motivo"
                filterable
                forceDropup={false}
              />
            </div>
          </div>

          {/* FILA 5: Notas y Estado */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: esEdicion ? '1.75fr 0.25fr' : '1fr',
            gap: '12px'
          }}>
            <div className="form-group">
              <label>Notas</label>
              <Input
                type="textarea"
                value={form.notas}
                onChange={(val) => setForm(prev => ({ ...prev, notas: val }))}
                placeholder="Observaciones de la cita..."
                rows={3}
                size="md"
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>
            {esEdicion && (
              <div className="form-group">
                <label>Estado</label>
                <CustomCombobox
                  options={[
                    { label: 'Programada', value: 'scheduled' },
                    { label: 'Confirmada', value: 'confirmed' },
                    { label: 'En curso', value: 'in_progress' },
                    { label: 'Completada', value: 'completed' },
                    { label: 'Cancelada', value: 'cancelled' },
                    { label: 'No asistió', value: 'no_show' }
                  ]}
                  value={form.status}
                  onChange={(val) => setForm(prev => ({ ...prev, status: val }))}
                  placeholder="Estado"
                  filterable={false}
                  forceDropup={false}
                />
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de Paciente (para registro rápido) */}
      <PacienteModal
        isOpen={showPacienteModal}
        onClose={() => {
          setShowPacienteModal(false);
          setCedulaParaRegistrar('');
        }}
        paciente={null}
        onSave={handleSavePaciente}
        loading={savingPaciente}
        initialDocumentNumber={cedulaParaRegistrar}
      />
    </>
  );
}