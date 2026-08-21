/**
 * DashboardBusinessSelector.jsx
 * Ubicación: src/components/DashboardBusinessSelector.jsx
 *
 * Selector de negocio para el dashboard — carga negocios desde la API
 * y guarda módulos/features en localStorage al seleccionar.
 */
import React, { useState, useEffect } from 'react';
import { useSession } from '../context/SessionContext';
import { FiChevronDown, FiHome, FiMapPin, FiMail, FiPhone, FiArrowRight } from 'react-icons/fi';
import { api } from '../config/api';

export default function DashboardBusinessSelector({ onBusinessChange }) {
  const { businesses: sessionBusinesses, selectedBusiness: sessionSelectedBusiness, selectBusiness } = useSession();
  const [businesses,       setBusinesses]       = useState(sessionBusinesses || []);
  const [selectedBusiness, setSelectedBusiness] = useState(sessionSelectedBusiness || null);
  const [isOpen,           setIsOpen]           = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [switching,        setSwitching]        = useState(false);

  // Cargar negocios desde API y restaurar selección desde localStorage
  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        setLoading(true);
        // Preferir la lista en sesión si existe
        let list = [];
        try {
          const response = await api.get('/api/businesses');
          const data = response.data;
          list = Array.isArray(data) ? data : (data?.data || []);
        } catch (e) {
          // fallback to session businesses
          list = sessionBusinesses || [];
        }
        setBusinesses(list);

        // Si no hay seleccionado en sesión, usar el primero
        if (!sessionSelectedBusiness && list.length > 0) {
          setSelectedBusiness(list[0]);
          // NOTA: no guardar en localStorage; propagar al contexto si es necesario
        } else if (sessionSelectedBusiness) {
          setSelectedBusiness(sessionSelectedBusiness);
        }
      } catch (e) {

        // Fallback a localStorage si falla la API
        const local = localStorage.getItem('userBusinesses');
        if (local) {
          try { setBusinesses(JSON.parse(local)); } catch {}
        }
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, []);

  // Cargar módulos y features del negocio seleccionado
  async function loadModulesAndFeatures(businessId) {
      try {
        const response = await api.get(`/api/business/${businessId}/modules-and-features`);
        const data = response.data?.data || response.data;
        if (!data) return;
        const modules  = data.module_codes  || [];
        const features = data.feature_codes || [];

        // Store modules/features in memory via session or a global state if needed
        // For now keep them in memory by setting local variables or calling a setter
        // Avoid localStorage per request of the user
        // If other parts require these, we should expose a context to store them globally
        // TODO: implement a modules/features context if persistent access required

      } catch (e) {
        console.error('Error loading modules and features:', e);
      }
  }

  const handleSelectBusiness = async (business) => {
    setSwitching(true);
    setIsOpen(false);

    // Delegar la selección al SessionContext (realiza POST /auth/select-business)
    setSelectedBusiness(business);
    const result = await selectBusiness(business.id);

    // Cargar módulos y features en background (no usar localStorage)
    await loadModulesAndFeatures(business.id);

    setSwitching(false);

    if (result.success) {
      if (onBusinessChange) onBusinessChange(business);
      else window.location.reload(); // todavía recarga para refrescar toda la app
    } else {
      console.error('Error selecting business from SessionContext:', result.error);
    }
  };

  // No mostrar si solo hay 1 negocio
  if (!loading && businesses.length <= 1) return null;

  return (
    <div style={{ position: 'relative', marginBottom: 20 }}>
      {/* Botón selector */}
      <button
        onClick={() => setIsOpen(v => !v)}
        disabled={switching}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,.05)',
          border: '1px solid rgba(255,255,255,.12)',
          color: '#fff', width: '100%', maxWidth: 360,
          transition: 'background .15s',
        }}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,140,66,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff8c42', flexShrink: 0 }}>
          <FiHome size={16}/>
        </div>
        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>Mi Negocio</div>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {switching ? 'Cambiando...' : (selectedBusiness?.name || 'Selecciona un negocio')}
          </div>
        </div>
        <FiChevronDown size={16} style={{ color: 'rgba(255,255,255,.4)', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}/>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0,
          width: '100%', maxWidth: 360, zIndex: 200,
          background: '#1e2533', border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,.5)',
        }}>
          {businesses.map(biz => {
            const isActive = selectedBusiness?.id === biz.id;
            return (
              <button
                key={biz.id}
                onClick={() => handleSelectBusiness(biz)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '12px 16px', border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(255,140,66,.1)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,.06)',
                  transition: 'background .15s', textAlign: 'left',
                }}
                onMouseOver={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,.04)')}
                onMouseOut={e  => !isActive && (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{biz.name}</span>
                    {isActive && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,140,66,.2)', color: '#ff8c42', padding: '1px 7px', borderRadius: 20 }}>Activo</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>{biz.type}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                    {biz.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                        <FiMail size={11}/> {biz.email}
                      </div>
                    )}
                    {biz.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                        <FiPhone size={11}/> {biz.phone}
                      </div>
                    )}
                    {biz.address && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,.35)' }}>
                        <FiMapPin size={11}/> {biz.address}
                      </div>
                    )}
                  </div>
                </div>
                <FiArrowRight size={15} style={{ color: isActive ? '#ff8c42' : 'rgba(255,255,255,.2)', flexShrink: 0, marginLeft: 8 }}/>
              </button>
            );
          })}
        </div>
      )}

      {/* Overlay para cerrar el dropdown */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        />
      )}
    </div>
  );
}
