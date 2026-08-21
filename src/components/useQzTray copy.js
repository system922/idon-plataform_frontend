import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../config/apiBase';
import { usePrinterQueue } from '../hooks/usePrinterQueue';
import qz from 'qz-tray';

export function useQzTray() {
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(true);
  const [printerError, setPrinterError] = useState(null);
  const [isQzReady, setIsQzReady] = useState(false);
  
  const { processQueue, stats } = usePrinterQueue();
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // ── Conectar a QZ Tray ─────────────────────────────────────────────────────
  useEffect(() => {
    const connectPrinter = async () => {
      try {
        setPrinterLoading(true);
        setPrinterError(null);


        // Obtener certificado
        const res = await fetchWithAuth('/api/print/cert');
        const certData = await res.text();
        qz.security.setCertificatePromise(async () => certData);

        // Configurar firma
        qz.security.setSignaturePromise(async (toSign) => {
          const res = await fetchWithAuth('/api/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          });
          const { signature } = await res.json();
          return signature;
        });

        // Conectar WebSocket
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        }

        setPrinterConnected(true);
        setIsQzReady(true);

        setConnectionAttempts(0);
      } catch (e) {

        setPrinterError(e?.message || 'No se pudo conectar con QZ Tray');
        setPrinterConnected(false);
        setIsQzReady(false);

        // Reintentar después de 5 segundos (máximo 12 intentos)
        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);
        if (attempts < 12) {
          setTimeout(connectPrinter, 5000);
        }
      } finally {
        setPrinterLoading(false);
      }
    };

    connectPrinter();
  }, []);

  // ── Procesar cola cuando se conecta la impresora ────────────────────────────
  useEffect(() => {
    if (printerConnected && !printerLoading) {

      processQueue(true);
    }
  }, [printerConnected, printerLoading, stats.pending, processQueue]);

  // 🔥 FUNCIÓN PARA ABRIR CAJÓN CON QZ TRAY ─────────────────────────────────
  const openDrawer = useCallback(async () => {

    if (!qz.websocket.isActive()) {
      throw new Error('QZ Tray no está conectado');
    }

    try {
      // Buscar impresora configurada
      const printers = await qz.printers.find();

      // Buscar impresora térmica (normalmente tiene "thermal", "receipt", "TM", "EPSON" en el nombre)
      const printer = printers.find(p => 
        p.name.toLowerCase().includes('thermal') ||
        p.name.toLowerCase().includes('receipt') ||
        p.name.toLowerCase().includes('tm') ||
        p.name.toLowerCase().includes('epson') ||
        p.name.toLowerCase().includes('pos')
      );

      if (!printer) {
        // Si no encuentra impresora específica, usar la primera disponible
        if (printers.length === 0) {
          throw new Error('No se encontraron impresoras configuradas en QZ Tray');
        }

      }

      const targetPrinter = printer || printers[0];

      // Comando ESC/POS para abrir cajón
      // \x1B = ESC, \x70 = comando abrir cajón, \x00 = pin 2, \x19 = tiempo encendido, \xFA = tiempo apagado
      const config = qz.configs.create(targetPrinter.name);
      
      const data = [
        '\x1B\x40',           // Inicializar impresora
        '\x1B\x70\x00\x19\xFA', // Abrir cajón (ESC p 0 25 250)
        '\x1B\x64\x02',       // Avanzar 2 líneas
      ];

      await qz.print(config, data);

      return true;
    } catch (err) {

      throw err;
    }
  }, []);

  return { 
    printerConnected, 
    printerLoading, 
    printerError,
    isQzReady,
    stats,
    openDrawer  // 👈 EXPONER openDrawer
  };
}