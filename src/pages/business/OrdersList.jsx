import React, { useEffect, useState, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiSearch, FiEye } from 'react-icons/fi';
import apiService from '../../services/apiService';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'ALL',
    dateFrom: '',
    dateTo: ''
  });

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.get('/api/orders');
      setOrders(Array.isArray(response) ? response : response.data || []);
    } catch (err) {
      console.error('Error cargando órdenes:', err);
      setError('No se pudo cargar las órdenes. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id?.toString().includes(searchTerm) ||
      order.customer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filters.status === 'ALL' || order.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id) => {
    if (loading) return; // ✅ Prevención de doble envío
    if (!window.confirm('¿Estás seguro de eliminar esta orden?')) return;
    try {
      setLoading(true);
      await apiService.delete(`/api/orders/${id}`);
      await loadOrders();
    } catch (err) {
      setError('Error al eliminar orden: ' + err.message);
    }
  };

  const statusColors = {
    pending: '#FFA500',
    completed: '#4CAF50',
    cancelled: '#F44336',
    preparing: '#2196F3'
  };

  return (
    <PageTemplate
      title="Órdenes/Comandas"
      subtitle="Gestión de órdenes y comandas del negocio"
      loading={loading}
      error={error}
      onRefresh={loadOrders}
    >
      {/* Barra de búsqueda y filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Buscar por ID u cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              fontSize: '12px'
            }}
          />
        </div>
        
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value="ALL">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="preparing">En preparación</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>

        <button
          onClick={loadOrders}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#ff8c42',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          <FiRefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Tabla de órdenes */}
      {filteredOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#9ca3af',
          backgroundColor: '#f9fafb',
          borderRadius: '8px'
        }}>
          <p>No hay órdenes para mostrar</p>
        </div>
      ) : (
        <div style={{
          overflowX: 'auto',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          backgroundColor: '#ffffff'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}>
            <thead style={{
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>ID Orden</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Cliente</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Total</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Estado</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Fecha</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: '1px solid #e5e7eb',
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}
                >
                  <td style={{ padding: '12px', fontWeight: '500' }}>#{order.id}</td>
                  <td style={{ padding: '12px' }}>{order.customer || 'Sin cliente'}</td>
                  <td style={{ padding: '12px', fontWeight: '600' }}>${order.total?.toFixed(2) || '0.00'}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: statusColors[order.status] + '20',
                      color: statusColors[order.status],
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {order.status || 'Sin estado'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: '#6b7280', fontSize: '12px' }}>
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#2196F3',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Ver detalles"
                      >
                        <FiEye size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(order.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#F44336',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Eliminar"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTemplate>
  );
}
