import React, { useEffect, useState, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/apiBase';
import '../../styles/PurchasesHistory.css';

export default function PurchasesHistory() {
  const [gastos, setGastos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [referenciaBusqueda, setReferenciaBusqueda] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [gastoEditando, setGastoEditando] = useState(null);
  
  // Form states
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [categoriaId, setCategoriaId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [referencia, setReferencia] = useState('');

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    cargarGastos();
    cargarCategorias();
  }, []);

  async function cargarGastos() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fechaDesde) params.append('date_from', fechaDesde);
      if (fechaHasta) params.append('date_to', fechaHasta);
      if (categoriaFiltro) params.append('category_id', categoriaFiltro);
      if (referenciaBusqueda) params.append('reference', referenciaBusqueda);
      
      const res = await fetchWithAuth(`/api/purchases/expenses?${params.toString()}`);
      const data = await res.json();
      setGastos(Array.isArray(data) ? data : data?.expenses ?? data?.data ?? []);
      setCurrentPage(1);
    } catch (err) {
      setError('Error al cargar gastos');
    } finally {
      setLoading(false);
    }
  }

  async function cargarCategorias() {
    try {
      const res = await fetchWithAuth('/api/purchases/categories');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : data?.categorias ?? data?.data ?? []);
    } catch (err) {
      setError('Error al cargar categorías');
    }
  }

  // ── CRUD Operations ────────────────────────────────────────────────────────
  async function crearGasto() {
    if (!fecha || !categoriaId || !monto || monto <= 0) {
      setError('Fecha, categoría y monto son requeridos');
      return;
    }

    try {
      setGuardando(true);
      const res = await fetchWithAuth('/api/purchases/expenses', {
        method: 'POST',
        body: JSON.stringify({
          date: fecha,
          category_id: categoriaId,
          description: descripcion,
          amount: parseFloat(monto),
          reference: referencia,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al registrar gasto');
      }

      setSuccess('✅ Gasto registrado exitosamente');
      setShowAddModal(false);
      resetForm();
      cargarGastos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Error al registrar gasto');
      setTimeout(() => setError(''), 3000);
    } finally {
      setGuardando(false);
    }
  }

  async function actualizarGasto() {
    if (!fecha || !categoriaId || !monto || monto <= 0) {
      setError('Fecha, categoría y monto son requeridos');
      return;
    }

    try {
      setGuardando(true);
      const res = await fetchWithAuth(`/api/purchases/expenses/${gastoEditando.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          date: fecha,
          category_id: categoriaId,
          description: descripcion,
          amount: parseFloat(monto),
          reference: referencia,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al actualizar gasto');
      }

      setSuccess('✅ Gasto actualizado exitosamente');
      setShowEditModal(false);
      resetForm();
      cargarGastos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Error al actualizar gasto');
      setTimeout(() => setError(''), 3000);
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarGasto(id, descripcion) {
    if (!window.confirm(`¿Eliminar gasto "${descripcion}"?`)) return;

    try {
      setGuardando(true);
      const res = await fetchWithAuth(`/api/purchases/expenses/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al eliminar gasto');
      }

      setSuccess('✅ Gasto eliminado exitosamente');
      cargarGastos();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Error al eliminar gasto');
      setTimeout(() => setError(''), 3000);
    } finally {
      setGuardando(false);
    }
  }

  function abrirEditar(gasto) {
    setGastoEditando(gasto);
    setFecha(gasto.date);
    setCategoriaId(gasto.category_id);
    setDescripcion(gasto.description || '');
    setMonto(gasto.amount.toString());
    setReferencia(gasto.reference || '');
    setShowEditModal(true);
  }

  function resetForm() {
    setFecha(new Date().toISOString().split('T')[0]);
    setCategoriaId('');
    setDescripcion('');
    setMonto('');
    setReferencia('');
    setGastoEditando(null);
  }

  function aplicarFiltros() {
    cargarGastos();
  }

  function limpiarFiltros() {
    setFechaDesde('');
    setFechaHasta('');
    setCategoriaFiltro('');
    setReferenciaBusqueda('');
    setTimeout(() => cargarGastos(), 100);
  }

  // ── Totales y paginación ───────────────────────────────────────────────────
  const totalGastos = useMemo(() => {
    return gastos.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
  }, [gastos]);

  const paginatedGastos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return gastos.slice(start, start + itemsPerPage);
  }, [gastos, currentPage]);

  const totalPages = Math.ceil(gastos.length / itemsPerPage);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageTemplate title="Historial de Compras" subtitle="Gestión de gastos y compras realizadas">
      <div className="purchases-history-shell">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Header con botón nuevo gasto */}
        <div className="history-header">
          <button 
            className="btn-primary"
            onClick={() => setShowAddModal(true)}
            disabled={guardando}
          >
            <i className="fas fa-plus"></i> Nuevo Gasto
          </button>
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div className="filter-group">
            <label>Fecha desde</label>
            <input 
              type="date" 
              value={fechaDesde} 
              onChange={e => setFechaDesde(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Fecha hasta</label>
            <input 
              type="date" 
              value={fechaHasta} 
              onChange={e => setFechaHasta(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Categoría</label>
            <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)}>
              <option value="">Todas</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Referencia</label>
            <input 
              type="text" 
              value={referenciaBusqueda} 
              onChange={e => setReferenciaBusqueda(e.target.value)}
              placeholder="Buscar por referencia..."
            />
          </div>
          <div className="filter-actions">
            <button className="btn-search" onClick={aplicarFiltros}>
              <i className="fas fa-search"></i> Buscar
            </button>
            <button className="btn-clear" onClick={limpiarFiltros}>
              <i className="fas fa-times"></i> Limpiar
            </button>
          </div>
        </div>

        {/* Resumen */}
        <div className="summary-card">
          <div className="summary-item">
            <span className="summary-label">Total Gastos:</span>
            <span className="summary-value">${totalGastos.toFixed(2)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Registros:</span>
            <span className="summary-value">{gastos.length}</span>
          </div>
        </div>

        {/* Tabla de gastos */}
        {loading ? (
          <div className="loading-spinner">Cargando gastos...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="expenses-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Descripción</th>
                    <th>Monto</th>
                    <th>Referencia</th>
                    <th>Registrado por</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGastos.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-table">
                        <i className="fas fa-receipt"></i>
                        <p>No hay gastos registrados</p>
                        <button className="btn-secondary" onClick={() => setShowAddModal(true)}>
                          Registrar primer gasto
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedGastos.map(gasto => (
                      <tr key={gasto.id}>
                        <td>{new Date(gasto.date).toLocaleDateString('es-ES')}</td>
                        <td>
                          <span 
                            className="category-badge"
                            style={{ backgroundColor: gasto.category_color || '#e8f5e9', color: gasto.category_color_dark || '#2e7d32' }}
                          >
                            {gasto.category_name}
                          </span>
                        </td>
                        <td>{gasto.description || '-'}</td>
                        <td className="amount">${(parseFloat(gasto.amount) || 0).toFixed(2)}</td>
                        <td>{gasto.reference || '-'}</td>
                        <td>{gasto.created_by_name || 'Sistema'}</td>
                        <td className="actions">
                          <button 
                            className="icon-btn edit" 
                            onClick={() => abrirEditar(gasto)}
                            disabled={guardando}
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button 
                            className="icon-btn delete" 
                            onClick={() => eliminarGasto(gasto.id, gasto.description || gasto.reference || 'gasto')}
                            disabled={guardando}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  className="page-btn" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i} 
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}

        {/* Modal Agregar Gasto */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Registrar Nuevo Gasto</h2>
                <button className="close-btn" onClick={() => setShowAddModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input 
                      type="date" 
                      value={fecha} 
                      onChange={e => setFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría *</label>
                    <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} required>
                      <option value="">Seleccionar categoría</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Descripción del gasto"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monto *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={monto} 
                      onChange={e => setMonto(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Referencia</label>
                    <input 
                      type="text" 
                      value={referencia} 
                      onChange={e => setReferencia(e.target.value)}
                      placeholder="Factura #, comprobante, etc."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={crearGasto} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Registrar Gasto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Editar Gasto */}
        {showEditModal && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Editar Gasto</h2>
                <button className="close-btn" onClick={() => setShowEditModal(false)}>&times;</button>
              </div>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha *</label>
                    <input 
                      type="date" 
                      value={fecha} 
                      onChange={e => setFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Categoría *</label>
                    <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} required>
                      <option value="">Seleccionar categoría</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    placeholder="Descripción del gasto"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monto *</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={monto} 
                      onChange={e => setMonto(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Referencia</label>
                    <input 
                      type="text" 
                      value={referencia} 
                      onChange={e => setReferencia(e.target.value)}
                      placeholder="Factura #, comprobante, etc."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={actualizarGasto} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Actualizar Gasto'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}