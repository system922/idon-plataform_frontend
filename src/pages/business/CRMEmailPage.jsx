import React, { useState, useEffect, useRef } from 'react';
import { useSession } from '../../context/SessionContext'; 
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiSend, FiEye, FiX, FiCheck, FiAlertCircle,
  FiMail, FiUsers, FiLoader, FiCheckCircle, FiXCircle,
  FiImage, FiUploadCloud, FiRefreshCw
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api'; 
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';
import SearchInput from '../../components/General/SearchInput';
import Table from '../../components/General/Table';
import '../../styles/CrmEmail.css';

// ── Marcadores para identificar plantilla simple ─────────────────────────────
const MARK_START = '<!--IDON_START-->';
const MARK_END   = '<!--IDON_END-->';

function buildSimpleHtml(text, imageUrl = '') {
  const lines = text.split('\n').map(l =>
    l.trim()
      ? `<p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.7">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>`
      : '<br>'
  ).join('');
  const imgBlock = imageUrl
    ? `<img src="${imageUrl}" alt="" style="width:100%;border-radius:10px;margin-bottom:20px;display:block;max-height:320px;object-fit:cover" />`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b"><div style="background:#ff8c42;padding:24px 28px;border-radius:10px 10px 0 0;text-align:center"><h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:1px">{{business_name}}</h1>{{business_address}}</div><div style="background:#f8fafc;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px">${imgBlock}<p style="margin:0 0 20px;font-size:15px">Hola <strong>{{customer_name}}</strong>,</p>${MARK_START}${lines}${MARK_END}<p style="margin:24px 0 0;font-size:11px;color:#cbd5e1;text-align:center">{{business_name}}{{business_address}}</p></div></div>`;
}

