// components/Odontologia/Ortodoncia/OrtodonciaPlanPagos.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiFileText,
} from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';
import CobroModal from '../CobroModal';

const styles = {
  container: { padding: '0' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: '2px solid #e2e8f0',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  headerBadge: {
    fontSize: '12px',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '2px 12px',
    borderRadius: '12px',
    fontWeight: 500,
  },
  buttonSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
  },
  statusPending: { background: '#fef3c7', color: '#92400e' },
  statusPaid: { background: '#d1fae5', color: '#065f46' },
  statusOverdue: { background: '#fee2e2', color: '#991b1b' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
  },
  tableHeader: {
    background: '#f1f5f9',
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 600,
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
  },
  tableCell: {
    padding: '8px 12px',
    borderBottom: '1px solid #e2e8f0',
    color: '#1e293b',
  },
  tableRow: { transition: 'background 0.15s' },
  summaryBox: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  summaryItem: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 16px',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
  },
  summaryLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#94a3b8',
  },
  message: {
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  messageError: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
  },
  messageSuccess: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '40px',
  },
  loadingSpinner: {
    animation: 'spin 1s linear infinite',
    color: '#6366f1',
    fontSize: '32px',
  },
  infoCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  infoLabel: { fontSize: '13px', color: '#64748b' },
  infoValue: { fontSize: '13px', fontWeight: 600, color: '#0f172a' },
};

