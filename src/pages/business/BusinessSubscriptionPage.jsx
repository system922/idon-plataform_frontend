/**
 * BusinessSubscriptionPage.jsx
 * Ubicación: src/pages/BusinessSubscriptionPage.jsx
 * Página para que el dueño del negocio seleccione sus módulos y configure su suscripción
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiX, FiCheck, FiCreditCard, FiBox, FiSettings, FiShoppingCart,
  FiBarChart2, FiDollarSign, FiBriefcase, FiTruck, FiGrid,
  FiCalendar, FiStar, FiShoppingBag, FiUsers, FiUserCheck,
  FiMap, FiMapPin, FiList, FiGlobe, FiBell, FiFileText,
  FiThermometer, FiPercent, FiTag, FiLoader, FiAlertCircle,
  FiLogOut, FiClock
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/BusinessSubscriptionPage.css';

/* ─── Iconos por módulo ──────────────────────────────────── */
const MOD_ICONS = {
  core:          <FiSettings   size={18}/>,
  pos:           <FiShoppingCart size={18}/>,
  inventory:     <FiBox        size={18}/>,
  reports:       <FiBarChart2  size={18}/>,
  payments:      <FiCreditCard size={18}/>,
  accounting:    <FiDollarSign size={18}/>,
  orders:        <FiBriefcase  size={18}/>,
  kitchen:       <FiThermometer size={18}/>,
  delivery:      <FiTruck      size={18}/>,
  tables:        <FiGrid       size={18}/>,
  reservations:  <FiCalendar   size={18}/>,
  loyalty:       <FiStar       size={18}/>,
  suppliers:     <FiTruck      size={18}/>,
  purchases:     <FiShoppingBag size={18}/>,
  appointments:  <FiCalendar   size={18}/>,
  employees:     <FiUsers      size={18}/>,
  crm:           <FiUserCheck  size={18}/>,
  routes:        <FiMap        size={18}/>,
  tracking:      <FiMapPin     size={18}/>,
  queue:         <FiList       size={18}/>,
  ecommerce:     <FiGlobe      size={18}/>,
  notifications: <FiBell       size={18}/>,
  einvoicing:    <FiFileText   size={18}/>,
};

