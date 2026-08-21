// src/pages/BlogPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';


const BlogPage = () => {
  const articles = [
    {
      title: 'Cómo la facturación electrónica puede salvar tu negocio',
      excerpt: 'Descubre por qué el 70% de los artesanos aún no factura electrónicamente y cómo IDON te ayuda a cumplir con el SRI sin estrés.',
      date: '15 de agosto, 2026'
    },
    {
      title: 'Inventario inteligente: la clave para no perder ventas',
      excerpt: 'Aprende a usar alertas predictivas de stock y evita quedarte sin productos en tus días de mayor demanda.',
      date: '10 de agosto, 2026'
    },
    {
      title: 'De emprendedor a empresario: cómo IDON te acompaña en el camino',
      excerpt: 'Historias de éxito de negocios que crecieron con IDON y cómo tú también puedes lograrlo desde $10/mes.',
      date: '5 de agosto, 2026'
    },
    {
      title: 'MIPYMES: 5 errores de gestión que te cuestan dinero',
      excerpt: 'Identifica los fallos más comunes y cómo IDON te da el control para evitarlos y hacer crecer tu negocio.',
      date: '1 de agosto, 2026'
    }
  ];

  return (
    <div className="landing-container">
      <PublicHeader />

      <main className="landing-main">
        <h1>Blog IDON</h1>
        <p className="lead">Consejos, tendencias y noticias para potenciar tu negocio.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '2rem', margin: '3rem 0' }}>
          {articles.map((article, index) => (
            <div key={index} className="feature-card" style={{ cursor: 'pointer' }}>
              <h3>{article.title}</h3>
              <p>{article.excerpt}</p>
              <small style={{ color: 'var(--text-muted)' }}>{article.date}</small>
              <br />
              <Link to="#" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none' }}>Leer más →</Link>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default BlogPage;