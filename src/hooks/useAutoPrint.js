import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

const POLL_INTERVAL = 4000;

export function useAutoPrint({ businessId, enabled = true }) {
  const { print }   = usePrinterService();
  const printRef    = useRef(print);
  const printingRef = useRef(false);

  useEffect(() => { printRef.current = print; }, [print]);

  // ── Imprimir una orden ────────────────────────────────────────────────────
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

  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const poll = async () => {
      if (printingRef.current) return;
      // Solo imprimir si QZ ya está conectado — la conexión la maneja la página activa
      if (!qz.websocket.isActive()) return;

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
    poll();
    return () => clearInterval(interval);
  }, [enabled, businessId, printOrder]);

  // ── Socket ────────────────────────────────────────────────────────────────
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

    socket.on('new_order', async (data) => {
      if (printingRef.current) return;
      if (!qz.websocket.isActive()) return;
      printingRef.current = true;
      try {
        const order = { ...(data?.pedido || data), items: data?.items || [] };
        await printOrder(order);
        await fetchWithAuth('/api/ordenes/mark-printed', {
          method: 'POST',
          body: JSON.stringify({ order_ids: [order.id] }),
        });
      } catch (err) {
        console.error('[AutoPrint] Error socket print:', err);
      } finally {
        printingRef.current = false;
      }
    });

    return () => socket.disconnect();
  }, [enabled, businessId, printOrder]);
}
