import React, { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { Search, Package, BarChart2 } from 'react-feather';

export default function ReportsProductsPage() {
  // Datos demo, reemplaza por los datos de tu API
  const [products, setProducts] = useState([
    { id: 1, name: 'Café Americano', sku: 'CAFE-1', qty: 62, total: 148.5 },
    { id: 2, name: 'Cappuccino', sku: 'CAFE-2', qty: 37, total: 117.8 },
    { id: 3, name: 'Pan de Yuca', sku: 'PAN-1', qty: 45, total: 67.5 },
    { id: 4, name: 'Jugo Naranja', sku: 'JUG-2', qty: 26, total: 39 },
  ]);
  const [search, setSearch] = useState('');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const headerAction = (
    <div style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        placeholder="Buscar producto o SKU…"
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
      title="Reporte de Productos Vendidos"
      subtitle="Cantidad y ventas por producto"
      theme="business"
      headerAction={headerAction}
    >
      <div style={{ overflowX: 'auto', marginTop: 12 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{background:'#f5f3fd', borderBottom:'2px solid var(--color-border,#eceff1)'}}>
              <th style={{padding:10}}>Producto</th>
              <th style={{padding:10}}>SKU</th>
              <th style={{padding:10}}>Cantidad vendida</th>
              <th style={{padding:10}}>Total vendido $</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 &&
              <tr>
                <td colSpan={4} style={{ color: '#888', textAlign: 'center', padding: 24 }}>
                  <BarChart2 size={14} style={{marginBottom:-3,marginRight:6}}/>
                  No hay ventas registradas
                </td>
              </tr>
            }
            {filtered.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 8px', color:'#6842fe', fontWeight:700 }}>
                  <Package size={13} style={{marginBottom:-2,marginRight:4}}/>
                  {p.name}
                </td>
                <td style={{ padding: '12px 8px', color:'#666' }}>{p.sku}</td>
                <td style={{ padding: '12px 8px', fontWeight:700 }}>{p.qty}</td>
                <td style={{ padding: '12px 8px', color:'#1e40af', fontWeight:800 }}>${p.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  );
}