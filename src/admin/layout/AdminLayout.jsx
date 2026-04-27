/**
 * AdminLayout.jsx
 * Ubicación: src/admin/layout/AdminLayout.jsx
 *
 * Layout principal del panel admin IDON.
 * Sidebar fijo a la izquierda, contenido ocupa el espacio restante.
 */

import React, { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import SidebarModern from '../../components/SidebarModern';
import Footer from '../../components/common/Footer';
import { ADMIN_MENU } from '../config/adminMenu';
import '../../styles/AdminLayout.css';

export default function AdminLayout({ user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout">
      {/* Mobile topbar */}
      <header className="admin-mobile-topbar">
        <button className="admin-hamburger" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <FiMenu size={22} />
        </button>
        <span className="admin-mobile-brand">ID<span>ON</span></span>
        <div className="admin-mobile-topbar-spacer" />
      </header>

      {/* Overlay backdrop */}
      {mobileOpen && (
        <div className="admin-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`admin-sidebar-wrapper ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <SidebarModern
          user={user}
          menu={ADMIN_MENU}
          onLogout={onLogout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      {/* Contenido: ocupa el resto del ancho, scroll propio */}
      <main className="admin-content-area">
        <div className="admin-content-inner">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
