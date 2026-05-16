import React, { useState, useEffect } from 'react';
import {
  FiEdit2, FiRefreshCw, FiSearch, FiChevronDown, FiChevronUp,
  FiX, FiCheck, FiCreditCard, FiBriefcase, FiUser, FiMail,
  FiPhone, FiAlertCircle, FiBox, FiDollarSign, FiCalendar,
  FiSettings, FiShoppingCart, FiTruck, FiBarChart2,
  FiPackage, FiStar, FiChevronRight, FiShoppingBag, FiGrid,
  FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiThermometer, FiClipboard,
} from 'react-icons/fi';
import { useAlert } from '../../components/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import SubscriptionModal from './SubscriptionModal';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminDashboard.css';

const MOD_ICONS = {
  core: <FiSettings size={12}/>, pos: <FiShoppingCart size={12}/>,
  inventory: <FiBox size={12}/>, reports: <FiBarChart2 size={12}/>,
  payments: <FiCreditCard size={12}/>, accounting: <FiDollarSign size={12}/>,
  orders: <FiClipboard size={12}/>, delivery: <FiTruck size={12}/>,
  kitchen: <FiThermometer size={12}/>, tables: <FiGrid size={12}/>,
  reservations: <FiCalendar size={12}/>, loyalty: <FiStar size={12}/>,
  suppliers: <FiTruck size={12}/>, purchases: <FiShoppingBag size={12}/>,
  appointments: <FiCalendar size={12}/>, employees: <FiUsers size={12}/>,
  crm: <FiUserCheck size={12}/>, routes: <FiMap size={12}/>,
  tracking: <FiMapPin size={12}/>, queue: <FiList size={12}/>,
  ecommerce: <FiGlobe size={12}/>, notifications: <FiBell size={12}/>,
  einvoicing: <FiFileText size={12}/>,
};

const MOD_ICON_LG = {
  core: <FiSettings size={16}/>, pos: <FiShoppingCart size={16}/>,
  inventory: <FiBox size={16}/>, reports: <FiBarChart2 size={16}/>,
  payments: <FiCreditCard size={16}/>, accounting: <FiDollarSign size={16}/>,
  orders: <FiClipboard size={16}/>, delivery: <FiTruck size={16}/>,
  kitchen: <FiThermometer size={16}/>, tables: <FiGrid size={16}/>,
  reservations: <FiCalendar size={16}/>, loyalty: <FiStar size={16}/>,
  suppliers: <FiTruck size={16}/>, purchases: <FiShoppingBag size={16}/>,
  appointments: <FiCalendar size={16}/>, employees: <FiUsers size={16}/>,
  crm: <FiUserCheck size={16}/>, routes: <FiMap size={16}/>,
  tracking: <FiMapPin size={16}/>, queue: <FiList size={16}/>,
  ecommerce: <FiGlobe size={16}/>, notifications: <FiBell size={16}/>,
  einvoicing: <FiFileText size={16}/>,
};

const inputStyle = {
  width: '100%', padding: '9px 12px',
  background: 'var(--admin-bg-primary)',
  border: '1px solid var(--admin-border-light)',
  borderRadius: '8px', color: 'var(--admin-text-primary)', fontSize: '13px',
};

const Lbl = ({ children }) => (
  <label style={{ display:'block', marginBottom:'5px', fontSize:'11px',
    color:'#8CB79B', fontWeight:'700', textTransform:'uppercase', letterSpacing:'.5px' }}>
    {children}
  </label>
);

