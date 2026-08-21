// src/pages/business/components/RecetaForm.jsx
import React, { useState } from 'react';
import { FiPlus, FiX, FiSave } from 'react-icons/fi';

export default function RecetaForm({ receta, onSave }) {
  const [medications, setMedications] = useState(
    receta?.medications || [{ name: '', dosage: '', frequency: '', notes: '' }]
  );
  const [instructions, setInstructions] = useState(receta?.instructions || '');

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', notes: '' }]);
  };
  const removeMedication = (index) => {
    if (medications.length === 1) return;
    setMedications(medications.filter((_, i) => i !== index));
  };
  const updateMedication = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const handleSave = () => {
    onSave({ medications, instructions });
  };

  return (
    <div style={{ marginTop: 16, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, border: '1px solid rgba(104,66,254,0.2)' }}>
      <h5 style={{ color: '#fff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <FiPlus /> Receta Médica
      </h5>
      <div className="form-group">
        <label>Instrucciones</label>
        <textarea
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          rows={2}
          placeholder="Indicaciones para el paciente"
        />
      </div>
      <div className="form-group">
        <label>Medicamentos</label>
        {medications.map((med, idx) => (
          <div key={idx} className="odont-medication-row">
            <input
              placeholder="Nombre"
              value={med.name}
              onChange={e => updateMedication(idx, 'name', e.target.value)}
            />
            <input
              placeholder="Dosis"
              value={med.dosage}
              onChange={e => updateMedication(idx, 'dosage', e.target.value)}
            />
            <input
              placeholder="Frecuencia"
              value={med.frequency}
              onChange={e => updateMedication(idx, 'frequency', e.target.value)}
            />
            <input
              placeholder="Notas"
              value={med.notes}
              onChange={e => updateMedication(idx, 'notes', e.target.value)}
            />
            <button type="button" className="remove-med" onClick={() => removeMedication(idx)}>
              <FiX size={14} />
            </button>
          </div>
        ))}
        <button type="button" className="odont-btn-add-med" onClick={addMedication}>
          <FiPlus size={14} /> Agregar medicamento
        </button>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button className="odont-btn-primary" onClick={handleSave}>
          <FiSave /> Guardar Receta
        </button>
      </div>
    </div>
  );
}