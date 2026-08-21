// hooks/useHistoriasClinicas.js
import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../config/api';

export function useHistoriasClinicas(selectedPatient) {
  const [historias, setHistorias] = useState([]);
  const [selectedHistoria, setSelectedHistoria] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('odontograma');
  
  const [form, setForm] = useState({
    tipo: 'odontograma',
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    datos: '{}',
    observaciones: '',
    notas: ''
  });

  const loadHistorias = async () => {
    if (!selectedPatient) {
      setHistorias([]);
      setSelectedHistoria(null);
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/odontologia/historias?patient_id=${selectedPatient}`);
      const data = await res.json();
      const historiasData = data.data || [];
      setHistorias(historiasData);
      
      if (historiasData.length > 0 && !selectedHistoria) {
        setSelectedHistoria(historiasData[0]);
        cargarDatosHistoria(historiasData[0]);
      } else if (historiasData.length === 0) {
        setSelectedHistoria(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error cargando historias:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosHistoria = (historia) => {
    setForm({
      tipo: historia.tipo || 'odontograma',
      titulo: historia.titulo || '',
      descripcion: historia.descripcion || '',
      fecha: historia.fecha || new Date().toISOString().split('T')[0],
      datos: historia.datos || '{}',
      observaciones: historia.observaciones || '',
      notas: historia.notas || ''
    });
    setTipoSeleccionado(historia.tipo || 'odontograma');
  };

  const resetForm = () => {
    setForm({
      tipo: 'odontograma',
      titulo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      datos: '{}',
      observaciones: '',
      notas: ''
    });
    setTipoSeleccionado('odontograma');
  };

  const saveHistoria = async (formData) => {
    try {
      if (!formData.titulo.trim()) {
        return { success: false, error: 'El título es obligatorio' };
      }

      const url = selectedHistoria?.id
        ? `/api/odontologia/historias/${selectedHistoria.id}`
        : '/api/odontologia/historias';
      const method = selectedHistoria?.id ? 'PUT' : 'POST';
      
      const payload = {
        ...formData,
        patient_id: selectedPatient,
        datos: formData.datos || '{}'
      };

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditMode(false);
        setShowForm(false);
        await loadHistorias();
        resetForm();
        return { success: true };
      } else {
        const errorData = await res.json();
        return { success: false, error: errorData.message || 'Error desconocido' };
      }
    } catch (error) {
      console.error('Error en saveHistoria:', error);
      return { success: false, error: 'Error de red al guardar' };
    }
  };

  const deleteHistoria = async (historiaId) => {
    try {
      const res = await fetchWithAuth(`/odontologia/historias/${historiaId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        await loadHistorias();
        if (selectedHistoria?.id === historiaId) {
          setSelectedHistoria(null);
          resetForm();
        }
        return { success: true };
      } else {
        return { success: false, error: 'Error al eliminar la historia' };
      }
    } catch (error) {
      console.error('Error eliminando historia:', error);
      return { success: false, error: 'Error de red' };
    }
  };

  // Cargar historias al seleccionar paciente
  useEffect(() => {
    loadHistorias();
  }, [selectedPatient]);

  return {
    historias,
    selectedHistoria,
    setSelectedHistoria,
    form,
    setForm,
    tipoSeleccionado,
    setTipoSeleccionado,
    editMode,
    setEditMode,
    showForm,
    setShowForm,
    loading,
    loadHistorias,
    saveHistoria,
    deleteHistoria,
    resetForm,
    cargarDatosHistoria
  };
}