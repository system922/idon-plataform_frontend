// components/Odontologia/Reportes/PlantillaImpresion.jsx
import React, { forwardRef } from 'react';

/**
 * Plantilla de impresión A4 reutilizable para todos los reportes
 * 
 * @param {Object} props
 * @param {string} props.tipo - Tipo de reporte: 'consulta', 'reposo', 'odontograma', 'periodontograma', 'tratamiento', 'plan'
 * @param {Object} props.paciente - Datos del paciente
 * @param {Object} props.clinica - Datos de la clínica (desde useClinicaSettings)
 * @param {Object} props.datosAdicionales - Datos específicos del reporte
 * @param {string} props.fecha - Fecha del reporte
 * @param {React.ReactNode} props.children - Contenido adicional
 */
const PlantillaImpresion = forwardRef(({ 
  tipo,
  paciente,
  clinica = {},
  datosAdicionales = {},
  fecha = new Date().toISOString(),
  children
}, ref) => {

  const fechaFormateada = new Date(fecha).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

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

  const getTitulo = () => {
    const titulos = {
      consulta: 'CERTIFICADO MÉDICO POR ATENCIÓN ODONTOLÓGICA',
      reposo: 'CERTIFICADO DE REPOSO MÉDICO',
      odontograma: 'REPORTE DE ODONTOGRAMA',
      periodontograma: 'REPORTE DE PERIODONTOGRAMA',
      tratamiento: 'REPORTE DE TRATAMIENTO ODONTOLÓGICO',
      plan: 'REPORTE DE PLAN DE TRATAMIENTO'
    };
    return titulos[tipo] || 'REPORTE ODONTOLÓGICO';
  };

  const getSubtitulo = () => {
    const subtitulos = {
      consulta: 'Certificado de atención odontológica',
      reposo: 'Certificado de reposo médico',
      odontograma: 'Representación gráfica del estado dental',
      periodontograma: 'Evaluación periodontal del paciente',
      tratamiento: 'Historial de tratamientos realizados',
      plan: 'Plan de tratamiento programado'
    };
    return subtitulos[tipo] || 'Reporte odontológico';
  };

  // Usar datos de la clínica o valores por defecto
  const clinicaNombre = clinica.nombre || 'Clínica Odontológica';
  const clinicaDireccion = clinica.direccion || '';
  const clinicaTelefono = clinica.telefono || '';
  const clinicaEmail = clinica.email || '';
  const clinicaRuc = clinica.ruc || '';
  const doctorNombre = clinica.doctor?.nombre || '';
  const doctorCedula = clinica.doctor?.cedula || '';
  const doctorEspecialidad = clinica.doctor?.especialidad || 'Médico Odontólogo';
  const doctorRegistro = clinica.doctor?.registro || '';

  return (
    <div ref={ref} className="plantilla-impresion-a4">
      {/* Encabezado - Papel membretado */}
      <div className="pi-header">
        <div className="pi-header-content">
          <div className="pi-header-left">
            <div className="pi-header-logo">
              <div className="pi-logo-placeholder">
                <span>🦷</span>
              </div>
            </div>
            <div className="pi-header-text">
              <h1>{clinicaNombre}</h1>
              {clinicaDireccion && <p>{clinicaDireccion}</p>}
              <p>
                {clinicaTelefono && `Teléfono: ${clinicaTelefono}`}
                {clinicaTelefono && clinicaEmail && ' | '}
                {clinicaEmail && `Email: ${clinicaEmail}`}
                {clinicaRuc && ` | RUC: ${clinicaRuc}`}
              </p>
            </div>
          </div>
          <div className="pi-header-right">
            <div className="pi-header-doctor">
              {doctorNombre && <p><strong>Dr(a). {doctorNombre}</strong></p>}
              {doctorEspecialidad && <p style={{ fontSize: 11 }}>{doctorEspecialidad}</p>}
              {doctorCedula && <p style={{ fontSize: 11 }}>C.I. {doctorCedula}</p>}
              {doctorRegistro && <p style={{ fontSize: 11 }}>Reg. {doctorRegistro}</p>}
            </div>
          </div>
        </div>
        <hr className="pi-linea" />
      </div>

      {/* Título del documento */}
      <div className="pi-documento-titulo">
        <h2>{getTitulo()}</h2>
        <p>{getSubtitulo()}</p>
      </div>

      {/* Datos del paciente */}
      {paciente && (
        <div className="pi-paciente-info">
          <table className="pi-tabla-datos">
            <tbody>
              <tr>
                <td className="pi-label">Paciente:</td>
                <td className="pi-value"><strong>{paciente.first_name} {paciente.last_name}</strong></td>
                <td className="pi-label">Cédula:</td>
                <td className="pi-value"><strong>{paciente.document_number || '—'}</strong></td>
              </tr>
              <tr>
                <td className="pi-label">Edad:</td>
                <td className="pi-value">{calcularEdad(paciente.birth_date)} años</td>
                <td className="pi-label">HC:</td>
                <td className="pi-value">{paciente.hc_number || '—'}</td>
              </tr>
              <tr>
                <td className="pi-label">Dirección:</td>
                <td className="pi-value">{paciente.address || '—'}</td>
                <td className="pi-label">Teléfono:</td>
                <td className="pi-value">{paciente.phone || '—'}</td>
              </tr>
              {datosAdicionales?.institucionTrabajo && (
                <tr>
                  <td className="pi-label">Empresa:</td>
                  <td className="pi-value" colSpan="3">{datosAdicionales.institucionTrabajo}</td>
                </tr>
              )}
              {datosAdicionales?.puestoTrabajo && (
                <tr>
                  <td className="pi-label">Puesto:</td>
                  <td className="pi-value" colSpan="3">{datosAdicionales.puestoTrabajo}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Fecha del documento */}
      <div className="pi-fecha">
        <p><strong>Fecha de emisión:</strong> {fechaFormateada}</p>
      </div>

      {/* Contenido específico del reporte */}
      <div className="pi-contenido">
        {children}
      </div>

      {/* Footer - Firma y sello */}
      <div className="pi-footer">
        <div className="pi-firma-container">
          <div className="pi-firma-linea"></div>
          {doctorNombre && <p><strong>{doctorNombre}</strong></p>}
          {doctorEspecialidad && <p>{doctorEspecialidad}</p>}
          {doctorCedula && <p>C.I. {doctorCedula}</p>}
          <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Firma y sello de responsabilidad</p>
        </div>
        <div className="pi-fecha-lugar">
          <p>Santo Domingo de los Tsáchilas, {fechaFormateada}</p>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx>{`
        .plantilla-impresion-a4 {
          max-width: 794px;
          margin: 0 auto;
          padding: 50px 60px;
          background: #ffffff;
          font-family: 'Times New Roman', Times, serif;
          color: #1a1a1a;
          font-size: 13px;
          line-height: 1.6;
          min-height: 1123px;
        }

        /* HEADER */
        .pi-header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .pi-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .pi-header-logo {
          flex-shrink: 0;
        }

        .pi-logo-placeholder {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          color: #fff;
        }

        .pi-header-text h1 {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0;
        }

        .pi-header-text p {
          font-size: 12px;
          color: #4a4a4a;
          margin: 2px 0;
        }

        .pi-header-right {
          flex-shrink: 0;
          text-align: right;
          padding-left: 20px;
          border-left: 2px solid #e2e8f0;
        }

        .pi-header-doctor p {
          margin: 2px 0;
          font-size: 12px;
        }

        .pi-header-doctor strong {
          font-size: 13px;
        }

        .pi-linea {
          border: none;
          border-top: 3px solid #1a1a1a;
          margin: 16px 0 20px 0;
        }

        /* Título */
        .pi-documento-titulo {
          text-align: center;
          margin: 20px 0 24px 0;
        }

        .pi-documento-titulo h2 {
          font-size: 18px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 4px 0;
        }

        .pi-documento-titulo p {
          font-size: 13px;
          color: #4a4a4a;
          margin: 0;
        }

        /* Datos del paciente */
        .pi-paciente-info {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .pi-tabla-datos {
          width: 100%;
          border-collapse: collapse;
        }

        .pi-tabla-datos td {
          padding: 4px 8px;
          font-size: 13px;
        }

        .pi-tabla-datos .pi-label {
          font-weight: 600;
          color: #4a4a4a;
          width: 80px;
          white-space: nowrap;
        }

        .pi-tabla-datos .pi-value {
          color: #1a1a1a;
        }

        /* Fecha */
        .pi-fecha {
          text-align: right;
          margin-bottom: 16px;
          font-size: 13px;
        }

        .pi-fecha p {
          margin: 0;
        }

        /* Contenido */
        .pi-contenido {
          margin: 16px 0 32px 0;
          min-height: 200px;
        }

        /* Footer */
        .pi-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
        }

        .pi-firma-container {
          text-align: center;
          min-width: 200px;
        }

        .pi-firma-linea {
          width: 220px;
          border-bottom: 2px solid #1a1a1a;
          margin: 0 auto 8px auto;
        }

        .pi-firma-container p {
          margin: 3px 0;
          font-size: 12px;
        }

        .pi-fecha-lugar {
          text-align: right;
          font-size: 13px;
        }

        .pi-fecha-lugar p {
          margin: 0;
        }

        /* Estilos para tablas de contenido */
        .pi-tabla {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 13px;
        }

        .pi-tabla th {
          background: #f1f5f9;
          font-weight: 700;
          text-align: left;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
        }

        .pi-tabla td {
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
        }

        .pi-tabla-striped tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        /* Mensaje de ausencia de datos */
        .pi-sin-datos {
          text-align: center;
          padding: 40px 20px;
          color: #94a3b8;
          font-style: italic;
        }

        /* Responsive para impresión */
        @media print {
          .plantilla-impresion-a4 {
            padding: 40px 50px;
            min-height: auto;
          }

          .pi-header-right {
            border-left-color: #1a1a1a;
          }

          .pi-paciente-info {
            background: #f5f5f5;
            border-color: #1a1a1a;
          }

          .pi-tabla th {
            background: #e8e8e8;
          }

          .pi-tabla th,
          .pi-tabla td {
            border-color: #1a1a1a;
          }

          .pi-firma-linea {
            border-bottom-color: #1a1a1a;
          }
        }

        @media (max-width: 768px) {
          .plantilla-impresion-a4 {
            padding: 20px;
          }

          .pi-header-content {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .pi-header-right {
            border-left: none;
            border-top: 2px solid #e2e8f0;
            padding-left: 0;
            padding-top: 12px;
            text-align: left;
          }

          .pi-footer {
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          .pi-fecha-lugar {
            text-align: center;
          }

          .pi-firma-linea {
            width: 160px;
          }

          .pi-tabla-datos td {
            display: block;
            padding: 2px 4px;
          }

          .pi-tabla-datos .pi-label {
            width: 100%;
            font-weight: 600;
          }

          .pi-tabla-datos td:not(.pi-label) {
            margin-bottom: 4px;
          }
        }
      `}</style>
    </div>
  );
});

PlantillaImpresion.displayName = 'PlantillaImpresion';

export default PlantillaImpresion;