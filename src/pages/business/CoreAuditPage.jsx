import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useSession } from '../../context/SessionContext';
import {
  FiRefreshCw,
  FiX,
  FiFileText,
  FiAlertCircle,
  FiDollarSign,
  FiSunrise, 
  FiSun, 
  FiLock,
  FiMinusCircle,
  FiPlusCircle,
  FiTrendingUp,
  FiUsers,
  FiTrash2,
  FiEdit2,
  FiEye,
  FiInfo,
  FiUser,
  FiCalendar,
  FiHash,
  FiList,
  FiArrowRight,
  FiCheckCircle,
  FiXCircle,
  FiShield
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { ButtonGroup, IconTextButton } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';

// ─── HELPERS GENÉRICOS ──────────────────────────────────────────────────

function formatMoney(val) {
  return typeof val === 'number'
    ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : val;
}

function getCurrentEcuadorDate() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Guayaquil',
  });
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function extractDateFromTimestamp(timestamp) {
  if (!timestamp) return null;
  const d = new Date(timestamp);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' });
}

function formatTimestamp(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    hour12: false,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ─── DETECCIÓN DE TIPO DE DATOS ──────────────────────────────────────

function isUUID(value) {
  if (!value) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(String(value));
}

function isDate(value) {
  if (!value) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}/;
  return dateRegex.test(String(value));
}

function isMoney(value) {
  return typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value));
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isArray(value) {
  return Array.isArray(value);
}

// ─── VERIFICAR SI UN VALOR ES VÁLIDO PARA MOSTRAR ────────────────────

function isValidValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && (value === '' || value === 'unknown' || value === 'Unknown' || value === 'Desconocido' || value === 'Obteniendo IP...')) return false;
  if (typeof value === 'string' && value === '[]') return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (typeof value === 'object' && Object.keys(value).length === 0) return false;
  return true;
}

// ─── OBTENER NOMBRE LEGIBLE DE CAMPO ──────────────────────────────────

