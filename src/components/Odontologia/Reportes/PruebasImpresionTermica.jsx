// components/Odontologia/Reportes/PruebasImpresionTermica.jsx
import React, { useState } from 'react';
import {
  FiPrinter,
  FiCheck,
  FiAlertCircle,
  FiRefreshCw,
  FiUser,
} from 'react-icons/fi';
import SelectorTicketTermico from './SelectorTicketTermico';
import { useImpresionTermica, FORMATOS_TERMICOS } from './useImpresionTermica';
import { useClinicaSettings } from '../../../hooks/useClinicaSettings';

export default function PruebasImpresionTermica({ 
  pacientes, 
  selectedPaciente, 
  onSelectPaciente,
  onClearPaciente 
}) {
  const { imprimirTicket, printerLoading, printerError } = useImpresionTermica();
  const { settings: clinica } = useClinicaSettings();
  const [formatoActivo, setFormatoActivo] = useState(FORMATOS_TERMICOS.TICKET_CONSULTA);
  const [imprimiendo, setImprimiendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [diagnosticos] = useState([
    { descripcion: 'Examen bucal Z012.', cie10: 'Z012' },
    { descripcion: 'Caries Resina simple', cie10: 'K020' },
    { descripcion: 'Profilaxis (limpieza dental)', cie10: 'K052' },
  ]);

  const handleImprimir = async () => {
    if (!selectedPaciente) {
      setResultado({ success: false, message: '⚠️ Seleccione un paciente primero' });
      return;
    }

    setImprimiendo(true);
    setResultado(null);

    try {
      const datos = {
        paciente: selectedPaciente,
        clinica: clinica,
        doctor: clinica?.doctorSeleccionado || {},
        fecha: new Date().toISOString(),
        diagnosticos: diagnosticos,
        diasConcedidos: 5,
        diagnostico: 'Caries dental profunda',
        codigoCie10: 'K020',
        tratamientos: [
          { fecha: '15/01/2024', nombre: 'Profilaxis Dental', doctor: 'Dr. Juan Pérez', estado: '✅' },
          { fecha: '01/02/2024', nombre: 'Resina Compuesta', doctor: 'Dr. Juan Pérez', estado: '✅' },
          { fecha: '20/02/2024', nombre: 'Endodoncia', doctor: 'Dra. María Gómez', estado: '⏳' },
        ],
        plan: {
          nombre: 'Plan de Ortodoncia',
          fases: [
            { nombre: 'Diagnóstico', costo: 50, estado: '✅' },
            { nombre: 'Tratamiento Caries', costo: 120, estado: '✅' },
            { nombre: 'Endodoncia', costo: 200, estado: '⏳' },
            { nombre: 'Corona Dental', costo: 180, estado: '📅' },
            { nombre: 'Ortodoncia', costo: 800, estado: '📅' },
          ]
        }
      };

      const response = await imprimirTicket(formatoActivo, datos);
      
      if (response.success) {
        setResultado({ 
          success: true, 
          message: `✅ Ticket "${formatoActivo}" impreso correctamente` 
        });
      } else {
        setResultado({ 
          success: false, 
          message: `❌ Error: ${response.error || 'Error al imprimir'}` 
        });
      }
    } catch (error) {
      setResultado({ 
        success: false, 
        message: `❌ Error: ${error.message}` 
      });
    } finally {
      setImprimiendo(false);
      setTimeout(() => setResultado(null), 5000);
    }
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
                      <FiUser size={14} /> Seleccionar
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

  return (
    <div className="pruebas-impresion-termica">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FiPrinter size={20} />
            Pruebas de Impresión Térmica
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Seleccione un formato para probar la impresión en ticket térmico
          </p>
        </div>
        <button 
          className="odonto-btn-secondary" 
          onClick={onClearPaciente}
          style={{ fontSize: 12 }}
        >
          Cambiar Paciente
        </button>
      </div>

      {/* Información del paciente */}
      <div style={{
        padding: 12,
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FiUser size={16} style={{ color: 'var(--text-muted)' }} />
          <strong>{selectedPaciente.first_name} {selectedPaciente.last_name}</strong>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          C.I. {selectedPaciente.document_number}
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          HC: {selectedPaciente.hc_number || 'No asignada'}
        </span>
      </div>

      {/* Resultado */}
      {resultado && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          background: resultado.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${resultado.success ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: resultado.success ? '#10b981' : '#ef4444',
        }}>
          {resultado.success ? <FiCheck size={18} /> : <FiAlertCircle size={18} />}
          {resultado.message}
        </div>
      )}

      {/* Error de impresora */}
      {printerError && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          marginBottom: 16,
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#ef4444',
        }}>
          <FiAlertCircle size={18} />
          ⚠️ Error de impresora: {printerError}
        </div>
      )}

      {/* Selector de formatos */}
      <SelectorTicketTermico
        formatoActivo={formatoActivo}
        onFormatoChange={setFormatoActivo}
        onImprimir={handleImprimir}
        disabled={!selectedPaciente}
        loading={imprimiendo}
      />

      {/* Información adicional */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
        marginTop: 16,
      }}>
        <div style={{
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>📋 Diagnósticos de prueba</h4>
          {diagnosticos.map((d, idx) => (
            <div key={idx} style={{
              fontSize: 12,
              padding: '2px 0',
              color: 'var(--text-secondary)',
            }}>
              • {d.descripcion} ({d.cie10})
            </div>
          ))}
        </div>

        <div style={{
          padding: 12,
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
        }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>ℹ️ Información del ticket</h4>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <div>Formato: <strong>{formatoActivo}</strong></div>
            <div>Paciente: <strong>{selectedPaciente.first_name} {selectedPaciente.last_name}</strong></div>
            <div>Ancho: <strong>80mm</strong></div>
            <div>Caracteres por línea: <strong>32</strong></div>
          </div>
        </div>
      </div>

      {/* Botón para imprimir todos los formatos */}
      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={async () => {
            const formatos = Object.values(FORMATOS_TERMICOS);
            setImprimiendo(true);
            let successCount = 0;
            let errorCount = 0;
            
            for (const formato of formatos) {
              try {
                const datos = {
                  paciente: selectedPaciente,
                  clinica: clinica,
                  doctor: clinica?.doctorSeleccionado || {},
                  fecha: new Date().toISOString(),
                  diagnosticos: diagnosticos,
                  diasConcedidos: 5,
                  diagnostico: 'Caries dental profunda',
                  codigoCie10: 'K020',
                };
                const response = await imprimirTicket(formato, datos);
                if (response.success) successCount++;
                else errorCount++;
              } catch (e) {
                errorCount++;
              }
            }
            
            setImprimiendo(false);
            setResultado({
              success: errorCount === 0,
              message: `📊 Impresión completa: ${successCount} exitosos, ${errorCount} errores`
            });
            setTimeout(() => setResultado(null), 5000);
          }}
          disabled={imprimiendo}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: 12,
            cursor: imprimiendo ? 'not-allowed' : 'pointer',
            opacity: imprimiendo ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <FiRefreshCw size={14} /> Imprimir Todos los Formatos
        </button>
      </div>

      <style>{`
        .pruebas-impresion-termica {
          padding: 0;
        }
      `}</style>
    </div>
  );
}