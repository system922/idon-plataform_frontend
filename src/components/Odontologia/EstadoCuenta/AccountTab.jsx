// components/Odontologia/EstadoCuenta/components/AccountTab.jsx

import React from 'react';

const AccountTab = ({ active, onClick, children }) => (
  <button 
    className={`odont-atender-subtab ${active ? 'active' : ''}`} 
    onClick={onClick} 
    type="button"
  >
    {children}
  </button>
);

export default AccountTab;