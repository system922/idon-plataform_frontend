import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X
} from 'react-feather';
import CustomCombobox from './CustomCombobox';

// ─── Componente de paginación ────────────────────────────────────────────

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 25, 50, 100]
}) => {
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    let l;
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  if (totalPages <= 1 && totalItems <= itemsPerPage) return null;

  const perPageOptions = itemsPerPageOptions.map(opt => ({
    value: opt,
    label: String(opt)
  }));

  return (
    <div className="table-pagination">
      <div className="table-pagination-info">
        <span>
          Mostrando {Math.min(itemsPerPage, totalItems - (currentPage - 1) * itemsPerPage)} de {totalItems} registros
        </span>
        <div className="table-pagination-per-page">
          <label>Filas por página:</label>
          <CustomCombobox
            options={perPageOptions}
            value={itemsPerPage}
            onChange={(value) => onItemsPerPageChange(Number(value))}
            placeholder="Seleccionar..."
            filterable={false}
            size="sm"
            forceDropup={false}
            className="pagination-combobox"
          />
        </div>
      </div>

      <div className="table-pagination-controls">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="table-pagination-btn"
          title="Primera página"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="table-pagination-btn"
          title="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="table-pagination-numbers">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              className={`table-pagination-number ${
                page === currentPage ? 'active' : ''
              } ${typeof page !== 'number' ? 'dots' : ''}`}
              disabled={typeof page !== 'number'}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="table-pagination-btn"
          title="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="table-pagination-btn"
          title="Última página"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};

// ─── Componente de filtro rápido ──────────────────────────────────────────

const QuickFilter = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = ''
}) => {
  return (
    <div className={`table-quick-filter ${className}`}>
      <Search size={16} className="table-quick-filter-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="table-quick-filter-input"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="table-quick-filter-clear"
          title="Limpiar búsqueda"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

// ─── Componente de filtros avanzados ──────────────────────────────────────

const AdvancedFilters = ({
  filters,
  onFilterChange,
  onClearFilters,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== undefined && v !== null);

  if (!filters || Object.keys(filters).length === 0) return null;

  return (
    <div className={`table-advanced-filters ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`table-advanced-filters-toggle ${isOpen ? 'active' : ''} ${
          hasActiveFilters ? 'has-filters' : ''
        }`}
      >
        <Filter size={16} />
        <span>Filtros {hasActiveFilters && `(${Object.values(filters).filter(v => v !== '' && v !== undefined && v !== null).length})`}</span>
      </button>

      {isOpen && (
        <div className="table-advanced-filters-panel">
          <div className="table-advanced-filters-grid">
            {Object.entries(filters).map(([key, value]) => (
              <div key={key} className="table-advanced-filter-group">
                <label className="table-advanced-filter-label">
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
                </label>
                <input
                  type="text"
                  value={value || ''}
                  onChange={(e) => onFilterChange(key, e.target.value)}
                  placeholder={`Filtrar por ${key}`}
                  className="table-advanced-filter-input"
                />
              </div>
            ))}
          </div>
          <div className="table-advanced-filters-actions">
            <button
              onClick={onClearFilters}
              className="table-advanced-filters-clear"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Componente principal Table ──────────────────────────────────────────

const Table = ({
  // Datos
  data = [],
  columns = [],
  keyField = 'id',

  // Paginación
  pagination = true,
  itemsPerPage = 10,
  itemsPerPageOptions = [10, 25, 50, 100],

  // Búsqueda y filtros
  searchable = true,
  searchPlaceholder = 'Buscar...',
  searchFields = [],
  filters = null,
  onFilterChange = null,
  onClearFilters = null,

  // Estilos
  className = '',
  tableClassName = '',
  compact = false,
  striped = true,
  hoverable = true,
  bordered = false,

  // Estados
  loading = false,
  emptyMessage = 'No hay datos disponibles',
  error = null,
  onRetry = null,

  // Acciones
  actions = [],
  onRowClick = null,
  renderRow = null,

  // Callbacks
  onPageChange = null,
  onItemsPerPageChange = null,

  // Títulos
  title = null,
  subtitle = null,
  toolbar = null,

  // Personalización
  rowClassName = null,
  cellClassName = null,
  headerClassName = null,

  // Exportación
  exportable = false,
  onExport = null,
  exportLabel = 'Exportar'
}) => {
  // ── Estados ──────────────────────────────────────────────────────

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState({});

  // ── Lógica de búsqueda ──────────────────────────────────────────

  const searchableFields = searchFields.length > 0
    ? searchFields
    : columns
        .filter(col => col.searchable !== false)
        .map(col => col.accessor || col.key || col.field);

  const filteredData = useMemo(() => {
    let result = [...data];

    // ✅ Búsqueda global (si searchable está activo)
    if (searchable && searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(item => {
        return searchableFields.some(field => {
          const value = item[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        });
      });
    }

    // Filtros
    const activeFilters = filters || localFilters;
    if (Object.keys(activeFilters).length > 0) {
      result = result.filter(item => {
        return Object.entries(activeFilters).every(([key, value]) => {
          if (!value || value === '') return true;
          const itemValue = item[key];
          if (itemValue === null || itemValue === undefined) return false;
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        });
      });
    }

    return result;
  }, [data, searchTerm, searchableFields, filters, localFilters, searchable]);

  // ── Lógica de paginación ────────────────────────────────────────

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // ✅ Reiniciar a página 1 cuando cambian los datos
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, currentPage, itemsPerPage, pagination]);

  // ── Handlers ──────────────────────────────────────────────────────

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (onPageChange) onPageChange(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setCurrentPage(1);
    if (onItemsPerPageChange) onItemsPerPageChange(newItemsPerPage);
  };

  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    } else {
      setLocalFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1);
    }
  };

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setLocalFilters({});
    }
    setCurrentPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────

  const renderCell = (item, column) => {
    let value;
    if (column.render) {
      return column.render(item);
    }
    if (column.accessor) {
      value = typeof column.accessor === 'function'
        ? column.accessor(item)
        : item[column.accessor];
    } else {
      value = item[column.key || column.field];
    }
    if (column.format) {
      return column.format(value, item);
    }
    return value !== undefined && value !== null ? value : '—';
  };

  const renderActions = (item) => {
    if (actions.length === 0) return null;
    return (
      <div className="table-actions">
        {actions.map((action, index) => {
          const disabled = action.disabled ? action.disabled(item) : false;
          const visible = action.visible ? action.visible(item) : true;
          if (!visible) return null;
          return (
            <button
              key={index}
              onClick={() => action.onClick(item)}
              disabled={disabled}
              className={`table-action-btn ${action.className || ''}`}
              title={action.tooltip}
            >
              {action.icon && <span className="table-action-icon">{action.icon}</span>}
              {action.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`table-container ${className} ${compact ? 'table-compact' : ''}`}>
      {/* ─── Cabecera ──────────────────────────────────────────────── */}
      {(title || subtitle) && (
        <div className="table-header">
          <div className="table-header-left">
            {title && <h3 className="table-title">{title}</h3>}
            {subtitle && <p className="table-subtitle">{subtitle}</p>}
          </div>
          <div className="table-header-right">
            {exportable && onExport && (
              <button onClick={onExport} className="table-export-btn">
                {exportLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Búsqueda, filtros y toolbar ────────────────────────── */}
      {(searchable || filters || toolbar) && (
        <div className="table-controls">
          <div className="table-controls-left">
            {/* Espacio vacío o puedes poner algo aquí si quieres */}
          </div>
          <div className="table-controls-right">
            {searchable && (
              <QuickFilter
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={searchPlaceholder}
              />
            )}
            {toolbar && (
              <div className="table-toolbar-inline">
                {toolbar}
              </div>
            )}
            {filters && (
              <AdvancedFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── Tabla ────────────────────────────────────────────────── */}
      <div className="table-scroll">
        <table className={`table ${tableClassName} ${striped ? 'table-striped' : ''} ${
          hoverable ? 'table-hoverable' : ''
        } ${bordered ? 'table-bordered' : ''}`}>
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`table-header-cell ${headerClassName || ''} ${
                    column.align ? `text-${column.align}` : ''
                  } ${column.width ? `table-col-${column.width}` : ''}`}
                  style={column.style}
                >
                  {column.label || column.header}
                </th>
              ))}
              {actions.length > 0 && (
                <th className="table-header-cell table-actions-header">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)}>
                  <div className="table-loading">
                    <div className="table-loading-spinner"></div>
                    <span>Cargando datos...</span>
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)}>
                  <div className="table-error">
                    <span className="table-error-icon">⚠️</span>
                    <span>{error}</span>
                    {onRetry && (
                      <button onClick={onRetry} className="table-error-retry">
                        Reintentar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)}>
                  <div className="table-empty">
                    <span className="table-empty-icon">📭</span>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              renderRow
                ? paginatedData.map((item, index) => renderRow(item, index))
                : paginatedData.map((item, index) => {
                    const rowClasses = [
                      'table-row',
                      rowClassName ? rowClassName(item, index) : '',
                      onRowClick ? 'table-row-clickable' : ''
                    ].filter(Boolean).join(' ');

                    return (
                      <tr
                        key={item[keyField] || index}
                        className={rowClasses}
                        onClick={() => onRowClick && onRowClick(item)}
                      >
                        {columns.map((column, colIndex) => (
                          <td
                            key={colIndex}
                            className={`table-cell ${cellClassName || ''} ${
                              column.align ? `text-${column.align}` : ''
                            }`}
                            data-label={column.label || column.header}
                            style={column.cellStyle}
                          >
                            {renderCell(item, column)}
                          </td>
                        ))}
                        {actions.length > 0 && (
                          <td className="table-cell table-actions-cell">
                            {renderActions(item)}
                          </td>
                        )}
                      </tr>
                    );
                  })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Paginación ────────────────────────────────────────────── */}
      {pagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          itemsPerPageOptions={itemsPerPageOptions}
        />
      )}
    </div>
  );
};

// ─── Exportaciones ──────────────────────────────────────────────────────

export default Table;
export { QuickFilter, AdvancedFilters, Pagination };