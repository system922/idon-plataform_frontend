// src/Helper/buildPayrollPrintText.js
export function buildPayrollPrintText(payroll, details, periodInfo, business, userName, width = 32, footer = null) {
  const n = v => Number(v || 0);
  
  const LINE = '='.repeat(width);
  const SEP = '-'.repeat(width);

  const center = (txt) => {
    const s = String(txt ?? '').substring(0, width);
    const pad = Math.max(0, Math.floor((width - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  const wrap = (txt, w = width) => {
    const str = String(txt ?? '').trim();
    if (!str) return [];
    const words = str.split(/\s+/);
    const lines = [];
    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length <= w) cur = next;
      else { if (cur) lines.push(cur); cur = word; }
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const row2 = (label, val) => {
    const right = String(val ?? '');
    const left = String(label ?? '').substring(0, width - right.length - 1);
    return left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right;
  };

  const fmt = (n) => {
    const v = parseFloat(n ?? 0);
    return isNaN(v) ? '$0.00' : `$${Math.abs(v).toFixed(2)}`;
  };

  const now = new Date();
  const nowStr = now.toLocaleString('es-EC', { hour12: false });

  let out = '';

  // Encabezado negocio
  out += LINE + '\n';
  if (business) {
    const bizName = business.trade_name || business.company_name || business.name || 'NEGOCIO';
    wrap(bizName.toUpperCase()).forEach(l => (out += center(l) + '\n'));
    if (business.address) wrap(business.address).forEach(l => (out += center(l) + '\n'));
    if (business.phone) out += center(`Tel: ${business.phone}`) + '\n';
    if (business.ruc) out += center(`RUC: ${business.ruc}`) + '\n';
  }
  out += LINE + '\n';
  out += center('*** RECIBO DE NÓMINA ***') + '\n';
  out += LINE + '\n';

  // Datos del colaborador
  out += row2('Colaborador:', payroll?.full_name || 'N/A') + '\n';
  out += row2('Período:', periodInfo?.period_text || 'N/A') + '\n';
  out += row2('Tipo pago:', periodInfo?.payment_type === 'hourly' ? 'POR HORAS' : 'PAGO DIARIO') + '\n';
  out += row2('Fecha emisión:', nowStr) + '\n';
  out += row2('Usuario:', userName || 'Operador') + '\n';
  out += SEP + '\n';

  // Detalle del pago
  out += center('DETALLE DEL PAGO') + '\n';
  out += SEP + '\n';

  if (periodInfo?.payment_type === 'hourly') {
    out += row2('Horas trabajadas:', `${n(payroll?.total_hours).toFixed(2)} h`) + '\n';
    out += row2('Valor por hora:', fmt(payroll?.hourly_rate)) + '\n';
    if (n(payroll?.extra_hours) > 0) {
      out += row2('Horas extras (150%):', `${n(payroll?.extra_hours).toFixed(2)} h`) + '\n';
    }
  } else {
    out += row2('Días trabajados:', `${n(payroll?.days_worked || 1).toFixed(0)} días`) + '\n';
    out += row2('Sueldo diario:', fmt(payroll?.daily_rate)) + '\n';
  }

  out += SEP + '\n';
  out += row2('TOTAL A PAGAR:', fmt(payroll?.total_pay)) + '\n';
  out += LINE + '\n';

  // Firma
  out += '\n';
  out += center('Firma del empleado:') + '\n\n';
  out += center('_'.repeat(Math.floor(width * 0.6))) + '\n';
  out += center(payroll?.full_name?.split(' ')[0] || '') + '\n';

  // Footer
  out += '\n' + SEP + '\n';
  out += center(`Impreso: ${nowStr}`) + '\n';
  if (footer) wrap(footer).forEach(l => (out += center(l) + '\n'));
  out += center('Gracias por su trabajo') + '\n';
  out += LINE + '\n\n\n';

  return out;
}