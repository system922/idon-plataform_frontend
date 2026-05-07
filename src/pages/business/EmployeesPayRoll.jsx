import React, { useState } from 'react';
import PageTemplate from '../../components/PageTemplate';
import PayrollPrintModalQZ from '../../components/PayrollPrintModal';
import {
  RefreshCw, DollarSign, Clock, Calendar, Archive, List
} from 'react-feather';
import '../../styles/PayrollPro.css';

import { fetchWithAuth } from '../../config/apiBase';

export default function EmployeesPayRollPage() {

  const [type, setType] = useState('monthly');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Guardadas
  const [savedPayrollData, setSavedPayrollData] = useState([]);
  const [showSaved, setShowSaved] = useState(false);

  // Modal de impresión
  const [showPrint, setShowPrint] = useState(false);
  const [toPrintPayroll, setToPrintPayroll] = useState(null);
  const [toPrintDetails, setToPrintDetails] = useState([]);

  const n = v => Number(v || 0);

  async function generate() {
    try {
      setLoading(true);
      const res = await fetchWithAuth('/api/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({ start, end, type })
      });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  async function savePayroll() {
    if (loading) return; // ✅ Prevención de doble envío
    try {
      setLoading(true);
      await fetchWithAuth('/api/payroll', {
        method: 'POST',
        body: JSON.stringify({ rows: data, start, end, type })
      });
      alert('Nómina guardada');
    } catch {
      alert('Error guardando');
    } finally {
      setLoading(false);
    }
  }

  // Guardadas
  async function viewSavedPayroll() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ start, end, type }).toString();
      const res = await fetchWithAuth(`/api/payroll/saved?${params}`);
      const json = await res.json();
      if (Array.isArray(json)) {
        setSavedPayrollData(json);
        setShowSaved(true);
      } else {
        setSavedPayrollData([]);
      }
    } catch {
      setSavedPayrollData([]);
      alert("Error consultando nómina guardada");
    } finally {
      setLoading(false);
    }
  }

  // Imprimir recibo para un empleado
  async function handleShowPrintModal(emp) {
    try {
      const res = await fetchWithAuth(`/api/payroll/details/${emp.payroll_id}`);
      const details = await res.json();
      setToPrintPayroll(emp);
      setToPrintDetails(details || []);
      setShowPrint(true);
    } catch {
      alert('Error cargando detalle de nómina');
    }
  }

  const totalPayroll = data.reduce((acc, e) => acc + n(e.total_pay), 0);
  const totalExtra = data.reduce((acc, e) => acc + n(e.extra_pay), 0);

  const headerAction = (
    <div className="pay-toolbar">
      <button className="pay-btn" onClick={generate}><RefreshCw size={14}/> Generar</button>
      <button className="pay-btn-print" onClick={savePayroll}><DollarSign size={14}/> Guardar</button>
      <button className="pay-btn-print" style={{background:'#f9edcc',color:'#542'}} onClick={viewSavedPayroll}><Archive size={18}/> Ver Nóminas</button>
    </div>
  );

  // Dato de negocio (opcional)
  const selectedBusiness = JSON.parse(localStorage.getItem('selectedBusiness') || 'null');
  const businessInfo = { name: selectedBusiness?.name || "Mi Negocio" };

  return (
    <PageTemplate
      title="Nómina Inteligente"
      subtitle="Cálculo automático con horas normales y extras"
      headerAction={headerAction}
      loading={loading}
    >

      <PayrollPrintModalQZ
        open={showPrint}
        onClose={()=>setShowPrint(false)}
        payroll={toPrintPayroll}
        details={toPrintDetails}
        start={start}
        end={end}
        business={businessInfo}
      />

      {/* MODAL DE NOMINA GUARDADA */}
      {showSaved && (
        <div className="pay-modal-backdrop">
          <div className="pay-modal" style={{minWidth:600}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <b>Nómina Guardada</b>
              <button onClick={()=>setShowSaved(false)} style={{fontSize:22}}>&times;</button>
            </div>
            <table className="pay-table"  style={{margin:"10px 0"}}>
              <thead>
                <tr>
                  <th>Colaborador/a</th>
                  <th>Horas. N</th>
                  <th>H. Extras</th>
                  <th>V. Hora</th>
                  <th>Total</th>
                  <th>Imprimir</th>
                </tr>
              </thead>
              <tbody>
                {savedPayrollData.map(emp => (
                  <tr key={emp.payroll_id}>
                    <td>{emp.full_name}</td>
                    <td>{n(emp.total_hours).toFixed(2)}</td>
                    <td style={{color:emp.extra_hours>0?'#226e21':''}}>{n(emp.extra_hours).toFixed(2)}</td>
                    <td>${n(emp.hourly_rate).toFixed(2)}</td>
                    <td style={{fontWeight:600}}>${n(emp.total_pay).toFixed(2)}</td>
                    <td>
                      <button
                        className="pay-btn"
                        style={{padding:0, fontSize:14}}
                        title="Imprimir recibo"
                        onClick={() => handleShowPrintModal(emp)}
                      >
                        <List size={17}/> Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{marginTop:10,borderTop:"1px solid #e1ddd6",paddingTop:7}}>
              <b>Total Nómina: ${savedPayrollData.reduce((acc, e) => acc + n(e.total_pay || 0), 0).toFixed(2)}</b>
            </div>
            <div style={{textAlign:'right',marginTop:16}}>
              <button className="pay-btn" onClick={()=>setShowSaved(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="pay-filters">
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
        </select>
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
      </div>
      {/* STATS */}
      <div className="pay-stats">
        <div className="pay-card"><Clock size={18}/><div>
          <span>${totalPayroll.toFixed(2)}</span><p>Total Nómina</p>
        </div></div>
        <div className="pay-card extra"><Calendar size={18}/><div>
          <span>${totalExtra.toFixed(2)}</span><p>Horas Extras</p>
        </div></div>
      </div>
      {/* TABLA PRINCIPAL */}
      <div className="pay-table-wrapper">
        <table className="pay-table">
          <thead>
            <tr>
              <th>Empleado</th>
              <th>Horas</th>
              <th>Extras</th>
              <th>Valor Hora</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Calculando...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="5">No hay datos</td></tr>
            ) : data.map((emp, idx) => (
                <tr key={emp.employee_id || idx}>
                  <td>{emp.full_name}</td>
                  <td>{n(emp.total_hours).toFixed(2)}</td>
                  <td>{n(emp.extra_hours).toFixed(2)}</td>
                  <td>${n(emp.hourly_rate).toFixed(2)}</td>
                  <td style={{fontWeight:600}}>${n(emp.total_pay).toFixed(2)}</td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </PageTemplate>
  );
}