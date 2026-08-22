import React, { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Modal from '../../components/General/Modal';
import {
  CheckCircle, AlertCircle, FileText,
  TrendingUp, TrendingDown, DollarSign, X, Eye
} from 'react-feather';
import { FiRefreshCw } from 'react-icons/fi';

// ─── DATOS DE PRUEBA ──────────────────────────────────────────────────────────

// Período contable actual (simulado)
const CURRENT_PERIOD = {
  start: '2026-01-01',
  end: '2026-01-31',
  status: 'abierto' // 'abierto' | 'cerrado'
};

// Resumen del período actual (ingresos, gastos, utilidad)
const CURRENT_SUMMARY = {
  totalIncome: 15200.00,
  totalExpenses: 8700.00,
  totalTaxes: 1200.00,
  netProfit: 5300.00,
  // Desglose opcional
  incomeDetails: [
    { category: 'Ventas', amount: 12500.00 },
    { category: 'Servicios', amount: 2700.00 }
  ],
  expenseDetails: [
    { category: 'Compras', amount: 4500.00 },
    { category: 'Gastos Operativos', amount: 2800.00 },
    { category: 'Gastos Administrativos', amount: 1400.00 }
  ]
};

// Asientos de ajuste y cierre generados (simulados)
const CLOSING_ENTRIES = [
  { id: 1, date: '2026-01-31', account: 'Ingresos por Ventas', debit: 12500.00, credit: 0, description: 'Cierre de ingresos' },
  { id: 2, date: '2026-01-31', account: 'Ingresos por Servicios', debit: 2700.00, credit: 0, description: 'Cierre de ingresos' },
  { id: 3, date: '2026-01-31', account: 'Resumen de Pérdidas y Ganancias', debit: 0, credit: 15200.00, description: 'Transferencia de ingresos' },
  { id: 4, date: '2026-01-31', account: 'Resumen de Pérdidas y Ganancias', debit: 8700.00, credit: 0, description: 'Transferencia de gastos' },
  { id: 5, date: '2026-01-31', account: 'Gastos de Compra', debit: 0, credit: 4500.00, description: 'Cierre de gastos' },
  { id: 6, date: '2026-01-31', account: 'Gastos Operativos', debit: 0, credit: 2800.00, description: 'Cierre de gastos' },
  { id: 7, date: '2026-01-31', account: 'Gastos Administrativos', debit: 0, credit: 1400.00, description: 'Cierre de gastos' },
  { id: 8, date: '2026-01-31', account: 'Impuestos por Pagar', debit: 0, credit: 1200.00, description: 'Provisión de impuestos' },
  { id: 9, date: '2026-01-31', account: 'Resumen de Pérdidas y Ganancias', debit: 0, credit: 5300.00, description: 'Resultado del ejercicio (utilidad)' }
];

// Historial de cierres anteriores (mock)
const CLOSING_HISTORY = [
  { id: 1, period: 'Dic 2025', startDate: '2025-12-01', endDate: '2025-12-31', closedBy: 'Admin', closedAt: '2026-01-05 10:30', status: 'completado', entriesCount: 12 },
  { id: 2, period: 'Nov 2025', startDate: '2025-11-01', endDate: '2025-11-30', closedBy: 'Admin', closedAt: '2025-12-05 09:15', status: 'completado', entriesCount: 10 },
  { id: 3, period: 'Oct 2025', startDate: '2025-10-01', endDate: '2025-10-31', closedBy: 'Usuario1', closedAt: '2025-11-03 14:20', status: 'completado', entriesCount: 11 },
  { id: 4, period: 'Sep 2025', startDate: '2025-09-01', endDate: '2025-09-30', closedBy: 'Admin', closedAt: '2025-10-02 11:00', status: 'completado', entriesCount: 9 }
];

// ─── COMPONENTES INTERNOS ─────────────────────────────────────────────────────

// Modal para mostrar detalles de un cierre (asientos)
function ClosingDetailModal({ isOpen, onClose, closing }) {
  if (!closing) return null;

  // Simulamos asientos para el cierre seleccionado (usamos los mismos de prueba)
  const entries = CLOSING_ENTRIES.map(e => ({ ...e }));

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Cierre - ${closing.period}`}
      size="lg"
      footer={
        <ButtonGroup>
          <IconTextButton variant="danger" size="md" icon={<X size={14} />} onClick={onClose}>
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div style={{ marginBottom: '16px' }}>
        <p><strong>Período:</strong> {closing.startDate} al {closing.endDate}</p>
        <p><strong>Cerrado por:</strong> {closing.closedBy}</p>
        <p><strong>Fecha de cierre:</strong> {closing.closedAt}</p>
        <p><strong>Estado:</strong> <span className="status-badge completed">{closing.status}</span></p>
        <p><strong>Total de asientos:</strong> {closing.entriesCount}</p>
      </div>
      <Table
        data={entries}
        columns={[
          { accessor: 'date', label: 'Fecha', render: (item) => <span>{item.date}</span> },
          { accessor: 'account', label: 'Cuenta' },
          { accessor: 'debit', label: 'Débito', align: 'right', render: (item) => <span>${item.debit.toFixed(2)}</span> },
          { accessor: 'credit', label: 'Crédito', align: 'right', render: (item) => <span>${item.credit.toFixed(2)}</span> },
          { accessor: 'description', label: 'Descripción' }
        ]}
        keyField="id"
        pagination={true}
        itemsPerPage={5}
        itemsPerPageOptions={[5, 10]}
        striped={true}
        hoverable={true}
      />
    </Modal>
  );
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

export default function AccountingClosing() {
  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const [summary, setSummary] = useState(CURRENT_SUMMARY);
  const [history, setHistory] = useState(CLOSING_HISTORY);
  const [entries, setEntries] = useState(CLOSING_ENTRIES);
  const [isClosing, setIsClosing] = useState(false);
  const [closingDone, setClosingDone] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ─── Simular inicio de cierre ──────────────────────────────────────────────
  const handleStartClosing = () => {
    if (period.status === 'cerrado') {
      setError('El período ya está cerrado.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsClosing(true);
    setError('');
    setSuccess('');

    // Simular proceso de cierre (2 segundos)
    setTimeout(() => {
      // Actualizar período a cerrado
      setPeriod({ ...period, status: 'cerrado' });

      // Agregar el cierre actual al historial
      const newClosing = {
        id: Date.now(),
        period: `Ene 2026`, // o usar mes actual
        startDate: period.start,
        endDate: period.end,
        closedBy: 'Admin (simulado)',
        closedAt: new Date().toLocaleString('es-EC'),
        status: 'completado',
        entriesCount: entries.length
      };
      setHistory([newClosing, ...history]);

      // Marcar como cerrado
      setClosingDone(true);
      setSuccess('Cierre contable completado exitosamente.');
      setIsClosing(false);
      setTimeout(() => setSuccess(''), 4000);
    }, 2000);
  };

  // ─── Simular refresco ──────────────────────────────────────────────────────
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setSuccess('Datos actualizados correctamente');
      setTimeout(() => setSuccess(''), 3000);
    }, 800);
  };

  // ─── Ver detalle de un cierre ─────────────────────────────────────────────
  const handleViewDetail = (closing) => {
    setSelectedClosing(closing);
    setModalOpen(true);
  };

  // ─── Columnas para el historial ────────────────────────────────────────────
  const historyColumns = [
    { accessor: 'period', label: 'Período' },
    { accessor: 'startDate', label: 'Inicio', render: (item) => <span>{item.startDate}</span> },
    { accessor: 'endDate', label: 'Fin', render: (item) => <span>{item.endDate}</span> },
    { accessor: 'closedBy', label: 'Cerrado por' },
    { accessor: 'closedAt', label: 'Fecha de cierre' },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => (
        <span className={`status-badge ${item.status}`}>
          {item.status === 'completado' ? 'Completado' : item.status}
        </span>
      )
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <IconTextButton
          variant="info"
          size="sm"
          inline={true}
          icon={<Eye size={12} />}
          onClick={() => handleViewDetail(item)}
        >
          Ver
        </IconTextButton>
      )
    }
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PageTemplate
      title="CIERRE CONTABLE"
      subtitle="Cierre mensual de ejercicios contables"
      theme="business"
      loading={isClosing}
      headerAction={
        <button
          onClick={handleRefresh}
          className="dashboard-refresh-btn-header"
          disabled={refreshing}
          title="Actualizar datos"
        >
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="accounting-closing-container custom-dashboard">
        {error && (
          <div className="alert-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="alert-success">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* ─── Resumen del período actual ──────────────────────────────────── */}
        <div className="closing-summary-card">
          <div className="closing-summary-header">
            <div>
              <h3 style={{ margin: 0 }}>Período Actual</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                {period.start} al {period.end}
              </p>
            </div>
            <span className={`status-badge ${period.status}`}>
              {period.status === 'abierto' ? 'Abierto' : 'Cerrado'}
            </span>
          </div>

          <div className="closing-summary-grid">
            <div className="summary-item">
              <div className="summary-icon" style={{ color: 'var(--success)' }}>
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="summary-label">Ingresos Totales</div>
                <div className="summary-value">${summary.totalIncome.toFixed(2)}</div>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon" style={{ color: 'var(--danger)' }}>
                <TrendingDown size={20} />
              </div>
              <div>
                <div className="summary-label">Gastos Totales</div>
                <div className="summary-value">${summary.totalExpenses.toFixed(2)}</div>
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-icon" style={{ color: 'var(--warning)' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div className="summary-label">Impuestos</div>
                <div className="summary-value">${summary.totalTaxes.toFixed(2)}</div>
              </div>
            </div>
            <div className="summary-item" style={{ borderLeft: `4px solid ${summary.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}` }}>
              <div className="summary-icon" style={{ color: summary.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div className="summary-label">Utilidad Neta</div>
                <div className="summary-value" style={{ color: summary.netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  ${summary.netProfit.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <IconTextButton
              variant="primary"
              size="md"
              icon={<FileText size={16} />}
              onClick={handleStartClosing}
              disabled={period.status === 'cerrado' || isClosing}
              loading={isClosing}
            >
              {period.status === 'cerrado' ? 'Período Cerrado' : 'Iniciar Cierre'}
            </IconTextButton>
            {closingDone && (
              <IconTextButton
                variant="success"
                size="md"
                icon={<CheckCircle size={16} />}
                onClick={() => setModalOpen(true)}
              >
                Ver Asientos Generados
              </IconTextButton>
            )}
          </div>
        </div>

        {/* ─── Historial de cierres ────────────────────────────────────────── */}
        <div className="closing-history-section">
          <Table
            data={history}
            columns={historyColumns}
            keyField="id"
            title="Historial de Cierres"
            subtitle={`${history.length} cierres registrados`}
            pagination={true}
            itemsPerPage={5}
            itemsPerPageOptions={[5, 10, 20]}
            striped={true}
            hoverable={true}
            emptyMessage="No hay cierres registrados"
          />
        </div>

        {/* ─── Modal de detalle de asientos ────────────────────────────────── */}
        <ClosingDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          closing={selectedClosing || { period: 'Actual', startDate: period.start, endDate: period.end, closedBy: 'Sistema', closedAt: new Date().toLocaleString(), status: 'completado', entriesCount: entries.length }}
        />
      </div>
    </PageTemplate>
  );
}