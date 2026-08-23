import React, { useState, useEffect } from 'react';
import { 
  FiFileText, FiSearch, FiX, FiRefreshCw,
  FiClock, FiActivity, FiClipboard,
  FiFile, FiBookOpen, FiPrinter as FiPrinterIcon
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/api';
import PageTemplate from '../../../components/PageTemplate';
import { 
  ReporteStats, 
  ReporteConsulta,
  ReporteReposo,
  ReporteOdontograma,
  ReportePeriodontograma,
  ReporteTratamiento,
  ReportePlan,
  PruebasImpresionTermica  
} from '../../../components/Odontologia/Reportes/index';
import '../../../styles/Odontologia/index.css';

// Tabs de reportes - AGREGAR LA PESTAÑA DE PRUEBAS
const TABS = [
  { key: 'consulta', label: 'Cert. Consulta', icon: <FiFileText size={16} /> },
  { key: 'reposo', label: 'Cert. Reposo', icon: <FiClock size={16} /> },
  { key: 'odontograma', label: 'Odontograma', icon: <FiActivity size={16} /> },
  { key: 'periodontograma', label: 'Periodontograma', icon: <FiClipboard size={16} /> },
  { key: 'tratamiento', label: 'Tratamiento', icon: <FiFile size={16} /> },
  { key: 'plan', label: 'Plan', icon: <FiBookOpen size={16} /> },
  { key: 'pruebas-termicas', label: '🧾 Pruebas Térmicas', icon: <FiPrinterIcon size={16} /> }, // ← NUEVA PESTAÑA
];

export default function OdontologiaReportes() {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('consulta');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

  // Estadísticas
  const stats = {
    total: pacientes?.length || 0,
    conConsulta: pacientes?.filter(p => (p.total_appointments || 0) > 0).length || 0,
    conTratamiento: pacientes?.filter(p => (p.total_treatments || 0) > 0).length || 0,
    conPlan: pacientes?.filter(p => p.has_plan).length || 0,
  };

  // ============================================================
  // CARGAR DATOS DESDE API
  // ============================================================
  const loadData = async () => {
    console.log('🔄 [Reportes] Iniciando carga de datos...');
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    try {
      console.log('📡 [Reportes] Haciendo fetch a /odontologia/pacientes');
      
      const res = await fetchWithAuth('/odontologia/pacientes');
      console.log(`📡 [Reportes] Response status: ${res.status} ${res.statusText}`);
      
      const responseText = await res.text();
      console.log('📄 [Reportes] Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📦 [Reportes] Data parseada correctamente:', data);
      } catch (parseError) {
        console.error('❌ [Reportes] Error al parsear JSON:', parseError);
        setError('Error al parsear la respuesta del servidor');
        setDebugInfo({ rawResponse: responseText, parseError: parseError.message });
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        console.error(`❌ [Reportes] Error HTTP: ${res.status}`, data);
        setError(data.error || data.message || `Error HTTP ${res.status}`);
        setDebugInfo({ status: res.status, data });
        setLoading(false);
        return;
      }

      console.log('📦 [Reportes] Procesando datos...');
      
      let pacientesData = [];
      
      if (Array.isArray(data)) {
        console.log('✅ [Reportes] Formato: Array directo');
        pacientesData = data;
      } else if (data.success && data.data) {
        console.log('✅ [Reportes] Formato: { success, data }');
        pacientesData = Array.isArray(data.data) ? data.data : [];
      } else if (data.data && Array.isArray(data.data)) {
        console.log('✅ [Reportes] Formato: { data }');
        pacientesData = data.data;
      } else if (data.rows && Array.isArray(data.rows)) {
        console.log('✅ [Reportes] Formato: { rows }');
        pacientesData = data.rows;
      } else if (data.result && Array.isArray(data.result)) {
        console.log('✅ [Reportes] Formato: { result }');
        pacientesData = data.result;
      } else {
        console.warn('⚠️ [Reportes] Formato de datos no reconocido:', data);
        pacientesData = [];
        setDebugInfo({
          message: 'Formato de datos no reconocido',
          data: data
        });
      }
      
      console.log('📋 [Reportes] Pacientes procesados:', pacientesData);
      console.log('📊 [Reportes] Cantidad de pacientes:', pacientesData.length);
      
      if (pacientesData.length > 0) {
        console.log('🔍 [Reportes] Primer paciente:', pacientesData[0]);
      }
      
      setPacientes(pacientesData);
      setDebugInfo({
        totalPacientes: pacientesData.length,
        firstPaciente: pacientesData.length > 0 ? pacientesData[0] : null,
        format: Array.isArray(data) ? 'array' : 
                data.success && data.data ? 'success-data' :
                data.data ? 'data' :
                data.rows ? 'rows' :
                data.result ? 'result' : 'unknown'
      });
      
      console.log('✅ [Reportes] Pacientes guardados en estado');
      
    } catch (err) {
      console.error('❌ [Reportes] Error loading pacientes:', err);
      setError('Error al cargar los datos: ' + err.message);
      setDebugInfo({ 
        error: err.message, 
        stack: err.stack,
        type: err.name 
      });
    } finally {
      setLoading(false);
      console.log('🏁 [Reportes] Carga de datos finalizada');
    }
  };

  useEffect(() => {
    console.log('🔁 [Reportes] useEffect ejecutado - cargando datos iniciales');
    loadData();
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleSelectPaciente = (paciente) => {
    console.log('👤 [Reportes] Seleccionando paciente:', paciente);
    setSelectedPaciente(paciente);
  };

  const handleClearPaciente = () => {
    console.log('🧹 [Reportes] Limpiando paciente seleccionado');
    setSelectedPaciente(null);
  };

  const handlePrint = () => {
    console.log('🖨️ [Reportes] Imprimiendo...');
    window.print();
  };

  // ============================================================
  // FILTRAR PACIENTES
  // ============================================================
  const filteredPacientes = pacientes?.filter(p => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    
    const match = searchTerm === '' || 
      fullName.includes(searchLower) ||
      (p.document_number && p.document_number.includes(searchTerm));
    
    return match;
  }) || [];

  console.log('🔍 [Reportes] Pacientes filtrados:', filteredPacientes.length, 'de', pacientes.length);

  // ============================================================
  // RENDER CONTENIDO SEGÚN TAB ACTIVA
  // ============================================================
  const renderContent = () => {
    console.log(`📄 [Reportes] Renderizando tab: ${activeTab}`);
    
    const commonProps = {
      pacientes: filteredPacientes,
      onSelectPaciente: handleSelectPaciente,
      selectedPaciente: selectedPaciente,
      onPrint: handlePrint,
      onClearPaciente: handleClearPaciente,
    };

    switch (activeTab) {
      case 'consulta':
        return <ReporteConsulta {...commonProps} />;
      case 'reposo':
        return <ReporteReposo {...commonProps} />;
      case 'odontograma':
        return <ReporteOdontograma {...commonProps} />;
      case 'periodontograma':
        return <ReportePeriodontograma {...commonProps} />;
      case 'tratamiento':
        return <ReporteTratamiento {...commonProps} />;
      case 'plan':
        return <ReportePlan {...commonProps} />;
      case 'pruebas-termicas': // ← NUEVO CASE
        return (
          <PruebasImpresionTermica
            pacientes={filteredPacientes}
            selectedPaciente={selectedPaciente}
            onSelectPaciente={handleSelectPaciente}
            onClearPaciente={handleClearPaciente}
          />
        );
      default:
        return null;
    }
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <PageTemplate
      title="Reportes Odontológicos"
      subtitle="Generación de certificados y reportes odontológicos"
      loading={loading}
      icon={<FiFileText size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          <div className="odonto-search-wrapper">
            <FiSearch className="odonto-search-icon" />
            <input
              type="text"
              className="odonto-search-input"
              placeholder="Buscar paciente por nombre o cédula..."
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
          {debugInfo && (
            <details style={{ marginTop: 8, fontSize: 12 }}>
              <summary>Ver detalles técnicos</summary>
              <pre style={{ 
                background: '#f5f5f5', 
                padding: 8, 
                borderRadius: 4,
                overflow: 'auto',
                maxHeight: 200,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {/* DEBUG: Mostrar información de depuración */}
      {debugInfo && !error && (
        <div className="odonto-alert info" style={{ marginBottom: 16 }}>
          <span>ℹ️ Debug: {debugInfo.totalPacientes} pacientes cargados</span>
          <details style={{ marginTop: 8, fontSize: 12 }}>
            <summary>Ver detalles</summary>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: 8, 
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 200,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      )}

      <ReporteStats stats={stats} />

      <div className="odonto-filters-row">
        <div className="odonto-filter-stats">
          <span>Mostrando: {filteredPacientes.length} de {pacientes.length} pacientes</span>
          {selectedPaciente && (
            <span className="odonto-filter-selected">
              👤 {selectedPaciente.first_name} {selectedPaciente.last_name}
              <button 
                className="odonto-filter-clear"
                onClick={handleClearPaciente}
              >
                <FiX size={14} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="odonto-config-tabs-wrapper">
        <div className="odonto-config-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`odonto-config-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => {
                console.log(`📌 [Reportes] Cambiando tab a: ${tab.key}`);
                setActiveTab(tab.key);
                setSelectedPaciente(null);
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="odonto-config-content-wrapper">
        {renderContent()}
      </div>
    </PageTemplate>
  );
}