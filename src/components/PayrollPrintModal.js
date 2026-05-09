import React, { useState, useEffect } from 'react';
import { FiX, FiFileText, FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { fetchWithAuth } from '../config/apiBase';
import PrintPayrollButton from '../components/PrintPayrollButton';
import jsPDF from "jspdf";

function getOperatorUser() {
  try {
    return JSON.parse(localStorage.getItem('idonUser') || '{}');
  } catch {
    return {};
  }
}

async function getBusinessData() {
  console.log('🔍 [getBusinessData] Iniciando obtención de datos del negocio...');
  
  try {
    // 1. Obtener datos de einvoicing config (tiene los datos reales)
    console.log('📡 [getBusinessData] Consultando /api/einvoicing/config...');
    const einvRes = await fetchWithAuth('/api/einvoicing/config');
    let einvData = null;
    if (einvRes.ok) {
      einvData = await einvRes.json();
      console.log('✅ [getBusinessData] Datos de einvoicing:', einvData);
    } else {
      console.warn('⚠️ [getBusinessData] No se pudo obtener /api/einvoicing/config');
    }
    
    // 2. Obtener datos del negocio desde localStorage
    const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
    console.log('🏢 [getBusinessData] Negocio seleccionado localStorage:', selectedBusiness);
    
    // 3. Obtener settings adicionales
    let settingsData = {};
    try {
      console.log('📡 [getBusinessData] Consultando /api/settings...');
      const settingsRes = await fetchWithAuth('/api/settings');
      const settings = await settingsRes.json();
      settingsData = settings?.data ?? settings ?? {};
      console.log('✅ [getBusinessData] Settings obtenidos:', settingsData);
    } catch (e) {
      console.warn('⚠️ [getBusinessData] Error obteniendo settings:', e);
    }
    
    // 4. Obtener receipt-info (datos comerciales para tickets)
    let receiptData = {};
    try {
      console.log('📡 [getBusinessData] Consultando /api/settings/receipt-info...');
      const receiptRes = await fetchWithAuth('/api/settings/receipt-info');
      if (receiptRes.ok) {
        receiptData = await receiptRes.json();
        console.log('✅ [getBusinessData] Datos receipt-info:', receiptData);
      } else {
        console.warn('⚠️ [getBusinessData] No se pudo obtener /api/settings/receipt-info');
      }
    } catch (e) {
      console.warn('⚠️ [getBusinessData] Error obteniendo receipt-info:', e);
    }
    
    // PRIORIDAD: einvData > receiptData > selectedBusiness > settingsData
    const result = {
      trade_name: einvData?.nombre_comercial || 
                  receiptData?.trade_name ||
                  selectedBusiness?.trade_name || 
                  selectedBusiness?.name || 
                  settingsData.trade_name || 
                  "Mi Negocio",
      company_name: einvData?.razon_social || 
                    receiptData?.company_name ||
                    selectedBusiness?.company_name || 
                    selectedBusiness?.name || 
                    settingsData.company_name || 
                    "Mi Negocio",
      address: einvData?.direccion_matriz || 
               receiptData?.address ||
               selectedBusiness?.address || 
               settingsData.address || 
               "",
      phone: receiptData?.phone ||
             selectedBusiness?.phone || 
             settingsData.phone || 
             einvData?.telefono || 
             "",
      ruc: einvData?.ruc || 
           receiptData?.ruc ||
           selectedBusiness?.ruc || 
           settingsData.ruc || 
           "",
      email: selectedBusiness?.email || 
             settingsData.email || 
             einvData?.email || 
             ""
    };
    
    console.log('🎉 [getBusinessData] Resultado final:', result);
    return result;
    
  } catch (error) {
    console.error('❌ [getBusinessData] Error obteniendo datos del negocio:', error);
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
      console.log('📂 [PayrollPrintModal] Modal abierto');
      console.log('📦 propBusiness recibido:', propBusiness);
      
      if (propBusiness && (propBusiness.name || propBusiness.trade_name || propBusiness.company_name)) {
        console.log('✅ Usando propBusiness para datos del negocio');
        setBusinessData({
          trade_name: propBusiness.trade_name || propBusiness.name || propBusiness.company_name || 'MI NEGOCIO',
          company_name: propBusiness.company_name || propBusiness.name || propBusiness.trade_name || 'MI NEGOCIO',
          address: propBusiness.address || "",
          phone: propBusiness.phone || "",
          ruc: propBusiness.ruc || "",
          email: propBusiness.email || ""
        });
      } else {
        console.log('🔄 Obteniendo datos del negocio desde API...');
        getBusinessData().then(data => {
          console.log('📊 businessData obtenido:', data);
          setBusinessData(data);
        });
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

  const formatDateTime = () => {
    return new Date().toLocaleString('es-EC', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Guayaquil'
    });
  };

  const periodoTexto = start === end ? formatDate(start) : `${formatDate(start)} al ${formatDate(end)}`;
  const operador = getOperatorUser();
  const userName = operador?.nombre || operador?.name || operador?.username || "Operador";
  const userRole = operador?.role || operador?.rol || "Administrador";

  // Construir items y deducciones desde details
  const itemsList = [];
  const deductionsList = [];
  
  if (details && Array.isArray(details)) {
    details.forEach(detail => {
      if (detail.type === 'hourly_wage' || detail.type === 'daily_wage') {
        itemsList.push({
          concept: detail.concept || 'Sueldo base',
          amount: Number(detail.amount) || 0
        });
      } else if (detail.type === 'deduction') {
        deductionsList.push({
          concept: detail.concept || 'Deducción',
          amount: Number(detail.amount) || 0
        });
      } else {
        itemsList.push({
          concept: detail.concept || 'Ingreso',
          amount: Number(detail.amount) || 0
        });
      }
    });
  }

  // Si no hay detalles, agregar el pago base
  if (itemsList.length === 0) {
    if (paymentType === 'hourly') {
      itemsList.push({
        concept: `Horas trabajadas (${n(payroll?.total_hours)} h x $${n(payroll?.hourly_rate).toFixed(2)})`,
        amount: n(payroll?.total_pay)
      });
    } else {
      itemsList.push({
        concept: `Sueldo diario (${n(payroll?.days_worked || 1)} días x $${n(payroll?.daily_rate).toFixed(2)})`,
        amount: n(payroll?.total_pay)
      });
    }
  }

  const totalEarnings = itemsList.reduce((sum, i) => sum + (i.amount || 0), 0);
  const totalDeductions = deductionsList.reduce((sum, d) => sum + (d.amount || 0), 0);
  const netSalary = n(payroll?.total_pay);

  // ============ GENERAR PDF PROFESIONAL ============
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    setError('');
    
    console.log('========== 🚀 INICIO GENERACIÓN PDF ==========');
    console.log('📄 Datos de payroll:', payroll);
    console.log('📋 Datos de details:', details);
    console.log('🏢 businessData:', businessData);
    console.log('👤 usuario:', userName);
    console.log('💰 paymentType:', paymentType);
    console.log('🖨️ printerTicket:', printerTicket);
    
    try {
      // Validar que businessData tenga datos
      if (!businessData) {
        console.error('❌ businessData es null o undefined');
        throw new Error('No se pudieron obtener los datos del negocio');
      }
      
      console.log('✅ businessData cargado correctamente:', {
        trade_name: businessData.trade_name,
        company_name: businessData.company_name,
        ruc: businessData.ruc,
        address: businessData.address,
        phone: businessData.phone,
        email: businessData.email
      });
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 20;

      console.log('📐 Dimensiones PDF:', { pageWidth, pageHeight });

      // ============ ENCABEZADO ============
      console.log('🎨 Generando encabezado...');
      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      const tituloNegocio = businessData?.trade_name?.toUpperCase() || businessData?.company_name?.toUpperCase() || "MI NEGOCIO";
      console.log('🏷️ Título negocio:', tituloNegocio);
      doc.text(tituloNegocio, pageWidth / 2, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (businessData?.address) {
        console.log('📍 Dirección:', businessData.address);
        doc.text(businessData.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      const telefonoRuc = `Tel: ${businessData?.phone || "N/A"} | RUC: ${businessData?.ruc || "N/A"}`;
      console.log('📞 Teléfono/RUC:', telefonoRuc);
      doc.text(telefonoRuc, pageWidth / 2, y, { align: 'center' });

      // ============ TÍTULO ============
      y = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("RECIBO DE NÓMINA", pageWidth / 2, y, { align: 'center' });

      // ============ INFO DEL REPORTE ============
      y += 8;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      
      const fechaActual = formatDateTime();
      console.log('📅 Fecha actual:', fechaActual);
      doc.text(`Fecha y Hora: ${fechaActual}`, 15, y);
      y += 4;
      doc.text(`Usuario: ${userName}`, 15, y);
      y += 4;
      doc.text(`Cargo: ${userRole}`, 15, y);
      y += 4;
      doc.text(`ID Recibo: #${payroll?.payroll_id || Date.now()}`, 15, y);

      // ============ DATOS DEL COLABORADOR ============
      y += 8;
      doc.setFillColor(245, 245, 245);
      doc.rect(15, y, pageWidth - 30, 6, 'F');
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("DATOS DEL COLABORADOR", 18, y + 4);

      y += 9;
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      
      console.log('👨‍💼 Nombre empleado:', payroll?.full_name);
      doc.text(`Nombre:`, 18, y);
      doc.text(payroll?.full_name || "N/A", pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Período:`, 18, y);
      doc.text(periodoTexto, pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Tipo de pago:`, 18, y);
      doc.text(paymentType === 'hourly' ? 'Pago por Horas' : 'Pago Diario', pageWidth - 18, y, { align: 'right' });
      y += 5;
      
      doc.text(`Fecha emisión:`, 18, y);
      doc.text(formatDateTime(), pageWidth - 18, y, { align: 'right' });

      // ============ INGRESOS ============
      if (itemsList.length > 0) {
        y += 8;
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y, pageWidth - 30, 6, 'F');
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("INGRESOS", 18, y + 4);

        y += 9;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        console.log('💰 Items de ingreso:', itemsList);
        itemsList.forEach(item => {
          doc.text(`${item.concept}:`, 18, y);
          doc.text(`$${item.amount.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });

        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL INGRESOS:`, 18, y);
        doc.text(`$${totalEarnings.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      }

      // ============ DEDUCCIONES ============
      if (deductionsList.length > 0) {
        y += 8;
        doc.setFillColor(245, 245, 245);
        doc.rect(15, y, pageWidth - 30, 6, 'F');
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text("DEDUCCIONES", 18, y + 4);

        y += 9;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        console.log('📉 Deducciones:', deductionsList);
        deductionsList.forEach(deduct => {
          doc.text(`${deduct.concept}:`, 18, y);
          doc.text(`$${deduct.amount.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });

        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL DEDUCCIONES:`, 18, y);
        doc.text(`$${totalDeductions.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      }

      // ============ TOTAL NETO ============
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      
      y += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(46, 204, 113);
      console.log('💵 Neto a pagar:', netSalary);
      doc.text(`NETO A PAGAR:`, 18, y);
      doc.text(`$${netSalary.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

      // ============ FORMA DE PAGO ============
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      
      y += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("FORMA DE PAGO", 18, y);
      
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.text(`Método:`, 18, y);
      doc.text(`Efectivo`, pageWidth - 18, y, { align: 'right' });

      // ============ FIRMA ============
      const footerY = pageHeight - 25;
      doc.setDrawColor(200, 200, 200);
      doc.line(pageWidth / 2 - 40, footerY, pageWidth / 2 + 40, footerY);
      
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text("Firma del empleado", pageWidth / 2, footerY + 6, { align: 'center' });
      doc.text(payroll?.full_name?.split(' ')[0] || '', pageWidth / 2, footerY + 12, { align: 'center' });
      
      doc.setFontSize(7);
      doc.text(`Generado el ${new Date().toLocaleDateString('es-EC')} a las ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`, pageWidth / 2, footerY + 20, { align: 'center' });

      // ============ GUARDAR PDF ============
      const safeName = payroll?.full_name?.replace(/[^a-z0-9]/gi, '-') || 'recibo';
      const fechaDoc = new Date().toISOString().split('T')[0];
      const nombreArchivo = `recibo-nomina-${safeName}-${fechaDoc}.pdf`;
      console.log('💾 Guardando PDF como:', nombreArchivo);
      doc.save(nombreArchivo);
      
      console.log('✅ PDF generado exitosamente');
      setSuccess('✅ PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('❌ Error generando PDF:', err);
      console.error('Stack trace:', err.stack);
      setError(err.message || 'Error al generar PDF');
    } finally {
      setGeneratingPDF(false);
      console.log('========== 🏁 FIN GENERACIÓN PDF ==========');
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
              <span className="info-label">Negocio:</span>
              <span className="info-value">{businessData?.trade_name || "Cargando..."}</span>
            </div>
            <div className="info-row">
              <span className="info-label">RUC:</span>
              <span className="info-value">{businessData?.ruc || "Cargando..."}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Dirección:</span>
              <span className="info-value">{businessData?.address || "Cargando..."}</span>
            </div>
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
            <div className="info-row">
              <span className="info-label">Usuario:</span>
              <span className="info-value">{userName}</span>
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
              periodInfo={{ start_date: start, end_date: end, period_text: periodoTexto, payment_type: paymentType }}
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
        }
        .payroll-print-close-btn {
          background: rgba(255, 255, 255, 0.05);
          border: none;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          color: #a0a0b0;
          display: flex;
          align-items: center;
          justify-content: center;
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
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 13px;
          color: #e2e8f0;
        }
        .detail-row.highlight { color: #f59e0b; }
        .detail-row.total { 
          font-size: 15px; 
          font-weight: 700; 
          color: #10b981; 
          padding-top: 8px;
          border-top: 1px dashed rgba(16, 185, 129, 0.3);
        }
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
        .status-text { font-size: 12px; color: #a0a0b0; }
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
          transition: all 0.2s;
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
          transition: all 0.2s;
        }
        .btn-pdf:hover { transform: translateY(-1px); }
        .btn-pdf:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .btn-imprimir-embedded {
          flex: 1;
          padding: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-imprimir-embedded:hover { transform: translateY(-1px); }
        .btn-imprimir-embedded:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
      `}</style>
    </div>
  );
}