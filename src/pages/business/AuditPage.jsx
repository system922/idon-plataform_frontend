import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { 
  FiRefreshCw, 
  FiDollarSign, 
  FiAlertCircle, 
  FiLock, 
  FiUnlock, 
  FiPlusCircle, 
  FiMinusCircle, 
  FiTrendingUp, 
  FiFileText,
  FiSunrise,
  FiSun,
  FiCalendar,
  FiFilter,
  FiX
} from "react-icons/fi";
import { User } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/AuditPage.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(val) {
  return typeof val === "number"
    ? val.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : val;
}

// Obtener fecha actual en Ecuador (YYYY-MM-DD)
function getCurrentEcuadorDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Formatear fecha para mostrar (DD/MM/YYYY)
function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Función para extraer solo la fecha de un timestamp (YYYY-MM-DD)
// Timestamp puede venir como "2026-05-02 08:10:08.939545" o "2026-05-02T08:10:08.939545Z"
function extractDateFromTimestamp(timestamp) {
  if (!timestamp) return null;
  // Manejar formato "2026-05-02 08:10:08.939545"
  if (typeof timestamp === 'string') {
    // Si tiene espacio, tomar la parte de la fecha
    if (timestamp.includes(' ')) {
      return timestamp.split(' ')[0];
    }
    // Si tiene T (formato ISO), tomar la parte de la fecha
    if (timestamp.includes('T')) {
      return timestamp.split('T')[0];
    }
    // Si ya es solo fecha
    return timestamp;
  }
  // Si es objeto Date
  if (timestamp instanceof Date) {
    return timestamp.toISOString().split('T')[0];
  }
  return null;
}

// Función para obtener el ícono según la acción
function getActionIcon(action, metadata = {}) {
  const actionLower = (action || "").toLowerCase();
  
  switch (actionLower) {
    case "apertura_caja":
      return <FiSunrise size={20} />;
    case "caja_abierta":
      return <FiSun size={20} />;
    case "caja_cerrada":
    case "cierre_caja":
      if (metadata?.accidental || metadata?.cierreAccidental) {
        return <FiAlertCircle size={20} />;
      }
      return <FiLock size={20} />;
    case "drawer_expense":
    case "gasto_operativo":
      return <FiMinusCircle size={20} />;
    case "ingreso_extra":
      return <FiPlusCircle size={20} />;
    case "aporte_extra":
    case "ingreso_externo":
      return <FiTrendingUp size={20} />;
    default:
      return <FiFileText size={20} />;
  }
}

