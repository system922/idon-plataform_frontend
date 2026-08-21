// src/pages/cashier/components/PrintModal.jsx
import React from 'react';
import { MdOutlineReceiptLong } from 'react-icons/md';
import { FiCheck, FiX } from 'react-icons/fi';
import Modal from '../General/Modal';
import { IconTextButton, ButtonGroup } from '../General/Button';

const PrintModal = ({ isOpen, onPrint, onClose }) => {
  if (!isOpen) return null;

  const footer = (
    <ButtonGroup style={{ justifyContent: 'center', gap: '12px' }}>
      <IconTextButton
        variant=""
        size="md"
        icon={<FiX size={16} />}
        onClick={() => onPrint(false)}
      >
        No
      </IconTextButton>
      <IconTextButton
        variant="primary"
        size="md"
        icon={<FiCheck size={16} />}
        onClick={() => onPrint(true)}
      >
        Sí, imprimir
      </IconTextButton>
    </ButtonGroup>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Imprimir comprobante?"
      size="sm"
      footer={footer}
    >
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <MdOutlineReceiptLong size={48} style={{ color: 'var(--primary)', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
          El pago fue registrado exitosamente.
        </p>
      </div>
    </Modal>
  );
};

export default PrintModal;