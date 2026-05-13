import { createContext, useContext, useRef, useState, useCallback } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false });
  const resolveRef = useRef(null);

  const showConfirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({
        open: true,
        message,
        title:       opts.title       || null,
        danger:      opts.danger      ?? true,
        confirmText: opts.confirmText ?? 'Confirmar',
        cancelText:  opts.cancelText  ?? 'Cancelar',
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(s => ({ ...s, open: false }));
    resolveRef.current?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      {state.open && (
        <ConfirmModal
          message={state.message}
          title={state.title}
          danger={state.danger}
          confirmText={state.confirmText}
          cancelText={state.cancelText}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
