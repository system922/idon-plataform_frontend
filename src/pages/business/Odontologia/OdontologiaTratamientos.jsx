// components/Odontologia/Tratamientos/TratamientosPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FiPlus, FiActivity, FiSearch, FiX, FiRefreshCw
} from 'react-icons/fi';
import { useSession } from '../../../context/SessionContext';
import { fetchWithAuth } from '../../../config/api';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAlert } from '../../../components/ConfirmContext';
import PageTemplate from '../../../components/PageTemplate';
import { 
  TratamientoStats, 
  TratamientoTable, 
  TratamientoModal, 
  TratamientoDetailModal 
} from '../../../components/Odontologia/Tratamientos/index';
import '../../../styles/Odontologia/index.css';

export default function TratamientosPage() {
  const { user } = useSession();
  const alert = useAlert();
  const confirm = useConfirm();
  const isMounted = useRef(true);

  const [tratamientos, setTratamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState('');

  const loadData = useCallback(async () => {
    if (!isMounted.current) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth('/odontologia/tratamientos');
      const data = await response.json();
      
      if (!isMounted.current) return;
      
      let tratamientosData = [];
      
      if (Array.isArray(data)) {
        tratamientosData = data;
      } else if (data.tratamientos && Array.isArray(data.tratamientos)) {
        tratamientosData = data.tratamientos;
      } else if (data.data && Array.isArray(data.data)) {
        tratamientosData = data.data;
      } else if (data.rows && Array.isArray(data.rows)) {
        tratamientosData = data.rows;
      } else if (data.success && data.data) {
        tratamientosData = Array.isArray(data.data) ? data.data : [];
      }
      
      setTratamientos(tratamientosData);
      
      const total = tratamientosData.length;
      const activos = tratamientosData.filter(t => t.is_active === true).length;
      const inactivos = tratamientosData.filter(t => t.is_active === false).length;
      
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
      
    } catch (err) {
      setError('Error al cargar los datos: ' + err.message);
      if (isMounted.current) {
        await alert.error('Error al cargar los datos: ' + err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []); // <- Array vacío para evitar bucles

  useEffect(() => {
    isMounted.current = true;
    loadData();
    return () => {
      isMounted.current = false;
    };
  }, []); // <- Array vacío para ejecutar solo UNA VEZ

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    setModalError('');
    try {
      let url, method;
      if (selectedTratamiento) {
        url = `/api/odontologia/tratamientos/${selectedTratamiento.id}`;
        method = 'PUT';
      } else {
        url = '/odontologia/tratamientos';
        method = 'POST';
      }

      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error(data.error || 'El tratamiento ya existe');
        }
        throw new Error(data.error || 'Error al guardar el tratamiento');
      }

      await loadData();
      setShowModal(false);
      setSelectedTratamiento(null);
      setModalError('');
      
      await alert.success(
        data.message || 'Tratamiento guardado correctamente',
        'Guardado exitoso'
      );
      
      return data.data;
      
    } catch (err) {
      setModalError(err.message || 'Error al guardar el tratamiento');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tratamiento) => {
    if (showDetailModal) {
      setShowDetailModal(false);
    }
    setSelectedTratamiento(tratamiento);
    setShowModal(true);
    setModalError('');
    setError(null);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm.showConfirm({
      title: 'Confirmar eliminación',
      message: '¿Está seguro de eliminar este tratamiento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      danger: true,
    });

    if (!confirmed) return;

    try {
      const response = await fetchWithAuth(`/odontologia/tratamientos/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el tratamiento');
      }

      await loadData();
      await alert.success(
        'Tratamiento eliminado correctamente',
        'Eliminación exitosa'
      );
      
      return { success: true };
      
    } catch (err) {
      await alert.error(err.message || 'Error al eliminar el tratamiento');
      return { success: false, error: err.message };
    }
  };

  const handleView = (tratamiento) => {
    setSelectedTratamiento(tratamiento);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTratamiento(null);
    setModalError('');
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedTratamiento(null);
  };

  const filteredTratamientos = tratamientos.filter(t => {
    const matchSearch = searchTerm === '' || 
      (t.name && t.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchEstado = estadoFilter === '' || 
      (estadoFilter === 'activo' && t.is_active === true) ||
      (estadoFilter === 'inactivo' && t.is_active === false);
    
    return matchSearch && matchEstado;
  });

  return (
    <PageTemplate
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
              setModalError('');
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nuevo Tratamiento
          </button>
          
          <button 
            className="odonto-btn-secondary" 
            onClick={handleRefresh} 
            title="Recargar" 
            disabled={loading || refreshing}
          >
            <FiRefreshCw size={18} className={refreshing ? 'spin' : ''} />
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
        error={modalError}
      />

      <TratamientoDetailModal 
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        tratamiento={selectedTratamiento}
        onEdit={handleEdit}
      />
    </PageTemplate>
  );
}