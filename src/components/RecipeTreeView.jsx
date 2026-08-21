// components/RecipeTreeView.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Package, Layers } from 'react-feather';

const RecipeTreeView = ({ recipe, level = 0, onIngredientClick }) => {
  const [expanded, setExpanded] = useState(true);

  if (!recipe) return null;

  const toggleExpand = () => setExpanded(!expanded);

  return (
    <div style={{ marginLeft: level * 20 }}>
      {/* Nodo de la receta */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8,
          padding: '6px 10px',
          backgroundColor: level === 0 ? 'rgba(0,79,57,0.1)' : 'rgba(255,255,255,0.03)',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: level === 0 ? 700 : 500
        }}
        onClick={toggleExpand}
      >
        {recipe.ingredients && recipe.ingredients.length > 0 ? (
          expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
        ) : (
          <span style={{ width: 16 }} />
        )}
        <Layers size={16} style={{ color: 'var(--info)' }} />
        <span>
          {recipe.product_name || `Receta #${recipe.id}`}
          {recipe.description && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              {recipe.description}
            </span>
          )}
        </span>
        <span style={{ 
          fontSize: 12, 
          color: 'var(--text-muted)',
          marginLeft: 'auto'
        }}>
          ${Number(recipe.total_cost || 0).toFixed(2)}
        </span>
        <span style={{ 
          fontSize: 11, 
          color: 'var(--text-muted)',
          background: 'rgba(255,255,255,0.05)',
          padding: '2px 8px',
          borderRadius: 12
        }}>
          {recipe.yield_qty} {recipe.yield_unit}
        </span>
      </div>

      {/* Ingredientes */}
      {expanded && recipe.ingredients && (
        <div style={{ marginTop: 4 }}>
          {recipe.ingredients.map((ing, idx) => (
            <div key={ing.id || idx}>
              {ing.is_sub_recipe && ing.sub_recipe ? (
                // Sub-receta recursiva
                <RecipeTreeView 
                  recipe={ing.sub_recipe} 
                  level={level + 1}
                  onIngredientClick={onIngredientClick}
                />
              ) : (
                // Ingrediente simple
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8,
                    padding: '4px 10px',
                    marginLeft: 20,
                    cursor: onIngredientClick ? 'pointer' : 'default',
                    borderRadius: 4,
                    fontSize: 13
                  }}
                  onClick={() => onIngredientClick?.(ing)}
                >
                  <Package size={12} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontWeight: 400 }}>{ing.raw_material_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {ing.quantity} {ing.unit || ing.raw_material_unit}
                  </span>
                  <span style={{ 
                    marginLeft: 'auto',
                    color: 'var(--success)',
                    fontSize: 12
                  }}>
                    ${Number(ing.total_cost || 0).toFixed(2)}
                  </span>
                  {ing.code && (
                    <span style={{ 
                      fontSize: 10, 
                      color: 'var(--text-muted)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '0 6px',
                      borderRadius: 4
                    }}>
                      {ing.code}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Total del nivel */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            padding: '4px 10px',
            marginLeft: 20,
            fontSize: 12,
            color: 'var(--text-muted)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            marginTop: 4
          }}>
            Subtotal: ${recipe.ingredients.reduce((sum, i) => sum + Number(i.total_cost || 0), 0).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeTreeView;