import { useEffect, useState, useCallback } from 'react';
import { fetchWithAuth } from '../config/api';
import { usePrinterQueue } from '../hooks/usePrinterQueue';
import qz from 'qz-tray';

export function useQzTray() {
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerLoading, setPrinterLoading] = useState(true);
  const [printerError, setPrinterError] = useState(null);
  const [isQzReady, setIsQzReady] = useState(false);
  
  const { processQueue, stats } = usePrinterQueue();
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  useEffect(() => {
    const connectPrinter = async () => {
      try {
        setPrinterLoading(true);
        setPrinterError(null);

        // 1. Obtener certificado
        const res = await fetchWithAuth(`/print/cert?_qz=${Date.now()}`);
        if (!res.ok) {
          throw new Error(`No se pudo obtener el certificado (${res.status})`);
        }
        const certData = await res.json();
        const cleanCert = String(certData).trim();
        if (!cleanCert.includes('-----BEGIN CERTIFICATE-----')) {
          throw new Error('El certificado recibido no tiene formato PEM válido');
        }

        // 2. Configurar certificado usando setCertificatePromise (compatible con versiones antiguas)
        qz.security.setCertificatePromise(async () => {
          return cleanCert;
        });
        qz.security.setSignatureAlgorithm('SHA512');

        // 3. Configurar firma
        qz.security.setSignaturePromise(async (toSign) => {
          console.info('[QZ] Enviando solicitud de firma', {
            dataLength: String(toSign).length,
          });
          const res = await fetchWithAuth('/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          });
          if (!res.ok) {
            throw new Error(`No se pudo firmar la solicitud (${res.status})`);
          }
          const { signature } = await res.json();
          if (!signature) {
            throw new Error('El servidor no devolvió una firma válida');
          }
          console.info('[QZ] Firma recibida', {
            signatureLength: signature.length,
          });
          return signature;
        });

        // 4. Pequeña pausa para registrar promesas
        await new Promise(resolve => setTimeout(resolve, 200));

        // 5. Conectar
        if (!qz.websocket.isActive()) {
          await qz.websocket.connect();
        } else {
        }

        console.info('[QZ] WebSocket conectado', {
          connection: qz.websocket.getConnectionInfo?.(),
          signatureAlgorithm: qz.security.getSignatureAlgorithm?.(),
        });

        setPrinterConnected(true);
        setIsQzReady(true);
        setConnectionAttempts(0);
      } catch (e) {
        console.error('[QZ] ❌ Error:', e);
        setPrinterError(e?.message || 'No se pudo conectar con QZ Tray');
        setPrinterConnected(false);
        setIsQzReady(false);

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

  useEffect(() => {
    if (printerConnected && !printerLoading) {
      processQueue(true);
    }
  }, [printerConnected, printerLoading, stats.pending, processQueue]);

  const openDrawer = useCallback(async () => {
    if (!qz.websocket.isActive()) {
      throw new Error('QZ Tray no está conectado');
    }
    try {
      const printers = await qz.printers.find();
      const printer = printers.find(p => 
        p.name.toLowerCase().includes('thermal') ||
        p.name.toLowerCase().includes('receipt') ||
        p.name.toLowerCase().includes('tm') ||
        p.name.toLowerCase().includes('epson') ||
        p.name.toLowerCase().includes('pos')
      );
      if (!printer && printers.length === 0) {
        throw new Error('No se encontraron impresoras');
      }
      const targetPrinter = printer || printers[0];
      const config = qz.configs.create(targetPrinter.name);
      const data = [
        '\x1B\x40',
        '\x1B\x70\x00\x19\xFA',
        '\x1B\x64\x02',
      ];
      await qz.print(config, data);
      return true;
    } catch (err) {
      console.error('[QZ] ❌ Error abriendo cajón:', err);
      throw err;
    }
  }, []);

  return { 
    printerConnected, 
    printerLoading, 
    printerError,
    isQzReady,
    stats,
    openDrawer
  };
}