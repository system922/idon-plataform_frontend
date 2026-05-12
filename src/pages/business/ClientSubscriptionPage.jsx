import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBox, FiCheck, FiSave, FiLock, FiLoader, FiAlertCircle,
  FiLogOut, FiChevronDown, FiChevronRight, FiStar, FiClock
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/ClientSubscriptionPage.css';

export default function ClientModuleSelection({ onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [business, setBusiness] = useState(null);
  const [template, setTemplate] = useState(null);
  const [selectedModules, setSelectedModules] = useState([]);
  const [selectedFeatures, setSelectedFeatures] = useState([]);
  const [expandedModules, setExpandedModules] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener negocio del usuario
      const bizRes = await fetchWithAuth('/api/business-status/my-businesses');
      if (!bizRes.ok) throw new Error('Error al cargar el negocio');
      
      const bizData = await bizRes.json();
      if (!bizData.ok || !bizData.businesses || bizData.businesses.length === 0) {
        throw new Error('No se encontró ningún negocio asociado');
      }
      
      const currentBusiness = bizData.businesses[0];
      setBusiness(currentBusiness);
      
      // Obtener plantilla según el tipo de negocio
      const templateRes = await fetchWithAuth(`/api/admin/templates/by-business-type/${currentBusiness.business_type_id}`);
      if (templateRes.ok) {
        const templateData = await templateRes.json();
        setTemplate(templateData.data);
        
        // Preseleccionar módulos sugeridos
        const suggestedModules = templateData.data?.modules?.filter(m => m.is_suggested || m.is_required) || [];
        setSelectedModules(suggestedModules.map(m => m.id));
        setExpandedModules(suggestedModules.map(m => m.id));
        
        // Preseleccionar features sugeridas
        const suggestedFeatures = [];
        suggestedModules.forEach(m => {
          const suggestedFeats = m.features?.filter(f => f.is_suggested || f.is_required) || [];
          suggestedFeats.forEach(f => suggestedFeatures.push(f.id));
        });
        setSelectedFeatures(suggestedFeatures);
      }
      
    } catch (err) {

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    if (selectedModules.includes(moduleId)) {
      setSelectedModules(prev => prev.filter(id => id !== moduleId));
      setExpandedModules(prev => prev.filter(id => id !== moduleId));
    } else {
      setSelectedModules(prev => [...prev, moduleId]);
      setExpandedModules(prev => [...prev, moduleId]);
    }
  };

  const toggleExpand = (moduleId, e) => {
    e.stopPropagation();
    setExpandedModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const toggleFeature = (featureId) => {
    if (selectedFeatures.includes(featureId)) {
      setSelectedFeatures(prev => prev.filter(id => id !== featureId));
    } else {
      setSelectedFeatures(prev => [...prev, featureId]);
    }
  };

  const handleSave = async () => {
    if (selectedModules.length === 0) {
      setError('Debes seleccionar al menos un módulo');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth(`/api/business/${business.id}/subscription-request`, {
        method: 'POST',
        body: JSON.stringify({
          moduleIds: selectedModules,
          featureIds: selectedFeatures,
          template_id: template?.template_id
        })
      });
      
      if (!response.ok) throw new Error('Error al guardar');
      
      setSuccess('✅ Solicitud enviada correctamente');
      setTimeout(() => navigate('/pending-approval'), 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="client-selection-container">
        <div className="client-selection-loading">
          <FiLoader size={40} className="spinning" />
          <p>Cargando módulos recomendados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-selection-container">
      <div className="client-selection-card">
        <div className="client-selection-header">
          <h1>Selecciona tus Módulos</h1>
          <button onClick={onLogout} className="logout-btn">
            <FiLogOut size={18} /> Cerrar sesión
          </button>
        </div>
        
        <p className="client-selection-subtitle">
          Basado en tu tipo de negocio <strong>{business?.business_type_name}</strong>,
          te recomendamos los siguientes módulos:
        </p>
        
        {error && (
          <div className="client-selection-error">
            <FiAlertCircle size={18} /> {error}
          </div>
        )}
        
        {success && (
          <div className="client-selection-success">
            <FiCheck size={18} /> {success}
          </div>
        )}
        
        <div className="client-selection-modules">
          {template?.modules?.map(module => {
            const isSelected = selectedModules.includes(module.id);
            const isExpanded = expandedModules.includes(module.id);
            const isRequired = module.is_required;
            
            return (
              <div key={module.id} className={`module-item ${isSelected ? 'selected' : ''}`}>
                <div className="module-row" onClick={() => !isRequired && toggleModule(module.id)}>
                  <div className="module-checkbox">
                    {isRequired ? <FiLock size={14} /> : (isSelected && <FiCheck size={14} />)}
                  </div>
                  
                  <div className="module-info">
                    <div className="module-name">
                      {module.name}
                      {isRequired && <span className="required-badge">Obligatorio</span>}
                    </div>
                    <div className="module-price">
                      ${module.price_monthly}/mes
                    </div>
                  </div>
                  
                  {module.features?.length > 0 && (
                    <button className="module-expand" onClick={(e) => toggleExpand(module.id, e)}>
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                  )}
                </div>
                
                {isExpanded && module.features?.length > 0 && (
                  <div className="module-features">
                    {module.features.map(feature => (
                      <div
                        key={feature.id}
                        className={`feature-item ${selectedFeatures.includes(feature.id) ? 'selected' : ''}`}
                        onClick={() => toggleFeature(feature.id)}
                      >
                        <div className="feature-checkbox">
                          {selectedFeatures.includes(feature.id) && <FiCheck size={12} />}
                        </div>
                        <span>{feature.name}</span>
                        {feature.is_premium && <FiStar size={12} className="premium" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="client-selection-note">
          <FiClock size={16} />
          <span>Los cambios serán revisados por Soporte IDON y activados en 1-2 horas.</span>
        </div>
        
        <button className="client-selection-save" onClick={handleSave} disabled={saving}>
          {saving ? <><FiLoader className="spinning" /> Guardando...</> : <><FiSave /> Guardar Selección</>}
        </button>
      </div>
    </div>
  );
}