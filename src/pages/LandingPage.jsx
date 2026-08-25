import React from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight } from 'react-icons/fi';
import { IconTextButton } from '../components/General/Button';
import PublicHeader from '../components/PublicHeader';
import { CheckCircle, Users, ShoppingBag, Clipboard, Building, TrendingUp, Leaf, Rocket } from 'lucide-react';
import { FiSmartphone } from "react-icons/fi";


const LandingPage = () => {
  return (
    <div className="landing-container">
      <PublicHeader/>

      <main className="landing-main">
        {/* ===== H1: EL MÁS IMPORTANTE ===== */}
        <h1>IDON Control : Simplemente eficiente</h1>

        <p className="lead">
          <strong>“Tu negocio en tu bolsillo.” </strong>
          <Link to="/precios">Facturación electrónica</Link>,
          <Link to="/precios"> inventario inteligente</Link>,
          <Link to="/precios"> POS</Link>
          <Link to="/precios"> en una sola plataforma. </Link> 
          Desde <strong> $10 al mes</strong>, sin complicaciones.
          <Link to="/contacto"> Contáctanos</Link> para más información.
        </p>

        {/* ===== IMÁGENES CON OPTIMIZACIÓN LCP ===== */}
        <div className="images-grid">
          <picture>
            <source 
              type="image/webp"
              srcSet="/landing-400.webp 400w, /landing-800.webp 800w, /landing-1200.webp 1200w"
              sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 50vw"
            />
            <img 
              src="/landing-800.webp" 
              alt="IDON - Facturación y ventas" 
              className="landing-image" 
              width="634" 
              height="272" 
              loading="eager" 
              fetchPriority="high" 
            />
          </picture>

          {/* IMAGEN SECUNDARIA - CARGA DIFERIDA */}
          <picture>
            <source 
              type="image/webp"
              srcSet="/landing2-400.webp 400w, /landing2-800.webp 800w, /landing2-1200.webp 1200w"
              sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 50vw"
            />
            <img 
              src="/landing2-800.webp"
              alt="IDON - Gestión y control" 
              className="landing-image" 
              width="634" 
              height="272" 
              loading="lazy" 
            />
          </picture>
        </div>

        {/* ===== SECCIÓN 1: ¿QUÉ ES IDON? (H2) ===== */}
        <section className="features-grid">
          <div className="feature-card">
            <h2>¿Qué es IDON?</h2>
            <p>
              <strong>IDON</strong> es el <strong>cerebro de tu negocio en tu bolsillo</strong>. 
              Te permite facturar desde tu celular, cobrar rápido con POS, abrir y cerrar caja 
              con control de arqueo, consultar el estado de tus comprobantes en el SRI y tener 
              una base de datos completa de tus clientes.
            </p>
            <p style={{ marginTop: '1rem' }}>
              Diseñado para emprendedores y dueños de negocios en Ecuador, IDON unifica 
              la gestión de <strong>ventas, inventario, facturación electrónica y CRM </strong> 
              en una sola plataforma. Olvídate de hojas de cálculo y sistemas desconectados: 
              con IDON, todo fluye en tiempo real desde cualquier dispositivo.
            </p>
          </div>

          {/* ===== SECCIÓN 2: FUNCIONALIDADES (H3) ===== */}
          <div className="feature-card">
            <h3>+50 Funcionalidades para crecer</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><CheckCircle size={14} color="var(--text-primary)" /> Facturación electrónica directo al SRI</li>
              <li><CheckCircle size={14} color="var(--text-primary)" /> Control de inventario en tiempo real</li>
              <li><CheckCircle size={14} color="var(--text-primary)" /> CRM con campañas de email marketing</li>
              <li><CheckCircle size={14} color="var(--text-primary)" /> Reportes ejecutivos desde el celular</li>
            </ul>
          </div>

          {/* ===== SECCIÓN 3: PARA QUIÉN ES IDON (H3) ===== */}
          <div className="feature-card">
            <h3>¿Para quién es IDON?</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><strong><ShoppingBag size={14} color="var(--text-primary)" /> Artesanos</strong> – Facturación SRI y ventas directas</li>
              <li><strong><Leaf size={14} color="var(--text-primary)" /> Agricultores</strong> – Venta sin intermediarios</li>
              <li><strong><Building size={14} color="var(--text-primary)" /> MIPYMES</strong> – Gestión y control</li>
              <li><strong><Rocket size={14} color="var(--text-primary)" /> Emprendedores</strong> – Todo desde el día 1</li>
            </ul>
          </div>
        </section>

        {/* ===== SECCIÓN 4: ECOSISTEMA IDON (H2) ===== */}
        <section className="audience-section">
          <h2>Ecosistema IDON Control v2.0</h2>
          <p>Módulos clave para transformar tu negocio:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem' }}>
            <div><h3 style={{ fontSize: '1rem', margin: 0, display: 'inline' }}><ShoppingBag size={15} color="var(--text-primary)" /> POS & Comandas</h3> – Ventas rápidas, cierre de caja.</div>
            <div><h3 style={{ fontSize: '1rem', margin: 0, display: 'inline' }}><Clipboard size={15} color="var(--text-primary)" /> Inventario Inteligente</h3> – Ajustes de stock.</div>
            <div><h3 style={{ fontSize: '1rem', margin: 0, display: 'inline' }}><Building size={15} color="var(--text-primary)" /> Facturación SRI</h3> – Emisión automática validada.</div>
            <div><h3 style={{ fontSize: '1rem', margin: 0, display: 'inline' }}><TrendingUp size={15} color="var(--text-primary)" /> Analítica de datos</h3> – KPI de rentabilidad.</div>
            <div><h3 style={{ fontSize: '1rem', margin: 0, display: 'inline' }}><Users size={15} color="var(--text-primary)" /> CRM & Marketing</h3> – Segmentación y campañas.</div>
          </div>
        </section>

        {/* ===== NUEVA SECCIÓN 5: BENEFICIOS CLAVE ===== */}
        <section className="benefits-section" style={{ marginTop: '2.5rem' }}>
          <h2>Beneficios de usar IDON en tu negocio</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div className="benefit-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><TrendingUp size={15} color="var(--text-primary)" /> Control total en tiempo real</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                Monitorea tus ventas, inventario y flujo de caja desde cualquier lugar. 
                Toma decisiones basadas en datos actualizados al instante, sin esperar 
                reportes manuales que retrasen tu operación.
              </p>
            </div>
            <div className="benefit-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><Building size={15} color="var(--text-primary)" /> Facturación electrónica ágil</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                Emite facturas con validez legal directamente 
                al SRI. Ahorra tiempo y evita errores con un sistema automatizado que se 
                actualiza con los cambios normativos.
              </p>
            </div>
            <div className="benefit-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><FiSmartphone size={15} color="var(--text-primary)" /> Gestión desde tu móvil</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                Tu negocio en el bolsillo. Consulta inventario, realiza ventas, emite 
                facturas y revisa tus indicadores clave desde tu celular, en cualquier 
                momento y lugar, sin necesidad de estar frente a un computador.
              </p>
            </div>
            <div className="benefit-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}><Users size={15} color="var(--text-primary)" /> CRM integrado para fidelizar</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                Conoce a tus clientes, segmenta tu base de datos y envía campañas de 
                email marketing personalizadas. Aumenta tus ventas recurriendo a quienes 
                ya confían en tu negocio.
              </p>
            </div>
          </div>
        </section>

        {/* ===== NUEVA SECCIÓN 6: TESTIMONIO ===== */}
        <section className="testimonial-section" style={{ marginTop: '2rem' }}>
          <div className="testimonial-card" style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: 'var(--font-size-md)' }}>
              "Con IDON, pasé de manejar todo en Excel a tener mi negocio automatizado. 
              La facturación al SRI es un alivio y el control de inventario me permite 
              saber qué vender y cuándo reponer."
            </p>
            <p style={{ fontWeight: 'bold', marginTop: '0.5rem', color: 'var(--text-primary)' }}>
              — Plinio V., dueño de tienda de retail
            </p>
          </div>
        </section>

        {/* ===== NUEVA SECCIÓN 7: PREGUNTAS FRECUENTES (FAQ) ===== */}
        <section className="faq-section" style={{ marginTop: '2.5rem', background: 'var(--bg-tertiary)', padding: '2rem', borderRadius: 'var(--radius)' }}>
          <h2>Preguntas frecuentes sobre IDON</h2>
          <div style={{ display: 'grid', gap: '1.2rem', marginTop: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>¿IDON es solo para restaurantes?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                No. IDON está diseñado para cualquier negocio que necesite gestionar ventas, 
                inventario y facturación: desde artesanos y agricultores hasta tiendas de 
                retail, servicios profesionales y MIPYMES de diversos sectores.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>¿IDON funciona sin conexión a internet?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                IDON es una plataforma 100% en la nube, por lo que requiere conexión a internet 
                para funcionar. Sin embargo, hemos optimizado la aplicación para que funcione 
                de manera rápida y estable incluso en conexiones móviles con baja señal, 
                garantizando que puedas facturar y gestionar tu negocio desde cualquier lugar 
                con cobertura.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>¿Qué incluye el plan desde $10/mes?</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: 'var(--font-size-sm)' }}>
                El plan básico incluye facturación electrónica, control de inventario, 
                POS para ventas en punto de venta y reportes básicos. 
                Puedes escalar a planes superiores para acceder a CRM avanzado.
              </p>
            </div>
          </div>
        </section>

        {/* ===== CTA FINAL (H2) ===== */}
        <section className="cta-section">
          <h2>Empieza a gestionar tu negocio hoy</h2>
          <p>Únete y descubre lo fácil que es manejar tu negocio.</p>
          
          {/* Botón personalizado con navegación */}
          <IconTextButton
            variant="success"
            size="lg"
            inline={true}
            icon={<FiArrowRight size={15} />}
            onClick={() => window.location.href = '/login'}  // O usa useNavigate
            title="Regístrate ahora"
          >
            Regístrate ahora – Desde $10/mes
          </IconTextButton>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;