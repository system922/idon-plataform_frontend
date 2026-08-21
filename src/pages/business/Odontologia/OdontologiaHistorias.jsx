// pages/business/Odontologia/OdontologiaHistorias.jsx
import React, { useState } from 'react';
import { FiFileText, FiPlus, FiRefreshCw, FiUser, FiSearch, FiX, FiArrowLeft } from 'react-icons/fi';
import PageTemplateOdontologia from '../../../components/PageTemplateOdontologia';
import { useHistoriasClinicas } from '../../../hooks/useHistoriasClinicas';
import { usePacientesSearch } from '../../../hooks/usePacientesSearch';
import {
  HistoriaStats,
  HistoriaSearch,
  HistoriaList,
  HistoriaView,
  HistoriaForm,
  HistoriaConfirmModal
} from '../../../components/Odontologia/Historias';
import '../../../styles/Odontologia/HClinica.css';

export default function OdontologiaHistorias() {
  const {
    pacientes,
    loadingPacientes,
    searchResults,
    searchTerm,
    setSearchTerm,
    selectedPatient,
    setSelectedPatient,
    selectedPatientName
  } = usePacientesSearch();

  const {
    historias,
    loadingHistorias,
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
    loadHistorias,
    saveHistoria,
    deleteHistoria,
    resetForm,
    cargarDatosHistoria
  } = useHistoriasClinicas(selectedPatient);

  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    historiaId: null,
    title: '',
    message: ''
  });

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const result = await saveHistoria(formData);
      return result;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await deleteHistoria(id);
    if (result.success) {
      setConfirmModal({ isOpen: false, historiaId: null, title: '', message: '' });
    }
    return result;
  };

  const handleSelectPatient = (patientId) => {
    setSelectedPatient(patientId);
    setSearchTerm('');
  };

  const handleSelectHistoria = (historia) => {
    setSelectedHistoria(historia);
    cargarDatosHistoria(historia);
    setEditMode(false);
    setShowForm(false);
  };

  const handleNewHistoria = () => {
    resetForm();
    setSelectedHistoria(null);
    setEditMode(true);
    setShowForm(true);
  };

  const handleClosePatient = () => {
    setSelectedPatient('');
    setSearchTerm('');
    resetForm();
    setSelectedHistoria(null);
    setEditMode(false);
    setShowForm(false);
  };

  const requestDelete = (historiaId, titulo) => {
    setConfirmModal({
      isOpen: true,
      historiaId: historiaId,
      title: 'Confirmar eliminación',
      message: `¿Estás seguro de eliminar la historia "${titulo}"? Esta acción no se puede deshacer.`
    });
  };

  // Calcular estadísticas GENERALES (todos los pacientes)
  const totalPacientes = pacientes.length;
  
  // Calcular estadísticas de historias (todas)
  const totalHistoriasGlobal = historias.length;
  const tiposUnicosGlobal = new Set(historias.map(h => h.tipo));
  const totalTiposGlobal = tiposUnicosGlobal.size;
  
  const ultimaFechaGlobal = historias.length > 0 
    ? historias.reduce((latest, h) => {
        const fechaH = new Date(h.fecha);
        return fechaH > new Date(latest.fecha) ? h : latest;
      }, historias[0]).fecha
    : null;

  return (
    <PageTemplateOdontologia
      title={selectedPatient ? `Historias Clínicas`: "Historias Clínicas"}
      subtitle="Gestión completa de historias clínicas odontológicas"
      loading={loadingPacientes || loadingHistorias}
      icon={<FiFileText size={24} />}
      headerAction={
        <div className="pto-header-actions-wrapper hc-header-actions">
          {selectedPatient ? (
            <>
              <button 
                className="hc-btn-back" 
                onClick={handleClosePatient}
                title="Volver a buscar pacientes"
              >
                <FiArrowLeft size={18} /> Atrás
              </button>

              <div className="hc-header-buttons">
                <button 
                  className="hc-btn-primary" 
                  onClick={handleNewHistoria}
                >
                  <FiPlus size={18} /> Nueva Historia
                </button>
                {selectedHistoria && !editMode && (
                  <button
                    className="hc-btn-secondary"
                    onClick={() => {
                      setEditMode(true);
                      setShowForm(true);
                    }}
                  >
                    <FiPlus size={18} /> Editar
                  </button>
                )}
                <button 
                  className="hc-btn-secondary" 
                  onClick={() => loadHistorias()} 
                  title="Recargar" 
                  disabled={loadingHistorias}
                >
                  <FiRefreshCw size={18} className={loadingHistorias ? 'spin' : ''} />
                </button>
              </div>
            </>
          ) : (
            <HistoriaSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchResults={searchResults}
              onSelectPatient={handleSelectPatient}
              selectedPatient={selectedPatient}
              pacientes={pacientes}
            />
          )}
        </div>
      }
    >
      {/* MOSTRAR ESTADÍSTICAS SOLO CUANDO NO HAY PACIENTE SELECCIONADO */}
      {!selectedPatient && (
        <HistoriaStats
          totalPacientes={totalPacientes}
          totalHistorias={totalHistoriasGlobal}
          totalTipos={totalTiposGlobal}
          ultimaFecha={ultimaFechaGlobal}
        />
      )}

      {/* Contenido principal */}
      {selectedPatient ? (
        <div className="hc-main-container">
          {selectedPatientName && (
            <div className="hc-patient-banner">
              <div className="hc-patient-banner-info">
                <FiUser className="hc-patient-banner-icon" />
                <div>
                  <span className="hc-patient-banner-name">
                    {selectedPatientName.first_name} {selectedPatientName.last_name}
                  </span>
                  <span className="hc-patient-banner-document">
                    Cédula: {selectedPatientName.document_number || 'N/A'}
                  </span>
                </div>
              </div>
              <button
                className="hc-patient-banner-close"
                onClick={handleClosePatient}
              >
                <FiX size={18} />
              </button>
            </div>
          )}

          <div className="hc-panel">
            <div className="hc-panel-left">
              <HistoriaList
                historias={historias}
                selectedHistoriaId={selectedHistoria?.id}
                onSelectHistoria={handleSelectHistoria}
                onEditHistoria={(historia) => {
                  setSelectedHistoria(historia);
                  cargarDatosHistoria(historia);
                  setEditMode(true);
                  setShowForm(true);
                }}
                onDeleteHistoria={requestDelete}
                onNewHistoria={handleNewHistoria}
                loading={loadingHistorias}
              />
            </div>

            <div className="hc-panel-right">
              {showForm ? (
                <HistoriaForm
                  form={form}
                  setForm={setForm}
                  tipoSeleccionado={tipoSeleccionado}
                  setTipoSeleccionado={setTipoSeleccionado}
                  selectedHistoria={selectedHistoria}
                  onSave={handleSave}
                  onCancel={() => {
                    setShowForm(false);
                    setEditMode(false);
                    if (selectedHistoria) {
                      cargarDatosHistoria(selectedHistoria);
                    } else {
                      resetForm();
                    }
                  }}
                  saving={saving}
                />
              ) : (
                <HistoriaView
                  historia={selectedHistoria}
                  historiasCount={historias.length}
                  onNewHistoria={handleNewHistoria}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="hc-empty-state hc-empty-state-full">
          <FiUser className="hc-empty-state-icon hc-empty-state-icon-large" />
          <p className="hc-empty-state-title">Busca un paciente</p>
          <p className="hc-empty-state-subtitle">
            Ingresa el número de cédula en el buscador....
          </p>
        </div>
      )}

      <HistoriaConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, historiaId: null, title: '', message: '' })}
        onConfirm={() => handleDelete(confirmModal.historiaId)}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </PageTemplateOdontologia>
  );
}