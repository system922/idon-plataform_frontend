/**
 * SidebarModern.jsx
 * Ubicación: src/components/SidebarModern.jsx
 */

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiChevronDown, FiLogOut, FiUser, FiAlertCircle,
  FiGrid, FiBarChart2, FiBriefcase, FiLayers,
  FiCreditCard, FiUsers, FiSettings, FiChevronUp,
  FiShield, FiMenu, FiLock, FiUnlock,
} from 'react-icons/fi';
import '../styles/SidebarModern.css';

/* ── Mapeo de íconos (adminMenu.js usa strings) ── */
const ICON_MAP = {
  dashboard:     <FiGrid size={17} />,
  building:      <FiBriefcase size={17} />,
  layers:        <FiLayers size={17} />,
  'credit-card': <FiCreditCard size={17} />,
  users:         <FiUsers size={17} />,
  settings:      <FiSettings size={17} />,
  analytics:     <FiBarChart2 size={17} />,
};

const resolveIcon = (icon) =>
  typeof icon === 'string' ? (ICON_MAP[icon] || <FiGrid size={17} />) : (icon || null);

/* Obtiene el nombre real del usuario probando todos los campos posibles */
const getUserName = (user) =>
  user?.name ||
  user?.nombre ||
  user?.fullName ||
  user?.full_name ||
  user?.firstName ||
  user?.first_name ||
  user?.username ||
  'Usuario';

/* Obtiene iniciales para el avatar de fallback */
const getInitials = (name = '') =>
  name.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';

