// components/PublicOrderHeader.jsx
import React from 'react';
import { FiUser, FiPhone, FiMapPin, FiMessageSquare } from 'react-icons/fi';

export default function PublicOrderHeader({ 
  orderType, 
  setOrderType, 
  numeroMesa, 
  setNumeroMesa,
  notas,
  setNotas,
  clienteNombre,
  setClienteNombre,
  clienteTelefono,
  setClienteTelefono,
  clienteDireccion,
  setClienteDireccion
}) {
  return (
    <div className="public-order-header">
      <div className="public-header-section">
        <div className="public-section-title">
          <FiUser className="public-section-icon" />
          <h3>Datos del cliente</h3>
        </div>
        <div className="public-cliente-fields">
          <div className="public-cliente-field">
            <label className="public-field-label">Nombre completo</label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="public-cliente-input"
              required
            />
          </div>
          <div className="public-cliente-field">
            <label className="public-field-label">Teléfono</label>
            <input
              type="tel"
              placeholder="Ej: 0999123456"
              value={clienteTelefono}
              onChange={(e) => setClienteTelefono(e.target.value)}
              className="public-cliente-input"
              required
            />
          </div>
          <div className="public-cliente-field">
            <label className="public-field-label">Dirección de entrega</label>
            <input
              type="text"
              placeholder="Ej: Av. Principal #123, Ciudad"
              value={clienteDireccion}
              onChange={(e) => setClienteDireccion(e.target.value)}
              className="public-cliente-input"
              required
            />
          </div>
        </div>
      </div>

      <div className="public-header-section">
        <div className="public-section-title">
          <FiMessageSquare className="public-section-icon" />
          <h3>Notas adicionales</h3>
        </div>
        <input
          type="text"
          placeholder="Ej: Sin cebolla, extra queso, etc."
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          className="public-notas-input"
        />
      </div>
    </div>
  );
}