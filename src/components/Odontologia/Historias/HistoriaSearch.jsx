// components/Odontologia/Historias/HistoriaSearch.jsx
import React, { useRef, useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { PacienteAvatar } from '../Pacientes/PacienteAvatar';


export default function HistoriaSearch({
  searchTerm,
  setSearchTerm,
  searchResults,
  onSelectPatient,
  selectedPatient,
  pacientes
}) {
  const searchRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Mostrar dropdown solo si hay resultados y el término tiene al menos 2 caracteres
    if (searchTerm.length >= 2 && searchResults.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [searchTerm, searchResults]);

  const handleSelect = (patientId) => {
    onSelectPatient(patientId);
    setSearchTerm('');
    setShowDropdown(false);
  };

  // Si ya hay un paciente seleccionado, ocultar el buscador
  if (selectedPatient) {
    return null;
  }

  return (
    <div className="hc-search-wrapper" ref={searchRef}>
      <FiSearch className="hc-search-icon" />
      <input
        type="text"
        className="hc-search-input"
        placeholder="Buscar paciente por cédula..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => {
          if (searchTerm.length >= 2 && searchResults.length > 0) {
            setShowDropdown(true);
          }
        }}
      />
      
      {/* Dropdown - Asegurar que esté encima */}
      {showDropdown && searchResults.length > 0 && (
        <div className="hc-search-dropdown">
          {searchResults.map(paciente => (
            <div
              key={paciente.id}
              className="hc-search-item"
              onClick={() => handleSelect(paciente.id)}
            >
              <div className="detail-header-profile">
                <div className="detail-avatar-wrapper">
                  <PacienteAvatar 
                    firstName={paciente.first_name}
                    lastName={paciente.last_name}
                    imageUrl={paciente.image_url}
                    size={50}
                    className="bordered-primary shadow-md"
                  />
                </div>
                <div className="detail-profile-info">
                  <h3 className="detail-profile-name">
                    {paciente.first_name} {paciente.last_name}
                  </h3>
                  <div className="detail-profile-document">
                    <span>No. Cédula: {paciente.document_number || 'No registrada'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Mensaje cuando no hay resultados */}
      {showDropdown && searchTerm.length >= 2 && searchResults.length === 0 && (
        <div className="hc-search-dropdown">
          <div className="hc-search-empty">
            No se encontraron pacientes con esa cédula
          </div>
        </div>
      )}
    </div>
  );
}