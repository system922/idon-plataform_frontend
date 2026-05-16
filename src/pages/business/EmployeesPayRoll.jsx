import React, { useState, useEffect, useRef } from 'react';
import PageTemplate from '../../components/PageTemplate';
import PayrollPrintModal from '../../components/PayrollPrintModal';
import {
  RefreshCw, DollarSign, Clock, Archive, List, Users, TrendingUp, Eye
} from 'react-feather';
import '../../styles/PayrollPro.css';

import { fetchWithAuth } from '../../config/apiBase';
import { usePrinterService } from '../../services/usePrinterService';
import { useAlert } from '../../components/ConfirmContext';

function getBusinessInfo() {
  try {
    return JSON.parse(localStorage.getItem('selectedBusiness') || '{}');
  } catch {
    return {};
  }
}

export default function EmployeesPayRollPage() {

  const { print, openCashDrawer, getPrinterConfig } = usePrinterService();
  const alert = useAlert();
  
  // Estados para filtros y datos
  const [type, setType] = useState('monthly');
  const [paymentType, setPaymentType] = useState('hourly');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para selección de empleados
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [loadingEmployees, setLoadingEmployees] = useState(false);

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
  const n = v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };

  // Cargar configuración de la impresora desde el servicio
  useEffect(() => {
    const loadPrinterConfig = async () => {
      try {
        const config = await getPrinterConfig('printer_main');
        if (config && config.name) {
          setPrinterConfig({
            name: config.name,
            width: config.width || 32,
            footer: config.footer || null
          });
        }
      } catch (error) {

      }
    };
    loadPrinterConfig();
  }, [getPrinterConfig]);

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
   * Cargar empleados activos al montar el componente
   */
  useEffect(() => {
    loadAvailableEmployees();
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
   * Cargar empleados activos para selección
   */
  async function loadAvailableEmployees() {
    if (loadingEmployees || loading) return;

    try {
      setLoadingEmployees(true);
      const res = await fetchWithAuth('/api/employees');
      const json = await res.json();
      setAvailableEmployees(Array.isArray(json) ? json : []);
    } catch (error) {

      setAvailableEmployees([]);
      await alert.error('Error al cargar empleados: ' + error.message);
    } finally {
      setLoadingEmployees(false);
    }
  }

  /**
   * Manejar selección/deselección de empleados
   */
  const handleEmployeeSelection = (employeeId) => {
    const id = String(employeeId);
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEmployees(newSelected);
  };

  /**
   * Seleccionar/deseleccionar todos los empleados
   */
  const handleSelectAllEmployees = () => {
    if (selectedEmployees.size === availableEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(availableEmployees.map(emp => String(emp.id))));
    }
  };

  /**
   * Generar nómina (previsualización)
   */
  async function generate() {
    if (!start) {
      await alert.warning('Selecciona la fecha de inicio');
      return;
    }
    if (selectedEmployees.size === 0) {
      await alert.warning('Selecciona al menos un empleado');
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
          payment_type: paymentType,
          employee_ids: Array.from(selectedEmployees)
        })
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      
      if (json.length === 0) {
        await alert.warning('No se encontraron datos para los empleados seleccionados');
      }
    } catch (error) {

      setData([]);
      await alert.error('Error al generar nómina: ' + error.message);
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
    
    // Filtrar solo los empleados seleccionados
    const selectedData = data.filter(emp => selectedEmployees.has(String(emp.employee_id)));
    
    if (selectedData.length === 0) {
      await alert.warning('No hay empleados seleccionados para guardar');
      return;
    }
    
    const now = Date.now();
    if (now - lastSaveTime.current < 3000) {
      await alert.warning('Por favor espera unos segundos antes de guardar nuevamente');
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
          rows: selectedData, 
          start, 
          end: endDate, 
          type,
          payment_type: paymentType
        })
      });
      const result = await res.json();
      
      if (result.success) {
        await alert.success(`Nómina guardada correctamente para ${selectedData.length} empleado(s)`);
        
        // Remover los empleados guardados de la lista de datos
        const remainingData = data.filter(emp => !selectedEmployees.has(emp.employee_id));
        setData(remainingData);
        
        // Limpiar la selección
        setSelectedEmployees(new Set());
      } else {
        await alert.error(result.message || 'Error al guardar la nómina');
      }
    } catch (error) {

      await alert.error('Error al guardar la nómina: ' + error.message);
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
        await alert.info('No hay nóminas guardadas');
        setSavedPayrolls([]);
      }
    } catch (error) {

      setSavedPayrolls([]);
      await alert.error("Error consultando nómina guardada");
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

      await alert.error('Error cargando detalle de nómina');
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
      // Asegurar que los datos del empleado tengan todos los campos necesarios
      const employeeData = {
        payroll_id: emp.payroll_id,
        employee_id: emp.employee_id,
        full_name: emp.full_name || emp.name || "N/A",
        total_hours: emp.total_hours || 0,
        extra_hours: emp.extra_hours || 0,
        days_worked: emp.days_worked || emp.total_days || 1,
        hourly_rate: emp.hourly_rate || 0,
        daily_rate: emp.daily_rate || 0,
        total_pay: emp.total_pay || 0
      };
      
      const res = await fetchWithAuth(`/api/payroll/details/${emp.payroll_id}`);
      const details = await res.json();
      setToPrintPayroll(employeeData);
      setToPrintDetails(Array.isArray(details) ? details : []);
      setShowPrint(true);
    } catch (error) {

      await alert.error('Error cargando detalle de nómina');
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
    await alert.warning('Por favor espera, ya se está procesando un pago');
    return;
  }
  
  const processingKey = `${emp.payroll_id}`;
  if (processingIds.current.has(processingKey)) return;
  
  const now = Date.now();
  const lastPayForKey = lastPayTime.current[processingKey];
  if (lastPayForKey && (now - lastPayForKey) < 5000) {
    await alert.warning('Por favor espera unos segundos antes de pagar nuevamente');
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
      await alert.error('No se encontró información del usuario. Inicia sesión nuevamente.');
      return;
    }
    
    // ========= NUEVO CÓDIGOS PARA REGISTRAR PAGO EN BACKEND ==========    
    const payRes = await fetchWithAuth('/api/payroll/pay', {
      method: 'POST',
      body: JSON.stringify({
        payroll_id: emp.payroll_id,
        employee_id: emp.employee_id,
        employee_name: emp.full_name,
        amount: n(emp.total_pay),
        payment_method: paymentMethod,
        user_id: operador.id
      })
    });

    if (!payRes.ok) {
      const errorData = await payRes.json();
      throw new Error(errorData.error || 'Error registrando pago');
    }

    // Abrir cajón si es efectivo
    if (paymentMethod === 'cash') {
      await openCashDrawer().catch(() => {});
    }

    await alert.success(`Pago registrado correctamente para ${emp.full_name} (${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'})`);
    // ========== FIN DEL NUEVO CÓDIGO ==========
    
    // Actualizar el estado local si el modal de detalles está abierto
    if (selectedPayrollDetails) {
      const updatedEmployees = selectedPayrollDetails.employees.filter(e => e.payroll_id !== emp.payroll_id);
      setSelectedPayrollDetails({
        ...selectedPayrollDetails,
        employees: updatedEmployees,
        total_amount: updatedEmployees.reduce((acc, e) => acc + n(e.total_pay), 0)
      });
    }
    
  } catch (error) {

    await alert.error('Error registrando pago: ' + error.message);
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

  const isAnyActionInProgress = isGenerating || isSaving || isPaying || isLoadingSaved || isLoadingDetails || loadingEmployees;

  const headerAction = (
    <div className="pay-toolbar">
      <button className="pay-btn" onClick={generate} disabled={isAnyActionInProgress || loading || isGenerating || selectedEmployees.size === 0}>
        <RefreshCw size={14}/> {isGenerating ? 'Generando...' : 'Generar'}
      </button>
      <button className="pay-btn-print" onClick={savePayroll} disabled={isAnyActionInProgress || loading || isSaving || selectedEmployees.size === 0 || data.length === 0}>
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
      <button 
        className="pay-btn" 
        style={{background:'#e3f2fd',color:'#1976d2'}} 
        onClick={loadAvailableEmployees}
        disabled={isAnyActionInProgress || loading || loadingEmployees}
      >
        <Users size={14}/> {loadingEmployees ? 'Cargando...' : 'Recargar Empleados'}
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
                Monto: <strong style={{ color: '#10b981' }}>${n(selectedEmployee.total_pay).toFixed(2)}</strong>
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 24, justifyContent: 'center' }}>
              <button
                onClick={() => setPaymentMethod('cash')}
                className="payment-method-btn"
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
                className="payment-method-btn"
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
      <PayrollPrintModal
        open={showPrint}
        onClose={() => setShowPrint(false)}
        payroll={toPrintPayroll}
        details={toPrintDetails}
        start={start}
        end={end || start}
        business={getBusinessInfo()}
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
                <td style={{fontWeight: 800, color: '#10b981', textAlign: 'right'}}><strong>${savedPayrolls.reduce((acc, e) => acc + (e.total_amount || 0), 0).toFixed(2)}</strong></td>
                <td></td>
              </tr>
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
              <thead>
                <tr>
                  <th>Colaborador/a</th>
                  {selectedPayrollDetails.payment_type === 'hourly' ? (
                    <>
                      <th>Ordinarias</th>
                      <th>Suplementarias<br/><small>+50%</small></th>
                      <th>Extraordinarias<br/><small>+100%</small></th>
                      <th>Nocturnas<br/><small>+25%</small></th>
                    </>
                  ) : (
                    <>
                      <th>Horas</th>
                      <th>Días</th>
                    </>
                  )}
                  <th>Total a Pagar</th>
                  <th>Pagar</th>
                  <th>Imprimir</th>
                </tr>
              </thead>
              <tbody>
                {selectedPayrollDetails.employees.map(emp => (
                  <tr key={emp.payroll_id}>
                    <td style={{fontWeight: 500}}>{emp.full_name}</td>
                    {selectedPayrollDetails.payment_type === 'hourly' ? (
                      <>
                        <td style={{textAlign: 'center'}}>
                          {n(emp.ordinary_hours || 0).toFixed(0)}h<br/>
                          <small style={{color: '#666'}}>@${n(emp.hourly_rate).toFixed(2)}</small>
                        </td>
                        <td style={{textAlign: 'center', backgroundColor: '#fef3c7'}}>
                          {n(emp.supplementary_hours || 0).toFixed(0)}h<br/>
                          <small style={{color: '#666'}}>@${(n(emp.hourly_rate) * 1.5).toFixed(2)}</small>
                        </td>
                        <td style={{textAlign: 'center', backgroundColor: '#fecaca'}}>
                          {n(emp.extraordinary_hours || 0).toFixed(0)}h<br/>
                          <small style={{color: '#666'}}>@${(n(emp.hourly_rate) * 2.0).toFixed(2)}</small>
                        </td>
                        <td style={{textAlign: 'center', backgroundColor: '#bfdbfe'}}>
                          {n(emp.night_hours || 0).toFixed(0)}h<br/>
                          <small style={{color: '#666'}}>@${(n(emp.hourly_rate) * 1.25).toFixed(2)}</small>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                        <td style={{textAlign: 'center'}}>{n(emp.days_worked || 1).toFixed(0)}</td>
                      </>
                    )}
                    <td style={{fontWeight: 600, color: '#10b981', textAlign: 'right'}}>${n(emp.total_pay).toFixed(2)}</td>
                    <td style={{textAlign: 'center'}}>
                      <button className="pay-btn-small" onClick={() => handlePayClick(emp)} disabled={isPaying}>💰 Pagar</button>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}><List size={14}/> Imprimir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={selectedPayrollDetails.payment_type === 'hourly' ? 5 : 3} style={{textAlign: 'right'}}><strong>TOTAL GENERAL</strong></td>
                  <td style={{fontWeight: 800, color: '#10b981', textAlign: 'right'}}><strong>${selectedPayrollDetails.employees.reduce((acc, e) => acc + n(e.total_pay || 0), 0).toFixed(2)}</strong></td>
                  <td></td>
                  <td></td>
                </tr>
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

      {/* SELECCIÓN DE EMPLEADOS */}
      <div className="employee-selection-section" style={{marginBottom: 20}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
          <h3 style={{color: '#10b981', margin: 0}}>👥 Seleccionar Empleados ({selectedEmployees.size} de {availableEmployees.length})</h3>
          <button 
            className="pay-btn-small" 
            onClick={handleSelectAllEmployees}
            disabled={isAnyActionInProgress || loadingEmployees}
            style={{background: selectedEmployees.size === availableEmployees.length ? '#10b981' : '#f0f0f0', color: selectedEmployees.size === availableEmployees.length ? 'white' : '#333'}}
          >
            {selectedEmployees.size === availableEmployees.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
          </button>
        </div>
        
        <div className="employee-selection-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 10,
          maxHeight: 300,
          overflowY: 'auto',
          padding: 10,
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          background: '#fafafa'
        }}>
          {loadingEmployees ? (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: 40}}>
              <div className="spinner"></div> Cargando empleados...
            </div>
          ) : availableEmployees.length === 0 ? (
            <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: '#888'}}>
              No hay empleados activos disponibles
            </div>
          ) : (
            availableEmployees.map(emp => (
              <div 
                key={emp.id} 
                className="employee-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: 12,
                  border: selectedEmployees.has(emp.id) ? '2px solid #10b981' : '1px solid #ddd',
                  borderRadius: 8,
                  background: selectedEmployees.has(emp.id) ? 'rgba(16, 185, 129, 0.1)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleEmployeeSelection(emp.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.has(emp.id)}
                  onChange={() => handleEmployeeSelection(emp.id)}
                  style={{marginRight: 10, transform: 'scale(1.2)'}}
                />
                <div style={{flex: 1}}>
                  <div style={{fontWeight: 600, color: '#333'}}>{emp.full_name || emp.name}</div>
                  <div style={{fontSize: 12, color: '#666'}}>
                    {paymentType === 'hourly' ? `$${n(emp.hourly_rate).toFixed(2)}/hora` : `$${n(emp.daily_rate).toFixed(2)}/día`}
                  </div>
                </div>
              </div>
            ))
          )}
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
          <thead>
            <tr><th>Empleado</th><th>Horas</th><th>H. Extras</th><th>Días</th>
            <th>{paymentType === 'hourly' ? 'Valor Hora' : 'Sueldo Diario'}</th>
            <th>Total a Pagar</th><th>Acción</th>
          </tr>
          </thead>
          <tbody>
            {loading && !isAnyActionInProgress ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 40}}><div className="spinner"></div> Calculando nómina...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign: 'center', padding: 40, color: '#888'}}>
                No hay datos. Selecciona empleados, configura fechas y genera nómina.
              </td></tr>
            ) : (
              data.map((emp, idx) => (
                <tr key={emp.employee_id || idx}>
                  <td style={{fontWeight: 500}}>{emp.full_name}</td>
                  <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                  <td className={n(emp.extra_hours) > 0 ? 'extra-hours' : ''} style={{textAlign: 'center'}}>{n(emp.extra_hours).toFixed(2)}</td>
                  <td style={{textAlign: 'center'}}>{n(emp.days_worked || daysInPeriod).toFixed(0)}</td>
                  <td style={{textAlign: 'center'}}>
                    {paymentType === 'hourly' ? `$${n(emp.hourly_rate).toFixed(2)}` : `$${n(emp.daily_rate).toFixed(2)}`}
                  </td>
                  <td style={{fontWeight: 700, color: '#10b981', textAlign: 'right'}}>${n(emp.total_pay).toFixed(2)}</td>
                  <td style={{textAlign: 'center'}}>
                    <button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}><List size={14}/> Ver</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr><td colSpan={5} style={{textAlign: 'right'}}><strong>TOTAL GENERAL</strong></td>
              <td style={{fontWeight: 800, fontSize: 18, color: '#10b981', textAlign: 'right'}}><strong>${totalPayroll.toFixed(2)}</strong></td>
              <td></td>
            </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="pay-legend">
        <small>
          {paymentType === 'hourly' 
            ? '📊 Ley de Ecuador: Ordinarias ($2.01/h) | Suplementarias ($3.01/h +50%) | Extraordinarias ($4.02/h +100%) | Nocturnas ($2.51/h +25%)'
            : '💰 El pago es el sueldo fijo diario configurado en la base de datos.'}
        </small>
      </div>
    </PageTemplate>
  );
}