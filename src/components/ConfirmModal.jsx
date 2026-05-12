import '../styles/ConfirmModal.css';

export default function ConfirmModal({ isOpen, message, title, danger = true, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel }) {
  if (isOpen === false) return null;
  return (
    <div className="cm-overlay" onClick={onCancel}>
      <div className="cm-box" onClick={e => e.stopPropagation()}>
        <div className="cm-icon-wrap">
          {danger
            ? <span className="cm-icon cm-icon-danger">!</span>
            : <span className="cm-icon cm-icon-info">?</span>
          }
        </div>

        {title && <h3 className="cm-title">{title}</h3>}

        <p className="cm-message">{message}</p>

        <div className="cm-actions">
          <button className="cm-btn cm-btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={`cm-btn ${danger ? 'cm-btn-danger' : 'cm-btn-confirm'}`} onClick={onConfirm} autoFocus>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
