// components/Odontologia/Citas/CitaStats.jsx
import React from 'react';
import { FiCalendar, FiCheck, FiXCircle, FiUsers } from 'react-icons/fi';

export default function CitaStats({ citas }) {
  // Filtrar citas de hoy
  const hoy = new Date().toISOString().split('T')[0];
  const citasHoy = citas?.filter(c => c.fecha?.startsWith(hoy)) || [];

  const total = citasHoy.length;
  const activas = citasHoy.filter(c => c.status === 'confirmed' || c.status === 'scheduled' || c.status === 'in_progress').length;
  const canceladas = citasHoy.filter(c => c.status === 'cancelled' || c.status === 'no_show').length;
  const completadas = citasHoy.filter(c => c.status === 'completed').length;

  const stats = [
    { label: 'Total Hoy', value: total, icon: FiUsers, color: 'blue' },
    { label: 'Activas', value: activas, icon: FiCheck, color: 'green' },
    { label: 'Completadas', value: completadas, icon: FiCalendar, color: 'teal' },
    { label: 'Canceladas', value: canceladas, icon: FiXCircle, color: 'red' },
  ];

  return (
    <div className="odonto-stats-grid">
      {stats.map(({ label, value, icon: Icon, color }, i) => (
        <div key={i} className="odonto-stat-card">
          <div className={`odonto-stat-icon ${color}`}>
            <Icon size={24} />
          </div>
          <div className="odonto-stat-info">
            <div className="odonto-stat-value">{value}</div>
            <div className="odonto-stat-label">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}