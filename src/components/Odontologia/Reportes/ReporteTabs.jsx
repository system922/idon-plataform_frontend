// components/Odontologia/Reportes/ReporteTabs.jsx
import React from 'react';

const TABS = [
  { key: 'consulta', label: 'Cert. Consulta' },
  { key: 'reposo', label: 'Cert. Reposo' },
  { key: 'odontograma', label: 'Odontograma' },
  { key: 'periodontograma', label: 'Periodontograma' },
  { key: 'tratamiento', label: 'Tratamiento' },
  { key: 'plan', label: 'Plan' },
  { key: 'pruebas-termicas', label: '🧾 Pruebas Térmicas' },
];

export default function ReporteTabs({ activeTab, onTabChange }) {
  return (
    <div className="odonto-reporte-tabs-wrapper">
      <div className="odonto-reporte-tabs">
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={`odonto-reporte-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}