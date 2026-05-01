import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { FiRefreshCw, FiDollarSign } from "react-icons/fi";
import { Shield, User } from "react-feather";
import { fetchWithAuth } from '../../config/apiBase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMoney(val) {
  return typeof val === "number"
    ? val.toLocaleString("en-US", { style: "currency", currency: "USD" })
    : val;
}

function formatDateEC(date) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString('es-EC', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return date;
  }
}

function actionLabelStyle(action) {
  switch ((action || "").toLowerCase()) {
    case "drawer_expense":
      return { label: "GASTOS OPERATIVOS", color: "#b45f06", background: "#fffaf0" };
    case "caja_abierta":
      return { label: "CAJA ABIERTA", color: "#1976d2", background: "#eaf3fa" };
    default:
      return { label: (action || "-").toUpperCase(), color: "#444", background: "#f6f6f8" };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CoreAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = '';

  const loadAuditLogs = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetchWithAuth('/api/audit-log');
      const data = await res.json();
      setLogs(Array.isArray(data.logs) ? data.logs : []);
    } catch (error) {
      setLogs([]);
      setErr(error.message || 'Error al cargar auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAuditLogs(); }, []);

  const headerAction = (
    <button onClick={loadAuditLogs} disabled={loading} style={{
      padding: '8px 12px',
      background: 'var(--color-primary)',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: loading ? 'not-allowed' : 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      opacity: loading ? 0.6 : 1
    }}>
      <FiRefreshCw size={14} className={loading ? 'spin' : ''} /> Actualizar
    </button>
  );

  return (
    <PageTemplate
      title="Auditoría del Negocio"
      subtitle="Registro completo de auditoría"
      theme="business"
      loading={loading}
      headerAction={headerAction}
    >
      {err && (
        <div style={{
          color: "#ef4444", margin: "12px 0 18px",
          padding: 10, background: "#ffe8e7", borderRadius: 6, fontWeight: 500
        }}>
          {err}
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(370px, 1fr))',
        gap: '18px 12px'
      }}>
        {logs.length === 0 && !loading
          ? <div style={{
              background: 'var(--color-card)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '30px',
              textAlign: 'center',
              gridColumn: '1/-1'
            }}>
              No hay auditoría para mostrar.
            </div>
          : logs.map((log, idx) => {
            const actionDetails = actionLabelStyle(log.action);
            const isExpense = (log.action || "").toLowerCase() === "drawer_expense";
            let amount = "";
            if (isExpense && log.new_values && typeof log.new_values === "object") {
              amount = formatMoney(log.new_values.amount);
            }
            return (
              <div key={log.id || idx} style={{
                background: actionDetails.background,
                border: `1.6px solid ${actionDetails.color}22`,
                borderRadius: '12px',
                padding: '22px 22px 15px',
                color: '#222',
                boxShadow: '0 1px 7px #4442',
                fontSize: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 3 }}>
                  <div style={{
                    width: 40, height: 40, background: actionDetails.color,
                    borderRadius: "50%", color: "white", display: "flex",
                    alignItems: "center", justifyContent: "center"
                  }}>
                    <Shield size={20} />
                  </div>
                  <div>
                    <span style={{
                      fontWeight: 900,
                      fontSize: 18,
                      color: actionDetails.color,
                      letterSpacing: 0.3
                    }}>
                      {actionDetails.label}
                    </span>
                    <div style={{ color: "#8793aa", fontSize: 14, fontWeight: 500 }}>
                      {formatDateEC(log.created_at)}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 15, marginBottom: 0 }}>
                  <b>Usuario:</b> <User size={13} style={{ verticalAlign: '-1px' }} /> {log.user_display_name || log.user_id || "-"}
                </div>
                <div style={{ fontSize: 15, color: "#373c6b", minHeight: 22, fontWeight: 600 }}>
                  <b>Descripción:</b> {log.description}
                </div>
                {isExpense && amount &&
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 900,
                    color: "#b45f06",
                    fontSize: 17,
                    margin: "7px 0 2px"
                  }}>
                    <FiDollarSign /> Total:
                    <span style={{color:"#c37e2c", fontWeight:900, marginLeft:3}}>{amount}</span>
                  </div>
                }
              </div>
            );
          })}
      </div>
    </PageTemplate>
  );
}