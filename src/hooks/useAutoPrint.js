import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

const POLL_INTERVAL = 3000;

export function useAutoPrint({ businessId, enabled = true }) {
  const { print }      = usePrinterService();
  const printRef       = useRef(print);
  const printingRef    = useRef(false);
  const printedIdsRef  = useRef(new Set()); // IDs ya impresos en esta sesión

  useEffect(() => { printRef.current = print; }, [print]);

  // ── Imprimir una orden ────────────────────────────────
  const printOrder = useCallback(async (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    await printRef.current('printer_ticket', 'comanda', {
      comanda: { number: order.order_number || order.numero_pedido || order.id || 'N/A' },
      table:   order.mesa_numero ?? order.numero_mesa,
      items,   // pasar directos: formatComandaTicket ya maneja todos los nombres de campo
      notes:   order.notas || order.notes || '',
    });
  }, []);

  // ── Intentar imprimir un pedido (socket o poll) — sin duplicados ────────
  const tryPrint = useCallback(async (order) => {
    if (!order?.id) return false;
    if (printedIdsRef.current.has(order.id)) return false; // ya impreso
    if (!qz.websocket.isActive()) return false;

    // Marcar ANTES de cualquier await para bloquear llamadas concurrentes del socket y del poll
    printedIdsRef.current.add(order.id);

    // Si los ítems llegaron sin product_name (payload antiguo), buscar orden completa
    let orderToprint = order;
    const sinNombre = !Array.isArray(order.items) || order.items.length === 0 ||
      !order.items.some(i => i.product_name || i.nombre || i.name || i.descripcion || i.producto);

    if (sinNombre) {
      try {
        const res = await fetchWithAuth(`/api/ordenes/${order.id}`);
        if (res.ok) {
          const full = await res.json();
          orderToprint = { ...order, ...full, items: full.items || full.pedido?.items || [] };
        }
      } catch {
        // si falla el fetch, imprime con lo que llegó en el payload
      }
    }

    try {
      await printOrder(orderToprint);
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

  // ── Polling ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const poll = async () => {
      if (printingRef.current) return;
      if (!qz.websocket.isActive()) return;

      try {
        printingRef.current = true;
        const res = await fetchWithAuth('/api/ordenes/unprinted');
        if (!res.ok) return;

        const orders = await res.json();
        if (!orders.length) return;

        for (const order of orders) {
          try {
            await tryPrint(order);
          } catch (err) {

          }
        }
      } catch (err) {

      } finally {
        printingRef.current = false;
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    poll();
    return () => clearInterval(interval);
  }, [enabled, businessId, tryPrint]);

  // ── Socket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {});

    socket.on('new_order', async (data) => {
      try {
        const pedido = data?.pedido || data;
        const items  = data?.items ?? pedido?.items ?? [];
        const order  = { ...pedido, items };
        await tryPrint(order);
      } catch (err) {

      }
    });

    return () => socket.disconnect();
  }, [enabled, businessId, tryPrint]);
}