function extractSimpleText(html) {
  const s = html.indexOf(MARK_START), e = html.indexOf(MARK_END);
  if (s === -1 || e === -1) return null;
  return html.slice(s + MARK_START.length, e)
    .replace(/<br>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').trim();
}

function stripHtml(html) {
  return html
    .replace(/<!--.*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Modal de envío ────────────────────────────────────────────────────────────
function CampaignSendModal({ campaign, onClose, onSent }) {
  const [mode, setMode] = useState('all');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loadingCust, setLoadingCust] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [segments, setSegments] = useState([]);
  const [loadingSegs, setLoadingSegs] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    if (mode === 'selection' && !customers.length) {
      setLoadingCust(true);
      // ✅ SIN /api
      fetchWithAuth('/customers?limit=500')
        .then(r => r.json())
        .then(data => setCustomers((data?.data || (Array.isArray(data) ? data : [])).filter(c => c.email && c.is_active !== false)))
        .catch(() => setCustomers([]))
        .finally(() => setLoadingCust(false));
    }
    if (mode === 'segment' && !segments.length) {
      setLoadingSegs(true);
      // ✅ SIN /api
      fetchWithAuth('/crm/segments')
        .then(r => r.json())
        .then(data => setSegments(data?.data || []))
        .catch(() => setSegments([]))
        .finally(() => setLoadingSegs(false));
    }
  }, [mode]);

  const filtered = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCustomer = (id) => setSelectedIds(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };

  const recipientCount = mode === 'selection' ? selectedIds.size : segments.find(s => s.id === selectedSegment)?.count ?? 0;
  const canSend = mode === 'all' || (mode === 'selection' && selectedIds.size > 0) || (mode === 'segment' && selectedSegment);

  const handleSend = async () => {
    setSending(true); setErr('');
    try {
      const body = mode === 'all'
        ? { send_to_all: true }
        : mode === 'selection'
        ? { send_to_all: false, customer_ids: [...selectedIds] }
        : { send_to_all: false, segment_id: selectedSegment };
      const res = await fetchWithAuth(`/crm/email-campaigns/${campaign.id}/send`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setResult(data); onSent(data);
    } catch (e) { setErr(e.message); } finally { setSending(false); }
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Enviar campaña"
      size="md"
      footer={
        !result ? (
          <ButtonGroup>
            <IconTextButton
              variant="success"
              size="md"
              icon={sending ? <FiLoader className="spin" size={15} /> : <FiSend size={15} />}
              onClick={handleSend}
              disabled={sending || !canSend}
              loading={sending}
            >
              {sending ? 'Enviando…' : `Enviar${recipientCount ? ` (${recipientCount})` : ''}`}
            </IconTextButton>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<FiX size={15} />}
              onClick={onClose}
              disabled={sending}
            >
              Cancelar
            </IconTextButton>
          </ButtonGroup>
        ) : (
          <ButtonGroup>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiCheck size={15} />}
              onClick={onClose}
            >
              Cerrar
            </IconTextButton>
          </ButtonGroup>
        )
      }
    >
      <div className="crm-send-modal-body">
        <div className="crm-campaign-info">
          <div className="crm-campaign-info-label">Campaña</div>
          <div className="crm-campaign-info-title">{campaign.title}</div>
          <div className="crm-campaign-info-subject">Asunto: {campaign.subject}</div>
        </div>

        {!result && (
          <>
            <div className="crm-mode-selector">
              <div className="crm-mode-selector-label">¿A quién enviar?</div>
              <div className="crm-mode-selector-options">
                {[
                  { id: 'all', icon: '👥', label: 'Todos' },
                  { id: 'selection', icon: '✓', label: 'Seleccionar' },
                  { id: 'segment', icon: '🎯', label: 'Segmento' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    className={`crm-mode-btn ${mode === opt.id ? 'active' : ''}`}
                    onClick={() => { setMode(opt.id); setSelectedIds(new Set()); setSelectedSegment(null); }}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'all' && (
              <div className="crm-all-mode-info">
                <FiUsers size={14} /> Se enviará a todos los clientes activos con email registrado
              </div>
            )}

            {mode === 'selection' && (
              <div className="crm-selection-mode">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar cliente..."
                  size="sm"
                />
                <div className="crm-customer-list-header">
                  <button className="crm-select-all-btn" onClick={toggleAll}>
                    {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                  <span className="crm-customer-counter">{selectedIds.size} sel. · {filtered.length} con email</span>
                </div>
                {loadingCust ? (
                  <div className="crm-loading-text">Cargando clientes...</div>
                ) : (
                  <div className="crm-customer-list">
                    {filtered.map((c, i) => (
                      <div
                        key={c.id}
                        className={`crm-customer-item ${selectedIds.has(c.id) ? 'selected' : ''}`}
                        onClick={() => toggleCustomer(c.id)}
                      >
                        <div className={`crm-customer-check ${selectedIds.has(c.id) ? 'checked' : ''}`}>
                          {selectedIds.has(c.id) && <FiCheck size={10} />}
                        </div>
                        <div className="crm-customer-info">
                          <div className="crm-customer-name">{c.name}</div>
                          <div className="crm-customer-email">{c.email}</div>
                        </div>
                        {c.phone && <span className="crm-customer-phone">{c.phone}</span>}
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <div className="crm-empty-list">
                        {customers.length === 0 ? 'No hay clientes con email registrado' : 'Sin resultados'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'segment' && (
              <div className="crm-segment-mode">
                {loadingSegs ? (
                  <div className="crm-loading-text">Cargando segmentos...</div>
                ) : (
                  <div className="crm-segment-list">
                    {segments.filter(s => s.count > 0).map(seg => (
                      <div
                        key={seg.id}
                        className={`crm-segment-item ${selectedSegment === seg.id ? 'selected' : ''}`}
                        onClick={() => setSelectedSegment(seg.id)}
                      >
                        <span className="crm-segment-icon">{seg.icon}</span>
                        <div className="crm-segment-info">
                          <div className={`crm-segment-name ${selectedSegment === seg.id ? 'active' : ''}`}>
                            {seg.name}
                          </div>
                          <div className="crm-segment-desc">{seg.description}</div>
                        </div>
                        <span className="crm-segment-count">{seg.count} clientes</span>
                      </div>
                    ))}
                    {segments.filter(s => s.count > 0).length === 0 && (
                      <div className="crm-empty-list">No hay segmentos con clientes disponibles</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="crm-send-hint">
              El nombre del cliente y tu negocio se insertan automáticamente en cada correo
            </div>

            {canSend && (
              <div className="crm-send-info">
                <FiSend size={13} />
                {mode === 'all' ? 'Todos los clientes activos con email' : `${recipientCount} destinatario${recipientCount !== 1 ? 's' : ''} seleccionado${recipientCount !== 1 ? 's' : ''}`}
              </div>
            )}
          </>
        )}

        {result && (
          <div className="crm-send-result">
            <div className="crm-send-result-title"><FiCheckCircle size={16} /> ¡Envío completado!</div>
            <div className="crm-send-result-sent">✅ Enviados: <strong>{result.sent_count || 0}</strong> de <strong>{result.total || 0}</strong></div>
            {result.failed > 0 && <div className="crm-send-result-failed">❌ Fallidos: <strong>{result.failed}</strong></div>}
          </div>
        )}

        {err && (
          <div className="crm-send-error">
            <FiXCircle size={13} /> {err}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CrmEmail() {
  const { user } = useSession(); // ✅ AGREGADO
  const { showConfirm } = useConfirm();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bizInfo, setBizInfo] = useState({ name: '', address: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendModalCampaign, setSendModalCampaign] = useState(null);

  // Estado del formulario
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formActive, setFormActive] = useState(true);
  const [editorTab, setEditorTab] = useState('write');

  // Imagen de campaña
  const [imgUrl, setImgUrl] = useState('');
  const [imgPreview, setImgPreview] = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [imgUploading, setImgUploading] = useState(false);
  const imgInputRef = useRef(null);
  const msgRef = useRef(null);

  const loadCampaigns = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithAuth('/crm/email-campaigns');
      if (!res.ok) throw new Error('Error al cargar campañas');
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadCampaigns();
    fetchWithAuth('/einvoicing/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setBizInfo({
          name: d.nombre_comercial || d.razon_social || '',
          address: d.direccion_establecimiento || d.direccion_matriz || '',
        });
      })
      .catch(() => {});
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const openModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormTitle(campaign.title);
      setFormSubject(campaign.subject);
      const extracted = extractSimpleText(campaign.content || '');
      setFormMessage(extracted !== null ? extracted : campaign.content || '');
      setFormActive(campaign.is_active);
      setImgUrl(campaign.image_url || '');
    } else {
      setEditingCampaign(null);
      setFormTitle('');
      setFormSubject('');
      setFormMessage('');
      setFormActive(true);
      setImgUrl('');
    }
    setImgPreview('');
    setImgFile(null);
    setEditorTab('write');
    setError('');
    setModalOpen(true);
  };

  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImgFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleImgUpload = async () => {
    if (!imgFile) return;
    setImgUploading(true);
    try {
      const form = new FormData();
      form.append('file', imgFile);
      const res = await fetchWithAuth('/crm/email-campaigns/upload-image', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen');
      setImgUrl(data.image_url);
      setImgPreview('');
      setImgFile(null);
      if (imgInputRef.current) imgInputRef.current.value = '';
    } catch (e) {
      setError(e.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setImgUploading(false);
    }
  };

  const removeImg = () => {
    setImgUrl(''); setImgPreview(''); setImgFile(null);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const insertVar = (variable) => {
    const el = msgRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const next = formMessage.slice(0, start) + variable + formMessage.slice(end);
    setFormMessage(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  const renderReal = (html) => {
    const name = bizInfo.name || 'Tu negocio';
    const address = bizInfo.address || '';
    return html
      .replace(/\{\{customer_name\}\}/g, 'Cliente de ejemplo')
      .replace(/\{\{business_name\}\}/g, name)
      .replace(/\{\{business_address\}\}/g,
        address ? `<br><span style="font-size:11px;color:#fff3e0">${address}</span>` : ''
      );
  };

  const previewHtml = buildSimpleHtml(
    formMessage
      .replace(/\{\{customer_name\}\}/g, 'Juan Pérez')
      .replace(/\{\{business_name\}\}/g, 'Mi Negocio')
      .replace(/\{\{business_address\}\}/g, 'Av. Principal 123'),
    imgUrl || imgPreview
  ).replace(/\{\{business_name\}\}/g, 'Mi Negocio')
   .replace(/\{\{business_address\}\}/g, '<br><span style="font-size:11px;color:#fff3e0">Av. Principal 123</span>');

  const handleSave = async () => {
    if (!formTitle.trim() || !formSubject.trim() || !formMessage.trim()) {
      setError('El nombre, asunto y mensaje son obligatorios');
      return;
    }
    setError(''); setSaving(true);
    try {
      let finalImgUrl = imgUrl;
      if (imgFile && !imgUrl) {
        setImgUploading(true);
        const form = new FormData();
        form.append('file', imgFile);
        // ✅ SIN /api
        const upRes = await fetchWithAuth('/crm/email-campaigns/upload-image', { method: 'POST', body: form });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir imagen');
        finalImgUrl = upData.image_url;
        setImgUrl(finalImgUrl);
        setImgFile(null);
        setImgPreview('');
        setImgUploading(false);
      }

      const payload = {
        title: formTitle.trim(),
        subject: formSubject.trim(),
        content: buildSimpleHtml(formMessage.trim(), finalImgUrl),
        is_active: formActive,
        image_url: finalImgUrl || null,
      };
      // ✅ SIN /api
      const url = editingCampaign ? `/crm/email-campaigns/${editingCampaign.id}` : '/crm/email-campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Error al guardar'); }
      setSuccess(editingCampaign ? 'Campaña actualizada' : 'Campaña creada');
      setModalOpen(false);
      loadCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    } finally {
      setSaving(false);
      setImgUploading(false);
    }
  };

  const handleDelete = async (campaign) => {
    if (!await showConfirm(`¿Eliminar la campaña "${campaign.title}"?`)) return;
    try {
      const res = await fetchWithAuth(`/crm/email-campaigns/${campaign.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      setSuccess('Campaña eliminada'); loadCampaigns();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.message); setTimeout(() => setError(''), 3000); }
  };

  const handleSendDone = (data) => {
    let msg = `¡Campaña enviada! ✅ Enviados: ${data.sent_count || 0} de ${data.total || 0}`;
    if (data.failed > 0) msg += ` ❌ Fallidos: ${data.failed}`;
    setSuccess(msg); loadCampaigns();
    setTimeout(() => setSuccess(''), 8000);
  };

  // ── Columnas para la tabla ──────────────────────────────────────────────────
  const columns = [
    {
      accessor: 'title',
      label: 'Campaña',
      render: (item) => (
        <div>
          <div className="crm-table-title">{item.title}</div>
          <div className="crm-table-subject">{item.subject}</div>
        </div>
      )
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => (
        <span className={`campaign-status ${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Activa' : 'Inactiva'}
        </span>
      )
    },
    {
      accessor: 'created_at',
      label: 'Creada',
      render: (item) => (
        <span className="crm-table-date">
          {new Date(item.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline
            icon={<FiEdit2 size={14} />}
            onClick={() => openModal(item)}
            disabled={saving}
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="info"
            size="sm"
            inline
            icon={<FiEye size={14} />}
            onClick={() => { setEditingCampaign(item); setPreviewOpen(true); }}
          >
            Ver
          </IconTextButton>
          <IconTextButton
            variant="success"
            size="sm"
            inline
            icon={<FiSend size={14} />}
            onClick={() => setSendModalCampaign(item)}
            disabled={!item.is_active}
            tooltip={!item.is_active ? 'Activa la campaña para poder enviarla' : ''}
          >
            Enviar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline
            icon={<FiTrash2 size={14} />}
            onClick={() => handleDelete(item)}
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      )
    }
  ];

  // ── Toolbar personalizado ──────────────────────────────────────────────────
  const toolbar = (
    <div className="crm-toolbar">
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => openModal()}
          disabled={saving}
          loading={saving}
        >
          Nueva campaña
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

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Email Marketing"
      subtitle="Crea y envía campañas de email a tus clientes"
      loading={loading}
      headerAction={refreshButton}
    >
      <div className="crm-email-container">
        {error && (
          <div className="crm-alert error">
            <FiAlertCircle size={15} /> {error}
          </div>
        )}
        {success && (
          <div className="crm-alert success">
            <FiCheckCircle size={15} /> {success}
          </div>
        )}

        <Table
          data={campaigns}
          columns={columns}
          keyField="id"
          title="Campañas de Email"
          subtitle={`${campaigns.length} campañas registradas`}
          toolbar={toolbar}
          searchable
          searchPlaceholder="Buscar campaña..."
          searchFields={['title', 'subject']}
          pagination={true}
          itemsPerPage={itemsPerPage}
          itemsPerPageOptions={[10, 15]}
          onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
          loading={loading}
          emptyMessage="No hay campañas registradas"
          striped
          hoverable
          bordered={false}
        />

        {/* ── Modal crear / editar ──────────────────────────────────────── */}
        {modalOpen && (
          <Modal
            closeOnOverlayClick={false}
            isOpen={true}
            onClose={() => setModalOpen(false)}
            title={
              <div className="crm-modal-title">
                <span className="crm-modal-title-icon"><FiMail size={16} /></span>
                {editingCampaign ? 'Editar campaña' : 'Nueva campaña'}
              </div>
            }
            size="md"
            footer={
              <ButtonGroup>
                <IconTextButton
                  variant="danger"
                  size="md"
                  icon={<FiX size={14} />}
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={saving || imgUploading ? <FiLoader className="spin" size={14} /> : <FiCheck size={14} />}
                  onClick={handleSave}
                  disabled={saving || imgUploading}
                  loading={saving || imgUploading}
                >
                  {imgUploading ? 'Subiendo imagen…' : saving ? 'Guardando…' : editingCampaign ? 'Guardar cambios' : 'Crear campaña'}
                </IconTextButton>
              </ButtonGroup>
            }
          >
            <div className="crm-modal-body-fields">
              {/* Nombre interno */}
              <div className="crm-modal-field">
                <label className="crm-modal-label">
                  Nombre interno <span className="req">*</span>
                </label>
                <Input
                  type="text"
                  value={formTitle}
                  onChange={setFormTitle}
                  placeholder="Ej: Promo Mayo 2026 — solo para tu referencia"
                  size="md"
                />
                <p className="crm-modal-hint">Solo tú lo verás, no aparece en el correo.</p>
              </div>

              {/* Asunto */}
              <div className="crm-modal-field">
                <label className="crm-modal-label">Asunto del correo <span className="req">*</span></label>
                <Input
                  type="text"
                  value={formSubject}
                  onChange={setFormSubject}
                  placeholder="Ej: ¡Tenemos una oferta especial para ti, {{customer_name}}!"
                  size="md"
                />
                <p className="crm-modal-hint">Lo primero que verán tus clientes en su bandeja de entrada.</p>
              </div>

              {/* Mensaje */}
              <div className="crm-modal-field">
                <label className="crm-modal-label">Mensaje <span className="req">*</span></label>

                <div className="crm-editor-tabs">
                  {[
                    ['write', 'Escribir'],
                    ['preview', 'Vista previa']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setEditorTab(id)}
                      className={`crm-editor-tab${editorTab === id ? ' active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {editorTab === 'write' ? (
                  <>
                    <div className="crm-vars-row">
                      <span className="crm-vars-label">Insertar:</span>
                      {[
                        ['{{customer_name}}', '👤 Nombre cliente'],
                        ['{{business_name}}', '🏪 Negocio'],
                        ['{{business_address}}', '📍 Dirección'],
                      ].map(([val, label]) => (
                        <button key={val} className="crm-var-chip" onClick={() => insertVar(val)}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      ref={msgRef}
                      className="crm-msg-textarea"
                      value={formMessage}
                      onChange={e => setFormMessage(e.target.value)}
                      rows={9}
                      placeholder="Escribe tu mensaje aquí...\n\nEj: Este mes tenemos 20% de descuento en todos nuestros productos.\n¡Visítanos y presenta este correo!"
                    />
                    <p className="crm-modal-hint">Escríbelo como un correo normal. El diseño se aplica automáticamente.</p>
                  </>
                ) : (
                  <div className="crm-preview-container">
                    <div className="crm-preview-header">Vista previa con datos de ejemplo</div>
                    <iframe
                      srcDoc={previewHtml}
                      title="preview"
                      className="crm-preview-iframe"
                      sandbox="allow-same-origin"
                    />
                  </div>
                )}
              </div>

              {/* Imagen */}
              <div className="crm-modal-field">
                <label className="crm-modal-label">
                  Imagen de campaña <span className="opt">(opcional)</span>
                </label>

                {(imgUrl || imgPreview) ? (
                  <div className="crm-img-preview-container">
                    <img
                      src={imgUrl || imgPreview}
                      alt="preview"
                      className="crm-img-preview"
                    />
                    <button
                      onClick={removeImg}
                      className="crm-img-remove-btn"
                    >
                      <FiX size={14} />
                    </button>
                    {imgUrl && (
                      <div className="crm-img-badge crm-img-badge-saved">
                        <FiCheckCircle size={11} /> Guardada
                      </div>
                    )}
                    {imgPreview && !imgUrl && (
                      <div className="crm-img-badge crm-img-badge-pending">
                        Pendiente de subir
                      </div>
                    )}
                  </div>
                ) : (
                  <label htmlFor="campaign-img-input" className="crm-img-zone">
                    <FiImage size={18} />
                    <span>{imgFile ? imgFile.name : 'Haz clic para seleccionar imagen (JPG, PNG, WebP)'}</span>
                  </label>
                )}

                <input
                  id="campaign-img-input"
                  ref={imgInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImgChange}
                  className="crm-img-input-hidden"
                />

                {imgFile && !imgUrl && (
                  <IconTextButton
                    variant="primary"
                    size="sm"
                    icon={imgUploading ? <FiLoader className="spin" size={14} /> : <FiUploadCloud size={14} />}
                    onClick={handleImgUpload}
                    disabled={imgUploading}
                    loading={imgUploading}
                    className="crm-img-upload-btn"
                  >
                    {imgUploading ? 'Subiendo…' : 'Subir imagen'}
                  </IconTextButton>
                )}
                <p className="crm-modal-hint">Aparecerá en la parte superior del correo. Máx. 8 MB. Si no subes la imagen manualmente, se sube automáticamente al guardar.</p>
              </div>

              {/* Activar */}
              <div className="crm-toggle-row" onClick={() => setFormActive(v => !v)}>
                <div className={`crm-toggle ${formActive ? 'active' : ''}`}>
                  <div className={`crm-toggle-thumb ${formActive ? 'active' : ''}`} />
                </div>
                <div>
                  <div className={`crm-toggle-label ${formActive ? 'active' : ''}`}>
                    {formActive ? 'Campaña activa' : 'Campaña inactiva'}
                  </div>
                  <div className="crm-toggle-sub">
                    {formActive ? 'Disponible para enviar a clientes' : 'No aparecerá en opciones de envío'}
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* ── Modal vista previa ────────────────────────────────────────── */}
        {previewOpen && editingCampaign && (
          <Modal
            closeOnOverlayClick={false}
            isOpen={true}
            onClose={() => setPreviewOpen(false)}
            title={editingCampaign.title}
            size="md"
            footer={
              <ButtonGroup>
                <IconTextButton
                  variant="secondary"
                  size="md"
                  icon={<FiX size={14} />}
                  onClick={() => setPreviewOpen(false)}
                >
                  Cerrar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiSend size={14} />}
                  onClick={() => { setPreviewOpen(false); setSendModalCampaign(editingCampaign); }}
                  disabled={!editingCampaign.is_active}
                >
                  Enviar esta campaña
                </IconTextButton>
              </ButtonGroup>
            }
          >
            <div className="crm-preview-modal-body">
              <div className="crm-preview-subject">
                <FiMail size={13} /> {editingCampaign.subject}
              </div>
              <iframe
                srcDoc={renderReal(editingCampaign.content || '')}
                title="preview-real"
                className="crm-preview-iframe-real"
                sandbox="allow-same-origin"
              />
            </div>
          </Modal>
        )}

        {/* ── Modal de envío ────────────────────────────────────────────── */}
        {sendModalCampaign && (
          <CampaignSendModal
            campaign={sendModalCampaign}
            onClose={() => setSendModalCampaign(null)}
            onSent={handleSendDone}
          />
        )}
      </div>
    </PageTemplate>
  );
}