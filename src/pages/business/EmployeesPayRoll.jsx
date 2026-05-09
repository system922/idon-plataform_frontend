import React, { useState, useEffect, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import PayrollPrintModalQZ from '../../components/PayrollPrintModal';
import {
  RefreshCw, DollarSign, Clock, Calendar, Archive, List, Users, TrendingUp, Eye
} from 'react-feather';
import '../../styles/PayrollPro.css';

import { fetchWithAuth } from '../../config/apiBase';
import { usePrinterService } from '../../services/usePrinterService';

export default function EmployeesPayRollPage() {

  const { openCashDrawer } = usePrinterService();
  
  // Estados para filtros y datos
  const [type, setType] = useState('monthly');
  const [paymentType, setPaymentType] = useState('hourly');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para nóminas guardadas
  const [savedPayrolls, setSavedPayrolls] = useState([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedPayrollDetails, setSelectedPayrollDetails] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Estados para impresión
  const [showPrint, setShowPrint] = useState(false);
  const [toPrintPayroll, setToPrintPayroll] = useState(null);
  const [toPrintDetails, setToPrintDetails] = useState([]);

  // Estado para la configuración de la impresora
  const [printerConfig, setPrinterConfig] = useState({
    name: null,
    width: 32,
    footer: null
  });

  // Estados para control de acciones
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Refs para evitar llamadas duplicadas
  const lastGenerateTime = useRef(0);
  const lastSaveTime = useRef(0);
  const lastPayTime = useRef({});
  const processingIds = useRef(new Set());

  // Función auxiliar para convertir a número
  const n = v => Number(v || 0);

  // Cargar configuración de la impresora
  useEffect(() => {
    const loadPrinterConfig = () => {
      try {
        const savedPrinter = localStorage.getItem('selectedPrinter');
        if (savedPrinter) {
          const printer = JSON.parse(savedPrinter);
          setPrinterConfig({
            name: printer.name,
            width: printer.width || 32,
            footer: printer.footer || null
          });
        }
      } catch (error) {
        console.error('Error cargando impresora:', error);
      }
    };
    loadPrinterConfig();
  }, []);

  /**
   * Función para formatear fechas correctamente a YYYY-MM-DD
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      const year = ecuadorDate.getFullYear();
      const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
      const day = String(ecuadorDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return dateString;
    }
  };

  /**
   * Obtener fecha actual de Ecuador
   */
  useEffect(() => {
    const getEcuadorDate = () => {
      const now = new Date();
      const ecuadorDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      const year = ecuadorDate.getFullYear();
      const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
      const day = String(ecuadorDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = getEcuadorDate();
    setStart(today);
    setEnd(today);
  }, []);

  /**
   * Calcular días trabajados en el período seleccionado
   */
  const getDaysWorked = () => {
    if (!start) return 1;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date(start);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const handleStartChange = (newStart) => {
    setStart(newStart);
    if (!end || new Date(end) < new Date(newStart)) {
      setEnd(newStart);
    }
  };

  /**
   * Generar nómina (previsualización)
   */
  async function generate() {
    if (!start) {
      alert('Selecciona la fecha de inicio');
      return;
    }
    if (isGenerating || loading) return;
    
    const now = Date.now();
    if (now - lastGenerateTime.current < 2000) return;
    
    const endDate = end || start;
    
    try {
      setIsGenerating(true);
      setLoading(true);
      lastGenerateTime.current = now;
      
      const res = await fetchWithAuth('/api/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({ 
          start, 
          end: endDate, 
          type,
          payment_type: paymentType
        })
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      
      if (json.length === 0) {
        alert('⚠️ No se encontraron empleados activos para generar nómina');
      }
    } catch (error) {
      console.error('Error:', error);
      setData([]);
      alert('Error al generar nómina: ' + error.message);
    } finally {
      setLoading(false);
      setIsGenerating(false);
    }
  }

  /**
   * Guardar la nómina generada
   */
  async function savePayroll() {
    if (isSaving || loading) return;
    if (data.length === 0) {
      alert('Primero genera la nómina');
      return;
    }
    
    const now = Date.now();
    if (now - lastSaveTime.current < 3000) {
      alert('Por favor espera unos segundos antes de guardar nuevamente');
      return;
    }
    
    const endDate = end || start;
    
    try {
      setIsSaving(true);
      setLoading(true);
      lastSaveTime.current = now;
      
      const res = await fetchWithAuth('/api/payroll', {
        method: 'POST',
        body: JSON.stringify({ 
          rows: data, 
          start, 
          end: endDate, 
          type,
          payment_type: paymentType
        })
      });
      const result = await res.json();
      
      if (result.success) {
        alert('✅ Nómina guardada correctamente');
        setData([]);
      } else {
        alert('⚠️ ' + (result.message || 'Error al guardar la nómina'));
      }
    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar la nómina: ' + error.message);
    } finally {
      setLoading(false);
      setIsSaving(false);
    }
  }

  /**
   * Ver todas las nóminas guardadas
   */
  async function viewSavedPayroll() {
    if (isLoadingSaved || loading) return;
    
    try {
      setIsLoadingSaved(true);
      setLoading(true);
      
      const res = await fetchWithAuth(`/api/payroll/all-saved`);
      const json = await res.json();
      
      if (Array.isArray(json) && json.length > 0) {
        const processedPayrolls = json.map(payroll => ({
          ...payroll,
          start_date: formatDate(payroll.start_date),
          end_date: formatDate(payroll.end_date),
          total_amount: Number(payroll.total_amount) || 0,
          total_employees: Number(payroll.total_employees) || 0
        }));
        setSavedPayrolls(processedPayrolls);
        setShowSaved(true);
      } else {
        alert('No hay nóminas guardadas');
        setSavedPayrolls([]);
      }
    } catch (error) {
      console.error('Error consultando:', error);
      setSavedPayrolls([]);
      alert("Error consultando nómina guardada");
    } finally {
      setLoading(false);
      setIsLoadingSaved(false);
    }
  }

  /**
   * Ver detalle de una nómina específica por fecha
   */
  async function viewPayrollDetails(payrollGroup) {
    if (isLoadingDetails || loading) return;
    
    try {
      setIsLoadingDetails(true);
      setLoading(true);
      
      const startDate = payrollGroup.start_date;
      const endDate = payrollGroup.end_date;
      
      const res = await fetchWithAuth(`/api/payroll/saved-by-date?start_date=${startDate}&end_date=${endDate}`);
      const details = await res.json();
      
      setSelectedPayrollDetails({
        ...payrollGroup,
        employees: Array.isArray(details) ? details : []
      });
      setShowDetails(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Error cargando detalle de nómina');
    } finally {
      setLoading(false);
      setIsLoadingDetails(false);
    }
  }

  /**
   * Mostrar modal de impresión
   */
  async function handleShowPrintModal(emp) {
    try {
      const res = await fetchWithAuth(`/api/payroll/details/${emp.payroll_id}`);
      const details = await res.json();
      setToPrintPayroll(emp);
      setToPrintDetails(Array.isArray(details) ? details : []);
      setShowPrint(true);
    } catch (error) {
      console.error('Error:', error);
      alert('Error cargando detalle de nómina');
    }
  }

  /**
   * Abrir modal de selección de método de pago
   */
  const handlePayClick = (emp) => {
    setSelectedEmployee(emp);
    setPaymentMethod('cash');
    setShowPaymentMethodModal(true);
  };

  /**
   * Confirmar y procesar el pago con el método seleccionado
   */
  const confirmPay = async () => {
    if (!selectedEmployee) return;
    
    const emp = selectedEmployee;
    
    if (isPaying || loading) {
      alert('Por favor espera, ya se está procesando un pago');
      return;
    }
    
    const processingKey = `${emp.payroll_id}`;
    if (processingIds.current.has(processingKey)) return;
    
    const now = Date.now();
    const lastPayForKey = lastPayTime.current[processingKey];
    if (lastPayForKey && (now - lastPayForKey) < 5000) {
      alert('Por favor espera unos segundos antes de pagar nuevamente');
      return;
    }
    
    setShowPaymentMethodModal(false);
    
    try {
      setIsPaying(true);
      setLoading(true);
      processingIds.current.add(processingKey);
      
      if (!lastPayTime.current) lastPayTime.current = {};
      lastPayTime.current[processingKey] = now;
      
      const operador = JSON.parse(localStorage.getItem('idonUser') || '{}');
      if (!operador?.id) {
        alert('No se encontró información del usuario. Inicia sesión nuevamente.');
        return;
      }
      
      // 1. Registrar auditoría con método de pago
      const auditRes = await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: 'expenses',
          action: 'payroll_payment',
          description: `Pago de nómina a ${emp.full_name} por $${emp.total_pay.toFixed(2)} - Método: ${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}`,
          new_values: { 
            amount: emp.total_pay, 
            employee_id: emp.employee_id, 
            payroll_id: emp.payroll_id,
            payment_method: paymentMethod
          },
          reason: '',
        }),
      });
      
      if (!auditRes.ok) {
        const errorData = await auditRes.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error registrando auditoría');
      }
      
      // 2. Registrar gasto con método de pago
      const expensePayload = {
        amount: emp.total_pay,
        description: `Pago de nómina a ${emp.full_name} - ${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}`,
        reference: `Payroll ID: ${emp.payroll_id}`,
        category_id: '4f8e09d1-4adc-479d-89d7-a7575af7d54b',
        created_by: operador.id,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' }),
        payment_method: paymentMethod
      };
      
      const expenseRes = await fetchWithAuth('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expensePayload),
      });
      
      if (!expenseRes.ok) {
        const errorData = await expenseRes.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error registrando gasto');
      }
      
      // 3. Abrir cajón solo si es pago en efectivo
      if (paymentMethod === 'cash') {
        await openCashDrawer().catch(() => {});
      }
      
      alert(`✅ Pago registrado correctamente para ${emp.full_name} (${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'})`);
      
      // 4. Actualizar el estado
      if (selectedPayrollDetails) {
        const updatedEmployees = selectedPayrollDetails.employees.filter(e => e.payroll_id !== emp.payroll_id);
        setSelectedPayrollDetails({
          ...selectedPayrollDetails,
          employees: updatedEmployees,
          total_amount: updatedEmployees.reduce((acc, e) => acc + n(e.total_pay), 0)
        });
      }
      
    } catch (error) {
      console.error('Error registrando pago:', error);
      alert('Error registrando pago: ' + error.message);
    } finally {
      setLoading(false);
      setIsPaying(false);
      processingIds.current.delete(processingKey);
      setSelectedEmployee(null);
    }
  };

  // Calcular totales
  const totalPayroll = data.reduce((acc, e) => acc + n(e.total_pay), 0);
  const totalHours = data.reduce((acc, e) => acc + n(e.total_hours), 0);
  const totalExtraHours = data.reduce((acc, e) => acc + n(e.extra_hours), 0);
  const totalEmployees = data.length;
  
  const daysInPeriod = getDaysWorked();
  const periodText = end && end !== start ? `${start} al ${end} (${daysInPeriod} días)` : `${start} (1 día)`;

  const isAnyActionInProgress = isGenerating || isSaving || isPaying || isLoadingSaved || isLoadingDetails;

  const headerAction = (
    <div className="pay-toolbar">
      <button className="pay-btn" onClick={generate} disabled={isAnyActionInProgress || loading || isGenerating}>
        <RefreshCw size={14}/> {isGenerating ? 'Generando...' : 'Generar'}
      </button>
      <button className="pay-btn-print" onClick={savePayroll} disabled={isAnyActionInProgress || loading || isSaving || data.length === 0}>
        <DollarSign size={14}/> {isSaving ? 'Guardando...' : 'Guardar'}
      </button>
      <button 
        className="pay-btn-print" 
        style={{background:'#f9edcc',color:'#542'}} 
        onClick={viewSavedPayroll}
        disabled={isAnyActionInProgress || loading || isLoadingSaved}
      >
        <Archive size={18}/> {isLoadingSaved ? 'Cargando...' : 'Ver Nóminas'}
      </button>
    </div>
  );

  const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
  const businessInfo = { name: selectedBusiness?.name || "Mi Negocio" };

  return (
    <PageTemplate
      title="Nómina Inteligente"
      subtitle={`${paymentType === 'hourly' ? '💰 Pago por horas trabajadas' : '💰 Pago diario (sueldo fijo)'} - ${periodText}`}
      headerAction={headerAction}
      loading={loading || isAnyActionInProgress}
    >

      {/* Modal de selección de método de pago */}
      {showPaymentMethodModal && selectedEmployee && (
        <div className="pay-modal-backdrop" style={{ zIndex: 10001 }}>
          <div className="pay-modal payment-method-modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ color: '#10b981', marginBottom: 10 }}>💰 Seleccionar Método de Pago</h3>
              <p style={{ color: '#a0a0b0', fontSize: 14 }}>
                Empleado: <strong>{selectedEmployee.full_name}</strong><br/>
                Monto: <strong style={{ color: '#10b981' }}>${selectedEmployee.total_pay.toFixed(2)}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`payment-method-btn ${paymentMethod === 'cash' ? 'active-cash' : ''}`}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: paymentMethod === 'cash' ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                  background: paymentMethod === 'cash' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: paymentMethod === 'cash' ? '#10b981' : '#a0a0b0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600
                }}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`payment-method-btn ${paymentMethod === 'transfer' ? 'active-transfer' : ''}`}
                style={{
                  padding: '12px 24px',
                  borderRadius: 10,
                  border: paymentMethod === 'transfer' ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                  background: paymentMethod === 'transfer' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.03)',
                  color: paymentMethod === 'transfer' ? '#3b82f6' : '#a0a0b0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontWeight: 600
                }}
              >
                🏦 Transferencia
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn-cancelar"
                onClick={() => {
                  setShowPaymentMethodModal(false);
                  setSelectedEmployee(null);
                }}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn-confirmar"
                onClick={confirmPay}
                disabled={isPaying}
                style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                {isPaying ? 'Procesando...' : `Pagar con ${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de impresión */}
      <PayrollPrintModalQZ
        open={showPrint}
        onClose={() => setShowPrint(false)}
        payroll={toPrintPayroll}
        details={toPrintDetails}
        start={start}
        end={end || start}
        business={businessInfo}
        paymentType={paymentType}
        printerTicket={printerConfig}
      />

      {/* MODAL DE NÓMINAS GUARDADAS */}
      {showSaved && (
        <div className="pay-modal-backdrop" style={{ zIndex: 2000 }}>
          <div className="pay-modal" style={{minWidth: 700, maxWidth: '90%'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
              <b>📋 Nóminas Guardadas</b>
              <button onClick={() => setShowSaved(false)} style={{fontSize: 22, background: 'none', border: 'none', cursor: 'pointer'}}>&times;</button>
            </div>
            
            <table className="pay-table" style={{margin:"10px 0"}}>
              <thead>
                <tr><th>Fecha</th><th>Período</th><th>Tipo de Pago</th><th>Colaboradores</th><th>Total</th><th>Acción</th></tr>
              </thead>
              <tbody>
                {savedPayrolls.length === 0 ? (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: 40}}>No hay nóminas guardadas</td></tr>
                ) : (
                  savedPayrolls.map((payroll, idx) => (
                    <tr key={idx}>
                      <td>{payroll.start_date}</td>
                      <td>{payroll.start_date === payroll.end_date ? payroll.start_date : `${payroll.start_date} → ${payroll.end_date}`}</td>
                      <td>{payroll.payment_type === 'hourly' ? '⏱️ Por Horas' : '📅 Pago Diario'}</td>
                      <td style={{textAlign: 'center'}}>{payroll.total_employees}</td>
                      <td style={{fontWeight: 600, color: '#10b981', textAlign: 'right'}}>${payroll.total_amount.toFixed(2)}</td>
                      <td><button className="pay-btn-small" onClick={() => viewPayrollDetails(payroll)}><Eye size={14}/> Ver Detalle</button></td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} style={{textAlign: 'right'}}><strong>TOTAL GENERAL</strong></td>
                <td style={{fontWeight: 800, color: '#10b981', textAlign: 'right'}}><strong>${savedPayrolls.reduce((acc, e) => acc + (e.total_amount || 0), 0).toFixed(2)}</strong></td><td></td></tr>
              </tfoot>
            </table>
            <div style={{textAlign:'right'}}><button className="pay-btn" onClick={() => setShowSaved(false)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE NÓMINA POR FECHA */}
      {showDetails && selectedPayrollDetails && (
        <div className="pay-modal-backdrop" style={{ zIndex: 3000 }}>
          <div className="pay-modal" style={{minWidth: 800, maxWidth: '95%'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
              <b>📋 Detalle de Nómina - {selectedPayrollDetails.start_date}</b>
              <button onClick={() => setShowDetails(false)} style={{fontSize: 22, background: 'none', border: 'none', cursor: 'pointer'}}>&times;</button>
            </div>
            <div style={{marginBottom: 10, fontSize: 12, color: '#aaa'}}>
              Período: {selectedPayrollDetails.start_date === selectedPayrollDetails.end_date ? selectedPayrollDetails.start_date : `${selectedPayrollDetails.start_date} al ${selectedPayrollDetails.end_date}`} - 
              Tipo: {selectedPayrollDetails.payment_type === 'hourly' ? 'Pago por Horas' : 'Pago Diario'}
            </div>
            
            <table className="pay-table">
              <thead><tr><th>Colaborador/a</th><th>Horas</th><th>Horas Extras</th><th>Días</th><th>{selectedPayrollDetails.payment_type === 'hourly' ? 'Valor Hora' : 'Sueldo Diario'}</th><th>Total a Pagar</th><th>Pagar</th><th>Imprimir</th></tr></thead>
              <tbody>
                {selectedPayrollDetails.employees.map(emp => (
                  <tr key={emp.payroll_id}>
                    <td>{emp.full_name}</td>
                    <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                    <td style={{color: n(emp.extra_hours) > 0 ? '#fbbf24' : '#666', textAlign: 'center'}}>{n(emp.extra_hours).toFixed(2)}</td>
                    <td style={{textAlign: 'center'}}>{n(emp.days_worked || 1).toFixed(0)}</td>
                    <td>{selectedPayrollDetails.payment_type === 'hourly' ? `$${n(emp.hourly_rate).toFixed(2)}` : `$${n(emp.daily_rate).toFixed(2)}`}</td>
                    <td style={{fontWeight: 600, color: '#10b981', textAlign: 'right'}}>${n(emp.total_pay).toFixed(2)}</td>
                    <td><button className="pay-btn-small" onClick={() => handlePayClick(emp)} disabled={isPaying}>💰 Pagar</button></td>
                    <td><button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}><List size={14}/> Imprimir</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={6} style={{textAlign: 'right'}}><strong>TOTAL GENERAL</strong></td>
                <td style={{fontWeight: 800, color: '#10b981', textAlign: 'right'}}><strong>${selectedPayrollDetails.employees.reduce((acc, e) => acc + n(e.total_pay || 0), 0).toFixed(2)}</strong></td><td></td></tr>
              </tfoot>
            </table>
            <div style={{textAlign:'right'}}><button className="pay-btn" onClick={() => setShowDetails(false)}>Cerrar</button></div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="pay-filters">
        <select className="payment-type-select" value={paymentType} onChange={e => setPaymentType(e.target.value)} disabled={isAnyActionInProgress}>
          <option value="hourly">⏱️ Pago por Horas</option>
          <option value="daily">📅 Pago Diario (Sueldo Fijo)</option>
        </select>
        <select value={type} onChange={e => setType(e.target.value)} disabled={isAnyActionInProgress}>
          <option value="weekly">📅 Semanal</option>
          <option value="biweekly">📅 Quincenal</option>
          <option value="monthly">📅 Mensual</option>
        </select>
        <div className="date-range">
          <input type="date" value={start} onChange={e => handleStartChange(e.target.value)} disabled={isAnyActionInProgress}/>
          <span className="date-separator">→</span>
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} placeholder="Opcional" disabled={isAnyActionInProgress}/>
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="pay-stats">
        <div className="pay-card"><DollarSign size={20}/><div><span>${totalPayroll.toFixed(2)}</span><p>Total Nómina</p></div></div>
        <div className="pay-card"><Clock size={20}/><div><span>{totalHours.toFixed(1)} h</span><p>Horas Totales</p></div></div>
        {paymentType === 'hourly' && (<div className="pay-card extra"><TrendingUp size={20}/><div><span>{totalExtraHours.toFixed(1)} h</span><p>Horas Extras</p></div></div>)}
        <div className="pay-card"><Users size={20}/><div><span>{totalEmployees}</span><p>Empleados</p></div></div>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="pay-table-wrapper">
        <table className="pay-table">
          <thead><tr><th>Empleado</th><th>Horas</th><th>H. Extras</th><th>Días</th><th>{paymentType === 'hourly' ? 'Valor Hora' : 'Sueldo Diario'}</th><th>Total a Pagar</th><th>Acción</th></tr></thead>
          <tbody>
            {loading && !isAnyActionInProgress ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 40}}><div className="spinner"></div> Calculando nómina...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 40, color: '#888'}}>No hay datos. Selecciona fechas y genera nómina.</td></tr>
            ) : data.map((emp, idx) => (
              <tr key={emp.employee_id || idx}>
                <td>{emp.full_name}</td>
                <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                <td className={n(emp.extra_hours) > 0 ? 'extra-hours' : ''} style={{textAlign: 'center'}}>{n(emp.extra_hours).toFixed(2)}</td>
                <td style={{textAlign: 'center'}}>{n(emp.days_worked || daysInPeriod).toFixed(0)}</td>
                <td>{paymentType === 'hourly' ? `$${n(emp.hourly_rate).toFixed(2)}` : `$${n(emp.daily_rate).toFixed(2)}`}</td>
                <td style={{fontWeight: 700, color: '#10b981', textAlign: 'right'}}>${n(emp.total_pay).toFixed(2)}</td>
                <td><button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}><List size={14}/> Ver</button></td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (<tfoot><tr><td colSpan={5} style={{textAlign: 'right'}}><strong>TOTAL GENERAL</strong></td><td style={{fontWeight: 800, fontSize: 18, color: '#10b981', textAlign: 'right'}}><strong>${totalPayroll.toFixed(2)}</strong></td><td></td></tr></tfoot>)}
        </table>
      </div>

      <div className="pay-legend">
        <small>{paymentType === 'hourly' ? '📊 El pago se calcula multiplicando las horas trabajadas por el valor hora. Las horas extras se pagan al 150%.' : '💰 El pago es el sueldo fijo diario configurado en la base de datos.'}</small>
      </div>
    </PageTemplate>
  );
}