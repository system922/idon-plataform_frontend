// src/pages/business/AtencionPacientePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageTemplate from '../../components/PageTemplate';
import { FiArrowLeft, FiTool, FiUser, FiCalendar, FiClock, FiFileText } from 'react-icons/fi';
import OdontogramaDigital from '../../components/Odontograma';
import ToothEditor from '../../components/ToothEditor';
import RecetaForm from '../../components/RecetaForm';
import '../../styles/OdontologiaStyles.css';


// ============================================================
// DATOS MOCK (reemplaza con tu API)
// ============================================================
const mockPacientes = [
  { id: '1', first_name: 'María', last_name: 'González', document_number: '12345678-9' },
  { id: '2', first_name: 'Carlos', last_name: 'Pérez', document_number: '98765432-1' },
];
const mockTratamientos = [
  { id: '1', name: 'Limpieza dental' },
  { id: '2', name: 'Endodoncia' },
  { id: '3', name: 'Ortodoncia' },
  { id: '4', name: 'Extracción' },
];
const mockOdontologos = [
  { id: '1', name: 'Dr. Juan Torres' },
  { id: '2', name: 'Dra. Laura Silva' },
];
const mockCitas = [
  { id: 'c1', patient_id: '1', treatment_id: '1', odontologo_id: '1', scheduled_for: new Date().toISOString(), duration_minutes: 30, status: 'in_progress', notes: '', odontogram_data: {} },
];

export default function AtencionPacientePage() {
  const { citaId } = useParams();
  const navigate = useNavigate();

  const [cita, setCita] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [tratamiento, setTratamiento] = useState(null);
  const [odontologo, setOdontologo] = useState(null);
  const [odontogramData, setOdontogramData] = useState({});
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar datos (simulado)
  useEffect(() => {
    setLoading(true);
    const citaEncontrada = mockCitas.find(c => c.id === citaId);
    if (citaEncontrada) {
      setCita(citaEncontrada);
      setPaciente(mockPacientes.find(p => p.id === citaEncontrada.patient_id));
      setTratamiento(mockTratamientos.find(t => t.id === citaEncontrada.treatment_id));
      setOdontologo(mockOdontologos.find(o => o.id === citaEncontrada.odontologo_id));
      setOdontogramData(citaEncontrada.odontogram_data || {});
    }
    setLoading(false);
  }, [citaId]);

  // Handlers
  const handleToothClick = (toothNumber) => {
    setSelectedTooth(toothNumber);
  };

  const handleSaveTooth = (toothNumber, data) => {
    setOdontogramData(prev => ({
      ...prev,
      [toothNumber]: data,
    }));
    setSelectedTooth(null);
  };

  const handleClearTooth = (toothNumber) => {
    setOdontogramData(prev => {
      const newData = { ...prev };
      delete newData[toothNumber];
      return newData;
    });
    setSelectedTooth(null);
  };

  const handleFinalizar = () => {
    const actualizada = { ...cita, odontogram_data: odontogramData, status: 'completed' };
    console.log('Atención finalizada:', actualizada);
    alert('Atención completada');
    navigate('/app/odontologia/odontologia.citas');
  };

  if (loading) return <div className="loading-spinner" />;
  if (!cita) return <div className="odont-empty-state">Cita no encontrada</div>;

  const toothData = selectedTooth ? odontogramData[selectedTooth] : null;

  return (
    <PageTemplate
      title="Atención Odontológica"
      subtitle={`Paciente: ${paciente ? `${paciente.first_name} ${paciente.last_name}` : '—'}`}
      headerAction={
        <button className="odont-btn-secondary" onClick={() => navigate('/app/odontologia/odontologia.citas')}>
          <FiArrowLeft /> Volver
        </button>
      }
    >
      {/* Información del paciente */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
        <div><FiUser /> <strong>Paciente:</strong> {paciente ? `${paciente.first_name} ${paciente.last_name}` : '—'}</div>
        <div><FiFileText /> <strong>Documento:</strong> {paciente?.document_number || '—'}</div>
        <div><FiCalendar /> <strong>Fecha:</strong> {new Date(cita.scheduled_for).toLocaleDateString()}</div>
        <div><FiClock /> <strong>Hora:</strong> {new Date(cita.scheduled_for).toLocaleTimeString()}</div>
        <div><FiTool /> <strong>Tratamiento:</strong> {tratamiento?.name || '—'}</div>
        <div><FiUser /> <strong>Odontólogo:</strong> {odontologo?.name || '—'}</div>
      </div>

      {/* Layout principal: 70% odontograma, 30% editor */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Columna izquierda: 70% */}
        <div style={{ flex: '7', minWidth: 0 }}>
          <h4 style={{ color: '#fff', margin: '0 0 12px 0' }}>
            <FiTool /> Odontograma — Haz clic en una pieza para registrar
          </h4>
          <OdontogramaDigital
            odontogramData={odontogramData}
            onToothClick={handleToothClick}
            selectedTooth={selectedTooth}
            debug={false}
          />
        </div>

        {/* Columna derecha: 30% (editor) */}
        <div style={{ flex: '3', minWidth: 280, background: 'rgba(0,0,0,0.15)', borderRadius: 12, padding: 16 }}>
          {selectedTooth ? (
            <ToothEditor
              toothNumber={selectedTooth}
              toothData={toothData}
              onSave={handleSaveTooth}
              onClear={handleClearTooth}
              onClose={() => setSelectedTooth(null)}
              tratamientos={mockTratamientos}
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px 0' }}>
              <FiTool size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>Selecciona una pieza dental en el odontograma para editarla.</p>
            </div>
          )}
        </div>
      </div>

      {/* Botón finalizar */}
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="odont-btn-primary" onClick={handleFinalizar} style={{ padding: '12px 32px' }}>
          Finalizar Atención
        </button>
      </div>
    </PageTemplate>
  );
}