import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext'; // ✅ AGREGADO
import PageTemplate from '../../components/PageTemplate';
import {
  FiUser, FiCheckCircle, FiXCircle, FiClock,
  FiRefreshCw, FiPlus, FiAlertCircle, FiSearch,
  FiArrowRight, FiLogOut, FiLogIn
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; // ✅ CORREGIDO
import { useAlert } from '../../components/ConfirmContext';
import Modal from '../../components/General/Modal';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import SearchInput from '../../components/General/SearchInput';

// ─── Helper para formatear hora ─────────────────────────────────────────────
const formatTime = (val) => {
  if (!val) return '';
  const date = new Date(val);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Helper para obtener estado ─────────────────────────────────────────────
const getStatus = (attendance) => {
  if (!attendance) return 'Sin registro';
  if (attendance.salida) return 'Completo';
  if (attendance.entrada) return 'En progreso';
  return 'Sin registro';
};

// ─── Componente de reloj digital ───────────────────────────────────────────
function ClockDisplay() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatClockTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className="att-clock-container">
      <div className="att-clock-digital">
        <span className="att-clock-time">{formatClockTime(time)}</span>
      </div>
      <div className="att-clock-date">
        {formatDate(time)}
      </div>
    </div>
  );
}

// ─── Modal de Registro de Asistencia por Cédula ──────────────────────────────
function AttendanceModal({ employees, attendanceData, onClose, onSave, saving }) {
  const [cedula, setCedula] = useState('');
  const [employee, setEmployee] = useState(null);
  const [type, setType] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);
  const [error, setError] = useState('');
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  // Buscar empleado por cédula y determinar marcación disponible
  useEffect(() => {
    if (!cedula || cedula.length < 7) {
      setEmployee(null);
      setAvailableTypes([]);
      setType('');
      setError('');
      setLoadingEmployee(false);
      return;
    }

    setLoadingEmployee(true);
    setError('');

    // Buscar empleado en la lista de empleados
    const found = employees.find(e => e.document_number === cedula);
    
    if (!found) {
      setEmployee(null);
      setAvailableTypes([]);
      setType('');
      setError('Colaborador/a no encontrado');
      setLoadingEmployee(false);
      return;
    }

    setEmployee(found);

    // Buscar asistencia del Colaborador/a en los datos de asistencia del día
    const empAttendance = attendanceData.find(a => a.id === found.id);
    
    // Determinar qué marcaciones están disponibles
    const missing = [];

    // Si no hay registro de asistencia o no tiene entrada
    if (!empAttendance || !empAttendance.horaEntrada) {
      missing.push({ value: 'check_in', label: '🟢 Entrada', icon: <FiLogIn size={14} /> });
      setAvailableTypes(missing);
      setType('check_in');
      setError('');
      setLoadingEmployee(false);
      return;
    }

    // Si tiene entrada, verificar siguientes pasos
    const hasLunchOut = empAttendance.horaSalidaAlmuerzo;
    const hasLunchIn = empAttendance.horaEntradaAlmuerzo;
    const hasCheckOut = empAttendance.horaSalida;

    // Si no tiene salida de almuerzo ni salida final
    if (!hasLunchOut && !hasCheckOut) {
      missing.push(
        { value: 'check_out', label: 'Salida (Cierre)', icon: <FiLogOut size={14} /> },
        { value: 'lunch_out', label: 'Salida a almuerzo', icon: <FiArrowRight size={14} /> }
      );
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      setError('');
      setLoadingEmployee(false);
      return;
    }

    // Si ya salió a almuerzo pero no ha vuelto
    if (hasLunchOut && !hasLunchIn) {
      missing.push({ value: 'lunch_in', label: '🟢 Regreso de almuerzo', icon: <FiLogIn size={14} /> });
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      setError('');
      setLoadingEmployee(false);
      return;
    }

    // Si ya volvió de almuerzo pero no ha salido
    if (hasLunchIn && !hasCheckOut) {
      missing.push({ value: 'check_out', label: 'Salida (Cierre)', icon: <FiLogOut size={14} /> });
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      setError('');
      setLoadingEmployee(false);
      return;
    }

    // Jornada completa
    setAvailableTypes([]);
    setType('');
    setError('Colaborador/a con Jornada completada – No hay más marcaciones pendientes');
    setLoadingEmployee(false);

  }, [cedula, employees, attendanceData]);

  const handleSubmit = () => {
    if (!employee) {
      setError('Colaborador/a no encontrado');
      return;
    }
    if (availableTypes.length === 0) {
      setError('No hay marcaciones disponibles');
      return;
    }
    if (!type) {
      setError('Seleccione un tipo de marcación');
      return;
    }

    onSave({ 
      employee_id: employee.id, 
      type: type,
      employee_name: employee.full_name 
    });
  };

  const handleCedulaChange = (value) => {
    const clean = value.replace(/\D/g, '');
    setCedula(clean);
    setError('');
  };

  const getTypeLabel = (typeValue) => {
    const found = availableTypes.find(t => t.value === typeValue);
    return found ? found.label : '';
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Registrar Asistencia"
      size="sm"
      footer={
        <>
          {error && (
            <div className={`att-modal-error ${error.includes('Jornada completada') ? 'success' : 'error'}`}>
              {error.includes('Jornada completada') ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
              {error}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<FiXCircle size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiPlus size={14} />}
              onClick={handleSubmit}
              disabled={!employee || availableTypes.length === 0 || saving || loadingEmployee}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Registrar'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <div className="att-modal-body">
        {/* Cédula */}
        <div className="att-form-group">
          <label className="att-form-label">Número de Cédula *</label>
          <Input
            type="text"
            value={cedula}
            onChange={handleCedulaChange}
            placeholder="Ej: 1234567890"
            size="md"
            autoFocus
            maxLength={10}
            required
          />
        </div>

        {/* Loading */}
        {loadingEmployee && (
          <div className="att-loading">
            <FiRefreshCw size={20} className="spinning" />
            Buscando empleado...
          </div>
        )}

        {/* Información del empleado */}
        {employee && !loadingEmployee && (
          <div className="att-employee-info">
            <div className="att-employee-avatar">
              {employee.full_name?.charAt(0) || '?'}
            </div>
            <div>
              <div className="att-employee-name">{employee.full_name}</div>
              <div className="att-employee-detail">
                {employee.position || 'Sin cargo'} • Cédula: {employee.document_number}
              </div>
            </div>
          </div>
        )}

        <ClockDisplay />

        {/* Selección de tipo de marcación */}
        {employee && !loadingEmployee && availableTypes.length > 0 && (
          <div className="att-form-group">
            <label className="att-form-label">Tipo de marcación *</label>
            <div className="att-type-options">
              {availableTypes.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={`att-type-option ${type === opt.value ? 'active' : ''}`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensaje de jornada completa */}
        {employee && !loadingEmployee && availableTypes.length === 0 && (
          <div className="att-complete-message">
            <FiCheckCircle size={20} />
            Jornada completada – No hay más marcaciones pendientes
          </div>
        )}

        {/* Resumen de la marcación */}
        {employee && !loadingEmployee && type && (
          <div className="att-summary">
            <strong>Resumen:</strong> {employee.full_name} • {getTypeLabel(type)}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─── Componente de tarjeta de asistencia ──────────────────────────────────
function AttendanceCard({ data }) {
  return (
    <div className="att-card">
      <div className="att-header">
        <div className="att-avatar"><FiUser size={18} /></div>
        <div>
          <h4>{data.name}</h4>
          <p>{data.position}</p>
        </div>
      </div>
      <div className="att-cedula">
        Cédula: <b>{data.cedula}</b>
      </div>
      <div className="att-times">
        {data.horaEntrada && (
          <>
            <div><FiLogIn size={12} /> Entrada: {data.horaEntrada}</div>
            {data.horaSalidaAlmuerzo && (
              <div><FiArrowRight size={12} /> Salida almuerzo: {data.horaSalidaAlmuerzo}</div>
            )}
            {data.horaEntradaAlmuerzo && (
              <div><FiLogIn size={12} /> Entrada almuerzo: {data.horaEntradaAlmuerzo}</div>
            )}
            {data.horaSalida && (
              <div><FiLogOut size={12} /> Salida: {data.horaSalida}</div>
            )}
          </>
        )}
      </div>
      <div className={`att-status status-${data.status === 'Completo' ? 'complete' : data.status === 'En progreso' ? 'progress' : 'none'}`}>
        <FiClock size={12} /> {data.status}
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useSession(); // ✅ AGREGADO
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const alert = useAlert();

  // ─── Cargar empleados ──────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async () => {
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth('/employees');
      const data = await res.json();
      const activeEmployees = (data || []).filter(e => e.status === 'active');
      setEmployees(activeEmployees);
    } catch {
      setEmployees([]);
    }
  }, []);

  // ─── Cargar asistencia del día ────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      // ✅ SIN /api
      const res = await fetchWithAuth('/attendance/today');
      const data = await res.json();
      
      const formatted = data.map(e => ({
        id: e.employee_id,
        name: e.full_name,
        position: e.position,
        cedula: e.document_number || e.cedula,
        horaEntrada: formatTime(e.entrada),
        horaSalidaAlmuerzo: formatTime(e.salida_almuerzo),
        horaEntradaAlmuerzo: formatTime(e.entrada_almuerzo),
        horaSalida: formatTime(e.salida),
        status: getStatus(e)
      }));
      
      setAttendance(formatted);
    } catch (err) {
      console.error('Error cargando asistencia:', err);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Cargar datos iniciales ───────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAttendance(), fetchEmployees()]);
  }, [fetchAttendance, fetchEmployees]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Filtrar por búsqueda ────────────────────────────────────────────────
  const filteredAttendance = useMemo(() => {
    if (!search) return attendance;
    const term = search.toLowerCase();
    return attendance.filter(a =>
      a.name?.toLowerCase().includes(term) ||
      a.position?.toLowerCase().includes(term) ||
      a.cedula?.includes(term)
    );
  }, [attendance, search]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleSave = async (data) => {
    if (saving) return;
    try {
      setSaving(true);
      
      const payload = {
        employee_id: data.employee_id,
        type: data.type
      };
      
      // ✅ SIN /api
      const res = await fetchWithAuth('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al registrar asistencia');
      }

      setShowModal(false);
      await fetchAttendance();
      await alert.success(
        `${data.employee_name} Su asistencia fue registrada correctamente`,
        'Asistencia Registrada'
      );
    } catch (err) {
      console.error('Error guardando asistencia:', err);
      await alert.error(err.message || 'Error al registrar asistencia');
    } finally {
      setSaving(false);
    }
  };

  // ─── Estadísticas ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredAttendance.length;
    const complete = filteredAttendance.filter(a => a.status === 'Completo').length;
    const inProgress = filteredAttendance.filter(a => a.status === 'En progreso').length;
    const noRegister = filteredAttendance.filter(a => a.status === 'Sin registro').length;
    return { total, complete, inProgress, noRegister };
  }, [filteredAttendance]);

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="att-toolbar">
      <div className="att-toolbar-left">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar Colaborador/a..."
          size="md"
          variant="bordered"
          className="att-search-input"
          onClear={() => setSearch('')}
          autoFocus={false}
        />
      </div>
      <div className="att-toolbar-right">
        <ButtonGroup>
          {/* Botón de actualizar personalizado */}
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={14} />}
            onClick={() => setShowModal(true)}
          >
            Registrar
          </IconTextButton>
          <button
            onClick={handleRefresh}
            className="dashboard-refresh-btn-header"
            disabled={refreshing}
            title="Actualizar datos"
          >
            <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </ButtonGroup>
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="CONTROL DE ASISTENCIA"
      subtitle="Registro de entrada y salida"
      theme="business"
      loading={loading}
      headerAction={toolbar}
    >
      {/* Tarjetas de resumen */}
      <div className="att-stats-grid">
        <div className="att-stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="att-stat-value">{stats.total}</div>
          <div className="att-stat-label">Total empleados</div>
        </div>
        <div className="att-stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="att-stat-value">{stats.complete}</div>
          <div className="att-stat-label">Completos</div>
        </div>
        <div className="att-stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="att-stat-value">{stats.inProgress}</div>
          <div className="att-stat-label">En progreso</div>
        </div>
        <div className="att-stat-card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <div className="att-stat-value">{stats.noRegister}</div>
          <div className="att-stat-label">Sin registro</div>
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="att-grid">
        {filteredAttendance.length === 0 && !loading && (
          <div className="att-empty">No hay datos de asistencia para hoy</div>
        )}
        {filteredAttendance.map(a => (
          <AttendanceCard key={a.id} data={a} />
        ))}
      </div>

      {/* Modal de registro */}
      {showModal && (
        <AttendanceModal
          employees={employees}
          attendanceData={attendance}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}