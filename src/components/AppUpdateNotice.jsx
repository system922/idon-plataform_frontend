import { FiRefreshCw } from 'react-icons/fi';
import { useAppVersion } from '../hooks/useAppVersion';

export default function AppUpdateNotice() {
  const { updateReady, countdown } = useAppVersion();

  if (!updateReady) return null;

  return (
    <div className="app-update-notice" role="status" aria-live="polite">
      <span className="app-update-notice__icon" aria-hidden="true">
        <FiRefreshCw size={18} />
      </span>
      <span className="app-update-notice__copy">
        <strong>Nueva versión disponible</strong>
        <span>El sistema se actualizará automáticamente. Guarda tu trabajo.</span>
      </span>
      <span className="app-update-notice__countdown" aria-label={`Actualizando en ${countdown} segundos`}>
        {countdown}
        <small>s</small>
      </span>
    </div>
  );
}
