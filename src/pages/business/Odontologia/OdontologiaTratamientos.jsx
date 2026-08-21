// components/Odontologia/Tratamientos/TratamientosPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, FiActivity, FiSearch, FiX, FiRefreshCw
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { 
  TratamientoStats, 
  TratamientoTable, 
  TratamientoModal, 
  TratamientoDetailModal 
} from '../../../components/Odontologia/Tratamientos/index';

import '../../../styles/Odontologia/index.css';

export default function TratamientosPage() {
  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    duracionPromedio: 0,
    precioPromedio: 0
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTratamiento, setSelectedTratamiento] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [error, setError] = useState(null);

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 Cargando tratamientos...');
      
      const res = await fetchWithAuth('/api/odontologia/tratamientos');
      const data = await res.json();
      
      console.log('📦 Respuesta completa:', data);
      
      let tratamientosData = [];
      
      // Manejar diferentes formatos de respuesta
      if (Array.isArray(data)) {
        tratamientosData = data;
        console.log('✅ Formato: Array directo');
      } else if (data.success && data.data) {
        tratamientosData = Array.isArray(data.data) ? data.data : [];
        console.log('✅ Formato: { success, data }');
      } else if (data.data && Array.isArray(data.data)) {
        tratamientosData = data.data;
        console.log('✅ Formato: { data }');
      } else if (data.rows && Array.isArray(data.rows)) {
        tratamientosData = data.rows;
        console.log('✅ Formato: { rows }');
      } else if (data.result && Array.isArray(data.result)) {
        tratamientosData = data.result;
        console.log('✅ Formato: { result }');
      } else {
        console.warn('⚠️ Formato de datos no reconocido:', data);
        tratamientosData = [];
      }
      
      console.log('📋 Tratamientos procesados:', tratamientosData);
      console.log('📊 Cantidad:', tratamientosData.length);
      
      setTratamientos(tratamientosData);
      
      // Calcular estadísticas
      const total = tratamientosData.length;
      const activos = tratamientosData.filter(t => t.is_active === true).length;
      const inactivos = tratamientosData.filter(t => t.is_active === false).length;
      
      // Calcular promedios
      let duracionPromedio = 0;
      let precioPromedio = 0;
      
      if (total > 0) {
        const sumaDuracion = tratamientosData.reduce((sum, t) => sum + (Number(t.duration_minutes) || 0), 0);
        const sumaPrecio = tratamientosData.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
        duracionPromedio = Math.round(sumaDuracion / total);
        precioPromedio = sumaPrecio / total;
      }
      
      setStats({ 
        total, 
        activos, 
        inactivos,
        duracionPromedio,
        precioPromedio
      });
      
      console.log('📊 Estadísticas calculadas:', { total, activos, inactivos, duracionPromedio, precioPromedio });
      
    } catch (err) {
      console.error('❌ Error loading tratamientos:', err);
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
      if (selectedTratamiento) {
        url = `/api/odontologia/tratamientos/${selectedTratamiento.id}`;
        method = 'PUT';
      } else {
        url = '/api/odontologia/tratamientos';
        method = 'POST';
      }

      console.log(`📤 ${method} ${url}`, formData);

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('📥 Respuesta guardado:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el tratamiento');
      }

      // Recargar datos
      await loadData();
      setShowModal(false);
      setSelectedTratamiento(null);
      
      alert(data.message || 'Tratamiento guardado correctamente');
      return data.data;
    } catch (err) {
      console.error('❌ Error saving tratamiento:', err);
      setError(err.message || 'Error al guardar el tratamiento');
      alert(err.message || 'Error al guardar el tratamiento');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tratamiento) => {
    console.log('✏️ Editando tratamiento:', tratamiento);
    // Cerrar el modal de detalles si está abierto
    if (showDetailModal) {
      setShowDetailModal(false);
    }
    // Establecer el tratamiento y abrir el modal de edición
    setSelectedTratamiento(tratamiento);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este tratamiento? Esta acción no se puede deshacer.')) return;

    try {
      console.log(`🗑️ Eliminando tratamiento ID: ${id}`);
      
      const res = await fetchWithAuth(`/api/odontologia/tratamientos/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      console.log('📥 Respuesta eliminación:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar el tratamiento');
      }

      await loadData();
      alert('Tratamiento eliminado correctamente');
      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting tratamiento:', err);
      alert(err.message || 'Error al eliminar el tratamiento');
      return { success: false, error: err.message };
    }
  };

  const handleView = (tratamiento) => {
    console.log('👁️ Viendo tratamiento:', tratamiento);
    setSelectedTratamiento(tratamiento);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTratamiento(null);
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTratamiento(null);
  };

  // ============================================================
  // FILTRAR TRATAMIENTOS
  // ============================================================
  const filteredTratamientos = tratamientos.filter(t => {
    const matchSearch = searchTerm === '' || 
      (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchEstado = estadoFilter === '' || 
      (estadoFilter === 'activo' && t.is_active === true) ||
      (estadoFilter === 'inactivo' && t.is_active === false);
    
    return matchSearch && matchEstado;
  });

  console.log('🔍 Tratamientos filtrados:', filteredTratamientos.length, 'de', tratamientos.length);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplateOdontologia
      title="Tratamientos"
      subtitle="Catálogo de tratamientos odontológicos"
      loading={loading}
      icon={<FiActivity size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar tratamiento..."
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
              setSelectedTratamiento(null);
              setShowModal(true);
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nuevo Tratamiento
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

      <TratamientoStats stats={stats} tratamientos={tratamientos} />

      <div className="odonto-filters-row">
        <div className="odonto-filter-group">
          <label>Estado:</label>
          <select 
            className="odonto-filter-select"
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredTratamientos.length} de {tratamientos.length} tratamientos</span>
        </div>
      </div>

      <TratamientoTable 
        tratamientos={filteredTratamientos}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        loading={loading}
      />

      <TratamientoModal 
        isOpen={showModal}
        onClose={closeModal}
        tratamiento={selectedTratamiento}
        onSave={handleSave}
        loading={saving}
      />

      <TratamientoDetailModal 
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        tratamiento={selectedTratamiento}
        onEdit={handleEdit}
      />
    </PageTemplateOdontologia>
  );
}