import React, { useState } from 'react';
import { FiChevronDown, FiChevronRight, FiStar } from 'react-icons/fi';

const Checklist = ({
  items = [],
  value = [],
  onChange,
  mode = 'simple',
  variant = 'default',
  maxHeight = 300,
  placeholder = 'No hay opciones disponibles',
  showIcons = true,
  selectAll = false,
  emptyMessage = 'No hay elementos disponibles',
  renderItem = null,
  renderLabel = null,
}) => {
  const [expanded, setExpanded] = useState([]);

  const toggleExpand = (id) => {
    setExpanded(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const isSelected = (id) => {
    if (mode === 'hierarchical') {
      return !!value.find(p => p.modulo === id);
    }
    return value.includes(id);
  };

  const isChildSelected = (parentId, childId) => {
    if (mode === 'hierarchical') {
      const parent = value.find(p => p.modulo === parentId);
      return parent?.features?.includes(childId) ?? false;
    }
    return false;
  };

  const handleToggle = (item) => {
    if (mode === 'hierarchical') {
      const newValue = [...value];
      const idx = newValue.findIndex(p => p.modulo === item.id);
      
      if (idx >= 0) {
        newValue.splice(idx, 1);
      } else {
        newValue.push({ modulo: item.id, features: [] });
        if (!expanded.includes(item.id)) {
          setExpanded([...expanded, item.id]);
        }
      }
      
      onChange(newValue);
    } else {
      const newValue = value.includes(item.id)
        ? value.filter(id => id !== item.id)
        : [...value, item.id];
      onChange(newValue);
    }
  };

  const handleChildToggle = (parent, child) => {
    if (mode !== 'hierarchical') return;
    
    const newValue = [...value];
    let parentItem = newValue.find(p => p.modulo === parent.id);
    
    if (!parentItem) {
      newValue.push({ modulo: parent.id, features: [child.id] });
    } else if (parentItem.features.includes(child.id)) {
      parentItem.features = parentItem.features.filter(id => id !== child.id);
      if (!parentItem.features.length) {
        const idx = newValue.findIndex(p => p.modulo === parent.id);
        newValue.splice(idx, 1);
      }
    } else {
      parentItem.features.push(child.id);
    }
    
    onChange(newValue);
  };

  // ── Seleccionar todos - con prevención de evento ──
  const handleSelectAll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (mode === 'hierarchical') {
      const allSelected = items.map(item => ({ 
        modulo: item.id, 
        features: item.children?.map(c => c.id) || [] 
      }));
      onChange(allSelected);
      setExpanded(items.map(item => item.id));
    } else {
      const allIds = items.map(item => item.id);
      onChange(allIds);
    }
  };

  // ── Limpiar todos - con prevención de evento ──
  const handleClearAll = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    onChange([]);
    setExpanded([]);
  };

  const getItemIcon = (item) => {
    if (item.icon) return item.icon;
    if (showIcons && item.iconCode) {
      return <span className="checklist-icon">{item.iconCode}</span>;
    }
    return null;
  };

  if (!items.length) {
    return (
      <div className="checklist-empty">
        <span className="checklist-empty-icon">📭</span>
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={`checklist-container checklist-${variant}`}>
      {selectAll && (
        <div className="checklist-actions">
          <button 
            type="button"
            onClick={handleSelectAll} 
            className="checklist-btn-select-all"
          >
            Seleccionar todos
          </button>
          <button 
            type="button"
            onClick={handleClearAll} 
            className="checklist-btn-clear"
          >
            Limpiar
          </button>
        </div>
      )}

      <div 
        className={`checklist-items ${mode === 'hierarchical' ? 'checklist-hierarchical' : 'checklist-simple'}`}
        style={{ maxHeight }}
      >
        {items.map(item => {
          const selected = isSelected(item.id);
          const hasChildren = item.children?.length > 0;
          const isExpanded = expanded.includes(item.id);
          const showExpand = selected && hasChildren;

          return (
            <div key={item.id} className="checklist-item-wrapper">
              <div 
                className={`checklist-item ${selected ? 'selected' : ''}`}
                onClick={() => handleToggle(item)}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => handleToggle(item)}
                  onClick={e => e.stopPropagation()}
                  className="checklist-checkbox"
                />
                
                {getItemIcon(item) && (
                  <span className="checklist-item-icon">
                    {getItemIcon(item)}
                  </span>
                )}
                
                <span className="checklist-label">
                  {renderLabel ? renderLabel(item) : item.label}
                </span>
                
                {item.badge && (
                  <span className="checklist-badge">{item.badge}</span>
                )}
                
                {item.isPremium && (
                  <FiStar size={12} className="checklist-premium" />
                )}
                
                {showExpand && (
                  <span 
                    className="checklist-expand"
                    onClick={e => { e.stopPropagation(); toggleExpand(item.id); }}
                  >
                    {isExpanded 
                      ? <FiChevronDown size={16} /> 
                      : <FiChevronRight size={16} />
                    }
                  </span>
                )}
              </div>

              {selected && hasChildren && isExpanded && (
                <div className="checklist-children">
                  {item.children.map(child => {
                    const childSelected = isChildSelected(item.id, child.id);
                    return (
                      <div 
                        key={child.id}
                        className={`checklist-child ${childSelected ? 'selected' : ''}`}
                        onClick={() => handleChildToggle(item, child)}
                      >
                        <input
                          type="checkbox"
                          checked={childSelected}
                          onChange={() => handleChildToggle(item, child)}
                          onClick={e => e.stopPropagation()}
                          className="checklist-checkbox checklist-child-checkbox"
                        />
                        <span className="checklist-child-label">
                          {child.label}
                        </span>
                        {child.isPremium && (
                          <FiStar size={10} className="checklist-premium" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Checklist;