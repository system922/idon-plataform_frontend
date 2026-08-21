import React, { useState, useMemo } from 'react';
import { useSession } from '../../context/SessionContext';
import { fetchWithAuth } from '../../config/api';
import { 
  FiAlertCircle, 
  FiBox, 
  FiCreditCard, 
  FiFileText, 
} from 'react-icons/fi';
import Modal from '../../components/General/Modal';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import Input from '../../components/General/Input';

// Denominaciones del sistema monetario Ecuador (USD)
const MONEDAS = [
  { key: 'moneda_001', label: '$0.01',  valor: 0.01 },
  { key: 'moneda_005', label: '$0.05',  valor: 0.05 },
  { key: 'moneda_010', label: '$0.10', valor: 0.10 },
  { key: 'moneda_025', label: '$0.25', valor: 0.25 },
  { key: 'moneda_050', label: '$0.50', valor: 0.50 },
  { key: 'moneda_100', label: '$1',  valor: 1.00 },
];

const BILLETES = [
  { key: 'billete_1',   label: '$1',   valor: 1   },
  { key: 'billete_5',   label: '$5',   valor: 5   },
  { key: 'billete_10',  label: '$10',  valor: 10  },
  { key: 'billete_20',  label: '$20',  valor: 20  },
  { key: 'billete_50',  label: '$50',  valor: 50  },
  { key: 'billete_100', label: '$100', valor: 100 },
];

const INIT_DENOMS = Object.fromEntries(
  [...MONEDAS, ...BILLETES].map(d => [d.key, ''])
);

function fmt(n) {
  return Number(n).toLocaleString('es-EC', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Función para obtener el nombre del usuario
const getNombreUsuario = (user) => {
  if (!user) return 'Usuario no identificado';
  
  // Usar las propiedades correctas: firstName y lastName
  const nombre = user.firstName || user.first_name || user.nombre || user.name || '';
  const apellido = user.lastName || user.last_name || user.apellido || '';
  
  if (nombre && apellido) {
    return `${nombre} ${apellido}`.trim();
  }
  
  if (nombre) return nombre;
  if (user.name) return user.name;
  if (user.username) return user.username;
  if (user.email) return user.email;
  
  return 'Usuario';
};

// Función para obtener el email
const getEmailUsuario = (user) => {
  return user?.email || user?.correo || '';
};

export default function AperturaCajaPage({ onAperturaCompleta, onCancel }) {
  // Usar useSession
  const { user } = useSession();
  
  // Obtener nombre y email con las propiedades correctas
  const nombreUsuario = getNombreUsuario(user);
  const emailUsuario = getEmailUsuario(user);
  const userId = user?.id;
  const roleName = user?.roleName || user?.role || '';

  const today = new Date().toLocaleDateString('en-CA', { 
    timeZone: 'America/Guayaquil' 
  });

  const [denoms, setDenoms] = useState(INIT_DENOMS);
  const [montoBanca, setMontoBanca] = useState('');
  const [observ, setObserv] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const totalEfectivo = useMemo(() => {
    let total = 0;
    for (const d of [...MONEDAS, ...BILLETES]) {
      total += (parseInt(denoms[d.key], 10) || 0) * d.valor;
    }
    return total;
  }, [denoms]);

  const totalInicial = totalEfectivo + (parseFloat(montoBanca) || 0);

  const handleDenom = (key, val) => {
    const num = val.replace(/[^0-9]/g, '');
    setDenoms(prev => ({ ...prev, [key]: num }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const body = { 
        date: today,
        user_id: userId,  
        monto_banca: parseFloat(montoBanca) || 0,
        observaciones: observ || null
      };
      
      for (const d of [...MONEDAS, ...BILLETES]) {
        body[d.key] = parseInt(denoms[d.key], 10) || 0;
      }

      console.log('📤 Enviando a /pos/cash-register/opening:', body);

      // Usar fetchWithAuth directamente (sin /api/ prefix)
      const res = await fetchWithAuth('/pos/cash-register/opening', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      
      const data = await res.json();

      if (res.status === 409) {
        // Ya existe apertura para hoy
        onAperturaCompleta(data);
        return;
      }

      if (!res.ok) throw new Error(data?.error || 'Error al guardar apertura');

      // Registrar en audit-log usando fetchWithAuth
      const auditPayload = {
        user_id: userId,
        user_name: nombreUsuario,
        user_email: emailUsuario,
        user_role: roleName,
        table_name: "cash_drawer",
        action: "apertura_caja",
        description: `Registro de Apertura de caja realizado por ${nombreUsuario} (${roleName}). Efectivo inicial: $${totalEfectivo.toFixed(2)}, Banca inicial: $${(parseFloat(montoBanca) || 0).toFixed(2)}, Total: $${totalInicial.toFixed(2)}${observ ? `. Observaciones: ${observ}` : ''}`,
        new_values: {
          efectivo_inicial: totalEfectivo,
          banca_inicial: parseFloat(montoBanca) || 0,
          total_inicial: totalInicial,
          denominaciones: denoms,
          observaciones: observ || null,
          fecha_apertura: today,
          usuario: nombreUsuario,
          rol: roleName
        },
        reason: "Registro de Apertura de Caja"
      };

      await fetchWithAuth('/audit-log', {
        method: 'POST',
        body: JSON.stringify(auditPayload)
      }).catch(() => {});

      onAperturaCompleta(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fechaActual = new Date().toLocaleDateString('es-EC', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'America/Guayaquil'
  });


  return (
    <Modal
      isOpen={true}
      size="lg"
      className="apertura-modal-container"
      overlayClassName="apertura-modal-overlay"
       title={`Apertura de Caja - ${fechaActual}`}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      footer={
        <ButtonGroup>
          <IconTextButton
            variant="success"
            size="md"
            type="submit"
            form="apertura-form"
            disabled={saving}
            loading={saving}
            block
          >
            {saving ? 'Guardando...' : 'Aperturar caja'}
          </IconTextButton>
        </ButtonGroup>
      }
    >
      <form id="apertura-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="apertura-header">
          <div className="apertura-user-info">
            <div className="apertura-user-name">
              <strong>Usuario:</strong> {nombreUsuario}
              {roleName && (
                <span className="apertura-user-role">({roleName})</span>
              )}
            </div>
            {emailUsuario && emailUsuario !== nombreUsuario && (
              <div className="apertura-user-email">
                <strong>Email:</strong> {emailUsuario}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="apertura-error">
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        {/* Monedas */}
        <div className="apertura-section">
          <div className="apertura-section-header">
            <FiBox size={14} />
            <span>Monedas</span>
          </div>
          <div className="apertura-denom-grid">
            {MONEDAS.map(d => {
              return (
                <div key={d.key} className="apertura-denom-card">
                  <span className="apertura-denom-label">{d.label}</span>
                  <Input
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    value={denoms[d.key]}
                    onChange={(val) => handleDenom(d.key, val)}
                    className="input-denom-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Billetes */}
        <div className="apertura-section">
          <div className="apertura-section-header">
            <FiCreditCard size={14} />
            <span>Billetes</span>
          </div>
          <div className="apertura-denom-grid">
            {BILLETES.map(d => {
              return (
                <div key={d.key} className="apertura-denom-card">
                  <span className="apertura-denom-label">{d.label}</span>
                  <Input
                    min="0"
                    inputMode="numeric"
                    placeholder="0"
                    value={denoms[d.key]}
                    onChange={(val) => handleDenom(d.key, val)}
                    className="input-denom-xs"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Banco */}
        <div className="apertura-bank-card">
          <div className="apertura-section-header">
            <FiFileText size={14} />
            <span>Monto en banca al iniciar el día</span>
          </div>
          <div className="apertura-bank-input-wrap">
            <span className="apertura-bank-prefix">$</span>
            <Input
              min="0"
              step="0.01"
              placeholder="0.00"
              value={montoBanca}
              onChange={setMontoBanca}
              className="input-denom-xs_1"
            />
          </div>
        </div>

        {/* Observaciones */}
        <textarea
          className="apertura-obs"
          placeholder="Observaciones (opcional)"
          value={observ}
          onChange={e => setObserv(e.target.value)}
          rows={3}
        />

        {/* Totales */}
        <div className="apertura-totals">
          <div className="apertura-total-row">
            <span>Total efectivo contado</span>
            <span className="apertura-total-val">${fmt(totalEfectivo)}</span>
          </div>
          <div className="apertura-total-row">
            <span>Monto en banca</span>
            <span className="apertura-total-val">${fmt(parseFloat(montoBanca) || 0)}</span>
          </div>
          <div className="apertura-total-row apertura-total-row--main">
            <span>Total inicial del día</span>
            <span className="apertura-total-val apertura-total-val--main">
              ${fmt(totalInicial)}
            </span>
          </div>
        </div>
      </form>
    </Modal>
  );
}