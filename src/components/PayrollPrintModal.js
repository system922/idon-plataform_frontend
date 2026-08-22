import React, { useState, useEffect } from 'react';
import { FiFileText, FiPrinter, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import Modal from '../components/General/Modal';
import { IconTextButton, ButtonGroup } from '../components/General/Button';
import {
  X, 
} from 'react-feather';
import { fetchWithAuth } from '../config/apiBase_';
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
  try {
    const einvRes = await fetchWithAuth('/api/einvoicing/config');
    let einvData = null;
    if (einvRes.ok) {
      einvData = await einvRes.json();
    }
    
    const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');

    let settingsData = {};
    try {
      const settingsRes = await fetchWithAuth('/api/settings');
      const settings = await settingsRes.json();
      settingsData = settings?.data ?? settings ?? {};
    } catch (e) {}

    let receiptData = {};
    try {
      const receiptRes = await fetchWithAuth('/api/settings/receipt-info');
      if (receiptRes.ok) {
        receiptData = await receiptRes.json();
      }
    } catch (e) {}

    return {
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
      if (propBusiness && (propBusiness.name || propBusiness.trade_name || propBusiness.company_name)) {
        setBusinessData({
          trade_name: propBusiness.trade_name || propBusiness.name || propBusiness.company_name || 'MI NEGOCIO',
          company_name: propBusiness.company_name || propBusiness.name || propBusiness.trade_name || 'MI NEGOCIO',
          address: propBusiness.address || "",
          phone: propBusiness.phone || "",
          ruc: propBusiness.ruc || "",
          email: propBusiness.email || ""
        });
      } else {
        getBusinessData().then(data => {
          setBusinessData(data);
        });
      }
    }
  }, [open, propBusiness]);

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

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    setError('');

    try {
      if (!businessData) {
        throw new Error('No se pudieron obtener los datos del negocio');
      }
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = 20;

      doc.setFillColor(41, 128, 185);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      const tituloNegocio = businessData?.trade_name?.toUpperCase() || businessData?.company_name?.toUpperCase() || "MI NEGOCIO";
      doc.text(tituloNegocio, pageWidth / 2, y, { align: 'center' });
      
      y += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      if (businessData?.address) {
        doc.text(businessData.address, pageWidth / 2, y, { align: 'center' });
        y += 4;
      }
      const telefonoRuc = `Tel: ${businessData?.phone || "N/A"} | RUC: ${businessData?.ruc || "N/A"}`;
      doc.text(telefonoRuc, pageWidth / 2, y, { align: 'center' });

      y = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("RECIBO DE NÓMINA", pageWidth / 2, y, { align: 'center' });

      y += 8;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      
      const fechaActual = formatDateTime();
      doc.text(`Fecha y Hora: ${fechaActual}`, 15, y);
      y += 4;
      doc.text(`Usuario: ${userName}`, 15, y);
      y += 4;
      doc.text(`Cargo: ${userRole}`, 15, y);
      y += 4;
      doc.text(`ID Recibo: #${payroll?.payroll_id || Date.now()}`, 15, y);

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

        itemsList.forEach(item => {
          doc.text(`${item.concept}:`, 18, y);
          doc.text(`$${item.amount.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });

        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL INGRESOS:`, 18, y);
        doc.text(`$${totalEarnings.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      }

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

        deductionsList.forEach(deduct => {
          doc.text(`${deduct.concept}:`, 18, y);
          doc.text(`$${deduct.amount.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
          y += 5;
        });

        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL DEDUCCIONES:`, 18, y);
        doc.text(`$${totalDeductions.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });
      }

      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, pageWidth - 15, y);
      
      y += 6;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(46, 204, 113);
      doc.text(`NETO A PAGAR:`, 18, y);
      doc.text(`$${netSalary.toFixed(2)}`, pageWidth - 18, y, { align: 'right' });

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

      const safeName = payroll?.full_name?.replace(/[^a-z0-9]/gi, '-') || 'recibo';
      const fechaDoc = new Date().toISOString().split('T')[0];
      const nombreArchivo = `recibo-nomina-${safeName}-${fechaDoc}.pdf`;

      doc.save(nombreArchivo);
      
      setSuccess('✅ PDF generado correctamente');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      setError(err.message || 'Error al generar PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };


  return (
    <Modal
      closeOnOverlayClick={false}
      isOpen={open}
      onClose={onClose}
      title="Imprimir Recibo de Nómina"
      size="sm"
      footer={
        <>
          <ButtonGroup>
            <IconTextButton 
              variant="" 
              size="md" 
              icon={<X size={14} />} 
              onClick={onClose}
            >
              Cancelar
            </IconTextButton>
            <IconTextButton 
              variant="info" 
              size="md" 
              onClick={handleGeneratePDF} 
              disabled={generatingPDF}
              >
              <FiFileText size={14} /> {generatingPDF ? 'Generando...' : 'PDF'}
            </IconTextButton>
            <PrintPayrollButton
              payroll={payroll}
              details={details}
              size="md" 
              periodInfo={{ start_date: start, end_date: end, period_text: periodoTexto, payment_type: paymentType }}
              businessInfo={businessData}
              userName={userName}
              printerTicket={printerTicket}
              onPrintComplete={onClose}
            />
          </ButtonGroup>
        </>
      }
    >
      {/* Info del colaborador */}
      <div className="payroll-print-info-card">
        <div className="info-row">
          <span className="info-label">Colaborador/a:</span>
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
    </Modal>
  );
}