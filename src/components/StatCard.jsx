import React from 'react';

export default function StatCard({
  icon,
  title,
  value,
  subtitle,
  color = '#8CB79B',
  onClick
}) {
  return (
    <div className="stat-card" onClick={onClick}>
      <div className="stat-card-top">
        <div className="stat-card-icon">
          {icon}
        </div>
      </div>
      <div className="stat-card-content">
        <div className="stat-card-title">{title}</div>
        <div className="stat-card-value">{value}</div>
        <div className="stat-card-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}
