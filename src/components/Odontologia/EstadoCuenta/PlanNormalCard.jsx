// components/Odontologia/EstadoCuenta/components/PlanNormalCard.jsx

import React from 'react';
import { FiFileText, FiCalendar, FiTag, FiChevronDown, FiChevronUp, FiCheckSquare, FiSquare, FiCheck, FiDollarSign } from 'react-icons/fi';
import { fmt, getStatusMap, getTratamientoEstado, formatDate } from '../../../utils/helpers';

const PlanNormalCard = ({ 
  plan, 
  expandedPlanes, 
  onToggleExpand, 
  selectedTratamientos, 
  onToggleTratamiento, 
  onSeleccionarTodos,
  onAbrirCobro,
  currencySymbol,
  cobrandoTratamientos
}) => {
  const isExpanded = expandedPlanes.has(plan.id);
  const items = plan.items || [];
  
  const pendientes = items.filter(t => t.estado !== 'completado');
  const completados = items.filter(t => t.estado === 'completado');
  
  const statusMap = getStatusMap();
  const status = statusMap[plan.status] || statusMap.draft;
  const totalItems = items.length;
  const totalCompletados = completados.length;
  
  const totalSeleccionados = pendientes.filter((t, idx) => {
    const key = `${plan.id}-pendiente-${idx}`;
    return selectedTratamientos[key];
  }).length;
  
  const totalMontoSeleccionado = pendientes
    .filter((t, idx) => {
      const key = `${plan.id}-pendiente-${idx}`;
      return selectedTratamientos[key];
    })
    .reduce((sum, t) => sum + parseFloat(t.price || 0), 0);

  const todosSeleccionados = pendientes.length > 0 &&
    pendientes.every((t, idx) => {
      const key = `${plan.id}-pendiente-${idx}`;
      return selectedTratamientos[key];
    });

  const handleSeleccionarTodos = () => {
    if (pendientes.length === 0) return;
    
    const newSelected = { ...selectedTratamientos };
    
    if (todosSeleccionados) {
      pendientes.forEach((_, idx) => {
        const key = `${plan.id}-pendiente-${idx}`;
        delete newSelected[key];
      });
    } else {
      pendientes.forEach((_, idx) => {
        const key = `${plan.id}-pendiente-${idx}`;
        newSelected[key] = true;
      });
    }
    
    onSeleccionarTodos(plan.id, pendientes, newSelected);
  };

  return (
    <div className="presupuesto-card">
      <div className="presupuesto-card-header">
        <div className="presupuesto-card-info">
          <h4 className="presupuesto-card-title">
            <FiFileText size={18} color="#6366f1" />
            {plan.name || plan.nombre || 'Plan sin nombre'}
            <span className={`odonto-badge-status ${status.class || status.label.toLowerCase()}`}>
              {status.label}
            </span>
            <span className="presupuesto-card-badge">
              {totalCompletados}/{totalItems} completados
            </span>
          </h4>
          <div className="presupuesto-card-meta">
            <span><FiCalendar size={12} style={{ marginRight: 4 }} /> Creado: {formatDate(plan.created_at)}</span>
            <span><FiTag size={12} style={{ marginRight: 4 }} /> Fase: {plan.fase || 'inicial'}</span>
          </div>
        </div>
        <div className="presupuesto-card-total">
          <div className="presupuesto-card-amount">
            {fmt(currencySymbol, plan.costo_total || plan.total_cost || 0)}
          </div>
          <div className="presupuesto-card-count">{totalItems} tratamientos</div>
        </div>
      </div>

      {plan.descripcion || plan.description ? (
        <div className="presupuesto-card-description">
          {plan.descripcion || plan.description}
        </div>
      ) : null}

      <div className="presupuesto-card-details">
        <div className="presupuesto-card-actions">
          <button
            className="presupuesto-toggle-btn"
            onClick={() => onToggleExpand(plan.id)}
          >
            {isExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            {isExpanded ? 'Ocultar detalle' : 'Ver detalle de tratamientos'}
            <span className="presupuesto-pendientes-count">
              ({pendientes.length} pendientes)
            </span>
          </button>

          {totalSeleccionados > 0 && (
            <div className="presupuesto-seleccionados">
              <span className="presupuesto-seleccionados-info">
                {totalSeleccionados} seleccionados - {fmt(currencySymbol, totalMontoSeleccionado)}
              </span>
              <button
                className="presupuesto-cobrar-btn"
                onClick={() => onAbrirCobro(plan)}
                disabled={cobrandoTratamientos || totalSeleccionados === 0}
              >
                <FiDollarSign size={14} />
                {cobrandoTratamientos ? 'Procesando...' : `Cobrar ${totalSeleccionados}`}
              </button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="presupuesto-table-wrapper">
            <table className="presupuesto-table">
              <thead>
                <tr>
                  <th className="presupuesto-table-select">
                    {pendientes.length > 0 && (
                      <button
                        className="presupuesto-select-all-btn"
                        onClick={handleSeleccionarTodos}
                        title="Seleccionar todos los pendientes"
                      >
                        {todosSeleccionados ? <FiCheckSquare size={16} color="#10b981" /> : <FiSquare size={16} />}
                      </button>
                    )}
                  </th>
                  <th>Diente</th>
                  <th>Diagnóstico</th>
                  <th>Tratamiento</th>
                  <th>Estado</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const estado = getTratamientoEstado(item.estado);
                  const isCompletado = item.estado === 'completado';
                  const isPendiente = !isCompletado;
                  const pendienteIndex = pendientes.findIndex(p => p === item);
                  const key = isPendiente ? `${plan.id}-pendiente-${pendienteIndex}` : `${plan.id}-completado-${idx}`;
                  const isSelected = isPendiente ? (selectedTratamientos[key] || false) : false;

                  return (
                    <tr key={key} className={isCompletado ? 'presupuesto-row-completado' : ''}>
                      <td className="presupuesto-cell-select">
                        {!isCompletado && (
                          <button
                            className="presupuesto-select-item-btn"
                            onClick={() => {
                              const pendIdx = pendientes.findIndex(p => p === item);
                              onToggleTratamiento(plan.id, pendIdx);
                            }}
                          >
                            {isSelected ? <FiCheckSquare size={16} color="#10b981" /> : <FiSquare size={16} />}
                          </button>
                        )}
                        {isCompletado && <FiCheck size={16} color="#10b981" />}
                      </td>
                      <td className="presupuesto-cell-tooth">
                        #{item.tooth || '-'}
                        {isCompletado && <span className="presupuesto-checkmark">✓</span>}
                      </td>
                      <td className="presupuesto-cell-diagnostico">{item.diagnostico || '-'}</td>
                      <td className="presupuesto-cell-tratamiento">{item.tratamiento || item.service || '-'}</td>
                      <td className="presupuesto-cell-estado">
                        <span className={`odonto-badge-status ${item.estado}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td className="presupuesto-cell-precio">
                        ${parseFloat(item.price || 0).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="5" className="presupuesto-table-total-label">Total</td>
                  <td className="presupuesto-table-total-value">
                    ${parseFloat(plan.costo_total || plan.total_cost || 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanNormalCard;