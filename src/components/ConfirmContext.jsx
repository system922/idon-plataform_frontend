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
        onConfirm={confirm}
        onCancel={close}
      />
    </ConfirmContext.Provider>
  );
};