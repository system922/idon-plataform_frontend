import React, { useEffect, useRef } from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX, FiTrash2, FiSave } from 'react-icons/fi';
import '../styles/ConfirmModal.css';

/**
 * Componente de confirmación reutilizable
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controla si el modal está abierto
 * @param {string} props.title - Título del modal (ej: "Eliminar producto")
 * @param {string} props.message - Mensaje de confirmación (ej: "¿Estás seguro?")
 * @param {string} props.type - Tipo: 'danger' (rojo), 'warning' (amarillo), 'success' (verde), 'info' (azul)
 * @param {string} props.confirmText - Texto del botón confirmar (ej: "Eliminar", "Guardar")
 * @param {string} props.cancelText - Texto del botón cancelar
 * @param {Function} props.onConfirm - Función que se ejecuta al confirmar
 * @param {Function} props.onCancel - Función que se ejecuta al cancelar
 * @param {boolean} props.isLoading - Estado de carga (para deshabilitar botones)
 */

const ConfirmModal = ({
  isOpen = false,
  title = 'Confirmar acción',
  message = '¿Estás seguro de realizar esta acción?',
  type = 'info',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const modalRef = useRef(null);

  // Cerrar con tecla ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel?.();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, isLoading, onCancel]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Iconos según el tipo
  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <FiAlertCircle size={48} className="confirm-icon confirm-icon-danger" />;
      case 'warning':
        return <FiAlertCircle size={48} className="confirm-icon confirm-icon-warning" />;
      case 'success':
        return <FiCheckCircle size={48} className="confirm-icon confirm-icon-success" />;
      default:
        return <FiInfo size={48} className="confirm-icon confirm-icon-info" />;
    }
  };

  // Clases para los botones según el tipo
  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'confirm-btn confirm-btn-danger';
      case 'warning':
        return 'confirm-btn confirm-btn-warning';
      case 'success':
        return 'confirm-btn confirm-btn-success';
      default:
        return 'confirm-btn confirm-btn-primary';
    }
  };

  return (
    <div className="confirm-overlay" onClick={() => !isLoading && onCancel?.()}>
      <div className="confirm-container" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <button className="confirm-close" onClick={() => !isLoading && onCancel?.()} disabled={isLoading}>
          <FiX size={20} />
        </button>

        <div className="confirm-content">
          {getIcon()}
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-message">{message}</p>
        </div>

        <div className="confirm-actions">
          <button
            className="confirm-btn confirm-btn-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={getConfirmButtonClass()}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="confirm-spinner" />
                Procesando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook personalizado para manejar el estado del modal
 * @returns {Object} { isOpen, open, close, confirm }
 */
export const useConfirm = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState({
    title: 'Confirmar acción',
    message: '¿Estás seguro?',
    type: 'info',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    onConfirm: () => {},
  });

  const open = (options) => {
    setConfig({
      title: options.title || 'Confirmar acción',
      message: options.message || '¿Estás seguro?',
      type: options.type || 'info',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      onConfirm: options.onConfirm || (() => {}),
      onCancel: options.onCancel,
    });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    config.onCancel?.();
  };

  const confirm = async () => {
    await config.onConfirm();
    setIsOpen(false);
  };

  return {
    isOpen,
    open,
    close,
    confirm,
    config,
  };
};

export default ConfirmModal;