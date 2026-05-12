import React, { useEffect, useState, useRef } from 'react';
import {
  FiSearch, FiPlusSquare, FiTrash2, FiRefreshCw, FiChevronDown, FiEdit,
} from 'react-icons/fi';
import { useConfirm } from '../../context/ConfirmContext';
import { useBusinessContext } from '../../config/BusinessContext';
import PageTemplate from '../../components/PageTemplate';
import InventoryTable from '../../components/InventoryTable';


/* --- Helpers --- */
function generarSkuCodigo(cat, next) {
  const base = (cat ? cat.slice(0, 4) : 'PROD').toUpperCase();
  return `${base}-${String(next).padStart(3, "0")}`;
}
function generarBarra() {
  // EAN13 dummy
  const base = String(Math.floor(1e10 + Math.random() * 9e11)).slice(0, 12);
  let sum = 0;
  for (let i = 0; i < base.length; i++) sum += (i % 2 ? 3 : 1) * Number(base[i]);
  return base + ((10 - (sum % 10)) % 10);
}

/* --- Modal para crear y editar producto --- */
function ProductoModal({ open, initial = null, onSave, onClose }) {
  const [form, setForm] = useState({
    nombre: "",
    categoria: "",
    precio: "",
    costo: "",
    unidad: "",
    stock: "",
    minStock: "",
    iva: false,
    estado: true,
    codigoBarras: "",
  });
  const [categorias, setCategorias] = useState([]);
  const [tasaIva, setTasaIva] = useState(0.15);
  const [sku, setSku] = useState("");
  const [codigo, setCodigo] = useState("");
  const inputBarraRef = useRef();

  // Carga categorías y tasa iva al abrir modal
  useEffect(() => {
    if (!open) return;
    (async()=>{
      try {
        // Categorías: pon tu API real o lista demo
        const r = await fetch("/api/productos/categorias");
        const data = await r.json();
        setCategorias(Array.isArray(data) ? data : ["Cafetería","Snacks","Jugos","Panes"]);
      } catch {
        setCategorias(["Cafetería","Snacks","Jugos","Panes"]);
      }
      try {
        const r = await fetch("/api/settings/tax");
        const d = await r.json();
        let tasa = Number(d.vat_rate || d.iva || 15);
        if (tasa > 1.5) tasa = tasa/100;
        setTasaIva(Number(tasa));
      } catch { setTasaIva(0.15);}
    })();
  }, [open]);

  // Si selecciona categoría, obtiene el siguiente SKU correlativo desde API y pone código/barras
  useEffect(() => {
    if (!open || !form.categoria) return;
    (async()=>{
      try {
        // Obtiene correlativo del backend
        const resp = await fetch(`/api/productos/next-sku?categoria=${encodeURIComponent(form.categoria)}`);
        const { next } = await resp.json();
        const nuevoSku = generarSkuCodigo(form.categoria, next);
        setSku(nuevoSku);
        setCodigo(nuevoSku);
        // Si barra está vacío usa auto, si hay lo deja editable/escaneable
        setForm(f=>({...f, codigoBarras: f.codigoBarras || generarBarra()}));
      } catch {
        const def = generarSkuCodigo(form.categoria, 1+Math.floor(Math.random()*999));
        setSku(def);
        setCodigo(def);
        setForm(f=>({...f, codigoBarras: f.codigoBarras || generarBarra()}));
      }
    })();
    // eslint-disable-next-line
  }, [form.categoria, open]);

  // Inicializa edición o limpio
  useEffect(() => {
    if (initial) {
      setForm({
        nombre: initial.descripcion || initial.nombre || "",
        categoria: initial.categoria || "",
        precio: initial.precio != null ? Number(initial.precio).toFixed(2) : "",
        costo: initial.costo != null ? Number(initial.costo).toFixed(2) : "",
        unidad: initial.unidad || "",
        stock: initial.stock != null ? String(initial.stock) : "",
        minStock: initial.minStock != null ? String(initial.minStock) : "",
        iva: !!initial.iva,
        estado: !!initial.estado,
        codigoBarras: initial.codigoBarras || "",
      });
      setSku(initial.sku || "");
      setCodigo(initial.codigo || "");
    } else {
      setForm({
        nombre: "",
        categoria: "",
        precio: "",
        costo: "",
        unidad: "",
        stock: "",
        minStock: "",
        iva: false,
        estado: true,
        codigoBarras: "",
      });
      setSku("");
      setCodigo("");
    }
    // eslint-disable-next-line
  }, [initial, open]);

  // Escáner de barra: deja el campo editable/focus, puedes escanear y se guarda.
  const handleBarraChange = e =>{
    setForm(f=>({...f, codigoBarras: e.target.value.replace(/\D/g,"").slice(0,13)}));
  };

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  // IVA neto
  const precioVenta = Number(form.precio) || 0;
  const valorSinIva = form.iva ? precioVenta / (1 + tasaIva) : precioVenta;

  function handleSubmit(e) {
  e.preventDefault();
  if (!form.nombre?.trim() || !form.categoria)
    return alert("Falta nombre y/o categoría");
  if (!precioVenta || precioVenta <= 0)
    return alert("El precio debe ser mayor a cero");
  if (!form.codigoBarras || form.codigoBarras.length < 8)
    return alert("El código de barras es requerido (usa escáner o genera)");

  // Desglosa correctamente ANTES de guardar/enviar
  const precioSinIva = form.iva
    ? Number((precioVenta / (1 + tasaIva)).toFixed(2))
    : Number(precioVenta);

  onSave({
    nombre: form.nombre.trim(),
    categoria: form.categoria,
    sku,
    codigo,
    codigoBarras: form.codigoBarras,
    precioVenta: Number(precioVenta),             // PRECIO CON IVA (lo que el cliente ingresa)
    valorSinIva: precioSinIva,                    // DESGLOSE, para facturación y base imponible
    costo: Number(form.costo) || 0,
    unidad: form.unidad,
    stock: Number(form.stock) || 0,
    minStock: Number(form.minStock) || 0,
    iva: !!form.iva,
    tasaIva: tasaIva,
    estado: !!form.estado
  });
  onClose();
}

  return (open ?
    <div className="modal-overlay" aria-modal="true" role="dialog" onMouseDown={onClose}>
      <form
        className="modal-card prod-modal"
        onSubmit={handleSubmit}
        autoComplete="off"
        onMouseDown={e => e.stopPropagation()}
        style={{ maxWidth: 600 }}
      >
        <div className="modal-header">
          <h2>{initial ? "Editar producto" : "Nuevo producto"}</h2>
          <span onClick={onClose} style={{ cursor: "pointer", fontSize: 26, fontWeight: 400, position: "absolute", top: 21, right: 30 }}>
            &times;
          </span>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, color: "#b3b3b3", marginBottom: 16 }}>
            Completa los datos del producto
          </p>
          <div className="form-grid">
            <div className="field-full">
              <label>Nombre *</label>
              <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: Café Grano 1kg" />
            </div>
            <div>
              <label>SKU</label>
              <input value={sku} readOnly tabIndex={-1}/>
            </div>
            <div>
              <label>Código</label>
              <input value={codigo} readOnly tabIndex={-1}/>
            </div>
            <div>
              <label>Categoría</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} required>
                <option value="">--Selecciona categoría--</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Código de barras</label>
              <input
                value={form.codigoBarras}
                ref={inputBarraRef}
                onChange={handleBarraChange}
                placeholder="Escanee aquí"
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={13}
                tabIndex={0}
                required
              />
            </div>
            <div>
              <label>Precio de venta *</label>
              <input
                name="precio"
                value={form.precio}
                onChange={handleChange}
                type="number"
                min={0}
                step="0.01"
                required
              />
            </div>
            <div>
              <label>Costo unitario</label>
              <input name="costo" value={form.costo} onChange={handleChange} type="number" min={0} step="0.01" />
            </div>
            <div>
              <label>Stock actual</label>
              <input name="stock" value={form.stock} onChange={handleChange} type="number" min={0} step="1" />
            </div>
            <div>
              <label>Stock mínimo (alerta)</label>
              <input name="minStock" value={form.minStock} onChange={handleChange} type="number" min={0} step="1" />
            </div>
          </div>
          <div className="form-iva-row">
            <label>
              <input type="checkbox" name="iva" checked={form.iva} onChange={handleChange} style={{ marginRight: 8 }} />
              ¿Aplica IVA?
            </label>
            <span style={{ marginLeft: "auto", color: "#eee" }}>
              Tasa IVA: <b>{(tasaIva * 100).toFixed(2)}%</b>
            </span>
          </div>
          <div className="iva-break">
            <span>Valor sin IVA:</span>
            <b>{valorSinIva.toFixed(2)}</b>
            {form.iva && (
              <small style={{ marginLeft: 16, color: "#ffef90" }}>
                ({form.precio} incluye IVA)
              </small>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            <FiRefreshCw style={{ marginRight: 6 }} />
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            <FiPlusSquare style={{ marginRight: 6 }} />
            {initial ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
    </div>
    : null);
}

/* ------ Componente principal --------- */
export default function ProductoPage() {
  const { selectedBusiness, setSelectedBusiness, businesses } = useBusinessContext();
  const { showConfirm } = useConfirm();
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [items, setItems] = useState([]); // merged view (api + local-ext)
  const [filter, setFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tableRef = useRef();

  // Auto-select first business if only one
  useEffect(() => {
    if (!selectedBusiness && businesses?.length > 0) {
      setSelectedBusiness(businesses[0]);
    }
  }, [businesses, selectedBusiness, setSelectedBusiness]);

  // Load data when business changes
  useEffect(() => {
    if (!selectedBusiness) return;
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBusiness]);

  useEffect(() => {
    saveLocalExtended(localExt);
  }, [localExt]);

  /* API helpers */
  async function fetchProductsApi() {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const dbName = selectedBusiness?.schemaName;
    const response = await fetch(`${API_BASE}/api/productos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-DB-Name': dbName
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : data.productos || data.data || [];
  }
  async function createProductApi(payload) {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const dbName = selectedBusiness?.schemaName;
    const response = await fetch(`${API_BASE}/api/productos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-DB-Name': dbName,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
  async function updateProductApi(id, patch) {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const dbName = selectedBusiness?.schemaName;
    const response = await fetch(`${API_BASE}/api/productos/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-DB-Name': dbName,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patch)
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  }
  async function deleteProductApi(id) {
    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const dbName = selectedBusiness?.schemaName;
    const response = await fetch(`${API_BASE}/api/productos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-DB-Name': dbName
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return true;
  }

  function mergeApiWithLocal(apiList, localList) {
    const byCodigo = {};
    for (const l of localList) {
      if (l.codigo) byCodigo[String(l.codigo)] = l;
      if (l.id) byCodigo[String(l.id)] = l;
    }
    return apiList.map(a => {
      const code = String(a.codigo || a.id || '');
      const ext = byCodigo[code] || byCodigo[String(a.id)] || {};
      return {
        id: a.id,
        codigo: a.codigo || a.id || '',
        descripcion: a.descripcion || a.nombre || a.name || a.description || '',
        unidad: a.unidad || '',
        precio: (a.precio_venta != null) ? Number(a.precio_venta) : (a.price != null ? Number(a.price) : null),
        estado: typeof a.activo === 'boolean' ? a.activo : (typeof a.available === 'boolean' ? a.available : (ext.estado ?? true)),
        costo: ext.costo ?? '',
        iva: ext.iva ?? false,
        stock: ext.stock ?? 0,
        __api: a,
      };
    });
  }

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const apiList = await fetchProductsApi();
      const merged = mergeApiWithLocal(apiList, localExt);
      setItems(merged);

      // ensure localExt contains entries for API items
      const newLocal = [...localExt];
      for (const a of apiList) {
        const found = newLocal.find(x => String(x.codigo) === String(a.codigo || a.id) || String(x.id) === String(a.id));
        if (!found) {
          newLocal.push({
            id: a.id,
            codigo: a.codigo || a.id || '',
            descripcion: a.descripcion || a.nombre || a.name || a.description || '',
            unidad: a.unidad || '',
            costo: '',
            iva: false,
            stock: 0,
            precio: (a.precio_venta != null) ? Number(a.precio_venta) : (a.price != null ? Number(a.price) : null),
            estado: typeof a.activo === 'boolean' ? a.activo : (typeof a.available === 'boolean' ? a.available : true),
            created_at: a.created_at || null,
          });
        }
      }
      setLocalExt(newLocal);
      saveLocalExtended(newLocal);
    } catch (err) {

      setError('No se pudo obtener productos desde el servidor, usando datos locales.');
      const stored = readLocalExtended();
      
      // Si no hay datos locales, usar datos de ejemplo de demostración
      const dataToShow = stored.length > 0 ? stored : [
        {
          id: 'demo-1',
          codigo: 'PROD-001',
          descripcion: 'Pizza Margherita',
          unidad: 'Unidad',
          precio: 12.99,
          costo: 5.00,
          iva: true,
          stock: 50,
          estado: true,
        },
        {
          id: 'demo-2',
          codigo: 'PROD-002',
          descripcion: 'Pasta Carbonara',
          unidad: 'Unidad',
          precio: 14.50,
          costo: 6.00,
          iva: true,
          stock: 35,
          estado: true,
        },
        {
          id: 'demo-3',
          codigo: 'PROD-003',
          descripcion: 'Ensalada César',
          unidad: 'Unidad',
          precio: 9.99,
          costo: 3.50,
          iva: false,
          stock: 60,
          estado: true,
        },
      ];
      
      const localView = dataToShow.map(l => ({
        id: l.id,
        codigo: l.codigo,
        descripcion: l.descripcion || '',
        unidad: l.unidad || '',
        precio: l.precio ?? null,
        estado: l.estado ?? true,
        costo: l.costo ?? '',
        iva: l.iva ?? false,
        stock: l.stock ?? 0,
        __api: null,
      }));
      setItems(localView);
    } finally {
      setLoading(false);
    }
  }

  /* Modal handlers */
  function handleOpenCreate() {
    setEditingItem(null);
    setModalOpen(true);
  }
  function handleOpenEdit(item) {
    setEditingItem(item);
    setModalOpen(true);
  }

  async function handleSaveFromModal(payload) {
    // ✅ Prevención de doble envío
    if (loading) return;
    
    // payload has costo, precio as numbers
    if (editingItem) {
      // optimistic local update
      setItems(prev => prev.map(it => (String(it.id) === String(editingItem.id) ? { ...it, ...payload } : it)));

      // update localExt map
      setLocalExt(prev => {
        const exists = prev.some(x => String(x.id) === String(editingItem.id) || String(x.codigo) === String(payload.codigo));
        let out;
        if (exists) {
          out = prev.map(x => (String(x.id) === String(editingItem.id) || String(x.codigo) === String(payload.codigo) ? { ...x, ...payload } : x));
        } else {
          out = [{ id: editingItem.id || Date.now(), ...payload }, ...prev];
        }
        saveLocalExtended(out);
        return out;
      });

      // attempt API update using item id if available
      try {
        const apiId = editingItem && editingItem.__api ? editingItem.id : editingItem.id;
        const apiPayload = {
          name: payload.descripcion,
          description: payload.descripcion,
          price: payload.precio,
          available: !!payload.estado,
        };
        await updateProductApi(apiId, apiPayload);
        // refresh to keep canonical API data
        try { await fetchList(); } catch {}
      } catch (err) {

      }
    } else {
      // Create new: prefer API
      try {
        const apiPayload = {
          name: payload.descripcion,
          description: payload.descripcion,
          price: payload.precio,
          available: !!payload.estado,
        };
        const created = await createProductApi(apiPayload);
        const item = {
          id: created.id,
          codigo: created.id || '',
          descripcion: created.description || created.name || payload.descripcion,
          unidad: payload.unidad || '',
          precio: created.price != null ? Number(created.price) : payload.precio,
          costo: payload.costo,
          iva: !!payload.iva,
          stock: payload.stock,
          estado: typeof created.available === 'boolean' ? created.available : !!payload.estado,
          __api: created,
        };
        // add to the END of the list as requested
        setItems(prev => [...prev, item]);
        setLocalExt(prev => {
          const out = [...prev, { ...item }];
          saveLocalExtended(out);
          return out;
        });
      } catch (err) {

        const id = Date.now();
        const local = {
          id,
          codigo: payload.codigo,
          descripcion: payload.descripcion,
          unidad: payload.unidad,
          precio: payload.precio,
          costo: payload.costo,
          iva: !!payload.iva,
          stock: payload.stock,
          estado: !!payload.estado,
          created_at: new Date().toISOString(),
        };
        setItems(prev => [...prev, local]); // add to end
        setLocalExt(prev => {
          const out = [...prev, local];
          saveLocalExtended(out);
          return out;
        });
      }
    }

    setModalOpen(false);
    setEditingItem(null);
  }

  function setLocalAfterCreate(item) {
    const local = readLocalExtended();
    const exists = local.some(x => String(x.codigo) === String(item.codigo) || String(x.id) === String(item.id));
    let out;
    if (exists) {
      out = local.map(x => (String(x.codigo) === String(item.codigo) || String(x.id) === String(item.id) ? { ...x, ...item } : x));
    } else {
      out = [...local, item];
    }
    saveLocalExtended(out);
    setLocalExt(out);
  }

  function setLocalAfterEdit(id, payload) {
    const local = readLocalExtended();
    const out = local.map(x => (String(x.id) === String(id) || String(x.codigo) === String(payload.codigo) ? { ...x, ...payload } : x));
    saveLocalExtended(out);
    setLocalExt(out);
  }

  async function handleDelete(id) {
    if (!await showConfirm('¿Eliminar producto?')) return;

    // optimistic remove locally
    setItems(prev => prev.filter(it => String(it.id) !== String(id)));
    setLocalExt(prev => {
      const out = prev.filter(x => String(x.id) !== String(id) && String(x.codigo) !== String(id));
      saveLocalExtended(out);
      return out;
    });

    try {
      await deleteProductApi(id);
    } catch (err) {

    }
  }

  function handleLoadAll() {
    fetchList();
  }

  function handleSearch() {
    if (tableRef.current) tableRef.current.focus();
  }

  const visible = items.filter(it =>
    !filter || [it.codigo, it.descripcion, it.unidad].join(' ').toLowerCase().includes(filter.toLowerCase())
  );

  const headerAction = (
    <div style={{ display: 'flex', gap: '8px' }}>
      <button className="btn primary" onClick={handleOpenCreate} title="Registrar producto" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: '#004f39',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600'
      }}>
        <FiPlusSquare /> Nuevo Producto
      </button>
      <button className="btn-square" onClick={handleLoadAll} title="Actualizar" style={{
        padding: '8px 12px',
        background: '#004f39',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}>
        <FiRefreshCw />
      </button>
    </div>
  );

  return (
    <PageTemplate
      title="Productos"
      subtitle="Gestión de inventario de productos"
      theme="business"
      loading={loading}
      error={error}
      onRetry={handleLoadAll}
      headerAction={headerAction}
    >
      {/* Business Selector */}
      {businesses && businesses.length > 1 && (
        <div style={{ marginBottom: 16, position: 'relative', maxWidth: '300px' }}>
          <button
            onClick={() => setShowBusinessDropdown(!showBusinessDropdown)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#004f39',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
              width: '100%'
            }}
          >
            {selectedBusiness?.nombre || 'Seleccionar negocio'}
            <FiChevronDown size={16} />
          </button>

          {showBusinessDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: '#1d1d19',
              border: '1px solid #2a2a26',
              borderRadius: '8px',
              marginTop: '4px',
              minWidth: '300px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              zIndex: 100
            }}>
              {businesses.map(business => (
                <button
                  key={business.id}
                  onClick={() => {
                    setSelectedBusiness(business);
                    setShowBusinessDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    border: 'none',
                    backgroundColor: selectedBusiness?.id === business.id ? '#006648' : 'transparent',
                    color: '#FFFACA',
                    cursor: 'pointer',
                    borderBottom: '1px solid #2a2a26',
                    fontSize: '14px'
                  }}
                >
                  <strong>{business.nombre}</strong>
                  <div style={{ fontSize: '12px', color: '#A8A89A', marginTop: '4px' }}>
                    {business.tipo} • {business.email}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <label style={{ fontWeight: 700, color: '#FFFACA', whiteSpace: 'nowrap' }}>BUSCAR</label>
        <input 
          value={filter} 
          onChange={e => setFilter(e.target.value)} 
          placeholder="Buscar por código o descripción..." 
          className="input search-input"
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#1d1d19',
            border: '1px solid #2a2a26',
            color: '#FFFACA',
            borderRadius: '6px'
          }}
        />
        <button className="btn-square" onClick={handleSearch} title="Buscar" style={{
          padding: '8px 12px',
          background: '#004f39',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}>
          <FiSearch />
        </button>
      </div>

      {/* Table */}
      <InventoryTable
        columns={[
          { key: 'codigo', label: 'COD.', align: 'left' },
          { key: 'descripcion', label: 'DESCRIPCIÓN', align: 'left' },
          { key: 'unidad', label: 'U. MEDIDA', align: 'left' },
          { 
            key: 'costo', 
            label: 'COSTO', 
            align: 'right',
            render: (val) => (
              <span style={{ color: '#A0E7C7', fontWeight: 500, fontFamily: 'SF Mono, Monaco, Courier New, monospace' }}>
                ${val !== '' && val != null ? Number(val).toFixed(2) : '0.00'}
              </span>
            )
          },
          { 
            key: 'precio', 
            label: 'PRECIO', 
            align: 'right',
            render: (val) => (
              <span style={{ color: '#A0E7C7', fontWeight: 500, fontFamily: 'SF Mono, Monaco, Courier New, monospace' }}>
                ${val != null ? Number(val).toFixed(2) : '0.00'}
              </span>
            )
          },
          { 
            key: 'iva', 
            label: 'I.V.A', 
            align: 'left',
            render: (val) => val ? '✓ Sí' : '—'
          },
          { 
            key: 'stock', 
            label: 'STOCK', 
            align: 'right',
            render: (val) => (
              <span style={{ 
                color: val < 5 ? '#FF7F7F' : '#D0F5E7',
                fontWeight: 500
              }}>
                {val || 0}
              </span>
            )
          },
        ]}
        data={visible}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No hay productos"
      />

      <ProductoModal
        open={modalOpen}
        initial={editingItem}
        onSave={async (payload) => {
          try {
            await handleSaveFromModal(payload);
          } catch (e) {

          }
        }}
        onClose={() => { setModalOpen(false); setEditingItem(null); }}
      />
    </PageTemplate>
  );
}
