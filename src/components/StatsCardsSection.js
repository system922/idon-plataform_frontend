import React from 'react';
import { FiTrendingUp, FiShoppingCart, FiDollarSign, FiBarChart2 } from 'react-icons/fi';

function StatCard({ icon, label, value, detail, iconColor, iconBg, valueColor }) {
  return (
    <div className="stat-card" style={{ borderLeft: `4px solid ${iconColor}` }}>
      <div className="stat-card-icon" style={{ background: iconBg, color: iconColor, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="stat-card-label" style={{ color: 'var(--text-muted)' }}>{label}</div>
        <div className="stat-card-value" style={{ color: valueColor || 'var(--text-primary)' }}>{value}</div>
        <div className="stat-card-detail" style={{ color: 'var(--text-secondary)' }}>{detail}</div>
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

  const salesDetail = sales.tickets > 0
    ? `${sales.tickets} ticket${sales.tickets !== 1 ? 's' : ''}`
    : sales.month > 0
      ? `Últimos 30 días: ${fmt(sales.month)}`
      : 'Sin ventas hoy';

  return (
    <div className="stat-cards-row">
      <StatCard
        icon={<FiTrendingUp size={28} />}
        label="VENTAS HOY"
        value={fmt(sales.total)}
        detail={salesDetail}
        iconColor="var(--primary)"
        iconBg="var(--bg-primary)"
        valueColor="var(--text-primary)"
      />
      <StatCard
        icon={<FiShoppingCart size={28} />}
        label="GASTOS HOY"
        value={fmt(purchases.total)}
        detail="Gastos operativos"
        iconColor="var(--primary)"
        iconBg="var(--bg-primary)"
        valueColor="var(--text-primary)"
      />
      <StatCard
        icon={<FiDollarSign size={28} />}
        label="BALANCE NETO"
        value={fmt(balance)}
        detail="Ganancia neta"
        iconColor="var(--primary)"
        iconBg="var(--bg-primary)"
        valueColor={balance >= 0 ? 'var(--text-primary)' : 'var(--danger)'}
      />
      <StatCard
        icon={<FiBarChart2 size={28} />}
        label="ÓRDENES POR COBRAR"
        value={pending.count}
        detail="Pendientes por cobrar"
        iconColor="var(--primary)"
        iconBg="var(--bg-primary)"
        valueColor="var(--text-primary)"
      />
    </div>
  );
}