// components/Odontologia/Periodontograma/PerioStats.jsx
import React from 'react';

export default function PerioStats({ stats }) {
  return (
    <div className="perio-stats" style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '8px',
      padding: '2px 20px',
      background: '#f8fafc',
      borderBottom: '1px solid #e2e8f0'
    }}>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Dientes presentes</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.totalPresentes} / 32</span>
      </div>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Dientes ausentes</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.totalAusentes}</span>
      </div>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Profundidad media</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.avgProfundidad} mm</span>
      </div>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Nivel medio inserción</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.avgInsercion} mm</span>
      </div>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>BOP</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.bop}%</span>
      </div>
      <div className="perio-stat-item" style={{ textAlign: 'center' }}>
        <span className="perio-stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>PI</span>
        <span className="perio-stat-value" style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>{stats.pi}%</span>
      </div>
    </div>
  );
}