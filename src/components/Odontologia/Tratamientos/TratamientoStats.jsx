// components/Odontologia/Tratamientos/TratamientoStats.jsx
import React from 'react';
import { FiActivity, FiCheckCircle, FiXCircle, FiClock, FiDollarSign } from 'react-icons/fi';

export default function TratamientoStats({ stats, tratamientos }) {
  const precioPromedio = tratamientos?.length > 0 
    ? tratamientos.reduce((sum, t) => sum + Number(t.price), 0) / tratamientos.length 
    : 0;
  
  const duracionPromedio = tratamientos?.length > 0
    ? Math.round(tratamientos.reduce((sum, t) => sum + Number(t.duration_minutes), 0) / tratamientos.length)
    : 0;

  const statsData = [
    {
      label: 'Total Tratamientos',
      value: stats?.total || 0,
      icon: <FiActivity size={24} />,
      color: 'primary'
    },
    {
      label: 'Activos',
      value: stats?.activos || 0,
      icon: <FiCheckCircle size={24} />,
      color: 'teal'
    },
    {
      label: 'Inactivos',
      value: stats?.inactivos || 0,
      icon: <FiXCircle size={24} />,
      color: 'red'
    },
    {
      label: 'Duración Promedio',
      value: `${duracionPromedio || 0} min`,
      icon: <FiClock size={24} />,
      color: 'blue'
    },
    {
      label: 'Precio Promedio',
      value: `$${precioPromedio.toFixed(2)}`,
      icon: <FiDollarSign size={24} />,
      color: 'orange'
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