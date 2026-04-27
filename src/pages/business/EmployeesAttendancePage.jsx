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

/* ================= MODAL ================= */
function AttendanceModal({ employees, onClose, onSave, saving }) {

  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState('check_in');

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

          <select
            className="att-input"
            value={type}
            onChange={e => setType(e.target.value)}
          >
            <option value="check_in">Entrada</option>
            <option value="lunch_out">Salida almuerzo</option>
            <option value="lunch_in">Entrada almuerzo</option>
            <option value="check_out">Salida</option>
          </select>

        </div>

        <div className="att-modal-footer">
          <button className="att-btn" onClick={onClose}>Cancelar</button>

          <button
            className="att-btn primary"
            disabled={!employeeId || saving}
            onClick={() => onSave({ employee_id: employeeId, type })}
          >
            {saving ? 'Guardando...' : 'Registrar'}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ================= PAGE ================= */
export default function AttendancePage() {

  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    await Promise.all([
      fetchAttendance(),
      fetchEmployees()
    ]);
  }

  async function fetchEmployees() {
    try {
      const res = await fetchWithAuth('/api/employees');

      const data = await res.json();

      // 🔥 SOLO ACTIVOS
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
    try {
      setSaving(true);

      await fetchWithAuth('/api/attendance', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      setShowModal(false);
      fetchAttendance();

    } catch {
      alert('Error');
    } finally {
      setSaving(false);
    }
  }

  const headerAction = (
    <div className="att-toolbar">
      <button onClick={fetchAttendance} className="att-btn">
        <FiRefreshCw size={14}/> Actualizar
      </button>

      <button className="att-btn primary" onClick={() => setShowModal(true)}>
        <FiPlus size={14}/> Nuevo
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
              <div className="att-avatar"><FiUser size={18}/></div>
              <div>
                <h4>{a.name}</h4>
                <p>{a.position}</p>
              </div>
            </div>

            <div className="att-cedula">
              Cédula: <b>{a.cedula}</b>
            </div>

            <div className="att-times">
              <div><FiCheckCircle/> {a.horaEntrada || '-'}</div>
              <div><FiXCircle/> {a.horaSalidaAlmuerzo || '-'}</div>
              <div><FiCheckCircle/> {a.horaEntradaAlmuerzo || '-'}</div>
              <div><FiXCircle/> {a.horaSalida || '-'}</div>
            </div>

            <div className="att-status">
              <FiClock/> {a.status}
            </div>

          </div>
        ))}

      </div>

      {showModal && (
        <AttendanceModal
          employees={employees} // 🔥 YA FILTRADOS
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}

    </PageTemplate>
  );
}
