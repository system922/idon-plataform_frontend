import { useState, useEffect } from 'react';

export function useCashDrawer(printerName = 'POS-58') {
  const [qzReady, setQzReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detectar si QZ Tray está disponible
  useEffect(() => {
    const checkQZTray = () => {
      if (typeof window !== 'undefined' && window.qz) {
        setQzReady(true);

      } else {

        setQzReady(false);
      }
    };

    checkQZTray();
    
    // Escuchar cuando QZ Tray se cargue dinámicamente
    window.addEventListener('load', checkQZTray);
    return () => window.removeEventListener('load', checkQZTray);
  }, []);

  async function openDrawer() {
    setLoading(true);
    try {
      // Verificar si QZ Tray está disponible
      if (qzReady && window.qz && window.qz.websocket) {
        await window.qz.websocket.connect();
        const config = window.qz.configs.create(printerName);
        
        // Comando para abrir cajón (varía según la impresora)
        const commands = [
          { cmd: 'OPEN_CASH_DRAWER' },
          // Comandos alternativos para diferentes impresoras
          'ESC p 0 0 0',
          '\x1B\x70\x00\x00\x00',
          '\x1B\x70\x00\x19\x00'
        ];
        
        try {
          await window.qz.print(config, commands[0]);

        } catch (printError) {

          // Intentar comandos alternativos
          for (const cmd of commands.slice(1)) {
            try {
              await window.qz.print(config, typeof cmd === 'string' ? cmd : [cmd]);

              break;
            } catch (altError) {

            }
          }
        }
        
        await window.qz.websocket.disconnect();
      } else {
        // Modo simulación cuando no hay QZ Tray

        // Puedes mostrar una notificación al usuario
        if (typeof window !== 'undefined' && window.alert) {
          // No mostrar alerta para no molestar, solo log

        }
      }
    } catch (error) {

      // No propagamos el error para no interrumpir el flujo
    } finally {
      setLoading(false);
    }
  }

  // Función para probar la conexión con QZ Tray
  async function testConnection() {
    if (!qzReady) {
      return { success: false, message: 'QZ Tray no está disponible' };
    }
    
    try {
      await window.qz.websocket.connect();
      await window.qz.websocket.disconnect();
      return { success: true, message: 'Conexión exitosa con QZ Tray' };
    } catch (error) {

      return { success: false, message: error.message };
    }
  }

  return { 
    openDrawer, 
    testConnection, 
    qzReady, 
    loading 
  };
}