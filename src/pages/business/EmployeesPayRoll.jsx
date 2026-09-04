import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '../../context/SessionContext';
import PageTemplate from '../../components/PageTemplate';
import PayrollPrintModal from '../../components/PayrollPrintModal';
import Table from '../../components/General/Table';
import { IconTextButton, ButtonGroup } from '../../components/General/Button';
import CustomCombobox from '../../components/General/CustomCombobox';
import Modal from '../../components/General/Modal';
import { useConfirm } from '../../context/ConfirmContext';
import {
  RefreshCw, DollarSign, Clock, Archive, List, Users, TrendingUp, Eye, X,
} from 'react-feather';
import '../../styles/PayrollPro.css';

import { fetchWithAuth } from '../../config/api';
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
  const { user } = useSession(); // ✅ AGREGADO
  const { print, openCashDrawer, getPrinterConfig } = usePrinterService();
  const alert = useAlert();
  const { showConfirm } = useConfirm();
  
  // Estados para filtros y datos
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);

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
  const [paidPayrolls, setPaidPayrolls] = useState([]);
  const [showPaid, setShowPaid] = useState(false);
  const [isLoadingPaid, setIsLoadingPaid] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  // Refs para evitar llamadas duplicadas
  const lastGenerateTime = useRef(0);
  const lastSaveTime = useRef(0);
  const lastPayTime = useRef({});
  const processingIds = useRef(new Set());

  // ─── Estados para el filtro de fechas ──────────────────────────────────
  const [dateRange, setDateRange] = useState('all');
  const [selectedDays, setSelectedDays] = useState([]);
  const [availableDays, setAvailableDays] = useState([]);
  const [showDaySelector, setShowDaySelector] = useState(false);

  const n = v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };

  // ─── Opciones de fechas ──────────────────────────────────────────────
  const dateOptions = [
    { label: 'Hoy', value: 'day' },
    { label: 'Esta semana', value: 'week' },
    { label: 'Este mes', value: 'month' },
    { label: 'Personalizado', value: 'custom' }
  ];

  // Cargar configuración de la impresora
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
        // Silenciar error
      }
    };
    loadPrinterConfig();
  }, [getPrinterConfig]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const ecuadorDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
      const year = ecuadorDate.getFullYear();
      const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
      const day = String(ecuadorDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  };

  // ─── Función para obtener fecha actual en Ecuador ──────────────────────
  const getEcuadorDate = () => {
    const now = new Date();
    const ecuadorDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Guayaquil' }));
    const year = ecuadorDate.getFullYear();
    const month = String(ecuadorDate.getMonth() + 1).padStart(2, '0');
    const day = String(ecuadorDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const today = getEcuadorDate();
    setStart(today);
    setEnd(today);
  }, []);

  useEffect(() => {
    loadAvailableEmployees();
  }, []);

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

  // ─── Generar días disponibles para la semana o mes ────────────────────
  const generateAvailableDays = useCallback((rangeType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let days = [];
    let startDate, endDate;

    if (rangeType === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      startDate = new Date(weekStart);
      endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + 6);
    } else if (rangeType === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    if (startDate && endDate) {
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        if (current <= today) {
          days.push(dateStr);
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return days;
  }, []);

  // ─── Calcular rango de fechas según selección ──────────────────────────
  const getDateRange = useCallback(() => {
    if (dateRange === 'all') {
      return { startDate: null, endDate: null };
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate = null;
    let endDate = null;

    if (dateRange === 'day') {
      startDate = new Date(today);
      endDate = new Date(today);
    } else if (dateRange === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = day === 0 ? 6 : day - 1;
      weekStart.setDate(weekStart.getDate() - diff);
      startDate = new Date(weekStart);
      endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + 6);
    } else if (dateRange === 'month') {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }

    return { startDate, endDate };
  }, [dateRange]);

  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setSelectedDays([]);
    
    if (value === 'custom') {
      setStart('');
      setEnd('');
      setAvailableDays([]);
    } else if (value === 'day') {
      const { startDate } = getDateRange();
      if (startDate) {
        const dateStr = startDate.toISOString().split('T')[0];
        setStart(dateStr);
        setEnd(dateStr);
        setAvailableDays([]);
        setSelectedDays([dateStr]);
      }
    } else if (value === 'week' || value === 'month') {
      const days = generateAvailableDays(value);
      setAvailableDays(days);
      setSelectedDays([...days]);
      if (days.length > 0) {
        setStart(days[0]);
        setEnd(days[days.length - 1]);
      }
    }
  };

  // ─── Toggle para seleccionar/deseleccionar un día ──────────────────────
  const toggleDay = (day) => {
    if (selectedDays.includes(day)) {
      const newSelected = selectedDays.filter(d => d !== day);
      setSelectedDays(newSelected);
      if (newSelected.length > 0) {
        setStart(newSelected[0]);
        setEnd(newSelected[newSelected.length - 1]);
      } else {
        setStart('');
        setEnd('');
      }
    } else {
      const newSelected = [...selectedDays, day].sort();
      setSelectedDays(newSelected);
      setStart(newSelected[0]);
      setEnd(newSelected[newSelected.length - 1]);
    }
  };

  // ─── Seleccionar/Deseleccionar todos los días ──────────────────────────
  const toggleAllDays = () => {
    if (selectedDays.length === availableDays.length) {
      setSelectedDays([]);
      setStart('');
      setEnd('');
    } else {
      setSelectedDays([...availableDays]);
      if (availableDays.length > 0) {
        setStart(availableDays[0]);
        setEnd(availableDays[availableDays.length - 1]);
      }
    }
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${parseInt(parts[2])} ${meses[parseInt(parts[1]) - 1]}`;
  };

  const isDayInRange = (day) => {
    if (selectedDays.length === 0) return false;
    return selectedDays.includes(day);
  };

  async function loadAvailableEmployees() {
    if (loadingEmployees || loading) return;
    try {
      setLoadingEmployees(true);
      // ✅ SIN /api
      const res = await fetchWithAuth('/employees');
      const json = await res.json();
      setAvailableEmployees(Array.isArray(json) ? json : []);
    } catch (error) {
      setAvailableEmployees([]);
      await alert.error('Error al cargar empleados: ' + error.message);
    } finally {
      setLoadingEmployees(false);
    }
  }

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

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.size === availableEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(availableEmployees.map(emp => String(emp.id))));
    }
  };

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

      // ✅ SIN /api
      const res = await fetchWithAuth('/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({
          start,
          end: endDate,
          employee_ids: Array.from(selectedEmployees)
        })
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
      setIsGenerated(true);

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

  async function savePayroll() {
    if (isSaving || loading) return;

    const selectedData = data.filter(emp => selectedEmployees.has(String(emp.employee_id)));

    if (selectedData.length === 0) {
      await alert.warning('No hay Colaboradores/as seleccionados para guardar');
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

      // ✅ SIN /api
      const res = await fetchWithAuth('/payroll', {
        method: 'POST',
        body: JSON.stringify({
          rows: selectedData,
          start,
          end: endDate
        })
      });
      const result = await res.json();

      if (result.success) {
        await alert.success(
          `Nómina guardada correctamente para ${selectedData.length} colaborador(es)`,
          'Nómina Guardada'
        );
        const remainingData = data.filter(emp => !selectedEmployees.has(emp.employee_id));
        setData(remainingData);
        setSelectedEmployees(new Set());
        setIsGenerated(false);
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

  async function viewSavedPayroll() {
    if (isLoadingSaved) return;
    try {
      setIsLoadingSaved(true);
      // ✅ SIN /api
      const res = await fetchWithAuth('/payroll/all-saved');
      const json = await res.json();
      const processed = Array.isArray(json) ? json.map(payroll => ({
        ...payroll,
        start_date: formatDate(payroll.start_date),
        end_date: formatDate(payroll.end_date),
        total_amount: Number(payroll.total_amount) || 0,
        total_employees: Number(payroll.total_employees) || 0
      })) : [];
      setSavedPayrolls(processed);
      setShowSaved(true);
    } catch (error) {
      setSavedPayrolls([]);
      setShowSaved(true);
    } finally {
      setIsLoadingSaved(false);
    }
  }

  async function viewPaidPayrolls() {
    if (isLoadingPaid) return;
    try {
      setIsLoadingPaid(true);
      // ✅ SIN /api
      const res = await fetchWithAuth('/payroll/all-paid');
      const json = await res.json();
      const processed = Array.isArray(json) ? json.map(p => ({
        ...p,
        start_date: formatDate(p.start_date),
        end_date: formatDate(p.end_date),
        payment_date: formatDate(p.payment_date),
        total_amount: Number(p.total_amount) || 0,
        total_employees: Number(p.total_employees) || 0,
      })) : [];
      setPaidPayrolls(processed);
      setShowPaid(true);
    } catch {
      setPaidPayrolls([]);
      setShowPaid(true);
    } finally {
      setIsLoadingPaid(false);
    }
  }

  async function viewPayrollDetails(payrollGroup) {
    if (isLoadingDetails) return;
    try {
      setIsLoadingDetails(true);
      // ✅ SIN /api
      const res = await fetchWithAuth(`/payroll/saved-by-date?start_date=${payrollGroup.start_date}&end_date=${payrollGroup.end_date}`);
      const details = await res.json();
      setSelectedPayrollDetails({
        ...payrollGroup,
        employees: Array.isArray(details) ? details : []
      });
      setShowDetails(true);
    } catch (error) {
      await alert.error('Error cargando detalle de nómina');
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function handleShowPrintModal(emp) {
    try {
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

      // ✅ SIN /api
      const res = await fetchWithAuth(`/payroll/details/${emp.payroll_id}`);
      const details = await res.json();
      setToPrintPayroll(employeeData);
      setToPrintDetails(Array.isArray(details) ? details : []);
      setShowPrint(true);
    } catch (error) {
      await alert.error('Error cargando detalle de nómina');
    }
  }

  const handlePayClick = (emp) => {
    setSelectedEmployee(emp);
    setPaymentMethod('cash');
    setShowPaymentMethodModal(true);
  };

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

      const confirmed = await showConfirm({
        title: 'Confirmar Pago',
        message: `¿Registrar pago de $${n(emp.total_pay).toFixed(2)} para ${emp.full_name}?`,
        confirmText: 'Confirmar Pago',
        cancelText: 'Cancelar',
        danger: false,
      });

      if (!confirmed) {
        setSelectedEmployee(null);
        setIsPaying(false);
        setLoading(false);
        processingIds.current.delete(processingKey);
        return;
      }

      // ✅ SIN /api
      const payRes = await fetchWithAuth('/payroll/pay', {
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

      if (paymentMethod === 'cash') {
        await openCashDrawer().catch(() => {});
      }

      await alert.success(`Pago registrado correctamente para ${emp.full_name} (${paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'})`);

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

  const totalPayroll = data.reduce((acc, e) => acc + n(e.total_pay), 0);
  const totalHours = data.reduce((acc, e) => acc + n(e.total_hours), 0);
  const totalExtraHours = data.reduce((acc, e) => acc + n(e.extra_hours), 0);
  const totalEmployees = data.length;

  const daysInPeriod = getDaysWorked();
  const periodText = end && end !== start ? `${start} al ${end} (${daysInPeriod} días)` : `${start} (1 día)`;

  const isAnyActionInProgress = isGenerating || isSaving || isPaying || isLoadingSaved || isLoadingDetails || loadingEmployees;

  // ─── Columnas para la tabla ──────────────────────────────────────────────
  const columns = [
    {
      accessor: 'full_name',
      label: 'EMPLEADO',
      render: (item) => <span className="font-medium">{item.full_name}</span>
    },
    {
      accessor: 'total_hours',
      label: 'HORAS',
      render: (item) => <span className="text-center">{n(item.total_hours).toFixed(2)}</span>
    },
    {
      accessor: 'extra_hours',
      label: 'H. EXTRAS',
      render: (item) => (
        <span className={`text-center ${n(item.extra_hours) > 0 ? 'extra-hours' : ''}`}>
          {n(item.extra_hours).toFixed(2)}
        </span>
      )
    },
    {
      accessor: 'days_worked',
      label: 'DÍAS',
      render: (item) => <span className="text-center">{n(item.days_worked || daysInPeriod).toFixed(0)}</span>
    },
    {
      accessor: 'rate',
      label: 'VALOR / TIPO',
      render: (item) => {
        const empPaymentType = item.emp_payment_type || 'hourly';
        
        if (empPaymentType === 'daily') {
          return (
            <span className="text-center">
              <span>
                ${n(item.daily_rate || (item.total_pay / (item.days_worked || 1))).toFixed(2)}/día
              </span>
            </span>
          );
        } else {
          return (
            <span className="text-center">
              <span>
                ${n(item.hourly_rate || (item.total_pay / (item.total_hours || 1))).toFixed(2)}/h
              </span>
            </span>
          );
        }
      }
    },
    {
      accessor: 'total_pay',
      label: 'TOTAL A PAGAR',
      render: (item) => (
        <span>${n(item.total_pay).toFixed(2)}</span>
      )
    }
  ];

  // Render de fila con acciones
  const renderRow = (item) => (
    <tr key={item.employee_id}>
      {columns.map((col, idx) => (
        <td key={idx} className="table-cell" data-label={col.label}>
          {col.render ? col.render(item) : item[col.accessor]}
        </td>
      ))}
      <td className="table-cell table-actions-cell">
        <ButtonGroup>
          <IconTextButton
            variant="blue"
            size="sm"
            inline={true}
            icon={<List size={12} />}
            onClick={() => handleShowPrintModal(item)}
            title="Ver/Imprimir recibo"
          >
            Ver
          </IconTextButton>
        </ButtonGroup>
      </td>
    </tr>
  );

  // ─── Toolbar de la tabla ──────────────────────────────────────────────────
  const toolbar = (
    <div className="users-toolbar">
      <div style={{ minWidth: '130px', maxWidth: '150px'  }}>
        <CustomCombobox
          options={dateOptions}
          value={dateRange}
          onChange={handleDateRangeChange}
          placeholder="Seleccionar período"
          size="sm"
          filterable={false}
        />
        
        {dateRange === 'custom' && (
          <div className="payroll-date-range">
            <input 
              type="date" 
              className="payroll-date-input"
              value={start} 
              onChange={e => handleStartChange(e.target.value)} 
              disabled={isAnyActionInProgress}
            />
            <span className="payroll-date-separator">→</span>
            <input 
              type="date" 
              className="payroll-date-input"
              value={end} 
              onChange={e => setEnd(e.target.value)} 
              placeholder="Opcional" 
              disabled={isAnyActionInProgress}
            />
          </div>
        )}

        {(dateRange === 'week' || dateRange === 'month') && availableDays.length > 0 && (
          <button
            className="payroll-open-days-selector-btn"
            onClick={() => setShowDaySelector(true)}
            disabled={isAnyActionInProgress}
          >
            {selectedDays.length > 0 
              ? `${selectedDays.length} día${selectedDays.length > 1 ? 's' : ''} seleccionado${selectedDays.length > 1 ? 's' : ''}`
              : 'Seleccionar días'}
          </button>
        )}
      </div>
      <ButtonGroup>
        {!isGenerated ? (
          <IconTextButton
            variant="primary"
            size="md"
            icon={<RefreshCw size={14} />}
            onClick={generate}
            disabled={isAnyActionInProgress || loading || isGenerating || selectedEmployees.size === 0 || selectedDays.length === 0}
            loading={isGenerating}
          >
            {isGenerating ? 'Generando...' : 'Generar'}
          </IconTextButton>
        ) : (
          <IconTextButton
            variant="success"
            size="md"
            icon={<DollarSign size={14} />}
            onClick={savePayroll}
            disabled={isAnyActionInProgress || loading || isSaving || selectedEmployees.size === 0 || data.length === 0}
            loading={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </IconTextButton>
        )}
        <IconTextButton
          variant="warning"
          size="md"
          icon={<Archive size={18} />}
          onClick={viewSavedPayroll}
          disabled={isAnyActionInProgress || loading || isLoadingSaved}
          loading={isLoadingSaved}
        >
          {isLoadingSaved ? 'Cargando...' : 'Ver Nóminas'}
        </IconTextButton>
      </ButtonGroup>
    </div>
  );

  // ─── Header Actions ─────────────────────────────────────────────────────
  const refreshButton = (
    <button
      onClick={loadAvailableEmployees}
      className="dashboard-refresh-btn-header"
      disabled={loadingEmployees || isAnyActionInProgress}
      title="Actualizar empleados"
    >
      <RefreshCw size={18} className={loadingEmployees ? 'spinning' : ''} />
      <span>{loadingEmployees ? 'Cargando...' : 'Actualizar'}</span>
    </button>
  );

  const headerActions = (
    <div className="payroll-header-actions">
      <ButtonGroup>
        {refreshButton}
      </ButtonGroup>
    </div>
  );

  const [itemsPerPage, setItemsPerPage] = useState(10);

  return (
    <PageTemplate
      title="NÓMINA DE COLABORADORES/AS"
      subtitle={periodText}
      loading={loading || isAnyActionInProgress}
      headerAction={headerActions}
    >
      {/* ─── MODAL SELECTOR DE DÍAS ─── */}
      <Modal
        closeOnOverlayClick={false}
        isOpen={showDaySelector}
        onClose={() => setShowDaySelector(false)}
        title="Seleccionar días del período"
        size="xs"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <ButtonGroup>
              <IconTextButton
                variant=""
                size="md"
                onClick={() => setShowDaySelector(false)}
                >
                  Cancelar
              </IconTextButton>
              <IconTextButton
                variant="success"
                size="md"
                onClick={() => setShowDaySelector(false)}
                >
                  Aplicar a ({selectedDays.length} día{selectedDays.length > 1 ? 's' : ''})
              </IconTextButton>
              <IconTextButton
                variant="info"
                size="md"
                onClick={toggleAllDays}
                disabled={isAnyActionInProgress}
                >
                  {selectedDays.length === availableDays.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </IconTextButton>
            </ButtonGroup>
          </div>
        }
      >
        <div className="payroll-days-selector-modal">
          <div className="payroll-days-grid">
            {availableDays.map(day => {
              const isSelected = selectedDays.includes(day);
              const date = new Date(day + 'T00:00:00');
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              
              return (
                <button
                  key={day}
                  className={`payroll-day-btn-modal ${isSelected ? 'selected' : ''} ${isWeekend ? 'weekend' : ''}`}
                  onClick={() => toggleDay(day)}
                  disabled={isAnyActionInProgress}
                >
                  <span className="payroll-day-check">
                    {isSelected ? '✓' : ''}
                  </span>
                  <span className="payroll-day-number">{date.getDate()}</span>
                  <span className="payroll-day-name">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][date.getDay()]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="payroll-days-summary">
            {selectedDays.length > 0 ? (
              <span>
                {selectedDays.length} día{selectedDays.length > 1 ? 's' : ''} seleccionado{selectedDays.length > 1 ? 's' : ''}
                {' ('}{selectedDays[0]}{selectedDays.length > 1 ? ` → ${selectedDays[selectedDays.length - 1]}` : ''}{')'}
              </span>
            ) : (
              <span className="text-muted">No hay días seleccionados</span>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal de método de pago */}
      {showPaymentMethodModal && selectedEmployee && (
        <div className="pay-modal-backdrop pay-modal-z-high">
          <div className="pay-modal payment-method-modal">
            <div className="payment-method-header">
              <h3>Seleccionar Método de Pago</h3>
              <p>
                Colaborador/a: <strong>{selectedEmployee.full_name}</strong><br/>
                Monto: <strong className="text-success">${n(selectedEmployee.total_pay).toFixed(2)}</strong>
              </p>
            </div>
            <div className="payment-method-options">
              <button onClick={() => setPaymentMethod('cash')} className={`payment-method-btn ${paymentMethod === 'cash' ? 'active-cash' : ''}`}>
                Efectivo
              </button>
              <button onClick={() => setPaymentMethod('transfer')} className={`payment-method-btn ${paymentMethod === 'transfer' ? 'active-transfer' : ''}`}>
                Transferencia
              </button>
            </div>
            <div className="payment-method-actions">
              <button className="btn-cancelar" onClick={() => { setShowPaymentMethodModal(false); setSelectedEmployee(null); }}>
                Cancelar
              </button>
              <button className="btn-confirmar" onClick={confirmPay} disabled={isPaying}>
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
        paymentType="mixed"
        printerTicket={printerConfig}
      />

      {/* Selección de empleados */}
      <div className="employee-selection-section">
        <div className="employee-selection-header">
          <h3>Seleccionar Colaboradores/as ({selectedEmployees.size} de {availableEmployees.length})</h3>
          <button className="pay-btn-small select-all-btn" onClick={handleSelectAllEmployees} disabled={isAnyActionInProgress || loadingEmployees}>
            {selectedEmployees.size === availableEmployees.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
          </button>
        </div>
        <div className="employee-selection-container">
          {loadingEmployees ? (
            <div className="employee-selection-loading">
              <div className="spinner"></div> Cargando empleados...
            </div>
          ) : availableEmployees.length === 0 ? (
            <div className="employee-selection-empty">No hay empleados activos disponibles</div>
          ) : (
            availableEmployees.map(emp => (
              <div key={emp.id} className={`employee-card ${selectedEmployees.has(emp.id) ? 'selected' : ''}`} onClick={() => handleEmployeeSelection(emp.id)}>
                <input type="checkbox" checked={selectedEmployees.has(emp.id)} onChange={() => handleEmployeeSelection(emp.id)} />
                <div className="employee-card-info">
                  <div className="employee-name">{emp.full_name || emp.name}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
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
        <div className="pay-card extra">
          <TrendingUp size={20}/>
          <div>
            <span>{totalExtraHours.toFixed(1)} h</span>
            <p>Horas Extras</p>
          </div>
        </div>
        <div className="pay-card">
          <Users size={20}/>
          <div>
            <span>{totalEmployees}</span>
            <p>Colaboradores/as</p>
          </div>
        </div>
      </div>

      {/* Tabla principal usando el componente Table */}
      <Table
        data={data}
        columns={columns}
        keyField="employee_id"
        renderRow={renderRow}
        title="Resultado de Nómina"
        subtitle={`${data.length} ${data.length === 1 ? 'Colaborador/a' : 'Colaboradores/as'} procesados`}
        toolbar={toolbar}
        searchable={true}
        searchPlaceholder="Buscar Colaborador/a..."
        searchFields={['full_name']}
        pagination={true}
        itemsPerPage={itemsPerPage}
        itemsPerPageOptions={[10, 15]}
        onItemsPerPageChange={(newPerPage) => setItemsPerPage(newPerPage)}
        loading={loading}
        emptyMessage={loading ? 'Calculando nómina...' : 'No hay datos. Selecciona Colaborador/a, configura fechas y genera nómina.'}
        striped={true}
        hoverable={true}
        bordered={false}
        compact={false}
      />

      {/* MODAL DE NÓMINAS GUARDADAS */}
      {showSaved && (
        <div className="pay-modal-backdrop pay-modal-z-saved">
          <div className="pay-modal saved-payrolls-modal">
            <div className="pay-modal-header">
              <b>Nóminas por Pagar</b>
              <button className="pay-modal-close" onClick={() => setShowSaved(false)}>
                <X size={20} />
              </button>
            </div>
            {savedPayrolls.length === 0 ? (
              <div className="pay-modal-empty">
                <div className="empty-icon">✅</div>
                <div className="empty-title">Todo al día</div>
                <div className="empty-description">No hay nóminas pendientes de pago.</div>
                <div className="empty-actions">
                  <button className="pay-btn" onClick={() => setShowSaved(false)}>Cerrar</button>
                  <button className="pay-btn-paid" onClick={() => { setShowSaved(false); viewPaidPayrolls(); }} disabled={isLoadingPaid}>
                    {isLoadingPaid ? 'Cargando...' : '📂 Ver Nóminas Pagadas'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <table className="pay-table">
                  <thead>
                    <tr><th>Fecha</th><th>Período</th><th>Tipo</th><th>Colaboradores</th><th>Total</th><th>Acción</th></tr>
                  </thead>
                  <tbody>
                    {savedPayrolls.map((payroll, idx) => (
                      <tr key={idx}>
                        <td>{payroll.start_date}</td>
                        <td>{payroll.start_date === payroll.end_date ? payroll.start_date : `${payroll.start_date} → ${payroll.end_date}`}</td>
                        <td>{payroll.payment_type === 'hourly' ? '⏱️ Por Horas' : '📅 Pago Diario'}</td>
                        <td className="text-center">{payroll.total_employees}</td>
                        <td className="text-right text-success font-bold">${payroll.total_amount.toFixed(2)}</td>
                        <td>
                          <button className="pay-btn-small" onClick={() => viewPayrollDetails(payroll)} disabled={isLoadingDetails}>
                            <Eye size={14} /> {isLoadingDetails ? '...' : 'Ver Detalle'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right"><strong>TOTAL GENERAL</strong></td>
                      <td className="text-right text-success font-bold">
                        <strong>${savedPayrolls.reduce((acc, e) => acc + (e.total_amount || 0), 0).toFixed(2)}</strong>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                <div className="text-right">
                  <button className="pay-btn" onClick={() => setShowSaved(false)}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL NÓMINAS PAGADAS */}
      {showPaid && (
        <div className="pay-modal-backdrop pay-modal-z-paid">
          <div className="pay-modal paid-payrolls-modal">
            <div className="pay-modal-header">
              <b>Nóminas Pagadas</b>
              <button className="pay-modal-close" onClick={() => setShowPaid(false)}>
                <X size={20} />
              </button>
            </div>
            {paidPayrolls.length === 0 ? (
              <div className="pay-modal-empty">
                <div className="empty-icon">📭</div>
                <div className="empty-description">No hay nóminas pagadas aún.</div>
                <button className="pay-btn" onClick={() => setShowPaid(false)}>Cerrar</button>
              </div>
            ) : (
              <>
                <table className="pay-table">
                  <thead>
                    <tr><th>Fecha de Pago</th><th>Período</th><th>Tipo</th><th>Empleados</th><th>Total Pagado</th></tr>
                  </thead>
                  <tbody>
                    {paidPayrolls.map((p, idx) => (
                      <tr key={idx}>
                        <td className="text-success font-bold">{p.payment_date || '—'}</td>
                        <td>{p.start_date === p.end_date ? p.start_date : `${p.start_date} → ${p.end_date}`}</td>
                        <td>{p.payment_type === 'hourly' ? '⏱️ Por Horas' : '📅 Pago Diario'}</td>
                        <td className="text-center">{p.total_employees}</td>
                        <td className="text-right text-success font-bold">${p.total_amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="text-right"><strong>TOTAL</strong></td>
                      <td className="text-right text-success font-bold">
                        <strong>${paidPayrolls.reduce((acc, p) => acc + p.total_amount, 0).toFixed(2)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <div className="text-right">
                  <button className="pay-btn" onClick={() => setShowPaid(false)}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DETALLE DE NÓMINA */}
      {showDetails && selectedPayrollDetails && (
        <div className="pay-modal-backdrop pay-modal-z-details">
          <div className="pay-modal details-modal">
            <div className="pay-modal-header">
              <b>Detalle de Nómina - {selectedPayrollDetails.start_date}</b>
              <button className="pay-modal-close" onClick={() => setShowDetails(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="details-period-info">
              Período: {selectedPayrollDetails.start_date === selectedPayrollDetails.end_date 
                ? selectedPayrollDetails.start_date 
                : `${selectedPayrollDetails.start_date} al ${selectedPayrollDetails.end_date}`} - 
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
                    <td className="font-medium">{emp.full_name}</td>
                    {selectedPayrollDetails.payment_type === 'hourly' ? (
                      <>
                        <td className="text-center">
                          {n(emp.ordinary_hours || 0).toFixed(0)}h<br/>
                          <small className="text-muted">@${n(emp.hourly_rate).toFixed(2)}</small>
                        </td>
                        <td className="text-center bg-supplementary">
                          {n(emp.supplementary_hours || 0).toFixed(0)}h<br/>
                          <small className="text-muted">@${(n(emp.hourly_rate) * 1.5).toFixed(2)}</small>
                        </td>
                        <td className="text-center bg-extraordinary">
                          {n(emp.extraordinary_hours || 0).toFixed(0)}h<br/>
                          <small className="text-muted">@${(n(emp.hourly_rate) * 2.0).toFixed(2)}</small>
                        </td>
                        <td className="text-center bg-night">
                          {n(emp.night_hours || 0).toFixed(0)}h<br/>
                          <small className="text-muted">@${(n(emp.hourly_rate) * 1.25).toFixed(2)}</small>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-center">{n(emp.total_hours).toFixed(2)}</td>
                        <td className="text-center">{n(emp.days_worked || 1).toFixed(0)}</td>
                      </>
                    )}
                    <td className="text-right text-success font-bold">${n(emp.total_pay).toFixed(2)}</td>
                    <td className="text-center">
                      <button className="pay-btn-small" onClick={() => handlePayClick(emp)} disabled={isPaying}>💰 Pagar</button>
                    </td>
                    <td className="text-center">
                      <button className="pay-btn-small" onClick={() => handleShowPrintModal(emp)}>
                        <List size={14}/> Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={selectedPayrollDetails.payment_type === 'hourly' ? 5 : 3} className="text-right">
                    <strong>TOTAL GENERAL</strong>
                  </td>
                  <td className="text-right text-success font-bold">
                    <strong>${selectedPayrollDetails.employees.reduce((acc, e) => acc + n(e.total_pay || 0), 0).toFixed(2)}</strong>
                  </td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
            <div className="text-right">
              <button className="pay-btn" onClick={() => setShowDetails(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="pay-legend">
        <small>
          El tipo de pago (Por Horas o Diario) se define por cada colaborador en su perfil.
          {data.some(item => item.emp_payment_type === 'hourly') && 
            ' Horas: Ordinarias (0%) | Suplementarias (+50%) | Extraordinarias (+100%) | Nocturnas (+25%)'}
        </small>
      </div>
    </PageTemplate>
  );
}