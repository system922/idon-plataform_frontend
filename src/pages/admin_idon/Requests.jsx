import React, { useState, useEffect } from 'react';
import {
  FiBox, FiShoppingCart, FiShoppingBag, FiClipboard, FiClock,
  FiCheck, FiX, FiRefreshCw, FiEye, FiPackage, FiStar,
  FiChevronDown, FiChevronRight, FiSettings, FiBarChart2,
  FiCreditCard, FiDollarSign, FiTruck, FiGrid, FiCalendar,
  FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiThermometer
} from 'react-icons/fi';
import apiService from '../../services/apiService';
import PageTemplate from '../../components/PageTemplate';
import '../../styles/AdminPages.css';


// Iconos por módulo usando react-icons/fi
const MOD_ICON_MAP = {
  core:          <FiSettings   size={17}/>,
  pos:           <FiShoppingCart size={17}/>,
  inventory:     <FiBox        size={17}/>,
  reports:       <FiBarChart2  size={17}/>,
  payments:      <FiCreditCard size={17}/>,
  accounting:    <FiDollarSign size={17}/>,
  orders:        <FiClipboard  size={17}/>,
  kitchen:       <FiThermometer size={17}/>,
  delivery:      <FiTruck      size={17}/>,
  tables:        <FiGrid       size={17}/>,
  reservations:  <FiCalendar   size={17}/>,
  loyalty:       <FiStar       size={17}/>,
  suppliers:     <FiTruck      size={17}/>,
  purchases:     <FiShoppingBag size={17}/>,
  appointments:  <FiClock      size={17}/>,
  employees:     <FiUsers      size={17}/>,
  crm:           <FiUserCheck  size={17}/>,
  routes:        <FiMap        size={17}/>,
  tracking:      <FiMapPin     size={17}/>,
  queue:         <FiList       size={17}/>,
  ecommerce:     <FiGlobe      size={17}/>,
  notifications: <FiBell       size={17}/>,
  einvoicing:    <FiFileText   size={17}/>,
};
const ModIcon = ({ code }) => (
  <span style={{
    display:'flex', alignItems:'center', justifyContent:'center',
    width:'30px', height:'30px', borderRadius:'8px', flexShrink:0,
    background:'rgba(255,140,66,.12)', color:'#ff8c42',
  }}>
    {MOD_ICON_MAP[code] || <FiBox size={17}/>}
  </span>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
const AdminSolicitudes = () => {
  const [allRequests, setAllRequests] = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus,    setFilterStatus]    = useState('todos');

  const mapRequests = (raw) => (raw || []).map(item => ({
    id:          item.id,
    propietario: item.contact_name ||
                 `${item.owner_first_name || ''} ${item.owner_last_name || ''}`.trim(),
    tipo:        item.business_type_name || item.tipo_nombre || '',
    tipo_codigo: item.business_type_code || item.tipo || '',
    empresa:     item.business_name,
    email:       item.owner_email    || item.contact_email,
    telefono:    item.owner_phone    || item.contact_phone || '—',
    cedula:      item.owner_document_number || item.identification_number || '—',
    status:      item.status,
    business_id: item.business_id || null,
    estado:      item.status === 'pending'  ? 'pendiente'
               : item.status === 'approved' ? 'aprobado'
               : item.status === 'rejected' ? 'rechazado'
               : item.status,
    creado: item.requested_at
      ? new Date(item.requested_at).toLocaleString('es-EC', {
          year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit'
        })
      : '—',
    modulos:  Array.isArray(item.requested_modules)
               ? item.requested_modules
               : item.requested_modules
                 ? item.requested_modules.split(',').map(m => m.trim())
                 : [],
    features: Array.isArray(item.requested_features)
               ? item.requested_features
               : item.requested_features
                 ? item.requested_features.split(',').map(f => f.trim())
                 : [],
  }));

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data    = await apiService.get('/admin/requests');
      const allData = mapRequests(data.data);
      setAllRequests(allData);
      setRequests(filterStatus === 'todos'
        ? allData
        : allData.filter(r => r.estado === filterStatus));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const getStatusBadge = (status) => {
    const norm  = status === 'pendiente' ? 'pending'
                : status === 'aprobado'  ? 'approved'
                : status === 'rechazado' ? 'rejected'
                : status;
    const cls   = { pending:'admin-badge-warning', approved:'admin-badge-success', rejected:'admin-badge-danger' };
    const label = {
      pending:  <><FiClock size={13} style={{marginRight:4,display:'inline'}}/> Pendiente</>,
      approved: <><FiCheck size={13} style={{marginRight:4,display:'inline'}}/> Aprobado</>,
      rejected: <><FiX    size={13} style={{marginRight:4,display:'inline'}}/> Rechazado</>,
    };
    return <span className={`admin-badge ${cls[norm] || 'admin-badge-info'}`}>{label[norm] || status}</span>;
  };

  // Aprueba la solicitud → backend se encarga de todo usando el usuario autenticado (JWT)
  const handleApprove = async (requestId) => {
    try {
      await apiService.post(`/admin/${requestId}/approve`, {});
      await fetchRequests();
    } catch (err) {
      console.error('Error al aprobar solicitud:', err);
    }
  };

  const handleReject = async (requestId) => {
    try { await apiService.post(`/admin/${requestId}/reject`, {}); await fetchRequests(); }
    catch (err) { console.error(err); }
  };

  return (
    <PageTemplate>
      <div className="admin-page-container">

        <div className="admin-page-header">
          <h1 className="admin-page-title">Solicitudes de Registro</h1>
          <p className="admin-page-subtitle">Revisa y aprueba nuevas solicitudes de registro</p>
        </div>

        {error && (
          <div className="admin-card" style={{marginBottom:20,borderLeft:'4px solid #ef4444'}}>
            <div className="admin-card-body">
              <p style={{color:'#ef4444',margin:0,fontWeight:600}}>Error: {error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner"></div>
            Cargando solicitudes...
          </div>
        ) : (
          <>
            <div className="admin-filters">
              {['todos','pendiente','aprobado','rechazado'].map(s => (
                <button
                  key={s}
                  className={`admin-filter-btn ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === 'todos'     && `✓ TODOS (${allRequests.length})`}
                  {s === 'pendiente' && `PENDIENTES (${allRequests.filter(r=>r.estado==='pendiente').length})`}
                  {s === 'aprobado'  && `✓ APROBADOS (${allRequests.filter(r=>r.estado==='aprobado').length})`}
                  {s === 'rechazado' && `✗ RECHAZADOS (${allRequests.filter(r=>r.estado==='rechazado').length})`}
                </button>
              ))}
              <button className="admin-btn admin-btn-secondary" onClick={fetchRequests} style={{marginLeft:'auto'}}>
                <FiRefreshCw size={15}/> Actualizar
              </button>
            </div>

            <div className="admin-card">
              <div className="admin-card-header">
                <h2>Lista de Solicitudes</h2>
                <span style={{fontSize:12,color:'var(--admin-text-muted)'}}>{requests.length} solicitudes</span>
              </div>
              <div className="admin-card-body">
                {requests.length > 0 ? (
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Propietario</th><th>Empresa</th><th>Tipo</th>
                          <th>Estado</th><th>Creado</th><th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map(req => (
                          <tr key={req.id}>
                            <td><strong>{req.propietario}</strong></td>
                            <td>{req.empresa}</td>
                            <td>{req.tipo || req.tipo_codigo || '—'}</td>
                            <td>{getStatusBadge(req.status || req.estado)}</td>
                            <td style={{fontSize:12}}>{req.creado}</td>
                            <td>
                              <div className="admin-table-actions">
                                <button
                                  className="admin-table-btn"
                                  onClick={() => { setSelectedRequest(req); setShowDetailModal(true); }}
                                >
                                  <FiEye size={13}/> Ver
                                </button>
                                {req.estado === 'pendiente' && (
                                  <>
                                    <button className="admin-table-btn admin-table-btn-success" onClick={() => handleApprove(req.id)}>
                                      <FiCheck size={13}/> Aprobar
                                    </button>
                                    <button className="admin-table-btn admin-table-btn-danger" onClick={() => handleReject(req.id)}>
                                      <FiX size={13}/> Rechazar
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="admin-empty">
                    <div className="admin-empty-icon"><FiClipboard size={48}/></div>
                    <p className="admin-empty-title">No hay solicitudes</p>
                    <p className="admin-empty-text">No hay solicitudes con el filtro seleccionado</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {showDetailModal && selectedRequest && (
          <DetailModal
            request={selectedRequest}
            onClose={() => setShowDetailModal(false)}
            onApprove={() => { handleApprove(selectedRequest.id); setShowDetailModal(false); }}
            onReject={()  => { handleReject(selectedRequest.id);  setShowDetailModal(false); }}
          />
        )}
      </div>
    </PageTemplate>
  );
};

/* ═══════════════════════════════════════════════════════════
   MODAL DE DETALLE
═══════════════════════════════════════════════════════════ */
const DetailModal = ({ request, onClose, onApprove, onReject }) => {

  const [allModules,    setAllModules]    = useState([]);
  const [selectedMods,  setSelectedMods]  = useState([]);
  const [selectedFeats, setSelectedFeats] = useState([]);
  const [expandedMods,  setExpandedMods]  = useState([]);
  const [loadingMods,   setLoadingMods]   = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saveOk,        setSaveOk]        = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingMods(true);
        // 1. Cargar todos los módulos con sus features
        const res  = await apiService.get('/admin/modules-with-features');
        const mods = res.data || [];
        setAllModules(mods);

        let preModIds  = [];
        let preFeatIds = [];

        if (request.status === 'approved' && request.business_id) {
          // Solicitud aprobada → cargar desde business_modules/features (fuente de verdad del sidebar)
          try {
            const bizMods = await apiService.get(`/admin/businesses/${request.business_id}/modules`);
            preModIds  = bizMods.data?.moduleIds  || [];
            preFeatIds = bizMods.data?.featureIds || [];
          } catch (e) {
            console.warn('No se pudieron cargar módulos del negocio:', e);
          }
        } else {
          // Solicitud pendiente → cargar desde business_registration_request_modules/features
          const savedModCodes  = request.modulos  || [];
          const savedFeatCodes = request.features || [];
          preModIds  = mods.filter(m => savedModCodes.includes(m.code)).map(m => m.id);
          preFeatIds = mods.flatMap(m => m.features || [])
            .filter(f => savedFeatCodes.includes(f.code)).map(f => f.id);
        }

        setSelectedMods(preModIds);
        setSelectedFeats(preFeatIds);
        setExpandedMods(preModIds);
      } catch (e) {
        console.error('Error cargando módulos:', e);
      } finally {
        setLoadingMods(false);
      }
    };
    load();
  }, [request.id]);

  const toggleModule = (modId) => {
    const mod     = allModules.find(m => m.id === modId);
    const featIds = (mod?.features || []).map(f => f.id);
    if (selectedMods.includes(modId)) {
      setSelectedMods(prev  => prev.filter(id => id !== modId));
      setSelectedFeats(prev => prev.filter(id => !featIds.includes(id)));
      setExpandedMods(prev  => prev.filter(id => id !== modId));
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

  const handleSave = async (silent = false) => {
    if (!silent) { setSaving(true); setSaveOk(null); }
    try {
      if (request.status === 'approved' && request.business_id) {
        // Aprobada → guarda directo en business_modules/features (sidebar del negocio)
        await apiService.put(`/admin/businesses/${request.business_id}/modules`, {
          moduleIds:  selectedMods,
          featureIds: selectedFeats,
        });
      } else {
        // Pendiente → guarda en tablas de la solicitud
        await apiService.post(`/admin/requests/${request.id}/save-modules`, {
          moduleIds:  selectedMods,
          featureIds: selectedFeats,
        });
      }
      if (!silent) { setSaveOk(true); setTimeout(() => setSaveOk(null), 3000); }
      return true;
    } catch {
      if (!silent) { setSaveOk(false); setTimeout(() => setSaveOk(null), 3000); }
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  };

  // Aprobar: primero guarda módulos, luego aprueba
  const handleApproveWithModules = async () => {
    setSaving(true);
    try {
      // Guarda módulos en la solicitud (sin mostrar mensaje)
      await apiService.post(`/admin/requests/${request.id}/save-modules`, {
        moduleIds:  selectedMods,
        featureIds: selectedFeats,
      });
    } catch (e) {
      console.warn('No se pudieron guardar módulos antes de aprobar:', e);
    } finally {
      setSaving(false);
    }
    // Luego aprueba (el provisioningService leerá los módulos guardados)
    onApprove();
  };

  const totalMensual = allModules
    .filter(m => selectedMods.includes(m.id))
    .reduce((sum, m) => sum + parseFloat(m.price_monthly || 0), 0);

  const Lbl = ({ text }) => (
    <label style={{
      fontSize:'10px', fontWeight:'700', textTransform:'uppercase',
      letterSpacing:'.6px', color:'var(--admin-text-muted)',
      display:'block', marginBottom:'4px'
    }}>{text}</label>
  );

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal"
        style={{maxWidth:'800px', width:'96vw', maxHeight:'90vh', display:'flex', flexDirection:'column'}}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="admin-modal-header" style={{flexShrink:0}}>
          <h2 style={{display:'flex', alignItems:'center', gap:'8px'}}>
            <FiClipboard size={18}/> Detalles de Solicitud
          </h2>
          <button className="admin-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div style={{overflowY:'auto', flex:1, padding:'20px 24px'}}>

          {/* Datos del solicitante */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px', marginBottom:'20px'}}>
            <div><Lbl text="Empresa"/><p style={{margin:0,fontWeight:700,fontSize:'15px',color:'var(--admin-text-primary)'}}>{request.empresa}</p></div>
            <div><Lbl text="Propietario"/><p style={{margin:0,fontWeight:700,fontSize:'15px',color:'var(--admin-text-primary)'}}>{request.propietario}</p></div>
            <div><Lbl text="Email"/><p style={{margin:0,fontSize:'13px',color:'var(--admin-text-secondary)'}}>{request.email}</p></div>
            <div><Lbl text="Teléfono"/><p style={{margin:0,fontSize:'13px',color:'var(--admin-text-secondary)'}}>{request.telefono}</p></div>
            <div><Lbl text="Cédula / RUC"/><p style={{margin:0,fontSize:'13px',color:'var(--admin-text-secondary)'}}>{request.cedula}</p></div>
            <div><Lbl text="Tipo de negocio"/><p style={{margin:0,fontSize:'13px',color:'var(--admin-text-secondary)'}}>{request.tipo || '—'}</p></div>
          </div>

          <hr style={{border:'none', borderTop:'1px solid var(--admin-border)', margin:'0 0 18px'}}/>

          {/* Cabecera módulos */}
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px'}}>
            <h3 style={{margin:0, fontSize:'14px', fontWeight:700, color:'var(--admin-text-primary)', display:'flex', alignItems:'center', gap:'6px'}}>
              <FiPackage size={15}/> Módulos y Funcionalidades
            </h3>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
              <span style={{fontSize:'12px', color:'var(--admin-text-muted)'}}>
                <strong style={{color:'#ff8c42'}}>{selectedMods.length}</strong> módulos ·{' '}
                <strong style={{color:'#ff8c42'}}>{selectedFeats.length}</strong> funcionalidades
              </span>
              {totalMensual > 0 && (
                <span style={{background:'rgba(255,140,66,.15)', color:'#ff8c42', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:700}}>
                  ${totalMensual.toFixed(2)}/mes
                </span>
              )}
            </div>
          </div>

          {/* Módulos */}
          {loadingMods ? (
            <div style={{textAlign:'center', padding:'32px', color:'var(--admin-text-muted)'}}>
              <div className="admin-spinner" style={{margin:'0 auto 12px'}}/>
              Cargando módulos...
            </div>
          ) : (
            <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
              {allModules.map(mod => {
                const modSel      = selectedMods.includes(mod.id);
                const expanded    = expandedMods.includes(mod.id);
                const feats       = mod.features || [];
                const featSelCount = feats.filter(f => selectedFeats.includes(f.id)).length;

                return (
                  <div key={mod.id} style={{
                    border:`1px solid ${modSel ? 'rgba(255,140,66,.5)' : 'var(--admin-border)'}`,
                    borderRadius:'10px',
                    background: modSel ? 'rgba(255,140,66,.04)' : 'var(--admin-bg-secondary)',
                    overflow:'hidden', transition:'border-color .2s, background .2s',
                  }}>

                    {/* Fila del módulo */}
                    <div
                      style={{display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', cursor:'pointer', userSelect:'none'}}
                      onClick={() => toggleModule(mod.id)}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width:'18px', height:'18px', borderRadius:'5px', flexShrink:0,
                        border:`2px solid ${modSel ? '#ff8c42' : 'var(--admin-border)'}`,
                        background: modSel ? '#ff8c42' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all .2s',
                      }}>
                        {modSel && <FiCheck size={11} color="#fff" strokeWidth={3}/>}
                      </div>

                      <ModIcon code={mod.code}/>

                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontWeight:700, fontSize:'13px', color: modSel ? 'var(--admin-text-primary)' : 'var(--admin-text-secondary)'}}>
                          {mod.name}
                        </div>
                        {mod.description && (
                          <div style={{fontSize:'11px', color:'var(--admin-text-muted)', marginTop:'1px'}}>
                            {mod.description}
                          </div>
                        )}
                      </div>

                      {feats.length > 0 && (
                        <span style={{fontSize:'11px', color:'var(--admin-text-muted)', whiteSpace:'nowrap', marginRight:'4px'}}>
                          {featSelCount}/{feats.length}
                        </span>
                      )}

                      {parseFloat(mod.price_monthly) > 0 && (
                        <span style={{fontSize:'11px', color:'#ff8c42', fontWeight:700, whiteSpace:'nowrap'}}>
                          ${mod.price_monthly}/mes
                        </span>
                      )}

                      {feats.length > 0 && (
                        <div onClick={e => toggleExpand(mod.id, e)} style={{color:'var(--admin-text-muted)', display:'flex', alignItems:'center', padding:'2px', cursor:'pointer'}}>
                          {expanded ? <FiChevronDown size={15}/> : <FiChevronRight size={15}/>}
                        </div>
                      )}
                    </div>

                    {/* Features expandidas */}
                    {expanded && feats.length > 0 && (
                      <div style={{
                        borderTop:'1px solid var(--admin-border)',
                        padding:'10px 14px 12px 42px',
                        display:'flex', flexWrap:'wrap', gap:'6px',
                        background:'rgba(0,0,0,.1)',
                      }}>
                        {feats.map(feat => {
                          const featSel = selectedFeats.includes(feat.id);
                          return (
                            <div
                              key={feat.id}
                              onClick={() => toggleFeature(feat.id, mod.id)}
                              title={feat.description || feat.name}
                              style={{
                                display:'flex', alignItems:'center', gap:'5px',
                                padding:'4px 10px', borderRadius:'20px', cursor:'pointer',
                                userSelect:'none', fontSize:'12px', fontWeight:600,
                                border:`1px solid ${featSel ? '#ff8c42' : 'var(--admin-border)'}`,
                                background: featSel ? 'rgba(255,140,66,.18)' : 'transparent',
                                color: featSel ? '#ff8c42' : 'var(--admin-text-muted)',
                                transition:'all .15s',
                              }}
                            >
                              {featSel ? <FiCheck size={10} strokeWidth={3}/> : <span style={{width:10}}/>}
                              {feat.name}
                              {feat.is_premium && <FiStar size={9} style={{color:'#f59e0b', flexShrink:0}}/>}
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

          {/* Mensaje guardado */}
          {saveOk !== null && (
            <div style={{
              marginTop:'12px', padding:'10px 14px', borderRadius:'8px',
              fontSize:'13px', fontWeight:600,
              background: saveOk ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
              color:      saveOk ? '#22c55e' : '#ef4444',
              border:`1px solid ${saveOk ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`,
            }}>
              {saveOk
                ? request.status === 'approved'
                  ? '✅ Módulos actualizados en el negocio correctamente'
                  : '✅ Selección guardada correctamente'
                : '❌ Error al guardar, intenta de nuevo'}
            </div>
          )}
          {/* Aviso si está aprobado */}
          {request.status === 'approved' && (
            <div style={{
              marginTop:'10px', padding:'9px 13px', borderRadius:'8px',
              fontSize:'12px', background:'rgba(99,102,241,.08)',
              border:'1px solid rgba(99,102,241,.2)', color:'#818cf8',
            }}>
              ℹ️ Esta solicitud ya está aprobada. Los cambios se guardarán directamente en el negocio.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="admin-modal-footer" style={{flexShrink:0, display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center'}}>
          <button className="admin-btn admin-btn-secondary" onClick={onClose}>Cerrar</button>

          <button
            className="admin-btn admin-btn-secondary"
            onClick={() => handleSave(false)}
            disabled={saving}
            style={{marginLeft:'auto'}}
          >
            {saving ? '⏳ Guardando...' : '💾 Guardar selección'}
          </button>

          {request.estado === 'pendiente' && (
            <>
              <button className="admin-btn admin-btn-danger"  onClick={onReject} disabled={saving}><FiX size={15}/> Rechazar</button>
              <button className="admin-btn admin-btn-success" onClick={handleApproveWithModules} disabled={saving}>
                {saving ? '⏳ Guardando...' : <><FiCheck size={15}/> Aprobar</>}
              </button>
            </>
          )}
          {request.status === 'approved' && (
            <button
              className="admin-btn admin-btn-success"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? '⏳ Guardando...' : <><FiCheck size={15}/> Actualizar módulos del negocio</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSolicitudes;
