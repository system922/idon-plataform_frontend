/**
 * buildPayrollPrintText — genera el texto del ticket de nómina
 */
export function buildPayrollPrintText(payroll, details, periodInfo, business, userName, width = 32, footer = null) {
  // Función segura para convertir a número
  const n = v => {
    const num = Number(v);
    return isNaN(num) ? 0 : num;
  };
  
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

  const mW = 12;
  const labW = width - mW;

  const row = (label, val, rawVal = false) => {
    const right = rawVal ? String(val ?? '') : fmt(val);
    const left = String(label ?? '').substring(0, labW);
    return left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right;
  };

  const sectionTitle = (title) => SEP + '\n' + center(title) + '\n' + SEP;
  
  const fmt = (value) => {
    const num = n(value);
    return `$${num.toFixed(2)}`;
  };

  const now = new Date();
  const nowStr = now.toLocaleString('es-EC', { 
    hour12: false,
    timeZone: 'America/Guayaquil'
  });

  let out = '';

  // Encabezado negocio
  out += LINE + '\n';
  if (business) {
    const bizName = business.trade_name || business.company_name || business.name || 'NEGOCIO';
    wrap(bizName.toUpperCase()).forEach(l => out += center(l) + '\n');
    if (business.address) wrap(business.address).forEach(l => out += center(l) + '\n');
    if (business.phone) out += center(`Tel: ${business.phone}`) + '\n';
    if (business.ruc) out += center(`RUC: ${business.ruc}`) + '\n';
  }
  out += LINE + '\n';
  out += center('*** RECIBO DE NÓMINA ***') + '\n';
  out += LINE + '\n';

  // Datos del colaborador
  out += row('Colaborador:', payroll?.full_name || 'N/A', true) + '\n';
  out += row('Período:', periodInfo?.period_text || 'N/A', true) + '\n';
  out += row('Tipo pago:', periodInfo?.payment_type === 'hourly' ? 'POR HORAS' : 'PAGO DIARIO', true) + '\n';
  out += row('Fecha emisión:', nowStr, true) + '\n';
  out += row('Usuario:', userName || 'Operador', true) + '\n';
  out += SEP + '\n';

  // Detalle del pago
  out += sectionTitle('DETALLE DEL PAGO') + '\n';

  if (periodInfo?.payment_type === 'hourly') {
    const totalHours = n(payroll?.total_hours);
    const extraHours = n(payroll?.extra_hours);
    const hourlyRate = n(payroll?.hourly_rate);
    
    out += row('Horas trabajadas:', `${totalHours.toFixed(2)} h`, true) + '\n';
    out += row('Valor por hora:', fmt(hourlyRate)) + '\n';
    if (extraHours > 0) {
      out += row('Horas extras (150%):', `${extraHours.toFixed(2)} h`, true) + '\n';
    }
  } else {
    const daysWorked = n(payroll?.days_worked || payroll?.total_days || 1);
    const dailyRate = n(payroll?.daily_rate);
    
    out += row('Días trabajados:', `${daysWorked.toFixed(0)} días`, true) + '\n';
    out += row('Sueldo diario:', fmt(dailyRate)) + '\n';
  }

  out += SEP + '\n';
  
  const totalPay = n(payroll?.total_pay);
  out += row('TOTAL A PAGAR:', fmt(totalPay)) + '\n';
  out += LINE + '\n';

  // Firma
  out += '\n' + center('Firma del empleado:') + '\n\n';
  out += center('_'.repeat(Math.floor(width * 0.6))) + '\n';
  const firstName = payroll?.full_name?.split(' ')[0] || '';
  out += center(firstName) + '\n';

  // Footer
  out += '\n' + SEP + '\n';
  out += center(`Impreso: ${nowStr}`) + '\n';
  if (footer) wrap(footer).forEach(l => out += center(l) + '\n');
  out += center('Gracias por su trabajo') + '\n';
  out += LINE + '\n\n\n';

  return out;
}