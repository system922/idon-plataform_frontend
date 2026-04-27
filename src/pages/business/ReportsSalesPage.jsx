import React, { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { DollarSign, User, FileText } from 'react-feather';

export default function ReportsSalesPage() {
  // Datos demo (debes conectar a tu API)
  const [sales] = useState([
    {
      id: 1223,
      date: '2024-05-21',
      num: '000023',
      customer: 'Juan Pérez',
      amount: 37.40,
      products: 4,
      status: 'Pagada'
    },
    {
      id: 1222,
      date: '2024-05-20',
      num: '000022',
      customer: 'Cliente mostrador',
      amount: 19.00,
      products: 2,
      status: 'Pagada'
    },
    {
      id: 1221,
      date: '2024-05-20',
      num: '000021',
      customer: 'Sandra López',
      amount: 42.15,
      products: 5,
      status: 'Pagada'
    }
  ]);
  const [search, setSearch] = useState('');

  const filtered = sales.filter(s =>
    s.num.includes(search) ||
    s.customer.toLowerCase().includes(search.toLowerCase())
  );

  const headerAction = (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Buscar cliente o #venta…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          padding: '8px 14px',
          border: '1.2px solid var(--color-border)',
          borderRadius: 6,
          fontSize: 14,
          background: 'var(--color-bg-secondary,#f8fafc)',
          color: 'var(--color-text)'
        }}
      />
    </div>
  );

  return (
    <PageTemplate
      title="Reporte de Ventas"
      subtitle="Listado de ventas realizadas"
      theme="business"
      headerAction={headerAction}
    >
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{background:'#f4f3fd', borderBottom:'2px solid var(--color-border,#eceff1)'}}>
              <th style={{padding:10}}>Fecha</th>
              <th style={{padding:10}}>Nº Venta</th>
              <th style={{padding:10}}>Cliente</th>
              <th style={{padding:10}}>Productos</th>
              <th style={{padding:10}}>Total $</th>
              <th style={{padding:10}}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 &&
              <tr>
                <td colSpan={6} style={{ color: '#888', textAlign: 'center', padding: 24 }}>
                  <FileText size={16} style={{marginBottom:-3,marginRight:6}}/>
                  No hay ventas registradas
                </td>
              </tr>
            }
            {filtered.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 8px' }}>{sale.date}</td>
                <td style={{ padding: '12px 8px', color:'#6842fe', fontWeight:700 }}>{sale.num}</td>
                <td style={{ padding: '12px 8px' }}>
                  <User size={13} style={{marginBottom:-2,marginRight:4}}/>
                  {sale.customer}
                </td>
                <td style={{ padding: '12px 8px', textAlign:'center' }}>{sale.products}</td>
                <td style={{ padding: '12px 8px', fontWeight: 700, color:'#059669' }}>
                  <DollarSign size={13} style={{marginBottom:"-3px",marginRight:3}}/>
                  {sale.amount.toFixed(2)}
                </td>
                <td style={{ padding: '12px 8px', color:'#22c55e', fontWeight:700 }}>{sale.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  );
}