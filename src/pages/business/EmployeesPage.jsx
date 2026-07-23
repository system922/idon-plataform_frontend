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
    status: employee?.status || 'active'
  });
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateForm = () => {
    const newErrors = {};
    if (!form.full_name.trim()) newErrors.full_name = 'Nombre es requerido';
    if (!form.email.trim()) newErrors.email = 'Correo es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Correo inválido';
    if (!form.position.trim()) newErrors.position = 'Cargo es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveClick = () => {
    if (validateForm()) {
      onSave(form);
    }
  };

  return (
    <div className="emp-overlay">
      <div className="emp-modal">

        <div className="emp-modal-header">
          <h2>{employee ? 'Editar Colaborador/a' : 'Nuevo Colaborador/a'}</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="emp-modal-grid">
          {/* Nombre */}
          <div className="emp-form-group">
            <label className="emp-label">Nombre completo *</label>
            <input 
              className={`emp-input ${errors.full_name ? 'emp-input-error' : ''}`}
              placeholder="Ej: Juan Pérez"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
            />
            {errors.full_name && <p className="emp-error-text">{errors.full_name}</p>}
          </div>

          {/* Correo */}
          <div className="emp-form-group">
            <label className="emp-label">Correo electrónico *</label>
            <input 
              className={`emp-input ${errors.email ? 'emp-input-error' : ''}`}
              placeholder="ejemplo@correo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
            {errors.email && <p className="emp-error-text">{errors.email}</p>}
          </div>

          {/* Teléfono */}
          <div className="emp-form-group">
            <label className="emp-label">Teléfono</label>
            <input 
              className="emp-input" 
              placeholder="+56 9 1234 5678"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
            />
          </div>

          {/* Cargo */}
          <div className="emp-form-group">
            <label className="emp-label">Cargo *</label>
            <input 
              className={`emp-input ${errors.position ? 'emp-input-error' : ''}`}
              placeholder="Ej: Desarrollador Senior"
              value={form.position}
              onChange={e => set('position', e.target.value)}
            />
            {errors.position && <p className="emp-error-text">{errors.position}</p>}
          </div>

          {/* Departamento */}
          <div className="emp-form-group">
            <label className="emp-label">Departamento</label>
            <input 
              className="emp-input" 
              placeholder="Ej: Tecnología"
              value={form.department}
              onChange={e => set('department', e.target.value)}
            />
          </div>

          {/* Documento */}
          <div className="emp-form-group">
            <label className="emp-label">No. Cédula</label>
            <input 
              className="emp-input" 
              placeholder="Ej: 0123456789"
              value={form.document_number}
              onChange={e => set('document_number', e.target.value)}
            />
          </div>

          {/* Salario */}
          <div className="emp-form-group">
            <label className="emp-label">Salario</label>
            <input 
              className="emp-input" 
              type="number" 
              placeholder="0"
              value={form.salary}
              onChange={e => set('salary', e.target.value)}
            />
          </div>

          {/* Fecha de contratación */}
          <div className="emp-form-group">
            <label className="emp-label">F. contratación</label>
            <input
              className="emp-input"
              type="date"
              value={form.hired_at}
              onChange={e => set('hired_at', e.target.value)}
            />
          </div>

          {/* Estado */}
          <div className="emp-form-group">
            <label className="emp-label">Estado</label>
            <select
              className="emp-input"
              value={form.status}
              onChange={e => set('status', e.target.value)}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="emp-modal-footer">
          <button className="emp-btn-secondary" onClick={onClose}>
            Cancelar
          </button>

          <button
            className="emp-btn-primary"
            onClick={handleSaveClick}
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
    if (saving) return;
    try {
      setSaving(true);

      const isEdit = !!editing;
      const url = isEdit ? `/api/employees/${editing.id}` : `/api/employees`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, { method, body: JSON.stringify(form) });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.errors?.join(', ') || 'Error guardando');
      }

      setShowModal(false);
      setEditing(null);
      fetchEmployees();

    } catch (error) {
      await alert.error(error.message || 'Error guardando');
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