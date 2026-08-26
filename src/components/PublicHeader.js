// src/components/PublicHeader.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react'; // Necesitas instalar lucide-react si no lo tienes

const logo = `${process.env.PUBLIC_URL}/IDON_f.svg`;

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="landing-header">
      <div className="logo">
        <img
          src={logo}
          alt="IDON Logo"
          className="landing-animated-logo"
          width="50"
          height="50"
          style={{
            height: '50px',
            width: 'auto',
            marginRight: '10px',
          }}
        />
        <span className="logo-idon">ID</span><span className="logo-on">ON</span>
      </div>

      {/* Botón hamburguesa (visible solo en móvil) */}
      <button
        className="menu-toggle"
        onClick={toggleMenu}
        aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={isMenuOpen}
      >
        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Navegación con clase condicional */}
      <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={closeMenu}>Inicio</Link>
        <Link to="/precios" onClick={closeMenu}>Precios</Link>
        <Link to="/contacto" onClick={closeMenu}>Contacto</Link>
        <Link to="/blog" onClick={closeMenu}>Blog</Link>
        <Link to="/login" className="btn-login" onClick={closeMenu}>
          Iniciar Sesión o Registrarse
        </Link>
      </nav>
    </header>
  );
};

export default PublicHeader;