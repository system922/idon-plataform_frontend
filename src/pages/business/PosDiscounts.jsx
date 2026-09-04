import React, { useState, useEffect } from 'react';
import PageTemplate from '../../components/PageTemplate';
import { useConfirm } from '../../context/ConfirmContext';
import { useSession } from '../../context/SessionContext';
import { 
  FiRefreshCw, FiPlus, FiAlertCircle, FiEdit2, FiTrash2, 
  FiCopy, FiPackage, FiGrid, FiList,
  FiPercent, FiDollarSign, FiShoppingBag, FiUsers, FiAward,
  FiTag, FiClock, FiCalendar, FiRepeat
} from 'react-icons/fi';
import { fetchWithAuth } from '../../config/api';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Table from '../../components/General/Table';
import DiscountModal from '../../components/General/DiscountModal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { 
  isDiscountActive, 
  parseComboCard, 
  getDiscountTypeIcon,
  formatMoney,
  scheduleLabel
} from '../../components/General/DiscountHelpers';
import TableSkeleton from '../../components/General/TableSkeleton';


export default function PosDiscounts() {
  const { user } = useSession();
  const { showConfirm } = useConfirm();
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  const load = async () => {
    setLoading(true);
    setErr('');

    try {
      const res = await fetchWithAuth('/discounts');
      
      if (!res.ok) {
        throw new Error('Error al cargar descuentos');
      }

      const data = await res.json();
      setDiscounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || 'Error al cargar descuentos');
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, []);

  const handleEdit = (discount) => {
    setEditingDiscount(discount);
    setShowModal(true);
  };

  const handleDelete = async (discount) => {
    if (isProcessing) return;
    
    if (!await showConfirm({
      title: 'Eliminar Descuento',
      message: `¿Eliminar el descuento "${discount.name}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true              
    })) return;

    try {
      setIsProcessing(true);
      const res = await fetchWithAuth(`/discounts/${discount.id}?hard_delete=true`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      await load();
      
      await showConfirm({
        title: 'Descuento eliminado',
        message: `El descuento "${discount.name}" fue eliminado correctamente.`,
        confirmText: 'Aceptar',
        danger: false,
        cancelText: null
      });
    } catch (e) {
      await showConfirm({
        title: 'Error al eliminar',
        message: e.message || 'Error al eliminar descuento',
        confirmText: 'Aceptar',
        danger: true,
        cancelText: null
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicate = async (discount) => {
    if (isProcessing) return;
    const newName = `${discount.name} (Copia)`;
    
    if (!await showConfirm({
      title: 'Duplicar Descuento',
      message: `¿Duplicar el descuento "${discount.name}"?`,
      confirmText: 'Duplicar',
      danger: false
    })) return;

    try {
      setIsProcessing(true);
      const duplicateData = {
        name: newName,
        description: discount.description,
        type: discount.type,
        value: discount.value,
        applies_to: discount.applies_to || 'order',
        product_id: discount.product_id,
        category_id: discount.category_id,
        min_amount: discount.min_amount,
        max_discount: discount.max_discount,
        min_quantity: discount.min_quantity || 1,
        code: discount.code,
        usage_limit: discount.usage_limit,
        days_of_week: discount.days_of_week,
        start_time: discount.start_time,
        end_time: discount.end_time,
        start_date: discount.start_date,
        end_date: discount.end_date,
        stackable: discount.stackable,
        priority: discount.priority,
        customer_segment: discount.customer_segment || 'all',
        is_active: false
      };

      const res = await fetchWithAuth('/discounts', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
      });

      if (!res.ok) throw new Error('Error al duplicar');

      await load();
    } catch (e) {
      await showConfirm({
        title: 'Error',
        message: e.message || 'Error al duplicar descuento',
        confirmText: 'Aceptar',
        danger: true,
        cancelText: null
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingDiscount(null);
  };

  const filteredDiscounts = discounts.filter(d => {
    const searchMatch = search === '' || 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
    
    if (!searchMatch) return false;
    
    if (filter === 'active') return isDiscountActive(d);
    if (filter === 'inactive') return !isDiscountActive(d);
    return true;
  });

  const stats = {
    total: discounts.length,
    active: discounts.filter(d => isDiscountActive(d)).length,
    inactive: discounts.filter(d => !isDiscountActive(d)).length
  };

  // ─── Opciones para el filtro ──────────────────────────────────
  const filterOptions = [
    { label: `Todos (${stats.total})`, value: 'all' },
    { label: `Activos (${stats.active})`, value: 'active' },
    { label: `Inactivos (${stats.inactive})`, value: 'inactive' },
  ];

  const getTypeColor = (item) => {
    const comboData = parseComboCard(item);
    if (comboData) return 'var(--purple, #8b5cf6)';
    switch(item.type) {
      case 'percentage': return 'var(--success, #10b981)';
      case 'fixed': return 'var(--info, #3b82f6)';
      case 'buy_x_get_y': return 'var(--warning, #f59e0b)';
      case 'bulk': return 'var(--primary, #f97316)';
      case 'coupon': return 'var(--danger, #ec4899)';
      default: return 'var(--text-secondary)';
    }
  };

  const getTypeIcon = (item) => {
    const comboData = parseComboCard(item);
    if (comboData) return <FiPackage size={16} />;
    switch(item.type) {
      case 'percentage': return <FiPercent size={16} />;
      case 'fixed': return <FiDollarSign size={16} />;
      case 'buy_x_get_y': return <FiShoppingBag size={16} />;
      case 'bulk': return <FiUsers size={16} />;
      case 'coupon': return <FiAward size={16} />;
      default: return <FiTag size={16} />;
    }
  };

  const columns = [
    {
      accessor: 'name',
      label: 'Nombre',
      render: (item) => (
        <div>
          <div className="discount-name">{item.name}</div>
          {item.description && (
            <div className="discount-description">{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'type',
      label: 'Tipo',
      render: (item) => {
        const comboData = parseComboCard(item);
        const icon = comboData ? <FiPackage size={14} /> : getDiscountTypeIcon(item.type);
        const label = comboData ? 'Combo' 
          : item.type === 'percentage' ? 'Porcentaje'
          : item.type === 'fixed' ? 'Monto fijo'
          : item.type === 'buy_x_get_y' ? 'Compra X, lleva Y'
          : item.type === 'bulk' ? 'Volumen'
          : item.type === 'coupon' ? 'Cupón'
          : 'Descuento';
        const color = getTypeColor(item);
        return (
          <div className="discount-type-badge" style={{ color }}>
            <span className="discount-type-icon">{icon}</span>
            <span>{label}</span>
          </div>
        );
      }
    },
    {
      accessor: 'value',
      label: 'Valor',
      render: (item) => {
        const comboData = parseComboCard(item);
        const color = getTypeColor(item);
        if (comboData) return <strong className="discount-value" style={{ color }}>${comboData.price?.toFixed(2)}</strong>;
        if (item.type === 'percentage') return <strong className="discount-value" style={{ color }}>{item.value}%</strong>;
        if (item.type === 'fixed') return <strong className="discount-value" style={{ color }}>${parseFloat(item.value).toFixed(2)}</strong>;
        if (item.type === 'coupon') return <strong className="discount-value" style={{ color }}>${parseFloat(item.value).toFixed(2)}</strong>;
        return <strong className="discount-value" style={{ color }}>{item.value}</strong>;
      }
    },
    {
      accessor: 'applies_to',
      label: 'Aplica a',
      render: (item) => {
        const comboData = parseComboCard(item);
        if (comboData) return <span className="discount-applies">Combo</span>;
        if (item.applies_to === 'order') return <span className="discount-applies">Toda la orden</span>;
        if (item.applies_to === 'product') return <span className="discount-applies">{item.product_name || 'Producto'}</span>;
        if (item.applies_to === 'category') return <span className="discount-applies">{item.category_name || 'Categoría'}</span>;
        if (item.applies_to === 'products_list') return <span className="discount-applies">Lista de productos</span>;
        return <span className="discount-applies">—</span>;
      }
    },
    {
      accessor: 'schedule',
      label: 'Horario',
      render: (item) => (
        <div className="discount-schedule">
          {item.start_date && item.end_date ? (
            <><FiCalendar size={12} /> {scheduleLabel(item)}</>
          ) : item.days_of_week?.length > 0 ? (
            <><FiRepeat size={12} /> {scheduleLabel(item)}</>
          ) : item.start_time ? (
            <><FiClock size={12} /> {scheduleLabel(item)}</>
          ) : (
            <span className="discount-schedule-always">Siempre</span>
          )}
        </div>
      )
    },
    {
      accessor: 'status',
      label: 'Estado',
      render: (item) => {
        const active = isDiscountActive(item);
        return (
          <div className={`discount-status ${active ? 'active' : 'inactive'}`}>
            <span className="discount-status-dot" />
            <span>{active ? 'Activo' : 'Inactivo'}</span>
          </div>
        );
      }
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant=""
            size="sm"
            icon={<FiCopy size={12} />}
            onClick={() => handleDuplicate(item)}
            title="Duplicar"
          >
            Duplicar
          </IconTextButton>
          <IconTextButton
            variant="info"
            size="sm"
            icon={<FiEdit2 size={12} />}
            onClick={() => handleEdit(item)}
            tooltip="Editar"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            icon={<FiTrash2 size={12} />}
            onClick={() => handleDelete(item)}
            tooltip="Eliminar"
          >
            Eliminar
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ];

  // ─── TOOLBAR CON COMBOBOX ──────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div className="discounts-toolbar-filters">
        <CustomCombobox
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          placeholder="Filtrar por estado..."
          size="md"
          filterable={true}
          className="discount-filter-combobox"
          forceDropup={false}
        />
      </div>

      <div className="discounts-toolbar-view">
        <button
          className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
          onClick={() => setViewMode('table')}
          title="Vista tabla"
        >
          <FiList size={16} />
        </button>
        <button
          className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
          onClick={() => setViewMode('cards')}
          title="Vista tarjetas"
        >
          <FiGrid size={16} />
        </button>
      </div>

      <div className="discounts-toolbar-actions">
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={13} />}
          onClick={() => {
            setEditingDiscount(null);
            setShowModal(true);
          }}
          disabled={!!isProcessing}
          loading={!!isProcessing}
        >
          Nueva Promoción
        </IconTextButton>
      </div>
    </div>
  );

  const refreshButton = (
    <button
      onClick={load}
      className="dashboard-refresh-btn-header"
      disabled={loading}
      title="Actualizar datos"
    >
      <FiRefreshCw size={18} className={loading ? 'spinning' : ''} />
      <span>{loading ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  const renderCards = () => {
    if (filteredDiscounts.length === 0) {
      return (
        <div className="discounts-empty">
          <FiPackage size={48} />
          <p>
            {search ? 'No hay resultados para esa búsqueda' 
              : filter !== 'all' ? `No hay descuentos ${filter === 'active' ? 'activos' : 'inactivos'}`
              : 'No hay descuentos registrados'}
          </p>
          <button
            className="discounts-empty-btn"
            onClick={() => {
              setEditingDiscount(null);
              setShowModal(true);
            }}
          >
            <FiPlus size={14} /> Crear primer descuento
          </button>
        </div>
      );
    }

    return (
      <div className="discounts-cards-grid">
        {filteredDiscounts.map((item) => {
          const active = isDiscountActive(item);
          const color = getTypeColor(item);
          const icon = getTypeIcon(item);
          const comboData = parseComboCard(item);

          return (
            <div className="discount-card" key={item.id}>
              <div className={`discount-card-bar ${active ? 'active' : 'inactive'}`} />

              <div className="discount-card-header">
                <div className="discount-card-icon" style={{ color }}>
                  {icon}
                </div>
                <div className="discount-card-info">
                  <div className="discount-card-name">{item.name}</div>
                  {item.description && (
                    <div className="discount-card-description">
                      {item.description.length > 60 ? item.description.slice(0, 60) + '...' : item.description}
                    </div>
                  )}
                </div>
                <span className={`discount-card-status ${active ? 'active' : 'inactive'}`}>
                  {active ? '● Activo' : '● Inactivo'}
                </span>
              </div>

              <div className="discount-card-value" style={{ color }}>
                {comboData ? `$${comboData.price?.toFixed(2)}` :
                  item.type === 'percentage' ? `${item.value}%` :
                  item.type === 'fixed' ? `$${parseFloat(item.value).toFixed(2)}` :
                  item.type === 'coupon' ? `$${parseFloat(item.value).toFixed(2)}` :
                  item.value}
              </div>

              <div className="discount-card-details">
                <div className="discount-card-detail">
                  <FiTag size={12} />
                  <span>
                    {comboData ? 'Combo' :
                      item.applies_to === 'order' ? 'Toda la orden' :
                      item.applies_to === 'product' ? (item.product_name || 'Producto') :
                      item.applies_to === 'category' ? (item.category_name || 'Categoría') :
                      item.applies_to === 'products_list' ? 'Lista de productos' :
                      '—'}
                  </span>
                </div>
                <div className="discount-card-detail">
                  {item.start_date && item.end_date ? <FiCalendar size={12} /> :
                    item.days_of_week?.length > 0 ? <FiRepeat size={12} /> :
                    item.start_time ? <FiClock size={12} /> :
                    <FiClock size={12} />}
                  <span>{scheduleLabel(item)}</span>
                </div>
                {item.min_amount > 0 && (
                  <div className="discount-card-detail">
                    <FiDollarSign size={12} />
                    <span>Mín. {formatMoney(item.min_amount)}</span>
                  </div>
                )}
                {item.usage_limit && (
                  <div className="discount-card-detail">
                    <FiRepeat size={12} />
                    <span>{item.used_count || 0}/{item.usage_limit} usos</span>
                  </div>
                )}
              </div>

              <div className="discount-card-actions">
                <ButtonGroup>
                  <IconTextButton
                    variant=""
                    size="sm"
                    icon={<FiCopy size={12} />}
                    onClick={() => handleDuplicate(item)}
                    title="Duplicar"
                  >
                    Duplicar
                  </IconTextButton>
                  <IconTextButton
                    variant="info"
                    size="sm"
                    icon={<FiEdit2 size={12} />}
                    onClick={() => handleEdit(item)}
                    tooltip="Editar"
                  >
                    Editar
                  </IconTextButton>
                  <IconTextButton
                    variant="danger"
                    size="sm"
                    icon={<FiTrash2 size={12} />}
                    onClick={() => handleDelete(item)}
                    tooltip="Eliminar"
                  >
                    Eliminar
                  </IconTextButton>
                </ButtonGroup>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const [itemsPerPage, setItemsPerPage] = useState(10);

  if (loading) {
    return (
      <PageTemplate
        title="DESCUENTOS Y PROMOCIONES"
        subtitle="Gestiona descuentos automáticos y promociones especiales para tus productos"
        loading={false}
        headerAction={refreshButton}
      >
        <TableSkeleton 
          rows={5}
          columns={7}
          title="Lista de descuentos"
          subtitle="Cargando descuentos..."
          columnWidths={['2fr', '1fr', '0.8fr', '1.2fr', '1fr', '0.8fr', '1.2fr']}
          toolbarWidth={160}
          showSearch={true}
        />
      </PageTemplate>
    );
  }

  return (
    <>
      <PageTemplate
        title="DESCUENTOS Y PROMOCIONES"
        subtitle="Gestiona descuentos automáticos y promociones especiales para tus productos"
        loading={loading}
        headerAction={refreshButton}
      >
        {err && (
          <div className="alert alert-error">
            <FiAlertCircle size={16} /> {err}
          </div>
        )}

        <div className="discounts-page-wrapper">
          {viewMode === 'table' && (
            <Table
              data={filteredDiscounts}
              columns={columns}
              keyField="id"
              title="Lista de descuentos"
              subtitle={`${filteredDiscounts.length} ${filteredDiscounts.length === 1 ? 'descuento' : 'descuentos'} registrados`}
              toolbar={toolbar}
              searchable={true}
              searchPlaceholder="Buscar descuentos..."
              searchFields={['name', 'description']}
              pagination={true}
              itemsPerPage={itemsPerPage}
              itemsPerPageOptions={[10, 15]}
              onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
              loading={loading}
              emptyMessage={
                search ? 'No hay resultados para esa búsqueda' 
                  : filter !== 'all' ? `No hay descuentos ${filter === 'active' ? 'activos' : 'inactivos'}`
                  : 'No hay descuentos registrados'
              }
              striped={true}
              hoverable={true}
              bordered={false}
              compact={false}
            />
          )}

          {viewMode === 'cards' && (
            <>
              <div className="discounts-toolbar-wrapper">
                {toolbar}
              </div>
              {renderCards()}
            </>
          )}
        </div>
      </PageTemplate>

      {showModal && (
        <DiscountModal
          discount={editingDiscount}
          onClose={handleCloseModal}
          onSaved={() => {
            load();
            handleCloseModal();
          }}
        />
      )}
    </>
  );
}