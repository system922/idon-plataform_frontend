// components/Odontologia/Plantillas/PlantillaModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { FiX, FiPlus, FiClock, FiAlertCircle, FiSearch } from 'react-icons/fi';

export default function PlantillaModal({ 
  isOpen, 
  onClose, 
  plantilla, 
  onSave, 
  loading,
  tipos = [],
  categorias = [],
  medicamentos = []
}) {
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    medicamentos: [{ 
      medicamento_id: '',
      categoria_id: '',
      tipo_id: '',
      dosis_especifica: '', 
      frecuencia_especifica: '', 
      notas: '' 
    }],
    instrucciones: '',
    duracion: '',
    advertencias: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (plantilla) {
        const medicamentosForm = plantilla.medicamentos?.length > 0 
          ? plantilla.medicamentos.map(m => ({
              medicamento_id: m.medicamento_id || '',
              categoria_id: m.categoria_id || '',
              tipo_id: m.tipo_id || '',
              dosis_especifica: m.dosis_especifica || '',
              frecuencia_especifica: m.frecuencia_especifica || '',
              notas: m.notas || ''
            }))
          : [{ 
              medicamento_id: '',
              categoria_id: '',
              tipo_id: '',
              dosis_especifica: '', 
              frecuencia_especifica: '', 
              notas: '' 
            }];
        
        setForm({
          nombre: plantilla.nombre || '',
          descripcion: plantilla.descripcion || '',
          medicamentos: medicamentosForm,
          instrucciones: plantilla.instrucciones || '',
          duracion: plantilla.duracion || '',
          advertencias: plantilla.advertencias || ''
        });
      } else {
        setForm({
          nombre: '',
          descripcion: '',
          medicamentos: [{ 
            medicamento_id: '',
            categoria_id: '',
            tipo_id: '',
            dosis_especifica: '', 
            frecuencia_especifica: '', 
            notas: '' 
          }],
          instrucciones: '',
          duracion: '',
          advertencias: ''
        });
      }
      setError('');
    }
  }, [isOpen, plantilla]);

  // ============================================================
  // FILTRAR MEDICAMENTOS POR CATEGORÍA Y TIPO DE CADA FILA
  // ============================================================
  const getMedicamentosFiltrados = (categoriaId, tipoId) => {
    return medicamentos.filter(m => {
      const matchCategoria = !categoriaId || m.categoria_id === categoriaId;
      const matchTipo = !tipoId || m.tipo_id === tipoId;
      return matchCategoria && matchTipo;
    });
  };

  // ============================================================
  // HANDLERS
  // ============================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
  };

  const handleMedChange = (index, field, value) => {
    const newMedicamentos = [...form.medicamentos];
    newMedicamentos[index][field] = value;
    
    if (field === 'categoria_id' || field === 'tipo_id') {
      newMedicamentos[index].medicamento_id = '';
    }
    
    setForm({ ...form, medicamentos: newMedicamentos });
    setError('');
  };

  const addMedicamento = () => {
    setForm({
      ...form,
      medicamentos: [...form.medicamentos, { 
        medicamento_id: '',
        categoria_id: '',
        tipo_id: '',
        dosis_especifica: '', 
        frecuencia_especifica: '', 
        notas: '' 
      }]
    });
  };

  const removeMedicamento = (index) => {
    if (form.medicamentos.length === 1) {
      setError('Debe tener al menos un medicamento');
      return;
    }
    const newMedicamentos = form.medicamentos.filter((_, i) => i !== index);
    setForm({ ...form, medicamentos: newMedicamentos });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.nombre.trim()) {
      setError('El nombre de la plantilla es obligatorio');
      return;
    }
    if (form.medicamentos.some(m => !m.medicamento_id)) {
      setError('Todos los medicamentos deben estar seleccionados');
      return;
    }

    const dataToSend = {
      nombre: form.nombre,
      descripcion: form.descripcion || null,
      duracion: form.duracion || null,
      instrucciones: form.instrucciones || null,
      advertencias: form.advertencias || null,
      medicamentos: form.medicamentos.map(m => ({
        medicamento_id: m.medicamento_id,
        dosis_especifica: m.dosis_especifica || null,
        frecuencia_especifica: m.frecuencia_especifica || null,
        notas: m.notas || null
      }))
    };

    const result = await onSave(dataToSend);
    if (result?.success) {
      onClose();
    } else {
      setError(result?.error || 'Error al guardar la plantilla');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="odonto-modal-overlay" onClick={onClose}>
        <div className="odonto-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 950 }}>
          <div className="odonto-modal-header blue">
            <div>
              <h3>{plantilla ? 'Editar Plantilla' : 'Nueva Plantilla'}</h3>
              <p>{plantilla ? 'Modificar plantilla existente' : 'Crear una nueva plantilla de receta'}</p>
            </div>
            <button className="odonto-modal-close" onClick={onClose}>
              <FiX size={20} />
            </button>
          </div>

          <div className="odonto-modal-body">
            {error && (
              <div className="odonto-error-message">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="odonto-form-row-three">
                <div className="odonto-form-group">
                  <label>Nombre de la Plantilla *</label>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Extracción Dental"
                    required
                  />
                </div>
                <div className="odonto-form-group">
                  <label>Descripción</label>
                  <input
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Descripción del tratamiento..."
                  />
                </div>
                <div className="odonto-form-group">
                  <label>
                    <FiClock size={14} style={{ marginRight: 4 }} />
                    Duración
                  </label>
                  <input
                    name="duracion"
                    value={form.duracion}
                    onChange={handleChange}
                    placeholder="Ej: 7 días"
                  />
                </div>
              </div>

              {/* MEDICAMENTOS - Cada uno con su propia categoría y tipo */}
              <div className="odonto-form-group" style={{ marginTop: '12px' }}>
                <label>Medicamentos *</label>
                <small className="odonto-form-help">
                  Cada medicamento puede tener su propia categoría y tipo
                </small>

                {form.medicamentos.map((med, idx) => {
                  const medicamentosFiltrados = getMedicamentosFiltrados(med.categoria_id, med.tipo_id);
                  
                  return (
                    <div key={idx} className="odonto-medication-row" style={{ 
                      background: '#f8fafc', 
                      padding: '5px 5px', 
                      borderRadius: '8px',
                      marginBottom: '10px',
                      border: '1px solid #e2e8f0',
                      display: 'grid',
                      gridTemplateColumns: '2.2fr 1.2fr 3fr 0.7fr 1fr 1fr auto',
                      gap: '2px',
                      alignItems: 'end'
                    }}>
                      {/* Categoría del medicamento */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Categoría</label>
                        <select
                          value={med.categoria_id}
                          onChange={e => handleMedChange(idx, 'categoria_id', e.target.value)}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            width: '100%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#ffffff'
                          }}
                        >
                          <option value="">Seleccionar</option>
                          {categorias.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Tipo del medicamento */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tipo</label>
                        <select
                          value={med.tipo_id}
                          onChange={e => handleMedChange(idx, 'tipo_id', e.target.value)}
                          disabled={!med.categoria_id}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            width: '100%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#ffffff'
                          }}
                        >
                          <option value="">Seleccionar</option>
                          {tipos.map(t => (
                            <option key={t.id} value={t.id}>{t.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Medicamento */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Medicamento</label>
                        <select
                          value={med.medicamento_id}
                          onChange={e => handleMedChange(idx, 'medicamento_id', e.target.value)}
                          disabled={!med.categoria_id || !med.tipo_id}
                          style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            width: '100%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
                            background: '#ffffff'
                          }}
                        >
                          <option value="">Seleccionar</option>
                          {medicamentosFiltrados.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.nombre} {m.presentacion ? `(${m.presentacion})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Dosis */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Dosis</label>
                        <input
                          placeholder="1"
                          value={med.dosis_especifica}
                          onChange={e => handleMedChange(idx, 'dosis_especifica', e.target.value)}
                          style={{ 
                            fontSize: '9px', 
                            padding: '2px 6px', 
                            width: '50%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>

                      {/* Frecuencia */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Frecuencia</label>
                        <input
                          placeholder="c/8h"
                          value={med.frecuencia_especifica}
                          onChange={e => handleMedChange(idx, 'frecuencia_especifica', e.target.value)}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            width: '50%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>

                      {/* Notas */}
                      <div className="odonto-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Notas</label>
                        <input
                          placeholder="Notas"
                          value={med.notas}
                          onChange={e => handleMedChange(idx, 'notas', e.target.value)}
                          style={{ 
                            fontSize: '11px', 
                            padding: '2px 6px', 
                            width: '100%',
                            height: '28px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db'
                          }}
                        />
                      </div>

                      {/* Botón eliminar */}
                      <button
                        type="button"
                        className="odonto-btn-remove-med"
                        onClick={() => removeMedicamento(idx)}
                        disabled={form.medicamentos.length === 1}
                        style={{ 
                          height: '28px', 
                          width: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #e2e8f0',
                          borderRadius: '4px',
                          background: 'transparent',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          fontSize: '14px'
                        }}
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  );
                })}
                
                <button
                  type="button"
                  className="odonto-btn-add-med"
                  onClick={addMedicamento}
                  style={{ marginTop: '8px', fontSize: '13px', padding: '6px 14px' }}
                >
                  <FiPlus size={14} /> Agregar otro medicamento
                </button>
              </div>

              <div className="odonto-form-group" style={{ marginTop: '12px' }}>
                <label>Instrucciones Generales</label>
                <textarea
                  name="instrucciones"
                  value={form.instrucciones}
                  onChange={handleChange}
                  placeholder="Instrucciones para el paciente..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '13px'
                  }}
                />
              </div>

              <div className="odonto-form-group" style={{ marginTop: '4px' }}>
                <label>
                  <FiAlertCircle size={14} style={{ marginRight: 4 }} />
                  Advertencia / Contraindicación
                </label>
                <textarea
                  name="advertencias"
                  value={form.advertencias}
                  onChange={handleChange}
                  placeholder="Ej: Contraindicado en pacientes alérgicos a penicilinas..."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '13px'
                  }}
                />
              </div>
            </form>
          </div>

          <div className="odonto-modal-footer">
            <button className="odonto-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="odonto-btn-primary" 
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Guardando...' : (plantilla ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}