/**
 * AdminLayout.jsx
 * Ubicación: src/admin/layout/AdminLayout.jsx
 *
 * Layout principal del panel admin IDON.
 * Sidebar fijo a la izquierda, contenido ocupa el espacio restante.
 */

import React, { useState, useEffect } from 'react';
import { FiMenu } from 'react-icons/fi';
import SidebarModern from '../../components/SidebarModern';
import Footer from '../../components/common/Footer';
import { ADMIN_MENU } from '../config/adminMenu';
import '../../styles/AdminLayout.css';

export default function AdminLayout({ user, onLogout, children }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');

    const applyMode = (mobile) => {
      setIsMobile(mobile);
      if (mobile) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        setMobileOpen(false);
      } else {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        setMobileOpen(false);
      }
    };

    const handleChange = (e) => applyMode(e.matches);
    applyMode(mq.matches);
    mq.addEventListener('change', handleChange);

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      mq.removeEventListener('change', handleChange);
    };
  }, []);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="admin-layout">

      {/* ── Barra superior móvil (hamburger + logo) ── */}
      {isMobile && (
        <div className="admin-mobile-topbar">
          <button
            className="admin-mobile-hamburger"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Abrir menú"
          >
            <FiMenu size={20} />
          </button>
          <span className="admin-mobile-logo">
            <span style={{ color: '#ffffff' }}>ID</span>
            <span style={{ color: '#ff8c42' }}>ON</span>
          </span>
        </div>
      )}

      {/* ── Backdrop (cierra sidebar al tocar fuera) ── */}
      {mobileOpen && (
        <div className="admin-mobile-backdrop" onClick={closeMobile} />
      )}

      {/* ── Sidebar ── */}
      <div className={`admin-sidebar-wrapper ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <SidebarModern
          user={user}
          menu={ADMIN_MENU}
          onLogout={onLogout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileClose={closeMobile}
        />
      </div>

      {/* ── Contenido principal ── */}
      <main className="admin-content-area">
        <div className="admin-content-inner">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
