import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

const POLL_INTERVAL = 4000;

export function useAutoPrint({ businessId, enabled = true }) {
<<<<<<< HEAD
  const { print }   = usePrinterService();
  const printRef    = useRef(print);
  const printingRef = useRef(false);
=======
  const { print }      = usePrinterService();
  const printRef       = useRef(print);
  const printingRef    = useRef(false);
  const printedIdsRef  = useRef(new Set()); // IDs ya impresos en esta sesión
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea

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

<<<<<<< HEAD
=======
  // ── Intentar imprimir un pedido (socket o poll) — sin duplicados ──────────
  const tryPrint = useCallback(async (order) => {
    if (!order?.id) return false;
    if (printedIdsRef.current.has(order.id)) return false; // ya impreso
    if (!qz.websocket.isActive()) return false;

    // Marcar inmediatamente para bloquear cualquier otra llamada concurrente
    printedIdsRef.current.add(order.id);
    try {
      await printOrder(order);
      await fetchWithAuth('/api/ordenes/mark-printed', {
        method: 'POST',
        body: JSON.stringify({ order_ids: [order.id] }),
      });
      return true;
    } catch (err) {
      // Si falla, quitar del set para que el próximo poll lo reintente
      printedIdsRef.current.delete(order.id);
      throw err;
    }
  }, [printOrder]);

>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea
  // ── Polling ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const poll = async () => {
      if (printingRef.current) return;
<<<<<<< HEAD
      // Solo imprimir si QZ ya está conectado — la conexión la maneja la página activa
=======
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea
      if (!qz.websocket.isActive()) return;

      try {
        printingRef.current = true;
        const res = await fetchWithAuth('/api/ordenes/unprinted');
        if (!res.ok) return;

        const orders = await res.json();
        if (!orders.length) return;

        for (const order of orders) {
          try {
<<<<<<< HEAD
            await printOrder(order);
            printed.push(order.id);
=======
            await tryPrint(order);
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea
          } catch (err) {
            console.error('[AutoPrint] Error imprimiendo orden', order.order_number, err);
          }
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
<<<<<<< HEAD
  }, [enabled, businessId, printOrder]);
=======
  }, [enabled, businessId, tryPrint]);
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea

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
<<<<<<< HEAD
      if (printingRef.current) return;
      if (!qz.websocket.isActive()) return; // sin QZ conectado, el poll lo reintentará
      try {
        const order = { ...(data?.pedido || data), items: data?.items || [] };
        await printOrder(order);
        await fetchWithAuth('/api/ordenes/mark-printed', {
          method: 'POST',
          body: JSON.stringify({ order_ids: [order.id] }),
        });
=======
      try {
        const order = { ...(data?.pedido || data), items: data?.items || [] };
        await tryPrint(order);
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea
      } catch (err) {
        console.error('[AutoPrint] Error socket print:', err);
      }
    });

    return () => socket.disconnect();
<<<<<<< HEAD
  }, [enabled, businessId, printOrder]);
=======
  }, [enabled, businessId, tryPrint]);
>>>>>>> bf818260603e86f70cdcd3e2405127c6df42d6ea
}
