import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiRefreshCw, FiDollarSign, FiSave, FiX, FiPlus,
  FiAlertCircle, FiPackage, FiUser, FiTrendingUp, FiTrendingDown,
  FiBarChart2, FiShoppingBag
} from 'react-icons/fi';
import PageTemplate from '../../components/PageTemplate';
import { fetchWithAuth } from '../../config/api';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';
import Modal from '../../components/General/Modal';
import CustomCombobox from '../../components/General/CustomCombobox';
import { formatCurrency, toNumber } from '../../utils/productUtils';

function SupplierPriceModal({ item, itemType, suppliers, itemOptions, onClose, onSave, saving }) {
  const isEditing = Boolean(item && !item.isNew);
  const [supplierId, setSupplierId] = useState(item?.supplier_id || '');
  const [productId, setProductId] = useState(item?.product_id || '');
  const [unitCost, setUnitCost] = useState(String(item?.last_unit_cost ?? ''));
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const parsedCost = Number(unitCost);
    if (unitCost === '') {
      setError('Ingresa el precio de compra');
      return;
    }
    if (!supplierId || !productId) {
      setError('Selecciona un proveedor y un producto');
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError('Ingresa un precio válido mayor o igual a 0');
      return;
    }
    onSave({
      supplier_id: supplierId,
      product_id: productId,
      product_type: itemType,
      unit_cost: parsedCost
    });
  };

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title={isEditing ? 'Actualizar precio del proveedor' : 'Registrar precio del proveedor'}
      size="sm"
      footer={
        <>
          {error && (
            <div style={{ color: 'var(--danger)', marginBottom: '12px', fontSize: '13px' }}>
              <FiAlertCircle size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              {error}
            </div>
          )}
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<FiX size={14} />}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<FiSave size={14} />}
              onClick={handleSubmit}
              disabled={saving}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Guardar precio'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="form-group">
          <label>Proveedor *</label>
          <CustomCombobox
            options={suppliers
              .filter(supplier => supplier.is_active !== false)
              .map(supplier => ({ value: supplier.id, label: supplier.name }))}
            value={supplierId}
            onChange={setSupplierId}
            placeholder="Seleccionar proveedor..."
            filterable
            size="md"
            disabled={isEditing}
          />
        </div>
        <div className="form-group">
          <label>{itemType === 'COMMERCIAL' ? 'Producto' : 'Materia prima'} *</label>
          <CustomCombobox
            options={itemOptions}
            value={productId}
            onChange={setProductId}
            placeholder={`Seleccionar ${itemType === 'COMMERCIAL' ? 'producto' : 'materia prima'}...`}
            filterable
            size="md"
            disabled={isEditing}
          />
        </div>
        <div className="form-group">
          <label>Precio de compra / unidad *</label>
          <Input
            type="number"
            value={unitCost}
            onChange={(value) => {
              setUnitCost(value);
              setError('');
            }}
            size="md"
            step="0.01"
            min="0"
            autoFocus
            icon={<FiDollarSign size={14} />}
          />
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function SupplierPriceHistoryPage() {
  const alert = useAlert();

  const [history, setHistory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'raw_materials'

  // Modal para registrar o actualizar el precio de compra de un proveedor.
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Carga de datos ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, rawRes, suppliersRes, catalogRes, rawMaterialsRes] = await Promise.all([
        fetchWithAuth('/suppliers/product-history'),
        fetchWithAuth('/suppliers/raw-material-history'),
        fetchWithAuth('/suppliers'),
        fetchWithAuth('/products'),
        fetchWithAuth('/raw-materials')
      ]);
      const responses = [
        [productsRes, 'historial de productos'],
        [rawRes, 'historial de materias primas'],
        [suppliersRes, 'proveedores'],
        [catalogRes, 'catálogo de productos'],
        [rawMaterialsRes, 'catálogo de materias primas']
      ];
      for (const [response, label] of responses) {
        if (!response.ok) {
          const responseData = await response.json().catch(() => ({}));
          throw new Error(responseData.error || `Error al cargar ${label}`);
        }
      }
      const [productsData, rawData, suppliersData, catalogData, rawCatalogData] = await Promise.all(
        responses.map(([response]) => response.json())
      );

      // Combinar con tipo
      const combined = [
        ...(Array.isArray(productsData) ? productsData.map(p => ({ ...p, item_type: 'COMMERCIAL' })) : []),
        ...(Array.isArray(rawData) ? rawData.map(r => ({ ...r, item_type: 'MANUFACTURED' })) : [])
      ];

      setHistory(combined);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setProducts(Array.isArray(catalogData) ? catalogData : []);
      setRawMaterials(Array.isArray(rawCatalogData) ? rawCatalogData : []);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos');
      setHistory([]);
      setSuppliers([]);
      setProducts([]);
      setRawMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveSupplierPrice = async (data) => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/suppliers/prices', {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar el precio del proveedor');
      }

      await alert.success(`Precio del proveedor guardado: ${formatCurrency(data.unit_cost)}`);
      await loadData();
      setEditModal(null);
    } catch (err) {
      await alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Filtrar datos ──────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = history;

    // Filtrar por tipo de item (tab activa)
    if (activeTab === 'products') {
      result = result.filter(item => item.item_type === 'COMMERCIAL');
    } else if (activeTab === 'raw_materials') {
      result = result.filter(item => item.item_type === 'MANUFACTURED');
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        (item.supplier_name?.toLowerCase() || '').includes(term) ||
        (item.product_name?.toLowerCase() || '').includes(term) ||
        (item.product_code?.toLowerCase() || '').includes(term)
      );
    }

    // Filtro por proveedor
    if (supplierFilter !== 'all') {
      result = result.filter(item => item.supplier_id === supplierFilter);
    }

    // Ordenar por total_orders descendente
    result = [...result].sort((a, b) => (b.total_orders || 0) - (a.total_orders || 0));

    return result;
  }, [history, searchTerm, supplierFilter, activeTab]);

  // ── Columnas ────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      accessor: 'supplier_name',
      label: 'Proveedor',
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiUser size={14} style={{ color: 'var(--text-muted)' }} />
          <strong>{item.supplier_name}</strong>
        </div>
      ),
    },
    {
      accessor: 'product_name',
      label: 'Producto / Materia Prima',
      render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>{item.product_name}</span>
          {item.product_code && (
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {item.product_code}
            </span>
          )}
        </div>
      ),
    },
    {
      accessor: 'last_unit_cost',
      label: 'Último costo',
      align: 'right',
      render: (item) => (
        <span style={{ fontWeight: '600' }}>
          {formatCurrency(toNumber(item.last_unit_cost))}
        </span>
      ),
    },
    {
      accessor: 'current_sale_price',
      label: 'Precio venta actual',
      align: 'right',
      render: (item) => (
        item.item_type === 'COMMERCIAL' && item.current_sale_price != null
          ? <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
              {formatCurrency(toNumber(item.current_sale_price))}
            </span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>
      ),
    },
    {
      accessor: 'profit_margin',
      label: 'Rentabilidad',
      align: 'right',
      render: (item) => {
        if (item.item_type !== 'COMMERCIAL' || item.current_sale_price == null) {
          return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        }
        const cost = toNumber(item.last_unit_cost);
        const sale = toNumber(item.current_sale_price);
        const profit = sale - cost;
        const margin = cost > 0 ? ((sale - cost) / cost) * 100 : 0;

        return (
          <span style={{
            fontWeight: '600',
            color: margin >= 0 ? 'var(--success)' : 'var(--danger)'
          }}>
            {margin >= 0 ? '+' : ''}{margin.toFixed(1)}%
            <span style={{ fontSize: '11px', fontWeight: '400', marginLeft: '4px', color: 'var(--text-muted)' }}>
              ({profit >= 0 ? '+' : ''}{formatCurrency(profit)})
            </span>
          </span>
        );
      },
    },
    {
      accessor: 'total_orders',
      label: 'Órdenes',
      align: 'center',
      render: (item) => (
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '4px',
          background: 'var(--bg-secondary)',
          padding: '2px 10px',
          borderRadius: '12px',
          fontSize: '12px'
        }}>
          <FiShoppingBag size={12} style={{ color: 'var(--text-muted)' }} />
          {item.total_orders || 0}
        </span>
      ),
    },
    {
      accessor: 'last_order_date',
      label: 'Actualizado',
      align: 'center',
      render: (item) => {
        const referenceDate = item.last_order_date || item.updated_at;
        if (!referenceDate) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const date = new Date(referenceDate);
        return (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {date.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        );
      },
    },
    {
      accessor: 'actions',
      label: 'Acciones',
      align: 'center',
      render: (item) => (
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<FiDollarSign size={13} />}
            onClick={() => setEditModal(item)}
            tooltip="Actualizar precio del proveedor"
          >
            Editar precio
          </IconTextButton>
        </ButtonGroup>
      ),
    },
  ], []);

  // ── Opciones para el filtro de proveedor ──────────────────────────────
  const supplierOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'Todos los proveedores' }];
    suppliers.forEach(s => {
      options.push({ value: s.id, label: s.name });
    });
    return options;
  }, [suppliers]);

  // ── Contar items por tab ──────────────────────────────────────────────
  const productsCount = history.filter(i => i.item_type === 'COMMERCIAL').length;
  const rawMaterialsCount = history.filter(i => i.item_type === 'MANUFACTURED').length;
  const itemOptions = (activeTab === 'products' ? products : rawMaterials).map(item => ({
    value: item.id,
    label: `${item.name}${item.code ? ` (${item.code})` : ''}`
  }));

  // ── Toolbar ──────────────────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div style={{ minWidth: '200px' }}>
        <CustomCombobox
          options={supplierOptions}
          value={supplierFilter}
          onChange={setSupplierFilter}
          placeholder="Filtrar por proveedor..."
          filterable={false}
          size="sm"
        />
      </div>

      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<FiPlus size={14} />}
          onClick={() => setEditModal({ isNew: true })}
          disabled={suppliers.length === 0 || itemOptions.length === 0}
        >
          Registrar precio
        </IconTextButton>
        <IconTextButton
          variant="primary"
          size="md"
          icon={<FiRefreshCw size={13} />}
          onClick={handleRefresh}
          disabled={refreshing}
          loading={refreshing}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar (header) ──────────────────────────────────────
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

  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="PRECIOS POR PROVEEDOR"
      subtitle="Consulta y administra los precios de compra por proveedor y producto"
      theme="business"
      loading={loading}
      headerAction={refreshButton}
    >
      {/* Mensaje de error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--danger-bg)',
          color: 'var(--danger)',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiAlertCircle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '4px'
      }}>
        <button
          onClick={() => setActiveTab('products')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'products' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'products' ? '#fff' : 'var(--text-secondary)',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'products' ? '600' : '500',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          <FiPackage size={16} />
          Productos
          <span style={{
            background: activeTab === 'products' ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
            padding: '1px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {productsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('raw_materials')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            border: 'none',
            background: activeTab === 'raw_materials' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'raw_materials' ? '#fff' : 'var(--text-secondary)',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontWeight: activeTab === 'raw_materials' ? '600' : '500',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          <FiBarChart2 size={16} />
          Materias Primas
          <span style={{
            background: activeTab === 'raw_materials' ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
            padding: '1px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600'
          }}>
            {rawMaterialsCount}
          </span>
        </button>
      </div>

      {/* Tabla */}
      <Table
        data={filteredData}
        columns={columns}
        keyField="id"
        title=""
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder={`Buscar por proveedor o producto...`}
        searchFields={['supplier_name', 'product_name', 'product_code']}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15, 20, 50]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={
          searchTerm || supplierFilter !== 'all'
            ? 'No hay registros que coincidan con los filtros aplicados'
            : activeTab === 'products'
              ? 'No hay productos con historial de compras'
              : 'No hay materias primas con historial de compras'
        }
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {/* Modal de edición de precio */}
      {editModal && (
        <SupplierPriceModal
          item={editModal}
          itemType={activeTab === 'products' ? 'COMMERCIAL' : 'MANUFACTURED'}
          suppliers={suppliers}
          itemOptions={itemOptions}
          onClose={() => setEditModal(null)}
          onSave={handleSaveSupplierPrice}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}