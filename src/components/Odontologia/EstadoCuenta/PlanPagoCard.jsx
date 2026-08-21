// components/Odontologia/EstadoCuenta/components/PlanPagoCard.jsx

import React from 'react';
import { FiCreditCard, FiCalendar, FiChevronDown, FiChevronUp, FiDollarSign, FiCheck } from 'react-icons/fi';
import { fmt, getCuotaEstado, getStatusMap, formatDate } from '../../../utils/helpers';

const PlanPagoCard = ({ 
  plan, 
  cuotas, 
  expandedPlanes, 
  onToggleExpand, 
  onAbrirCobroCuota,
  currencySymbol
}) => {
  const totalCuotas = cuotas.length;
  const pagadas = cuotas.filter(c => c.estado === 'pagado').length;
  const montoTotal = parseFloat(plan.monto_total || 0);
  const montoPagado = cuotas.filter(c => c.estado === 'pagado').reduce((sum, c) => sum + parseFloat(c.monto || 0), 0);
  const porcentajePagado = montoTotal > 0 ? (montoPagado / montoTotal) * 100 : 0;

  const statusMap = getStatusMap();
  const status = statusMap[plan.estado] || statusMap.active;
  const isExpanded = expandedPlanes.has(plan.id);

  return (
    <div className="presupuesto-card">
      <div className="presupuesto-card-header">
        <div className="presupuesto-card-info">
          <h4 className="presupuesto-card-title">
            <FiCreditCard size={18} color="#10b981" />
            {plan.nombre || 'Plan de Ortodoncia'}
            <span className={`odonto-badge-status ${status.class || status.label.toLowerCase()}`}>
              {status.label}
            </span>
            <span className="presupuesto-card-badge">
              {pagadas}/{totalCuotas} cuotas pagadas
            </span>
          </h4>
          <div className="presupuesto-card-meta">
            <span><FiCalendar size={12} style={{ marginRight: 4 }} /> Inicio: {formatDate(plan.fecha_inicio)}</span>
          </div>
        </div>
        <div className="presupuesto-card-total">
          <div className="presupuesto-card-amount">
            {fmt(currencySymbol, montoTotal)}
          </div>
          <div className="presupuesto-card-count">{totalCuotas} cuotas</div>
        </div>
      </div>

      {plan.descripcion ? (
        <div className="presupuesto-card-description">
          {plan.descripcion}
        </div>
      ) : null}

      <div style={{
        height: 4,
        borderRadius: 4,
        background: 'rgba(255,255,255,0.04)',
        marginBottom: 12,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${porcentajePagado}%`,
          height: '100%',
          background: porcentajePagado >= 100
            ? 'linear-gradient(90deg, #10b981, #059669)'
            : 'linear-gradient(90deg, #f59e0b, #d97706)',
          borderRadius: 4,
          transition: 'width 0.6s ease'
        }} />
      </div>

      <div className="presupuesto-card-actions">
        <button
          className="presupuesto-toggle-btn"
          onClick={() => onToggleExpand(plan.id)}
          style={{ marginBottom: isExpanded ? '12px' : '0' }}
        >
          {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
          {isExpanded ? 'Ocultar cuotas' : 'Ver cuotas'}
          <span className="presupuesto-pendientes-count">
            ({totalCuotas} cuotas)
          </span>
        </button>
      </div>

      {isExpanded && cuotas.length > 0 && (
        <div className="presupuesto-table-wrapper">
          <table className="presupuesto-table">
            <thead>
              <tr>
                <th># Cuota</th>
                <th>Vencimiento</th>
                <th>Monto</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cuotas.map((cuota) => {
                const isPaid = cuota.estado === 'pagado';
                const statusStyle = getCuotaEstado(cuota.estado);

                return (
                  <tr key={cuota.id}>
                    <td className="presupuesto-cell-tooth">#{cuota.numero_cuota}</td>
                    <td className="presupuesto-cell-diagnostico">{formatDate(cuota.fecha_vencimiento)}</td>
                    <td className="presupuesto-cell-precio">{fmt(currencySymbol, cuota.monto || 0)}</td>
                    <td className="presupuesto-cell-estado">
                      <span className={`odonto-badge-status ${cuota.estado}`}>
                        {statusStyle.label}
                      </span>
                    </td>
                    <td>
                      {!isPaid && (
                        <button
                          className="odonto-btn-primary"
                          style={{ padding: '4px 12px', fontSize: '11px' }}
                          onClick={() => onAbrirCobroCuota(cuota, plan)}
                        >
                          <FiDollarSign size={12} /> Cobrar
                        </button>
                      )}
                      {isPaid && (
                        <span style={{ fontSize: '11px', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <FiCheck size={14} /> Pagado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2" className="presupuesto-table-total-label">Totales</td>
                <td className="presupuesto-table-total-value">{fmt(currencySymbol, montoTotal)}</td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Pagado: {fmt(currencySymbol, montoPagado)}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: 600, color: montoTotal - montoPagado > 0 ? 'var(--warning)' : 'var(--primary)' }}>
                  Pendiente: {fmt(currencySymbol, montoTotal - montoPagado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlanPagoCard;