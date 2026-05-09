import React, { useState, useEffect } from 'react';
import { FiX, FiFileText, FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { fetchWithAuth } from '../config/apiBase';
import PrintPayrollButton from '../components/PrintPayrollButton';

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

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

export default function PayrollPrintModal({ 
  open, 
  onClose, 
  payroll, 
  details, 
  start, 
  end, 
  business: propBusiness, 
  paymentType,
  printerTicket
}) {
  const [businessData, setBusinessData] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const n = v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };

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
  const operador = getOperatorUser();
  const userName = operador?.nombre || operador?.name || operador?.username || "Operador";

  const periodInfo = { 
    start_date: start, 
    end_date: end, 
    period_text: periodoTexto, 
    payment_type: paymentType 
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    setError('');
    
    try {
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
      if (businessData?.address) doc.text(businessData.address, pageWidth / 2, y, { align: 'center' });
      y += 4;
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
      doc.text(`Fecha emisión: ${new Date().toLocaleDateString('es-EC')}`, 15, y);
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
        const daysWorked = n(payroll?.days_worked || 1);
        doc.text(`Días trabajados:`, 18, y);
        doc.text(`${daysWorked.toFixed(0)} días`, pageWidth - 18, y, { align: 'right' });
        y += 5;
        doc.text(`Sueldo diario:`, 18, y);
        doc.text(`$${n(payroll?.daily_rate).toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
        y += 5;
      }

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
      doc.text("Firma del empleado", pageWidth / 2, footerY + 5, { align: 'center' });
      doc.text(`Generado el ${new Date().toLocaleString('es-EC')}`, pageWidth / 2, footerY + 10, { align: 'center' });

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
              <span className={`status-dot ${printerTicket?.name ? 'connected' : 'disconnected'}`}></span>
              <span className="status-text">
                {printerTicket?.name ? `Impresora: ${printerTicket.name}` : '⚠️ No hay impresora configurada'}
              </span>
            </div>
          </div>

          {/* Mensajes */}
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

          {/* Botones */}
          <div className="payroll-print-buttons">
            <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
            <button className="btn-pdf" onClick={handleGeneratePDF} disabled={generatingPDF}>
              <FiFileText size={14} /> {generatingPDF ? 'Generando...' : 'PDF'}
            </button>
            <PrintPayrollButton
              payroll={payroll}
              details={details}
              periodInfo={periodInfo}
              businessInfo={businessData}
              userName={userName}
              printerTicket={printerTicket}
              className="btn-imprimir-embedded"
              onPrintComplete={onClose}
            />
          </div>
        </div>
      </div>

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
          border: 1px solid rgba(255, 255, 255, 0.1);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .payroll-print-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(16, 185, 129, 0.1);
        }
        .payroll-print-header-title h2 {
          font-size: 16px;
          font-weight: 700;
          color: #10b981;
          margin: 0;
        }
        .payroll-print-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          color: #a0a0b0;
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
        .info-label { color: #a0a0b0; font-weight: 500; }
        .info-value { color: #ffffff; font-weight: 600; }
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
          margin: 0 0 12px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          color: #e2e8f0;
        }
        .detail-row.highlight { color: #f59e0b; }
        .detail-row.total { font-size: 15px; font-weight: 700; color: #10b981; padding-top: 8px; }
        .detail-divider { height: 1px; background: rgba(255, 255, 255, 0.1); margin: 8px 0; }
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
        .status-dot.connected { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.5); }
        .status-dot.disconnected { background: #ef4444; }
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
          cursor: pointer;
        }
        .btn-imprimir-embedded {
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-pdf:hover, .btn-imprimir-embedded:hover { transform: translateY(-1px); }
        .btn-imprimir-embedded:disabled, .btn-pdf:disabled { opacity: 0.6; cursor: not-allowed; }
        .print-button-wrapper { flex: 1; }
        .print-error, .print-success { margin-top: 8px; }
      `}</style>
    </div>
  );
}