export default function BusinessSubscriptionPage({ onLogout }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Datos del negocio
  const [business, setBusiness] = useState(null);
  const [availableModules, setAvailableModules] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  
  // Configuración de suscripción
  const [period, setPeriod] = useState('monthly'); // 'monthly' or 'annual'
  const [discount, setDiscount] = useState('');
  const [billingDay, setBillingDay] = useState('1');
  
  // Cargar datos
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
      
      // Obtener módulos disponibles
      const modulesRes = await fetchWithAuth(`/api/businesses/${currentBusiness.id}/available-modules`);
      if (modulesRes.ok) {
        const modulesData = await modulesRes.json();
        setAvailableModules(modulesData.modules || []);
        
        // Si ya tiene módulos seleccionados, marcarlos
        if (currentBusiness.modules && currentBusiness.modules.length > 0) {
          setSelectedModules(currentBusiness.modules.map(m => m.id));
        }
      }
      
      // Si ya tiene una suscripción, cargar datos
      const subRes = await fetchWithAuth(`/api/businesses/${currentBusiness.id}/subscription`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setPeriod(subData.billing_period || 'monthly');
        setBillingDay(String(subData.billing_day || 1));
        if (subData.discount_percentage) {
          setDiscount(String(subData.discount_percentage));
        }
      }
      
    } catch (err) {

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleModule = (moduleId) => {
    setSelectedModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Calcular totales
  const calculateTotals = () => {
    const selectedMods = availableModules.filter(m => selectedModules.includes(m.id));
    const subtotalMens = selectedMods.reduce((sum, m) => sum + (parseFloat(m.price_monthly) || 0), 0);
    const subtotalAnual = selectedMods.reduce((sum, m) => sum + (parseFloat(m.price_annual) || 0), 0);
    const subtotal = period === 'monthly' ? subtotalMens : subtotalAnual;
    
    const discPct = Math.min(Math.max(parseFloat(discount) || 0, 0), 100);
    const discountAmt = (subtotal * discPct) / 100;
    const total = subtotal - discountAmt;
    const savingAnual = subtotalMens * 12 - subtotalAnual;
    
    return { subtotalMens, subtotalAnual, subtotal, discPct, discountAmt, total, savingAnual };
  };

  const { subtotalMens, subtotalAnual, subtotal, discPct, discountAmt, total, savingAnual } = calculateTotals();

  const handleSave = async () => {
    if (saving) return;
    
    if (selectedModules.length === 0) {
      setError('Debes seleccionar al menos un módulo');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const payload = {
        modules: selectedModules,
        billing_period: period,
        billing_day: parseInt(billingDay) || 1,
        discount_percentage: discPct,
        status: 'pending_activation'
      };
      
      const response = await fetchWithAuth(`/api/businesses/${business.id}/subscription/request`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la suscripción');
      }
      
      setSuccess('¡Solicitud enviada correctamente! El equipo de Soporte IDON revisará tu selección y activará tu suscripción en breve.');
      
      // Redirigir a la página de pendiente después de 3 segundos
      setTimeout(() => {
        navigate('/pending-approval');
      }, 3000);
      
    } catch (err) {

      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.clear();
      navigate('/login');
    }
  };

  if (loading) {
    return (
      <div className="subscription-container">
        <div className="subscription-loading">
          <FiLoader size={40} className="spinning" />
          <p>Cargando configuración de suscripción...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <div className="subscription-card">
        
        {/* Header */}
        <div className="subscription-header">
          <h1 className="subscription-title">
            <FiCreditCard size={28} />
            Configurar Suscripción
          </h1>
          <button onClick={handleLogout} className="logout-header-btn">
            <FiLogOut size={18} /> Cerrar sesión
          </button>
        </div>
        
        <p className="subscription-subtitle">
          Selecciona los módulos que deseas para tu negocio <strong>{business?.name || business?.business_name}</strong>
        </p>
        
        {/* Error/Success messages */}
        {error && (
          <div className="subscription-error">
            <FiAlertCircle size={18} />
            {error}
          </div>
        )}
        
        {success && (
          <div className="subscription-success">
            <FiCheck size={18} />
            {success}
          </div>
        )}
        
        {/* Módulos disponibles */}
        <div className="modules-section">
          <h2 className="section-title">
            <FiBox size={18} />
            Módulos Disponibles
          </h2>
          
          <div className="modules-grid">
            {availableModules.map(module => (
              <div 
                key={module.id} 
                className={`module-card ${selectedModules.includes(module.id) ? 'selected' : ''}`}
                onClick={() => toggleModule(module.id)}
              >
                <div className="module-check">
                  {selectedModules.includes(module.id) && <FiCheck size={16} />}
                </div>
                <div className="module-icon">
                  {MOD_ICONS[module.code] || <FiBox size={24} />}
                </div>
                <div className="module-info">
                  <div className="module-name">{module.name}</div>
                  <div className="module-description">{module.description || ''}</div>
                  <div className="module-prices">
                    <span className="price-monthly">${parseFloat(module.price_monthly || 0).toFixed(2)}/mes</span>
                    <span className="price-annual">${parseFloat(module.price_annual || 0).toFixed(2)}/año</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Configuración de suscripción */}
        <div className="config-section">
          <h2 className="section-title">
            <FiSettings size={18} />
            Configuración de Facturación
          </h2>
          
          <div className="config-grid">
            {/* Período de facturación */}
            <div className="config-group">
              <label className="config-label">Período de facturación</label>
              <div className="period-buttons">
                <button 
                  className={`period-btn ${period === 'monthly' ? 'active' : ''}`}
                  onClick={() => setPeriod('monthly')}
                >
                  Mensual
                  <span className="period-price">${subtotalMens.toFixed(2)}/mes</span>
                </button>
                <button 
                  className={`period-btn ${period === 'annual' ? 'active' : ''}`}
                  onClick={() => setPeriod('annual')}
                >
                  Anual
                  <span className="period-price">${subtotalAnual.toFixed(2)}/año</span>
                  {savingAnual > 0 && <span className="period-saving">Ahorro: ${savingAnual.toFixed(2)}</span>}
                </button>
              </div>
            </div>
            
            {/* Día de facturación */}
            <div className="config-group">
              <label className="config-label">Día de facturación del mes (1-28)</label>
              <input 
                type="number" 
                min="1" 
                max="28" 
                value={billingDay} 
                onChange={(e) => setBillingDay(e.target.value)}
                className="config-input"
              />
            </div>
            
            {/* Descuento */}
            <div className="config-group">
              <label className="config-label">Código de descuento</label>
              <div className="discount-input-wrapper">
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={discount} 
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="config-input"
                />
                <span className="discount-symbol">%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Resumen */}
        <div className="summary-section">
          <h2 className="section-title">
            <FiDollarSign size={18} />
            Resumen
          </h2>
          
          <div className="summary-card">
            <div className="summary-row">
              <span>Módulos seleccionados:</span>
              <strong>{selectedModules.length}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotal ({period === 'monthly' ? 'mensual' : 'anual'}):</span>
              <strong>${subtotal.toFixed(2)}</strong>
            </div>
            {discPct > 0 && (
              <div className="summary-row highlight">
                <span>Descuento ({discPct}%):</span>
                <strong>- ${discountAmt.toFixed(2)}</strong>
              </div>
            )}
            <div className="summary-row total">
              <span>Total {period === 'monthly' ? 'mensual' : 'anual'}:</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
          </div>
        </div>
        
        {/* Nota importante */}
        <div className="note-section">
          <FiClock size={16} />
          <span>
            Al guardar tu selección, el equipo de Soporte IDON revisará tu solicitud 
            y activará tu suscripción en un plazo de <strong>24 a 48 horas hábiles</strong>.
            Recibirás una notificación cuando esté activa.
          </span>
        </div>
        
        {/* Botones de acción */}
        <div className="actions-section">
          <button 
            className="btn-save"
            onClick={handleSave}
            disabled={saving || selectedModules.length === 0}
          >
            {saving ? (
              <><FiLoader size={18} className="spinning" /> Guardando...</>
            ) : (
              <><FiCheck size={18} /> Guardar Selección</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}