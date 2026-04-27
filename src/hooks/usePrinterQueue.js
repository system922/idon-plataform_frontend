import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrinterService } from '../services/usePrinterService';

const QUEUE_STORAGE_KEY = 'printer_queue';

export function usePrinterQueue() {
  const [queue, setQueue] = useState([]);
  const [printing, setPrinting] = useState(false);
  const { print } = usePrinterService();
  const processingRef = useRef(false);

  // ── Cargar cola desde localStorage ─────────────────────────────────────────

  useEffect(() => {
    loadQueueFromStorage();
  }, [loadQueueFromStorage]);

  // ── Guardar cola en localStorage ───────────────────────────────────────────

  useEffect(() => {
    saveQueueToStorage(queue);
  }, [queue]);

  // ── Cargar de localStorage ────────────────────────────────────────────────

  const loadQueueFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const items = Array.isArray(parsed) ? parsed : [];
        console.log(`📋 Cola cargada: ${items.length} trabajos`);
        setQueue(items);
      }
    } catch (err) {
      console.error('Error cargando cola de impresión:', err);
    }
  }, []);

  // ── Guardar en localStorage ───────────────────────────────────────────────

  const saveQueueToStorage = useCallback((items) => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Error guardando cola de impresión:', err);
    }
  }, []);

  // ── Agregar a cola ────────────────────────────────────────────────────────

  const addToQueue = useCallback((printerKey, template, data, openDrawer = false) => {
    const jobId = `job_${Date.now()}_${Math.random()}`;
    const newJob = {
      id: jobId,
      printerKey,
      template,
      data,
      openDrawer,
      createdAt: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
      status: 'pending'
    };

    setQueue(prev => {
      const updated = [...prev, newJob];
      console.log(`➕ Trabajo agregado a cola: ${jobId}. Total: ${updated.length}`);
      return updated;
    });
    return jobId;
  }, []);

  // ── Procesar cola ─────────────────────────────────────────────────────────

  const processQueue = useCallback(async (printerConnected) => {
    if (!printerConnected) {
      console.log('🔴 Impresora desconectada, esperando...');
      return;
    }

    if (processingRef.current) {
      console.log('⏳ Ya procesando cola...');
      return;
    }

    setPrinting(true);
    processingRef.current = true;

    try {
      setQueue(prevQueue => {
        const pendingJobs = prevQueue.filter(j => j.status === 'pending');
        
        if (pendingJobs.length === 0) {
          console.log('✨ No hay trabajos pendientes');
          setPrinting(false);
          processingRef.current = false;
          return prevQueue;
        }

        console.log(`🖨️ Procesando ${pendingJobs.length} trabajos pendientes...`);

        // Procesar cada trabajo
        (async () => {
          for (const job of pendingJobs) {
            try {
              console.log(`⏳ Imprimiendo trabajo ${job.id}...`);

              const result = await print(
                job.printerKey,
                job.template,
                job.data,
                job.openDrawer
              );

              if (result.success) {
                console.log(`✅ Trabajo ${job.id} impreso correctamente`);
                setQueue(prev =>
                  prev.map(j =>
                    j.id === job.id
                      ? { ...j, status: 'completed' }
                      : j
                  )
                );
              } else {
                throw new Error(result.error || 'Error desconocido');
              }
            } catch (err) {
              console.error(`❌ Error imprimiendo ${job.id}:`, err.message);

              setQueue(prev => {
                const updated = prev.map(j => {
                  if (j.id === job.id) {
                    const newRetries = j.retries + 1;
                    if (newRetries >= j.maxRetries) {
                      console.log(`⚠️ Trabajo ${job.id} falló después de ${j.maxRetries} intentos`);
                      return { ...j, status: 'failed', error: err.message, retries: newRetries };
                    } else {
                      console.log(`🔄 Reintentando trabajo ${job.id} (intento ${newRetries}/${j.maxRetries})`);
                      return { ...j, retries: newRetries };
                    }
                  }
                  return j;
                });
                return updated;
              });
            }

            // Pequeña pausa entre trabajos
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          setPrinting(false);
          processingRef.current = false;
        })();

        return prevQueue;
      });
    } catch (err) {
      console.error('Error procesando cola:', err);
      setPrinting(false);
      processingRef.current = false;
    }
  }, [print]);

  // ── Limpiar trabajos completados ───────────────────────────────────────────

  const clearCompleted = useCallback(() => {
    setQueue(prev => {
      const filtered = prev.filter(job => job.status !== 'completed');
      console.log(`🗑️ Limpiados trabajos completados. Restantes: ${filtered.length}`);
      return filtered;
    });
  }, []);

  // ── Reintentar trabajos fallidos ───────────────────────────────────────────

  const retryFailed = useCallback(() => {
    setQueue(prev => {
      const updated = prev.map(job =>
        job.status === 'failed'
          ? { ...job, status: 'pending', retries: 0 }
          : job
      );
      const retryCount = updated.filter(j => j.status === 'pending').length;
      console.log(`🔄 Reintentos marcados. Trabajos pendientes: ${retryCount}`);
      return updated;
    });
  }, []);

  // ── Eliminar trabajo específico ────────────────────────────────────────────

  const removeJob = useCallback((jobId) => {
    setQueue(prev => {
      const filtered = prev.filter(job => job.id !== jobId);
      console.log(`❌ Trabajo ${jobId} eliminado. Restantes: ${filtered.length}`);
      return filtered;
    });
  }, []);

  // ── Vaciar toda la cola ───────────────────────────────────────────────────

  const clearQueue = useCallback(() => {
    console.log('🗑️ Cola limpiada');
    setQueue([]);
  }, []);

  // ── Estadísticas ──────────────────────────────────────────────────────────

  const stats = {
    total: queue.length,
    pending: queue.filter(j => j.status === 'pending').length,
    completed: queue.filter(j => j.status === 'completed').length,
    failed: queue.filter(j => j.status === 'failed').length,
  };

  return {
    queue,
    printing,
    addToQueue,
    processQueue,
    clearCompleted,
    retryFailed,
    removeJob,
    clearQueue,
    stats,
  };
}