export default function OrtodonciaPlanPagos({ pacienteId, paciente, onPlanGenerated }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [plan, setPlan] = useState(null);
  const [cuotas, setCuotas] = useState([]);
  const [showCobroModal, setShowCobroModal] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState(null);

  // ============================================================
  // CARGAR DATOS
  // ============================================================
  const loadData = useCallback(async () => {
    if (!pacienteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(`/api/odontologia/plan-pagos/active/${pacienteId}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const planData = data.data;
        setPlan(planData);

        if (planData.id) {
          const cuotasRes = await fetchWithAuth(`/api/odontologia/cuotas-ortodoncia/plan/${planData.id}`);
          const cuotasData = await cuotasRes.json();
          if (cuotasRes.ok && cuotasData.success) {
            setCuotas(cuotasData.data || []);
          } else {
            setCuotas([]);
          }
        }
      } else {
        setPlan(null);
        setCuotas([]);
      }
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // ABRIR MODAL DE COBRO
  // ============================================================
  const abrirCobro = (cuota) => {
    setSelectedCuota(cuota);
    setShowCobroModal(true);
  };

  // ============================================================
  // PROCESAR PAGO
  // ============================================================
  const procesarPago = async (pagoData) => {
    if (!plan?.id || !selectedCuota) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const dataToSend = {
        plan_id: plan.id,
        cuota_id: selectedCuota.id,
        monto: pagoData.total,
        metodo_pago: pagoData.metodo_pago,
        referencia: pagoData.referencia || '',
        notas: pagoData.notas || '',
        invoice_number: pagoData.invoice_number || null,
      };

      const res = await fetchWithAuth(`/api/odontologia/plan-pagos/${plan.id}/pagar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al registrar pago');
      }

      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      return result.data;
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
      setTimeout(() => setError(null), 4000);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FORMATO DE FECHA
  // ============================================================
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================
  const totalPlan = parseFloat(plan?.monto_total || 0);
  const totalPagado = cuotas
    .filter(c => c.estado === 'pagado')
    .reduce((sum, c) => sum + parseFloat(c.monto || 0), 0);
  const saldoPendiente = totalPlan - totalPagado;
  const cuotasPagadas = cuotas.filter(c => c.estado === 'pagado').length;
  const totalCuotas = cuotas.length;

  // ============================================================
  // RENDER
  // ============================================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FiRefreshCw style={styles.loadingSpinner} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={styles.emptyState}>
        <FiFileText size={48} style={{ color: '#94a3b8' }} />
        <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>
          No hay plan de pagos activo
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
          Ve a la pestaña "Plan de Tratamiento" y haz clic en "Generar Plan de Pagos"
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Mensajes */}
      {error && (
        <div style={{ ...styles.message, ...styles.messageError }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ ...styles.message, ...styles.messageSuccess }}>
          <FiCheckCircle size={16} /> Pago registrado correctamente
        </div>
      )}

      {/* HEADER */}
      <div style={styles.header}>
        <div>
          <h4 style={styles.headerTitle}>
            <FiDollarSign size={20} color="#6366f1" />
            Plan de Pagos
            <span style={styles.headerBadge}>
              {plan.estado === 'activo' ? 'Activo' : plan.estado === 'completado' ? 'Completado' : plan.estado}
            </span>
          </h4>
        </div>
        <div>
          <button
            style={styles.buttonSecondary}
            onClick={loadData}
            disabled={loading}
          >
            <FiRefreshCw size={16} /> Actualizar
          </button>
        </div>
      </div>

      {/* Información del Plan */}
      <div style={styles.infoCard}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Plan</span>
          <span style={styles.infoValue}>{plan.nombre || 'Plan de Ortodoncia'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Descripción</span>
          <span style={styles.infoValue}>{plan.descripcion || 'Sin descripción'}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Fecha de Inicio</span>
          <span style={styles.infoValue}>{formatDate(plan.fecha_inicio)}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Total Cuotas</span>
          <span style={styles.infoValue}>{totalCuotas}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Cuotas Pagadas</span>
          <span style={styles.infoValue}>{cuotasPagadas}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>Monto Mensual</span>
          <span style={styles.infoValue}>${parseFloat(plan.monto_mensual || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Resumen */}
      {totalCuotas > 0 && (
        <div style={styles.summaryBox}>
          <div style={styles.summaryItem}>
            <div style={styles.summaryValue}>${totalPlan.toFixed(2)}</div>
            <div style={styles.summaryLabel}>Total Plan</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={{ ...styles.summaryValue, color: '#10b981' }}>
              ${totalPagado.toFixed(2)}
            </div>
            <div style={styles.summaryLabel}>Pagado</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={{ ...styles.summaryValue, color: saldoPendiente > 0 ? '#ef4444' : '#10b981' }}>
              ${saldoPendiente.toFixed(2)}
            </div>
            <div style={styles.summaryLabel}>Saldo Pendiente</div>
          </div>
          <div style={styles.summaryItem}>
            <div style={styles.summaryValue}>
              {cuotasPagadas}/{totalCuotas}
            </div>
            <div style={styles.summaryLabel}>Cuotas Pagadas</div>
          </div>
        </div>
      )}

      {/* Tabla de Cuotas */}
      <div style={{ marginTop: '16px' }}>
        {cuotas.length === 0 ? (
          <div style={styles.emptyState}>
            <FiFileText size={32} />
            <div style={{ marginTop: '8px' }}>No hay cuotas generadas</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Las cuotas se generan automáticamente al crear el plan de pagos
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}># Cuota</th>
                <th style={styles.tableHeader}>Vencimiento</th>
                <th style={styles.tableHeader}>Fecha Pago</th>
                <th style={styles.tableHeader}>Monto</th>
                <th style={styles.tableHeader}>Estado</th>
                <th style={styles.tableHeader}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map((cuota) => {
                const isPaid = cuota.estado === 'pagado';
                const isOverdue = cuota.estado === 'vencido';
                const isPending = cuota.estado === 'pendiente';

                let statusStyle = styles.statusPending;
                let statusLabel = 'Pendiente';
                if (isPaid) {
                  statusStyle = styles.statusPaid;
                  statusLabel = 'Pagado';
                } else if (isOverdue) {
                  statusStyle = styles.statusOverdue;
                  statusLabel = 'Vencido';
                }

                return (
                  <tr key={cuota.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      <strong>#{cuota.numero_cuota || '-'}</strong>
                    </td>
                    <td style={styles.tableCell}>
                      {formatDate(cuota.fecha_vencimiento)}
                    </td>
                    <td style={styles.tableCell}>
                      {isPaid ? formatDate(cuota.fecha_pago) : '-'}
                    </td>
                    <td style={styles.tableCell}>
                      <strong>${parseFloat(cuota.monto || 0).toFixed(2)}</strong>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={{ ...styles.statusBadge, ...statusStyle }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {!isPaid ? (
                        <button
                          style={{ ...styles.buttonPrimary, padding: '4px 14px', fontSize: '12px' }}
                          onClick={() => abrirCobro(cuota)}
                          disabled={saving}
                        >
                          <FiDollarSign size={14} /> Cobrar
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FiCheckCircle size={14} /> Pagado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE COBRO */}
      <CobroModal
        isOpen={showCobroModal}
        onClose={() => {
          setShowCobroModal(false);
          setSelectedCuota(null);
        }}
        presupuesto={selectedCuota ? {
          id: selectedCuota.id,
          name: `Cuota #${selectedCuota.numero_cuota} - ${plan.nombre}`,
          pending: selectedCuota.monto,
          total: selectedCuota.monto,
          items: [{
            service: `Cuota #${selectedCuota.numero_cuota}`,
            quantity: 1,
            price: selectedCuota.monto,
            subtotal: selectedCuota.monto,
            paid: 0,
            pending: selectedCuota.monto,
          }],
        } : null}
        paciente={paciente}
        onProcesarPago={procesarPago}
        currencySymbol="US$"
        bizInfo={null}
      />

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}