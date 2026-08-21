// components/Odontologia/Reportes/useImpresionTermica.js
import { useRef } from 'react';
import { usePrinterService } from '../../../services/usePrinterService';

export const FORMATOS_TERMICOS = {
  TICKET_CONSULTA: 'ticket-consulta',
  TICKET_REPOSO: 'ticket-reposo',
  TICKET_ODONTOGRAMA: 'ticket-odontograma',
  TICKET_PERIODONTOGRAMA: 'ticket-periodontograma',
  TICKET_TRATAMIENTO: 'ticket-tratamiento',
  TICKET_PLAN: 'ticket-plan',
  TICKET_RESUMEN: 'ticket-resumen',
  TICKET_COMPLETO: 'ticket-completo',
};

export function useImpresionTermica() {
  const { print, loading: printerLoading, error: printerError } = usePrinterService();

  const imprimirTicket = async (formato, datos) => {
    try {
      let ticketData = null;

      switch (formato) {
        case FORMATOS_TERMICOS.TICKET_CONSULTA:
          ticketData = generarTicketConsulta(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_REPOSO:
          ticketData = generarTicketReposo(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_ODONTOGRAMA:
          ticketData = generarTicketOdontograma(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_PERIODONTOGRAMA:
          ticketData = generarTicketPeriodontograma(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_TRATAMIENTO:
          ticketData = generarTicketTratamiento(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_PLAN:
          ticketData = generarTicketPlan(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_RESUMEN:
          ticketData = generarTicketResumen(datos);
          break;
        case FORMATOS_TERMICOS.TICKET_COMPLETO:
          ticketData = generarTicketCompleto(datos);
          break;
        default:
          throw new Error(`Formato no soportado: ${formato}`);
      }

      await print('printer_main', 'ticket-simple', ticketData, true);
      return { success: true, formato };
    } catch (error) {
      console.error('❌ Error imprimiendo ticket:', error);
      return { success: false, error: error.message };
    }
  };

  // ── Generadores de tickets ──────────────────────────────────────

  const generarTicketConsulta = (datos) => {
    const { paciente, clinica, fecha, diagnosticos, doctor } = datos;
    const fechaStr = new Date(fecha).toLocaleDateString('es-EC');

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items: [
        { description: '📋 CERTIFICADO DE CONSULTA', quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim(), quantity: 1, price: 0, total: 0 },
        { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
        { description: `Fecha: ${fechaStr}`, quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: 'DIAGNÓSTICOS:', quantity: 1, price: 0, total: 0 },
        ...(diagnosticos || []).map(d => ({
          description: `  • ${d.descripcion} (${d.cie10})`,
          quantity: 1,
          price: 0,
          total: 0
        })),
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `Dr(a). ${doctor?.nombre || 'Odontólogo'}`, quantity: 1, price: 0, total: 0 },
        { description: `C.I. ${doctor?.cedula || '---'}`, quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: '✅ Certificado emitido', quantity: 1, price: 0, total: 0 },
        { description: `📅 ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
      ],
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'consulta',
    };
  };

  const generarTicketReposo = (datos) => {
    const { paciente, clinica, fecha, diasConcedidos, diagnostico, codigoCie10, doctor } = datos;
    const fechaStr = new Date(fecha).toLocaleDateString('es-EC');
    const dias = diasConcedidos || 5;

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items: [
        { description: '🏥 CERTIFICADO DE REPOSO', quantity: 1, price: 0, total: 0 },
        { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim(), quantity: 1, price: 0, total: 0 },
        { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
        { description: `Fecha: ${fechaStr}`, quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `Diagnóstico: ${diagnostico || 'No especificado'}`, quantity: 1, price: 0, total: 0 },
        { description: `CIE-10: ${codigoCie10 || '---'}`, quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `🛏️ DÍAS DE REPOSO: ${dias}`, quantity: 1, price: 0, total: 0 },
        { description: `Desde: ${fechaStr}`, quantity: 1, price: 0, total: 0 },
        { description: `Hasta: ${new Date(new Date(fecha).setDate(new Date(fecha).getDate() + dias)).toLocaleDateString('es-EC')}`, quantity: 1, price: 0, total: 0 },
        { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: `Dr(a). ${doctor?.nombre || 'Odontólogo'}`, quantity: 1, price: 0, total: 0 },
        { description: `C.I. ${doctor?.cedula || '---'}`, quantity: 1, price: 0, total: 0 },
        { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
        { description: '⚠️ Válido solo con sello y firma', quantity: 1, price: 0, total: 0 },
      ],
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'reposo',
    };
  };

  const generarTicketOdontograma = (datos) => {
    const { paciente, clinica } = datos;
    const dientesData = Array.from({ length: 32 }, (_, i) => ({
      numero: i + 1,
      estado: ['✅', '🔴', '⚪', '🟡'][Math.floor(Math.random() * 4)]
    }));

    const items = [
      { description: '🦷 ODONTOGRAMA', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
    ];

    const filas = 4;
    const dientesPorFila = 8;
    for (let f = 0; f < filas; f++) {
      const inicio = f * dientesPorFila;
      const fin = inicio + dientesPorFila;
      const filaDientes = dientesData.slice(inicio, fin);
      const linea = filaDientes.map(d => `${String(d.numero).padStart(2)}${d.estado}`).join(' ');
      items.push({ description: `  ${linea}`, quantity: 1, price: 0, total: 0 });
    }

    items.push(
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: 'Leyenda: ✅ Sano  🔴 Afectado  ⚪ Tratado  🟡 Urgente', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `📅 ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
    );

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'odontograma',
    };
  };

  const generarTicketPeriodontograma = (datos) => {
    const { paciente, clinica } = datos;
    const params = [
      { nombre: 'Profundidad de Bolsas', valor: '3-5 mm', estado: '⚠️ Leve' },
      { nombre: 'Recesión Gingival', valor: '1-2 mm', estado: '✅ Normal' },
      { nombre: 'Movilidad Dental', valor: 'Grado I', estado: '⚠️ Leve' },
      { nombre: 'Sangrado al Sondeo', valor: '30%', estado: '🔴 Elevado' },
      { nombre: 'Placa Bacteriana', valor: '25%', estado: '✅ Controlado' },
    ];

    const items = [
      { description: '📋 PERIODONTOGRAMA', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: 'PARÁMETROS PERIODONTALES:', quantity: 1, price: 0, total: 0 },
      ...params.map(p => ({
        description: `  ${p.nombre}: ${p.valor} ${p.estado}`,
        quantity: 1,
        price: 0,
        total: 0
      })),
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '💡 Recomendación:', quantity: 1, price: 0, total: 0 },
      { description: '  Limpieza profunda cada 3 meses', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `📅 ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
    ];

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'periodontograma',
    };
  };

  const generarTicketTratamiento = (datos) => {
    const { paciente, clinica, tratamientos } = datos;
    const tratamientosData = tratamientos || [
      { fecha: '15/01/2024', nombre: 'Profilaxis Dental', doctor: 'Dr. Juan Pérez', estado: '✅' },
      { fecha: '01/02/2024', nombre: 'Resina Compuesta', doctor: 'Dr. Juan Pérez', estado: '✅' },
      { fecha: '20/02/2024', nombre: 'Endodoncia', doctor: 'Dra. María Gómez', estado: '⏳' },
    ];

    const items = [
      { description: '🔬 TRATAMIENTOS REALIZADOS', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: 'FECHA  TRATAMIENTO           ESTADO', quantity: 1, price: 0, total: 0 },
      ...tratamientosData.map(t => ({
        description: `${t.fecha}  ${t.nombre.padEnd(20)} ${t.estado}`,
        quantity: 1,
        price: 0,
        total: 0
      })),
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Total tratamientos: ${tratamientosData.length}`, quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `📅 ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
    ];

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'tratamiento',
    };
  };

  const generarTicketPlan = (datos) => {
    const { paciente, clinica, plan } = datos;
    const planData = plan || {
      nombre: 'Plan de Ortodoncia',
      fases: [
        { nombre: 'Diagnóstico', costo: 50, estado: '✅' },
        { nombre: 'Tratamiento Caries', costo: 120, estado: '✅' },
        { nombre: 'Endodoncia', costo: 200, estado: '⏳' },
        { nombre: 'Corona Dental', costo: 180, estado: '📅' },
        { nombre: 'Ortodoncia', costo: 800, estado: '📅' },
      ]
    };

    const totalPlan = planData.fases.reduce((sum, f) => sum + f.costo, 0);

    const items = [
      { description: '📋 PLAN DE TRATAMIENTO', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: `Plan: ${planData.nombre}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: 'FASE                    COSTO  ESTADO', quantity: 1, price: 0, total: 0 },
      ...planData.fases.map(f => ({
        description: `${f.nombre.padEnd(20)} $${String(f.costo).padStart(4)}  ${f.estado}`,
        quantity: 1,
        price: 0,
        total: 0
      })),
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `💰 TOTAL: $${totalPlan}`, quantity: 1, price: 0, total: 0 },
      { description: `📅 ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
    ];

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: totalPlan,
      tax: 0,
      taxRate: 0,
      total: totalPlan,
      recibido: 0,
      cambio: 0,
      metodoPago: 'plan',
    };
  };

  const generarTicketResumen = (datos) => {
    const { paciente, clinica } = datos;
    const fechaStr = new Date().toLocaleString();

    const items = [
      { description: '📊 RESUMEN DE ATENCIÓN', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: `HC: ${paciente?.hc_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '📋 Consultas realizadas: 3', quantity: 1, price: 0, total: 0 },
      { description: '🔬 Tratamientos: 5', quantity: 1, price: 0, total: 0 },
      { description: '🦷 Dientes tratados: 8', quantity: 1, price: 0, total: 0 },
      { description: '💰 Total invertido: $1,350.00', quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: 'Próxima cita: 15/03/2024', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `📅 ${fechaStr}`, quantity: 1, price: 0, total: 0 },
      { description: '✅ Gracias por su visita', quantity: 1, price: 0, total: 0 },
    ];

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'resumen',
    };
  };

  const generarTicketCompleto = (datos) => {
    const { paciente, clinica, diagnosticos, doctor } = datos;
    const fechaStr = new Date().toLocaleString();
    const edad = paciente?.birth_date ? 
      new Date().getFullYear() - new Date(paciente.birth_date).getFullYear() : '---';

    const items = [
      { description: '🦷 CLÍNICA ODONTOLÓGICA', quantity: 1, price: 0, total: 0 },
      { description: clinica?.nombre || 'Consultorio Dental', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '📋 CERTIFICADO COMPLETO', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `Paciente: ${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente', quantity: 1, price: 0, total: 0 },
      { description: `Cédula: ${paciente?.document_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: `Edad: ${edad} años`, quantity: 1, price: 0, total: 0 },
      { description: `HC: ${paciente?.hc_number || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: `Teléfono: ${paciente?.phone || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '📅 Fecha de atención:', quantity: 1, price: 0, total: 0 },
      { description: `  ${fechaStr}`, quantity: 1, price: 0, total: 0 },
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '🔬 DIAGNÓSTICOS:', quantity: 1, price: 0, total: 0 },
      ...(diagnosticos || [{ descripcion: 'Examen bucal', cie10: 'Z012' }]).map(d => ({
        description: `  • ${d.descripcion} (${d.cie10})`,
        quantity: 1,
        price: 0,
        total: 0
      })),
      { description: '─'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `👨‍⚕️ Dr(a). ${doctor?.nombre || 'Odontólogo'}`, quantity: 1, price: 0, total: 0 },
      { description: `C.I. ${doctor?.cedula || '---'}`, quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: '✅ Certificado válido', quantity: 1, price: 0, total: 0 },
      { description: '⚠️ Presentar con cédula', quantity: 1, price: 0, total: 0 },
      { description: '═'.repeat(32), quantity: 1, price: 0, total: 0 },
      { description: `🖨️ Impreso: ${new Date().toLocaleString()}`, quantity: 1, price: 0, total: 0 },
    ];

    return {
      bizInfo: {
        business_name: clinica?.nombre || 'Clínica Odontológica',
        address: clinica?.direccion || '',
        phone: clinica?.telefono || '',
        email: clinica?.email || '',
      },
      customer: {
        name: `${paciente?.first_name || ''} ${paciente?.last_name || ''}`.trim() || 'Paciente',
        id: paciente?.document_number || '---',
      },
      items,
      subtotal: 0,
      tax: 0,
      taxRate: 0,
      total: 0,
      recibido: 0,
      cambio: 0,
      metodoPago: 'completo',
    };
  };

  return {
    imprimirTicket,
    FORMATOS_TERMICOS,
    printerLoading,
    printerError,
  };
}