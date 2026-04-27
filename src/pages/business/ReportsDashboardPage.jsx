import React, { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { ArrowDownRight, ArrowUpRight, FileText, TrendingUp, DollarSign, User, ShoppingCart } from 'react-feather';

// Si quieres gráfica real, puedes instalar chart.js + react-chartjs-2 y cambiar el <Bar> por ese componente.

export default function ReportsDashboardPage() {
  // Demo data, reemplaza por tu API/estados reales.
  const [summary, setSummary] = useState({
    sales: 230,
    totalIncome: 1780.60,
    expenses: 540.20,
    net: 1240.40,
    customers: 77,
    avgTicket: 34.12,
    topProduct: 'Café Americano'
  });

  // Demo de ventas los últimos 7 días:
  const salesPerDay = [
    { date: 'Lun', value: 14 },
    { date: 'Mar', value: 18 },
    { date: 'Mié', value: 21 },
    { date: 'Jue', value: 24 },
    { date: 'Vie', value: 36 },
    { date: 'Sáb', value: 71 },
    { date: 'Dom', value: 46 }
  ];

  const ventasPrevSemana = 200; // para comparación semanal (dummy)

  const topProducts = [
    { name: 'Café Americano', qty: 62, amount: 148.5 },
    { name: 'Cappuccino', qty: 37, amount: 117.8 },
    { name: 'Pan de Yuca', qty: 45, amount: 67.5 },
    { name: 'Jugo Naranja', qty: 26, amount: 39 },
  ];

  const percentChange = ((summary.sales - ventasPrevSemana) / Math.max(ventasPrevSemana,1) * 100).toFixed(1);

  return (
    <PageTemplate
      title="Dashboard de Reportes"
      subtitle="Indicadores clave del negocio"
      theme="business"
    >
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px,1fr))',
        gap: 18,
        marginBottom: 20
      }}>
        
        {/* Ventas */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <span style={{ color: '#7c3aed', fontWeight: 900, fontSize: 35, display: 'flex', alignItems: 'center', gap:9 }}>
            <ShoppingCart size={27} /> {summary.sales}
          </span>
          <div style={{ margin: '9px 0 0', fontSize: 15, color: '#5f44ee', fontWeight: 700 }}>Ventas realizadas</div>
          <div style={{ marginTop: 8, fontSize: 12, color: percentChange >= 0 ? '#059669' : '#d97706', fontWeight: 700 }}>
            {percentChange >= 0 && <ArrowUpRight size={15}/>}
            {percentChange < 0 && <ArrowDownRight size={15}/>}
            {Math.abs(percentChange)}% que la semana anterior
          </div>
        </div>

        {/* Ingresos */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ color: '#16a34a', fontWeight: 900, fontSize: 33, display: 'flex', alignItems: 'center', gap:8 }}>
            <DollarSign size={25} /> ${summary.totalIncome.toFixed(2)}
          </span>
          <div style={{ margin: '10px 0 0', fontSize: 15, color: '#15803d', fontWeight: 700 }}>Ingresos totales</div>
        </div>
        
        {/* Egresos */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ color: '#ef4444', fontWeight: 900, fontSize: 33, display: 'flex', alignItems: 'center', gap:8 }}>
            <FileText size={24} /> ${summary.expenses.toFixed(2)}
          </span>
          <div style={{ margin: '10px 0 0', fontSize: 15, color: '#be123c', fontWeight: 700 }}>Egresos</div>
        </div>

        {/* Ticket promedio */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ color: '#0ea5e9', fontWeight: 900, fontSize: 33, display: 'flex', alignItems: 'center', gap:8 }}>
            <TrendingUp size={26} /> ${summary.avgTicket.toFixed(2)}
          </span>
          <div style={{ margin: '10px 0 0', fontSize: 15, color: '#0284c7', fontWeight: 700 }}>Ticket Promedio</div>
        </div>

        {/* Clientes */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ color: '#eab308', fontWeight: 900, fontSize: 33, display: 'flex', alignItems: 'center', gap:8 }}>
            <User size={25} /> {summary.customers}
          </span>
          <div style={{ margin: '10px 0 0', fontSize: 15, color: '#ca8a04', fontWeight: 700 }}>Clientes únicos</div>
        </div>
        
        {/* Producto destacado */}
        <div style={{
          background: 'var(--color-card)',
          borderRadius: 10,
          border: '1.5px solid var(--color-border)',
          padding: '19px 20px', display: 'flex', flexDirection: 'column'
        }}>
          <span style={{ color: '#6d28d9', fontWeight: 800, fontSize: 21 }}>{summary.topProduct}</span>
          <div style={{ color: '#7c3aed', fontWeight: 700, fontSize: 15 }}>Producto más vendido</div>
        </div>
      </div>

      {/* Pequeña gráfica demo, reemplaza por react-chartjs-2 si deseas */}
      <div style={{
        background: 'var(--color-card)', borderRadius: 14, border: '1.8px solid var(--color-border)',
        padding: '24px 20px', marginBottom: 24, marginTop: 0, maxWidth: 600
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#6842fe', marginBottom: 10 }}>
          Ventas de la semana
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 90, gap: 19 }}>
          {salesPerDay.map(d => (
            <div key={d.date} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{
                height: (d.value * 1.5) + 10,
                background: 'linear-gradient(135deg,#6842fe 0%,#7c3aed 100%)',
                borderRadius: '9px 9px 0 0',
                margin: '0 auto',
                width: 27,
                transition: 'height 0.3s'
              }}></div>
              <div style={{ fontSize: 13, marginTop: 6, fontWeight: 700 }}>{d.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top productos lista */}
      <div style={{
        background: 'var(--color-card)',
        borderRadius: 10, border: '1.5px solid var(--color-border)',
        padding: '18px 12px'
      }}>
        <div style={{
          fontSize: 16, fontWeight: 700, color: '#6842fe', marginBottom: 7,
        }}>Top productos vendidos</div>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#888' }}>
              <th style={{ textAlign: 'left', padding: 8, fontWeight: 700 }}>Producto</th>
              <th style={{ textAlign: 'right', padding: 8, fontWeight: 700 }}>Cantidad</th>
              <th style={{ textAlign: 'right', padding: 8, fontWeight: 700 }}>Total $</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(tp => (
              <tr key={tp.name}>
                <td style={{ padding: 8 }}>{tp.name}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{tp.qty}</td>
                <td style={{ textAlign: 'right', padding: 8 }}>{tp.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  );
}