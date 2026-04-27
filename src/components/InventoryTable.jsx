import React from 'react';
import { FiEdit, FiTrash2 } from 'react-icons/fi';

export default function InventoryTable({
  columns = [],
  data = [],
  onEdit,
  onDelete,
  onRowClick,
  emptyMessage = 'Sin datos',
}) {
  return (
    <div style={{
      width: '100%',
      background: '#111827',
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid #1f2937'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        color: '#FFFACA'
      }}>
        <thead style={{ background: '#0f172a' }}>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{
                padding: '12px',
                textAlign: col.align || 'left',
                fontSize: '12px',
                letterSpacing: '0.5px',
                color: '#A8A89A'
              }}>
                {col.label}
              </th>
            ))}

            {(onEdit || onDelete) && (
              <th style={{ width: 80 }}></th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} style={{
                textAlign: 'center',
                padding: '20px',
                color: '#888'
              }}>
                {emptyMessage}
              </td>
            </tr>
          )}

          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick && onRowClick(row)}
              style={{
                borderTop: '1px solid #1f2937',
                cursor: onRowClick ? 'pointer' : 'default'
              }}
            >
              {columns.map(col => (
                <td key={col.key} style={{
                  padding: '10px',
                  textAlign: col.align || 'left'
                }}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : row[col.key]}
                </td>
              ))}

              {(onEdit || onDelete) && (
                <td style={{ display: 'flex', gap: 8 }}>
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(row);
                      }}
                      style={btnIcon}
                    >
                      <FiEdit />
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(row.id);
                      }}
                      style={btnIcon}
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const btnIcon = {
  background: 'transparent',
  border: 'none',
  color: '#FFFACA',
  cursor: 'pointer',
};