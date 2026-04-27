/**
 * buildCashCloseText — genera el texto del ticket de cierre de caja
 *
 * @param {object} close   Registro plano del cierre (close_cash_register row)
 * @param {object} datos   Resumen del día: { propinas, gastos, ventasEfectivo,
 *                          ventasTransferencia, ventasTarjeta, comandasSistema }
 * @param {string} user    Nombre del usuario que cierra (fallback)
 * @param {object} biz     Datos del negocio
 * @param {number} width   Ancho en caracteres (default 42)
 * @param {string} footer  Pie de página opcional
 */
export function buildCashCloseText(
  close, datos, user, biz, width = 42, footer = null
) {
  // ── Helpers ────────────────────────────────────────────────────────────────
  const LINE = '='.repeat(width);
  const SEP  = '-'.repeat(width);

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
    const left  = String(label ?? '').substring(0, labW);
    return left + ' '.repeat(Math.max(1, width - left.length - right.length)) + right;
  };

  const sectionTitle = (title) =>
    SEP + '\n' + center(title) + '\n' + SEP;

  const fmt = (n) => {
    const v = parseFloat(n ?? 0);
    return isNaN(v) ? '$0.00' : `$${Math.abs(v).toFixed(2)}`;
  };

  const fmtSigned = (n) => {
    const v = parseFloat(n ?? 0);
    if (isNaN(v)) return '$0.00';
    return (v < 0 ? '-' : v > 0 ? '+' : '') + `$${Math.abs(v).toFixed(2)}`;
  };

  const fmtDate = (str) => {
    if (!str) return '—';
    try {
      if (/^\d{2}:\d{2}/.test(str)) return str.slice(0, 8);
      const d = new Date(str);
      return d.toLocaleDateString('es-EC', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        timeZone: 'America/Guayaquil',
      }) + ' ' + d.toLocaleTimeString('es-EC', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'America/Guayaquil',
      });
    } catch { return str; }
  };

  const now = new Date();
  const nowStr = fmtDate(now.toISOString());

  // ── Datos calculados ───────────────────────────────────────────────────────
  const gastosList = Array.isArray(datos?.gastos) ? datos.gastos : [];
  const gastosTotal = gastosList.reduce((a, g) => a + Number(g.monto || 0), 0);

  const propSistema  = Number(datos?.propinas || 0);
  const propContado  = Number(close?.tip_counted ?? close?.propinaFisico ?? 0);
  const propDiff     = propContado - propSistema;

  let out = '';

  // ── Encabezado negocio ─────────────────────────────────────────────────────
  out += LINE + '\n';
  if (biz) {
    const bizName =
      biz.trade_name && biz.trade_name !== biz.company_name
        ? biz.trade_name
        : biz.company_name || 'NEGOCIO';
    wrap(bizName.toUpperCase()).forEach(l => (out += center(l) + '\n'));
    if (biz.address) wrap(biz.address).forEach(l => (out += center(l) + '\n'));
    if (biz.city || biz.country)
      out += center([biz.city, biz.country].filter(Boolean).join(' - ')) + '\n';
    if (biz.phone) out += center(`Tel: ${biz.phone}`) + '\n';
    if (biz.email) out += center(biz.email) + '\n';
    if (biz.ruc)   out += center(`RUC: ${biz.ruc}`) + '\n';
  }
  out += LINE + '\n';
  out += center('*** CIERRE DE CAJA ***') + '\n';
  out += LINE + '\n';

  // ── Datos de sesión ────────────────────────────────────────────────────────
  out += row('Cierre por:', close?.closing_user_id || user || '—', true) + '\n';
  out += row('Fecha cierre:', close?.closing_date?.slice?.(0, 10) || '—', true) + '\n';
  out += row('Hora cierre:', close?.closing_time?.slice?.(0, 8)  || '—', true) + '\n';
  if (close?.remarks?.trim()) {
    wrap(`Obs: ${close.remarks}`).forEach(l => (out += l + '\n'));
  }

  // ── Resumen de ventas ──────────────────────────────────────────────────────
  out += '\n' + sectionTitle('RESUMEN DE VENTAS') + '\n';

  const totalSistema = Number(close?.total_system  ?? (
    Number(datos?.ventasEfectivo || 0) +
    Number(datos?.ventasTransferencia || 0) +
    Number(datos?.ventasTarjeta || 0)
  ));
  const totalContado = Number(close?.total_counted ?? 0);

  out += row('N° Comandas (cont./sist.):', `${close?.orders_counted ?? 0}/${close?.orders_system ?? datos?.comandasSistema ?? 0}`, true) + '\n';
  out += row('Ventas sistema:', totalSistema) + '\n';

  // ── Formas de pago ─────────────────────────────────────────────────────────
  out += '\n' + sectionTitle('FORMAS DE PAGO') + '\n';

  const paySection = (label, counted, sistema, diff) => {
    out += `${label}\n`;
    out += row('  Sistema:', sistema) + '\n';
    out += row('  Contado:', counted) + '\n';
    const d = diff ?? (Number(counted) - Number(sistema));
    out += row('  Diferencia:', fmtSigned(d), true) + '\n';
    out += SEP + '\n';
  };

  paySection('EFECTIVO',
    close?.cash_counted,     close?.cash_system,     close?.diff_cash);
  paySection('TRANSFERENCIA',
    close?.transfer_counted, close?.transfer_system, close?.diff_transfer);
  paySection('TARJETA',
    close?.card_counted,     close?.card_system,     close?.diff_card);

  if (propSistema > 0 || propContado > 0) {
    paySection('PROPINAS', propContado, propSistema, propDiff);
  }

  // ── Gastos del día ─────────────────────────────────────────────────────────
  out += sectionTitle('GASTOS DEL DIA') + '\n';
  if (gastosList.length > 0) {
    gastosList.forEach((g, i) => {
      const concepto = String(g.concepto || `Gasto ${i + 1}`).slice(0, labW - 2);
      out += row(`  ${concepto}:`, g.monto) + '\n';
    });
  } else {
    out += center('Sin gastos registrados') + '\n';
  }
  out += row('Total gastos:', gastosTotal) + '\n';

  // ── Totales generales ──────────────────────────────────────────────────────
  out += '\n' + sectionTitle('TOTALES GENERALES') + '\n';
  out += row('Total sistema:', close?.total_system ?? totalSistema) + '\n';
  out += row('Total contado:', close?.total_counted ?? totalContado) + '\n';
  out += row('Diferencia total:', fmtSigned(close?.diff_total ?? (totalContado - totalSistema)), true) + '\n';
  out += SEP + '\n';
  if (close?.net_system != null || close?.net_counted != null) {
    out += row('Neto sistema:', close?.net_system ?? (totalSistema - gastosTotal)) + '\n';
    out += row('Neto contado:', close?.net_counted ?? (totalContado - gastosTotal)) + '\n';
    out += row('Diferencia neta:', fmtSigned(close?.diff_net ?? ((close?.net_counted ?? 0) - (close?.net_system ?? 0))), true) + '\n';
  }

  out += LINE + '\n';

  // ── Firma ──────────────────────────────────────────────────────────────────
  out += '\n';
  out += center('Firma responsable:') + '\n\n';
  out += center('_'.repeat(Math.floor(width * 0.6))) + '\n';
  out += center(close?.closing_user_id || user || 'Operador') + '\n';

  // ── Footer ─────────────────────────────────────────────────────────────────
  out += '\n' + SEP + '\n';
  out += center(`Impreso: ${nowStr}`) + '\n';
  if (footer) wrap(footer).forEach(l => (out += center(l) + '\n'));
  out += center('Generado por sistema') + '\n';
  out += LINE + '\n\n\n\n';

  return out;
}