// Función para obtener el estilo de la acción
function getActionStyle(action, metadata = {}) {
  const actionLower = (action || "").toLowerCase();
  
  switch (actionLower) {
    case "drawer_expense":
    case "gasto_operativo":
      return {
        label: "GASTO OPERATIVO",
        color: "#dc2626",
        background: "rgba(220, 38, 38, 0.08)",
        iconBg: "#dc2626"
      };
    case "apertura_caja":
      return {
        label: "APERTURA DE CAJA",
        color: "#10b981",
        background: "rgba(16, 185, 129, 0.08)",
        iconBg: "#10b981"
      };
    case "caja_abierta":
      return {
        label: "CAJA ABIERTA",
        color: "#f59e0b",
        background: "rgba(245, 158, 11, 0.08)",
        iconBg: "#f59e0b"
      };
    case "caja_cerrada":
    case "cierre_caja":
      if (metadata?.accidental || metadata?.cierreAccidental) {
        return {
          label: "CIERRE ACCIDENTAL",
          color: "#ef4444",
          background: "rgba(239, 68, 68, 0.08)",
          iconBg: "#ef4444"
        };
      }
      return {
        label: "CIERRE DE CAJA",
        color: "#3b82f6",
        background: "rgba(59, 130, 246, 0.08)",
        iconBg: "#3b82f6"
      };
    case "ingreso_extra":
      return {
        label: "INGRESO EXTRA",
        color: "#8b5cf6",
        background: "rgba(139, 92, 246, 0.08)",
        iconBg: "#8b5cf6"
      };
    case "aporte_extra":
    case "ingreso_externo":
      return {
        label: "APORTE EXTRA",
        color: "#06b6d4",
        background: "rgba(6, 182, 212, 0.08)",
        iconBg: "#06b6d4"
      };
    default:
      return {
        label: (action || "OTRO").toUpperCase(),
        color: "#6b7280",
        background: "rgba(107, 114, 128, 0.08)",
        iconBg: "#6b7280"
      };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoreAuditLog() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [selectedDate, setSelectedDate] = useState(getCurrentEcuadorDate());
  const [showFilter, setShowFilter] = useState(true); // Mostrar filtro por defecto

  const loadAuditLogs = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetchWithAuth('/api/audit-log');
      const data = await res.json();
      // Extraer metadata de cada log si existe
      const logsWithMeta = (Array.isArray(data.logs) ? data.logs : []).map(log => {
        let metadata = {};
        try {
          if (log.metadata) {
            metadata = typeof log.metadata === 'string' 
              ? JSON.parse(log.metadata) 
              : log.metadata;
          }
          if (log.new_values && typeof log.new_values === 'object') {
            metadata = { ...metadata, ...log.new_values };
          }
          if (log.old_values && typeof log.old_values === 'object') {
            metadata = { ...metadata, ...log.old_values };
          }
        } catch (e) {
          // Ignorar errores de parseo
        }
        return { ...log, metadata };
      });
      setLogs(logsWithMeta);
    } catch (error) {
      setLogs([]);
      setErr(error.message || 'Error al cargar auditoría.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar logs por fecha seleccionada (comparando solo la fecha, no la hora)
  useEffect(() => {
    if (!selectedDate) {
      setFilteredLogs(logs);
      return;
    }
    
    const filtered = logs.filter(log => {
      if (!log.created_at) return false;
      // Extraer solo la fecha del timestamp
      const logDateStr = extractDateFromTimestamp(log.created_at);
      return logDateStr === selectedDate;
    });
    
    // Ordenar por fecha descendente (más reciente primero)
    const sorted = [...filtered].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });
    
    setFilteredLogs(sorted);
  }, [logs, selectedDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAuditLogs();
    setRefreshing(false);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  useEffect(() => { loadAuditLogs(); }, []);

  const refreshButton = (
    <button 
      onClick={handleRefresh} 
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} /> 
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const filterButton = (
    <button 
      onClick={() => setShowFilter(!showFilter)} 
      className={`filter-toggle-btn ${showFilter ? 'active' : ''}`}
      title="Filtrar por fecha"
    >
      <FiCalendar size={16} />
      <span>Filtrar</span>
    </button>
  );

  return (
    <PageTemplate
      title="AUDITORÍA DEL NEGOCIO"
      subtitle="Registro completo de todas las acciones del sistema"
      theme="business"
      loading={loading}
      headerAction={
        <div className="audit-header-actions">
          {filterButton}
          {refreshButton}
        </div>
      }
    >
      {err && (
        <div className="alert alert-error">
          <FiAlertCircle size={16} /> {err}
        </div>
      )}

      {/* Filtro de fecha */}
      {showFilter && (
        <div className="audit-filter-bar">
          <div className="filter-content">
            <div className="filter-group">
              <label>
                <FiCalendar size={14} />
                fecha:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="filter-date-input"
              />
            </div>
            {selectedDate && (
              <button onClick={clearDateFilter} className="filter-clear-btn">
                <FiX size={14} /> Limpiar filtro
              </button>
            )}
          </div>
          <div className="filter-info">
            {selectedDate ? (
              <span className="filter-active">
                Mostrando auditoría del <strong>{formatDateForDisplay(selectedDate)}</strong>
              </span>
            ) : (
              <span className="filter-all">Mostrando toda la auditoría</span>
            )}
            <span className="filter-count">
              {filteredLogs.length} registro{filteredLogs.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      <div className="audit-grid">
        {filteredLogs.length === 0 && !loading ? (
          <div className="audit-empty">
            <FiFileText size={48} className="audit-empty-icon" />
            <span>
              {selectedDate 
                ? `No hay auditoría para mostrar el día ${formatDateForDisplay(selectedDate)}`
                : 'No hay auditoría para mostrar'}
            </span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const actionStyle = getActionStyle(log.action, log.metadata);
            const isExpense = (log.action || "").toLowerCase() === "drawer_expense" || 
                              (log.action || "").toLowerCase() === "gasto_operativo";
            const isIncome = (log.action || "").toLowerCase() === "ingreso_extra" ||
                             (log.action || "").toLowerCase() === "aporte_extra";
            
            let amount = "";
            if ((isExpense || isIncome) && log.new_values && typeof log.new_values === "object") {
              amount = formatMoney(log.new_values.amount);
            }

            return (
              <div 
                key={log.id || idx} 
                className="audit-card"
                style={{
                  borderTop: `3px solid ${actionStyle.color}`
                }}
              >
                <div className="audit-card-header">
                  <div 
                    className="audit-card-icon"
                    style={{ background: actionStyle.iconBg }}
                  >
                    {getActionIcon(log.action, log.metadata)}
                  </div>
                  <div className="audit-card-info">
                    <span 
                      className="audit-card-action"
                      style={{ color: actionStyle.color }}
                    >
                      {actionStyle.label}
                    </span>
                    <div className="audit-card-date">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString('es-EC', {
                            timeZone: 'America/Guayaquil',
                            hour12: false,
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        : "-"}
                    </div>
                  </div>
                </div>

                <div className="audit-card-user">
                  <User size={14} /> 
                  <span>{log.user_display_name || log.user_id || "Usuario desconocido"}</span>
                </div>

                <div className="audit-card-description">
                  <strong>Descripción:</strong> {log.description || "Sin descripción"}
                </div>

                {(isExpense || isIncome) && amount && (
                  <div className="audit-card-amount" style={{ color: actionStyle.color }}>
                    <FiDollarSign size={16} />
                    <span>Total:</span>
                    <strong>{amount}</strong>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </PageTemplate>
  );
}