import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../config/apiBase';
import { usePrinterQueue } from '../hooks/usePrinterQueue';
import qz from 'qz-tray';

export function useQzTray() {
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(true);
  const [printerError, setPrinterError] = useState(null);
  
  const { processQueue, stats } = usePrinterQueue();
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // ── Conectar a QZ Tray ─────────────────────────────────────────────────────

  useEffect(() => {
    const connectPrinter = async () => {
      try {
        setPrinterLoading(true);
        setPrinterError(null);

        console.log('🔌 Conectando con QZ Tray...');

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
        console.log('✅ QZ Tray conectado correctamente');
        setConnectionAttempts(0);
      } catch (e) {
        console.warn('⚠️ QZ Tray no disponible:', e?.message);
        setPrinterError(e?.message || 'No se pudo conectar con QZ Tray');
        setPrinterConnected(false);

        // Reintentar después de 5 segundos
        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);
        if (attempts < 12) { // Máximo 12 intentos (1 minuto)
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
      console.log(`🔄 Ejecutando processQueue (stats: ${stats.pending} pendientes)`);
      processQueue(true);
    }
  }, [printerConnected, printerLoading, stats.pending, processQueue]);

  return { 
    printerConnected, 
    printerLoading, 
    printerError,
    stats
  };
}