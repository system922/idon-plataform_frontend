import React, { useState, useEffect } from 'react';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiPlus, FiEdit, FiTrash2, FiX, FiCheck, FiLoader,
  FiBox, FiStar, FiAlertCircle
} from 'react-icons/fi';
import { adminApiService } from '../../services/apiService';
import '../../styles/AdminPages.css';

export default function AdminTemplatesPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();
  const [templates, setTemplates] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    business_type_id: '',
    is_default: false,
    modules: []
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      
      const templatesRes = await adminApiService.get('/admin/templates');
      const businessTypesRes = await adminApiService.get('/admin/business-types');
      const modulesRes = await adminApiService.get('/admin/modules');
      
      setTemplates(templatesRes.data?.data || templatesRes.data || []);
      setBusinessTypes(businessTypesRes.data?.data || businessTypesRes.data || []);
      setAllModules(modulesRes.data?.data || modulesRes.data || []);
    } catch (error) {

      setErrorMsg('Error al cargar los datos: ' + (error.message || 'Desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      description: '',
      business_type_id: '',
      is_default: false,
      modules: []
    });
    setExpandedModules({});
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    const modulesMap = {};
    (template.modules || []).forEach(m => {
      modulesMap[m.module_id] = true;
    });
    setExpandedModules(modulesMap);
    setFormData({
      name: template.name,
      description: template.description || '',
      business_type_id: template.business_type_id,
      is_default: template.is_default,
      modules: template.modules || []
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const toggleModule = (moduleId) => {
    const existing = formData.modules.find(m => m.module_id === moduleId);
    if (existing) {
      setFormData({
        ...formData,
        modules: formData.modules.filter(m => m.module_id !== moduleId)
      });
      setExpandedModules(prev => ({ ...prev, [moduleId]: false }));
    } else {
      setFormData({
        ...formData,
        modules: [...formData.modules, { module_id: moduleId, is_required: false, features: [] }]
      });
      setExpandedModules(prev => ({ ...prev, [moduleId]: true }));
    }
  };

  const toggleExpandModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const toggleFeature = (moduleId, featureId) => {
    const moduleIndex = formData.modules.findIndex(m => m.module_id === moduleId);
    if (moduleIndex === -1) return;
    
    const module = formData.modules[moduleIndex];
    const featureExists = module.features.find(f => f.feature_id === featureId);
    
    let newFeatures;
    if (featureExists) {
      newFeatures = module.features.filter(f => f.feature_id !== featureId);
    } else {
      newFeatures = [...module.features, { feature_id: featureId, is_required: false }];
    }
    
    const updatedModules = [...formData.modules];
    updatedModules[moduleIndex] = { ...module, features: newFeatures };
    setFormData({ ...formData, modules: updatedModules });
  };

  const setModuleRequired = (moduleId, isRequired) => {
    const moduleIndex = formData.modules.findIndex(m => m.module_id === moduleId);
    if (moduleIndex !== -1) {
      const updatedModules = [...formData.modules];
      updatedModules[moduleIndex] = { 
        ...updatedModules[moduleIndex], 
        is_required: isRequired 
      };
      setFormData({ ...formData, modules: updatedModules });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setErrorMsg('El nombre de la plantilla es requerido');
      return;
    }
    if (!formData.business_type_id) {
      setErrorMsg('Debes seleccionar un tipo de negocio');
      return;
    }
    if (formData.modules.length === 0) {
      setErrorMsg('Debes seleccionar al menos un módulo');
      return;
    }
    
    setSaving(true);
    setErrorMsg('');
    
    try {
      if (editingTemplate) {
        await adminApiService.put(`/admin/templates/${editingTemplate.id}`, formData);
      } else {
        await adminApiService.post('/admin/templates', formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {

      setErrorMsg(error.response?.data?.message || error.message || 'Error al guardar la plantilla');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await showConfirm('¿Estás seguro de eliminar esta plantilla? Esta acción no se puede deshacer.')) return;
    try {
      await adminApiService.delete(`/admin/templates/${id}`);
      loadData();
    } catch (error) {

      await alert.error('Error al eliminar la plantilla');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Cargando plantillas...</p>
      </div>
    );
  }

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Plantillas por Tipo de Negocio</h1>
          <p className="admin-page-subtitle">
            Gestiona las plantillas de módulos y funcionalidades para cada tipo de negocio
          </p>
        </div>
        <button className="admin-btn admin-btn-primary" onClick={openCreateModal}>
          <FiPlus size={16} /> Nueva Plantilla
        </button>
      </div>

      {errorMsg && !showModal && (
        <div className="admin-error" style={{ marginBottom: 20 }}>
          <FiAlertCircle size={16} style={{ marginRight: 8 }} /> {errorMsg}
        </div>
      )}

      {templates.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon"><FiBox size={48} /></div>
          <p className="admin-empty-title">No hay plantillas</p>
          <p className="admin-empty-text">Crea tu primera plantilla para empezar</p>
          <button className="admin-btn admin-btn-primary" onClick={openCreateModal} style={{ marginTop: 16 }}>
            <FiPlus size={16} /> Crear Plantilla
          </button>
        </div>
      ) : (
        <div className="admin-grid admin-grid-3">
          {templates.map(template => (
            <div key={template.id} className="admin-card">
              <div className="admin-card-header">
                <h3>{template.name}</h3>
                <div className="admin-table-actions">
                  <button onClick={() => openEditModal(template)} className="admin-table-btn" title="Editar">
                    <FiEdit size={14} />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="admin-table-btn admin-table-btn-danger" title="Eliminar">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="admin-card-body">
                <p style={{ fontSize: 13, color: 'var(--admin-text-secondary)', margin: '0 0 16px 0' }}>
                  {template.description || 'Sin descripción'}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <span className="admin-badge admin-badge-info">
                    Tipo: {template.business_type_name || 'No especificado'}
                  </span>
                  {template.is_default && (
                    <span className="admin-badge admin-badge-success">Por defecto</span>
                  )}
                  <span className="admin-badge">
                    {template.modules?.length || 0} módulos
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => !saving && setShowModal(false)}>
          <div className="admin-modal admin-modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="admin-modal-header">
              <h2>{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              <button className="admin-modal-close" onClick={() => !saving && setShowModal(false)}>
                <FiX size={20} />
              </button>
            </div>
            
            <div className="admin-modal-body">
              {errorMsg && (
                <div className="admin-error" style={{ marginBottom: 16 }}>
                  <FiAlertCircle size={14} style={{ marginRight: 6 }} /> {errorMsg}
                </div>
              )}
              
              <div className="admin-form-group">
                <label>Nombre de la Plantilla *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Plantilla Restaurante"
                  disabled={saving}
                />
              </div>
              
              <div className="admin-form-group">
                <label>Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                  placeholder="Descripción de la plantilla..."
                  disabled={saving}
                />
              </div>
              
              <div className="admin-form-group">
                <label>Tipo de Negocio *</label>
                <select
                  value={formData.business_type_id}
                  onChange={e => setFormData({ ...formData, business_type_id: e.target.value })}
                  disabled={saving}
                >
                  <option value="">Seleccionar tipo de negocio</option>
                  {businessTypes.map(bt => (
                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="admin-form-group">
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                    disabled={saving}
                  />
                  <span>Plantilla por defecto para este tipo de negocio</span>
                </label>
              </div>
              
              <hr className="admin-divider" />
              
              <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: 'var(--admin-text-primary)' }}>
                Módulos y Funcionalidades
              </h3>
              <p style={{ fontSize: 12, color: 'var(--admin-text-muted)', marginBottom: 16 }}>
                Selecciona los módulos y funcionalidades que estarán disponibles para este tipo de negocio.
              </p>
              
              {allModules.length === 0 ? (
                <div className="admin-empty" style={{ padding: '20px' }}>
                  <p>No hay módulos disponibles. Debes crearlos primero en la sección de Módulos.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {allModules.map(module => {
                    const isSelected = formData.modules.some(m => m.module_id === module.id);
                    const selectedModule = formData.modules.find(m => m.module_id === module.id);
                    const isExpanded = expandedModules[module.id];
                    
                    return (
                      <div key={module.id} style={{
                        background: 'var(--admin-bg-tertiary)',
                        border: `1px solid ${isSelected ? 'var(--admin-orange)' : 'var(--admin-border)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                          background: isSelected ? 'rgba(255,140,66,0.05)' : 'transparent'
                        }}>
                          <label className="admin-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleModule(module.id)}
                              disabled={saving}
                            />
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FiBox size={16} /> {module.name}
                            </span>
                          </label>
                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                              <label className="admin-checkbox-small">
                                <input
                                  type="checkbox"
                                  checked={selectedModule?.is_required || false}
                                  onChange={(e) => setModuleRequired(module.id, e.target.checked)}
                                  disabled={saving}
                                />
                                <span>Obligatorio</span>
                              </label>
                              {module.features && module.features.length > 0 && (
                                <button
                                  onClick={() => toggleExpandModule(module.id)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--admin-text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                >
                                  {isExpanded ? '▼ Ocultar features' : '▶ Mostrar features'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {isSelected && isExpanded && module.features && module.features.length > 0 && (
                          <div style={{
                            padding: '12px 16px',
                            borderTop: '1px solid var(--admin-border)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            background: 'rgba(0,0,0,0.2)'
                          }}>
                            {module.features.map(feature => {
                              const isFeatureSelected = selectedModule?.features?.some(f => f.feature_id === feature.id);
                              return (
                                <label key={feature.id} className="admin-checkbox-small">
                                  <input
                                    type="checkbox"
                                    checked={isFeatureSelected || false}
                                    onChange={() => toggleFeature(module.id, feature.id)}
                                    disabled={saving}
                                  />
                                  <span>
                                    {feature.name}
                                    {feature.is_premium && <FiStar size={12} style={{ marginLeft: 4, color: '#f59e0b' }} />}
                                  </span>
                                </label>
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
            
            <div className="admin-modal-footer">
              <button className="admin-btn admin-btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
                Cancelar
              </button>
              <button className="admin-btn admin-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><FiLoader size={16} className="admin-spinner" style={{ marginRight: 6 }} /> Guardando...</> : <><FiCheck size={16} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}