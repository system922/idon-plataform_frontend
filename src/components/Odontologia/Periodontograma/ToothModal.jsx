import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

const SITIOS = [
  { id: 'mesial', label: 'Mesial' },
  { id: 'central', label: 'Central' },
  { id: 'distal', label: 'Distal' },
];

export default function ToothModal({ toothNumber, toothData, onSave, onClose }) {
  const [data, setData] = useState({
    movilidad: toothData?.movilidad || 0,
    implante: toothData?.implante || false,
    furcacion: toothData?.furcacion || 0,
    ausente: toothData?.ausente || false,
    nota: toothData?.nota || '',
    sitios: {
      V: {
        mesial: toothData?.sitios?.V?.mesial || { mg: 0, ps: 0, placa: false, sangrado: false },
        central: toothData?.sitios?.V?.central || { mg: 0, ps: 0, placa: false, sangrado: false },
        distal: toothData?.sitios?.V?.distal || { mg: 0, ps: 0, placa: false, sangrado: false },
      },
      L: {
        mesial: toothData?.sitios?.L?.mesial || { mg: 0, ps: 0, placa: false, sangrado: false },
        central: toothData?.sitios?.L?.central || { mg: 0, ps: 0, placa: false, sangrado: false },
        distal: toothData?.sitios?.L?.distal || { mg: 0, ps: 0, placa: false, sangrado: false },
      },
    },
  });

  const [activeCara, setActiveCara] = useState('V');

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSiteChange = (cara, pos, field, value) => {
    setData(prev => ({
      ...prev,
      sitios: {
        ...prev.sitios,
        [cara]: {
          ...prev.sitios[cara],
          [pos]: {
            ...prev.sitios[cara][pos],
            [field]: value,
          },
        },
      },
    }));
  };

  const handleSave = () => {
    onSave(toothNumber, data);
  };

  const renderSiteRow = (cara, pos, label) => {
    const sitio = data.sitios[cara][pos];
    const nic = (sitio.mg || 0) + (sitio.ps || 0);

    return (
      <tr key={pos}>
        <td className="perio-modal-site-label">{label}</td>
        <td>
          <input
            type="number"
            className="perio-modal-input-small"
            value={sitio.mg}
            onChange={(e) => handleSiteChange(cara, pos, 'mg', parseFloat(e.target.value) || 0)}
            step="0.5"
          />
        </td>
        <td>
          <input
            type="number"
            className="perio-modal-input-small"
            value={sitio.ps}
            onChange={(e) => handleSiteChange(cara, pos, 'ps', parseFloat(e.target.value) || 0)}
            step="0.5"
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={sitio.placa}
            onChange={(e) => handleSiteChange(cara, pos, 'placa', e.target.checked)}
          />
        </td>
        <td>
          <input
            type="checkbox"
            checked={sitio.sangrado}
            onChange={(e) => handleSiteChange(cara, pos, 'sangrado', e.target.checked)}
          />
        </td>
        <td className="perio-modal-nic">{nic.toFixed(1)}</td>
      </tr>
    );
  };

  return (
    <div className="odonto-modal-overlay" onClick={onClose}>
      <div
        className="odonto-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '320px', maxHeight: '500px', }}
      >
        {/* HEADER */}
        <div className="odonto-modal-header blue">
          <div>
            <h3>Diente #{toothNumber}</h3>
          </div>
          <button className="odonto-modal-close" onClick={onClose}>
            <FiX size={22} />
          </button>
        </div>

        {/* BODY */}
        <div className="odonto-modal-body" style={{ padding: '5px 5px' }}>
          {/* Fila de campos principales */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto auto',
              gap: '8px 14px',
              marginBottom: '12px',
              alignItems: 'center',
            }}
          >
            <div className="perio-modal-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Movilidad</label>
              <select
                value={data.movilidad}
                onChange={(e) => handleChange('movilidad', parseInt(e.target.value))}
                style={{ padding: '4px 6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', width: '52px' }}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            <div className="perio-modal-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
              <label style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Furcación</label>
              <select
                value={data.furcacion}
                onChange={(e) => handleChange('furcacion', parseInt(e.target.value))}
                style={{ padding: '4px 6px', fontSize: '13px', borderRadius: '4px', border: '1px solid #e2e8f0', background: '#fff', width: '52px' }}
              >
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </div>

            <div className="perio-modal-field perio-modal-field-checkbox" style={{ flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
              <label style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Implante</label>
              <input type="checkbox" checked={data.implante} onChange={(e) => handleChange('implante', e.target.checked)} />
            </div>

            <div className="perio-modal-field perio-modal-field-checkbox" style={{ flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
              <label style={{ margin: 0, fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Ausente</label>
              <input type="checkbox" checked={data.ausente} onChange={(e) => handleChange('ausente', e.target.checked)} />
            </div>
          </div>

          {/* Selector de cara - estilos mejorados */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              margin: '12px 0 14px',
              background: '#f1f5f9',
              borderRadius: '10px',
              padding: '4px',
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              className={`perio-cara-btn ${activeCara === 'V' ? 'active' : ''}`}
              onClick={() => setActiveCara('V')}
              style={{
                flex: 1,
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeCara === 'V' ? '#ffffff' : 'transparent',
                color: activeCara === 'V' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeCara === 'V' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (activeCara !== 'V') {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCara !== 'V') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Vestibular
            </button>
            <button
              className={`perio-cara-btn ${activeCara === 'L' ? 'active' : ''}`}
              onClick={() => setActiveCara('L')}
              style={{
                flex: 1,
                padding: '6px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                background: activeCara === 'L' ? '#ffffff' : 'transparent',
                color: activeCara === 'L' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeCara === 'L' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={(e) => {
                if (activeCara !== 'L') {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.color = '#0f172a';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCara !== 'L') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              Lingual / Palatino
            </button>
          </div>

          {/* Tabla de sitios */}
          <table className="perio-modal-table" style={{ fontSize: '12px', marginBottom: '12px' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>Sitio</th>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>MG</th>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>PS</th>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>Placa</th>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>Sangrado</th>
                <th style={{ padding: '4px 6px', fontSize: '10px' }}>NIC</th>
              </tr>
            </thead>
            <tbody>
              {SITIOS.map(s => renderSiteRow(activeCara, s.id, s.label))}
            </tbody>
          </table>

          {/* Nota clínica */}
          <div className="perio-modal-field perio-modal-field-full" style={{ marginTop: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>Nota clínica</label>
            <textarea
              value={data.nota}
              onChange={(e) => handleChange('nota', e.target.value)}
              rows={2}
              style={{
                fontSize: '13px',
                padding: '6px 5px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                width: '100%',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* FOOTER */}
        <div className="odonto-modal-footer" style={{ padding: '10px 18px' }}>
          <button
            className="perio-btn-secondary"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
          >
            Cerrar
          </button>
          <button
            className="perio-btn-primary"
            onClick={handleSave}
            style={{
              padding: '6px 20px',
              borderRadius: '6px',
              border: 'none',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}