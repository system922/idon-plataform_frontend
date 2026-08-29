// ========== src/pages/ForgotPasswordPage.js ==========
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiMail, FiCheckCircle, FiLock } from 'react-icons/fi';
import { api } from '../config/api';
import Input from '../components/General/Input';
import { IconTextButton } from '../components/General/Button';
import { useAlert } from '../components/ConfirmContext';
import Footer from '../components/common/Footer';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const alert = useAlert();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const logo = `${process.env.PUBLIC_URL}/IDON_f.svg`;
  const color = 'var(--bg-secondary)';

  // Slides de propuesta de valor (mismos que en Login)
  const vpSlides = [
    {
      type: 'problem',
      question: '¿AÚN HACES TODOS LOS PROCESOS DE TU NEGOCIO A MANO?',
      answer: 'Eso se acabó con IDON'
    },
    {
      type: 'features',
      title: 'TODO EN UNA SOLA PLATAFORMA',
      items: [
        'POS Retail',
        'POS Restaurante',
        'Inventario',
        'Facturación SRI',
        'Colaboradores',
        'Reportes & CRM',
        'Email Marketing',
        'Cierre de Caja'
      ]
    },
    {
      type: 'ctas',
      buttons: [
        { text: 'DEMO GRATUITA', type: 'primary' },
      ],
      subtext: 'sin tarjeta de crédito o débito',
      benefits: [
        'Facturas Electrónicas Ilimitadas',
        'Todo en la nube',
        'Configura en menos de 1 hora',
        'Soporte al 100%'
      ],
    },
    {
      type: 'faq',
      title: 'PREGUNTAS FRECUENTES',
      items: [
        {
          q: '¿Funciona con la facturación electrónica del SRI?',
          a: 'Sí. IDON Genera documentos electrónicos validados por el SRI automáticamente.'
        }
      ]
    }
  ];

  const [vpSlideIndex, setVpSlideIndex] = useState(0);
  const [vpSlideOpacity, setVpSlideOpacity] = useState(1);

  useEffect(() => {
    const id = setInterval(() => {
      setVpSlideOpacity(0);
      setTimeout(() => {
        setVpSlideIndex(prev => (prev + 1) % vpSlides.length);
        setVpSlideOpacity(1);
      }, 800);
    }, 7000);
    return () => clearInterval(id);
  }, [vpSlides.length]);

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
      <div className="login-page" style={{ position: 'relative', paddingBottom: 44 }}>
        <div className="login-container">
          <section className="login-left" aria-hidden="true">
            <div className="color-ring" style={{ background: `var(--bg-secondary)` }} />
            <div className="logo-carousel">
              <img
                src={logo}
                alt="IDON Logo"
                className="login-animated-logo"
                style={{
                  filter: `drop-shadow(0 0 28px ${color}cc) drop-shadow(0 0 60px ${color}66)`,
                }}
              />
            </div>
            <div className="logo-wordmark">
              <div className="brand-name">
                <span className="brand-id">ID</span>
                <span className="brand-on">ON</span>
              </div>
              <div className="brand-tagline">Simplemente eficiente</div>
            </div>
          </section>

          <main className="login-right">
            <div className="login-right-inner">
              <div className="form-container">
                <div className="auth-form">
                  <div className="auth-icon success" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <FiCheckCircle size={48} color="#28a745" />
                  </div>
                  <h3 className="form-title" style={{ textAlign: 'center' }}>¡Revisa tu correo!</h3>
                  <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
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
                  >
                    Volver al inicio de sesión
                  </IconTextButton>
                </div>
              </div>
            </div>
          </main>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="login-page" style={{ position: 'relative', paddingBottom: 44 }}>
      <div className="login-container">
        {/* ─── LADO IZQUIERDO: Logo y slides ─── */}
        <section className="login-left" aria-hidden="true">
          <div className="color-ring" style={{ background: `var(--bg-secondary)` }} />

          <div className="logo-carousel">
            <img
              src={logo}
              alt="IDON Logo"
              className="login-animated-logo"
              style={{
                filter: `drop-shadow(0 0 28px ${color}cc) drop-shadow(0 0 60px ${color}66)`,
              }}
            />
          </div>

          <div className="logo-wordmark">
            <div className="brand-name">
              <span className="brand-id">ID</span>
              <span className="brand-on">ON</span>
            </div>
            <div className="brand-tagline">Simplemente eficiente</div>
          </div>

          {/* ─── VALUE PROPOSITION SLIDES ─── */}
          <div className="value-proposition" key={`vp-${vpSlideIndex}`} style={{
            opacity: vpSlideOpacity,
            transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            {vpSlides[vpSlideIndex].type === 'problem' && (
              <div className="vp-slide vp-slide-problem">
                <div className="vp-problem-question">
                  {vpSlides[vpSlideIndex].question}
                </div>
                <div className="vp-problem-answer">
                  {vpSlides[vpSlideIndex].answer}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'features' && (
              <div className="vp-slide vp-slide-features">
                <div className="vp-features-title">
                  {vpSlides[vpSlideIndex].title}
                </div>
                <div className="vp-features-grid">
                  {vpSlides[vpSlideIndex].items.map((item, idx) => (
                    <div key={idx} className="vp-features-item" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.1}s both`
                    }}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'ctas' && (
              <div className="vp-slide vp-slide-ctas">
                <div className="vp-ctas-buttons">
                  {vpSlides[vpSlideIndex].buttons.map((btn, idx) => (
                    <button 
                      key={idx}
                      className={`vp-cta-btn vp-cta-${btn.type}`}
                      style={{
                        animation: `slideInFeature 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.2 + idx * 0.2}s both`
                      }}
                    >
                      {btn.text}
                    </button>
                  ))}
                </div>
                <div className="vp-ctas-subtext">
                  {vpSlides[vpSlideIndex].subtext}
                </div>
                <div className="vp-ctas-benefits">
                  {vpSlides[vpSlideIndex].benefits.map((benefit, idx) => (
                    <div key={idx} className="vp-ctas-benefit" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.6 + idx * 0.1}s both`
                    }}>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {vpSlides[vpSlideIndex].type === 'faq' && (
              <div className="vp-slide vp-slide-faq">
                <div className="vp-faq-title">
                  {vpSlides[vpSlideIndex].title}
                </div>
                <div className="vp-faq-items">
                  {vpSlides[vpSlideIndex].items.map((item, idx) => (
                    <div key={idx} className="vp-faq-item" style={{
                      animation: `slideInFeature 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.1 + idx * 0.2}s both`
                    }}>
                      <div className="vp-faq-question">{item.q}</div>
                      <div className="vp-faq-answer">{item.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ─── LADO DERECHO: Formulario ─── */}
        <main className="login-right">
          <div className="login-right-inner">
            <div className="form-container">
              <div className="auth-form">
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                  <Link to="/login" style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 8,
                    color: '#888',
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ff8c42'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    <FiArrowLeft size={16} /> Volver al inicio de sesión
                  </Link>
                </div>

                <h3 className="form-title">¿Olvidaste tu contraseña?</h3>
                <p style={{ color: '#666', marginBottom: 24, fontSize: '0.9rem' }}>
                  Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
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

                  {/* ─── Botón "Enviar enlace" centrado ─── */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <IconTextButton
                      variant="success"
                      size="md"
                      inline={false}
                      icon={<FiMail size={17} />}
                      onClick={handleSubmit}
                      disabled={loading}
                      title="enviar enlace"
                      block={true}
                      style={{ maxWidth: '280px' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner" /> Enviando...
                        </>
                      ) : (
                        'Enviar enlace de recuperación'
                      )}
                    </IconTextButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <Footer />
      </div>
    </div>
  );
}