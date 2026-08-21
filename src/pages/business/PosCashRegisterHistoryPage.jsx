import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useSession } from '../../context/SessionContext';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import CustomCombobox from '../../components/General/CustomCombobox';
import {
  FiRefreshCw,
  FiX,
  FiAlertCircle,
  FiLock,
  FiUnlock,
  FiUser,
  FiMail,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUsers,
  FiCalendar
} from 'react-icons/fi';

// ─── Helpers ──────────────────────────────────────────────────────────────

const money = (val) => {
  const num = Number(val);
  return isNaN(num) ? '$0.00' : num.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateOnly = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('es-EC', {
    timeZone: 'America/Guayaquil',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Opciones de filtro por fecha ──────────────────────────────────────────

const dateFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
];

// ─── Componente principal ──────────────────────────────────────────────────

export default function CashRegisterAuditPage() {
  const { user } = useSession();
  
  // ── Obtener businessId de sessionStorage (igual que en BusinessLayout) ──
  const getBusinessId = useCallback(() => {
    try {
      const fromSession = sessionStorage.getItem('business_id');
      if (fromSession) {
        return fromSession;
      }
      if (user?.businessId) {
        return user.businessId;
      }
      return null;
    } catch {
      return null;
    }
  }, [user]);

  // ── Estados ──
  const [activeTab, setActiveTab] = useState('cards');
  const [openings, setOpenings] = useState([]);
  const [closings, setClosings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Filtros para tablas
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [filterUser, setFilterUser] = useState('');
  
  // Filtros para tarjetas
  const [cardDateFilter, setCardDateFilter] = useState('today');
  const [cardShowCustomDate, setCardShowCustomDate] = useState(false);
  const [cardCustomStartDate, setCardCustomStartDate] = useState('');
  const [cardCustomEndDate, setCardCustomEndDate] = useState('');
  const [cardFilterUser, setCardFilterUser] = useState('');
  
  // Paginación
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Helper: Filtro por fecha ────────────────────────────────────────────

  const getDateFilter = (dateStr, filter, startDate, endDate) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'today':
        return date.toDateString() === today.toDateString();
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        return date >= weekStart;
      }
      case 'month': {
        return date.getMonth() === today.getMonth() && 
               date.getFullYear() === today.getFullYear();
      }
      case 'custom': {
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          return date >= start && date <= end;
        }
        return true;
      }
      default:
        return true;
    }
  };

  // ── Cargar datos ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const businessId = getBusinessId();
    if (!businessId) {
      setOpenings([]);
      setClosings([]);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const [openingsRes, closingsRes] = await Promise.all([
        fetchWithAuth(`/pos/cash-register/audit/openings?businessId=${businessId}`),
        fetchWithAuth(`/pos/cash-register/audit/closings?businessId=${businessId}`)
      ]);

      if (openingsRes.ok) {
        const data = await openingsRes.json();
        setOpenings(Array.isArray(data) ? data : []);
      } else {
        setOpenings([]);
      }

      if (closingsRes.ok) {
        const data = await closingsRes.json();
        setClosings(Array.isArray(data) ? data : []);
      } else {
        setClosings([]);
      }

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los datos de auditoría');
      setOpenings([]);
      setClosings([]);
    } finally {
      setLoading(false);
    }
  }, [getBusinessId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filtros para aperturas (Tabla) ──────────────────────────────────────────

  const filteredOpenings = useMemo(() => {
    let result = openings;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(o =>
        o.user_name?.toLowerCase().includes(term) ||
        o.user_id?.toLowerCase().includes(term) ||
        o.user_email?.toLowerCase().includes(term) ||
        o.observaciones?.toLowerCase().includes(term)
      );
    }
    
    if (dateFilter !== 'all') {
      result = result.filter(o => 
        getDateFilter(o.date || o.created_at, dateFilter, customStartDate, customEndDate)
      );
    }
    
    if (filterUser.trim()) {
      const term = filterUser.toLowerCase();
      result = result.filter(o =>
        o.user_name?.toLowerCase().includes(term) ||
        o.user_id?.toLowerCase().includes(term) ||
        o.user_email?.toLowerCase().includes(term)
      );
    }
    
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [openings, searchTerm, dateFilter, customStartDate, customEndDate, filterUser]);

  // ── Filtros para cierres (Tabla) ────────────────────────────────────────────

  const filteredClosings = useMemo(() => {
    let result = closings;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.closing_user_name?.toLowerCase().includes(term) ||
        c.closing_user_id?.toLowerCase().includes(term) ||
        c.closing_user_email?.toLowerCase().includes(term) ||
        c.remarks?.toLowerCase().includes(term)
      );
    }
    
    if (dateFilter !== 'all') {
      result = result.filter(c => 
        getDateFilter(c.closing_date || c.created_at, dateFilter, customStartDate, customEndDate)
      );
    }
    
    if (filterUser.trim()) {
      const term = filterUser.toLowerCase();
      result = result.filter(c =>
        c.closing_user_name?.toLowerCase().includes(term) ||
        c.closing_user_id?.toLowerCase().includes(term) ||
        c.closing_user_email?.toLowerCase().includes(term)
      );
    }
    
    return result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [closings, searchTerm, dateFilter, customStartDate, customEndDate, filterUser]);

  // ── Filtrar tarjetas (Estado de Caja) ───────────────────────────────────

  const filteredCards = useMemo(() => {
    let openingsList = [...openings];
    let closingsList = [...closings];

    // Aplicar filtro de fecha a las aperturas
    if (cardDateFilter !== 'all') {
      openingsList = openingsList.filter(o => 
        getDateFilter(o.date || o.created_at, cardDateFilter, cardCustomStartDate, cardCustomEndDate)
      );
    }

    // Aplicar filtro de fecha a los cierres
    if (cardDateFilter !== 'all') {
      closingsList = closingsList.filter(c => 
        getDateFilter(c.closing_date || c.created_at, cardDateFilter, cardCustomStartDate, cardCustomEndDate)
      );
    }

    // Aplicar filtro de usuario a las aperturas
    if (cardFilterUser.trim()) {
      const term = cardFilterUser.toLowerCase();
      openingsList = openingsList.filter(o =>
        o.user_name?.toLowerCase().includes(term) ||
        o.user_id?.toLowerCase().includes(term) ||
        o.user_email?.toLowerCase().includes(term)
      );
      
      closingsList = closingsList.filter(c =>
        c.closing_user_name?.toLowerCase().includes(term) ||
        c.closing_user_id?.toLowerCase().includes(term) ||
        c.closing_user_email?.toLowerCase().includes(term)
      );
    }

    // Ordenar por fecha de creación
    openingsList = openingsList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return { openings: openingsList, closings: closingsList };
  }, [openings, closings, cardDateFilter, cardCustomStartDate, cardCustomEndDate, cardFilterUser]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('today');
    setFilterUser('');
    setCustomStartDate('');
    setCustomEndDate('');
    setShowCustomDate(false);
  };

  const clearCardFilters = () => {
    setCardFilterUser('');
    setCardDateFilter('today');
    setCardCustomStartDate('');
    setCardCustomEndDate('');
    setCardShowCustomDate(false);
  };

  // ── Botón de refrescar (headerAction) ─────────────────────────────────

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

  // ── Columnas ────────────────────────────────────────────────────────────

  const openingColumns = [
    {
      accessor: 'date',
      label: 'Fecha',
      render: (item) => (
        <span className="cash-audit-cell-date">{formatDateOnly(item.date || item.created_at)}</span>
      )
    },
    {
      accessor: 'user_name',
      label: 'Usuario',
      render: (item) => (
        <div className="cash-audit-cell-user">
          <div className="cash-audit-cell-user-name">
            <FiUser size={12} style={{ marginRight: '4px', color: 'var(--text-muted)' }} />
            {item.user_name || 'Desconocido'}
          </div>
        </div>
      )
    },
    {
      accessor: 'total_efectivo',
      label: 'Efectivo Inicial',
      render: (item) => (
        <span>
          {money(item.total_efectivo)}
        </span>
      )
    },
    {
      accessor: 'monto_banca',
      label: 'Banca Inicial',
      render: (item) => (
        <span>
          {money(item.monto_banca)}
        </span>
      )
    },
    {
      accessor: 'total_inicial',
      label: 'Total Apertura',
      render: (item) => (
        <span>
          {money(item.total_inicial)}
        </span>
      )
    },
    {
      accessor: 'observaciones',
      label: 'Observaciones',
      render: (item) => (
        <span>
          {item.observaciones || '—'}
        </span>
      )
    },
    {
      accessor: 'created_at',
      label: 'Creado',
      render: (item) => (
        <span>
          {formatDate(item.created_at)}
        </span>
      )
    }
  ];

  const closingColumns = [
    {
      accessor: 'closing_date',
      label: 'Fecha',
      render: (item) => (
        <span className="cash-audit-cell-date">{formatDateOnly(item.closing_date || item.created_at)}</span>
      )
    },
    {
      accessor: 'closing_user_name',
      label: 'Usuario',
      render: (item) => {
        const userName = item.closing_user_name || 'Desconocido';
        return (
          <div className="cash-audit-cell-user">
            <div className="cash-audit-cell-user-name">
              <FiUser size={12} style={{ marginRight: '4px', color: 'var(--text-muted)' }} />
              {userName}
            </div>
          </div>
        );
      }
    },
    {
      accessor: 'cash_counted',
      label: 'Efectivo Contado',
      render: (item) => (
        <span>
          {money(item.cash_counted)}
        </span>
      )
    },
    {
      accessor: 'cash_system',
      label: 'Efectivo Sistema',
      render: (item) => (
        <span>
          {money(item.cash_system)}
        </span>
      )
    },
    {
      accessor: 'diff_cash',
      label: 'Diferencia Efectivo',
      render: (item) => {
        const diff = Number(item.diff_cash) || 0;
        return (
          <span>
            {diff > 0 ? '+' : ''}{money(diff)}
          </span>
        );
      }
    },
    {
      accessor: 'total_counted',
      label: 'Total Contado',
      render: (item) => (
        <span>
          {money(item.total_counted)}
        </span>
      )
    },
    {
      accessor: 'total_system',
      label: 'Total Sistema',
      render: (item) => (
        <span>
          {money(item.total_system)}
        </span>
      )
    },
    {
      accessor: 'diff_total',
      label: 'Diferencia Total',
      render: (item) => {
        const diff = Number(item.diff_total) || 0;
        return (
          <span>
            {diff > 0 ? '+' : ''}{money(diff)}
          </span>
        );
      }
    },
    {
      accessor: 'remarks',
      label: 'Observaciones',
      render: (item) => (
        <span className="cash-audit-cell-observaciones">
          {item.remarks || '—'}
        </span>
      )
    },
    {
      accessor: 'created_at',
      label: 'Creado',
      render: (item) => (
        <span className="cash-audit-cell-created">
          {formatDate(item.created_at)}
        </span>
      )
    }
  ];

  // ─── Renderizar tarjetas ──────────────────────────────────────────────

  const renderCards = () => {
    const { openings: openingsList, closings: closingsList } = filteredCards;
    
    if (!openingsList || openingsList.length === 0) {
      return (
        <div className="cash-audit-empty-cards">
          <FiUsers size={48} />
          <p>No hay aperturas registradas para el filtro seleccionado</p>
        </div>
      );
    }

    const closingsMap = {};
    if (closingsList) {
      closingsList.forEach(c => {
        closingsMap[c.closing_user_id] = c;
      });
    }

    return (
      <div className="cash-audit-cards-grid">
        {openingsList.map((opening) => {
          const hasClosing = !!closingsMap[opening.user_id];
          const closing = closingsMap[opening.user_id] || null;
          const isComplete = hasClosing;
          
          return (
            <div 
              key={opening.id} 
              className={`cash-audit-card ${isComplete ? 'cash-audit-card-complete' : 'cash-audit-card-pending'}`}
            >
              <div className="cash-audit-card-header">
                <div className="cash-audit-card-user">
                  <FiUser size={20} />
                  <span className="cash-audit-card-user-name">{opening.user_name || 'Desconocido'}</span>
                </div>
                <div className="cash-audit-card-status">
                  {isComplete ? (
                    <span className="cash-audit-status-badge cash-audit-status-success">
                      <FiCheckCircle size={16} />
                      Completado
                    </span>
                  ) : (
                    <span className="cash-audit-status-badge cash-audit-status-warning">
                      <FiClock size={16} />
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
              
              <div className="cash-audit-card-body">
                <div className="cash-audit-card-info">
                  <span className="cash-audit-card-label">Apertura</span>
                  <span className="cash-audit-card-value">{formatTime(opening.created_at)}</span>
                  <span className="cash-audit-card-amount">{money(opening.total_inicial)}</span>
                </div>
                
                {hasClosing && closing ? (
                  <div className="cash-audit-card-info cash-audit-card-closing">
                    <span className="cash-audit-card-label">Cierre</span>
                    <span className="cash-audit-card-value">{formatTime(closing.created_at)}</span>
                    <span className="cash-audit-card-amount">{money(closing.total_counted)}</span>
                    <span className={`cash-audit-card-diff ${closing.diff_total >= 0 ? 'cash-audit-card-positive' : 'cash-audit-card-negative'}`}>
                      {closing.diff_total >= 0 ? '+' : ''}{money(closing.diff_total)}
                    </span>
                  </div>
                ) : (
                  <div className="cash-audit-card-info cash-audit-card-no-closing">
                    <span className="cash-audit-card-label">Cierre</span>
                    <span className="cash-audit-card-value cash-audit-card-pending-text">
                      <FiXCircle size={14} />
                      No ha cerrado
                    </span>
                  </div>
                )}
              </div>
              
              {opening.user_email && (
                <div className="cash-audit-card-footer">
                  <FiMail size={12} />
                  <span>{opening.user_email}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Toolbar para tarjetas ─────────────────────────────────────────────

  const cardToolbar = (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ width: 'auto', minWidth: '160px' }}>
          <CustomCombobox
            options={dateFilterOptions}
            value={cardDateFilter}
            onChange={(value) => {
              setCardDateFilter(value);
              if (value === 'custom') {
                setCardShowCustomDate(true);
              } else {
                setCardShowCustomDate(false);
                setCardCustomStartDate('');
                setCardCustomEndDate('');
              }
            }}
            placeholder="Filtrar por fecha..."
            filterable={false}
            forceDropup={false}
            size="md"
          />
        </div>
        <div style={{ width: '200px' }}>
          <Input
            type="text"
            value={cardFilterUser}
            onChange={setCardFilterUser}
            size="md"
            placeholder="Filtrar por usuario..."
          />
        </div>
        {(cardFilterUser || cardDateFilter !== 'today') && (
          <IconTextButton
            variant=""
            size="sm"
            icon={<FiX size={14} />}
            onClick={clearCardFilters}
          >
            Limpiar filtros
          </IconTextButton>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredCards.openings?.length || 0} aperturas
        </span>
      </div>
    </div>
  );

  // ─── Toolbar para tablas ───────────────────────────────────────────────

  const tableToolbar = (
    <div className="users-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <div style={{ width: 'auto', minWidth: '160px' }}>
        <CustomCombobox
          options={dateFilterOptions}
          value={dateFilter}
          onChange={(value) => {
            setDateFilter(value);
            if (value === 'custom') {
              setShowCustomDate(true);
            } else {
              setShowCustomDate(false);
              setCustomStartDate('');
              setCustomEndDate('');
            }
          }}
          placeholder="Filtrar por fecha..."
          filterable={false}
          forceDropup={false}
          size="md"
        />
      </div>
      <div style={{ width: '200px' }}>
        <Input
          type="text"
          value={filterUser}
          onChange={setFilterUser}
          size="md"
          placeholder="Filtrar por usuario..."
        />
      </div>
      {(filterUser || dateFilter !== 'today') && (
        <IconTextButton
          variant=""
          size="sm"
          icon={<FiX size={14} />}
          onClick={clearFilters}
        >
          Limpiar filtros
        </IconTextButton>
      )}
    </div>
  );

  // ── Tabs ──────────────────────────────────────────────────────────────

  const tabs = (
    <div className="cash-audit-tabs">
      <button
        className={`cash-audit-tab-btn ${activeTab === 'cards' ? 'cash-audit-tab-active' : ''}`}
        onClick={() => setActiveTab('cards')}
      >
        <FiUsers size={14} />
        Estado de Caja
        <span className="cash-audit-tab-badge">
          {filteredCards.openings?.length || 0}
        </span>
      </button>
      <button
        className={`cash-audit-tab-btn ${activeTab === 'openings' ? 'cash-audit-tab-active' : ''}`}
        onClick={() => setActiveTab('openings')}
      >
        <FiUnlock size={14} />
        Aperturas
        <span className="cash-audit-tab-badge">
          {filteredOpenings.length}
        </span>
      </button>
      <button
        className={`cash-audit-tab-btn ${activeTab === 'closings' ? 'cash-audit-tab-active' : ''}`}
        onClick={() => setActiveTab('closings')}
      >
        <FiLock size={14} />
        Cierres
        <span className="cash-audit-tab-badge">
          {filteredClosings.length}
        </span>
      </button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (activeTab === 'cards') {
      return (
        <>
          {cardToolbar}
          {renderCards()}
        </>
      );
    }

    const currentData = activeTab === 'openings' ? filteredOpenings : filteredClosings;
    const currentColumns = activeTab === 'openings' ? openingColumns : closingColumns;
    const currentTitle = activeTab === 'openings' ? 'Aperturas de Caja' : 'Cierres de Caja';
    const currentSubtitle = `${currentData.length} ${currentData.length === 1 ? 'registro' : 'registros'} encontrados`;
    const emptyMessage = activeTab === 'openings' 
      ? 'No hay aperturas de caja registradas'
      : 'No hay cierres de caja registrados';

    return (
      <Table
        data={currentData}
        columns={currentColumns}
        keyField="id"
        title={currentTitle}
        subtitle={currentSubtitle}
        toolbar={tableToolbar}
        searchable={true}
        searchPlaceholder="Buscar por usuario, observaciones..."
        onSearchChange={setSearchTerm}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15, 25, 50]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={emptyMessage}
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />
    );
  };

  return (
    <PageTemplate
      title="CUADRE DE CAJA"
      subtitle="Historial completo de aperturas y cierres de caja"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {error && (
        <div className="cash-audit-alert cash-audit-alert-error">
          <FiAlertCircle size={16} />
          {error}
        </div>
      )}

      {tabs}

      <div className="cash-audit-content-wrapper">
        {renderContent()}
      </div>

      {/* Modal de fechas personalizadas para tablas */}
      {showCustomDate && (
        <div className="cash-audit-modal-overlay" onClick={() => setShowCustomDate(false)}>
          <div className="cash-audit-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cash-audit-modal-header">
              <h2>Seleccionar fechas</h2>
              <button 
                type="button" 
                onClick={() => setShowCustomDate(false)} 
                className="cash-audit-modal-close"
              >
                ×
              </button>
            </div>
            <div className="cash-audit-modal-body">
              <div className="cash-audit-date-range-picker">
                <div className="cash-audit-date-range-inputs">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    placeholder="Fecha inicial"
                    className="cash-audit-date-input"
                  />
                  <span className="cash-audit-date-range-sep">a</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    placeholder="Fecha final"
                    className="cash-audit-date-input"
                  />
                </div>
                <div className="cash-audit-date-range-actions">
                  <button 
                    onClick={() => setShowCustomDate(false)} 
                    className="cash-audit-btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (customStartDate && customEndDate) {
                        setDateFilter('custom');
                        setShowCustomDate(false);
                      }
                    }} 
                    className="cash-audit-btn-apply" 
                    disabled={!customStartDate || !customEndDate}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de fechas personalizadas para tarjetas */}
      {cardShowCustomDate && (
        <div className="cash-audit-modal-overlay" onClick={() => setCardShowCustomDate(false)}>
          <div className="cash-audit-modal-box" onClick={e => e.stopPropagation()}>
            <div className="cash-audit-modal-header">
              <h2>Seleccionar fechas</h2>
              <button 
                type="button" 
                onClick={() => setCardShowCustomDate(false)} 
                className="cash-audit-modal-close"
              >
                ×
              </button>
            </div>
            <div className="cash-audit-modal-body">
              <div className="cash-audit-date-range-picker">
                <div className="cash-audit-date-range-inputs">
                  <input
                    type="date"
                    value={cardCustomStartDate}
                    onChange={(e) => setCardCustomStartDate(e.target.value)}
                    placeholder="Fecha inicial"
                    className="cash-audit-date-input"
                  />
                  <span className="cash-audit-date-range-sep">a</span>
                  <input
                    type="date"
                    value={cardCustomEndDate}
                    onChange={(e) => setCardCustomEndDate(e.target.value)}
                    placeholder="Fecha final"
                    className="cash-audit-date-input"
                  />
                </div>
                <div className="cash-audit-date-range-actions">
                  <button 
                    onClick={() => setCardShowCustomDate(false)} 
                    className="cash-audit-btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if (cardCustomStartDate && cardCustomEndDate) {
                        setCardDateFilter('custom');
                        setCardShowCustomDate(false);
                      }
                    }} 
                    className="cash-audit-btn-apply" 
                    disabled={!cardCustomStartDate || !cardCustomEndDate}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTemplate>
  );
}