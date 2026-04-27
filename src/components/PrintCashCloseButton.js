import React from 'react';
import qz from 'qz-tray';
import { buildCashCloseText } from '../Helper/buildCashCloseText';

export default function PrintCashCloseButton({ close, datos, bizInfo, printerConnected, printerTicket, className }) {
  const handlePrint = async () => {
    if (!printerTicket || !printerTicket.name) {
      alert('IMPRESORAS NO DETECTADAS, PRIMERO AGREGUE UNA IMPRESORA PARA IMPRIMIR');
      return;
    }
    if (!close) return;

    const printerName = printerTicket.name || 'POS-58';
    const width       = printerTicket.width || 32;
    const footer      = printerTicket.footer || null;

    const text = buildCashCloseText(close, datos, close.closing_user_id, bizInfo, width, footer);

    if (printerConnected) {
      try {
        const config = qz.configs.create(printerName);
        await qz.print(config, [text]);
        return;
      } catch (e) {
        alert('Error al imprimir por QZ Tray, usando impresión estándar.');
      }
    }
    // Fallback: imprime HTML
    const escaped = text
      .split('\n').map(l => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('\n');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Cierre Caja</title>
      <style>@page { margin:3mm; size:${width*2}mm auto; }
      body { font-family:'Courier New',monospace; font-size:10pt; white-space:pre; width:${width*1.6}mm; margin:0 auto; color:#000; line-height:1.3; }
      </style></head><body>${escaped}</body></html>`;
    const w = window.open('', '_blank', 'width=340,height=700,toolbar=0,menubar=0');
    if (!w) { alert('Permite ventanas emergentes para imprimir'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  };

  return (
    <button className={className || "modern-btn btn-print"} onClick={handlePrint}>
      Imprimir cierre de caja
    </button>
  );
}