// components/Odontologia/PlantillasPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiCopy, 
  FiSearch, 
  FiX, 
  FiRefreshCw,
  FiAlertCircle
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { 
  PlantillaStats, 
  PlantillaTable, 
  PlantillaModal, 
  PlantillaDetailModal 
} from '../../../components/Odontologia/Plantillas/index';
import '../../../styles/Odontologia/index.css';

// ============================================================
// RUTA BASE - debe coincidir con app.js
// ============================================================
const BASE_URL = '/api/odontologia/plantillas-recetas';

export default function PlantillasPage() {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Datos maestros
  const [tipos, setTipos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);

  // Modales
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [saving, setSaving] = useState(false);

  // ============================================================
  // CARGAR DATOS INICIALES
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔄 [Plantillas] Cargando datos...');
      
      // 1. Cargar plantillas
      console.log(`📡 [Plantillas] GET ${BASE_URL}/`);
      const res = await fetchWithAuth(`${BASE_URL}/`);
      const data = await res.json();
      
      console.log('📦 [Plantillas] Respuesta plantillas:', data);
      
      let plantillasData = [];
      if (!res.ok) {
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }
      
      if (data.success && data.data) {
        plantillasData = Array.isArray(data.data) ? data.data : [];
      } else if (Array.isArray(data)) {
        plantillasData = data;
      }
      
      setPlantillas(plantillasData);
      console.log(`✅ [Plantillas] ${plantillasData.length} plantillas cargadas`);
      
      // 2. Cargar TIPOS
      console.log(`📡 [Plantillas] GET ${BASE_URL}/tipos`);
      try {
        const tiposRes = await fetchWithAuth(`${BASE_URL}/tipos`);
        const tiposData = await tiposRes.json();
        
        if (tiposData.success && tiposData.data) {
          setTipos(tiposData.data);
          console.log(`✅ [Plantillas] ${tiposData.data.length} tipos cargados`);
        } else {
          console.warn('⚠️ [Plantillas] No se pudieron cargar los tipos');
          setTipos([]);
        }
      } catch (tiposErr) {
        console.error('❌ [Plantillas] Error cargando tipos:', tiposErr);
        setTipos([]);
      }
      
      // 3. Cargar CATEGORÍAS
      console.log(`📡 [Plantillas] GET ${BASE_URL}/categorias`);
      try {
        const categoriasRes = await fetchWithAuth(`${BASE_URL}/categorias`);
        const categoriasData = await categoriasRes.json();
        
        if (categoriasData.success && categoriasData.data) {
          setCategorias(categoriasData.data);
          console.log(`✅ [Plantillas] ${categoriasData.data.length} categorías cargadas`);
        } else {
          console.warn('⚠️ [Plantillas] No se pudieron cargar las categorías');
          setCategorias([]);
        }
      } catch (categoriasErr) {
        console.error('❌ [Plantillas] Error cargando categorías:', categoriasErr);
        setCategorias([]);
      }
      
      // 4. Cargar MEDICAMENTOS
      console.log(`📡 [Plantillas] GET ${BASE_URL}/medicamentos`);
      try {
        const medRes = await fetchWithAuth(`${BASE_URL}/medicamentos`);
        const medData = await medRes.json();
        
        if (medData.success && medData.data) {
          setMedicamentos(medData.data);
          console.log(`✅ [Plantillas] ${medData.data.length} medicamentos cargados`);
        } else {
          console.warn('⚠️ [Plantillas] No se pudieron cargar los medicamentos');
          setMedicamentos([]);
        }
      } catch (medErr) {
        console.error('❌ [Plantillas] Error cargando medicamentos:', medErr);
        setMedicamentos([]);
      }
      
    } catch (err) {
      console.error('❌ [Plantillas] Error:', err);
      if (!err.message.includes('404') && !err.message.includes('no encontrado')) {
        setError(err.message || 'Error al cargar los datos');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  const handleSave = async (formData) => {
    setSaving(true);
    setError(null);
    try {
      let url, method;
      if (selectedPlantilla) {
        url = `${BASE_URL}/${selectedPlantilla.id}`;
        method = 'PUT';
        console.log(`✏️ [Plantillas] PUT ${url}`);
      } else {
        url = `${BASE_URL}/`;
        method = 'POST';
        console.log(`📝 [Plantillas] POST ${url}`);
      }

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      console.log('📥 [Plantillas] Respuesta:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar la plantilla');
      }

      await loadData();
      setShowModal(false);
      setSelectedPlantilla(null);
      
      alert(data.message || 'Plantilla guardada correctamente');
      return { success: true, data: data.data };
      
    } catch (err) {
      console.error('❌ [Plantillas] Error guardando:', err);
      setError(err.message);
      alert(err.message);
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta plantilla?')) return;
    
    try {
      console.log(`🗑️ [Plantillas] DELETE ${BASE_URL}/${id}`);
      const res = await fetchWithAuth(`${BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      console.log('📥 [Plantillas] Eliminación:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar la plantilla');
      }

      await loadData();
      alert('Plantilla eliminada correctamente');
      
    } catch (err) {
      console.error('❌ [Plantillas] Error eliminando:', err);
      alert(err.message);
    }
  };

  const handleDuplicate = async (plantilla) => {
    try {
      console.log(`📋 [Plantillas] Duplicando plantilla: ${plantilla.nombre}`);
      
      const { id, ...copyData } = plantilla;
      const newPlantilla = {
        ...copyData,
        nombre: `${plantilla.nombre} (Copia)`
      };

      const res = await fetchWithAuth(`${BASE_URL}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlantilla),
      });

      const data = await res.json();
      console.log('📥 [Plantillas] Duplicación:', data);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al duplicar la plantilla');
      }

      await loadData();
      alert('Plantilla duplicada correctamente');
      
    } catch (err) {
      console.error('❌ [Plantillas] Error duplicando:', err);
      alert(err.message);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleEdit = (plantilla) => {
    console.log('✏️ [Plantillas] Editando:', plantilla.id);
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPlantilla(plantilla);
    setShowModal(true);
    setError(null);
  };

  const handleView = (plantilla) => {
    console.log('👁️ [Plantillas] Viendo:', plantilla.id);
    setSelectedPlantilla(plantilla);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPlantilla(null);
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPlantilla(null);
  };

  // ============================================================
  // FILTRAR PLANTILLAS POR BÚSQUEDA
  // ============================================================
  const filteredPlantillas = plantillas.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    return searchTerm === '' || 
      p.nombre?.toLowerCase().includes(searchLower) ||
      p.descripcion?.toLowerCase().includes(searchLower) ||
      p.medicamentos?.some(m => 
        (m.medicamento_nombre || m.name || '').toLowerCase().includes(searchLower)
      );
  });

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================
  const stats = {
    total: plantillas.length,
    activos: plantillas.filter(p => p.is_active !== false).length,
    inactivos: plantillas.filter(p => p.is_active === false).length
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplateOdontologia
      title="Plantillas de Recetas"
      subtitle="Gestión de plantillas para recetas odontológicas"
      loading={loading}
      icon={<FiCopy size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar por nombre o medicamento..."
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
              setSelectedPlantilla(null);
              setShowModal(true);
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nueva Plantilla
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
        <div className="odonto-alert error" style={{ marginBottom: 16, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>
          <span>❌ {error}</span>
        </div>
      )}

      <PlantillaStats stats={stats} plantillas={plantillas} />

      <div className="odonto-filters-row">
        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredPlantillas.length} de {plantillas.length} plantillas</span>
        </div>
      </div>

      <PlantillaTable 
        plantillas={filteredPlantillas}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onDuplicate={handleDuplicate}
        loading={loading}
      />

      <PlantillaModal 
        isOpen={showModal}
        onClose={closeModal}
        plantilla={selectedPlantilla}
        onSave={handleSave}
        loading={saving}
        tipos={tipos}
        categorias={categorias}
        medicamentos={medicamentos}
      />

      <PlantillaDetailModal 
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        plantilla={selectedPlantilla}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
      />
    </PageTemplateOdontologia>
  );
}