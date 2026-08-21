// components/Odontologia/Ortodoncia/OrtodonciaFotos.jsx
import React, { useState } from 'react';
import { FiCamera, FiUpload, FiTrash2, FiLoader, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { fetchWithAuth } from '../../../config/apiBase_';

const styles = {
  container: {
    padding: '0',
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: '#f1f5f9',
    borderRadius: '6px',
    border: '1px dashed #94a3b8',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#475569',
    transition: 'all 0.2s',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#94a3b8',
    border: '1px dashed #e2e8f0',
    borderRadius: '8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '12px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
  },
  preview: {
    height: '120px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  name: {
    padding: '6px 8px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#0f172a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    padding: '0 8px 6px 8px',
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deleteButton: {
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '2px',
    borderRadius: '4px',
    fontSize: '14px',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: '#ffffff',
    borderRadius: '16px',
    maxWidth: '400px',
    width: '100%',
    padding: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  modalText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  modalButtons: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  confirmButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#ef4444',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
  },
  uploadingStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  uploading: {
    background: '#eff6ff',
    color: '#2563eb',
    border: '1px solid #93c5fd',
  },
  success: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #86efac',
  },
  error: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fca5a5',
  },
};

export default function OrtodonciaFotos({ form, pacienteId, onUpdate, ortodonciaId }) {
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ show: false, fotoId: null });
  const fotografias = form.fotografias || [];

  const handleUploadFotos = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Validar archivos
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setUploadStatus({ type: 'error', message: 'Solo se permiten imágenes' });
        setTimeout(() => setUploadStatus({ type: '', message: '' }), 4000);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'La imagen no puede ser mayor a 5MB' });
        setTimeout(() => setUploadStatus({ type: '', message: '' }), 4000);
        return;
      }
    }

    setSaving(true);
    setUploadStatus({ type: 'uploading', message: 'Subiendo imágenes...' });

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('fotos', file));
      formData.append('paciente_id', pacienteId);

      // Si tenemos ortodonciaId, lo enviamos para asociar las fotos directamente
      if (ortodonciaId) {
        formData.append('ortodoncia_id', ortodonciaId);
      }

      const res = await fetchWithAuth('/api/odontologia/ortodoncias/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al subir imágenes');
      }

      // Las nuevas fotos vienen en result.data
      const nuevasFotos = result.data.map((foto) => ({
        id: foto.id || `foto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nombre_archivo: foto.nombre_archivo,
        image_url: foto.image_url,
        size: foto.size || '—',
        created_at: foto.created_at || new Date().toLocaleDateString('es-ES'),
      }));

      // Combinar con las existentes (las nuevas van al principio)
      const nuevasFotografias = [...nuevasFotos, ...fotografias];
      onUpdate('fotografias', nuevasFotografias);

      setUploadStatus({ type: 'success', message: `✅ ${nuevasFotos.length} imagen(es) subida(s) correctamente` });
      setTimeout(() => setUploadStatus({ type: '', message: '' }), 4000);

      event.target.value = '';
    } catch (err) {
      console.error('❌ Error subiendo imágenes:', err);
      setUploadStatus({ type: 'error', message: `❌ ${err.message}` });
      setTimeout(() => setUploadStatus({ type: '', message: '' }), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFotoClick = (fotoId) => {
    setConfirmModal({ show: true, fotoId });
  };

  const confirmDeleteFoto = () => {
    const { fotoId } = confirmModal;
    if (fotoId) {
      const nuevasFotografias = fotografias.filter((f) => f.id !== fotoId);
      onUpdate('fotografias', nuevasFotografias);
    }
    setConfirmModal({ show: false, fotoId: null });
  };

  const cancelDeleteFoto = () => {
    setConfirmModal({ show: false, fotoId: null });
  };

  const getStatusIcon = () => {
    if (uploadStatus.type === 'uploading') return <FiLoader size={16} className="spin" />;
    if (uploadStatus.type === 'success') return <FiCheckCircle size={16} />;
    if (uploadStatus.type === 'error') return <FiAlertCircle size={16} />;
    return null;
  };

  const getStatusStyle = () => {
    if (uploadStatus.type === 'uploading') return styles.uploading;
    if (uploadStatus.type === 'success') return styles.success;
    if (uploadStatus.type === 'error') return styles.error;
    return {};
  };

  return (
    <div style={styles.container}>
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            ...styles.uploadButton,
            ...(saving ? { opacity: 0.6, cursor: 'wait' } : {}),
          }}
          onMouseEnter={(e) => {
            if (!saving) {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.borderColor = '#10b981';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = '#94a3b8';
          }}
        >
          <FiUpload size={16} />
          {saving ? 'Subiendo...' : 'Subir fotografías'}
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleUploadFotos}
            disabled={saving}
          />
        </label>

        {/* Estado de subida */}
        {uploadStatus.message && (
          <div style={{ ...styles.uploadingStatus, ...getStatusStyle() }}>
            {getStatusIcon()}
            {uploadStatus.message}
          </div>
        )}
      </div>

      {fotografias.length === 0 ? (
        <div style={styles.emptyState}>
          <FiCamera size={32} />
          <div style={{ marginTop: '8px' }}>Sin fotografías cargadas</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Haz clic en "Subir fotografías" para agregar imágenes
          </div>
        </div>
      ) : (
        <div style={styles.grid}>
          {fotografias.map((foto) => (
            <div key={foto.id} style={styles.card}>
              <div style={styles.preview}>
                <img 
                  src={foto.image_url} 
                  alt={foto.nombre_archivo} 
                  style={styles.image}
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                    e.target.alt = 'Imagen no disponible';
                  }}
                />
              </div>
              <div style={styles.name} title={foto.nombre_archivo}>
                {foto.nombre_archivo}
              </div>
              <div style={styles.meta}>
                <span>{foto.size || '—'} · {foto.created_at}</span>
                <button
                  onClick={() => handleDeleteFotoClick(foto.id)}
                  style={styles.deleteButton}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmModal.show && (
        <div style={styles.modalOverlay} onClick={cancelDeleteFoto}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Eliminar imagen</h3>
            <p style={styles.modalText}>¿Estás seguro de que deseas eliminar esta imagen?</p>
            <div style={styles.modalButtons}>
              <button style={styles.cancelButton} onClick={cancelDeleteFoto}>
                Cancelar
              </button>
              <button style={styles.confirmButton} onClick={confirmDeleteFoto}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}