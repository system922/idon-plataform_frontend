import React, { useState, useEffect } from 'react';
import { FiPrinter, FiX, FiAlertCircle, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { fetchWithAuth } from '../config/apiBase';
import { buildPayrollPrintText } from '../Helper/buildPayrollPrintText';

// Función para obtener el usuario operador del localStorage
function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

// Función para obtener datos del negocio
async function getBusinessData() {
  try {
    const settingsRes = await fetchWithAuth('/api/settings');
    const settingsData = await settingsRes.json();
    const settings = settingsData?.data ?? settingsData ?? {};
    
    const einvRes = await fetchWithAuth('/api/einvoicing/config');
    const einvData = einvRes.ok ? await einvRes.json() : null;
    
    return {
      trade_name: settings.trade_name || settings.company_name || "Mi Negocio",
      company_name: settings.company_name || settings.trade_name || "Mi Negocio",
      address: settings.address || "",
      phone: settings.phone || "",
      ruc: settings.ruc || einvData?.ruc || "",
      email: settings.email || ""
    };
  } catch (error) {
    console.error('Error obteniendo datos del negocio:', error);
    return {
      trade_name: "Mi Negocio",
      company_name: "Mi Negocio",
      address: "",
      phone: "",
      ruc: "",
      email: ""
    };
  }
}

export default function PayrollPrintModalQZ({ 
  open, 
  onClose, 
  payroll, 
  details, 
  start, 
  end, 
  business: propBusiness, 
  paymentType,
  printerTicket,
  onPrintSuccess
}) {
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [businessData, setBusinessData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const n = v => Number(v || 0);

  // Cargar datos del negocio al abrir el modal
  useEffect(() => {
    if (open) {
      if (propBusiness?.name) {
        setBusinessData({
          trade_name: propBusiness.name,
          company_name: propBusiness.name,
          address: propBusiness.address || "",
          phone: propBusiness.phone || "",
          ruc: propBusiness.ruc || ""
        });
      } else {
        getBusinessData().then(setBusinessData);
      }
    }
  }, [open, propBusiness]);

  if (!open) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const periodoTexto = start === end ? formatDate(start) : `${formatDate(start)} al ${formatDate(end)}`;

  // Configuración de la impresora (sin hardcodear)
  const printerConfig = printerTicket || {
    name: null,
    width: 32
  };

  // Función para imprimir usando QZ Tray
  const handlePrint = async () => {
    setError('');
    setSuccess('');

    // Validar que haya datos de impresora
    if (!printerConfig.name) {
      setError('⚠️ No hay impresora configurada. Ve a Configuración > Impresoras');
      return;
    }

    if (!payroll) {
      setError('No hay datos de nómina para imprimir');
      return;
    }

    setPrinting(true);

    try {
      // Dinámicamente importar qz-tray
      const qz = await import('qz-tray');
      
      const printerName = printerConfig.name;
      const width = printerConfig.width || 32;
      const footer = printerConfig.footer || null;

      // Obtener usuario actual
      const operador = getOperatorUser();
      const userName = operador?.nombre || operador?.name || operador?.username || "Operador";

      // Construir el texto para imprimir
      const text = buildPayrollPrintText(
        payroll,
        details,
        {
          start_date: start,
          end_date: end,
          period_text: periodoTexto,
          payment_type: paymentType
        },
        businessData,
        userName,
        width,
        footer
      );

      // Verificar conexión con QZ Tray
      if (!qz.default.websocket.isActive()) {
        throw new Error('QZ Tray no está conectado. Por favor, inicia QZ Tray.');
      }

      // Configurar impresora
      const config = qz.default.configs.create(printerName, {
        encoding: 'UTF-8',
        endOfDoc: '\n\n\n'
      });

      // Imprimir
      await qz.default.print(config, [
        {
          type: 'raw',
          format: 'plain',
          data: text
        }
      ]);

      setSuccess('✅ Recibo impreso correctamente');
      setTimeout(() => setSuccess(''), 3000);
      
      if (onPrintSuccess) onPrintSuccess();

    } catch (err) {
      console.error('Error imprimiendo nómina:', err);
      setError(err.message || 'Error al imprimir');

      // Fallback: imprimir en navegador
      imprimirHTML(
        buildPayrollPrintText(
          payroll,
          details,
          {
            start_date: start,
            end_date: end,
            period_text: periodoTexto,
            payment_type: paymentType
          },
          businessData,
          getOperatorUser()?.nombre || "Operador",
          printerConfig.width || 32,
          printerConfig.footer
        ),
        printerConfig.width || 32
      );
    } finally {
      setPrinting(false);
    }
  };

  // Función de fallback para imprimir en navegador
  const imprimirHTML = (text, width) => {
    const escaped = text
      .split('\n')
      .map(line => 
        line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      )
      .join('\n');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Recibo de Nómina</title>
        <style>
          @page { 
            margin: 3mm; 
            size: ${width * 2}mm auto; 
          }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 10pt; 
            white-space: pre; 
            width: ${width * 1.6}mm; 
            margin: 0 auto; 
            color: #000; 
            line-height: 1.3; 
          }
        </style>
      </head>
      <body>${escaped}</body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600,toolbar=0,menubar=0');
    
    if (!printWindow) {
      setError('Permite ventanas emergentes para imprimir');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 300);
  };

  // Generar PDF
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    setError('');
    
    try {
      const operador = getOperatorUser();
      const userName = operador?.nombre || operador?.name || operador?.username || "Operador";
      
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      let y = 20;

      // Encabezado
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(businessData?.trade_name || "NÓMINA", pageWidth / 2, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (businessData?.address) {
        doc.text(businessData.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      doc.text(`Tel: ${businessData?.phone || "N/A"} | RUC: ${businessData?.ruc || "N/A"}`, pageWidth / 2, y, { align: 'center' });

      // Título
      y = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("RECIBO DE NÓMINA", pageWidth / 2, y, { align: 'center' });

      // Datos del colaborador
      y += 8;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text("DATOS DEL COLABORADOR", 15, y);
      
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(`Nombre: ${payroll?.full_name || "N/A"}`, 15, y);
      y += 5;
      doc.text(`Período: ${periodoTexto}`, 15, y);
      y += 5;
      doc.text(`Tipo de pago: ${paymentType === 'hourly' ? 'Pago por Horas' : 'Pago Diario'}`, 15, y);
      y += 5;
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-EC')}`, 15, y);
      y += 5;
      doc.text(`Usuario: ${userName}`, 15, y);

      // Detalle del pago
      y += 8;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text("DETALLE DEL PAGO", 18, y + 4);

      y += 9;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      if (paymentType === 'hourly') {
        doc.text(`Horas trabajadas:`, 18, y);
        doc.text(`${n(payroll?.total_hours).toFixed(2)} horas`, pageWidth - 18, y, { align: 'right' });
        y += 5;
        doc.text(`Valor por hora:`, 18, y);
        doc.text(`$${n(payroll?.hourly_rate).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
        y += 5;
        if (n(payroll?.extra_hours) > 0) {
          doc.text(`Horas extras (150%):`, 18, y);
          doc.text(`${n(payroll?.extra_hours).toFixed(2)} horas`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        }
      } else {
        doc.text(`Días trabajados:`, 18, y);
        doc.text(`${n(payroll?.days_worked || 1).toFixed(0)} días`, pageWidth - 18, y, { align: 'right' });
        y += 5;
        doc.text(`Sueldo diario:`, 18, y);
        doc.text(`$${n(payroll?.daily_rate).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
        y += 5;
      }

      // Total
      y += 5;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(15, y, pageWidth - 15, y);
      
      y += 5;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text("TOTAL A PAGAR:", 18, y);
      doc.text(`$${n(payroll?.total_pay).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // Pie de página
      const footerY = doc.internal.pageSize.height - 20;
      doc.setDrawColor(200, 200, 200);
      doc.line(pageWidth / 2 - 40, footerY, pageWidth / 2 + 40, footerY);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Firma del empleado", pageWidth / 2, footerY + 5, { align: 'center' });
      doc.text(`Generado el ${new Date().toLocaleString('es-EC')}`, pageWidth / 2, footerY + 10, { align: 'center' });

      // Guardar PDF
      doc.save(`recibo-nomina-${payroll?.full_name?.replace(/\s/g, '-')}-${formatDate(start)}.pdf`);
      setSuccess('✅ PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error generando PDF:', err);
      setError(err.message || 'Error al generar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <div className="payroll-print-modal-overlay" style={{ zIndex: 10000 }}>
      <div className="payroll-print-modal-container">
        <div className="payroll-print-modal-header">
          <div className="payroll-print-header-title">
            <FiPrinter size={20} color="#10b981" />
            <h2>IMPRIMIR RECIBO DE NÓMINA</h2>
          </div>
          <button className="payroll-print-close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="payroll-print-modal-content">
          {/* Info del colaborador */}
          <div className="payroll-print-info-card">
            <div className="info-row">
              <span className="info-label">Colaborador:</span>
              <span className="info-value">{payroll?.full_name || "N/A"}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Período:</span>
              <span className="info-value">{periodoTexto}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tipo de pago:</span>
              <span className="info-value">{paymentType === 'hourly' ? 'Pago por Horas' : 'Pago Diario'}</span>
            </div>
          </div>

          {/* Detalle del pago */}
          <div className="payroll-print-detail-card">
            <h3>Detalle del pago</h3>
            {paymentType === 'hourly' ? (
              <>
                <div className="detail-row">
                  <span>Horas trabajadas:</span>
                  <span>{n(payroll?.total_hours).toFixed(2)} horas</span>
                </div>
                <div className="detail-row">
                  <span>Valor por hora:</span>
                  <span>${n(payroll?.hourly_rate).toFixed(2)}</span>
                </div>
                {n(payroll?.extra_hours) > 0 && (
                  <div className="detail-row highlight">
                    <span>Horas extras (150%):</span>
                    <span>{n(payroll?.extra_hours).toFixed(2)} horas</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="detail-row">
                  <span>Días trabajados:</span>
                  <span>{n(payroll?.days_worked || 1).toFixed(0)} días</span>
                </div>
                <div className="detail-row">
                  <span>Sueldo diario:</span>
                  <span>${n(payroll?.daily_rate).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="detail-divider"></div>
            <div className="detail-row total">
              <span>TOTAL A PAGAR:</span>
              <span>${n(payroll?.total_pay).toFixed(2)}</span>
            </div>
          </div>

          {/* Estado de impresora */}
          <div className="payroll-print-printer-status">
            <div className="status-indicator">
              <span className={`status-dot ${printerConfig.name ? 'connected' : 'disconnected'}`}></span>
              <span className="status-text">
                {printerConfig.name ? `Impresora: ${printerConfig.name}` : '⚠️ No hay impresora configurada'}
              </span>
            </div>
          </div>

          {/* Mensajes de error/success */}
          {error && (
            <div className="payroll-print-error">
              <FiAlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}
          
          {success && (
            <div className="payroll-print-success">
              <FiCheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="payroll-print-buttons">
            <button className="btn-cancelar" onClick={onClose}>
              Cancelar
            </button>
            <button 
              className="btn-pdf" 
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
            >
              <FiFileText size={14} />
              {generatingPDF ? 'Generando...' : 'PDF'}
            </button>
            <button 
              className="btn-imprimir" 
              onClick={handlePrint}
              disabled={printing || !printerConfig.name}
            >
              <FiPrinter size={14} />
              {printing ? 'Imprimiendo...' : 'Imprimir'}
            </button>
          </div>
        </div>
      </div>

      {/* Estilos del modal */}
      <style jsx>{`
        .payroll-print-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
 backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .payroll-print-modal-container {
          background: linear-gradient(135deg, #1a1f2a, #141920);
          border-radius: 16px;
          width: 90%;
          max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .payroll-print-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(16, 185, 129, 0.1);
        }

        .payroll-print-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .payroll-print-header-title h2 {
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .payroll-print-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #a0a0b0;
          transition: all 0.2s ease;
        }

        .payroll-print-close-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .payroll-print-modal-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          max-height: calc(90vh - 70px);
          overflow-y: auto;
        }

        .payroll-print-info-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 14px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
        }

        .info-label {
          color: #a0a0b0;
          font-weight: 500;
        }

        .info-value {
          color: #ffffff;
          font-weight: 600;
        }

        .payroll-print-detail-card {
          background: rgba(16, 185, 129, 0.05);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 14px;
        }

        .payroll-print-detail-card h3 {
          font-size: 12px;
          font-weight: 700;
          color: #a0a0b0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          color: #e2e8f0;
        }

        .detail-row.highlight {
          color: #f59e0b;
        }

        .detail-row.total {
          font-size: 15px;
          font-weight: 700;
          color: #10b981;
          padding-top: 8px;
        }

        .detail-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }

        .payroll-print-printer-status {
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #10b981;
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.5);
        }

        .status-dot.disconnected {
          background: #ef4444;
        }

        .status-text {
          font-size: 12px;
          color: #a0a0b0;
        }

        .payroll-print-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 10px;
          color: #ef4444;
          font-size: 12px;
        }

        .payroll-print-success {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 10px;
          color: #10b981;
          font-size: 12px;
        }

        .payroll-print-buttons {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .btn-cancelar {
          flex: 1;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: #a0a0b0;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-cancelar:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        .btn-pdf {
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-pdf:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .btn-imprimir {
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-imprimir:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-imprimir:disabled,
        .btn-pdf:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .payroll-print-modal-content::-webkit-scrollbar {
          width: 6px;
        }

        .payroll-print-modal-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        .payroll-print-modal-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}