// src/pages/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { CheckCircle, Users, ShoppingBag, Clipboard, Building, TrendingUp, Leaf, Rocket  } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="landing-container">
      <PublicHeader />

      <main className="landing-main">
        {/* H1 y eslogan */}
        <h1>IDON Control : Simplemente eficiente</h1>
        <p className="lead">
          <strong>“Tu negocio en tu bolsillo.”</strong> Facturación electrónica, inventario inteligente, 
          POS y CRM en una sola plataforma. Desde <strong>$10 al mes</strong>, sin complicaciones.
        </p>

        {/* ===== NUEVO: Dos imágenes después del lead ===== */}
        <div className="images-grid">
          <img
            src="/inicio+.png"
            alt="IDON - Facturación y ventas"
            className="landing-image"
          />
          <img
            src="/inicio2.png"
            alt="IDON - Gestión y control"
            className="landing-image"
          />
        </div>

        {/* Beneficios destacados */}
        <section className="features-grid">
          <div className="feature-card">
            <h2>¿Qué es IDON?</h2>
            <p>
              IDON es el <strong>cerebro de tu negocio en tu bolsillo</strong>. Te permite facturar desde tu celular, 
              cobrar rápido con POS, abrir y cerrar caja con control de arqueo, consultar el estado de tus 
              comprobantes en el SRI y tener una base de datos completa de tus clientes.
            </p>
          </div>
          <div className="feature-card">
            <h3>+50 Funcionalidades para crecer</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li><CheckCircle size={14} color="var(--text-primary)" />  Facturación electrónica directo al SRI</li>
              <li><CheckCircle size={14} color="var(--text-primary)" />  Control de inventario en tiempo real</li>
              <li><CheckCircle size={14} color="var(--text-primary)" />  CRM con campañas de email marketing</li>
              <li><CheckCircle size={14} color="var(--text-primary)" />  Reportes ejecutivos desde el celular</li>
            </ul>
          </div>
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

        {/* Módulos clave (de la presentación) */}
        <section className="audience-section">
          <h2>Ecosistema IDON Control v2.0</h2>
          <p>Módulos clave para transformar tu negocio:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: '1rem' }}>
            <div><strong><ShoppingBag size={15} color="var(--text-primary)" /> POS & Comandas</strong> – Ventas rápidas, cierre de caja.</div>
            <div><strong><Clipboard size={15} color="var(--text-primary)" /> Inventario Inteligente</strong> – Ajustes de stock.</div>
            <div><strong><Building size={15} color="var(--text-primary)" /> Facturación SRI</strong> – Emisión automática validada.</div>
            <div><strong><TrendingUp size={15} color="var(--text-primary)" /> Analítica de datos</strong> – KPI de rentabilidad.</div>
            <div><strong><Users size={15} color="var(--text-primary)" /> CRM & Marketing</strong> – Segmentación y campañas.</div>
          </div>
        </section>

        {/* CTA final */}
        <div className="cta-section">
          <h2>Empieza a gestionar tu negocio hoy</h2>
          <p>Únete y descubre lo fácil que es manejar tu negocio.</p>
          <Link to="/login" className="cta-button">Regístrate ahora – Desde $10/mes</Link>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;