// components/Odontologia/Reportes/SelectorTicketTermico.jsx
import React from 'react';
import {
  FiPrinter,
  FiFileText,
  FiClock,
  FiActivity,
  FiClipboard,
  FiTool,
  FiBookOpen,
  FiGrid,
  FiList,
} from 'react-icons/fi';

const FORMATOS = [
  { 
    key: 'ticket-consulta', 
    label: 'Cert. Consulta', 
    icon: <FiFileText size={16} />,
    descripcion: 'Ticket de certificado de consulta',
    color: '#1a1a1a',
  },
  { 
    key: 'ticket-reposo', 
    label: 'Cert. Reposo', 
    icon: <FiClock size={16} />,
    descripcion: 'Ticket de certificado de reposo',
    color: '#dc2626',
  },
  { 
    key: 'ticket-odontograma', 
    label: 'Odontograma', 
    icon: <FiActivity size={16} />,
    descripcion: 'Ticket de odontograma',
    color: '#2563eb',
  },
  { 
    key: 'ticket-periodontograma', 
    label: 'Periodontograma', 
    icon: <FiClipboard size={16} />,
    descripcion: 'Ticket de periodontograma',
    color: '#8b5cf6',
  },
  { 
    key: 'ticket-tratamiento', 
    label: 'Tratamiento', 
    icon: <FiTool size={16} />,
    descripcion: 'Ticket de tratamientos',
    color: '#059669',
  },
  { 
    key: 'ticket-plan', 
    label: 'Plan', 
    icon: <FiBookOpen size={16} />,
    descripcion: 'Ticket de plan de tratamiento',
    color: '#f59e0b',
  },
  { 
    key: 'ticket-resumen', 
    label: 'Resumen', 
    icon: <FiGrid size={16} />,
    descripcion: 'Ticket resumen de atención',
    color: '#6366f1',
  },
  { 
    key: 'ticket-completo', 
    label: 'Completo', 
    icon: <FiList size={16} />,
    descripcion: 'Ticket con todos los datos',
    color: '#ec4899',
  },
];

export default function SelectorTicketTermico({ 
  formatoActivo, 
  onFormatoChange, 
  onImprimir,
  disabled = false,
  loading = false,
}) {
  return (
    <div className="selector-ticket-termico no-print">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiPrinter size={18} style={{ color: 'var(--text-muted)' }} />
          <span style={{ 
            fontSize: 13, 
            fontWeight: 600, 
            color: 'var(--text-secondary)',
          }}>
            🧾 Ticket térmico:
          </span>
        </div>
        <button
          onClick={onImprimir}
          disabled={disabled || loading}
          style={{
            padding: '6px 20px',
            borderRadius: 6,
            border: 'none',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            opacity: disabled || loading ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {loading ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Imprimiendo...
            </>
          ) : (
            <>
              <FiPrinter size={14} /> Imprimir Ticket
            </>
          )}
        </button>
      </div>

      <div style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        {FORMATOS.map((formato) => (
          <button
            key={formato.key}
            onClick={() => onFormatoChange(formato.key)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              border: formatoActivo === formato.key 
                ? `2px solid ${formato.color}` 
                : '1px solid var(--border-color)',
              background: formatoActivo === formato.key 
                ? `${formato.color}15` 
                : 'transparent',
              color: formatoActivo === formato.key 
                ? formato.color 
                : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: formatoActivo === formato.key ? 600 : 400,
              transition: 'all 0.2s',
              fontFamily: 'inherit',
            }}
          >
            {formato.icon}
            <span>{formato.label}</span>
          </button>
        ))}
      </div>

      {formatoActivo && (
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '4px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ fontWeight: 600 }}>Formato:</span>
          {FORMATOS.find(f => f.key === formatoActivo)?.label}
          <span style={{ color: 'var(--text-dim)', marginLeft: 4 }}>
            — {FORMATOS.find(f => f.key === formatoActivo)?.descripcion}
          </span>
        </div>
      )}

      <style>{`
        .selector-ticket-termico {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 16px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}