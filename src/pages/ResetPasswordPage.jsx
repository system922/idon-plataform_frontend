// ========== src/pages/ResetPasswordPage.js ==========
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiLock, FiCheckCircle, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import { api } from '../config/api';
import Input from '../components/General/Input';
import { IconTextButton } from '../components/General/Button';
import { useAlert } from '../components/ConfirmContext';
import Footer from '../components/common/Footer';

const SYSTEM_LOGO_URL = process.env.PUBLIC_URL + '/system.svg';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const alert = useAlert();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

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

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await api.post('/auth/validate-reset-token', { token });
        if (response.data?.ok) {
          setTokenValid(true);
          setEmail(response.data.data?.email || '');
        } else {
          setTokenValid(false);
        }
      } catch {
        setTokenValid(false);
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password.length < 6) {
      await alert.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      await alert.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        password,
        confirmPassword
      });

      if (response.data?.ok) {
        setResetSuccess(true);
        await alert.success(
          'Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.',
          '¡Contraseña actualizada!'
        );
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Error al restablecer la contraseña';
      await alert.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Pantalla de validación ────────────────────────────────
  if (validating) {
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
                  <div className="spinner-brand" style={{ padding: '40px 0', textAlign: 'center' }}>
                    <div className="spinner-loader spinner-loader-lg spinner-primary" />
                    <p style={{ color: '#666', marginTop: 16 }}>Validando enlace...</p>
                  </div>
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

  // ─── Token inválido ──────────────────────────────────────────
  if (!tokenValid) {
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
                  <div className="auth-icon error" style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    <FiAlertCircle size={48} color="#dc3545" />
                  </div>
                  <h3 className="form-title" style={{ textAlign: 'center' }}>Enlace inválido o expirado</h3>
                  <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
                    El enlace de recuperación que has utilizado no es válido o ya ha expirado.
                    Por favor, solicita un nuevo enlace de recuperación.
                  </p>
                  <IconTextButton
                    variant="primary"
                    size="md"
                    inline={false}
                    icon={<FiLock size={17} />}
                    onClick={() => navigate('/forgot-password')}
                    title="solicitar nuevo enlace"
                    block={true}
                  >
                    Solicitar nuevo enlace
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

  // ─── Reset exitoso ───────────────────────────────────────────
  if (resetSuccess) {
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
                  <h3 className="form-title" style={{ textAlign: 'center' }}>¡Contraseña actualizada!</h3>
                  <p style={{ textAlign: 'center', color: '#666', marginBottom: 24 }}>
                    Tu contraseña ha sido actualizada exitosamente.
                    Serás redirigido al inicio de sesión en unos segundos.
                  </p>
                  <IconTextButton
                    variant="primary"
                    size="md"
                    inline={false}
                    icon={<FiArrowLeft size={17} />}
                    onClick={() => navigate('/login')}
                    title="ir al login"
                    block={true}
                  >
                    Ir al inicio de sesión
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

  // ─── Formulario de reset ─────────────────────────────────────
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
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff8c42'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#888'}
                  >
                    <FiArrowLeft size={16} /> Volver al inicio de sesión
                  </button>
                </div>

                <h3 className="form-title">Restablecer contraseña</h3>
                <p style={{ color: '#666', marginBottom: 8 }}>
                  {email && (
                    <span>Restableciendo contraseña para <strong>{email}</strong></span>
                  )}
                </p>
                <p style={{ color: '#888', fontSize: '0.85rem', marginBottom: 24 }}>
                  Ingresa tu nueva contraseña.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label><FiLock size={14} /> NUEVA CONTRASEÑA</label>
                    <Input
                      type="password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Mínimo 6 caracteres"
                      size="md"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label><FiLock size={14} /> CONFIRMAR CONTRASEÑA</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Repite tu nueva contraseña"
                      size="md"
                      disabled={loading}
                      required
                    />
                    {password && confirmPassword && password !== confirmPassword && (
                      <small className="hint-error">Las contraseñas no coinciden</small>
                    )}
                  </div>

                  {/* ─── Botón "Restablecer contraseña" centrado ─── */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                    <IconTextButton
                      variant="success"
                      size="md"
                      inline={false}
                      icon={<FiCheckCircle size={17} />}
                      onClick={handleSubmit}
                      disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                      title="restablecer contraseña"
                      block={true}
                      style={{ maxWidth: '280px' }}
                    >
                      {loading ? (
                        <>
                          <span className="spinner" /> Actualizando...
                        </>
                      ) : (
                        'Restablecer contraseña'
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