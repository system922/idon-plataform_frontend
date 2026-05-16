import { useEffect, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  User as FiUser,
  CheckCircle as FiCheckCircle,
  XCircle as FiXCircle,
  Clock as FiClock,
  RefreshCw as FiRefreshCw,
  Plus as FiPlus,
} from 'react-feather';
import '../../styles/AttendancePage.css';

import { fetchWithAuth } from '../../config/apiBase';
import { useAlert } from '../../components/ConfirmContext';

/* ================= MODAL MEJORADO ================= */
function AttendanceModal({ employees, attendanceData, onClose, onSave, saving }) {
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('');
  const [availableTypes, setAvailableTypes] = useState([]);

  // Cada vez que se cambia el empleado, recalcular qué tipos faltan
  useEffect(() => {
    if (!employeeId) {
      setAvailableTypes([]);
      setType('');
      return;
    }

    // Buscar el registro de asistencia actual de ese empleado
    const empAttendance = attendanceData.find(a => a.id === employeeId);
    if (!empAttendance) {
      // Si no hay datos, asumir que no tiene ninguna marcación
      // OPCIÓN A: Solo entrada (sin almuerzo) + salida
      // OPCIÓN B: Entrada + almuerzo completo
      setAvailableTypes([{ value: 'check_in', label: 'Entrada' }]);
      setType('check_in');
      return;
    }

    const missing = [];
    
    // Primero: entrada
    if (!empAttendance.horaEntrada) {
      missing.push({ value: 'check_in', label: 'Entrada' });
      setAvailableTypes(missing);
      setType('check_in');
      return;
    }

    // Si tiene entrada, ofrecer opciones:
    // A) Solo salida (sin almuerzo)
    // B) Almuerzo completo
    if (!empAttendance.horaSalida && !empAttendance.horaSalidaAlmuerzo) {
      // Decidir: ¿va al almuerzo o sale directamente?
      // Mostrar ambas opciones en un selector especial
      missing.push(
        { value: 'check_out', label: 'Salida (sin almuerzo)' },
        { value: 'lunch_out', label: 'Salida almuerzo (con almuerzo)' }
      );
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      return;
    }

    // Si marcó salida de almuerzo
    if (empAttendance.horaSalidaAlmuerzo && !empAttendance.horaEntradaAlmuerzo) {
      missing.push({ value: 'lunch_in', label: 'Entrada almuerzo' });
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      return;
    }

    // Si marcó entrada de almuerzo
    if (empAttendance.horaEntradaAlmuerzo && !empAttendance.horaSalida) {
      missing.push({ value: 'check_out', label: 'Salida' });
      setAvailableTypes(missing);
      if (missing.length > 0) setType(missing[0].value);
      return;
    }

    // Jornada completa
    setAvailableTypes([]);
    setType('');

  }, [employeeId, attendanceData]);

  return (
    <div className="att-overlay">
      <div className="att-modal">
        <div className="att-modal-header">
          <h2>Registrar asistencia</h2>
        </div>

        <div className="att-modal-body">
          <select
            className="att-input"
            value={employeeId}
            onChange={e => setEmployeeId(e.target.value)}
          >
            <option value="">Seleccionar empleado</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>

          {employeeId && (
            availableTypes.length === 0 ? (
              <div className="att-message">✓ Jornada completada – No hay más marcaciones pendientes</div>
            ) : (
              <select
                className="att-input"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                {availableTypes.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )
          )}
        </div>

        <div className="att-modal-footer">
          <button className="att-btn" onClick={onClose}>Cancelar</button>
          <button
            className="att-btn primary"
            disabled={!employeeId || availableTypes.length === 0 || saving}
            onClick={() => onSave({ employee_id: employeeId, type })}
          >
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= PÁGINA PRINCIPAL ================= */
export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const alert = useAlert();

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    await Promise.all([fetchAttendance(), fetchEmployees()]);
  }

  async function fetchEmployees() {
    try {
      const res = await fetchWithAuth('/api/employees');
      const data = await res.json();
      const activeEmployees = (data || []).filter(e => e.status === 'active');
      setEmployees(activeEmployees);
    } catch {
      setEmployees([]);
    }
  }

  async function fetchAttendance() {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/attendance/today');
      const data = await res.json();
      const formatted = data.map(e => ({
        id: e.employee_id,
        name: e.full_name,
        position: e.position,
        cedula: e.cedula,
        horaEntrada: formatTime(e.entrada),
        horaSalidaAlmuerzo: formatTime(e.salida_almuerzo),
        horaEntradaAlmuerzo: formatTime(e.entrada_almuerzo),
        horaSalida: formatTime(e.salida),
        status: getStatus(e)
      }));
      setAttendance(formatted);
    } catch {
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(val) {
    if (!val) return '';
    return new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function getStatus(e) {
    if (e.salida) return 'Completo';
    if (e.entrada) return 'En progreso';
    return 'Sin registro';
  }

  async function handleSave(data) {
    if (saving) return;
    try {
      setSaving(true);
      await fetchWithAuth('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      setShowModal(false);
      fetchAttendance();
    } catch {
      await alert.error('Error al registrar');
    } finally {
      setSaving(false);
    }
  }

  const headerAction = (
    <div className="att-toolbar">
      <button onClick={fetchAttendance} className="att-btn">
        <FiRefreshCw size={14} /> Actualizar
      </button>
      <button className="att-btn primary" onClick={() => setShowModal(true)}>
        <FiPlus size={14} /> Nuevo
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Control de Asistencia"
      subtitle="Registro de entrada y salida"
      loading={loading}
      headerAction={headerAction}
    >
      <div className="att-grid">
        {attendance.length === 0 && !loading && (
          <div className="att-empty">No hay datos</div>
        )}
        {attendance.map(a => (
          <div key={a.id} className="att-card">
            <div className="att-header">
              <div className="att-avatar"><FiUser size={18} /></div>
              <div>
                <h4>{a.name}</h4>
                <p>{a.position}</p>
              </div>
            </div>
            <div className="att-cedula">
              Cédula: <b>{a.cedula}</b>
            </div>
            <div className="att-times">
              {a.horaEntrada && (
                <>
                  <div><FiCheckCircle /> Entrada: {a.horaEntrada}</div>
                  {a.horaSalidaAlmuerzo ? (
                    <>
                      <div><FiXCircle /> Salida almuerzo: {a.horaSalidaAlmuerzo}</div>
                      {a.horaEntradaAlmuerzo && <div><FiCheckCircle /> Entrada almuerzo: {a.horaEntradaAlmuerzo}</div>}
                      {a.horaSalida && <div><FiXCircle /> Salida: {a.horaSalida}</div>}
                    </>
                  ) : (
                    a.horaSalida && <div><FiXCircle /> Salida: {a.horaSalida}</div>
                  )}
                </>
              )}
            </div>
            <div className="att-status">
              <FiClock /> {a.status}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop: 20, padding: '12px 16px', backgroundColor: '#ecfdf5', borderRadius: 6, borderLeft: '4px solid #10b981'}}>
        <small style={{color: '#047857'}}>
          ✅ <strong>Marcaciones Flexibles:</strong> Elige entre entrada/salida sin almuerzo (2 marcaciones) o con almuerzo completo (4 marcaciones). Al marcar salida, se calculan y guardan automáticamente las horas trabajadas.
        </small>
      </div>

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