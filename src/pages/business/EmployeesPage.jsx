import { useEffect, useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  RefreshCw
} from 'react-feather';
import '../../styles/EmployeesManagePage.css';

import { fetchWithAuth } from '../../config/apiBase';
import { useAlert } from '../../components/ConfirmContext';

/* ================= CONFIRM DELETE ================= */
function ConfirmDeleteModal({ employee, onClose, onConfirm, loading }) {
  return (
    <div className="emp-overlay">
      <div className="emp-modal" style={{ maxWidth: 400 }}>
        <div className="emp-modal-header">
          <h2 style={{ color: '#ef4444' }}>Eliminar empleado</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, color: '#ccc' }}>
          ¿Eliminar a <b>{employee?.full_name}</b>?
        </div>

        <div className="emp-modal-footer">
          <button className="emp-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="emp-btn-primary"
            style={{ background: '#ef4444' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= EMPLOYEE MODAL ================= */
function EmployeeModal({ employee, onClose, onSave, saving }) {

  function formatDate(val) {
    if (!val) return '';
    try {
      return new Date(val).toISOString().substring(0, 10);
    } catch {
      return '';
    }
  }

  const [form, setForm] = useState({
    full_name: employee?.full_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    position: employee?.position || '',
    department: employee?.department || '',
    document_number: employee?.document_number || '',
    salary: employee?.salary || '',
    hired_at: formatDate(employee?.hired_at),
    status: employee?.status || 'active' // 🔥 FIX
  });


  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="emp-overlay">
      <div className="emp-modal">

        <div className="emp-modal-header">
          <h2>{employee ? 'Editar Colaborador/a' : 'Nuevo Colaborador/a'}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="emp-modal-grid">
          <input className="emp-input" placeholder="Nombre"
            value={form.full_name}
            onChange={e => set('full_name', e.target.value)}
          />

          <input className="emp-input" placeholder="Correo"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />

          <input className="emp-input" placeholder="Teléfono"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
          />

          <input className="emp-input" placeholder="Cargo"
            value={form.position}
            onChange={e => set('position', e.target.value)}
          />

          <input className="emp-input" placeholder="Departamento"
            value={form.department}
            onChange={e => set('department', e.target.value)}
          />

          <input className="emp-input" placeholder="Documento"
            value={form.document_number}
            onChange={e => set('document_number', e.target.value)}
          />

          <input className="emp-input" type="number" placeholder="Salario"
            value={form.salary}
            onChange={e => set('salary', e.target.value)}
          />

          <input
            className="emp-input"
            type="date"
            value={form.hired_at}
            onChange={e => set('hired_at', e.target.value)}
          />

          <select
            className="emp-input"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="emp-modal-footer">
          <button className="emp-btn-secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="emp-btn-primary"
            onClick={() => onSave(form)}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>

      </div>
    </div>
  );
}


/* ================= PAGE ================= */
export default function EmployeesManagePage() {

  const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


  const [deleteModal, setDeleteModal] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  const alert = useAlert();

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setLoading(true);

      const res = await fetchWithAuth('/api/employees');

      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);

    } catch {
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  /* ===== SAVE (CREATE / UPDATE) ===== */
  async function handleSave(form) {
    if (saving) return; // ✅ Prevención de doble envío
    try {
      setSaving(true);

      const isEdit = !!editing;
      const url = isEdit ? `/api/employees/${editing.id}` : `/api/employees`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });

      if (!res.ok) throw new Error();

      setShowModal(false);
      setEditing(null);
      fetchEmployees();

    } catch {
      await alert.error('Error guardando');
    } finally {
      setSaving(false);
    }
  }

  /* ===== DELETE ===== */
  async function handleDelete(emp) {
    try {
      setDeleting(true);

      const res = await fetchWithAuth(`/api/employees/${emp.id}`, { method: 'DELETE' });

      if (!res.ok) throw new Error();

      setDeleteModal(null);
      fetchEmployees();

    } catch {
      await alert.error('Error al eliminar');
    } finally {
      setDeleting(false);
    }
  }

  const filtered = employees.filter(e =>
    (e.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = employees.filter(e => e.status === 'active').length;
  const inactiveCount = employees.filter(e => e.status !== 'active').length;

  const headerAction = (
    <div className="emp-toolbar">
      <div className="emp-search-box">
        <Search size={14} />
        <input
          placeholder="Buscar Colaborador/a..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <button className="emp-refresh-btn" onClick={fetchEmployees}>
        <RefreshCw size={14} />
      </button>

      <button className="emp-btn-primary" onClick={() => setShowModal(true)}>
        <Plus size={14} /> Nuevo
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Colaboradores"
      subtitle="Gestiona y administra tu personal fácilmente"
      headerAction={headerAction}
      loading={loading}
      onRetry={fetchEmployees}
    >

      {/* STATS */}
      <div className="emp-stats">
        <div className="emp-stat-card">
          <span>{employees.length}</span>
          <p>Total</p>
        </div>

        <div className="emp-stat-card active">
          <span>{activeCount}</span>
          <p>Activos</p>
        </div>

        <div className="emp-stat-card inactive">
          <span>{inactiveCount}</span>
          <p>Inactivos</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="emp-table-wrapper">
        <table className="emp-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cargo</th>
              <th>Departamento</th>
              <th>Salario</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan="6">Cargando...</td></tr>
            ) : filtered.map(emp => (
              <tr key={emp.id}>
                <td>{emp.full_name}</td>
                <td>{emp.position}</td>
                <td>{emp.department}</td>
                <td>${Number(emp.salary || 0).toFixed(2)}</td>
                <td>
                  <span className={`emp-status ${emp.status}`}>
                    {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>

                <td className="emp-actions">
                  <button onClick={() => {
                    setEditing(emp);
                    setShowModal(true);
                  }}>
                    <Edit2 size={14} />
                  </button>

                  <button
                    className="delete"
                    onClick={() => setDeleteModal(emp)}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALS */}
      {showModal && (
        <EmployeeModal
          employee={editing}
          onClose={() => {
            setEditing(null);
            setShowModal(false);
          }}
          onSave={handleSave}
          saving={saving}
        />
      )}

      {deleteModal && (
        <ConfirmDeleteModal
          employee={deleteModal}
          onClose={() => setDeleteModal(null)}
          onConfirm={() => handleDelete(deleteModal)}
          loading={deleting}
        />
      )}

    </PageTemplate>
  );
}
