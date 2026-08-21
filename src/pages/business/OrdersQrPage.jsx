import React, { useState, useEffect } from 'react';
import { FiLink, FiCopy, FiShare2, FiCheck, FiX } from 'react-icons/fi';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import { useBusinessContext } from '../../admin/config/BusinessContext';

export default function BusinessQrSharePage() {
  const { user } = useSession();
  const { selectedBusiness } = useBusinessContext();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Obtener datos del negocio desde el contexto
  const businessSlug = selectedBusiness?.slug || user?.businessSlug || user?.slug || '';
  const businessName = selectedBusiness?.name || user?.businessName || user?.name || 'Mi Negocio';
  const businessLogo = selectedBusiness?.logo_url || user?.logo_url || selectedBusiness?.logo || user?.logo || '';
  const businessAddress = selectedBusiness?.address || user?.address || '';
  const businessPhone = selectedBusiness?.phone || user?.phone || '';
  const businessRuc = selectedBusiness?.ruc || user?.ruc || '';
  const businessEmail = selectedBusiness?.email || user?.email || '';

  function copiarEnlace() {
    const url = `${window.location.origin}/${businessSlug}/qr`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      // Fallback para navegadores que no soportan clipboard
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        setError('No se pudo copiar el enlace');
        setTimeout(() => setError(''), 3000);
      }
      document.body.removeChild(textArea);
    });
  }

  function compartirEnlace() {
    const url = `${window.location.origin}/${businessSlug}/qr`;
    const text = `¡Escanea el código QR o visita el enlace para ver el menú digital de ${businessName}!`;
    
    if (navigator.share) {
      navigator.share({
        title: `Menú Digital - ${businessName}`,
        text: text,
        url: url,
      }).catch(() => {});
    } else {
      copiarEnlace();
    }
  }

  const publicUrl = `${window.location.origin}/${businessSlug}/qr`;

  if (!businessSlug) {
    return (
      <PageTemplate title="📱 Compartir Menú Digital" subtitle="Comparte tu menú QR con tus clientes">
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#8a9bb5'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔗</div>
          <h3>No se encontró información del negocio</h3>
          <p>Configura tu negocio para generar el enlace público.</p>
        </div>
      </PageTemplate>
    );
  }

  return (
    <PageTemplate 
      title="Compartir Menú Digital" 
      subtitle="Comparte tu menú QR con tus clientes"
      loading={loading}
    >
      <div className="business-qr-share-container" style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: '20px'
      }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '16px' }}>
            <FiX size={16} />
            {error}
          </div>
        )}

        {/* Tarjeta del negocio */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          border: '1px solid #e8edf3',
          marginBottom: '24px'
        }}>
          {/* Logo y nombre */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {businessLogo ? (
              <img 
                src={businessLogo} 
                alt={businessName} 
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  marginBottom: '12px',
                  border: '3px solid #e8edf3'
                }}
              />
            ) : (
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                margin: '0 auto 12px',
                color: 'white'
              }}>
                🏪
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: '24px', color: '#1a2332' }}>{businessName}</h2>
          </div>

          {/* Información del negocio */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px'
          }}>
            {businessRuc && (
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e8edf3'
              }}>
                <div style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>RUC</div>
                <div style={{ fontSize: '14px', color: '#1a2332', fontWeight: 500 }}>{businessRuc}</div>
              </div>
            )}
            {businessPhone && (
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e8edf3'
              }}>
                <div style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>Teléfono</div>
                <div style={{ fontSize: '14px', color: '#1a2332', fontWeight: 500 }}>{businessPhone}</div>
              </div>
            )}
            {businessAddress && (
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e8edf3',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>Dirección</div>
                <div style={{ fontSize: '14px', color: '#1a2332', fontWeight: 500 }}>{businessAddress}</div>
              </div>
            )}
            {businessEmail && (
              <div style={{
                padding: '12px',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e8edf3',
                gridColumn: '1 / -1'
              }}>
                <div style={{ fontSize: '11px', color: '#8a9bb5', textTransform: 'uppercase', fontWeight: 600 }}>Email</div>
                <div style={{ fontSize: '14px', color: '#1a2332', fontWeight: 500 }}>{businessEmail}</div>
              </div>
            )}
          </div>

          {/* Enlace público */}
          <div style={{
            background: '#f8fafc',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e8edf3'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FiLink size={18} style={{ color: '#667eea' }} />
              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1a2332' }}>Enlace del menú digital</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'white',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e8edf3'
            }}>
              <code style={{
                flex: 1,
                fontSize: '13px',
                color: '#1a2332',
                wordBreak: 'break-all',
                background: 'transparent',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                textDecorationColor: '#cbd5e1'
              }}>
                {publicUrl}
              </code>
              <button
                onClick={copiarEnlace}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#8a9bb5',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => e.target.style.background = '#f1f4f9'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
              >
                {copied ? <FiCheck size={16} color="#22c55e" /> : <FiCopy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={compartirEnlace}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }}
          >
            <FiShare2 size={18} />
            Compartir enlace
          </button>
        </div>

        {/* Información adicional */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1px solid #e8edf3'
        }}>
          <div style={{ fontSize: '13px', color: '#8a9bb5' }}>
            Comparte este enlace con tus clientes para que puedan ver el menú y hacer pedidos desde su celular
          </div>
          <div style={{ fontSize: '12px', color: '#8a9bb5', marginTop: '8px' }}>
            El código QR estará disponible próximamente
          </div>
        </div>
      </div>
    </PageTemplate>
  );
}