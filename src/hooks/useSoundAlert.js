import { useCallback, useRef } from 'react';

export function useSoundAlert() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
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
    } catch { }
  }, []);

  // ── Sonidos disponibles ───────────────────────────────────────────────────

  // 3 pulsos cuadrados ascendentes
  const playPulsos = useCallback(() => {
    tone(700,  0,    0.12, 0.4, 'square');
    tone(900,  0.16, 0.12, 0.4, 'square');
    tone(1100, 0.32, 0.20, 0.4, 'square');
    tone(1100, 0.56, 0.20, 0.3, 'square');
  }, [tone]);

  // Campana suave — Do Mi Sol
  const playCampana = useCallback(() => {
    tone(523, 0,    0.5,  0.3);
    tone(659, 0.3,  0.5,  0.3);
    tone(784, 0.6,  0.7,  0.3);
  }, [tone]);

  // Bip doble corto
  const playBip = useCallback(() => {
    tone(880, 0,    0.08, 0.45, 'square');
    tone(880, 0.14, 0.08, 0.4,  'square');
  }, [tone]);

  // Alerta urgente — alternancia rápida
  const playUrgente = useCallback(() => {
    tone(1200, 0,    0.07, 0.4, 'sawtooth');
    tone(900,  0.1,  0.07, 0.4, 'sawtooth');
    tone(1200, 0.2,  0.07, 0.4, 'sawtooth');
    tone(900,  0.3,  0.07, 0.4, 'sawtooth');
    tone(1200, 0.4,  0.10, 0.4, 'sawtooth');
  }, [tone]);

  // Melodía suave — escala pentatónica
  const playMelodia = useCallback(() => {
    tone(523, 0,    0.18, 0.25); // Do
    tone(587, 0.2,  0.18, 0.25); // Re
    tone(659, 0.4,  0.18, 0.25); // Mi
    tone(784, 0.6,  0.18, 0.25); // Sol
    tone(880, 0.8,  0.30, 0.25); // La
  }, [tone]);

  // Notificación orden lista para caja
  const playOrderReady = useCallback(() => {
    tone(523, 0,    0.18, 0.3);
    tone(659, 0.22, 0.18, 0.3);
    tone(784, 0.44, 0.35, 0.3);
  }, [tone]);

  // alias para compatibilidad
  const playNewOrder = playPulsos;

  return {
    playNewOrder,
    playOrderReady,
    sounds: {
      pulsos:   { label: 'Pulsos',    fn: playPulsos   },
      campana:  { label: 'Campana',   fn: playCampana  },
      bip:      { label: 'Bip doble', fn: playBip      },
      urgente:  { label: 'Urgente',   fn: playUrgente  },
      melodia:  { label: 'Melodía',   fn: playMelodia  },
    },
  };
}
