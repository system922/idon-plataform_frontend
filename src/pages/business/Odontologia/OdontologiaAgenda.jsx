import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiPlus,
  FiEdit,
  FiTrash2,
  FiX,
  FiSearch,
  FiCalendar,
  FiUserCheck,
  FiRefreshCw,
  FiVolume2,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';
import PageTemplate from '../../../components/PageTemplate';
import {
  CitaModal,
  CitaDetailModal,
  CitaStats,
} from '../../../components/Odontologia/Citas/index';

import '../../../styles/Odontologia/index.css';

export default function OdontologiaAgenda() {
  const navigate = useNavigate();

  // ============================================================
  // ESTADOS
  // ============================================================

  const [citas, setCitas] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const [selectedEspecialista, setSelectedEspecialista] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [selectedCita, setSelectedCita] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');

  const [currentDate, setCurrentDate] = useState(new Date());

  const [showLlamadaModal, setShowLlamadaModal] = useState(false);
  const [pacienteLlamado, setPacienteLlamado] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);

  const [verificandoDisponibilidad, setVerificandoDisponibilidad] =
    useState(false);

  const [showDisponibilidadModal, setShowDisponibilidadModal] =
    useState(false);

  const [mensajeDisponibilidad, setMensajeDisponibilidad] = useState(null);

  // ============================================================
  // HELPERS PARA NORMALIZAR RESPUESTAS
  // ============================================================

  const obtenerArrayRespuesta = (data, claves = []) => {
    if (Array.isArray(data)) {
      return data;
    }

    for (const clave of claves) {
      if (Array.isArray(data?.[clave])) {
        return data[clave];
      }
    }

    if (Array.isArray(data?.data)) {
      return data.data;
    }

    return [];
  };

  const obtenerMensajeError = (data, fallback) => {
    return (
      data?.error ||
      data?.message ||
      data?.detail ||
      fallback
    );
  };

  // ============================================================
  // CARGAR ESPECIALISTAS
  // ============================================================

  async function cargarEspecialistas() {
    try {
      const res = await fetchWithAuth(
        '/odontologia/especialistas'
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            `Error HTTP ${res.status}`
          )
        );
      }

      const especialistasList = obtenerArrayRespuesta(data, [
        'especialistas',
      ]);

      setEspecialistas(especialistasList);

      // Seleccionar automáticamente el primer especialista
      if (
        especialistasList.length > 0 &&
        !selectedEspecialista
      ) {
        setSelectedEspecialista(
          especialistasList[0].id
        );
      }

      return especialistasList;
    } catch (err) {
      console.error(
        '❌ [Agenda] Error cargando especialistas:',
        err
      );

      throw err;
    }
  }

  // ============================================================
  // CARGAR CITAS
  // ============================================================

  async function cargarCitas() {
    try {
      const res = await fetchWithAuth(
        '/odontologia/citas'
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            `Error HTTP ${res.status}`
          )
        );
      }

      const citasList = obtenerArrayRespuesta(data, [
        'citas',
      ]);

      setCitas(citasList);

      return citasList;
    } catch (err) {
      console.error(
        '❌ [Agenda] Error cargando citas:',
        err
      );

      throw err;
    }
  }

  // ============================================================
  // CARGAR ESTADÍSTICAS
  // ============================================================

  async function cargarEstadisticas(citasActuales = []) {
    const statsIniciales = {
      total: 0,
      scheduled: 0,
      confirmed: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    try {
      const res = await fetchWithAuth(
        '/odontologia/citas/stats'
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            `Error HTTP ${res.status}`
          )
        );
      }

      let resultado = {
        ...statsIniciales,
      };

      if (data?.success && data?.data) {
        resultado = {
          ...resultado,
          ...data.data,
        };
      } else if (data?.data) {
        resultado = {
          ...resultado,
          ...data.data,
        };
      } else {
        resultado = {
          ...resultado,
          ...data,
        };
      }

      /*
       * Si el backend no devuelve estadísticas válidas,
       * las calculamos usando las citas que ya tenemos.
       */
      if (
        Number(resultado.total) === 0 &&
        citasActuales.length > 0
      ) {
        resultado = calcularEstadisticas(citasActuales);
      }

      setStats(resultado);

      return resultado;
    } catch (err) {
      console.warn(
        '⚠️ [Agenda] No se pudieron cargar estadísticas. Calculando localmente.'
      );

      const resultado = calcularEstadisticas(
        citasActuales
      );

      setStats(resultado);

      return resultado;
    }
  }

  // ============================================================
  // CALCULAR ESTADÍSTICAS LOCALMENTE
  // ============================================================

  function calcularEstadisticas(lista = []) {
    return {
      total: lista.length,

      scheduled: lista.filter(
        (c) => c.status === 'scheduled'
      ).length,

      confirmed: lista.filter(
        (c) => c.status === 'confirmed'
      ).length,

      in_progress: lista.filter(
        (c) => c.status === 'in_progress'
      ).length,

      completed: lista.filter(
        (c) => c.status === 'completed'
      ).length,

      cancelled: lista.filter(
        (c) => c.status === 'cancelled'
      ).length,

      no_show: lista.filter(
        (c) => c.status === 'no_show'
      ).length,
    };
  }

  // ============================================================
  // CARGA GENERAL
  // ============================================================

  async function cargarDatos() {
    if (loading) return;

    try {
      setLoading(true);
      setError(null);

      /*
       * Igual que TakeOrderPageNew:
       *
       * 1. cargar datos principales
       * 2. transformar/normalizar
       * 3. guardar en estados
       */

      const [
        especialistasData,
        citasData,
      ] = await Promise.all([
        cargarEspecialistas(),
        cargarCitas(),
      ]);

      await cargarEstadisticas(citasData);

      console.log(
        '✅ [Agenda] Datos cargados correctamente',
        {
          especialistas:
            especialistasData.length,
          citas:
            citasData.length,
        }
      );
    } catch (err) {
      console.error(
        '❌ [Agenda] Error cargando datos:',
        err
      );

      setError(
        err?.message ||
        'Error al cargar los datos'
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // CARGA INICIAL
  // ============================================================

  useEffect(() => {
    cargarDatos();
  }, []);

  // ============================================================
  // VERIFICAR DISPONIBILIDAD
  // ============================================================

  async function verificarDisponibilidadSlot(
    fecha,
    hora
  ) {
    try {
      setVerificandoDisponibilidad(true);
      setShowDisponibilidadModal(false);
      setMensajeDisponibilidad(null);

      const [h, m] = hora
        .split(':')
        .map(Number);

      const horaFinDate = new Date();

      horaFinDate.setHours(
        h,
        m + 30,
        0,
        0
      );

      const horaFin =
        horaFinDate
          .toTimeString()
          .slice(0, 8);

      const url =
        `/odontologia/citas/especialistas-disponibles` +
        `?fecha=${encodeURIComponent(fecha)}` +
        `&hora_inicio=${encodeURIComponent(hora)}` +
        `&hora_fin=${encodeURIComponent(horaFin)}`;

      console.log(
        '📡 [Agenda] Consultando disponibilidad:',
        url
      );

      const res = await fetchWithAuth(url);

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            `Error HTTP ${res.status}`
          )
        );
      }

      const disponibles =
        obtenerArrayRespuesta(data, [
          'especialistas',
          'disponibles',
        ]);

      console.log(
        '📦 [Agenda] Especialistas disponibles:',
        disponibles
      );

      if (disponibles.length > 0) {
        setSelectedDate(fecha);
        setSelectedHour(hora);
        setSelectedCita(null);
        setShowModal(true);
        setError(null);
        return disponibles;
      }

      const fechaObj = new Date(
        `${fecha}T${hora}:00`
      );

      const fechaFormateada =
        fechaObj.toLocaleString(
          'es-EC',
          {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }
        );

      setMensajeDisponibilidad({
        tipo: 'error',
        titulo: '⏰ No hay disponibilidad',
        mensaje:
          `No hay especialistas disponibles para el ${fechaFormateada}.`,
        detalles:
          'Por favor, selecciona otra fecha u horario disponible.',
      });

      setShowDisponibilidadModal(true);

      return [];
    } catch (err) {
      console.error(
        '❌ [Agenda] Error verificando disponibilidad:',
        err
      );

      setMensajeDisponibilidad({
        tipo: 'error',
        titulo: '❌ Error',
        mensaje:
          'Error al verificar disponibilidad.',
        detalles:
          err?.message ||
          'Intenta nuevamente o contacta al administrador.',
      });

      setShowDisponibilidadModal(true);

      return [];
    } finally {
      setVerificandoDisponibilidad(false);
    }
  }

  // ============================================================
  // SEMANA
  // ============================================================

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);

    const day = d.getDay();

    const diff =
      d.getDate() -
      day +
      (day === 0 ? -6 : 1);

    d.setDate(diff);
    d.setHours(0, 0, 0, 0);

    return d;
  }, [currentDate]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);

    d.setDate(
      d.getDate() + 6
    );

    d.setHours(
      23,
      59,
      59,
      999
    );

    return d;
  }, [weekStart]);

  const daysOfWeek = useMemo(() => {
    const days = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);

      d.setDate(
        d.getDate() + i
      );

      days.push(d);
    }

    return days;
  }, [weekStart]);

  const horas = useMemo(() => {
    const hs = [];

    for (let h = 8; h <= 20; h++) {
      hs.push(
        `${h
          .toString()
          .padStart(2, '0')}:00`
      );

      if (h < 20) {
        hs.push(
          `${h
            .toString()
            .padStart(2, '0')}:30`
        );
      }
    }

    return hs;
  }, []);

  // ============================================================
  // FILTRAR CITAS
  // ============================================================

  const filteredCitas = useMemo(() => {
    return citas.filter((cita) => {
      const cDate = new Date(
        cita.fecha
      );

      const isInWeek =
        cDate >= weekStart &&
        cDate <= weekEnd;

      if (!isInWeek) {
        return false;
      }

      const matchEspecialista =
        !selectedEspecialista ||
        String(cita.especialista_id) ===
          String(selectedEspecialista);

      const textoBusqueda =
        searchTerm
          .trim()
          .toLowerCase();

      if (!textoBusqueda) {
        return matchEspecialista;
      }

      const nombrePaciente =
        cita.paciente_nombre || '';

      const tratamiento =
        cita.tratamiento_nombre || '';

      const especialista =
        cita.especialista_nombre || '';

      const matchSearch =
        nombrePaciente
          .toLowerCase()
          .includes(textoBusqueda) ||

        tratamiento
          .toLowerCase()
          .includes(textoBusqueda) ||

        especialista
          .toLowerCase()
          .includes(textoBusqueda);

      return (
        matchEspecialista &&
        matchSearch
      );
    });
  }, [
    citas,
    weekStart,
    weekEnd,
    selectedEspecialista,
    searchTerm,
  ]);

  // ============================================================
  // GUARDAR CITA
  // ============================================================

  async function handleSave(formData) {
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const esEdicion =
        Boolean(selectedCita?.id);

      const url = esEdicion
        ? `/odontologia/citas/${selectedCita.id}`
        : '/odontologia/citas';

      const method = esEdicion
        ? 'PUT'
        : 'POST';

      console.log(
        `📤 [Agenda] ${method} ${url}`,
        formData
      );

      const res =
        await fetchWithAuth(url, {
          method,
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify(
            formData
          ),
        });

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error al guardar la cita'
          )
        );
      }

      if (
        data?.success === false
      ) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error al guardar la cita'
          )
        );
      }

      /*
       * IMPORTANTE:
       * No modificamos citas manualmente después
       * del POST/PUT.
       *
       * Volvemos a consultar el backend.
       *
       * Esto mantiene frontend y backend sincronizados.
       */
      await cargarDatos();

      setShowModal(false);
      setSelectedCita(null);
      setSelectedDate(null);
      setSelectedHour(null);

      alert(
        data?.message ||
        'Cita guardada correctamente'
      );

      return data?.data || data;
    } catch (err) {
      console.error(
        '❌ [Agenda] Error guardando cita:',
        err
      );

      setError(
        err?.message ||
        'Error al guardar la cita'
      );

      alert(
        err?.message ||
        'Error al guardar la cita'
      );

      throw err;
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // EDITAR
  // ============================================================

  function handleEdit(cita) {
    if (showDetailModal) {
      setShowDetailModal(false);
    }

    setSelectedCita(cita);
    setSelectedDate(null);
    setSelectedHour(null);
    setShowModal(true);
    setError(null);
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async function handleDelete(id) {
    if (
      !window.confirm(
        '¿Está seguro de eliminar esta cita? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url =
        `/odontologia/citas/${id}`;

      console.log(
        `🗑️ [Agenda] DELETE ${url}`
      );

      const res =
        await fetchWithAuth(
          url,
          {
            method: 'DELETE',
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error al eliminar la cita'
          )
        );
      }

      if (
        data?.success === false
      ) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error al eliminar la cita'
          )
        );
      }

      /*
       * Volvemos a obtener los datos reales
       * del backend.
       */
      await cargarDatos();

      alert(
        data?.message ||
        'Cita eliminada correctamente'
      );

      return {
        success: true,
      };
    } catch (err) {
      console.error(
        '❌ [Agenda] Error eliminando cita:',
        err
      );

      setError(
        err?.message ||
        'Error al eliminar la cita'
      );

      alert(
        err?.message ||
        'Error al eliminar la cita'
      );

      return {
        success: false,
        error:
          err?.message ||
          'Error al eliminar la cita',
      };
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // VER DETALLE
  // ============================================================

  function handleView(cita) {
    setSelectedCita(cita);
    setShowDetailModal(true);
  }

  // ============================================================
  // CERRAR MODAL
  // ============================================================

  function closeModal() {
    setShowModal(false);
    setSelectedCita(null);
    setSelectedDate(null);
    setSelectedHour(null);
    setError(null);
  }

  function closeDetailModal() {
    setShowDetailModal(false);
    setSelectedCita(null);
  }

  // ============================================================
  // ACTUALIZAR ESTADO
  // ============================================================

  async function updateStatus(
    id,
    newStatus
  ) {
    /*
     * Guardamos el estado anterior para poder
     * revertirlo si la API falla.
     */
    const citasAnteriores = citas;

    // Actualización optimista
    setCitas((prev) =>
      prev.map((cita) =>
        cita.id === id
          ? {
              ...cita,
              status: newStatus,
            }
          : cita
      )
    );

    try {
      const res =
        await fetchWithAuth(
          `/odontologia/citas/${id}/status`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              status: newStatus,
            }),
          }
        );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error actualizando estado'
          )
        );
      }

      if (
        data?.success === false
      ) {
        throw new Error(
          obtenerMensajeError(
            data,
            'Error actualizando estado'
          )
        );
      }

      /*
       * Recargamos estadísticas y citas
       * para garantizar sincronización.
       */
      await cargarCitas();

      /*
       * Las estadísticas también vienen del backend.
       */
      await cargarEstadisticas(
        citas
      );
    } catch (err) {
      console.error(
        '❌ [Agenda] Error actualizando estado:',
        err
      );

      // Revertir estado
      setCitas(citasAnteriores);

      setError(
        err?.message ||
        'Error actualizando estado'
      );
    }
  }

  // ============================================================
  // ATENDER CITA
  // ============================================================

  function handleAtender(cita) {
    if (!cita?.id) {
      alert(
        'Error: Cita no válida'
      );

      return;
    }

    console.log(
      '📋 [Agenda] Atendiendo cita:',
      cita.id,
      cita.paciente_nombre
    );

    if (
      cita.status === 'confirmed' ||
      cita.status === 'scheduled'
    ) {
      updateStatus(
        cita.id,
        'in_progress'
      );
    }

    navigate(
      `/app/odontologia/atencion/${cita.id}`
    );
  }

  // ============================================================
  // LLAMAR PACIENTE
  // ============================================================

  function handleLlamar(cita) {
    const nombre =
      cita.paciente_nombre ||
      'Paciente';

    setPacienteLlamado({
      nombre,
    });

    setShowLlamadaModal(true);

    const mensaje =
      `Siguiente paciente ${nombre}, pase por favor`;

    if (
      'speechSynthesis' in window
    ) {
      const utterance =
        new SpeechSynthesisUtterance(
          mensaje
        );

      utterance.lang =
        'es-ES';

      utterance.rate = 0.9;
      utterance.pitch = 1;

      window.speechSynthesis.speak(
        utterance
      );

      setTimeout(() => {
        window.speechSynthesis.speak(
          utterance
        );
      }, 3000);
    }

    setTimeout(() => {
      setShowLlamadaModal(false);
      setPacienteLlamado(null);
    }, 6000);
  }

  // ============================================================
  // COLORES / LABELS
  // ============================================================

  function getStatusColor(status) {
    const map = {
      scheduled: '#facc15',
      confirmed: '#4ade80',
      in_progress: '#3b82f6',
      completed: '#9ca3af',
      cancelled: '#ef4444',
      no_show: '#f59e0b',
    };

    return (
      map[status] ||
      '#9ca3af'
    );
  }

  function getStatusLabel(status) {
    const map = {
      scheduled: 'Programada',
      confirmed: 'Confirmada',
      in_progress: 'En curso',
      completed: 'Completada',
      cancelled: 'Cancelada',
      no_show: 'No asistió',
    };

    return (
      map[status] ||
      status
    );
  }

  // ============================================================
  // OBTENER CITAS DE SLOT
  // ============================================================

  function getCitasForSlot(
    day,
    hora
  ) {
    const [h, m] =
      hora
        .split(':')
        .map(Number);

    const slotTime =
      new Date(day);

    slotTime.setHours(
      h,
      m,
      0,
      0
    );

    const slotEnd =
      new Date(slotTime);

    slotEnd.setMinutes(
      slotEnd.getMinutes() + 30
    );

    return filteredCitas.filter(
      (cita) => {
        const cHora =
          cita.hora_inicio
            ? cita.hora_inicio
                .split(':')
                .map(Number)
            : [0, 0];

        const cDateStart =
          new Date(cita.fecha);

        cDateStart.setHours(
          cHora[0] || 0,
          cHora[1] || 0,
          0,
          0
        );

        const duracion =
          Number(cita.duracion) ||
          30;

        const cDateEnd =
          new Date(
            cDateStart
          );

        cDateEnd.setMinutes(
          cDateEnd.getMinutes() +
            duracion
        );

        return (
          (
            cDateStart >= slotTime &&
            cDateStart < slotEnd
          ) ||
          (
            cDateStart < slotTime &&
            cDateEnd > slotTime
          )
        );
      }
    );
  }

  // ============================================================
  // NAVEGACIÓN
  // ============================================================

  function goPrevWeek() {
    const d =
      new Date(currentDate);

    d.setDate(
      d.getDate() - 7
    );

    setCurrentDate(d);
  }

  function goNextWeek() {
    const d =
      new Date(currentDate);

    d.setDate(
      d.getDate() + 7
    );

    setCurrentDate(d);
  }

  function goToday() {
    setCurrentDate(
      new Date()
    );
  }

  // ============================================================
  // RENDER DE CITA
  // ============================================================

  function renderCitaBlock(cita) {
    const nombre =
      cita.paciente_nombre ||
      '—';

    const trat =
      cita.tratamiento_nombre ||
      '—';

    const color =
      getStatusColor(
        cita.status
      );

    const isLlamando =
      showLlamadaModal &&
      pacienteLlamado?.nombre ===
        nombre;

    return (
      <div
        key={cita.id}
        className="odonto-agenda-cita"
        style={{
          background:
            color + '22',
          borderLeft:
            `4px solid ${color}`,
          padding:
            '6px 8px',
          borderRadius: 6,
          fontSize: 12,
          marginBottom: 4,
          cursor: 'pointer',
          transition:
            'all 0.2s',
          boxShadow:
            '0 2px 4px rgba(0,0,0,0.06)',
          display: 'flex',
          flexDirection:
            'column',
          gap: 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleView(cita);
        }}
        title={`${nombre} - ${trat} (${getStatusLabel(
          cita.status
        )})`}
      >
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems:
              'center',
            fontWeight: 600,
            color: '#0f172a',
            fontSize: 13,
          }}
        >
          <span
            style={{
              color: '#1e293b',
              fontWeight: 700,
              letterSpacing:
                '0.3px',
            }}
          >
            {nombre}
          </span>

          <span
            style={{
              display:
                'inline-block',
              width: 12,
              height: 12,
              borderRadius:
                '50%',
              background: color,
              flexShrink: 0,
              marginLeft: 6,
              border:
                '2px solid rgba(255,255,255,0.6)',
              boxShadow:
                '0 2px 4px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        <div
          style={{
            fontSize: 11,
            color: '#475569',
            fontWeight: 400,
            marginTop: 1,
          }}
        >
          {trat}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 4,
            marginTop: 4,
            justifyContent:
              'space-between',
          }}
        >
          {cita.status !==
            'completed' &&
            cita.status !==
              'cancelled' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLlamar(
                      cita
                    );
                  }}
                  className="odonto-btn-icon"
                  title="Llamar"
                  style={{
                    flex: 1,
                    background:
                      isLlamando
                        ? '#4ade80'
                        : 'rgba(0,0,0,0.04)',
                    border: 'none',
                    cursor:
                      'pointer',
                    padding:
                      '6px 0',
                    borderRadius: 4,
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    minWidth:
                      '32px',
                    height:
                      '32px',
                    color:
                      isLlamando
                        ? '#fff'
                        : '#475569',
                  }}
                >
                  <FiVolume2
                    size={16}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAtender(
                      cita
                    );
                  }}
                  className="odonto-btn-icon"
                  title="Atender"
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor:
                      'pointer',
                    padding:
                      '6px 0',
                    borderRadius: 4,
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    background:
                      'rgba(0,0,0,0.04)',
                    minWidth:
                      '32px',
                    height:
                      '32px',
                    color:
                      '#475569',
                  }}
                >
                  <FiUserCheck
                    size={16}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(
                      cita
                    );
                  }}
                  className="odonto-btn-icon"
                  title="Editar"
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor:
                      'pointer',
                    padding:
                      '6px 0',
                    borderRadius: 4,
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    background:
                      'rgba(0,0,0,0.04)',
                    minWidth:
                      '32px',
                    height:
                      '32px',
                    color:
                      '#475569',
                  }}
                >
                  <FiEdit
                    size={16}
                  />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(
                      cita.id
                    );
                  }}
                  className="odonto-btn-icon"
                  title="Eliminar"
                  style={{
                    flex: 1,
                    border: 'none',
                    cursor:
                      'pointer',
                    padding:
                      '6px 0',
                    borderRadius: 4,
                    display:
                      'inline-flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    background:
                      'rgba(0,0,0,0.04)',
                    minWidth:
                      '32px',
                    height:
                      '32px',
                    color:
                      '#ef4444',
                  }}
                >
                  <FiTrash2
                    size={16}
                  />
                </button>
              </>
            )}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <PageTemplate
      title="Agenda Odontológica"
      subtitle="Agenda semanal de citas"
      loading={loading}
      icon={
        <FiCalendar
          size={24}
        />
      }
      headerAction={
        <div className="odonto-header-actions">

          <div className="odonto-search-wrapper">
            <FiSearch
              className="odonto-search-icon"
            />

            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar paciente o tratamiento..."
              value={searchTerm}
              onChange={(e) =>
                setSearchTerm(
                  e.target.value
                )
              }
            />

            {searchTerm && (
              <button
                className="odonto-search-clear"
                onClick={() =>
                  setSearchTerm('')
                }
                type="button"
              >
                <FiX size={16} />
              </button>
            )}
          </div>

          <button
            className="odonto-btn-primary"
            onClick={() => {
              setSelectedCita(
                null
              );
              setSelectedDate(
                null
              );
              setSelectedHour(
                null
              );
              setShowModal(
                true
              );
              setError(null);
            }}
          >
            <FiPlus size={18} />
            Nueva Cita
          </button>

          <button
            className="odonto-btn-secondary"
            onClick={
              cargarDatos
            }
            title="Recargar"
            disabled={loading}
          >
            <FiRefreshCw
              size={18}
              className={
                loading
                  ? 'spin'
                  : ''
              }
            />
          </button>

        </div>
      }
    >

      {error && (
        <div
          className="odonto-alert error"
          style={{
            marginBottom: 16,
          }}
        >
          <span>
            ❌ {error}
          </span>
        </div>
      )}

      {verificandoDisponibilidad && (
        <div
          className="odonto-alert info"
          style={{
            marginBottom: 16,
            padding:
              '12px 16px',
            borderRadius: 8,
            background:
              '#eff6ff',
            border:
              '1px solid #bfdbfe',
            display: 'flex',
            alignItems:
              'center',
            gap: '10px',
          }}
        >
          <span>
            ⏳
          </span>

          <span>
            Verificando disponibilidad de especialistas...
          </span>
        </div>
      )}

      <CitaStats
        stats={stats}
        citas={citas}
      />

      {/* ========================================================
          FILTROS
      ======================================================== */}

      <div className="odonto-filters-row">

        <div className="odonto-filter-group">

          <label>
            Especialista:
          </label>

          <select
            className="odonto-filter-select"
            value={
              selectedEspecialista
            }
            onChange={(e) =>
              setSelectedEspecialista(
                e.target.value
              )
            }
          >
            <option value="">
              Todos
            </option>

            {especialistas.map(
              (especialista) => (
                <option
                  key={
                    especialista.id
                  }
                  value={
                    especialista.id
                  }
                >
                  {
                    especialista.nombre
                  }
                </option>
              )
            )}
          </select>

        </div>

        <div className="odonto-agenda-nav">

          <button
            onClick={
              goPrevWeek
            }
            className="odonto-btn-icon"
          >
            <FiChevronLeft
              size={18}
            />
          </button>

          <button
            onClick={goToday}
            className="odonto-btn-secondary"
            style={{
              fontSize:
                '13px',
              padding:
                '4px 12px',
            }}
          >
            Hoy
          </button>

          <button
            onClick={
              goNextWeek
            }
            className="odonto-btn-icon"
          >
            <FiChevronRight
              size={18}
            />
          </button>

          <span className="odonto-agenda-week-label">
            {weekStart.toLocaleDateString(
              'es-EC',
              {
                day: '2-digit',
                month: 'short',
              }
            )}
            {' - '}
            {weekEnd.toLocaleDateString(
              'es-EC',
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }
            )}
          </span>

        </div>

        <div className="odonto-filter-stats">
          <span>
            Mostrando:{' '}
            {
              filteredCitas.length
            }{' '}
            de{' '}
            {citas.length}{' '}
            citas
          </span>
        </div>

      </div>

      {/* ========================================================
          AGENDA
      ======================================================== */}

      <div className="odonto-agenda-container">

        <div className="odonto-agenda-grid">

          <div className="odonto-agenda-header odonto-agenda-corner" />

          {daysOfWeek.map(
            (day, idx) => {
              const isToday =
                day.toDateString() ===
                new Date().toDateString();

              const dayNames = [
                'Lun',
                'Mar',
                'Mié',
                'Jue',
                'Vie',
                'Sáb',
                'Dom',
              ];

              return (
                <div
                  key={idx}
                  className={`odonto-agenda-header ${
                    isToday
                      ? 'today'
                      : ''
                  }`}
                >
                  <div className="day-name">
                    {
                      dayNames[
                        idx
                      ]
                    }
                  </div>

                  <div className="day-number">
                    {
                      day.getDate()
                    }
                  </div>
                </div>
              );
            }
          )}

          {horas.map(
            (hora) => (
              <React.Fragment
                key={hora}
              >

                <div className="odonto-agenda-hour">
                  {hora}
                </div>

                {daysOfWeek.map(
                  (
                    day,
                    colIdx
                  ) => {

                    const citasEnSlot =
                      getCitasForSlot(
                        day,
                        hora
                      );

                    const hayCitas =
                      citasEnSlot.length >
                      0;

                    return (
                      <div
                        key={
                          colIdx
                        }
                        className="odonto-agenda-slot"
                        onClick={() => {

                          if (
                            hayCitas
                          ) {
                            const fechaFormateada =
                              new Date(
                                day
                              ).toLocaleDateString(
                                'es-EC',
                                {
                                  weekday:
                                    'long',
                                  day:
                                    '2-digit',
                                  month:
                                    'long',
                                }
                              );

                            setMensajeDisponibilidad(
                              {
                                tipo:
                                  'error',
                                titulo:
                                  '⚠️ Horario ocupado',
                                mensaje:
                                  `Este horario (${hora}) ya tiene una cita asignada.`,
                                detalles:
                                  `Fecha: ${fechaFormateada}`,
                              }
                            );

                            setShowDisponibilidadModal(
                              true
                            );

                            return;
                          }

                          const year =
                            day.getFullYear();

                          const month =
                            String(
                              day.getMonth() +
                                1
                            ).padStart(
                              2,
                              '0'
                            );

                          const dayNum =
                            String(
                              day.getDate()
                            ).padStart(
                              2,
                              '0'
                            );

                          const fechaStr =
                            `${year}-${month}-${dayNum}`;

                          verificarDisponibilidadSlot(
                            fechaStr,
                            hora
                          );
                        }}
                        style={{
                          cursor:
                            hayCitas
                              ? 'not-allowed'
                              : 'pointer',
                          opacity:
                            hayCitas
                              ? 0.6
                              : 1,
                        }}
                      >

                        {citasEnSlot.map(
                          (cita) =>
                            renderCitaBlock(
                              cita
                            )
                        )}

                        {!hayCitas && (
                          <div
                            style={{
                              fontSize:
                                '10px',
                              color:
                                '#94a3b8',
                              textAlign:
                                'center',
                              padding:
                                '4px 0',
                              opacity:
                                0.5,
                            }}
                          >
                            Disponible
                          </div>
                        )}

                      </div>
                    );
                  }
                )}

              </React.Fragment>
            )
          )}

        </div>
      </div>

      {/* ========================================================
          MODAL CITA
      ======================================================== */}

      <CitaModal
        isOpen={
          showModal
        }
        onClose={
          closeModal
        }
        cita={
          selectedCita
        }
        onSave={
          handleSave
        }
        loading={
          saving
        }
        selectedDate={
          selectedDate
        }
        selectedHour={
          selectedHour
        }
        especialistas={
          especialistas
        }
      />

      {/* ========================================================
          MODAL DETALLE
      ======================================================== */}

      <CitaDetailModal
        isOpen={
          showDetailModal
        }
        onClose={
          closeDetailModal
        }
        cita={
          selectedCita
        }
        onEdit={
          handleEdit
        }
        onAtender={
          handleAtender
        }
        onLlamar={
          handleLlamar
        }
        onStatusChange={
          updateStatus
        }
        onDelete={
          handleDelete
        }
      />

      {/* ========================================================
          MODAL DISPONIBILIDAD
      ======================================================== */}

      {showDisponibilidadModal &&
        mensajeDisponibilidad && (
          <div
            className="odonto-modal-overlay"
            onClick={() =>
              setShowDisponibilidadModal(
                false
              )
            }
          >
            <div
              className="odonto-modal"
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                maxWidth: 500,
              }}
            >
              <div
                className="odonto-modal-header"
                style={{
                  borderBottom:
                    'none',
                  padding:
                    '20px 24px 0',
                  background:
                    mensajeDisponibilidad.tipo ===
                    'error'
                      ? '#fef2f2'
                      : '#eff6ff',
                }}
              >
                <button
                  className="odonto-modal-close"
                  onClick={() =>
                    setShowDisponibilidadModal(
                      false
                    )
                  }
                >
                  <FiX
                    size={24}
                  />
                </button>
              </div>

              <div
                className="odonto-modal-body"
                style={{
                  padding:
                    '20px 24px 24px',
                  textAlign:
                    'center',
                  background:
                    mensajeDisponibilidad.tipo ===
                    'error'
                      ? '#fef2f2'
                      : '#eff6ff',
                }}
              >
                <div
                  style={{
                    fontSize:
                      48,
                    marginBottom:
                      12,
                  }}
                >
                  {mensajeDisponibilidad.tipo ===
                  'error'
                    ? '⏰'
                    : 'ℹ️'}
                </div>

                <h3
                  style={{
                    color:
                      mensajeDisponibilidad.tipo ===
                      'error'
                        ? '#991b1b'
                        : '#1e40af',
                    fontSize:
                      20,
                    fontWeight:
                      700,
                    marginBottom:
                      8,
                  }}
                >
                  {
                    mensajeDisponibilidad.titulo
                  }
                </h3>

                <p
                  style={{
                    color:
                      mensajeDisponibilidad.tipo ===
                      'error'
                        ? '#7f1d1d'
                        : '#1e3a5f',
                    fontSize:
                      16,
                    marginBottom:
                      8,
                  }}
                >
                  {
                    mensajeDisponibilidad.mensaje
                  }
                </p>

                {mensajeDisponibilidad.detalles && (
                  <p
                    style={{
                      color:
                        mensajeDisponibilidad.tipo ===
                        'error'
                          ? '#991b1b'
                          : '#1e40af',
                      fontSize:
                        14,
                      opacity:
                        0.8,
                      marginBottom:
                        16,
                    }}
                  >
                    {
                      mensajeDisponibilidad.detalles
                    }
                  </p>
                )}

                <button
                  className="odonto-btn-primary"
                  onClick={() =>
                    setShowDisponibilidadModal(
                      false
                    )
                  }
                  style={{
                    background:
                      mensajeDisponibilidad.tipo ===
                      'error'
                        ? '#dc2626'
                        : '#2563eb',
                    padding:
                      '10px 32px',
                    borderRadius:
                      8,
                    border:
                      'none',
                    color:
                      '#fff',
                    fontSize:
                      15,
                    fontWeight:
                      600,
                    cursor:
                      'pointer',
                  }}
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ========================================================
          MODAL LLAMADA
      ======================================================== */}

      {showLlamadaModal &&
        pacienteLlamado && (
          <div
            className="odonto-modal-overlay"
            onClick={() =>
              setShowLlamadaModal(
                false
              )
            }
          >
            <div
              className="odonto-modal odonto-modal-llamada"
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                maxWidth:
                  420,
                background:
                  'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
                border:
                  '1px solid rgba(74, 222, 128, 0.15)',
                boxShadow:
                  '0 30px 80px rgba(0,0,0,0.6)',
                borderRadius:
                  '20px',
                overflow:
                  'hidden',
              }}
            >
              <div
                className="odonto-modal-body"
                style={{
                  textAlign:
                    'center',
                  padding:
                    '32px 24px',
                  background:
                    'transparent',
                }}
              >
                <FiVolume2
                  size={48}
                  color="#4ade80"
                />

                <p
                  style={{
                    color:
                      'rgba(255,255,255,0.5)',
                    fontSize:
                      13,
                    marginTop:
                      16,
                    letterSpacing:
                      2,
                    textTransform:
                      'uppercase',
                  }}
                >
                  Siguiente paciente
                </p>

                <p
                  style={{
                    color:
                      '#4ade80',
                    fontSize:
                      32,
                    fontWeight:
                      700,
                    margin:
                      '8px 0 16px',
                  }}
                >
                  {
                    pacienteLlamado.nombre
                  }
                </p>

                <p
                  style={{
                    color:
                      'rgba(255,255,255,0.6)',
                    fontSize:
                      16,
                  }}
                >
                  por favor,
                  acérquese a
                  la consulta
                </p>

                <button
                  className="odonto-btn-primary"
                  onClick={() =>
                    setShowLlamadaModal(
                      false
                    )
                  }
                  style={{
                    marginTop:
                      20,
                    background:
                      'linear-gradient(135deg, #4ade80, #22c55e)',
                    border:
                      'none',
                    padding:
                      '10px 28px',
                    borderRadius:
                      10,
                    color:
                      '#fff',
                    fontSize:
                      14,
                    fontWeight:
                      600,
                    cursor:
                      'pointer',
                  }}
                >
                  ✓ Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

    </PageTemplate>
  );
}