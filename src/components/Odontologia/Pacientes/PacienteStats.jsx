// componentes/pacientes/PacienteStats.jsx
import React from 'react';
import { FiUsers, FiUserCheck, FiUserPlus, FiCalendar } from 'react-icons/fi';

export const PacienteStats = ({ stats, pacientes }) => {
  const statsData = [
    { 
      label: 'Total pacientes', 
      value: stats.total || pacientes?.length || 0, 
      icon: <FiUsers size={28} />, 
      color: 'orange' 
    },
    { 
      label: 'Activos', 
      value: stats.activos || pacientes?.filter(p => p.is_active !== false).length || 0, 
      icon: <FiUserCheck size={28} />, 
      color: 'purple' 
    },
    { 
      label: 'Nuevos (30 días)', 
      value: stats.nuevos_30dias || 0, 
      icon: <FiUserPlus size={28} />, 
      color: 'primary' 
    },
    { 
      label: 'Con citas', 
      value: stats.con_citas || pacientes?.filter(p => p.total_appointments > 0).length || 0, 
      icon: <FiCalendar size={28} />, 
      color: 'blue' 
    },
  ];

  return (
    <div className="odonto-stats-grid">
      {statsData.map(s => (
        <div key={s.label} className="odonto-stat-card">
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
};