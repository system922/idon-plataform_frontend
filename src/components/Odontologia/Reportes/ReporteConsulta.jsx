// components/Odontologia/Reportes/ReporteConsulta.jsx
import React, { useState } from 'react';
import { FiUser, FiPrinter, FiEye, FiFileText, FiCalendar, FiX, FiPlus, FiUserCheck } from 'react-icons/fi';
import PlantillaImpresion from './PlantillaImpresion';
import { useImpresion } from './useImpresion';
import { useClinicaSettings } from '../../../hooks/useClinicaSettings';

export default function ReporteConsulta({ 
  pacientes, 
  onSelectPaciente, 
  selectedPaciente, 
  onClearPaciente 
}) {
  const { printRef, imprimir } = useImpresion();
  const { settings: clinica, loading: loadingClinica, seleccionarDoctor } = useClinicaSettings();
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosticos, setDiagnosticos] = useState([
    { descripcion: 'Examen bucal Z012.', cie10: 'Z012' },
    { descripcion: 'Caries Resina simple PIEZAS (46/47/16)', cie10: 'K020' },
    { descripcion: 'Profilaxis (limpieza dental)', cie10: 'K052' },
  ]);
  const [nuevoDiagnostico, setNuevoDiagnostico] = useState({ descripcion: '', cie10: '' });
  const [doctorSeleccionadoId, setDoctorSeleccionadoId] = useState(clinica.doctorSeleccionado?.id || '');

  // Actualizar doctor seleccionado cuando cambia
  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;
    setDoctorSeleccionadoId(doctorId);
    seleccionarDoctor(doctorId);
  };

  const handleAgregarDiagnostico = () => {
    if (nuevoDiagnostico.descripcion.trim() && nuevoDiagnostico.cie10.trim()) {
      setDiagnosticos([...diagnosticos, { ...nuevoDiagnostico }]);
      setNuevoDiagnostico({ descripcion: '', cie10: '' });
    }
  };

  const handleEliminarDiagnostico = (index) => {
    setDiagnosticos(diagnosticos.filter((_, i) => i !== index));
  };

  const calcularEdad = (birthDate) => {
    if (!birthDate) return '—';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (!selectedPaciente) {
    return (
      <div className="odonto-reporte-pacientes">
        <h3>Seleccionar Paciente</h3>
        <div className="odonto-table-container">
          <table className="odonto-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Cédula</th>
                <th className="center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pacientes.map(p => (
                <tr key={p.id}>
                  <td>{p.first_name} {p.last_name}</td>
                  <td>{p.document_number}</td>
                  <td className="center">
                    <button 
                      className="odonto-btn-primary" 
                      onClick={() => onSelectPaciente(p)}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                    >
                      <FiEye size={14} /> Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
              {pacientes.length === 0 && (
                <tr>
                  <td colSpan="3" className="odonto-empty-state">
                    No hay pacientes registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const p = selectedPaciente;
  const doctor = clinica.doctorSeleccionado || {};

  return (
    <div className="odonto-reporte-content">
      <div className="odonto-reporte-actions no-print">
        <button 
          className="odonto-btn-primary" 
          onClick={() => imprimir('Certificado de Consulta')}
          disabled={loadingClinica}
        >
          <FiPrinter size={16} /> {loadingClinica ? 'Cargando...' : 'Imprimir'}
        </button>
        <button className="odonto-btn-secondary" onClick={onClearPaciente}>
          <FiX size={16} /> Cambiar Paciente
        </button>
      </div>

      {/* Selector de odontólogo */}
      <div className="no-print" style={{ marginBottom: 16, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <FiUserCheck size={16} style={{ marginRight: 4 }} />
            Odontólogo emisor:
          </label>
          <select
            value={doctorSeleccionadoId}
            onChange={handleDoctorChange}
            style={{ 
              padding: '6px 12px', 
              borderRadius: 6, 
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: 13,
              minWidth: 200,
              fontFamily: 'inherit'
            }}
          >
            {clinica.doctores && clinica.doctores.length > 0 ? (
              clinica.doctores.map(d => (
                <option key={d.id} value={d.id}>
                  {d.nombre} - {d.especialidad}
                </option>
              ))
            ) : (
              <option value={doctor.id || 'default'}>
                {doctor.nombre || 'Dr. Odontólogo'}
              </option>
            )}
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {doctor.cedula && `C.I. ${doctor.cedula}`}
          </span>
        </div>
      </div>

      {/* Plantilla de impresión */}
      <div ref={printRef}>
        <PlantillaImpresion
          tipo="consulta"
          paciente={p}
          clinica={{
            ...clinica,
            doctor: doctor  // ← Usar el doctor seleccionado
          }}
          fecha={fecha}
        >
          <p>
            Certifico que el usuario <strong>{p.first_name} {p.last_name}</strong> de 
            <strong> {calcularEdad(p.birth_date)} años</strong>, con 
            <strong> C.I. {p.document_number}</strong> recibió atención odontológica el 
            <strong> día {new Date(fecha).toLocaleDateString('es-EC', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</strong>.
          </p>

          <div style={{ margin: '16px 0' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
              DIAGNÓSTICO
            </h4>
            <table className="pi-tabla pi-tabla-striped">
              <thead>
                <tr>
                  <th>DIAGNÓSTICO</th>
                  <th style={{ width: 120 }}>CIE-10</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.descripcion}</td>
                    <td>{d.cie10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontStyle: 'italic', margin: '12px 0' }}>
            Se recomienda controles cada 1 meses, para realizarse los siguientes procedimientos 
            odontológicos de acuerdo con el diagnóstico.
          </p>

          <p style={{ margin: '12px 0' }}>
            Es todo cuanto puedo certificar para los fines consiguientes.
          </p>

          <p style={{ margin: '12px 0', fontSize: 13, color: '#4a4a4a' }}>
            El paciente puede hacer uso de este documento como lo estime conveniente.
          </p>
        </PlantillaImpresion>
      </div>

      {/* Controles de diagnóstico (solo en pantalla) */}
      <div className="no-print" style={{ marginTop: 24, padding: 16, background: 'var(--bg-tertiary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
        <h4 style={{ marginBottom: 12 }}>Gestionar Diagnósticos</h4>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Descripción del diagnóstico"
            value={nuevoDiagnostico.descripcion}
            onChange={(e) => setNuevoDiagnostico({ ...nuevoDiagnostico, descripcion: e.target.value })}
            style={{ flex: 2, minWidth: 200, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
          />
          <input
            type="text"
            placeholder="CIE-10"
            value={nuevoDiagnostico.cie10}
            onChange={(e) => setNuevoDiagnostico({ ...nuevoDiagnostico, cie10: e.target.value })}
            style={{ width: 120, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6 }}
          />
          <button className="odonto-btn-primary" onClick={handleAgregarDiagnostico} style={{ padding: '8px 16px' }}>
            <FiPlus size={14} /> Agregar
          </button>
        </div>
        {diagnosticos.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {diagnosticos.map((d, idx) => (
              <span key={idx} style={{ display: 'inline-block', background: 'var(--bg-card)', padding: '4px 12px', borderRadius: 4, margin: '4px 4px 0 0', border: '1px solid var(--border-color)', fontSize: 13 }}>
                {d.descripcion} ({d.cie10})
                <button onClick={() => handleEliminarDiagnostico(idx)} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                  <FiX size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}