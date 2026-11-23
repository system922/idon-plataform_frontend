import React from 'react';
import './Logo.css';

const logoIcon = `${process.env.PUBLIC_URL}/favicon.ico`;

export default function Logo({ size = 'md' }) {
  return (
    <div className={`idon-logo idon-logo--${size}`} role="img" aria-label="IDON Control">
      <img className="idon-logo__icon" src={logoIcon} alt="" aria-hidden="true" />
      <span className="idon-logo__wordmark" aria-hidden="true">
        <span className="idon-logo__name">
          <span className="idon-logo__id">ID</span><span className="idon-logo__on">ON</span>
        </span>
        <span className="idon-logo__control">CONTROL</span>
      </span>
    </div>
  );
}
