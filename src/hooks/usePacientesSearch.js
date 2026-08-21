// hooks/usePacientesSearch.js
import { useState, useEffect, useRef } from 'react';
import { fetchWithAuth } from '../config/api';

export function usePacientesSearch() {
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedPatientName, setSelectedPatientName] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(null);

  // Cargar pacientes al montar
  useEffect(() => {
    const loadPacientes = async () => {
      try {
        const res = await fetchWithAuth('/odontologia/pacientes?limit=1000');
        const data = await res.json();
        setPacientes(data.data || []);
      } catch (error) {
        console.error('Error cargando pacientes:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPacientes();
  }, []);

  // Buscar pacientes por cédula
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = pacientes.filter(p => 
        p.document_number && p.document_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, pacientes]);

  // Actualizar nombre del paciente seleccionado
  useEffect(() => {
    if (selectedPatient) {
      const patient = pacientes.find(p => p.id === selectedPatient);
      setSelectedPatientName(patient || null);
    } else {
      setSelectedPatientName(null);
    }
  }, [selectedPatient, pacientes]);

  // Limpiar búsqueda cuando se selecciona un paciente
  useEffect(() => {
    if (selectedPatient) {
      setSearchTerm('');
    }
  }, [selectedPatient]);

  return {
    pacientes,
    loading,
    searchTerm,
    setSearchTerm,
    searchResults,
    selectedPatient,
    setSelectedPatient,
    selectedPatientName,
    searchRef
  };
}