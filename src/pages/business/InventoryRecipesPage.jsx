// InventoryRecipesPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, RefreshCw, BookOpen, Check, AlertCircle, Search, Package, Box, Layers } from 'react-feather';
import { fetchWithAuth } from '../../config/apiBase_';
import { useConfirm } from '../../context/ConfirmContext';
import { useAlert } from '../../components/ConfirmContext';
import PageTemplate from '../../components/PageTemplate';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import SearchInput from '../../components/General/SearchInput';
import Modal from '../../components/General/Modal';
import Input from '../../components/General/Input';
import CustomCombobox from '../../components/General/CustomCombobox';
import RawMaterialsManager from '../../components/RawMaterialsManager';
import RecipeTreeView from '../../components/RecipeTreeView';
import { useRecipeWithSubrecipes } from '../../hooks/useRecipeWithSubrecipes';

// ─── CONSTANTES ──────────────────────────────────────────────────────────
const EMPTY_RECIPE = {
  product_id: '',
  description: '',
  yield_qty: 1,
  yield_unit: 'unidad',
};
const EMPTY_INGREDIENT = { 
  raw_material_id: '', 
  quantity: 1, 
  unit: '', 
  unit_cost: 0,
  conversion_factor: 1
};

// ─── UNIDADES DE MEDIDA ──────────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo (kg)' },
  { value: 'g', label: 'Gramo (g)' },
  { value: 'lb', label: 'Libra (lb)' },
  { value: 'litro', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'galon', label: 'Galón' },
  { value: 'docena', label: 'Docena' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'caja', label: 'Caja' },
  { value: 'bolsa', label: 'Bolsa' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'botella', label: 'Botella' },
  { value: 'lata', label: 'Lata' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'metro', label: 'Metro (m)' },
  { value: 'cm', label: 'Centímetro (cm)' },
];

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────
export default function InventoryRecipesPage() {
  const { showConfirm } = useConfirm();
  const alert = useAlert();

  // ── Estados principales ──
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // ── Estados para modales ──
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(null);

  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);

  // ── Estado para manager de materias primas ──
  const [showMaterialsManager, setShowMaterialsManager] = useState(false);

  // ── Estado para el modal de árbol de recetas ──
  const [showTreeModal, setShowTreeModal] = useState(false); // ← ESTADO DEFINIDO

  // ── Formularios ──
  const [recipeForm, setRecipeForm] = useState({ ...EMPTY_RECIPE });
  const [ingredientForm, setIngredientForm] = useState({ ...EMPTY_INGREDIENT });
  const [selectedMaterialUnit, setSelectedMaterialUnit] = useState('');
  
  const { getRecipeTree, recipeTree, loading: treeLoading } = useRecipeWithSubrecipes();

  // ── Carga de datos ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [recipesRes, categoriesRes, productsRes, materialsRes] = await Promise.all([
        fetchWithAuth('/api/recipes'),
        fetchWithAuth('/api/categories'),
        fetchWithAuth('/api/products?all=1'),
        fetchWithAuth('/api/raw-materials'),
      ]);
      
      if (!recipesRes.ok) {
        const errText = await recipesRes.text();
        console.error('❌ Error en recipes:', errText);
        throw new Error(`Error al cargar recetas: ${recipesRes.status}`);
      }
      if (!categoriesRes.ok) {
        const errText = await categoriesRes.text();
        console.error('❌ Error en categories:', errText);
        throw new Error(`Error al cargar categorías: ${categoriesRes.status}`);
      }
      if (!productsRes.ok) {
        const errText = await productsRes.text();
        console.error('❌ Error en products:', errText);
        throw new Error(`Error al cargar productos: ${productsRes.status}`);
      }
      if (!materialsRes.ok) {
        const errText = await materialsRes.text();
        console.error('❌ Error en raw-materials:', errText);
        throw new Error(`Error al cargar materias primas: ${materialsRes.status}`);
      }
      
      const recipesData = await recipesRes.json();
      const categoriesData = await categoriesRes.json();
      const productsData = await productsRes.json();
      const materialsData = await materialsRes.json();
      
      setRecipes(Array.isArray(recipesData) ? recipesData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setRawMaterials(Array.isArray(materialsData) ? materialsData : []);
    } catch (err) {
      console.error('❌ Error en loadData:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ── Recetas: Crear / Editar ───────────────────────────────────────────
  const openRecipeModal = (recipe = null) => {
    setEditingRecipe(recipe);
    if (recipe) {
      setRecipeForm({
        product_id: recipe.product_id || '',
        description: recipe.description || '',
        yield_qty: recipe.yield_qty || 1,
        yield_unit: recipe.yield_unit || 'unidad',
      });
    } else {
      setRecipeForm({ ...EMPTY_RECIPE });
    }
    setShowRecipeModal(true);
  };

  const closeRecipeModal = () => {
    setShowRecipeModal(false);
    setEditingRecipe(null);
    setRecipeForm({ ...EMPTY_RECIPE });
  };

  const handleProductSelect = (productId) => {
    setRecipeForm({
      ...recipeForm,
      product_id: productId,
    });
  };

  const handleSaveRecipe = async () => {
    const { product_id, yield_qty, yield_unit, description } = recipeForm;
    if (!product_id) return alert.warning('Debes seleccionar un producto');

    setSaving(true);
    try {
      const url = editingRecipe ? `/api/recipes/${editingRecipe.id}` : '/api/recipes';
      const method = editingRecipe ? 'PUT' : 'POST';
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({ product_id, description, yield_qty, yield_unit }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar receta');
      }
      await alert.success(editingRecipe ? 'Receta actualizada' : 'Receta creada');
      closeRecipeModal();
      loadData();
    } catch (err) {
      alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipe = async (recipe) => {
    if (!await showConfirm({
      title: 'Desactivar receta',
      message: `¿Desactivar la receta de "${recipe.product_name}"?`,
      confirmText: 'Desactivar',
      danger: true,
    })) return;

    try {
      const res = await fetchWithAuth(`/api/recipes/${recipe.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al desactivar');
      }
      await alert.success('Receta desactivada');
      loadData();
    } catch (err) {
      alert.error(err.message);
    }
  };

  // ── Ingredientes: Cargar, Crear, Editar, Eliminar ────────────────────
  const loadIngredients = useCallback(async (recipeId) => {
    setLoadingIngredients(true);
    try {
      const res = await fetchWithAuth(`/api/recipes/${recipeId}/ingredients`);
      if (!res.ok) throw new Error('Error al cargar ingredientes');
      const data = await res.json();
      setIngredients(Array.isArray(data) ? data : []);
    } catch (err) {
      alert.error(err.message);
    } finally {
      setLoadingIngredients(false);
    }
  }, [alert]);

  const openIngredientsModal = async (recipe) => {
    setCurrentRecipe(recipe);
    setShowIngredientsModal(true);
    await loadIngredients(recipe.id);
    setEditingIngredient(null);
    setIngredientForm({ ...EMPTY_INGREDIENT });
    setSelectedMaterialUnit('');
  };

  const closeIngredientsModal = () => {
    setShowIngredientsModal(false);
    setCurrentRecipe(null);
    setIngredients([]);
    setEditingIngredient(null);
  };

  // Cuando se selecciona una materia prima, auto-llenar unidad y costo
  const handleRawMaterialSelect = (materialId) => {
    const material = rawMaterials.find(m => String(m.id) === materialId);
    if (material) {
      setSelectedMaterialUnit(material.unit || 'unidad');
      setIngredientForm({ 
        ...ingredientForm, 
        raw_material_id: materialId,
        unit: material.unit || 'unidad',
        unit_cost: material.unit_cost || 0,
        conversion_factor: 1
      });
    } else {
      setIngredientForm({ 
        ...ingredientForm, 
        raw_material_id: materialId,
        unit: '',
        unit_cost: 0,
        conversion_factor: 1
      });
      setSelectedMaterialUnit('');
    }
  };

  // Función para ver el árbol de una receta
  const handleViewTree = async (recipe) => {
    try {
      await getRecipeTree(recipe.id);
      setShowTreeModal(true);
    } catch (err) {
      alert.error('Error al cargar el árbol de la receta');
    }
  };

  // Calcular costo total con conversión
  const calculateTotalCost = () => {
    const qty = Number(ingredientForm.quantity) || 0;
    const factor = Number(ingredientForm.conversion_factor) || 1;
    const cost = Number(ingredientForm.unit_cost) || 0;
    return qty * factor * cost;
  };

  const handleSaveIngredient = async () => {
    const { raw_material_id, quantity, unit, unit_cost, conversion_factor } = ingredientForm;
    if (!raw_material_id) return alert.warning('Debes seleccionar una materia prima');

    setSaving(true);
    try {
      const totalCost = Number(quantity) * Number(conversion_factor || 1) * Number(unit_cost || 0);
      
      const payload = { 
        raw_material_id, 
        quantity, 
        unit, 
        unit_cost,
        conversion_factor: conversion_factor || 1,
        total_cost: totalCost
      };

      const url = editingIngredient
        ? `/api/recipes/${currentRecipe.id}/ingredients/${editingIngredient.id}`
        : `/api/recipes/${currentRecipe.id}/ingredients`;
      const method = editingIngredient ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar ingrediente');
      }
      await alert.success(editingIngredient ? 'Ingrediente actualizado' : 'Ingrediente agregado');
      setEditingIngredient(null);
      setIngredientForm({ ...EMPTY_INGREDIENT });
      setSelectedMaterialUnit('');
      loadIngredients(currentRecipe.id);
      loadData();
    } catch (err) {
      alert.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIngredient = async (ingredient) => {
    if (!await showConfirm({
      title: 'Eliminar ingrediente',
      message: `¿Eliminar "${ingredient.raw_material_name}"?`,
      confirmText: 'Eliminar',
      danger: true,
    })) return;

    try {
      const res = await fetchWithAuth(`/api/recipes/${currentRecipe.id}/ingredients/${ingredient.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar');
      }
      await alert.success('Ingrediente eliminado');
      loadIngredients(currentRecipe.id);
      loadData();
    } catch (err) {
      alert.error(err.message);
    }
  };

  const startEditIngredient = (ingredient) => {
    setEditingIngredient(ingredient);
    setIngredientForm({
      raw_material_id: ingredient.raw_material_id || '',
      quantity: ingredient.quantity || 1,
      unit: ingredient.unit || '',
      unit_cost: ingredient.unit_cost || 0,
      conversion_factor: ingredient.conversion_factor || 1,
    });
    const material = rawMaterials.find(m => String(m.id) === String(ingredient.raw_material_id));
    setSelectedMaterialUnit(material?.unit || '');
  };

  // ── Filtrado ───────────────────────────────────────────────────────────
  const filteredRecipes = recipes.filter(r => {
    const q = search.toLowerCase();
    return (r.product_name || '').toLowerCase().includes(q)
      || (r.category_name || '').toLowerCase().includes(q);
  });

  // ── Columnas para la tabla de recetas ────────────────────────────────
  const recipeColumns = [
    {
      accessor: 'product_name',
      label: 'Producto',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600 }}>{item.product_name || '—'}</div>
          {item.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.description}</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'category_name',
      label: 'Categoría',
      render: (item) => <span>{item.category_name || '—'}</span>,
    },
    {
      accessor: 'yield',
      label: 'Rendimiento',
      render: (item) => `${item.yield_qty} ${item.yield_unit}`,
    },
    {
      accessor: 'total_cost',
      label: 'Costo total',
      render: (item) => <span style={{ color: 'var(--success)', fontWeight: 700 }}>${Number(item.total_cost || 0).toFixed(2)}</span>,
    },
    {
      accessor: 'is_active',
      label: 'Estado',
      render: (item) => (
        <span className={`status-badge status-badge-${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Activa' : 'Inactiva'}
        </span>
      ),
    },
  ];

  // ── Render de fila con acciones ──────────────────────────────────────
  const renderRow = (item) => (
    <tr key={item.id} className={`table-row ${!item.is_active ? 'users-row-inactive' : ''}`}>
      {recipeColumns.map((col, idx) => (
        <td key={idx} className="table-cell" data-label={col.label}>
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
      <td className="table-cell table-actions-cell">
        <ButtonGroup>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<BookOpen size={12} />}
            onClick={() => openIngredientsModal(item)}
            title="Gestionar ingredientes"
          >
            Ingredientes
          </IconTextButton>
          <IconTextButton
            variant="info"
            size="sm"
            inline={true}
            icon={<Layers size={12} />}
            onClick={() => handleViewTree(item)}
            title="Ver árbol de receta"
          >
            Árbol
          </IconTextButton>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<Edit2 size={12} />}
            onClick={() => openRecipeModal(item)}
            title="Editar receta"
          >
            Editar
          </IconTextButton>
          <IconTextButton
            variant="danger"
            size="sm"
            inline={true}
            icon={<Trash2 size={12} />}
            onClick={() => handleDeleteRecipe(item)}
            title={item.is_active ? 'Desactivar receta' : 'Eliminar receta'}
          >
            {item.is_active ? 'Desactivar' : 'Eliminar'}
          </IconTextButton>
        </ButtonGroup>
      </td>
    </tr>
  );

  // ── Toolbar con botón de Materias Primas ─────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar recetas..."
        size="md"
        variant="bordered"
        className="users-search-input"
        onClear={() => setSearch('')}
        autoFocus={false}
      />
      <ButtonGroup>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Layers size={13} />}
          onClick={() => setShowMaterialsManager(true)}
          disabled={loading}
        >
          Materia Prima
        </IconTextButton>
        <IconTextButton
          variant="success"
          size="md"
          icon={<Plus size={13} />}
          onClick={() => openRecipeModal()}
          disabled={saving || loading}
        >
          Nueva Receta
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ── Botón de refrescar ────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={handleRefresh}
      className="dashboard-refresh-btn-header"
      disabled={refreshing}
      title="Actualizar datos"
    >
      <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
      <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
    </button>
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PageTemplate
      title="Recetas e Ingredientes"
      subtitle="Gestión de recetas, costeo de ingredientes y control de inventario"
      loading={loading}
      error={error}
      onRetry={handleRefresh}
      theme="business"
      headerAction={refreshButton}
    >
      <Table
        data={filteredRecipes}
        columns={recipeColumns}
        keyField="id"
        renderRow={renderRow}
        title="Lista de recetas"
        subtitle={`${filteredRecipes.length} ${filteredRecipes.length === 1 ? 'receta' : 'recetas'} registradas`}
        toolbar={toolbar}
        searchable={false}
        pagination={true}
        itemsPerPage={10}
        itemsPerPageOptions={[10, 25, 50, 100]}
        loading={loading}
        emptyMessage={search ? 'No hay resultados para esa búsqueda' : 'No hay recetas registradas'}
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {/* ── MODAL: CREAR/EDITAR RECETA ── */}
      <Modal
        isOpen={showRecipeModal}
        onClose={closeRecipeModal}
        title={editingRecipe ? 'Editar receta' : 'Nueva receta'}
        size="md"
        footer={
          <ButtonGroup>
            <IconTextButton
              variant="primary"
              size="md"
              icon={<X size={14} />}
              onClick={closeRecipeModal}
              disabled={saving}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton
              variant="success"
              size="md"
              icon={<Check size={14} />}
              onClick={handleSaveRecipe}
              disabled={saving || !recipeForm.product_id}
              loading={saving}
            >
              {editingRecipe ? 'Guardar cambios' : 'Crear receta'}
            </IconTextButton>
          </ButtonGroup>
        }
      >
        <div className="user-form-fields">
          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Producto *</label>
              <CustomCombobox
                options={products
                  .filter(p => p.product_type === 'MANUFACTURED' && p.is_active !== false)
                  .map(p => ({ label: p.name, value: String(p.id) }))}
                value={String(recipeForm.product_id || '')}
                onChange={handleProductSelect}
                placeholder="Seleccionar producto"
                filterable
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rendimiento (cantidad)</label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={recipeForm.yield_qty}
                onChange={(val) => setRecipeForm({ ...recipeForm, yield_qty: Number(val) })}
                size="md"
              />
            </div>
            <div className="form-group">
              <label>Unidad de rendimiento</label>
              <Input
                value={recipeForm.yield_unit}
                onChange={(val) => setRecipeForm({ ...recipeForm, yield_unit: val })}
                placeholder="unidad, porción, litro..."
                size="md"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Descripción</label>
              <Input
                type="textarea"
                rows={2}
                value={recipeForm.description}
                onChange={(val) => setRecipeForm({ ...recipeForm, description: val })}
                placeholder="Descripción o instrucciones..."
                size="md"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: GESTIÓN DE INGREDIENTES ── */}
      <Modal
        isOpen={showIngredientsModal}
        onClose={closeIngredientsModal}
        title={`Ingredientes: ${currentRecipe?.product_name || ''}`}
        size="large"
        footer={
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<X size={14} />}
              onClick={closeIngredientsModal}
            >
              Cerrar
            </IconTextButton>
          </ButtonGroup>
        }
      >
        <div className="ingredients-management">
          <div className="ingredient-form" style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div className="form-group">
                <label>Materia Prima *</label>
                <CustomCombobox
                  options={rawMaterials
                    .filter(m => m.is_active !== false)
                    .map(m => ({ label: `${m.name} (${m.code})`, value: String(m.id) }))}
                  value={String(ingredientForm.raw_material_id || '')}
                  onChange={handleRawMaterialSelect}
                  placeholder="Seleccionar materia prima"
                  filterable
                />
              </div>
              <div className="form-group">
                <label>Cantidad</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={ingredientForm.quantity}
                  onChange={(val) => setIngredientForm({ ...ingredientForm, quantity: Number(val) })}
                  size="sm"
                />
              </div>
              <div className="form-group">
                <label>Unidad a usar</label>
                <CustomCombobox
                  options={UNIT_OPTIONS}
                  value={ingredientForm.unit || selectedMaterialUnit}
                  onChange={(val) => setIngredientForm({ ...ingredientForm, unit: val })}
                  placeholder="Unidad"
                  filterable
                  size="sm"
                />
              </div>
              <div className="form-group">
                <label>Factor conv.</label>
                <Input
                  type="number"
                  min="0"
                  step="0.001"
                  value={ingredientForm.conversion_factor || 1}
                  onChange={(val) => setIngredientForm({ ...ingredientForm, conversion_factor: Number(val) })}
                  placeholder="1"
                  size="sm"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                  1 {selectedMaterialUnit || 'unidad'} = {ingredientForm.conversion_factor || 1} {ingredientForm.unit || 'unidad'}
                </small>
              </div>
              <div className="form-group">
                <label>Costo unitario</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ingredientForm.unit_cost}
                  onChange={(val) => setIngredientForm({ ...ingredientForm, unit_cost: Number(val) })}
                  size="sm"
                />
              </div>
              <div>
                <IconTextButton
                  variant="success"
                  size="sm"
                  icon={editingIngredient ? <Check size={14} /> : <Plus size={14} />}
                  onClick={handleSaveIngredient}
                  disabled={saving || !ingredientForm.raw_material_id}
                  loading={saving}
                >
                  {editingIngredient ? 'Actualizar' : 'Agregar'}
                </IconTextButton>
                {editingIngredient && (
                  <IconTextButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingIngredient(null);
                      setIngredientForm({ ...EMPTY_INGREDIENT });
                      setSelectedMaterialUnit('');
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    Cancelar
                  </IconTextButton>
                )}
              </div>
            </div>
            {ingredientForm.raw_material_id && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Unidad base: <strong>{selectedMaterialUnit || '—'}</strong></span>
                <span style={{ marginLeft: 16 }}>
                  Costo total: <strong style={{ color: 'var(--success)' }}>${calculateTotalCost().toFixed(2)}</strong>
                </span>
                {ingredientForm.conversion_factor > 1 && (
                  <span style={{ marginLeft: 16, color: 'var(--warning)' }}>
                    ⚠️ Conversión: 1 {selectedMaterialUnit} = {ingredientForm.conversion_factor} {ingredientForm.unit}
                  </span>
                )}
              </div>
            )}
          </div>

          {loadingIngredients ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>Cargando ingredientes...</div>
          ) : ingredients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <Package size={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.3 }} />
              No hay ingredientes en esta receta
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table table-striped table-hover" style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Materia Prima</th>
                    <th>Código</th>
                    <th>Cantidad</th>
                    <th>Unidad</th>
                    <th>Factor conv.</th>
                    <th>Costo unit.</th>
                    <th>Costo total</th>
                    <th style={{ width: 120 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ing, idx) => (
                    <tr key={ing.id} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={{ fontWeight: 500 }}>{ing.raw_material_name}</td>
                      <td>{ing.code || '—'}</td>
                      <td>{ing.quantity}</td>
                      <td>{ing.unit || '—'}</td>
                      <td>{ing.conversion_factor || 1}</td>
                      <td>${Number(ing.unit_cost).toFixed(2)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--success)' }}>${Number(ing.total_cost).toFixed(2)}</td>
                      <td>
                        <ButtonGroup>
                          <IconTextButton
                            variant="blue"
                            size="xs"
                            icon={<Edit2 size={12} />}
                            onClick={() => startEditIngredient(ing)}
                            title="Editar ingrediente"
                          >
                            Editar
                          </IconTextButton>
                          <IconTextButton
                            variant="danger"
                            size="xs"
                            icon={<Trash2 size={12} />}
                            onClick={() => handleDeleteIngredient(ing)}
                            title="Eliminar ingrediente"
                          >
                            Eliminar
                          </IconTextButton>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            {ingredients.length} ingrediente(s) · Costo total: ${ingredients.reduce((sum, i) => sum + Number(i.total_cost || 0), 0).toFixed(2)}
          </div>
        </div>
      </Modal>

      {/* ── MODAL: ÁRBOL DE LA RECETA ── */}
      <Modal
        isOpen={showTreeModal}
        onClose={() => setShowTreeModal(false)}
        title="Árbol de la receta"
        size="large"
        footer={
          <ButtonGroup>
            <IconTextButton
              variant="danger"
              size="md"
              icon={<X size={14} />}
              onClick={() => setShowTreeModal(false)}
            >
              Cerrar
            </IconTextButton>
          </ButtonGroup>
        }
      >
        {treeLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Cargando árbol de receta...</div>
        ) : recipeTree ? (
          <RecipeTreeView recipe={recipeTree} />
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            No se pudo cargar el árbol de la receta
          </div>
        )}
      </Modal>

      {/* ── MODAL: GESTIÓN DE MATERIAS PRIMAS ── */}
      <RawMaterialsManager
        isOpen={showMaterialsManager}
        onClose={() => setShowMaterialsManager(false)}
        onRefresh={loadData}
      />
    </PageTemplate>
  );
}