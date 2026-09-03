// pages/business/Odontologia/OdontologiaPacientes.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from '../../../context/SessionContext';
import { fetchWithAuth } from '../../../config/api';
import { useConfirm, useAlert } from '../../../context/ConfirmContext';
import PageTemplate from '../../../components/PageTemplate';
import Table from '../../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../../components/General/Button';
import Input from '../../../components/General/Input';
import Modal from '../../../components/General/Modal';
import CustomCombobox from '../../../components/General/CustomCombobox';
import { CameraModal } from '../../../components/Odontologia/Pacientes/CameraModal';
import { 
  FiPlus, FiX, FiRefreshCw, FiEdit, FiTrash2, FiEye,
  FiUsers, FiUserCheck, FiUserPlus, FiCalendar, FiUser,
  FiPhone, FiMail, FiActivity, FiBriefcase, FiClock, FiHash, 
  FiUpload, FiCamera, FiLoader, FiCheckCircle, FiAlertCircle, FiSave
} from 'react-icons/fi';
import '../../../styles/Odontologia/index.css';

// ─── COMPONENTE DE AVATAR ──
const PacienteAvatar = ({ firstName, lastName, imageUrl, size = 40, className = '' }) => {
  const getInitials = () => {
    const first = firstName?.charAt(0) || '?';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase();
  };

  return (
    <div 
      className={`paciente-avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: '#fff',
        fontWeight: 600,
        fontSize: size * 0.4,
        flexShrink: 0,
        border: '2px solid #fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {imageUrl ? (
        <img 
          src={imageUrl} 
          alt={`${firstName} ${lastName}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        getInitials()
      )}
    </div>
  );
};

// ─── FUNCIÓN AUXILIAR PARA FORMATEAR FECHA ──
const formatDateForInput = (dateStr) => {
  if (!dateStr) return '';
  // Si ya viene en formato YYYY-MM-DD, devolverlo directamente
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Intentar parsear otros formatos
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

// ─── FUNCIÓN PARA FORMATEAR FECHA PARA MOSTRAR ──
const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
};

