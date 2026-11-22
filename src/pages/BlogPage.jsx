import React, { useEffect, useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import { ExternalLink } from 'lucide-react';
import { FiClock } from 'react-icons/fi';
import { api } from '../config/api';

const BlogSkeleton = () => (
  <div className="blog-grid" aria-busy="true" aria-label="Cargando artículos">
    {[1, 2, 3].map((item) => (
      <article className="blog-card blog-skeleton-card" key={item}>
        <div className="skeleton-block blog-skeleton-image" />
        <div className="blog-card-content">
          <div className="skeleton-block skeleton-type" />
          <div className="skeleton-block skeleton-card-title" />
          <div className="skeleton-block skeleton-card-line" />
          <div className="skeleton-block skeleton-card-line" />
          <div className="skeleton-block skeleton-card-line skeleton-card-line-short" />
          <div className="skeleton-block skeleton-meta" />
        </div>
      </article>
    ))}
  </div>
);

const getTypeLabel = (type) => {
  const types = {
    new_module: 'Nuevo módulo',
    improvement: 'Mejora',
    announcement: 'Anuncio',
    update: 'Actualización',
    feature: 'Nueva funcionalidad',
  };
  return types[type] || type;
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('es-EC', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const BlogPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/blog/news');
        if (!response.data?.success || !Array.isArray(response.data?.data)) {
          throw new Error('La respuesta del blog no contiene una lista de artículos.');
        }

        const activeArticles = response.data.data.filter(
          (article) => article.is_active === true
        );
        if (isMounted) {
          setArticles(activeArticles);
        }
      } catch (requestError) {
        console.error('No se pudieron cargar los artículos del blog:', requestError);
        if (isMounted) {
          setError('No pudimos conectar con el servicio del blog. Intenta de nuevo más tarde.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNews();
    return () => {
      isMounted = false;
    };
  }, [retryToken]);

  return (
    <div className="landing-container public-shell public-shell--blog">
      <PublicHeader />
      <main className="landing-main public-page">
        <div className="blog-container">
          <header className="public-page__intro">
            <h1 className="blog-title">Blog IDON</h1>
            <p className="public-page__lead">
              Novedades, consejos y recursos para gestionar tu negocio con más claridad.
            </p>
          </header>

          {loading && <BlogSkeleton />}

          {!loading && error && (
            <div className="blog-state blog-state--error" role="alert">
              <p>{error}</p>
              <button
                type="button"
                className="public-button"
                onClick={() => setRetryToken((current) => current + 1)}
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && articles.length === 0 && (
            <div className="blog-state">
              <p>No hay artículos publicados por el momento.</p>
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="blog-grid">
              {articles.map((article) => {
                const hasImage = article.image_url && article.image_url.trim() !== '';

                return (
                  <article
                    key={article.id}
                    className={`blog-card ${hasImage ? 'has-image' : ''}`}
                  >
                    {hasImage && (
                      <div className="blog-card-image">
                        <img src={article.image_url} alt="" loading="lazy" />
                      </div>
                    )}
                    <div className="blog-card-content">
                      <span className="blog-card-type">{getTypeLabel(article.type)}</span>
                      <h2>{article.title}</h2>
                      <p>{article.content}</p>
                      <div className="blog-meta">
                        <span className="blog-date">
                          <FiClock size={14} aria-hidden="true" />
                          {formatDate(article.created_at)}
                        </span>
                        {article.is_highlight && (
                          <span className="blog-highlight">Destacado</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="blog-sources-section" aria-labelledby="blog-sources-title">
            <h2 id="blog-sources-title">Fuentes de información</h2>
            <p className="sources-description">
              Consulta información y datos de entidades oficiales del Ecuador y la región.
            </p>
            <div className="sources-grid">
              <a href="https://www.sri.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> SRI Ecuador
              </a>
              <a href="https://www.ecuadorencifras.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> INEC Ecuador
              </a>
              <a href="https://www.cepal.org" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> CEPAL
              </a>
              <a href="https://www.produccion.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> Ministerio de Producción
              </a>
              <a href="https://www.bce.fin.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> Banco Central del Ecuador
              </a>
              <a href="https://www.datosabiertos.gob.ec" target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" /> Datos Abiertos Ecuador
              </a>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default BlogPage;
