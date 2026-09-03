// ========== src/pages/admin_idon/AdminIdonNews.jsx ==========
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiCheck,
  FiAlertCircle, FiClock, FiZap,
  FiGift, FiTrendingUp, FiAward, FiBell, 
  FiInfo, FiLayers,
  FiPackage, FiShoppingCart, FiUsers, FiSettings,
  FiBarChart2, FiCalendar, FiFileText, FiHome,
  FiImage, FiUploadCloud, FiX
} from 'react-icons/fi';
import { IoRocketOutline } from "react-icons/io5";
import { FaRegStar } from "react-icons/fa";
import { IoMegaphoneOutline } from "react-icons/io5";
import { HiOutlineSparkles } from "react-icons/hi2";
import { ImFire } from "react-icons/im";
import { BiSolidCrown } from "react-icons/bi";
import { adminApi, api } from '../../config/api';
import './AdminIdonNews.css';

const NEWS_TYPES = [
  { value: 'new_module', label: 'Nuevo Módulo', color: 'var(--text-muted)' },
  { value: 'improvement', label: 'Mejora', color: 'var(--text-muted)' },
  { value: 'announcement', label: 'Anuncio', color: 'var(--text-muted)' },
  { value: 'update', label: 'Actualización', color: 'var(--text-muted)' },
  { value: 'feature', label: 'Nueva Funcionalidad', color: 'var(--text-muted)' },
];

// Iconos disponibles con sus componentes
const ICON_OPTIONS = [
  { value: 'rocket', label: '🚀 Rocket', icon: IoRocketOutline },
  { value: 'star', label: '⭐ Star', icon: FaRegStar },
  { value: 'zap', label: '⚡ Zap', icon: FiZap },
  { value: 'gift', label: '🎁 Gift', icon: FiGift },
  { value: 'trending-up', label: '📈 Trending', icon: FiTrendingUp },
  { value: 'award', label: '🏆 Award', icon: FiAward },
  { value: 'bell', label: '🔔 Bell', icon: FiBell },
  { value: 'megaphone', label: '📢 Megaphone', icon: IoMegaphoneOutline },
  { value: 'info', label: 'ℹ️ Info', icon: FiInfo },
  { value: 'sparkles', label: '✨ Sparkles', icon: HiOutlineSparkles },
  { value: 'fire', label: '🔥 Fire', icon: ImFire },
  { value: 'crown', label: '👑 Crown', icon: BiSolidCrown },
  { value: 'layers', label: '📚 Layers', icon: FiLayers },
  { value: 'package', label: '📦 Package', icon: FiPackage },
  { value: 'shopping-cart', label: '🛒 Cart', icon: FiShoppingCart },
  { value: 'users', label: '👥 Users', icon: FiUsers },
  { value: 'settings', label: '⚙️ Settings', icon: FiSettings },
  { value: 'bar-chart', label: '📊 Chart', icon: FiBarChart2 },
  { value: 'calendar', label: '📅 Calendar', icon: FiCalendar },
  { value: 'clock', label: '🕐 Clock', icon: FiClock },
  { value: 'file-text', label: '📄 File', icon: FiFileText },
  { value: 'home', label: '🏠 Home', icon: FiHome },
];

// Mapeo de iconos por nombre
const ICON_MAP = Object.fromEntries(
  ICON_OPTIONS.map(opt => [opt.value, opt.icon])
);

// Prioridades
const PRIORITY_OPTIONS = [
  { value: 20, label: '🔴 20 - Alta' },
  { value: 15, label: '🟠 15 - Moderada' },
  { value: 10, label: '🟡 10 - Media' },
  { value: 5, label: '🟢 5 - Baja' },
  { value: 0, label: '⚪ 0 - Muy Baja' },
];

// Estado options
const STATUS_OPTIONS = [
  { value: 'active', label: '✅ Activa' },
  { value: 'inactive', label: '❌ Inactiva' },
];

const getTypeColor = (type) => {
  const found = NEWS_TYPES.find(t => t.value === type);
  return found?.color || '#94a3b8';
};

const getTypeLabel = (type) => {
  const found = NEWS_TYPES.find(t => t.value === type);
  return found?.label || type;
};

