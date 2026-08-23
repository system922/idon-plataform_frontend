// src/pages/BlogPage.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { ExternalLink } from 'lucide-react';
import { FiClock } from 'react-icons/fi';
import { api } from '../config/api';

const BlogPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await api.get('/blog/news');
        
        if (response.data?.success && Array.isArray(response.data?.data)) {
          const activeArticles = response.data.data.filter(
            article => article.is_active === true
          );
          setArticles(activeArticles);
        } else {
          setArticles([]);
        }
      } catch (err) {
        setError('No se pudieron cargar los artículos.');
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const getTypeLabel = (type) => {
    const types = {
      'new_module': 'Nuevo Módulo',
      'improvement': 'Mejora',
      'announcement': 'Anuncio',
      'update': 'Actualización',
      'feature': 'Nueva Funcionalidad',
    };
    return types[type] || type;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="landing-container">
        <PublicHeader />
        <main className="landing-main">
          <div className="blog-container">
            <div className="blog-loading">Cargando artículos...</div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="landing-container">
        <PublicHeader />
        <main className="landing-main">
          <div className="blog-container">
            <div className="blog-error">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="landing-container">
      <PublicHeader />

      <main className="landing-main">
        <div className="blog-container">
          <h1 className="blog-title">Blog IDON</h1>
          <p className="blog-subtitle">
            <strong>Información con respaldo oficial.</strong> Consejos, tendencias y datos reales 
            para potenciar tu negocio. Todas nuestras estadísticas tienen fuentes verificables.
          </p>

          {articles.length === 0 ? (
            <div className="blog-empty">
              <p>No hay artículos disponibles en este momento.</p>
            </div>
          ) : (
            <div className="blog-grid">
              {articles.map((article) => {
                const hasImage = article.image_url && article.image_url.trim() !== '';
                
                return (
                  <div 
                    key={article.id} 
                    className={`blog-card ${hasImage ? 'has-image' : ''}`}
                  >
                    {hasImage && (
                      <div className="blog-card-image">
                        <img src={article.image_url} alt={article.title} />
                      </div>
                    )}
                    <div className="blog-card-content">
                      <span className="blog-card-type">{getTypeLabel(article.type)}</span>
                      <h3>{article.title}</h3>
                      <p>{article.content}</p>
                      <div className="blog-meta">
                        <span className="blog-date">
                          <FiClock size={14} />
                          {formatDate(article.created_at)}
                        </span>
                        {article.is_highlight && (
                          <span className="blog-highlight">★ Destacado</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="blog-sources-section">
            <h3>Fuentes oficiales consultadas</h3>
            <p className="sources-description">
              Toda la información publicada está respaldada por estas entidades oficiales:
            </p>
            <div className="sources-grid">
              <a href="https://www.sri.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> SRI Ecuador
              </a>
              <a href="https://www.ecuadorencifras.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> INEC Ecuador
              </a>
              <a href="https://www.cepal.org" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> CEPAL
              </a>
              <a href="https://www.produccion.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Ministerio de Producción
              </a>
              <a href="https://www.bce.fin.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Banco Central del Ecuador
              </a>
              <a href="https://www.datosabiertos.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} /> Datos Abiertos Ecuador
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BlogPage;