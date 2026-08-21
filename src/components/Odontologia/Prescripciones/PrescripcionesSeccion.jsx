import React, { useMemo, useState } from 'react';
import { FiFile, FiPlus, FiCamera, FiX, FiBookOpen, FiSearch } from 'react-icons/fi';
import RecetaForm from './RecetaForm';

const TEMPLATE_RECETAS = [
  {
    id: 'tpl-1',
    name: 'Dolor agudo',
    instructions: 'Tomar cada 8 horas por 3 días',
    medications: [{ name: 'PARAMIDOL TABL 500 MG', dosage: '1', frequency: 'Cada 8 horas', notes: '3 días' }],
  },
  {
    id: 'tpl-2',
    name: 'Post operatorio',
    instructions: 'Tomar después de los alimentos',
    medications: [{ name: 'IBUPROFENO 600 MG', dosage: '1', frequency: 'Cada 12 horas', notes: '5 días' }],
  },
];

const PrescripcionesSeccion = ({ paciente, odontologo, recetas = [], onSaveReceta }) => {
  const [showRecetaForm, setShowRecetaForm] = useState(false);
  const [search, setSearch] = useState('');

  const filteredRecetas = useMemo(() => {
    if (!search.trim()) return recetas;
    const text = search.toLowerCase();
    return recetas.filter((receta) => (
      JSON.stringify(receta).toLowerCase().includes(text)
    ));
  }, [recetas, search]);

  const handleSaveReceta = (data) => {
    onSaveReceta?.(data);
    setShowRecetaForm(false);
  };

  const applyTemplate = (template) => {
    onSaveReceta?.({
      medications: template.medications,
      instructions: template.instructions,
      templateName: template.name,
    });
  };

  return (
    <div className="odont-atender-section">
      <div className="odont-atender-section-header">
        <h3><FiFile /> Prescripciones</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="odont-btn-secondary" style={{ fontSize: 12 }}>
            <FiCamera /> Solicitar Radiografía
          </button>
          <button className="odont-btn-primary" onClick={() => setShowRecetaForm(true)} style={{ fontSize: 12 }}>
            <FiPlus /> Nueva prescripción
          </button>
        </div>
      </div>

      <div className="odont-treatment-note" style={{ marginBottom: 16 }}>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Paciente</strong>
          <span>{paciente ? `${paciente.first_name} ${paciente.last_name}` : '—'}</span>
        </div>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Doctor</strong>
          <span>{odontologo?.name || '—'}</span>
        </div>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Recetas activas</strong>
          <span>{filteredRecetas.length}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <FiSearch />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receta, medicamento o instrucción"
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
        {TEMPLATE_RECETAS.map((template) => (
          <button
            key={template.id}
            className="odont-info-card"
            style={{ alignItems: 'flex-start', textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.12)' }}
            onClick={() => applyTemplate(template)}
          >
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FiBookOpen /> {template.name}</strong>
            <span>{template.instructions}</span>
            <small>{template.medications.length} medicamento(s)</small>
          </button>
        ))}
      </div>

      {filteredRecetas.map((rec, idx) => (
        <div key={idx} className="receta-card" style={{ background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12, flexWrap: 'wrap' }}>
            <h4 style={{ margin: 0 }}>Receta N°{rec.id}</h4>
            <span style={{ fontSize: 12, color: 'var(--odont-text-muted)' }}>Creado el: {rec.created_at} por {rec.doctor}</span>
          </div>
          {rec.templateName && <div style={{ marginBottom: 8, fontSize: 12, color: '#c4b5fd' }}>Plantilla: {rec.templateName}</div>}
          <table className="odont-table receta-table">
            <thead>
              <tr>
                <th>Medicamento</th>
                <th>Cantidad</th>
                <th>Indicación</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {(rec.medications || []).map((med, i) => (
                <tr key={i}>
                  <td>{med.name}</td>
                  <td>{med.dosage || '0'}</td>
                  <td>{med.frequency || ''}</td>
                  <td>{med.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8 }}>
            <strong>NOTA:</strong> {rec.instructions}
          </div>
        </div>
      ))}

      {showRecetaForm && (
        <div className="odont-modal-overlay" onClick={() => setShowRecetaForm(false)}>
          <div className="odont-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="odont-modal-header">
              <h3>Nueva Prescripción</h3>
              <button className="odont-modal-close" onClick={() => setShowRecetaForm(false)}>
                <FiX size={24} />
              </button>
            </div>
            <div className="odont-modal-body">
              <RecetaForm receta={null} onSave={handleSaveReceta} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescripcionesSeccion;
