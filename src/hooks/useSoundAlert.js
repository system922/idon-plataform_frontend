import { useCallback, useRef } from 'react';

export function useSoundAlert() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  };

  const tone = useCallback((freq, startAt, duration, vol = 0.35, type = 'sine') => {
    try {
      const ac   = getCtx();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type            = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, ac.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + startAt + duration);
      osc.start(ac.currentTime + startAt);
      osc.stop(ac.currentTime + startAt + duration + 0.05);
    } catch { /* sin interacción del usuario aún */ }
  }, []);

  // Alerta de nueva orden en cocina: 3 pulsos ascendentes
  const playNewOrder = useCallback(() => {
    tone(700,  0,    0.12, 0.4, 'square');
    tone(900,  0.16, 0.12, 0.4, 'square');
    tone(1100, 0.32, 0.20, 0.4, 'square');
    tone(1100, 0.56, 0.20, 0.3, 'square');
  }, [tone]);

  // Notificación de orden lista para caja: campanada suave ascendente
  const playOrderReady = useCallback(() => {
    tone(523, 0,    0.18, 0.3); // Do5
    tone(659, 0.22, 0.18, 0.3); // Mi5
    tone(784, 0.44, 0.35, 0.3); // Sol5
  }, [tone]);

  return { playNewOrder, playOrderReady };
}
