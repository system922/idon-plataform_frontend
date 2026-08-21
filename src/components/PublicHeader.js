// src/components/PublicHeader.js
import React from 'react';
import { Link } from 'react-router-dom';

const logo = `${process.env.PUBLIC_URL}/IDON_f.svg`;

const PublicHeader = () => {
  return (
    <header className="landing-header">
      <div className="logo">
        <img
          src={logo}
          alt="IDON Logo"
          className="animated-logo"
          style={{
            height: '50px',
            width: 'auto',
            marginRight: '10px',
          }}
        />
        <span className="logo-idon">ID</span><span className="logo-on">ON</span>
      </div>
      <nav className="main-nav">
        <Link to="/">Inicio</Link>
        <Link to="/precios">Precios</Link>
        <Link to="/contacto">Contacto</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/login" className="btn-login">
          Iniciar Sesión o Registrarse
        </Link>
      </nav>
    </header>
  );
};

export default PublicHeader;