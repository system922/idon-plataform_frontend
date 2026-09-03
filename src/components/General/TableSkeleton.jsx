// src/components/General/TableSkeleton.jsx
import React from 'react';

/**
 * Skeleton reutilizable para tablas
 * @param {Object} props
 * @param {number} props.rows - Número de filas a mostrar (default: 5)
 * @param {number} props.columns - Número de columnas (default: 6)
 * @param {string} props.title - Título opcional
 * @param {string} props.subtitle - Subtítulo opcional
 * @param {boolean} props.showToolbar - Mostrar toolbar skeleton (default: true)
 * @param {boolean} props.showSearch - Mostrar búsqueda skeleton (default: true)
 * @param {number} props.toolbarWidth - Ancho del botón toolbar (default: 140)
 * @param {string} props.className - Clases adicionales
 * @param {Array} props.columnWidths - Anchos personalizados para cada columna
 */
const TableSkeleton = ({
  rows = 5,
  columns = 6,
  title = '',
  subtitle = '',
  showToolbar = true,
  showSearch = true,
  toolbarWidth = 140,
  className = '',
  columnWidths = ['1.5fr', '1.5fr', '2fr', '1fr', '0.8fr', '1fr'],
}) => {
  // Si se pasa un número, convertir a array de strings
  const colWidths = Array.isArray(columnWidths) 
    ? columnWidths 
    : Array(columns).fill('1fr');

  return (
    <div className={`table-skeleton ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="skeleton-toolbar">
          <div className="skeleton-btn" style={{ width: `${toolbarWidth}px`, height: '36px' }} />
          {showSearch && (
            <div className="skeleton-search" style={{ width: '240px', height: '36px' }} />
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="skeleton-table-wrapper">
        {/* Header con título */}
        {(title || subtitle) && (
          <div className="skeleton-table-header">
            <div>
              {title && (
                <div className="skeleton-line" style={{ width: '30%', height: '20px', marginBottom: '4px' }} />
              )}
              {subtitle && (
                <div className="skeleton-line" style={{ width: '15%', height: '14px' }} />
              )}
            </div>
          </div>
        )}

        <div className="skeleton-table">
          {/* Cabecera */}
          <div className="skeleton-thead" style={{ gridTemplateColumns: colWidths.join(' ') }}>
            {colWidths.map((_, i) => (
              <div key={i} className="skeleton-th" />
            ))}
          </div>

          {/* Filas */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="skeleton-tr" style={{ gridTemplateColumns: colWidths.join(' ') }}>
              {colWidths.map((_, colIndex) => (
                <div key={colIndex} className="skeleton-td">
                  <div className="skeleton-line" style={{ width: colIndex === 0 ? '60%' : colIndex === 2 ? '70%' : '50%' }} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Paginación */}
        <div className="skeleton-pagination">
          <div className="skeleton-line" style={{ width: '20%' }} />
          <div className="skeleton-pagination-btns">
            <div className="skeleton-btn" style={{ width: '32px', height: '32px' }} />
            <div className="skeleton-btn" style={{ width: '32px', height: '32px' }} />
            <div className="skeleton-btn" style={{ width: '32px', height: '32px' }} />
            <div className="skeleton-btn" style={{ width: '32px', height: '32px' }} />
          </div>
        </div>
      </div>

      <style>{`
        .table-skeleton {
          animation: fadeIn 0.3s ease;
          padding: 4px;
        }

        .skeleton-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .skeleton-btn {
          height: 36px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          border-radius: 6px;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-search {
          height: 36px;
          border-radius: 6px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-table-wrapper {
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border-color);
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .skeleton-table-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }

        .skeleton-line {
          height: 14px;
          background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
          background-size: 200% 100%;
          border-radius: 4px;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-table {
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }

        .skeleton-thead {
          display: grid;
          gap: 8px;
          padding: 12px 16px;
          background: var(--bg-tertiary);
          border-bottom: 1px solid var(--border-color);
        }

        .skeleton-th {
          height: 16px;
          background: linear-gradient(90deg, #cbd5e1 25%, #e2e8f0 50%, #cbd5e1 75%);
          background-size: 200% 100%;
          border-radius: 4px;
          animation: shimmer 1.5s ease-in-out infinite;
        }

        .skeleton-tr {
          display: grid;
          gap: 8px;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          align-items: center;
        }

        .skeleton-tr:last-child {
          border-bottom: none;
        }

        .skeleton-td {
          display: flex;
          align-items: center;
        }

        .skeleton-td .skeleton-line {
          width: 100%;
        }

        .skeleton-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
        }

        .skeleton-pagination-btns {
          display: flex;
          gap: 6px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .skeleton-thead,
          .skeleton-tr {
            gap: 4px;
            padding: 8px 12px;
          }

          .skeleton-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .skeleton-btn {
            width: 100% !important;
          }

          .skeleton-search {
            width: 100% !important;
          }
        }

        @media (max-width: 480px) {
          .skeleton-thead,
          .skeleton-tr {
            gap: 4px;
            padding: 6px 8px;
            font-size: 10px;
          }

          .skeleton-pagination {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default TableSkeleton;