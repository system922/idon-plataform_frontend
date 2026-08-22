// src/pages/BlogPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import { ExternalLink } from 'lucide-react';

const BlogPage = () => {
  const articles = [
    {
      id: 1,
      title: 'Facturación Electrónica en Ecuador: Lo que todo negocio debe saber en 2026',
      excerpt: 'A partir del 1 de enero de 2026, todos los comprobantes electrónicos en Ecuador deben transmitirse al SRI en tiempo real. Conoce los plazos, las sanciones y cómo IDON te ayuda a cumplir sin estrés.',
      date: '25 de febrero, 2026',
      source: 'EDICOM Group / SRI Ecuador',
      sourceLink: 'https://edicomgroup.com/es/blog/como-es-la-factura-electronica-en-ecuador'
    },
    {
      id: 2,
      title: 'Ecuador perdió más de 100.000 empresas en 2024: el desafío de las MIPYMES',
      excerpt: 'Según el INEC, Ecuador pasó de 1.173.985 empresas activas en 2023 a 1.073.524 en 2024, una pérdida de más de 100.000 unidades productivas. Las microempresas representan más de 1,1 millones del total de 1,2 millones de unidades productivas en el país.',
      date: '20 de febrero, 2026',
      source: 'INEC Ecuador / Radio Pichincha',
      sourceLink: 'https://www.radiopichincha.com/ecuador-empresas-miles-inec/'
    },
    {
      id: 3,
      title: 'Artesanos ecuatorianos: Exportaciones por USD 86,2 millones en 2023',
      excerpt: 'En 2023, el sector artesanal ecuatoriano registró exportaciones por USD 86,2 millones, con Estados Unidos como su principal destino. El registro único de artesanos permite acceder a beneficios como la exoneración del impuesto de patentes.',
      date: '15 de febrero, 2026',
      source: 'Ministerio de Producción / Datos Abiertos Ecuador',
      sourceLink: 'https://www.produccion.gob.ec/ministerio-de-produccion-impulsa-la-competitividad-de-las-artesanias-ecuatorianas/'
    },
    {
      id: 4,
      title: 'Agricultura familiar en América Latina: el rol clave de los intermediarios',
      excerpt: 'Un estudio de la CEPAL analiza cómo los intermediarios estructuran las cadenas de valor agropecuarias en Guatemala, El Salvador y República Dominicana. La contribución de los intermediarios a la generación de valor agregado depende de las capacidades tecnológicas de los productores y la estructura de mercado.',
      date: '10 de febrero, 2026',
      source: 'CEPAL – Serie Estudios y Perspectivas',
      sourceLink: 'https://www.cepal.org/es/publicaciones/45796-intermediarios-cadenas-valor-agropecuarias-un-analisis-la-apropiacion-generacion'
    },
    {
      id: 5,
      title: 'Microempresas en Ecuador: el 87,4% de crecimiento en ventas que sorprende a los gremios',
      excerpt: 'Según el Banco Central del Ecuador, las microempresas registraron un incremento de ventas del 87,4% entre enero y marzo de 2025 en el sector comercial. Sin embargo, más del 50% son informales y enfrentan tasas de interés de hasta el 36% para financiamiento.',
      date: '5 de febrero, 2026',
      source: 'Banco Central del Ecuador / Ecuavisa',
      sourceLink: 'https://www.ecuavisa.com/economia/el-banco-central-reporta-crecimiento-record-de-microempresas-pero-gremios-discrepan-20250717-0051.html'
    }
  ];

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

          <div className="blog-grid">
            {articles.map((article) => (
              <div key={article.id} className="blog-card">
                <h3>{article.title}</h3>
                <p>{article.excerpt}</p>
                <div className="blog-meta">
                  <span className="blog-date">{article.date}</span>
                  <a 
                    href={article.sourceLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="blog-source"
                  >
                    <ExternalLink size={14} />
                    {article.source}
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* Sección de fuentes destacadas */}
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