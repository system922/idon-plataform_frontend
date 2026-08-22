import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import {
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiEye, FiCode,
  FiCheck, FiAlertCircle, 
} from 'react-icons/fi';
import { adminApi } from '../../config/api';

const TYPE_COLORS = {
  bienvenida:        '#22c55e',
  recordatorio_pago: '#f59e0b',
  suspension:        '#ef4444',
  activacion:        '#6366f1',
};
const PALETTE = ['#22c55e','#f59e0b','#ef4444','#6366f1','#3b82f6','#8b5cf6','#ec4899','#14b8a6'];
const colorFor = (type, i) => TYPE_COLORS[type] || PALETTE[i % PALETTE.length];

export default function EmailTemplatesPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await adminApi.get('/admin/email-templates');
      setTemplates(r.data || r || []);
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

  const handleDelete = async (type, label) => {
    if (!await showConfirm({
      title: '⚠️ Eliminar plantilla',
      message: `¿Eliminar la plantilla "${label}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    })) return;
    setDeleting(type);
    try {
      await adminApi.delete(`/admin/email-templates/${type}`);
      await load();
      alert.success('Plantilla eliminada correctamente', '✅ Éxito');
    } catch (e) {
      alert.error('Error: ' + e.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (tpl) => {
    try {
      await adminApi.put(`/admin/email-templates/${tpl.type}`, {
        ...tpl, is_active: !tpl.is_active,
      });
      await load();
      alert.success(
        tpl.is_active ? 'Plantilla desactivada' : 'Plantilla activada',
        '✅ Éxito'
      );
    } catch (e) {
      alert.error('Error: ' + e.message);
    }
  };

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.type?.toLowerCase().includes(term) ||
        t.label?.toLowerCase().includes(term) ||
        t.subject?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    if (filterStatus === 'active') {
      result = result.filter(t => t.is_active !== false);
    } else if (filterStatus === 'inactive') {
      result = result.filter(t => t.is_active === false);
    }

    return result;
  }, [templates, searchTerm, filterStatus]);

  const statusOptions = [
    { value: 'todos', label: `Todos (${templates.length})` },
    { value: 'active', label: `Activos (${templates.filter(t => t.is_active !== false).length})` },
    { value: 'inactive', label: `Inactivos (${templates.filter(t => t.is_active === false).length})` },
  ];

  const columns = [
    {
      accessor: 'type',
      label: 'Tipo',
      render: (item, index) => {
        const clr = colorFor(item.type, index);
        return (
          <span className="email-type-badge" style={{ background: `${clr}18`, color: clr, borderColor: `${clr}44` }}>
            {item.type}
          </span>
        );
      },
    },
    {
      accessor: 'label',
      label: 'Nombre',
      render: (item) => (
        <div>
          <strong>{item.label}</strong>
          {item.description && (
            <div className="email-template-desc">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'subject',
      label: 'Asunto',
      render: (item) => (
        <span className="email-template-subject">{item.subject || '—'}</span>
      ),
    },
    {
      accessor: 'variables',
      label: 'Variables',
      render: (item) => (
        <div className="email-template-vars">
          {(item.variables || []).map(v => (
            <span key={v} className="email-template-var">{`{{${v}}}`}</span>
          ))}
        </div>
      ),
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        <button
          onClick={() => handleToggle(item)}
          className={`email-status-btn ${item.is_active !== false ? 'active' : 'inactive'}`}
        >
          {item.is_active !== false ? '✓ Activa' : '✗ Inactiva'}
        </button>
      ),
    },
    {
      accessor: 'updated_at',
      label: 'Actualizado',
      render: (item) => (
        <span className="email-template-updated">
          {item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
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
            onClick={() => handleDelete(item.type, item.label)}
            disabled={deleting === item.type}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  const toolbar = (
    <div className="email-templates-toolbar">
      <CustomCombobox
        options={statusOptions}
        value={filterStatus}
        onChange={setFilterStatus}
        placeholder="Filtrar por estado"
        filterable={false}
        size="sm"
        className="email-templates-filter"
      />
      <ButtonGroup>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => setEditModal('new')}
        >
          Nueva plantilla
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

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

  return (
    <PageTemplate
      title="PLANTILLAS DE EMAIL"
      subtitle="Edita y gestiona los correos enviados a dueños de negocios sobre pagos y suscripciones"
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
        data={filteredTemplates}
        columns={columns}
        keyField="type"
        title="Plantillas de Email"
        subtitle={`${filteredTemplates.length} ${filteredTemplates.length === 1 ? 'plantilla' : 'plantillas'} encontradas`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por tipo, nombre, asunto o descripción..."
        searchFields={['type', 'label', 'subject', 'description']}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filterStatus !== 'todos'
            ? 'No hay plantillas que coincidan con los filtros aplicados'
            : 'No hay plantillas registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {editModal && (
        <EditModal
          tpl={editModal === 'new' ? null : editModal}
          onClose={() => setEditModal(null)}
          onSaved={() => { setEditModal(null); load(); }}
        />
      )}
    </PageTemplate>
  );
}

function EditModal({ tpl, onClose, onSaved }) {
  const alert = useAlert();
  const isNew = !tpl;
  const [form, setForm] = useState({
    type:        tpl?.type        || '',
    label:       tpl?.label       || '',
    description: tpl?.description || '',
    subject:     tpl?.subject     || '',
    body:        tpl?.body        || '',
    is_active:   tpl?.is_active   !== false,
  });
  const [tab, setTab] = useState('edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const detectedVars = [...new Set(
    (form.body.match(/\{\{(\w+)\}\}/g) || []).map(v => v.slice(2, -2))
  )];

  const setFormField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.label.trim() || !form.subject.trim() || !form.body.trim()) {
      setError('❌ Nombre, asunto y cuerpo son requeridos');
      return;
    }
    if (isNew && !form.type.trim()) {
      setError('❌ El tipo es requerido');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { ...form, variables: detectedVars };
      if (isNew) {
        await adminApi.post('/admin/email-templates', payload);
        alert.success('Plantilla creada correctamente', '✅ Éxito');
      } else {
        await adminApi.put(`/admin/email-templates/${tpl.type}`, payload);
        alert.success('Plantilla actualizada correctamente', '✅ Éxito');
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
          disabled={saving || !form.label || !form.subject || !form.body || (isNew && !form.type)}
          loading={saving}
        >
          {saving ? 'Guardando...' : isNew ? 'Crear plantilla' : 'Guardar cambios'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={isNew ? 'Nueva Plantilla' : `Editar: ${tpl?.label}`}
      size="lg"
      className="email-templates-modal"
      footer={footer}
    >
      <div className="email-templates-form">
        <div className="email-templates-form-row">
          {isNew && (
            <div className="email-templates-form-group">
              <label>Tipo / clave única *</label>
              <Input
                type="text"
                value={form.type}
                onChange={(value) => setFormField('type', value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                placeholder="ej: recordatorio_pago"
                size="md"
                required
              />
            </div>
          )}
          <div className="email-templates-form-group">
            <label>Nombre visible *</label>
            <Input
              type="text"
              value={form.label}
              onChange={(value) => setFormField('label', value)}
              placeholder="ej: Recordatorio de pago"
              size="md"
              required
            />
          </div>
          <div className="email-templates-form-group">
            <label>Estado</label>
            <button
              type="button"
              onClick={() => setFormField('is_active', !form.is_active)}
              className={`email-status-toggle ${form.is_active !== false ? 'active' : 'inactive'}`}
            >
              {form.is_active !== false ? '✓ Activa' : '✗ Inactiva'}
            </button>
          </div>
        </div>

        <div className="email-templates-form-group">
          <label>Descripción</label>
          <Input
            type="text"
            value={form.description}
            onChange={(value) => setFormField('description', value)}
            placeholder="¿Cuándo se usa esta plantilla?"
            size="md"
          />
        </div>

        <div className="email-templates-form-group">
          <label>Asunto del email *</label>
          <Input
            type="text"
            value={form.subject}
            onChange={(value) => setFormField('subject', value)}
            placeholder="ej: Recordatorio de pago — {{business_name}}"
            size="md"
            required
          />
        </div>

        <div className="email-templates-vars-hint">
          <span className="email-templates-vars-label">Disponibles:</span>
          {['owner_name', 'business_name', 'amount', 'due_date'].map(v => (
            <span key={v} className="email-templates-var-hint">{`{{${v}}}`}</span>
          ))}
          {detectedVars.length > 0 && (
            <>
              <span className="email-templates-vars-separator">· Detectadas en cuerpo:</span>
              {detectedVars.map(v => (
                <span key={v} className="email-templates-var-detected">{`{{${v}}}`}</span>
              ))}
            </>
          )}
        </div>

        <div className="email-templates-body-section">
          <div className="email-templates-body-header">
            <label>Cuerpo HTML *</label>
            <div className="email-templates-tabs">
              <button
                type="button"
                className={`email-templates-tab ${tab === 'edit' ? 'active' : ''}`}
                onClick={() => setTab('edit')}
              >
                <FiCode size={11} /> Código
              </button>
              <button
                type="button"
                className={`email-templates-tab ${tab === 'preview' ? 'active' : ''}`}
                onClick={() => setTab('preview')}
              >
                <FiEye size={11} /> Vista previa
              </button>
            </div>
          </div>

          {tab === 'edit' ? (
            <textarea
              className="email-templates-textarea"
              value={form.body}
              onChange={(e) => setFormField('body', e.target.value)}
              placeholder="<p>Estimado <strong>{{owner_name}}</strong>, ...</p>"
              spellCheck={false}
            />
          ) : (
            <div className="email-templates-preview">
              <iframe
                title="email-preview"
                srcDoc={form.body}
                className="email-templates-iframe"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}