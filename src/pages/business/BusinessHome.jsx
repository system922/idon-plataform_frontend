// ========== src/pages/business/BusinessHome.jsx ==========
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../config/api';

// Iconos
import { 
  FiClock, FiZap, FiGift, FiTrendingUp, FiAward, FiBell, 
  FiInfo, FiLayers, FiPackage, FiShoppingCart, FiUsers, 
  FiSettings, FiBarChart2, FiCalendar, FiFileText, FiHome,
  FiMoon, FiSun, FiCloud  
} from 'react-icons/fi';
import { IoRocketOutline } from "react-icons/io5";
import { FaRegStar } from "react-icons/fa";
import { IoMegaphoneOutline } from "react-icons/io5";
import { HiOutlineSparkles } from "react-icons/hi2";
import { ImFire } from "react-icons/im";
import { BiSolidCrown } from "react-icons/bi";


// Mapeo de iconos por nombre
const ICON_MAP = {
  'rocket': IoRocketOutline,
  'star': FaRegStar,
  'zap': FiZap,
  'gift': FiGift,
  'trending-up': FiTrendingUp,
  'award': FiAward,
  'bell': FiBell,
  'megaphone': IoMegaphoneOutline,
  'info': FiInfo,
  'sparkles': HiOutlineSparkles,
  'fire': ImFire,
  'crown': BiSolidCrown,
  'layers': FiLayers,
  'package': FiPackage,
  'shopping-cart': FiShoppingCart,
  'users': FiUsers,
  'settings': FiSettings,
  'bar-chart': FiBarChart2,
  'calendar': FiCalendar,
  'clock': FiClock,
  'file-text': FiFileText,
  'home': FiHome,
};

const BusinessHome = () => {
  const navigate = useNavigate();
  const { user, userNavData, selectedBusiness, loadUserNavigation } = useSession();
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);

  // Cargar novedades IDON
  useEffect(() => {
    const loadNews = async () => {
      try {
        const response = await api.get('/admin/IdonNews/active');
        setNews(response.data?.data || []);
      } catch (error) {
        console.error('Error cargando novedades:', error);
      } finally {
        setNewsLoading(false);
      }
    };
    loadNews();
  }, []);

  // Obtener tipo de badge
  const getTypeBadge = (type) => {
    const types = {
      'new_module': { label: 'Nuevo Módulo', color: 'var(--text-muted)' },
      'improvement': { label: 'Mejora', color: 'var(--text-muted)' },
      'announcement': { label: 'Anuncio', color: 'var(--text-muted)' },
      'update': { label: 'Actualización', color: 'var(--text-muted)' },
      'feature': { label: 'Nueva Funcionalidad', color: 'var(--text-muted)' },
    };
    return types[type] || { label: type, color: '#94a3b8' };
  };

  // Obtener icono del nombre
  const getIcon = (iconName) => {
    const Icon = ICON_MAP[iconName] || FiInfo;
    return Icon;
  };

  // Obtener nombre completo del usuario
  const getFullName = () => {
    const first = user?.firstName || user?.first_name || '';
    const last = user?.lastName || user?.last_name || '';
    if (first && last) return `${first} ${last}`;
    if (first) return first;
    if (user?.name) return user.name;
    if (user?.username) return user.username;
    return 'Usuario';
  };

  // ✅ CORREGIDO: Cambiar 'emoji' por 'icon'
  const getGreeting = () => {
    const hour = new Date().getHours();
    const greetings = [
      { hours: [0, 1, 2, 3, 4, 5], icon: FiMoon, text: '¡Buenas noches' },
      { hours: [6, 7, 8, 9, 10, 11], icon: FiSun, text: '¡Buenos días' },
      { hours: [12, 13, 14, 15, 16, 17], icon: FiCloud, text: '¡Buenas tardes' },
      { hours: [18, 19, 20, 21, 22, 23], icon: FiMoon, text: '¡Buenas noches' },
    ];
    return greetings.find(g => g.hours.includes(hour)) || greetings[0];
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.icon; // ✅ AHORA SÍ TIENE 'icon'

  if (newsLoading) {
    return (
      <div className="business-home-loading">
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: '50%' }} />
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
        </div>
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: '50%' }} />
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
        </div>
        <div className="skeleton-card">
          <div className="skeleton-line" style={{ width: '50%' }} />
          <div className="skeleton-line" style={{ width: '30%' }} />
          <div className="skeleton-line" style={{ width: '70%' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="business-home">
      {/* ─── SALUDO EN UNA SOLA FILA ─── */}
      <div className="greeting-section">
        <GreetingIcon size={28} className="greeting-icon" />
        <span className="greeting-text">
          <span className="greeting-message">{greeting.text}</span>
          <span className="greeting-name">{getFullName()}</span>
        </span>
        <span className="greeting-divider">·</span>
        <span className="greeting-subtitle">Te tenemos las últimas novedades de la plataforma</span>
      </div>

      {/* ─── GRID DE NOVEDADES ─── */}
      {news.length > 0 ? (
        <div className="news-grid">
          {news.map((item) => {
            const typeInfo = getTypeBadge(item.type);
            const Icon = getIcon(item.icon);
            return (
              <div key={item.id} className={`news-card ${item.is_highlight ? 'highlight' : ''}`}>
                <div className="news-card-header">
                  <Icon size={22} className="news-card-icon" />
                  <span 
                    className="news-card-type"
                    style={{ background: `${typeInfo.color}18`, color: typeInfo.color }}
                  >
                    {typeInfo.label}
                  </span>
                  {item.is_highlight && (
                    <span className="news-card-highlight">★</span>
                  )}
                </div>
                <h3 className="news-card-title">{item.title}</h3>
                <p className="news-card-content">{item.content}</p>
                {/* ─── IMAGEN SI EXISTE ─── */}
                {item.image_url && (
                  <div className="news-card-image">
                    <img src={item.image_url} alt={item.title} />
                  </div>
                )}
                <div className="news-card-footer">
                  <span className="news-card-date">
                    <FiClock size={12} />
                    {new Date(item.created_at).toLocaleDateString('es-EC', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="news-empty">
          <FiInfo size={48} className="news-empty-icon" />
          <h3>No hay novedades disponibles</h3>
          <p>Pronto compartiremos las últimas actualizaciones.</p>
        </div>
      )}
    </div>
  );
};

export default BusinessHome;