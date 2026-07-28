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

  useEffect(() => {
    const connectPrinter = async () => {
      try {
        setPrinterLoading(true);
        setPrinterError(null);
        console.log('[QZ] 🔵 Iniciando conexión con QZ Tray...');

        // 1. Obtener certificado
        console.log('[QZ] 📥 Solicitando certificado a /api/print/cert');
        const res = await fetchWithAuth('/api/print/cert');
        const certData = await res.text();
        console.log('[QZ] 📄 Certificado recibido. Longitud:', certData.length);
        console.log('[QZ] 📄 Inicio del certificado:', certData.substring(0, 100));
        console.log('[QZ] 📄 Fin del certificado:', certData.substring(certData.length - 50));

        const cleanCert = certData.trim();

        // 2. Configurar certificado usando setCertificatePromise (compatible con versiones antiguas)
        console.log('[QZ] 🔐 Configurando certificado con setCertificatePromise...');
        qz.security.setCertificatePromise(async () => {
          console.log('[QZ] 🔐 setCertificatePromise ejecutado, devolviendo certificado');
          return cleanCert;
        });

        // 3. Configurar firma
        console.log('[QZ] ✍️ Configurando firma...');
        qz.security.setSignaturePromise(async (toSign) => {
          console.log('[QZ] ✍️ Firmando datos:', toSign);
          const res = await fetchWithAuth('/api/print/sign', {
            method: 'POST',
            body: JSON.stringify({ data: toSign }),
          });
          const { signature } = await res.json();
          console.log('[QZ] ✍️ Firma generada (longitud):', signature?.length || 0);
          return signature;
        });

        // 4. Pequeña pausa para registrar promesas
        console.log('[QZ] ⏳ Esperando 200ms...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // 5. Conectar
        if (!qz.websocket.isActive()) {
          console.log('[QZ] 🔌 Conectando WebSocket...');
          await qz.websocket.connect();
          console.log('[QZ] ✅ WebSocket conectado');
        } else {
          console.log('[QZ] ℹ️ WebSocket ya activo');
        }

        setPrinterConnected(true);
        setIsQzReady(true);
        setConnectionAttempts(0);
        console.log('[QZ] ✅ Conexión completa');
      } catch (e) {
        console.error('[QZ] ❌ Error:', e);
        setPrinterError(e?.message || 'No se pudo conectar con QZ Tray');
        setPrinterConnected(false);
        setIsQzReady(false);

        const attempts = connectionAttempts + 1;
        setConnectionAttempts(attempts);
        console.log(`[QZ] 🔄 Reintento ${attempts}/12 en 5 segundos...`);
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
      console.log('[QZ] 🖨️ Procesando cola...');
      processQueue(true);
    }
  }, [printerConnected, printerLoading, stats.pending, processQueue]);

  const openDrawer = useCallback(async () => {
    console.log('[QZ] 🚀 openDrawer llamado');
    if (!qz.websocket.isActive()) {
      throw new Error('QZ Tray no está conectado');
    }
    try {
      const printers = await qz.printers.find();
      console.log('[QZ] 📋 Impresoras:', printers.map(p => p.name).join(', '));
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
      console.log('[QZ] 🖨️ Usando:', targetPrinter.name);
      const config = qz.configs.create(targetPrinter.name);
      const data = [
        '\x1B\x40',
        '\x1B\x70\x00\x19\xFA',
        '\x1B\x64\x02',
      ];
      await qz.print(config, data);
      console.log('[QZ] ✅ Cajón abierto');
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