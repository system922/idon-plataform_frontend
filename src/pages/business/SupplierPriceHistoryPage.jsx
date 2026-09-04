import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import {
  FiRefreshCw, FiDollarSign, FiSave, FiX, 
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
import { formatCurrency, toNumber, calculatePVP } from '../../utils/productUtils';

// ─── Modal de edición de precio de venta ──────────────────────────────────
function EditSalePriceModal({ item, onClose, onSave, saving }) {
  const [salePrice, setSalePrice] = useState(toNumber(item?.current_sale_price || 0));
  const [newSalePrice, setNewSalePrice] = useState(toNumber(item?.current_sale_price || 0));
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (newSalePrice < 0) {
      setError('❌ El precio no puede ser negativo');
      return;
    }
    if (newSalePrice === salePrice) {
      setError('❌ El precio no ha cambiado');
      return;
    }
    onSave({ 
      product_id: item.product_id,
      product_type: item.product_type || 'COMMERCIAL',
      current_price: salePrice,
      new_price: newSalePrice
    });
  };

  const lastCost = toNumber(item?.last_unit_cost || 0);
  const profit = newSalePrice - lastCost;
  const profitMargin = lastCost > 0 ? ((newSalePrice - lastCost) / lastCost) * 100 : 0;

  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={true}
      onClose={onClose}
      title="Actualizar precio de venta"
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
              disabled={saving || newSalePrice === salePrice}
              loading={saving}
            >
              {saving ? 'Guardando...' : 'Actualizar precio'}
            </IconTextButton>
          </ButtonGroup>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ 
          padding: '12px 16px', 
          background: 'var(--bg-secondary)', 
          borderRadius: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Producto</span>
            <span style={{ fontWeight: '600' }}>{item?.product_name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Último costo</span>
            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
              {formatCurrency(lastCost)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Proveedor</span>
            <span style={{ fontWeight: '500' }}>{item?.supplier_name}</span>
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
            Precio de venta actual
          </label>
          <Input
            type="number"
            value={salePrice}
            onChange={(value) => setSalePrice(toNumber(value))}
            size="md"
            step="0.01"
            min="0"
            disabled
            style={{ background: 'var(--bg-disabled)', cursor: 'not-allowed' }}
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-secondary)' }}>
            Nuevo precio de venta *
          </label>
          <Input
            type="number"
            value={newSalePrice}
            onChange={(value) => {
              setNewSalePrice(toNumber(value));
              setError('');
            }}
            size="md"
            step="0.01"
            min="0"
            autoFocus
            icon={<FiDollarSign size={14} />}
          />
        </div>

        {/* Rentabilidad / Margen */}
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid',
          borderColor: profit >= 0 ? 'var(--success-border)' : 'var(--danger-border)',
          background: profit >= 0 ? 'var(--success-bg)' : 'var(--danger-bg)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              <FiBarChart2 size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Rentabilidad estimada
            </span>
            <span style={{ 
              fontWeight: '700', 
              fontSize: '16px',
              color: profit >= 0 ? 'var(--success)' : 'var(--danger)'
            }}>
              {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
              <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '4px' }}>
                ({profitMargin.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>Margen: {profitMargin.toFixed(1)}%</span>
            <span>
              {profit >= 0 ? <FiTrendingUp size={12} style={{ color: 'var(--success)' }} /> : <FiTrendingDown size={12} style={{ color: 'var(--danger)' }} />}
              {profit >= 0 ? ' Rentable' : ' Pérdida'}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Página principal ──────────────────────────────────────────────────────
export default function SupplierPriceHistoryPage() {
  const { user } = useSession();
  const { showConfirm } = useConfirm();
  const alert = useAlert();

  const [history, setHistory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'raw_materials'

  // Estado para el modal de edición de precio
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── Carga de datos ──────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Cargar historial de productos
      const productsRes = await fetchWithAuth('/suppliers/product-history');
      if (!productsRes.ok) throw new Error('Error al cargar historial de productos');
      const productsData = await productsRes.json();

      // Cargar historial de materias primas
      const rawRes = await fetchWithAuth('/suppliers/raw-material-history');
      if (!rawRes.ok) throw new Error('Error al cargar historial de materias primas');
      const rawData = await rawRes.json();

      // Combinar con tipo
      const combined = [
        ...(Array.isArray(productsData) ? productsData.map(p => ({ ...p, item_type: 'COMMERCIAL' })) : []),
        ...(Array.isArray(rawData) ? rawData.map(r => ({ ...r, item_type: 'MANUFACTURED' })) : [])
      ];

      setHistory(combined);

      // Cargar proveedores para el filtro
      const suppliersRes = await fetchWithAuth('/suppliers');
      if (!suppliersRes.ok) throw new Error('Error al cargar proveedores');
      const suppliersData = await suppliersRes.json();
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos');
      setHistory([]);
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

  // ── Guardar nuevo precio de venta ──────────────────────────────────────
  const handleSaveSalePrice = async (data) => {
    setSaving(true);
    try {
      const endpoint = data.product_type === 'COMMERCIAL' 
        ? `/products/${data.product_id}/price`
        : `/raw-materials/${data.product_id}/price`;

      const res = await fetchWithAuth(endpoint, {
        method: 'PATCH',
        body: JSON.stringify({ 
          selling_price: data.new_price,
          previous_price: data.current_price
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar precio');
      }

      await alert.success(`✅ Precio actualizado: ${formatCurrency(data.new_price)}`);
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
        <span style={{ fontWeight: '700', color: 'var(--primary)' }}>
          {formatCurrency(toNumber(item.current_sale_price))}
        </span>
      ),
    },
    {
      accessor: 'profit_margin',
      label: 'Rentabilidad',
      align: 'right',
      render: (item) => {
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
      label: 'Última compra',
      align: 'center',
      render: (item) => {
        if (!item.last_order_date) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
        const date = new Date(item.last_order_date);
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
            tooltip="Actualizar precio de venta"
          >
            Precio
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
      title="HISTORIAL DE PRECIOS"
      subtitle="Últimos costos de compra por proveedor y rentabilidad por producto"
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
        <EditSalePriceModal
          item={editModal}
          onClose={() => setEditModal(null)}
          onSave={handleSaveSalePrice}
          saving={saving}
        />
      )}
    </PageTemplate>
  );
}