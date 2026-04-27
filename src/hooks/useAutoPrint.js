import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

const POLL_INTERVAL = 4000; // cada 4 segundos

export function useAutoPrint({ businessId, enabled = true }) {
  const { print }      = usePrinterService();
  const printRef       = useRef(print);
  const printingRef    = useRef(false); // evita solapamiento de polls

  useEffect(() => { printRef.current = print; }, [print]);

  // ── 1. Conectar QZ Tray ───────────────────────────────────────────────────
  const connectQZ = useCallback(async () => {
    try {
      if (qz.websocket.isActive()) return true;

      const certRes  = await fetchWithAuth('/api/print/cert');
      const certData = await certRes.text();

      qz.security.setCertificatePromise(async () => certData);
      qz.security.setSignaturePromise(async (toSign) => {
        const r = await fetchWithAuth('/api/print/sign', {
          method: 'POST',
          body: JSON.stringify({ data: toSign }),
        });
        const { signature } = await r.json();
        return signature;
      });

      await qz.websocket.connect({
        host: 'localhost',
        port: { secure: [8183, 8184], insecure: [8182] },
        usingSecure: window.location.protocol === 'https:',
      });
      console.log('[AutoPrint] QZ Tray conectado ✅');
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (enabled) connectQZ();
  }, [enabled, connectQZ]);

  // ── 2. Imprimir una orden ─────────────────────────────────────────────────
  const printOrder = useCallback(async (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    await printRef.current('printer_ticket', 'comanda', {
      comanda: { number: order.order_number || order.numero_pedido || 'N/A' },
      table:   order.mesa_numero ?? order.numero_mesa,
      items:   items.map(i => ({
        product_name: i.product_name || i.nombre || i.name || 'Producto',
        quantity:     i.quantity     || i.cantidad || 1,
        notes:        i.notes        || i.notas   || '',
      })),
      notes: order.notas || order.notes || '',
    });
  }, []);

  // ── 3. Polling — mecanismo principal ──────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const poll = async () => {
      if (printingRef.current) return;

      // Si QZ no está activo, intentar reconectar
      if (!qz.websocket.isActive()) {
        const ok = await connectQZ();
        if (!ok) return; // este dispositivo no tiene impresora
      }

      try {
        printingRef.current = true;
        const res = await fetchWithAuth('/api/ordenes/unprinted');
        if (!res.ok) return;

        const orders = await res.json();
        if (!orders.length) return;

        const printed = [];
        for (const order of orders) {
          try {
            await printOrder(order);
            printed.push(order.id);
            console.log('[AutoPrint] Comanda impresa:', order.order_number);
          } catch (err) {
            console.error('[AutoPrint] Error imprimiendo orden', order.order_number, err);
          }
        }

        if (printed.length) {
          await fetchWithAuth('/api/ordenes/mark-printed', {
            method: 'POST',
            body: JSON.stringify({ order_ids: printed }),
          });
        }
      } catch (err) {
        console.error('[AutoPrint] Error en poll:', err);
      } finally {
        printingRef.current = false;
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    poll(); // ejecutar inmediatamente al montar
    return () => clearInterval(interval);
  }, [enabled, businessId, connectQZ, printOrder]);

  // ── 4. Socket — respuesta inmediata (bonus sobre el polling) ─────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () =>
      console.log('[AutoPrint] Socket conectado — business:', businessId)
    );

    // El socket adelanta la impresión; el polling la confirma/recupera
    socket.on('new_order', async (data) => {
      if (printingRef.current) return;
      if (!qz.websocket.isActive()) {
        const ok = await connectQZ();
        if (!ok) return;
      }
      try {
        const order = { ...(data?.pedido || data), items: data?.items || [] };
        await printOrder(order);
        await fetchWithAuth('/api/ordenes/mark-printed', {
          method: 'POST',
          body: JSON.stringify({ order_ids: [order.id] }),
        });
        console.log('[AutoPrint] Comanda impresa via socket:', order.order_number);
      } catch (err) {
        console.error('[AutoPrint] Error socket print:', err);
        // El polling recuperará esta orden en el siguiente ciclo
      }
    });

    return () => socket.disconnect();
  }, [enabled, businessId, connectQZ, printOrder]);
}
