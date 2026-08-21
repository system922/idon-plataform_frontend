// components/Odontologia/Reportes/ReporteReposo.jsx
import React, { useState } from 'react';
import { FiPrinter, FiEye, FiUser, FiCalendar, FiX, FiClock, FiUserCheck } from 'react-icons/fi';
import PlantillaImpresion from './PlantillaImpresion';
import { useImpresion } from './useImpresion';
import { useClinicaSettings } from '../../../hooks/useClinicaSettings';

const TIPOS_CONTINGENCIA = [
  { value: 'enfermedad_general', label: 'Enfermedad General' },
  { value: 'enfermedad_catastrofica', label: 'Enfermedad Catastrófica' },
  { value: 'maternidad', label: 'Maternidad' },
  { value: 'accidente_trabajo', label: 'Accidente de Trabajo' },
];

export default function ReporteReposo({ 
  pacientes, 
  onSelectPaciente, 
  selectedPaciente, 
  onClearPaciente 
}) {
  const { printRef, imprimir } = useImpresion();
  const { settings: clinica, loading: loadingClinica, seleccionarDoctor } = useClinicaSettings();
  
  const [reposoData, setReposoData] = useState({
    diagnostico: '',
    codigoCie10: '',
    tipoContingencia: 'enfermedad_general',
    diasConcedidos: '',
    desde: new Date().toISOString().split('T')[0],
    hasta: new Date().toISOString().split('T')[0],
    direccionPaciente: '',
    telefonoPaciente: '',
    institucionTrabajo: '',
    puestoTrabajo: '',
    historiaClinica: ''
  });

  const [doctorSeleccionadoId, setDoctorSeleccionadoId] = useState(clinica.doctorSeleccionado?.id || '');

  const handleDoctorChange = (e) => {
    const doctorId = e.target.value;
    setDoctorSeleccionadoId(doctorId);
    seleccionarDoctor(doctorId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setReposoData({ ...reposoData, [name]: value });
  };

  const numeroALetras = (num) => {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    if (num < 10) return unidades[num];
    if (num < 20) {
      const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
      return especiales[num - 10];
    }
    if (num < 100) {
      const dec = decenas[Math.floor(num / 10)];
      const uni = unidades[num % 10];
      return num % 10 === 0 ? dec : dec + ' y ' + uni;
    }
    return num.toString();
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
                      onClick={() => {
                        setReposoData({
                          ...reposoData,
                          direccionPaciente: p.address || '',
                          telefonoPaciente: p.phone || '',
                          historiaClinica: p.hc_number || ''
                        });
                        onSelectPaciente(p);
                      }}
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

  const tiposContingencia = {
    enfermedad_general: 'Enfermedad General',
    enfermedad_catastrofica: 'Enfermedad Catastrófica',
    maternidad: 'Maternidad',
    accidente_trabajo: 'Accidente de Trabajo'
  };

  const diasEnLetras = numeroALetras(parseInt(reposoData.diasConcedidos) || 0);

  const handleImprimir = () => {
    if (!reposoData.diagnostico || !reposoData.codigoCie10) {
      alert('Por favor completa el diagnóstico y el código CIE-10');
      return;
    }
    if (!reposoData.diasConcedidos || parseInt(reposoData.diasConcedidos) < 1) {
      alert('Por favor ingresa el número de días concedidos');
      return;
    }
    imprimir('Certificado de Reposo');
  };

  return (
    <div className="odonto-reporte-content">
      <div className="odonto-reporte-actions no-print">
        <button 
          className="odonto-btn-primary" 
          onClick={handleImprimir}
          disabled={loadingClinica}
        >
          <FiPrinter size={16} /> {loadingClinica ? 'Cargando...' : 'Imprimir Certificado'}
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

      {/* Datos del paciente seleccionado */}
      <div className="odonto-reporte-paciente-info no-print">
        <div className="odonto-reporte-paciente-avatar">
          <FiUser size={24} />
        </div>
        <div className="odonto-reporte-paciente-datos">
          <h4>{p.first_name} {p.last_name}</h4>
          <p>Cédula: {p.document_number} | HC: {p.hc_number || 'No asignada'}</p>
        </div>
      </div>

      {/* Formulario de datos de reposo (solo en pantalla) */}
      <div className="odonto-reporte-form no-print">
        <h3>Datos del Certificado de Reposo</h3>
        
        <div className="odonto-form-row">
          <div className="odonto-form-group">
            <label>Diagnóstico *</label>
            <input
              name="diagnostico"
              value={reposoData.diagnostico}
              onChange={handleChange}
              placeholder="Ej: Caries dental profunda"
              required
            />
          </div>
          <div className="odonto-form-group">
            <label>Código CIE-10 *</label>
            <input
              name="codigoCie10"
              value={reposoData.codigoCie10}
              onChange={handleChange}
              placeholder="Ej: K020"
              required
            />
          </div>
        </div>

        <div className="odonto-form-row">
          <div className="odonto-form-group">
            <label>Tipo de Contingencia</label>
            <select
              name="tipoContingencia"
              value={reposoData.tipoContingencia}
              onChange={handleChange}
            >
              {TIPOS_CONTINGENCIA.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="odonto-form-group">
            <label>Días Concedidos *</label>
            <input
              name="diasConcedidos"
              type="number"
              value={reposoData.diasConcedidos}
              onChange={handleChange}
              min={1}
              placeholder="Ej: 5"
              required
            />
          </div>
        </div>

        <div className="odonto-form-row">
          <div className="odonto-form-group">
            <label>Desde</label>
            <input
              name="desde"
              type="date"
              value={reposoData.desde}
              onChange={handleChange}
            />
          </div>
          <div className="odonto-form-group">
            <label>Hasta</label>
            <input
              name="hasta"
              type="date"
              value={reposoData.hasta}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="odonto-form-row">
          <div className="odonto-form-group">
            <label>Dirección del Paciente</label>
            <input
              name="direccionPaciente"
              value={reposoData.direccionPaciente}
              onChange={handleChange}
              placeholder="Dirección domiciliaria"
            />
          </div>
          <div className="odonto-form-group">
            <label>Teléfono de Contacto</label>
            <input
              name="telefonoPaciente"
              value={reposoData.telefonoPaciente}
              onChange={handleChange}
              placeholder="Teléfono"
            />
          </div>
        </div>

        <div className="odonto-form-row">
          <div className="odonto-form-group">
            <label>Institución/Empresa</label>
            <input
              name="institucionTrabajo"
              value={reposoData.institucionTrabajo}
              onChange={handleChange}
              placeholder="Nombre de la empresa"
            />
          </div>
          <div className="odonto-form-group">
            <label>Puesto de Trabajo</label>
            <input
              name="puestoTrabajo"
              value={reposoData.puestoTrabajo}
              onChange={handleChange}
              placeholder="Cargo del paciente"
            />
          </div>
        </div>

        <div className="odonto-form-group">
          <label>Número de Historia Clínica</label>
          <input
            name="historiaClinica"
            value={reposoData.historiaClinica}
            onChange={handleChange}
            placeholder="HC-001"
          />
        </div>
      </div>

      {/* Plantilla de impresión */}
      <div ref={printRef}>
        <PlantillaImpresion
          tipo="reposo"
          paciente={p}
          clinica={{
            ...clinica,
            doctor: doctor  // ← Usar el doctor seleccionado
          }}
          datosAdicionales={{
            institucionTrabajo: reposoData.institucionTrabajo,
            puestoTrabajo: reposoData.puestoTrabajo
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
              MOTIVOS DE ENFERMEDAD
            </h4>
            <table className="pi-tabla">
              <tbody>
                <tr>
                  <td style={{ width: 200, fontWeight: 600, background: '#f8fafc' }}>Diagnóstico:</td>
                  <td>{reposoData.diagnostico || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, background: '#f8fafc' }}>Código CIE-10:</td>
                  <td>{reposoData.codigoCie10 || 'No especificado'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, background: '#f8fafc' }}>Tipo de Contingencia:</td>
                  <td>{tiposContingencia[reposoData.tipoContingencia] || reposoData.tipoContingencia}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
              DÍAS DE REPOSO CONCEDIDOS
            </h4>
            <table className="pi-tabla">
              <tbody>
                <tr>
                  <td style={{ width: 200, fontWeight: 600, background: '#f8fafc' }}>Total de días:</td>
                  <td>
                    <strong>{reposoData.diasConcedidos || 0} días</strong>
                    {diasEnLetras && ` (${diasEnLetras} días)`}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, background: '#f8fafc' }}>Desde:</td>
                  <td>{reposoData.desde ? new Date(reposoData.desde).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No especificado'}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600, background: '#f8fafc' }}>Hasta:</td>
                  <td>{reposoData.hasta ? new Date(reposoData.hasta).toLocaleDateString('es-EC', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No especificado'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ margin: '16px 0' }}>
            Es todo cuanto puedo certificar para los fines consiguientes.
          </p>

          <p style={{ fontSize: 13, color: '#4a4a4a', marginTop: 8 }}>
            <strong>Nota:</strong> Este certificado tiene validez únicamente para los fines establecidos. 
            No es válido si presenta tachones, enmendaduras o información ilegible.
          </p>
        </PlantillaImpresion>
      </div>

      {/* Resumen de días (solo en pantalla) */}
      {reposoData.diasConcedidos && parseInt(reposoData.diasConcedidos) > 0 && (
        <div className="no-print" style={{ marginTop: 16, padding: 12, background: 'var(--primary-bg)', borderRadius: 8, border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <FiClock size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <strong>Resumen:</strong> {reposoData.diasConcedidos} días de reposo concedidos 
            {reposoData.desde && reposoData.hasta && ` (${new Date(reposoData.desde).toLocaleDateString()} - ${new Date(reposoData.hasta).toLocaleDateString()})`}
          </div>
        </div>
      )}
    </div>
  );
}