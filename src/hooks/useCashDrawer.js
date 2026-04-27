// hooks/useCashDrawer.js
import qz from 'qz-tray';

const PRINTER_NAME = 'POS-58';

export function useCashDrawer(printerName = PRINTER_NAME) {
  async function openDrawer() {
    try {
      // QZ config print ESC/POS para abrir cajón universal:
      const config = qz.configs.create(printerName);
      await qz.print(config, [
        { type: 'raw', format: 'base64', data: btoa('\x1B\x70\x00\x19\xFA') },
      ]);
      return true;
    } catch (err) {
      // Puedes disparar alertas, logs, toast, etc:
      console.error('No se pudo abrir gaveta:', err?.message || err);
      return false;
    }
  }

  return openDrawer;
}