// src/services/qzConfig.js
import qz from 'qz-tray';
import API_BASE from '../config/apiBase';

// Configuración de QZ Tray con certificado
const QZ_CONFIG = {
  // Usar la misma URL base que fetchWithAuth
  API_BASE: API_BASE,
  
  // Configuración del certificado
  certificate: {
    fetch: async () => {
      try {
        const response = await fetch(`${API_BASE}/api/print/cert`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'text/plain',
          },
        });
        
        if (!response.ok) {
          throw new Error(`Error obteniendo certificado: ${response.status}`);
        }
        
        const certData = await response.text();
        console.log('[QZ] Certificado obtenido correctamente');
        return certData;
      } catch (error) {
        console.error('[QZ] Error obteniendo certificado:', error);
        return null;
      }
    }
  },
  
  // Configuración para firma de peticiones
  signing: {
    sign: async (data) => {
      try {
        const response = await fetch(`${API_BASE}/api/print/sign`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ data }),
        });
        
        if (!response.ok) {
          throw new Error(`Error firmando petición: ${response.status}`);
        }
        
        const result = await response.json();
        return result.signature;
      } catch (error) {
        console.error('[QZ] Error firmando petición:', error);
        return null;
      }
    }
  }
};

// Función para inicializar QZ Tray con certificado
export async function initializeQZTray() {
  try {
    // Verificar si ya está conectado
    if (qz.websocket.isActive()) {
      return true;
    }

    
    // Obtener el certificado del servidor
    const certData = await QZ_CONFIG.certificate.fetch();
    if (!certData) {
      throw new Error('No se pudo obtener el certificado del servidor');
    }

    // Conectar usando el certificado
    await qz.websocket.connect({
      certificate: {
        data: certData,
      },
      // Configuración para persistencia
      persist: true,
      // Tiempo de vida del certificado (24 horas)
      ttl: 86400,
      // Tiempo de espera para reconexión
      retries: 3,
      retryDelay: 1000,
    });

    // Configurar el trust store con el certificado
    await qz.websocket.setTrustStore({
      data: certData,
    });

    // Configurar la aplicación
    await qz.websocket.setAppName('IDON Plataform');
    await qz.websocket.setAppVersion('1.0.0');

    return true;
  } catch (error) {
    console.error('[QZ] Error de conexión:', error);
    return false;
  }
}

// Función para verificar y reconectar si es necesario
export async function ensureQZConnection() {
  if (qz.websocket.isActive()) {
    return true;
  }
  
  return await initializeQZTray();
}

// Función para desconectar QZ Tray (opcional)
export async function disconnectQZTray() {
  try {
    if (qz.websocket.isActive()) {
      await qz.websocket.disconnect();
      console.log('[QZ] Desconectado');
    }
    return true;
  } catch (error) {
    console.error('[QZ] Error desconectando:', error);
    return false;
  }
}

export default QZ_CONFIG;