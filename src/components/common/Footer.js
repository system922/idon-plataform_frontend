import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/Footer.css';

export default function Footer({ variant = 'dark' }) {
  const navigate = useNavigate();

  return (
    <footer className={`saas-footer saas-footer--${variant}`}>
      <div className="saas-footer__brand">
        <span className="saas-footer__logo">
          <span className="saas-footer__logo-id">ID</span>
          <span className="saas-footer__logo-on">ON</span>
        </span>
        <span className="saas-footer__version">v1.0</span>
        <span className="saas-footer__divider" />
        <span className="saas-footer__copy">© 2026 IDON PLATAFORM by SYSTEM DESIGN</span>
      </div>

      <div className="saas-footer__links">
        <button className="saas-footer__link" onClick={() => navigate('/privacy-policy')}>
          Privacidad
        </button>
        <span className="saas-footer__sep">·</span>
        <button className="saas-footer__link" onClick={() => navigate('/terms-and-conditions')}>
          Términos
        </button>
        <span className="saas-footer__sep">·</span>
        <a
          href="https://wa.link/jhxo9m"
          target="_blank"
          rel="noopener noreferrer"
          className="saas-footer__link saas-footer__link--whatsapp"
        >
          <span className="saas-footer__wa-dot" />
          Soporte
        </a>
      </div>
    </footer>
  );
}
