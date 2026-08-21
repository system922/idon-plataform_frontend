import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useAlert } from '../../context/ConfirmContext';
import Table from '../../components/General/Table';
import CustomCombobox from '../../components/General/CustomCombobox';
import {
  FiRefreshCw,
  FiAlertCircle, 
} from 'react-icons/fi';
import { adminApi } from '../../config/api';
import '../../styles/Audit.css';

const TYPE_CFG = {
  payment:   { label: 'Pago',       color: '#22c55e' },
  approval:  { label: 'Aprobación', color: '#3b82f6' },
  rejection: { label: 'Rechazo',    color: '#ef4444' },
  request:   { label: 'Solicitud',  color: '#f59e0b' },
};

const STATUS_CFG = {
  success: { label: 'Éxito',    cls: 'admin-badge-success' },
  error:   { label: 'Error',    cls: 'admin-badge-danger'  },
  pending: { label: 'Pendiente',cls: 'admin-badge-warning' },
};

export default function Audit() {
  const alert = useAlert();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [billing, requests] = await Promise.all([
        adminApi.get('/admin/billing-history'),
        adminApi.get('/admin/requests'),
      ]);

      const entries = [];

      (billing.data || []).forEach(b => {
        entries.push({
          id: `bh-${b.id}`,
          date: b.billing_date || b.created_at,
          type: 'payment',
          status: b.status === 'paid' ? 'success' : 'pending',
          actor: 'Admin',
          action: b.status === 'paid' ? 'Pago registrado' : 'Factura pendiente',
          target: b.business_name,
          detail: `${b.billing_period === 'monthly' ? 'Mensual' : 'Anual'} · $${parseFloat(b.amount || 0).toFixed(2)}${b.invoice_number ? ' · ' + b.invoice_number : ''}`,
        });
      });

      (requests.data || []).forEach(r => {
        if (r.status === 'approved' && r.reviewed_at) {
          entries.push({
            id: `req-a-${r.id}`,
            date: r.reviewed_at,
            type: 'approval',
            status: 'success',
            actor: 'Admin',
            action: 'Solicitud aprobada',
            target: r.business_name,
            detail: `Propietario: ${r.owner_email || r.email}`
          });
        } else if (r.status === 'rejected' && r.reviewed_at) {
          entries.push({
            id: `req-r-${r.id}`,
            date: r.reviewed_at,
            type: 'rejection',
            status: 'error',
            actor: 'Admin',
            action: 'Solicitud rechazada',
            target: r.business_name,
            detail: r.rejection_reason || '—'
          });
        } else if (r.status === 'pending') {
          entries.push({
            id: `req-p-${r.id}`,
            date: r.requested_at || r.creado,
            type: 'request',
            status: 'pending',
            actor: r.email || r.owner_email || '—',
            action: 'Nueva solicitud de registro',
            target: r.business_name || r.empresa,
            detail: `Propietario: ${r.propietario || r.owner_email || '—'}`
          });
        }
      });

      entries.sort((a, b) => new Date(b.date) - new Date(a.date));
      setLogs(entries);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (filter !== 'all') {
      result = result.filter(l => l.type === filter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(l =>
        l.action?.toLowerCase().includes(term) ||
        l.target?.toLowerCase().includes(term) ||
        l.actor?.toLowerCase().includes(term) ||
        l.detail?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logs, filter, searchTerm]);

  const filterOptions = [
    { value: 'all', label: `Todas (${logs.length})` },
    ...Object.entries(TYPE_CFG).map(([k, v]) => ({
      value: k,
      label: `${v.label} (${logs.filter(l => l.type === k).length})`
    })),
  ];

  const columns = [
    {
      accessor: 'date',
      label: 'Fecha y hora',
      render: (item) => (
        <span className="audit-date">
          {item.date ? new Date(item.date).toLocaleString('es-EC', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : '—'}
        </span>
      ),
    },
    {
      accessor: 'actor',
      label: 'Actor',
      render: (item) => (
        <span className="audit-actor">{item.actor}</span>
      ),
    },
    {
      accessor: 'action',
      label: 'Acción',
      render: (item) => {
        const tc = TYPE_CFG[item.type] || TYPE_CFG.request;
        return (
          <div className="audit-action">
            <span className="audit-action-dot" style={{ background: tc.color }} />
            <span>{item.action}</span>
          </div>
        );
      },
    },
    {
      accessor: 'target',
      label: 'Objetivo',
      render: (item) => (
        <strong className="audit-target">{item.target}</strong>
      ),
    },
    {
      accessor: 'detail',
      label: 'Detalle',
      render: (item) => (
        <span className="audit-detail" title={item.detail}>
          {item.detail}
        </span>
      ),
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => {
        const sc = STATUS_CFG[item.status] || STATUS_CFG.pending;
        return <span className={`admin-badge ${sc.cls}`}>{sc.label}</span>;
      },
    },
  ];

  const toolbar = (
    <div className="audit-toolbar">
      <CustomCombobox
        options={filterOptions}
        value={filter}
        onChange={setFilter}
        placeholder="Filtrar por tipo"
        filterable={false}
        size="sm"
        className="audit-filter"
      />
    </div>
  );

  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  return (
    <PageTemplate
      title="AUDITORÍA"
      subtitle="Registro cronológico de actividades del sistema"
      theme="admin"
      loading={loading}
      error={error}
      onRetry={load}
      headerAction={refreshButton}
    >
      {error && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      <Table
        data={filteredLogs}
        columns={columns}
        keyField="id"
        title="Registro de Actividades"
        subtitle={`${filteredLogs.length} ${filteredLogs.length === 1 ? 'actividad' : 'actividades'} encontradas`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar por acción, objetivo, actor o detalle..."
        searchFields={['action', 'target', 'actor', 'detail']}
        pagination={true}
        itemsPerPage={15}
        itemsPerPageOptions={[10, 15, 25, 50, 100]}
        loading={loading}
        emptyMessage={
          searchTerm || filter !== 'all'
            ? 'No hay actividades que coincidan con los filtros aplicados'
            : 'No hay actividades registradas'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />
    </PageTemplate>
  );
}