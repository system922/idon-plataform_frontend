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

  const mW = 12;
  const labW = width - mW;

  const row = (label, val, rawVal = false) => {
    const right = rawVal ? String(val ?? '') : fmt(val);
    const left = String(label ?? '').substring(0, labW);
    return left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right;
  };

  const sectionTitle = (title) => SEP + '\n' + center(title) + '\n' + SEP;
  const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`;

  const now = new Date();
  const nowStr = now.toLocaleString('es-EC', { hour12: false });

  let out = '';

  // Encabezado
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
  out += row('Fecha:', nowStr, true) + '\n';
  out += row('Usuario:', userName || 'Operador', true) + '\n';
  out += SEP + '\n';

  // Detalle del pago
  out += sectionTitle('DETALLE DEL PAGO') + '\n';

  if (periodInfo?.payment_type === 'hourly') {
    out += row('Horas trabajadas:', `${n(payroll?.total_hours).toFixed(2)} h`, true) + '\n';
    out += row('Valor por hora:', fmt(payroll?.hourly_rate)) + '\n';
    if (n(payroll?.extra_hours) > 0) {
      out += row('Horas extras (150%):', `${n(payroll?.extra_hours).toFixed(2)} h`, true) + '\n';
    }
  } else {
    out += row('Días trabajados:', `${n(payroll?.days_worked || 1).toFixed(0)} días`, true) + '\n';
    out += row('Sueldo diario:', fmt(payroll?.daily_rate)) + '\n';
  }

  out += SEP + '\n';
  out += row('TOTAL A PAGAR:', fmt(payroll?.total_pay)) + '\n';
  out += LINE + '\n';

  // Firma
  out += '\n' + center('Firma del empleado:') + '\n\n';
  out += center('_'.repeat(Math.floor(width * 0.6))) + '\n';
  out += center(payroll?.full_name?.split(' ')[0] || '') + '\n';

  // Footer
  out += '\n' + SEP + '\n';
  out += center(`Impreso: ${nowStr}`) + '\n';
  if (footer) wrap(footer).forEach(l => out += center(l) + '\n');
  out += center('Gracias por su trabajo') + '\n';
  out += LINE + '\n\n\n';

  return out;
}