/* ─────────────────────────────────────────────
   MenuItem individual
───────────────────────────────────────────── */
function MenuItem({ item, isActive, onClick }) {
  return (
    <div
      className={`menu-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      title={item.label}
    >
      {item.icon && <span className="menu-icon">{resolveIcon(item.icon)}</span>}
      <span className="menu-label">{item.label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MenuSection expandible
───────────────────────────────────────────── */
function MenuSection({ section, isCollapsed, currentPath, onNavigate, expanded, onToggle }) {
  const sectionKey = section.section || section.label || '';
  const hasItems   = Array.isArray(section.items) && section.items.length > 0;

  const isSectionActive = hasItems
    ? section.items.some(i => currentPath === i.path || currentPath.startsWith(i.path + '/'))
    : currentPath === section.path;

  const handleClick = () => {
    if (hasItems) {
      onToggle(sectionKey);
    } else if (section.path) {
      onNavigate(section.path);
    }
  };

  return (
    <div className="menu-section">
      <div
        className={`section-header ${isSectionActive ? 'active' : ''} ${expanded ? 'expanded' : ''}`}
        onClick={handleClick}
        title={isCollapsed ? sectionKey : ''}
      >
        <span className="section-icon">{resolveIcon(section.icon)}</span>
        {!isCollapsed && (
          <>
            <span className="section-label">{sectionKey}</span>
            {hasItems && (
              <span className={`section-chevron ${expanded ? 'rotated' : ''}`}>
                <FiChevronDown size={14} />
              </span>
            )}
          </>
        )}
      </div>

      {hasItems && expanded && !isCollapsed && (
        <div className="section-items">
          {section.items.map((item, idx) => (
            <MenuItem
              key={idx}
              item={item}
              isActive={currentPath === item.path}
              onClick={() => onNavigate(item.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   UserCard con dropdown
───────────────────────────────────────────── */
function UserCard({ user, onLogout, isCollapsed, onMobileClose }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const profilePath = user?.userType === 'admin_idon' ? '/admin/profile' : '/app/profile';

  const goTo = (path) => { setOpen(false); navigate(path); onMobileClose?.(); };

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const name  = getUserName(user);
  const email = user?.email || '';
  const role  = user?.userType === 'admin_idon' ? 'Super Admin' : (user?.role || 'Usuario');

  return (
    <div className="sidebar-footer" ref={ref}>
      {/* Dropdown hacia arriba */}
      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <p className="user-dropdown-name">{name}</p>
            {email && <p className="user-dropdown-email">{email}</p>}
          </div>

          <button className="user-dropdown-item" onClick={() => goTo(profilePath)}>
            <FiUser size={15} />
            Ver perfil
          </button>

          <button className="user-dropdown-item" onClick={() => goTo(profilePath)}>
            <FiShield size={15} />
            Cambiar contraseña
          </button>

          <div className="user-dropdown-divider" />

          <button
            className="user-dropdown-item danger"
            onClick={() => { setOpen(false); onLogout(); }}
          >
            <FiLogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      )}

      {/* Card clickeable */}
      <div
        className={`user-card ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
        title={isCollapsed ? name : ''}
      >
        <div className="user-avatar">{getInitials(name)}</div>
        {!isCollapsed && (
          <>
            <div className="user-info">
              <p className="user-name">{name}</p>
              <p className="user-role">{role}</p>
            </div>
            <span className={`user-chevron ${open ? 'open' : ''}`}>
              <FiChevronUp size={14} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SIDEBAR PRINCIPAL
───────────────────────────────────────────── */
export default function SidebarModern({ 
  user, 
  menu, 
  onLogout, 
  collapsed, 
  setCollapsed, 
  onMobileClose,
  onCerrarCaja,      // 👈 NUEVA PROp
  onAbrirCaja,       // 👈 NUEVA PROp
  aperturaHecha      // 👈 NUEVA PROp
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState({});
  const [logoError, setLogoError] = useState(false);

  // Filtrar el menú para no mostrar duplicados de apertura/cierre
  const sidebarMenu = Array.isArray(menu)
    ? menu
        .filter(section => {
          const label = section.label || section.section || '';
          return label !== 'Cerrar Caja' && label !== 'Abrir Caja' && label !== 'Cierre de Caja';
        })
        .map(section =>
          section.subitems
            ? { section: section.label, icon: section.icon, items: section.subitems }
            : section
        )
    : [];

  const handleToggle   = (key) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));
  const handleNavigate = (path) => {
    navigate(path);
    onMobileClose?.();
  };
  const currentPath    = location.pathname;

  // Manejadores para caja
  const handleAbrirCajaClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAbrirCaja) onAbrirCaja();
  };

  const handleCerrarCajaClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCerrarCaja) onCerrarCaja();
  };

  return (
    <div className={`sidebar-modern ${collapsed ? 'collapsed' : ''}`}>

      {/* ── HEADER / LOGO ── */}
      <div className={`sidebar-header ${collapsed ? 'collapsed-header' : ''}`}>
        <div className="sidebar-logo-block">
          <div className="sidebar-logo-icon">
            {!logoError ? (
              <img
                src="/IDON_2.svg"
                alt="IDON"
                className="sidebar-logo-img"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="sidebar-logo-fallback">I</span>
            )}
          </div>

          {!collapsed && (
            <div className="sidebar-logo-text">
              <h2><span className="logo-white">ID</span><span className="logo-orange">ON</span></h2>
              <span className="logo-subtitle">GESTIÓN MULTINEGOCIOS</span>
            </div>
          )}
        </div>

        <button
          className="collapse-btn"
          onClick={() => setCollapsed?.(!collapsed)}
          title={collapsed ? 'Expandir' : 'Contraer'}
        >
          <FiMenu size={14} />
        </button>
      </div>

      {/* ── MENÚ ── */}
      <div className="sidebar-menu">
        {sidebarMenu.length > 0 ? (
          sidebarMenu.map((section, idx) => {
            const key = section.section || section.label || String(idx);
            return (
              <MenuSection
                key={idx}
                section={section}
                isCollapsed={collapsed}
                currentPath={currentPath}
                onNavigate={handleNavigate}
                expanded={!!expandedSections[key]}
                onToggle={handleToggle}
              />
            );
          })
        ) : (
          <div className="sidebar-empty">
            <FiAlertCircle size={22} />
            {!collapsed && <p>Sin módulos configurados</p>}
          </div>
        )}

        {/* ── SEPARADOR ── */}
        <div className="sidebar-divider-custom"></div>

        {/* ── BOTÓN ABRIR CAJA (solo si no hay apertura) ── */}
        {!aperturaHecha && onAbrirCaja && (
          <div
            className="menu-item sidebar-caja-abrir"
            onClick={handleAbrirCajaClick}
            title={collapsed ? 'Abrir Caja' : ''}
          >
            <span className="menu-icon"><FiUnlock size={17} /></span>
            {!collapsed && <span className="menu-label">Abrir Caja</span>}
          </div>
        )}

        {/* ── BOTÓN CERRAR CAJA (solo si hay apertura) ── */}
        {aperturaHecha && onCerrarCaja && (
          <div
            className="menu-item sidebar-caja-cerrar"
            onClick={handleCerrarCajaClick}
            title={collapsed ? 'Cerrar Caja' : ''}
          >
            <span className="menu-icon"><FiLock size={17} /></span>
            {!collapsed && <span className="menu-label">Cuadrar Caja</span>}
          </div>
        )}
      </div>

      {/* ── FOOTER / USUARIO ── */}
      <UserCard user={user} onLogout={onLogout} isCollapsed={collapsed} onMobileClose={onMobileClose} />
    </div>
  );
}