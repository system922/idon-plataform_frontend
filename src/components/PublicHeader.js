// src/components/PublicHeader.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react'; // Necesitas instalar lucide-react si no lo tienes

const PublicHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="landing-header">
      <div className="landing-header__inner">
        <div className="logo" role="img" aria-label="IDON Control">
          <img
            src={`${process.env.PUBLIC_URL}/isotipo.png`}
            alt=""
            aria-hidden="true"
            className="landing-logo-isotipo"
          />
          <img
            src={`${process.env.PUBLIC_URL}/logotipo.png`}
            alt=""
            aria-hidden="true"
            className="landing-logo-logotipo"
          />
        </div>

        <button
          className="menu-toggle"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
          <Link to="/" onClick={closeMenu}>Inicio</Link>
          <Link to="/precios" onClick={closeMenu}>Precios</Link>
          <Link to="/contacto" onClick={closeMenu}>Contacto</Link>
          <Link to="/blog" onClick={closeMenu}>Blog</Link>
          <Link to="/login" className="btn-login" onClick={closeMenu}>
            Iniciar Sesión o Registrarse
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;