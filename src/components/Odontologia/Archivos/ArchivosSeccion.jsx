import React, { useMemo, useState } from 'react';
import { FiPaperclip, FiPlus, FiImage, FiFile, FiUpload, FiFolder } from 'react-icons/fi';

const ArchivosSeccion = ({ archivos = [], onAddFiles }) => {
  const [activeType, setActiveType] = useState('todos');

  const grouped = useMemo(() => {
    if (activeType === 'todos') return archivos;
    return archivos.filter((archivo) => {
      const type = (archivo.type || '').toLowerCase();
      if (activeType === 'imagenes') return type.startsWith('image/');
      if (activeType === 'documentos') return type.includes('pdf') || type.includes('word') || type.includes('text');
      return true;
    });
  }, [activeType, archivos]);

  const handleUpload = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const mapped = files.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}`,
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: `${Math.max(file.size / 1024 / 1024, 0.1).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('es-ES'),
      url: URL.createObjectURL(file),
    }));

    onAddFiles?.(mapped);
    event.target.value = '';
  };

  const renderIcon = (type) => {
    if ((type || '').startsWith('image/')) return <FiImage size={32} style={{ color: 'var(--odont-text-muted)' }} />;
    return <FiFile size={32} style={{ color: 'var(--odont-text-muted)' }} />;
  };

  return (
    <div className="odont-atender-section">
      <div className="odont-atender-section-header">
        <h3><FiPaperclip /> Archivos</h3>
        <label className="odont-btn-primary" style={{ fontSize: 12, cursor: 'pointer' }}>
          <FiUpload /> Subir archivo
          <input type="file" multiple onChange={handleUpload} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="odont-treatment-note" style={{ marginBottom: 16 }}>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Espacio usado</strong>
          <span>0.0 MB de 20 GB</span>
        </div>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Archivos cargados</strong>
          <span>{archivos.length}</span>
        </div>
        <div className="odont-info-card" style={{ flex: 1 }}>
          <strong>Carpeta</strong>
          <span>Archivos digitales</span>
        </div>
      </div>

      <div className="odont-atender-subtabs" style={{ marginBottom: 16 }}>
        <button className={`odont-atender-subtab ${activeType === 'todos' ? 'active' : ''}`} onClick={() => setActiveType('todos')}>Todos</button>
        <button className={`odont-atender-subtab ${activeType === 'imagenes' ? 'active' : ''}`} onClick={() => setActiveType('imagenes')}>Imágenes</button>
        <button className={`odont-atender-subtab ${activeType === 'documentos' ? 'active' : ''}`} onClick={() => setActiveType('documentos')}>Documentos</button>
      </div>

      {grouped.length === 0 ? (
        <div className="odont-empty-state">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <FiFolder size={32} />
            <div>No se encontró ningún archivo médico</div>
          </div>
        </div>
      ) : (
        <div className="archivos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16 }}>
          {grouped.map((archivo) => (
            <div key={archivo.id} className="archivo-item" style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, textAlign: 'center' }}>
              {renderIcon(archivo.type)}
              <div style={{ fontSize: 12, marginTop: 8, fontWeight: 600 }}>{archivo.name}</div>
              <span style={{ fontSize: 10, color: 'var(--odont-text-muted)' }}>{archivo.date} · {archivo.size}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchivosSeccion;
