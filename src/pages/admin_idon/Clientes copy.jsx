import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiEdit2, FiRefreshCw, FiSearch, FiChevronDown, FiChevronUp,
  FiX, FiCheck, FiCreditCard, FiBriefcase, FiUser, FiMail,
  FiPhone, FiAlertCircle, FiBox, FiDollarSign, FiCalendar,
  FiSettings, FiShoppingCart, FiTruck, FiBarChart2,
  FiPackage, FiStar, FiShoppingBag, FiGrid,
  FiUsers, FiUserCheck, FiMap, FiMapPin, FiList, FiGlobe,
  FiBell, FiFileText, FiThermometer, FiClipboard, FiInfo,
} from 'react-icons/fi';
import { useConfirm, useAlert } from '../../context/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import Modal from '../../components/General/Modal';
import Checklist from '../../components/General/Checklist';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SubscriptionModal from './SubscriptionModal';
import { adminApi } from '../../config/api';

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

function BusinessModulesModal({ business, onClose, onSaved }) {
  const alert = useAlert();
  const [allModules, setAllModules] = useState([]);
  const [selectedMods, setSelectedMods] = useState([]);
  const [selectedFeats, setSelectedFeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const allRes = await adminApi.get('/admin/modules-with-features');
        const mods = allRes.data || [];
        setAllModules(mods);
        const bizRes = await adminApi.get(`/admin/businesses/${business.id}/modules`);
        const preModIds = bizRes.data?.moduleIds || [];
        const preFeatIds = bizRes.data?.featureIds || [];
        setSelectedMods(preModIds);
        setSelectedFeats(preFeatIds);
        setHasChanges(false);
      } catch (e) {
        setError('Error al cargar módulos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [business.id]);

  const checklistItems = useMemo(() => {
    return allModules.map(m => ({
      id: String(m.id),
      label: m.name,
      icon: MOD_ICON_LG[m.code] || <FiBox size={16}/>,
      badge: m.price_monthly ? `$${m.price_monthly}/mes` : '',
      isPremium: parseFloat(m.price_monthly || 0) > 0,
      children: m.features?.map(f => ({
        id: String(f.id),
        label: f.name,
        isPremium: f.is_premium || false,
      })) || [],
    }));
  }, [allModules]);

  const checklistValue = useMemo(() => {
    return selectedMods.map(modId => ({
      modulo: modId,
      features: selectedFeats.filter(featId => {
        const mod = allModules.find(m => m.id === modId);
        return mod?.features?.some(f => f.id === featId);
      }),
    }));
  }, [selectedMods, selectedFeats, allModules]);

  const handlePermissionsChange = (newValue) => {
    const modIds = newValue.map(item => item.modulo);
    const featIds = newValue.flatMap(item => item.features || []);
    setSelectedMods(modIds);
    setSelectedFeats(featIds);
    setError('');
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (saving || !hasChanges) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.put(`/admin/businesses/${business.id}/modules`, {
        moduleIds: selectedMods,
        featureIds: selectedFeats,
      });
      alert.success('Módulos actualizados correctamente', 'Actualización Exitosa');
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar módulos');
    } finally {
      setSaving(false);
    }
  };

  const totalMensual = allModules
    .filter(m => selectedMods.includes(m.id))
    .reduce((sum, m) => sum + parseFloat(m.price_monthly || 0), 0);

  const isSaveDisabled = saving || !hasChanges || loading;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Módulos del Negocio"
      size="md"
      className="clients-modules-modal"
      footer={
        <>
          {error && (
            <div className="modal-error-text" style={{ color: 'var(--danger)', marginBottom: '12px' }}>
              <FiAlertCircle size={16} /> {error}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant=""
              size="md"
              icon={<FiX size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cerrar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiCheck size={14} />}
              onClick={handleSave}
              disabled={isSaveDisabled}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar módulos'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <div className="clients-modules-body">
        <div className="clients-modules-business">
          <span className="clients-modules-business-name">{business.business_name}</span>
          <span className="clients-modules-business-type">{business.business_type_name}</span>
        </div>

        <hr className="clients-modules-divider" />

        <div className="clients-modules-header">
          <h3><FiPackage size={15} /> Módulos y Funcionalidades</h3>
          <div className="clients-modules-stats">
            <span>
              <strong>{selectedMods.length}</strong> módulos ·{' '}
              <strong>{selectedFeats.length}</strong> funcionalidades
            </span>
            {totalMensual > 0 && (
              <span className="clients-modules-total">${totalMensual.toFixed(2)}/mes</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="clients-loading">Cargando módulos...</div>
        ) : (
          <Checklist
            items={checklistItems}
            value={checklistValue}
            onChange={handlePermissionsChange}
            mode="hierarchical"
            variant="default"
            maxHeight={350}
            showIcons
            selectAll
            emptyMessage="No hay módulos disponibles"
          />
        )}
      </div>
    </Modal>
  );
}

function EditClientModal({ client, onClose, onSaved }) {
  const alert = useAlert();
  const [form, setForm] = useState({
    first_name: client.first_name || '',
    last_name: client.last_name || '',
    email: client.email || '',
    phone: client.phone || '',
    document_type: client.document_type || 'cedula',
    document_number: client.document_number || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.put(`/admin/clients/${client.id}`, form);
      alert.success('Cliente actualizado correctamente', '✅ Éxito');
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar cliente');
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
          variant="" 
          onClick={onClose} 
          disabled={saving}
          >
          Cancelar
        </IconTextButton>
        <IconTextButton 
          variant="success" 
          onClick={handleSave} 
          disabled={saving} 
          loading={saving}
          >
          {saving ? 'Guardando...' : 'Guardar'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar Cliente"
      size="md"
      className="clients-edit-modal"
      footer={footer}
    >
      <div className="clients-edit-grid">
        <div className="clients-edit-field">
          <label>Nombre</label>
          <input
            value={form.first_name}
            onChange={e => setForm({...form, first_name: e.target.value})}
            placeholder="Nombre"
          />
        </div>
        <div className="clients-edit-field">
          <label>Apellido</label>
          <input
            value={form.last_name}
            onChange={e => setForm({...form, last_name: e.target.value})}
            placeholder="Apellido"
          />
        </div>
        <div className="clients-edit-field full-width">
          <label>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            placeholder="Email"
          />
        </div>
        <div className="clients-edit-field">
          <label>Teléfono</label>
          <input
            value={form.phone}
            onChange={e => setForm({...form, phone: e.target.value})}
            placeholder="Teléfono"
          />
        </div>
        <div className="clients-edit-field">
          <label>Tipo Documento</label>
          <select
            value={form.document_type}
            onChange={e => setForm({...form, document_type: e.target.value})}
          >
            <option value="cedula">Cédula</option>
            <option value="pasaporte">Pasaporte</option>
            <option value="ruc">RUC</option>
          </select>
        </div>
        <div className="clients-edit-field full-width">
          <label>Número Documento</label>
          <input
            value={form.document_number}
            onChange={e => setForm({...form, document_number: e.target.value})}
            placeholder="Número de documento"
          />
        </div>
      </div>
    </Modal>
  );
}

function EditBusinessModal({ business, onClose, onSaved }) {
  const alert = useAlert();
  const [name, setName] = useState(business.business_name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      await adminApi.put(`/admin/businesses/${business.id}`, { name });
      alert.success('Negocio actualizado correctamente', '✅ Éxito');
      if (onSaved) onSaved();
      onClose();
    } catch (e) {
      setError(e.message || 'Error al guardar negocio');
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
          variant="" 
          onClick={onClose} disabled={saving}>
          Cancelar
        </IconTextButton>
        <IconTextButton 
          variant="success" 
          onClick={handleSave} 
          disabled={saving} 
          loading={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </IconTextButton>
      </ButtonGroup>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar Negocio"
      size="sm"
      className="clients-edit-business-modal"
      footer={footer}
    >
      <div className="clients-edit-field">
        <label>Nombre del Negocio</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre del negocio"
        />
      </div>
    </Modal>
  );
}

function ClientAccordion({ client, onEditClient, onEditBusiness, onModBusiness, onSubBusiness, onRegisterPayment }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedBusinesses, setExpandedBusinesses] = useState({});

  const toggleClientExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleBusinessExpand = (businessId, e) => {
    e.stopPropagation();
    setExpandedBusinesses(prev => ({
      ...prev,
      [businessId]: !prev[businessId]
    }));
  };

  const SubBadge = ({ sub }) => {
    if (!sub) return null;
    
    const statusMap = {
      'active': { cls: 'active', label: '✓ Activa' },
      'pending_activation': { cls: 'pending', label: '⏳ Pendiente de pago' },
      'suspended': { cls: 'suspended', label: '✕ Suspendida' },
    };
    
    const status = statusMap[sub.status] || { cls: '', label: sub.status };
    
    return (
      <span className={`clients-sub-badge ${status.cls}`}>
        {status.label}
      </span>
    );
  };

  return (
    <div className="clients-accordion-item">
      <div 
        className={`clients-accordion-header ${isExpanded ? 'expanded' : ''}`}
        onClick={toggleClientExpand}
      >
        <div className="clients-accordion-header-left">
          <div className="clients-client-avatar">
            <FiUser size={18} />
          </div>
          <div>
            <div className="clients-client-name">{client.full_name}</div>
            <div className="clients-client-email">
              <FiMail size={11} /> {client.email}
              {client.phone && (
                <>
                  <span>·</span>
                  <FiPhone size={11} /> {client.phone}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="clients-accordion-header-right">
          <span className="clients-business-count">
            {client.businesses?.length || 0} negocio(s)
          </span>
          <IconTextButton
            variant="blue"
            size="sm"
            icon={<FiEdit2 size={13} />}
            onClick={(e) => { e.stopPropagation(); onEditClient(client); }}
          >
            Editar
          </IconTextButton>
          <span className="clients-accordion-chevron">
            {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
          </span>
        </div>
      </div>

      <div className={`clients-accordion-body ${isExpanded ? 'open' : 'closed'}`}>
        {isExpanded && (
          <>
            {client.businesses?.length === 0 ? (
              <div className="clients-no-businesses">
                <FiInfo size={24} />
                <p>Sin negocios aprovisionados</p>
              </div>
            ) : (
              <div className="clients-businesses-list">
                {client.businesses.map(biz => {
                  const hasSub = !!biz.subscription;
                  const isBizExpanded = expandedBusinesses[biz.id] || false;
                  
                  return (
                    <div key={biz.id} className={`clients-business-item ${hasSub ? 'has-sub' : 'no-sub'}`}>
                      <div 
                        className="clients-business-header"
                        onClick={(e) => toggleBusinessExpand(biz.id, e)}
                      >
                        <div className="clients-business-info">
                          <p className="clients-business-name">
                            <FiBriefcase size={13} /> {biz.business_name}
                          </p>
                          <p className="clients-business-type">
                            {biz.business_type_name} · slug: {biz.slug}
                          </p>
                          {hasSub && (
                            <div className="clients-business-subscription-badge">
                              <FiCreditCard size={12} />
                              <span className="clients-sub-period">
                                {biz.subscription.billing_period === 'monthly' ? 'Mensual' : 'Anual'}
                              </span>
                              <span className="clients-sub-amount">
                                ${parseFloat(biz.subscription.total_amount || 0).toFixed(2)}
                              </span>
                              <SubBadge sub={biz.subscription} />
                            </div>
                          )}
                        </div>
                        <div className="clients-business-header-actions">
                          <IconTextButton
                            variant=""
                            size="sm"
                            icon={<FiEdit2 size={13} />}
                            onClick={(e) => { e.stopPropagation(); onEditBusiness(biz); }}
                          >
                            Editar
                          </IconTextButton>
                          <IconTextButton
                            variant="info"
                            size="sm"
                            icon={<FiPackage size={13} />}
                            onClick={(e) => { e.stopPropagation(); onModBusiness(biz); }}
                          >
                            Módulos
                          </IconTextButton>
                          <IconTextButton
                            variant={hasSub ? 'success' : 'primary'}
                            size="sm"
                            icon={<FiCreditCard size={13} />}
                            onClick={(e) => { e.stopPropagation(); onSubBusiness({ ...biz, existingSubscription: biz.subscription }); }}
                          >
                            {hasSub ? 'Editar Suscripción' : 'Suscripción'}
                          </IconTextButton>
                          {hasSub && biz.subscription?.status === 'pending_activation' && (
                            <IconTextButton
                              variant="success"
                              size="sm"
                              icon={<FiCheck size={13} />}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                onRegisterPayment(biz); 
                              }}
                            >
                              Registrar Pago
                            </IconTextButton>
                          )}
                          <span className="clients-business-chevron">
                            {isBizExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                          </span>
                        </div>
                      </div>

                      <div className={`clients-business-detail ${isBizExpanded ? 'open' : 'closed'}`}>
                        {isBizExpanded && (
                          <>
                            {biz.modules?.length > 0 && (
                              <div className="clients-business-modules">
                                <span className="clients-business-modules-label">Módulos activos:</span>
                                <div className="clients-business-modules-list">
                                  {biz.modules.map(m => (
                                    <span key={m.id} className="clients-business-module">
                                      {MOD_ICONS[m.code] || <FiBox size={11}/>} {m.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {hasSub && (
                              <div className="clients-business-subscription-detail">
                                <div className="clients-sub-detail-row">
                                  <span className="clients-sub-detail-label">Próximo cobro:</span>
                                  <span className="clients-sub-detail-value">
                                    {biz.subscription.next_billing_at 
                                      ? new Date(biz.subscription.next_billing_at).toLocaleDateString('es-EC')
                                      : '—'}
                                  </span>
                                </div>
                                {biz.subscription.last_paid_at && (
                                  <div className="clients-sub-detail-row">
                                    <span className="clients-sub-detail-label">Último pago:</span>
                                    <span className="clients-sub-detail-value">
                                      {new Date(biz.subscription.last_paid_at).toLocaleDateString('es-EC')}
                                    </span>
                                  </div>
                                )}
                                {biz.subscription.notes && (
                                  <div className="clients-sub-detail-row">
                                    <span className="clients-sub-detail-label">Notas:</span>
                                    <span className="clients-sub-detail-value">{biz.subscription.notes}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [editBusiness, setEditBusiness] = useState(null);
  const [subBusiness, setSubBusiness] = useState(null);
  const [modBusiness, setModBusiness] = useState(null);
  
  // 🔥 Estados para el modal de pago
  const [payBusiness, setPayBusiness] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [savingPay, setSavingPay] = useState(false);
  const [payError, setPayError] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payReference, setPayReference] = useState('');
  const [payMethod, setPayMethod] = useState('transferencia');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.get('/admin/clients');
      setClients(res.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 🔥 Función para abrir el modal de pago
  const handleRegisterPayment = (business) => {
    setPayBusiness(business);
    setPayModalOpen(true);
    setPayError('');
    setPayNotes('');
    setPayReference('');
    setPayMethod('transferencia');
  };

  // 🔥 Función para confirmar el pago
  const handleConfirmPayment = async () => {
    if (savingPay) return;
    setSavingPay(true);
    setPayError('');
    
    try {
      const subId = payBusiness.subscription?.id;
      if (!subId) {
        throw new Error('No se encontró la suscripción');
      }
      
      await adminApi.post(`/admin/subscriptions/${subId}/mark-paid`, {
        notes: payNotes,
        payment_method: payMethod,
        reference: payReference,
      });
      
      alert.success('Pago registrado correctamente. Suscripción activada.', '✅ Éxito');
      setPayModalOpen(false);
      setPayBusiness(null);
      await loadData();
    } catch (e) {
      setPayError(e.message || 'Error al registrar el pago');
    } finally {
      setSavingPay(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c =>
      (c.full_name || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term) ||
      (c.businesses || []).some(b => (b.business_name || '').toLowerCase().includes(term))
    );
  }, [searchTerm, clients]);

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
      title="GESTIÓN DE CLIENTES"
      subtitle="Administra clientes, negocios y suscripciones"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={loadData}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <div className="clients-container">
        <div className="clients-toolbar-wrapper">
          <div className="clients-toolbar">
            <div className="clients-search">
              <FiSearch size={16} className="clients-search-icon" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o negocio..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="clients-search-input"
              />
              {searchTerm && (
                <button
                  className="clients-search-clear"
                  onClick={() => setSearchTerm('')}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
            <span className="clients-total-count">
              {filteredClients.length} {filteredClients.length === 1 ? 'cliente' : 'clientes'} encontrados
            </span>
          </div>
        </div>

        <div className="clients-accordion-list">
          {loading ? (
            <div className="clients-loading">Cargando clientes...</div>
          ) : filteredClients.length === 0 ? (
            <div className="clients-empty">
              <FiUser size={48} />
              <p>No hay clientes registrados</p>
              <span>Los clientes aparecerán aquí cuando se registren</span>
            </div>
          ) : (
            filteredClients.map(client => (
              <ClientAccordion
                key={client.id}
                client={client}
                onEditClient={setEditClient}
                onEditBusiness={setEditBusiness}
                onModBusiness={setModBusiness}
                onSubBusiness={setSubBusiness}
                onRegisterPayment={handleRegisterPayment}
              />
            ))
          )}
        </div>
      </div>

      {editClient && (
        <EditClientModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSaved={loadData}
        />
      )}
      {editBusiness && (
        <EditBusinessModal
          business={editBusiness}
          onClose={() => setEditBusiness(null)}
          onSaved={loadData}
        />
      )}
      {subBusiness && (
        <SubscriptionModal
          business={subBusiness}
          existingSubscription={subBusiness.existingSubscription}
          onClose={() => setSubBusiness(null)}
          onSaved={loadData}
        />
      )}
      {modBusiness && (
        <BusinessModulesModal
          business={modBusiness}
          onClose={() => setModBusiness(null)}
          onSaved={loadData}
        />
      )}

      {/* MODAL DE REGISTRO DE PAGO */}
      {payModalOpen && payBusiness && (
        <Modal
          isOpen={true}
          onClose={() => {
            setPayModalOpen(false);
            setPayBusiness(null);
            setPayError('');
            setPayNotes('');
            setPayReference('');
            setPayMethod('transferencia');
          }}
          title="Registrar Pago"
          size="sm"
          className="clients-pay-modal"
          footer={
            <>
              {payError && (
                <div className="modal-error-text">
                  <FiAlertCircle size={16} /> {payError}
                </div>
              )}
              <ButtonGroup>
                <IconTextButton
                  variant=""
                  size="md"
                  onClick={() => {
                    setPayModalOpen(false);
                    setPayBusiness(null);
                    setPayError('');
                    setPayNotes('');
                    setPayReference('');
                    setPayMethod('transferencia');
                  }}
                  disabled={savingPay}
                >
                  Cancelar
                </IconTextButton>
                <IconTextButton
                  variant="success"
                  size="md"
                  icon={<FiCheck size={14} />}
                  onClick={handleConfirmPayment}
                  disabled={savingPay}
                  loading={savingPay}
                >
                  {savingPay ? 'Registrando...' : 'Confirmar Pago'}
                </IconTextButton>
              </ButtonGroup>
            </>
          }
        >
          <div className="clients-pay-body">
            <p className="clients-pay-business">
              <strong>{payBusiness.business_name}</strong>
            </p>
            
            <div className="clients-pay-info">
              <div className="clients-pay-amount">
                <span className="clients-pay-label">Monto a pagar</span>
                <span className="clients-pay-value">
                  ${parseFloat(payBusiness.subscription?.total_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="clients-pay-due">
                <span className="clients-pay-label">Vencimiento</span>
                <span className="clients-pay-value">
                  {payBusiness.subscription?.next_billing_at 
                    ? new Date(payBusiness.subscription.next_billing_at).toLocaleDateString('es-EC', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })
                    : '—'}
                </span>
              </div>
            </div>

            <div className="clients-pay-field">
              <label htmlFor="pay-method">Método de Pago</label>
              <select
                id="pay-method"
                value={payMethod}
                onChange={(e) => {
                  setPayMethod(e.target.value);
                  if (e.target.value !== 'transferencia') {
                    setPayReference('');
                  }
                }}
                className="clients-pay-select"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta de Crédito/Débito</option>
                <option value="otros">Otros</option>
              </select>
            </div>

            {/* 🔥 Solo mostrar referencia si es transferencia */}
            {payMethod === 'transferencia' && (
              <div className="clients-pay-field">
                <label htmlFor="pay-reference">Referencia / Comprobante (opcional)</label>
                <input
                  id="pay-reference"
                  type="text"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Número de transferencia, comprobante, etc."
                  className="clients-pay-input"
                />
              </div>
            )}

            <div className="clients-pay-field">
              <label htmlFor="pay-notes">Notas (opcional)</label>
              <textarea
                id="pay-notes"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Notas adicionales..."
                className="clients-pay-textarea"
                rows={2}
              />
            </div>

            <p className="clients-pay-hint">
              Al confirmar se registrará el pago, la suscripción se activará y se enviará un email de confirmación al cliente.
            </p>
          </div>
        </Modal>
      )}
      
    </PageTemplate>
  );
}