/* ══ MODAL MÓDULOS DEL NEGOCIO ═════════════════════════════ */
const BusinessModulesModal = ({ business, onClose, onSaved }) => {
  const [allModules,    setAllModules]    = useState([]);
  const [selectedMods,  setSelectedMods]  = useState([]);
  const [selectedFeats, setSelectedFeats] = useState([]);
  const [expandedMods,  setExpandedMods]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allRes = await adminApiService.get('/admin/modules-with-features');
        const mods = allRes.data || [];
        setAllModules(mods);
        const bizRes = await adminApiService.get(`/admin/businesses/${business.id}/modules`);
        const preModIds  = bizRes.data?.moduleIds  || [];
        const preFeatIds = bizRes.data?.featureIds || [];
        setSelectedMods(preModIds);
        setSelectedFeats(preFeatIds);
        setExpandedMods(preModIds);
      } catch (e) {

      } finally {
        setLoading(false);
      }
    };
    load();
  }, [business.id]);

  const toggleModule = (modId) => {
    const mod = allModules.find(m => m.id === modId);
    const featIds = (mod?.features || []).map(f => f.id);
    if (selectedMods.includes(modId)) {
      setSelectedMods(prev => prev.filter(id => id !== modId));
      setSelectedFeats(prev => prev.filter(id => !featIds.includes(id)));
      setExpandedMods(prev => prev.filter(id => id !== modId));
    } else {
      setSelectedMods(prev => [...prev, modId]);
      setExpandedMods(prev => [...prev, modId]);
    }
  };

  const toggleExpand = (modId, e) => {
    e.stopPropagation();
    setExpandedMods(prev =>
      prev.includes(modId) ? prev.filter(id => id !== modId) : [...prev, modId]
    );
  };

  const toggleFeature = (featId, modId) => {
    if (selectedFeats.includes(featId)) {
      setSelectedFeats(prev => prev.filter(id => id !== featId));
    } else {
      if (!selectedMods.includes(modId)) {
        setSelectedMods(prev => [...prev, modId]);
        setExpandedMods(prev => [...prev, modId]);
      }
      setSelectedFeats(prev => [...prev, featId]);
    }
  };

  const handleSave = async () => {
    if (saving) return; // ✅ Prevención de doble envío
    setSaving(true); setMsg(null);
    console.log('[MODULES SAVE] business:', business.id, business.business_name);
    console.log('[MODULES SAVE] moduleIds:', selectedMods);
    console.log('[MODULES SAVE] featureIds:', selectedFeats);
    try {
      await adminApiService.put(`/admin/businesses/${business.id}/modules`, {
        moduleIds: selectedMods, featureIds: selectedFeats,
      });
      setMsg({ ok: true, text: '✅ Módulos actualizados correctamente' });
      onSaved();
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ ok: false, text: '❌ ' + e.message });
    } finally {
      setSaving(false);
    }
  };

  const totalMensual = allModules
    .filter(m => selectedMods.includes(m.id))
    .reduce((sum, m) => sum + parseFloat(m.price_monthly || 0), 0);

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.78)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'16px' }}
      onClick={onClose}>
      <div style={{ background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border-light)',
        borderRadius:'16px', maxWidth:'700px', width:'100%', maxHeight:'88vh',
        display:'flex', flexDirection:'column', color:'var(--admin-text-primary)', overflow:'hidden' }}
        onClick={e => e.stopPropagation()}>

        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid var(--admin-border-light)',
          display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <h2 style={{ margin:0, fontSize:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
              <FiPackage size={18} style={{ color:'#ff8c42' }}/> Módulos del Negocio
            </h2>
            <p style={{ margin:'3px 0 0', fontSize:'12px', color:'var(--admin-text-muted)' }}>
              {business.business_name} · {business.business_type_name}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'12px', color:'var(--admin-text-muted)' }}>
              <strong style={{ color:'#ff8c42' }}>{selectedMods.length}</strong> módulos ·{' '}
              <strong style={{ color:'#ff8c42' }}>{selectedFeats.length}</strong> funcionalidades
            </span>
            {totalMensual > 0 && (
              <span style={{ background:'rgba(255,140,66,.15)', color:'#ff8c42',
                padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700 }}>
                ${totalMensual.toFixed(2)}/mes
              </span>
            )}
            <button onClick={onClose} style={{ background:'none', border:'none',
              cursor:'pointer', color:'var(--admin-text-muted)', fontSize:'20px' }}><FiX/></button>
          </div>
        </div>

        <div style={{ overflowY:'auto', flex:1, padding:'16px 24px' }}>
          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--admin-text-muted)' }}>
              Cargando módulos...
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
              {allModules.map(mod => {
                const modSel = selectedMods.includes(mod.id);
                const expanded = expandedMods.includes(mod.id);
                const feats = mod.features || [];
                const featSelCount = feats.filter(f => selectedFeats.includes(f.id)).length;
                return (
                  <div key={mod.id} style={{
                    border:`1px solid ${modSel ? 'rgba(255,140,66,.5)' : 'var(--admin-border-light)'}`,
                    borderRadius:'10px', overflow:'hidden',
                    background: modSel ? 'rgba(255,140,66,.04)' : 'var(--admin-bg-primary)',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px',
                      padding:'10px 14px', cursor:'pointer', userSelect:'none' }}
                      onClick={() => toggleModule(mod.id)}>
                      <div style={{ width:'18px', height:'18px', borderRadius:'5px', flexShrink:0,
                        border:`2px solid ${modSel ? '#ff8c42' : 'var(--admin-border-light)'}`,
                        background: modSel ? '#ff8c42' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {modSel && <FiCheck size={11} color="#fff" strokeWidth={3}/>}
                      </div>
                      <span style={{ display:'flex', alignItems:'center', justifyContent:'center',
                        width:'28px', height:'28px', borderRadius:'7px', flexShrink:0,
                        background:'rgba(255,140,66,.12)', color:'#ff8c42' }}>
                        {MOD_ICON_LG[mod.code] || <FiBox size={16}/>}
                      </span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:'13px',
                          color: modSel ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)' }}>
                          {mod.name}
                        </div>
                        {mod.description && (
                          <div style={{ fontSize:'11px', color:'var(--admin-text-muted)', marginTop:'1px' }}>
                            {mod.description}
                          </div>
                        )}
                      </div>
                      {feats.length > 0 && (
                        <span style={{ fontSize:'11px', color:'var(--admin-text-muted)', whiteSpace:'nowrap' }}>
                          {featSelCount}/{feats.length}
                        </span>
                      )}
                      {parseFloat(mod.price_monthly) > 0 && (
                        <span style={{ fontSize:'11px', color:'#ff8c42', fontWeight:700, whiteSpace:'nowrap' }}>
                          ${mod.price_monthly}/mes
                        </span>
                      )}
                      {feats.length > 0 && (
                        <div onClick={e => toggleExpand(mod.id, e)}
                          style={{ color:'var(--admin-text-muted)', display:'flex', alignItems:'center', cursor:'pointer' }}>
                          {expanded ? <FiChevronDown size={14}/> : <FiChevronRight size={14}/>}
                        </div>
                      )}
                    </div>
                    {expanded && feats.length > 0 && (
                      <div style={{ borderTop:'1px solid var(--admin-border-light)',
                        padding:'10px 14px 12px 48px',
                        display:'flex', flexWrap:'wrap', gap:'6px',
                        background:'rgba(0,0,0,.1)' }}>
                        {feats.map(feat => {
                          const featSel = selectedFeats.includes(feat.id);
                          return (
                            <div key={feat.id} onClick={() => toggleFeature(feat.id, mod.id)}
                              title={feat.description || feat.name}
                              style={{ display:'flex', alignItems:'center', gap:'5px',
                                padding:'4px 10px', borderRadius:'20px', cursor:'pointer',
                                userSelect:'none', fontSize:'12px', fontWeight:600,
                                border:`1px solid ${featSel ? '#ff8c42' : 'var(--admin-border-light)'}`,
                                background: featSel ? 'rgba(255,140,66,.18)' : 'transparent',
                                color: featSel ? '#ff8c42' : 'var(--admin-text-muted)' }}>
                              {featSel ? <FiCheck size={10} strokeWidth={3}/> : <span style={{ width:10 }}/>}
                              {feat.name}
                              {feat.is_premium && <FiStar size={9} style={{ color:'#f59e0b' }}/>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid var(--admin-border-light)',
          flexShrink:0, display:'flex', flexDirection:'column', gap:'10px' }}>
          {msg && (
            <div style={{ padding:'9px 13px', borderRadius:'8px', fontSize:'13px', fontWeight:600,
              background: msg.ok ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
              color: msg.ok ? '#22c55e' : '#ef4444',
              border:`1px solid ${msg.ok ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }}>
              {msg.text}
            </div>
          )}
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="admin-btn admin-btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || loading}
              style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'7px',
                padding:'10px 20px', borderRadius:'8px', fontWeight:700, fontSize:'13px',
                border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#ff9d55,#ff8c42)', color:'#fff',
                opacity: saving ? .7 : 1 }}>
              <FiCheck size={15}/>
              {saving ? 'Guardando...' : 'Guardar módulos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══ MODAL EDITAR CLIENTE ═══════════════════════════════════ */
const EditClientModal = ({ client, onClose, onSaved }) => {
  const [form, setForm] = useState({
    first_name: client.first_name || '', last_name: client.last_name || '',
    email: client.email || '', phone: client.phone || '',
    document_type: client.document_type || 'cedula', document_number: client.document_number || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // ✅ Prevención de doble envío
    setSaving(true);
    try {
      await adminApiService.put(`/admin/clients/${client.id}`, form);
      onSaved(); onClose();
    } catch (e) { await alert.error('❌ ' + e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'16px' }}
      onClick={onClose}>
      <div style={{ background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border-light)',
        borderRadius:'14px', padding:'28px', maxWidth:'500px', width:'100%', color:'var(--admin-text-primary)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h2 style={{ margin:0 }}><FiUser size={18} style={{ marginRight:8, color:'#ff8c42' }}/>Editar Cliente</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-text-muted)', fontSize:'20px' }}><FiX/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px' }}>
          <div><Lbl>Nombre</Lbl><input style={inputStyle} value={form.first_name} onChange={e => setForm({...form, first_name:e.target.value})}/></div>
          <div><Lbl>Apellido</Lbl><input style={inputStyle} value={form.last_name} onChange={e => setForm({...form, last_name:e.target.value})}/></div>
          <div style={{ gridColumn:'1/-1' }}><Lbl>Email</Lbl><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})}/></div>
          <div><Lbl>Teléfono</Lbl><input style={inputStyle} value={form.phone} onChange={e => setForm({...form, phone:e.target.value})}/></div>
          <div><Lbl>Tipo Documento</Lbl>
            <select style={inputStyle} value={form.document_type} onChange={e => setForm({...form, document_type:e.target.value})}>
              <option value="cedula">Cédula</option><option value="pasaporte">Pasaporte</option><option value="ruc">RUC</option>
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}><Lbl>Número Documento</Lbl><input style={inputStyle} value={form.document_number} onChange={e => setForm({...form, document_number:e.target.value})}/></div>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving} style={{ marginLeft:'auto' }}>
            <FiCheck size={15}/> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══ MODAL EDITAR NEGOCIO ═══════════════════════════════════ */
const EditBusinessModal = ({ business, onClose, onSaved }) => {
  const [name, setName] = useState(business.business_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return; // ✅ Prevención de doble envío
    setSaving(true);
    try {
      await adminApiService.put(`/admin/businesses/${business.id}`, { name });
      onSaved(); onClose();
    } catch (e) { await alert.error('❌ ' + e.message); } finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, padding:'16px' }}
      onClick={onClose}>
      <div style={{ background:'var(--admin-bg-secondary)', border:'1px solid var(--admin-border-light)',
        borderRadius:'14px', padding:'28px', maxWidth:'460px', width:'100%', color:'var(--admin-text-primary)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
          <h2 style={{ margin:0 }}><FiBriefcase size={18} style={{ marginRight:8, color:'#ff8c42' }}/>Editar Negocio</h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--admin-text-muted)', fontSize:'20px' }}><FiX/></button>
        </div>
        <div style={{ marginBottom:'20px' }}>
          <Lbl>Nombre del Negocio</Lbl>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)}/>
        </div>
        <div style={{ display:'flex', gap:'10px' }}>
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving} style={{ marginLeft:'auto' }}>
            <FiCheck size={15}/> {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══ COMPONENTE PRINCIPAL ═══════════════════════════════════ */
export default function ClientsPage() {
  const alert = useAlert();
  const [clients, setClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [editClient, setEditClient] = useState(null);
  const [editBusiness, setEditBusiness] = useState(null);
  const [subBusiness, setSubBusiness] = useState(null);
  const [modBusiness, setModBusiness] = useState(null);

  const loadData = async () => {
    setLoading(true); setError(null);
    try {
      const res = await adminApiService.get('/admin/clients');
      setClients(res.data || []);
      setFiltered(res.data || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.businesses || []).some(b => (b.business_name || '').toLowerCase().includes(term))
    ));
  }, [search, clients]);

  const SubBadge = ({ sub }) => {
    if (!sub) return null;
    const s = sub.status === 'active'
      ? { bg:'rgba(34,197,94,.15)', color:'#22c55e' }
      : { bg:'rgba(245,158,11,.15)', color:'#f59e0b' };
    return <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:700, ...s }}>{sub.status === 'active' ? '✓ Activa' : sub.status}</span>;
  };

  return (
    <PageTemplate title="Gestión de Clientes" subtitle="Administra clientes, negocios y suscripciones"
      theme="admin" loading={loading} error={error} onRetry={loadData}
      headerAction={<button className="admin-btn admin-btn-secondary" onClick={loadData}><FiRefreshCw size={15}/> Actualizar</button>}>

      <div className="admin-card" style={{ marginBottom:20 }}>
        <div className="admin-card-body">
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <FiSearch size={17} style={{ color:'var(--admin-text-muted)', flexShrink:0 }}/>
            <input type="text" placeholder="Buscar por nombre, email o negocio..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, border:'none', background:'transparent', flex:1, outline:'none' }}/>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Clientes ({filtered.length})</h2>
        </div>
        <div className="admin-card-body">
          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--admin-text-muted)' }}>
              <FiAlertCircle size={36} style={{ marginBottom:8 }}/>
              <p>No hay clientes registrados</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
              {filtered.map(client => (
                <div key={client.id} style={{ border:'1px solid var(--admin-border-light)', borderRadius:'10px', overflow:'hidden' }}>
                  <div style={{ background:'var(--admin-bg-secondary)', padding:'14px 16px',
                    display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer' }}
                    onClick={() => setExpanded(p => ({ ...p, [client.id]: !p[client.id] }))}>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                      <div style={{ width:'38px', height:'38px', borderRadius:'50%',
                        background:'rgba(255,140,66,.15)', display:'flex', alignItems:'center',
                        justifyContent:'center', color:'#ff8c42', flexShrink:0 }}>
                        <FiUser size={18}/>
                      </div>
                      <div>
                        <p style={{ margin:0, fontWeight:700, fontSize:'14px' }}>{client.full_name}</p>
                        <p style={{ margin:0, fontSize:'12px', color:'var(--admin-text-muted)' }}>
                          <FiMail size={11} style={{ marginRight:4 }}/>{client.email}
                          {client.phone && <><span style={{ margin:'0 6px' }}>·</span><FiPhone size={11} style={{ marginRight:3 }}/>{client.phone}</>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <span style={{ fontSize:'12px', color:'var(--admin-text-muted)' }}>{client.businesses?.length || 0} negocio(s)</span>
                      <button className="admin-btn admin-btn-secondary" style={{ padding:'5px 10px', fontSize:'12px' }}
                        onClick={e => { e.stopPropagation(); setEditClient(client); }}>
                        <FiEdit2 size={13}/> Editar
                      </button>
                      {expanded[client.id] ? <FiChevronUp size={17}/> : <FiChevronDown size={17}/>}
                    </div>
                  </div>

                  {expanded[client.id] && (
                    <div style={{ background:'var(--admin-bg-primary)', padding:'14px 16px',
                      borderTop:'1px solid var(--admin-border-light)', display:'flex', flexDirection:'column', gap:'10px' }}>
                      {client.businesses?.length > 0 ? client.businesses.map(biz => {
                        const hasSub = !!biz.subscription;
                        return (
                          <div key={biz.id} style={{ background:'var(--admin-bg-secondary)', padding:'12px 14px',
                            borderRadius:'8px', borderLeft:`4px solid ${hasSub ? '#22c55e' : '#ff8c42'}` }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px' }}>
                              <div style={{ flex:1 }}>
                                <p style={{ margin:0, fontWeight:700, fontSize:'14px' }}>
                                  <FiBriefcase size={13} style={{ marginRight:6, color:'#ff8c42' }}/>{biz.business_name}
                                </p>
                                <p style={{ margin:'3px 0 0', fontSize:'12px', color:'var(--admin-text-muted)' }}>
                                  {biz.business_type_name} · slug: {biz.slug}
                                </p>
                                {biz.modules?.length > 0 && (
                                  <div style={{ marginTop:'6px', display:'flex', flexWrap:'wrap', gap:'4px' }}>
                                    {biz.modules.map(m => (
                                      <span key={m.id} style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'20px',
                                        background:'rgba(255,140,66,.1)', color:'#ff8c42',
                                        border:'1px solid rgba(255,140,66,.2)',
                                        display:'flex', alignItems:'center', gap:'3px' }}>
                                        {MOD_ICONS[m.code] || <FiBox size={11}/>} {m.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {hasSub && (
                                  <div style={{ marginTop:'8px', padding:'6px 10px', borderRadius:'6px',
                                    background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.2)',
                                    fontSize:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
                                    <FiCreditCard size={13} style={{ color:'#22c55e' }}/>
                                    <span style={{ fontWeight:600, color:'#22c55e' }}>
                                      {biz.subscription.billing_period === 'monthly' ? 'Mensual' : 'Anual'}
                                    </span>
                                    <span style={{ color:'var(--admin-text-muted)' }}>
                                      ${parseFloat(biz.subscription.total_amount || 0).toFixed(2)}
                                    </span>
                                    <SubBadge sub={biz.subscription}/>
                                    {biz.subscription.next_billing_at && (
                                      <span style={{ color:'var(--admin-text-muted)', marginLeft:'auto' }}>
                                        <FiCalendar size={11} style={{ marginRight:4 }}/>
                                        Próx: {new Date(biz.subscription.next_billing_at).toLocaleDateString('es-EC')}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div style={{ display:'flex', flexDirection:'column', gap:'6px', flexShrink:0 }}>
                                <button className="admin-btn admin-btn-secondary"
                                  style={{ padding:'5px 10px', fontSize:'12px' }}
                                  onClick={() => setEditBusiness(biz)}>
                                  <FiEdit2 size={13}/> Editar
                                </button>
                                <button className="admin-btn admin-btn-secondary"
                                  style={{ padding:'5px 10px', fontSize:'12px',
                                    background:'rgba(255,140,66,.1)', color:'#ff8c42',
                                    border:'1px solid rgba(255,140,66,.3)' }}
                                  onClick={() => setModBusiness(biz)}>
                                  <FiPackage size={13}/> Módulos
                                </button>
                                {/* 🔥 Botón de suscripción - ahora pasa la suscripción existente */}
                                <button
                                  style={{
                                    display:'flex', alignItems:'center', gap:'5px',
                                    padding:'5px 10px', fontSize:'12px', borderRadius:'6px',
                                    cursor: 'pointer',
                                    border: hasSub ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(255,140,66,.4)',
                                    background: hasSub ? 'rgba(34,197,94,.1)' : 'linear-gradient(135deg,#ff9d55,#ff8c42)',
                                    color: hasSub ? '#22c55e' : '#fff',
                                    fontWeight: 600,
                                  }}
                                  onClick={() => setSubBusiness({ ...biz, existingSubscription: biz.subscription })}
                                  title={hasSub ? 'Editar suscripción' : 'Crear suscripción'}>
                                  <FiCreditCard size={13}/>
                                  {hasSub ? 'Editar Suscripción' : 'Suscripción'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <p style={{ margin:0, color:'var(--admin-text-muted)', fontSize:'12px' }}>Sin negocios aprovisionados</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editClient   && <EditClientModal      client={editClient}     onClose={() => setEditClient(null)}   onSaved={loadData}/>}
      {editBusiness && <EditBusinessModal   business={editBusiness} onClose={() => setEditBusiness(null)} onSaved={loadData}/>}
      {subBusiness  && <SubscriptionModal
        business={subBusiness}
        existingSubscription={subBusiness.existingSubscription}
        onClose={() => setSubBusiness(null)}
        onSaved={loadData}
      />}
      {modBusiness  && <BusinessModulesModal business={modBusiness} onClose={() => setModBusiness(null)}  onSaved={loadData}/>}
    </PageTemplate>
  );
}