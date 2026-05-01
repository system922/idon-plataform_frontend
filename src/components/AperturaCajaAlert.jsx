import React, { useState } from 'react';
import { useCashDrawer } from '../hooks/useCashDrawer';
import { FiInbox, FiAlertCircle } from 'react-icons/fi';
import '../styles/AperturaCajaDialog.css';

export default function AperturaCajaDialog({ onAccept }) {
  const openDrawer = useCashDrawer();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  async function handleAccept() {
    setOpening(true);
    setError('');

    try {
      // Abrir cajón físico
      const ok = await openDrawer();
      
      if (!ok) {
        setError('No se pudo abrir la caja física. Verifica la impresora.');
        setOpening(false);
        return;
      }

      // Continuar al formulario de apertura
      onAccept();
    } catch (err) {
      setError('Error al abrir la caja: ' + (err.message || 'Error desconocido'));
      setOpening(false);
    }
  }

  return (
    <div className="apertura-dialog-overlay">
      <div className="apertura-dialog-container">
        <div className="apertura-dialog-icon">
          <FiInbox size={56} />
        </div>

        <h2 className="apertura-dialog-title">Apertura de Caja Requerida</h2>
        
        <p className="apertura-dialog-message">
          Debes registrar la apertura de caja antes de comenzar a operar. 
          Al presionar "Aceptar", se abrirá el cajón automáticamente y podrás 
          ingresar los datos iniciales del día.
        </p>

        {error && (
          <div className="apertura-dialog-error">
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <button
          type="button"
          className="apertura-dialog-btn"
          onClick={handleAccept}
          disabled={opening}
        >
          {opening ? 'Abriendo caja...' : 'Aceptar y Abrir Caja'}
        </button>
      </div>
    </div>
  );
}