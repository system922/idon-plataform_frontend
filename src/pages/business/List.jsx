import React, { useState, useEffect } from 'react';

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Conectar con API para obtener pedidos
    setLoading(false);
  }, [filter]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'pendientes') return order.status === 'pending';
    if (filter === 'preparando') return order.status === 'preparing';
    if (filter === 'completadas') return order.status === 'completed';
    return true;
  });

  return (
    <div className="orders-list-page">
      <h1>Gestión de Pedidos</h1>

      <div className="orders-filters">
        <button
          onClick={() => setFilter('todos')}
          className={filter === 'todos' ? 'active' : ''}
        >
          Todos ({orders.length})
        </button>
        <button
          onClick={() => setFilter('pendientes')}
          className={filter === 'pendientes' ? 'active' : ''}
        >
          Pendientes
        </button>
        <button
          onClick={() => setFilter('preparando')}
          className={filter === 'preparando' ? 'active' : ''}
        >
          Preparando
        </button>
        <button
          onClick={() => setFilter('completadas')}
          className={filter === 'completadas' ? 'active' : ''}
        >
          Completadas
        </button>
      </div>

      {loading ? (
        <p>Cargando pedidos...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No hay pedidos</p>
      ) : (
        <div className="orders-table">
          <table>
            <thead>
              <tr>
                <th>Orden ID</th>
                <th>Mesa/Cliente</th>
                <th>Productos</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.table || order.customer}</td>
                  <td>{order.items?.length || 0} productos</td>
                  <td>${order.total?.toFixed(2)}</td>
                  <td>
                    <span className={`badge badge-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-sm">Ver</button>
                    <button className="btn-sm">Editar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OrdersList;
