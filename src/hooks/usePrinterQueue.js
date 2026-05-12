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
  }, []);

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

        setQueue(items);
      }
    } catch (err) {

    }
  }, []);

  // ── Guardar en localStorage ───────────────────────────────────────────────

  const saveQueueToStorage = useCallback((items) => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {

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

      return updated;
    });
    return jobId;
  }, []);

  // ── Procesar cola ─────────────────────────────────────────────────────────

  const processQueue = useCallback(async (printerConnected) => {
    if (!printerConnected) {

      return;
    }

    if (processingRef.current) {

      return;
    }

    setPrinting(true);
    processingRef.current = true;

    try {
      setQueue(prevQueue => {
        const pendingJobs = prevQueue.filter(j => j.status === 'pending');
        
        if (pendingJobs.length === 0) {

          setPrinting(false);
          processingRef.current = false;
          return prevQueue;
        }


        // Procesar cada trabajo
        (async () => {
          for (const job of pendingJobs) {
            try {

              const result = await print(
                job.printerKey,
                job.template,
                job.data,
                job.openDrawer
              );

              if (result.success) {

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

              setQueue(prev => {
                const updated = prev.map(j => {
                  if (j.id === job.id) {
                    const newRetries = j.retries + 1;
                    if (newRetries >= j.maxRetries) {

                      return { ...j, status: 'failed', error: err.message, retries: newRetries };
                    } else {

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

      setPrinting(false);
      processingRef.current = false;
    }
  }, [print]);

  // ── Limpiar trabajos completados ───────────────────────────────────────────

  const clearCompleted = useCallback(() => {
    setQueue(prev => {
      const filtered = prev.filter(job => job.status !== 'completed');

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

      return updated;
    });
  }, []);

  // ── Eliminar trabajo específico ────────────────────────────────────────────

  const removeJob = useCallback((jobId) => {
    setQueue(prev => {
      const filtered = prev.filter(job => job.id !== jobId);

      return filtered;
    });
  }, []);

  // ── Vaciar toda la cola ───────────────────────────────────────────────────

  const clearQueue = useCallback(() => {

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