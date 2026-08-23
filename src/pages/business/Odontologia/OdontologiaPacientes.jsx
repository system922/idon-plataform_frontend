// componentes/pacientes/PacientesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  FiPlus, 
  FiUsers, 
  FiSearch, 
  FiX, 
  FiRefreshCw 
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';
import PageTemplate from '../../../components/PageTemplate';
import { 
  PacienteStats, 
  PacienteTable, 
  PacienteModal, 
  PacienteDetailModal 
} from '../../../components/Odontologia/Pacientes/index';
import '../../../styles/Odontologia/index.css';

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    nuevos_30dias: 0,
    con_citas: 0
  });

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetchWithAuth('/odontologia/pacientes');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || `Error HTTP ${res.status}`);
      }

      let pacientesData = [];
      
      if (Array.isArray(data)) {
        pacientesData = data;
      } else if (data.success && data.data && Array.isArray(data.data)) {
        pacientesData = data.data;
      } else if (data.data && Array.isArray(data.data)) {
        pacientesData = data.data;
      } else if (data.rows && Array.isArray(data.rows)) {
        pacientesData = data.rows;
      } else if (data.result && Array.isArray(data.result)) {
        pacientesData = data.result;
      } else if (data.pacientes && Array.isArray(data.pacientes)) {
        pacientesData = data.pacientes;
      } else {
        pacientesData = [];
      }
      
      setPacientes(pacientesData);
      
      // Cargar estadísticas
      try {
        const statsRes = await fetchWithAuth('/odontologia/pacientes/stats');
        const statsData = await statsRes.json();
        
        let statsResult = { total: 0, activos: 0, nuevos_30dias: 0, con_citas: 0 };
        
        if (statsData.success && statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else if (statsData.data) {
          statsResult = { ...statsResult, ...statsData.data };
        } else {
          statsResult = { ...statsResult, ...statsData };
        }
        
        // Si las stats vinieron vacías, calcular manualmente
        if (statsResult.total === 0 && pacientesData.length > 0) {
          statsResult.total = pacientesData.length;
          statsResult.activos = pacientesData.filter(p => p.is_active !== false).length;
          statsResult.con_citas = pacientesData.filter(p => (p.total_appointments || 0) > 0).length;
        }
        
        setStats(statsResult);
        
      } catch (statsErr) {
        // Calcular estadísticas manualmente
        const total = pacientesData.length;
        const activos = pacientesData.filter(p => p.is_active !== false).length;
        const conCitas = pacientesData.filter(p => (p.total_appointments || 0) > 0).length;
        setStats({ total, activos, nuevos_30dias: 0, con_citas: conCitas });
      }
      
    } catch (err) {
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
      if (selectedPaciente) {
        url = `/odontologia/pacientes/${selectedPaciente.id}`;
        method = 'PUT';
      } else {
        url = '/api/odontologia/pacientes';
        method = 'POST';
      }

      const res = await fetchWithAuth(url, { method, body: formData });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar el paciente');
      }

      await loadData();
      setShowModal(false);
      setSelectedPaciente(null);
      alert(data.message || 'Paciente guardado correctamente');
      return data.data;
    } catch (err) {
      setError(err.message);
      alert(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (paciente) => {
    if (showDetailModal) setShowDetailModal(false);
    setSelectedPaciente(paciente);
    setShowModal(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este paciente? Esta acción no se puede deshacer.')) return;

    try {
      const res = await fetchWithAuth(`/odontologia/pacientes/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar el paciente');
      }

      await loadData();
      alert('Paciente eliminado correctamente');
      return { success: true };
    } catch (err) {
      alert(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleView = (paciente) => {
    setSelectedPaciente(paciente);
    setShowDetailModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPaciente(null);
    setError(null);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPaciente(null);
  };

  // ============================================================
  // FILTRAR PACIENTES
  // ============================================================
  const filteredPacientes = pacientes.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    
    return searchTerm === '' || 
      fullName.includes(searchLower) ||
      (p.document_number && p.document_number.includes(searchTerm)) ||
      (p.email && p.email.toLowerCase().includes(searchLower)) ||
      (p.phone && p.phone.includes(searchTerm));
  });

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplate
      title="Pacientes"
      subtitle="Gestión de pacientes odontológicos"
      loading={loading}
      icon={<FiUsers size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar por nombre, cédula o email..."
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
              setSelectedPaciente(null);
              setShowModal(true);
              setError(null);
            }}
          >
            <FiPlus size={18} /> Nuevo Paciente
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

      <PacienteStats stats={stats} pacientes={pacientes} />

      <div className="odonto-filters-row">
        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredPacientes.length} de {pacientes.length} pacientes</span>
        </div>
      </div>

      <PacienteTable 
        pacientes={filteredPacientes}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onView={handleView}
        onRefresh={loadData}
        loading={loading}
      />

      <PacienteModal 
        isOpen={showModal}
        onClose={closeModal}
        paciente={selectedPaciente}
        onSave={handleSave}
        loading={saving}
      />

      <PacienteDetailModal 
        isOpen={showDetailModal}
        onClose={closeDetailModal}
        paciente={selectedPaciente}
        onEdit={handleEdit}
      />
    </PageTemplate>
  );
}