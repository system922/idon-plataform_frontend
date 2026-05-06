/**
 * AdminLayout.jsx
 * Ubicación: src/admin/layout/AdminLayout.jsx
 *
 * Layout principal del panel admin IDON.
 * Sidebar fijo a la izquierda, contenido ocupa el espacio restante.
 */

import React, { useState, useEffect } from 'react';
import SidebarModern from '../../components/SidebarModern';
import Footer from '../../components/common/Footer';
import { ADMIN_MENU } from '../config/adminMenu';
import '../../styles/AdminLayout.css';

export default function AdminLayout({ user, onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="admin-layout">
      {/* Sidebar con ancho controlado */}
      <div className={`admin-sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}>
        <SidebarModern
          user={user}
          menu={ADMIN_MENU}
          onLogout={onLogout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
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
