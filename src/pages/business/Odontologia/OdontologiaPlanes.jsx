// pages/business/Odontologia/OdontologiaPlanes.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiFileText, 
  FiSearch, 
  FiX, 
  FiRefreshCw,
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';
import PageTemplate from '../../../components/PageTemplate';
import { 
  PlanStats, 
  PlanTable, 
  PlanModal, 
  PlanDetailModal 
} from '../../../components/Odontologia/Planes/index';
import '../../../styles/Odontologia/index.css';



export default function OdontologiaPlanes() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    completados: 0,
    borradores: 0,
    cancelados: 0,
    costo_promedio: 0
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 [Planes] Cargando datos...');
      
      // 1. Cargar planes
      const res = await fetchWithAuth('/odontologia/planes-tratamiento');
      const data = await res.json();
      
      console.log('📦 [Planes] Respuesta:', data);
      
      if (!res.ok) {
        throw new Error(data.error || data.message || `Error HTTP ${res.status}`);
      }

      let planesData = [];
      
      if (data.success && data.data && Array.isArray(data.data)) {
        planesData = data.data;
      } else if (Array.isArray(data)) {
        planesData = data;
      } else if (data.data && Array.isArray(data.data)) {
        planesData = data.data;
      } else {
        planesData = [];
      }
      
      setPlanes(planesData);
      
      // 2. Cargar estadísticas
      try {
        const statsRes = await fetchWithAuth(`/odontologia/planes-tratamiento/stats`);
        const statsData = await statsRes.json();
        console.log('📦 [Planes] Estadísticas:', statsData);
        
        let statsResult = { 
          total: 0, 
          activos: 0, 
          completados: 0, 
          borradores: 0, 
          cancelados: 0, 
          costo_promedio: 0 
        };
        
        if (statsData.success && statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else if (statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else {
          statsResult = { ...statsResult, ...statsData };
        }
        
        // Si las stats vinieron vacías, calcular manualmente
        if (statsResult.total === 0 && planesData.length > 0) {
          statsResult.total = planesData.length;
          statsResult.activos = planesData.filter(p => p.status === 'active').length;
          statsResult.completados = planesData.filter(p => p.status === 'completed').length;
          statsResult.borradores = planesData.filter(p => p.status === 'draft').length;
          statsResult.cancelados = planesData.filter(p => p.status === 'cancelled').length;
          
          const totalCosto = planesData.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
          statsResult.costo_promedio = planesData.length > 0 ? totalCosto / planesData.length : 0;
        }
        
        setStats(statsResult);
        
      } catch (statsErr) {
        console.warn('⚠️ [Planes] Error cargando estadísticas, calculando manualmente:', statsErr);
        // Calcular estadísticas manualmente
        const total = planesData.length;
        const activos = planesData.filter(p => p.status === 'active').length;
        const completados = planesData.filter(p => p.status === 'completed').length;
        const borradores = planesData.filter(p => p.status === 'draft').length;
        const cancelados = planesData.filter(p => p.status === 'cancelled').length;
        const totalCosto = planesData.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);
        const costo_promedio = planesData.length > 0 ? totalCosto / planesData.length : 0;
        
        setStats({ total, activos, completados, borradores, cancelados, costo_promedio });
      }
      
    } catch (err) {
      console.error('❌ [Planes] Error:', err);
      setError('Error al cargar los datos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // HANDLERS - CRUD
  // ============================================================
  const handleSave = async (formData) => {
    setSaving(true);
    setError(null);
    try {
      let url, method;
      if (selectedPlan) {
        url = `/odontologia/planes-tratamiento/${selectedPlan.id}`;
        method = 'PUT';
      } else {
        url = `/odontologia/planes-tratamiento`;
        method = 'POST';
      }


      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el plan');
      }

      await loadData();
      setShowModal(false);
      setSelectedPlan(null);
      
      alert(data.message || 'Plan guardado correctamente');
      return { success: true, data: data.data };
    } catch (err) {
      console.error('❌ [Planes] Error guardando:', err);
      setError(err.message);
      alert(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (plan) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPlan(plan);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este plan de tratamiento? Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetchWithAuth(`/odontologia/planes-tratamiento/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar el plan');
      }

      await loadData();
      alert('Plan eliminado correctamente');
      return { success: true };
    } catch (err) {
      console.error('❌ [Planes] Error eliminando:', err);
      alert(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleView = (plan) => {
    setSelectedPlan(plan);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPlan(null);
  };

  // ============================================================
  // FILTRAR PLANES
  // ============================================================
  const filteredPlanes = planes.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const matchSearch = searchTerm === '' || 
      p.name?.toLowerCase().includes(searchLower) ||
      p.description?.toLowerCase().includes(searchLower);
    
    const matchStatus = statusFilter === '' || p.status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplate
      title="Planes de Tratamiento"
      subtitle="Gestión de planes de tratamiento odontológicos"
      loading={loading}
      icon={<FiFileText size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar plan por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="odonto-search-clear"
                onClick={() => setSearchTerm('')}
                type="button"
              >
                <FiX size={16} />
              </button>
            )}
          </div>
          
          <button 
            className="odonto-btn-primary" 
            onClick={() => {
              setSelectedPlan(null);
              setShowModal(true);
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nuevo Plan
          </button>
          
          <button 
            className="odonto-btn-secondary" 
            onClick={loadData} 
            title="Recargar" 
            disabled={loading}
          >
            <FiRefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      }
    >
      {error && (
        <div className="odonto-alert error" style={{ marginBottom: 16 }}>
          <span>❌ {error}</span>
        </div>
      )}

      <PlanStats stats={stats} planes={planes} />

      <div className="odonto-filters-row">
        <div className="odonto-filter-group">
          <label>Estado:</label>
          <select 
            className="odonto-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Borrador</option>
            <option value="active">Activo</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>

        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredPlanes.length} de {planes.length} planes</span>
        </div>
      </div>

      <PlanTable 
        planes={filteredPlanes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        loading={loading}
      />

      <PlanModal 
        isOpen={showModal}
        onClose={closeModal}
        plan={selectedPlan}
        onSave={handleSave}
        loading={saving}
      />

      <PlanDetailModal 
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        plan={selectedPlan}
        onEdit={handleEdit}
      />
    </PageTemplate>
  );
}