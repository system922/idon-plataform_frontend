import React, { useState, useEffect, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import {
  Plus, Edit2, Trash2, Send, Eye, X, Check, AlertCircle,
  Mail, Users, Calendar, Loader, CheckCircle, XCircle, Filter, Search,
  Image, UploadCloud,
} from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase';
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

// ── Modal de envío con selección de destinatarios ────────────────────────────
function CampaignSendModal({ campaign, onClose, onSent }) {
  const [mode,            setMode]            = useState('all');
  const [sending,         setSending]         = useState(false);
  const [result,          setResult]          = useState(null);
  const [err,             setErr]             = useState('');
  const [customers,       setCustomers]       = useState([]);
  const [loadingCust,     setLoadingCust]     = useState(false);
  const [selectedIds,     setSelectedIds]     = useState(new Set());
  const [search,          setSearch]          = useState('');
  const [segments,        setSegments]        = useState([]);
  const [loadingSegs,     setLoadingSegs]     = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);

  useEffect(() => {
    if (mode === 'selection' && !customers.length) {
      setLoadingCust(true);
      fetchWithAuth('/api/customers?limit=500')
        .then(r => r.json())
        .then(data => setCustomers((data?.data || (Array.isArray(data) ? data : [])).filter(c => c.email && c.is_active !== false)))
        .catch(() => setCustomers([]))
        .finally(() => setLoadingCust(false));
    }
    if (mode === 'segment' && !segments.length) {
      setLoadingSegs(true);
      fetchWithAuth('/api/crm/segments')
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
      const res  = await fetchWithAuth(`/api/crm/email-campaigns/${campaign.id}/send`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setResult(data); onSent(data);
    } catch (e) { setErr(e.message); } finally { setSending(false); }
  };

  const S = { borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9', fontSize: 12 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 14, width: '100%', maxWidth: mode === 'selection' ? 680 : 460, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: 6 }}><Mail size={16} color="#10b981" /></div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Enviar campaña</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
          <div style={{ ...S, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 2 }}>Campaña</div>
            <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>{campaign.title}</div>
            <div style={{ color: '#cbd5e1', marginTop: 3, fontSize: 12 }}>Asunto: {campaign.subject}</div>
          </div>

          {!result && <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, fontWeight: 600 }}>¿A quién enviar?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ id: 'all', icon: '👥', label: 'Todos' }, { id: 'selection', icon: '✓', label: 'Seleccionar' }, { id: 'segment', icon: '🎯', label: 'Segmento' }].map(opt => (
                  <button key={opt.id} onClick={() => { setMode(opt.id); setSelectedIds(new Set()); setSelectedSegment(null); }} style={{
                    flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${mode === opt.id ? '#10b981' : '#334155'}`,
                    background: mode === opt.id ? 'rgba(16,185,129,0.12)' : '#0f172a',
                    color: mode === opt.id ? '#10b981' : '#94a3b8',
                  }}>{opt.icon} {opt.label}</button>
                ))}
              </div>
            </div>

            {mode === 'all' && (
              <div style={{ ...S, padding: '12px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: '#60d5c0', fontSize: 13, fontWeight: 600 }}>
                <Users size={14} /> Se enviará a todos los clientes activos con email registrado
              </div>
            )}

            {mode === 'selection' && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..."
                    style={{ ...S, width: '100%', padding: '8px 12px 8px 30px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <button onClick={toggleAll} style={{ fontSize: 11, color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{selectedIds.size} sel. · {filtered.length} con email</span>
                </div>
                {loadingCust ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>Cargando clientes...</div>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid #334155', borderRadius: 8 }}>
                    {filtered.map((c, i) => (
                      <div key={c.id} onClick={() => toggleCustomer(c.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer',
                        background: selectedIds.has(c.id) ? 'rgba(16,185,129,0.1)' : i % 2 === 0 ? '#0f172a' : '#1a2942',
                        borderBottom: i < filtered.length - 1 ? '1px solid #1e293b' : 'none',
                      }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${selectedIds.has(c.id) ? '#10b981' : '#475569'}`, background: selectedIds.has(c.id) ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedIds.has(c.id) && <Check size={10} color="#fff" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email}</div>
                        </div>
                        {c.phone && <span style={{ fontSize: 10, color: '#475569', flexShrink: 0 }}>{c.phone}</span>}
                      </div>
                    ))}
                    {filtered.length === 0 && (
                      <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                        {customers.length === 0 ? 'No hay clientes con email registrado' : 'Sin resultados'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {mode === 'segment' && (
              <div style={{ marginBottom: 14 }}>
                {loadingSegs ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#64748b', fontSize: 13 }}>Cargando segmentos...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {segments.filter(s => s.count > 0).map(seg => (
                      <div key={seg.id} onClick={() => setSelectedSegment(seg.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1.5px solid ${selectedSegment === seg.id ? seg.color : '#334155'}`,
                        background: selectedSegment === seg.id ? `${seg.color}14` : '#0f172a',
                      }}>
                        <span style={{ fontSize: 22 }}>{seg.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: selectedSegment === seg.id ? seg.color : '#f1f5f9' }}>{seg.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{seg.description}</div>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: seg.color, background: `${seg.color}20`, padding: '2px 10px', borderRadius: 20, flexShrink: 0 }}>{seg.count} clientes</span>
                      </div>
                    ))}
                    {segments.filter(s => s.count > 0).length === 0 && (
                      <div style={{ textAlign: 'center', padding: 20, color: '#64748b', fontSize: 13 }}>No hay segmentos con clientes disponibles</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ padding: '8px 12px', background: '#0f172a', borderRadius: 8, marginBottom: 14, fontSize: 11, color: '#64748b', borderLeft: '3px solid #334155' }}>
              💡 El nombre del cliente y tu negocio se insertan automáticamente en cada correo
            </div>

            {canSend && (
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                <Send size={13} />
                {mode === 'all' ? 'Todos los clientes activos con email' : `${recipientCount} destinatario${recipientCount !== 1 ? 's' : ''} seleccionado${recipientCount !== 1 ? 's' : ''}`}
              </div>
            )}
          </>}

          {result && (
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
                <CheckCircle size={16} /> ¡Envío completado!
              </div>
              <div style={{ color: '#cbd5e1', fontSize: 13 }}>✅ Enviados: <strong>{result.sent_count || 0}</strong> de <strong>{result.total || 0}</strong></div>
              {result.failed > 0 && <div style={{ color: '#f87171', marginTop: 4, fontSize: 13 }}>❌ Fallidos: <strong>{result.failed}</strong></div>}
            </div>
          )}

          {err && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
              <XCircle size={13} /> {err}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #334155', flexShrink: 0 }}>
          {!result ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSend} disabled={sending || !canSend} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 0', background: (sending || !canSend) ? '#064e3b' : '#10b981',
                color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14,
                cursor: (sending || !canSend) ? 'default' : 'pointer', opacity: !canSend ? 0.5 : 1,
              }}>
                {sending ? <Loader size={15} className="spin" /> : <Send size={15} />}
                {sending ? 'Enviando…' : `Enviar${recipientCount ? ` (${recipientCount})` : ''}`}
              </button>
              <button onClick={onClose} disabled={sending} style={{ padding: '10px 16px', background: '#1e293b', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={onClose} style={{ width: '100%', padding: '10px 0', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cerrar</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CrmEmail() {
  const { showConfirm } = useConfirm();
  const [campaigns,          setCampaigns]          = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');
  const [success,            setSuccess]            = useState('');
  const [bizInfo,            setBizInfo]            = useState({ name: '', address: '' });
  const [modalOpen,          setModalOpen]          = useState(false);
  const [editingCampaign,    setEditingCampaign]    = useState(null);
  const [previewOpen,        setPreviewOpen]        = useState(false);
  const [saving,             setSaving]             = useState(false);
  const [sendModalCampaign,  setSendModalCampaign]  = useState(null);

  // Estado del formulario
  const [formTitle,     setFormTitle]     = useState('');
  const [formSubject,   setFormSubject]   = useState('');
  const [formMessage,   setFormMessage]   = useState('');
  const [formActive,    setFormActive]    = useState(true);
  const [editorTab,     setEditorTab]     = useState('write'); // 'write' | 'preview'

  // Imagen de campaña
  const [imgUrl,        setImgUrl]        = useState('');   // URL guardada en Cloudinary
  const [imgPreview,    setImgPreview]    = useState('');   // preview local antes de subir
  const [imgFile,       setImgFile]       = useState(null);
  const [imgUploading,  setImgUploading]  = useState(false);
  const imgInputRef = useRef(null);

  const msgRef = useRef(null);

  const loadCampaigns = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetchWithAuth('/api/crm/email-campaigns');
      if (!res.ok) throw new Error('Error al cargar campañas');
      const data = await res.json();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
    loadCampaigns();
    fetchWithAuth('/api/einvoicing/config')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setBizInfo({
          name:    d.nombre_comercial || d.razon_social || '',
          address: d.direccion_establecimiento || d.direccion_matriz || '',
        });
      })
      .catch(() => {});
  }, []);

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
      const res  = await fetchWithAuth('/api/crm/email-campaigns/upload-image', { method: 'POST', body: form });
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

  // Insertar variable en la posición del cursor
  const insertVar = (variable) => {
    const el = msgRef.current;
    if (!el) return;
    const start = el.selectionStart, end = el.selectionEnd;
    const next = formMessage.slice(0, start) + variable + formMessage.slice(end);
    setFormMessage(next);
    setTimeout(() => { el.focus(); el.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };

  const renderReal = (html) => {
    const name    = bizInfo.name    || 'Tu negocio';
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
      // Si hay imagen seleccionada pero no subida aún, subirla primero
      let finalImgUrl = imgUrl;
      if (imgFile && !imgUrl) {
        setImgUploading(true);
        const form = new FormData();
        form.append('file', imgFile);
        const upRes  = await fetchWithAuth('/api/crm/email-campaigns/upload-image', { method: 'POST', body: form });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || 'Error al subir imagen');
        finalImgUrl = upData.image_url;
        setImgUrl(finalImgUrl);
        setImgFile(null);
        setImgPreview('');
        setImgUploading(false);
      }

      const payload = {
        title:     formTitle.trim(),
        subject:   formSubject.trim(),
        content:   buildSimpleHtml(formMessage.trim(), finalImgUrl),
        is_active: formActive,
        image_url: finalImgUrl || null,
      };
      const url    = editingCampaign ? `/api/crm/email-campaigns/${editingCampaign.id}` : '/api/crm/email-campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';
      const res    = await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
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
      const res = await fetchWithAuth(`/api/crm/email-campaigns/${campaign.id}`, { method: 'DELETE' });
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

  return (
    <PageTemplate
      title="Email Marketing"
      subtitle="Crea y envía campañas de email a tus clientes"
      loading={loading}
      headerAction={
        <button className="btn-primary" onClick={() => openModal()} disabled={saving}>
          <Plus size={16} /> Nueva campaña
        </button>
      }
    >
      <div className="crm-email-container">
        {error   && <div className="crm-alert error"><AlertCircle size={15} /> {error}</div>}
        {success && <div className="crm-alert success"><CheckCircle size={15} /> {success}</div>}

        <div className="campaigns-grid">
          {campaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Mail size={32} /></div>
              <h3>Sin campañas aún</h3>
              <p>Crea tu primera campaña y llega directamente a la bandeja de tus clientes</p>
              <button className="btn-primary" onClick={() => openModal()}><Plus size={14} /> Nueva campaña</button>
            </div>
          ) : campaigns.map(camp => (
            <div key={camp.id} className="campaign-card">
              {/* Thumbnail o placeholder */}
              {camp.image_url
                ? <img src={camp.image_url} alt="" className="campaign-thumb" />
                : (
                  <div className="campaign-thumb-placeholder">
                    <Mail size={24} color="rgba(255,140,66,0.3)" />
                  </div>
                )
              }

              <div className="campaign-body">
                <div className="campaign-header">
                  <div className="campaign-icon"><Mail size={17} /></div>
                  <div className="campaign-title-wrap">
                    <div className="campaign-title">{camp.title}</div>
                    <div className="campaign-subject">📩 {camp.subject}</div>
                  </div>
                  <div className={`campaign-status ${camp.is_active ? 'active' : 'inactive'}`}>
                    {camp.is_active ? 'Activa' : 'Inactiva'}
                  </div>
                </div>

                <div className="campaign-preview">
                  {stripHtml(camp.content || '').substring(0, 110)}{stripHtml(camp.content || '').length > 110 ? '…' : ''}
                </div>

                <div className="campaign-meta">
                  <Calendar size={12} />
                  {new Date(camp.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {camp.sent_at && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: '#334155' }}>·</span>
                      <CheckCircle size={11} color="#10b981" />
                      Enviada {new Date(camp.sent_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>

              <div className="campaign-actions">
                <button className="icon-btn edit" onClick={() => openModal(camp)} disabled={saving}>
                  <Edit2 size={15} /> Editar
                </button>
                <button className="icon-btn preview" onClick={() => { setEditingCampaign(camp); setPreviewOpen(true); }}>
                  <Eye size={15} /> Ver
                </button>
                <button className="icon-btn send" onClick={() => setSendModalCampaign(camp)} disabled={!camp.is_active}
                  title={!camp.is_active ? 'Activa la campaña para poder enviarla' : 'Enviar campaña'}>
                  <Send size={15} /> Enviar
                </button>
                <button className="icon-btn delete" onClick={() => handleDelete(camp)}>
                  <Trash2 size={15} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* ── Modal crear / editar ──────────────────────────────────────── */}
        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>

              <div className="modal-header">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                  <span style={{ background: 'linear-gradient(135deg,rgba(255,140,66,0.2),rgba(255,140,66,0.08))', border: '1px solid rgba(255,140,66,0.25)', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Mail size={16} color="#ff8c42" />
                  </span>
                  {editingCampaign ? 'Editar campaña' : 'Nueva campaña'}
                </h2>
                <button className="close-btn" onClick={() => setModalOpen(false)}><X size={20} /></button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Nombre interno */}
                <div className="crm-modal-field">
                  <label className="crm-modal-label">
                    Nombre interno <span className="req">*</span>
                  </label>
                  <input className="crm-modal-input" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                    placeholder="Ej: Promo Mayo 2026 — solo para tu referencia" />
                  <p className="crm-modal-hint">Solo tú lo verás, no aparece en el correo.</p>
                </div>

                {/* Asunto */}
                <div className="crm-modal-field">
                  <label className="crm-modal-label">Asunto del correo <span className="req">*</span></label>
                  <input className="crm-modal-input" value={formSubject} onChange={e => setFormSubject(e.target.value)}
                    placeholder="Ej: ¡Tenemos una oferta especial para ti, {{customer_name}}!" />
                  <p className="crm-modal-hint">Lo primero que verán tus clientes en su bandeja de entrada.</p>
                </div>

                {/* Mensaje */}
                <div className="crm-modal-field">
                  <label className="crm-modal-label">Mensaje <span className="req">*</span></label>

                  <div className="crm-editor-tabs">
                    {[['write', '✏️  Escribir'], ['preview', '👁  Vista previa']].map(([id, label]) => (
                      <button key={id} onClick={() => setEditorTab(id)}
                        className={`crm-editor-tab${editorTab === id ? ' active' : ''}`}>{label}</button>
                    ))}
                  </div>

                  {editorTab === 'write' ? (
                    <>
                      <div className="crm-vars-row">
                        <span className="crm-vars-label">Insertar:</span>
                        {[
                          ['{{customer_name}}',    '👤 Nombre cliente'],
                          ['{{business_name}}',    '🏪 Negocio'],
                          ['{{business_address}}', '📍 Dirección'],
                        ].map(([val, label]) => (
                          <button key={val} className="crm-var-chip" onClick={() => insertVar(val)}>{label}</button>
                        ))}
                      </div>
                      <textarea
                        ref={msgRef}
                        className="crm-msg-textarea"
                        value={formMessage}
                        onChange={e => setFormMessage(e.target.value)}
                        rows={9}
                        placeholder={'Escribe tu mensaje aquí...\n\nEj: Este mes tenemos 20% de descuento en todos nuestros productos.\n¡Visítanos y presenta este correo!'}
                      />
                      <p className="crm-modal-hint">Escríbelo como un correo normal. El diseño se aplica automáticamente.</p>
                    </>
                  ) : (
                    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '7px 14px', fontSize: 11, color: '#475569', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        Vista previa con datos de ejemplo
                      </div>
                      <iframe srcDoc={previewHtml} title="preview" style={{ width: '100%', border: 'none', minHeight: 380, display: 'block' }} sandbox="allow-same-origin" />
                    </div>
                  )}
                </div>

                {/* Imagen */}
                <div className="crm-modal-field">
                  <label className="crm-modal-label">
                    Imagen de campaña <span className="opt">(opcional)</span>
                  </label>

                  {(imgUrl || imgPreview) ? (
                    <div style={{ position: 'relative' }}>
                      <img src={imgUrl || imgPreview} alt="preview"
                        style={{ width: '100%', maxHeight: 190, objectFit: 'cover', borderRadius: 12, display: 'block', border: '1px solid rgba(255,255,255,0.08)' }} />
                      <button onClick={removeImg} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)' }}>
                        <X size={14} />
                      </button>
                      {imgUrl && (
                        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(16,185,129,0.9)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                          <CheckCircle size={11} /> Guardada
                        </div>
                      )}
                      {imgPreview && !imgUrl && (
                        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(234,179,8,0.9)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#000', fontWeight: 700 }}>
                          Pendiente de subir
                        </div>
                      )}
                    </div>
                  ) : (
                    <label htmlFor="campaign-img-input" className="crm-img-zone">
                      <Image size={18} />
                      <span>{imgFile ? imgFile.name : 'Haz clic para seleccionar imagen (JPG, PNG, WebP)'}</span>
                    </label>
                  )}

                  <input id="campaign-img-input" ref={imgInputRef} type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImgChange} style={{ display: 'none' }} />

                  {imgFile && !imgUrl && (
                    <button onClick={handleImgUpload} disabled={imgUploading} style={{
                      marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                      background: imgUploading ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.15)',
                      color: '#10b981', border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: imgUploading ? 'default' : 'pointer', width: 'fit-content',
                    }}>
                      {imgUploading ? <Loader size={14} className="spin" /> : <UploadCloud size={14} />}
                      {imgUploading ? 'Subiendo…' : 'Subir imagen'}
                    </button>
                  )}
                  <p className="crm-modal-hint">Aparecerá en la parte superior del correo. Máx. 8 MB. Si no subes la imagen manualmente, se sube automáticamente al guardar.</p>
                </div>

                {/* Activar */}
                <div className="crm-toggle-row" onClick={() => setFormActive(v => !v)} style={{ cursor: 'pointer' }}>
                  <div className="crm-toggle" style={{ background: formActive ? '#10b981' : '#1e293b', border: `1px solid ${formActive ? '#10b981' : 'rgba(255,255,255,0.1)'}` }}>
                    <div className="crm-toggle-thumb" style={{ left: formActive ? 21 : 3 }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: formActive ? '#f1f5f9' : '#64748b' }}>
                      {formActive ? 'Campaña activa' : 'Campaña inactiva'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                      {formActive ? 'Disponible para enviar a clientes' : 'No aparecerá en opciones de envío'}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="crm-alert error" style={{ marginBottom: 0 }}>
                    <AlertCircle size={14} /> {error}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving || imgUploading}>
                  {imgUploading ? <><Loader size={13} className="spin" /> Subiendo imagen…</> : saving ? 'Guardando…' : editingCampaign ? 'Guardar cambios' : 'Crear campaña'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal vista previa ────────────────────────────────────────── */}
        {previewOpen && editingCampaign && (
          <div className="modal-overlay" onClick={() => setPreviewOpen(false)}>
            <div className="modal-container modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
              <div className="modal-header">
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>{editingCampaign.title}</h2>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: '#475569' }}>
                    Datos reales de tu negocio · el cliente aparece como "Cliente de ejemplo"
                  </p>
                </div>
                <button className="close-btn" onClick={() => setPreviewOpen(false)}><X size={20} /></button>
              </div>
              <div className="modal-body" style={{ padding: '16px 20px 20px' }}>
                <div className="crm-preview-subject">
                  <Mail size={13} color="#64748b" /> {editingCampaign.subject}
                </div>
                <iframe
                  srcDoc={renderReal(editingCampaign.content || '')}
                  title="preview-real"
                  style={{ width: '100%', border: 'none', borderRadius: 12, minHeight: 500, display: 'block', background: '#fff' }}
                  sandbox="allow-same-origin"
                />
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setPreviewOpen(false)}>Cerrar</button>
                <button className="btn-primary" onClick={() => { setPreviewOpen(false); setSendModalCampaign(editingCampaign); }}
                  disabled={!editingCampaign.is_active}>
                  <Send size={14} /> Enviar esta campaña
                </button>
              </div>
            </div>
          </div>
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
