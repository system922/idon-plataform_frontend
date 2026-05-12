import { useCallback } from 'react';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';

export function usePrinterService() {
  /**
   * Obtiene configuración de impresora desde BD
   */
  const getPrinterConfig = useCallback(async (printerKey = 'printer_main') => {
    try {
      const res = await fetchWithAuth(`/api/settings/${printerKey}`);
      if (!res.ok) {
        return getDefaultPrinter(printerKey);
      }

      const data = await res.json();
      const value = data?.value;

      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return getDefaultPrinter(printerKey);
        }
      }

      if (value && typeof value === 'object') {
        return {
          name: value.name || getDefaultPrinterName(printerKey),
          width: value.width || getDefaultPrinterWidth(printerKey),
          footer: value.footer || '',
        };
      }

      return getDefaultPrinter(printerKey);
    } catch (error) {
      console.warn(`Error obteniendo configuración ${printerKey}:`, error);
      return getDefaultPrinter(printerKey);
    }
  }, []);

  const getDefaultPrinterName = (key) => 'POS-58';
  const getDefaultPrinterWidth = (key) => key === 'printer_main' ? 42 : 32;

  const getDefaultPrinter = (key) => ({
    name: getDefaultPrinterName(key),
    width: getDefaultPrinterWidth(key),
    footer: '',
  });

  /**
   * Genera un ticket formateado según el tipo
   */
  const formatTicket = useCallback((config) => {
    const { printerName, paperWidth = 42, data, template } = config;

    if (!template || !data) {
      throw new Error('Template y data son requeridos');
    }

    let content = '';

    switch (template) {
      case 'cash-close':
        content = formatCashCloseTicket(data, paperWidth);
        break;
      case 'invoice':
        content = formatInvoiceTicket(data, paperWidth);
        break;
      case 'receipt':
        content = formatReceiptTicket(data, paperWidth);
        break;
      case 'comanda':
        content = formatComandaTicket(data, paperWidth);
        break;
      case 'payroll':
        content = formatPayrollTicket(data, paperWidth);
        break;
      case 'purchase':
        content = formatPurchaseTicket(data, paperWidth);
        break;
      case 'comanda-mod':
        content = formatComandaModTicket(data, paperWidth);
        break;
      case 'ticket-simple':
        content = formatSimpleTicket(data, paperWidth);
        break;
      default:
        throw new Error(`Template '${template}' no reconocido`);
    }

    return { printerName, content };
  }, []);

  /**
   * Envía el ticket a imprimir
   */
  const printTicket = useCallback(async (printerName, content, openDrawer = false) => {
    if (!qz.websocket.isActive()) {
      console.error('❌ QZ Tray no está conectado');
      return { success: false, error: 'QZ Tray no está conectado' };
    }

    const sendTo = async (name) => {
      const config = qz.configs.create(name);
      const commands = [
        String.fromCharCode(27) + '@',
        ...(openDrawer ? [String.fromCharCode(27) + 'p' + String.fromCharCode(0) + String.fromCharCode(25) + String.fromCharCode(250)] : []),
        content,
        '\n\n\n',
        String.fromCharCode(27) + 'i',
      ];
      await qz.print(config, commands);
    };

    try {
      await sendTo(printerName);
      console.log(`✅ Impreso en: ${printerName}`);
      return { success: true };
    } catch (err) {
      // Reintenta con el nombre por defecto si el configurado no existe
      const DEFAULT = 'POS-58';
      if (printerName !== DEFAULT) {
        try {
          await sendTo(DEFAULT);
          console.log(`✅ Impreso en fallback: ${DEFAULT}`);
          return { success: true };
        } catch (err2) {
          console.error('❌ Error en printTicket (fallback):', err2);
          return { success: false, error: err2.message };
        }
      }
      console.error('❌ Error en printTicket:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Imprime directamente
   */
  const print = useCallback(async (printerKey, template, data, openDrawer = false) => {
    try {
      console.log(`🔍 Obteniendo config de ${printerKey}...`);

      const printerConfig = await getPrinterConfig(printerKey);

      console.log(`📋 Config obtenida:`, printerConfig);

      if (!printerConfig?.name) {
        return { success: false, error: 'Impresora no configurada' };
      }

      const ticket = formatTicket({
        printerName: printerConfig.name,
        paperWidth: printerConfig.width || 42,
        data,
        template,
      });

      console.log(`📝 Ticket formateado. Tamaño: ${ticket.content.length} caracteres`);

      return await printTicket(
        ticket.printerName,
        ticket.content,
        openDrawer && printerKey === 'printer_main'
      );
    } catch (error) {
      console.error('❌ Error en print:', error);
      return { success: false, error: error.message };
    }
  }, [getPrinterConfig, formatTicket, printTicket]);

  /**
   * Abre el cajón
   */
  const openCashDrawer = useCallback(async () => {
    if (!qz.websocket.isActive()) {
      return { success: false, error: 'QZ Tray no está conectado' };
    }

    const printerConfig = await getPrinterConfig('printer_main');
    const DRAWER_CMD = [
      String.fromCharCode(27) + 'p' + String.fromCharCode(0) + String.fromCharCode(25) + String.fromCharCode(250),
    ];

    const tryOpen = async (name) => {
      const config = qz.configs.create(name);
      await qz.print(config, DRAWER_CMD);
    };

    const configuredName = printerConfig?.name || '';
    const DEFAULT = 'POS-58';

    try {
      await tryOpen(configuredName || DEFAULT);
      return { success: true };
    } catch (err) {
      if (configuredName && configuredName !== DEFAULT) {
        try {
          await tryOpen(DEFAULT);
          return { success: true };
        } catch (err2) {
          return { success: false, error: err2.message };
        }
      }
      return { success: false, error: err.message };
    }
  }, [getPrinterConfig]);

  return {
    getPrinterConfig,
    formatTicket,
    printTicket,
    print,
    openCashDrawer,
  };
}

// ─── Utilidades de formato ────────────────────────────────────────────────────

function padCenter(text, width) {
  const padding = Math.max(0, width - text.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return ' '.repeat(left) + text + ' '.repeat(right);
}

function padRight(text, width) {
  return text + ' '.repeat(Math.max(0, width - text.length));
}

function padLeft(text, width) {
  return ' '.repeat(Math.max(0, width - text.length)) + text;
}

function wrap(text, width = 42) {
  const str = String(text ?? '').trim();
  if (!str) return [];
  const words = str.split(/\s+/);
  const lines = [];
  let current = '';
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= width) current = next;
    else {
      if (current) lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function formatMoney(val) {
  if (val === null || val === undefined || isNaN(val)) return '$0.00';
  return '$' + Number(val).toFixed(2);
}

function formatDate(str, format = 'short') {
  if (!str) return '—';
  try {
    const d = new Date(str);
    if (format === 'short') {
      return d.toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Guayaquil'
      });
    }
    return d.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'America/Guayaquil'
    });
  } catch {
    return str;
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * COMANDA
 */
function formatComandaTicket(data, width = 32) {
  const { comanda, table, items = [], notes = '', timestamp, bizInfo } = data;
  
  const line = () => '='.repeat(width);
  const sep = () => '-'.repeat(width);

  const center = (text) => {
    const str = String(text ?? '').trim();
    const pad = Math.max(0, Math.floor((width - str.length) / 2));
    return ' '.repeat(pad) + str;
  };

  const getItemName = (item) =>
    item?.producto ||
    item?.nombre ||
    item?.product_name ||
    item?.name ||
    item?.title ||
    item?.descripcion ||
    item?.description ||
    item?.producto_nombre ||
    'ITEM';

  const getItemQty = (item) => {
    const q = item?.cantidad ?? item?.quantity ?? item?.qty ?? 1;
    const n = parseInt(q, 10);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const getItemNotes = (item) => {
    const raw =
      item?.notas ??
      item?.notes ??
      item?.nota ??
      item?.note ??
      item?.observaciones ??
      item?.observacion ??
      item?.comments ??
      item?.comment;

    if (raw == null) return '';
    if (Array.isArray(raw)) return raw.filter(Boolean).join(' ');
    return String(raw).trim();
  };

  const mesaRaw = String(table ?? '').trim();
  const mesa = mesaRaw && /^\d+$/.test(mesaRaw) ? `MESA ${mesaRaw}` : (mesaRaw || 'LLEVAR');
  const ordenNum = String(comanda?.number || 'N/A').trim();
  const hora = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  const notasPedido = String(notes || '').trim();
  const itemsArr = Array.isArray(items) ? items : [];

  let out = '';
  out += line() + '\n';
  out += center(mesa) + '\n';
  out += sep() + '\n';
  out += center(`ORDEN ${ordenNum}`) + '\n';
  out += sep() + '\n';
  out += center(`LOCAL - ${hora}`) + '\n';
  out += line() + '\n';

  if (!itemsArr || itemsArr.length === 0) {
    out += center('SIN ITEMS') + '\n\n';
  } else {
    // Agrupar extras (notas con prefijo \x00) con su ítem principal
    const groups = [];
    let cur = null;
    itemsArr.forEach(item => {
      const rawNotes = String(getItemNotes(item));
      if (rawNotes.startsWith('__EXT__:')) {
        if (cur) cur.extras.push(item);
      } else {
        cur = { main: item, extras: [] };
        groups.push(cur);
      }
    });

    groups.forEach(({ main, extras }) => {
      const qty  = getItemQty(main);
      const name = String(getItemName(main)).trim().toUpperCase();
      const prefix = `${qty}x `;
      const nameLines = wrap(name, width - prefix.length);

      out += prefix + (nameLines[0] || '') + '\n';
      for (let i = 1; i < nameLines.length; i++) {
        out += '   ' + nameLines[i] + '\n';
      }

      const itemNotes = getItemNotes(main);
      const subLines = [];

      extras.forEach(extra => {
        const display = String(getItemNotes(extra)).replace('__EXT__:', '').trim().toUpperCase();
        wrap(display, width - 4).forEach(ln => { if (ln) subLines.push({ text: ln, type: 'extra' }); });
      });

      if (itemNotes) {
        itemNotes.split('\n').flatMap(l => wrap(l.trim(), width - 4) || ['']).forEach(ln => {
          if (ln) subLines.push({ text: ln, type: 'nota' });
        });
      }

      subLines.forEach(({ text, type }) => {
        if (type === 'nota') {
          out += '      * ' + text + ' *\n';
        } else {
          out += '      + ' + text + '\n';
        }
      });

      out += sep() + '\n';
    });

    out += '\n';
  }

  if (notasPedido) {
    out += center('NOTA') + '\n';
    wrap(notasPedido, width).forEach((ln) => (out += ln + '\n'));
    out += '\n';
  }

  out += line() + '\n';
  out += '\n\n'; // feed/corte

  return out;
}

/**
 * COMANDA MODIFICADA
 * data: { mesa, orden, tipoOrden, items: [{ nombre, cantidad, extras: [{name}], notas }] }
 */
function formatComandaModTicket(data, width = 32) {
  const { mesa, orden, tipoOrden = 'LOCAL', items = [] } = data;

  const line   = () => '='.repeat(width);
  const sep    = () => '-'.repeat(width);
  const center = (txt) => {
    const s = String(txt ?? '').trim();
    const pad = Math.max(0, Math.floor((width - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  const hora = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

  let out = '';
  out += line() + '\n';
  out += center('**** COMANDA MODIFICADA ****') + '\n';
  out += line() + '\n';
  if (mesa) {
    out += center(`MESA ${mesa}`) + '\n';
    out += sep() + '\n';
  }
  out += center(`ORDEN ${orden || 'N/A'}`) + '\n';
  out += sep() + '\n';
  out += center(`${tipoOrden} - ${hora}`) + '\n';
  out += line() + '\n';

  items.forEach(item => {
    const qty    = item.cantidad || item.quantity || 1;
    const nombre = String(item.nombre || item.product_name || 'Producto').toUpperCase();
    const extras = item.extras || [];
    const notas  = item.notas || item.notes || '';
    const prefix = `${qty}x `;
    const subW   = width - 6;

    const nameLines = wrap(nombre, width - prefix.length);
    out += prefix + (nameLines[0] || '') + '\n';
    for (let i = 1; i < nameLines.length; i++) out += '   ' + nameLines[i] + '\n';

    extras.forEach(e => {
      wrap(String(e.name || '').toUpperCase(), subW).forEach(ln => { out += '      + ' + ln + '\n'; });
    });
    if (notas) {
      wrap(notas, subW).forEach(ln => { out += '      * ' + ln + ' *\n'; });
    }
    out += sep() + '\n';
  });

  out += line() + '\n';
  out += '\n\n\n\n\n';
  return out;
}

/**
 * TICKET SIMPLE (sin facturación electrónica)
 * data: { bizInfo, orden, customer, items, total, recibido, cambio, printerFooter }
 * items: [{ description, quantity, price (con IVA), total }]
 */
function formatSimpleTicket(data, width = 42) {
  const {
    bizInfo,
    orden       = 'N/A',
    customer    = {},
    items       = [],
    total       = 0,
    recibido    = 0,
    cambio      = 0,
    printerFooter,
  } = data;

  const line = '='.repeat(width);
  const sep  = '-'.repeat(width);
  let t = '';

  // ── Encabezado ──────────────────────────────────────────────────────────────
  if (bizInfo?.trade_name) wrap(bizInfo.trade_name.toUpperCase(), width).forEach(l => (t += padCenter(l, width) + '\n'));
  if (bizInfo?.company_name && bizInfo.company_name !== bizInfo.trade_name)
    wrap(bizInfo.company_name, width).forEach(l => (t += padCenter(l, width) + '\n'));
  if (bizInfo?.ruc)     t += padCenter(`RUC: ${bizInfo.ruc}`, width) + '\n';
  if (bizInfo?.address) wrap(bizInfo.address, width).forEach(l => (t += padCenter(l, width) + '\n'));
  t += line + '\n';

  // ── Datos de la orden ────────────────────────────────────────────────────────
  const now   = new Date();
  const fecha = now.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Guayaquil' });
  const hora  = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Guayaquil' });

  t += `No. ORDEN: ${orden}\n`;
  if (customer.name) t += `CLIENTE: ${customer.name}\n`;
  t += `CI: ${customer.id || '9999999999'}\n`;
  t += `FECHA: ${fecha}   HORA: ${hora}\n`;
  t += sep + '\n';

  // ── Tabla: CANT | DESC | P.UNIT | TOTAL ─────────────────────────────────────
  const cW = 4, pW = 7, tW = 8;
  const dW = Math.max(6, width - cW - 1 - pW - 1 - tW - 2);

  t += padLeft('CANT', cW) + ' ' + padRight('DESC', dW) + ' ' + padLeft('P.UNIT', pW) + ' ' + padLeft('TOTAL', tW) + '\n';
  t += sep + '\n';

  items.forEach(item => {
    const qty   = Number(item.quantity || 1);
    const desc  = String(item.description || 'Producto').toUpperCase();
    const price = Number(item.price || 0);
    const tot   = Number(item.total ?? (qty * price));

    const descLines = wrap(desc, dW);
    t += padLeft(String(qty), cW) + ' ' + padRight(descLines[0] || '', dW) + ' ' + padLeft(formatMoney(price), pW) + ' ' + padLeft(formatMoney(tot), tW) + '\n';
    for (let i = 1; i < descLines.length; i++) t += ' '.repeat(cW + 1) + descLines[i] + '\n';
  });

  t += line + '\n';

  // ── Totales ──────────────────────────────────────────────────────────────────
  const mW   = 10;
  const labW = width - mW;
  const row  = (label, val) => padRight(label, labW) + padLeft(formatMoney(val), mW) + '\n';

  t += row('TOTAL:', total);
  if (recibido > 0) t += row('RECIBIDO:', recibido);
  if (recibido > 0) t += row('CAMBIO:', Math.max(0, cambio));
  t += line + '\n';

  // ── Pie ─────────────────────────────────────────────────────────────────────
  if (printerFooter) t += padCenter(printerFooter, width) + '\n';
  t += '\n\n';

  return t;
}

/**
 * FACTURA — formato SRI Ecuador
 * data: { bizInfo, invoice, customer, items, subtotal_15, subtotal_0, discount, subtotal, tax, taxRate, total, payment, printerFooter }
 * invoice: { number, auth_number, auth_date, valid_until, date, remission_guide, notes }
 * payment: { cash, card, other }
 */
function formatInvoiceTicket(data, width = 42) {
  const {
    bizInfo,
    invoice,
    customer,
    items = [],
    subtotal_15 = 0,
    subtotal_0  = 0,
    discount    = 0,
    subtotal    = 0,
    tax         = 0,
    taxRate,
    total       = 0,
    payment     = null,
    recibido    = 0,
    cambio      = 0,
    metodoPago  = null,
    printerFooter,
  } = data;

  const line = '='.repeat(width);
  const sep  = '-'.repeat(width);
  let t = '';

  // ─── Encabezado negocio ───────────────────────────────────────────────────
  if (bizInfo?.trade_name) {
    wrap(bizInfo.trade_name.toUpperCase(), width).forEach(l => (t += padCenter(l, width) + '\n'));
  }
  if (bizInfo?.company_name) {
    wrap(bizInfo.company_name, width).forEach(l => (t += padCenter(l, width) + '\n'));
  }
  if (bizInfo?.ruc) {
    t += padCenter(`RUC: ${bizInfo.ruc}`, width) + '\n';
  }
  t += line + '\n';

  // ─── FACTURA + número + autorización SRI ─────────────────────────────────
  t += padCenter('FACTURA', width) + '\n';
  t += padCenter(`No. ${invoice?.number || 'N/A'}`, width) + '\n';
  if (invoice?.auth_number) {
    t += padCenter(`AUT. SRI: ${invoice.auth_number}`, width) + '\n';
  }
  if (invoice?.auth_date) {
    t += padCenter(`F. AUT.: ${formatDate(invoice.auth_date, 'short')}`, width) + '\n';
  }
  t += sep + '\n';

  // ─── Dirección ───────────────────────────────────────────────────────────
  if (bizInfo?.address) {
    wrap(`Dir.: ${bizInfo.address}`, width).forEach(l => (t += l + '\n'));
  }
  if (bizInfo?.address_branch) {
    wrap(`Sucursal: ${bizInfo.address_branch}`, width).forEach(l => (t += l + '\n'));
  }
  if (invoice?.valid_until) {
    t += `Válido hasta: ${formatDate(invoice.valid_until, 'short')}\n`;
  }
  t += line + '\n';

  // ─── Adquirente ──────────────────────────────────────────────────────────
  if (customer?.name) t += `CLIENTE: ${customer.name}\n`;
  if (customer?.id)   t += `RUC/CI: ${customer.id}\n`;
  if (invoice?.date)  t += `F. Emisión: ${formatDate(invoice.date, 'short')}\n`;
  if (invoice?.remission_guide) t += `Guía Rem.: ${invoice.remission_guide}\n`;
  t += sep + '\n';

  // ─── Tabla de ítems: QTY(4) sp DESCRIPCIÓN(dW) sp P.UNIT(8) sp TOTAL(9) ─
  const qW = 4, pW = 8, tW = 9;
  const dW = width - qW - 1 - pW - 1 - tW - 2;

  t += padLeft('CANT.', qW) + ' ' + padRight('DESC.', dW) + ' ' + padLeft('P.UNIT', pW) + ' ' + padLeft('TOTAL', tW) + '\n';
  t += sep + '\n';

  items.forEach(item => {
    const qty   = Number(item.quantity   || item.cantidad   || 1);
    const desc  = String(item.description || item.descripcion || item.nombre || item.name || 'Producto');
    const price = Number(item.price       || item.unit_price  || item.precio  || 0);
    const tot   = Number(item.total       ?? (qty * price));

    const descLines = wrap(desc.toUpperCase(), dW);
    t += padLeft(String(qty), qW) + ' ' + padRight(descLines[0] || '', dW) + ' ' + padLeft(formatMoney(price), pW) + ' ' + padLeft(formatMoney(tot), tW) + '\n';
    for (let i = 1; i < descLines.length; i++) {
      t += ' '.repeat(qW + 1) + descLines[i] + '\n';
    }
  });

  t += sep + '\n';

  // ─── Totales SRI ─────────────────────────────────────────────────────────
  const mW    = 12;
  const labW  = width - mW;
  const row   = (label, val) => padRight(label, labW) + padLeft(formatMoney(val), mW) + '\n';

  const hasSplit = (subtotal_15 + subtotal_0) > 0;
  if (hasSplit) {
    const vatLabel = taxRate ? `${Math.round(taxRate * 100)}%` : '15%';
    t += row(`SUBTOTAL ${vatLabel}:`, subtotal_15 || 0);
    t += row('SUBTOTAL 0%:',         subtotal_0  || 0);
  }
  if (discount > 0) t += row('DESCUENTO:', discount);
  t += row('SUBTOTAL:', subtotal || (subtotal_15 + subtotal_0 - discount));
  if (tax > 0) {
    const vatLabel = taxRate ? `${Math.round(taxRate * 100)}%` : '15%';
    t += row(`IVA ${vatLabel}:`, tax);
  }
  t += row('VALOR TOTAL:', total);
  t += line + '\n';

  // ─── Forma de pago ───────────────────────────────────────────────────────
  if (payment) {
    t += padCenter('FORMA DE PAGO', width) + '\n';
    t += sep + '\n';
    if (payment.cash  !== undefined) t += row('  Efectivo:',        payment.cash  || 0);
    if (payment.card  !== undefined) t += row('  Tarjeta Créd/Déb:', payment.card || 0);
    if (payment.other !== undefined) t += row('  Otros:',           payment.other || 0);
    t += line + '\n';
  }

  // ─── Recibido / Cambio (solo pagos en efectivo o mixto) ──────────────────
  if ((metodoPago === 'cash' || metodoPago === 'mixto') && recibido > 0) {
    t += row('RECIBIDO:', recibido);
    t += row('CAMBIO:',   Math.max(0, cambio));
    t += line + '\n';
  }

  // ─── Notas ───────────────────────────────────────────────────────────────
  if (invoice?.notes) {
    t += `Notas: ${invoice.notes}\n`;
  }

  // ─── Firma adquirente ────────────────────────────────────────────────────
  t += '\n' + '_'.repeat(Math.floor(width / 2)) + '\n';
  t += 'Firma adquirente\n';
  t += 'Recibi Conforme\n';
  t += sep + '\n';

  // ─── Footer ──────────────────────────────────────────────────────────────
  if (printerFooter) {
    t += padCenter(printerFooter, width) + '\n';
  }

  t += padCenter('Original: Adquirente / Copia: Emisor', width) + '\n';
  t += line + '\n\n';

  return t;
}

/**
 * RECIBO
 */
function formatReceiptTicket(data, width = 42) {
  const { bizInfo, receipt, customer, items = [], subtotal = 0, tax = 0, total = 0, paymentMethod = 'EFECTIVO', printerFooter } = data;
  const line = '='.repeat(width);
  const subline = '-'.repeat(width);

  let ticket = '';

  if (bizInfo?.company_name) {
    ticket += padCenter(bizInfo.company_name, width) + '\n';
  }
  if (bizInfo?.address) {
    ticket += padCenter(bizInfo.address, width) + '\n';
  }
  if (bizInfo?.phone) {
    ticket += padCenter(`Tel: ${bizInfo.phone}`, width) + '\n';
  }
  ticket += padCenter('RECIBO', width) + '\n';
  ticket += padCenter(`#${receipt?.number || 'N/A'}`, width) + '\n';
  ticket += line + '\n\n';

  if (receipt?.operator) {
    ticket += padRight(`Operador: ${receipt.operator}`, width) + '\n';
  }
  if (receipt?.timestamp) {
    ticket += padRight(`${formatDate(receipt.timestamp, 'long')}`, width) + '\n';
  }
  ticket += '\n' + subline + '\n\n';

  ticket += padRight('DESCRIPCIÓN', width - 12) + padLeft('MONTO', 12) + '\n';
  ticket += subline + '\n';

  items.forEach(item => {
    const itemTotal = (item.quantity || 1) * (item.price || 0);
    const desc = `${item.description || 'Producto'} x${item.quantity || 1}`;
    ticket += padRight(desc, width - 12) + padLeft(formatMoney(itemTotal), 12) + '\n';
  });

  ticket += '\n' + subline + '\n';
  ticket += padRight('SUBTOTAL:', width - 12) + padLeft(formatMoney(subtotal), 12) + '\n';
  if (tax > 0) {
    ticket += padRight('IMPUESTO:', width - 12) + padLeft(formatMoney(tax), 12) + '\n';
  }
  ticket += padRight('TOTAL:', width - 12) + padLeft(formatMoney(total), 12) + '\n';
  ticket += padRight(`Pago: ${paymentMethod}`, width) + '\n';
  ticket += line + '\n\n';

  if (printerFooter) {
    ticket += padCenter(printerFooter, width) + '\n';
  }
  return ticket;
}

/**
 * CIERRE DE CAJA
 *
 * data: {
 *   bizInfo:   { company_name, trade_name, ruc, address, phone }
 *   close:     { cash_register_id, session_id, opening_user, closing_user,
 *                opening_date, closing_date, remarks }
 *   sales:     { transaction_count, invoice_count, receipt_count, void_count,
 *                subtotal_15, subtotal_0, discount, subtotal_net,
 *                tax, tax_rate, total }
 *   payments:  { cash:     { system, counted, diff },
 *                transfer: { system, counted, diff },
 *                card:     { system, counted, diff },
 *                other:    { system, counted, diff } }
 *   cashFlow:  { opening_float, extra_income, withdrawals,
 *                expected_cash, counted_cash, cash_diff }
 *   totals:    { system_total, counted_total, total_diff }
 *   summary:   legacy flat object (backward-compat)
 *   printerFooter
 * }
 */
/**
 * CIERRE DE CAJA - Formato profesional con gastos
 */
/**
 * CIERRE DE CAJA - Formato profesional con gastos
 */
function formatCashCloseTicket(data, width = 48) {
  const { bizInfo, close, sales, payments, cashFlow, totals, summary, expenses = [], printerFooter } = data;

  const line = '='.repeat(width);
  const doubleLine = '═'.repeat(width);
  const sep = '-'.repeat(width);
  const dotted = '·'.repeat(width);
  const mW = 14;
  const labW = width - mW;

  const row = (label, val, opts = {}) => {
    const money = opts.raw ? String(val ?? '') : formatMoney(val);
    return padRight(label, labW) + padLeft(money, mW) + '\n';
  };

  const sectionTitle = (title) =>
    '\n' + dotted + '\n' + padCenter(title, width) + '\n' + dotted + '\n';

  let t = '';

  // ============ ENCABEZADO DEL NEGOCIO ============
  t += line + '\n';
  
  if (bizInfo?.trade_name) {
    t += padCenter(bizInfo.trade_name.toUpperCase(), width) + '\n';
  }
  
  if (bizInfo?.company_name && bizInfo.company_name !== bizInfo?.trade_name) {
    t += padCenter(bizInfo.company_name, width) + '\n';
  }
  
  if (bizInfo?.ruc) {
    t += padCenter(`RUC: ${bizInfo.ruc}`, width) + '\n';
  }
  
  if (bizInfo?.address) {
    t += padCenter(bizInfo.address, width) + '\n';
  }
  
  if (bizInfo?.phone || bizInfo?.email) {
    const contact = [bizInfo.phone, bizInfo.email].filter(Boolean).join(' / ');
    t += padCenter(contact, width) + '\n';
  }
  
  t += line + '\n';
  t += padCenter('*** C I E R R E   D E   C A J A ***', width) + '\n';
  t += doubleLine + '\n\n';

  // ============ DATOS DE LA SESIÓN ============
  t += padCenter('DATOS DE LA SESIÓN', width) + '\n';
  t += sep + '\n';
  
  if (close?.cash_register_id) {
    t += `  ${padRight('Caja No.:', 18)} ${close.cash_register_id}\n`;
  }
  if (close?.session_id) {
    t += `  ${padRight('Sesión ID:', 18)} ${close.session_id}\n`;
  }
  if (close?.opening_user) {
    t += `  ${padRight('Apertura por:', 18)} ${close.opening_user}\n`;
  }
  if (close?.closing_user || close?.closing_user_id) {
    const nombreReal = close.closing_user_name || close.closing_user || close.closing_user_id;
    t += `  ${padRight('Cierre por:', 18)} ${nombreReal}\n`;
  }
  if (close?.opening_date) {
    t += `  ${padRight('Fecha apertura:', 18)} ${formatDate(close.opening_date, 'long')}\n`;
  }
  if (close?.closing_date) {
    t += `  ${padRight('Fecha cierre:', 18)} ${formatDate(close.closing_date, 'long')}\n`;
  }
  
  t += sep + '\n\n';

  // ============ RESUMEN DE VENTAS (simplificado - solo TOTAL VENTAS) ============
  t += padCenter('R E S U M E N   D E   V E N T A S', width) + '\n';
  t += dotted + '\n';

  if (sales) {
    // Solo Transacciones y No. de comandas
    if (sales.transaction_count != null) {
      t += row('Transacciones:', sales.transaction_count, { raw: true });
    }
    if (sales.comandas_count != null) {
      t += row('No. de comandas:', sales.comandas_count, { raw: true });
    } else if (sales.invoice_count != null) {
      t += row('No. de comandas:', sales.invoice_count, { raw: true });
    }

    t += dotted + '\n';
    
    // SOLO TOTAL VENTAS (sin desglose de IVA)
    t += row('💰 TOTAL VENTAS:', sales.total ?? 0);
  }

  // ============ FORMAS DE PAGO ============
  t += sectionTitle('F O R M A S   D E   P A G O');

  const paymentSection = (label, icon, block) => {
    if (!block) return;
    const { system, counted, diff } = block;
    t += `${icon} ${label}\n`;
    t += row('  Sistema:', system ?? 0);
    t += row('  Contado:', counted ?? 0);
    const d = diff ?? (Number(counted ?? 0) - Number(system ?? 0));
    const diffIcon = d >= 0 ? '🟢' : '🔴';
    t += row(`  Diferencia ${diffIcon}:`, Math.abs(d));
    t += sep + '\n';
  };

  if (payments) {
    paymentSection('EFECTIVO', '💵', payments.cash);
    paymentSection('TARJETA', '💳', payments.card);
    paymentSection('TRANSFERENCIA', '🏦', payments.transfer);
    if (payments.other && (payments.other.system ?? 0) + (payments.other.counted ?? 0) > 0) {
      paymentSection('OTROS', '📝', payments.other);
    }
  } else if (summary) {
    paymentSection('EFECTIVO', '💵', { system: summary.cash_system, counted: summary.cash_counted, diff: summary.diff_cash });
    paymentSection('TRANSFERENCIA', '🏦', { system: summary.transfer_system, counted: summary.transfer_counted, diff: summary.diff_transfer });
    paymentSection('TARJETA', '💳', { system: summary.card_system, counted: summary.card_counted, diff: summary.diff_card });
  }

  // ============ GASTOS DEL DÍA ============
  if (expenses && expenses.length > 0) {
    t += sectionTitle('G A S T O S   D E L   D Í A');
    
    let totalGastos = 0;
    expenses.forEach(expense => {
      const monto = Number(expense.amount || expense.monto || 0);
      totalGastos += monto;
      const concepto = expense.concept || expense.description || expense.concepto || 'Gasto';
      t += `  📝 ${padRight(concepto, width - 20)} ${padLeft(formatMoney(monto), 14)}\n`;
    });
    
    t += dotted + '\n';
    t += row('💰 TOTAL GASTOS:', totalGastos);
  }

  // ============ MOVIMIENTO DE CAJA ============
  if (cashFlow) {
    t += sectionTitle('M O V I M I E N T O   D E   C A J A');
    
    if (cashFlow.opening_float != null) {
      t += row('💰 Fondo inicial:', cashFlow.opening_float);
    }
    if (cashFlow.extra_income != null && cashFlow.extra_income > 0) {
      t += row('📈 Ingresos extra:', cashFlow.extra_income);
    }
    
    // Mostrar gastos totales si existen
    const totalGastos = expenses.reduce((sum, e) => sum + Number(e.amount || e.monto || 0), 0);
    if (totalGastos > 0) {
      t += row('📉 Total gastos:', totalGastos);
    }
    
    if (cashFlow.withdrawals != null && cashFlow.withdrawals > 0) {
      t += row('📉 Egresos/Retiros:', cashFlow.withdrawals);
    }
    
    t += dotted + '\n';
    
    if (cashFlow.expected_cash != null) {
      t += row('📊 Efectivo esperado:', cashFlow.expected_cash);
    }
    if (cashFlow.counted_cash != null) {
      t += row('💵 Efectivo contado:', cashFlow.counted_cash);
    }
    
    const df = cashFlow.cash_diff ?? (Number(cashFlow.counted_cash ?? 0) - Number(cashFlow.expected_cash ?? 0));
    const diffIcon = df >= 0 ? '🟢 SOBRANTE:' : '🔴 FALTANTE:';
    t += row(diffIcon, Math.abs(df));
  }

  // ============ TOTALES GENERALES ============
  t += sectionTitle('T O T A L E S   G E N E R A L E S');

  if (totals) {
    t += row('💰 Total sistema:', totals.system_total ?? 0);
    t += row('💵 Total contado:', totals.counted_total ?? 0);
    const td = totals.total_diff ?? (Number(totals.counted_total ?? 0) - Number(totals.system_total ?? 0));
    const totalIcon = td >= 0 ? '✅ CUADRADO (+)' : '❌ DESCUADRE (-)';
    t += row(totalIcon, Math.abs(td));
  } else if (summary) {
    t += row('💰 Total sistema:', summary.total_system ?? 0);
    t += row('💵 Total contado:', summary.total_counted ?? 0);
    const td = summary.diff_total ?? (Number(summary.total_counted ?? 0) - Number(summary.total_system ?? 0));
    const totalIcon = td >= 0 ? '✅ CUADRADO (+)' : '❌ DESCUADRE (-)';
    t += row(totalIcon, Math.abs(td));
  }

  t += line + '\n';

  // ============ OBSERVACIONES ============
  if (close?.remarks && close.remarks.trim()) {
    t += '\n' + padCenter('📝 O B S E R V A C I O N E S', width) + '\n';
    t += dotted + '\n';
    wrap(close.remarks, width).forEach(l => (t += l + '\n'));
    t += dotted + '\n';
  }

  // ============ FIRMA CON NOMBRE REAL ============
  t += '\n' + dotted + '\n';
  t += padCenter('F I R M A   D E L   R E S P O N S A B L E', width) + '\n';
  t += dotted + '\n\n';
  t += padCenter('_________________________', width) + '\n';
  
  // Obtener el nombre real del responsable
  const nombreResponsable = close?.closing_user_name || 
                           close?.closing_user || 
                           close?.closing_user_id || 
                           getOperatorName() ||
                           'Responsable';
  
  t += padCenter(nombreResponsable, width) + '\n\n';

  // ============ PIE DE PÁGINA ============
  t += dotted + '\n';
  t += padCenter(`🕐 Impreso: ${formatDateTime()}`, width) + '\n';
  t += padCenter(`👤 Usuario: ${getOperatorName()}`, width) + '\n';
  
  if (printerFooter) {
    t += padCenter(printerFooter, width) + '\n';
  }
  
  t += line + '\n';
  t += padCenter('¡Gracias por su trabajo!', width) + '\n';
  t += padCenter(`Cierre #${Date.now()}`, width) + '\n';
  t += line + '\n\n';

  return t;
}

/**
 * ROL DE PAGO
 */
function formatPayrollTicket(data, width = 48) {
  const { 
    bizInfo, 
    employee, 
    payroll, 
    period, 
    items = [], 
    deductions = [], 
    totalEarnings = 0, 
    totalDeductions = 0, 
    netSalary = 0, 
    printerFooter,
    paymentMethod = "EFECTIVO"
  } = data;
  
  const line = '='.repeat(width);
  const doubleLine = '═'.repeat(width);
  const subline = '-'.repeat(width);
  const dotted = '·'.repeat(width);

  let ticket = '';

  // ============ ENCABEZADO ============
  ticket += line + '\n';
  
  if (bizInfo?.trade_name) {
    ticket += padCenter(bizInfo.trade_name.toUpperCase(), width) + '\n';
  }
  
  if (bizInfo?.company_name && bizInfo.company_name !== bizInfo?.trade_name) {
    ticket += padCenter(bizInfo.company_name, width) + '\n';
  }
  
  if (bizInfo?.ruc) {
    ticket += padCenter(`RUC: ${bizInfo.ruc}`, width) + '\n';
  }
  
  if (bizInfo?.address) {
    ticket += padCenter(bizInfo.address, width) + '\n';
  }
  
  if (bizInfo?.phone || bizInfo?.email) {
    const contact = [bizInfo.phone, bizInfo.email].filter(Boolean).join(' / ');
    ticket += padCenter(contact, width) + '\n';
  }
  
  ticket += line + '\n';
  ticket += padCenter('R E C I B O   D E   N Ó M I N A', width) + '\n';
  ticket += doubleLine + '\n\n';

  // ============ DATOS DEL EMPLEADO ============
  ticket += padCenter('DATOS DEL EMPLEADO', width) + '\n';
  ticket += subline + '\n';
  
  if (employee?.name) {
    ticket += `  ${padRight('Nombre:', 15)} ${employee.name}\n`;
  }
  if (employee?.id) {
    ticket += `  ${padRight('Cédula:', 15)} ${employee.id}\n`;
  }
  if (employee?.position) {
    ticket += `  ${padRight('Cargo:', 15)} ${employee.position}\n`;
  }
  if (employee?.department) {
    ticket += `  ${padRight('Departamento:', 15)} ${employee.department}\n`;
  }
  
  // ============ DATOS DEL PERÍODO ============
  ticket += `\n  ${padRight('Período:', 15)} ${period}\n`;
  
  if (payroll?.payment_type === 'hourly') {
    ticket += `  ${padRight('Horas trabajadas:', 15)} ${(payroll.total_hours || 0).toFixed(2)} horas\n`;
    if (payroll.extra_hours > 0) {
      ticket += `  ${padRight('Horas extras (150%):', 15)} ${(payroll.extra_hours || 0).toFixed(2)} horas\n`;
    }
    ticket += `  ${padRight('Valor por hora:', 15)} ${formatMoney(payroll.hourly_rate)}\n`;
  } else {
    ticket += `  ${padRight('Días trabajados:', 15)} ${(payroll.days_worked || 1).toFixed(0)} días\n`;
    ticket += `  ${padRight('Sueldo diario:', 15)} ${formatMoney(payroll.daily_rate)}\n`;
  }
  
  ticket += `  ${padRight('Fecha emisión:', 15)} ${formatDate(new Date().toISOString(), 'short')}\n`;
  ticket += subline + '\n\n';

  // ============ INGRESOS ============
  ticket += padCenter('I N G R E S O S', width) + '\n';
  ticket += dotted + '\n';
  
  if (items.length > 0) {
    items.forEach(item => {
      const concept = item.concept.length > 25 ? item.concept.substring(0, 22) + '...' : item.concept;
      ticket += `  ${padRight(concept, width - 14)} ${padLeft(formatMoney(item.amount), 12)}\n`;
    });
  } else {
    // Ingreso base por defecto
    const baseConcept = payroll?.payment_type === 'hourly' 
      ? `Pago por horas (${payroll.total_hours || 0}h)`
      : `Sueldo por ${payroll.days_worked || 1} días`;
    ticket += `  ${padRight(baseConcept, width - 14)} ${padLeft(formatMoney(totalEarnings), 12)}\n`;
  }
  
  ticket += dotted + '\n';
  ticket += `  ${padRight('TOTAL INGRESOS', width - 14)} ${padLeft(formatMoney(totalEarnings), 12)}\n\n`;

  // ============ DEDUCCIONES ============
  if (deductions.length > 0) {
    ticket += padCenter('D E D U C C I O N E S', width) + '\n';
    ticket += dotted + '\n';
    
    deductions.forEach(deduct => {
      const concept = deduct.concept.length > 25 ? deduct.concept.substring(0, 22) + '...' : deduct.concept;
      ticket += `  ${padRight(concept, width - 14)} ${padLeft(formatMoney(deduct.amount), 12)}\n`;
    });
    
    ticket += dotted + '\n';
    ticket += `  ${padRight('TOTAL', width - 14)} ${padLeft(formatMoney(totalDeductions), 12)}\n\n`;
  }

  // ============ TOTAL NETO ============
  ticket += line + '\n';
  ticket += padCenter('TOTAL A PAGAR', width) + '\n';
  ticket += line + '\n';
  ticket += `\n  ${padRight('NETO:', 20)} ${formatMoney(netSalary)}\n`;
  ticket += `\n  ${padRight('Monto en letras:', 20)} ${numberToWords(Math.floor(netSalary))} DÓLARES\n`;
  ticket += line + '\n\n';

  // ============ FORMA DE PAGO ============
  ticket += padCenter('FORMA DE PAGO', width) + '\n';
  ticket += subline + '\n';
  
  const paymentIcons = {
    'CASH': '💵',
    'EFECTIVO': '💵',
    'CARD': '💳',
    'TARJETA': '💳',
    'TRANSFER': '🏦',
    'TRANSFERENCIA': '🏦',
    
  };
  
  const icon = paymentIcons[paymentMethod.toUpperCase()] || '💰';
  ticket += `  ${icon}  ${paymentMethod}\n`;
  ticket += subline + '\n\n';

  // ============ FIRMAS ============
  ticket += dotted + '\n';
  ticket += padCenter('FIRMAS DE CONFORMIDAD', width) + '\n';
  ticket += dotted + '\n\n';
  
  ticket += `${padRight('', width - 20)} ${padRight('', 20)}\n`;
  ticket += `${padRight('_________________________', width - 20)} ${padRight('_________________________', 20)}\n`;
  ticket += `${padRight('Firma del empleado', width - 20)} ${padRight('Firma del empleador', 20)}\n\n`;

  // ============ PIE DE PÁGINA ============
  if (printerFooter) {
    ticket += dotted + '\n';
    ticket += padCenter(printerFooter, width) + '\n';
  }
  
  ticket += dotted + '\n';
  ticket += padCenter(`Impreso: ${formatDateTime()}`, width) + '\n';
  ticket += padCenter(`Usuario: ${getOperatorName()}`, width) + '\n';
  ticket += line + '\n';
  ticket += padCenter('¡Gracias por tu trabajo!', width) + '\n';
  ticket += padCenter(`Recibo #${Date.now()}`, width) + '\n';
  ticket += line + '\n\n';

  return ticket;
}

// ============ FUNCIONES AUXILIARES ============

function formatDateTime() {
  return new Date().toLocaleString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

function getOperatorName() {
  try {
    const user = JSON.parse(localStorage.getItem('idonUser') || '{}');
    return user.nombre || user.name || user.username || 'Operador';
  } catch {
    return 'Operador';
  }
}

function numberToWords(num) {
  const unidades = ['CERO', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  
  if (num === 0) return 'CERO';
  if (num < 10) return unidades[num];
  if (num < 20) return especiales[num - 10];
  if (num < 100) {
    const decena = Math.floor(num / 10);
    const unidad = num % 10;
    if (unidad === 0) return decenas[decena];
    return decenas[decena] + ' Y ' + unidades[unidad];
  }
  if (num < 1000) {
    const centena = Math.floor(num / 100);
    const resto = num % 100;
    if (centena === 1) return 'CIEN' + (resto > 0 ? ' ' + numberToWords(resto) : '');
    const letras = { 2: 'DOSCIENTOS', 3: 'TRESCIENTOS', 4: 'CUATROCIENTOS', 5: 'QUINIENTOS', 6: 'SEISCIENTOS', 7: 'SETECIENTOS', 8: 'OCHOCIENTOS', 9: 'NOVECIENTOS' };
    return letras[centena] + (resto > 0 ? ' ' + numberToWords(resto) : '');
  }
  return numberToWords(Math.floor(num / 1000)) + ' MIL' + (num % 1000 > 0 ? ' ' + numberToWords(num % 1000) : '');
}

/**
 * ORDEN DE COMPRA
 */
function formatPurchaseTicket(data, width = 42) {
  const { bizInfo, purchase, supplier, items = [], subtotal = 0, tax = 0, total = 0, purchaseDate, printerFooter } = data;
  const line = '='.repeat(width);
  const subline = '-'.repeat(width);

  let ticket = '';

  if (bizInfo?.company_name) {
    ticket += padCenter(bizInfo.company_name, width) + '\n';
  }
  ticket += padCenter('ORDEN DE COMPRA', width) + '\n';
  ticket += padCenter(`#${purchase?.number || 'N/A'}`, width) + '\n';
  ticket += line + '\n\n';

  if (supplier?.name) {
    ticket += padRight(`Proveedor: ${supplier.name}`, width) + '\n';
  }
  if (supplier?.contact) {
    ticket += padRight(`Contacto: ${supplier.contact}`, width) + '\n';
  }
  if (purchaseDate) {
    ticket += padRight(`Fecha: ${formatDate(purchaseDate, 'short')}`, width) + '\n';
  }
  ticket += '\n' + subline + '\n\n';

  ticket += padRight('PRODUCTO', width - 15) + padLeft('COSTO', 15) + '\n';
  ticket += subline + '\n';

  items.forEach(item => {
    const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
    const desc = `${item.description || 'Producto'} x${item.quantity || 0}`;
    ticket += padRight(desc, width - 15) + padLeft(formatMoney(itemTotal), 15) + '\n';
  });

  ticket += '\n' + subline + '\n';
  ticket += padRight('SUBTOTAL:', width - 15) + padLeft(formatMoney(subtotal), 15) + '\n';
  if (tax > 0) {
    ticket += padRight('IVA:', width - 15) + padLeft(formatMoney(tax), 15) + '\n';
  }
  ticket += padRight('TOTAL:', width - 15) + padLeft(formatMoney(total), 15) + '\n';
  ticket += line + '\n\n';

  if (purchase?.notes) {
    ticket += `Notas: ${purchase.notes}\n\n`;
  }

  if (printerFooter) {
    ticket += padCenter(printerFooter, width) + '\n';
  }
  ticket += padCenter(formatDate(new Date().toISOString(), 'long'), width) + '\n\n';

  return ticket;
}