function getFieldLabel(key) {
  const labels = {
    id: 'ID',
    first_name: 'Nombre',
    last_name: 'Apellido',
    email: 'Email',
    role_id: 'Rol',
    is_active: 'Estado',
    name: 'Nombre',
    description: 'Descripción',
    price: 'Precio',
    stock: 'Stock',
    phone: 'Teléfono',
    address: 'Dirección',
    document_type: 'Tipo Documento',
    document_number: 'N° Documento',
    user_id: 'Usuario',
    table_name: 'Tabla',
    action: 'Acción',
    record_id: 'ID Registro',
    created_at: 'Fecha Creación',
    updated_at: 'Fecha Actualización',
    metadata: 'Metadatos',
    permissions: 'Permisos',
    modulo: 'Módulo',
    features: 'Funcionalidades',
    category_id: 'Categoría',
    product_id: 'Producto',
    supplier_id: 'Proveedor',
    client_id: 'Cliente',
    business_id: 'Negocio',
    module: 'Módulo',
    page: 'Página',
    path: 'Ruta',
    user_agent: 'Navegador',
    ip: 'IP',
    timestamp: 'Fecha/Hora',
    reason: 'Motivo',
    user_email: 'Email Usuario',
    user_name: 'Nombre Usuario',
    attempted_path: 'Ruta Intentada',
    total_system: 'Total Sistema',
    total_counted: 'Total Contado',
    diff_total: 'Diferencia',
    cash_counted: 'Efectivo Contado',
    card_counted: 'Tarjeta Contada',
    transfer_counted: 'Transferencia Contada',
    tip_counted: 'Propina Contada',
    orders_system: 'Órdenes Sistema',
    total_efectivo: 'Total Efectivo',
    monto_banca: 'Monto Banca',
    total_inicial: 'Total Inicial',
    observaciones: 'Observaciones',
    fecha_apertura: 'Fecha Apertura',
    efectivo_inicial: 'Efectivo Inicial',
    banca_inicial: 'Banca Inicial',
    denominaciones: 'Denominaciones',
    session_id: 'ID Sesión',
    session_start: 'Inicio Sesión',
    full_url: 'URL Completa',
    screen_resolution: 'Resolución',
    language: 'Idioma',
    referrer: 'Referer',
    timestamp_local: 'Fecha/Hora Local',
    page_load_time: 'Tiempo Carga',
    browser: 'Navegador',
    os: 'Sistema Operativo',
    device: 'Dispositivo',
    user_lastname: 'Apellido',
    user_role: 'Rol',
    user_phone: 'Teléfono',
    ip_address: 'IP',
  };
  
  if (labels[key]) return labels[key];
  
  return key
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── DETECCIÓN DE ACCIÓN ──────────────────────────────────────────────

function getActionStyle(action) {
  const actionLower = (action || '').toLowerCase();

  const actionMap = {
    'insert': { label: 'CREACIÓN', color: '#10b981', icon: <FiPlusCircle size={14} /> },
    'update': { label: 'MODIFICACIÓN', color: '#3b82f6', icon: <FiEdit2 size={14} /> },
    'delete': { label: 'ELIMINACIÓN', color: '#ef4444', icon: <FiTrash2 size={14} /> },
    'eliminación': { label: 'ELIMINACIÓN', color: '#ef4444', icon: <FiTrash2 size={14} /> },
    'eliminacion': { label: 'ELIMINACIÓN', color: '#ef4444', icon: <FiTrash2 size={14} /> },
    'access_denied': { label: 'ACCESO DENEGADO', color: '#ef4444', icon: <FiShield size={14} /> },
    'apertura_caja': { label: 'APERTURA DE CAJA', color: '#10b981', icon: <FiSunrise size={14} /> },
    'a_caja': { label: 'APERTURA DE CAJA', color: '#10b981', icon: <FiSunrise size={14} /> },
    'caja_abierta': { label: 'CAJA ABIERTA', color: '#f59e0b', icon: <FiSun size={14} /> },
    'cierre_caja': { label: 'CIERRE DE CAJA', color: '#3b82f6', icon: <FiLock size={14} /> },
    'c_business': { label: 'CIERRE DE NEGOCIO', color: '#3b82f6', icon: <FiLock size={14} /> },
    'c_caja': { label: 'CIERRE DE CAJA', color: '#3b82f6', icon: <FiLock size={14} /> },
    'ingreso_extra': { label: 'INGRESO EXTRA', color: '#8b5cf6', icon: <FiPlusCircle size={14} /> },
    'income_extra': { label: 'INGRESO EXTRA', color: '#8b5cf6', icon: <FiPlusCircle size={14} /> },
    'aporte_extra': { label: 'APORTE EXTRA', color: '#06b6d4', icon: <FiDollarSign size={14} /> },
    'payroll_payment': { label: 'PAGO DE NÓMINA', color: '#10b981', icon: <FiUsers size={14} /> },
    'pago_nomina': { label: 'PAGO DE NÓMINA', color: '#10b981', icon: <FiUsers size={14} /> },
    'compra': { label: 'COMPRA', color: '#f59e0b', icon: <FiTrendingUp size={14} /> },
    'purchase': { label: 'COMPRA', color: '#f59e0b', icon: <FiTrendingUp size={14} /> },
    'drawer_expense': { label: 'GASTO OPERATIVO', color: '#dc2626', icon: <FiMinusCircle size={14} /> },
    'gasto_operativo': { label: 'GASTO OPERATIVO', color: '#dc2626', icon: <FiMinusCircle size={14} /> },
    'security': { label: 'SEGURIDAD', color: '#ef4444', icon: <FiShield size={14} /> },
    'login': { label: 'INICIO SESIÓN', color: '#10b981', icon: <FiUser size={14} /> },
    'logout': { label: 'CIERRE SESIÓN', color: '#f59e0b', icon: <FiUser size={14} /> },
  };

  if (actionMap[actionLower]) {
    return {
      ...actionMap[actionLower],
      background: `${actionMap[actionLower].color}15`,
    };
  }

  return {
    label: (action || 'OTRO').toUpperCase(),
    color: '#6b7280',
    icon: <FiFileText size={14} />,
    background: 'rgba(107, 114, 128, 0.08)',
  };
}

// ─── RENDERIZADO GENÉRICO DE VALORES ──────────────────────────────────

function renderValue(value, key = '') {
  if (!isValidValue(value)) {
    return <span className="audit-value-null">—</span>;
  }

  if (isBoolean(value)) {
    if (key === 'is_active' || key === 'active' || key === 'enabled' || key === 'status') {
      return value ? (
        <span className="audit-value-badge audit-value-active">
          <FiCheckCircle size={14} /> {key === 'is_active' ? 'Activo' : 'Sí'}
        </span>
      ) : (
        <span className="audit-value-badge audit-value-inactive">
          <FiXCircle size={14} /> {key === 'is_active' ? 'Inactivo' : 'No'}
        </span>
      );
    }
    return value ? (
      <span className="audit-value-badge audit-value-true">
        <FiCheckCircle size={14} /> Sí
      </span>
    ) : (
      <span className="audit-value-badge audit-value-false">
        <FiXCircle size={14} /> No
      </span>
    );
  }

  if (typeof value === 'string' && isUUID(value)) {
    return <span className="audit-value-uuid">
      {value.slice(0, 8)}…{value.slice(-4)}
    </span>;
  }

  if (typeof value === 'string' && isDate(value)) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return <span>{d.toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil' })}</span>;
      }
    } catch { /* ignore */ }
  }

  if (isMoney(value) && typeof value === 'number') {
    return <span className="audit-money">{formatMoney(value)}</span>;
  }

  if (isArray(value)) {
    if (value.length === 0) return <span className="audit-value-null">[]</span>;
    
    if (value.every(v => typeof v === 'string' || typeof v === 'number')) {
      return (
        <div className="audit-tags">
          {value.map((v, i) => (
            <span key={i} className="audit-tag">
              {String(v)}
            </span>
          ))}
        </div>
      );
    }

    if (value.length > 0 && (value[0].modulo || value[0].module)) {
      return renderPermissions(value);
    }

    return (
      <pre className="audit-value-json">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (isObject(value)) {
    if (value.modulo || value.module) {
      return renderPermissions([value]);
    }
    
    const entries = Object.entries(value).filter(([_, v]) => isValidValue(v));
    if (entries.length === 0) return <span className="audit-value-null">—</span>;
    
    return (
      <pre className="audit-value-json">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === 'string' && value.length > 100) {
    return <span title={value}>{value.slice(0, 100)}…</span>;
  }

  return String(value);
}

// ─── RENDERIZADO DE PERMISOS ──────────────────────────────────────────

function renderPermissions(permissions) {
  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return <span className="audit-value-null">Sin permisos</span>;
  }

  return (
    <div className="audit-permissions-container">
      {permissions.map((perm, idx) => {
        const moduleName = perm.modulo || perm.module || 'Módulo';
        const features = perm.features || perm.funcionalidades || [];
        
        return (
          <div key={idx} className="audit-permission-item">
            <div className="audit-permission-module">
              📦 {moduleName}
            </div>
            {features && features.length > 0 && (
              <div className="audit-permission-features">
                {features.map((feature, fIdx) => (
                  <span key={fIdx} className="audit-permission-feature">
                    {feature}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── FILTRAR CAMPOS VÁLIDOS ──────────────────────────────────────────

function filterValidFields(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isValidValue(value)) {
      result[key] = value;
    }
  }
  return result;
}

// ─── COMPONENTE DE DETALLE ─────────────────────────────────────────────

function AuditDetailModal({ log, onClose }) {
  if (!log) return null;

  const actionStyle = getActionStyle(log.action);
  const isUpdate = log.action?.toLowerCase() === 'update';
  const isDelete = log.action?.toLowerCase() === 'delete' || 
                   log.action?.toLowerCase() === 'eliminación' || 
                   log.action?.toLowerCase() === 'eliminacion';
  const isAccessDenied = log.action?.toLowerCase() === 'access_denied' || 
                         log.action?.toLowerCase() === 'security';
  const isAperturaCaja = log.action?.toLowerCase() === 'apertura_caja' || 
                         log.action?.toLowerCase() === 'a_caja';
  const isCierreCaja = log.action?.toLowerCase() === 'cierre_caja' || 
                       log.action?.toLowerCase() === 'c_caja' ||
                       log.action?.toLowerCase() === 'c_business';
  
  const newValues = log.new_values || {};
  const oldValues = log.old_values || {};

  // ─── FILTRAR CAMPOS VÁLIDOS ──────────────────────────────────────────
  const validNewValues = filterValidFields(newValues);
  const validOldValues = filterValidFields(oldValues);

  // ─── DETECTAR CAMPOS QUE CAMBIARON ──────────────────────────────────
  const changedKeys = Object.keys(validOldValues).filter(key => {
    const oldVal = validOldValues[key];
    const newVal = validNewValues[key];
    if (oldVal === undefined && newVal === undefined) return false;
    if (oldVal === null && newVal === null) return false;
    if (oldVal === undefined || oldVal === null) return true;
    if (newVal === undefined || newVal === null) return true;
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  });

  const excludeKeys = ['id', 'record_id', 'permissions_raw'];
  const displayChangedKeys = changedKeys.filter(key => !excludeKeys.includes(key));

  const newOnlyKeys = Object.keys(validNewValues).filter(
    key => !(key in validOldValues) && !changedKeys.includes(key) && !excludeKeys.includes(key)
  );
  const oldOnlyKeys = Object.keys(validOldValues).filter(
    key => !(key in validNewValues) && !changedKeys.includes(key) && !excludeKeys.includes(key)
  );

  // ─── RENDER CONTENIDO ESPECÍFICO ─────────────────────────────────────

  const renderSpecificContent = () => {
    // CASO: ACCESO DENEGADO
    if (isAccessDenied) {
      const displayFields = Object.entries(validNewValues)
        .filter(([key]) => !excludeKeys.includes(key));

      if (displayFields.length === 0) {
        return (
          <div className="audit-access-denied">
            <div className="audit-access-denied-banner">
              <FiShield size={24} />
              <div>
                <strong>Intento de Acceso Denegado</strong>
                <span>No hay información adicional disponible</span>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="audit-access-denied">
          <div className="audit-access-denied-banner">
            <FiShield size={24} />
            <div>
              <strong>Intento de Acceso Denegado</strong>
              <span>El usuario intentó acceder sin permisos suficientes</span>
            </div>
          </div>
          <div className="audit-detail-grid">
            {displayFields.map(([key, value]) => (
              <div key={key} className="audit-detail-card">
                <div className="audit-detail-label">{getFieldLabel(key)}</div>
                <div className="audit-detail-value">{renderValue(value, key)}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // CASO: APERTURA DE CAJA
    if (isAperturaCaja) {
      const fields = [
        { label: 'Usuario', value: validNewValues.usuario || log.user_display_name },
        { label: 'Fecha Apertura', value: validNewValues.fecha_apertura },
        { label: 'Efectivo Inicial', value: validNewValues.efectivo_inicial },
        { label: 'Banca Inicial', value: validNewValues.banca_inicial },
        { label: 'Total Inicial', value: validNewValues.total_inicial },
        { label: 'Observaciones', value: validNewValues.observaciones || 'Sin observaciones' },
      ].filter(f => isValidValue(f.value));

      if (fields.length === 0) {
        return <div className="audit-value-null">No hay datos disponibles</div>;
      }

      return (
        <div className="audit-detail-grid">
          {fields.map((field, idx) => (
            <div key={idx} className="audit-detail-card">
              <div className="audit-detail-label">{field.label}</div>
              <div className="audit-detail-value">{renderValue(field.value)}</div>
            </div>
          ))}
        </div>
      );
    }

    // CASO: CIERRE DE CAJA
    if (isCierreCaja) {
      const fields = [
        { label: 'Usuario', value: validNewValues.usuario || log.user_display_name },
        { label: 'Fecha', value: validNewValues.date },
        { label: 'Total Sistema', value: validNewValues.total_system },
        { label: 'Total Contado', value: validNewValues.total_counted },
        { label: 'Diferencia', value: validNewValues.diff_total },
        { label: 'Efectivo Contado', value: validNewValues.cash_counted },
        { label: 'Tarjeta Contada', value: validNewValues.card_counted },
        { label: 'Transferencia', value: validNewValues.transfer_counted },
        { label: 'Propinas', value: validNewValues.tip_counted },
        { label: 'Observaciones', value: validNewValues.remarks || 'Sin observaciones' },
      ].filter(f => isValidValue(f.value));

      if (fields.length === 0) {
        return <div className="audit-value-null">No hay datos disponibles</div>;
      }

      return (
        <div className="audit-detail-grid">
          {fields.map((field, idx) => (
            <div key={idx} className="audit-detail-card">
              <div className="audit-detail-label">{field.label}</div>
              <div className="audit-detail-value">{renderValue(field.value)}</div>
            </div>
          ))}
        </div>
      );
    }

    // CASO: MODIFICACIÓN
    if (isUpdate) {
      const hasChanges = displayChangedKeys.length > 0 || newOnlyKeys.length > 0 || oldOnlyKeys.length > 0;
      
      if (!hasChanges) {
        return (
          <div className="audit-update-content">
            <div className="audit-summary">
              <span className="audit-summary-label">No se detectaron cambios significativos</span>
            </div>
          </div>
        );
      }

      return (
        <div className="audit-update-content">
          {/* Resumen */}
          <div className="audit-summary">
            <span className="audit-summary-label">Campos modificados:</span>
            <span className="audit-summary-count">{displayChangedKeys.length}</span>
            <div className="audit-summary-tags">
              {displayChangedKeys.map(key => (
                <span key={key} className="audit-summary-tag">
                  {getFieldLabel(key)}
                </span>
              ))}
            </div>
          </div>

          {/* Cambios */}
          {displayChangedKeys.length > 0 && (
            <div className="audit-changes">
              <div className="audit-changes-header">
                <FiEdit2 size={14} /> Cambios realizados
              </div>
              <div className="audit-changes-list">
                {displayChangedKeys.map(key => (
                  <div key={key} className="audit-change-item">
                    <div className="audit-change-field">{getFieldLabel(key)}</div>
                    <div className="audit-change-old">
                      <span className="audit-change-label">Antes:</span>
                      {renderValue(validOldValues[key], key)}
                    </div>
                    <div className="audit-change-arrow">
                      <FiArrowRight size={18} />
                    </div>
                    <div className="audit-change-new">
                      <span className="audit-change-label">Ahora:</span>
                      {renderValue(validNewValues[key], key)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nuevos campos */}
          {newOnlyKeys.length > 0 && (
            <div className="audit-new-fields">
              <div className="audit-new-fields-header">
                <FiPlusCircle size={14} /> Nuevos campos agregados
              </div>
              <div className="audit-fields-grid">
                {newOnlyKeys.map(key => (
                  <div key={key} className="audit-field-item">
                    <span className="audit-field-label">{getFieldLabel(key)}</span>
                    <span className="audit-field-value">{renderValue(validNewValues[key], key)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campos eliminados */}
          {oldOnlyKeys.length > 0 && (
            <div className="audit-deleted-fields">
              <div className="audit-deleted-fields-header">
                <FiTrash2 size={14} /> Campos eliminados
              </div>
              <div className="audit-fields-grid">
                {oldOnlyKeys.map(key => (
                  <div key={key} className="audit-field-item">
                    <span className="audit-field-label">{getFieldLabel(key)}</span>
                    <span className="audit-field-value">{renderValue(validOldValues[key], key)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Todos los valores actuales */}
          {Object.keys(validNewValues).length > 0 && (
            <details className="audit-details-all">
              <summary className="audit-details-all-summary">
                <FiList size={14} /> Ver todos los valores actuales
              </summary>
              <div className="audit-fields-grid">
                {Object.entries(validNewValues).map(([key, value]) => (
                  <div key={key} className="audit-field-item">
                    <span className="audit-field-label">{getFieldLabel(key)}</span>
                    <span className="audit-field-value">{renderValue(value, key)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      );
    }

    // CASO: ELIMINACIÓN
    if (isDelete) {
      const validDeleteData = Object.entries(validOldValues)
        .filter(([key]) => !excludeKeys.includes(key));

      return (
        <div className="audit-delete-content">
          <div className="audit-deleted-banner">
            <FiTrash2 size={20} /> Registro Eliminado
          </div>
          {validDeleteData.length > 0 && (
            <div className="audit-deleted-data">
              <div className="audit-deleted-data-header">Datos Eliminados</div>
              <div className="audit-fields-grid">
                {validDeleteData.map(([key, value]) => (
                  <div key={key} className="audit-field-item">
                    <span className="audit-field-label">{getFieldLabel(key)}</span>
                    <span className="audit-field-value">{renderValue(value, key)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // CASO: OTROS (CREACIÓN, ETC)
    const validData = Object.entries(validNewValues)
      .filter(([key]) => !excludeKeys.includes(key));

    if (validData.length === 0) {
      return <div className="audit-value-null">No hay datos disponibles</div>;
    }

    return (
      <div className="audit-other-content">
        <div className="audit-data-section">
          <div className="audit-data-section-header">Datos</div>
          <div className="audit-fields-grid">
            {validData.map(([key, value]) => (
              <div key={key} className="audit-field-item">
                <span className="audit-field-label">{getFieldLabel(key)}</span>
                <span className="audit-field-value">{renderValue(value, key)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── RENDER ──────────────────────────────────────────────────────────
  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={
        <div className="audit-modal-title">
          <span className="audit-modal-badge" style={{ 
            background: actionStyle.background, 
            color: actionStyle.color 
          }}>
            {actionStyle.icon} {actionStyle.label}
          </span>
        </div>
      }
      size="lg"
      footer={
        <ButtonGroup>
          <IconTextButton
            variant=""
            size="md"
            icon={<FiX size={14} />}
            onClick={onClose}
          >
            Cerrar
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <div className="audit-modal-body">
        {/* ─── INFORMACIÓN DEL REGISTRO ─── */}
        <div className="audit-info-grid">
          <div>
            <div className="audit-info-label">
              <FiCalendar size={12} /> Fecha/Hora
            </div>
            <div className="audit-info-value">{formatTimestamp(log.created_at)}</div>
          </div>
          <div>
            <div className="audit-info-label">
              <FiUser size={12} /> Usuario
            </div>
            <div className="audit-info-value">{log.user_display_name || log.user_id || 'Desconocido'}</div>
          </div>
          <div>
            <div className="audit-info-label">
              <FiHash size={12} /> Tabla
            </div>
            <div className="audit-info-value">{log.table_name || 'N/A'}</div>
          </div>
        </div>

        {/* ─── DESCRIPCIÓN ─── */}
        <div className="audit-description">
          <div className="audit-description-label">
            <FiInfo size={12} /> Descripción
          </div>
          <div className="audit-description-text">{log.description || 'Sin descripción'}</div>
        </div>

        {/* ─── CONTENIDO ESPECÍFICO ─── */}
        {renderSpecificContent()}
      </div>
    </Modal>
  );
}

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────

export default function CoreAuditLog() {
  const { user } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [selectedDate, setSelectedDate] = useState(getCurrentEcuadorDate());
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await fetchWithAuth('/audit-log');
      const data = await res.json();
      const logsWithMeta = (Array.isArray(data.logs) ? data.logs : []).map((log) => {
        let metadata = {};
        try {
          if (log.metadata) {
            metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          }
          if (log.new_values && typeof log.new_values === 'object') {
            metadata = { ...metadata, ...log.new_values };
          }
          if (log.old_values && typeof log.old_values === 'object') {
            metadata = { ...metadata, ...log.old_values };
          }
        } catch (_) {
          // ignore
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
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const filteredData = useMemo(() => {
    if (!selectedDate) return logs;
    return logs.filter((log) => {
      if (!log.created_at) return false;
      const logDateStr = extractDateFromTimestamp(log.created_at);
      return logDateStr === selectedDate;
    });
  }, [logs, selectedDate]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });
  }, [filteredData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAuditLogs();
    setRefreshing(false);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  const handleViewDetail = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const columns = [
    {
      accessor: 'created_at',
      label: 'Fecha/Hora',
      width: 'medium',
      render: (item) => {
        return <span className="audit-date">{formatTimestamp(item.created_at)}</span>;
      },
    },
    {
      accessor: 'user_display_name',
      label: 'Usuario',
      render: (item) => (
        <div className="audit-actor">
          <FiUser size={14} className="audit-actor-icon" />
          <span>{item.user_display_name || item.user_id || 'Desconocido'}</span>
        </div>
      ),
    },
    {
      accessor: 'action',
      label: 'Acción',
      render: (item) => {
        const style = getActionStyle(item.action);
        return (
          <span className="audit-action" style={{ color: style.color }}>
            {style.icon}
            {style.label}
          </span>
        );
      },
    },
    {
      accessor: 'description',
      label: 'Descripción',
      render: (item) => (
        <span className="audit-description-text">
          {item.description || 'Sin descripción'}
        </span>
      ),
    },
    {
      accessor: 'actions',
      label: '',
      align: 'center',
      width: 'small',
      render: (item) => (
        <IconTextButton
          variant="blue"
          size="sm"
          inline={true}
          icon={<FiEye size={14} />}
          onClick={() => handleViewDetail(item)}
          title="Ver detalle"
        >
          Ver detalle
        </IconTextButton>
      ),
    },
  ];

  const toolbar = (
    <div className="audit-toolbar">
      <div className="audit-filter">
        <Input
          variant="date"  
          type="date"
          value={selectedDate}
          onChange={setSelectedDate}
          size="md"
          placeholder="Filtrar por fecha"
        />
        {selectedDate && (
          <button
            onClick={clearDateFilter}
            className="audit-filter-clear"
            title="Limpiar filtro"
          >
            <FiX size={16} />
          </button>
        )}
      </div>
    </div>
  );

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

  return (
    <>
      <PageTemplate
        title="AUDITORÍA DEL NEGOCIO"
        subtitle="Registro completo de todas las acciones del sistema"
        theme="business"
        loading={loading}
        headerAction={refreshButton}
      >
        {err && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {err}
          </div>
        )}

        <div className="audit-table-wrapper">
          <Table
            data={sortedData}
            columns={columns}
            keyField="id"
            title="Registros de auditoría"
            subtitle={`${sortedData.length} ${
              sortedData.length === 1 ? 'registro' : 'registros'
            } encontrados`}
            toolbar={toolbar}
            searchable={true}
            searchPlaceholder="Ej: usuario o acción..."
            searchFields={['user_display_name', 'action', 'description']}
            pagination={true}
            itemsPerPage={itemsPerPage}
            itemsPerPageOptions={[10, 15]}
            onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
            loading={loading}
            emptyMessage={
              selectedDate
                ? `No hay auditoría para el día ${formatDateForDisplay(selectedDate)}`
                : 'No hay registros de auditoría'
            }
            striped
            hoverable
            bordered={false}
            compact={false}
          />
        </div>
      </PageTemplate>

      {showDetailModal && (
        <AuditDetailModal
          log={selectedLog}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </>
  );
}