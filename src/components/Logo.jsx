import React from 'react';
import './Logo.css';

const logoIcon = `${process.env.PUBLIC_URL}/LOGO_IDON_n.png`;

export default function Logo({ size = 'xlg' }) {
  return (
    <div className={`idon-logo idon-logo--${size}`} role="img" aria-label="IDON Control">
      <img className="idon-logo__icon" src={logoIcon} alt="" aria-hidden="true" />
    </div>
  );
}
