// src/admin/pages/commercial/PendingPayments.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  FiDollarSign, FiClock, FiAlertCircle, FiCheckCircle,
  FiSearch, FiRefreshCw, FiSend, FiEye, FiFilter,
  FiCalendar, FiUser, FiPackage
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function PendingPayments() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/payments/pending');
      setPayments(res.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar pagos pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    setRefreshing(false);
  };

  const handleSendReminder = async (id) => {
    try {
      await adminApi.post(`/admin/payments/${id}/reminder`);
      fetchPayments();
    } catch (err) {
      setError(err.message || 'Error al enviar recordatorio');
    }
  };

  const handleMarkPaid = async (id) => {
    if (window.confirm('¿Marcar este pago como pagado?')) {
      try {
        await adminApi.put(`/admin/payments/${id}/mark-paid`);
        fetchPayments();
      } catch (err) {
        setError(err.message || 'Error al marcar como pagado');
      }
    }
  };

  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [payments, filterStatus, searchTerm]);

  const summaryStats = useMemo(() => {
    const total = payments.length;
    const overdue = payments.filter(p => p.status === 'overdue').length;
    const dueSoon = payments.filter(p => p.status === 'due_soon').length;
    const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    return { total, overdue, dueSoon, totalAmount };
  }, [payments]);

  const getStatusBadge = (status) => {
    const badges = {
      overdue: { color: '#ef4444', label: 'Vencido' },
      due_soon: { color: '#f59e0b', label: 'Por vencer' },
      pending: { color: '#3b82f6', label: 'Pendiente' },
      suspended: { color: '#8b5cf6', label: 'Suspendido' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`payment-status-badge ${status}`} style={{ background: `${badge.color}20`, color: badge.color }}>
        {badge.label}
      </span>
    );
  };

  const getDaysBadge = (days) => {
    if (days <= 0) {
      return <span className="days-badge critical">{Math.abs(days)} días vencido</span>;
    } else if (days <= 3) {
      return <span className="days-badge warning">{days} días restantes</span>;
    } else {
      return <span className="days-badge info">{days} días restantes</span>;
    }
  };

  if (loading) {
    return (
      <PageTemplate title="PAGOS PENDIENTES" subtitle="Gestión de cobranza y pagos vencidos" loading={true}>
        <div className="admin-loading">Cargando pagos pendientes...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="PAGOS PENDIENTES"
      subtitle="Gestión de cobranza y pagos vencidos"
      theme="admin"
      headerAction={
        <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="pending-payments-container">
        {/* Resumen */}
        <div className="pending-payments-summary">
          <div className="pending-summary-card">
            <div className="pending-summary-icon overdue">
              <FiAlertCircle size={24} />
            </div>
            <div className="pending-summary-info">
              <div className="pending-summary-value">{summaryStats.overdue}</div>
              <div className="pending-summary-label">Vencidos</div>
            </div>
          </div>
          <div className="pending-summary-card">
            <div className="pending-summary-icon due-soon">
              <FiClock size={24} />
            </div>
            <div className="pending-summary-info">
              <div className="pending-summary-value">{summaryStats.dueSoon}</div>
              <div className="pending-summary-label">Por vencer</div>
            </div>
          </div>
          <div className="pending-summary-card">
            <div className="pending-summary-icon total">
              <FiDollarSign size={24} />
            </div>
            <div className="pending-summary-info">
              <div className="pending-summary-value">${summaryStats.totalAmount.toFixed(2)}</div>
              <div className="pending-summary-label">Monto total</div>
            </div>
          </div>
          <div className="pending-summary-card">
            <div className="pending-summary-icon amount">
              <FiCheckCircle size={24} />
            </div>
            <div className="pending-summary-info">
              <div className="pending-summary-value">{summaryStats.total}</div>
              <div className="pending-summary-label">Total pendientes</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="pending-payments-filters">
          <div className="filter-search">
            <input
              type="text"
              placeholder="Buscar cliente o negocio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos los estados</option>
            <option value="overdue">Vencidos</option>
            <option value="due_soon">Por vencer</option>
            <option value="pending">Pendientes</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>

        {/* Tabla */}
        {filteredPayments.length === 0 ? (
          <div className="pending-empty-state">
            <FiCheckCircle size={48} color="#444" />
            <p>No hay pagos pendientes</p>
          </div>
        ) : (
          <div className="pending-payments-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Cliente / Negocio</th>
                  <th>Monto</th>
                  <th>Fecha vencimiento</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div>
                        <div className="log-user-name">{payment.client_name}</div>
                        <div className="log-user-email">{payment.business_name}</div>
                      </div>
                    </td>
                    <td><strong>${parseFloat(payment.amount).toFixed(2)}</strong></td>
                    <td>{new Date(payment.due_date).toLocaleDateString()}</td>
                    <td>{getDaysBadge(payment.days_remaining)}</td>
                    <td>{getStatusBadge(payment.status)}</td>
                    <td>
                      <div className="admin-actions-cell">
                        <button 
                          className="payment-action-btn send-reminder"
                          onClick={() => handleSendReminder(payment.id)}
                          title="Enviar recordatorio"
                        >
                          <FiSend size={14} /> Recordatorio
                        </button>
                        <button 
                          className="payment-action-btn mark-paid"
                          onClick={() => handleMarkPaid(payment.id)}
                          title="Marcar como pagado"
                        >
                          <FiCheckCircle size={14} /> Pagado
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}