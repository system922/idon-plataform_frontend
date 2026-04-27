/**
 * UnderConstructionPage.jsx
 * Template reutilizable para páginas en construcción.
 */
import { useNavigate, useLocation } from 'react-router-dom';
import { FiTool, FiArrowLeft, FiClock } from 'react-icons/fi';

export default function UnderConstructionPage({ title, subtitle, icon, accentColor = '#ff8c42' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.35)', fontSize: 13,
          padding: 0, marginBottom: 28,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
      >
        <FiArrowLeft size={14} /> Atrás
      </button>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 800, color: '#fff' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px dashed ${accentColor}40`,
        borderRadius: 18, padding: '56px 40px', textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: `${accentColor}15`,
          border: `1px solid ${accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: accentColor,
        }}>
          {icon || <FiTool size={30} />}
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
          Sección en construcción
        </h2>

        <p style={{ margin: '0 0 6px', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>
          Esta funcionalidad estará disponible próximamente.
        </p>

        <p style={{
          margin: '20px 0 0', color: 'rgba(255,255,255,0.2)',
          fontSize: 12, fontFamily: 'monospace',
          background: 'rgba(0,0,0,0.25)', display: 'inline-block',
          padding: '5px 12px', borderRadius: 6,
        }}>
          {pathname}
        </p>

        {/* Badge */}
        <div style={{
          marginTop: 24, display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 6,
          color: accentColor, fontSize: 12, fontWeight: 600,
        }}>
          <FiClock size={13} />
          Próximamente
        </div>
      </div>
    </div>
  );
}
