// src/admin/pages/global/ReportsGenerator.jsx
import React, { useState, useEffect } from 'react';
import {
  FiFileText, FiFile, FiDownload, FiTrash2, FiRefreshCw,
  FiCalendar, FiFilter, FiUsers, FiDollarSign, FiPackage,
  FiTrendingUp, FiPieChart, FiBarChart2, FiClock,
  FiEye, FiCheckCircle, FiAlertCircle
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { adminApi } from '../../config/api';

export default function ReportsGenerator() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedType, setSelectedType] = useState('revenue');
  const [reportConfig, setReportConfig] = useState({
    date_from: '',
    date_to: '',
    format: 'pdf',
    include_charts: true,
  });

  const reportTypes = [
    { id: 'revenue', name: 'Ingresos', icon: FiDollarSign, color: '#10b981' },
    { id: 'users', name: 'Usuarios', icon: FiUsers, color: '#3b82f6' },
    { id: 'modules', name: 'Módulos', icon: FiPackage, color: '#8b5cf6' },
    { id: 'businesses', name: 'Negocios', icon: FiTrendingUp, color: '#f59e0b' },
    { id: 'payments', name: 'Pagos', icon: FiFileText, color: '#ec4899' },
    { id: 'general', name: 'General', icon: FiPieChart, color: '#06b6d4' },
  ];

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await adminApi.get('/admin/reports');
      setReports(res.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar reportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await adminApi.post('/admin/reports/generate', {
        type: selectedType,
        ...reportConfig,
      });
      await fetchReports();
      alert('Reporte generado correctamente');
    } catch (err) {
      setError(err.message || 'Error al generar reporte');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      const res = await adminApi.get(`/admin/reports/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const filename = res.headers['content-disposition']?.split('filename=')[1] || `report_${id}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(err.message || 'Error al descargar reporte');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Eliminar este reporte?')) {
      try {
        await adminApi.delete(`/admin/reports/${id}`);
        fetchReports();
      } catch (err) {
        setError(err.message || 'Error al eliminar reporte');
      }
    }
  };

  const getFormatBadge = (format) => {
    const formats = {
      pdf: { color: '#ef4444', label: 'PDF' },
      excel: { color: '#10b981', label: 'Excel' },
      csv: { color: '#3b82f6', label: 'CSV' },
    };
    const f = formats[format] || formats.pdf;
    return (
      <span className={`report-format-badge ${format}`} style={{ background: `${f.color}20`, color: f.color }}>
        {f.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: { color: '#10b981', label: 'Completado', icon: FiCheckCircle },
      processing: { color: '#f59e0b', label: 'Procesando', icon: FiClock },
      failed: { color: '#ef4444', label: 'Fallido', icon: FiAlertCircle },
    };
    const badge = badges[status] || badges.completed;
    const Icon = badge.icon;
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: badge.color }}>
        <Icon size={12} className={status === 'processing' ? 'spinning' : ''} /> {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <PageTemplate title="REPORTES" subtitle="Generación y análisis de reportes" loading={true}>
        <div className="admin-loading">Cargando reportes...</div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate
      title="REPORTES"
      subtitle="Generación y análisis de reportes"
      theme="admin"
      headerAction={
        <button onClick={handleRefresh} className="dashboard-refresh-btn-header" disabled={refreshing}>
          <FiRefreshCw size={18} className={refreshing ? 'spinning' : ''} />
          <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
        </button>
      }
    >
      <div className="reports-container">
        {/* Tipos de reportes */}
        <div className="reports-types-grid">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const isActive = selectedType === type.id;
            return (
              <div
                key={type.id}
                className={`report-type-card ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedType(type.id)}
              >
                <div className="report-type-icon" style={{ color: type.color }}>
                  <Icon size={28} />
                </div>
                <div className="report-type-name">{type.name}</div>
                <div className="report-type-desc">Reporte de {type.name.toLowerCase()}</div>
              </div>
            );
          })}
        </div>

        {/* Configuración de reporte */}
        <div className="report-config">
          <h3>Configuración de reporte</h3>
          <div className="report-config-grid">
            <div className="report-config-item">
              <label>Desde</label>
              <input
                type="date"
                value={reportConfig.date_from}
                onChange={(e) => setReportConfig({ ...reportConfig, date_from: e.target.value })}
              />
            </div>
            <div className="report-config-item">
              <label>Hasta</label>
              <input
                type="date"
                value={reportConfig.date_to}
                onChange={(e) => setReportConfig({ ...reportConfig, date_to: e.target.value })}
              />
            </div>
            <div className="report-config-item">
              <label>Formato</label>
              <select
                value={reportConfig.format}
                onChange={(e) => setReportConfig({ ...reportConfig, format: e.target.value })}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div className="report-config-item">
              <label>Incluir gráficos</label>
              <select
                value={reportConfig.include_charts ? 'yes' : 'no'}
                onChange={(e) => setReportConfig({ ...reportConfig, include_charts: e.target.value === 'yes' })}
              >
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="report-config-actions">
            <button 
              className="backup-action-btn primary" 
              onClick={handleGenerate}
              disabled={generating}
            >
              <FiFileText size={18} className={generating ? 'spinning' : ''} />
              {generating ? 'Generando...' : 'Generar reporte'}
            </button>
          </div>
        </div>

        {/* Historial de reportes */}
        <div className="reports-history">
          <div className="reports-history-header">
            <h3>Historial de reportes</h3>
            <span className="report-count">{reports.length} reportes</span>
          </div>
          {reports.length === 0 ? (
            <div className="reports-empty-state">
              <FiFile size={48} color="#444" />
              <p>No hay reportes generados</p>
            </div>
          ) : (
            <div className="reports-history-table">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Formato</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FiFile size={16} color="#888" />
                          <span>{report.name || `Reporte ${report.id}`}</span>
                        </div>
                      </td>
                      <td>
                        {reportTypes.find(t => t.id === report.type)?.name || report.type}
                      </td>
                      <td>{getFormatBadge(report.format)}</td>
                      <td>{new Date(report.created_at).toLocaleString()}</td>
                      <td>{getStatusBadge(report.status)}</td>
                      <td>
                        <div className="admin-actions-cell">
                          {report.status === 'completed' && (
                            <button 
                              className="report-action-icon download"
                              onClick={() => handleDownload(report.id)}
                              title="Descargar"
                            >
                              <FiDownload size={16} />
                            </button>
                          )}
                          <button 
                            className="report-action-icon delete"
                            onClick={() => handleDelete(report.id)}
                            title="Eliminar"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageTemplate>
  );
}