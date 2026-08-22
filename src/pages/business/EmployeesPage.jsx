import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from '../../context/SessionContext'; // ✅ AGREGADO
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  Plus, Edit2, CheckCircle, AlertCircle, X, Save, Trash2
} from 'react-feather';
import { 
  FiRefreshCw, FiUser, FiMail, FiPhone, FiBriefcase, FiGrid, 
  FiCreditCard, FiDollarSign, FiCalendar, FiClock, FiDollarSign as FiMoney 
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; // ✅ CORREGIDO
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import SearchInput from '../../components/General/SearchInput';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import '../../styles/EmployeesManagePage.css';

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
    status: employee?.status || 'active',
    payment_type: employee?.payment_type || 'hourly'
  });
  const [errors, setErrors] = useState({});
  const [loadingPerson, setLoadingPerson] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingExists, setCheckingExists] = useState(false);

  const setFormField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // ── Opciones de tipo de pago ──────────────────────────────────────────
  const paymentTypeOptions = [
    { label: 'Pago por Horas', value: 'hourly' },
    { label: 'Pago Diario', value: 'daily' }
  ];

  // ── Validar cédula ecuatoriana ──────────────────────────────────────────
  const validarCedula = (cedula) => {
    if (!cedula || cedula.length !== 10) return false;
    if (!/^\d{10}$/.test(cedula)) return false;
    
    const provincia = parseInt(cedula.substring(0, 2));
    if (provincia < 1 || provincia > 24) return false;
    
    const digitos = cedula.split('').map(Number);
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    
    for (let i = 0; i < 9; i++) {
      let valor = digitos[i] * coeficientes[i];
      if (valor > 9) valor -= 9;
      suma += valor;
    }
    
    const digitoVerificador = (10 - (suma % 10)) % 10;
    return digitoVerificador === digitos[9];
  };

  // ── Validar email ──────────────────────────────────────────────────────
  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  // ── Validar fecha de contratación ────────────────────────────────────
  const validarFechaContratacion = (fecha) => {
    if (!fecha) return true;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaSeleccionada = new Date(fecha);
    return fechaSeleccionada <= hoy;
  };

  // ── Verificar si el empleado ya existe ─────────────────────────────
  const verificarExistencia = async (document_number, email, excludeId = null) => {
    try {
      setCheckingExists(true);
      
      // Verificar por cédula
      if (document_number && document_number.length === 10) {
        // ✅ SIN /api
        let url = `/employees/check-exists?document_number=${encodeURIComponent(document_number)}`;
        if (excludeId) {
          url += `&exclude_id=${excludeId}`;
        }
        
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          if (data.exists === true) {
            return { 
              field: 'document_number', 
              message: `Ya existe un colaborador con la cédula ${document_number}` 
            };
          }
        }
      }
      
      // Verificar por email
      if (email && validarEmail(email)) {
        // ✅ SIN /api
        let url = `/employees/check-exists?email=${encodeURIComponent(email)}`;
        if (excludeId) {
          url += `&exclude_id=${excludeId}`;
        }
        
        const res = await fetchWithAuth(url);
        if (res.ok) {
          const data = await res.json();
          if (data.exists === true) {
            return { 
              field: 'email', 
              message: `⚠️ Ya existe un colaborador con el correo ${email}` 
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error verificando existencia:', error);
      return null;
    } finally {
      setCheckingExists(false);
    }
  };

  // ── Buscar persona por cédula ──────────────────────────────────────────
  const buscarPersonaPorCedula = async (cedula) => {
    if (!cedula || cedula.length !== 10 || !validarCedula(cedula)) return;
    
    setLoadingPerson(true);
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth(`/employees/by-document?document_number=${cedula}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.full_name) {
          setFormField('full_name', data.full_name);
          setFormField('email', data.email || '');
          setFormField('phone', data.phone || '');
          return;
        }
      }

      await buscarEnPadron(cedula);
    } catch (error) {
      console.error('Error buscando persona:', error);
    } finally {
      setLoadingPerson(false);
    }
  };

  // ── Buscar en el padrón ─────────────────────────────────────────────
  const buscarEnPadron = async (cedula) => {
    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({ documento: cedula, tipo: '1' });
      
      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });
      
      const text = await response.text();
      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const nombreCompleto = (json.nombres + ' ' + (json.apellidos || '')).trim();
          setFormField('full_name', nombreCompleto);
        }
      }
    } catch (error) {
      console.error('Error en padrón:', error);
    }
  };

  // ── Auto-buscar al cambiar cédula ──────────────────────────────────────
  useEffect(() => {
    const doc = form.document_number;
    if (doc && doc.length === 10 && validarCedula(doc)) {
      const timer = setTimeout(() => {
        buscarPersonaPorCedula(doc);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [form.document_number]);

  // ── Validación completa del formulario ──────────────────────────────────
  const validateForm = async () => {
    const newErrors = {};
    let isValid = true;

    // ── Validar nombre ──────────────────────────────────────────────────────
    if (!form.full_name?.trim()) {
      newErrors.full_name = 'Nombre es requerido';
      isValid = false;
    }

    // ── Validar email ──────────────────────────────────────────────────────
    if (!form.email?.trim()) {
      newErrors.email = 'Correo es requerido';
      isValid = false;
    } else if (!validarEmail(form.email)) {
      newErrors.email = 'Correo electrónico inválido';
      isValid = false;
    }

    // ── Validar cédula ────────────────────────────────────────────────────
    if (form.document_number) {
      if (form.document_number.length !== 10) {
        newErrors.document_number = 'La cédula debe tener 10 dígitos';
        isValid = false;
      } else if (!validarCedula(form.document_number)) {
        newErrors.document_number = 'Cédula inválida';
        isValid = false;
      }
    }

    // ── Validar cargo ──────────────────────────────────────────────────────
    if (!form.position?.trim()) {
      newErrors.position = 'Cargo es requerido';
      isValid = false;
    }

    // ── Validar fecha de contratación ────────────────────────────────────
    if (form.hired_at && !validarFechaContratacion(form.hired_at)) {
      newErrors.hired_at = 'La fecha no puede ser mayor a hoy';
      isValid = false;
    }

    // ── Si la validación básica es válida, verificar duplicados ──────────
    if (isValid) {
      const excludeId = employee?.id || null;
      const exists = await verificarExistencia(form.document_number, form.email, excludeId);
      if (exists) {
        newErrors[exists.field] = exists.message;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSaveClick = async (e) => {
    e.preventDefault();
    if (isSubmitting || saving) return;
    
    setIsSubmitting(true);
    try {
      const isValid = await validateForm();
      if (isValid) {
        await onSave(form);
      }
    } catch (error) {
      console.error('Error en validación:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Verificar si el botón de guardar debe estar habilitado ────────────
  const isFormValid = () => {
    // Campos obligatorios
    if (!form.full_name?.trim()) return false;
    if (!form.email?.trim()) return false;
    if (!form.position?.trim()) return false;
    
    // Validar email
    if (!validarEmail(form.email)) return false;
    
    // Validar cédula si está presente
    if (form.document_number) {
      if (form.document_number.length !== 10) return false;
      if (!validarCedula(form.document_number)) return false;
    }
    
    // Validar fecha
    if (form.hired_at && !validarFechaContratacion(form.hired_at)) return false;
    
    // Verificar si hay errores de duplicados
    if (errors.document_number?.includes('Ya existe')) return false;
    if (errors.email?.includes('Ya existe')) return false;
    
    return true;
  };

  const statusOptions = [
    { label: 'Activo', value: 'active' },
    { label: 'Inactivo', value: 'inactive' }
  ];

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={employee ? 'Editar Colaborador/a' : 'Nuevo Colaborador/a'}
      size="xl"
      footer={
        <>
          <ButtonGroup>
            <IconTextButton
              variant=""
              size="md"
              icon={<X size={14} />}
              onClick={onClose}
              disabled={saving || isSubmitting}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<Save size={14} />}
              onClick={handleSaveClick}
              disabled={!isFormValid() || saving || isSubmitting || checkingExists}
              loading={saving || isSubmitting || checkingExists}
              type="submit"
            >
              {saving ? 'Guardando...' : checkingExists ? 'Verificando...' : 'Guardar'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <form onSubmit={handleSaveClick} className="product-modal-form">
        <div className="form-grid">
          <div className="full-width">
            <div className="modal-grid-3">
              <div className="form-group" style={{ maxWidth: '190px' }}>
                <label>No. Cédula <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <Input
                    type="text"
                    value={form.document_number}
                    onChange={(val) => {
                      const clean = val.replace(/\D/g, '').slice(0, 10);
                      setFormField('document_number', clean);
                    }}
                    placeholder="0123456789"
                    size="md"
                    icon={<FiCreditCard size={14} />}
                    maxLength={10}
                    error={errors.document_number}
                    required
                  />
                  {loadingPerson && (
                    <div style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}>
                      <div className="spinner-small" />
                    </div>
                  )}
                </div>
                {errors.document_number && <span className="error-text">{errors.document_number}</span>}
                <small style={{ 
                  color: form.document_number && form.document_number.length === 10 
                    ? validarCedula(form.document_number) ? 'var(--success-color)' : 'var(--danger-color)'
                    : 'var(--text-muted)', 
                  fontSize: '11px', 
                  marginTop: '2px', 
                  display: 'block' 
                }}>
                  {form.document_number && form.document_number.length === 10 
                    ? validarCedula(form.document_number) ? '✅ Cédula válida' : '❌ Cédula inválida' 
                    : '10 dígitos'}
                </small>
              </div>
              
              <div className="form-group" style={{ maxWidth: '420px' }}>
                <label>Nombre completo <span className="required">*</span></label>
                <Input
                  type="text"
                  value={form.full_name}
                  onChange={(val) => setFormField('full_name', val)}
                  placeholder="Ej: Juan Pérez"
                  size="md"
                  icon={<FiUser size={14} />}
                  error={errors.full_name}
                  required
                />
                {errors.full_name && <span className="error-text">{errors.full_name}</span>}
              </div>
              
              <div className="form-group" style={{ maxWidth: '190px' }}>
                <label>Teléfono</label>
                <Input
                  type="text"
                  value={form.phone}
                  onChange={(val) => setFormField('phone', val)}
                  placeholder="912345678"
                  size="md"
                  icon={<FiPhone size={14} />}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="full-width">
            <div className="modal-grid-3_1">
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label>Correo electrónico <span className="required">*</span></label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(val) => setFormField('email', val)}
                  placeholder="ejemplo@correo.com"
                  size="md"
                  icon={<FiMail size={14} />}
                  error={errors.email}
                  required
                />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>
              
              <div className="form-group" style={{ maxWidth: '250px' }}>
                <label>Cargo <span className="required">*</span></label>
                <Input
                  type="text"
                  value={form.position}
                  onChange={(val) => setFormField('position', val)}
                  placeholder="Ej: Desarrollador"
                  size="md"
                  icon={<FiBriefcase size={14} />}
                  error={errors.position}
                  required
                />
                {errors.position && <span className="error-text">{errors.position}</span>}
              </div>
              
              <div className="form-group" style={{ maxWidth: '250px' }}>
                <label>Departamento</label>
                <Input
                  type="text"
                  value={form.department}
                  onChange={(val) => setFormField('department', val)}
                  placeholder="Ej: Tecnología"
                  size="md"
                  icon={<FiGrid size={14} />}
                />
              </div>
            </div>
          </div>

          <div className="full-width">
            <div className="modal-grid-3">
              <div className="form-group" style={{ maxWidth: '180px' }}>
                <label>Salario</label>
                <div className="currency-input">
                  <span className="currency-symbol">$</span>
                  <Input
                    type="text"
                    value={form.salary}
                    onChange={(val) => {
                      let clean = val.replace(/\D/g, '');
                      if (clean === '') {
                        setFormField('salary', '');
                        return;
                      }
                      const num = parseInt(clean, 10);
                      const formatted = (num / 100).toFixed(2);
                      setFormField('salary', formatted);
                    }}
                    placeholder="0.00"
                    size="md"
                    className="currency-field"
                    icon={<FiDollarSign size={14} />}
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ maxWidth: '200px' }}>
                <label>Tipo de Pago <span className="required">*</span></label>
                <CustomCombobox
                  options={paymentTypeOptions}
                  value={form.payment_type}
                  onChange={(val) => setFormField('payment_type', val)}
                  placeholder="Seleccionar tipo"
                  size="md"
                  filterable={false}
                />
                <small style={{ 
                  color: 'var(--text-muted)', 
                  fontSize: '11px', 
                  display: 'block',
                  marginTop: '4px'
                }}>
                  {form.payment_type === 'hourly' 
                    ? 'El salario es mensual, se calcula por horas trabajadas' 
                    : 'El salario es diario, se paga por día trabajado'}
                </small>
              </div>
              
              <div className="form-group" style={{ maxWidth: '200px' }}>
                <label>F. contratación</label>
                <Input
                  type="date"
                  value={form.hired_at}
                  onChange={(val) => setFormField('hired_at', val)}
                  size="md"
                  icon={<FiCalendar size={14} />}
                  error={errors.hired_at}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.hired_at && <span className="error-text">{errors.hired_at}</span>}
              </div>
              
              <div className="form-group">
                <label>Estado</label>
                <CustomCombobox
                  options={statusOptions}
                  value={form.status}
                  onChange={(val) => setFormField('status', val)}
                  placeholder="Seleccionar estado"
                  size="md"
                  filterable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

/* ================= PAGE ================= */
export default function EmployeesManagePage() {
  const { user } = useSession(); // ✅ AGREGADO
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Carga de empleados ──────────────────────────────────────────────────
  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth('/employees');
      if (!res.ok) throw new Error('Error al cargar empleados');
      const data = await res.json();
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmployees();
    setRefreshing(false);
  };

  // ── Guardar empleado ────────────────────────────────────────────────────
  const handleSaveEmployee = useCallback(async (payload) => {
    setSaving(true);
    try {
      const isEdit = !!editing;
      // ✅ SIN /api
      const res = await fetchWithAuth(
        isEdit ? `/employees/${editing.id}` : '/employees',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.field === 'document_number') {
          throw new Error(`⚠️ ${data.error}`);
        }
        if (data.field === 'email') {
          throw new Error(`⚠️ ${data.error}`);
        }
        throw new Error(data.error || 'Error al guardar');
      }
      
      await alert.success(
        `Colaborador/a ${isEdit ? 'actualizado' : 'creado'} correctamente`,
        isEdit ? 'Actualizado' : 'Creado'
      );
      
      setShowModal(false);
      setEditing(null);
      loadEmployees();
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  }, [editing, loadEmployees, alert]);

  // ── Eliminar empleado ──────────────────────────────────────────────────
  const handleDelete = async (employee) => {
    if (!await showConfirm({
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar a "${employee.full_name}"?`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    setSaving(true);
    try {
      // ✅ SIN /api
      const res = await fetchWithAuth(`/employees/${employee.id}`, { 
        method: 'DELETE' 
      });
      
      if (!res.ok) {
        let errorMessage = 'Error al eliminar';
        try {
          const data = await res.json();
          errorMessage = data.error || data.message || errorMessage;
        } catch (e) {
          const text = await res.text();
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }
      
      await alert.success(
        `Colaborador/a "${employee.full_name}" eliminado correctamente`,
        'Eliminado'
      );
      loadEmployees();
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setShowModal(true);
  };
  
  const openEdit = (employee) => {
    setEditing(employee);
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  // ── Filtrado por búsqueda ─────────────────────────────────────────────
  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase();
    return (e.full_name?.toLowerCase() || '').includes(q) ||
           (e.position?.toLowerCase() || '').includes(q) ||
           (e.department?.toLowerCase() || '').includes(q) ||
           (e.document_number?.toLowerCase() || '').includes(q) ||
           (e.email?.toLowerCase() || '').includes(q);
  });

  // ── Columnas ──────────────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'full_name',
      label: 'NOMBRE',
      render: (item) => <span>{item.full_name}</span>
    },
    {
      accessor: 'document_number',
      label: 'CÉDULA',
      render: (item) => <span>{item.document_number || '—'}</span>
    },
    {
      accessor: 'position',
      label: 'CARGO',
      render: (item) => <span>{item.position || '—'}</span>
    },
    {
      accessor: 'department',
      label: 'DEPARTAMENTO',
      render: (item) => <span>{item.department || '—'}</span>
    },
    {
      accessor: 'email',
      label: 'CORREO',
      render: (item) => <span>{item.email || '—'}</span>
    },
    {
      accessor: 'payment_type',
      label: 'TIPO DE PAGO',
      render: (item) => (
        <span>
          {item.payment_type === 'daily' ? 'Diario' : 'Por Horas'}
        </span>
      )
    },
    {
      accessor: 'status',
      label: 'ESTADO',
      render: (item) => (
        item.status === 'active' ? (
          <div className="users-status-active">
            <CheckCircle size={16} />
            <span>Activo</span>
          </div>
        ) : (
          <div className="users-status-inactive">
            <AlertCircle size={16} />
            <span>Inactivo</span>
          </div>
        )
      )
    }
  ];

  // ── Render de fila ──────────────────────────────────────────────────────
  const renderRow = (item) => (
    <tr key={item.id} className={`table-row ${item.status !== 'active' ? 'users-row-inactive' : ''}`}>
      {columns.map((col, idx) => (
        <td key={idx} className="table-cell" data-label={col.label}>
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
      <td className="table-cell table-actions-cell">
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<Edit2 size={12} />}
            onClick={() => openEdit(item)}
            title="Editar colaborador/a"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => handleDelete(item)}
            title="Eliminar colaborador/a"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      </td>
    </tr>
  );

  // ── Toolbar ────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar colaboradores..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearch('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={openCreate}
          disabled={saving}
          loading={saving}
        >
          Nuevo Colaborador/a
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ──────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <PageTemplate
      title="Colaboradores"
      subtitle="Gestiona y administra tu personal fácilmente"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <div className="employees-page-container">
        <Table
          data={filteredEmployees}
          columns={columns}
          keyField="id"
          renderRow={renderRow}
          title="Listado de colaboradores"
          subtitle={`${filteredEmployees.length} ${filteredEmployees.length === 1 ? 'colaborador/a' : 'colaboradores/as'} registrados`}
          toolbar={toolbar}
          searchable={false}
          searchPlaceholder="Buscar por nombre, cargo o departamento..."
          searchFields={['full_name', 'position', 'department']}
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay colaboradores registrados'}
          striped={true}
          hoverable={true}
          bordered={false}
          compact={false}
        />

        {showModal && (
          <EmployeeModal
            employee={editing}
            onClose={closeModal}
            onSave={handleSaveEmployee}
            saving={saving}
          />
        )}
      </div>
    </PageTemplate>
  );
}