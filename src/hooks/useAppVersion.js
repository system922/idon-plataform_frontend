import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL_MS = 3 * 60 * 1000; // 3 minutos

export function useAppVersion() {
  const initialVersion = useRef(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [countdown, setCountdown]     = useState(5);

  async function fetchVersion() {
    try {
      // cache-busting para que no devuelva la versión cacheada
      const res = await fetch(`/meta.json?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      return data.v ?? null;
    } catch {
      return null;
    }
  }

  async function check() {
    const current = await fetchVersion();
    if (!current) return;

    if (initialVersion.current === null) {
      initialVersion.current = current;
      return;
    }

    if (current !== initialVersion.current) {
      setUpdateReady(true);
    }
  }

  // Polling periódico
  useEffect(() => {
    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chequeo al volver a la pestaña
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuenta regresiva y recarga automática
  useEffect(() => {
    if (!updateReady) return;
    if (countdown <= 0) {
      window.location.reload();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [updateReady, countdown]);

  return { updateReady, countdown };
}
