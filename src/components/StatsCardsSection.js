import React from 'react';
import { FiTrendingUp, FiShoppingCart, FiDollarSign, FiBarChart2 } from 'react-icons/fi';

function StatCard({ icon, label, value, detail, color, bg }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="stat-card-icon" style={{ background: bg, color }}>{icon}</div>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value" style={{ color }}>{value}</div>
        <div className="stat-card-detail">{detail}</div>
      </div>
    </div>
  );
}

const fmt = n =>
  typeof n !== 'number'
    ? '$0,00'
    : n.toLocaleString('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export default function StatsCardsSection({ stats }) {
  const { sales, purchases, balance, pending } = stats;

  return (
    <div className="stat-cards-row">
      <StatCard
        icon={<FiTrendingUp size={28} />}
        label="VENTAS HOY"
        value={fmt(sales.total)}
        detail={`${sales.tickets} tickets`}
        color="#10b981"
        bg="rgba(16,185,129,0.16)"
      />
      <StatCard
        icon={<FiShoppingCart size={28} />}
        label="GASTOS HOY"
        value={fmt(purchases.total)}
        detail="Gastos operativos"
        color="#3b82f6"
        bg="rgba(59,130,246,0.18)"
      />
      <StatCard
        icon={<FiDollarSign size={28} />}
        label="BALANCE NETO"
        value={fmt(balance)}
        detail="Ganancia neta"
        color={balance >= 0 ? '#10b981' : '#ef4444'}
        bg={balance >= 0 ? 'rgba(16,185,129,.13)' : 'rgba(239,68,68,.2)'}
      />
      <StatCard
        icon={<FiBarChart2 size={28} />}
        label="ÓRDENES POR COBRAR"
        value={pending.count}
        detail="Pendientes por cobrar"
        color="#a855f7"
        bg="rgba(168,85,247,0.17)"
      />
    </div>
  );
}