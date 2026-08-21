import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useSession } from '../context/SessionContext';   
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/api';            
import qz from 'qz-tray';
import { API_BASE } from '../config/api';

const POLL_INTERVAL = 3000;

export function useAutoPrint({ businessId: propBusinessId, enabled = true }) {
  
  const { user } = useSession();
  const businessId = propBusinessId || user?.businessId;    

  const { print } = usePrinterService();
  const printRef = useRef(print);
  const printingRef = useRef(false);
  const printedIdsRef = useRef(new Set());

  useEffect(() => { printRef.current = print; }, [print]);

  // ── Imprimir una orden ────────────────────────────────
  const printOrder = useCallback(async (order) => {
    const items = Array.isArray(order.items) ? order.items : [];
    await printRef.current('printer_ticket', 'comanda', {
      comanda: { number: order.order_number || order.numero_pedido || order.id || 'N/A' },
      table:   order.mesa_numero ?? order.numero_mesa,
      items,
      notes:   order.notas || order.notes || '',
    });
  }, []);

  // ── Intentar imprimir un pedido ──────────────────────
  const tryPrint = useCallback(async (order) => {
    if (!order?.id) return false;
    if (printedIdsRef.current.has(order.id)) return false;
    if (!qz.websocket.isActive()) return false;

    printedIdsRef.current.add(order.id);

    try {
      const claimRes = await fetchWithAuth('/ordenes/mark-printed', {
        method: 'POST',
        body: JSON.stringify({ order_ids: [order.id] }),
      });
      if (claimRes.ok) {
        const claimData = await claimRes.json();
        const claimed = claimData.claimed_ids ?? [];
        if (!claimed.includes(order.id)) return false;
      }

      let orderToprint = order;
      const sinNombre = !Array.isArray(order.items) || order.items.length === 0 ||
        !order.items.some(i => i.product_name || i.nombre || i.name || i.descripcion || i.producto);

      if (sinNombre) {
        try {
          const res = await fetchWithAuth(`/ordenes/${order.id}`);
          if (res.ok) {
            const full = await res.json();
            orderToprint = { ...order, ...full, items: full.items || full.pedido?.items || [] };
          }
        } catch { }
      }

      await printOrder(orderToprint);
      return true;
    } catch (err) {
      printedIdsRef.current.delete(order.id);
      throw err;
    }
  }, [printOrder]);

  // ── Polling ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const poll = async () => {
      if (printingRef.current) return;
      if (!qz.websocket.isActive()) return;

      try {
        printingRef.current = true;
        const res = await fetchWithAuth('/ordenes/unprinted');
        if (!res.ok) return;

        const orders = await res.json();
        if (!orders.length) return;

        for (const order of orders) {
          try {
            await tryPrint(order);
          } catch { }
        }
      } catch { } finally {
        printingRef.current = false;
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    poll();
    return () => clearInterval(interval);
  }, [enabled, businessId, tryPrint]);

  // ── Socket ──────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('idonToken') || localStorage.getItem('token');
    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('new_order', async (data) => {
      try {
        const pedido = data?.pedido || data;
        const items  = data?.items ?? pedido?.items ?? [];
        const order  = { ...pedido, items };
        await tryPrint(order);
      } catch { }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [enabled, businessId, tryPrint]);
}