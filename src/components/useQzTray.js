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

        console.log('[QZ] 🔵 Iniciando conexión con QZ Tray...');

        // ── 1. Obtener certificado ──
        console.log('[QZ] 📥 Solicitando certificado a /api/print/cert');
        const res = await fetchWithAuth('/api/print/cert');
        const certData = await res.text();
        
        // Log del certificado (primeros 100 caracteres y longitud)
        console.log('[QZ] 📄 Certificado recibido. Longitud:', certData.length);
        console.log('[QZ] 📄 Inicio del certificado:', certData.substring(0, 100));
        console.log('[QZ] 📄 Fin del certificado:', certData.substring(certData.length - 50));
        
        // Limpiar el certificado (quitar espacios/saltos de línea extra)
        const cleanCert = certData.trim();
        if (cleanCert.length !== certData.length) {
          console.log('[QZ] 🧹 Certificado limpiado (se eliminaron espacios/saltos de línea)');
        }

        // ── 2. Configurar el certificado en QZ Tray ──
        // Usamos setCertificate (síncrono) en lugar de setCertificatePromise para simplificar
        console.log('[QZ] 🔐 Configurando certificado en QZ Tray (setCertificate)...');
        qz.security.setCertificate(cleanCert);
        
        // Alternativa (si prefieres usar promesa, descomenta y comenta la línea anterior):
        // qz.security.setCertificatePromise(async () => {
        //   console.log('[QZ] 🔐 Ejecutando setCertificatePromise, devolviendo certificado');
        //   return cleanCert;
        // });

        // ── 3. Configurar firma ──
        console.log('[QZ] ✍️ Configurando firma (setSignaturePromise)...');
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

        // ── 4. Pequeña pausa para asegurar que las promesas estén registradas ──
        console.log('[QZ] ⏳ Esperando 200ms para que las promesas se registren...');
        await new Promise(resolve => setTimeout(resolve, 200));

        // ── 5. Conectar WebSocket ──
        if (!qz.websocket.isActive()) {
          console.log('[QZ] 🔌 Conectando WebSocket a QZ Tray...');
          await qz.websocket.connect();
          console.log('[QZ] ✅ WebSocket conectado exitosamente');
        } else {
          console.log('[QZ] ℹ️ WebSocket ya estaba activo');
        }

        setPrinterConnected(true);
        setIsQzReady(true);
        setConnectionAttempts(0);
        console.log('[QZ] ✅ Conexión completa y lista');

      } catch (e) {
        console.error('[QZ] ❌ Error en connectPrinter:', e);
        setPrinterError(e?.message || 'No se pudo conectar con QZ Tray');
        setPrinterConnected(false);
        setIsQzReady(false);

        // Reintentar después de 5 segundos (máximo 12 intentos)
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
  }, []); // ⚠️ Este efecto solo se ejecuta una vez al montar

  // ── Procesar cola cuando se conecta la impresora ────────────────────────────
  useEffect(() => {
    if (printerConnected && !printerLoading) {
      console.log('[QZ] 🖨️ Impresora conectada, procesando cola...');
      processQueue(true);
    }
  }, [printerConnected, printerLoading, stats.pending, processQueue]);

  // 🔥 FUNCIÓN PARA ABRIR CAJÓN CON QZ TRAY ─────────────────────────────────
  const openDrawer = useCallback(async () => {
    console.log('[QZ] 🚀 openDrawer llamado');

    if (!qz.websocket.isActive()) {
      console.error('[QZ] ❌ WebSocket no activo');
      throw new Error('QZ Tray no está conectado');
    }

    try {
      // Buscar impresora configurada
      console.log('[QZ] 🔍 Buscando impresoras...');
      const printers = await qz.printers.find();
      console.log('[QZ] 📋 Impresoras encontradas:', printers.map(p => p.name).join(', '));

      // Buscar impresora térmica
      const printer = printers.find(p => 
        p.name.toLowerCase().includes('thermal') ||
        p.name.toLowerCase().includes('receipt') ||
        p.name.toLowerCase().includes('tm') ||
        p.name.toLowerCase().includes('epson') ||
        p.name.toLowerCase().includes('pos')
      );

      if (!printer) {
        if (printers.length === 0) {
          throw new Error('No se encontraron impresoras configuradas en QZ Tray');
        }
        console.warn('[QZ] ⚠️ No se encontró impresora específica, usando la primera:', printers[0].name);
      }

      const targetPrinter = printer || printers[0];
      console.log('[QZ] 🖨️ Impresora seleccionada:', targetPrinter.name);

      const config = qz.configs.create(targetPrinter.name);
      const data = [
        '\x1B\x40',           // Inicializar impresora
        '\x1B\x70\x00\x19\xFA', // Abrir cajón
        '\x1B\x64\x02',       // Avanzar 2 líneas
      ];

      console.log('[QZ] 📤 Enviando comando ESC/POS a la impresora...');
      await qz.print(config, data);
      console.log('[QZ] ✅ Cajón abierto exitosamente');

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