// components/Odontologia/Planes/PlanStats.jsx
import React from 'react';
import { FiFileText, FiCheckCircle, FiClock, FiXCircle, FiDollarSign, FiLayers } from 'react-icons/fi';

export default function PlanStats({ stats, planes }) {
  const total = planes?.length || 0;
  const activos = planes?.filter(p => p.status === 'active').length || 0;
  const completados = planes?.filter(p => p.status === 'completed').length || 0;
  const borradores = planes?.filter(p => p.status === 'draft').length || 0;
  const cancelados = planes?.filter(p => p.status === 'cancelled').length || 0;
  
  // Costo promedio de los planes
  const costoPromedio = planes?.length > 0 
    ? (planes.reduce((sum, p) => sum + Number(p.total_cost || 0), 0) / planes.length)
    : 0;

  const statsData = [
    {
      label: 'Total Planes',
      value: total,
      icon: <FiFileText size={24} />,
      color: 'blue'
    },
    {
      label: 'Activos',
      value: activos,
      icon: <FiCheckCircle size={24} />,
      color: 'primary'
    },
    {
      label: 'Completados',
      value: completados,
      icon: <FiClock size={24} />,
      color: 'purple'
    },
    {
      label: 'Borradores',
      value: borradores,
      icon: <FiFileText size={24} />,
      color: 'orange'
    },
    {
      label: 'Cancelados',
      value: cancelados,
      icon: <FiXCircle size={24} />,
      color: 'red'
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