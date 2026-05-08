import React, { useState, useMemo, useCallback } from 'react';
import { FiChevronUp, FiChevronDown, FiSearch, FiX } from 'react-icons/fi';

/**
 * Componente de tabla universal y reutilizable
 * 
 * @param {Object} props
 * @param {Array} props.data - Datos a mostrar
 * @param {Array} props.columns - Configuración de columnas [{ key, label, sortable, render, align, width }]
 * @param {string} props.searchPlaceholder - Placeholder del buscador
 * @param {boolean} props.enableSearch - Habilitar búsqueda global
 * @param {boolean} props.enablePagination - Habilitar paginación
 * @param {number} props.pageSize - Elementos por página
 * @param {boolean} props.loading - Estado de carga
 * @param {string} props.emptyMessage - Mensaje cuando no hay datos
 * @param {Function} props.onRowClick - Click en fila
 * @param {Array} props.actions - Acciones adicionales por fila [{ icon, onClick, title, color }]
 * @param {React.ReactNode} props.headerActions - Acciones en el header
 * @param {string} props.keyField - Campo único para la key (default: 'id')
 */
const DataTable = ({
  data = [],
  columns = [],
  searchPlaceholder = 'Buscar...',
  enableSearch = true,
  enablePagination = true,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  onRowClick,
  actions = [],
  headerActions,
  keyField = 'id',
}) => {
  // Estados
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Filtrar datos por búsqueda global
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(row => {
      return columns.some(col => {
        const value = row[col.key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, columns]);

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig]);

  // Paginar datos
  const paginatedData = useMemo(() => {
    if (!enablePagination) return sortedData;
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, currentPage, pageSize, enablePagination]);

  // Total de páginas
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Manejar ordenamiento
  const handleSort = (key, sortable) => {
    if (!sortable) return;
    
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // Manejar búsqueda
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setCurrentPage(1);
  };

  // Renderizar paginación
  const renderPagination = () => {
    if (!enablePagination || totalPages <= 1) return null;
    
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return (
      <div className="datatable-pagination">
        <button
          className="datatable-pagination-btn"
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
        >
          Anterior
        </button>
        
        {startPage > 1 && (
          <>
            <button className="datatable-pagination-btn" onClick={() => setCurrentPage(1)}>1</button>
            {startPage > 2 && <span className="datatable-pagination-dots">...</span>}
          </>
        )}
        
        {pages.map(page => (
          <button
            key={page}
            className={`datatable-pagination-btn ${currentPage === page ? 'active' : ''}`}
            onClick={() => setCurrentPage(page)}
          >
            {page}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="datatable-pagination-dots">...</span>}
            <button className="datatable-pagination-btn" onClick={() => setCurrentPage(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
        
        <button
          className="datatable-pagination-btn"
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
        >
          Siguiente
        </button>
      </div>
    );
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="datatable-loading">
        <div className="datatable-spinner" />
        <span>Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="datatable-container">
      {/* Header con búsqueda y acciones */}
      <div className="datatable-header">
        {enableSearch && (
          <div className="datatable-search">
            <FiSearch className="datatable-search-icon" />
            <input
              type="text"
              className="datatable-search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearch}
            />
            {searchTerm && (
              <button className="datatable-search-clear" onClick={clearSearch}>
                <FiX size={14} />
              </button>
            )}
          </div>
        )}
        {headerActions && <div className="datatable-header-actions">{headerActions}</div>}
      </div>

      {/* Tabla */}
      <div className="datatable-wrapper">
        <table className="datatable-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.align ? `text-${col.align}` : ''}
                  style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                  onClick={() => handleSort(col.key, col.sortable)}
                >
                  <div className="datatable-th-content">
                    {col.label}
                    {col.sortable && (
                      <span className="datatable-sort-icon">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                        ) : (
                          <FiChevronUp size={14} style={{ opacity: 0.3 }} />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && <th style={{ width: 80 }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="datatable-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={row[keyField] || idx}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'datatable-clickable' : ''}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={col.align ? `text-${col.align}` : ''}
                      data-label={col.label}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="datatable-actions" onClick={e => e.stopPropagation()}>
                      {actions.map((action, idx) => (
                        <button
                          key={idx}
                          className="datatable-action-btn"
                          onClick={() => action.onClick(row)}
                          title={action.title}
                          style={{ color: action.color }}
                        >
                          {action.icon}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con paginación e info */}
      {enablePagination && sortedData.length > 0 && (
        <div className="datatable-footer">
          <div className="datatable-info">
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length} resultados
          </div>
          {renderPagination()}
        </div>
      )}
    </div>
  );
};

export default DataTable;