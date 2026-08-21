// pages/business/Odontologia/OdontologiaConfiguracion.jsx
import React, { useState } from 'react';
import { 
  FiSettings, FiUsers, FiClock, FiCalendar, FiList, 
  FiUsers as FiGroup, FiPlus, FiEdit, FiTrash2, FiX, 
  FiSave, FiRefreshCw, FiCheck, FiEye, FiSearch
} from 'react-icons/fi';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { 
  ConfiguracionGeneral,
  EspecialistasConfig,
  HorariosConfig,
  AgendasConfig,
  MotivosConfig,
  GruposConfig
} from '../../../components/Odontologia/Configuracion/index';
import '../../../styles/Odontologia/index.css';

// ============================================================
// TABS DE CONFIGURACIÓN
// ============================================================
const TABS = [
  { key: 'general', label: 'General', icon: <FiSettings size={16} /> },
  { key: 'especialistas', label: 'Especialistas', icon: <FiUsers size={16} /> },
  { key: 'horarios', label: 'Horarios', icon: <FiClock size={16} /> },
  { key: 'agendas', label: 'Agendas', icon: <FiCalendar size={16} /> },
  { key: 'motivos', label: 'Motivos Consulta', icon: <FiList size={16} /> },
  { key: 'grupos', label: 'Grupos', icon: <FiGroup size={16} /> },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function OdontologiaConfiguracion() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return <ConfiguracionGeneral />;
      case 'especialistas': return <EspecialistasConfig />;
      case 'horarios': return <HorariosConfig />;
      case 'agendas': return <AgendasConfig />;
      case 'motivos': return <MotivosConfig />;
      case 'grupos': return <GruposConfig />;
      default: return null;
    }
  };

  return (
    <PageTemplateOdontologia
      title="Configuración de Odontología"
      subtitle="Gestiona la configuración de agenda, especialistas, horarios y más"
      loading={loading}
      icon={<FiSettings size={24} />}
      headerAction={
        <div className="odonto-header-actions">
          {/* Botón Recargar */}
          <button 
            className="odonto-btn-secondary" 
            onClick={() => {
              setLoading(true);
              setTimeout(() => setLoading(false), 500);
            }}
            title="Recargar" 
            disabled={loading}
          >
            <FiRefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
        </div>
      }
    >
      {/* Tabs de configuración */}
      <div className="odonto-config-tabs-wrapper">
        <div className="odonto-config-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`odonto-config-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contenido de la configuración */}
      <div className="odonto-config-content-wrapper">
        {renderContent()}
      </div>
    </PageTemplateOdontologia>
  );
}