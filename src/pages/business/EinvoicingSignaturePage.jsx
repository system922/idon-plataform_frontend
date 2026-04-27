import { useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import { Settings, ArrowRight } from 'react-feather';

export default function EinvoicingSignaturePage() {
  const navigate = useNavigate();

  return (
    <PageTemplate title="Firma Electrónica" theme="business">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 20, padding: '48px 24px', textAlign: 'center', maxWidth: 480, margin: '0 auto',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg,#6842fe,#7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Settings size={30} color="#fff" />
        </div>

        <div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
            Firma Electrónica
          </div>
          <div style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
            La firma electrónica (.p12), los datos del emisor y el ambiente SRI
            ahora se gestionan desde <strong style={{ color: '#a78bfa' }}>Ajustes del negocio</strong>.
          </div>
        </div>

        <button
          onClick={() => navigate('/app/core/core.settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 24px',
            background: 'linear-gradient(135deg,#6842fe,#7c3aed)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}
        >
          Ir a Ajustes del negocio <ArrowRight size={16} />
        </button>
      </div>
    </PageTemplate>
  );
}
