import React, { createContext, useContext, useState } from 'react';
import ConfirmModal, { useConfirm } from './ConfirmModal';

const ConfirmContext = createContext(null);

export const useConfirmContext = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirmContext must be used within ConfirmProvider');
  }
  return context;
};

// Hook para mostrar alertas simples (sin confirmación)
export const useAlert = () => {
  const { showConfirm } = useConfirmContext();
  
  return {
    info: (message, title = 'Información') => {
      return showConfirm({
        message,
        title,
        danger: false,
        confirmText: 'Aceptar',
        cancelText: null,
        onConfirm: () => {},
      });
    },
    success: (message, title = '✅ Éxito') => {
      return showConfirm({
        message,
        title,
        danger: false,
        confirmText: 'Aceptar',
        cancelText: null,
        onConfirm: () => {},
      });
    },
    error: (message, title = '❌ Error') => {
      return showConfirm({
        message,
        title,
        danger: true,
        confirmText: 'Aceptar',
        cancelText: null,
        onConfirm: () => {},
      });
    },
    warning: (message, title = '⚠️ Advertencia') => {
      return showConfirm({
        message,
        title,
        danger: true,
        confirmText: 'Aceptar',
        cancelText: null,
        onConfirm: () => {},
      });
    },
  };
};

export const ConfirmProvider = ({ children }) => {
  const { isOpen, open, close, confirm, config } = useConfirm();

  const showConfirm = (options) => {
    return new Promise((resolve) => {
      open({
        ...options,
        onConfirm: async () => {
          await options.onConfirm?.();
          resolve(true);
        },
        onCancel: () => {
          options.onCancel?.();
          resolve(false);
        },
      });
    });
  };

  return (
    <ConfirmContext.Provider value={{ showConfirm }}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        title={config.title}
        message={config.message}
        type={config.type}
        confirmText={config.confirmText}
        cancelText={config.cancelText}
        danger={config.danger}
        onConfirm={confirm}
        onCancel={close}
      />
    </ConfirmContext.Provider>
  );
};