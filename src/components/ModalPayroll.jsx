import React, { useRef } from 'react';

const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

export default function ModalPayroll({ open, data = [], start, end, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const printContent = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=840,height=850,toolbar=0,menubar=0');
    win.document.write(`
      <html>
      <head>
        <title>Nómina ${start} - ${end}</title>
        <style>
          body { font-family: 'Courier New',monospace; font-size:12px; color: #222; margin: 0; }
          .payroll-receipt { max-width: 630px; margin: 0 auto }
          .receipt-title{ font-size: 22px; font-weight: bold; text-align: center; margin-top:10px }
          .receipt-period{ text-align: center; font-size: 15px; margin-bottom:12px; }
          table { border-collapse: collapse; width: 100%; margin: 18px 0 14px 0;}
          th, td { border: 1px solid #444; padding: 5px 8px; font-size: 12px; text-align: center;}
          th { background: #f6f6ff; font-weight: 800; }
          .receipt-total{ font-size:15px; font-weight: bold; text-align: right; margin: 13px 8px 4px 0;}
          @media print { .noprint{ display: none; } }
        </style>
      </head>
      <body onload="window.print();">
        <div class="payroll-receipt">
          ${printContent}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.close(), 800);
  };


  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.20)', zIndex: 4000, display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background: "white", borderRadius: "13px", boxShadow: "0 6px 42px #4442", minWidth: '70vw', maxWidth: 830, maxHeight: "92vh", overflowY: "auto", position: "relative"
      }}>
        <button className="noprint" style={{
          position: 'absolute', top: 9, right: 15, fontSize: 21, border: 'none', background: 'none', color: '#9D2259', fontWeight: 900, cursor:'pointer', zIndex:10
        }} onClick={onClose}>×</button>

        <div ref={printRef} style={{ padding: 25, paddingTop: 38 }}>
          <div className="receipt-title">NÓMINA DE PAGOS</div>
          <div className="receipt-period">{start} al {end}</div>
          <table>
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
              {data.map((emp, i) => (
                <tr key={i}>
                  <td style={{textAlign:'start'}}>{emp.full_name}</td>
                  <td>{parseFloat(emp.total_hours).toFixed(2)}</td>
                  <td>{parseFloat(emp.extra_hours).toFixed(2)}</td>
                  <td>{fmt(emp.hourly_rate || emp.base_salary/emp.total_hours)}</td>
                  <td><b>{fmt(emp.total_pay || emp.gross_salary)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="receipt-total">
            Total Nómina: {fmt(data.reduce((a, e) => a + Number(e.total_pay || e.gross_salary || 0), 0))}
          </div>
        </div>
        <div className="noprint" style={{ display:'flex', flexDirection:'row', gap:11, justifyContent:'flex-end', padding: '9px 28px 19px 15px'}}>
          <button className="pay-btn" onClick={handlePrint} style={{marginRight:8}}>Imprimir</button>
          <button className="pay-btn" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}