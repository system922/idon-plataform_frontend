/**
 * buildPayrollPrintText - genera el texto del ticket de nómina
 *
 * @param {object} payroll - Datos del empleado (full_name, total_pay, etc.)
 * @param {array} details - Detalles adicionales de la nómina
 * @param {object} periodInfo - Información del período
 * @param {object} business - Datos del negocio
 * @param {string} userName - Nombre del usuario que imprime
 * @param {number} width - Ancho en caracteres (default 32)
 * @param {string} footer - Pie de página opcional
 */
export function buildPayrollPrintText(
  payroll,
  details,
  periodInfo,
  business,
  userName,
  width = 32,
  footer = null
) {
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

  const row = (label, val, rawVal = false) => {
    const right = rawVal ? String(val ?? '') : val;
    const left = String(label ?? '').substring(0, width - right.length - 1);
    return left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right;
  };

  const fmt = (n) => {
    const v = parseFloat(n ?? 0);
    return isNaN(v) ? '$0.00' : `$${Math.abs(v).toFixed(2)}`;
  };

  const now = new Date();
  const nowStr = now.toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  let out = '';

  // Encabezado negocio
  out += LINE + '\n';
  if (business) {
    const bizName = business.trade_name || business.company_name || 'NEGOCIO';
    wrap(bizName.toUpperCase()).forEach(l => (out += center(l) + '\n'));
    if (business.address) wrap(business.address).forEach(l => (out += center(l) + '\n'));
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
  out += center('DETALLE DEL PAGO') + '\n';
  out += SEP + '\n';

  if (periodInfo?.payment_type === 'hourly') {
    out += row('Horas trabajadas:', `${n(payroll?.total_hours).toFixed(2)} h`, true) + '\n';
    out += row('Valor por hora:', fmt(payroll?.hourly_rate), true) + '\n';
    if (n(payroll?.extra_hours) > 0) {
      out += row('Horas extras (150%):', `${n(payroll?.extra_hours).toFixed(2)} h`, true) + '\n';
    }
  } else {
    out += row('Días trabajados:', `${n(payroll?.days_worked || 1).toFixed(0)} días`, true) + '\n';
    out += row('Sueldo diario:', fmt(payroll?.daily_rate), true) + '\n';
  }

  out += SEP + '\n';
  out += row('TOTAL A PAGAR:', fmt(payroll?.total_pay), true) + '\n';
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