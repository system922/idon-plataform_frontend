import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { usePrinterService } from '../services/usePrinterService';
import { fetchWithAuth } from '../config/apiBase';
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

/**
 * Hook global de impresión automática de comandas.
 *
 * Montado en BusinessLayout → activo en cualquier página del panel.
 * - Conecta QZ Tray en segundo plano (solo tiene efecto en la laptop con impresora USB).
 * - Abre socket al backend y escucha el evento "new_order" de su negocio.
 * - Al recibir un pedido, imprime SOLO si QZ Tray está activo en este dispositivo.
 *   El celular del mesero no tiene QZ Tray → el check falla → no imprime → correcto.
 */
export function useAutoPrint({ businessId, enabled = true }) {
  const { print }   = usePrinterService();
  const printRef    = useRef(print);
  const qzReadyRef  = useRef(false);  // true cuando QZ Tray está conectado

  useEffect(() => { printRef.current = print; }, [print]);

  // ── 1. Conectar QZ Tray en segundo plano ──────────────────────────────────
  const connectQZ = useCallback(async () => {
    try {
      if (qz.websocket.isActive()) { qzReadyRef.current = true; return; }

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

      // Intentar WSS (puerto 8183) primero para HTTPS; caer a WS (8182) para HTTP.
      // Esto permite que Chrome y Firefox funcionen además de Edge.
      await qz.websocket.connect({
        host: 'localhost',
        port: { secure: [8183, 8184], insecure: [8182] },
        usingSecure: window.location.protocol === 'https:',
      });
      qzReadyRef.current = true;
      console.log('[AutoPrint] QZ Tray conectado ✅');
    } catch (err) {
      // Normal en celulares o PCs sin QZ Tray instalado
      console.warn('[AutoPrint] QZ Tray no disponible:', err?.message || err);
      qzReadyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    connectQZ();
  }, [enabled, connectQZ]);

  // ── 2. Escuchar pedidos nuevos via Socket.io ──────────────────────────────
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
      console.log('[AutoPrint] Socket conectado — sala: business:' + businessId + ' ✅');
    });

    socket.on('connect_error', (err) => {
      console.warn('[AutoPrint] Socket error de conexión:', err.message);
    });

    const handleNewOrder = async (data) => {
      console.log('[AutoPrint] Pedido recibido via socket', data);

      // Si QZ Tray no está listo, intentar conectar ahora (reintento bajo demanda)
      if (!qz.websocket.isActive()) {
        console.log('[AutoPrint] QZ no activo, intentando conectar...');
        await connectQZ();
      }

      if (!qz.websocket.isActive()) {
        console.log('[AutoPrint] Sin impresora en este dispositivo (celular/PC sin QZ)');
        return;
      }

      try {
        const pedido = data?.pedido || data;
        const items  = data?.items  || pedido?.items || [];

        const printData = {
          comanda: { number: pedido?.order_number || pedido?.numero_pedido || 'N/A' },
          table:   pedido?.mesa_numero  || pedido?.numero_mesa,
          items:   items.map(item => ({
            product_name: item.product_name || item.nombre || item.name,
            quantity:     item.quantity     || item.cantidad || 1,
            notes:        item.notes        || item.notas   || '',
          })),
          notes: pedido?.notes || pedido?.notas || '',
        };

        console.log('[AutoPrint] Imprimiendo comanda:', printData.comanda.number);
        const result = await printRef.current('printer_ticket', 'comanda', printData);

        if (result?.success) {
          console.log('[AutoPrint] Comanda impresa ✅');
        } else {
          console.error('[AutoPrint] Error al imprimir:', result?.error);
        }
      } catch (err) {
        console.error('[AutoPrint] Excepción en impresión:', err);
      }
    };

    socket.on('new_order',     handleNewOrder);
    socket.on('nueva_comanda', handleNewOrder);

    return () => {
      socket.off('new_order',     handleNewOrder);
      socket.off('nueva_comanda', handleNewOrder);
      socket.disconnect();
    };
  }, [enabled, businessId, connectQZ]);
}
