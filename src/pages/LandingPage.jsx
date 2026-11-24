import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Boxes,
  FileCheck2,
  MonitorSmartphone,
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';

const benefits = [
  {
    icon: BarChart3,
    title: 'Decisiones con claridad',
    description: 'Consulta ventas, gastos y resultados con información actualizada.',
  },
  {
    icon: FileCheck2,
    title: 'Facturación electrónica',
    description: 'Emite comprobantes electrónicos y gestiona tu operación desde un solo lugar.',
  },
  {
    icon: Boxes,
    title: 'Inventario bajo control',
    description: 'Organiza tus productos y conoce sus movimientos en tiempo real.',
  },
  {
    icon: MonitorSmartphone,
    title: 'Tu negocio, donde estés',
    description: 'Accede a tus herramientas de gestión desde computador, tablet o celular.',
  },
];

const LandingPage = () => (
  <div className="landing-container">
    <PublicHeader />

    <main className="landing-main">
      <section className="landing-hero">
        <img
          className="landing-hero__image"
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=85"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
        />
        <div className="landing-hero__overlay" />
        <div className="landing-hero__content">
          <h1 className="hero-title">IDON Control: gestión de ventas, inventario y operaciones.</h1>
          <p className="landing-hero__subtitle">
            Una plataforma integral para administrar tu negocio con información clara,
            procesos conectados y más tiempo para crecer.
          </p>
          <div className="landing-hero__actions">
            <Link className="landing-button landing-button--primary" to="/precios">
              Empieza ahora <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a className="landing-button landing-button--outline" href="#beneficios">
              Ver características
            </a>
          </div>
        </div>
      </section>

      <section className="landing-product" id="producto" aria-labelledby="landing-product-title">
        <div className="landing-section-heading">
          <h2 id="landing-product-title">Así se ve IDON Control</h2>
          <p>
            Explora el panel de control y la pantalla de ventas y facturación de la plataforma.
          </p>
        </div>
        <div className="landing-gallery">
          <img
            src="/landing-640.webp"
            srcSet="/landing-320.webp 320w, /landing-400.webp 400w, /landing-640.webp 640w, /landing-800.webp 800w, /landing-1200.webp 1200w"
            sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1240px) calc((100vw - 64px) / 2), 576px"
            alt="Panel de control de IDON Control con indicadores y gráfico de ventas"
            width="634"
            height="272"
            loading="lazy"
          />
          <img
            src="/landing2-640.webp"
            srcSet="/landing2-320.webp 320w, /landing2-400.webp 400w, /landing2-640.webp 640w, /landing2-800.webp 800w, /landing2-1200.webp 1200w"
            sizes="(max-width: 600px) calc(100vw - 32px), (max-width: 1240px) calc((100vw - 64px) / 2), 576px"
            alt="Pantalla de ventas y facturación de IDON Control"
            width="634"
            height="272"
            loading="lazy"
          />
        </div>
      </section>

      <section className="landing-benefits" id="beneficios" aria-labelledby="landing-benefits-title">
        <div className="landing-section-heading">
          <h2 id="landing-benefits-title">Control confiable para cada día</h2>
          <p>Las funciones esenciales para llevar una operación más ordenada y conectada.</p>
        </div>
        <div className="landing-benefits__grid">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article className="landing-benefit" key={title}>
              <span className="landing-benefit__icon">
                <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="landing-cta-title">
        <div>
          <div className="landing-cta__badge" aria-label="IDON Control">
            <img src="/LOGO_IDON__3_blanco.png" alt="" aria-hidden="true" />
          </div>
          <h2 id="landing-cta-title">Tu negocio merece una gestión más simple.</h2>
          <p>Conoce los planes y encuentra el que mejor se adapta a tu operación.</p>
        </div>
        <Link className="landing-button landing-button--primary" to="/precios">
          Conocer los planes <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </section>
    </main>
  </div>
);

export default LandingPage;
