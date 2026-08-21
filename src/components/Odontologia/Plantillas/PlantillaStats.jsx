// components/Odontologia/Plantillas/PlantillaStats.jsx
import React from 'react';
import { FiCopy, FiCheckCircle, FiClock, FiAlertCircle, FiActivity } from 'react-icons/fi';

export default function PlantillaStats({ stats, plantillas }) {
  const total = plantillas?.length || 0;
  const antibioticos = plantillas?.filter(p => p.tipo === 'antibiotico').length || 0;
  const analgesicos = plantillas?.filter(p => p.tipo === 'analgesico').length || 0;
  const otros = plantillas?.filter(p => !['antibiotico', 'analgesico'].includes(p.tipo)).length || 0;
  const conAdvertencia = plantillas?.filter(p => p.warning).length || 0;

  const statsData = [
    {
      label: 'Total Plantillas',
      value: total,
      icon: <FiCopy size={24} />,
      color: 'blue'
    },
    {
      label: 'Antibióticos',
      value: antibioticos,
      icon: <FiActivity size={24} />,
      color: 'purple'
    },
    {
      label: 'Analgésicos',
      value: analgesicos,
      icon: <FiCheckCircle size={24} />,
      color: 'primary'
    },
    {
      label: 'Otros Tipos',
      value: otros,
      icon: <FiClock size={24} />,
      color: 'orange'
    },
    {
      label: 'Con Advertencia',
      value: conAdvertencia,
      icon: <FiAlertCircle size={24} />,
      color: 'red'
    }
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