// src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { CheckCircle, Users, ShoppingBag, Clipboard, Building, TrendingUp, Leaf, Rocket } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <PublicHeader />

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

        {/* ===== IMÁGENES ===== */}
        {/* ===== IMÁGENES CON OPTIMIZACIÓN LCP ===== */}
        <div className="images-grid">
          {/* IMAGEN PRINCIPAL - PRIORIDAD ALTA (LCP) */}
          <picture>
            <source srcSet="/landing.webp" type="image/webp" />
            <img 
              src="/landing.webp"
              alt="IDON - Facturación y ventas" 
              className="landing-image" 
              width="634" 
              height="272" 
              loading="eager" 
              fetchpriority="high" 
            />
          </picture>
          

          {/* IMAGEN SECUNDARIA - CARGA DIFERIDA */}
          <picture>
            <source srcSet="/landing_2.webp" type="image/webp" />
            <img 
              src="/landing_2.webp" 
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
              IDON es el <strong>cerebro de tu negocio en tu bolsillo</strong>. Te permite facturar desde tu celular, 
              cobrar rápido con POS, abrir y cerrar caja con control de arqueo, consultar el estado de tus 
              comprobantes en el SRI y tener una base de datos completa de tus clientes.
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

        {/* ===== CTA FINAL (H2) ===== */}
        <section className="cta-section">
          <h2>Empieza a gestionar tu negocio hoy</h2>
          <p>Únete y descubre lo fácil que es manejar tu negocio.</p>
          <Link to="/login" className="cta-button">Regístrate ahora – Desde $10/mes</Link>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;