// ─── PÁGINA PRINCIPAL ──
export default function OdontologiaPacientes() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const isMounted = useRef(true);

  // Estado principal
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [modalError, setModalError] = useState('');

  // Formulario
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    document_number: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: 'Masculino',
    address: '',
    allergies: '',
    medical_history: '',
    occupation: '',
    nationality: '',
    blood_type: '',
    hc_number: '',
    image_url: '',
    image_file: null,
  });

  // Estados para búsqueda de cédula
  const [searching, setSearching] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [cedulaTouched, setCedulaTouched] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    nuevos_30dias: 0,
    con_citas: 0
  });

  // ─── MANEJADOR DE CAPTURA DE CÁMARA ──
  const handleCameraCapture = (file, previewUrl) => {
    setImagePreview(previewUrl);
    setForm(prev => ({ ...prev, image_file: file, image_url: '' }));
  };

  // ─── FUNCIÓN PARA ABRIR CÁMARA ──
  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  // ─── FUNCIÓN PARA CERRAR CÁMARA ──
  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  // ─── FUNCIÓN PARA VERIFICAR EXISTENCIA EN DB ──
  const verificarExistenciaEnDB = useCallback(async (cedula) => {
    if (!cedula || cedula.length !== 10) return null;
    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/search?q=${encodeURIComponent(cedula)}`);
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        return data.data.find(p => p.document_number === cedula) || null;
      }
      return null;
    } catch (error) {
      console.error('Error verificando paciente en DB:', error);
      return null;
    }
  }, []);

  // ─── BÚSQUEDA EN REGISTRO CIVIL ──
  const buscarEnRegistroCivil = useCallback(async (documentNumber) => {
    if (!documentNumber || documentNumber.length !== 10) {
      setSearchMessage('Ingrese una cédula válida de 10 dígitos');
      setSearchSuccess(false);
      return;
    }

    setSearching(true);
    setSearchSuccess(false);
    setError('');

    try {
      const proxyUrl = 'https://infoplacas.herokuapp.com/';
      const targetUrl = 'https://si.secap.gob.ec/sisecap/logeo_web/json/busca_persona_registro_civil.php';
      const postData = new URLSearchParams({
        documento: documentNumber,
        tipo: '1'
      });

      const response = await fetch(proxyUrl + targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: postData
      });

      const text = await response.text();

      if (text) {
        const json = JSON.parse(text);
        if (json?.nombres) {
          const firstName = json.nombres ? json.nombres.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
          const lastName = json.apellidos ? json.apellidos.toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) : '';
          const birthDate = json.fechaNacimiento || '';

          let gender = 'Masculino';
          if (json.sexo) {
            const sexoUpper = json.sexo.toUpperCase();
            if (sexoUpper === 'HOMBRE' || sexoUpper === 'MASCULINO') {
              gender = 'Masculino';
            } else if (sexoUpper === 'MUJER' || sexoUpper === 'FEMENINO') {
              gender = 'Femenino';
            }
          }

          let nationality = json.nacionalidad || '';

          setForm(prev => ({
            ...prev,
            first_name: firstName,
            last_name: lastName,
            document_number: documentNumber,
            birth_date: birthDate,
            gender: gender,
            nationality: nationality,
          }));

          setSearchSuccess(true);
          setTimeout(() => setSearchMessage(''), 4000);
        } else {
          setSearchSuccess(false);
        }
      } else {
        setSearchSuccess(false);
      }
    } catch (err) {
      console.error('Error al buscar en registro civil:', err);
      setSearchSuccess(false);
    } finally {
      setSearching(false);
    }
  }, []);

  // ─── VERIFICAR Y BUSCAR ──
  const verificarYBuscar = useCallback(async (documentNumber) => {
    if (!documentNumber || documentNumber.length !== 10) {
      setSearchMessage('Ingrese una cédula válida de 10 dígitos');
      setSearchSuccess(false);
      return;
    }

    setSearching(true);
    setSearchSuccess(false);
    setError('');

    const existente = await verificarExistenciaEnDB(documentNumber);
    if (existente) {
      setSearching(false);
      setSearchSuccess(false);
      await alert.info(
        `El paciente con cédula ${documentNumber} ya está registrado como "${existente.first_name} ${existente.last_name}". No se puede duplicar.`,
        'Paciente ya existe'
      );
      setForm(prev => ({ ...prev, document_number: '' }));
      return;
    }

    await buscarEnRegistroCivil(documentNumber);
  }, [verificarExistenciaEnDB, buscarEnRegistroCivil, alert]);

  // ─── Carga de datos ──
  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetchWithAuth('/odontologia/pacientes');
      const data = await response.json();

      if (!isMounted.current) return;

      let pacientesData = [];
      if (data.success && data.data) {
        pacientesData = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        pacientesData = data;
      }

      setPacientes(pacientesData);

      const total = pacientesData.length;
      const activos = pacientesData.filter(p => p.is_active !== false).length;
      const conCitas = pacientesData.filter(p => (p.total_appointments || 0) > 0).length;

      setStats({ 
        total, 
        activos, 
        nuevos_30dias: 0, 
        con_citas: conCitas 
      });

    } catch (err) {
      const msg = 'Error al cargar los datos: ' + err.message;
      setError(msg);
      if (isMounted.current) {
        await alert.error(msg);
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  // ─── Cargar al montar ──
  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, [loadData]);

  // ─── Refrescar ──
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ─── Filtrar pacientes ──
  const filteredPacientes = useMemo(() => {
    let result = pacientes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase().includes(term) ||
        (p.document_number && p.document_number.includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.phone && p.phone.includes(term))
      );
    }
    if (statusFilter) {
      if (statusFilter === 'activos') {
        result = result.filter(p => p.is_active !== false);
      } else if (statusFilter === 'inactivos') {
        result = result.filter(p => p.is_active === false);
      }
    }
    return result;
  }, [pacientes, searchTerm, statusFilter]);

  // ─── Guardar (crear/editar) ──
  const handleSave = async (formData) => {
    setSaving(true);
    setModalError('');
    try {
      const isEdit = !!selectedPaciente;
      const url = isEdit
        ? `/odontologia/pacientes/${selectedPaciente.id}`
        : '/odontologia/pacientes';
      const method = isEdit ? 'PUT' : 'POST';

      const submitData = new FormData();
      const dataToSend = {
        document_number: formData.document_number,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || '',
        phone: formData.phone || '',
        birth_date: formData.birth_date || '',
        gender: formData.gender || 'Masculino',
        address: formData.address || '',
        allergies: formData.allergies || '',
        medical_history: formData.medical_history || '',
        occupation: formData.occupation || '',
        nationality: formData.nationality || '',
        blood_type: formData.blood_type || '',
        is_active: true
      };

      submitData.append('data', JSON.stringify(dataToSend));

      if (formData.image_file) {
        submitData.append('image', formData.image_file);
      }

      const response = await fetchWithAuth(url, {
        method,
        body: submitData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar el paciente');
      }

      await loadData();
      setShowModal(false);
      setSelectedPaciente(null);
      setModalError('');
      await alert.success(data.message || 'Paciente guardado correctamente', 'Guardado exitoso');
      return data.data;
    } catch (err) {
      setModalError(err.message || 'Error al guardar el paciente');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ─── Eliminar ──
  const handleDelete = async (id) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de eliminar este paciente? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });
    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/odontologia/pacientes/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar el paciente');
      await loadData();
      await alert.success('Paciente eliminado correctamente', 'Eliminación exitosa');
      return { success: true };
    } catch (err) {
      await alert.error(err.message || 'Error al eliminar el paciente');
      return { success: false, error: err.message };
    }
  };

  // ─── Abrir modal de edición ──
  const handleEdit = (paciente) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPaciente(paciente);
    setForm({
      first_name: paciente.first_name || '',
      last_name: paciente.last_name || '',
      document_number: paciente.document_number || '',
      phone: paciente.phone || '',
      email: paciente.email || '',
      birth_date: formatDateForInput(paciente.birth_date) || '',
      gender: paciente.gender || 'Masculino',
      address: paciente.address || '',
      allergies: paciente.allergies || '',
      medical_history: paciente.medical_history || '',
      occupation: paciente.occupation || '',
      nationality: paciente.nationality || '',
      blood_type: paciente.blood_type || '',
      hc_number: paciente.hc_number || '',
      image_url: paciente.image_url || '',
      image_file: null,
    });
    setImagePreview(paciente.image_url || null);
    setSearchSuccess(false);
    setSearchMessage('');
    setModalError('');
    setShowModal(true);
  };

  // ─── Abrir modal de detalle ──
  const handleView = (paciente) => {
    setSelectedPaciente(paciente);
    setShowDetailModal(true);
  };

  // ─── Cerrar modales ──
  const closeModal = () => {
    setShowModal(false);
    setSelectedPaciente(null);
    setModalError('');
    setImagePreview(null);
    setSearchSuccess(false);
    setSearchMessage('');
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPaciente(null);
  };

  // ─── Columnas de la tabla ──
  const columns = [
    {
      accessor: 'nombre_completo',
      label: 'PACIENTE',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <PacienteAvatar
            firstName={item.first_name}
            lastName={item.last_name}
            imageUrl={item.image_url}
            size={40}
          />
          <div>
            <strong>{item.first_name} {item.last_name}</strong>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              {item.document_number || 'Sin cédula'}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessor: 'phone',
      label: 'TELÉFONO',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiPhone size={14} style={{ color: '#6b7280' }} />
          <span>{item.phone || '—'}</span>
        </div>
      ),
    },
    {
      accessor: 'email',
      label: 'EMAIL',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FiMail size={14} style={{ color: '#6b7280' }} />
          <span style={{ fontSize: '13px' }}>{item.email || '—'}</span>
        </div>
      ),
    },
    {
      accessor: 'birth_date',
      label: 'CUMPLEAÑOS',
      align: 'center',
      render: (item) => {
        if (!item.birth_date) return <span>—</span>;
        const date = new Date(item.birth_date);
        return (
          <span style={{ fontSize: '13px' }}>
            {date.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
          </span>
        );
      },
    },
    {
      accessor: 'is_active',
      label: 'ESTADO',
      align: 'center',
      render: (item) => (
        <span className={`estado-badge ${item.is_active !== false ? 'activo' : 'inactivo'}`}>
          {item.is_active !== false ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      accessor: 'actions',
      label: 'ACCIONES',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            icon={<FiEye size={14} />}
            onClick={() => handleView(item)}
            title="Ver detalles"
          >
            Ver
          </IconTextButton>
          <IconTextButton
            variant="warning"
            size="sm"
            icon={<FiEdit size={14} />}
            onClick={() => handleEdit(item)}
            title="Editar"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item.id)}
            title="Eliminar"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ─── Toolbar ──
  const toolbar = (
    <div className="products-toolbar">
      <div className="products-toolbar-right">
        <div className="products-filter-group">
          <CustomCombobox
            options={[
              { value: '', label: 'Todos los estados' },
              { value: 'activos', label: 'Activos' },
              { value: 'inactivos', label: 'Inactivos' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filtrar por estado"
            filterable={false}
            size="md"
            forceDropup={false}
          />
        </div>
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            icon={<FiPlus size={14} />}
            onClick={() => {
              setSelectedPaciente(null);
              setForm({
                first_name: '',
                last_name: '',
                document_number: '',
                phone: '',
                email: '',
                birth_date: '',
                gender: 'Masculino',
                address: '',
                allergies: '',
                medical_history: '',
                occupation: '',
                nationality: '',
                blood_type: '',
                hc_number: '',
                image_url: '',
                image_file: null,
              });
              setImagePreview(null);
              setSearchSuccess(false);
              setModalError('');
              setShowModal(true);
            }}
          >
            Nuevo Paciente
          </IconTextButton>
        </ButtonGroup>
      </div>
    </div>
  );

  // ─── Stats ──
  const statsData = [
    {
      label: 'Total Pacientes',
      value: stats.total,
      icon: <FiUsers size={22} />,
      color: '#f59e0b'
    },
    {
      label: 'Activos',
      value: stats.activos,
      icon: <FiUserCheck size={22} />,
      color: '#8b5cf6'
    },
    {
      label: 'Nuevos (30 días)',
      value: stats.nuevos_30dias,
      icon: <FiUserPlus size={22} />,
      color: '#3b82f6'
    },
    {
      label: 'Con citas',
      value: stats.con_citas,
      icon: <FiCalendar size={22} />,
      color: '#22c55e'
    },
  ];

  const statsToolbar = (
    <div className="odonto-stats-grid" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: '12px',
      marginBottom: '16px'
    }}>
      {statsData.map((s, idx) => (
        <div key={idx} className="odonto-stat-card" style={{
          background: '#fff',
          borderRadius: '10px',
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          transition: 'all 0.2s'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: `${s.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: s.color
          }}>
            {s.icon}
          </div>
          <div>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.2
            }}>
              {s.value}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#64748b',
              fontWeight: 500
            }}>
              {s.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Modal de creación/edición ──
  const modalFooter = (
    <>
      {modalError && <div className="modal-error-text">⚠️ {modalError}</div>}
      <ButtonGroup>
        <IconTextButton
          variant=""
          size="md"
          icon={<FiX size={14} />}
          onClick={closeModal}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiSave size={14} />}
          onClick={() => {
            if (!form.document_number) {
              setModalError('La cédula es obligatoria');
              return;
            }
            if (form.document_number.length !== 10) {
              setModalError('La cédula debe tener 10 dígitos');
              return;
            }
            if (!form.first_name.trim() || !form.last_name.trim()) {
              setModalError('Nombres y apellidos son obligatorios');
              return;
            }

            const dataToSend = {
              document_number: form.document_number,
              first_name: form.first_name,
              last_name: form.last_name,
              email: form.email || '',
              phone: form.phone || '',
              birth_date: form.birth_date || '',
              gender: form.gender || 'Masculino',
              address: form.address || '',
              allergies: form.allergies || '',
              medical_history: form.medical_history || '',
              occupation: form.occupation || '',
              nationality: form.nationality || '',
              blood_type: form.blood_type || '',
              image_file: form.image_file,
            };
            handleSave(dataToSend);
          }}
          disabled={saving}
          loading={saving}
        >
          {selectedPaciente ? 'Actualizar' : 'Guardar'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  // ─── Modal de detalle ──
  const detailModalFooter = (
    <ButtonGroup>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={14} />}
        onClick={closeDetailModal}
      >
        Cerrar
      </IconTextButton>
      {selectedPaciente && (
        <>
          <IconTextButton
            variant="info"
            size="md"
            icon={<FiEdit size={14} />}
            onClick={() => {
              closeDetailModal();
              handleEdit(selectedPaciente);
            }}
          >
            Editar
          </IconTextButton>
        </>
      )}
    </ButtonGroup>
  );

  // ─── Render ──
  return (
    <PageTemplate
      title="Pacientes"
      subtitle="Gestión de pacientes odontológicos"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={
        <button
          onClick={handleRefresh}
          className="dashboard-refresh-btn-header"
          disabled={refreshing}
          title="Actualizar datos"
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      {statsToolbar}

      <Table
        data={filteredPacientes}
        columns={columns}
        keyField="id"
        title="Lista de pacientes"
        subtitle={`${filteredPacientes.length} ${filteredPacientes.length === 1 ? 'paciente' : 'pacientes'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por nombre, cédula, email o teléfono..."
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 15, 20]}
        loading={loading}
        emptyMessage={
          searchTerm || statusFilter
            ? 'No hay pacientes que coincidan con los filtros'
            : 'No hay pacientes registrados'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {/* Modal de creación/edición */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={selectedPaciente ? 'Editar paciente' : 'Nuevo paciente'}
        size="md"
        className="pacientes-modal"
        footer={modalFooter}
        closeOnOverlayClick={false}
      >
        <div className="pacientes-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* CÉDULA + FOTO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', alignItems: 'start' }}>
            <div className="form-group">
              <label>N. Cédula *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Input
                  type="text"
                  value={form.document_number}
                  onChange={(val) => {
                    const clean = val.replace(/\D/g, '').slice(0, 10);
                    setForm(f => ({ ...f, document_number: clean }));
                    setCedulaTouched(true);
                    if (clean.length === 10) {
                      verificarYBuscar(clean);
                    }
                  }}
                  placeholder="10 dígitos"
                  size="md"
                  maxLength={10}
                  disabled={!!selectedPaciente}
                />
                {searching && <FiLoader size={20} className="spinning" style={{ color: '#3b82f6' }} />}
                {searchSuccess && !searching && <FiCheckCircle size={20} style={{ color: '#22c55e' }} />}
                {form.document_number.length === 10 && !searchSuccess && !searching && !selectedPaciente && (
                  <FiAlertCircle size={20} style={{ color: '#ef4444' }} />
                )}
              </div>
              {searchMessage && (
                <div style={{ fontSize: '12px', color: searchSuccess ? '#22c55e' : '#ef4444', marginTop: '4px' }}>
                  {searchMessage}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <label></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PacienteAvatar
                  firstName={form.first_name || '?'}
                  lastName={form.last_name || ''}
                  imageUrl={imagePreview}
                  size={56}
                />
                <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result);
                      reader.readAsDataURL(file);
                      setForm(f => ({ ...f, image_file: file }));
                    }}
                    style={{ display: 'none' }}
                  />
                  <IconTextButton
                    variant=""
                    size="sm"
                    icon={<FiUpload size={12} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Subir
                  </IconTextButton>
                  {/* Botón Tomar - Ahora disponible tanto para nuevo como para edición */}
                  <IconTextButton
                    variant="info"
                    size="sm"
                    icon={<FiCamera size={12} />}
                    onClick={handleOpenCamera}
                  >
                    Tomar
                  </IconTextButton>
                  {imagePreview && (
                    <IconTextButton
                      variant="danger"
                      size="sm"
                      icon={<FiX size={12} />}
                      onClick={() => {
                        setImagePreview(null);
                        setForm(f => ({ ...f, image_file: null }));
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Eliminar
                    </IconTextButton>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Nombres, Apellidos - 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Nombres *</label>
              <Input
                type="text"
                value={form.first_name}
                onChange={(val) => setForm(f => ({ ...f, first_name: val }))}
                placeholder="Ej: Juan Carlos"
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Apellidos *</label>
              <Input
                type="text"
                value={form.last_name}
                onChange={(val) => setForm(f => ({ ...f, last_name: val }))}
                placeholder="Ej: Pérez González"
                size="md"
              />
            </div>
          </div>

          {/* Teléfono - Email (Ajustado: Cédula menos espacio, Email más espacio) */}
          <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.5fr', gap: '12px' }}>
            <div className="form-group">
              <label>Teléfono</label>
              <Input
                type="text"
                value={form.phone}
                onChange={(val) => setForm(f => ({ ...f, phone: val.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="0999123456"
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(val) => setForm(f => ({ ...f, email: val }))}
                placeholder="ejemplo@correo.com"
                size="md"
              />
            </div>
          </div>

          {/* Fecha, Género - 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Fecha de nacimiento</label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(val) => setForm(f => ({ ...f, birth_date: val }))}
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Género</label>
              <CustomCombobox
                options={[
                  { label: 'Masculino', value: 'Masculino' },
                  { label: 'Femenino', value: 'Femenino' },
                  { label: 'Otro', value: 'Otro' }
                ]}
                value={form.gender}
                onChange={(val) => setForm(f => ({ ...f, gender: val }))}
                placeholder="Seleccionar género"
                filterable={false}
                size="md"
              />
            </div>
          </div>

          {/* Dirección, Ocupación - 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Dirección</label>
              <Input
                type="text"
                value={form.address}
                onChange={(val) => setForm(f => ({ ...f, address: val }))}
                placeholder="Dirección completa"
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Ocupación</label>
              <Input
                type="text"
                value={form.occupation}
                onChange={(val) => setForm(f => ({ ...f, occupation: val }))}
                placeholder="Ej: Ingeniero, Médico..."
                size="md"
              />
            </div>
          </div>

          {/* Nacionalidad, Tipo Sangre - 2 columnas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Nacionalidad</label>
              <Input
                type="text"
                value={form.nationality}
                onChange={(val) => setForm(f => ({ ...f, nationality: val }))}
                placeholder="Ej: Ecuatoriana"
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Tipo de Sangre</label>
              <CustomCombobox
                options={[
                  { label: '', value: '' },
                  { label: 'A+', value: 'A+' },
                  { label: 'A-', value: 'A-' },
                  { label: 'B+', value: 'B+' },
                  { label: 'B-', value: 'B-' },
                  { label: 'AB+', value: 'AB+' },
                  { label: 'AB-', value: 'AB-' },
                  { label: 'O+', value: 'O+' },
                  { label: 'O-', value: 'O-' }
                ]}
                value={form.blood_type}
                onChange={(val) => setForm(f => ({ ...f, blood_type: val }))}
                placeholder="Seleccionar"
                filterable={false}
                size="md"
                forceDropup={false}
              />
            </div>
          </div>

          {/* Alergias */}
          <div className="form-group">
            <label>Alergias</label>
            <Input
              type="text"
              value={form.allergies}
              onChange={(val) => setForm(f => ({ ...f, allergies: val }))}
              placeholder="Ej: Penicilina, Polen, Látex..."
              size="md"
            />
          </div>

          {/* Antecedentes médicos */}
          <div className="form-group">
            <label>Antecedentes médicos</label>
            <Input
              type="textarea"
              value={form.medical_history}
              onChange={(val) => setForm(f => ({ ...f, medical_history: val }))}
              placeholder="Historial médico relevante del paciente..."
              size="md"
              rows={2}
            />
          </div>
        </div>
      </Modal>

      {/* Modal de detalle */}
      <Modal
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        title="Detalles del paciente"
        size="md"
        className="pacientes-detail-modal"
        footer={detailModalFooter}
        closeOnOverlayClick={false}
      >
        {selectedPaciente && (
          <div className="pacientes-detail-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '2px solid #e2e8f0' }}>
              <PacienteAvatar
                firstName={selectedPaciente.first_name}
                lastName={selectedPaciente.last_name}
                imageUrl={selectedPaciente.image_url}
                size={64}
              />
              <div>
                <div style={{ fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>
                  {selectedPaciente.first_name} {selectedPaciente.last_name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
                  <FiUser size={14} />
                  <span>Cédula: {selectedPaciente.document_number || 'No registrada'}</span>
                </div>
                {selectedPaciente.hc_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#64748b' }}>
                    <FiHash size={14} />
                    <span>HC: <strong>{selectedPaciente.hc_number}</strong></span>
                  </div>
                )}
                <span className={`estado-badge ${selectedPaciente.is_active !== false ? 'activo' : 'inactivo'}`} style={{ fontSize: '12px', padding: '2px 10px' }}>
                  {selectedPaciente.is_active !== false ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>

            {/* Información Personal */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiUser size={14} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Información Personal</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Fecha de nacimiento</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {selectedPaciente.birth_date ? new Date(selectedPaciente.birth_date).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : '—'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Género</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.gender || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tipo de sangre</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.blood_type || '—'}</div>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiPhone size={14} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Contacto</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Teléfono</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Email</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.email || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Dirección</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.address || '—'}</div>
                </div>
              </div>
            </div>

            {/* Médica */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiActivity size={14} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Información Médica</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Alergias</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {selectedPaciente.allergies ? (
                      <span style={{ background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                        {selectedPaciente.allergies}
                      </span>
                    ) : 'Ninguna'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Antecedentes médicos</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.medical_history || 'Ninguno'}</div>
                </div>
              </div>
            </div>

            {/* Laboral */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiBriefcase size={14} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Información Laboral</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Ocupación</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.occupation || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Nacionalidad</div>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{selectedPaciente.nationality || '—'}</div>
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FiClock size={14} style={{ color: '#3b82f6' }} />
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Estadísticas</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{selectedPaciente.total_appointments || 0}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Citas</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>{selectedPaciente.total_treatments || 0}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Tratamientos</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>${(selectedPaciente.total_payments || 0).toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Pagado</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                    {selectedPaciente.created_at ? new Date(selectedPaciente.created_at).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Registro</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Cámara */}
      {showCamera && (
        <CameraModal
          isOpen={showCamera}
          onCapture={handleCameraCapture}
          onClose={handleCloseCamera}
        />
      )}
    </PageTemplate>
  );
}