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
  const [type, setType] = useState('monthly'); // weekly, biweekly, monthly
  const [paymentType, setPaymentType] = useState('hourly'); // hourly, daily
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]); // Datos de nómina generada
  const [loading, setLoading] = useState(false);

  // Estados para nóminas guardadas
  const [savedPayrolls, setSavedPayrolls] = useState([]); // Lista de nóminas agrupadas por fecha
  const [showSaved, setShowSaved] = useState(false);
  const [selectedPayrollDetails, setSelectedPayrollDetails] = useState(null); // Detalle de nómina seleccionada
  const [showDetails, setShowDetails] = useState(false);
  
  // Estados para impresión
  const [showPrint, setShowPrint] = useState(false);
  const [toPrintPayroll, setToPrintPayroll] = useState(null);
  const [toPrintDetails, setToPrintDetails] = useState([]);

  // Estados para control de acciones (evitar repeticiones)
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Refs para evitar llamadas duplicadas
  const lastGenerateTime = useRef(0);
  const lastSaveTime = useRef(0);
  const lastPayTime = useRef({});
  const processingIds = useRef(new Set());

  // Función auxiliar para convertir a número
  const n = v => Number(v || 0);

  /**
   * Función para formatear fechas correctamente a YYYY-MM-DD
   * @param {string} dateString - Fecha en formato ISO o string
   * @returns {string} Fecha formateada como YYYY-MM-DD
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Ajustar a la zona horaria de Ecuador
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
   * Obtener fecha actual de Ecuador al cargar el componente
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

  /**
   * Manejar cambio de fecha de inicio, asegurando que la fecha final sea >= inicio
   */
  const handleStartChange = (newStart) => {
    setStart(newStart);
    if (!end || new Date(end) < new Date(newStart)) {
      setEnd(newStart);
    }
  };

  /**
   * Generar nómina (previsualización) para el período seleccionado
   * Con control de repeticiones
   */
  async function generate() {
    if (!start) {
      alert('Selecciona la fecha de inicio');
      return;
    }
    
    if (isGenerating || loading) return;
    
    // Control de tiempo (evitar múltiples clics en menos de 2 segundos)
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
   * Guardar la nómina generada en la base de datos
   * Con control de repeticiones
   */
  async function savePayroll() {
    if (isSaving || loading) return;
    
    if (data.length === 0) {
      alert('Primero genera la nómina');
      return;
    }
    
    // Control de tiempo (evitar múltiples clics en menos de 3 segundos)
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
   * Ver todas las nóminas guardadas (agrupadas por fecha)
   * Con control de repeticiones
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
   * @param {object} payrollGroup - Grupo de nómina a consultar
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
   * Mostrar modal de impresión para un empleado específico
   * @param {object} emp - Empleado con datos de nómina
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
   * Registrar pago de nómina para un empleado
   * @param {object} emp - Empleado con datos de nómina
   */
  async function handlePay(emp) {
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
    
    const confirmPay = window.confirm(`¿Estás seguro de que deseas registrar el pago de $${emp.total_pay.toFixed(2)} para ${emp.full_name}?`);
    if (!confirmPay) return;
    
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
      
      // 1. Registrar auditoría
      const auditRes = await fetchWithAuth('/api/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          user_id: operador.id,
          table_name: 'expenses',
          action: 'payroll_payment',
          description: `Pago de nómina a ${emp.full_name} por $${emp.total_pay.toFixed(2)}`,
          new_values: { 
            amount: emp.total_pay, 
            employee_id: emp.employee_id, 
            payroll_id: emp.payroll_id 
          },
          reason: '',
        }),
      });
      
      if (!auditRes.ok) {
        const errorData = await auditRes.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error registrando auditoría');
      }
      
      // 2. Registrar gasto
      const expensePayload = {
        amount: emp.total_pay,
        description: `Pago de nómina a ${emp.full_name}`,
        reference: `Payroll ID: ${emp.payroll_id}`,
        category_id: '4f8e09d1-4adc-479d-89d7-a7575af7d54b',
        created_by: operador.id,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Guayaquil' })
      };
      
      const expenseRes = await fetchWithAuth('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expensePayload),
      });
      
      if (!expenseRes.ok) {
        const errorData = await expenseRes.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Error registrando gasto');
      }
      
      // 3. Abrir cajón después del pago
      await openCashDrawer().catch(() => {});
      
      alert(`✅ Pago registrado correctamente para ${emp.full_name}`);
      
      // 4. Actualizar el estado para reflejar que se pagó
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
    }
  }

  // Calcular totales para la nómina actual
  const totalPayroll = data.reduce((acc, e) => acc + n(e.total_pay), 0);
  const totalHours = data.reduce((acc, e) => acc + n(e.total_hours), 0);
  const totalExtraHours = data.reduce((acc, e) => acc + n(e.extra_hours), 0);
  const totalEmployees = data.length;
  
  const daysInPeriod = getDaysWorked();
  const periodText = end && end !== start ? `${start} al ${end} (${daysInPeriod} días)` : `${start} (1 día)`;

  // Determinar si alguna acción está en progreso
  const isAnyActionInProgress = isGenerating || isSaving || isPaying || isLoadingSaved || isLoadingDetails;

  // Botones de acción en el header
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

      {/* Modal de impresión - z-index alto para que se muestre por encima */}
      <PayrollPrintModalQZ
        open={showPrint}
        onClose={() => setShowPrint(false)}
        payroll={toPrintPayroll}
        details={toPrintDetails}
        start={start}
        end={end || start}
        business={businessInfo}
        paymentType={paymentType}
        style={{ zIndex: 10000 }}
      />

      {/* MODAL DE NÓMINAS GUARDADAS - VISTA RESUMEN POR FECHA */}
      {showSaved && (
        <div className="pay-modal-backdrop" style={{ zIndex: 2000 }}>
          <div className="pay-modal" style={{minWidth: 700, maxWidth: '90%'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10}}>
              <b>📋 Nóminas Guardadas</b>
              <button onClick={() => setShowSaved(false)} style={{fontSize: 22, background: 'none', border: 'none', cursor: 'pointer'}}>&times;</button>
            </div>
            
            <table className="pay-table" style={{margin:"10px 0"}}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Período</th>
                  <th>Tipo de Pago</th>
                  <th>Colaboradores</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {savedPayrolls.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{textAlign: 'center', padding: 40, color: '#888'}}>
                      No hay nóminas guardadas
                    </td>
                  </tr>
                ) : (
                  savedPayrolls.map((payroll, idx) => (
                    <tr key={idx}>
                      <td style={{fontWeight: 500}}>
                        {payroll.start_date}
                      </td>
                      <td>
                        {payroll.start_date === payroll.end_date 
                          ? payroll.start_date 
                          : `${payroll.start_date} → ${payroll.end_date}`}
                      </td>
                      <td>
                        {payroll.payment_type === 'hourly' ? '⏱️ Por Horas' : '📅 Pago Diario'}
                      </td>
                      <td style={{textAlign: 'center'}}>{payroll.total_employees}</td>
                      <td style={{fontWeight: 600, color: '#10b981', textAlign: 'right'}}>
                        ${payroll.total_amount.toFixed(2)}
                      </td>
                      <td style={{textAlign: 'center'}}>
                        <button 
                          className="pay-btn-small" 
                          onClick={() => viewPayrollDetails(payroll)}
                          disabled={isLoadingDetails || loading}
                        >
                          <Eye size={14}/> {isLoadingDetails ? 'Cargando...' : 'Ver Detalle'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{textAlign: 'right'}}>
                    <strong>TOTAL GENERAL</strong>
                  </td>
                  <td style={{fontWeight: 800, fontSize: 16, color: '#10b981', textAlign: 'right'}}>
                    <strong>${savedPayrolls.reduce((acc, e) => acc + (e.total_amount || 0), 0).toFixed(2)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div style={{textAlign:'right', marginTop: 16}}>
              <button className="pay-btn" onClick={() => setShowSaved(false)}>Cerrar</button>
            </div>
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
              Período: {selectedPayrollDetails.start_date === selectedPayrollDetails.end_date 
                ? selectedPayrollDetails.start_date 
                : `${selectedPayrollDetails.start_date} al ${selectedPayrollDetails.end_date}`} - 
              Tipo: {selectedPayrollDetails.payment_type === 'hourly' ? 'Pago por Horas' : 'Pago Diario'}
            </div>
            
            <table className="pay-table" style={{margin:"10px 0"}}>
              <thead>
                <tr>
                  <th>Colaborador/a</th>
                  <th>Horas</th>
                  <th>Horas Extras</th>
                  <th>Días</th>
                  {selectedPayrollDetails.payment_type === 'hourly' ? <th>Valor Hora</th> : <th>Sueldo Diario</th>}
                  <th>Total a Pagar</th>
                  <th>Pagar</th>
                  <th>Imprimir</th>
                </tr>
              </thead>
              <tbody>
                {selectedPayrollDetails.employees.map(emp => (
                  <tr key={emp.payroll_id}>
                    <td style={{fontWeight: 500}}>{emp.full_name}</td>
                    <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                    <td style={{color: n(emp.extra_hours) > 0 ? '#fbbf24' : '#666', textAlign: 'center'}}>
                      {n(emp.extra_hours).toFixed(2)}
                    </td>
                    <td style={{textAlign: 'center'}}>{n(emp.days_worked || emp.total_days || 1).toFixed(0)}</td>
                    <td style={{textAlign: 'center'}}>
                      {selectedPayrollDetails.payment_type === 'hourly' 
                        ? `$${n(emp.hourly_rate).toFixed(2)}`
                        : `$${n(emp.daily_rate).toFixed(2)}`}
                    </td>
                    <td style={{fontWeight: 600, color: '#10b981', textAlign: 'right'}}>
                      ${n(emp.total_pay).toFixed(2)}
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button 
                        className="pay-btn-small" 
                        onClick={() => handlePay(emp)} 
                        disabled={isPaying || loading}
                      >
                        💰 {isPaying ? 'Procesando...' : 'Pagar'}
                      </button>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}>
                        <List size={14}/> Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{textAlign: 'right'}}>
                    <strong>TOTAL GENERAL</strong>
                  </td>
                  <td style={{fontWeight: 800, fontSize: 16, color: '#10b981', textAlign: 'right'}}>
                    <strong>${selectedPayrollDetails.employees.reduce((acc, e) => acc + n(e.total_pay || 0), 0).toFixed(2)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div style={{textAlign:'right', marginTop: 16}}>
              <button className="pay-btn" onClick={() => setShowDetails(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS DE BÚSQUEDA - Deshabilitados durante acciones */}
      <div className="pay-filters">
        <select 
          className="payment-type-select"
          value={paymentType} 
          onChange={e => setPaymentType(e.target.value)}
          disabled={isAnyActionInProgress}
        >
          <option value="hourly">⏱️ Pago por Horas</option>
          <option value="daily">📅 Pago Diario (Sueldo Fijo)</option>
        </select>
        
        <select value={type} onChange={e => setType(e.target.value)} disabled={isAnyActionInProgress}>
          <option value="weekly">📅 Semanal</option>
          <option value="biweekly">📅 Quincenal</option>
          <option value="monthly">📅 Mensual</option>
        </select>
        
        <div className="date-range">
          <input 
            type="date" 
            value={start} 
            onChange={e => handleStartChange(e.target.value)} 
            className="date-input"
            disabled={isAnyActionInProgress}
          />
          <span className="date-separator">→</span>
          <input 
            type="date" 
            value={end} 
            onChange={e => setEnd(e.target.value)} 
            className="date-input"
            placeholder="Opcional"
            disabled={isAnyActionInProgress}
          />
        </div>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="pay-stats">
        <div className="pay-card">
          <DollarSign size={20}/>
          <div>
            <span>${totalPayroll.toFixed(2)}</span>
            <p>Total Nómina</p>
          </div>
        </div>
        
        <div className="pay-card">
          <Clock size={20}/>
          <div>
            <span>{totalHours.toFixed(1)} h</span>
            <p>Horas Totales</p>
          </div>
        </div>
        
        {paymentType === 'hourly' && (
          <div className="pay-card extra">
            <TrendingUp size={20}/>
            <div>
              <span>{totalExtraHours.toFixed(1)} h</span>
              <p>Horas Extras</p>
            </div>
          </div>
        )}
        
        <div className="pay-card">
          <Users size={20}/>
          <div>
            <span>{totalEmployees}</span>
            <p>Empleados</p>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE NÓMINA GENERADA */}
      <div className="pay-table-wrapper">
        <table className="pay-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Horas</th>
              <th>H. Extras</th>
              <th>Días</th>
              {paymentType === 'hourly' ? <th>Valor Hora</th> : <th>Sueldo Diario</th>}
              <th>Total a Pagar</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && !isAnyActionInProgress ? (
              <tr>
                <td colSpan={7} style={{textAlign: 'center', padding: 40}}>
                  <div className="spinner"></div>
                  Calculando nómina...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{textAlign: 'center', padding: 40, color: '#888'}}>
                  No hay datos. Selecciona fechas y genera nómina.
                </td>
              </tr>
            ) : data.map((emp, idx) => (
              <tr key={emp.employee_id || idx}>
                <td style={{fontWeight: 500}}>{emp.full_name}</td>
                <td style={{textAlign: 'center'}}>{n(emp.total_hours).toFixed(2)}</td>
                <td className={n(emp.extra_hours) > 0 ? 'extra-hours' : ''} style={{textAlign: 'center'}}>
                  {n(emp.extra_hours).toFixed(2)}
                </td>
                <td style={{textAlign: 'center'}}>{n(emp.days_worked || daysInPeriod).toFixed(0)}</td>
                <td style={{textAlign: 'center'}}>
                  {paymentType === 'hourly' 
                    ? `$${n(emp.hourly_rate).toFixed(2)}`
                    : `$${n(emp.daily_rate).toFixed(2)}`}
                </td>
                <td style={{fontWeight: 700, color: '#10b981', fontSize: 15, textAlign: 'right'}}>
                  ${n(emp.total_pay).toFixed(2)}
                </td>
                <td style={{textAlign: 'center'}}>
                  <button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}>
                    <List size={14}/> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {data.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{textAlign: 'right'}}>
                  <strong>TOTAL GENERAL</strong>
                </td>
                <td style={{fontWeight: 800, fontSize: 18, color: '#10b981', textAlign: 'right'}}>
                  <strong>${totalPayroll.toFixed(2)}</strong>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* LEYENDA INFORMATIVA */}
      <div className="pay-legend">
        <small>
          {paymentType === 'hourly' 
            ? '📊 El pago se calcula multiplicando las horas trabajadas por el valor hora. Las horas extras se pagan al 150%.'
            : '💰 El pago es el sueldo fijo diario configurado en la base de datos, independientemente de las horas trabajadas. Las horas se muestran solo como referencia.'}
        </small>
      </div>
    </PageTemplate>
  );
}