// Función para obtener el componente del icono
const getIconComponent = (iconName) => {
  return ICON_MAP[iconName] || FiInfo;
};

export default function AdminIdonNews() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('todos');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/IdonNews');
      setNews(r.data || r || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = async (id, title) => {
    if (!await showConfirm({
      title: '⚠️ Eliminar novedad',
      message: `¿Eliminar "${title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    
    setDeleting(id);
    try {
      await adminApi.delete(`/admin/IdonNews/${id}`);
      await load();
      alert.success('Novedad eliminada correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (item) => {
    try {
      await adminApi.patch(`/admin/IdonNews/${item.id}/toggle`);
      await load();
      alert.success(
        item.is_active ? 'Novedad desactivada' : 'Novedad activada',
        '✅ Éxito'
      );
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredNews = useMemo(() => {
    let result = news;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n =>
        n.title?.toLowerCase().includes(term) ||
        n.content?.toLowerCase().includes(term) ||
        n.type?.toLowerCase().includes(term)
      );
    }

    if (filterType !== 'todos') {
      result = result.filter(n => n.type === filterType);
    }

    return result;
  }, [news, searchTerm, filterType]);

  const typeOptions = [
    { value: 'todos', label: `Todos (${news.length})` },
    ...NEWS_TYPES.map(t => ({
      value: t.value,
      label: `${t.label} (${news.filter(n => n.type === t.value).length})`
    }))
  ];

  const columns = [
    {
      accessor: 'type',
      label: 'Tipo',
      render: (item) => (
        <span className="news-type-badge" style={{
          background: `${getTypeColor(item.type)}18`,
          color: getTypeColor(item.type),
          borderColor: `${getTypeColor(item.type)}44`
        }}>
          {getTypeLabel(item.type)}
        </span>
      ),
    },
    {
      accessor: 'title',
      label: 'Título',
      render: (item) => {
        const Icon = getIconComponent(item.icon);
        return (
          <div className="news-title-cell">
            <Icon size={18} className="news-icon" />
            <div>
              <strong>{item.title}</strong>
              {item.is_highlight && (
                <span className="news-highlight-badge">★ Destacado</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessor: 'image_url',
      label: 'Imagen',
      render: (item) => (
        item.image_url ? (
          <div className="news-image-thumb">
            <img src={item.image_url} alt={item.title} />
          </div>
        ) : (
          <span className="news-no-image">Sin imagen</span>
        )
      ),
    },
    {
      accessor: 'content',
      label: 'Contenido',
      render: (item) => (
        <div className="news-content-preview">
          {item.content?.length > 80
            ? item.content.substring(0, 80) + '...'
            : item.content}
        </div>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        <button
          onClick={() => handleToggle(item)}
          className={`news-status-btn ${item.is_active ? 'active' : 'inactive'}`}
        >
          {item.is_active ? '✓ Activa' : '✗ Inactiva'}
        </button>
      ),
    },
    {
      accessor: 'starts_at',
      label: 'Inicio',
      render: (item) => (
        <span className="news-date">
          {item.starts_at ? new Date(item.starts_at).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
    },
    {
      accessor: 'priority',
      label: 'Prioridad',
      render: (item) => {
        const p = PRIORITY_OPTIONS.find(o => o.value === item.priority);
        return (
          <span className="news-priority">{p?.label || item.priority || 0}</span>
        );
      },
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<FiEdit2 size={13} />}
            onClick={() => setEditModal(item)}
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<FiTrash2 size={13} />}
            onClick={() => handleDelete(item.id, item.title)}
            disabled={deleting === item.id}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <div className="admin-news-toolbar">
      <CustomCombobox
        options={typeOptions}
        value={filterType}
        onChange={setFilterType}
        placeholder="Filtrar por tipo"
        filterable={false}
        size="sm"
        className="admin-news-filter"
      />
      <ButtonGroup>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setEditModal('new')}
        >
          Nueva Novedad
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="NOVEDADES IDON"
      subtitle="Gestiona las novedades que se mostrarán a los usuarios en su página de inicio"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredNews}
        columns={columns}
        keyField="id"
        title="Novedades de la Plataforma"
        subtitle={`${filteredNews.length} ${filteredNews.length === 1 ? 'novedad' : 'novedades'}`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por título, contenido o tipo..."
        searchFields={['title', 'content', 'type']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage="No hay novedades registradas"
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {editModal && (
        <EditModal
          item={editModal === 'new' ? null : editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); load(); }}
        />
      )}
    </PageTemplate>
  );
}

// ============================================================
// EDIT MODAL
// ============================================================
function EditModal({ item, onClose, onSaved }) {
  const alert = useAlert();
  const { showConfirm } = useConfirm();
  const isNew = !item;
  const imageInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(item?.image_url || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [form, setForm] = useState({
    title: item?.title || '',
    content: item?.content || '',
    type: item?.type || 'announcement',
    icon: item?.icon || 'megaphone',
    image_url: item?.image_url || '',
    is_active: item?.is_active !== false,
    is_highlight: item?.is_highlight || false,
    priority: item?.priority || 10,
    starts_at: item?.starts_at ? new Date(item.starts_at).toISOString().slice(0, 16) : '',
    ends_at: item?.ends_at ? new Date(item.ends_at).toISOString().slice(0, 16) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setFormField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    console.log('📸 Imagen seleccionada:', file.name, file.size, 'bytes');
  };

  const handleUploadImage = async () => {
    if (!imageFile) {
      alert.warning('Selecciona una imagen primero');
      return;
    }

    const id = item?.id;
    if (!id) {
      alert.warning('Primero guarda la novedad antes de subir una imagen');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      console.log('📸 Subiendo imagen a:', `/admin/IdonNews/${id}/image`);
      console.log('📸 FormData:', formData);
      
      // ✅ Usar api directamente para FormData
      const response = await api.post(`/admin/IdonNews/${id}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('✅ Respuesta:', response.data);
      
      const imageUrl = response.data?.data?.image_url || response.data?.image_url;
      if (imageUrl) {
        setFormField('image_url', imageUrl);
        setImagePreview(imageUrl);
        setImageFile(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
        alert.success('Imagen subida correctamente', '✅ Éxito');
      } else {
        alert.error('No se recibió la URL de la imagen');
      }
    } catch (e) {
      console.error('❌ Error al subir imagen:', e);
      console.error('❌ Detalles:', e.response?.data);
      alert.error('Error al subir imagen: ' + (e.response?.data?.message || e.message || 'Error desconocido'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!item?.id) return;
    
    if (!await showConfirm({
      title: '⚠️ Eliminar imagen',
      message: '¿Eliminar la imagen de esta novedad?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;

    try {
      await api.delete(`/admin/IdonNews/${item.id}/image`);
      setFormField('image_url', '');
      setImagePreview(null);
      setImageFile(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
      alert.success('Imagen eliminada correctamente', '✅ Éxito');
    } catch (e) {
      console.error('❌ Error al eliminar imagen:', e);
      alert.error('Error al eliminar imagen: ' + e.message);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('❌ Título y contenido son requeridos');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };

      let result;
      if (isNew) {
        result = await adminApi.post('/admin/IdonNews', payload);
        alert.success('Novedad creada correctamente', '✅ Éxito');
      } else {
        result = await adminApi.put(`/admin/IdonNews/${item.id}`, payload);
        alert.success('Novedad actualizada correctamente', '✅ Éxito');
      }
      
      // Si hay imagen pendiente y la novedad ya tiene ID
      const savedId = result?.data?.id || item?.id;
      if (imageFile && savedId) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await api.post(`/admin/IdonNews/${savedId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      onSaved();
    } catch (e) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      {error && (
        <div className="modal-error-text">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      <ButtonGroup>
        <IconTextButton
          variant="secondary"
          size="md"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </IconTextButton>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<FiCheck size={14} />}
          onClick={handleSave}
          disabled={saving || !form.title || !form.content}
          loading={saving}
        >
          {saving ? 'Guardando...' : isNew ? 'Crear novedad' : 'Guardar cambios'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={isNew ? 'Nueva Novedad' : `Editar: ${item?.title}`}
      size="lg"
      className="admin-news-modal"
      footer={footer}
    >
      <div className="admin-news-form">
        {/* ─── TÍTULO ─── */}
        <div className="admin-news-form-group admin-news-form-group-full">
          <label>Título *</label>
          <Input
            type="text"
            value={form.title}
            onChange={(value) => setFormField('title', value)}
            placeholder="Título de la novedad"
            size="md"
            required
          />
        </div>

        {/* ─── TIPO, ICONO, PRIORIDAD ─── */}
        <div className="admin-news-form-row">
          <div className="admin-news-form-group">
            <label>Tipo *</label>
            <CustomCombobox
              options={NEWS_TYPES.map(t => ({ value: t.value, label: t.label }))}
              value={form.type}
              onChange={(value) => setFormField('type', value)}
              placeholder="Selecciona un tipo"
              size="md"
            />
          </div>
          <div className="admin-news-form-group">
            <label>Icono</label>
            <CustomCombobox
              options={ICON_OPTIONS.map(opt => ({ value: opt.value, label: opt.label }))}
              value={form.icon}
              onChange={(value) => setFormField('icon', value)}
              placeholder="Selecciona un icono"
              size="md"
            />
          </div>
          <div className="admin-news-form-group">
            <label>Prioridad</label>
            <CustomCombobox
              options={PRIORITY_OPTIONS}
              value={form.priority}
              onChange={(value) => setFormField('priority', value)}
              placeholder="Selecciona prioridad"
              size="md"
            />
          </div>
        </div>

        {/* ─── CONTENIDO ─── */}
        <div className="admin-news-form-group admin-news-form-group-full">
          <label>Contenido *</label>
          <textarea
            className="admin-news-textarea"
            value={form.content}
            onChange={(e) => setFormField('content', e.target.value)}
            placeholder="Contenido de la novedad..."
            rows={4}
          />
        </div>

        {/* ─── IMAGEN ─── */}
        <div className="admin-news-form-group admin-news-form-group-full">
          <label>Imagen</label>
          <div className="admin-news-image-section">
            {imagePreview ? (
              <div className="admin-news-image-preview">
                <img src={imagePreview} alt="Preview" />
                <button
                  type="button"
                  className="admin-news-image-remove"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                >
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <div className="admin-news-image-upload">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="admin-news-image-input"
                  id="news-image-input"
                />
                <label htmlFor="news-image-input" className="admin-news-image-label">
                  <FiImage size={24} />
                  <span>Seleccionar imagen</span>
                  <span className="admin-news-image-hint">PNG, JPG, WEBP (máx 5MB)</span>
                </label>
              </div>
            )}
            {imageFile && (
              <div className="admin-news-image-actions">
                <IconTextButton
                  variant="primary"
                  size="sm"
                  icon={<FiUploadCloud size={14} />}
                  onClick={handleUploadImage}
                  disabled={uploadingImage || !item?.id}
                  loading={uploadingImage}
                >
                  {uploadingImage ? 'Subiendo...' : 'Subir imagen'}
                </IconTextButton>
                {!item?.id && (
                  <span className="admin-news-image-hint-warning">
                    ⚠️ Guarda la novedad primero para subir la imagen
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── FECHA INICIO, FECHA FIN, ESTADO, DESTACADO ─── */}
        <div className="admin-news-form-row admin-news-form-row-4">
          <div className="admin-news-form-group">
            <label>Fecha de inicio</label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(value) => setFormField('starts_at', value)}
              size="md"
            />
          </div>
          <div className="admin-news-form-group">
            <label>Fecha de fin (opcional)</label>
            <Input
              type="datetime-local"
              value={form.ends_at}
              onChange={(value) => setFormField('ends_at', value)}
              size="md"
            />
          </div>
          <div className="admin-news-form-group">
            <label>Estado</label>
            <CustomCombobox
              options={STATUS_OPTIONS}
              value={form.is_active ? 'active' : 'inactive'}
              onChange={(value) => setFormField('is_active', value === 'active')}
              placeholder="Estado"
              size="md"
            />
          </div>
          <div className="admin-news-form-group admin-news-form-group-checkbox">
            <label>
              <input
                type="checkbox"
                checked={form.is_highlight}
                onChange={(e) => setFormField('is_highlight', e.target.checked)}
              />
              Destacado
            </label>
          </div>
        </div>
      </div>
    </Modal>
  );
}