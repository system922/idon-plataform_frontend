// components/Odontologia/EstadoCuenta/components/PresupuestosList.jsx

import React, { useState } from 'react';
import { FiPackage, FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';
import PlanNormalCard from './PlanNormalCard';
import PlanPagoCard from './PlanPagoCard';
import ResumenFinanciero from './ResumenFinanciero';
import { fmt } from '../../../utils/helpers';

const PresupuestosList = ({
  planesData,
  planesPagosData,
  cuotasData,
  loadingPlanes,
  onLoadPlanes,
  summary,
  currencySymbol,
  expandedPlanes,
  onToggleExpand,
  selectedTratamientos,
  onToggleTratamiento,
  onSeleccionarTodos,
  onAbrirCobroSeleccionados,
  onAbrirCobroCuota,
  cobrandoTratamientos,
}) => {
  const [filterType, setFilterType] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const allPlanes = [
    ...planesData.map(p => ({ ...p, type: 'normal' })),
    ...planesPagosData.map(p => ({ ...p, type: 'pagos' })),
  ];

  let filtered = allPlanes;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      (p.name || p.nombre || '').toLowerCase().includes(term) ||
      (p.description || p.descripcion || '').toLowerCase().includes(term)
    );
  }
  if (filterType === 'normales') {
    filtered = filtered.filter(p => p.type === 'normal');
  } else if (filterType === 'pagos') {
    filtered = filtered.filter(p => p.type === 'pagos');
  }

  filtered.sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return new Date(b.created_at || b.fecha_inicio || 0) - new Date(a.created_at || a.fecha_inicio || 0);
  });

  const handleSeleccionarTodos = (planId, pendientes, newSelected) => {
    onSeleccionarTodos(planId, pendientes, newSelected);
  };

  const handleToggleTratamiento = (planId, itemIndex) => {
    onToggleTratamiento(planId, itemIndex);
  };

  return (
    <>
      {/* FILTROS - odonto-filters-row con búsqueda a la izquierda y filtros a la derecha */}
      <div className="odonto-filters-row" style={{ padding: '10px 16px' }}>
        {/* BÚSQUEDA - odonto-search-wrapper pequeño a la izquierda */}
        <div className="odonto-search-wrapper" style={{ minWidth: '180px', flex: '0 1 auto' }}>
          <FiSearch className="odonto-search-icon" />
          <input
            type="text"
            className="odonto-search-input"
            placeholder="Buscar plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ padding: '6px 36px 6px 34px', fontSize: '13px' }}
          />
          {searchTerm && (
            <button className="odonto-search-clear" onClick={() => setSearchTerm('')}>
              <FiX size={14} />
            </button>
          )}
        </div>

        {/* FILTROS - a la derecha */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginLeft: 'auto' }}>
          <button
            className={`odonto-btn-secondary ${filterType === 'todos' ? 'active' : ''}`}
            style={{ 
              fontSize: 11, 
              padding: '4px 12px',
              background: filterType === 'todos' ? 'var(--primary-gradient)' : 'transparent',
              color: filterType === 'todos' ? '#fff' : 'var(--text-muted)',
              border: filterType === 'todos' ? 'none' : '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
            onClick={() => setFilterType('todos')}
          >
            Todos
          </button>
          <button
            className={`odonto-btn-secondary ${filterType === 'normales' ? 'active' : ''}`}
            style={{ 
              fontSize: 11, 
              padding: '4px 12px',
              background: filterType === 'normales' ? 'var(--blue-gradient)' : 'transparent',
              color: filterType === 'normales' ? '#fff' : 'var(--text-muted)',
              border: filterType === 'normales' ? 'none' : '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
            onClick={() => setFilterType('normales')}
          >
            Planes Normales
          </button>
          <button
            className={`odonto-btn-secondary ${filterType === 'pagos' ? 'active' : ''}`}
            style={{ 
              fontSize: 11, 
              padding: '4px 12px',
              background: filterType === 'pagos' ? 'var(--primary-gradient)' : 'transparent',
              color: filterType === 'pagos' ? '#fff' : 'var(--text-muted)',
              border: filterType === 'pagos' ? 'none' : '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
            onClick={() => setFilterType('pagos')}
          >
            Planes de Pagos
          </button>
          <button
            className="odonto-btn-secondary"
            style={{ 
              fontSize: 11, 
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onClick={onLoadPlanes}
            disabled={loadingPlanes}
          >
            <FiRefreshCw size={14} className={loadingPlanes ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <ResumenFinanciero summary={summary} currencySymbol={currencySymbol} />

      {filtered.length === 0 ? (
        <div className="odonto-empty-state">
          <FiPackage size={48} style={{ color: 'var(--text-dim)' }} />
          <div style={{ marginTop: 12, fontSize: 16, fontWeight: 500, color: 'var(--text-muted)' }}>
            No hay planes disponibles
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
            {filterType === 'pagos'
              ? 'Genera un plan de pagos desde Ortodoncia'
              : 'Crea un plan desde el Odontograma'}
          </div>
        </div>
      ) : (
        filtered.map((plan) => {
          if (plan.type === 'normal') {
            return (
              <PlanNormalCard
                key={plan.id}
                plan={plan}
                expandedPlanes={expandedPlanes}
                onToggleExpand={onToggleExpand}
                selectedTratamientos={selectedTratamientos}
                onToggleTratamiento={handleToggleTratamiento}
                onSeleccionarTodos={handleSeleccionarTodos}
                onAbrirCobro={onAbrirCobroSeleccionados}
                currencySymbol={currencySymbol}
                cobrandoTratamientos={cobrandoTratamientos}
              />
            );
          } else {
            return (
              <PlanPagoCard
                key={plan.id}
                plan={plan}
                cuotas={cuotasData[plan.id] || []}
                expandedPlanes={expandedPlanes}
                onToggleExpand={onToggleExpand}
                onAbrirCobroCuota={onAbrirCobroCuota}
                currencySymbol={currencySymbol}
              />
            );
          }
        })
      )}
    </>
  );
};

export default PresupuestosList;