import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PagoCompletado() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: 'green' }}>✅ ¡Pago Confirmado exitosamente!</h2>
      <p>Tu pago ha sido procesado correctamente. Tu suscripción ha sido extendida.</p>
      <p>En breve recibirás tu factura electrónica al correo.</p>
      
      <button 
        onClick={() => navigate('/admin')} 
        style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
      >
        Volver al Panel de Control
      </button>
    </div>
  );
}