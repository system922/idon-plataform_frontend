import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PagoCancelado() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#ef4444' }}>❌ Pago Cancelado</h2>
      <p>El proceso de pago no se completó o fue cancelado.</p>
      <p>No se ha realizado ningún cobro a tu tarjeta.</p>
      
      <button 
        onClick={() => navigate('/admin')} 
        style={{ 
          marginTop: '20px', 
          padding: '10px 20px', 
          cursor: 'pointer',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '5px'
        }}
      >
        Volver al Panel de Control
      </button>
    </div>
  );
}