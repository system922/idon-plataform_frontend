// components/Odontologia/Reportes/ReporteStats.jsx
import React from 'react';
import { FiFileText, FiUserCheck, FiActivity, FiBookOpen } from 'react-icons/fi';

export default function ReporteStats({ stats }) {
  const statsData = [
    {
      label: 'Total Pacientes',
      value: stats.total || 0,
      icon: <FiFileText size={24} />,
      color: 'blue'
    },
    {
      label: 'Con Consultas',
      value: stats.conConsulta || 0,
      icon: <FiUserCheck size={24} />,
      color: 'primary'
    },
    {
      label: 'Con Tratamientos',
      value: stats.conTratamiento || 0,
      icon: <FiActivity size={24} />,
      color: 'purple'
    },
    {
      label: 'Con Planes',
      value: stats.conPlan || 0,
      icon: <FiBookOpen size={24} />,
      color: 'orange'
    },
  ];

  return (
    <div className="odonto-stats-grid">
      {statsData.map((s, index) => (
        <div key={index} className="odonto-stat-card">
          <div className={`odonto-stat-icon ${s.color}`}>
            {s.icon}
          </div>
          <div className="odonto-stat-info">
            <div className="odonto-stat-value">{s.value}</div>
            <div className="odonto-stat-label">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}