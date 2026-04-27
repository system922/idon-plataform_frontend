import React, { useEffect, useState } from 'react';
import qz from 'qz-tray';

const WIDTH = 32;
const PRINTER_NAME = 'POS-58';

const line   = () => '='.repeat(WIDTH);
const sep    = () => '-'.repeat(WIDTH);
const center = (txt) => {
  const t = String(txt || '').trim().substring(0, WIDTH);
  const pad = Math.max(0, Math.floor((WIDTH - t.length) / 2));
  return ' '.repeat(pad) + t;
};
const wrap = (txt, w = WIDTH) => {
  const str = String(txt || '').trim();
  if (!str) return [];
  const words = str.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length <= w) { cur = next; }
    else { if (cur) lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
};
const leftRight = (left, right) => {
  const l = String(left);
  const r = String(right);
  return l + ' '.repeat(WIDTH - l.length - r.length) + r;
};
const num = v => Number(v || 0);
const fmt = v => '$' + num(v).toFixed(2);

function buildPayrollReceipt({ payroll, details, start, end}) {
  let out = '';
  out += line() + '\n';
  out += center('NÓMINA DE COLABORADOR/A') + '\n';
  out += center(`Del ${start} al ${end}`) + '\n';
  out += line() + '\n';
  out += wrap(payroll.full_name).map(l => center(l)).join('\n') + '\n';
  out += sep() + '\n';
  out += leftRight('Horas Normales:', num(payroll.total_hours).toFixed(2)) + '\n';
  out += leftRight('Horas Extras:', num(payroll.extra_hours).toFixed(2)) + '\n';
  out += leftRight('Valor Hora:', fmt(payroll.hourly_rate)) + '\n';
  out += sep() + '\n';

  details.forEach(d => {
    out += leftRight(
      (d.concept + (d.type === "overtime" ? ' [Extras]' : '')),
      fmt(d.amount)
    ) + '\n';
  });

  out += sep() + '\n';
  out += leftRight('Total A Recibir:', fmt(payroll.total_pay)) + '\n';
  out += line() + '\n\n';
  out += center('-------FIN DE NÓMINA-------') + '\n\n\n\n\n\n';
  return out;
}

export default function PayrollPrintModalQZ({ open, onClose, payroll, details, start, end, business }) {
  const [printerConnected, setPrinterConnected] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!qz.websocket.isActive()) await qz.websocket.connect();
        setPrinterConnected(true);
      } catch { setPrinterConnected(false); }
    })();
  }, []);

  async function handlePrint() {
    const text = buildPayrollReceipt({ payroll, details, start, end, business });
    if (printerConnected) {
      try {
        const config = qz.configs.create(PRINTER_NAME);
        await qz.print(config, [text]);
        return;
      } catch (e) {
        setPrinterConnected(false);
      }
    }
    // fallback impresión web
    const html = `
      <html><head><meta charset="utf-8"/>
      <style>
        @page { margin: 4mm; size: 80mm auto; }
        body { font-family:'Courier New',monospace; font-size:10pt; white-space:pre; margin:0; color:#000; }
      </style></head>
      <body>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').split('\n').join('<br/>')}</body>
      </html>
    `;
    const w = window.open('', '', 'width=350,height=700,menubar=0,toolbar=0');
    if (!w) return alert('Permite ventanas emergentes para imprimir');
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 350);
  }

  if (!open || !payroll) return null;
  return (
    <div className="pay-modal-backdrop superior">
      <div className="pay-modal" style={{minWidth:350,maxWidth:410}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <b>{payroll.full_name}</b>
          <button onClick={onClose} style={{fontSize:21, background:'none', border:0, cursor:'pointer'}}>&times;</button>
        </div>
        <div style={{fontFamily:'monospace', fontSize:14}}>
          <div><b>Periodo:</b> {start} a {end}</div>
          <div><b>Horas N.:</b> {num(payroll.total_hours).toFixed(2)} 
          <div><b>H. Extras:</b> {num(payroll.extra_hours).toFixed(2)}</div></div>
          <div><b>Valor hora:</b> {fmt(payroll.hourly_rate)}</div>
          <hr />
          <table style={{width:'100%', fontFamily:'monospace', fontSize:14}}>
            <thead>
              <tr><th align="left">Concepto</th>
              <th align="right">Monto</th></tr>
            </thead>
            <tbody>
              {(details||[]).map((d,i)=>(
                <tr key={i}>
                  <td>{d.concept}</td>
                  <td style={{textAlign:'right'}}>{fmt(d.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr />
          <div style={{textAlign:"right"}}>
            <b>Total: {fmt(payroll.total_pay)}</b>
          </div>
        </div>
        <div style={{display:'flex', gap:9, marginTop:18, justifyContent:'flex-end'}}>
          <button className="pay-btn-print" onClick={handlePrint}>Imprimir</button>
          <button className="pay-btn-canc" onClick={onClose}>Cerrar</button>
        </div>
      </div>
      <style>{`
        .pay-modal-backdrop.superior {
          z-index: 4000 !important;
        }
        .pay-modal-backdrop {
          position: fixed; z-index: 3000; inset: 0; background: rgba(0,0,0,.13); display:flex;align-items:center;justify-content:center;
        }
        .pay-modal {
          background: #fff; border-radius: 9px; box-shadow: 0 8px 24px 0 rgba(0,0,0,0.17); padding: 18px 24px 18px 24px;
        }
      `}</style>
    </div>
  );
}