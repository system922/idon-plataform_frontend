import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

/**
 * Hook global de impresión automática.
 * Corre en el BusinessLayout (siempre activo mientras el cajero/dueño tenga sesión).
 *
 * 1. Conecta QZ Tray para mantener la impresora disponible en segundo plano.
 * 2. Abre un socket al backend y se suscribe a la sala del negocio.
 * 3. Cuando llega un pedido nuevo (new_order), lo imprime solo si
 *    QZ Tray está activo en este dispositivo (laptop con impresora conectada).
 *    El celular del mesero no tiene QZ Tray → no intenta imprimir.
 */
export function useAutoPrint({ businessId, enabled = true }) {
  const { print } = usePrinterService();
  const printRef  = useRef(print);

  useEffect(() => {
    printRef.current = print;
  }, [print]);

  // ── Conectar QZ Tray en segundo plano ────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const connectQZ = async () => {
      try {
        if (qz.websocket.isActive()) return; // ya está conectado

        const certRes  = await fetchWithAuth('/api/print/cert');
        const certData = await certRes.text();
        qz.security.setCertificatePromise(async () => certData);

        qz.security.setSignaturePromise(async (toSign) => {
          const res = await fetchWithAuth('/api/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          });
          const { signature } = await res.json();
          return signature;
        });

        if (!cancelled) {
          await qz.websocket.connect();
          console.log('[AutoPrint] QZ Tray conectado');
        }
      } catch {
        // QZ Tray no está instalado en este dispositivo (celular del mesero) — es normal
      }
    };

    connectQZ();
    return () => { cancelled = true; };
  }, [enabled]);

  // ── Escuchar pedidos nuevos via Socket.io ─────────────────────────────────
  useEffect(() => {
    if (!enabled || !businessId) return;

    const token = localStorage.getItem('idonToken') || localStorage.getItem('token');

    const socket = io(API_BASE, {
      auth: { token, businessId },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      console.log('[AutoPrint] Socket conectado — sala: business:' + businessId);
    });

    const handleNewOrder = async (data) => {
      if (!qz.websocket.isActive()) {
        // Este dispositivo no tiene impresora (ej: celular del mesero)
        return;
      }

      try {
        const pedido = data?.pedido || data;
        const items  = data?.items  || pedido?.items || [];

        const printData = {
          comanda: { number: pedido?.order_number || pedido?.numero_pedido || 'N/A' },
          table:   pedido?.mesa_numero || pedido?.numero_mesa,
          items:   items.map(item => ({
            product_name: item.product_name || item.nombre || item.name,
            quantity:     item.quantity     || item.cantidad || 1,
            notes:        item.notes        || item.notas   || '',
          })),
          notes: pedido?.notes || pedido?.notas || '',
        };

        await printRef.current('printer_ticket', 'comanda', printData);
      } catch (err) {
        console.error('[AutoPrint] Error imprimiendo:', err);
      }
    };

    socket.on('new_order',     handleNewOrder);
    socket.on('nueva_comanda', handleNewOrder);

    socket.on('connect_error', (err) => {
      console.warn('[AutoPrint] Socket error:', err.message);
    });

    return () => {
      socket.off('new_order',     handleNewOrder);
      socket.off('nueva_comanda', handleNewOrder);
      socket.disconnect();
    };
  }, [enabled, businessId]);
}
