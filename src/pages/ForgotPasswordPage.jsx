// ========== src/pages/ForgotPasswordPage.js ==========
import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiCheckCircle } from 'react-icons/fi';
import { api } from '../config/api';
import Input from '../components/General/Input';
import { IconTextButton } from '../components/General/Button';
import { useAlert } from '../components/ConfirmContext';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  const logo = `${process.env.PUBLIC_URL}/IDON_3.png`;

  useEffect(() => {
    if (localStorage.getItem('idon_cookies_accepted') === null) {
      setShowCookieBanner(true);
    }
  }, []);

  const handleAcceptCookies = () => {
    localStorage.setItem('idon_cookies_accepted', 'true');
    setShowCookieBanner(false);
  };

  const renderCookieBanner = () => showCookieBanner && (
    <aside className="cookie-banner" aria-label="Aviso de cookies">
      <div className="cookie-banner-copy">
        <p className="cookie-banner-message">Usamos cookies para mejorar tu experiencia.</p>
      </div>
      <div className="cookie-banner-actions">
        <label className="cookie-banner-consent">
          <input type="checkbox" />
          <span>Acepto cookies</span>
        </label>
        <button className="cookie-banner-accept" type="button" onClick={handleAcceptCookies}>
          Aceptar
        </button>
      </div>
    </aside>
  );

  const renderVisualPanel = () => (
    <section className="login-left">
      <div className="login-visual-content">
        <h1>IDON CONTROL</h1>
        <p className="login-visual-description">SIMPLEMENTE EFICIENTE</p>
      </div>
      <svg
        className="curve-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M 100 0 L 85 0 C 60 20, 60 80, 85 100 L 100 100 Z" fill="#ffffff" />
      </svg>
    </section>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      await alert.error('Por favor ingresa un correo válido');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (error) {
      // Por seguridad, siempre mostramos el mismo mensaje
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`login-page login-mode forgot-password-page${showCookieBanner ? ' has-cookie-banner' : ''}`} style={{ position: 'relative' }}>
        <div className="login-container">
          {renderVisualPanel()}

          <main className="login-right">
            <div className="login-right-inner">
              <div className="login-form-brand">
                <img src={logo} alt="IDON" />
              </div>
              <div className="form-container">
                <div className="auth-form">
                  <div className="auth-icon success forgot-password-success-icon">
                    <FiCheckCircle size={40} color="#f97316" />
                  </div>
                  <h3 className="form-title forgot-password-title">¡Revisa tu correo!</h3>
                  <p className="forgot-password-description">
                    Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                    <br />
                    El enlace expirará en 1 hora.
                  </p>
                  <IconTextButton
                    variant="primary"
                    size="md"
                    inline={false}
                    icon={<FiArrowLeft size={17} />}
                    onClick={() => navigate('/login')}
                    title="volver al login"
                    block={true}
                    className="forgot-password-submit"
                  >
                    Volver al inicio de sesión
                  </IconTextButton>
                </div>
              </div>
            </div>
          </main>
        </div>
        {renderCookieBanner()}
      </div>
    );
  }

  return (
    <div className={`login-page login-mode forgot-password-page${showCookieBanner ? ' has-cookie-banner' : ''}`} style={{ position: 'relative' }}>
      <div className="login-container">
        {renderVisualPanel()}

        <main className="login-right">
          <div className="login-right-inner">
            <div className="login-form-brand">
              <img src={logo} alt="IDON" />
            </div>
            <div className="form-container">
              <div className="auth-form">
                <div className="forgot-back-row">
                  <Link to="/login" className="forgot-back-link">
                    <FiArrowLeft size={16} /> Volver al inicio de sesión
                  </Link>
                </div>

                <h3 className="form-title forgot-password-title">¿Olvidaste tu contraseña?</h3>
                <p className="forgot-password-description">
                  Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label><FiMail size={14} /> CORREO ELECTRÓNICO</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={setEmail}
                      placeholder="ejemplo@correo.com"
                      size="md"
                      disabled={loading}
                      required
                    />
                  </div>

                  <IconTextButton
                    variant="primary"
                    size="md"
                    inline={false}
                    icon={<FiMail size={17} />}
                    onClick={handleSubmit}
                    disabled={loading}
                    title="enviar enlace"
                    block={true}
                    className="forgot-password-submit"
                  >
                    {loading ? (
                      <>
                        <span className="spinner" /> Enviando...
                      </>
                    ) : (
                      'Enviar enlace de recuperación'
                    )}
                  </IconTextButton>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
      {renderCookieBanner()}
    </div>
  );
}